/** Validação local do formato e dígitos; NÃO consulta nem comprova registro na Receita. */
export function normalizeCnpj(value: string) { return value.toUpperCase().replace(/[.\/\-\s]/g, ''); }
export function validCnpj(value: string) {
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(value) || /^(.)\1{13}$/.test(value)) return false;
  const digit = (part: string) => {
    let weight = part.length - 7;
    const sum = [...part].reduce((total, char) => {
      const n = total + (char.charCodeAt(0) - 48) * weight;
      if (--weight < 2) weight = 9;
      return n;
    }, 0);
    const remainder = sum % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  };
  const first = digit(value.slice(0,12));
  return value.slice(-2) === first + digit(value.slice(0,12) + first);
}
