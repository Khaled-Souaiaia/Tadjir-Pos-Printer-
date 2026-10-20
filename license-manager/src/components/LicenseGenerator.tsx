import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  Copy,
  CheckCircle,
  Download,
  Share2,
  RefreshCw,
  Calendar,
  Laptop,
  User,
  ShieldCheck,
  FileCheck,
  Phone,
  MapPin,
  Coins,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { LicenseType, ManagedLicenseRecord } from '../types';
import {
  createSignedLicenseCertificate,
  generateSerialKeyString,
  generateLicenseId,
  hashLicenseKey,
} from '../utils/crypto';
import { saveLicenseRecord } from '../utils/storage';
import { licenseApiFetch } from '../../../src/utils/license-api';

interface LicenseGeneratorProps {
  onLicenseCreated?: (record: ManagedLicenseRecord) => void;
}

export const formatAppDateTime = (isoString?: string | null): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

export const LicenseGenerator: React.FC<LicenseGeneratorProps> = ({ onLicenseCreated }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWilaya, setCustomerWilaya] = useState('الجزائر العاصمة');
  const [licenseType, setLicenseType] = useState<LicenseType>('lifetime');
  const [licenseId, setLicenseId] = useState(() => generateLicenseId('lifetime'));
  const [serialKey, setSerialKey] = useState(() => generateSerialKeyString());
  const [deviceId, setDeviceId] = useState('');
  const [priceDzd, setPriceDzd] = useState<number>(35000);
  const [notes, setNotes] = useState('');

  // إعدادات التجربة بالساعات (Custom Trial Duration in Hours)
  const [trialHoursInput, setTrialHoursInput] = useState<string>('24');
  const [trialHours, setTrialHours] = useState<number>(24);
  const [validationError, setValidationError] = useState<string | null>(null);

  // حالة النتيجة المولدة
  const [createdRecord, setCreatedRecord] = useState<ManagedLicenseRecord | null>(null);
  const [copiedField, setCopiedField] = useState<'serial' | 'token' | 'template' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const parsedHours = parseInt(trialHoursInput, 10);
  const isHoursValid = !isNaN(parsedHours) && parsedHours > 0;

  // تحديث نوع الترخيص وتعديل السعر الافتراضي ومعرف الترخيص
  const handleTypeChange = (newType: LicenseType) => {
    setLicenseType(newType);
    setLicenseId(generateLicenseId(newType));
    setValidationError(null);
    if (newType === 'lifetime') setPriceDzd(35000);
    else if (newType === '1_year') setPriceDzd(18000);
    else if (newType === '6_months') setPriceDzd(10000);
    else if (newType === 'trial' || newType === 'custom_trial') {
      setPriceDzd(0);
      setTrialHours(24);
      setTrialHoursInput('24');
    }
  };

  const handleRegenerateSerial = () => {
    setSerialKey(generateSerialKeyString());
  };

  const handleRegenerateId = () => {
    setLicenseId(generateLicenseId(licenseType));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim()) {
      setValidationError('يرجى إدخال اسم المحل أو العميل.');
      return;
    }

    if (licenseType === 'custom_trial' || licenseType === 'trial') {
      if (!isHoursValid) {
        setValidationError('Duration must be a positive number of hours. مدة التجربة يجب أن تكون رقماً موجباً أكبر من 0 (مثال: 1, 6, 12, 24, 48, 72).');
        return;
      }
    }

    setIsGenerating(true);
    try {
      const cleanDeviceId = deviceId.trim() ? deviceId.trim().toUpperCase() : null;

      // جلب توقيت السيرفر الرسمي لحساب وقت الإنشاء والانتهاء بدقة (Trusted Server Timestamp)
      let serverIssuedAt: string | undefined;
      try {
        const timeRes = await licenseApiFetch('/api/server-time');
        if (timeRes.ok) {
          const timeData = await timeRes.json();
          if (timeData?.iso) {
            serverIssuedAt = timeData.iso;
          }
        }
      } catch {
        // الاستمرار باستخدام التوقيت المحلي عند تعذر الاتصال
      }

      const cert = await createSignedLicenseCertificate({
        customerName: customerName.trim(),
        licenseId: licenseId.trim().toUpperCase(),
        serialKey: serialKey.trim().toUpperCase(),
        type: licenseType,
        deviceId: cleanDeviceId,
        notes: notes.trim(),
        durationHours: (licenseType === 'custom_trial' || licenseType === 'trial') ? parsedHours : undefined,
        issuedAt: serverIssuedAt,
      });

      const keyHash = await hashLicenseKey(cert.payload.serialKey);

      const newRecord: ManagedLicenseRecord = {
        id: `rec_${Date.now()}`,
        licenseId: cert.payload.licenseId,
        serialKey: cert.payload.serialKey,
        license_key_hash: keyHash,
        customerName: cert.payload.customerName,
        customerPhone: customerPhone.trim(),
        customerWilaya: customerWilaya.trim(),
        type: cert.payload.type,
        license_type: cert.payload.type,
        duration_hours: (licenseType === 'custom_trial' || licenseType === 'trial') ? parsedHours : undefined,
        durationHours: (licenseType === 'custom_trial' || licenseType === 'trial') ? parsedHours : undefined,
        issuedAt: cert.payload.issuedAt,
        created_at: cert.payload.issuedAt,
        expiresAt: cert.payload.expiresAt,
        expires_at: cert.payload.expiresAt,
        deviceId: cert.payload.deviceId || null,
        hardware_lock: cert.payload.deviceId || null,
        notes: cert.payload.notes || '',
        status: 'active',
        signature: cert.signature,
        activationToken: cert.activationToken,
        pricePaidDzd: priceDzd,
        history: [
          {
            date: new Date().toISOString(),
            action: 'إنشاء وتوقيع الترخيص',
            notes: `إصدار ترخيص ${cert.payload.type === 'custom_trial' ? `Custom Trial (${parsedHours} Hours)` : cert.payload.type} مع توقيع Ed25519`,
          },
        ],
      };

      saveLicenseRecord(newRecord);
      setCreatedRecord(newRecord);
      if (onLicenseCreated) onLicenseCreated(newRecord);
    } catch (err: any) {
      setValidationError(`حدث خطأ أثناء إنشاء الترخيص: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: 'serial' | 'token' | 'template') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // تحميل ملف الترخيص .tadjir-license
  const downloadLicenseFile = () => {
    if (!createdRecord) return;
    const blob = new Blob([createdRecord.activationToken], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${createdRecord.customerName.replace(/\s+/g, '_')}_${createdRecord.serialKey}.tadjir-license`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // نص تسليم جاهز للزبون
  const getCustomerDeliveryText = () => {
    if (!createdRecord) return '';
    const isTrial = createdRecord.type === 'custom_trial' || createdRecord.type === 'trial';
    const trialHoursDisplay = createdRecord.duration_hours || createdRecord.durationHours || 24;
    const typeLabel =
      createdRecord.type === 'lifetime'
        ? 'دائم مدى الحياة (Lifetime)'
        : createdRecord.type === '1_year'
        ? 'سنوي (1 Year)'
        : createdRecord.type === '6_months'
        ? '6 أشهر (6 Months)'
        : `Custom Trial (نسخة تجريبية - صلاحية ${trialHoursDisplay} ساعة / Hours)`;

    return `مرحبًا بك! إليك بيانات تفعيل برنامج تاجر TADJIR POS:

👤 اسم العميل: ${createdRecord.customerName}
🏷️ نوع الترخيص: ${typeLabel}
🔑 مفتاح السيريال: ${createdRecord.serialKey}
${isTrial ? `⏱️ مدة التجربة: ${trialHoursDisplay} Hours (${trialHoursDisplay} ساعة)\n` : ''}
📅 تاريخ الإصدار: ${formatAppDateTime(createdRecord.issuedAt)}
⏳ تاريخ الانتهاء: ${createdRecord.expiresAt ? formatAppDateTime(createdRecord.expiresAt) : 'دائم مدى الحياة (Lifetime)'}
${createdRecord.deviceId ? `💻 مقفل على الجهاز: ${createdRecord.deviceId}\n` : ''}
📜 رمز التفعيل المعتمد (انسخه بالكامل):
${createdRecord.activationToken}

طريقة التفعيل:
1. افتح برنامج تاجر TADJIR.
2. ألصق مفتاح السيريال أو رمز التفعيل واضغط 'تفعيل الآن'.
شكرًا لثقتكم بنا!`;
  };

  // احتساب تاريخ الانتهاء التقديري المباشر في واجهة الإدخال
  const nowPreview = new Date();
  const estimatedExpirationDate = isHoursValid
    ? new Date(nowPreview.getTime() + parsedHours * 3600 * 1000)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span>توليد وتوقيع ترخيص جديد (Ed25519)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              يتم توقيع الترخيص تشفيرياً بالمفتاح الخاص للمطور. الزبون يتحقق منه عبر المفتاح العام.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Signer v1.0
          </span>
        </div>

        <form onSubmit={handleGenerate} className="mt-6 space-y-5">
          {/* اختيار نوع الترخيص */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">نوع الترخيص :</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { type: 'lifetime', label: 'دائم مدى الحياة', desc: 'بدون تاريخ انتهاء' },
                { type: '1_year', label: 'سنة واحدة', desc: 'صلاحية 365 يومًا' },
                { type: '6_months', label: '6 أشهر', desc: 'صلاحية 180 يومًا' },
                { type: 'custom_trial', label: 'Custom Trial', desc: 'صلاحية مخصصة بالساعات' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleTypeChange(opt.type as LicenseType)}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    licenseType === opt.type || (opt.type === 'custom_trial' && licenseType === 'trial')
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* تفاصيل وخيارات النسخة التجريبية المخصصة بالساعات (Custom Trial) */}
            {(licenseType === 'custom_trial' || licenseType === 'trial') && (
              <div className="mt-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col gap-3.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-sm">
                        ترخيص تجريبي مخصص (Custom Trial)
                      </div>
                      <div className="text-[11px] text-amber-400/90 mt-0.5">
                        {isHoursValid
                          ? `ينتهي هذا الترخيص تلقائياً بعد مرور ${parsedHours} ساعة من لحظة إصداره (الانتهاء المتوقع: ${formatAppDateTime(estimatedExpirationDate?.toISOString())})`
                          : 'يرجى إدخال عدد ساعات صحيح أكبر من 0'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-200 font-bold">Trial Duration :</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="8760"
                        value={trialHoursInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTrialHoursInput(val);
                          const num = parseInt(val, 10);
                          if (!isNaN(num) && num > 0) {
                            setTrialHours(num);
                            setValidationError(null);
                          }
                        }}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold text-center text-xs focus:outline-none focus:border-amber-500"
                        placeholder="24"
                      />
                      <span className="text-xs text-amber-300 font-bold">Hours</span>
                    </div>
                  </div>
                </div>

                {/* خيارات سريعة Quick Presets: 1h, 6h, 12h, 24h, 48h, 72h, 7 Days */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                  <span className="text-[11px] text-slate-400 font-semibold ml-1">خيارات سريعة (Presets):</span>
                  {[
                    { label: '1 Hour', hours: 1 },
                    { label: '6 Hours', hours: 6 },
                    { label: '12 Hours', hours: 12 },
                    { label: '24 Hours', hours: 24 },
                    { label: '48 Hours', hours: 48 },
                    { label: '72 Hours', hours: 72 },
                    { label: '7 Days', hours: 168 },
                  ].map((preset) => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => {
                        setTrialHours(preset.hours);
                        setTrialHoursInput(String(preset.hours));
                        setValidationError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        trialHours === preset.hours && trialHoursInput === String(preset.hours)
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {!isHoursValid && (
                  <div className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Duration must be a positive number of hours. مدة التجربة يجب أن تكون رقماً موجباً أكبر من 0.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* بيانات العميل */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>اسم المحل / العميل (مطلوب) :</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: سوبرماركت البركة"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>هاتف العميل (اختياري) :</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0550 12 34 56"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>الولاية :</span>
              </label>
              <input
                type="text"
                value={customerWilaya}
                onChange={(e) => setCustomerWilaya(e.target.value)}
                placeholder="الجزائر العاصمة، وهران، سطيف..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* مفتاح السيريال ومعرف الترخيص */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>مفتاح السيريال (Serial Key) :</span>
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateSerial}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>توليد سيريال جديد</span>
                </button>
              </label>
              <input
                type="text"
                value={serialKey}
                onChange={(e) => setSerialKey(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-blue-400 font-mono font-bold text-sm tracking-widest uppercase focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>معرّف الترخيص (License ID) :</span>
                <button
                  type="button"
                  onClick={handleRegenerateId}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تجديد ID</span>
                </button>
              </label>
              <input
                type="text"
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* قفل الجهاز والمبلغ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ربط بمعرف الجهاز (Hardware Lock - اختياري) :</span>
                </span>
                <span className="text-[10px] text-slate-500">اتركه فارغاً إذا أردت ترخيصاً عاماً</span>
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                placeholder="DZ-XXXX-XXXX-XXXX"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500 uppercase tracking-wider"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>المبلغ المستلم (د.ج DZD) :</span>
              </label>
              <input
                type="number"
                value={priceDzd}
                onChange={(e) => setPriceDzd(Number(e.target.value))}
                placeholder="35000"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* ملاحظات داخلية */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ملاحظات داخلية للمطور :</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم السداد نقدًا، وصل رقم 102..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* رسالة خطأ التحقق */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* زر التوليد والتوقيع */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating || !customerName.trim() || ((licenseType === 'custom_trial' || licenseType === 'trial') && !isHoursValid)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <span>جاري التوقيع الرقمي...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>توليد وتوقيع الترخيص الرقمي (Sign with Private Key)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* بطاقة عرض الترخيص المولد (Display Generated License Information) */}
      {createdRecord && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  تم إصدار وتوقيع الترخيص بنجاح!
                </h3>
                <p className="text-xs text-slate-400">
                  مرخص لـ: <span className="text-emerald-400 font-bold">{createdRecord.customerName}</span> (
                  {createdRecord.type === 'custom_trial' || createdRecord.type === 'trial'
                    ? `Custom Trial - ${createdRecord.duration_hours || createdRecord.durationHours || 24}h`
                    : createdRecord.type}
                  )
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadLicenseFile}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>تحميل ملف الشهادة (.tadjir-license)</span>
              </button>
            </div>
          </div>

          {/* تفاصيل الترخيص المهيكلة كما هو مطلوب في Requirement 8 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-5">
            {/* 1. License Key */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  License Key :
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdRecord.serialKey, 'serial')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'serial' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'serial' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
              <code className="text-sm font-mono font-bold text-white tracking-widest block truncate">
                {createdRecord.serialKey}
              </code>
            </div>

            {/* 2. License Type & Duration */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1">
                License Type & Duration :
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400">
                  {createdRecord.type === 'custom_trial' || createdRecord.type === 'trial'
                    ? 'Custom Trial'
                    : createdRecord.type === 'lifetime'
                    ? 'Lifetime'
                    : createdRecord.type === '1_year'
                    ? '1 Year'
                    : '6 Months'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Duration: {createdRecord.duration_hours || createdRecord.durationHours
                    ? `${createdRecord.duration_hours || createdRecord.durationHours} Hours`
                    : 'Lifetime'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                الحالة: <span className="text-emerald-400 font-bold">Active (نشط)</span>
              </div>
            </div>

            {/* 3. Created & Expires Timestamps */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 font-semibold">تاريخ الإصدار والانتهاء :</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Active
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="font-mono font-bold text-white">{formatAppDateTime(createdRecord.issuedAt)}</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center justify-between mt-1">
                <span className="text-slate-400">Expires:</span>
                <span className="font-mono font-bold text-amber-300">
                  {createdRecord.expiresAt ? formatAppDateTime(createdRecord.expiresAt) : 'دائم (Lifetime)'}
                </span>
              </div>
            </div>
          </div>

          {/* صندوق رمز التفعيل المشفر TADJIR-LIC-Base64 */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                رمز التفعيل المشفر المعتمد (TADJIR-LIC Certificate) :
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(createdRecord.activationToken, 'token')}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedField === 'token' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'token' ? 'تم نسخ الرمز' : 'نسخ رمز التفعيل الكامل'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={3}
              value={createdRecord.activationToken}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs select-all focus:outline-none"
            />
          </div>

          {/* نص تسليم جاهز للزبون */}
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-blue-400" />
                رسالة التسليم الجاهزة للزبون (WhatsApp / Email) :
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(getCustomerDeliveryText(), 'template')}
                className="text-xs text-blue-400 hover:text-blue-200 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'template' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'template' ? 'تم نسخ الرسالة' : 'نسخ الرسالة بالكامل'}</span>
              </button>
            </div>
            <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              {getCustomerDeliveryText()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
