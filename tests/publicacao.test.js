const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const sqlite3 = require('sqlite3');

test('inicializacao em nuvem usa PORT e banco isolado, atende consultas e preserva dados no reinicio', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'conectabyte-publicacao-'));
  const banco = path.join(pasta, 'demo.db');
  const reserva = net.createServer();
  reserva.listen(0, '127.0.0.1');
  await once(reserva, 'listening');
  const porta = reserva.address().port;
  await new Promise(resolve => reserva.close(resolve));
  let processo;
  let saida = '';
  async function subir() {
    processo = spawn(process.execPath, ['scripts/iniciar-demonstracao.js'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(porta), DB_PATH: banco },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    processo.stdout.on('data', dados => { saida += dados; });
    processo.stderr.on('data', dados => { saida += dados; });
    for (let tentativa = 0; tentativa < 150; tentativa++) {
      if (processo.exitCode !== null) throw new Error(saida);
      try {
        const resposta = await fetch(`http://127.0.0.1:${porta}/produtos`);
        if (resposta.status === 200) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Servidor nao iniciou: ${saida}`);
  }
  async function parar() {
    if (processo && processo.exitCode === null) {
      const fim = once(processo, 'exit');
      processo.kill();
      await fim;
    }
  }
  try {
    await subir();
    for (const [rota, total] of [['produtos', 20], ['fornecedores', 14], ['unidades', 9]]) {
      const resposta = await fetch(`http://127.0.0.1:${porta}/${rota}`);
      assert.equal(resposta.status, 200);
      assert.equal((await resposta.json()).length, total);
    }
    await parar();
    const db = new sqlite3.Database(banco);
    await new Promise((resolve, reject) => db.run("UPDATE fornecedores SET nome = 'Preservado' WHERE id = 1", erro => erro ? reject(erro) : resolve()));
    await new Promise((resolve, reject) => db.close(erro => erro ? reject(erro) : resolve()));
    await subir();
    const fornecedores = await (await fetch(`http://127.0.0.1:${porta}/fornecedores`)).json();
    assert.equal(fornecedores.find(item => item.id === 1).nome, 'Preservado');
  } finally {
    await parar();
    // Pasta exclusiva criada por este teste, dentro do diretorio temporario.
    for (const nome of fs.readdirSync(pasta)) fs.unlinkSync(path.join(pasta, nome));
    fs.rmdirSync(pasta);
  }
});
