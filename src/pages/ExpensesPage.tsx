import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Expense, ExpenseCategory } from '../types';
import {
  ReceiptText,
  Plus,
  Search,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  Building,
  Zap,
  Users,
  Truck,
  Wrench,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';
import * as XLSX from 'xlsx';

export const ExpensesPage: React.FC = () => {
  const { expenses, addExpense, deleteExpense, t, lang, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // فورم إضافة مصروف
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('electricity_gas');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // التصنيفات مع الأيقونات والأسماء
  const categoriesList: { id: ExpenseCategory; name: string; icon: any }[] = [
    { id: 'electricity_gas', name: t.categoryElectricity, icon: Zap },
    { id: 'rent', name: t.categoryRent, icon: Building },
    { id: 'salaries', name: t.categorySalaries, icon: Users },
    { id: 'transport', name: t.categoryTransport, icon: Truck },
    { id: 'maintenance', name: t.categoryMaintenance, icon: Wrench },
    { id: 'other', name: t.categoryOther, icon: HelpCircle },
  ];

  // تصفية المصاريف
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = selectedCat === 'all' || e.category === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [expenses, selectedCat, searchQuery]);

  // إجمالي المصروفات
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || amount <= 0) {
      showToast(t.requiredField, 'error');
      return;
    }

    addExpense({
      title: title.trim(),
      amount: Number(amount),
      category,
      notes: notes.trim(),
      date: new Date(date).toISOString(),
    });

    setIsAddOpen(false);
    setTitle('');
    setAmount('');
    setNotes('');
  };

  const handleExportExcel = () => {
    const data = expenses.map((e) => ({
      البيان: e.title,
      'المبلغ (د.ج)': e.amount,
      التصنيف: e.category,
      التاريخ: new Date(e.date).toLocaleDateString(),
      المسجل: e.createdByName,
      ملاحظات: e.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Depenses');
    XLSX.writeFile(wb, `Depenses_DzPOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('تم تصدير المصاريف إلى ملف Excel بنجاح', 'success');
  };

  return (
    <div className="space-y-5">
      {/* الشريط العلوي */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="flex-1">
            <NeuInput
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
          >
            <option value="all">كل أنواع المصاريف</option>
            {categoriesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* الإجمالي وزر الإضافة */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="neu-inset px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">{t.total}:</span>
            <span className="text-sm font-extrabold text-rose-600 tabular-nums">
              {totalAmount.toLocaleString()} {t.currency}
            </span>
          </div>

          <NeuButton
            size="sm"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            {t.exportExcel}
          </NeuButton>

          <NeuButton
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {t.addExpense}
          </NeuButton>
        </div>
      </div>

      {/* بطاقات أو جدول المصروفات */}
      <NeuCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">البيان</th>
                <th className="py-3 px-4 text-start">التصنيف</th>
                <th className="py-3 px-4 text-start">التاريخ</th>
                <th className="py-3 px-4 text-start">المسؤول</th>
                <th className="py-3 px-4 text-end">المبلغ</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد مصاريف مسجلة
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catItem = categoriesList.find((c) => c.id === exp.category);
                  const Icon = catItem?.icon || ReceiptText;

                  return (
                    <tr key={exp.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg neu-raised flex items-center justify-center text-rose-500">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{exp.title}</div>
                            {exp.notes && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {exp.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {catItem?.name || exp.category}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(exp.date).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {exp.createdByName}
                      </td>

                      <td className="py-3 px-4 text-end font-extrabold text-rose-600 tabular-nums">
                        {exp.amount.toLocaleString()} {t.currency}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="p-1.5 rounded-lg neu-raised text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* نافذة إضافة مصروف */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="neu-flat rounded-3xl p-6 w-full max-w-md bg-white shadow-2xl">
            <h3 className="font-extrabold text-base text-slate-800 mb-4 pb-2 border-b border-slate-200">
              {t.addExpense}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <NeuInput
                label={t.expenseTitle}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: فاتورة كهرباء سونلغاز ثلاثي 3"
              />

              <NeuInput
                label={t.expenseAmount}
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                placeholder="0"
                className="font-bold tabular-nums"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.expenseCategory}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70"
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <NeuInput
                label={t.date}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <NeuInput
                label={t.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="رقم الوصل أو ملاحظة اختيارية..."
              />

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <NeuButton type="submit" variant="primary" fullWidth>
                  {t.save}
                </NeuButton>
                <NeuButton type="button" variant="default" onClick={() => setIsAddOpen(false)}>
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
