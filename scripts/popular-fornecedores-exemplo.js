// Dados fictícios para demonstração. Execute após criar as tabelas.
const db = require.main === module ? require('../database') : null;
const { validarFornecedor } = require('../utils/fornecedor');

const fornecedores = [
  {
    nome: 'Nexus Distribuição de Informática',
    cnpj: '99001001000118',
    telefone: '(11) 3000-1001',
    email: 'contato.nexus@example.com',
    endereco: 'Rua do Circuito, 120 - Centro, São Paulo/SP'
  },
  {
    nome: 'Horizonte Componentes',
    cnpj: '99002002000187',
    telefone: '(21) 3000-2002',
    email: 'vendas.horizonte@example.com',
    endereco: 'Avenida dos Componentes, 245 - Centro, Rio de Janeiro/RJ'
  },
  {
    nome: 'Aurora Periféricos',
    cnpj: '99003003000146',
    telefone: '(31) 3000-3003',
    email: 'comercial.aurora@example.com',
    endereco: 'Rua dos Periféricos, 85 - Centro, Belo Horizonte/MG'
  },
  {
    nome: 'Conexão Digital Atacado',
    cnpj: '99004004000105',
    telefone: '(41) 3000-4004',
    email: 'pedidos.conexao@example.com',
    endereco: 'Avenida da Tecnologia, 410 - Centro, Curitiba/PR'
  },
  {
    nome: 'Armazenar Tech Distribuição',
    cnpj: '99005005000174',
    telefone: '(51) 3000-5005',
    email: 'atendimento.armazenar@example.com',
    endereco: 'Rua dos Dados, 55 - Centro, Porto Alegre/RS'
  },
  // Um exemplo fictício em cada estado da região Nordeste.
  {
    nome: 'Matriz Tecnologia São Luís',
    cnpj: '99006006000133',
    telefone: '(98) 3000-6006',
    email: 'contato.matriz@example.com',
    endereco: 'Rua das Interfaces, 160 - Centro, São Luís/MA'
  },
  {
    nome: 'Vértice Componentes Teresina',
    cnpj: '99007007000100',
    telefone: '(86) 3000-7007',
    email: 'vendas.vertice@example.com',
    endereco: 'Avenida dos Sistemas, 270 - Centro, Teresina/PI'
  },
  {
    nome: 'Integra Distribuição Fortaleza',
    cnpj: '99008008000161',
    telefone: '(85) 3000-8008',
    email: 'pedidos.integra@example.com',
    endereco: 'Rua da Conexão, 380 - Centro, Fortaleza/CE'
  },
  {
    nome: 'Polo Digital Natal',
    cnpj: '99009009000120',
    telefone: '(84) 3000-9009',
    email: 'comercial.polo@example.com',
    endereco: 'Avenida dos Equipamentos, 490 - Centro, Natal/RN'
  },
  {
    nome: 'Núcleo Periféricos João Pessoa',
    cnpj: '99010010000175',
    telefone: '(83) 3000-1010',
    email: 'atendimento.nucleo@example.com',
    endereco: 'Rua dos Dispositivos, 510 - Centro, João Pessoa/PB'
  },
  {
    nome: 'Eixo Tecnologia Recife',
    cnpj: '99011011000134',
    telefone: '(81) 3000-1111',
    email: 'contato.eixo@example.com',
    endereco: 'Avenida da Rede, 620 - Centro, Recife/PE'
  },
  {
    nome: 'Prisma Informática Maceió',
    cnpj: '99012012000101',
    telefone: '(82) 3000-1212',
    email: 'vendas.prisma@example.com',
    endereco: 'Rua dos Processadores, 730 - Centro, Maceió/AL'
  },
  {
    nome: 'Circuito Distribuição Aracaju',
    cnpj: '99013013000162',
    telefone: '(79) 3000-1313',
    email: 'pedidos.circuito@example.com',
    endereco: 'Avenida da Memória, 840 - Centro, Aracaju/SE'
  },
  {
    nome: 'Atlas Componentes Salvador',
    cnpj: '99014014000121',
    telefone: '(71) 3000-1414',
    email: 'comercial.atlas@example.com',
    endereco: 'Rua da Tecnologia, 950 - Centro, Salvador/BA'
  }
];

function executar(sql, parametros = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parametros, function (erro) {
      if (erro) reject(erro);
      else resolve(this.changes);
    });
  });
}

function fechar() {
  return new Promise((resolve, reject) => {
    db.close(erro => erro ? reject(erro) : resolve());
  });
}

async function popular() {
  let transacaoAberta = false;
  try {
    const dadosValidados = fornecedores.map(dados => {
      const resultado = validarFornecedor(dados, { cadastro: true });
      if (resultado.erro) throw new Error(`${dados.nome}: ${resultado.erro}`);
      return resultado.fornecedor;
    });

    await executar('BEGIN TRANSACTION');
    transacaoAberta = true;

    // Completa apenas campos vazios do fornecedor de teste já existente.
    await executar(`
      UPDATE fornecedores
      SET telefone = CASE WHEN telefone IS NULL OR TRIM(telefone) = ''
            THEN '(11) 3000-0002' ELSE telefone END,
          email = CASE WHEN email IS NULL OR TRIM(email) = ''
            THEN 'contato.teste@example.com' ELSE email END,
          endereco = CASE WHEN endereco IS NULL OR TRIM(endereco) = ''
            THEN 'Rua Exemplo, 20 - Centro, São Paulo/SP' ELSE endereco END
      WHERE cnpj = '11222333000181'
    `);

    let novos = 0;
    for (const fornecedor of dadosValidados) {
      novos += await executar(`
        INSERT OR IGNORE INTO fornecedores (nome, cnpj, telefone, email, endereco)
        VALUES (?, ?, ?, ?, ?)
      `, [fornecedor.nome, fornecedor.cnpj, fornecedor.telefone,
        fornecedor.email, fornecedor.endereco]);
    }

    await executar('COMMIT');
    transacaoAberta = false;
    console.log(`Carga concluída: ${novos} novo(s) fornecedor(es).`);
  } catch (erro) {
    if (transacaoAberta) await executar('ROLLBACK');
    console.error('Não foi possível popular os fornecedores:', erro.message);
    process.exitCode = 1;
  } finally {
    await fechar();
  }
}

if (require.main === module) popular();

module.exports = { fornecedores };
