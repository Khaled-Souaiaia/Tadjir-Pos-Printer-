import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Lock, User as UserIcon, Globe } from 'lucide-react';
import { NeuButton } from '../components/common/NeuButton';
import { NeuInput } from '../components/common/NeuInput';

export const LoginPage: React.FC = () => {
  const { login, lang, setLang, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const success = login(username, password);
    if (!success) {
      setErrorMsg(t.invalidCredentials);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* عناصر خلفية جمالية بتدرج ناعم */}
      <div className="absolute top-1/4 start-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* زر تبديل اللغة في الزاوية العلوية */}
      <div className="absolute top-6 end-6 z-20">
        <button
          onClick={() => setLang(lang === 'ar' ? 'fr' : 'ar')}
          className="neu-raised px-4 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 hover:text-blue-600 transition-colors"
        >
          <Globe className="w-4 h-4 text-blue-600" />
          <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
        </button>
      </div>

      {/* بطاقة تسجيل الدخول Neumorphic Glass Box */}
      <div className="w-full max-w-md relative z-10">
        <div className="neu-flat rounded-3xl p-8 backdrop-blur-xl border border-white/70 shadow-2xl">
          {/* الشعار والعنوان */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-2xl neu-raised mx-auto flex items-center justify-center mb-3 shadow-md overflow-hidden bg-slate-950 p-1.5 border border-slate-800">
              <img src="./icon.png" alt="TADJIR" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.appName}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {t.appTagline}
            </p>
          </div>

          {/* نموذج الدخول */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <NeuInput
              label={t.username}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              icon={<UserIcon className="w-4 h-4" />}
              autoFocus
            />

            <NeuInput
              label={t.password}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
            />

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-bold text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-100/70 p-2 rounded-xl">
              <span>الحساب الافتراضي: <strong className="font-mono text-slate-700">admin / admin</strong></span>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin');
                }}
                className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer underline"
              >
                تعبئة تلقائية
              </button>
            </div>

            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="mt-2"
            >
              {t.loginButton}
            </NeuButton>
          </form>
        </div>

        {/* معلومات أسفل البطاقة */}
        <div className="text-center mt-4 text-xs text-slate-400">
          <span>نظام التشغيل المحلي المستقل بدون إنترنت (Offline Local SQLite)</span>
        </div>
      </div>
    </div>
  );
};
