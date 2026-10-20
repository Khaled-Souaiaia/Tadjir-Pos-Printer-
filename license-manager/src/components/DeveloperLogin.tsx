import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { authenticateDeveloper, getLockoutStatus } from '../utils/auth';

interface DeveloperLoginProps {
  onSuccess: () => void;
}

export const DeveloperLogin: React.FC<DeveloperLoginProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    const status = getLockoutStatus();
    if (status.isLocked) {
      setLockoutSeconds(status.remainingSeconds);
    }
  }, []);

  // عداد تنازلي للقفل
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authenticateDeveloper(password);
      if (result.success) {
        onSuccess();
      } else {
        setErrorMessage(result.message || 'فشل التحقق من كلمة المرور.');
        if (result.lockoutSeconds) {
          setLockoutSeconds(result.lockoutSeconds);
        }
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء محاولة تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* خلفية جمالية شبكية برمجية */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* شارة الأمان العلوية */}
        <div className="text-center pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Terminal className="w-3.5 h-3.5" />
            Developer Access Only
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            TADJIR License Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            برنامج المطور لإصدار وتوقيع تراخيص برنامج تاجر (Ed25519)
          </p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>كلمة مرور المطور (Master Key) :</span>
              <button
                type="button"
                onClick={() => setPassword('Admin@Tajir2026!')}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-normal cursor-pointer"
                title="انقر للتعبئة التلقائية"
              >
                الافتراضية: Admin@Tajir2026!
              </button>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                disabled={isLoading || lockoutSeconds > 0}
                required
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* تنبيه الخطأ أو القفل */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lockoutSeconds > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>القفل الأمني نشط. المحاولة بعد {lockoutSeconds} ثانية.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || lockoutSeconds > 0 || !password}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <span>جاري التحقق...</span>
            ) : (
              <>
                <span>تسجيل الدخول إلى وحدة المطور</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500 space-y-3">
          <p className="flex items-center justify-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            المفتاح الخاص (Private Key) محفوظ ومحمي حصرياً داخل هذا البرنامج
          </p>
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <span>← العودة إلى واجهة المتجر ونقاط البيع (DzPOS Pro)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
