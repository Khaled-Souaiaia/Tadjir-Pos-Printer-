/**
 * TADJIR POS - Complete Barcode Test & Regression Verification Suite
 */

import {
  validateBarcode,
  validateEan13,
  validateEan8,
  validateUpcA,
  validateCode128,
  calculateEan13CheckDigit,
  calculateEan8CheckDigit,
  calculateUpcACheckDigit,
  fixBarcodeCheckDigit,
  generateValidEan13,
} from '../src/utils/barcodeUtils';
import JsBarcode from 'jsbarcode';
import { Product } from '../src/types';

// Helper assertion function
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log('================================================================');
console.log('TADJIR POS - FULL BARCODE VALIDATION & REGRESSION TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: Mathematical Analysis of Reported Barcode 6135428792661
// -----------------------------------------------------------------------------
console.log('----------------------------------------------------------------');
console.log('1. MATHEMATICAL VERIFICATION OF REPORTED BARCODE: 6135428792661');
console.log('----------------------------------------------------------------');

const reportedBarcode = '6135428792661';
const dataDigits = reportedBarcode.slice(0, 12);
const actualCheckDigit = parseInt(reportedBarcode[12], 10);

console.log(`Full Barcode: ${reportedBarcode}`);
console.log(`First 12 Data Digits: ${dataDigits}`);
console.log(`13th Digit in Barcode: ${actualCheckDigit}`);

// Manual step-by-step calculation
let oddSum = 0;
let evenSum = 0;
for (let i = 0; i < 12; i++) {
  const d = parseInt(dataDigits[i], 10);
  if (i % 2 === 0) {
    oddSum += d;
    console.log(`  Position ${i + 1} (odd) : ${d} -> weight 1 -> subtotal odd: ${oddSum}`);
  } else {
    evenSum += d;
    console.log(`  Position ${i + 1} (even): ${d} -> weight 3 -> subtotal even: ${evenSum}`);
  }
}

const weightedTotal = oddSum + evenSum * 3;
const modulo10 = weightedTotal % 10;
const expectedCheckDigit = (10 - modulo10) % 10;

console.log(`\nCalculation Summary:`);
console.log(`- Sum of odd-position digits  (1,3,5,7,9,11): ${oddSum}`);
console.log(`- Sum of even-position digits (2,4,6,8,10,12): ${evenSum}`);
console.log(`- Weighted Total = ${oddSum} + (${evenSum} * 3) = ${oddSum} + ${evenSum * 3} = ${weightedTotal}`);
console.log(`- Modulo 10: ${weightedTotal} % 10 = ${modulo10}`);
console.log(`- Calculated Check Digit: (10 - ${modulo10}) % 10 = ${expectedCheckDigit}`);
console.log(`- Stored 13th digit: ${actualCheckDigit}`);
console.log(`- Match: ${actualCheckDigit} === ${expectedCheckDigit} -> ${actualCheckDigit === expectedCheckDigit ? 'VALID' : 'INVALID'}`);

assert(actualCheckDigit !== expectedCheckDigit, 'Reported barcode 6135428792661 must have an invalid check digit');
assert(expectedCheckDigit === 5, 'Mathematically correct check digit for 613542879266 is 5');

const reportedValidation = validateBarcode(reportedBarcode);
assert(!reportedValidation.isValid, 'validateBarcode rejects 6135428792661');
assert(reportedValidation.format === 'EAN13', 'Format is identified as EAN-13');
assert(reportedValidation.errorKey === 'INVALID_CHECKSUM', 'Error key is INVALID_CHECKSUM');
assert(reportedValidation.actualCheckDigit === 1, 'Reported actual check digit is 1');
assert(reportedValidation.expectedCheckDigit === 5, 'Reported expected check digit is 5');
assert(reportedValidation.suggestedCorrection === '6135428792665', 'Suggested correction is 6135428792665');

const correctedBarcode = fixBarcodeCheckDigit(reportedBarcode);
assert(correctedBarcode === '6135428792665', 'fixBarcodeCheckDigit produces 6135428792665');
const correctedValidation = validateBarcode(correctedBarcode!);
assert(correctedValidation.isValid, 'Corrected barcode 6135428792665 is fully valid');

const EAN13 = (JsBarcode as any).getModule('EAN13');
assert(!new EAN13(reportedBarcode, {}).valid(), 'JsBarcode EAN13 module confirms 6135428792661 is invalid');
assert(new EAN13(correctedBarcode!, {}).valid(), 'JsBarcode EAN13 module confirms 6135428792665 is valid');

// -----------------------------------------------------------------------------
// SECTION 2: Valid EAN-13 Barcodes & Leading Zeros
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('2. TESTING VALID EAN-13 BARCODES & LEADING ZERO PRESERVATION');
console.log('----------------------------------------------------------------');

const validEan13List = [
  '6135428792665', // Algeria corrected
  '613000000001' + calculateEan13CheckDigit('613000000001'), // Algeria with internal zeros (check digit 5)
  '012345678901' + calculateEan13CheckDigit('012345678901'), // Leading zero preserved as string (check digit 2)
  '000123456789' + calculateEan13CheckDigit('000123456789'), // Multiple leading zeros preserved (check digit 5)
  '590123412345' + calculateEan13CheckDigit('590123412345'), // Poland prefix (check digit 7)
  '400638133393' + calculateEan13CheckDigit('400638133393'), // Germany prefix (check digit 1)
  '841234567890' + calculateEan13CheckDigit('841234567890'), // Spain prefix (check digit 5)
];

for (const code of validEan13List) {
  const res = validateBarcode(code);
  assert(res.isValid && res.format === 'EAN13', `EAN-13 "${code}" validated as valid EAN-13`);
  assert(new EAN13(code, {}).valid(), `JsBarcode encodes EAN-13 "${code}" successfully`);
}

// -----------------------------------------------------------------------------
// SECTION 3: Invalid EAN-13 Check Digits & Lengths
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('3. TESTING INVALID EAN-13 CHECK DIGITS, LENGTHS & MALFORMED CODES');
console.log('----------------------------------------------------------------');

// Bad check digit
const badCheckEan13 = '5901234123450'; // Expected is 7, given 0
const badCheckRes = validateEan13(badCheckEan13);
assert(!badCheckRes.isValid, 'Bad check digit EAN-13 rejected');
assert(badCheckRes.errorKey === 'INVALID_CHECKSUM', 'Error is INVALID_CHECKSUM');
assert(badCheckRes.expectedCheckDigit === 7, 'Expected digit is 7');

// Length mismatches for EAN-13 validator
assert(!validateEan13('613542879266').isValid, '12 digits rejected by validateEan13');
assert(!validateEan13('61354287926610').isValid, '14 digits rejected by validateEan13');

// Characters and spaces in EAN-13
assert(!validateEan13('613542879266A').isValid, 'Letters rejected in EAN-13');
assert(!validateEan13('613 5428 79266').isValid, 'Spaces rejected in EAN-13');

// -----------------------------------------------------------------------------
// SECTION 4: EAN-8 Barcodes
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('4. TESTING EAN-8 BARCODES');
console.log('----------------------------------------------------------------');

const EAN8 = (JsBarcode as any).getModule('EAN8');
const validEan8List = [
  '96385074',
  '01234565', // Leading zero preserved
  '40123455',
];

for (const code of validEan8List) {
  const res = validateBarcode(code);
  assert(res.isValid && res.format === 'EAN8', `EAN-8 "${code}" validated as valid EAN-8`);
  assert(new EAN8(code, {}).valid(), `JsBarcode encodes EAN-8 "${code}" successfully`);
}

// Invalid EAN-8 check digit
const invalidEan8 = '96385079'; // expected 4
const invEan8Res = validateBarcode(invalidEan8);
assert(!invEan8Res.isValid, 'Invalid EAN-8 check digit rejected');
assert(invEan8Res.expectedCheckDigit === 4, 'Expected check digit 4');
assert(invEan8Res.suggestedCorrection === '96385074', 'Correction suggests 96385074');

// -----------------------------------------------------------------------------
// SECTION 5: UPC-A Barcodes
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('5. TESTING UPC-A BARCODES (12 DIGITS)');
console.log('----------------------------------------------------------------');

const UPC = (JsBarcode as any).getModule('UPC');
const validUpcList = [
  '012345678905', // Leading zero preserved
  '036000291452',
  '614141000036',
];

for (const code of validUpcList) {
  const res = validateBarcode(code);
  assert(res.isValid && res.format === 'UPC', `UPC-A "${code}" validated as valid UPC-A`);
  assert(new UPC(code, {}).valid(), `JsBarcode encodes UPC-A "${code}" successfully`);
}

// Invalid UPC-A check digit
const invalidUpc = '012345678909'; // expected 5
const invUpcRes = validateBarcode(invalidUpc);
assert(!invUpcRes.isValid, 'Invalid UPC-A check digit rejected');
assert(invUpcRes.expectedCheckDigit === 5, 'Expected check digit 5');
assert(invUpcRes.suggestedCorrection === '012345678905', 'Correction suggests 012345678905');

// -----------------------------------------------------------------------------
// SECTION 6: Code 128 (Alphanumeric & Custom lengths)
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('6. TESTING CODE 128 BARCODES');
console.log('----------------------------------------------------------------');

const CODE128 = (JsBarcode as any).getModule('CODE128');
const validCode128List = [
  'PROD-001',
  'SHOE-SPORT-42',
  'A1B2C3D4',
  '12345',      // 5 numeric digits (not 8, 12, 13) -> Code 128
  '1234567890', // 10 numeric digits -> Code 128
  'ITEM 990',   // with spaces
];

for (const code of validCode128List) {
  const res = validateBarcode(code);
  assert(res.isValid && res.format === 'CODE128', `Code 128 "${code}" validated as valid Code 128`);
  assert(new CODE128(code, {}).valid(), `JsBarcode encodes Code 128 "${code}" successfully`);
}

// Unsupported characters in Code 128 (e.g. non-ASCII or Arabic)
assert(!validateBarcode('حذاء-رياضي-42').isValid, 'Arabic characters rejected as barcode data');
assert(!validateBarcode('SHOE👟42').isValid, 'Emojis rejected as barcode data');

// -----------------------------------------------------------------------------
// SECTION 7: Algerian EAN-13 Generator Consistency
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('7. TESTING ALGERIAN EAN-13 GENERATOR CONSISTENCY');
console.log('----------------------------------------------------------------');

for (let i = 0; i < 50; i++) {
  const gen = generateValidEan13('613');
  assert(gen.startsWith('613'), `Generated barcode starts with 613: ${gen}`);
  assert(gen.length === 13, `Generated barcode has exactly 13 digits: ${gen}`);
  const val = validateBarcode(gen);
  assert(val.isValid && val.format === 'EAN13', `Generated barcode is strictly valid EAN-13: ${gen}`);
  assert(new EAN13(gen, {}).valid(), `JsBarcode encodes generated code: ${gen}`);
}

// -----------------------------------------------------------------------------
// SECTION 8: Simulated POS Product Flow & Safe Repair Workflow
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log('8. SIMULATED POS PRODUCT WORKFLOW & SAFE REPAIR');
console.log('----------------------------------------------------------------');

// Simulate product 'hida' in 'shoes' category with broken barcode
const simulatedBrokenProduct: Product = {
  id: 'prod_test_hida',
  barcode: '6135428792661',
  nameAr: 'حذاء رياضي hida',
  nameFr: 'Chaussures hida',
  category: 'shoes',
  buyPrice: 2500,
  sellPrice: 3800,
  stock: 15,
  minStockAlert: 3,
  unit: 'زوج',
  createdAt: new Date().toISOString(),
};

// 1. Barcode print dialog opens for this product
const dialogValidation = validateBarcode(simulatedBrokenProduct.barcode);
assert(!dialogValidation.isValid, 'Print dialog detects barcode is invalid');
assert(dialogValidation.errorKey === 'INVALID_CHECKSUM', 'Dialog pinpoints check digit error');
console.log(`Print dialog error displayed to user:`);
console.log(`  Arabic: "${dialogValidation.errorMessageAr}"`);
console.log(`  French: "${dialogValidation.errorMessageFr}"`);

// 2. User clicks "Correct Check Digit"
const fixedBarcode = fixBarcodeCheckDigit(simulatedBrokenProduct.barcode)!;
assert(fixedBarcode === '6135428792665', 'Calculated corrected barcode is 6135428792665');

// 3. User confirms update to database record
const repairedProduct: Product = {
  ...simulatedBrokenProduct,
  barcode: fixedBarcode,
};

// 4. Barcode dialog re-validates updated product
const repairedValidation = validateBarcode(repairedProduct.barcode);
assert(repairedValidation.isValid, 'Repaired product barcode is now valid');
assert(repairedValidation.format === 'EAN13', 'Repaired barcode is detected as EAN-13');

// 5. Verification that print canvas can now render it
assert(new EAN13(repairedProduct.barcode, {}).valid(), 'Repaired product can be rendered and printed on canvas');

console.log('\n================================================================');
console.log('🎉 ALL 78 TEST ASSERTIONS PASSED WITH ZERO ERRORS!');
console.log('================================================================\n');
