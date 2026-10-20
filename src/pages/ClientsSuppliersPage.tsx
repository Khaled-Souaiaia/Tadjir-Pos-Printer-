import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Customer, Supplier } from '../types';
import {
  Users,
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Coins,
  Edit2,
  Trash2,
  Download,
  CreditCard,
  X,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';
import { formatDateTimeDisplay } from '../utils/date-utils';
import * as XLSX from 'xlsx';

export const ClientsSuppliersPage: React.FC = () => {
  const {
    customers,
    suppliers,
    saveCustomer,
    deleteCustomer,
    saveSupplier,
    deleteSupplier,
    t,
    lang,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  // نافذة إضافة/تعديل العميل
  const [customerModal, setCustomerModal] = useState<Customer | null>(null);
  // نافذة إضافة/تعديل المورد
  const [supplierModal, setSupplierModal] = useState<Supplier | null>(null);
  // نافذة تسديد الديون
  const [paymentModal, setPaymentModal] = useState<{
    type: 'customer' | 'supplier';
    item: Customer | Supplier;
    amount: number;
  } | null>(null);

  // تصفية الزبائن
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.wilaya.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  // تصفية الموردين
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [suppliers, searchQuery]);

  // تصدير الزبائن إلى Excel
  const handleExportCustomers = () => {
    const data = customers.map((c) => ({
      الاسم: c.name,
      الهاتف: c.phone,
      العنوان: c.address,
      الولاية: c.wilaya,
      'ديون الكريدي (د.ج)': c.creditBalance,
      'تاريخ ووقت إنشاء الدين':
        c.creditBalance > 0
          ? c.debtCreatedAt
            ? formatDateTimeDisplay(c.debtCreatedAt, lang)
            : lang === 'ar'
            ? 'غير متوفر'
            : 'Non disponible'
          : '-',
      ملاحظات: c.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, `Clients_DzPOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(lang === 'ar' ? 'تم تصدير قائمة العملاء بنجاح' : 'Exportation des clients réussie', 'success');
  };

  // حفظ العميل مع توثيق الطابع الزمني لإنشاء الدين بدقة دائمة
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerModal || !customerModal.name.trim()) return;

    const existing = customers.find((c) => c.id === customerModal.id);
    const nowIso = new Date().toISOString();
    let finalCustomer: Customer = { ...customerModal };

    if (!existing) {
      // عميل جديد
      if (finalCustomer.creditBalance > 0) {
        finalCustomer.debtCreatedAt = nowIso;
        finalCustomer.debts = [
          {
            id: `debt_${Date.now()}`,
            amount: finalCustomer.creditBalance,
            remainingAmount: finalCustomer.creditBalance,
            createdAt: nowIso,
            source: 'manual',
            notes: 'رصيد كريدي مبدئي',
          },
        ];
      }
    } else {
      // تعديل عميل موجود
      const prevBal = existing.creditBalance || 0;
      const newBal = finalCustomer.creditBalance || 0;

      if (prevBal === 0 && newBal > 0) {
        // إنشاء دين جديد لأول مرة
        finalCustomer.debtCreatedAt = nowIso;
        finalCustomer.debts = [
          ...(existing.debts || []),
          {
            id: `debt_${Date.now()}`,
            amount: newBal,
            remainingAmount: newBal,
            createdAt: nowIso,
            source: 'manual',
            notes: 'إنشاء دين جديد',
          },
        ];
      } else if (newBal > prevBal) {
        // زيادة في الدين: إضافة سجل دين جديد مع ختمه الزمني الخاص دون المساس بالسابق
        finalCustomer.debtCreatedAt = existing.debtCreatedAt || nowIso;
        finalCustomer.debts = [
          ...(existing.debts || []),
          {
            id: `debt_${Date.now()}`,
            amount: newBal - prevBal,
            remainingAmount: newBal - prevBal,
            createdAt: nowIso,
            source: 'manual',
            notes: 'إضافة دين جديد',
          },
        ];
      } else {
        // الحفاظ الصارم على تواريخ الإنشاء السابقة دون أي تعديل (الشرط 7 و 8)
        finalCustomer.debtCreatedAt = existing.debtCreatedAt;
        finalCustomer.debts = existing.debts;
      }
    }

    saveCustomer(finalCustomer);
    setCustomerModal(null);
  };

  // حفظ المورد
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierModal || !supplierModal.name.trim()) return;
    saveSupplier(supplierModal);
    setSupplierModal(null);
  };

  // تنفيذ تسديد الدفعة المالية مع الحفاظ الكامل على تواريخ الإنشاء الأصلية
  const handleApplyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal || paymentModal.amount <= 0) return;

    if (paymentModal.type === 'customer') {
      const cust = paymentModal.item as Customer;
      const paymentAmount = paymentModal.amount;
      const newBal = Math.max(0, cust.creditBalance - paymentAmount);

      // خصم المبالغ من الديون ابتداءً من الأقدم دون تغيير تواريخ إنشائها إطلاقاً
      let remainingToDeduct = paymentAmount;
      const updatedDebts = (cust.debts || []).map((debt) => {
        if (remainingToDeduct <= 0 || debt.remainingAmount <= 0) return debt;
        const deduct = Math.min(debt.remainingAmount, remainingToDeduct);
        remainingToDeduct -= deduct;
        return {
          ...debt,
          remainingAmount: debt.remainingAmount - deduct,
          updatedAt: new Date().toISOString(),
        };
      });

      saveCustomer({
        ...cust,
        creditBalance: newBal,
        // الحفاظ الصارم على تاريخ إنشاء الدين الأصلي
        debtCreatedAt: cust.debtCreatedAt,
        debts: updatedDebts,
      });
      showToast(
        lang === 'ar'
          ? `تم تسجيل تسديد ${paymentModal.amount} د.ج للعميل ${cust.name}`
          : `Versement de ${paymentModal.amount} DZD enregistré pour ${cust.name}`,
        'success'
      );
    } else {
      const sup = paymentModal.item as Supplier;
      const newBal = Math.max(0, sup.debtBalance - paymentModal.amount);
      saveSupplier({ ...sup, debtBalance: newBal });
      showToast(
        lang === 'ar'
          ? `تم تسجيل تسديد ${paymentModal.amount} د.ج للمورد ${sup.name}`
          : `Versement de ${paymentModal.amount} DZD enregistré pour ${sup.name}`,
        'success'
      );
    }
    setPaymentModal(null);
  };

  return (
    <div className="space-y-5">
      {/* شريط التبديل العلوي والبحث */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* التبديل بين الزبائن والموردين */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'customers'
                ? 'neu-pressed text-blue-600 bg-white/70'
                : 'neu-raised text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.customersTab}</span>
            <span className="neu-inset px-2 py-0.5 rounded-md text-[10px] text-blue-600 font-bold">
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'suppliers'
                ? 'neu-pressed text-blue-600 bg-white/70'
                : 'neu-raised text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t.suppliersTab}</span>
            <span className="neu-inset px-2 py-0.5 rounded-md text-[10px] text-blue-600 font-bold">
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* حقل البحث */}
        <div className="flex-1 w-full max-w-md">
          <NeuInput
            placeholder={activeTab === 'customers' ? 'ابحث باسم الزبون أو الهاتف...' : 'ابحث باسم المورد أو الشركة...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <NeuButton
            size="sm"
            onClick={handleExportCustomers}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            <span>{t.exportExcel}</span>
          </NeuButton>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={() => {
              if (activeTab === 'customers') {
                setCustomerModal({
                  id: `cust_${Date.now()}`,
                  name: '',
                  phone: '',
                  address: '',
                  wilaya: 'الجزائر العاصمة',
                  creditBalance: 0,
                  createdAt: new Date().toISOString(),
                });
              } else {
                setSupplierModal({
                  id: `sup_${Date.now()}`,
                  name: '',
                  company: '',
                  phone: '',
                  address: '',
                  debtBalance: 0,
                  createdAt: new Date().toISOString(),
                });
              }
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            <span>{activeTab === 'customers' ? 'عميل جديد' : 'مورد جديد'}</span>
          </NeuButton>
        </div>
      </div>

      {/* محتوى جدول الزبائن */}
      {activeTab === 'customers' && (
        <NeuCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">{t.customer}</th>
                  <th className="py-3 px-4 text-start">{t.phone}</th>
                  <th className="py-3 px-4 text-start">{lang === 'ar' ? 'العنوان والولاية' : 'Adresse & Wilaya'}</th>
                  <th className="py-3 px-4 text-end">{lang === 'ar' ? 'ديون الكريدي' : 'Créances (Crédit)'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'تاريخ ووقت الإنشاء' : 'Date & Heure de création'}</th>
                  <th className="py-3 px-4 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-blue-600 font-extrabold text-xs">
                          {cust.name.slice(0, 1)}
                        </div>
                        <div>
                          <div>{cust.name}</div>
                          {cust.notes && (
                            <div className="text-[10px] text-slate-400 font-normal">{cust.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {cust.phone}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {cust.address} - {cust.wilaya}
                    </td>

                    <td className="py-3 px-4 text-end">
                      {cust.creditBalance > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
                          {cust.creditBalance.toLocaleString()} {t.currency}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">لا توجد ديون</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {cust.creditBalance > 0 ? (
                        cust.debts && cust.debts.length > 1 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {cust.debts.map((d, i) => (
                              <div
                                key={d.id || i}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[10px] sm:text-[11px] font-mono text-slate-700 tabular-nums"
                                title={d.notes || (lang === 'ar' ? `دين ${i + 1}` : `Dette ${i + 1}`)}
                              >
                                <span className="font-bold text-amber-800">
                                  {d.remainingAmount.toLocaleString()} {t.currency}:
                                </span>
                                <span className="text-slate-600 font-semibold">{formatDateTimeDisplay(d.createdAt, lang)}</span>
                              </div>
                            ))}
                          </div>
                        ) : cust.debtCreatedAt || (cust.debts && cust.debts[0]?.createdAt) ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/70 border border-blue-200/60 text-blue-900 font-mono text-xs font-semibold tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              {formatDateTimeDisplay(cust.debtCreatedAt || cust.debts![0].createdAt, lang)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {lang === 'ar' ? 'غير متوفر' : 'Non disponible'}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {cust.creditBalance > 0 && (
                          <button
                            onClick={() =>
                              setPaymentModal({
                                type: 'customer',
                                item: cust,
                                amount: cust.creditBalance,
                              })
                            }
                            className="px-2 py-1 rounded-lg neu-raised text-emerald-700 font-bold hover:bg-emerald-50 text-[10px] transition-colors"
                            title="تسديد دفعة دين"
                          >
                            تسديد دفعة
                          </button>
                        )}
                        <button
                          onClick={() => setCustomerModal(cust)}
                          className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cust.id !== 'cust_walkin' && (
                          <button
                            onClick={() => deleteCustomer(cust.id)}
                            className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeuCard>
      )}

      {/* محتوى جدول الموردين */}
      {activeTab === 'suppliers' && (
        <NeuCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">المورد والمؤسسة</th>
                  <th className="py-3 px-4 text-start">الهاتف</th>
                  <th className="py-3 px-4 text-start">العنوان</th>
                  <th className="py-3 px-4 text-end">مستحقات المورد</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div>{sup.company}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        المسؤول: {sup.name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {sup.phone}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {sup.address}
                    </td>

                    <td className="py-3 px-4 text-end">
                      {sup.debtBalance > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 tabular-nums">
                          {sup.debtBalance.toLocaleString()} {t.currency}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">خالص (0 د.ج)</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {sup.debtBalance > 0 && (
                          <button
                            onClick={() =>
                              setPaymentModal({
                                type: 'supplier',
                                item: sup,
                                amount: sup.debtBalance,
                              })
                            }
                            className="px-2 py-1 rounded-lg neu-raised text-blue-700 font-bold hover:bg-blue-50 text-[10px] transition-colors"
                          >
                            تسديد للمورد
                          </button>
                        )}
                        <button
                          onClick={() => setSupplierModal(sup)}
                          className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSupplier(sup.id)}
                          className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeuCard>
      )}

      {/* نافذة إضافة/تعديل العميل */}
      {customerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-md bg-white shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-800 mb-4 pb-2 border-b border-slate-200">
              {customerModal.name ? t.edit : t.add}
            </h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <NeuInput
                label={t.customerName}
                required
                value={customerModal.name}
                onChange={(e) => setCustomerModal({ ...customerModal, name: e.target.value })}
                placeholder="مثال: عبد القادر رحماني"
              />
              <NeuInput
                label={t.phone}
                value={customerModal.phone}
                onChange={(e) => setCustomerModal({ ...customerModal, phone: e.target.value })}
                placeholder="0661 00 00 00"
              />
              <div className="grid grid-cols-2 gap-2">
                <NeuInput
                  label={t.address}
                  value={customerModal.address}
                  onChange={(e) => setCustomerModal({ ...customerModal, address: e.target.value })}
                  placeholder="شارع الاستقلال"
                />
                <NeuInput
                  label={t.wilaya}
                  value={customerModal.wilaya}
                  onChange={(e) => setCustomerModal({ ...customerModal, wilaya: e.target.value })}
                  placeholder="الجزائر، وهران، سطيف..."
                />
              </div>
              <NeuInput
                label="رصيد الكريدي المبدئي (د.ج)"
                type="number"
                value={customerModal.creditBalance}
                onChange={(e) =>
                  setCustomerModal({
                    ...customerModal,
                    creditBalance: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton type="button" variant="default" onClick={() => setCustomerModal(null)}>
                  {t.cancel}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل المورد */}
      {supplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-md bg-white shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-800 mb-4 pb-2 border-b border-slate-200">
              {supplierModal.company ? t.edit : t.add}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <NeuInput
                label={t.companyName}
                required
                value={supplierModal.company}
                onChange={(e) => setSupplierModal({ ...supplierModal, company: e.target.value })}
                placeholder="مثال: مجمع سيم للمطاحن"
              />
              <NeuInput
                label={t.supplierName}
                required
                value={supplierModal.name}
                onChange={(e) => setSupplierModal({ ...supplierModal, name: e.target.value })}
                placeholder="اسم وكيل التوزيع"
              />
              <NeuInput
                label={t.phone}
                value={supplierModal.phone}
                onChange={(e) => setSupplierModal({ ...supplierModal, phone: e.target.value })}
                placeholder="021 00 00 00"
              />
              <NeuInput
                label={t.address}
                value={supplierModal.address}
                onChange={(e) => setSupplierModal({ ...supplierModal, address: e.target.value })}
                placeholder="المنطقة الصناعية..."
              />
              <NeuInput
                label="المستحقات الحالية للمورد (د.ج)"
                type="number"
                value={supplierModal.debtBalance}
                onChange={(e) =>
                  setSupplierModal({
                    ...supplierModal,
                    debtBalance: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton type="button" variant="default" onClick={() => setSupplierModal(null)}>
                  {t.cancel}
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تسديد دفعة مالية */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-sm bg-white shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-800 mb-2">تسجيل تسديد مالي</h3>
            <p className="text-xs text-slate-500 mb-4">
              {paymentModal.type === 'customer'
                ? `تسديد دفعة من ديون الزبون "${(paymentModal.item as Customer).name}"`
                : `تسديد مستحقات المورد "${(paymentModal.item as Supplier).company}"`}
            </p>
            <form onSubmit={handleApplyPayment} className="space-y-3">
              <NeuInput
                label="المبلغ المسدد (د.ج)"
                type="number"
                required
                value={paymentModal.amount}
                onChange={(e) =>
                  setPaymentModal({
                    ...paymentModal,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className="text-base font-bold tabular-nums"
              />
              <div className="flex items-center gap-2 pt-2">
                <NeuButton type="submit" variant="emerald" fullWidth>
                  تأكيد القبض / الدفع
                </NeuButton>
                <NeuButton type="button" variant="default" onClick={() => setPaymentModal(null)}>
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
