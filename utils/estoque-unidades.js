const unidades = require('../dados/unidades.json');
const { distribuir } = require('../scripts/planejar-distribuicao-unidades');

function executar(db, sql, parametros = []) {
  return new Promise((resolve, reject) => db.run(sql, parametros, function (erro) {
    erro ? reject(erro) : resolve({ changes: this.changes, id: this.lastID });
  }));
}
function consultar(db, sql, parametros = []) {
  return new Promise((resolve, reject) => db.all(sql, parametros,
    (erro, linhas) => erro ? reject(erro) : resolve(linhas)));
}
function executarSql(db, sql) {
  return new Promise((resolve, reject) => db.exec(sql, erro => erro ? reject(erro) : resolve()));
}

const esquema = `
  CREATE TABLE IF NOT EXISTS unidades (
    id INTEGER PRIMARY KEY, cidade TEXT NOT NULL, uf TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL, shopping TEXT NOT NULL, endereco TEXT NOT NULL,
    loja TEXT NOT NULL, fonte TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS estoque_unidades (
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    unidade_id INTEGER NOT NULL REFERENCES unidades(id),
    quantidade INTEGER NOT NULL CHECK(typeof(quantidade) = 'integer' AND quantidade >= 0 AND quantidade <= 9007199254740991),
    PRIMARY KEY (produto_id, unidade_id)
  );
  CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
    produto_nome TEXT NOT NULL, codigo_barras TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('inicial', 'entrada', 'saida', 'transferencia')),
    origem_id INTEGER REFERENCES unidades(id), destino_id INTEGER REFERENCES unidades(id),
    quantidade INTEGER NOT NULL CHECK(typeof(quantidade) = 'integer' AND quantidade > 0 AND quantidade <= 9007199254740991),
    motivo TEXT NOT NULL CHECK(length(trim(motivo)) BETWEEN 3 AND 200),
    criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK ((tipo IN ('inicial', 'entrada') AND origem_id IS NULL AND destino_id IS NOT NULL)
      OR (tipo = 'saida' AND origem_id IS NOT NULL AND destino_id IS NULL)
      OR (tipo = 'transferencia' AND origem_id IS NOT NULL AND destino_id IS NOT NULL AND origem_id <> destino_id))
  );
  CREATE INDEX IF NOT EXISTS estoque_unidade_idx ON estoque_unidades(unidade_id);
  CREATE INDEX IF NOT EXISTS movimentos_produto_idx ON movimentacoes_estoque(produto_id, id);
`;

// Uma movimentação é uma única instrução SQLite: validação, débito, crédito e
// histórico são confirmados juntos, inclusive sob requisições concorrentes.
const gatilhos = `
  CREATE TRIGGER IF NOT EXISTS estoque_total_insert AFTER INSERT ON estoque_unidades BEGIN
    UPDATE produtos SET quantidade = (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_unidades WHERE produto_id = NEW.produto_id) WHERE id = NEW.produto_id;
  END;
  CREATE TRIGGER IF NOT EXISTS estoque_total_update AFTER UPDATE OF quantidade ON estoque_unidades BEGIN
    UPDATE produtos SET quantidade = (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_unidades WHERE produto_id = NEW.produto_id) WHERE id = NEW.produto_id;
  END;
  CREATE TRIGGER IF NOT EXISTS estoque_total_delete AFTER DELETE ON estoque_unidades BEGIN
    UPDATE produtos SET quantidade = (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_unidades WHERE produto_id = OLD.produto_id) WHERE id = OLD.produto_id;
  END;
  CREATE TRIGGER IF NOT EXISTS proteger_total_produto BEFORE UPDATE OF quantidade ON produtos
  WHEN NEW.quantidade <> (SELECT COALESCE(SUM(quantidade), 0) FROM estoque_unidades WHERE produto_id = NEW.id)
  BEGIN SELECT RAISE(ABORT, 'ESTOQUE_POR_UNIDADE'); END;

  CREATE TRIGGER IF NOT EXISTS validar_movimentacao BEFORE INSERT ON movimentacoes_estoque BEGIN
    SELECT CASE WHEN NEW.produto_id IS NULL OR NOT EXISTS(SELECT 1 FROM produtos WHERE id = NEW.produto_id)
      THEN RAISE(ABORT, 'PRODUTO_INEXISTENTE') END;
    SELECT CASE WHEN (NEW.origem_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM unidades WHERE id = NEW.origem_id))
      OR (NEW.destino_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM unidades WHERE id = NEW.destino_id))
      THEN RAISE(ABORT, 'UNIDADE_INEXISTENTE') END;
    SELECT CASE WHEN NEW.origem_id IS NOT NULL AND NEW.quantidade > COALESCE(
      (SELECT quantidade FROM estoque_unidades WHERE produto_id = NEW.produto_id AND unidade_id = NEW.origem_id), 0)
      THEN RAISE(ABORT, 'SALDO_INSUFICIENTE') END;
    SELECT CASE WHEN NEW.tipo = 'entrada' AND NEW.quantidade > 9007199254740991 -
      (SELECT quantidade FROM produtos WHERE id = NEW.produto_id)
      THEN RAISE(ABORT, 'LIMITE_ESTOQUE') END;
  END;
  CREATE TRIGGER IF NOT EXISTS aplicar_movimentacao AFTER INSERT ON movimentacoes_estoque
  WHEN NEW.tipo <> 'inicial' BEGIN
    UPDATE estoque_unidades SET quantidade = quantidade - NEW.quantidade
      WHERE produto_id = NEW.produto_id AND unidade_id = NEW.origem_id;
    INSERT INTO estoque_unidades (produto_id, unidade_id, quantidade)
      SELECT NEW.produto_id, NEW.destino_id, NEW.quantidade WHERE NEW.destino_id IS NOT NULL
      ON CONFLICT(produto_id, unidade_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade;
  END;
  CREATE TRIGGER IF NOT EXISTS estoque_novo_produto AFTER INSERT ON produtos BEGIN
    INSERT INTO estoque_unidades (produto_id, unidade_id, quantidade) VALUES (NEW.id, 1, 0);
    INSERT INTO movimentacoes_estoque (produto_id, produto_nome, codigo_barras, tipo, destino_id, quantidade, motivo)
      SELECT NEW.id, NEW.nome, NEW.codigo_barras, 'entrada', 1, NEW.quantidade, 'Estoque inicial do cadastro na sede'
      WHERE NEW.quantidade > 0;
  END;
`;

async function inicializarEstoque(db) {
  await executarSql(db, 'PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;');
  try {
    await executarSql(db, esquema);
    for (const unidade of unidades) {
      await executar(db, `INSERT OR IGNORE INTO unidades (id, cidade, uf, tipo, shopping, endereco, loja, fonte)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [unidade.id, unidade.cidade, unidade.uf, unidade.tipo, unidade.shopping, unidade.endereco, unidade.loja, unidade.fonte]);
    }
    const produtos = await consultar(db, 'SELECT * FROM produtos ORDER BY id');
    for (const produto of produtos) {
      const saldos = await consultar(db, 'SELECT quantidade FROM estoque_unidades WHERE produto_id = ?', [produto.id]);
      if (saldos.length) {
        if (saldos.reduce((soma, saldo) => soma + saldo.quantidade, 0) !== produto.quantidade) {
          throw new Error(`Estoque divergente para o produto ${produto.id}.`);
        }
        continue;
      }
      const rateio = distribuir(produto.quantidade, produto.id);
      for (let indice = 0; indice < unidades.length; indice += 1) {
        await executar(db, 'INSERT INTO estoque_unidades (produto_id, unidade_id, quantidade) VALUES (?, ?, ?)',
          [produto.id, unidades[indice].id, rateio[indice]]);
        if (rateio[indice] > 0) {
          await executar(db, `INSERT INTO movimentacoes_estoque
            (produto_id, produto_nome, codigo_barras, tipo, destino_id, quantidade, motivo)
            VALUES (?, ?, ?, 'inicial', ?, ?, 'Distribuição inicial do estoque existente')`,
          [produto.id, produto.nome, produto.codigo_barras, unidades[indice].id, rateio[indice]]);
        }
      }
    }
    await executarSql(db, gatilhos);
    await executarSql(db, 'COMMIT');
  } catch (erro) {
    await executarSql(db, 'ROLLBACK');
    throw erro;
  }
}

module.exports = { inicializarEstoque, executar, consultar };
