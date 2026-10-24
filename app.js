const express = require('express');
const db = require('./database');

const app = express();
const PORT = 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Página inicial.
app.get('/', (req, res) => {
  res.send('Sistema de Controle de Estoque — API em funcionamento.');
});

// Lista os produtos cadastrados.
app.get('/produtos', (req, res) => {
  const sql = 'SELECT * FROM produtos ORDER BY id';

  db.all(sql, [], (erro, produtos) => {
    if (erro) {
      console.error('Erro ao consultar produtos:', erro.message);

      return res.status(500).json({
        erro: 'Não foi possível consultar os produtos.'
      });
    }

    return res.status(200).json(produtos);
  });
});

// Cadastra um produto.
app.post('/produtos', (req, res) => {
  const {
    nome,
    descricao = '',
    codigo_barras,
    preco,
    quantidade = 0
  } = req.body || {};

  if (typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({
      erro: 'Informe o nome do produto.'
    });
  }

  if (
    typeof codigo_barras !== 'string' ||
    !codigo_barras.trim()
  ) {
    return res.status(400).json({
      erro: 'Informe o código de barras como texto.'
    });
  }

  if (typeof descricao !== 'string') {
    return res.status(400).json({
      erro: 'A descrição deve ser um texto.'
    });
  }

  if (
    typeof preco !== 'number' ||
    !Number.isFinite(preco) ||
    preco < 0
  ) {
    return res.status(400).json({
      erro: 'O preço deve ser um número maior ou igual a zero.'
    });
  }

  if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
    return res.status(400).json({
      erro: 'A quantidade deve ser um número inteiro maior ou igual a zero.'
    });
  }

  const produto = {
    nome: nome.trim(),
    descricao: descricao.trim(),
    codigo_barras: codigo_barras.trim(),
    preco,
    quantidade
  };

  const sql = `
    INSERT INTO produtos (
      nome, descricao, codigo_barras, preco, quantidade
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  const parametros = [
    produto.nome,
    produto.descricao,
    produto.codigo_barras,
    produto.preco,
    produto.quantidade
  ];

  db.run(sql, parametros, function (erro) {
    if (erro) {
      if (
        erro.code === 'SQLITE_CONSTRAINT' &&
        erro.message.includes('produtos.codigo_barras')
      ) {
        return res.status(409).json({
          erro: 'Já existe um produto com esse código de barras.'
        });
      }

      console.error('Erro ao cadastrar produto:', erro.message);

      return res.status(500).json({
        erro: 'Não foi possível cadastrar o produto.'
      });
    }

    return res.status(201).json({
      id: this.lastID,
      ...produto
    });
  });
});

// Trata endereços inexistentes.
app.use((req, res) => {
  res.status(404).json({
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
  console.error('Não foi possível iniciar o servidor:', erro.message);
  process.exitCode = 1;
});