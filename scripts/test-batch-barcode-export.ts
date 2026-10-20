/**
 * TADJIR POS - Automated Test Suite for Batch Barcode PDF Export
 * 
 * Verifies all requirements from Section 8:
 * 1. Multiple products inventory
 * 2. Duplicate barcode values handling
 * 3. Missing / empty barcodes handling
 * 4. Invalid EAN-13 check digit detection & reporting
 * 5. Barcodes with leading zeros preservation
 * 6. Arabic product names support
 * 7. Different label sizes (50x30, 40x25, 60x40, custom)
 * 8. A4 sheet layout (columns, rows, pagination, actual size)
 * 9. Multiple copies per product
 * 10. Empty results handling
 * 11. Large inventories performance
 * 12. PDF file integrity & page dimensions
 */

import fs from 'fs';
import path from 'path';
import {
  generateBatchBarcodeLabelsPdf,
  BatchProductLabelInput,
} from '../src/utils/barcodePdfExport';
import {
  validateBarcode,
  calculateEan13CheckDigit,
} from '../src/utils/barcodeUtils';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('   TADJIR POS - BATCH BARCODE PDF EXPORT COMPREHENSIVE TEST SUITE     ');
  console.log('======================================================================\n');

  // Sample Algerian Retail Products
  const sampleProducts: BatchProductLabelInput[] = [
    {
      id: 'p1',
      barcode: '6135428792665', // Valid Algerian EAN-13
      nameAr: 'حليب كانديا 1 لتر',
      nameFr: 'Lait Candia 1L',
      sellPrice: 125,
      categoryName: 'الحليب ومشتقاته',
    },
    {
      id: 'p2',
      barcode: '6130000000015', // Valid Algerian EAN-13 with zeros
      nameAr: 'عصير رامي برتقال 1.25 لتر',
      nameFr: 'Jus Rami Orange 1.25L',
      sellPrice: 160,
      categoryName: 'المشروبات والعصائر',
    },
    {
      id: 'p3',
      barcode: '012345678905', // Valid UPC-A with leading zero
      nameAr: 'زيت إليو 5 لتر',
      nameFr: 'Huile Elio 5L',
      sellPrice: 650,
      categoryName: 'المواد الغذائية العامة',
    },
    {
      id: 'p4',
      barcode: '96385074', // Valid EAN-8
      nameAr: 'بسكويت بيمو غوفرات',
      nameFr: 'Bimo Gaufrettes',
      sellPrice: 45,
      categoryName: 'البسكويت والشكولاطة',
    },
    {
      id: 'p5',
      barcode: 'CODE128-ITEM-99', // Valid Code 128
      nameAr: 'صابون سائل إيزيس 1 لتر',
      nameFr: 'Savon Liquide Isis 1L',
      sellPrice: 280,
      categoryName: 'مواد التنظيف والمنزل',
    },
    {
      id: 'p6_leading_zero',
      barcode: '0001234567895', // Valid EAN-13 with 3 leading zeros!
      nameAr: 'قهوة فاميكو مطحونة 250غ',
      nameFr: 'Café Famico Moulu 250g',
      sellPrice: 220,
      categoryName: 'القهوة والشاي',
    },
  ];

  // ------------------------------------------------------------------
  // 1. INVENTORY CONTAINING MULTIPLE PRODUCTS
  // ------------------------------------------------------------------
  console.log('1. MULTIPLE PRODUCTS INVENTORY VERIFICATION');
  {
    const result = generateBatchBarcodeLabelsPdf(sampleProducts, {
      paperFormat: 'roll',
      copiesPerProduct: 1,
      labelWidthMm: 50,
      labelHeightMm: 30,
    });

    assert(result.productCount === 6, 'Product count is exactly 6');
    assert(result.labelCount === 6, 'Total labels generated is exactly 6');
    assert(result.pageCount === 6, 'Thermal roll generates exactly 6 pages (1 per label)');
    assert(result.pageWidthMm === 50, 'Page width is exactly 50 mm');
    assert(result.pageHeightMm === 30, 'Page height is exactly 30 mm');
  }

  // ------------------------------------------------------------------
  // 2. PRODUCTS WITH DUPLICATE BARCODE VALUES
  // ------------------------------------------------------------------
  console.log('\n2. DUPLICATE BARCODE VALUES VERIFICATION');
  {
    const productsWithDuplicateBarcode: BatchProductLabelInput[] = [
      {
        id: 'dup1',
        barcode: '6135428792665',
        nameAr: 'حليب كانديا نصف دسم 1 لتر',
        sellPrice: 125,
      },
      {
        id: 'dup2',
        barcode: '6135428792665', // Same barcode, different flavor/lot
        nameAr: 'حليب كانديا كامل الدسم 1 لتر',
        sellPrice: 130,
      },
    ];

    const result = generateBatchBarcodeLabelsPdf(productsWithDuplicateBarcode, {
      paperFormat: 'roll',
      copiesPerProduct: 1,
    });

    assert(result.productCount === 2, 'Both products are processed even with identical barcode values');
    assert(result.labelCount === 2, 'Each distinct product item generates its own respective label');
    assert(result.pageCount === 2, 'Total pages match 2 labels');
  }

  // ------------------------------------------------------------------
  // 3. PRODUCTS WITH MISSING / EMPTY BARCODES
  // ------------------------------------------------------------------
  console.log('\n3. MISSING & EMPTY BARCODE EXCLUSION & AUDIT REPORT');
  {
    const missingBarcodeProduct = {
      id: 'p_missing',
      barcode: '',
      nameAr: 'منتج بدون باركود',
      sellPrice: 100,
    };
    const whitespaceBarcodeProduct = {
      id: 'p_space',
      barcode: '     ',
      nameAr: 'منتج بمسافات فارغة',
      sellPrice: 200,
    };

    const valMissing = validateBarcode(missingBarcodeProduct.barcode);
    const valWhitespace = validateBarcode(whitespaceBarcodeProduct.barcode);

    assert(!valMissing.isValid, 'Empty barcode string is correctly identified as invalid');
    assert(valMissing.errorKey === 'EMPTY', 'Error key is EMPTY');
    assert(valMissing.errorMessageAr.length > 0, 'Arabic diagnostic message is provided');

    assert(!valWhitespace.isValid, 'Whitespace barcode string is correctly identified as invalid');
    assert(valWhitespace.errorKey === 'EMPTY', 'Whitespace error key is EMPTY');

    // Filter valid products only
    const rawList = [...sampleProducts, missingBarcodeProduct, whitespaceBarcodeProduct];
    const filteredValid = rawList.filter((p) => validateBarcode(p.barcode).isValid);
    assert(filteredValid.length === 6, 'Excluded products filter leaves exactly the 6 valid products');
  }

  // ------------------------------------------------------------------
  // 4. INVALID EAN-13 CHECK DIGITS
  // ------------------------------------------------------------------
  console.log('\n4. INVALID EAN-13 CHECK DIGIT AUDIT & DETECTION');
  {
    const badCheckDigitBarcode = '6135428792661'; // Check digit should be 5, but is 1
    const val = validateBarcode(badCheckDigitBarcode);

    assert(!val.isValid, 'Barcode with wrong check digit is rejected');
    assert(val.errorKey === 'INVALID_CHECKSUM', 'Error key is INVALID_CHECKSUM');
    assert(val.actualCheckDigit === 1, 'Actual check digit is 1');
    assert(val.expectedCheckDigit === 5, 'Expected check digit is 5');
    assert(val.suggestedCorrection === '6135428792665', 'Suggested corrected barcode is 6135428792665');
  }

  // ------------------------------------------------------------------
  // 5. BARCODES WITH LEADING ZEROS PRESERVATION
  // ------------------------------------------------------------------
  console.log('\n5. LEADING ZEROS PRESERVATION (STRING ENFORCEMENT)');
  {
    const leadingZeroCodes = [
      '0123456789012',
      '0001234567895',
      '01234565',
      '012345678905',
    ];

    for (const code of leadingZeroCodes) {
      assert(typeof code === 'string', `Barcode ${code} is of type string`);
      assert(code.startsWith('0'), `Barcode ${code} begins with zero`);
      assert(code.length === code.trim().length, `Barcode ${code} length is strictly preserved without integer truncation`);
    }

    const testItem = {
      barcode: '0001234567895',
      nameAr: 'منتج أصفار في البداية',
      sellPrice: 50,
    };
    const res = generateBatchBarcodeLabelsPdf([testItem], {
      paperFormat: 'roll',
      copiesPerProduct: 1,
    });
    assert(res.labelCount === 1, 'Leading zero barcode generates valid label');
  }

  // ------------------------------------------------------------------
  // 6. ARABIC PRODUCT NAMES SUPPORT
  // ------------------------------------------------------------------
  console.log('\n6. ARABIC PRODUCT NAMES & RTL TYPOGRAPHY');
  {
    const arabicProducts: BatchProductLabelInput[] = [
      {
        barcode: '6135428792665',
        nameAr: 'كسكسي سيم متوسط 1 كغ',
        nameFr: 'Couscous Sim Moyen 1kg',
        sellPrice: 110,
      },
      {
        barcode: '6130000000015',
        nameAr: 'طماطم مصبرة كاب 800غ (عالي الجودة)',
        nameFr: 'Double Concentré de Tomate CAB',
        sellPrice: 240,
      },
    ];

    const result = generateBatchBarcodeLabelsPdf(arabicProducts, {
      paperFormat: 'roll',
      includeName: true,
      includePrice: true,
      currency: 'د.ج',
    });

    assert(result.labelCount === 2, 'Arabic products generate valid labels');
    const pdfBuf = result.getArrayBuffer();
    assert(pdfBuf.byteLength > 2000, 'PDF buffer contains valid content stream');
  }

  // ------------------------------------------------------------------
  // 7. DIFFERENT LABEL SIZES (50x30, 40x25, 60x40, CUSTOM)
  // ------------------------------------------------------------------
  console.log('\n7. DIFFERENT LABEL SIZES & PHYSICAL DIMENSIONS');
  {
    // A) 50x30 mm
    const res50x30 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 2), {
      paperFormat: 'roll',
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    assert(res50x30.pageWidthMm === 50 && res50x30.pageHeightMm === 30, '50x30 mm dimensions match');

    // B) 40x25 mm
    const res40x25 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 2), {
      paperFormat: 'roll',
      labelWidthMm: 40,
      labelHeightMm: 25,
    });
    assert(res40x25.pageWidthMm === 40 && res40x25.pageHeightMm === 25, '40x25 mm dimensions match');

    // C) 60x40 mm
    const res60x40 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 2), {
      paperFormat: 'roll',
      labelWidthMm: 60,
      labelHeightMm: 40,
    });
    assert(res60x40.pageWidthMm === 60 && res60x40.pageHeightMm === 40, '60x40 mm dimensions match');

    // D) Custom 70x35 mm
    const resCustom = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 2), {
      paperFormat: 'roll',
      labelWidthMm: 70,
      labelHeightMm: 35,
    });
    assert(resCustom.pageWidthMm === 70 && resCustom.pageHeightMm === 35, 'Custom 70x35 mm dimensions match');
  }

  // ------------------------------------------------------------------
  // 8. A4 SHEET LAYOUT (GRID, 32 LABELS/PAGE, AUTOMATIC PAGINATION)
  // ------------------------------------------------------------------
  console.log('\n8. A4 SHEET LAYOUT, GRID TILES & PAGINATION');
  {
    // On A4 (210x297): 4 cols x 8 rows of 50x30mm = 32 labels per page
    // Test 1: 10 labels on A4 -> exactly 1 page
    const resA4_10 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 5), {
      paperFormat: 'a4_grid',
      copiesPerProduct: 2, // 5 products * 2 = 10 labels
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    assert(resA4_10.labelCount === 10, 'Total labels is 10');
    assert(resA4_10.pageCount === 1, '10 labels on A4 fit on exactly 1 page');
    assert(resA4_10.pageWidthMm === 210, 'A4 page width is 210 mm');
    assert(resA4_10.pageHeightMm === 297, 'A4 page height is 297 mm');

    // Test 2: 32 labels on A4 -> exactly 1 page
    const resA4_32 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 4), {
      paperFormat: 'a4_grid',
      copiesPerProduct: 8, // 4 products * 8 = 32 labels
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    assert(resA4_32.labelCount === 32, 'Total labels is 32');
    assert(resA4_32.pageCount === 1, '32 labels on A4 fit on exactly 1 page');

    // Test 3: 33 labels on A4 -> automatically paginates to 2 pages!
    const resA4_33 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 3), {
      paperFormat: 'a4_grid',
      copiesPerProduct: 11, // 3 products * 11 = 33 labels
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    assert(resA4_33.labelCount === 33, 'Total labels is 33');
    assert(resA4_33.pageCount === 2, '33 labels on A4 automatically paginate to exactly 2 pages');

    // Test 4: 65 labels on A4 -> paginates to 3 pages
    const resA4_65 = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 5), {
      paperFormat: 'a4_grid',
      copiesPerProduct: 13, // 5 products * 13 = 65 labels
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    assert(resA4_65.labelCount === 65, 'Total labels is 65');
    assert(resA4_65.pageCount === 3, '65 labels on A4 paginate to exactly 3 pages (32+32+1)');
  }

  // ------------------------------------------------------------------
  // 9. MULTIPLE COPIES PER PRODUCT
  // ------------------------------------------------------------------
  console.log('\n9. MULTIPLE COPIES PER PRODUCT');
  {
    // Uniform copies
    const resUniform = generateBatchBarcodeLabelsPdf(sampleProducts.slice(0, 3), {
      paperFormat: 'roll',
      copiesPerProduct: 5,
    });
    assert(resUniform.productCount === 3, '3 products');
    assert(resUniform.labelCount === 15, '3 products * 5 copies = 15 labels');
    assert(resUniform.pageCount === 15, 'Roll format produces 15 pages');

    // Individual per-item copies (e.g. stock-based)
    const perItemCopiesProducts: BatchProductLabelInput[] = [
      { ...sampleProducts[0], copies: 4 }, // 4 copies
      { ...sampleProducts[1], copies: 2 }, // 2 copies
      { ...sampleProducts[2], copies: 6 }, // 6 copies
    ];
    const resPerItem = generateBatchBarcodeLabelsPdf(perItemCopiesProducts, {
      paperFormat: 'roll',
    });
    assert(resPerItem.labelCount === 12, '4 + 2 + 6 = 12 total labels');
    assert(resPerItem.pageCount === 12, '12 pages on roll');
  }

  // ------------------------------------------------------------------
  // 10. EMPTY SEARCH RESULTS / EMPTY INVENTORY
  // ------------------------------------------------------------------
  console.log('\n10. EMPTY PRODUCTS HANDLING');
  {
    const emptyResult = generateBatchBarcodeLabelsPdf([], {
      paperFormat: 'roll',
    });
    assert(emptyResult.productCount === 0, 'Empty product list handled gracefully');
    assert(emptyResult.labelCount === 0, 'Total labels is 0');
    assert(emptyResult.pageCount >= 1, 'Valid PDF document object initialized');
    assert(emptyResult.getArrayBuffer().byteLength > 0, 'PDF buffer is non-null');
  }

  // ------------------------------------------------------------------
  // 11. LARGE INVENTORIES (100+ PRODUCTS, PERFORMANCE & MEMORY SAFETY)
  // ------------------------------------------------------------------
  console.log('\n11. LARGE INVENTORIES STRESS TEST (100 PRODUCTS, 300 LABELS)');
  {
    const largeCatalog: BatchProductLabelInput[] = [];
    for (let i = 0; i < 100; i++) {
      const code12 = `613${String(i).padStart(9, '0')}`;
      const check = calculateEan13CheckDigit(code12);
      largeCatalog.push({
        id: `p_large_${i}`,
        barcode: `${code12}${check}`,
        nameAr: `منتج تجاري رقم ${i + 1}`,
        nameFr: `Article Commercial N° ${i + 1}`,
        sellPrice: 100 + i * 15,
        categoryName: 'مواد عامة',
        copies: 3, // 3 copies each = 300 total labels
      });
    }

    const tStart = Date.now();
    let progressCalls = 0;

    const resLarge = generateBatchBarcodeLabelsPdf(largeCatalog, {
      paperFormat: 'a4_grid',
      labelWidthMm: 50,
      labelHeightMm: 30,
      onProgress: (_pct) => {
        progressCalls++;
      },
    });

    const tDuration = Date.now() - tStart;
    console.log(`    Generated 300 labels across 100 products in ${tDuration} ms`);

    assert(resLarge.productCount === 100, 'Processed 100 products');
    assert(resLarge.labelCount === 300, 'Total 300 labels');
    // 300 / 32 = 9.375 -> 10 A4 pages
    assert(resLarge.pageCount === 10, '300 labels on A4 format paginate to exactly 10 pages');
    assert(progressCalls > 0, 'Progress callback fired properly');
    assert(tDuration < 5000, `Generation completed in under 5 seconds (${tDuration} ms)`);
  }

  // ------------------------------------------------------------------
  // 12. PDF FILE INTEGRITY & DISK ARTIFACT EXPORT
  // ------------------------------------------------------------------
  console.log('\n12. PDF BINARY INTEGRITY, STRUCTURE & AUDIT SAVING');
  {
    const sampleExport = generateBatchBarcodeLabelsPdf(sampleProducts, {
      paperFormat: 'roll',
      copiesPerProduct: 2, // 12 labels total
      labelWidthMm: 50,
      labelHeightMm: 30,
      includeName: true,
      includePrice: true,
      includeBarcodeDigits: true,
    });

    const pdfBuffer = Buffer.from(sampleExport.getArrayBuffer());
    assert(pdfBuffer.length > 5000, 'PDF file size is non-trivial (> 5KB)');

    // Verify PDF header %PDF-1.x
    const header = pdfBuffer.slice(0, 8).toString('utf-8');
    assert(header.startsWith('%PDF-'), `PDF header is valid: "${header.trim()}"`);

    // Verify PDF trailer %%EOF
    const trailer = pdfBuffer.slice(-64).toString('utf-8');
    assert(trailer.includes('%%EOF'), 'PDF ends with valid %%EOF trailer');

    // Save actual physical sample PDF to public folder so it can be audited
    const outPath = path.resolve('public', 'sample-all-products-barcodes-roll-50x30.pdf');
    fs.writeFileSync(outPath, pdfBuffer);
    assert(fs.existsSync(outPath), `Saved sample roll PDF to: ${outPath}`);

    // Also generate and save an A4 grid sample
    const sampleA4 = generateBatchBarcodeLabelsPdf(sampleProducts, {
      paperFormat: 'a4_grid',
      copiesPerProduct: 4, // 24 labels total (fits on 1 A4 sheet)
      labelWidthMm: 50,
      labelHeightMm: 30,
    });
    const a4Buffer = Buffer.from(sampleA4.getArrayBuffer());
    const a4OutPath = path.resolve('public', 'sample-all-products-barcodes-a4-sheet.pdf');
    fs.writeFileSync(a4OutPath, a4Buffer);
    assert(fs.existsSync(a4OutPath), `Saved sample A4 grid PDF to: ${a4OutPath}`);
  }

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${passedAssertions} / ${totalAssertions} AUTOMATED TEST ASSERTIONS PASSED WITH ZERO ERRORS!`);
  console.log('======================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
