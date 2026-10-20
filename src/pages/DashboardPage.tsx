import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ShoppingBag,
  Coins,
  ArrowUpRight,
  Package,
  Calendar,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { Sale } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { sales, products, expenses, t, lang } = useApp();
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  // حساب مؤشرات اليوم والشهر
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.slice(0, 7);

  const metrics = useMemo(() => {
    let todayTotal = 0;
    let monthTotal = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    sales.forEach((s) => {
      if (s.createdAt.startsWith(todayStr)) {
        todayTotal += s.total;
      }
      if (s.createdAt.startsWith(thisMonthStr)) {
        monthTotal += s.total;
      }
      totalRevenue += s.total;

      // حساب تكلفة البضاعة المباعة
      s.items.forEach((item) => {
        totalCost += (item.buyPrice || 0) * item.quantity;
      });
    });

    const netProfit = Math.max(0, totalRevenue - totalCost);
    const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;

    return {
      todayTotal,
      monthTotal,
      netProfit,
      salesCount: sales.length,
      lowStockCount,
    };
  }, [sales, products, todayStr, thisMonthStr]);

  // إحصائيات آخر 7 أيام للرسم البياني
  const weeklyData = useMemo(() => {
    const days: { label: string; dateStr: string; amount: number }[] = [];
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayNamesFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const label = lang === 'ar' ? dayNamesAr[dayIndex] : dayNamesFr[dayIndex];

      const amount = sales
        .filter((s) => s.createdAt.startsWith(dateStr))
        .reduce((sum, s) => sum + s.total, 0);

      days.push({ label, dateStr, amount });
    }

    const maxAmount = Math.max(...days.map((d) => d.amount), 5000);
    return { days, maxAmount };
  }, [sales, lang]);

  // المنتجات الأكثر مبيعًا
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        if (!counts[item.productId]) {
          counts[item.productId] = { name: item.productName, qty: 0, total: 0 };
        }
        counts[item.productId].qty += item.quantity;
        counts[item.productId].total += item.total;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  // المنتجات ذات المخزون الحرج
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStockAlert).slice(0, 5);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* شبكة البطاقات الإحصائية Neumorphic Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إيرادات اليوم */}
        <NeuCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{t.dailyRevenue}</span>
            <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-blue-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-800 tabular-nums">
              {metrics.todayTotal.toLocaleString()}
              <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>مبيعات يومية نشطة</span>
            </div>
          </div>
        </NeuCard>

        {/* إيرادات الشهر */}
        <NeuCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{t.monthlyRevenue}</span>
            <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-800 tabular-nums">
              {metrics.monthTotal.toLocaleString()}
              <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              الشهر الحالي {thisMonthStr}
            </div>
          </div>
        </NeuCard>

        {/* صافي الأرباح المقدرة */}
        <NeuCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{t.netProfit}</span>
            <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-700 tabular-nums">
              {metrics.netProfit.toLocaleString()}
              <span className="text-xs font-medium text-slate-400 ms-1.5">{t.currency}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              بعد خصم تكاليف الشراء
            </div>
          </div>
        </NeuCard>

        {/* تنبيهات المخزون */}
        <NeuCard className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{t.lowStockItems}</span>
            <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
              {metrics.lowStockCount}
              <span className="text-xs font-medium text-slate-400 ms-1.5">مواد</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              تحت حد التنبيه الأدنى
            </div>
          </div>
        </NeuCard>
      </div>

      {/* قسم الرسم البياني الأسبوعي والأكثر مبيعًا */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* الرسم البياني التفاعلي للمبيعات الأسبوعية */}
        <NeuCard className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-800">{t.weeklySalesChart}</h3>
              <p className="text-xs text-slate-400">إجمالي المبيعات المحققة لآخر سبعة أيام</p>
            </div>
            <div className="neu-inset px-3 py-1 rounded-xl text-xs font-semibold text-slate-600">
              الأسبوع الجاري
            </div>
          </div>

          {/* الرسم البياني بالأعمدة */}
          <div className="h-56 pt-6 flex items-end justify-between gap-3 px-2">
            {weeklyData.days.map((day, idx) => {
              const heightPercent = Math.max(12, (day.amount / weeklyData.maxAmount) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* نافذة التلميح السريع */}
                  <span className="text-[10px] font-bold text-blue-600 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {day.amount.toLocaleString()} د.ج
                  </span>
                  {/* العمود الزجاجي الثلاثي الأبعاد */}
                  <div className="w-full max-w-[48px] bg-slate-200/50 rounded-2xl p-1 neu-inset flex items-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full rounded-xl bg-gradient-to-t from-blue-600 to-sky-400 shadow-[2px_2px_8px_rgba(37,99,235,0.4)] transition-all duration-500 group-hover:from-blue-700 group-hover:to-sky-300"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </NeuCard>

        {/* قائمة المواد الأكثر مبيعًا */}
        <NeuCard className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-800">{t.topSellingProducts}</h3>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-4 space-y-2.5">
              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد مبيعات مسجلة حتى الآن</p>
              ) : (
                topProducts.map((p, idx) => (
                  <div
                    key={idx}
                    className="neu-raised rounded-xl p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg neu-inset flex items-center justify-center font-bold text-blue-600 text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate max-w-[140px]">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-end">
                      <div className="font-extrabold text-slate-800 tabular-nums">
                        {p.qty} وحدة
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {p.total.toLocaleString()} {t.currency}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3">
            <NeuButton
              size="sm"
              variant="default"
              fullWidth
              onClick={() => onNavigate('pos')}
            >
              فتح نقطة البيع (POS)
            </NeuButton>
          </div>
        </NeuCard>
      </div>

      {/* قسم آخر العمليات والتنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* آخر المبيعات المنجزة */}
        <NeuCard className="lg:col-span-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-base text-slate-800">{t.recentSales}</h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              عرض كل التقارير &larr;
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200/80 pb-2">
                  <th className="py-2 text-start font-bold">الفاتورة</th>
                  <th className="py-2 text-start font-bold">الزبون</th>
                  <th className="py-2 text-start font-bold">التاريخ</th>
                  <th className="py-2 text-end font-bold">المبلغ الصافي</th>
                  <th className="py-2 text-center font-bold">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-slate-700">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-2.5 font-medium text-slate-800">
                      {sale.customerName}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 text-end font-extrabold text-blue-600 tabular-nums">
                      {sale.total.toLocaleString()} {t.currency}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => setSelectedSaleForView(sale)}
                        className="p-1.5 rounded-lg neu-raised text-slate-600 hover:text-blue-600 transition-colors"
                        title="معاينة وطباعة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeuCard>

        {/* تنبيهات المواد منخفضة المخزون */}
        <NeuCard className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-800">{t.lowStockWarning}</h3>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>

            <div className="mt-3 space-y-2">
              {lowStockProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                  <span>كل مستويات المخزون كافية ومستقرة</span>
                </div>
              ) : (
                lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="neu-raised rounded-xl p-2.5 flex items-center justify-between text-xs border border-amber-200/50 bg-amber-50/30"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{p.nameAr}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>
                    </div>
                    <div className="text-end">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white">
                        بقي {p.stock} {p.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3">
            <NeuButton
              size="sm"
              variant="default"
              fullWidth
              onClick={() => onNavigate('products')}
            >
              إدارة المخزون والتوريد
            </NeuButton>
          </div>
        </NeuCard>
      </div>

      {/* نافذة معاينة الفاتورة إذا تم الضغط على زر العين */}
      {selectedSaleForView && (
        <ReceiptModal
          sale={selectedSaleForView}
          onClose={() => setSelectedSaleForView(null)}
        />
      )}
    </div>
  );
};
