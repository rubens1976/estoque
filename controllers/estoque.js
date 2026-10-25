const { consultar, executar } = require('../utils/estoque-unidades');

module.exports = function registrarEstoque(app, db) {
  app.get('/unidades', async (_req, res) => {
    try {
      const unidades = await consultar(db, `SELECT u.*, COALESCE(SUM(e.quantidade), 0) AS quantidade,
        COALESCE(SUM(e.quantidade * p.preco), 0) AS valor,
        COUNT(CASE WHEN e.quantidade > 0 THEN 1 END) AS produtos_disponiveis
        FROM unidades u LEFT JOIN estoque_unidades e ON e.unidade_id = u.id
        LEFT JOIN produtos p ON p.id = e.produto_id GROUP BY u.id ORDER BY u.id`);
      res.json(unidades);
    } catch (erro) {
      console.error('Erro ao listar unidades:', erro.message);
      res.status(500).json({ erro: 'Não foi possível consultar as unidades.' });
    }
  });

  app.get('/unidades/:id/estoque', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erro: 'Informe um ID de unidade inteiro maior que zero.' });
    try {
      const [unidade] = await consultar(db, 'SELECT * FROM unidades WHERE id = ?', [id]);
      if (!unidade) return res.status(404).json({ erro: 'Unidade não encontrada.' });
      const produtos = await consultar(db, `SELECT p.id, p.nome, p.codigo_barras, p.preco,
        COALESCE(e.quantidade, 0) AS quantidade FROM produtos p
        LEFT JOIN estoque_unidades e ON e.produto_id = p.id AND e.unidade_id = ? ORDER BY p.id`, [id]);
      res.json({ unidade, produtos });
    } catch (erro) {
      console.error('Erro ao consultar estoque:', erro.message);
      res.status(500).json({ erro: 'Não foi possível consultar o estoque da unidade.' });
    }
  });

  app.get('/estoque/movimentacoes', async (_req, res) => {
    try {
      res.json(await consultar(db, `SELECT m.*, o.cidade AS origem, d.cidade AS destino
        FROM movimentacoes_estoque m LEFT JOIN unidades o ON o.id = m.origem_id
        LEFT JOIN unidades d ON d.id = m.destino_id ORDER BY m.id DESC LIMIT 100`));
    } catch (erro) {
      console.error('Erro ao listar movimentações:', erro.message);
      res.status(500).json({ erro: 'Não foi possível consultar o histórico.' });
    }
  });

  app.post('/estoque/movimentacoes', async (req, res) => {
    const { tipo, produto_id: produtoId, origem_id: origemId = null,
      destino_id: destinoId = null, quantidade, motivo } = req.body || {};
    const positivo = valor => Number.isSafeInteger(valor) && valor > 0;
    if (!['entrada', 'saida', 'transferencia'].includes(tipo) || !positivo(produtoId) || !positivo(quantidade)) {
      return res.status(400).json({ erro: 'Informe tipo, produto e quantidade inteira maior que zero.' });
    }
    if (typeof motivo !== 'string' || motivo.trim().length < 3 || motivo.trim().length > 200) {
      return res.status(400).json({ erro: 'Informe um motivo entre 3 e 200 caracteres.' });
    }
    const valido = tipo === 'entrada' ? origemId === null && positivo(destinoId)
      : tipo === 'saida' ? positivo(origemId) && destinoId === null
        : positivo(origemId) && positivo(destinoId) && origemId !== destinoId;
    if (!valido) return res.status(400).json({ erro: 'Informe origem e destino válidos para a movimentação; na transferência, as unidades devem ser diferentes.' });
    try {
      const resultado = await executar(db, `INSERT INTO movimentacoes_estoque
        (produto_id, produto_nome, codigo_barras, tipo, origem_id, destino_id, quantidade, motivo)
        SELECT id, nome, codigo_barras, ?, ?, ?, ?, ? FROM produtos WHERE id = ?`,
      [tipo, origemId, destinoId, quantidade, motivo.trim(), produtoId]);
      if (!resultado.changes) return res.status(404).json({ erro: 'Produto não encontrado.' });
      const [movimento] = await consultar(db, 'SELECT * FROM movimentacoes_estoque WHERE id = ?', [resultado.id]);
      return res.status(201).json(movimento);
    } catch (erro) {
      if (erro.message.includes('UNIDADE_INEXISTENTE')) return res.status(404).json({ erro: 'Unidade não encontrada.' });
      if (erro.message.includes('SALDO_INSUFICIENTE')) return res.status(409).json({ erro: 'Saldo insuficiente na unidade de origem.' });
      if (erro.message.includes('LIMITE_ESTOQUE')) return res.status(409).json({ erro: 'A quantidade excede o limite permitido para o produto.' });
      console.error('Erro ao movimentar estoque:', erro.message);
      return res.status(500).json({ erro: 'Não foi possível registrar a movimentação.' });
    }
  });
};
