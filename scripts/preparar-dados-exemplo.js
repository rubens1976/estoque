const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const sqlite3 = require('sqlite3');
const esquema = require('../utils/esquema-base');
const { fornecedores } = require('./popular-fornecedores-exemplo');
const { vinculos } = require('./vincular-produtos-fornecedores-exemplo');
const { prepararProdutos } = require('./importar-produtos-csv');
const { validarFornecedor } = require('../utils/fornecedor');
const { inicializarEstoque, executar, consultar } = require('../utils/estoque-unidades');

const exec = (db, sql) => new Promise((resolve, reject) =>
  db.exec(sql, erro => erro ? reject(erro) : resolve()));
const fechar = db => new Promise((resolve, reject) =>
  db.close(erro => erro ? reject(erro) : resolve()));

// Recebe exclusivamente uma conexão nova; nunca mistura exemplos com dados de uso.
async function preencherBancoNovo(db) {
  const tabelas = await consultar(db, "SELECT name FROM sqlite_master WHERE type = 'table'");
  if (tabelas.length) throw new Error('A preparação exige um banco novo e vazio.');
  const produtos = [{ nome: 'Teclado USB', descricao: 'Teclado USB com fio para computador, layout ABNT2.',
    codigo_barras: 'DEMO-CB-TECLADO-USB', preco: 89.90, quantidade: 10 }, ...prepararProdutos()];
  await exec(db, esquema);
  await executar(db, 'BEGIN IMMEDIATE');
  try {
    for (const p of produtos) {
      await executar(db, `INSERT INTO produtos (nome, descricao, codigo_barras, preco, quantidade)
        VALUES (?, ?, ?, ?, ?)`, [p.nome, p.descricao, p.codigo_barras, p.preco, p.quantidade]);
    }
    for (const dados of fornecedores) {
      const resultado = validarFornecedor(dados, { cadastro: true });
      if (resultado.erro) throw new Error(resultado.erro);
      const f = resultado.fornecedor;
      await executar(db, `INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco)
        VALUES (?, ?, ?, ?, ?)`, [f.nome, f.cnpj, f.telefone, f.email, f.endereco]);
    }
    const porNome = new Map((await consultar(db, 'SELECT id, nome FROM produtos')).map(p => [p.nome, p.id]));
    const porCnpj = new Map((await consultar(db, 'SELECT id, cnpj FROM fornecedores')).map(f => [f.cnpj, f.id]));
    for (const [nome, ...cnpjs] of vinculos) {
      if (!porNome.has(nome)) throw new Error(`Produto ausente: ${nome}`);
      for (const cnpj of cnpjs) {
        if (!porCnpj.has(cnpj)) throw new Error(`Fornecedor ausente: ${cnpj}`);
        await executar(db, 'INSERT INTO produtos_fornecedores VALUES (?, ?)', [porNome.get(nome), porCnpj.get(cnpj)]);
      }
    }
    await executar(db, 'COMMIT');
  } catch (erro) {
    await executar(db, 'ROLLBACK');
    throw erro;
  }
  // Distribui o catálogo inteiro antes de instalar os gatilhos de novos cadastros.
  await inicializarEstoque(db);
  const falhas = await consultar(db, 'PRAGMA foreign_key_check');
  const integridade = await consultar(db, 'PRAGMA integrity_check');
  if (falhas.length || integridade[0].integrity_check !== 'ok') throw new Error('Falha na integridade do banco.');
  return { produtos: produtos.length, fornecedores: fornecedores.length,
    vinculos: vinculos.reduce((n, linha) => n + linha.length - 1, 0),
    pecas: produtos.reduce((n, p) => n + p.quantidade, 0), unidades: 9 };
}

async function prepararArquivo(destino) {
  const absoluto = path.resolve(destino);
  if (fs.existsSync(absoluto)) throw new Error(`Arquivo já existe; nenhum dado foi alterado: ${absoluto}`);
  const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'conectabyte-exemplo-'));
  const arquivo = path.join(temporario, 'estoque.db');
  const db = new sqlite3.Database(arquivo);
  let resumo;
  try {
    resumo = await preencherBancoNovo(db);
  } finally {
    await fechar(db);
    // A publicação é feita abaixo, somente depois do fechamento completo do SQLite.
    if (!resumo) {
      fs.rmSync(arquivo, { force: true });
      fs.rmdirSync(temporario);
    }
  }
  try {
    fs.mkdirSync(path.dirname(absoluto), { recursive: true });
    fs.copyFileSync(arquivo, absoluto, fs.constants.COPYFILE_EXCL);
    return resumo;
  } finally {
    fs.rmSync(arquivo, { force: true });
    fs.rmdirSync(temporario);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const valido = args.length === 0 || (args.length === 2 && args[0] === '--banco');
  if (!valido) {
    console.error('Uso: npm run preparar:exemplo -- [--banco caminho/estoque.db]');
    process.exitCode = 1;
  } else {
    const destino = path.resolve(args[1] || path.join(__dirname, '../estoque.db'));
    prepararArquivo(destino).then(resumo => {
      console.log(`Banco de demonstração criado: ${destino}`);
      console.log(JSON.stringify(resumo));
    }).catch(erro => { console.error(erro.message); process.exitCode = 1; });
  }
}

module.exports = { preencherBancoNovo, prepararArquivo };
