const { normalizarCnpjValido } = require('./cnpj');

// No cadastro, campos opcionais omitidos recebem texto vazio.
// Na edição completa, todos os campos precisam ser enviados.
function validarFornecedor(dados, { cadastro = false } = {}) {
  const {
    nome,
    cnpj,
    telefone = cadastro ? '' : undefined,
    email = cadastro ? '' : undefined,
    endereco = cadastro ? '' : undefined
  } = dados || {};

  if (typeof nome !== 'string' || !nome.trim()) {
    return { erro: 'Informe o nome do fornecedor.' };
  }

  const cnpjNormalizado = normalizarCnpjValido(cnpj);
  if (!cnpjNormalizado) {
    return {
      erro: 'Informe um CNPJ válido como texto, com ou sem pontuação.'
    };
  }

  if (typeof telefone !== 'string') {
    return { erro: 'O telefone deve ser um texto.' };
  }

  const telefoneLimpo = telefone.trim();
  const digitosTelefone = telefoneLimpo.replace(/\D/g, '');
  if (telefoneLimpo && (
    !/^\+?[\d\s().-]+$/.test(telefoneLimpo) ||
    digitosTelefone.length < 8 || digitosTelefone.length > 15
  )) {
    return {
      erro: 'Informe um telefone válido com 8 a 15 dígitos.'
    };
  }

  if (typeof email !== 'string') {
    return { erro: 'O e-mail deve ser um texto.' };
  }

  const emailLimpo = email.trim();
  if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return { erro: 'Informe um e-mail válido.' };
  }

  if (typeof endereco !== 'string') {
    return { erro: 'O endereço deve ser um texto.' };
  }

  const fornecedor = {
    nome: nome.trim(),
    cnpj: cnpjNormalizado,
    telefone: telefoneLimpo,
    email: emailLimpo,
    endereco: endereco.trim()
  };

  return { fornecedor };
}

module.exports = { validarFornecedor };
