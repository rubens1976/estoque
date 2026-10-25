const express = require('express');
const db = require('./database');
const registrarProdutos = require('./controllers/produtos');
const registrarFornecedores = require('./controllers/fornecedores');
const registrarAssociacoes = require('./controllers/associacoes');
const registrarEstoque = require('./controllers/estoque');

const app = express();
const PORT = 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Página inicial.
app.get('/', (req, res) => {
  res.send('Sistema de Controle de Estoque — API em funcionamento.');
});

registrarProdutos(app, db);
registrarFornecedores(app, db);
registrarAssociacoes(app, db);
registrarEstoque(app, db);


// Trata endereços inexistentes.
app.use((req, res) => {
  return res.status(404).json({
    erro: 'Rota não encontrada.'
  });
});

// Trata JSON inválido e outros erros da aplicação.
app.use((erro, req, res, next) => {
  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'O JSON enviado está malformado.'
    });
  }

  if (erro.type === 'entity.too.large') {
    return res.status(413).json({
      erro: 'O conteúdo enviado excede o limite permitido.'
    });
  }

  console.error('Erro na aplicação:', erro.message);

  return res.status(500).json({
    erro: 'Ocorreu um erro interno no servidor.'
  });
});

const servidor = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}/`);
});

servidor.on('error', (erro) => {
  console.error(
    'Não foi possível iniciar o servidor:',
    erro.message
  );

  process.exitCode = 1;
});
