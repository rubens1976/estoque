const { validarFornecedor } = require('../utils/fornecedor');

module.exports = function registrarFornecedores(app, db) {
  // Lista os fornecedores cadastrados.
  app.get('/fornecedores', (req, res) => {
    const sql = 'SELECT * FROM fornecedores ORDER BY id';

    db.all(sql, [], (erro, fornecedores) => {
      if (erro) {
        console.error('Erro ao consultar fornecedores:', erro.message);

        return res.status(500).json({
          erro: 'Não foi possível consultar os fornecedores.'
        });
      }

      return res.status(200).json(fornecedores);
    });
  });

  // Consulta um fornecedor pelo ID.
  app.get('/fornecedores/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const sql = 'SELECT * FROM fornecedores WHERE id = ?';

    db.get(sql, [id], (erro, fornecedor) => {
      if (erro) {
        console.error('Erro ao consultar fornecedor:', erro.message);

        return res.status(500).json({
          erro: 'Não foi possível consultar o fornecedor.'
        });
      }

      if (!fornecedor) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
      }

      return res.status(200).json(fornecedor);
    });
  });

  // Cadastra um fornecedor.
  app.post('/fornecedores', (req, res) => {
    const { erro, fornecedor } = validarFornecedor(req.body, { cadastro: true });
    if (erro) {
      return res.status(400).json({ erro });
    }

    const sql = `
      INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco)
      VALUES (?, ?, ?, ?, ?)
    `;
    const parametros = [
      fornecedor.nome,
      fornecedor.cnpj,
      fornecedor.telefone,
      fornecedor.email,
      fornecedor.endereco
    ];

    db.run(sql, parametros, function (erro) {
      if (erro) {
        if (
          erro.code === 'SQLITE_CONSTRAINT' &&
          erro.message.includes('fornecedores.cnpj')
        ) {
          return res.status(409).json({
            erro: 'Já existe um fornecedor com esse CNPJ.'
          });
        }

        console.error('Erro ao cadastrar fornecedor:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível cadastrar o fornecedor.'
        });
      }

      return res.status(201).json({ id: this.lastID, ...fornecedor });
    });
  });

  // Edita todos os campos de um fornecedor existente.
  app.put('/fornecedores/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const { erro, fornecedor } = validarFornecedor(req.body);
    if (erro) {
      return res.status(400).json({ erro });
    }

    const sql = `
      UPDATE fornecedores
      SET nome = ?, cnpj = ?, telefone = ?, email = ?, endereco = ?
      WHERE id = ?
    `;
    const parametros = [
      fornecedor.nome,
      fornecedor.cnpj,
      fornecedor.telefone,
      fornecedor.email,
      fornecedor.endereco,
      id
    ];

    db.run(sql, parametros, function (erro) {
      if (erro) {
        if (
          erro.code === 'SQLITE_CONSTRAINT' &&
          erro.message.includes('fornecedores.cnpj')
        ) {
          return res.status(409).json({
            erro: 'Já existe um fornecedor com esse CNPJ.'
          });
        }

        console.error('Erro ao editar fornecedor:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível editar o fornecedor.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
      }

      return res.status(200).json({ id, ...fornecedor });
    });
  });

  // Exclui um fornecedor e seus vínculos, preservando os produtos.
  app.delete('/fornecedores/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID inteiro maior que zero.'
      });
    }

    const sql = 'DELETE FROM fornecedores WHERE id = ?';

    db.run(sql, [id], function (erro) {
      if (erro) {
        console.error('Erro ao excluir fornecedor:', erro.message);

        return res.status(500).json({
          erro: 'Não foi possível excluir o fornecedor.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
      }

      return res.status(204).end();
    });
  });
};
