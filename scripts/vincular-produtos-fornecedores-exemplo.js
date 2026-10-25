// Relações fictícias para demonstrar a associação muitos-para-muitos.
// Os nomes comerciais dos produtos não comprovam relações com os fornecedores abaixo.
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const raiz = path.resolve(__dirname, '..');
const arquivoDb = path.join(raiz, 'estoque.db');
const aplicar = process.argv.includes('--aplicar');

// Produto pelo nome; fornecedor pelo CNPJ de demonstração, sem depender dos IDs locais.
const vinculos = [
  ['Teclado USB', '99010010000175', '99003003000146'],
  ['SSD NVMe Samsung 990 PRO 1TB', '99008008000161', '99001001000118'],
  ['SSD NVMe Kingston NV3 1TB', '99006006000133', '99011011000134'],
  ['SSD NVMe WD_BLACK SN850X 1TB', '99009009000120', '99004004000105'],
  ['Memoria RAM TEAMGROUP T-Force Delta RGB 16GB (2x8GB) DDR4 3000MHz', '99007007000100', '99013013000162'],
  ['Memoria RAM Kingston Fury Beast 16GB DDR4 3200MHz CL16', '99014014000121', '99002002000187'],
  ['Memoria RAM Kingston 8GB DDR4 3200MHz CL22', '99007007000100', '99011011000134'],
  ['Memoria RAM Dale7 No Limits 8GB DDR4 3200MHz', '99012012000101', '99005005000174'],
  ['Monitor Gamer Samsung Odyssey G30 24 Full HD 144Hz', '99009009000120', '99008008000161'],
  ['Monitor HQ 24HQ-GAMER 24 Full HD 75Hz', '99012012000101', '99006006000133'],
  ['Processador AMD Ryzen 5 5600G 3.9GHz (turbo 4.4GHz) AM4', '99011011000134', '99014014000121'],
  ['Processador Intel Core i5-12400 4.4GHz 18MB Cache LGA 1700', '99014014000121', '99002002000187'],
  ['Processador Intel Core i5-12600KF 4.9GHz 20MB Cache LGA 1700', '99013013000162', '99005005000174'],
  ['Processador Intel Core i5-10400F 4.3GHz 12MB Cache LGA 1200', '99007007000100', '99001001000118'],
  ['Placa de Video Galax GeForce RTX 4060 Ti Dual 1-Click OC 8GB GDDR6', '99014014000121', '99004004000105'],
  ['Kit Teclado e Mouse Sem Fio Logitech MK295', '99010010000175', '99003003000146'],
  ['Kit Teclado e Mouse Sem Fio Multilaser TC202', '99010010000175', '99009009000120'],
  ['Kit Teclado e Mouse Sem Fio Dell Pro KM5221W', '99006006000133', '99008008000161'],
  ['Kit Teclado e Mouse Sem Fio Exbom BK-1000', '99012012000101', '99003003000146'],
  ['Kit Gamer Teclado e Mouse com Fio Exbom BK-G3000', '99013013000162', '99010010000175']
];

function consultar(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (erro, linhas) => erro ? reject(erro) : resolve(linhas));
  });
}

function executar(db, sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, function (erro) {
      if (erro) reject(erro);
      else resolve(this.changes);
    });
  });
}

async function principal() {
  if (!fs.existsSync(arquivoDb)) throw new Error('Banco não encontrado. Execute node criar-tabelas.js primeiro.');
  const db = new sqlite3.Database(arquivoDb, sqlite3.OPEN_READWRITE);
  try {
    await executar(db, 'PRAGMA foreign_keys = ON');
    const [produtos, fornecedores, existentes] = await Promise.all([
      consultar(db, 'SELECT id, nome FROM produtos'),
      consultar(db, 'SELECT id, nome, cnpj FROM fornecedores'),
      consultar(db, 'SELECT produto_id, fornecedor_id FROM produtos_fornecedores')
    ]);
    const produtosPorNome = new Map(produtos.map(produto => [produto.nome, produto]));
    const fornecedoresPorCnpj = new Map(fornecedores.map(fornecedor => [fornecedor.cnpj, fornecedor]));
    const paresExistentes = new Set(existentes.map(par => `${par.produto_id}:${par.fornecedor_id}`));
    const paresPlanejados = [];

    for (const [nomeProduto, ...cnpjs] of vinculos) {
      const produto = produtosPorNome.get(nomeProduto);
      if (!produto) throw new Error(`Produto não encontrado: ${nomeProduto}. Importe o CSV antes desta carga.`);
      for (const cnpj of cnpjs) {
        const fornecedor = fornecedoresPorCnpj.get(cnpj);
        if (!fornecedor) throw new Error(`Fornecedor de exemplo não encontrado: ${cnpj}. Execute exemplo:fornecedores antes.`);
        paresPlanejados.push({ produto, fornecedor });
      }
    }

    const novos = paresPlanejados.filter(({ produto, fornecedor }) =>
      !paresExistentes.has(`${produto.id}:${fornecedor.id}`));
    console.log(`${paresPlanejados.length} vínculos planejados para ${vinculos.length} produtos; ${novos.length} novos; ${paresPlanejados.length - novos.length} já existentes.`);
    if (!aplicar || novos.length === 0) {
      if (!aplicar) console.log('Prévia apenas. Use --aplicar para salvar no banco.');
      return;
    }

    const pastaBackup = path.join(raiz, 'backups');
    fs.mkdirSync(pastaBackup, { recursive: true });
    const arquivoBackup = path.join(pastaBackup, `estoque-antes-vinculos-${Date.now()}.db`);
    await executar(db, 'VACUUM INTO ?', [arquivoBackup]);
    console.log(`Cópia de segurança: ${arquivoBackup}`);

    await executar(db, 'BEGIN IMMEDIATE');
    try {
      let inseridos = 0;
      for (const { produto, fornecedor } of novos) {
        inseridos += await executar(db,
          'INSERT OR IGNORE INTO produtos_fornecedores (produto_id, fornecedor_id) VALUES (?, ?)',
          [produto.id, fornecedor.id]);
      }
      await executar(db, 'COMMIT');
      console.log(`${inseridos} vínculo(s) de demonstração criado(s). Nenhum cadastro foi alterado.`);
    } catch (erro) {
      await executar(db, 'ROLLBACK');
      throw erro;
    }
  } finally {
    await new Promise((resolve, reject) => db.close(erro => erro ? reject(erro) : resolve()));
  }
}

principal().catch(erro => {
  console.error(`Carga de vínculos cancelada: ${erro.message}`);
  process.exitCode = 1;
});
