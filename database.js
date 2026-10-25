const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
  path.join(__dirname, 'estoque.db'),
  (erro) => {
    if (erro) {
      console.error('Erro ao abrir o banco:', erro.message);
      return;
    }

    console.log('Conectado ao banco SQLite.');
  }
);

// Ativa a integridade dos vínculos antes das consultas da aplicação.
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON', (erro) => {
    if (erro) {
      console.error('Erro ao ativar as chaves estrangeiras:', erro.message);
      process.exitCode = 1;
    }
  });
});

module.exports = db;
