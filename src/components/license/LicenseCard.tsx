import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Laptop,
  Calendar,
  User,
  Copy,
  CheckCircle,
  RefreshCw,
  Code2,
  Trash2,
  Sparkles,
  Award,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import { NeuCard } from '../common/NeuCard';
import { deactivateSoftware } from '../../utils/license';

interface LicenseCardProps {
  onOpenActivationModal: () => void;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({
  onOpenActivationModal,
}) => {
  const { licenseResult, isActivated, lang, t, showToast, refreshLicense } = useApp();
  const [copied, setCopied] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const license = licenseResult?.license;
  const payload = license?.payload;

  const handleCopySerial = () => {
    if (payload?.serialKey) {
      navigator.clipboard.writeText(payload.serialKey);
      setCopied(true);
      showToast(lang === 'ar' ? 'تم نسخ مفتاح السيريال' : 'Clé copiée', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmDeactivate = async () => {
    await deactivateSoftware();
    await refreshLicense();
    setShowDeactivateConfirm(false);
    showToast(lang === 'ar' ? 'تم إلغاء تفعيل الترخيص' : 'Licence désactivée', 'info');
  };

  return (
    <NeuCard className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl neu-raised flex items-center justify-center ${
              isActivated ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {isActivated ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              {t.licenseTab} - TADJIR POS
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isActivated
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActivated ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {isActivated ? t.licenseActive : t.licenseUnactivated}
              </span>

              {payload?.type && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  {payload.type === 'lifetime'
                    ? t.lifetimeLicense
                    : payload.type === '1_year'
                    ? 'ترخيص سنوي'
                    : payload.type === '6_months'
                    ? 'ترخيص 6 أشهر'
                    : `Custom Trial (${payload.durationHours || payload.duration_hours || 24}h)`}
                </span>
              )}
              {payload?.expiresAt && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                  {licenseResult?.hoursRemaining !== null && licenseResult?.hoursRemaining !== undefined && licenseResult.hoursRemaining <= 72
                    ? `متبقي: ${licenseResult.hoursRemaining} ساعة`
                    : `متبقي: ${licenseResult?.daysRemaining ?? '-'} يوم`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NeuButton
            variant="primary"
            size="sm"
            onClick={onOpenActivationModal}
            icon={<Key className="w-4 h-4" />}
          >
            {isActivated
              ? lang === 'ar'
                ? 'تحديث / تغيير الترخيص'
                : 'Changer la licence'
              : t.activateNow}
          </NeuButton>
        </div>
      </div>

      {isActivated && payload ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* صندوق السيريال */}
          <div className="p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
            <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                {t.serialKey} :
              </span>
              <button
                type="button"
                onClick={handleCopySerial}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {copied ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copié') : (lang === 'ar' ? 'نسخ' : 'Copier')}</span>
              </button>
            </div>
            <code className="font-mono font-black text-sm text-slate-900 tracking-wider">
              {payload.serialKey}
            </code>
          </div>

          {/* صندوق العميل */}
          <div className="p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
            <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              {t.licensedTo} :
            </div>
            <div className="font-bold text-sm text-slate-900 truncate">
              {payload.customerName}
            </div>
          </div>

          {/* صندوق تاريخ التفعيل */}
          <div className="p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
            <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {t.activationDate} :
            </div>
            <div className="font-bold text-xs text-slate-800">
              {license ? new Date(license.activatedAt).toLocaleString() : '-'}
            </div>
          </div>

          {/* صندوق معرّف الجهاز */}
          <div className="p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
            <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              {t.deviceId} :
            </div>
            <div className="font-mono font-bold text-xs text-slate-800">
              {license?.deviceFingerprint || '-'}
            </div>
          </div>

          {/* صندوق تاريخ الانتهاء للتراخيص المؤقتة */}
          {payload.expiresAt && (
            <div className="p-3.5 rounded-2xl neu-inset bg-amber-50/60 border border-amber-200/70 md:col-span-2">
              <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>تاريخ انتهاء الصلاحية والمدة :</span>
                </span>
                <span className="font-bold text-amber-800">
                  {payload.durationHours || payload.duration_hours
                    ? `المدة: ${payload.durationHours || payload.duration_hours} ساعة (Hours)`
                    : ''}
                </span>
              </div>
              <div className="font-mono font-bold text-xs text-amber-900 flex items-center justify-between">
                <span>{new Date(payload.expiresAt).toLocaleString()}</span>
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                  {licenseResult?.hoursRemaining !== null && licenseResult?.hoursRemaining !== undefined && licenseResult.hoursRemaining <= 72
                    ? `متبقي: ${licenseResult.hoursRemaining} ساعة`
                    : `متبقي: ${licenseResult?.daysRemaining ?? '-'} يوم`}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">{t.licenseUnactivated}</p>
              <p className="text-[11px] opacity-80">
                {lang === 'ar'
                  ? 'يرجى إدخال مفتاح التفعيل الدائم للحصول على الدعم الكامل والتحديثات.'
                  : 'Veuillez activer votre logiciel avec une clé de licence valide.'}
              </p>
            </div>
          </div>
          <NeuButton size="sm" variant="primary" onClick={onOpenActivationModal}>
            {t.activateNow}
          </NeuButton>
        </div>
      )}

      {/* خيار إلغاء تفعيل هذا الجهاز عند التنشيط */}
      {isActivated && (
        <div className="mt-4 pt-3 border-t border-slate-200/70 flex justify-end">
          {showDeactivateConfirm ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-rose-700 font-semibold">
                {lang === 'ar' ? 'هل أنت متأكد من إلغاء التفعيل؟' : 'Confirmer la désactivation ?'}
              </span>
              <button
                type="button"
                onClick={confirmDeactivate}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
              >
                {lang === 'ar' ? 'نعم، إلغاء التفعيل' : 'Oui, désactiver'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors"
              >
                {lang === 'ar' ? 'تراجع' : 'Annuler'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إلغاء تفعيل هذا الجهاز' : 'Désactiver cette machine'}</span>
            </button>
          )}
        </div>
      )}
    </NeuCard>
  );
};
