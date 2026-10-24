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

module.exports = db;