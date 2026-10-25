
module.exports = function registrarAssociacoes(app, db) {
  // Vincula um fornecedor existente a um produto existente.
  app.post('/produtos/:id/fornecedores', (req, res) => {
    const produtoId = Number(req.params.id);
    const { fornecedor_id: fornecedorId } = req.body || {};

    if (!Number.isSafeInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID de produto inteiro maior que zero.'
      });
    }

    if (!Number.isSafeInteger(fornecedorId) || fornecedorId <= 0) {
      return res.status(400).json({
        erro: 'Informe fornecedor_id como um número inteiro maior que zero.'
      });
    }

    // Insere somente se as duas entidades existirem, na mesma instrução SQL.
    const sql = `
      INSERT INTO produtos_fornecedores (produto_id, fornecedor_id)
      SELECT p.id, f.id
      FROM produtos AS p CROSS JOIN fornecedores AS f
      WHERE p.id = ? AND f.id = ?
    `;

    db.run(sql, [produtoId, fornecedorId], function (erro) {
      if (erro) {
        if (
          erro.code === 'SQLITE_CONSTRAINT' &&
          erro.message.includes('UNIQUE constraint failed: produtos_fornecedores.')
        ) {
          return res.status(409).json({
            erro: 'Este fornecedor já está vinculado ao produto.'
          });
        }

        console.error('Erro ao vincular fornecedor ao produto:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível vincular o fornecedor ao produto.'
        });
      }

      if (this.changes === 0) {
        return db.get('SELECT id FROM produtos WHERE id = ?', [produtoId], (erro, produto) => {
          if (erro) {
            console.error('Erro ao consultar produto para vínculo:', erro.message);
            return res.status(500).json({
              erro: 'Não foi possível vincular o fornecedor ao produto.'
            });
          }

          return res.status(404).json({
            erro: produto ? 'Fornecedor não encontrado.' : 'Produto não encontrado.'
          });
        });
      }

      return res.status(201).json({
        produto_id: produtoId,
        fornecedor_id: fornecedorId
      });
    });
  });

  // Lista os fornecedores vinculados a um produto.
  app.get('/produtos/:id/fornecedores', (req, res) => {
    const produtoId = Number(req.params.id);

    if (!Number.isSafeInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID de produto inteiro maior que zero.'
      });
    }

    db.get('SELECT id FROM produtos WHERE id = ?', [produtoId], (erro, produto) => {
      if (erro) {
        console.error('Erro ao consultar produto para listar fornecedores:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível consultar os fornecedores do produto.'
        });
      }

      if (!produto) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      const sql = `
        SELECT f.*
        FROM fornecedores AS f
        INNER JOIN produtos_fornecedores AS pf ON pf.fornecedor_id = f.id
        WHERE pf.produto_id = ?
        ORDER BY f.id
      `;

      db.all(sql, [produtoId], (erro, fornecedores) => {
        if (erro) {
          console.error('Erro ao consultar fornecedores do produto:', erro.message);
          return res.status(500).json({
            erro: 'Não foi possível consultar os fornecedores do produto.'
          });
        }

        return res.status(200).json(fornecedores);
      });
    });
  });

  // Lista os produtos vinculados a um fornecedor.
  app.get('/fornecedores/:id/produtos', (req, res) => {
    const fornecedorId = Number(req.params.id);

    if (!Number.isSafeInteger(fornecedorId) || fornecedorId <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID de fornecedor inteiro maior que zero.'
      });
    }

    db.get('SELECT id FROM fornecedores WHERE id = ?', [fornecedorId], (erro, fornecedor) => {
      if (erro) {
        console.error('Erro ao consultar fornecedor para listar produtos:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível consultar os produtos do fornecedor.'
        });
      }

      if (!fornecedor) {
        return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
      }

      const sql = `
        SELECT p.*
        FROM produtos AS p
        INNER JOIN produtos_fornecedores AS pf ON pf.produto_id = p.id
        WHERE pf.fornecedor_id = ?
        ORDER BY p.id
      `;

      db.all(sql, [fornecedorId], (erro, produtos) => {
        if (erro) {
          console.error('Erro ao consultar produtos do fornecedor:', erro.message);
          return res.status(500).json({
            erro: 'Não foi possível consultar os produtos do fornecedor.'
          });
        }

        return res.status(200).json(produtos);
      });
    });
  });

  // Remove somente o vínculo, preservando produto e fornecedor.
  app.delete('/produtos/:id/fornecedores/:fornecedorId', (req, res) => {
    const produtoId = Number(req.params.id);
    const fornecedorId = Number(req.params.fornecedorId);

    if (!Number.isSafeInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID de produto inteiro maior que zero.'
      });
    }

    if (!Number.isSafeInteger(fornecedorId) || fornecedorId <= 0) {
      return res.status(400).json({
        erro: 'Informe um ID de fornecedor inteiro maior que zero.'
      });
    }

    const sql = `
      DELETE FROM produtos_fornecedores
      WHERE produto_id = ? AND fornecedor_id = ?
    `;

    db.run(sql, [produtoId, fornecedorId], function (erro) {
      if (erro) {
        console.error('Erro ao remover vínculo entre produto e fornecedor:', erro.message);
        return res.status(500).json({
          erro: 'Não foi possível remover o vínculo entre produto e fornecedor.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Vínculo não encontrado.' });
      }

      return res.status(204).end();
    });
  });
};
