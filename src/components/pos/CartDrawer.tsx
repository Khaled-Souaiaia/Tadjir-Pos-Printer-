import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Customer, PaymentMethod, Sale } from '../../types';
import {
  Trash2,
  Plus,
  Minus,
  Coins,
  CreditCard,
  User,
  Percent,
  CheckCircle,
  Receipt,
  UserPlus,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';

interface CartDrawerProps {
  onSaleComplete: (sale: Sale) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onSaleComplete }) => {
  const {
    cart,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotals,
    completeSale,
    t,
    lang,
    showToast,
    saveCustomer,
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountStr, setPaidAmountStr] = useState<string>('');
  const [generalDiscount, setGeneralDiscount] = useState<number>(0);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');

  const finalNetTotal = Math.max(0, cartTotals.total - generalDiscount);
  const paidAmount = paidAmountStr === '' ? finalNetTotal : parseFloat(paidAmountStr) || 0;
  const changeDue = Math.max(0, paidAmount - finalNetTotal);

  // الفئات النقدية السريعة المتداولة في الجزائر
  const quickCashOptions = [500, 1000, 2000, 3000, 5000];

  const handleCheckout = () => {
    if (cart.length === 0) {
      showToast(lang === 'ar' ? 'السلة فارغة' : 'Panier vide', 'error');
      return;
    }

    const res = completeSale(paidAmount, paymentMethod, generalDiscount);
    if (res.success && res.sale) {
      setPaidAmountStr('');
      setGeneralDiscount(0);
      onSaleComplete(res.sale);
    } else if (res.error) {
      showToast(res.error, 'error');
    }
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || '-',
      address: 'محلي',
      wilaya: 'الجزائر',
      creditBalance: 0,
      createdAt: new Date().toISOString(),
    };
    saveCustomer(newCust);
    setSelectedCustomer(newCust);
    setShowNewCustomerModal(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  return (
    <div className="neu-flat rounded-3xl p-4 md:p-5 flex flex-col h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] justify-between sticky top-4 z-20 overflow-hidden">
      {/* رأس السلة واختيار العميل والمجموع السريع الثابت */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-slate-800">{t.cartTitle}</h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearCart}</span>
            </button>
          )}
        </div>

        {/* مؤشر المجموع الصافي الثابت في أعلى السلة */}
        <div className="shrink-0 mt-2.5 p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-100 font-semibold leading-tight">
              {t.netTotal} ({cartTotals.itemsCount} {lang === 'ar' ? 'سلع' : 'articles'})
            </span>
            <span className="text-lg font-black tracking-tight tabular-nums">
              {finalNetTotal.toLocaleString()} <span className="text-xs font-normal text-blue-200">{t.currency}</span>
            </span>
          </div>
          {cart.length > 0 && (
            <div className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-lg">
              {paymentMethod === 'cash' ? t.cashPayment : paymentMethod === 'credit' ? t.creditPayment : t.cibPayment}
            </div>
          )}
        </div>

        {/* محدد العميل */}
        <div className="shrink-0 mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              className="neu-input w-full rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white/70 appearance-none cursor-pointer"
            >
              <option value="">{t.selectCustomer}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.creditBalance > 0 ? `(دين: ${c.creditBalance} د.ج)` : ''}
                </option>
              ))}
            </select>
          </div>
          <NeuButton
            size="sm"
            onClick={() => setShowNewCustomerModal(true)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
            title={t.addNewCustomer}
          >
            <span className="sr-only sm:not-sr-only sm:text-xs">+</span>
          </NeuButton>
        </div>

        {/* تنبيه إذا كان العميل عليه كريدي سابق */}
        {selectedCustomer && selectedCustomer.creditBalance > 0 && (
          <div className="shrink-0 mt-1.5 p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium flex justify-between">
            <span>ديون سابقة:</span>
            <span className="font-bold tabular-nums">
              {selectedCustomer.creditBalance.toLocaleString()} {t.currency}
            </span>
          </div>
        )}

        {/* قائمة مواد السلة - قابلة للتمرير الداخلي فقط */}
        <div className="mt-2 space-y-1.5 flex-1 min-h-0 overflow-y-auto pe-1">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full neu-inset flex items-center justify-center text-slate-300">
                <Receipt className="w-5 h-5" />
              </div>
              <p>{t.cartEmpty}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="neu-raised rounded-xl p-2 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pe-2">
                  <h4 className="font-bold text-slate-800 truncate text-[11px]">
                    {lang === 'ar' ? item.product.nameAr : item.product.nameFr}
                  </h4>
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    {item.product.sellPrice.toLocaleString()} {t.currency}
                  </div>
                </div>

                {/* أزرار زيادة ونقصان الكمية */}
                <div className="flex items-center gap-1 neu-inset px-1.5 py-0.5 rounded-lg">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="w-4 h-4 rounded neu-raised flex items-center justify-center text-slate-700 hover:text-rose-600 transition-colors"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="w-5 text-center font-bold text-slate-800 tabular-nums text-xs">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    className="w-4 h-4 rounded neu-raised flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* المجموع وحذف العنصر */}
                <div className="flex items-center gap-1.5 ps-2">
                  <span className="font-extrabold text-blue-700 tabular-nums text-xs min-w-[45px] text-end">
                    {item.subtotal.toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* قسم الدفع والمجاميع - ثابت دائماً في الأسفل وبدون أي تمرير */}
      <div className="shrink-0 mt-2.5 pt-2.5 border-t border-slate-200/90 space-y-2">
        {/* اختيار وسيلة الدفع */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`py-1.5 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
              paymentMethod === 'cash' ? 'neu-pressed text-blue-600' : 'neu-raised text-slate-600'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{t.cashPayment}</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('credit')}
            className={`py-1.5 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
              paymentMethod === 'credit' ? 'neu-pressed text-amber-600' : 'neu-raised text-slate-600'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.creditPayment}</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('cib_card')}
            className={`py-1.5 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
              paymentMethod === 'cib_card' ? 'neu-pressed text-purple-600' : 'neu-raised text-slate-600'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{t.cibPayment}</span>
          </button>
        </div>

        {/* فئات نقدية سريعة */}
        {paymentMethod === 'cash' && (
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[10px] text-slate-400 shrink-0 font-medium">سريع:</span>
            <button
              onClick={() => setPaidAmountStr(finalNetTotal.toString())}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg neu-raised text-blue-600 hover:bg-blue-50 shrink-0"
            >
              بالضبط
            </button>
            {quickCashOptions.map((amount) => (
              <button
                key={amount}
                onClick={() => setPaidAmountStr(amount.toString())}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg neu-raised text-slate-700 hover:text-blue-600 shrink-0"
              >
                {amount}
              </button>
            ))}
          </div>
        )}

        {/* إدخال المبلغ المدفوع والصرف المتبقي */}
        {paymentMethod === 'cash' && (
          <div className="grid grid-cols-2 gap-2">
            <NeuInput
              label={t.amountPaid}
              type="number"
              value={paidAmountStr}
              placeholder={finalNetTotal.toString()}
              onChange={(e) => setPaidAmountStr(e.target.value)}
              className="text-start font-bold tabular-nums text-xs py-1"
            />
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1 px-1">
                {t.changeDue}
              </span>
              <div className="neu-inset rounded-xl py-1.5 px-2.5 text-emerald-700 font-extrabold text-xs tabular-nums flex items-center justify-between">
                <span>{changeDue.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600 font-medium">{t.currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* ملخص الإجمالي */}
        <div className="space-y-0.5 text-xs">
          {cartTotals.discount > 0 && (
            <div className="flex justify-between text-rose-500 font-semibold text-[11px]">
              <span>{t.discount}:</span>
              <span className="tabular-nums">
                -{cartTotals.discount.toLocaleString()} {t.currency}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-slate-900 pt-0.5 border-t border-slate-200">
            <span>{t.netTotal}:</span>
            <span className="text-blue-600 tabular-nums">
              {finalNetTotal.toLocaleString()} {t.currency}
            </span>
          </div>
        </div>

        {/* زر إتمام البيع */}
        <NeuButton
          variant="primary"
          size="md"
          fullWidth
          disabled={cart.length === 0}
          onClick={handleCheckout}
          icon={<CheckCircle className="w-4 h-4" />}
          className="py-2.5 font-extrabold text-sm"
        >
          {t.completeSale}
        </NeuButton>
      </div>

      {/* نافذة إضافة عميل سريع */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-sm bg-white shadow-2xl">
            <h3 className="font-bold text-base text-slate-800 mb-4">{t.addNewCustomer}</h3>
            <form onSubmit={handleCreateQuickCustomer} className="space-y-3">
              <NeuInput
                label={t.customerName}
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="مثال: يوسف ميهوبي"
              />
              <NeuInput
                label={t.phone}
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="0550 00 00 00"
              />
              <div className="flex items-center gap-2 pt-2">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton
                  type="button"
                  variant="default"
                  onClick={() => setShowNewCustomerModal(false)}
                >
                  {t.cancel}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
