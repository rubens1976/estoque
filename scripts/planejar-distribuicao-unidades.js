// Gera uma proposta de estoque inicial por unidade; não altera o banco.
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const raiz = path.resolve(__dirname, '..');
const unidades = require('../dados/unidades.json');

function distribuir(quantidade, produtoId) {
  if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
    throw new Error(`Quantidade inválida para o produto ${produtoId}.`);
  }
  const cotas = unidades.map((unidade, indice) => {
    const parcial = (quantidade % 100) * unidade.peso;
    return { indice, quantidade: Math.floor(quantidade / 100) * unidade.peso + Math.floor(parcial / 100), resto: parcial % 100 };
  });
  let restante = quantidade - cotas.reduce((soma, cota) => soma + cota.quantidade, 0);
  // Alterna desempates entre produtos para não favorecer sempre a mesma filial.
  const desempate = produtoId % unidades.length;
  const ordem = [...cotas].sort((a, b) => b.resto - a.resto ||
    (a.indice - desempate + unidades.length) % unidades.length -
    (b.indice - desempate + unidades.length) % unidades.length);
  for (const cota of ordem) {
    if (restante === 0) break;
    cota.quantidade += 1;
    restante -= 1;
  }
  return cotas.map(cota => cota.quantidade);
}

function csv(valor) {
  return `"${String(valor).replaceAll('"', '""')}"`;
}

async function principal() {
  if (unidades.reduce((soma, unidade) => soma + unidade.peso, 0) !== 100) {
    throw new Error('Os pesos das unidades devem somar 100%.');
  }
  const arquivoDb = path.join(raiz, 'estoque.db');
  if (!fs.existsSync(arquivoDb)) throw new Error('Banco não encontrado.');
  const db = new sqlite3.Database(arquivoDb, sqlite3.OPEN_READONLY);
  let produtos;
  try {
    produtos = await new Promise((resolve, reject) => db.all(
      'SELECT id, nome, codigo_barras, quantidade FROM produtos ORDER BY id',
      (erro, linhas) => erro ? reject(erro) : resolve(linhas)));
  } finally {
    await new Promise((resolve, reject) => db.close(erro => erro ? reject(erro) : resolve()));
  }

  const linhas = ['produto_id,codigo_barras,produto,cidade,uf,tipo,shopping,quantidade'];
  const totais = unidades.map(() => 0);
  for (const produto of produtos) {
    const quantidades = distribuir(produto.quantidade, produto.id);
    if (quantidades.reduce((soma, valor) => soma + valor, 0) !== produto.quantidade) {
      throw new Error(`A distribuição não fecha para ${produto.nome}.`);
    }
    unidades.forEach((unidade, indice) => {
      totais[indice] += quantidades[indice];
      linhas.push([
        produto.id, csv(produto.codigo_barras), csv(produto.nome), csv(unidade.cidade),
        unidade.uf, unidade.tipo, csv(unidade.shopping), quantidades[indice]
      ].join(','));
    });
  }
  const totalProdutos = produtos.reduce((soma, produto) => soma + produto.quantidade, 0);
  if (totais.reduce((soma, valor) => soma + valor, 0) !== totalProdutos) {
    throw new Error('A soma das unidades difere do estoque total.');
  }
  const destino = path.join(raiz, 'docs', 'distribuicao-inicial.csv');
  fs.writeFileSync(destino, `${linhas.join('\n')}\n`, 'utf8');
  console.log(`${produtos.length} produtos; ${totalProdutos} unidades; ${unidades.length} localidades. Plano: ${destino}`);
  unidades.forEach((unidade, indice) => console.log(`${unidade.cidade}/${unidade.uf}: ${totais[indice]} unidades`));
}

if (require.main === module) {
  principal().catch(erro => {
    console.error(`Planejamento cancelado: ${erro.message}`);
    process.exitCode = 1;
  });
}

module.exports = { distribuir, unidades };
