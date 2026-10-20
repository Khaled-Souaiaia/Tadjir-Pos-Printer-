import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Key,
  Copy,
  CheckCircle,
  AlertCircle,
  Laptop,
  Sparkles,
  RefreshCw,
  UploadCloud,
  Info,
} from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import { NeuInput } from '../common/NeuInput';
import {
  getDeviceFingerprint,
  activateWithInput,
} from '../../utils/license';

interface ActivationModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  isClosable?: boolean;
  onClose?: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onSuccess,
  isClosable = false,
  onClose,
}) => {
  const { lang, refreshLicense, licenseResult } = useApp();

  const [serialKeyInput, setSerialKeyInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [deviceId, setDeviceId] = useState('جاري القراءة...');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    getDeviceFingerprint().then((id) => setDeviceId(id));
  }, []);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (e?: React.FormEvent, customToken?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const tokenToValidate = (customToken || serialKeyInput).trim();
    if (!tokenToValidate) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال مفتاح التفعيل المسلّم لك من قِبل مسؤول النظام.'
          : 'Veuillez saisir votre clé de licence fournie par votre administrateur.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      const result = await activateWithInput(tokenToValidate, customerNameInput);

      if (result.isValid) {
        setSuccessMessage(
          lang === 'ar'
            ? result.message || 'تم تفعيل برنامج تاجر بنجاح وبشكل دائم مدى الحياة!'
            : 'TADJIR a été activé avec succès !'
        );
        setTimeout(async () => {
          await refreshLicense();
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 800);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage(
        lang === 'ar'
          ? 'حدث خطأ أثناء معالجة التفعيل. تأكد من صحة المفتاح أو الملف.'
          : 'Erreur lors de la validation de la clé.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // معالجة استيراد ملف الشهادة .tadjir-license
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setSerialKeyInput(content.trim());
        handleActivate(undefined, content.trim());
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="neu-flat rounded-3xl p-6 sm:p-8 w-full max-w-xl bg-white shadow-2xl border border-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* الترويسة وشعار تاجر */}
        <div className="text-center pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl neu-raised mx-auto flex items-center justify-center mb-3 shadow-inner overflow-hidden bg-slate-950 p-1 border border-slate-800">
            <img src="./icon.png" alt="TADJIR" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            TADJIR POS
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'نظام إدارة ومحاسبة نقاط البيع والمحلات الجزائر'
              : 'Système de gestion commerciale et point de vente (DZ)'}
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black border ${
                licenseResult?.status === 'revoked'
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : licenseResult?.status === 'suspended'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : licenseResult?.status === 'expired'
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : licenseResult?.status === 'device_mismatch'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : licenseResult?.status === 'clock_rollback_detected'
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : licenseResult?.status === 'product_mismatch'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {licenseResult?.status === 'revoked'
                ? 'License has been revoked. • الترخيص ملغى'
                : licenseResult?.status === 'suspended'
                ? 'License has been suspended. • الترخيص معلق مؤقتًا'
                : licenseResult?.status === 'expired'
                ? 'License expired. • انتهت صلاحية الترخيص'
                : licenseResult?.status === 'device_mismatch'
                ? 'License is not valid for this device. • المعرّف غير مطابق'
                : licenseResult?.status === 'clock_rollback_detected'
                ? 'Clock rollback detected. • تم رصد تلاعب بالساعة'
                : licenseResult?.status === 'product_mismatch'
                ? 'Product mismatch. • الترخيص لمنتج آخر'
                : 'License has not been activated. • البرنامج غير مفعل'}
            </span>
          </div>
        </div>

        {/* صندوق إرشادات التفعيل من مسؤول النظام */}
        <div className="mt-5 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block mb-0.5">
              {lang === 'ar' ? 'تعليمات التفعيل :' : "Instructions d'activation :"}
            </span>
            <span className="text-slate-600">
              {lang === 'ar'
                ? 'يرجى إدخال مفتاح الترخيص المسلّم لك من قِبل مسؤول النظام لتفعيل البرنامج على هذا الجهاز. للحصول على المفتاح، قم بتزويد المسؤول بمعرّف هذا الجهاز (Device ID) الموضح أدناه.'
                : "Veuillez saisir la clé de licence fournie par votre administrateur pour activer TADJIR sur ce poste. Pour obtenir votre clé, transmettez l'identifiant ci-dessous (Device ID) à l'administrateur."}
            </span>
          </div>
        </div>

        {/* صندوق معرّف الجهاز (Device ID) مع زر النسخ */}
        <div className="mt-4 p-3.5 rounded-2xl neu-inset bg-slate-50 border border-slate-200/60">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-600" />
              {lang === 'ar' ? 'معرّف هذا الجهاز (Device ID) :' : "Identifiant de cet appareil (Device ID) :"}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {lang === 'ar' ? 'زوّد مسؤول النظام بهذا المعرف' : "À transmettre à l'administrateur"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono font-bold text-sm bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 tracking-wider">
              {deviceId}
            </code>
            <button
              type="button"
              onClick={handleCopyDeviceId}
              className="neu-raised px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-all cursor-pointer"
              title={lang === 'ar' ? 'نسخ المعرف' : 'Copier'}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">{lang === 'ar' ? 'تم النسخ' : 'Copié'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'نسخ' : 'Copier'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* نموذج إدخال السيريال / الشهادة */}
        <form onSubmit={handleActivate} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'مفتاح السيريال (Serial Key) :' : 'Clé de série (Serial Key) :'}
              </label>
              <label className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'استيراد ملف (.tadjir-license)' : 'Importer fichier (.tadjir-license)'}</span>
                <input
                  type="file"
                  accept=".tadjir-license,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="relative">
              <NeuInput
                type="text"
                value={serialKeyInput}
                onChange={(e) => setSerialKeyInput(e.target.value)}
                placeholder={lang === 'ar' ? 'TADJIR-XXXX-XXXX-XXXX-XXXX أو رمز التفعيل...' : "TADJIR-XXXX-XXXX-XXXX-XXXX ou code d'activation..."}
                className="font-mono text-sm tracking-wider text-slate-900"
                icon={<Key className="w-4 h-4 text-blue-600" />}
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === 'ar'
                ? 'أدخل مفتاح الترخيص المسلّم لك من قِبل مسؤول النظام لتنشيط البرنامج.'
                : 'Saisissez la clé de licence fournie par votre administrateur pour débloquer TADJIR.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ar' ? 'اسم المحل / العميل (اختياري) :' : 'Nom du magasin / client (Optionnel) :'}
            </label>
            <NeuInput
              type="text"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: سوبرماركت البركة' : 'Ex: Supérette El Baraka'}
              className="text-sm"
            />
          </div>

          {/* تنبيه انتهاء الصلاحية */}
          {licenseResult?.status === 'expired' && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  License expired.
                </div>
                <div className="font-semibold text-rose-700">
                  {lang === 'ar'
                    ? 'انتهت صلاحية هذا الترخيص المؤقت. يرجى التواصل مع مسؤول النظام وإدخال مفتاح ترخيص جديد للمتابعة.'
                    : 'Votre licence a expiré. Veuillez contacter votre administrateur et saisir une nouvelle clé pour déverrouiller TADJIR.'}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه عدم تطابق الجهاز */}
          {licenseResult?.status === 'device_mismatch' && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  License is not valid for this device.
                </div>
                <div className="font-semibold text-amber-700">
                  {lang === 'ar'
                    ? 'هذا الترخيص مخصص لجهاز كمبيوتر آخر. يرجى تزويد مسؤول النظام بمعرّف جهازك الحالي لربطه بالترخيص.'
                    : "Cette licence est liée à un autre appareil. Veuillez fournir l'identifiant de ce poste à l'administrateur."}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه الإلغاء المركزي */}
          {licenseResult?.status === 'revoked' && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  Your license has been deactivated. Please contact the administrator.
                </div>
                <div className="font-semibold text-rose-700">
                  {lang === 'ar'
                    ? 'تم إلغاء تفعيل هذا الترخيص بواسطة الإدارة. يرجى مراجعة مسؤول النظام.'
                    : "Cette licence a été désactivée par l'administration. Veuillez contacter votre administrateur."}
                  {licenseResult.revocationReason && (
                    <span className="block mt-1 font-normal text-rose-600">
                      {licenseResult.revocationReason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه التعليق المركزي */}
          {licenseResult?.status === 'suspended' && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  تم تعليق هذا الترخيص مؤقتًا
                </div>
                <div className="font-semibold text-amber-700">
                  {lang === 'ar'
                    ? 'تم تعليق ترخيص هذا الجهاز مؤقتًا بواسطة الإدارة. يرجى مراجعة المسؤول لتسوية وضعية الحساب.'
                    : 'Cette licence a été temporairement suspendue. Veuillez contacter votre administrateur.'}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه انتهاء فترة السماح دون اتصال */}
          {licenseResult?.status === 'offline_grace_expired' && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  انتهت فترة السماح دون إنترنت
                </div>
                <div className="font-semibold text-amber-700">
                  {lang === 'ar'
                    ? 'تجاوز البرنامج فترة السماح (7 أيام دون اتصال). يلزم الاتصال بالإنترنت للتحقق من السيرفر المركزي ومتابعة الاستخدام.'
                    : 'La période de grâce hors-ligne a expiré. Une connexion internet est requise pour valider la licence.'}
                </div>
              </div>
            </div>
          )}

          {/* أخطاء التوقيع أو البيانات التالفة */}
          {(licenseResult?.status === 'invalid_signature' || licenseResult?.status === 'malformed') && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  {lang === 'ar' ? 'مفتاح الترخيص غير صالح' : 'Clé de licence invalide'}
                </div>
                <div className="font-semibold text-rose-700">
                  {licenseResult.message || (lang === 'ar' ? 'بيانات الترخيص الحالية غير صالحة أو تم التلاعب بها. يرجى إدخال مفتاح تفعيل معتمد.' : 'Données de licence invalides. Veuillez saisir une clé valide.')}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه التلاعب بالساعة (Clock Rollback) */}
          {licenseResult?.status === 'clock_rollback_detected' && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  {lang === 'ar' ? 'تم رصد تلاعب في ساعة النظام' : 'Modification de date système détectée'}
                </div>
                <div className="font-semibold text-rose-700">
                  {lang === 'ar'
                    ? 'تم رصد تأخير في ساعة الجهاز أو تراجع في تاريخ النظام إلى الوراء. يرجى ضبط تاريخ ووقت الحاسوب بشكل صحيح ودقيق للمتابعة.'
                    : "Une modification anormale de la date système a été détectée. Veuillez régler l'heure et la date de votre ordinateur correctement pour continuer."}
                </div>
              </div>
            </div>
          )}

          {/* تنبيه عدم تطابق المنتج (Product Mismatch) */}
          {licenseResult?.status === 'product_mismatch' && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-extrabold text-sm mb-0.5">
                  {lang === 'ar' ? 'الترخيص غير مخصص لهذا البرنامج' : 'Produit non correspondant'}
                </div>
                <div className="font-semibold text-amber-700">
                  {lang === 'ar'
                    ? 'مفتاح الترخيص المدخل صالح رقمياً ولكنه مخصص لبرنامج آخر وليس لنظام تاجر (TADJIR). يرجى إدخال مفتاح مخصص لبرنامج تاجر.'
                    : "Cette clé de licence est valide mais appartient à un autre produit. Veuillez utiliser une clé émise pour TADJIR."}
                </div>
              </div>
            </div>
          )}

          {/* رسائل الخطأ والنجاح الفورية */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* زر التفعيل الرئيسي */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVerifying}
              icon={
                isVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )
              }
              className="font-bold text-sm py-3"
            >
              {isVerifying
                ? lang === 'ar'
                  ? 'جاري التحقق الرقمي عبر المفتاح العام...'
                  : 'Vérification cryptographique...'
                : lang === 'ar'
                ? 'تفعيل برنامج تاجر (Activate TADJIR)'
                : 'Activer TADJIR'}
            </NeuButton>

            {isClosable && onClose && (
              <NeuButton
                type="button"
                variant="default"
                size="lg"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </NeuButton>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
