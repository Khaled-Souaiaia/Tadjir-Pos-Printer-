import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppSettings, User } from '../types';
import {
  Settings,
  Store,
  Printer,
  Database,
  Users,
  Save,
  Download,
  Upload,
  RefreshCw,
  Shield,
  FileCode,
  Globe,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';
import { db } from '../db/sqlite-service';
import { ClientOnboardingModal } from '../components/common/ClientOnboardingModal';
import { LicenseCard } from '../components/license/LicenseCard';
import { ActivationModal } from '../components/license/ActivationModal';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetDatabase, lang, setLang, t, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'store' | 'fiscal' | 'database' | 'users' | 'license'>('store');
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [usersList, setUsersList] = useState<User[]>(() => db.getUsers());
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // حالة إضافة مستخدم جديد
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'cashier'>('cashier');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  // تصدير نسخة احتياطية من قاعدة البيانات JSON
  const handleExportBackup = () => {
    const backupJson = db.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DzPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
  };

  // تصدير كود SQLite SQL متوافق
  const handleExportSqlite = () => {
    const sqlDump = db.generateSqliteDump();
    const blob = new Blob([sqlDump], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database.db.sql`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف سكربت SQLite بنجاح', 'success');
  };

  // استيراد واستعادة نسخة احتياطية
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const ok = db.importBackup(content);
        if (ok) {
          window.location.reload();
        } else {
          showToast('الملف غير صالح للاستعادة', 'error');
        }
      } catch {
        showToast('خطأ أثناء قراءة ملف النسخة الاحتياطية', 'error');
      }
    };
    reader.readAsText(file);
  };

  // إضافة مستخدم جديد
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword.trim()) {
      showToast(t.requiredField, 'error');
      return;
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      role: newRole,
      passwordHash: newPassword.trim(),
      createdAt: new Date().toISOString(),
    };

    db.saveUser(newUser);
    setUsersList(db.getUsers());
    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
    showToast('تم إنشاء المستخدم الجديد بنجاح', 'success');
  };

  return (
    <div className="space-y-5">
      {/* شريط تبويبات الإعدادات */}
      <div className="neu-flat p-2.5 rounded-2xl flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'store'
              ? 'neu-pressed text-blue-600 bg-white/70'
              : 'neu-raised text-slate-600'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>{t.storeInfoTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('fiscal')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'fiscal'
              ? 'neu-pressed text-blue-600 bg-white/70'
              : 'neu-raised text-slate-600'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{t.taxAndPrintTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'database'
              ? 'neu-pressed text-blue-600 bg-white/70'
              : 'neu-raised text-slate-600'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{t.backupTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'users'
              ? 'neu-pressed text-blue-600 bg-white/70'
              : 'neu-raised text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.usersTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'license'
              ? 'neu-pressed text-blue-600 bg-white/70'
              : 'neu-raised text-slate-600'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>{t.licenseTab}</span>
        </button>
      </div>

      {/* تبويب 1: معلومات المتجر والمحل */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveSettings}>
          <NeuCard className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-800 pb-2 border-b border-slate-200">
              {t.storeInfoTab}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.storeNameAr}
                required
                value={formData.storeNameAr}
                onChange={(e) => setFormData({ ...formData, storeNameAr: e.target.value })}
              />

              <NeuInput
                label={t.storeNameFr}
                value={formData.storeNameFr}
                onChange={(e) => setFormData({ ...formData, storeNameFr: e.target.value })}
              />
            </div>

            <NeuInput
              label={t.activityDesc}
              value={formData.activityDescription}
              onChange={(e) => setFormData({ ...formData, activityDescription: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.address}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <NeuInput
                label={t.wilaya}
                value={formData.wilaya}
                onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.phone}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  لغة واجهة النظام
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLang('ar')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      lang === 'ar' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
                    }`}
                  >
                    العربية (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('fr')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      lang === 'fr' ? 'neu-pressed text-blue-600 bg-white/70' : 'neu-raised text-slate-600'
                    }`}
                  >
                    Français (LTR)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <NeuButton type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                {t.save}
              </NeuButton>
            </div>
          </NeuCard>
        </form>
      )}

      {/* تبويب 2: الضرائب والفواتير والطباعة في الجزائر */}
      {activeTab === 'fiscal' && (
        <form onSubmit={handleSaveSettings}>
          <NeuCard className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-800 pb-2 border-b border-slate-200">
              المعلومات الجبائية والطباعة (Algérie)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.rcNumber}
                value={formData.rcNumber}
                onChange={(e) => setFormData({ ...formData, rcNumber: e.target.value })}
                placeholder="16/00-1234567B21"
                className="font-mono text-xs"
              />

              <NeuInput
                label={t.nifNumber}
                value={formData.nifNumber}
                onChange={(e) => setFormData({ ...formData, nifNumber: e.target.value })}
                placeholder="002116012345678"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.nisNumber}
                value={formData.nisNumber}
                onChange={(e) => setFormData({ ...formData, nisNumber: e.target.value })}
                placeholder="09981601002345"
                className="font-mono text-xs"
              />

              <NeuInput
                label={t.aiNumber}
                value={formData.aiNumber}
                onChange={(e) => setFormData({ ...formData, aiNumber: e.target.value })}
                placeholder="16012345678"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuInput
                label={t.tvaPercentage}
                type="number"
                value={formData.tvaRate}
                onChange={(e) =>
                  setFormData({ ...formData, tvaRate: parseFloat(e.target.value) || 0 })
                }
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  {t.receiptType}
                </label>
                <select
                  value={formData.receiptFormat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      receiptFormat: e.target.value as any,
                    })
                  }
                  className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70"
                >
                  <option value="thermal_80">{t.thermal80}</option>
                  <option value="thermal_58">{t.thermal58}</option>
                  <option value="a4">{t.standardA4}</option>
                </select>
              </div>
            </div>

            <NeuInput
              label={t.receiptFooter}
              value={formData.receiptFooterMessage}
              onChange={(e) =>
                setFormData({ ...formData, receiptFooterMessage: e.target.value })
              }
            />

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <NeuButton type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                {t.save}
              </NeuButton>
            </div>
          </NeuCard>
        </form>
      )}

      {/* تبويب 3: قاعدة البيانات والنسخ الاحتياطي Offline */}
      {activeTab === 'database' && (
        <NeuCard className="space-y-5">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 pb-1">
              النسخ الاحتياطي وقاعدة بيانات SQLite
            </h3>
            <p className="text-xs text-slate-400">
              التطبيق يعمل بدون إنترنت (100% Offline) ويقوم بحفظ جميع البيانات محليًا. يمكنك حفظ نسخة احتياطية ونقلها إلى أي حاسوب آخر.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* تصدير نسخة JSON */}
            <div className="neu-inset p-4 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-1">
                  تصدير نسخة احتياطية كاملة (JSON)
                </h4>
                <p className="text-[11px] text-slate-500">
                  تحتوي على كل المنتجات، العملاء، المبيعات، والمصاريف في ملف واحد آمن.
                </p>
              </div>
              <NeuButton
                size="sm"
                onClick={handleExportBackup}
                icon={<Download className="w-3.5 h-3.5 text-blue-600" />}
              >
                تنزيل ملف النسخة الاحتياطية
              </NeuButton>
            </div>

            {/* تصدير سكربت SQLite */}
            <div className="neu-inset p-4 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-1">
                  تصدير سكربت SQLite (database.db.sql)
                </h4>
                <p className="text-[11px] text-slate-500">
                  متوافق مع محرك SQLite المكتبي وبرنامج Electron و DB Browser for SQLite.
                </p>
              </div>
              <NeuButton
                size="sm"
                onClick={handleExportSqlite}
                icon={<FileCode className="w-3.5 h-3.5 text-emerald-600" />}
              >
                توليد ملف SQLite SQL
              </NeuButton>
            </div>
          </div>

          {/* استيراد نسخة احتياطية */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-bold text-xs text-slate-800 mb-2">استعادة نسخة سابقة</h4>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="text-xs text-slate-500 file:neu-raised file:rounded-xl file:px-4 file:py-2 file:border-0 file:text-xs file:font-bold file:text-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* تجهيز البرنامج لتسليم الزبون الجديد */}
          <div className="pt-4 border-t border-amber-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-amber-50/70 border border-amber-300 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-raised flex items-center justify-center text-amber-600 bg-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-amber-900">
                    {lang === 'ar' ? 'تهيئة البرنامج' : 'Initialisation du Logiciel'}
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    {lang === 'ar'
                      ? 'تصفير سجل المبيعات والديون والمصروفات التجريبية، وضبط اسم ومعلومات المحل الجديد مع الحفاظ على الكتالوج الجاهز.'
                      : 'Réinitialisez les ventes, dettes et dépenses avec mise à jour des coordonnées de la boutique.'}
                  </p>
                </div>
              </div>
              <NeuButton
                variant="default"
                size="sm"
                onClick={() => setShowDeliveryModal(true)}
                icon={<Sparkles className="w-4 h-4 text-amber-600" />}
                className="bg-amber-100/80 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold whitespace-nowrap"
              >
                {lang === 'ar' ? 'تهيئة البرنامج' : 'Initialiser le Logiciel'}
              </NeuButton>
            </div>
          </div>

          {/* منطقة الصيانة الخطرة */}
          <div className="pt-4 border-t border-rose-200">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-rose-800">{t.dangerZone}</h4>
                  <p className="text-[11px] text-rose-600">
                    إعادة ضبط المصنع واسترجاع البيانات التجريبية الافتراضية.
                  </p>
                </div>
              </div>
              {showResetConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-700 font-bold">تأكيد الاستعادة؟</span>
                  <NeuButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      resetDatabase();
                      setShowResetConfirm(false);
                      showToast('تمت استعادة البيانات الافتراضية بنجاح', 'success');
                    }}
                  >
                    نعم، استعادة
                  </NeuButton>
                  <NeuButton
                    variant="default"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    تراجع
                  </NeuButton>
                </div>
              ) : (
                <NeuButton
                  variant="danger"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                >
                  {t.resetDemoData}
                </NeuButton>
              )}
            </div>
          </div>
        </NeuCard>
      )}

      {/* تبويب 4: المستخدمون والصلاحيات */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* قائمة المستخدمين الحاليين */}
          <NeuCard className="lg:col-span-7">
            <h3 className="font-extrabold text-base text-slate-800 pb-3 border-b border-slate-200">
              المستخدمون المسجلون
            </h3>

            <div className="mt-3 divide-y divide-slate-100">
              {usersList.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl neu-raised flex items-center justify-center text-blue-600 font-bold">
                      {user.role === 'admin' ? (
                        <Shield className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Users className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        user.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {user.role === 'admin' ? t.adminRole : t.cashierRole}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </NeuCard>

          {/* إضافة مستخدم جديد */}
          <NeuCard className="lg:col-span-5">
            <h3 className="font-extrabold text-base text-slate-800 pb-3 border-b border-slate-200">
              إضافة مستخدم جديد
            </h3>

            <form onSubmit={handleCreateUser} className="mt-3 space-y-3">
              <NeuInput
                label="الاسم الكامل"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="مثال: عمر زروقي"
              />

              <NeuInput
                label={t.username}
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="omar"
              />

              <NeuInput
                label={t.password}
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 px-1">
                  الدور والصلاحية
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="neu-input w-full rounded-xl py-2 px-3 text-xs font-bold text-slate-700 bg-white/70"
                >
                  <option value="cashier">أمين صندوق (Caisse) - بدون صلاحية حذف أو تقارير</option>
                  <option value="admin">مدير النظام (Admin) - كامل الصلاحيات</option>
                </select>
              </div>

              <div className="pt-2">
                <NeuButton type="submit" variant="primary" fullWidth>
                  إنشاء الحساب
                </NeuButton>
              </div>
            </form>
          </NeuCard>
        </div>
      )}

      {/* تبويب 5: الترخيص والتفعيل مدى الحياة */}
      {activeTab === 'license' && (
        <LicenseCard
          onOpenActivationModal={() => setShowActivationModal(true)}
        />
      )}

      {/* نافذة تهيئة متجر العميل الجديد */}
      <ClientOnboardingModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
      />

      {/* نافذة التفعيل وإدخال السيريال */}
      <ActivationModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        isClosable={true}
      />
    </div>
  );
};
