import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  CheckCircle,
  Eye,
  Key,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Coins,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { ManagedLicenseRecord, LicenseType, LicenseStatus } from '../types';
import {
  getLicenseRecords,
  fetchCentralLicenses,
  exportLicenseDatabaseJson,
  importLicenseDatabaseJson,
} from '../utils/storage';
import { LicenseDetailModal } from './LicenseDetailModal';

export const LicenseList: React.FC = () => {
  const [records, setRecords] = useState<ManagedLicenseRecord[]>(() => getLicenseRecords());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LicenseStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LicenseType>('all');
  const [selectedRecord, setSelectedRecord] = useState<ManagedLicenseRecord | null>(null);
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshList = async () => {
    setIsSyncing(true);
    const remote = await fetchCentralLicenses();
    if (remote) {
      setRecords(remote);
    } else {
      setRecords(getLicenseRecords());
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    refreshList();
  }, []);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    let lifetimeCount = 0;
    let annualCount = 0;
    let activeCount = 0;
    let totalRevenue = 0;

    records.forEach((r) => {
      if (r.status === 'active') activeCount++;
      if (r.type === 'lifetime') lifetimeCount++;
      if (r.type === '1_year') annualCount++;
      totalRevenue += r.pricePaidDzd || 0;
    });

    return {
      total: records.length,
      active: activeCount,
      lifetime: lifetimeCount,
      annual: annualCount,
      revenue: totalRevenue,
    };
  }, [records]);

  // تصفية السجلات
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all') {
        if (typeFilter === 'trial' || typeFilter === 'custom_trial') {
          if (r.type !== 'trial' && r.type !== 'custom_trial') return false;
        } else if (r.type !== typeFilter) {
          return false;
        }
      }
      if (!q) return true;

      return (
        r.customerName.toLowerCase().includes(q) ||
        r.serialKey.toLowerCase().includes(q) ||
        r.licenseId.toLowerCase().includes(q) ||
        (r.deviceId && r.deviceId.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.customerPhone && r.customerPhone.includes(q))
      );
    });
  }, [records, searchQuery, statusFilter, typeFilter]);

  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    showToast('تم نسخ مفتاح السيريال');
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const handleExportDatabase = () => {
    const json = exportLicenseDatabaseJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TADJIR_Licenses_Registry_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير قاعدة بيانات التراخيص');
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = importLicenseDatabaseJson(content);
        if (res.success) {
          refreshList();
          showToast(`تم استيراد ${res.count} ترخيص بنجاح`);
        } else {
          showToast(res.error || 'فشل الاستيراد');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات العلوية */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
          <span className="text-xs text-slate-400 font-medium">إجمالي التراخيص</span>
          <div className="text-2xl font-black text-white mt-1 font-mono">{stats.total}</div>
          <span className="text-[11px] text-emerald-400 font-bold mt-1 block">
            {stats.active} نشط حاليًا
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
          <span className="text-xs text-slate-400 font-medium">تراخيص دائمة (Lifetime)</span>
          <div className="text-2xl font-black text-blue-400 mt-1 font-mono">{stats.lifetime}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">بدون انتهاء</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
          <span className="text-xs text-slate-400 font-medium">تراخيص سنوية (1 Year)</span>
          <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">{stats.annual}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">اشتراكات سنوية</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
          <span className="text-xs text-slate-400 font-medium">إجمالي المقبوضات</span>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
            {stats.revenue.toLocaleString()} <span className="text-xs text-slate-500 font-normal">د.ج</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">سجل المبيعات</span>
        </div>
      </div>

      {/* لوحة البحث والتصفية والأزرار */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* حقل البحث */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالعميل، السيريال، معرّف الترخيص، أو الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* أزرار التصدير والاستيراد */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDatabase}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>تصدير JSON</span>
            </button>

            <label className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>استيراد JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportDatabase}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* فلاتر الحالة والنوع */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold ml-1">الحالة:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشطة' },
              { id: 'suspended', label: 'المعلقة' },
              { id: 'revoked', label: 'الملغاة' },
              { id: 'expired', label: 'المنتهية' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-semibold ml-1">النوع:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'lifetime', label: 'دائم' },
              { id: '1_year', label: 'سنوي' },
              { id: '6_months', label: '6 أشهر' },
              { id: 'trial', label: 'Custom Trial' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  typeFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* جدول التراخيص */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">العميل / المحل</th>
                <th className="px-5 py-3.5">مفتاح السيريال</th>
                <th className="px-5 py-3.5">النوع</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5">تاريخ الإصدار</th>
                <th className="px-5 py-3.5">ربط الجهاز</th>
                <th className="px-5 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    لا توجد تراخيص مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white">
                      <div>{r.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {r.licenseId} {r.customerWilaya ? `• ${r.customerWilaya}` : ''}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-blue-400 font-bold">
                        <span>{r.serialKey}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySerial(r.serialKey)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                          title="نسخ السيريال"
                        >
                          {copiedSerial === r.serialKey ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                        {r.type === 'custom_trial' || r.type === 'trial'
                          ? `Custom Trial (${r.duration_hours || r.durationHours || 24}h)`
                          : r.type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'revoked'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : r.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                        }`}
                      >
                        {r.status === 'active'
                          ? 'نشط'
                          : r.status === 'revoked'
                          ? 'ملغي'
                          : r.status === 'suspended'
                          ? 'معلق'
                          : 'منتهي'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(r.issuedAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                      {r.deviceId || 'عام'}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="عرض التفاصيل والعمليات"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">تفاصيل</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* تفاصيل الترخيص المنبثقة */}
      {selectedRecord && (
        <LicenseDetailModal
          license={selectedRecord}
          isOpen={true}
          onClose={() => setSelectedRecord(null)}
          onUpdate={refreshList}
        />
      )}

      {/* تنبيه منبثق سريع */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
