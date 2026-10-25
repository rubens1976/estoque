const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { inicializarEstoque, executar, consultar } = require('../utils/estoque-unidades');

async function principal() {
  const raiz = path.resolve(__dirname, '..');
  const arquivoDb = path.join(raiz, 'estoque.db');
  if (!fs.existsSync(arquivoDb)) throw new Error('Banco não encontrado. Execute node criar-tabelas.js primeiro.');
  const db = new sqlite3.Database(arquivoDb, sqlite3.OPEN_READWRITE);
  db.configure('busyTimeout', 5000);
  try {
    fs.mkdirSync(path.join(raiz, 'backups'), { recursive: true });
    const backup = path.join(raiz, 'backups', `estoque-antes-unidades-${Date.now()}.db`);
    await executar(db, 'VACUUM INTO ?', [backup]);
    console.log(`Cópia de segurança: ${backup}`);
    await inicializarEstoque(db);
    const [resumo] = await consultar(db, `SELECT COUNT(*) AS saldos, SUM(quantidade) AS quantidade FROM estoque_unidades`);
    console.log(`Estoque por unidade pronto: ${resumo.saldos} saldos, ${resumo.quantidade || 0} peças.`);
  } finally {
    await new Promise((resolve, reject) => db.close(erro => erro ? reject(erro) : resolve()));
  }
}
principal().catch(erro => { console.error(erro.message); process.exitCode = 1; });
