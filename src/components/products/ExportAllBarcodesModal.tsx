import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, ProductCategory } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import {
  X,
  FileDown,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sliders,
  Printer,
  Copy,
  Info,
  Package,
  Barcode as BarcodeIcon,
  Sparkles,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { validateBarcode, BarcodeValidationResult } from '../../utils/barcodeUtils';
import {
  generateBatchBarcodeLabelsPdf,
  createHighResLabelDataUrl,
  BatchProductLabelInput,
  GeneratedBatchPdfResult,
} from '../../utils/barcodePdfExport';

interface ExportAllBarcodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: ProductCategory[];
  selectedProductIds?: string[];
  initialCategoryFilter?: string;
}

export const ExportAllBarcodesModal: React.FC<ExportAllBarcodesModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  selectedProductIds = [],
  initialCategoryFilter = 'all',
}) => {
  const { lang, t, showToast } = useApp();

  // 1. النطاق والفلاتر (Scope & Filter)
  const [productScope, setProductScope] = useState<'all' | 'selected' | 'filtered'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [barcodeFilterMode, setBarcodeFilterMode] = useState<'valid_only' | 'all'>('valid_only');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // 2. إعدادات الملصقات والكميات (Copies & Dimensions)
  const [copiesMode, setCopiesMode] = useState<'fixed' | 'stock'>('fixed');
  const [fixedCopiesCount, setFixedCopiesCount] = useState<number>(1);
  const [paperFormat, setPaperFormat] = useState<'roll' | 'a4_grid'>('roll');
  const [dimensionPreset, setDimensionPreset] = useState<'50x30' | '40x25' | '60x40' | 'custom'>('50x30');
  const [customWidthMm, setCustomWidthMm] = useState<number>(50);
  const [customHeightMm, setCustomHeightMm] = useState<number>(30);

  // 3. خيارات إظهار العناصر (Display Elements)
  const [includeName, setIncludeName] = useState<boolean>(true);
  const [includeBarcodeDigits, setIncludeBarcodeDigits] = useState<boolean>(true);
  const [includePrice, setIncludePrice] = useState<boolean>(true);

  // 4. حالة التبويب (Tabs: Configuration / Preview / Excluded Products)
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'excluded'>('config');

  // 5. حالة التوليد والتحميل (Generation & Progress State)
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [generatedPdf, setGeneratedPdf] = useState<GeneratedBatchPdfResult | null>(null);

  // 6. معاينة الملصق الممثل (Representative Label Preview)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // الأبعاد الفعلية بالمليمتر
  const effectiveWidthMm = useMemo(() => {
    if (dimensionPreset === '50x30') return 50;
    if (dimensionPreset === '40x25') return 40;
    if (dimensionPreset === '60x40') return 60;
    return Math.max(20, Math.min(150, customWidthMm || 50));
  }, [dimensionPreset, customWidthMm]);

  const effectiveHeightMm = useMemo(() => {
    if (dimensionPreset === '50x30') return 30;
    if (dimensionPreset === '40x25') return 25;
    if (dimensionPreset === '60x40') return 40;
    return Math.max(15, Math.min(100, customHeightMm || 30));
  }, [dimensionPreset, customHeightMm]);

  // تصفية المنتجات المرشحة استناداً إلى النطاق والتصنيف والبحث
  const candidateProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. فلتر النطاق
      if (productScope === 'selected') {
        if (!selectedProductIds || selectedProductIds.length === 0) return false;
        if (!selectedProductIds.includes(p.id)) return false;
      }

      // 2. فلتر التصنيف
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      // 3. فلتر البحث النصي إن وجد
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchName =
          (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
          (p.nameFr && p.nameFr.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q));
        if (!matchName) return false;
      }

      return true;
    });
  }, [products, productScope, selectedProductIds, categoryFilter, searchFilter]);

  // تقسيم المنتجات بدقة: صالحة ومستبعدة (Valid vs Excluded) مع نتائج التحقق الرياضية
  const { validProducts, excludedProducts } = useMemo(() => {
    const valid: Array<{
      product: Product;
      validation: BarcodeValidationResult;
      calculatedCopies: number;
    }> = [];

    const excluded: Array<{
      product: Product;
      validation: BarcodeValidationResult;
      reasonAr: string;
      reasonFr: string;
    }> = [];

    candidateProducts.forEach((prod) => {
      const validation = validateBarcode(prod.barcode);

      if (validation.isValid) {
        const copies =
          copiesMode === 'stock'
            ? Math.max(1, Math.floor(prod.stock || 1))
            : Math.max(1, Math.floor(fixedCopiesCount || 1));

        valid.push({
          product: prod,
          validation,
          calculatedCopies: copies,
        });
      } else {
        excluded.push({
          product: prod,
          validation,
          reasonAr: validation.errorMessageAr,
          reasonFr: validation.errorMessageFr,
        });
      }
    });

    return { validProducts: valid, excludedProducts: excluded };
  }, [candidateProducts, copiesMode, fixedCopiesCount]);

  // الحسابات الإجمالية للطباعة
  const totalLabelsToPrint = useMemo(() => {
    return validProducts.reduce((acc, curr) => acc + curr.calculatedCopies, 0);
  }, [validProducts]);

  // حساب عدد الملصقات لكل صفحة A4 وعدد الصفحات
  const a4Metrics = useMemo(() => {
    const marginLeft = 5;
    const marginTop = 7;
    const cols = Math.max(1, Math.floor((210 - 2 * marginLeft) / effectiveWidthMm));
    const rows = Math.max(1, Math.floor((297 - 2 * marginTop) / effectiveHeightMm));
    const perPage = cols * rows;
    return { cols, rows, perPage };
  }, [effectiveWidthMm, effectiveHeightMm]);

  const totalPages = useMemo(() => {
    if (paperFormat === 'roll') {
      return totalLabelsToPrint;
    }
    return Math.max(1, Math.ceil(totalLabelsToPrint / a4Metrics.perPage));
  }, [paperFormat, totalLabelsToPrint, a4Metrics.perPage]);

  // رسم معاينة حية للملصق الأول التمثيلي على Canvas
  useEffect(() => {
    if (!isOpen) return;
    const firstValid = validProducts[0]?.product;
    if (!firstValid) return;

    const dataUrl = createHighResLabelDataUrl(
      {
        nameAr: firstValid.nameAr,
        nameFr: firstValid.nameFr,
        sellPrice: firstValid.sellPrice,
        barcode: firstValid.barcode,
      },
      t.currency,
      null,
      {
        includeName,
        includePrice,
        includeBarcodeDigits,
        widthMm: effectiveWidthMm,
        heightMm: effectiveHeightMm,
      }
    );

    if (dataUrl && previewCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = dataUrl;
    }
  }, [
    isOpen,
    validProducts,
    includeName,
    includePrice,
    includeBarcodeDigits,
    effectiveWidthMm,
    effectiveHeightMm,
    t.currency,
  ]);

  if (!isOpen) return null;

  // تنفيذ عملية التصدير الدفعي الفعلي لجميع المنتجات
  const handleExecuteExport = async () => {
    if (validProducts.length === 0) {
      showToast(
        lang === 'ar'
          ? 'لا توجد منتجات بباركود صالح للتصدير تحت الفلاتر المحددة'
          : 'Aucun produit avec code-barres valide à exporter',
        'error'
      );
      return;
    }

    setIsGenerating(true);
    setProgressPercent(0);
    setGeneratedPdf(null);

    // استخدام setTimeout للسماح لواجهة المستخدم بإظهار شريط التقدم دون تجميد
    setTimeout(() => {
      try {
        const batchInputs: BatchProductLabelInput[] = validProducts.map((v) => ({
          id: v.product.id,
          barcode: v.product.barcode,
          nameAr: v.product.nameAr,
          nameFr: v.product.nameFr,
          sellPrice: v.product.sellPrice,
          categoryName:
            categories.find((c) => c.id === v.product.category)?.nameAr || v.product.category,
          copies: v.calculatedCopies,
        }));

        const result = generateBatchBarcodeLabelsPdf(batchInputs, {
          copiesPerProduct: fixedCopiesCount,
          currency: t.currency,
          paperFormat: paperFormat,
          labelWidthMm: effectiveWidthMm,
          labelHeightMm: effectiveHeightMm,
          includeName,
          includePrice,
          includeBarcodeDigits,
          filenamePrefix:
            categoryFilter !== 'all'
              ? `TADJIR_Barcodes_${categories.find((c) => c.id === categoryFilter)?.nameAr || 'Category'}`
              : 'TADJIR_All_Barcodes',
          onProgress: (pct) => {
            setProgressPercent(pct);
          },
        });

        setGeneratedPdf(result);
        setIsGenerating(false);

        // تشغيل التحميل التلقائي عبر متصفح النظام
        result.save();

        showToast(
          lang === 'ar'
            ? `تم تصدير ملف PDF بنجاح (${totalLabelsToPrint} ملصق - ${result.pageCount} صفحة)`
            : `Fichier PDF généré avec succès (${totalLabelsToPrint} étiquettes - ${result.pageCount} pages)`,
          'success'
        );
      } catch (err: any) {
        console.error('Batch export failed:', err);
        setIsGenerating(false);
        showToast(
          lang === 'ar' ? 'فشل في إنشاء وتصدير ملف الـ PDF' : 'Échec de la génération du PDF',
          'error'
        );
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="neu-flat rounded-3xl p-5 sm:p-7 w-full max-w-4xl bg-white shadow-2xl border border-white/90 my-auto animate-in zoom-in-95 duration-150">
        {/* الترويسة العلوية */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  {lang === 'ar' ? 'تصدير جميع الباركودات PDF' : 'Exporter tous les codes-barres en PDF'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Batch Print Suite
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'توليد ملف PDF موحد وطباعي جاهز لجميع ملصقات منتجات المحل بدقة عالية 300-DPI'
                  : 'Générez un fichier PDF prêt pour impression thermique ou feuille A4 standard'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* التبويبات التفاعلية العلوية */}
        <div className="flex items-center gap-2 mt-4 pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إعدادات التصدير والتصفية' : 'Configuration'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{lang === 'ar' ? 'معاينة الملصق (300-DPI)' : 'Aperçu du label'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excluded')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'excluded'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : excludedProducts.length > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${excludedProducts.length > 0 ? 'text-rose-500' : ''}`} />
            <span>
              {lang === 'ar'
                ? `المنتجات المستبعدة (${excludedProducts.length})`
                : `Produits exclus (${excludedProducts.length})`}
            </span>
          </button>
        </div>

        {/* بطاقة الملخص الإحصائي المباشر (Real-time Live Summary) */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
              {lang === 'ar' ? 'المنتجات المطابقة' : 'Produits trouvés'}
            </span>
            <span className="text-lg font-black text-slate-800 tabular-nums">
              {candidateProducts.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">
              {lang === 'ar' ? 'باركود صالح ومؤكد' : 'Codes valides'}
            </span>
            <span className="text-lg font-black text-emerald-700 tabular-nums">
              {validProducts.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 text-center">
            <span className="text-[10px] font-bold text-rose-600 block mb-0.5">
              {lang === 'ar' ? 'مستبعد (غير صالح)' : 'Exclus'}
            </span>
            <span className="text-lg font-black text-rose-700 tabular-nums">
              {excludedProducts.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-600 block mb-0.5">
              {lang === 'ar' ? 'إجمالي الملصقات' : 'Total étiquettes'}
            </span>
            <span className="text-lg font-black text-blue-700 tabular-nums">
              {totalLabelsToPrint}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-indigo-600 block mb-0.5">
              {lang === 'ar' ? 'صفحات الـ PDF' : 'Pages PDF'}
            </span>
            <span className="text-lg font-black text-indigo-700 tabular-nums">
              {totalPages}
            </span>
          </div>
        </div>

        {/* تنبيه بالمنتجات المستبعدة إن وجدت */}
        {excludedProducts.length > 0 && activeTab !== 'excluded' && (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {lang === 'ar'
                    ? `تنبيه تدقيق: تم استبعاد ${excludedProducts.length} منتج لأنها لا تملك باركود صالح أو رقم تحقق خاطئ.`
                    : `Attention: ${excludedProducts.length} produit(s) ont été exclus en raison de code-barres absent ou invalide.`}
                </span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {lang === 'ar'
                    ? 'سيتم تصدير المنتجات الصالحة المعتمدة فقط دون تعديل أو إتلاف أي سجل في قاعدة البيانات.'
                    : 'Seuls les produits valides seront exportés sans altérer vos données.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('excluded')}
              className="px-2.5 py-1 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
            >
              {lang === 'ar' ? 'مراجعة المستبعدين' : 'Voir les exclus'}
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* التبويب 1: إعدادات التصدير والتصفية                             */}
        {/* ============================================================== */}
        {activeTab === 'config' && (
          <div className="mt-4 space-y-4 max-h-[52vh] overflow-y-auto pe-1">
            {/* 1. نطاق المنتجات والتصنيفات */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>{lang === 'ar' ? 'تحديد نطاق المنتجات والتصنيفات :' : 'Portée et catégories :'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* النطاق */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'ar' ? 'المنتجات المستهدفة' : 'Produits cibles'}
                  </label>
                  <select
                    value={productScope}
                    onChange={(e) => setProductScope(e.target.value as any)}
                    className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">
                      {lang === 'ar' ? 'جميع منتجات المخزون' : 'Tous les produits en stock'} ({products.length})
                    </option>
                    {selectedProductIds && selectedProductIds.length > 0 && (
                      <option value="selected">
                        {lang === 'ar' ? 'المنتجات المحددة يدويًا فقط' : 'Produits sélectionnés uniquement'} ({selectedProductIds.length})
                      </option>
                    )}
                  </select>
                </div>

                {/* التصنيف */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'ar' ? 'التصنيف' : 'Catégorie'}
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">{t.allCategories}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.nameAr : c.nameFr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* بحث نصي سريع */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'ar' ? 'بحث باسم منتج أو باركود' : 'Filtrer par nom ou code'}
                  </label>
                  <NeuInput
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={lang === 'ar' ? 'تصفية سريعة...' : 'Filtrer...'}
                    className="text-xs py-1.5"
                    icon={<Search className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>
            </div>

            {/* 2. هيئة الورق والأبعاد الفيزيائية للملصق */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'ar' ? 'هيئة الورق وأبعاد الملصق الفيزيائية :' : 'Support et dimensions :'}</span>
                </div>
                <span className="text-[11px] text-blue-600 font-bold">
                  {effectiveWidthMm} × {effectiveHeightMm} mm
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* نمط الورق: رول حراري أو شبكة A4 */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'ar' ? 'نوع ورق الطباعة' : 'Type de papier'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperFormat('roll')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        paperFormat === 'roll'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>{lang === 'ar' ? 'رول حراري' : 'Rouleau thermique'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {lang === 'ar' ? 'صفحة لكل ملصق' : '1 label / page'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaperFormat('a4_grid')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        paperFormat === 'a4_grid'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>{lang === 'ar' ? 'شبكة ورق A4' : 'Planche A4'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {a4Metrics.perPage} {lang === 'ar' ? 'ملصق / صفحة' : 'labels / page'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* أبعاد الملصق */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'ar' ? 'قياس الملصق' : 'Dimensions du sticker'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDimensionPreset('50x30')}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        dimensionPreset === '50x30'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-extrabold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      50 × 30 mm
                      <span className="block text-[9px] text-slate-400 font-normal">
                        {lang === 'ar' ? '(المعياري)' : '(Standard)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDimensionPreset('40x25')}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        dimensionPreset === '40x25'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-extrabold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      40 × 25 mm
                      <span className="block text-[9px] text-slate-400 font-normal">
                        {lang === 'ar' ? '(صغير)' : '(Petit)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDimensionPreset('60x40')}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        dimensionPreset === '60x40'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-extrabold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      60 × 40 mm
                      <span className="block text-[9px] text-slate-400 font-normal">
                        {lang === 'ar' ? '(كبير)' : '(Grand)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* تنبيه إرشادات الطباعة على A4 في حال اختياره */}
              {paperFormat === 'a4_grid' && (
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {lang === 'ar'
                        ? 'توجيهات الطباعة على ورق A4 :'
                        : 'Instructions d’impression A4 :'}
                    </span>
                    <span className="block text-slate-600 mt-0.5">
                      {lang === 'ar'
                        ? 'في نافذة الطباعة أو قارئ الـ PDF، تأكد من اختيار الحجم الفعلي (Actual Size / 100%) وألغِ تفعيل "الملاءمة مع الصفحة" لضمان تطابق الأبعاد الدقيقة للملصقات (50×30 مم).'
                        : 'Dans la boîte d\'impression, réglez l\'échelle sur 100% (Taille réelle) et désactivez "Ajuster à la page" pour respecter la géométrie exacte.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. عدد النسخ لكل منتج وخيارات إظهار العناصر */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* عدد النسخ */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'ar' ? 'عدد نسخ الملصقات :' : 'Copies par produit :'}</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="copies_mode"
                      checked={copiesMode === 'fixed'}
                      onChange={() => setCopiesMode('fixed')}
                      className="accent-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {lang === 'ar' ? 'عدد ثابت لكل منتج :' : 'Nombre fixe par produit :'}
                    </span>
                  </label>

                  {copiesMode === 'fixed' && (
                    <div className="ps-5">
                      <NeuInput
                        type="number"
                        min="1"
                        max="100"
                        value={fixedCopiesCount}
                        onChange={(e) =>
                          setFixedCopiesCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                        }
                        className="w-32 text-center font-bold text-sm"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="radio"
                      name="copies_mode"
                      checked={copiesMode === 'stock'}
                      onChange={() => setCopiesMode('stock')}
                      className="accent-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {lang === 'ar'
                        ? 'توليد ملصقات حسب الكمية المتوفرة في المخزون (Stock)'
                        : 'Selon la quantité en stock de chaque produit'}
                    </span>
                  </label>
                </div>
              </div>

              {/* عناصر محتوى الملصق */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'ar' ? 'العناصر الظاهرة على الملصق :' : 'Éléments à afficher :'}</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeName}
                      onChange={(e) => setIncludeName(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {lang === 'ar' ? 'إظهار اسم المنتج بالعربية والفرنسية' : 'Nom du produit (Arabe & Français)'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBarcodeDigits}
                      onChange={(e) => setIncludeBarcodeDigits(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {lang === 'ar' ? 'إظهار أرقام الباركود المقروءة أسفل الخطوط' : 'Chiffres du code-barres'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePrice}
                      onChange={(e) => setIncludePrice(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {lang === 'ar' ? `إظهار سعر البيع بالدينار (${t.currency})` : 'Prix de vente (DZD)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* التبويب 2: معاينة حية للملصق بدقة 300-DPI                         */}
        {/* ============================================================== */}
        {activeTab === 'preview' && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center max-h-[52vh] overflow-y-auto">
            <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>
                {lang === 'ar'
                  ? `معاينة نموذجية بالحجم الفعلي (${effectiveWidthMm} × ${effectiveHeightMm} مم) للمنتج الأول:`
                  : `Aperçu modèle (${effectiveWidthMm} × ${effectiveHeightMm} mm) :`}
              </span>
            </div>

            {validProducts[0] ? (
              <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-slate-200 mt-2">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full h-auto mx-auto shadow-inner rounded-md border border-slate-100"
                  style={{ maxHeight: '240px' }}
                />
                <div className="mt-2 text-xs font-bold text-slate-700">
                  {validProducts[0].product.nameAr}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {validProducts[0].product.barcode} • {effectiveWidthMm}×{effectiveHeightMm}mm
                </div>
              </div>
            ) : (
              <p className="py-12 text-slate-400 text-xs font-bold">
                {lang === 'ar' ? 'لا توجد منتجات صالحة للمعاينة' : 'Aucun produit valide à prévisualiser'}
              </p>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* التبويب 3: قائمة المنتجات المستبعدة وأسباب الاستبعاد              */}
        {/* ============================================================== */}
        {activeTab === 'excluded' && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-[52vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-black text-slate-800">
                  {lang === 'ar' ? 'سجل المنتجات المستبعدة وأسبابها :' : 'Produits exclus du PDF :'}
                </span>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {excludedProducts.length} {lang === 'ar' ? 'منتج مستبعد' : 'exclus'}
              </span>
            </div>

            {excludedProducts.length === 0 ? (
              <div className="py-10 text-center text-emerald-600 text-xs font-bold flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span>
                  {lang === 'ar'
                    ? 'ممتاز! جميع المنتجات المختارة تملك باركودات صالحة ومعتمدة 100%'
                    : 'Parfait! Tous les produits sélectionnés ont des codes-barres valides.'}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {excludedProducts.map(({ product, reasonAr, reasonFr, validation }) => (
                  <div
                    key={product.id}
                    className="p-2.5 rounded-xl bg-white border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{product.nameAr}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {product.barcode ? `الباركود: "${product.barcode}"` : '(لا يوجد باركود / فارغ)'}
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {lang === 'ar' ? reasonAr : reasonFr}
                      </span>
                      {validation.suggestedCorrection && (
                        <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                          {lang === 'ar' ? 'التصحيح المقترح: ' : 'Correction: '}
                          {validation.suggestedCorrection}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* مؤشر شريط التقدم أثناء التوليد الدفعي */}
        {isGenerating && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1.5">
              <span>{lang === 'ar' ? 'جاري بناء وتجميع ملف الـ PDF...' : 'Génération du fichier PDF...'}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* أزرار الإجراءات السفلية */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-medium">
            {lang === 'ar' ? (
              <span>
                سيتم تصدير <b>{totalLabelsToPrint}</b> ملصق في <b>{totalPages}</b> صفحة بتنسيق{' '}
                <b>{paperFormat === 'roll' ? 'رول حراري' : 'A4'}</b>.
              </span>
            ) : (
              <span>
                Exportation de <b>{totalLabelsToPrint}</b> étiquette(s) sur <b>{totalPages}</b> page(s).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {generatedPdf && (
              <NeuButton
                type="button"
                variant="default"
                size="sm"
                onClick={() => generatedPdf.save()}
                icon={<FileDown className="w-4 h-4 text-emerald-600" />}
                className="border-emerald-300 bg-emerald-50 text-emerald-800 font-bold"
              >
                {lang === 'ar' ? 'تحميل مجدداً' : 'Retélécharger'}
              </NeuButton>
            )}

            <NeuButton
              type="button"
              variant="primary"
              size="lg"
              disabled={validProducts.length === 0 || isGenerating}
              onClick={handleExecuteExport}
              icon={
                isGenerating ? undefined : <FileDown className="w-4 h-4 text-white" />
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold w-full sm:w-auto"
            >
              {isGenerating
                ? lang === 'ar'
                  ? 'جاري التوليد...'
                  : 'Génération...'
                : lang === 'ar'
                ? `تصدير الـ PDF (${totalLabelsToPrint} ملصق)`
                : `Exporter le PDF (${totalLabelsToPrint})`}
            </NeuButton>

            <NeuButton
              type="button"
              variant="default"
              size="lg"
              disabled={isGenerating}
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              {t.cancel}
            </NeuButton>
          </div>
        </div>
      </div>
    </div>
  );
};
