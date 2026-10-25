const fs = require('node:fs');
const path = require('node:path');

async function verificar(base) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Informe a URL publica HTTPS atribuida pela hospedagem.');
  }
  const baseUrl = url.origin;
  const consultas = [];
  for (const [rota, titulo, descricao] of [
    ['/produtos', 'Listar produtos', 'Lista os produtos cadastrados, incluindo nome, preço e quantidade.'],
    ['/fornecedores', 'Listar fornecedores', 'Lista os fornecedores cadastrados com os dados do cadastro.'],
    ['/unidades', 'Listar unidades', 'Lista a sede e as filiais do cenário acadêmico, com seus indicadores.']
  ]) {
    const inicio = Date.now();
    const resposta = await fetch(baseUrl + rota, { signal: AbortSignal.timeout(90000), redirect: 'error' });
    if (resposta.status !== 200) throw new Error(`${rota}: HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (!Array.isArray(dados) || !dados.length || !Number.isInteger(dados[0].id)) {
      throw new Error(`${rota}: resposta JSON inesperada`);
    }
    consultas.push({ titulo, metodo: 'GET', url: baseUrl + rota, status: resposta.status,
      itens: dados.length, duracao_ms: Date.now() - inicio, descricao, amostra: dados[0] });
  }
  const evidencia = { base_url: baseUrl, verificado_em: new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', timeZoneName: 'short' }), consultas };
  fs.writeFileSync(path.join(__dirname, '../docs/evidencias-api-publica.json'), JSON.stringify(evidencia, null, 2) + '\n');
  console.log(JSON.stringify(evidencia, null, 2));
}

if (require.main === module) verificar(process.argv[2]).catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
