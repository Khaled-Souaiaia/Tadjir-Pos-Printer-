import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product, Sale } from '../types';
import { ProductCard } from '../components/pos/ProductCard';
import { CartDrawer } from '../components/pos/CartDrawer';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { Search, Barcode, Grid, RefreshCw, Keyboard, X } from 'lucide-react';
import { NeuInput } from '../components/common/NeuInput';
import { motion, AnimatePresence } from 'motion/react';

export const PosPage: React.FC = () => {
  const { products, categories, scanAndAddToCart, addToCart, clearCart, cart, t, lang, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleSelectProduct = React.useCallback(
    (p: Product) => {
      addToCart(p, 1);
    },
    [addToCart]
  );

  // مستمع اختصارات لوحة المفاتيح المادية للكاشير (F2, F4, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          clearCart();
        }
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        barcodeInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, clearCart]);

  // تصفية المنتجات حسب البحث والتصنيف
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.nameAr.toLowerCase().includes(q) ||
        product.nameFr.toLowerCase().includes(q) ||
        product.barcode.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // معالجة فورية ومباشرة للباركود عبر حقل الإدخال
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const success = scanAndAddToCart(query);
    if (success) {
      setSearchQuery('');
    } else {
      showToast(
        lang === 'ar' ? 'لم يتم العثور على منتج بهذا الباركود' : 'Aucun produit trouvé',
        'error'
      );
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-full">
      {/* القسم الأيسر: شريط البحث، التصنيفات، وشبكة المنتجات */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        {/* شريط البحث المزدوج وقارئ الباركود */}
        <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center gap-3">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 w-full relative">
            <NeuInput
              ref={barcodeInputRef}
              type="text"
              placeholder=""
              aria-label={t.posSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="text-base"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  barcodeInputRef.current?.focus();
                }}
                className="absolute inset-y-0 end-3 my-auto w-6 h-6 rounded-lg neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                title={lang === 'ar' ? 'تفريغ شريط البحث' : 'Effacer la recherche'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* زر التركيز على الباركود */}
          <button
            onClick={() => barcodeInputRef.current?.focus()}
            className="neu-raised px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:text-blue-600 transition-colors shrink-0"
          >
            <Barcode className="w-4 h-4 text-blue-600" />
            <span>{t.scanBarcode}</span>
          </button>
        </div>

        {/* شريط التصنيفات بنمط Neumorphism هادئ */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 pe-2 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
              selectedCategory === 'all'
                ? 'neu-pressed text-blue-600 bg-white/80'
                : 'neu-raised text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                selectedCategory === cat.id
                  ? 'neu-pressed text-blue-600 bg-white/80'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? cat.nameAr : cat.nameFr}
            </button>
          ))}
        </div>

        {/* شبكة المنتجات المعروضة */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="neu-flat rounded-3xl p-12 text-center text-slate-400">
              <Grid className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-sm">
                {lang === 'ar' ? 'لا توجد منتجات مطابقة للبحث' : 'Aucun produit correspondant'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* شريط اختصارات لوحة المفاتيح للكاشير المكتبي */}
        <div className="neu-inset px-4 py-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 text-blue-700 font-bold">
            <Keyboard className="w-3.5 h-3.5" />
            <span>اختصارات الكاشير السريعة:</span>
          </div>
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] shadow-sm font-bold">F2</kbd> مسح باركود</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] shadow-sm font-bold">F9</kbd> تفريغ السلة</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white font-mono text-[10px] shadow-sm font-bold">Esc</kbd> مسح البحث</span>
          </div>
        </div>
      </div>

      {/* القسم الأيمن: سلة المشتريات التفاعلية (Panier de vente) - ثابتة وفي الأعلى */}
      <div className="order-first xl:order-last xl:col-span-4 sticky top-4 z-20 self-start">
        <CartDrawer onSaleComplete={(sale) => setActiveReceiptSale(sale)} />
      </div>

      {/* نافذة معاينة وطباعة الفاتورة المنتهية */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}
    </div>
  );
};
