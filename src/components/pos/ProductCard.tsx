import React from 'react';
import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { Plus, AlertTriangle, Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onSelect }) => {
  const { lang, t } = useApp();

  const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
  const isOutOfStock = product.stock <= 0;

  return (
    <div
      onClick={() => !isOutOfStock && onSelect(product)}
      className={`group neu-raised rounded-2xl p-3 flex flex-col justify-between transition-all select-none ${
        isOutOfStock
          ? 'opacity-50 grayscale cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-1'
      }`}
    >
      <div>
        {/* صورة المنتج أو حاوية بديلة أنيقة */}
        <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-slate-100 neu-inset flex items-center justify-center">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.nameAr}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                // استبدال الصورة عند فشل التحميل
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Package className="w-8 h-8 text-slate-300" />
          )}

          {/* تنبيه حالة المخزون */}
          {isOutOfStock ? (
            <span className="absolute top-2 start-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500 text-white shadow">
              {t.outOfStock}
            </span>
          ) : isLowStock ? (
            <span className="absolute top-2 start-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow">
              <AlertTriangle className="w-3 h-3" />
              {product.stock} {product.unit}
            </span>
          ) : (
            <span className="absolute top-2 start-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-900/60 text-white backdrop-blur-sm">
              {product.stock} {product.unit}
            </span>
          )}
        </div>

        {/* تفاصيل الاسم والباركود */}
        <div className="px-1">
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            {product.barcode}
          </div>
          <h3 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {lang === 'ar' ? product.nameAr : product.nameFr}
          </h3>
          <p className="text-[11px] text-slate-500 line-clamp-1">
            {lang === 'ar' ? product.nameFr : product.nameAr}
          </p>
        </div>
      </div>

      {/* السعر وزر الإضافة */}
      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium">
            {t.sellPrice}
          </span>
          <span className="text-base font-extrabold text-blue-600 tabular-nums">
            {product.sellPrice.toLocaleString()} {t.currency}
          </span>
        </div>

        <button
          disabled={isOutOfStock}
          className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-700 group-hover:text-white group-hover:bg-blue-600 transition-all active:scale-90"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
