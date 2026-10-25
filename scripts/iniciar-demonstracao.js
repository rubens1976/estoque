const fs = require('node:fs');
const path = require('node:path');
const { prepararArquivo } = require('./preparar-dados-exemplo');

async function iniciar() {
  const arquivo = path.resolve(process.env.DB_PATH || path.join(__dirname, '../estoque.db'));
  process.env.DB_PATH = arquivo;
  if (!fs.existsSync(arquivo)) {
    const resumo = await prepararArquivo(arquivo);
    console.log('Dados de demonstracao preparados:', JSON.stringify(resumo));
  }
  require('../app');
}

if (require.main === module) {
  iniciar().catch(erro => {
    console.error('Falha ao iniciar demonstracao:', erro.message);
    process.exitCode = 1;
  });
}

module.exports = { iniciar };
