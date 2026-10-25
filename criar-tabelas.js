const db = require('./database');

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    codigo_barras TEXT NOT NULL UNIQUE,
    preco REAL NOT NULL CHECK (preco >= 0),
    quantidade INTEGER NOT NULL DEFAULT 0
      CHECK (quantidade >= 0)
  );

  CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    telefone TEXT,
    email TEXT,
    endereco TEXT
  );

  CREATE TABLE IF NOT EXISTS produtos_fornecedores (
    produto_id INTEGER NOT NULL,
    fornecedor_id INTEGER NOT NULL,
    PRIMARY KEY (produto_id, fornecedor_id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
      ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
      ON DELETE CASCADE
  );
`, async (erro) => {
  if (erro) {
    console.error('Erro ao criar tabelas:', erro.message);
    process.exitCode = 1;
  } else {
    try {
      await require('./utils/estoque-unidades').inicializarEstoque(db);
      console.log('Tabelas e estoque por unidade criados com sucesso!');
    } catch (falha) {
      console.error('Erro ao preparar estoque por unidade:', falha.message);
      process.exitCode = 1;
    }
  }

  db.close();
});
