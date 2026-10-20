import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Database,
  FlaskConical,
  Lock,
  Settings,
  Sparkles,
  Terminal,
  ExternalLink,
  Store,
} from 'lucide-react';
import { DeveloperLogin } from './components/DeveloperLogin';
import { LicenseGenerator } from './components/LicenseGenerator';
import { LicenseList } from './components/LicenseList';
import { TestVerificationBench } from './components/TestVerificationBench';
import { KeySettingsModal } from './components/KeySettingsModal';
import { checkDeveloperSession, lockDeveloperSession } from './utils/auth';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkDeveloperSession());
  const [activeTab, setActiveTab] = useState<'generate' | 'list' | 'test'>('generate');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // التحقق الدوري من مهلة الخمول
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const valid = checkDeveloperSession();
      if (!valid) {
        setIsAuthenticated(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLock = () => {
    lockDeveloperSession();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <DeveloperLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* خلفية شبكية برمجية خفيفة */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* الشريط العلوي الخاص بالمطور */}
      <header className="relative z-10 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">
                  TADJIR License Manager
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Developer Suite v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                منظومة التوليد والتوقيع الرقمي بالمفتاح الخاص (Ed25519) - خاص بالمطور فقط
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/"
              className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/50 hover:bg-emerald-900 text-emerald-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="العودة إلى نظام المحل ونقاط البيع DzPOS"
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">نظام المحل (DzPOS Pro)</span>
            </a>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="إعدادات المفاتيح والأمان"
            >
              <Settings className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">إعدادات الأمان والمفاتيح</span>
            </button>

            <button
              type="button"
              onClick={handleLock}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="قفل الجلسة"
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span>قفل الجلسة</span>
            </button>
          </div>
        </div>

        {/* أزرار التبويبات الرئيسية */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>توليد ترخيص جديد (Signer)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>سجل التراخيص الصادرة (Registry)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>مختبر الفحص والمحاكاة (Verifier Bench)</span>
          </button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {activeTab === 'generate' && (
          <LicenseGenerator onLicenseCreated={() => {}} />
        )}

        {activeTab === 'list' && <LicenseList />}

        {activeTab === 'test' && <TestVerificationBench />}
      </main>

      {/* نافذة الإعدادات والمفاتيح */}
      <KeySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* التذييل */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            TADJIR License Manager © 2026 • Asymmetric Ed25519 Cryptographic Suite
          </span>
          <span className="text-[11px] text-blue-400 font-mono">
            Private Key Isolated from TADJIR Client Distribution
          </span>
        </div>
      </footer>
    </div>
  );
};
