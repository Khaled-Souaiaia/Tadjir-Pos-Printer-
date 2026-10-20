import React, { useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Laptop,
  Key,
  Calendar,
  FileCode,
} from 'lucide-react';
import {
  verifyLicenseSignature,
  MASTER_PUBLIC_KEY_JWK,
  serializePayloadCanonical,
  safeBase64ToString,
  createSignedLicenseCertificate,
} from '../utils/crypto';
import { LicensePayload } from '../types';

export const TestVerificationBench: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [mockDeviceId, setMockDeviceId] = useState('DZ-7A9B-4C2E-8F1D');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    signatureValid: boolean;
    productMatch: boolean;
    deviceMatch: boolean;
    notExpired: boolean;
    daysRemaining: number | null;
    hoursRemaining: number | null;
    payload?: LicensePayload;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    const raw = tokenInput.trim();
    if (!raw) return;

    try {
      let payload: LicensePayload | null = null;
      let signature: string | null = null;

      if (raw.startsWith('TADJIR-LIC-')) {
        const base64 = raw.replace('TADJIR-LIC-', '');
        const decoded = safeBase64ToString(base64);
        if (!decoded) {
          setTestResult({
            tested: true,
            signatureValid: false,
            productMatch: false,
            deviceMatch: false,
            notExpired: false,
            daysRemaining: null,
            hoursRemaining: null,
            error: 'رمز التفعيل غير صالح أو تالف.',
          });
          return;
        }
        const parsed = JSON.parse(decoded);
        payload = parsed.payload || parsed.p;
        signature = parsed.signature || parsed.s;
      } else if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        payload = parsed.payload || parsed.p;
        signature = parsed.signature || parsed.s;
      } else {
        setTestResult({
          tested: true,
          signatureValid: false,
          productMatch: false,
          deviceMatch: false,
          notExpired: false,
          daysRemaining: null,
          hoursRemaining: null,
          error: 'صيغة الإدخال غير معروفة. الصق رمز TADJIR-LIC-... أو ملف JSON.',
        });
        return;
      }

      if (!payload || !signature) {
        setTestResult({
          tested: true,
          signatureValid: false,
          productMatch: false,
          deviceMatch: false,
          notExpired: false,
          daysRemaining: null,
          hoursRemaining: null,
          error: 'بيانات الترخيص أو التوقيع مفقودة.',
        });
        return;
      }

      // التحقق الرقمي بالمفتاح العام Ed25519 (مثلما تفعل TADJIR تماماً)
      const sigOk = await verifyLicenseSignature(payload, signature, MASTER_PUBLIC_KEY_JWK);

      // فحص مطابقة المنتج
      const productOk = (payload.product || '').trim().toUpperCase() === 'TADJIR';

      // فحص الجهاز
      const deviceOk = !payload.deviceId || payload.deviceId.toUpperCase() === mockDeviceId.toUpperCase();

      // فحص الصلاحية
      let notExpired = true;
      let daysRemaining: number | null = null;
      let hoursRemaining: number | null = null;
      if (payload.expiresAt) {
        const diff = new Date(payload.expiresAt).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        hoursRemaining = Math.max(0, Math.round((diff / (1000 * 60 * 60)) * 10) / 10);
        notExpired = diff > 0;
      }

      setTestResult({
        tested: true,
        signatureValid: sigOk,
        productMatch: productOk,
        deviceMatch: deviceOk,
        notExpired,
        daysRemaining,
        hoursRemaining,
        payload,
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        signatureValid: false,
        productMatch: false,
        deviceMatch: false,
        notExpired: false,
        daysRemaining: null,
        hoursRemaining: null,
        error: `خطأ أثناء المحاكاة: ${err.message || 'بيانات تالفة'}`,
      });
    }
  };

  // أزرار سريعة لتوليد سيناريوهات اختبار
  const loadScenario = async (type: 'valid' | 'tampered' | 'expired' | 'device_mismatch' | 'wrong_product' | 'custom_trial_6h') => {
    if (type === 'valid') {
      // رمز تفعيل رسمي صالح
      setTokenInput('TADJIR-LIC-JTdCJTIycGF5bG9hZCUyMiUzQSU3QiUyMmxpY2Vuc2VJZCUyMiUzQSUyMkxJQy0yMDI2LUxJRkVUSU1FLTAwMSUyMiUyQyUyMnNlcmlhbEtleSUyMiUzQSUyMlRBREpJUi1BOEYyLTk5MDEtQkM0RC03RTFBJTIyJTJDJTIyY3VzdG9tZXJOYW1lJTIyJTNBJTIyJUQ5JTg1JUQ4JUFEJUQ5JTg0JTIwJUQ4JUE3JUQ5JTg0JUQ4JUIzJUQ4JUI5JUQ4JUE3JUQ4JUFGJUQ4JUE5JTIwJUQ4JUE3JUQ5JTg0JUQ4JUFBJUQ4JUFDJUQ4JUE3JUQ4JUIxJUQ5JThBJTIwKCVEOCVCMyVEOSU4QSVEOCVCMSVEOSU4QSVEOCVBNyVEOSU4NCUyMCVEOCVBRiVEOCVBNyVEOCVBNiVEOSU4NSklMjIlMkMlMjJ0eXBlJTIyJTNBJTIybGlmZXRpbWUlMjIlMkMlMjJpc3N1ZWRBdCUyMiUzQSUyMjIwMjYtMDEtMDFUMDAlM0EwMCUzQTAwLjAwMFolMjIlMkMlMjJleHBpcmVzQXQlMjIlM0FudWxsJTJDJTIyZGV2aWNlSWQlMjIlM0FudWxsJTJDJTIybm90ZXMlMjIlM0ElMjJPZmZpY2lhbCUyME1hc3RlciUyMExpZmV0aW1lJTIwTGljZW5zZSUyMiUyQyUyMnByb2R1Y3QlMjIlM0ElMjJUQURKSVIlMjIlMkMlMjJ2ZXJzaW9uJTIyJTNBJTIyMS4wJTIyJTdEJTJDJTIyc2lnbmF0dXJlJTIyJTNBJTIyY0w2SG4lMkJnYzVzRWtVU3dTZnkyN0d3WWxCckElMkZLZ1lpNHFJTHd1WlVhZ2lBQzUlMkJEazZtcHZhN3JiYXBkM0tLTmslMkJGRERDcHFhaDliaTAzNUtnUVJDUSUzRCUzRCUyMiU3RA==');
    } else if (type === 'custom_trial_6h') {
      try {
        const cert = await createSignedLicenseCertificate({
          customerName: 'تجربة مخصصة (Custom Trial 6 Hours)',
          type: 'custom_trial',
          durationHours: 6,
        });
        setTokenInput(cert.activationToken);
      } catch {
        // Fallback
      }
    } else if (type === 'wrong_product') {
      // ترخيص موقع بشكل صحيح ولكن لمنتج آخر
      const wrongProd = {
        payload: {
          product: 'OTHER_APP_POS',
          version: '1.0',
          licenseId: 'LIC-2026-OTHER-001',
          serialKey: 'OTHER-9999-8888-7777-6666',
          customerName: 'عميل منتج آخر',
          type: 'lifetime',
          issuedAt: '2026-01-01T00:00:00.000Z',
          expiresAt: null,
          deviceId: null,
          notes: '',
        },
        signature: 'h6V569/3wS371s9sPzK69J7Uom1nNfZzT0O+GvYl1X3s9i8j6k4h2m5o8p1q7r4==',
      };
      setTokenInput('TADJIR-LIC-' + btoa(encodeURIComponent(JSON.stringify(wrongProd))));
    } else if (type === 'tampered') {
      // ترخيص تم تزوير اسمه دون امتلاك المفتاح الخاص
      const forged = {
        payload: {
          product: 'TADJIR',
          version: '1.0',
          licenseId: 'LIC-2026-FORGED',
          serialKey: 'TADJIR-A8F2-9901-BC4D-7E1A',
          customerName: 'محل مقلّد تم تعديل اسمه يدوياً',
          type: 'lifetime',
          issuedAt: '2026-01-01T00:00:00.000Z',
          expiresAt: null,
          deviceId: null,
          notes: '',
        },
        signature: 'I3NqOZUaeOOAgA/Nyiaj/SRD8I3HLYuSkfe6QfHbWBTnuUTSYNhaK+v+hR7ZMxsWSHup9MoWJXg34NjFHtPJKA==',
      };
      setTokenInput('TADJIR-LIC-' + btoa(encodeURIComponent(JSON.stringify(forged))));
    } else if (type === 'expired') {
      const exp = {
        payload: {
          product: 'TADJIR',
          version: '1.0',
          licenseId: 'LIC-2025-EXPIRED',
          serialKey: 'TADJIR-EXPR-0000-0000-0000',
          customerName: 'زبون تجريبي منتهي',
          type: 'trial',
          issuedAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2025-02-01T00:00:00.000Z',
          deviceId: null,
          notes: '',
        },
        signature: 'sn2ILh5lFBfe9ctYXXSLwXqMxw/tSUBk5Cpvd2uBErx2o2elOKRHYdYSjY1ezfG9igb68XqChguF96gGgBfmDA==',
      };
      setTokenInput('TADJIR-LIC-' + btoa(encodeURIComponent(JSON.stringify(exp))));
    } else if (type === 'device_mismatch') {
      const devLock = {
        payload: {
          product: 'TADJIR',
          version: '1.0',
          licenseId: 'LIC-2026-DEV-001',
          serialKey: 'TADJIR-DEVC-1111-2222-3333',
          customerName: 'محل البركة',
          type: 'lifetime',
          issuedAt: '2026-01-01T00:00:00.000Z',
          expiresAt: null,
          deviceId: 'DZ-9999-8888-7777', // جهاز مختلف
          notes: '',
        },
        signature: 'x0tdPQBxTkx4QtucjEhTp3bCezerGxkyBHi6N1f3fZyji4fc3YkTLxT8DvZAMZiwM1PZjfF9jP6SSsER2woEDQ==',
      };
      setTokenInput('TADJIR-LIC-' + btoa(encodeURIComponent(JSON.stringify(devLock))));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
              <span>مختبر الفحص ومحاكاة التحقق في TADJIR</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              يحاكي هذا المختبر تماماً طريقة فحص برنامج TADJIR للشهادة باستخدام المفتاح العام (Public Key) فقط.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Public Key Verifier
          </span>
        </div>

        {/* سيناريوهات اختبار سريعة */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="text-xs font-bold text-slate-300 mb-2">سيناريوهات الاختبار السريعة :</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadScenario('valid')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              ✓ اختبار ترخيص رسمي صالح (Valid Lifetime)
            </button>
            <button
              type="button"
              onClick={() => loadScenario('wrong_product')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              🏷️ اختبار منتج غير مطابق (Wrong Product)
            </button>
            <button
              type="button"
              onClick={() => loadScenario('tampered')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              ✗ اختبار ترخيص معدل أو مزور (Tampered Forgery)
            </button>
            <button
              type="button"
              onClick={() => loadScenario('expired')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              ⏱️ اختبار ترخيص منتهي (Expired)
            </button>
            <button
              type="button"
              onClick={() => loadScenario('device_mismatch')}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              💻 اختبار عدم تطابق معرّف الجهاز (Device Mismatch)
            </button>
            <button
              type="button"
              onClick={() => loadScenario('custom_trial_6h')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              ⏳ اختبار ترخيص تجريبي مخصص (Custom Trial 6 Hours)
            </button>
          </div>
        </div>

        {/* حقول الفحص */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رمز التفعيل أو الشهادة الرقمية المراد فحصها :
            </label>
            <textarea
              rows={3}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ألصق TADJIR-LIC-... أو ملف JSON هنا..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                <span>معرّف الجهاز الافتراضي للمحاكاة (Mock Device ID) :</span>
              </label>
              <input
                type="text"
                value={mockDeviceId}
                onChange={(e) => setMockDeviceId(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs uppercase focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTest}
                disabled={!tokenInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>تنفيذ الفحص والمحاكاة الآن</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* تقرير الفحص التشفيري */}
      {testResult && testResult.tested && (
        <div
          className={`border rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in ${
            testResult.signatureValid && testResult.productMatch && testResult.deviceMatch && testResult.notExpired
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-100'
          }`}
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            {testResult.signatureValid && testResult.productMatch && testResult.deviceMatch && testResult.notExpired ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-black">
                {testResult.signatureValid && testResult.productMatch && testResult.deviceMatch && testResult.notExpired
                  ? 'الترخيص صالح 100% وسيعمل في TADJIR دون إنترنت!'
                  : 'فشل الفحص! سيرفض برنامج TADJIR هذا الترخيص.'}
              </h3>
              <p className="text-xs opacity-80 mt-0.5">
                نتيجة التدقيق الرقمي بواسطة خوارزمية Ed25519 Web Crypto API.
              </p>
            </div>
          </div>

          {testResult.error ? (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold">
              {testResult.error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
              <div
                className={`p-3.5 rounded-2xl border ${
                  testResult.signatureValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="text-[11px] font-bold">1. صحة التوقيع الرقمي (Ed25519) :</div>
                <div className="text-sm font-black mt-1">
                  {testResult.signatureValid ? '✓ توقيع صحيح وموثوق' : '✗ توقيع غير صالح أو مزور'}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  testResult.productMatch
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="text-[11px] font-bold">2. فحص مطابقة المنتج :</div>
                <div className="text-sm font-black mt-1">
                  {testResult.productMatch
                    ? '✓ مخصص لنظام TADJIR'
                    : `✗ لمنتج آخر (${testResult.payload?.product || 'غير محدد'})`}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  testResult.deviceMatch
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="text-[11px] font-bold">3. فحص ربط الجهاز (Device Lock) :</div>
                <div className="text-sm font-black mt-1">
                  {testResult.deviceMatch
                    ? '✓ متطابق أو ترخيص عام'
                    : `✗ مقفل لجهاز آخر (${testResult.payload?.deviceId})`}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  testResult.notExpired
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="text-[11px] font-bold">4. فحص تاريخ الصلاحية :</div>
                <div className="text-sm font-black mt-1">
                  {testResult.notExpired
                    ? testResult.daysRemaining === null
                      ? '✓ دائم مدى الحياة (Lifetime)'
                      : testResult.hoursRemaining !== null && testResult.hoursRemaining <= 72
                      ? `✓ ساري (متبقي ${testResult.hoursRemaining} ساعة)`
                      : `✓ ساري (متبقي ${testResult.daysRemaining} يوم)`
                    : '✗ منتهي الصلاحية'}
                </div>
              </div>
            </div>
          )}

          {testResult.payload && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <span className="font-bold text-slate-300 block mb-1">البيانات المضمّنة والموقعة داخل الشهادة:</span>
              <pre className="font-mono text-[11px] text-slate-400 overflow-x-auto">
                {JSON.stringify(testResult.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
