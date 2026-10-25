const db = require('./database');

db.exec(require('./utils/esquema-base'), async (erro) => {
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
