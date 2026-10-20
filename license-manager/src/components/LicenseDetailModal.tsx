import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Key,
  Laptop,
  Calendar,
  User,
  Phone,
  MapPin,
  Coins,
  Copy,
  CheckCircle,
  Download,
  Trash2,
  RefreshCw,
  Repeat,
  FileCode,
  FileCheck,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Clock,
  History,
} from 'lucide-react';
import { ManagedLicenseRecord, LicenseStatus } from '../types';
import {
  changeLicenseStatus,
  revokeLicense,
  transferLicenseToNewDevice,
  renewLicense,
} from '../utils/storage';
import { formatAppDateTime } from './LicenseGenerator';
import { LicenseRemoteActions } from './LicenseRemoteActions';

interface LicenseDetailModalProps {
  license: ManagedLicenseRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const LicenseDetailModal: React.FC<LicenseDetailModalProps> = ({
  license,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  // حالات العمليات
  const [showRevokeInput, setShowRevokeInput] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const [showTransferInput, setShowTransferInput] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');

  const [showRenewInput, setShowRenewInput] = useState(false);
  const [newDays, setNewDays] = useState(365);

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([license.activationToken], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${license.customerName.replace(/\s+/g, '_')}_${license.serialKey}.tadjir-license`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) return;
    setIsProcessing(true);
    await changeLicenseStatus(license.id, 'revoked', revokeReason.trim());
    setIsProcessing(false);
    setShowRevokeInput(false);
    onUpdate();
    onClose();
  };

  const handleReactivate = async () => {
    setIsProcessing(true);
    await changeLicenseStatus(license.id, 'active', 'إعادة التفعيل المركزي');
    setIsProcessing(false);
    onUpdate();
    onClose();
  };

  const handleSuspend = async () => {
    setIsProcessing(true);
    await changeLicenseStatus(license.id, 'suspended', 'تعليق الترخيص مؤقتاً');
    setIsProcessing(false);
    onUpdate();
    onClose();
  };

  const handleTransfer = async () => {
    if (!newDeviceId.trim()) return;
    setIsProcessing(true);
    await transferLicenseToNewDevice(license.id, newDeviceId.trim().toUpperCase());
    setIsProcessing(false);
    setShowTransferInput(false);
    onUpdate();
    onClose();
  };

  const handleRenew = async () => {
    setIsProcessing(true);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + newDays);
    await renewLicense(license.id, expDate.toISOString(), `تجديد لمدة ${newDays} يوم`);
    setIsProcessing(false);
    setShowRenewInput(false);
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl text-slate-100 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        {/* الترويسة */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                تفاصيل الشهادة: {license.customerName}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {license.licenseId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* شبكة المعلومات الأساسية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">الحالة المركزية :</span>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                license.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : license.status === 'revoked'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : license.status === 'suspended'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600'
              }`}
            >
              {license.status === 'active'
                ? 'نشط (Active)'
                : license.status === 'revoked'
                ? 'ملغي / معطّل (Revoked)'
                : license.status === 'suspended'
                ? 'معلق مؤقتاً (Suspended)'
                : 'منتهي الصلاحية (Expired)'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">نوع الترخيص :</span>
            <span className="text-xs font-bold text-blue-400 block mt-1">
              {license.type === 'custom_trial' || license.type === 'trial' ? 'Custom Trial' : license.type}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">مدة الصلاحية :</span>
            <span className="text-xs font-bold text-amber-300 block mt-1 font-mono">
              {license.duration_hours || license.durationHours
                ? `${license.duration_hours || license.durationHours} Hours`
                : license.type === 'lifetime'
                ? 'Lifetime'
                : 'محددة بالشهادة'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">المبلغ المقبوض :</span>
            <span className="text-xs font-bold text-amber-400 block mt-1 font-mono">
              {license.pricePaidDzd?.toLocaleString() || 0} د.ج
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">تاريخ الإصدار :</span>
            <span className="text-xs font-mono font-bold text-slate-200 block mt-1">
              {formatAppDateTime(license.issuedAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">تاريخ الانتهاء :</span>
            <span className="text-xs font-mono font-bold text-amber-300 block mt-1">
              {license.expiresAt ? formatAppDateTime(license.expiresAt) : 'دائم (Lifetime)'}
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">ربط الجهاز :</span>
            <span className="text-xs font-mono font-bold text-slate-300 block mt-1 truncate">
              {license.deviceId || 'عام (أي جهاز)'}
            </span>
          </div>
        </div>

        {/* السيريال والرمز */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              مفتاح السيريال :
            </span>
            <button
              type="button"
              onClick={() => handleCopy(license.serialKey, 'serial')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copied === 'serial' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied === 'serial' ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>
          <code className="text-sm font-mono font-bold text-blue-400 tracking-wider">
            {license.serialKey}
          </code>
        </div>

        <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              رمز التفعيل المشفر (TADJIR-LIC Token) :
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(license.activationToken, 'token')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied === 'token' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'token' ? 'تم النسخ' : 'نسخ الرمز'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3 text-blue-400" />
                <span>تحميل ملف</span>
              </button>
            </div>
          </div>
          <textarea
            readOnly
            rows={2}
            value={license.activationToken}
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px] focus:outline-none select-all"
          />
        </div>

        {/* تفاصيل التوقيع التشفيري Ed25519 */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px]">
          <div className="text-slate-400 font-bold mb-1 flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            التوقيع الرقمي (Ed25519 Digital Signature) :
          </div>
          <code className="text-slate-400 font-mono text-[10px] break-all block bg-slate-900 p-2 rounded-lg border border-slate-800">
            {license.signature}
          </code>
        </div>

        {/* لوحات العمليات التفاعلية (إلغاء، نقل، تجديد) */}
        {showRevokeInput && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-in fade-in">
            <h4 className="text-xs font-bold text-rose-400 mb-2">إلغاء الترخيص وسحبه</h4>
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="سبب الإلغاء (مثال: استرجاع مبلغ، عدم سداد...)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs mb-3 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevokeInput(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isProcessing || !revokeReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        )}

        {showTransferInput && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 animate-in fade-in">
            <h4 className="text-xs font-bold text-blue-400 mb-2">نقل الترخيص إلى جهاز كمبيوتر جديد</h4>
            <p className="text-[11px] text-slate-400 mb-2">
              سيقوم النظام بإعادة توقيع الشهادة بالمفتاح الخاص وربطها بالمعرف الجديد.
            </p>
            <input
              type="text"
              value={newDeviceId}
              onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
              placeholder="DZ-XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs mb-3 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransferInput(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={isProcessing || !newDeviceId.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                إعادة التوقيع والنقل
              </button>
            </div>
          </div>
        )}

        {showRenewInput && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 animate-in fade-in">
            <h4 className="text-xs font-bold text-indigo-400 mb-2">تجديد أو تمديد صلاحية الترخيص</h4>
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setNewDays(365)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  newDays === 365 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                سنة واحدة (+365 يوم)
              </button>
              <button
                type="button"
                onClick={() => setNewDays(180)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  newDays === 180 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                6 أشهر (+180 يوم)
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenewInput(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                تأكيد التجديد والتوقيع
              </button>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات السريعة */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTransferInput(!showTransferInput);
                setShowRevokeInput(false);
                setShowRenewInput(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Repeat className="w-3.5 h-3.5 text-blue-400" />
              <span>نقل لجهاز آخر</span>
            </button>

            {license.type !== 'lifetime' && (
              <button
                type="button"
                onClick={() => {
                  setShowRenewInput(!showRenewInput);
                  setShowRevokeInput(false);
                  setShowTransferInput(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>تجديد الصلاحية</span>
              </button>
            )}

            {/* إذا كان الترخيص ملغياً أو معلقاً: إمكانية إعادة التفعيل الفوري (Reactivate) */}
            {(license.status === 'revoked' || license.status === 'suspended') && (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>إعادة التفعيل المركزي (Reactivate)</span>
              </button>
            )}

            {/* إذا كان الترخيص نشطاً: إمكانية التعليق المؤقت (Suspend) */}
            {license.status === 'active' && (
              <button
                type="button"
                onClick={handleSuspend}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>تعليق مؤقت (Suspend)</span>
              </button>
            )}

            {/* إذا لم يكن الترخيص ملغياً: إمكانية الإلغاء المركزي (Revoke) */}
            {license.status !== 'revoked' && (
              <button
                type="button"
                onClick={() => {
                  setShowRevokeInput(!showRevokeInput);
                  setShowTransferInput(false);
                  setShowRenewInput(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إلغاء الترخيص (Revoke)</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
