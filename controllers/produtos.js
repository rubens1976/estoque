
module.exports = function registrarProdutos(app, db) {
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

  // Consulta um produto pelo ID.
  app.get('/produtos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const sql = 'SELECT * FROM produtos WHERE id = ?';

    db.get(sql, [id], (erro, produto) => {
      if (erro) {
        console.error('Erro ao consultar produto:', erro.message);

        return res.status(500).json({
          erro: 'Não foi possível consultar o produto.'
        });
      }

      if (!produto) {
        return res.status(404).json({
          erro: 'Produto não encontrado.'
        });
      }

      return res.status(200).json(produto);
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

  // Edita todos os campos de um produto existente.
  app.put('/produtos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const { nome, descricao, codigo_barras, preco, quantidade } = req.body || {};

    if (typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ erro: 'Informe o nome do produto.' });
    }

    if (typeof codigo_barras !== 'string' || !codigo_barras.trim()) {
      return res.status(400).json({
        erro: 'Informe o código de barras como texto.'
      });
    }

    if (typeof descricao !== 'string') {
      return res.status(400).json({ erro: 'A descrição deve ser um texto.' });
    }

    if (typeof preco !== 'number' || !Number.isFinite(preco) || preco < 0) {
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
      id,
      nome: nome.trim(),
      descricao: descricao.trim(),
      codigo_barras: codigo_barras.trim(),
      preco,
      quantidade
    };

    const sql = `
      UPDATE produtos
      SET nome = ?, descricao = ?, codigo_barras = ?, preco = ?, quantidade = ?
      WHERE id = ?
    `;

    const parametros = [
      produto.nome,
      produto.descricao,
      produto.codigo_barras,
      produto.preco,
      produto.quantidade,
      id
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

        console.error('Erro ao editar produto:', erro.message);

        if (erro.message.includes('ESTOQUE_POR_UNIDADE')) {
          return res.status(409).json({ erro: 'Ajuste a quantidade pela movimentação de estoque em Unidades.' });
        }

        return res.status(500).json({
          erro: 'Não foi possível editar o produto.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      return res.status(200).json(produto);
    });
  });

  // Exclui um produto e seus vínculos, preservando os fornecedores.
  app.delete('/produtos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const sql = 'DELETE FROM produtos WHERE id = ?';

    db.run(sql, [id], function (erro) {
      if (erro) {
        console.error('Erro ao excluir produto:', erro.message);

        return res.status(500).json({
          erro: 'Não foi possível excluir o produto.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      return res.status(204).end();
    });
  });
};
