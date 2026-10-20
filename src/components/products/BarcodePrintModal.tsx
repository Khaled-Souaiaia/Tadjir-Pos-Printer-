import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import {
  X,
  Printer,
  Eye,
  AlertTriangle,
  Check,
  RefreshCw,
  Wrench,
  Package,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import {
  validateBarcode,
  BarcodeValidationResult,
  generateValidEan13,
  fixBarcodeCheckDigit,
} from '../../utils/barcodeUtils';

interface BarcodePrintModalProps {
  product: Product;
  onClose: () => void;
  lang: 'ar' | 'fr';
  currency: string;
  onProductUpdate?: (updatedProduct: Product) => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  product,
  onClose,
  lang,
  currency,
  onProductUpdate,
}) => {
  const { categories, saveProduct, showToast } = useApp();

  const [currentProduct, setCurrentProduct] = useState<Product>(product);
  const [labelCount, setLabelCount] = useState<number>(1);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [validationResult, setValidationResult] = useState<BarcodeValidationResult>(() =>
    validateBarcode(product.barcode)
  );
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [pendingCorrection, setPendingCorrection] = useState<{
    newBarcode: string;
    type: 'fix_check_digit' | 'generate_new';
  } | null>(null);

  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // Get localized category name
  const categoryName =
    categories.find((c) => c.id === currentProduct.category)?.nameAr ||
    currentProduct.category;

  // Render barcode on canvas
  const renderBarcode = useCallback(
    (barcodeVal: string, format: string) => {
      const canvas = barcodeCanvasRef.current;
      if (!canvas) return;

      try {
        JsBarcode(canvas, barcodeVal, {
          format: format,
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('JsBarcode render error:', err);
      }
    },
    []
  );

  // Validate and render when currentProduct or barcode changes
  useEffect(() => {
    const result = validateBarcode(currentProduct.barcode);
    setValidationResult(result);

    if (result.isValid && result.format !== 'UNKNOWN') {
      // Delay slightly to ensure canvas is mounted
      const timer = setTimeout(() => {
        renderBarcode(currentProduct.barcode.trim(), result.format);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentProduct.barcode, renderBarcode]);

  // Handle barcode repair confirmation
  const handleApplyBarcodeCorrection = () => {
    if (!pendingCorrection) return;

    const updatedProduct: Product = {
      ...currentProduct,
      barcode: pendingCorrection.newBarcode,
    };

    try {
      saveProduct(updatedProduct);
      setCurrentProduct(updatedProduct);
      if (onProductUpdate) {
        onProductUpdate(updatedProduct);
      }
      setPendingCorrection(null);

      showToast(
        lang === 'ar'
          ? `تم تحديث وحفظ باركود المنتج بنجاح: ${pendingCorrection.newBarcode}`
          : `Code-barres mis à jour et enregistré: ${pendingCorrection.newBarcode}`,
        'success'
      );
    } catch (error) {
      console.error('Error saving updated product barcode:', error);
      showToast(
        lang === 'ar'
          ? 'حدث خطأ أثناء حفظ الباركود الجديد'
          : 'Erreur lors de l\'enregistrement du nouveau code-barres',
        'error'
      );
    }
  };

  // Generate the HTML content for printing
  const generatePrintHTML = (): string => {
    const canvas = barcodeCanvasRef.current;
    if (!canvas) return '';

    const barcodeDataURL = canvas.toDataURL('image/png');
    const labels: string[] = [];

    for (let i = 0; i < labelCount; i++) {
      labels.push(`
        <div class="label">
          <div class="product-name">${currentProduct.nameAr}</div>
          ${
            currentProduct.nameFr && currentProduct.nameFr !== currentProduct.nameAr
              ? `<div class="product-name-fr">${currentProduct.nameFr}</div>`
              : ''
          }
          <div class="barcode-container">
            <img src="${barcodeDataURL}" alt="Barcode" />
          </div>
          <div class="price">${currentProduct.sellPrice.toLocaleString()} ${currency}</div>
        </div>
      `);
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة باركود - ${currentProduct.nameAr}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial;
            background: white;
            padding: 10mm;
          }

          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 5mm;
            justify-content: flex-start;
          }

          .label {
            width: 50mm;
            height: 30mm;
            border: 1px dashed #ccc;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: white;
            page-break-inside: avoid;
          }

          .product-name {
            font-size: 10pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 0.5mm;
            line-height: 1.2;
            max-height: 2.4em;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .product-name-fr {
            font-size: 7.5pt;
            color: #64748b;
            margin-bottom: 0.5mm;
            max-height: 1.2em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .barcode-container {
            margin: 0.5mm 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .barcode-container img {
            max-width: 100%;
            height: auto;
          }

          .price {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 0.5mm;
          }

          @media print {
            body {
              padding: 0;
            }

            .label {
              border: none;
            }

            @page {
              margin: 5mm;
              size: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labels.join('\n')}
        </div>
      </body>
      </html>
    `;
  };

  // Handle print action
  const handlePrint = () => {
    if (!validationResult.isValid) {
      return;
    }

    setIsPrinting(true);

    try {
      const printHTML = generatePrintHTML();
      const iframe = printFrameRef.current;

      if (!iframe) {
        throw new Error('Print frame not available');
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access print frame document');
      }

      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Print error:', err);
          showToast(
            lang === 'ar'
              ? 'حدث خطأ أثناء فتح نافذة الطباعة'
              : 'Erreur lors de l\'ouverture de la fenêtre d\'impression',
            'error'
          );
        } finally {
          setIsPrinting(false);
        }
      }, 500);
    } catch (error) {
      console.error('Print preparation error:', error);
      showToast(
        lang === 'ar'
          ? 'فشل في تحضير المحتوى للطباعة'
          : 'Échec de préparation du contenu d\'impression',
        'error'
      );
      setIsPrinting(false);
    }
  };

  const errorMessage =
    lang === 'ar'
      ? validationResult.errorMessageAr
      : validationResult.errorMessageFr;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="neu-flat rounded-3xl p-6 w-full max-w-lg bg-white shadow-2xl border border-white/80 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center neu-inset">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                {lang === 'ar' ? 'طباعة الباركود' : 'Imprimer Code-barres'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {lang === 'ar'
                  ? 'إعداد ومعاينة ملصقات الباركود والتحقق من المعايير'
                  : 'Préparer, vérifier et imprimer les étiquettes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Info Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-start gap-3">
            {currentProduct.imageUrl ? (
              <img
                src={currentProduct.imageUrl}
                alt={currentProduct.nameAr}
                className="w-14 h-14 rounded-xl object-cover neu-inset shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl neu-inset flex items-center justify-center text-slate-300 bg-white shrink-0">
                <Package className="w-7 h-7" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm text-slate-800 truncate">
                  {currentProduct.nameAr}
                </div>
                {/* Category Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-200 text-slate-700 shrink-0">
                  <Tag className="w-3 h-3 text-slate-500" />
                  {categoryName}
                </span>
              </div>

              {currentProduct.nameFr &&
                currentProduct.nameFr !== currentProduct.nameAr && (
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {currentProduct.nameFr}
                  </div>
                )}

              <div className="flex items-center gap-2 mt-2">
                <div className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-normal">
                    {lang === 'ar' ? 'الباركود: ' : 'Code: '}
                  </span>
                  <span className="font-bold tracking-wider">
                    {currentProduct.barcode || (lang === 'ar' ? '(فارغ)' : '(Vide)')}
                  </span>
                </div>

                {validationResult.format !== 'UNKNOWN' && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border ${
                      validationResult.isValid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {validationResult.format === 'EAN13'
                      ? 'EAN-13'
                      : validationResult.format === 'EAN8'
                      ? 'EAN-8'
                      : validationResult.format === 'UPC'
                      ? 'UPC-A'
                      : 'Code 128'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Validation Error Card */}
        {!validationResult.isValid && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-extrabold text-rose-800 mb-1">
                  {lang === 'ar' ? 'خطأ في معايير الباركود' : 'Erreur de standard de code-barres'}
                </div>
                <div className="text-xs text-rose-700 leading-relaxed font-medium">
                  {errorMessage}
                </div>

                {/* Mathematical Check Details for Checksum Errors */}
                {validationResult.errorKey === 'INVALID_CHECKSUM' && (
                  <div className="mt-2.5 p-2 rounded-xl bg-white border border-rose-200 text-[11px] font-mono text-slate-700">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span>{lang === 'ar' ? 'الرقم الموجود الحالي:' : 'Chiffre actuel:'}</span>
                      <span className="font-bold text-rose-600">
                        {validationResult.actualCheckDigit}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>{lang === 'ar' ? 'رقم التحقق الحسابي الصحيح:' : 'Chiffre calculé attendu:'}</span>
                      <span className="font-bold text-emerald-600">
                        {validationResult.expectedCheckDigit}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons to Safely Fix or Regenerate */}
                <div className="mt-3.5 pt-3 border-t border-rose-200/80 flex flex-wrap gap-2">
                  {validationResult.suggestedCorrection && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingCorrection({
                          newBarcode: validationResult.suggestedCorrection!,
                          type: 'fix_check_digit',
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {lang === 'ar'
                        ? `تصحيح رقم التحقق إلى (${validationResult.suggestedCorrection})`
                        : `Corriger le chiffre vers (${validationResult.suggestedCorrection})`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const newCode = generateValidEan13('613');
                      setPendingCorrection({
                        newBarcode: newCode,
                        type: 'generate_new',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {lang === 'ar'
                      ? 'توليد باركود EAN-13 معتمد جديد'
                      : 'Générer un nouveau code EAN-13'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal / Banner for Barcode Repair */}
        {pendingCorrection && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 animate-in zoom-in-95">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-extrabold text-amber-900 mb-1">
                  {lang === 'ar'
                    ? 'تأكيد تعديل وتحديث باركود المنتج في قاعدة البيانات'
                    : 'Confirmer la mise à jour du code-barres'}
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {lang === 'ar'
                    ? `هل تؤكد تغيير رمز الباركود للمنتج "${currentProduct.nameAr}" من (${currentProduct.barcode}) إلى الرمز المعتمد الجديد (${pendingCorrection.newBarcode}) وحفظه في النظام؟`
                    : `Confirmez-vous le remplacement du code (${currentProduct.barcode}) par le code valide (${pendingCorrection.newBarcode}) pour le produit "${currentProduct.nameAr}" ?`}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <NeuButton
                    variant="primary"
                    size="sm"
                    onClick={handleApplyBarcodeCorrection}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    {lang === 'ar' ? 'تأكيد وحفظ التغيير' : 'Confirmer et enregistrer'}
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    size="sm"
                    onClick={() => setPendingCorrection(null)}
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                  </NeuButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Preview */}
        {validationResult.isValid && showPreview && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                {lang === 'ar' ? 'معاينة ملصق الباركود (50mm × 30mm)' : 'Aperçu de l\'étiquette (50mm × 30mm)'}
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                {showPreview
                  ? lang === 'ar'
                    ? 'إخفاء'
                    : 'Masquer'
                  : lang === 'ar'
                  ? 'عرض'
                  : 'Afficher'}
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 flex flex-col items-center justify-center shadow-inner">
              <div className="text-xs font-bold text-slate-800 mb-1 text-center max-w-full truncate">
                {currentProduct.nameAr}
              </div>
              <canvas ref={barcodeCanvasRef} className="max-w-full"></canvas>
              <div className="text-xs font-extrabold text-blue-700 mt-1">
                {currentProduct.sellPrice.toLocaleString()} {currency}
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for barcode generation when preview is turned off */}
        {validationResult.isValid && !showPreview && (
          <canvas ref={barcodeCanvasRef} style={{ display: 'none' }}></canvas>
        )}

        {/* Label Count Input */}
        {validationResult.isValid && (
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-700 mb-1 px-1">
              {lang === 'ar' ? 'عدد الملصقات المطلوبة' : 'Nombre d\'étiquettes'}
            </label>
            <NeuInput
              type="number"
              min="1"
              max="100"
              value={labelCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setLabelCount(Math.max(1, Math.min(100, value)));
              }}
              className="text-center font-bold text-lg"
            />
            <div className="text-[10px] text-slate-400 mt-1 px-1">
              {lang === 'ar'
                ? 'يمكنك تحديد من 1 إلى 100 ملصق للطباعة المباشرة'
                : 'Vous pouvez imprimer de 1 à 100 étiquettes'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-200">
          <NeuButton
            variant="primary"
            fullWidth
            onClick={handlePrint}
            disabled={!validationResult.isValid || isPrinting}
            icon={isPrinting ? undefined : <Printer className="w-4 h-4" />}
          >
            {isPrinting
              ? lang === 'ar'
                ? 'جاري التحضير للطباعة...'
                : 'Préparation...'
              : lang === 'ar'
              ? 'طباعة الملصقات الآن'
              : 'Imprimer maintenant'}
          </NeuButton>
          <NeuButton
            variant="default"
            onClick={onClose}
            disabled={isPrinting}
          >
            {lang === 'ar' ? 'إغلاق' : 'Fermer'}
          </NeuButton>
        </div>
      </div>

      {/* Hidden iframe for native printing */}
      <iframe
        ref={printFrameRef}
        style={{
          position: 'absolute',
          width: '0',
          height: '0',
          border: 'none',
          visibility: 'hidden',
        }}
        title="Print Frame"
      />
    </div>
  );
};
