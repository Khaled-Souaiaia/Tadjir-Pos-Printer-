import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Lock,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { MASTER_PUBLIC_KEY_JWK, MASTER_PRIVATE_KEY_JWK } from '../utils/crypto';
import { changeDeveloperPassword } from '../utils/auth';

interface KeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeySettingsModal: React.FC<KeySettingsModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // تغيير كلمة المرور
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // إعدادات مهلة القفل التلقائي
  const [autoLockMin, setAutoLockMin] = useState(() => {
    return localStorage.getItem('tadjir_lm_autolock_minutes') || '5';
  });

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass !== confirmPass) {
      setPassError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    if (newPass.length < 8) {
      setPassError('يجب أن لا تقل كلمة المرور عن 8 خانات.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeDeveloperPassword(currentPass, newPass);
      if (res.success) {
        setPassSuccess(res.message);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setPassError(res.message);
      }
    } catch {
      setPassError('حدث خطأ أثناء تغيير كلمة المرور.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleAutoLockChange = (min: string) => {
    setAutoLockMin(min);
    localStorage.setItem('tadjir_lm_autolock_minutes', min);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl text-slate-100 shadow-2xl my-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                إعدادات الأمان والمفاتيح التشفيرية
              </h3>
              <p className="text-xs text-slate-400">
                إدارة المفاتيح غير المتناظرة وحماية وحدة المطور
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

        <div className="mt-5 space-y-6">
          {/* قسم المفتاح العام المدمج في TADJIR */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                المفتاح العام (Master Public Key) المدمج في برنامج الزبائن TADJIR :
              </span>
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(MASTER_PUBLIC_KEY_JWK, null, 2), 'pub')}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'pub' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'pub' ? 'تم النسخ' : 'نسخ JWK'}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800 overflow-x-auto">
              {JSON.stringify(MASTER_PUBLIC_KEY_JWK, null, 2)}
            </pre>
            <p className="text-[10px] text-slate-500 mt-1.5">
              هذا المفتاح العام آمن ومضمّن في TADJIR ليقوم بالتحقق فقط من التواقيع.
            </p>
          </div>

          {/* قسم المفتاح الخاص المحمي */}
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-400" />
                المفتاح الخاص للتوقيع (Master Private Key - Ed25519) :
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                محمي داخل License Manager فقط
              </span>
            </div>
            <div className="text-xs text-slate-400">
              الخوارزمية: <span className="font-mono text-white">Ed25519 / OKP</span> | المنحنى: <span className="font-mono text-white">Ed25519</span> | التشفير: <span className="text-emerald-400 font-bold">نشط ومؤمّن</span>
            </div>
          </div>

          {/* تغيير كلمة المرور للمطور */}
          <form onSubmit={handlePasswordChange} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200">
              تغيير كلمة مرور المطور (Master Developer Password) :
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">كلمة المرور الحالية :</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="الحالية..."
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">كلمة المرور الجديدة :</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="8 أحرف على الأقل..."
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">تأكيد الجديدة :</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="إعادة إدخال..."
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {passError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                {passSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isChangingPass || !currentPass || !newPass}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                حفظ كلمة المرور الجديدة
              </button>
            </div>
          </form>

          {/* القفل التلقائي */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">مهلة القفل التلقائي عند عدم النشاط :</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                يقفل البرنامج شاشة المطور لحمايتها في حال ترك الكمبيوتر دون مراقبة.
              </p>
            </div>
            <select
              value={autoLockMin}
              onChange={(e) => handleAutoLockChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="2">دقيقتان</option>
              <option value="5">5 دقائق (مستحسن)</option>
              <option value="15">15 دقيقة</option>
              <option value="30">30 دقيقة</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
