const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const sqlite3 = require('sqlite3');
const { normalizarCnpjValido } = require('../utils/cnpj');

test('valida CNPJ numérico e o exemplo alfanumérico oficial', () => {
  assert.equal(normalizarCnpjValido('11.222.333/0001-81'), '11222333000181');
  assert.equal(normalizarCnpjValido(' 12.abc.345/01de-35 '), '12ABC34501DE35');
  for (const valor of [null, 11222333000181, '', '00000000000000',
    '11111111111111', '11222333000182', '12ABC34501DE36',
    '12ABC34501DEAA', '11..222333000181', '11222333000181!']) {
    assert.equal(normalizarCnpjValido(valor), null);
  }
});

test('rotas de fornecedores usam somente SQLite em memória', async (t) => {
  const db = new sqlite3.Database(':memory:');
  let servidor;
  t.after(async () => {
    if (servidor) await new Promise(resolve => servidor.close(resolve));
    await new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve()));
  });

  const executar = sql => new Promise((resolve, reject) => {
    db.exec(sql, erro => erro ? reject(erro) : resolve());
  });
  const consultar = sql => new Promise((resolve, reject) => {
    db.all(sql, [], (erro, linhas) => erro ? reject(erro) : resolve(linhas));
  });
  const raiz = path.join(__dirname, '..');
  const criacao = fs.readFileSync(path.join(raiz, 'criar-tabelas.js'), 'utf8');
  await executar(criacao.match(/db\.exec\(`([\s\S]*?)`/)[1]);

  // Carrega as rotas reais, substituindo apenas conexão e porta do servidor.
  // database.js nunca é carregado: estoque.db não é aberto por estes testes.
  const app = express();
  app.listen = (_porta, callback) => {
    servidor = require('node:http').createServer(app);
    return servidor.listen(0, '127.0.0.1', callback);
  };
  function expressTeste() { return app; }
  expressTeste.json = express.json;
  const arquivoApp = path.join(raiz, 'app.js');
  const requireApp = createRequire(arquivoApp);
  vm.runInNewContext(fs.readFileSync(arquivoApp, 'utf8'), {
    require: nome => nome === './database' ? db
      : nome === 'express' ? expressTeste : requireApp(nome),
    console: { log() {}, error() {} }, process
  }, { filename: arquivoApp });
  if (!servidor.listening) {
    await new Promise(resolve => servidor.once('listening', resolve));
  }
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const cadastrar = dados => fetch(`${url}/fornecedores`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  const editar = (id, dados) => fetch(`${url}/fornecedores/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  const dadosEdicao = {
    nome: 'Fornecedor Atualizado', cnpj: '11.222.333/0001-81',
    telefone: '(11) 98888-4321', email: 'novo@example.com', endereco: 'Rua Nova, 20'
  };
  const excluir = id => fetch(`${url}/fornecedores/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  await t.test('cadastra, normaliza e retorna os dados na listagem', async () => {
    const resposta = await cadastrar({
      nome: ' Distribuidora Teste ', cnpj: '11.222.333/0001-81',
      telefone: ' (11) 99999-1234 ', email: ' contato@example.com ',
      endereco: ' Rua de Teste, 10 '
    });
    assert.equal(resposta.status, 201);
    const fornecedor = await resposta.json();
    assert.deepEqual(fornecedor, {
      id: 1, nome: 'Distribuidora Teste', cnpj: '11222333000181',
      telefone: '(11) 99999-1234', email: 'contato@example.com',
      endereco: 'Rua de Teste, 10'
    });
    const lista = await fetch(`${url}/fornecedores`);
    assert.equal(lista.status, 200);
    assert.deepEqual(await lista.json(), [fornecedor]);
  });

  await t.test('CNPJ duplicado retorna 409 mesmo sem pontuação', async () => {
    const resposta = await cadastrar({ nome: 'Duplicado', cnpj: '11222333000181' });
    assert.equal(resposta.status, 409);
    assert.match((await resposta.json()).erro, /CNPJ/);
  });

  await t.test('aceita letras, opcionais omitidos e protege os parâmetros SQL', async () => {
    const nome = "Fornecedor '); DROP TABLE fornecedores; --";
    const resposta = await cadastrar({ nome, cnpj: '12.abc.345/01de-35' });
    assert.equal(resposta.status, 201);
    assert.deepEqual(await resposta.json(), {
      id: 2, nome, cnpj: '12ABC34501DE35', telefone: '', email: '', endereco: ''
    });
    assert.equal((await cadastrar({ nome, cnpj: '12ABC34501DE35' })).status, 409);
  });

  await t.test('consulta por ID retorna somente o fornecedor solicitado', async () => {
    const resposta = await fetch(`${url}/fornecedores/1`);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), {
      id: 1, nome: 'Distribuidora Teste', cnpj: '11222333000181',
      telefone: '(11) 99999-1234', email: 'contato@example.com',
      endereco: 'Rua de Teste, 10'
    });
    const segundo = await fetch(`${url}/fornecedores/2`);
    assert.equal(segundo.status, 200);
    assert.equal((await segundo.json()).id, 2);
  });

  await t.test('consulta por ID inexistente retorna 404', async () => {
    const resposta = await fetch(`${url}/fornecedores/999`);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Fornecedor não encontrado.' });
  });

  await t.test('consulta rejeita IDs inválidos com 400', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      const resposta = await fetch(`${url}/fornecedores/${encodeURIComponent(id)}`);
      assert.equal(resposta.status, 400, id);
      assert.deepEqual(await resposta.json(), {
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }
  });

  await t.test('rejeita dados inválidos sem inserir registros', async () => {
    const valido = { nome: 'Teste', cnpj: '11.222.333/0001-81' };
    for (const dados of [
      {}, { ...valido, nome: ' ' }, { ...valido, nome: 123 },
      { ...valido, cnpj: '11222333000182' }, { ...valido, cnpj: 123 },
      { ...valido, telefone: null }, { ...valido, telefone: 'abc' },
      { ...valido, telefone: '123' }, { ...valido, telefone: '1234567890123456' },
      { ...valido, email: null }, { ...valido, email: 'invalido' },
      { ...valido, endereco: 123 }
    ]) {
      const resposta = await cadastrar(dados);
      assert.equal(resposta.status, 400, JSON.stringify(dados));
      assert.equal(typeof (await resposta.json()).erro, 'string');
    }
    const lista = await fetch(`${url}/fornecedores`);
    assert.equal((await lista.json()).length, 2);
  });

  await t.test('preserva listagem de produtos e tratamento de JSON inválido', async () => {
    const produtos = await fetch(`${url}/produtos`);
    assert.equal(produtos.status, 200);
    assert.deepEqual(await produtos.json(), []);
    const resposta = await fetch(`${url}/fornecedores`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
    });
    assert.equal(resposta.status, 400);
  });

  await t.test('edita e persiste os cinco campos, mantendo o ID e o outro fornecedor', async () => {
    const resposta = await editar(1, {
      ...dadosEdicao, nome: ' Fornecedor Atualizado ', cnpj: '04.252.011/0001-10'
    });
    assert.equal(resposta.status, 200);
    const esperado = { id: 1, ...dadosEdicao, cnpj: '04252011000110' };
    assert.deepEqual(await resposta.json(), esperado);
    const consulta = await fetch(`${url}/fornecedores/1`);
    assert.deepEqual(await consulta.json(), esperado);
    const outro = await fetch(`${url}/fornecedores/2`);
    assert.equal((await outro.json()).cnpj, '12ABC34501DE35');
  });

  await t.test('rejeita edição inválida ou incompleta sem alterar os dados', async () => {
    const antes = await (await fetch(`${url}/fornecedores/1`)).json();
    const invalidos = [
      {}, { ...dadosEdicao, nome: ' ' }, { ...dadosEdicao, nome: 1 },
      { ...dadosEdicao, cnpj: '11222333000182' }, { ...dadosEdicao, cnpj: null },
      { ...dadosEdicao, telefone: 'abc' }, { ...dadosEdicao, telefone: null },
      { ...dadosEdicao, email: 'invalido' }, { ...dadosEdicao, email: 123 },
      { ...dadosEdicao, endereco: null }
    ];
    for (const campo of Object.keys(dadosEdicao)) {
      const incompleto = { ...dadosEdicao };
      delete incompleto[campo];
      invalidos.push(incompleto);
    }
    for (const dados of invalidos) {
      const resposta = await editar(1, dados);
      assert.equal(resposta.status, 400, JSON.stringify(dados));
      assert.equal(typeof (await resposta.json()).erro, 'string');
    }
    assert.deepEqual(await (await fetch(`${url}/fornecedores/1`)).json(), antes);
  });

  await t.test('edição retorna 400 para ID inválido e 404 para inexistente', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      assert.equal((await editar(id, dadosEdicao)).status, 400, id);
    }
    const resposta = await editar(999, dadosEdicao);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Fornecedor não encontrado.' });
  });

  await t.test('edição rejeita CNPJ de outro fornecedor sem alterar o registro', async () => {
    const antes = await (await fetch(`${url}/fornecedores/1`)).json();
    const resposta = await editar(1, { ...dadosEdicao, cnpj: '12.abc.345/01de-35' });
    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), { erro: 'Já existe um fornecedor com esse CNPJ.' });
    assert.deepEqual(await (await fetch(`${url}/fornecedores/1`)).json(), antes);
  });

  await t.test('permite manter o próprio CNPJ e limpar campos opcionais explicitamente', async () => {
    const dados = { ...dadosEdicao, cnpj: '04252011000110', telefone: '', email: '', endereco: '' };
    for (let i = 0; i < 2; i++) {
      const resposta = await editar(1, dados);
      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), { id: 1, ...dados });
    }
    assert.deepEqual(await (await fetch(`${url}/fornecedores/1`)).json(), { id: 1, ...dados });
  });

  await t.test('exclusão rejeita IDs inválidos sem remover fornecedores', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      const resposta = await excluir(id);
      assert.equal(resposta.status, 400, id);
      assert.deepEqual(await resposta.json(), {
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }
    assert.equal((await consultar('SELECT id FROM fornecedores')).length, 2);
  });

  await t.test('exclusão de fornecedor inexistente retorna 404', async () => {
    const resposta = await excluir(999);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Fornecedor não encontrado.' });
  });

  await t.test('exclui fornecedor e vínculos, preservando produtos e outro fornecedor', async () => {
    await executar(`
      INSERT INTO produtos (nome, codigo_barras, preco, quantidade)
      VALUES ('Produto preservado', 'teste-exclusao', 25, 5);
      INSERT INTO produtos_fornecedores (produto_id, fornecedor_id)
      VALUES (1, 1), (1, 2);
    `);
    const produtosAntes = await consultar('SELECT * FROM produtos ORDER BY id');
    const outroAntes = await (await fetch(`${url}/fornecedores/2`)).json();
    const resposta = await excluir(1);
    assert.equal(resposta.status, 204);
    assert.equal(await resposta.text(), '');
    assert.equal((await fetch(`${url}/fornecedores/1`)).status, 404);
    assert.equal((await excluir(1)).status, 404);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await (await fetch(`${url}/fornecedores/2`)).json(), outroAntes);
    assert.deepEqual(await (await fetch(`${url}/fornecedores`)).json(), [outroAntes]);
    assert.deepEqual(await consultar('SELECT * FROM produtos_fornecedores'), [
      { produto_id: 1, fornecedor_id: 2 }
    ]);
  });

  await t.test('também exclui fornecedor sem vínculos', async () => {
    await executar('DELETE FROM produtos_fornecedores WHERE fornecedor_id = 2');
    const resposta = await excluir(2);
    assert.equal(resposta.status, 204);
    assert.equal(await resposta.text(), '');
    assert.deepEqual(await (await fetch(`${url}/fornecedores`)).json(), []);
    assert.equal((await consultar('SELECT id FROM produtos')).length, 1);
  });

  await t.test('falha no banco retorna 500 com mensagem pública genérica', async () => {
    await executar('DROP TABLE fornecedores');
    const resposta = await cadastrar({ nome: 'Teste', cnpj: '11222333000181' });
    assert.equal(resposta.status, 500);
    assert.deepEqual(await resposta.json(), {
      erro: 'Não foi possível cadastrar o fornecedor.'
    });

    const consulta = await fetch(`${url}/fornecedores/1`);
    assert.equal(consulta.status, 500);
    assert.deepEqual(await consulta.json(), {
      erro: 'Não foi possível consultar o fornecedor.'
    });

    const edicao = await editar(1, dadosEdicao);
    assert.equal(edicao.status, 500);
    assert.deepEqual(await edicao.json(), {
      erro: 'Não foi possível editar o fornecedor.'
    });

    const exclusao = await excluir(1);
    assert.equal(exclusao.status, 500);
    assert.deepEqual(await exclusao.json(), {
      erro: 'Não foi possível excluir o fornecedor.'
    });
  });
});
