// ---- Input Mask Utilities ----
// These functions apply formatting masks to raw input values.
// They work by stripping non-numeric characters and re-applying the mask pattern.

/**
 * Formats a CPF string: ###.###.###-##
 */
export function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Formats a CNPJ string: ##.###.###/####-##
 */
export function maskCNPJ(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Applies CPF or CNPJ mask based on the document type.
 */
export function maskDocument(value: string, type: 'CPF' | 'CNPJ'): string {
    return type === 'CPF' ? maskCPF(value) : maskCNPJ(value);
}

/**
 * Formats a phone number: (##) #####-####
 */
export function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Strips all non-numeric characters from a string (useful for saving raw values).
 */
export function unmask(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Validates a CPF (11 digits, basic check digit validation).
 */
export function isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    if (parseInt(digits[9]) !== check) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    check = 11 - (sum % 11);
    if (check >= 10) check = 0;
    return parseInt(digits[10]) === check;
}

/**
 * Validates a CNPJ (14 digits, basic check digit validation).
 */
export function isValidCNPJ(cnpj: string): boolean {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
    let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(digits[12]) !== check) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
    check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(digits[13]) === check;
}
