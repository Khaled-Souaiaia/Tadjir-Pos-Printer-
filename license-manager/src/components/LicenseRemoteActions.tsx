import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Calendar,
  Laptop,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ManagedLicenseRecord } from '../types';
import {
  changeLicenseStatus,
  extendLicenseExpiration,
  resetDeviceBinding,
  fetchLicenseStatus,
} from '../utils/storage';

interface LicenseRemoteActionsProps {
  license: ManagedLicenseRecord;
  onUpdate: () => void;
  onClose?: () => void;
}

export const LicenseRemoteActions: React.FC<LicenseRemoteActionsProps> = ({
  license,
  onUpdate,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Revoke state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Extend expiration state
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [additionalDays, setAdditionalDays] = useState(30);

  // Reset device state
  const [showResetDeviceConfirm, setShowResetDeviceConfirm] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      showMessage('error', 'يرجى إدخال سبب الإلغاء');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await changeLicenseStatus(license.id, 'revoked', revokeReason.trim());
      if (result) {
        showMessage('success', 'تم إلغاء الترخيص بنجاح. سيتم حظر الوصول عند التحقق التالي من TADJIR POS.');
        setShowRevokeConfirm(false);
        setRevokeReason('');
        onUpdate();
      } else {
        showMessage('error', 'فشل إلغاء الترخيص');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء إلغاء الترخيص');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setIsProcessing(true);
    try {
      const result = await changeLicenseStatus(license.id, 'active', 'إعادة تفعيل الترخيص من قبل المدير');
      if (result) {
        showMessage('success', 'تم إعادة تفعيل الترخيص بنجاح. سيتم استعادة الوصول عند التحقق التالي.');
        onUpdate();
      } else {
        showMessage('error', 'فشل إعادة تفعيل الترخيص');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء إعادة التفعيل');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async () => {
    setIsProcessing(true);
    try {
      const result = await changeLicenseStatus(license.id, 'suspended', 'تعليق الترخيص مؤقتاً');
      if (result) {
        showMessage('success', 'تم تعليق الترخيص مؤقتاً بنجاح.');
        onUpdate();
      } else {
        showMessage('error', 'فشل تعليق الترخيص');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء تعليق الترخيص');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtendExpiration = async () => {
    if (!additionalDays || additionalDays <= 0) {
      showMessage('error', 'يرجى إدخال عدد أيام صالح');
      return;
    }

    setIsProcessing(true);
    try {
      const additionalHours = additionalDays * 24;
      const result = await extendLicenseExpiration(license.licenseId, additionalHours);
      if (result.success) {
        showMessage('success', `تم تمديد الترخيص بنجاح لمدة ${additionalDays} يوم إضافي.`);
        setShowExtendDialog(false);
        onUpdate();
      } else {
        showMessage('error', result.message || 'فشل تمديد الترخيص');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء تمديد الترخيص');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDevice = async () => {
    setIsProcessing(true);
    try {
      const result = await resetDeviceBinding(license.licenseId);
      if (result.success) {
        showMessage('success', 'تم إعادة تعيين ربط الجهاز بنجاح. يمكن الآن تفعيل الترخيص على جهاز جديد.');
        setShowResetDeviceConfirm(false);
        onUpdate();
      } else {
        showMessage('error', result.message || 'فشل إعادة تعيين ربط الجهاز');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء إعادة تعيين ربط الجهاز');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = async () => {
    setIsProcessing(true);
    try {
      const result = await fetchLicenseStatus(license.licenseId);
      if (result.success) {
        showMessage('success', 'تم تحديث حالة الترخيص من السيرفر المركزي بنجاح.');
        onUpdate();
      } else {
        showMessage('error', result.message || 'فشل تحديث الحالة');
      }
    } catch (err) {
      showMessage('error', 'حدث خطأ أثناء تحديث الحالة');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Message Display */}
      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
              : 'bg-rose-900/50 text-rose-300 border border-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
        <span className="text-xs text-slate-400">الحالة الحالية:</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            license.status === 'active'
              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
              : license.status === 'revoked'
              ? 'bg-rose-900/50 text-rose-300 border border-rose-700'
              : license.status === 'suspended'
              ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {license.status === 'active'
            ? 'نشط'
            : license.status === 'revoked'
            ? 'ملغى'
            : license.status === 'suspended'
            ? 'معلق'
            : license.status === 'expired'
            ? 'منتهي'
            : license.status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Refresh Status */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isProcessing}
          className="p-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-700/50"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          تحديث الحالة
        </button>

        {/* Revoke/Reactivate */}
        {license.status === 'active' || license.status === 'suspended' ? (
          <button
            type="button"
            onClick={() => setShowRevokeConfirm(true)}
            disabled={isProcessing}
            className="p-3 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-rose-700/50"
          >
            <ShieldAlert className="w-4 h-4" />
            إلغاء الترخيص
          </button>
        ) : license.status === 'revoked' ? (
          <button
            type="button"
            onClick={handleReactivate}
            disabled={isProcessing}
            className="p-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-700/50"
          >
            <PlayCircle className="w-4 h-4" />
            إعادة التفعيل
          </button>
        ) : null}

        {/* Suspend (only if active) */}
        {license.status === 'active' && (
          <button
            type="button"
            onClick={handleSuspend}
            disabled={isProcessing}
            className="p-3 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-700/50"
          >
            <PauseCircle className="w-4 h-4" />
            تعليق مؤقت
          </button>
        )}

        {/* Extend Expiration (only if not lifetime) */}
        {license.type !== 'lifetime' && (
          <button
            type="button"
            onClick={() => setShowExtendDialog(true)}
            disabled={isProcessing}
            className="p-3 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-700/50"
          >
            <Calendar className="w-4 h-4" />
            تمديد الصلاحية
          </button>
        )}

        {/* Reset Device Binding */}
        <button
          type="button"
          onClick={() => setShowResetDeviceConfirm(true)}
          disabled={isProcessing}
          className="p-3 bg-violet-900/30 hover:bg-violet-900/50 text-violet-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-violet-700/50"
        >
          <Laptop className="w-4 h-4" />
          إعادة تعيين الجهاز
        </button>
      </div>

      {/* Revoke Confirmation Dialog */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">تأكيد إلغاء الترخيص</h3>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              هل أنت متأكد من إلغاء هذا الترخيص؟ سيتم حظر الوصول إلى TADJIR POS عند التحقق التالي من السيرفر أو عند
              إعادة فتح البرنامج.
            </p>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2 font-bold">سبب الإلغاء:</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="مثال: عدم الدفع، انتهاك الشروط، طلب العميل..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-rose-500"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isProcessing || !revokeReason.trim()}
                className="flex-1 p-3 bg-rose-900 hover:bg-rose-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRevokeConfirm(false);
                  setRevokeReason('');
                }}
                disabled={isProcessing}
                className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Expiration Dialog */}
      {showExtendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-black text-white">تمديد صلاحية الترخيص</h3>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              أدخل عدد الأيام الإضافية التي تريد إضافتها إلى صلاحية هذا الترخيص:
            </p>

            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2 font-bold">عدد الأيام الإضافية:</label>
              <input
                type="number"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(parseInt(e.target.value) || 0)}
                min="1"
                max="3650"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExtendExpiration}
                disabled={isProcessing || additionalDays <= 0}
                className="flex-1 p-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'جاري التمديد...' : 'تأكيد التمديد'}
              </button>
              <button
                type="button"
                onClick={() => setShowExtendDialog(false)}
                disabled={isProcessing}
                className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Device Binding Confirmation */}
      {showResetDeviceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-900/30 flex items-center justify-center">
                <Laptop className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-black text-white">إعادة تعيين ربط الجهاز</h3>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              هل تريد إزالة ربط الجهاز الحالي؟ سيسمح ذلك بتفعيل الترخيص على جهاز كمبيوتر جديد.
            </p>

            {license.deviceId && (
              <div className="mb-4 p-3 bg-slate-950 rounded-xl">
                <span className="text-xs text-slate-500">الجهاز المربوط حالياً:</span>
                <div className="text-sm text-white font-mono mt-1">{license.deviceId}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetDevice}
                disabled={isProcessing}
                className="flex-1 p-3 bg-violet-900 hover:bg-violet-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'جاري إعادة التعيين...' : 'تأكيد إعادة التعيين'}
              </button>
              <button
                type="button"
                onClick={() => setShowResetDeviceConfirm(false)}
                disabled={isProcessing}
                className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
