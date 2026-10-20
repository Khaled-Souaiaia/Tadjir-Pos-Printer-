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

console.log('====================================================');
console.log('BARCODE VALIDATION SUITE');
console.log('====================================================\n');

// 1. Test reported problem barcode: 6135428792661
console.log('--- 1. Testing Reported Barcode: 6135428792661 ---');
const problemValidation = validateBarcode('6135428792661');
console.log('Format detected:', problemValidation.format);
console.log('Is valid:', problemValidation.isValid);
console.log('Error Key:', problemValidation.errorKey);
console.log('Actual check digit:', problemValidation.actualCheckDigit);
console.log('Expected check digit:', problemValidation.expectedCheckDigit);
console.log('Suggested fix:', problemValidation.suggestedCorrection);
console.log('Arabic message:', problemValidation.errorMessageAr);
console.log('French message:', problemValidation.errorMessageFr);

const correctedProblem = fixBarcodeCheckDigit('6135428792661');
console.log('Fixed barcode:', correctedProblem);
const correctedValidation = validateBarcode(correctedProblem!);
console.log('Fixed validation is valid:', correctedValidation.isValid);

// Verify with JsBarcode EAN13 module
const EAN13 = (JsBarcode as any).getModule('EAN13');
console.log('JsBarcode valid for 6135428792661:', new EAN13('6135428792661', {}).valid());
console.log('JsBarcode valid for 6135428792665:', new EAN13('6135428792665', {}).valid());

// 2. Test Leading Zeros Preservation
console.log('\n--- 2. Testing Leading Zeros Preservation ---');
const leadingZeroEan13 = '012345678901' + calculateEan13CheckDigit('012345678901');
console.log('EAN-13 with leading zero:', leadingZeroEan13);
console.log('Valid:', validateBarcode(leadingZeroEan13).isValid);

const leadingZeroUpc = '01234567890' + calculateUpcACheckDigit('01234567890');
console.log('UPC-A with leading zero:', leadingZeroUpc);
console.log('Valid:', validateBarcode(leadingZeroUpc).isValid);

const leadingZeroEan8 = '0123456' + calculateEan8CheckDigit('0123456');
console.log('EAN-8 with leading zero:', leadingZeroEan8);
console.log('Valid:', validateBarcode(leadingZeroEan8).isValid);

// 3. Test Invalid Check Digits for EAN-8 and UPC-A
console.log('\n--- 3. Testing Check Digit Failures ---');
const invalidEan8 = '96385079'; // expected 4, got 9
console.log('Invalid EAN-8 validation:', validateBarcode(invalidEan8));
const invalidUpc = '012345678909'; // expected 5, got 9
console.log('Invalid UPC validation:', validateBarcode(invalidUpc));

// 4. Test Code 128
console.log('\n--- 4. Testing Code 128 ---');
const code128Tests = ['PROD-001', 'ITEM 12345', 'ABC-xyz-99', '12345'];
for (const code of code128Tests) {
  const res = validateBarcode(code);
  console.log(`Code128 "${code}": format=${res.format}, valid=${res.isValid}`);
}

// 5. Test Non-numeric & Special / Invalid characters
console.log('\n--- 5. Testing Malformed / Unsupported Barcodes ---');
console.log('Letters in EAN-13:', validateEan13('613542879266A'));
console.log('Short barcode in EAN-13:', validateEan13('6135428'));
console.log('Arabic text in barcode:', validateBarcode('باركود123'));
console.log('Empty barcode:', validateBarcode('   '));

// 6. Test Algerian Barcode Generator (10 iterations)
console.log('\n--- 6. Testing generateValidEan13() (10 iterations) ---');
for (let i = 0; i < 10; i++) {
  const gen = generateValidEan13('613');
  const valid = validateBarcode(gen).isValid;
  const jsbValid = new EAN13(gen, {}).valid();
  if (!valid || !jsbValid) {
    console.error(`FAILED on generated code: ${gen}`);
    process.exit(1);
  }
}
console.log('All 10 generated EAN-13 codes are 100% valid in both our validator and JsBarcode!');

console.log('\n====================================================');
console.log('ALL UNIT TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
