// Atualiza somente descrição e preço dos produtos importados do CSV revisado.
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { prepararProdutos } = require('./importar-produtos-csv');

const raiz = path.resolve(__dirname, '..');
const arquivoDb = path.join(raiz, 'estoque.db');
const aplicar = process.argv.includes('--aplicar');

function consultar(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (erro, linhas) => erro ? reject(erro) : resolve(linhas));
  });
}

function executar(db, sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, function (erro) {
      if (erro) reject(erro);
      else resolve(this.changes);
    });
  });
}

async function principal() {
  const catalogo = prepararProdutos();
  if (!fs.existsSync(arquivoDb)) throw new Error('Banco não encontrado. Execute node criar-tabelas.js primeiro.');
  const db = new sqlite3.Database(arquivoDb, sqlite3.OPEN_READWRITE);
  try {
    const existentes = await consultar(db,
      'SELECT id, nome, descricao, codigo_barras, preco, quantidade FROM produtos');
    const porNome = new Map(existentes.map(produto => [produto.nome.toLocaleLowerCase('pt-BR'), produto]));
    const mudancas = [];

    for (const produto of catalogo) {
      const atual = porNome.get(produto.nome.toLocaleLowerCase('pt-BR'));
      if (!atual || atual.codigo_barras !== produto.codigo_barras) {
        throw new Error(`Produto importado ausente ou com código alterado: ${produto.nome}.`);
      }
      if (atual.descricao !== produto.descricao || atual.preco !== produto.preco) {
        mudancas.push({ atual, produto });
      }
    }

    console.log(`${catalogo.length} produtos revisados; ${mudancas.length} com preço ou descrição diferente no banco.`);
    for (const { atual, produto } of mudancas) {
      console.log(`${produto.nome}: R$ ${atual.preco.toFixed(2)} → R$ ${produto.preco.toFixed(2)}`);
    }
    if (!aplicar || mudancas.length === 0) {
      if (!aplicar) console.log('Prévia apenas. Use --aplicar para atualizar o banco.');
      return;
    }

    const pastaBackup = path.join(raiz, 'backups');
    fs.mkdirSync(pastaBackup, { recursive: true });
    const arquivoBackup = path.join(pastaBackup, `estoque-antes-revisao-${Date.now()}.db`);
    await executar(db, 'VACUUM INTO ?', [arquivoBackup]);
    console.log(`Cópia de segurança: ${arquivoBackup}`);

    await executar(db, 'BEGIN IMMEDIATE');
    try {
      for (const { atual, produto } of mudancas) {
        const linhas = await executar(db,
          'UPDATE produtos SET descricao = ?, preco = ? WHERE id = ? AND codigo_barras = ?',
          [produto.descricao, produto.preco, atual.id, produto.codigo_barras]);
        if (linhas !== 1) throw new Error(`Não foi possível atualizar ${produto.nome}.`);
      }
      await executar(db, 'COMMIT');
    } catch (erro) {
      await executar(db, 'ROLLBACK');
      throw erro;
    }
    console.log(`${mudancas.length} produto(s) atualizados. Quantidades e vínculos foram preservados.`);
  } finally {
    await new Promise((resolve, reject) => db.close(erro => erro ? reject(erro) : resolve()));
  }
}

principal().catch(erro => {
  console.error(`Revisão cancelada: ${erro.message}`);
  process.exitCode = 1;
});
