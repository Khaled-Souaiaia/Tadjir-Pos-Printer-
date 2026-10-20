import React from 'react';
import { useApp } from '../contexts/AppContext';
import {
  Info,
  Globe,
  ExternalLink,
  Code2,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  PackageCheck,
  CheckCircle2,
  User,
} from 'lucide-react';
import { NeuCard } from '../components/common/NeuCard';
import { NeuButton } from '../components/common/NeuButton';

export const AboutPage: React.FC = () => {
  const { lang, t, licenseResult, isActivated } = useApp();

  const tadjirWebsite = 'https://tadjir-pos.vercel.app';
  const developerWebsite = 'https://khaled-souaiaia.vercel.app/';
  const appVersion = '1.0.0';

  const isAr = lang === 'ar';

  const payload = licenseResult?.license?.payload;
  const licenseType = payload?.type;

  // استخراج تسمية ونوع الترخيص الحالي بشكل ديناميكي ومتزامن
  const getLicenseTypeInfo = () => {
    if (!isActivated) {
      return {
        label: isAr ? 'نسخة غير مفعلة' : 'Non Activé',
        className: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    }

    switch (licenseType) {
      case 'lifetime':
        return {
          label: isAr ? 'ترخيص دائم مدى الحياة' : 'Licence À Vie',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case '1_year':
        return {
          label: isAr ? 'ترخيص سنوي (1 سنة)' : 'Licence Annuelle (1 an)',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case '6_months':
        return {
          label: isAr ? 'ترخيص 6 أشهر' : 'Licence 6 Mois',
          className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'trial':
        return {
          label: isAr ? 'نسخة تجريبية (Trial)' : 'Version d\'Essai',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      default:
        return {
          label: isAr ? 'نسخة مرخصة ومدى الحياة' : 'Licence Active',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
    }
  };

  const licenseInfo = getLicenseTypeInfo();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-blue-600 bg-blue-50/60">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {isAr ? 'حول البرنامج' : 'À Propos de TADJIR'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isAr
                ? 'معلومات عن نظام تاجير (TADJIR) لإدارة نقاط البيع والمطور'
                : 'Informations sur le système TADJIR et son développeur'}
            </p>
          </div>
        </div>

        <div className="neu-inset px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>v{appVersion} Production</span>
        </div>
      </div>

      {/* بطاقة الشعار والتعريف الرئيسي */}
      <NeuCard className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border border-white">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* شعار التطبيق */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl neu-raised flex items-center justify-center p-3.5 bg-slate-950 border border-slate-800 shrink-0 shadow-xl">
            <img
              src="./icon.png"
              alt="TADJIR Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* تفاصيل البرنامج */}
          <div className="flex-1 text-center md:text-start space-y-2.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                TADJIR <span className="text-blue-600">(تاجير)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-blue-600 text-white shadow-sm">
                v{appVersion}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-700 leading-relaxed max-w-2xl">
              {isAr
                ? 'نظام احترافي وشامل لإدارة المحلات التجارية، نقاط البيع السريعة (POS)، المخزون، المبيعات، ومتابعة ديون العملاء والموردين في الجزائر.'
                : 'Logiciel professionnel de gestion commerciale, point de vente ultra-rapide (POS), contrôle de stock et comptabilité pour les commerces.'}
            </p>

            <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <a
                href={tadjirWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-raised px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-white/90 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 border border-blue-200/80 cursor-pointer shadow-sm active:scale-95 select-none"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isAr ? 'موقع TADJIR الرسمي' : 'Site Web Officiel TADJIR'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={developerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-flat px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer select-none"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{isAr ? 'موقع المطور' : 'Site du Développeur'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-semibold text-slate-500">
              <span className="px-2.5 py-1 rounded-xl neu-inset bg-slate-100/60 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {isAr ? '100% يعمل بدون إنترنت (Offline)' : '100% Autonome Hors-Ligne'}
              </span>
              <span className="px-2.5 py-1 rounded-xl neu-inset bg-slate-100/60 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {isAr ? 'مسح باركود فوري' : 'Lecture Code-Barres Instantanée'}
              </span>
              <span className="px-2.5 py-1 rounded-xl neu-inset bg-slate-100/60 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                {isAr ? 'طباعة فواتير وحرارية 80mm' : 'Impression Tickets & A4'}
              </span>
            </div>
          </div>
        </div>
      </NeuCard>

      {/* قسم المطور والموقع الإلكتروني */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* بطاقة المطور فقط */}
        <NeuCard className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center neu-inset">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">
              {isAr ? 'معلومات المطور' : 'Informations sur le Développeur'}
            </h3>
          </div>

          <div className="space-y-3.5">
            {/* تفاصيل المطور */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                {isAr ? 'المطور ومصمم النظام:' : 'Développé par :'}
              </span>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                <span>Khaled Souaiaia</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {isAr
                  ? 'مهندس ومطور برمجيات وأنظمة إدارة الأعمال والمحاسبة'
                  : 'Ingénieur en développement logiciel & solutions de gestion'}
              </p>
            </div>

            {/* رابط موقع المطور الشخصي */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                {isAr ? 'الموقع الإلكتروني الرسمي للمطور:' : 'Site Web Officiel du Développeur :'}
              </span>
              <a
                href={developerWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="group neu-raised px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-blue-600 hover:text-blue-700 transition-all border border-blue-100/80 bg-white select-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center neu-inset shrink-0 group-hover:scale-105 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold truncate">
                    {developerWebsite}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </a>
              <p className="text-[10px] text-slate-400 mt-1.5 px-1 font-medium">
                {isAr
                  ? 'انقر على الرابط لفتح موقع المطور في متصفحك الافتراضي'
                  : 'Cliquez sur le lien pour ouvrir le site dans votre navigateur'}
              </p>
            </div>
          </div>
        </NeuCard>

        {/* بطاقة مواصفات البرنامج */}
        <NeuCard className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center neu-inset">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">
              {isAr ? 'المواصفات التقنية للنظام' : 'Spécifications Techniques'}
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">
                {isAr ? 'اسم التطبيق' : 'Nom de l\'application'}
              </span>
              <span className="font-bold text-slate-800">TADJIR (تاجير)</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">
                {isAr ? 'الموقع الرسمي' : 'Site Web Officiel'}
              </span>
              <a
                href={tadjirWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold font-mono text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>tadjir-pos.vercel.app</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">
                {isAr ? 'الإصدار الحالي' : 'Version actuelle'}
              </span>
              <span className="font-bold font-mono text-blue-600">v{appVersion}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">
                {isAr ? 'بيئة التشغيل' : 'Environnement'}
              </span>
              <span className="font-bold text-slate-800">
                {isAr ? 'تطبيق مكتبي مستقل (Desktop & Web Offline)' : 'Desktop & Web Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium">
                {isAr ? 'قاعدة البيانات' : 'Base de données'}
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {isAr ? 'محلية مشفرة 100% Offline' : 'Locale & Sécurisée'}
              </span>
            </div>
          </div>
        </NeuCard>
      </div>

      {/* بطاقة مميزات البرنامج الرئيسية */}
      <NeuCard className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center neu-inset">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-800">
            {isAr ? 'أهم مميزات نظام تاجير (TADJIR)' : 'Fonctionnalités Clés de TADJIR'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'سرعة المسح الفورية' : 'Scan Code-Barres Immédiat'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'استجابة فائقة لقارئات الباركود USB واللاسلكية بدون تأخير أو رسوم متحركة معطلة.'
                : 'Identification ultra-rapide des articles par lecteur code-barres USB ou Bluetooth.'}
            </p>
          </div>

          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'إدارة المخزون والتصنيفات' : 'Gestion de Stock & Rayons'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'إمكانية إنشاء التصنيفات ووحدات القياس مباشرة، مع تنبيهات انخفاض الكميات.'
                : 'Création directe des catégories et unités de mesure avec alertes de rupture.'}
            </p>
          </div>

          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'تتبع الديون والعملاء' : 'Gestion des Crédits & Clients'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'سجل تفصيلي لحسابات الزبائن والموردين مع حساب الفارق ومستحقات الدفع.'
                : 'Suivi rigoureux des créances clients et dettes fournisseurs.'}
            </p>
          </div>

          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'تقارير مالية وأرباح صافية' : 'Rapports & Bénéfices Nets'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'حساب تلقائي لصافي الأرباح اليومية والشهرية وتكاليف السلع والمصروفات.'
                : 'Calcul automatique des bénéfices nets, dépenses journalières et marges.'}
            </p>
          </div>

          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'تخصيص الفاتورة والهوية' : 'Tickets & Personnalisation'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'شعار المحل، العنوان، رقم الهاتف، السجل التجاري، ورسالة شكر مخصصة أسفل الوصل.'
                : 'Personnalisation complète du logo, coordonnées et pied de page du ticket.'}
            </p>
          </div>

          <div className="p-3 rounded-xl neu-inset bg-slate-50/60 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAr ? 'أمان ونسخ احتياطي' : 'Sauvegarde & Sécurité'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'تصدير واسترجاع قاعدة البيانات بنقرة واحدة، وصلاحيات منفصلة للمدير والكاشير.'
                : 'Exportation et restauration faciles de la base de données locale.'}
            </p>
          </div>
        </div>
      </NeuCard>

      {/* حقوق الملكية الفكرية والاتصال */}
      <div className="text-center py-4 space-y-2 border-t border-slate-200/80">
        <p className="text-xs font-bold text-slate-700">
          TADJIR POS &copy; {new Date().getFullYear()} — {isAr ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-500 font-medium">
          <span>
            {isAr ? 'موقع البرنامج الرسمي: ' : 'Site Officiel : '}
            <a
              href={tadjirWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <span>tadjir-pos.vercel.app</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span>
            {isAr ? 'تطوير المهندس: ' : 'Développé par : '}
            <a
              href={developerWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Khaled Souaiaia</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};
