// Retorna o CNPJ sem pontuação e em maiúsculas, ou null se for inválido.
function normalizarCnpjValido(valor) {
  if (typeof valor !== 'string') return null;

  const texto = valor.trim();
  const formato = /^(?:[A-Z0-9]{12}[0-9]{2}|[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-[0-9]{2})$/i;

  if (!formato.test(texto)) return null;

  const cnpj = texto.replace(/[./-]/g, '').toUpperCase();
  if (/^(\d)\1{13}$/.test(cnpj)) return null;

  // Regra da Receita Federal: valor ASCII menos 48 e pesos de 2 a 9.
  function calcularDigito(base) {
    let soma = 0;
    let peso = 2;

    for (let i = base.length - 1; i >= 0; i--) {
      soma += (base.charCodeAt(i) - 48) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;
    return resto < 2 ? '0' : String(11 - resto);
  }

  const base = cnpj.slice(0, 12);
  const primeiro = calcularDigito(base);
  const segundo = calcularDigito(base + primeiro);

  return cnpj.slice(12) === primeiro + segundo ? cnpj : null;
}

module.exports = { normalizarCnpjValido };
