const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const sqlite3 = require('sqlite3');

test('vínculos entre produtos e fornecedores usam somente banco em memória', async (t) => {
  const raiz = path.join(__dirname, '..');
  const requireApp = createRequire(path.join(raiz, 'app.js'));
  // Executa a configuração real da conexão, trocando o arquivo por :memory:.
  const contextoBanco = {
    require: nome => nome === 'sqlite3' ? {
      verbose() { return this; },
      Database: function (_arquivo, callback) {
        return new sqlite3.Database(':memory:', callback);
      }
    } : requireApp(nome),
    __dirname: raiz, module: { exports: {} },
    console: { log() {}, error() {} }, process
  };
  vm.runInNewContext(fs.readFileSync(path.join(raiz, 'database.js'), 'utf8'), contextoBanco);
  const db = contextoBanco.module.exports;
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
  assert.deepEqual(await consultar('PRAGMA foreign_keys'), [{ foreign_keys: 1 }]);
  const criacao = fs.readFileSync(path.join(raiz, 'criar-tabelas.js'), 'utf8');
  await executar(criacao.match(/db\.exec\(`([\s\S]*?)`/)[1].replace('PRAGMA foreign_keys = ON;', ''));
  await executar(`
    INSERT INTO produtos (nome, codigo_barras, preco, quantidade)
    VALUES ('Teclado', '001', 50, 10), ('Mouse', '002', 25, 20);
    INSERT INTO fornecedores (nome, cnpj)
    VALUES ('Fornecedor A', '11222333000181'), ('Fornecedor B', '12ABC34501DE35');
  `);
  const produtosAntes = await consultar('SELECT * FROM produtos ORDER BY id');
  const fornecedoresAntes = await consultar('SELECT * FROM fornecedores ORDER BY id');

  const app = express();
  app.listen = (_porta, callback) => {
    servidor = require('node:http').createServer(app);
    return servidor.listen(0, '127.0.0.1', callback);
  };
  function expressTeste() { return app; }
  expressTeste.json = express.json;
  vm.runInNewContext(fs.readFileSync(path.join(raiz, 'app.js'), 'utf8'), {
    require: nome => nome === './database' ? db
      : nome === 'express' ? expressTeste : requireApp(nome),
    console: { log() {}, error() {} }, process
  });
  if (!servidor.listening) await new Promise(resolve => servidor.once('listening', resolve));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const vincular = (id, dados) => fetch(`${url}/produtos/${encodeURIComponent(id)}/fornecedores`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  const vinculos = () => consultar('SELECT * FROM produtos_fornecedores ORDER BY produto_id, fornecedor_id');
  const listarFornecedores = id => fetch(`${url}/produtos/${encodeURIComponent(id)}/fornecedores`);
  const listarProdutos = id => fetch(`${url}/fornecedores/${encodeURIComponent(id)}/produtos`);
  const desvincular = (produtoId, fornecedorId) => fetch(
    `${url}/produtos/${encodeURIComponent(produtoId)}/fornecedores/${encodeURIComponent(fornecedorId)}`,
    { method: 'DELETE' }
  );

  await t.test('fornecedor existente sem produtos retorna 200 e lista vazia', async () => {
    const resposta = await listarProdutos(1);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), []);
  });

  await t.test('consulta dos produtos rejeita IDs de fornecedor inválidos', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      const resposta = await listarProdutos(id);
      assert.equal(resposta.status, 400, id);
      assert.deepEqual(await resposta.json(), {
        erro: 'Informe um ID de fornecedor inteiro maior que zero.'
      });
    }
  });

  await t.test('consulta dos produtos de fornecedor inexistente retorna 404', async () => {
    const resposta = await listarProdutos(999);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Fornecedor não encontrado.' });
  });

  await t.test('produto existente sem fornecedores retorna 200 e lista vazia', async () => {
    const resposta = await listarFornecedores(1);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), []);
  });

  await t.test('consulta dos fornecedores rejeita IDs inválidos com 400', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      const resposta = await listarFornecedores(id);
      assert.equal(resposta.status, 400, id);
      assert.deepEqual(await resposta.json(), {
        erro: 'Informe um ID de produto inteiro maior que zero.'
      });
    }
  });

  await t.test('consulta dos fornecedores de produto inexistente retorna 404', async () => {
    const resposta = await listarFornecedores(999);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Produto não encontrado.' });
  });

  await t.test('rejeita IDs inválidos e fornecedor_id ausente ou textual', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      assert.equal((await vincular(id, { fornecedor_id: 1 })).status, 400, id);
    }
    for (const valor of [undefined, null, '', '1', 0, -1, 1.5, true, [], {}, 9007199254740992]) {
      assert.equal((await vincular(1, { fornecedor_id: valor })).status, 400);
    }
    assert.deepEqual(await vinculos(), []);
  });

  await t.test('retorna 404 sem criar vínculo se uma entidade não existir', async () => {
    for (const [produtoId, fornecedorId, erro] of [
      [999, 1, 'Produto não encontrado.'],
      [1, 999, 'Fornecedor não encontrado.'],
      [999, 999, 'Produto não encontrado.']
    ]) {
      const resposta = await vincular(produtoId, { fornecedor_id: fornecedorId });
      assert.equal(resposta.status, 404);
      assert.deepEqual(await resposta.json(), { erro });
    }
    assert.deepEqual(await vinculos(), []);
  });

  await t.test('cria o vínculo e devolve os IDs com 201', async () => {
    const resposta = await vincular(1, { fornecedor_id: 1 });
    assert.equal(resposta.status, 201);
    const esperado = { produto_id: 1, fornecedor_id: 1 };
    assert.deepEqual(await resposta.json(), esperado);
    assert.deepEqual(await vinculos(), [esperado]);
  });

  await t.test('repetição retorna 409 e mantém um único vínculo', async () => {
    const resposta = await vincular(1, { fornecedor_id: 1 });
    assert.equal(resposta.status, 409);
    assert.deepEqual(await resposta.json(), { erro: 'Este fornecedor já está vinculado ao produto.' });
    assert.equal((await vinculos()).length, 1);
  });

  await t.test('consulta retorna apenas os fornecedores vinculados ao produto solicitado', async () => {
    const resposta = await listarFornecedores(1);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), [fornecedoresAntes[0]]);
    const outro = await listarFornecedores(2);
    assert.equal(outro.status, 200);
    assert.deepEqual(await outro.json(), []);
    assert.deepEqual(await vinculos(), [{ produto_id: 1, fornecedor_id: 1 }]);
  });

  await t.test('consulta retorna apenas os produtos do fornecedor solicitado', async () => {
    const resposta = await listarProdutos(1);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), [produtosAntes[0]]);
    const outro = await listarProdutos(2);
    assert.equal(outro.status, 200);
    assert.deepEqual(await outro.json(), []);
    assert.deepEqual(await vinculos(), [{ produto_id: 1, fornecedor_id: 1 }]);
  });

  await t.test('permite vários fornecedores por produto e vários produtos por fornecedor', async () => {
    assert.equal((await vincular(1, { fornecedor_id: 2 })).status, 201);
    assert.equal((await vincular(2, { fornecedor_id: 1 })).status, 201);
    const simultaneas = await Promise.all([
      vincular(2, { fornecedor_id: 2 }), vincular(2, { fornecedor_id: 2 })
    ]);
    assert.deepEqual(simultaneas.map(r => r.status).sort(), [201, 409]);
    assert.deepEqual(await vinculos(), [
      { produto_id: 1, fornecedor_id: 1 }, { produto_id: 1, fornecedor_id: 2 },
      { produto_id: 2, fornecedor_id: 1 }, { produto_id: 2, fornecedor_id: 2 }
    ]);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await consultar('SELECT * FROM fornecedores ORDER BY id'), fornecedoresAntes);
  });

  await t.test('consulta lista vários fornecedores em ordem e não altera os dados', async () => {
    const antes = await vinculos();
    for (const id of [1, 2]) {
      const resposta = await listarFornecedores(id);
      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), fornecedoresAntes);
    }
    assert.deepEqual(await vinculos(), antes);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await consultar('SELECT * FROM fornecedores ORDER BY id'), fornecedoresAntes);
  });

  await t.test('consulta lista vários produtos ordenados sem alterar dados', async () => {
    const antes = await vinculos();
    for (const id of [1, 2]) {
      const resposta = await listarProdutos(id);
      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), produtosAntes);
    }
    assert.deepEqual(await vinculos(), antes);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await consultar('SELECT * FROM fornecedores ORDER BY id'), fornecedoresAntes);
  });

  await t.test('remoção de vínculo rejeita IDs inválidos sem alterar associações', async () => {
    const antes = await vinculos();
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992', '1 OR 1=1']) {
      for (const [produtoId, fornecedorId, entidade] of [[id, 1, 'produto'], [1, id, 'fornecedor']]) {
        const resposta = await desvincular(produtoId, fornecedorId);
        assert.equal(resposta.status, 400);
        assert.deepEqual(await resposta.json(), {
          erro: `Informe um ID de ${entidade} inteiro maior que zero.`
        });
      }
    }
    assert.deepEqual(await vinculos(), antes);
  });

  await t.test('remoção de vínculo inexistente retorna 404', async () => {
    const antes = await vinculos();
    for (const [produtoId, fornecedorId] of [[999, 1], [1, 999], [999, 999]]) {
      const resposta = await desvincular(produtoId, fornecedorId);
      assert.equal(resposta.status, 404);
      assert.deepEqual(await resposta.json(), { erro: 'Vínculo não encontrado.' });
    }
    assert.deepEqual(await vinculos(), antes);
  });

  await t.test('remove somente o par solicitado e permite criar o vínculo novamente', async () => {
    const resposta = await desvincular(1, 1);
    assert.equal(resposta.status, 204);
    assert.equal(await resposta.text(), '');
    assert.deepEqual(await vinculos(), [
      { produto_id: 1, fornecedor_id: 2 },
      { produto_id: 2, fornecedor_id: 1 },
      { produto_id: 2, fornecedor_id: 2 }
    ]);
    assert.deepEqual(await (await listarFornecedores(1)).json(), [fornecedoresAntes[1]]);
    assert.deepEqual(await (await listarProdutos(1)).json(), [produtosAntes[1]]);
    assert.deepEqual(await (await fetch(`${url}/produtos/1`)).json(), produtosAntes[0]);
    assert.deepEqual(await (await fetch(`${url}/fornecedores/1`)).json(), fornecedoresAntes[0]);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await consultar('SELECT * FROM fornecedores ORDER BY id'), fornecedoresAntes);
    const repeticao = await desvincular(1, 1);
    assert.equal(repeticao.status, 404);
    assert.deepEqual(await repeticao.json(), { erro: 'Vínculo não encontrado.' });
    assert.equal((await vincular(1, { fornecedor_id: 1 })).status, 201);
    assert.deepEqual(await (await listarFornecedores(1)).json(), fornecedoresAntes);
  });

  await t.test('excluir fornecedor remove seus vínculos e preserva produtos', async () => {
    assert.equal((await fetch(`${url}/fornecedores/1`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await vinculos(), [
      { produto_id: 1, fornecedor_id: 2 }, { produto_id: 2, fornecedor_id: 2 }
    ]);
    assert.deepEqual(await consultar('SELECT * FROM produtos ORDER BY id'), produtosAntes);
    assert.deepEqual(await (await listarFornecedores(1)).json(), [fornecedoresAntes[1]]);
    assert.equal((await listarProdutos(1)).status, 404);
  });

  await t.test('excluir produto remove seus vínculos e preserva fornecedor', async () => {
    assert.equal((await fetch(`${url}/produtos/2`, { method: 'DELETE' })).status, 204);
    assert.deepEqual(await vinculos(), [{ produto_id: 1, fornecedor_id: 2 }]);
    assert.deepEqual(await consultar('SELECT * FROM fornecedores'), [fornecedoresAntes[1]]);
    assert.equal((await listarFornecedores(2)).status, 404);
    assert.deepEqual(await (await listarProdutos(2)).json(), [produtosAntes[0]]);
  });

  await t.test('remover o último vínculo deixa listas vazias e mantém ambos os cadastros', async () => {
    const produtoAntes = await (await fetch(`${url}/produtos/1`)).json();
    const fornecedorAntes = await (await fetch(`${url}/fornecedores/2`)).json();
    const resposta = await desvincular(1, 2);
    assert.equal(resposta.status, 204);
    assert.equal(await resposta.text(), '');
    assert.deepEqual(await vinculos(), []);
    for (const consulta of [listarFornecedores(1), listarProdutos(2)]) {
      const lista = await consulta;
      assert.equal(lista.status, 200);
      assert.deepEqual(await lista.json(), []);
    }
    const produto = await fetch(`${url}/produtos/1`);
    assert.equal(produto.status, 200);
    assert.deepEqual(await produto.json(), produtoAntes);
    const fornecedor = await fetch(`${url}/fornecedores/2`);
    assert.equal(fornecedor.status, 200);
    assert.deepEqual(await fornecedor.json(), fornecedorAntes);
  });

  await t.test('falha do banco retorna 500 sem expor detalhes SQL', async () => {
    await executar('DROP TABLE produtos_fornecedores');
    const resposta = await vincular(1, { fornecedor_id: 2 });
    assert.equal(resposta.status, 500);
    assert.deepEqual(await resposta.json(), { erro: 'Não foi possível vincular o fornecedor ao produto.' });

    const remocao = await desvincular(1, 2);
    assert.equal(remocao.status, 500);
    assert.deepEqual(await remocao.json(), {
      erro: 'Não foi possível remover o vínculo entre produto e fornecedor.'
    });

    const consultaVinculos = await listarFornecedores(1);
    assert.equal(consultaVinculos.status, 500);
    assert.deepEqual(await consultaVinculos.json(), {
      erro: 'Não foi possível consultar os fornecedores do produto.'
    });

    const consultaProdutos = await listarProdutos(2);
    assert.equal(consultaProdutos.status, 500);
    assert.deepEqual(await consultaProdutos.json(), {
      erro: 'Não foi possível consultar os produtos do fornecedor.'
    });

    await executar('DROP TABLE produtos');
    const consultaProduto = await listarFornecedores(1);
    assert.equal(consultaProduto.status, 500);
    assert.deepEqual(await consultaProduto.json(), {
      erro: 'Não foi possível consultar os fornecedores do produto.'
    });

    await executar('DROP TABLE fornecedores');
    const consultaFornecedor = await listarProdutos(2);
    assert.equal(consultaFornecedor.status, 500);
    assert.deepEqual(await consultaFornecedor.json(), {
      erro: 'Não foi possível consultar os produtos do fornecedor.'
    });
  });
});
