/**
 * TADJIR POS - Barcode Label PDF Generator
 * 
 * Supports standard thermal label roll dimensions:
 * - 50 mm (Width) x 30 mm (Height) [Standard Algerian Retail Barcode Sticker]
 * - A4 Label Grid (32 labels per A4 page: 4 columns x 8 rows of 50x30mm)
 * 
 * Compatible with both Browser (direct client download) and Node.js (automated testing / server export).
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
  paperFormat?: 'roll_50x30' | 'a4_grid';
  includePrice?: boolean;
  includeName?: boolean;
  canvasDataUrl?: string; // High-res image data URL of barcode canvas
  fullLabelDataUrl?: string; // 300-DPI complete label image including typography
}

export interface GeneratedPdfResult {
  doc: jsPDF;
  pageCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
  format: 'roll_50x30' | 'a4_grid';
  labelCount: number;
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
  barcodeCanvas?: HTMLCanvasElement | null
): string | undefined {
  if (typeof document === 'undefined') return undefined;

  try {
    const canvas = document.createElement('canvas');
    // 300 DPI: 50mm = 591px, 30mm = 354px
    const widthPx = 591;
    const heightPx = 354;
    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // 1. Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 2. Outer cut line guide (faint)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, widthPx - 8, heightPx - 8);

    // 3. Product Title (Arabic with Cairo font)
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px "Cairo", "Segoe UI", Arial, sans-serif';

    const nameAr = product.nameAr || '';
    const displayAr = nameAr.length > 32 ? nameAr.slice(0, 30) + '...' : nameAr;
    ctx.fillText(displayAr, widthPx / 2, 16);

    // 4. Secondary Name (French) if available and different
    let barcodeStartY = 58;
    if (product.nameFr && product.nameFr !== product.nameAr) {
      ctx.direction = 'ltr';
      ctx.font = '18px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      const displayFr = product.nameFr.length > 36 ? product.nameFr.slice(0, 34) + '...' : product.nameFr;
      ctx.fillText(displayFr, widthPx / 2, 54);
      barcodeStartY = 78;
    }

    // 5. Barcode Canvas
    if (barcodeCanvas) {
      const targetW = 490;
      const targetH = 175;
      const targetX = (widthPx - targetW) / 2;
      ctx.drawImage(barcodeCanvas, targetX, barcodeStartY, targetW, targetH);
    }

    // 6. Price at bottom
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = 'bold 34px "Cairo", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#1e3a8a';
    const formattedPrice = `${product.sellPrice.toLocaleString()} ${currency}`;
    ctx.fillText(formattedPrice, widthPx / 2, heightPx - 14);

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
 * Draws a single 50mm x 30mm barcode label onto the jsPDF document at (originX, originY).
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
    canvasDataUrl,
    fullLabelDataUrl,
  } = options;

  const width = 50;
  const height = 30;

  // Background white box with faint bounding border (for cutting/visual boundary)
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
    // Top: Product name text
    if (includeName) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const rawName = product.nameFr || getSafeAsciiText(product.nameAr, `Article ${product.barcode}`);
      const cleanName = rawName.length > 28 ? rawName.slice(0, 26) + '...' : rawName;
      doc.text(cleanName, originX + width / 2, originY + 4, { align: 'center' });
    }

    // Middle: Barcode image from canvas
    const barcodeWidth = 42;
    const barcodeHeight = 16;
    const barcodeX = originX + (width - barcodeWidth) / 2;
    const barcodeY = originY + 5.5;
    try {
      doc.addImage(canvasDataUrl, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight, undefined, 'FAST');
    } catch {
      // Fallback to vector bars
      drawVectorBarcode(doc, product.barcode, originX, originY);
    }

    // Bottom: Price
    if (includePrice) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const priceText = `${product.sellPrice.toLocaleString()} ${currency === 'د.ج' ? 'DZD' : currency}`;
      doc.text(priceText, originX + width / 2, originY + 27.5, { align: 'center' });
    }
  } else {
    // Option C: Pure Vector Rendering mode (zero compression artifacts, perfect for thermal printers & Node tests)
    // 1. Top Header: Product Name
    if (includeName) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const rawName = product.nameFr || getSafeAsciiText(product.nameAr, `Article ${product.barcode}`);
      const cleanName = rawName.length > 28 ? rawName.slice(0, 26) + '...' : rawName;
      doc.text(cleanName, originX + width / 2, originY + 4.5, { align: 'center' });
    }

    // 2. Barcode Vector Bars
    drawVectorBarcode(doc, product.barcode, originX, originY);

    // 3. Bottom: Price
    if (includePrice) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const priceText = `${product.sellPrice.toLocaleString()} ${currency === 'د.ج' ? 'DZD' : currency}`;
      doc.text(priceText, originX + width / 2, originY + 27.5, { align: 'center' });
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
  originY: number
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

  const binaryString = binarySegments.map((s) => s.data).join('');
  const totalModules = binaryString.length || 95;

  const targetBarcodeWidth = 40; // 40 mm wide
  const moduleWidth = targetBarcodeWidth / totalModules;
  const startX = originX + (50 - targetBarcodeWidth) / 2;
  const startY = originY + 6.5;
  const barHeight = 13.5;

  doc.setFillColor(0, 0, 0);

  // Draw each 1 bit as a black vector rectangle
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      const x = startX + i * moduleWidth;
      doc.rect(x, startY, moduleWidth, barHeight, 'F');
    }
  }

  // Human readable digits below bars
  doc.setFont('Courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text(cleanBarcode, originX + 25, startY + barHeight + 3.2, { align: 'center' });
}

/**
 * Generates the complete Barcode Label PDF.
 */
export function generateBarcodeLabelPdf(
  product: BarcodeLabelData,
  options: BarcodePdfOptions = {}
): GeneratedPdfResult {
  const {
    labelCount = 1,
    paperFormat = 'roll_50x30',
  } = options;

  const safeCount = Math.max(1, Math.min(200, Math.floor(labelCount)));
  const cleanBarcode = product.barcode ? product.barcode.trim() : '0000000000000';
  const filename = `etiquette-barcode-${cleanBarcode}.pdf`;

  if (paperFormat === 'roll_50x30') {
    // Standard Thermal Roll: Exactly 50mm (Width) x 30mm (Height) per label / page
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [30, 50], // Width 50mm, Height 30mm
      compress: true,
    });

    for (let i = 0; i < safeCount; i++) {
      if (i > 0) {
        doc.addPage([30, 50], 'landscape');
      }
      drawSingleLabel(doc, product, 0, 0, options);
    }

    return {
      doc,
      pageCount: safeCount,
      pageWidthMm: 50,
      pageHeightMm: 30,
      format: 'roll_50x30',
      labelCount: safeCount,
      filename,
      getArrayBuffer: () => doc.output('arraybuffer'),
      getBlob: () => doc.output('blob'),
      save: (customName?: string) => doc.save(customName || filename),
    };
  } else {
    // A4 Label Sheet Grid: 4 columns x 8 rows = 32 labels per A4 page
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const labelsPerPage = 32;
    const colCount = 4;
    const labelWidth = 50;
    const labelHeight = 30;
    const leftMargin = 5;
    const topMargin = 7;
    const gapX = 0;
    const gapY = 0;

    let totalPages = Math.ceil(safeCount / labelsPerPage);

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
        drawSingleLabel(doc, product, x, y, options);
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
