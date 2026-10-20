import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Store,
  Globe,
  User as UserIcon,
  LogOut,
  WifiOff,
  Coins,
  ShieldCheck,
  UserCheck,
  Volume2,
  VolumeX,
  ShoppingCart,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';

interface NavbarProps {
  onLockScreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLockScreen }) => {
  const {
    currentUser,
    logout,
    lang,
    setLang,
    t,
    settings,
    sales,
    soundEnabled,
    toggleSound,
    isAdmin,
    cartTotals,
  } = useApp();

  // حساب مبيعات اليوم نقدًا
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales
    .filter((s) => s.createdAt.startsWith(today))
    .reduce((sum, s) => sum + s.total, 0);

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'fr' : 'ar');
  };

  return (
    <header className="neu-flat sticky top-0 z-30 px-6 py-3 border-b border-white/60 mb-5 flex items-center justify-between transition-all">
      {/* اسم المتجر والشعار */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl neu-raised flex items-center justify-center overflow-hidden bg-slate-950 p-1 border border-slate-800">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Store" className="w-full h-full object-contain" />
          ) : (
            <img src="./icon.png" alt="TADJIR" className="w-full h-full object-contain" />
          )}
        </div>
        <div>
          <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
            {lang === 'ar' ? settings.storeNameAr : settings.storeNameFr}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{settings.wilaya}</span>
          </div>
        </div>
      </div>

      {/* العدادات السريعة ومؤشرات الصندوق ومجموع السلة الحالي */}
      <div className="flex-1 flex items-center gap-2.5 sm:gap-3.5 mx-3 sm:mx-6 min-w-0">
        {/* إيرادات اليوم */}
        <div className="hidden sm:flex shrink-0 neu-inset px-3 sm:px-3.5 py-1.5 rounded-xl items-center gap-2.5 transition-all">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
          </div>
          <div className="flex flex-col text-start">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 leading-tight">
              {t.dailyRevenue}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap">
              {todaySales.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{t.currency}</span>
            </span>
          </div>
        </div>

        {/* إجمالي البيع الحالي (سلة المشتريات الحالية) */}
        <div className="flex-1 neu-raised px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/80 transition-all shadow-sm min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex flex-col text-start min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-black text-blue-900 leading-tight truncate">
                  {t.currentSaleTotal}
                </span>
                {cartTotals.itemsCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600/15 text-blue-700 tabular-nums shrink-0">
                    {cartTotals.itemsCount} {lang === 'ar' ? 'سلع' : 'art.'}
                  </span>
                )}
              </div>
              <span className="hidden md:inline text-[10px] text-slate-500 font-medium truncate">
                {cartTotals.itemsCount === 0
                  ? (lang === 'ar' ? 'السلة فارغة وجاهزة لاستقبال المواد' : 'Panier vide et prêt')
                  : (lang === 'ar' ? 'المبلغ الصافي المطلوب للدفع' : 'Net à payer en cours')}
              </span>
            </div>
          </div>
          <div className="text-end shrink-0 ps-2">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-600 tabular-nums tracking-tight leading-none inline-flex items-baseline gap-1.5">
              {cartTotals.total.toLocaleString()} <span className="text-xs sm:text-sm md:text-base font-bold text-blue-500">{t.currency}</span>
            </span>
          </div>
        </div>
      </div>

      {/* الإجراءات والمستخدم واللغة */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* تفعيل / كتم الصوت */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl neu-raised transition-colors ${
            soundEnabled ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={soundEnabled ? 'كتم أصوات الكاشير' : 'تفعيل أصوات الكاشير'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* تبديل اللغة */}
        <NeuButton
          size="sm"
          variant="default"
          onClick={toggleLanguage}
          icon={<Globe className="w-3.5 h-3.5 text-blue-600" />}
          className="font-bold text-xs"
          title="Changer de langue / تغيير اللغة"
        >
          {lang === 'ar' ? 'Français' : 'العربية'}
        </NeuButton>

        {/* بطاقة المستخدم */}
        <div className="neu-inset px-3 py-1.5 rounded-xl flex items-center gap-2">
          {currentUser?.role === 'admin' ? (
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          ) : (
            <UserCheck className="w-4 h-4 text-emerald-600" />
          )}
          <div className="flex flex-col text-start">
            <span className="text-xs font-bold text-slate-800 leading-none">
              {currentUser?.fullName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {currentUser?.role === 'admin' ? t.adminRole : t.cashierRole}
            </span>
          </div>
        </div>

        {/* تسجيل الخروج */}
        <NeuButton
          size="sm"
          variant="default"
          onClick={logout}
          icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
          title={t.logout}
        >
          <span className="hidden sm:inline">{t.logout}</span>
        </NeuButton>
      </div>
    </header>
  );
};
