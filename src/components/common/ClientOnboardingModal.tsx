import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { AppSettings } from '../../types';
import {
  Sparkles,
  Store,
  CheckCircle2,
  FileCheck,
  Package,
  Volume2,
  VolumeX,
  X,
  ShieldCheck,
} from 'lucide-react';
import { NeuButton } from './NeuButton';
import { NeuInput } from './NeuInput';

interface ClientOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientOnboardingModal: React.FC<ClientOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, prepareForDelivery, soundEnabled, toggleSound, lang, t } = useApp();

  const [storeNameAr, setStoreNameAr] = useState(settings.storeNameAr);
  const [storeNameFr, setStoreNameFr] = useState(settings.storeNameFr);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [wilaya, setWilaya] = useState(settings.wilaya);
  const [rcNumber, setRcNumber] = useState(settings.rcNumber);
  const [nifNumber, setNifNumber] = useState(settings.nifNumber);
  const [tvaRate, setTvaRate] = useState(settings.tvaRate);
  const [keepCatalog, setKeepCatalog] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: Partial<AppSettings> = {
      storeNameAr: storeNameAr.trim() || 'متجر تجاري',
      storeNameFr: storeNameFr.trim() || 'Commerce',
      phone: phone.trim() || '-',
      address: address.trim() || 'الجزائر',
      wilaya: wilaya.trim() || 'الجزائر العاصمة',
      rcNumber: rcNumber.trim() || '-',
      nifNumber: nifNumber.trim() || '-',
      tvaRate: Number(tvaRate) || 0,
    };

    prepareForDelivery(config, keepCatalog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="neu-flat rounded-3xl p-6 sm:p-8 w-full max-w-2xl bg-white/95 my-8 shadow-2xl border border-white">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl neu-raised flex items-center justify-center text-blue-600 bg-blue-50/50">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                {lang === 'ar'
                  ? 'تهيئة البرنامج'
                  : 'Initialisation du Logiciel'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'ar'
                  ? 'اضبط بيانات المتجر الجديد بنقرة واحدة لتسليمه نظيفاً وجاهزاً للعمل الفوري'
                  : 'Configurez la boutique du client pour une mise en service propre et immédiate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نموذج تهيئة متجر العميل */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeuInput
              label="اسم المحل (بالعربية)"
              required
              value={storeNameAr}
              onChange={(e) => setStoreNameAr(e.target.value)}
              placeholder="سوبرماركت التوفيق"
              icon={<Store className="w-4 h-4" />}
            />
            <NeuInput
              label="اسم المحل (بالفرنسية)"
              value={storeNameFr}
              onChange={(e) => setStoreNameFr(e.target.value)}
              placeholder="Superette El Tawfik"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NeuInput
              label="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0550 12 34 56"
            />
            <NeuInput
              label="الولاية"
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              placeholder="16 - الجزائر"
            />
            <NeuInput
              label="العنوان"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="شارع الاستقلال"
            />
          </div>

          {/* البيانات القانونية والجبائية */}
          <div className="p-3.5 rounded-2xl neu-inset bg-slate-50/50 space-y-3">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>المعلومات الجبائية الجزائرية (للفواتير الرسمية)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NeuInput
                label="السجل التجاري (RC)"
                value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value)}
                placeholder="16/00-123456B21"
                className="font-mono text-xs"
              />
              <NeuInput
                label="الرقم الجبائي (NIF)"
                value={nifNumber}
                onChange={(e) => setNifNumber(e.target.value)}
                placeholder="002116012345678"
                className="font-mono text-xs"
              />
              <NeuInput
                label="نسبة TVA (%)"
                type="number"
                value={tvaRate}
                onChange={(e) => setTvaRate(Number(e.target.value) || 0)}
                placeholder="19"
                className="tabular-nums"
              />
            </div>
          </div>

          {/* خيارات تهيئة البيانات */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 block">
              خيار تهيئة المخزون والبيانات:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setKeepCatalog(true)}
                className={`p-3 rounded-2xl cursor-pointer transition-all ${
                  keepCatalog
                    ? 'neu-pressed border-2 border-blue-500 bg-blue-50/40 text-blue-900'
                    : 'neu-raised text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>إبقاء الكتالوج الجزائري الجاهز</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  تصفير كل المبيعات والديون والمصاريف، مع الإبقاء على قائمة المنتجات الشائعة لتسهيل بدء العمل.
                </p>
              </div>

              <div
                onClick={() => setKeepCatalog(false)}
                className={`p-3 rounded-2xl cursor-pointer transition-all ${
                  !keepCatalog
                    ? 'neu-pressed border-2 border-blue-500 bg-blue-50/40 text-blue-900'
                    : 'neu-raised text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تصفير كامل (متجر فارغ تماماً)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  تصفير المخزون بالكامل للبدء بإدخال منتجات العميل الخاصة من الصفر.
                </p>
              </div>
            </div>
          </div>

          {/* مؤثرات الصوت */}
          <div className="flex items-center justify-between p-3 rounded-xl neu-inset">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span>أصوات الكاشير وقارئ الباركود (Beep & Chime)</span>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                soundEnabled
                  ? 'neu-pressed text-emerald-700 bg-emerald-50'
                  : 'neu-raised text-slate-500'
              }`}
            >
              {soundEnabled ? 'مفعل' : 'معطل'}
            </button>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              icon={<ShieldCheck className="w-5 h-5" />}
            >
              تثبيت بيانات المتجر وبدء التشغيل الفعلي
            </NeuButton>
            <NeuButton type="button" variant="default" onClick={onClose}>
              إلغاء
            </NeuButton>
          </div>
        </form>
      </div>
    </div>
  );
};
