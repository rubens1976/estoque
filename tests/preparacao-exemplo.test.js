const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { preencherBancoNovo, prepararArquivo } = require('../scripts/preparar-dados-exemplo');
const { consultar, executar } = require('../utils/estoque-unidades');
const fechar = db => new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve()));

test('preparação completa parte do zero e conserva o estoque em todas as unidades', async t => {
  const db = new sqlite3.Database(':memory:');
  t.after(() => fechar(db));
  assert.deepEqual(await preencherBancoNovo(db), {
    produtos: 20, fornecedores: 14, vinculos: 40, pecas: 532, unidades: 9
  });
  assert.equal((await consultar(db, 'SELECT COUNT(*) n FROM estoque_unidades'))[0].n, 180);
  assert.equal((await consultar(db, 'SELECT COUNT(*) n FROM produtos_fornecedores'))[0].n, 40);
  assert.deepEqual(await consultar(db, `SELECT p.id FROM produtos p LEFT JOIN estoque_unidades e
    ON e.produto_id = p.id GROUP BY p.id HAVING p.quantidade != SUM(e.quantidade)`), []);
  const saldos = await consultar(db, `SELECT unidade_id, SUM(quantidade) quantidade
    FROM estoque_unidades GROUP BY unidade_id ORDER BY unidade_id`);
  assert.equal(saldos.length, 9);
  assert(saldos.every(s => s.quantidade > 0));
  assert.equal(saldos.reduce((n, s) => n + s.quantidade, 0), 532);
  assert.deepEqual(await consultar(db, 'PRAGMA foreign_key_check'), []);
  assert.equal((await consultar(db, `SELECT COUNT(*) n FROM fornecedores WHERE
    TRIM(telefone) = '' OR TRIM(email) = '' OR TRIM(endereco) = ''`))[0].n, 0);

  await executar(db, "UPDATE produtos SET nome = 'Nome alterado pelo usuário' WHERE id = 1");
  await assert.rejects(preencherBancoNovo(db), /banco novo e vazio/);
  assert.equal((await consultar(db, 'SELECT nome FROM produtos WHERE id = 1'))[0].nome, 'Nome alterado pelo usuário');
  assert.deepEqual(await consultar(db, `SELECT unidade_id, SUM(quantidade) quantidade
    FROM estoque_unidades GROUP BY unidade_id ORDER BY unidade_id`), saldos);

  const outro = new sqlite3.Database(':memory:');
  try {
    await preencherBancoNovo(outro);
    assert.deepEqual(await consultar(outro, `SELECT unidade_id, SUM(quantidade) quantidade
      FROM estoque_unidades GROUP BY unidade_id ORDER BY unidade_id`), saldos);
  } finally { await fechar(outro); }
});

test('arquivo preparado abre em SQLite e uma segunda execução preserva seus bytes', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'conectabyte-teste-'));
  const destino = path.join(pasta, 'estoque.db');
  try {
    await prepararArquivo(destino);
    const antes = fs.readFileSync(destino);
    await assert.rejects(prepararArquivo(destino), /Arquivo já existe/);
    assert.deepEqual(fs.readFileSync(destino), antes);
    const db = new sqlite3.Database(destino, sqlite3.OPEN_READONLY);
    try {
      assert.equal((await consultar(db, 'PRAGMA integrity_check'))[0].integrity_check, 'ok');
      assert.equal((await consultar(db, 'SELECT SUM(quantidade) n FROM produtos'))[0].n, 532);
    } finally { await fechar(db); }
  } finally {
    fs.rmSync(destino, { force: true });
    fs.rmdirSync(pasta);
  }
});
