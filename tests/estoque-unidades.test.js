const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const sqlite3 = require('sqlite3');
const { inicializarEstoque, executar, consultar } = require('../utils/estoque-unidades');
const registrarEstoque = require('../controllers/estoque');
const registrarProdutos = require('../controllers/produtos');

test('estoque por unidade usa banco em memória e conserva os saldos', async t => {
  const db = new sqlite3.Database(':memory:');
  const exec = sql => new Promise((resolve, reject) => db.exec(sql, erro => erro ? reject(erro) : resolve()));
  const esquema = fs.readFileSync(path.join(__dirname, '../criar-tabelas.js'), 'utf8').match(/db\.exec\(`([\s\S]*?)`/)[1];
  await exec(esquema);
  await executar(db, "INSERT INTO produtos (nome, codigo_barras, preco, quantidade) VALUES ('Produto antigo', 'ANTIGO', 10, 23)");
  await inicializarEstoque(db);
  const app = express();
  app.use(express.json());
  registrarEstoque(app, db);
  registrarProdutos(app, db);
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => servidor.close(resolve));
    await new Promise(resolve => db.close(resolve));
  });
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const enviar = (rota, dados, method = 'POST') => fetch(`${url}${rota}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
  });
  const mover = dados => enviar('/estoque/movimentacoes', dados);
  const saldo = async (produto, unidade) => (await consultar(db,
    'SELECT quantidade FROM estoque_unidades WHERE produto_id = ? AND unidade_id = ?', [produto, unidade]))[0]?.quantidade || 0;
  const total = async produto => (await consultar(db, 'SELECT quantidade FROM produtos WHERE id = ?', [produto]))[0]?.quantidade;
  let sequencia = 0;
  async function produtoNovo(quantidade = 5) {
    sequencia += 1;
    const resposta = await enviar('/produtos', { nome: `Produto ${sequencia}`, codigo_barras: `P-${sequencia}`, descricao: '', preco: 10, quantidade });
    assert.equal(resposta.status, 201);
    return resposta.json();
  }
  const transferencia = (produto, quantidade = 1) => ({ tipo: 'transferencia', produto_id: produto.id,
    origem_id: 1, destino_id: 2, quantidade, motivo: 'Reposição da filial' });

  await t.test('migração distribui o total e pode ser repetida sem novo rateio ou histórico', async () => {
    const antes = await consultar(db, 'SELECT * FROM estoque_unidades ORDER BY unidade_id');
    assert.equal(antes.length, 9);
    assert.equal(antes.reduce((soma, item) => soma + item.quantidade, 0), 23);
    const historico = await consultar(db, 'SELECT * FROM movimentacoes_estoque');
    await inicializarEstoque(db);
    assert.deepEqual(await consultar(db, 'SELECT * FROM estoque_unidades ORDER BY unidade_id'), antes);
    assert.deepEqual(await consultar(db, 'SELECT * FROM movimentacoes_estoque'), historico);
    assert.equal(await total(1), 23);
  });

  await t.test('novo produto recebe o saldo inicial na sede, incluindo zero', async () => {
    for (const quantidade of [0, 5]) {
      const produto = await produtoNovo(quantidade);
      assert.equal(await saldo(produto.id, 1), quantidade);
      assert.equal(await total(produto.id), quantidade);
      const movimentos = await consultar(db, 'SELECT * FROM movimentacoes_estoque WHERE produto_id = ?', [produto.id]);
      assert.equal(movimentos.length, quantidade > 0 ? 1 : 0);
    }
  });

  await t.test('consulta de unidade inclui produtos zerados e rejeita unidade inválida', async () => {
    const resposta = await fetch(`${url}/unidades/2/estoque`);
    assert.equal(resposta.status, 200);
    const dados = await resposta.json();
    assert.equal(dados.unidade.cidade, 'São Luís');
    assert.ok(dados.produtos.some(produto => produto.quantidade === 0));
    assert.equal((await fetch(`${url}/unidades/abc/estoque`)).status, 400);
    assert.equal((await fetch(`${url}/unidades/999/estoque`)).status, 404);
  });

  await t.test('transferência debita, credita e registra motivo sem alterar total', async () => {
    const produto = await produtoNovo();
    const resposta = await mover(transferencia(produto, 2));
    assert.equal(resposta.status, 201);
    assert.equal(await saldo(produto.id, 1), 3);
    assert.equal(await saldo(produto.id, 2), 2);
    assert.equal(await total(produto.id), 5);
    assert.equal((await resposta.json()).motivo, 'Reposição da filial');
  });

  await t.test('saldo insuficiente e destino ausente não alteram saldos ou histórico', async () => {
    const produto = await produtoNovo();
    const antes = await consultar(db, 'SELECT * FROM movimentacoes_estoque');
    assert.equal((await mover(transferencia(produto, 6))).status, 409);
    assert.equal((await mover({ ...transferencia(produto), destino_id: 999 })).status, 404);
    assert.equal(await saldo(produto.id, 1), 5);
    assert.equal(await saldo(produto.id, 2), 0);
    assert.deepEqual(await consultar(db, 'SELECT * FROM movimentacoes_estoque'), antes);
  });

  await t.test('duas transferências concorrentes não gastam o mesmo saldo', async () => {
    const produto = await produtoNovo(1);
    const respostas = await Promise.all([mover(transferencia(produto)), mover({ ...transferencia(produto), destino_id: 3 })]);
    assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [201, 409]);
    assert.equal(await saldo(produto.id, 1), 0);
    assert.equal(await saldo(produto.id, 2) + await saldo(produto.id, 3), 1);
    assert.equal(await total(produto.id), 1);
  });

  await t.test('falha no crédito desfaz também o débito e o registro', async () => {
    const produto = await produtoNovo();
    await exec(`CREATE TRIGGER falha_credito BEFORE INSERT ON estoque_unidades
      WHEN NEW.unidade_id = 9 BEGIN SELECT RAISE(ABORT, 'FALHA_SIMULADA'); END;`);
    const antes = await consultar(db, 'SELECT * FROM movimentacoes_estoque');
    assert.equal((await mover({ ...transferencia(produto), destino_id: 9 })).status, 500);
    assert.equal(await saldo(produto.id, 1), 5);
    assert.equal(await total(produto.id), 5);
    assert.deepEqual(await consultar(db, 'SELECT * FROM movimentacoes_estoque'), antes);
    await exec('DROP TRIGGER falha_credito');
  });

  await t.test('entradas e saídas atualizam o total agregado', async () => {
    const produto = await produtoNovo();
    assert.equal((await mover({ tipo: 'entrada', produto_id: produto.id, destino_id: 4, quantidade: 3, motivo: 'Recebimento de compra' })).status, 201);
    assert.equal(await total(produto.id), 8);
    assert.equal((await mover({ tipo: 'saida', produto_id: produto.id, origem_id: 4, quantidade: 2, motivo: 'Venda na filial' })).status, 201);
    assert.equal(await saldo(produto.id, 4), 1);
    assert.equal(await total(produto.id), 6);
  });

  await t.test('valida campos e rejeita produto inexistente sem movimentar', async () => {
    const produto = await produtoNovo();
    for (const alteracao of [{ quantidade: 0 }, { quantidade: 1.5 }, { quantidade: '1' },
      { origem_id: 2, destino_id: 2 }, { motivo: 'x' }, { tipo: 'inicial' }, { destino_id: '2' }]) {
      assert.equal((await mover({ ...transferencia(produto), ...alteracao })).status, 400);
    }
    assert.equal((await mover({ ...transferencia(produto), produto_id: 9999 })).status, 404);
    assert.equal(await total(produto.id), 5);
  });

  await t.test('entrada que excede o limite numérico é rejeitada sem alterar saldo', async () => {
    const produto = await produtoNovo(Number.MAX_SAFE_INTEGER);
    const resposta = await mover({ tipo: 'entrada', produto_id: produto.id, destino_id: 1,
      quantidade: 1, motivo: 'Verificação do limite' });
    assert.equal(resposta.status, 409);
    assert.equal(await total(produto.id), Number.MAX_SAFE_INTEGER);
    assert.equal(await saldo(produto.id, 1), Number.MAX_SAFE_INTEGER);
  });

  await t.test('edição de cadastro preserva saldo e bloqueia alteração direta da quantidade', async () => {
    const produto = await produtoNovo();
    assert.equal((await enviar(`/produtos/${produto.id}`, { ...produto, quantidade: 9 }, 'PUT')).status, 409);
    assert.equal(await total(produto.id), 5);
    assert.equal((await enviar(`/produtos/${produto.id}`, { ...produto, nome: 'Nome revisado' }, 'PUT')).status, 200);
  });

  await t.test('exclusão remove saldos e preserva histórico com nome do produto', async () => {
    const produto = await produtoNovo();
    assert.equal((await fetch(`${url}/produtos/${produto.id}`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await consultar(db, 'SELECT * FROM estoque_unidades WHERE produto_id = ?', [produto.id]), []);
    const registros = await consultar(db, 'SELECT * FROM movimentacoes_estoque WHERE codigo_barras = ?', [produto.codigo_barras]);
    assert.ok(registros.length > 0);
    assert.equal(registros[0].produto_id, null);
    assert.equal(registros[0].produto_nome, produto.nome);
    assert.deepEqual(await consultar(db, 'PRAGMA foreign_key_check'), []);
  });
});
