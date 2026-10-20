/**
 * TADJIR POS - Barcode Label PDF Generator & Batch Export Engine
 * 
 * Supports:
 * - Standard thermal label roll dimensions (Default: 50mm x 30mm, customizable)
 * - A4 Label Grid (Auto-calculated or configurable columns x rows)
 * - Single product and batch/inventory-wide exports
 * - 300-DPI high-resolution Arabic/French rendering via HTML5 Canvas
 * - Pure vector barcode fallback for thermal printers and headless Node.js testing
 * - Leading zero preservation and exact physical geometries
 * 
 * Compatible with Browser and Node.js runtimes.
 */

import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { validateBarcode } from './barcodeUtils';

export interface BarcodeLabelData {
  barcode: string;
  nameAr: string;
  nameFr?: string;
  sellPrice: number;
  categoryName?: string;
}

export interface BarcodePdfOptions {
  labelCount?: number;
  currency?: string;
  storeName?: string;
  paperFormat?: 'roll_50x30' | 'a4_grid' | 'roll';
  includePrice?: boolean;
  includeName?: boolean;
  includeBarcodeDigits?: boolean;
  widthMm?: number;
  heightMm?: number;
  canvasDataUrl?: string; // High-res image data URL of barcode canvas
  fullLabelDataUrl?: string; // 300-DPI complete label image including typography
}

export interface GeneratedPdfResult {
  doc: jsPDF;
  pageCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
  format: 'roll_50x30' | 'a4_grid' | 'roll';
  labelCount: number;
  filename: string;
  getArrayBuffer: () => ArrayBuffer;
  getBlob: () => Blob;
  save: (customFilename?: string) => void;
}

export interface BatchProductLabelInput {
  id?: string;
  barcode: string;
  nameAr: string;
  nameFr?: string;
  sellPrice: number;
  categoryName?: string;
  copies?: number;
}

export interface BatchBarcodeExportOptions {
  copiesPerProduct?: number;
  currency?: string;
  storeName?: string;
  paperFormat?: 'roll' | 'a4_grid';
  labelWidthMm?: number; // Default 50
  labelHeightMm?: number; // Default 30
  includePrice?: boolean; // Default true
  includeName?: boolean; // Default true
  includeBarcodeDigits?: boolean; // Default true
  a4Columns?: number; // Default 4 for 50x30
  a4Rows?: number; // Default 8 for 50x30
  a4MarginLeftMm?: number; // Default 5
  a4MarginTopMm?: number; // Default 7
  a4GapXMm?: number; // Default 0
  a4GapYMm?: number; // Default 0
  filenamePrefix?: string;
  onProgress?: (progressPercent: number, processedCount: number, totalCount: number) => void;
}

export interface GeneratedBatchPdfResult {
  doc: jsPDF;
  pageCount: number;
  labelCount: number;
  productCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
  format: 'roll' | 'a4_grid';
  filename: string;
  getArrayBuffer: () => ArrayBuffer;
  getBlob: () => Blob;
  save: (customFilename?: string) => void;
}

/**
 * Creates a 300-DPI high resolution image of the full barcode label
 * on an offscreen canvas in the browser. Supports Arabic Cairo font natively.
 */
export function createHighResLabelDataUrl(
  product: { nameAr: string; nameFr?: string; sellPrice: number; barcode: string },
  currency: string = 'د.ج',
  barcodeCanvas?: HTMLCanvasElement | null,
  options: {
    includeName?: boolean;
    includePrice?: boolean;
    includeBarcodeDigits?: boolean;
    widthMm?: number;
    heightMm?: number;
  } = {}
): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const {
    includeName = true,
    includePrice = true,
    includeBarcodeDigits = true,
    widthMm = 50,
    heightMm = 30,
  } = options;

  try {
    const canvas = document.createElement('canvas');
    // 300 DPI scaling: px = (mm / 25.4) * 300
    const widthPx = Math.max(200, Math.round((widthMm / 25.4) * 300));
    const heightPx = Math.max(120, Math.round((heightMm / 25.4) * 300));
    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // 1. Background (crisp pure white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 2. Outer cut line guide (faint subtle border)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, widthPx - 8, heightPx - 8);

    // 3. Product Title (Arabic with Cairo font)
    let currentY = 14;
    if (includeName) {
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0f172a';
      const nameFontSize = Math.max(18, Math.round(widthPx * 0.052));
      ctx.font = `bold ${nameFontSize}px "Cairo", "Segoe UI", Arial, sans-serif`;

      const nameAr = product.nameAr || '';
      const displayAr = nameAr.length > 32 ? nameAr.slice(0, 30) + '...' : nameAr;
      ctx.fillText(displayAr, widthPx / 2, currentY);
      currentY += nameFontSize + 6;

      // 4. Secondary Name (French) if available and different
      if (product.nameFr && product.nameFr !== product.nameAr && heightMm >= 30) {
        ctx.direction = 'ltr';
        const frFontSize = Math.max(14, Math.round(widthPx * 0.034));
        ctx.font = `${frFontSize}px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = '#64748b';
        const displayFr = product.nameFr.length > 36 ? product.nameFr.slice(0, 34) + '...' : product.nameFr;
        ctx.fillText(displayFr, widthPx / 2, currentY);
        currentY += frFontSize + 6;
      }
    }

    // 5. Generate Barcode Canvas if not provided
    let effectiveBarcodeCanvas = barcodeCanvas;
    if (!effectiveBarcodeCanvas && product.barcode) {
      try {
        const tempCanvas = document.createElement('canvas');
        const val = validateBarcode(product.barcode);
        const format = val.isValid && val.format !== 'UNKNOWN' ? val.format : 'CODE128';
        JsBarcode(tempCanvas, product.barcode.trim(), {
          format,
          width: 2,
          height: Math.max(35, Math.round(heightPx * 0.28)),
          displayValue: includeBarcodeDigits,
          fontSize: Math.max(12, Math.round(widthPx * 0.028)),
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        });
        effectiveBarcodeCanvas = tempCanvas;
      } catch (err) {
        console.warn('JsBarcode render error in label creator:', err);
      }
    }

    // Draw Barcode in the center area
    const bottomReserved = includePrice ? Math.max(30, Math.round(heightPx * 0.16)) : 10;
    const availableBarcodeH = Math.max(40, heightPx - currentY - bottomReserved);
    const barcodeTargetW = Math.round(widthPx * 0.86);

    if (effectiveBarcodeCanvas) {
      const targetX = (widthPx - barcodeTargetW) / 2;
      ctx.drawImage(effectiveBarcodeCanvas, targetX, currentY, barcodeTargetW, availableBarcodeH);
    }

    // 6. Price at bottom
    if (includePrice) {
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const priceFontSize = Math.max(20, Math.round(widthPx * 0.06));
      ctx.font = `bold ${priceFontSize}px "Cairo", "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = '#1e3a8a';
      const formattedPrice = `${Number(product.sellPrice || 0).toLocaleString()} ${currency}`;
      ctx.fillText(formattedPrice, widthPx / 2, heightPx - 10);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[createHighResLabelDataUrl] Canvas generation fallback:', err);
    return undefined;
  }
}

/**
 * Strips non-Latin characters to prevent WinAnsi Helvetica glyph corruption in jsPDF vector mode.
 */
function getSafeAsciiText(text: string, fallback: string = 'Article'): string {
  if (!text) return fallback;
  const latinClean = text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
  return latinClean || fallback;
}

/**
 * Draws a single barcode label onto the jsPDF document at (originX, originY).
 */
export function drawSingleLabel(
  doc: jsPDF,
  product: BarcodeLabelData,
  originX: number,
  originY: number,
  options: BarcodePdfOptions = {}
): void {
  const {
    currency = 'د.ج',
    includePrice = true,
    includeName = true,
    includeBarcodeDigits = true,
    widthMm = 50,
    heightMm = 30,
    canvasDataUrl,
    fullLabelDataUrl,
  } = options;

  const width = widthMm;
  const height = heightMm;

  // Background white box with faint bounding border
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.15);
  doc.rect(originX, originY, width, height, 'S');

  // Option A: If a complete high-res 300-DPI label canvas is provided, embed directly
  if (fullLabelDataUrl && typeof fullLabelDataUrl === 'string' && fullLabelDataUrl.startsWith('data:image')) {
    try {
      doc.addImage(fullLabelDataUrl, 'PNG', originX, originY, width, height, undefined, 'FAST');
      return;
    } catch (e) {
      console.warn('[drawSingleLabel] Failed embedding fullLabelDataUrl, falling back:', e);
    }
  }

  // Option B: If a barcode canvas DataURL is provided, embed barcode and draw text
  if (canvasDataUrl && typeof canvasDataUrl === 'string' && canvasDataUrl.startsWith('data:image')) {
    if (includeName) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(Math.max(6.5, Math.min(9, width * 0.17)));
      doc.setTextColor(30, 41, 59);
      const rawName = product.nameFr || getSafeAsciiText(product.nameAr, `Article ${product.barcode}`);
      const cleanName = rawName.length > 28 ? rawName.slice(0, 26) + '...' : rawName;
      doc.text(cleanName, originX + width / 2, originY + 4, { align: 'center' });
    }

    const barcodeWidth = width * 0.84;
    const barcodeHeight = height * 0.52;
    const barcodeX = originX + (width - barcodeWidth) / 2;
    const barcodeY = originY + (includeName ? 5 : 2.5);
    try {
      doc.addImage(canvasDataUrl, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight, undefined, 'FAST');
    } catch {
      drawVectorBarcode(doc, product.barcode, originX, originY, width, height, includeBarcodeDigits);
    }

    if (includePrice) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(Math.max(7.5, Math.min(10, width * 0.19)));
      doc.setTextColor(15, 23, 42);
      const priceText = `${Number(product.sellPrice || 0).toLocaleString()} ${currency === 'د.ج' ? 'DZD' : currency}`;
      doc.text(priceText, originX + width / 2, originY + height - 2.5, { align: 'center' });
    }
  } else {
    // Option C: Pure Vector Rendering mode (sharp vector bars, zero compression artifacts)
    if (includeName) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(Math.max(6.5, Math.min(8.5, width * 0.16)));
      doc.setTextColor(30, 41, 59);
      const rawName = product.nameFr || getSafeAsciiText(product.nameAr, `Article ${product.barcode}`);
      const cleanName = rawName.length > 28 ? rawName.slice(0, 26) + '...' : rawName;
      doc.text(cleanName, originX + width / 2, originY + 4.5, { align: 'center' });
    }

    drawVectorBarcode(doc, product.barcode, originX, originY, width, height, includeBarcodeDigits);

    if (includePrice) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(Math.max(7.5, Math.min(9.5, width * 0.19)));
      doc.setTextColor(15, 23, 42);
      const priceText = `${Number(product.sellPrice || 0).toLocaleString()} ${currency === 'د.ج' ? 'DZD' : currency}`;
      doc.text(priceText, originX + width / 2, originY + height - 2.5, { align: 'center' });
    }
  }
}

/**
 * Draws sharp, vector barcode bars directly onto the PDF using jsPDF path rectangles.
 * Completely immune to canvas resolution limits, pixelation, or DPI loss.
 */
function drawVectorBarcode(
  doc: jsPDF,
  barcode: string,
  originX: number,
  originY: number,
  labelWidth: number = 50,
  labelHeight: number = 30,
  includeDigits: boolean = true
): void {
  const validation = validateBarcode(barcode);
  const cleanBarcode = barcode.trim();

  let binarySegments: Array<{ data: string; text?: string }> = [];
  try {
    const formatName = validation.isValid && validation.format !== 'UNKNOWN' ? validation.format : 'CODE128';
    const BarcodeModule = (JsBarcode as any).getModule(formatName);
    if (BarcodeModule) {
      const instance = new BarcodeModule(cleanBarcode, {});
      if (instance.valid && instance.valid()) {
        binarySegments = instance.encode();
      }
    }
  } catch {
    // Fallback module
  }

  // If module failed or not valid, fallback to Code 128
  if (!binarySegments || binarySegments.length === 0) {
    try {
      const Code128Module = (JsBarcode as any).getModule('CODE128');
      const instance = new Code128Module(cleanBarcode || '00000000', {});
      binarySegments = instance.encode();
    } catch {
      binarySegments = [];
    }
  }

  let binaryString = '';
  if (Array.isArray(binarySegments)) {
    binaryString = binarySegments.map((s: any) => (s && s.data ? s.data : '')).join('');
  } else if (binarySegments && typeof binarySegments === 'object' && (binarySegments as any).data) {
    binaryString = (binarySegments as any).data;
  }
  const totalModules = binaryString.length || 95;

  const targetBarcodeWidth = Math.min(labelWidth - 8, 42);
  const moduleWidth = targetBarcodeWidth / totalModules;
  const startX = originX + (labelWidth - targetBarcodeWidth) / 2;
  const startY = originY + (labelHeight > 25 ? 6.5 : 4.5);
  const barHeight = includeDigits ? Math.min(13.5, labelHeight * 0.44) : Math.min(17, labelHeight * 0.58);

  doc.setFillColor(0, 0, 0);

  // Draw each 1 bit as a black vector rectangle
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      const x = startX + i * moduleWidth;
      doc.rect(x, startY, moduleWidth, barHeight, 'F');
    }
  }

  // Human readable digits below bars if enabled
  if (includeDigits) {
    doc.setFont('Courier', 'bold');
    doc.setFontSize(Math.max(6, Math.min(7.5, labelWidth * 0.15)));
    doc.setTextColor(20, 20, 20);
    doc.text(cleanBarcode, originX + labelWidth / 2, startY + barHeight + 3.2, { align: 'center' });
  }
}

/**
 * Generates single-product Barcode Label PDF (for backward compatibility).
 */
export function generateBarcodeLabelPdf(
  product: BarcodeLabelData,
  options: BarcodePdfOptions = {}
): GeneratedPdfResult {
  const {
    labelCount = 1,
    paperFormat = 'roll_50x30',
    widthMm = 50,
    heightMm = 30,
  } = options;

  const safeCount = Math.max(1, Math.min(500, Math.floor(labelCount)));
  const cleanBarcode = product.barcode ? product.barcode.trim() : '0000000000000';
  const filename = `etiquette-barcode-${cleanBarcode}.pdf`;

  if (paperFormat === 'roll_50x30' || paperFormat === 'roll') {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [heightMm, widthMm],
      compress: true,
    });

    for (let i = 0; i < safeCount; i++) {
      if (i > 0) {
        doc.addPage([heightMm, widthMm], 'landscape');
      }
      drawSingleLabel(doc, product, 0, 0, { ...options, widthMm, heightMm });
    }

    return {
      doc,
      pageCount: safeCount,
      pageWidthMm: widthMm,
      pageHeightMm: heightMm,
      format: paperFormat,
      labelCount: safeCount,
      filename,
      getArrayBuffer: () => doc.output('arraybuffer'),
      getBlob: () => doc.output('blob'),
      save: (customName?: string) => doc.save(customName || filename),
    };
  } else {
    // A4 Grid
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const labelWidth = widthMm;
    const labelHeight = heightMm;
    const leftMargin = 5;
    const topMargin = 7;
    const gapX = 0;
    const gapY = 0;

    const colCount = labelWidth === 50 ? 4 : Math.max(1, Math.floor((210 - 2 * leftMargin) / (labelWidth + gapX)));
    const rowCount = labelHeight === 30 ? 8 : Math.max(1, Math.floor((297 - 2 * topMargin - 10) / (labelHeight + gapY)));
    const labelsPerPage = colCount * rowCount;

    const totalPages = Math.ceil(safeCount / labelsPerPage);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage('a4', 'portrait');
      }

      const startIndex = pageIdx * labelsPerPage;
      const countThisPage = Math.min(labelsPerPage, safeCount - startIndex);

      for (let i = 0; i < countThisPage; i++) {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const x = leftMargin + col * (labelWidth + gapX);
        const y = topMargin + row * (labelHeight + gapY);
        drawSingleLabel(doc, product, x, y, { ...options, widthMm, heightMm });
      }
    }

    return {
      doc,
      pageCount: totalPages,
      pageWidthMm: 210,
      pageHeightMm: 297,
      format: 'a4_grid',
      labelCount: safeCount,
      filename,
      getArrayBuffer: () => doc.output('arraybuffer'),
      getBlob: () => doc.output('blob'),
      save: (customName?: string) => doc.save(customName || filename),
    };
  }
}

/**
 * ============================================================================
 * TADJIR POS: Batch Export All Barcodes to One PDF Engine
 * ============================================================================
 * Generates one unified print-ready PDF containing all matching product barcode
 * labels with requested copies, dimensions, and layout format.
 */
export function generateBatchBarcodeLabelsPdf(
  products: BatchProductLabelInput[],
  options: BatchBarcodeExportOptions = {}
): GeneratedBatchPdfResult {
  const {
    copiesPerProduct = 1,
    currency = 'د.ج',
    paperFormat = 'roll',
    labelWidthMm = 50,
    labelHeightMm = 30,
    includePrice = true,
    includeName = true,
    includeBarcodeDigits = true,
    a4MarginLeftMm = 5,
    a4MarginTopMm = 7,
    a4GapXMm = 0,
    a4GapYMm = 0,
    filenamePrefix = 'TADJIR_All_Barcodes',
    onProgress,
  } = options;

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.pdf`;

  // Pre-calculate flattened label items to preserve exact product ordering and copies
  interface FlattenedLabel {
    product: BatchProductLabelInput;
    copyIndex: number;
    totalCopies: number;
    fullLabelDataUrl?: string;
  }

  // Pre-render high-res labels in browser with cache to optimize memory & speed
  const labelDataUrlCache = new Map<string, string | undefined>();

  const flattenedLabels: FlattenedLabel[] = [];

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const prod = products[pIdx];
    const copies = Math.max(1, Math.min(200, prod.copies ?? copiesPerProduct));

    // Cache key for identical product label
    const cacheKey = `${prod.barcode}_${prod.nameAr}_${prod.nameFr || ''}_${prod.sellPrice}_${labelWidthMm}_${labelHeightMm}_${includeName}_${includePrice}_${includeBarcodeDigits}`;

    let fullLabelDataUrl: string | undefined = undefined;
    if (typeof document !== 'undefined') {
      if (labelDataUrlCache.has(cacheKey)) {
        fullLabelDataUrl = labelDataUrlCache.get(cacheKey);
      } else {
        fullLabelDataUrl = createHighResLabelDataUrl(
          {
            nameAr: prod.nameAr,
            nameFr: prod.nameFr,
            sellPrice: prod.sellPrice,
            barcode: prod.barcode,
          },
          currency,
          null,
          {
            includeName,
            includePrice,
            includeBarcodeDigits,
            widthMm: labelWidthMm,
            heightMm: labelHeightMm,
          }
        );
        labelDataUrlCache.set(cacheKey, fullLabelDataUrl);
      }
    }

    for (let c = 0; c < copies; c++) {
      flattenedLabels.push({
        product: prod,
        copyIndex: c,
        totalCopies: copies,
        fullLabelDataUrl,
      });
    }

    if (onProgress) {
      const pct = Math.round(((pIdx + 1) / products.length) * 50);
      onProgress(pct, pIdx + 1, products.length);
    }
  }

  const totalLabels = flattenedLabels.length;

  if (paperFormat === 'roll') {
    // -------------------------------------------------------------
    // Thermal Roll: Every label is on its own page of [width x height]
    // -------------------------------------------------------------
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [labelHeightMm, labelWidthMm],
      compress: true,
    });

    for (let i = 0; i < totalLabels; i++) {
      if (i > 0) {
        doc.addPage([labelHeightMm, labelWidthMm], 'landscape');
      }

      const item = flattenedLabels[i];
      drawSingleLabel(
        doc,
        {
          barcode: item.product.barcode,
          nameAr: item.product.nameAr,
          nameFr: item.product.nameFr,
          sellPrice: item.product.sellPrice,
          categoryName: item.product.categoryName,
        },
        0,
        0,
        {
          currency,
          includePrice,
          includeName,
          includeBarcodeDigits,
          widthMm: labelWidthMm,
          heightMm: labelHeightMm,
          fullLabelDataUrl: item.fullLabelDataUrl,
        }
      );

      if (onProgress && i % 10 === 0) {
        const pct = 50 + Math.round(((i + 1) / totalLabels) * 50);
        onProgress(pct, i + 1, totalLabels);
      }
    }

    if (onProgress) {
      onProgress(100, totalLabels, totalLabels);
    }

    return {
      doc,
      pageCount: Math.max(1, totalLabels),
      labelCount: totalLabels,
      productCount: products.length,
      pageWidthMm: labelWidthMm,
      pageHeightMm: labelHeightMm,
      format: 'roll',
      filename,
      getArrayBuffer: () => doc.output('arraybuffer'),
      getBlob: () => doc.output('blob'),
      save: (customName?: string) => doc.save(customName || filename),
    };
  } else {
    // -------------------------------------------------------------
    // A4 Grid: Multiple labels tiled across A4 pages (210 x 297 mm)
    // -------------------------------------------------------------
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const colCount =
      options.a4Columns ||
      (labelWidthMm === 50 ? 4 : Math.max(1, Math.floor((210 - 2 * a4MarginLeftMm) / (labelWidthMm + a4GapXMm))));
    const rowCount =
      options.a4Rows ||
      (labelHeightMm === 30 ? 8 : Math.max(1, Math.floor((297 - 2 * a4MarginTopMm - 10) / (labelHeightMm + a4GapYMm))));
    const labelsPerPage = Math.max(1, colCount * rowCount);

    const totalPages = Math.max(1, Math.ceil(totalLabels / labelsPerPage));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage('a4', 'portrait');
      }

      const startIndex = pageIdx * labelsPerPage;
      const countThisPage = Math.min(labelsPerPage, totalLabels - startIndex);

      for (let i = 0; i < countThisPage; i++) {
        const labelItem = flattenedLabels[startIndex + i];
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const x = a4MarginLeftMm + col * (labelWidthMm + a4GapXMm);
        const y = a4MarginTopMm + row * (labelHeightMm + a4GapYMm);

        drawSingleLabel(
          doc,
          {
            barcode: labelItem.product.barcode,
            nameAr: labelItem.product.nameAr,
            nameFr: labelItem.product.nameFr,
            sellPrice: labelItem.product.sellPrice,
            categoryName: labelItem.product.categoryName,
          },
          x,
          y,
          {
            currency,
            includePrice,
            includeName,
            includeBarcodeDigits,
            widthMm: labelWidthMm,
            heightMm: labelHeightMm,
            fullLabelDataUrl: labelItem.fullLabelDataUrl,
          }
        );
      }

      if (onProgress) {
        const pct = 50 + Math.round(((pageIdx + 1) / totalPages) * 50);
        onProgress(pct, startIndex + countThisPage, totalLabels);
      }
    }

    if (onProgress) {
      onProgress(100, totalLabels, totalLabels);
    }

    return {
      doc,
      pageCount: totalPages,
      labelCount: totalLabels,
      productCount: products.length,
      pageWidthMm: 210,
      pageHeightMm: 297,
      format: 'a4_grid',
      filename,
      getArrayBuffer: () => doc.output('arraybuffer'),
      getBlob: () => doc.output('blob'),
      save: (customName?: string) => doc.save(customName || filename),
    };
  }
}
