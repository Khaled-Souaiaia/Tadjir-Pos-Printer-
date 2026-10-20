/**
 * TADJIR POS - Barcode Standards & Utilities
 * 
 * Supports:
 * - EAN-13 (13 digits, GS1 Modulo 10 check digit)
 * - EAN-8 (8 digits, GS1 Modulo 10 check digit)
 * - UPC-A (12 digits, GS1 Modulo 10 check digit)
 * - Code 128 (high-density alphanumeric, standard ASCII)
 * 
 * Preserves leading zeros by handling all barcodes strictly as strings.
 */

export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128';

export interface BarcodeValidationResult {
  isValid: boolean;
  format: BarcodeFormat | 'UNKNOWN';
  errorKey?: 'EMPTY' | 'INVALID_CHARACTERS' | 'INVALID_LENGTH' | 'INVALID_CHECKSUM' | 'UNSUPPORTED_FORMAT';
  errorMessageAr: string;
  errorMessageFr: string;
  expectedCheckDigit?: number;
  actualCheckDigit?: number;
  suggestedCorrection?: string;
}

/**
 * Calculates the EAN-13 check digit for a 12-digit numeric string.
 * Official GS1 Algorithm:
 * - Odd positions (1st, 3rd, 5th, 7th, 9th, 11th - 0-indexed: 0, 2, 4, 6, 8, 10): weight 1
 * - Even positions (2nd, 4th, 6th, 8th, 10th, 12th - 0-indexed: 1, 3, 5, 7, 9, 11): weight 3
 * - Check digit = (10 - (sum % 10)) % 10
 */
export function calculateEan13CheckDigit(first12Digits: string): number {
  if (!/^\d{12}$/.test(first12Digits)) {
    throw new Error(`calculateEan13CheckDigit requires exactly 12 numeric digits, received: "${first12Digits}"`);
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Calculates the EAN-8 check digit for a 7-digit numeric string.
 * Official GS1 Algorithm:
 * - Weights from right to left are 3, 1, 3, 1, 3, 1, 3.
 * - 0-indexed: positions 0, 2, 4, 6 have weight 3; positions 1, 3, 5 have weight 1.
 */
export function calculateEan8CheckDigit(first7Digits: string): number {
  if (!/^\d{7}$/.test(first7Digits)) {
    throw new Error(`calculateEan8CheckDigit requires exactly 7 numeric digits, received: "${first7Digits}"`);
  }

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(first7Digits[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Calculates the UPC-A check digit for an 11-digit numeric string.
 * Official GS1 Algorithm:
 * - Weights: odd positions (0, 2, 4, 6, 8, 10) weight 3; even positions (1, 3, 5, 7, 9) weight 1.
 */
export function calculateUpcACheckDigit(first11Digits: string): number {
  if (!/^\d{11}$/.test(first11Digits)) {
    throw new Error(`calculateUpcACheckDigit requires exactly 11 numeric digits, received: "${first11Digits}"`);
  }

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(first11Digits[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Validates an EAN-13 barcode string.
 */
export function validateEan13(barcode: string): BarcodeValidationResult {
  const clean = barcode.trim();

  if (!clean) {
    return {
      isValid: false,
      format: 'EAN13',
      errorKey: 'EMPTY',
      errorMessageAr: 'لم يتم إدخال رمز باركود',
      errorMessageFr: 'Aucun code-barres saisi',
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      format: 'EAN13',
      errorKey: 'INVALID_CHARACTERS',
      errorMessageAr: 'رمز EAN-13 يجب أن يتكون من أرقام فقط (0-9)',
      errorMessageFr: 'Le code EAN-13 doit contenir uniquement des chiffres (0-9)',
    };
  }

  if (clean.length !== 13) {
    return {
      isValid: false,
      format: 'EAN13',
      errorKey: 'INVALID_LENGTH',
      errorMessageAr: `طول رمز EAN-13 غير صحيح (${clean.length} أرقام). يجب أن يتكون من 13 رقماً بالضبط`,
      errorMessageFr: `Longueur EAN-13 invalide (${clean.length} chiffres). Doit comporter exactement 13 chiffres`,
    };
  }

  const data12 = clean.slice(0, 12);
  const actualCheckDigit = parseInt(clean[12], 10);
  const expectedCheckDigit = calculateEan13CheckDigit(data12);

  if (actualCheckDigit !== expectedCheckDigit) {
    const suggestedCorrection = `${data12}${expectedCheckDigit}`;
    return {
      isValid: false,
      format: 'EAN13',
      errorKey: 'INVALID_CHECKSUM',
      errorMessageAr: `رمز EAN-13 غير صالح: رقم التحقق الأخير هو (${actualCheckDigit}) بينما الرقم الحسابي المعتمد هو (${expectedCheckDigit})`,
      errorMessageFr: `Code EAN-13 invalide: le chiffre de contrôle actuel est (${actualCheckDigit}) alors que le chiffre attendu est (${expectedCheckDigit})`,
      expectedCheckDigit,
      actualCheckDigit,
      suggestedCorrection,
    };
  }

  return {
    isValid: true,
    format: 'EAN13',
    errorMessageAr: '',
    errorMessageFr: '',
    expectedCheckDigit,
    actualCheckDigit,
  };
}

/**
 * Validates an EAN-8 barcode string.
 */
export function validateEan8(barcode: string): BarcodeValidationResult {
  const clean = barcode.trim();

  if (!clean) {
    return {
      isValid: false,
      format: 'EAN8',
      errorKey: 'EMPTY',
      errorMessageAr: 'لم يتم إدخال رمز باركود',
      errorMessageFr: 'Aucun code-barres saisi',
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      format: 'EAN8',
      errorKey: 'INVALID_CHARACTERS',
      errorMessageAr: 'رمز EAN-8 يجب أن يتكون من أرقام فقط (0-9)',
      errorMessageFr: 'Le code EAN-8 doit contenir uniquement des chiffres (0-9)',
    };
  }

  if (clean.length !== 8) {
    return {
      isValid: false,
      format: 'EAN8',
      errorKey: 'INVALID_LENGTH',
      errorMessageAr: `طول رمز EAN-8 غير صحيح (${clean.length} أرقام). يجب أن يتكون من 8 أرقام بالضبط`,
      errorMessageFr: `Longueur EAN-8 invalide (${clean.length} chiffres). Doit comporter exactement 8 chiffres`,
    };
  }

  const data7 = clean.slice(0, 7);
  const actualCheckDigit = parseInt(clean[7], 10);
  const expectedCheckDigit = calculateEan8CheckDigit(data7);

  if (actualCheckDigit !== expectedCheckDigit) {
    const suggestedCorrection = `${data7}${expectedCheckDigit}`;
    return {
      isValid: false,
      format: 'EAN8',
      errorKey: 'INVALID_CHECKSUM',
      errorMessageAr: `رمز EAN-8 غير صالح: رقم التحقق الأخير هو (${actualCheckDigit}) بينما الرقم الحسابي المعتمد هو (${expectedCheckDigit})`,
      errorMessageFr: `Code EAN-8 invalide: le chiffre de contrôle actuel est (${actualCheckDigit}) alors que le chiffre attendu est (${expectedCheckDigit})`,
      expectedCheckDigit,
      actualCheckDigit,
      suggestedCorrection,
    };
  }

  return {
    isValid: true,
    format: 'EAN8',
    errorMessageAr: '',
    errorMessageFr: '',
    expectedCheckDigit,
    actualCheckDigit,
  };
}

/**
 * Validates a UPC-A barcode string (12 digits).
 */
export function validateUpcA(barcode: string): BarcodeValidationResult {
  const clean = barcode.trim();

  if (!clean) {
    return {
      isValid: false,
      format: 'UPC',
      errorKey: 'EMPTY',
      errorMessageAr: 'لم يتم إدخال رمز باركود',
      errorMessageFr: 'Aucun code-barres saisi',
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      format: 'UPC',
      errorKey: 'INVALID_CHARACTERS',
      errorMessageAr: 'رمز UPC-A يجب أن يتكون من أرقام فقط (0-9)',
      errorMessageFr: 'Le code UPC-A doit contenir uniquement des chiffres (0-9)',
    };
  }

  if (clean.length !== 12) {
    return {
      isValid: false,
      format: 'UPC',
      errorKey: 'INVALID_LENGTH',
      errorMessageAr: `طول رمز UPC-A غير صحيح (${clean.length} أرقام). يجب أن يتكون من 12 رقماً بالضبط`,
      errorMessageFr: `Longueur UPC-A invalide (${clean.length} chiffres). Doit comporter exactement 12 chiffres`,
    };
  }

  const data11 = clean.slice(0, 11);
  const actualCheckDigit = parseInt(clean[11], 10);
  const expectedCheckDigit = calculateUpcACheckDigit(data11);

  if (actualCheckDigit !== expectedCheckDigit) {
    const suggestedCorrection = `${data11}${expectedCheckDigit}`;
    return {
      isValid: false,
      format: 'UPC',
      errorKey: 'INVALID_CHECKSUM',
      errorMessageAr: `رمز UPC-A غير صالح: رقم التحقق الأخير هو (${actualCheckDigit}) بينما الرقم الحسابي المعتمد هو (${expectedCheckDigit})`,
      errorMessageFr: `Code UPC-A invalide: le chiffre de contrôle actuel est (${actualCheckDigit}) alors que le chiffre attendu est (${expectedCheckDigit})`,
      expectedCheckDigit,
      actualCheckDigit,
      suggestedCorrection,
    };
  }

  return {
    isValid: true,
    format: 'UPC',
    errorMessageAr: '',
    errorMessageFr: '',
    expectedCheckDigit,
    actualCheckDigit,
  };
}

/**
 * Validates a Code 128 barcode string.
 * Supports printable ASCII characters (char codes 32 to 126).
 */
export function validateCode128(barcode: string): BarcodeValidationResult {
  const clean = barcode.trim();

  if (!clean) {
    return {
      isValid: false,
      format: 'CODE128',
      errorKey: 'EMPTY',
      errorMessageAr: 'لم يتم إدخال رمز باركود',
      errorMessageFr: 'Aucun code-barres saisi',
    };
  }

  // Printable ASCII 32 - 126
  // eslint-disable-next-line no-control-regex
  if (!/^[\x20-\x7E]+$/.test(clean)) {
    return {
      isValid: false,
      format: 'CODE128',
      errorKey: 'INVALID_CHARACTERS',
      errorMessageAr: 'رمز Code 128 يحتوي على محارف غير صالحة. يدعم فقط أحرف ASCII القياسية والأرقام',
      errorMessageFr: 'Le code Code 128 contient des caractères non pris en charge. Seuls les caractères ASCII standard sont acceptés',
    };
  }

  return {
    isValid: true,
    format: 'CODE128',
    errorMessageAr: '',
    errorMessageFr: '',
  };
}

/**
 * Automatically detects the intended barcode format and validates it accordingly.
 * 
 * Rules:
 * - 13 purely numeric digits -> EAN-13 (must satisfy GS1 EAN-13 check digit).
 * - 8 purely numeric digits -> EAN-8 (must satisfy GS1 EAN-8 check digit).
 * - 12 purely numeric digits -> UPC-A (must satisfy GS1 UPC check digit).
 * - Other lengths or alphanumeric with ASCII printable chars -> Code 128.
 * - Non-ASCII chars (e.g. Arabic text or symbols) -> UNKNOWN / Invalid.
 */
export function validateBarcode(barcode: string | undefined | null): BarcodeValidationResult {
  if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
    return {
      isValid: false,
      format: 'UNKNOWN',
      errorKey: 'EMPTY',
      errorMessageAr: 'لم يتم تعيين رمز باركود لهذا المنتج',
      errorMessageFr: 'Aucun code-barres assigné à ce produit',
    };
  }

  const clean = barcode.trim();

  // If exactly 13 digits, it is intended as EAN-13
  if (/^\d{13}$/.test(clean)) {
    return validateEan13(clean);
  }

  // If exactly 8 digits, it is intended as EAN-8
  if (/^\d{8}$/.test(clean)) {
    return validateEan8(clean);
  }

  // If exactly 12 digits, it is intended as UPC-A
  if (/^\d{12}$/.test(clean)) {
    return validateUpcA(clean);
  }

  // Check if standard ASCII printable string (Code 128)
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]+$/.test(clean)) {
    return validateCode128(clean);
  }

  return {
    isValid: false,
    format: 'UNKNOWN',
    errorKey: 'UNSUPPORTED_FORMAT',
    errorMessageAr: `رمز الباركود يحتوي على رموز غير مدعومة (${clean})`,
    errorMessageFr: `Le format de code-barres contient des caractères non pris en charge (${clean})`,
  };
}

/**
 * Generates a certified, mathematically valid EAN-13 barcode.
 * By default, uses Algeria's GS1 prefix '613'.
 * Calculates the exact GS1 check digit as the 13th digit.
 */
export function generateValidEan13(prefix: string = '613'): string {
  // Prefix can be '613' (3 digits)
  const cleanPrefix = prefix.replace(/\D/g, '').slice(0, 3) || '613';
  const remainingNeeded = 12 - cleanPrefix.length; // usually 9 digits

  // Generate random digits preserving leading zeros as strings
  let randomPart = '';
  for (let i = 0; i < remainingNeeded; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }

  const data12 = `${cleanPrefix}${randomPart}`;
  const checkDigit = calculateEan13CheckDigit(data12);

  return `${data12}${checkDigit}`;
}

/**
 * Returns the mathematically corrected check digit for a given barcode if it's 8, 12, or 13 digits.
 * Returns null if the barcode cannot be fixed.
 */
export function fixBarcodeCheckDigit(barcode: string): string | null {
  const clean = barcode.trim();
  if (/^\d{13}$/.test(clean)) {
    const data12 = clean.slice(0, 12);
    const correctCheck = calculateEan13CheckDigit(data12);
    return `${data12}${correctCheck}`;
  }
  if (/^\d{8}$/.test(clean)) {
    const data7 = clean.slice(0, 7);
    const correctCheck = calculateEan8CheckDigit(data7);
    return `${data7}${correctCheck}`;
  }
  if (/^\d{12}$/.test(clean)) {
    const data11 = clean.slice(0, 11);
    const correctCheck = calculateUpcACheckDigit(data11);
    return `${data11}${correctCheck}`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// GS1 Binary Barcode Decoders (Optical Scanner Simulation)
// -----------------------------------------------------------------------------

const GS1_L_CODES: Record<string, number> = {
  '0001101': 0, '0011001': 1, '0010011': 2, '0111101': 3, '0100011': 4,
  '0110001': 5, '0101111': 6, '0111011': 7, '0110111': 8, '0001011': 9,
};

const GS1_G_CODES: Record<string, number> = {
  '0100111': 0, '0110011': 1, '0011011': 2, '0100001': 3, '0011101': 4,
  '0111001': 5, '0000101': 6, '0010001': 7, '0001001': 8, '0010111': 9,
};

const GS1_R_CODES: Record<string, number> = {
  '1110010': 0, '1100110': 1, '1101100': 2, '1000010': 3, '1011100': 4,
  '1001110': 5, '1010000': 6, '1000100': 7, '1001000': 8, '1110100': 9,
};

const GS1_PARITY_PATTERNS: Record<string, number> = {
  'AAAAAA': 0, 'AABABB': 1, 'AABBAB': 2, 'AABBBA': 3, 'ABAABB': 4,
  'ABBAAB': 5, 'ABBBAA': 6, 'ABABAB': 7, 'ABABBA': 8, 'ABBABA': 9,
};

/**
 * Decodes a 95-bit binary string into an EAN-13 barcode.
 * Returns the decoded 13-digit string or null if invalid or corrupted.
 */
export function decodeEan13Binary(binaryBars: string): string | null {
  const clean = binaryBars.replace(/\s+/g, '');
  if (clean.length !== 95) return null;

  // Verify guard bars: 101 at start, 01010 at middle, 101 at end
  if (clean.slice(0, 3) !== '101' || clean.slice(45, 50) !== '01010' || clean.slice(92, 95) !== '101') {
    return null;
  }

  let parity = '';
  const leftDigits: number[] = [];

  for (let i = 0; i < 6; i++) {
    const chunk = clean.slice(3 + i * 7, 3 + (i + 1) * 7);
    if (GS1_L_CODES[chunk] !== undefined) {
      parity += 'A';
      leftDigits.push(GS1_L_CODES[chunk]);
    } else if (GS1_G_CODES[chunk] !== undefined) {
      parity += 'B';
      leftDigits.push(GS1_G_CODES[chunk]);
    } else {
      return null;
    }
  }

  const firstDigit = GS1_PARITY_PATTERNS[parity];
  if (firstDigit === undefined) return null;

  const rightDigits: number[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = clean.slice(50 + i * 7, 50 + (i + 1) * 7);
    if (GS1_R_CODES[chunk] !== undefined) {
      rightDigits.push(GS1_R_CODES[chunk]);
    } else {
      return null;
    }
  }

  return [firstDigit, ...leftDigits, ...rightDigits].join('');
}

/**
 * Decodes a 67-bit binary string into an EAN-8 barcode.
 */
export function decodeEan8Binary(binaryBars: string): string | null {
  const clean = binaryBars.replace(/\s+/g, '');
  if (clean.length !== 67) return null;

  // 101 at start, 01010 in middle, 101 at end
  if (clean.slice(0, 3) !== '101' || clean.slice(31, 36) !== '01010' || clean.slice(64, 67) !== '101') {
    return null;
  }

  const leftDigits: number[] = [];
  for (let i = 0; i < 4; i++) {
    const chunk = clean.slice(3 + i * 7, 3 + (i + 1) * 7);
    if (GS1_L_CODES[chunk] !== undefined) {
      leftDigits.push(GS1_L_CODES[chunk]);
    } else {
      return null;
    }
  }

  const rightDigits: number[] = [];
  for (let i = 0; i < 4; i++) {
    const chunk = clean.slice(36 + i * 7, 36 + (i + 1) * 7);
    if (GS1_R_CODES[chunk] !== undefined) {
      rightDigits.push(GS1_R_CODES[chunk]);
    } else {
      return null;
    }
  }

  return [...leftDigits, ...rightDigits].join('');
}

/**
 * Decodes a 95-bit binary string into a UPC-A barcode.
 */
export function decodeUpcABinary(binaryBars: string): string | null {
  const clean = binaryBars.replace(/\s+/g, '');
  if (clean.length !== 95) return null;

  if (clean.slice(0, 3) !== '101' || clean.slice(45, 50) !== '01010' || clean.slice(92, 95) !== '101') {
    return null;
  }

  const leftDigits: number[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = clean.slice(3 + i * 7, 3 + (i + 1) * 7);
    if (GS1_L_CODES[chunk] !== undefined) {
      leftDigits.push(GS1_L_CODES[chunk]);
    } else {
      return null;
    }
  }

  const rightDigits: number[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = clean.slice(50 + i * 7, 50 + (i + 1) * 7);
    if (GS1_R_CODES[chunk] !== undefined) {
      rightDigits.push(GS1_R_CODES[chunk]);
    } else {
      return null;
    }
  }

  return [...leftDigits, ...rightDigits].join('');
}

/**
 * General barcode decoder from binary bars.
 */
export function decodeBarcodeBinary(binaryBars: string, format?: BarcodeFormat): string | null {
  const clean = binaryBars.replace(/\s+/g, '');
  if (format === 'EAN13' || (!format && clean.length === 95)) {
    const decoded = decodeEan13Binary(clean);
    if (decoded) return decoded;
  }
  if (format === 'EAN8' || (!format && clean.length === 67)) {
    const decoded = decodeEan8Binary(clean);
    if (decoded) return decoded;
  }
  if (format === 'UPC' || (!format && clean.length === 95)) {
    const decoded = decodeUpcABinary(clean);
    if (decoded) return decoded;
  }
  return null;
}

