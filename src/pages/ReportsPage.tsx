import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Sale } from '../types';
import { db } from '../db/sqlite-service';
import {
  Calendar,
  Filter,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  Receipt,
  Eye,
  ShieldAlert,
  FileText,
  UserCheck,
  CreditCard,
  SlidersHorizontal,
  Building2,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import {
  CustomDatePickerModal,
  CustomDateSelection,
} from '../components/reports/CustomDatePickerModal';
import {
  getLocalDateString,
  formatDateDisplay,
  formatDateLong,
  formatMonthYear,
  getDayStartTimestamp,
  getDayEndTimestamp,
} from '../utils/date-utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export const ReportsPage: React.FC = () => {
  const { sales, customers, suppliers, expenses, isAdmin, t, lang, showToast } = useApp();
  const isAr = lang === 'ar';

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const todayDate = useMemo(() => new Date(), []);
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth() + 1;

  // فلاتر المبيعات
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<CustomDateSelection>({
    mode: 'range',
    startDate: todayStr,
    endDate: todayStr,
    singleDate: todayStr,
    year: currentYear,
    month: currentMonth,
  });

  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // نافذة التاريخ المخصص
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);

  // معاينة الفاتورة
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // إذا لم يكن المدير، نظهر رسالة الحظر
  if (!isAdmin) {
    return (
      <div className="neu-flat rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl neu-inset mx-auto flex items-center justify-center text-rose-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          {isAr ? 'عذرًا، صلاحية مقيدة' : 'Accès restreint'}
        </h2>
        <p className="text-xs text-slate-500">
          {isAr
            ? 'حساب الكاشير ليس لديه صلاحية الوصول إلى التقارير المالية والأرباح. يرجى تسجيل الدخول بحساب المدير.'
            : "Le profil caissier n'a pas accès aux rapports financiers. Veuillez vous connecter avec le compte Administrateur."}
        </p>
      </div>
    );
  }

  // تصفية المبيعات من قاعدة البيانات حسب المعايير والتوقيت المحلي بدقة
  const filteredSales = useMemo(() => {
    // بناء معايير الفلترة لقاعدة البيانات
    const criteria: Parameters<typeof db.getFilteredSales>[0] = {
      dateMode: dateFilter,
      cashierName: cashierFilter,
      paymentMethod: paymentFilter,
      customerId: customerFilter,
    };

    if (dateFilter === 'custom') {
      if (customDate.mode === 'single') {
        criteria.singleDate = customDate.singleDate;
      } else if (customDate.mode === 'month') {
        criteria.year = customDate.year;
        criteria.month = customDate.month;
      } else {
        criteria.startDate = customDate.startDate;
        criteria.endDate = customDate.endDate;
      }
    }

    return db.getFilteredSales(criteria);
  }, [sales, dateFilter, customDate, cashierFilter, paymentFilter, customerFilter]);

  // تسمية الفترة النشطة الحالية
  const periodLabel = useMemo(() => {
    const now = new Date();
    const curTodayStr = getLocalDateString(now);

    if (dateFilter === 'all') {
      return isAr ? 'كل الفترات' : 'Toutes les périodes';
    }

    if (dateFilter === 'today') {
      return isAr
        ? `اليوم (${formatDateDisplay(curTodayStr)})`
        : `Aujourd'hui (${formatDateDisplay(curTodayStr)})`;
    }

    if (dateFilter === 'week') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      const pastStr = getLocalDateString(past);
      return isAr
        ? `آخر 7 أيام (${formatDateDisplay(pastStr)} ← ${formatDateDisplay(curTodayStr)})`
        : `7 derniers jours (${formatDateDisplay(pastStr)} → ${formatDateDisplay(curTodayStr)})`;
    }

    if (dateFilter === 'month') {
      return isAr
        ? `الشهر الجاري (${formatMonthYear(currentYear, currentMonth, 'ar')})`
        : `Mois en cours (${formatMonthYear(currentYear, currentMonth, 'fr')})`;
    }

    if (dateFilter === 'custom') {
      if (customDate.mode === 'single') {
        return formatDateLong(customDate.singleDate, isAr ? 'ar' : 'fr');
      }
      if (customDate.mode === 'month') {
        return formatMonthYear(customDate.year, customDate.month, isAr ? 'ar' : 'fr');
      }
      if (customDate.mode === 'range') {
        if (customDate.startDate === customDate.endDate) {
          return formatDateLong(customDate.startDate, isAr ? 'ar' : 'fr');
        }
        return `${formatDateDisplay(customDate.startDate)} ← ${formatDateDisplay(customDate.endDate)}`;
      }
    }

    return '';
  }, [dateFilter, customDate, isAr, currentYear, currentMonth]);

  // حساب مؤشرات التقرير المالية الشاملة
  const reportTotals = useMemo(() => {
    let revenue = 0;       // صافي المبيعات (Net sales)
    let grossSales = 0;    // المبيعات الإجمالية قبل الخصم (Gross sales)
    let discounts = 0;     // إجمالي التخفيضات الممنوحة
    let profit = 0;        // هامش الربح التقديري
    let itemsCount = 0;    // عدد القطع والمواد المباعة

    filteredSales.forEach((s) => {
      revenue += s.total;
      grossSales += s.subtotal || s.total;
      discounts += s.discount || 0;

      s.items.forEach((item) => {
        itemsCount += item.quantity;
        const buyPrice = item.buyPrice || 0;
        const sellPrice = item.unitPrice || 0;
        profit += (sellPrice - buyPrice) * item.quantity;
      });
    });

    const invoicesCount = filteredSales.length;
    const averageTicket = invoicesCount > 0 ? Math.round(revenue / invoicesCount) : 0;

    return {
      revenue,
      grossSales,
      discounts,
      profit,
      itemsCount,
      invoicesCount,
      averageTicket,
    };
  }, [filteredSales]);

  // دالة مساعدة للتحقق مما إذا كان تاريخ عنصر ما يقع ضمن الفترة الزمنية المحددة للتقرير
  const isDateInReportPeriod = (dateStrOrIso?: string): boolean => {
    if (dateFilter === 'all') return true;
    if (!dateStrOrIso) return false;

    const d = new Date(dateStrOrIso);
    if (isNaN(d.getTime())) return false;

    const itemLocalStr = getLocalDateString(d);
    const now = new Date();
    const todayLocalStr = getLocalDateString(now);

    if (dateFilter === 'today') {
      return itemLocalStr === todayLocalStr;
    }

    if (dateFilter === 'week') {
      const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (dateFilter === 'month') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() + 1 === now.getMonth() + 1
      );
    }

    if (dateFilter === 'custom') {
      if (customDate.mode === 'single') {
        return itemLocalStr === customDate.singleDate;
      }
      if (customDate.mode === 'month') {
        return (
          d.getFullYear() === customDate.year &&
          d.getMonth() + 1 === customDate.month
        );
      }
      const startMs = getDayStartTimestamp(customDate.startDate);
      const endMs = getDayEndTimestamp(customDate.endDate);
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    }

    return true;
  };

  // 1. تصفية المصروفات المسجلة في النظام حسب الفترة المحددة
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInReportPeriod(e.date));
  }, [expenses, dateFilter, customDate]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // صافي الأرباح بعد خصم المصاريف: Net Profit After Expenses = Gross Profit - Total Expenses
  const netProfitAfterExpenses = useMemo(() => {
    return reportTotals.profit - totalExpenses;
  }, [reportTotals.profit, totalExpenses]);

  // 2. حساب إجمالي ديون الزبائن (الكريدي)
  const creditDebtInfo = useMemo(() => {
    const relevantCustomers = customers.filter(
      (c) => customerFilter === 'all' || c.id === customerFilter
    );
    const totalOutstandingCustomerDebt = relevantCustomers.reduce(
      (sum, c) => sum + Math.max(0, c.creditBalance || 0),
      0
    );

    // مبيعات الكريدي في الفترة المحددة
    const creditSalesInPeriod = filteredSales.filter(
      (s) => s.paymentMethod === 'credit'
    );
    const totalCreditSalesPeriod = creditSalesInPeriod.reduce((sum, s) => sum + s.total, 0);
    const totalCreditPaidPeriod = creditSalesInPeriod.reduce(
      (sum, s) => sum + (s.paidAmount || 0),
      0
    );
    const periodUnpaidCredit = Math.max(0, totalCreditSalesPeriod - totalCreditPaidPeriod);

    // عند اختيار كل الفترات، القيمة الأساسية هي إجمالي الديون المستحقة على الزبائن في النظام
    // وعند اختيار فترة محددة، تظهر الديون غير المسددة المتولدة في تلك الفترة
    const displayedCreditDebt =
      dateFilter === 'all' ? totalOutstandingCustomerDebt : periodUnpaidCredit;

    return {
      displayedCreditDebt,
      periodUnpaidCredit,
      totalOutstandingCustomerDebt,
      creditSalesCount: creditSalesInPeriod.length,
      totalCreditSalesPeriod,
      totalCreditPaidPeriod,
    };
  }, [customers, filteredSales, dateFilter, customerFilter]);

  // 3. حساب إجمالي مستحقات الموردين (ديون الموردين)
  const supplierPayablesInfo = useMemo(() => {
    const totalOutstandingSupplierDebt = suppliers.reduce(
      (sum, s) => sum + Math.max(0, s.debtBalance || 0),
      0
    );

    const suppliersWithDebt = suppliers.filter((s) => (s.debtBalance || 0) > 0);

    const periodSuppliers = suppliers.filter((s) =>
      isDateInReportPeriod(s.createdAt)
    );
    const periodSupplierDebt = periodSuppliers.reduce(
      (sum, s) => sum + Math.max(0, s.debtBalance || 0),
      0
    );

    const displayedSupplierPayables =
      dateFilter === 'all'
        ? totalOutstandingSupplierDebt
        : (periodSupplierDebt > 0 ? periodSupplierDebt : totalOutstandingSupplierDebt);

    return {
      displayedSupplierPayables,
      totalOutstandingSupplierDebt,
      suppliersWithDebtCount: suppliersWithDebt.length,
      periodSupplierDebt,
    };
  }, [suppliers, dateFilter, customDate]);

  // قائمة أسماء الصناديق المتوفرة في النظام
  const cashiersList = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.cashierName) set.add(s.cashierName);
    });
    return Array.from(set);
  }, [sales]);

  // قائمة الزبائن المتوفرة
  const customersList = useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

    customers.forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        list.push({ id: c.id, name: c.name });
      }
    });

    sales.forEach((s) => {
      if (s.customerId && !seen.has(s.customerId)) {
        seen.add(s.customerId);
        list.push({ id: s.customerId, name: s.customerName || s.customerId });
      }
    });

    return list;
  }, [customers, sales]);

  // تطبيق اختيار التاريخ المخصص
  const handleApplyCustomDate = (selection: CustomDateSelection) => {
    setCustomDate(selection);
    setDateFilter('custom');
  };

  // تصدير التقرير إلى Excel (.xlsx)
  const handleExportExcel = () => {
    const data = filteredSales.map((s) => ({
      'رقم الفاتورة': s.invoiceNumber,
      'تاريخ البيع': new Date(s.createdAt).toLocaleString('fr-FR'),
      'العميل': s.customerName,
      'أمين الصندوق': s.cashierName,
      'طريقة الدفع':
        s.paymentMethod === 'cash' ? 'نقدًا' : s.paymentMethod === 'credit' ? 'كريدي' : 'بطاقة CIB',
      'المجموع الفرعي (د.ج)': s.subtotal,
      'الخصم (د.ج)': s.discount,
      'الصافي للدفع (د.ج)': s.total,
      'المبلغ المدفوع (د.ج)': s.paidAmount,
      'الصرف (د.ج)': s.changeAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventes');

    const cleanPeriod = periodLabel.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 35);
    XLSX.writeFile(wb, `Rapport_Ventes_${cleanPeriod || 'DzPOS'}.xlsx`);
    showToast(isAr ? 'تم تصدير تقرير المبيعات إلى ملف Excel بنجاح' : 'Export Excel réussi', 'success');
  };

  // تصدير ملخص التقرير إلى PDF
  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Rapport des Ventes - DzPOS Pro Algerie', 14, 20);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Periode: ${periodLabel}`, 14, 28);
    doc.text(`Date de generation: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Nombre de transactions: ${filteredSales.length}`, 14, 40);
    doc.text(`Chiffre d'Affaires Brut: ${reportTotals.grossSales.toLocaleString()} DZD`, 14, 46);
    doc.text(`Total Remises: ${reportTotals.discounts.toLocaleString()} DZD`, 14, 52);
    doc.text(`Total Net: ${reportTotals.revenue.toLocaleString()} DZD`, 14, 58);
    doc.text(`Marge Beneficiaire Estimee: ${reportTotals.profit.toLocaleString()} DZD`, 14, 64);

    doc.line(14, 68, 196, 68);

    let y = 76;
    doc.setFont('Helvetica', 'bold');
    doc.text('Ticket', 14, y);
    doc.text('Date', 50, y);
    doc.text('Client', 95, y);
    doc.text('Caissier', 135, y);
    doc.text('Total (DZD)', 170, y);

    doc.setFont('Helvetica', 'normal');
    y += 6;

    filteredSales.slice(0, 30).forEach((s) => {
      doc.text(s.invoiceNumber, 14, y);
      doc.text(new Date(s.createdAt).toLocaleDateString(), 50, y);
      doc.text((s.customerName || 'Comptoir').slice(0, 18), 95, y);
      doc.text(s.cashierName.slice(0, 15), 135, y);
      doc.text(`${s.total}`, 170, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    const cleanPeriod = periodLabel.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 35);
    doc.save(`Rapport_Ventes_${cleanPeriod || 'DzPOS'}.pdf`);
    showToast(isAr ? 'تم تحميل ملف التقرير PDF بنجاح' : 'Export PDF réussi', 'success');
  };

  return (
    <div className="space-y-5">
      {/* شريط أدوات التصفية والتصدير مع خيارات التاريخ المتقدمة */}
      <div className="neu-flat p-4 rounded-3xl flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* أزرار الفترات الزمنية الخمسة */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dateFilter === 'all'
                  ? 'neu-pressed text-blue-600 bg-white/70'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'كل الفترات' : 'Toutes'}
            </button>

            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dateFilter === 'today'
                  ? 'neu-pressed text-blue-600 bg-white/70'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'اليوم' : "Aujourd'hui"}
            </button>

            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dateFilter === 'week'
                  ? 'neu-pressed text-blue-600 bg-white/70'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'آخر 7 أيام' : '7 jours'}
            </button>

            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                dateFilter === 'month'
                  ? 'neu-pressed text-blue-600 bg-white/70'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAr ? 'الشهر الجاري' : 'Ce mois'}
            </button>

            <button
              onClick={() => setIsCustomDatePickerOpen(true)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                dateFilter === 'custom'
                  ? 'neu-pressed text-blue-600 bg-blue-50/80 border border-blue-300 shadow-sm'
                  : 'neu-raised text-slate-700 hover:text-blue-600'
              }`}
              title={isAr ? 'تحديد يوم محدد، نطاق زمني، أو شهر وسنة' : 'Date ou période personnalisée'}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{isAr ? 'تاريخ مخصص' : 'Date personnalisée'}</span>
            </button>
          </div>

          {/* فلاتر الصندوق، طريقة الدفع، الزبون، وأزرار التصدير */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* فلتر أمين الصندوق */}
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
              title={isAr ? 'تصفية حسب أمين الصندوق' : 'Filtrer par caissier'}
            >
              <option value="all">{isAr ? 'كل الصناديق' : 'Toutes les caisses'}</option>
              {cashiersList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* فلتر وسيلة الدفع */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer"
              title={isAr ? 'تصفية حسب وسيلة الدفع' : 'Filtrer par mode de paiement'}
            >
              <option value="all">{isAr ? 'كل طرق الدفع' : 'Tous paiements'}</option>
              <option value="cash">{isAr ? 'نقدًا (Espèces)' : 'Espèces'}</option>
              <option value="credit">{isAr ? 'كريدي (Crédit)' : 'Crédit'}</option>
              <option value="cib_card">{isAr ? 'بطاقة بنكية (CIB)' : 'Carte CIB'}</option>
            </select>

            {/* فلتر الزبون */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="neu-input rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70 appearance-none cursor-pointer max-w-[140px] truncate"
              title={isAr ? 'تصفية حسب الزبون' : 'Filtrer par client'}
            >
              <option value="all">{isAr ? 'كل الزبائن' : 'Tous clients'}</option>
              {customersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* أزرار التصدير Excel و PDF */}
            <NeuButton
              size="sm"
              onClick={handleExportExcel}
              icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Excel
            </NeuButton>

            <NeuButton
              size="sm"
              onClick={handleExportPdf}
              icon={<FileText className="w-3.5 h-3.5 text-rose-600" />}
            >
              PDF
            </NeuButton>
          </div>
        </div>

        {/* مؤشر الفترة الزمنية المحددة والفعالة حالياً */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              {isAr ? 'الفترة المعروضة حالياً:' : 'Période affichée :'}
            </span>
            <span className="font-extrabold text-blue-800 font-mono bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200/80 shadow-inner">
              {periodLabel}
            </span>
            <span className="text-slate-500 font-medium text-[11px]">
              ({filteredSales.length} {isAr ? 'معاملة بيع مسجلة' : 'factures'})
            </span>
          </div>

          {dateFilter === 'custom' && (
            <button
              onClick={() => setIsCustomDatePickerOpen(true)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{isAr ? 'تعديل الفترة...' : 'Modifier la période...'}</span>
            </button>
          )}
        </div>
      </div>

      {/* بطاقات المؤشرات المالية للتقرير (تتحدث فورياً وبدقة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* بطاقة إجمالي المبيعات المصفاة */}
        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isAr ? 'إجمالي المبيعات المصفاة' : 'Ventes nettes filtrées'}
          </div>
          <div className="text-2xl font-extrabold text-blue-700 tabular-nums">
            {reportTotals.revenue.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{reportTotals.invoicesCount} {isAr ? 'معاملة منجزة' : 'transactions'}</span>
            {reportTotals.discounts > 0 && (
              <span className="text-rose-500 font-bold">
                {isAr ? 'الخصم:' : 'Remise:'} -{reportTotals.discounts.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {isAr ? 'الإجمالي الخام:' : 'Brut:'} {reportTotals.grossSales.toLocaleString()} {t.currency}
          </div>
        </NeuCard>

        {/* بطاقة هامش الأرباح التقديري */}
        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isAr ? 'هامش الأرباح التقديري' : 'Marge bénéficiaire estimée'}
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
            {reportTotals.profit.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {isAr ? 'ربح إجمالي قبل خصم المصاريف' : 'Bénéfice brut avant charges'}
          </div>
        </NeuCard>

        {/* بطاقة متوسط قيمة السلة (Ticket) */}
        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isAr ? 'متوسط قيمة السلة (Ticket)' : 'Panier moyen (Ticket)'}
          </div>
          <div className="text-2xl font-extrabold text-slate-800 tabular-nums">
            {reportTotals.averageTicket.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'لكل فاتورة بيع' : 'Par facture de vente'}
          </div>
        </NeuCard>

        {/* بطاقة القطع والمواد المباعة */}
        <NeuCard>
          <div className="text-xs font-bold text-slate-500 mb-1">
            {isAr ? 'القطع والمواد المباعة' : 'Articles & unités vendus'}
          </div>
          <div className="text-2xl font-extrabold text-purple-700 tabular-nums">
            {reportTotals.itemsCount}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{isAr ? 'وحدة' : 'unités'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAr ? 'كمية إجمالية' : 'Quantité totale'}
          </div>
        </NeuCard>
      </div>

      {/* بطاقات المحاسبة المالية المتقدمة (صافي الأرباح، ديون الكريدي، مستحقات الموردين) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. صافي الأرباح بعد المصاريف (Net Profit After Expenses) */}
        <NeuCard className="border-l-4 border-l-emerald-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-emerald-500 bg-gradient-to-br from-emerald-50/50 via-white/80 to-emerald-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isAr ? 'صافي الأرباح بعد المصاريف' : 'Bénéfice net après dépenses'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums ${
              netProfitAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {netProfitAfterExpenses.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {isAr ? 'المصاريف المخصومة:' : 'Charges déduites:'}{' '}
              <span className="font-semibold text-rose-500">
                -{totalExpenses.toLocaleString()} {t.currency}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              ({filteredExpenses.length} {isAr ? 'مصروف' : 'dépenses'})
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {isAr
              ? `الربح الخام: ${reportTotals.profit.toLocaleString()} د.ج`
              : `Marge brute: ${reportTotals.profit.toLocaleString()} ${t.currency}`}
          </div>
        </NeuCard>

        {/* 2. إجمالي ديون الزبائن (Total Credit Debt) */}
        <NeuCard className="border-l-4 border-l-amber-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-amber-500 bg-gradient-to-br from-amber-50/50 via-white/80 to-amber-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isAr ? 'إجمالي ديون الزبائن (كريدي)' : 'Total créances clients (Crédit)'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
            {creditDebtInfo.displayedCreditDebt.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {dateFilter === 'all'
                ? isAr
                  ? 'إجمالي ديون الزبائن الحالية'
                  : 'Total créances en cours'
                : isAr
                ? 'ديون غير مسددة في الفترة'
                : 'Crédit impayé période'}
            </span>
            {creditDebtInfo.creditSalesCount > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                {creditDebtInfo.creditSalesCount} {isAr ? 'فاتورة كريدي' : 'factures'}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {dateFilter !== 'all' ? (
              <span>
                {isAr
                  ? `الرصيد الكلي القائم: ${creditDebtInfo.totalOutstandingCustomerDebt.toLocaleString()} د.ج`
                  : `Total dû: ${creditDebtInfo.totalOutstandingCustomerDebt.toLocaleString()} ${t.currency}`}
              </span>
            ) : (
              <span>
                {isAr
                  ? `المبيعات بالدين: ${creditDebtInfo.totalCreditSalesPeriod.toLocaleString()} د.ج`
                  : `Ventes crédit: ${creditDebtInfo.totalCreditSalesPeriod.toLocaleString()} ${t.currency}`}
              </span>
            )}
          </div>
        </NeuCard>

        {/* 3. إجمالي مستحقات الموردين (Total Supplier Payables) */}
        <NeuCard className="border-l-4 border-l-indigo-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-indigo-500 bg-gradient-to-br from-indigo-50/50 via-white/80 to-indigo-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600">
              {isAr ? 'إجمالي مستحقات الموردين' : 'Total dettes fournisseurs'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 tabular-nums">
            {supplierPayablesInfo.displayedSupplierPayables.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {isAr ? 'مستحقات غير مسددة للموردين' : 'Soldes fournisseurs impayés'}
            </span>
            {supplierPayablesInfo.suppliersWithDebtCount > 0 && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded-md">
                {supplierPayablesInfo.suppliersWithDebtCount} {isAr ? 'مورد دائن' : 'fournisseurs'}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {isAr ? 'رصيد الذمم الدائنة في النظام' : 'Dettes fournisseurs enregistrées'}
          </div>
        </NeuCard>
      </div>

      {/* جدول سجل الفواتير والمبيعات */}
      <NeuCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-200/50 text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">{isAr ? 'رقم الفاتورة' : 'Facture N°'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'التاريخ والوقت' : 'Date & Heure'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الزبون' : 'Client'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'أمين الصندوق' : 'Caissier'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'طريقة الدفع' : 'Paiement'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'الخصم' : 'Remise'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'الصافي' : 'Net à payer'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'معاينة' : 'Aperçu'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    {isAr
                      ? 'لا توجد فواتير مطابقة لمعايير البحث في الفترة المحددة.'
                      : 'No invoices found for the selected period.'}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {sale.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {new Date(sale.createdAt).toLocaleString('fr-FR')}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {sale.customerName || (isAr ? 'زبون عام' : 'Comptoir')}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {sale.cashierName}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-inset text-slate-700">
                        {sale.paymentMethod === 'cash'
                          ? isAr ? 'نقدًا' : 'Espèces'
                          : sale.paymentMethod === 'credit'
                          ? isAr ? 'كريدي' : 'Crédit'
                          : isAr ? 'بطاقة CIB' : 'Carte CIB'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-end font-semibold text-rose-500 tabular-nums">
                      {sale.discount > 0 ? `-${sale.discount.toLocaleString()}` : '-'}
                    </td>

                    <td className="py-3 px-4 text-end font-extrabold text-blue-700 tabular-nums">
                      {sale.total.toLocaleString()} {t.currency}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                        title={isAr ? 'معاينة وطباعة الفاتورة' : 'Voir la facture'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* معاينة الفاتورة المحددة */}
      {selectedSale && (
        <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      {/* نافذة اختيار التاريخ والتقويم المخصص */}
      {isCustomDatePickerOpen && (
        <CustomDatePickerModal
          isOpen={isCustomDatePickerOpen}
          onClose={() => setIsCustomDatePickerOpen(false)}
          onApply={handleApplyCustomDate}
          initialSelection={customDate}
          lang={lang}
        />
      )}
    </div>
  );
};
