const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sqlite3 = require('sqlite3');

const raiz = path.resolve(__dirname, '..');
const arquivoCsv = path.join(raiz, 'estoque_loja_informatica.csv');
const arquivoDb = path.join(raiz, 'estoque.db');
const aplicar = process.argv.includes('--aplicar');

function lerCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let entreAspas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i];
    if (caractere === '"') {
      if (entreAspas && texto[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (caractere === ',' && !entreAspas) {
      linha.push(campo);
      campo = '';
    } else if ((caractere === '\n' || caractere === '\r') && !entreAspas) {
      if (caractere === '\r' && texto[i + 1] === '\n') i += 1;
      linha.push(campo);
      if (linha.some(valor => valor !== '')) linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }
  if (entreAspas) throw new Error('CSV com aspas sem fechamento.');
  if (campo !== '' || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

function prepararProdutos() {
  const linhas = lerCsv(fs.readFileSync(arquivoCsv, 'utf8').replace(/^\uFEFF/, ''));
  const cabecalho = ['nome', 'descricao', 'valor_reais', 'quantidade_estoque'];
  if (JSON.stringify(linhas.shift()) !== JSON.stringify(cabecalho)) {
    throw new Error(`Cabeçalho esperado: ${cabecalho.join(',')}`);
  }
  const nomes = new Set();
  const codigos = new Set();
  return linhas.map((campos, indice) => {
    if (campos.length !== 4) throw new Error(`Linha ${indice + 2}: são necessárias quatro colunas.`);
    const [nomeOriginal, descricaoOriginal, precoOriginal, quantidadeOriginal] = campos;
    const nome = nomeOriginal.trim();
    const descricao = descricaoOriginal.trim();
    if (!nome || !descricao) throw new Error(`Linha ${indice + 2}: nome e descrição são obrigatórios.`);
    if (!/^\d+(?:\.\d{1,2})?$/.test(precoOriginal)) throw new Error(`Linha ${indice + 2}: preço inválido.`);
    if (!/^\d+$/.test(quantidadeOriginal)) throw new Error(`Linha ${indice + 2}: quantidade inválida.`);
    const preco = Number(precoOriginal);
    const quantidade = Number(quantidadeOriginal);
    if (!Number.isFinite(preco) || !Number.isSafeInteger(quantidade)) {
      throw new Error(`Linha ${indice + 2}: valor fora do intervalo aceito.`);
    }
    const chave = nome.toLocaleLowerCase('pt-BR');
    if (nomes.has(chave)) throw new Error(`Linha ${indice + 2}: nome duplicado.`);
    nomes.add(chave);
    const codigo_barras = `DEMO-CB-${crypto.createHash('sha256').update(chave).digest('hex').slice(0, 12).toUpperCase()}`;
    if (codigos.has(codigo_barras)) throw new Error('Colisão entre códigos de demonstração.');
    codigos.add(codigo_barras);
    return { nome, descricao, codigo_barras, preco, quantidade };
  });
}

function consulta(db, sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, parametros, (erro, linhas) => erro ? reject(erro) : resolve(linhas));
  });
}

function executar(db, sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, erro => erro ? reject(erro) : resolve());
  });
}

async function principal() {
  const produtos = prepararProdutos();
  if (!fs.existsSync(arquivoDb)) throw new Error('Banco não encontrado. Execute node criar-tabelas.js primeiro.');
  const db = new sqlite3.Database(arquivoDb, sqlite3.OPEN_READWRITE);
  try {
    const existentes = await consulta(db, 'SELECT nome, codigo_barras FROM produtos');
    const porNome = new Map(existentes.map(item => [item.nome.toLocaleLowerCase('pt-BR'), item]));
    const porCodigo = new Map(existentes.map(item => [item.codigo_barras, item]));
    const novos = produtos.filter(produto => !porNome.has(produto.nome.toLocaleLowerCase('pt-BR')));
    for (const produto of novos) {
      const conflito = porCodigo.get(produto.codigo_barras);
      if (conflito) throw new Error(`Código já usado por ${conflito.nome}.`);
    }
    console.log(`${produtos.length} itens no CSV; ${novos.length} novos; ${produtos.length - novos.length} já cadastrados pelo nome.`);
    if (!aplicar || novos.length === 0) {
      if (!aplicar) console.log('Prévia apenas. Use --aplicar para salvar no banco.');
      return;
    }

    const pastaBackup = path.join(raiz, 'backups');
    fs.mkdirSync(pastaBackup, { recursive: true });
    const arquivoBackup = path.join(pastaBackup, `estoque-antes-produtos-${Date.now()}.db`);
    await executar(db, 'VACUUM INTO ?', [arquivoBackup]);
    console.log(`Cópia de segurança: ${arquivoBackup}`);

    await executar(db, 'BEGIN IMMEDIATE');
    try {
      for (const produto of novos) {
        await executar(db,
          'INSERT INTO produtos (nome, descricao, codigo_barras, preco, quantidade) VALUES (?, ?, ?, ?, ?)',
          [produto.nome, produto.descricao, produto.codigo_barras, produto.preco, produto.quantidade]);
      }
      await executar(db, 'COMMIT');
    } catch (erro) {
      await executar(db, 'ROLLBACK');
      throw erro;
    }
    console.log(`${novos.length} produtos importados. Os códigos DEMO-CB são internos e fictícios, não códigos de barras reais.`);
  } finally {
    await new Promise(resolve => db.close(resolve));
  }
}

if (require.main === module) {
  principal().catch(erro => {
    console.error(`Importação cancelada: ${erro.message}`);
    process.exitCode = 1;
  });
}

module.exports = { prepararProdutos };
