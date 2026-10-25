const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const sqlite3 = require('sqlite3');
const { preencherBancoNovo } = require('../scripts/preparar-dados-exemplo');
const { consultar } = require('../utils/estoque-unidades');

// A coleção usa YAML com objetos JSON em fluxo em cada item.
// Lê diretamente o arquivo importável, sem manter uma segunda lista de requisições.
const texto = fs.readFileSync(path.join(__dirname, '../conectabyte-insomnia'), 'utf8');
const requisicoes = texto.split('\n').filter(l => l.startsWith('  - ')).map(l => JSON.parse(l.slice(4)));
const ambiente = JSON.parse(texto.split('\n').find(l => l.startsWith('environments: ')).slice(14)).data;

test('coleção Insomnia executa o roteiro duas vezes sem depender de IDs antigos', async t => {
  const db = new sqlite3.Database(':memory:');
  const app = express();
  app.use(express.json());
  let servidor;
  t.after(async () => {
    if (servidor) await new Promise(resolve => servidor.close(resolve));
    await new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve()));
  });
  await preencherBancoNovo(db);
  for (const controlador of ['produtos', 'fornecedores', 'associacoes', 'estoque']) {
    require(`../controllers/${controlador}`)(app, db);
  }
  servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const variaveis = { ...ambiente, base_url: `http://127.0.0.1:${servidor.address().port}` };
  const baseEnvironment = {
    get: chave => variaveis[chave],
    set: (chave, valor) => { variaveis[chave] = valor; }
  };
  const interpolar = texto => texto.replace(/{{ _\.(\w+) }}/g, (_, chave) => {
    assert.notEqual(variaveis[chave], undefined, `Variável ausente: ${chave}`);
    return variaveis[chave];
  });
  const snapshot = async () => {
    const dados = {};
    for (const tabela of ['produtos', 'fornecedores', 'produtos_fornecedores', 'estoque_unidades', 'unidades']) {
      dados[tabela] = await consultar(db, `SELECT * FROM ${tabela} ORDER BY rowid`);
    }
    return dados;
  };
  const antes = await snapshot();
  assert.equal(requisicoes.length, 18);
  const exclusao = requisicoes.find(r => r.name.startsWith('17'));
  assert.throws(() => vm.runInNewContext(exclusao.scripts.preRequest, { insomnia: { baseEnvironment } }), /cadastro/);
  let ultimoProduto = 0;
  for (let rodada = 0; rodada < 2; rodada++) {
    for (const r of requisicoes) {
      vm.runInNewContext(r.scripts.preRequest, { insomnia: { baseEnvironment } });
      const resposta = await fetch(interpolar(r.url), {
        method: r.method,
        headers: Object.fromEntries((r.headers || []).map(h => [h.name, h.value])),
        ...(r.body ? { body: interpolar(r.body.text) } : {})
      });
      const corpo = resposta.status === 204 ? null : await resposta.json();
      vm.runInNewContext(r.scripts.afterResponse, {
        insomnia: {
          baseEnvironment, response: { code: resposta.status, status: resposta.statusText, json: () => corpo },
          test: (_nome, fn) => fn(),
          expect: valor => ({ to: { eql: esperado => assert.equal(valor, esperado, r.name) } })
        }
      });
      if (r.name.startsWith('05')) {
        assert(variaveis.produto_teste_id > ultimoProduto);
        ultimoProduto = variaveis.produto_teste_id;
        assert.equal(corpo.quantidade, 15);
      }
      if (r.name.startsWith('06')) assert.equal(corpo.quantidade, 15);
      if (r.name.startsWith('10')) assert.equal(corpo[0].id, variaveis.fornecedor_teste_id);
      if (r.name.startsWith('11')) assert.equal(corpo[0].id, variaveis.produto_teste_id);
      if (r.name.startsWith('14')) {
        const saldos = await consultar(db, 'SELECT unidade_id, quantidade FROM estoque_unidades WHERE produto_id = ? ORDER BY unidade_id', [ultimoProduto]);
        assert.deepEqual(saldos, [{ unidade_id: 1, quantidade: 13 }, { unidade_id: 2, quantidade: 2 }]);
      }
    }
    assert.equal(variaveis.produto_teste_id, 0);
    assert.equal(variaveis.fornecedor_teste_id, 0);
    assert.deepEqual(await snapshot(), antes);
    assert.deepEqual(await consultar(db, 'PRAGMA foreign_key_check'), []);
  }
});
