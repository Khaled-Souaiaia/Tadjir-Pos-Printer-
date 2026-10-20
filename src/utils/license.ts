// =======================================================================
// TADJIR - Public Key License Verification & Activation Engine
// نظام التحقق والتفعيل للعملاء - يحتوي فقط على المفتاح العام (Public Key)
// Uses asymmetric Ed25519 digital signatures with Web Crypto API
// =======================================================================

import { LicensePayload, LicenseType, LicenseValidationResult, SignedLicense } from '../types';
import { licenseApiFetch } from './license-api';

const LICENSE_STORAGE_KEY = 'tadjir_active_license_v1';
const DEACTIVATED_FLAG_KEY = 'tadjir_deactivated_flag';
const LAST_ONLINE_VERIFIED_KEY = 'tadjir_license_last_online_verified';
export const HIGHEST_TRUSTED_TIMESTAMP_KEY = 'tadjir_highest_timestamp';

// هامش السماح للتعديلات العادية الطفيفة على الساعة (تحديث NTP أو فارق التوقيت): 5 دقائق
export const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;

// فترة السماح بالعمل دون اتصال بالإنترنت = 7 أيام (168 ساعة) للتراخيص المؤقتة فقط
export const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

// فترة التحقق الدورية من السيرفر المركزي = كل 15 دقيقة أثناء تشغيل التطبيق
export const PERIODIC_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export interface RemoteLicenseCheckResult {
  online: boolean;
  found: boolean;
  valid: boolean;
  status: 'active' | 'revoked' | 'suspended' | 'expired' | 'device_mismatch' | 'not_found' | 'network_error';
  revocationReason?: string;
  message?: string;
  gracePeriodHours?: number;
  serverTimestamp?: string;
  durationHours?: number;
  remainingHours?: number | null;
  expiresAt?: string;
  issuedAt?: string;
}

/**
 * فحص حالة الترخيص عبر الاتصال بالسيرفر المركزي (Central License Server)
 */
export const checkRemoteLicenseStatus = async (
  serialKey: string,
  licenseId?: string,
  deviceId?: string
): Promise<RemoteLicenseCheckResult> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await licenseApiFetch('/api/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serialKey, licenseId, deviceId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        found: data.found ?? true,
        valid: data.valid ?? false,
        status: data.status || 'not_found',
        revocationReason: data.revocationReason,
        message: data.message,
        gracePeriodHours: data.gracePeriodHours,
        serverTimestamp: data.serverTimestamp,
        durationHours: data.durationHours,
        remainingHours: data.remainingHours,
        expiresAt: data.expiresAt,
        issuedAt: data.issuedAt,
      };
    }
  } catch {
    // الخادم غير متصل أو الشبكة غير متوفرة مؤقتاً
  }

  return {
    online: false,
    found: false,
    valid: false,
    status: 'network_error',
    message: 'تعذر الاتصال بالسيرفر المركزي',
  };
};

// المفتاح العام الرئيسي المضمّن في TADJIR للتحقق من التوقيع الرقمي دون إمكانية التزوير
// Master Public Key (Verification Only - Embedded in client)
// The corresponding Private Key exists ONLY inside TADJIR License Manager
export const MASTER_PUBLIC_KEY_JWK: JsonWebKey = {
  key_ops: ['verify'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

// -----------------------------------------------------------------------
// 1. حساب معرّف الجهاز الثابت والمحمي بالخصوصية (Stable Device Fingerprint)
// -----------------------------------------------------------------------
let cachedDeviceId: string | null = null;

export const getDeviceFingerprint = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    let canvasData = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TADJIR-POS-DZ', 2, 15);
      canvasData = canvas.toDataURL();
    }

    const entropy = [
      navigator.userAgent || '',
      navigator.language || '',
      screen.colorDepth || '',
      screen.width || '',
      screen.height || '',
      navigator.hardwareConcurrency || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      canvasData.slice(-64),
    ].join('###');

    const encoder = new TextEncoder();
    const data = encoder.encode(entropy);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // تشكيل المعرف بصيغة نظيفة: DZ-XXXX-XXXX-XXXX
    cachedDeviceId = `DZ-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
    return cachedDeviceId;
  } catch (err) {
    cachedDeviceId = 'DZ-7A9B-4C2E-8F1D';
    return cachedDeviceId;
  }
};

// -----------------------------------------------------------------------
// 2. تحويل البيانات إلى نص قياسي موحد لتفادي مشاكل ترتيب المفاتيح عند التحقق
// -----------------------------------------------------------------------
export const serializePayloadCanonical = (payload: LicensePayload): string => {
  const canonicalObj: Record<string, any> = {
    customerName: (payload.customerName || '').trim(),
    deviceId: payload.deviceId ? payload.deviceId.trim().toUpperCase() : null,
    expiresAt: payload.expiresAt || null,
    issuedAt: payload.issuedAt,
    licenseId: (payload.licenseId || '').trim().toUpperCase(),
    notes: payload.notes || '',
    product: payload.product || 'TADJIR',
    serialKey: (payload.serialKey || '').trim().toUpperCase(),
    type: payload.type,
    version: payload.version || '1.0',
  };

  const dur = payload.durationHours ?? (payload as any).duration_hours;
  if (dur !== undefined && dur !== null) {
    canonicalObj.durationHours = Number(dur);
  }

  return JSON.stringify(canonicalObj);
};

// -----------------------------------------------------------------------
// 3. دوال Base64 الآمنة المقاومة للاستثناءات والترميزات غير القياسية
// -----------------------------------------------------------------------
export const safeBase64ToArrayBuffer = (input: string): ArrayBuffer | null => {
  try {
    if (!input || typeof input !== 'string') return null;

    let clean = input.trim();

    // في حال كان النص مشفراً بنسب مئوية URL-encoded
    if (clean.includes('%')) {
      try {
        clean = decodeURIComponent(clean);
      } catch {
        // الاستمرار بالتنظيف العادي
      }
    }

    // استبدال محارف Base64URL (- و _) بمحارف Base64 القياسية (+ و /)
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');

    // إزالة أية مسافات بيضاء أو فواصل أسطر
    clean = clean.replace(/\s+/g, '');

    // التحقق من الحشو (=) وتصحيحه تلقائياً إذا نقص
    const mod = clean.length % 4;
    if (mod === 2) clean += '==';
    else if (mod === 3) clean += '=';
    else if (mod === 1) return null; // طول غير صالح

    // التحقق من صحة محارف Base64 القياسية فقط
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      return null;
    }

    const binaryString = atob(clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
};

export const safeBase64ToString = (input: string): string | null => {
  try {
    if (!input || typeof input !== 'string') return null;

    let clean = input.trim();
    if (clean.includes('%')) {
      try {
        clean = decodeURIComponent(clean);
      } catch {
        // الاستمرار
      }
    }

    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    clean = clean.replace(/\s+/g, '');

    const mod = clean.length % 4;
    if (mod === 2) clean += '==';
    else if (mod === 3) clean += '=';
    else if (mod === 1) return null;

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      return null;
    }

    const binaryString = atob(clean);

    try {
      return decodeURIComponent(binaryString);
    } catch {
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch {
    return null;
  }
};

// -----------------------------------------------------------------------
// 4. التحقق الرقمي عبر خوارزمية Ed25519 (Verification Only)
// -----------------------------------------------------------------------
export const verifyLicenseSignature = async (
  payload: LicensePayload,
  signatureBase64: string,
  publicKeyJwk: JsonWebKey = MASTER_PUBLIC_KEY_JWK
): Promise<boolean> => {
  try {
    if (!payload || !signatureBase64) return false;

    const signatureBuffer = safeBase64ToArrayBuffer(signatureBase64);
    // توقيع Ed25519 يتكون حتماً من 64 بايت بالضبط
    if (!signatureBuffer || signatureBuffer.byteLength !== 64) {
      return false;
    }

    const pubKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const canonicalString = serializePayloadCanonical(payload);
    const data = new TextEncoder().encode(canonicalString);

    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      pubKey,
      signatureBuffer,
      data
    );
  } catch {
    return false;
  }
};

// -----------------------------------------------------------------------
// 4. دوال إدارة وتخزين الترخيص الآمن والمحمي (Offline License Persistence)
// -----------------------------------------------------------------------
/**
 * جلب بيانات الترخيص المخزّنة سواء من LocalStorage أو من قاعدة بيانات SQLite المحلية
 */
export const getStoredLicenseRaw = async (): Promise<string | null> => {
  let raw = localStorage.getItem(LICENSE_STORAGE_KEY);
  if (raw) return raw;

  // فحص قاعدة البيانات المحلية SQLite عبر واجهة Electron IPC إذا كانت متوفرة
  if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSql) {
    try {
      const res = await (window as any).electronAPI.executeSql(
        "SELECT value FROM settings WHERE key = 'tadjir_active_license_v1'"
      );
      if (res?.success && res.data && res.data.length > 0 && res.data[0].value) {
        raw = res.data[0].value;
        if (raw) {
          localStorage.setItem(LICENSE_STORAGE_KEY, raw);
          return raw;
        }
      }
    } catch {
      // الاستمرار في حالة الخطأ
    }
  }

  return null;
};

/**
 * حفظ الترخيص الموقّع في كلا وسيلتي التخزين (LocalStorage + SQLite Settings) لضمان البقاء دون فقدان
 */
export const persistSignedLicense = async (signedLicense: SignedLicense): Promise<void> => {
  const jsonStr = JSON.stringify(signedLicense);
  localStorage.setItem(LICENSE_STORAGE_KEY, jsonStr);
  localStorage.removeItem(DEACTIVATED_FLAG_KEY);

  if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSql) {
    try {
      await (window as any).electronAPI.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('tadjir_active_license_v1', ?)",
        [jsonStr]
      );
    } catch {
      // صامت
    }
  }
};

/**
 * حذف الترخيص من كلا وسيلتي التخزين عند إلغاء التفعيل
 */
export const removePersistedLicense = async (): Promise<void> => {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
  localStorage.setItem(DEACTIVATED_FLAG_KEY, 'true');

  if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSql) {
    try {
      await (window as any).electronAPI.executeSql(
        "DELETE FROM settings WHERE key = 'tadjir_active_license_v1'"
      );
    } catch {
      // صامت
    }
  }
};

/**
 * جلب أعلى طابع زمني موثوق مسجل محلياً في كلا وسيلتي التخزين (LocalStorage + SQLite Settings)
 */
export const getHighestTrustedTimestamp = async (): Promise<number | null> => {
  let tsStr = localStorage.getItem(HIGHEST_TRUSTED_TIMESTAMP_KEY);

  if (!tsStr && typeof window !== 'undefined' && (window as any).electronAPI?.executeSql) {
    try {
      const res = await (window as any).electronAPI.executeSql(
        "SELECT value FROM settings WHERE key = 'tadjir_highest_timestamp'"
      );
      if (res?.success && Array.isArray(res.data) && res.data.length > 0 && (res.data[0] as any)?.value) {
        tsStr = (res.data[0] as any).value;
        if (tsStr) {
          localStorage.setItem(HIGHEST_TRUSTED_TIMESTAMP_KEY, tsStr);
        }
      }
    } catch {
      // صامت
    }
  }

  if (tsStr) {
    const parsed = parseInt(tsStr, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

/**
 * تحديث أعلى طابع زمني موثوق مسجل محلياً في كلا وسيلتي التخزين
 */
export const updateHighestTrustedTimestamp = async (ts: number): Promise<void> => {
  if (!ts || isNaN(ts) || ts <= 0) return;
  const tsStr = ts.toString();
  localStorage.setItem(HIGHEST_TRUSTED_TIMESTAMP_KEY, tsStr);

  if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSql) {
    try {
      await (window as any).electronAPI.executeSql(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('tadjir_highest_timestamp', ?)",
        [tsStr]
      );
    } catch {
      // صامت
    }
  }
};

// -----------------------------------------------------------------------
// 5. التحقق من الترخيص المخزّن محلياً (Offline Validation)
// -----------------------------------------------------------------------
export const validateStoredLicense = async (): Promise<LicenseValidationResult> => {
  try {
    // 0. التحقق مما إذا كان الترخيص ملغى أو معلقاً من الإدارة
    const deactivatedFlag = localStorage.getItem(DEACTIVATED_FLAG_KEY);
    if (deactivatedFlag) {
      try {
        const parsed = JSON.parse(deactivatedFlag);
        if (parsed?.status === 'revoked') {
          return {
            isValid: false,
            status: 'revoked',
            revocationReason: parsed.revocationReason,
            message:
              'Your license has been deactivated. Please contact the administrator. (تم إلغاء تفعيل هذا الترخيص بواسطة الإدارة. يرجى التواصل مع المسؤول أو المطور).',
          };
        }
        if (parsed?.status === 'suspended') {
          return {
            isValid: false,
            status: 'suspended',
            message: 'تم تعليق هذا الترخيص مؤقتاً بواسطة الإدارة. يرجى التواصل مع المسؤول.',
          };
        }
      } catch {
        // نص عادي
      }
    }

    const raw = await getStoredLicenseRaw();

    // التثبيت الجديد يبدأ دائماً بحالة مقفلة وغير مفعلة (LOCKED / NOT ACTIVATED)
    if (!raw) {
      return {
        isValid: false,
        status: 'unactivated',
        message: 'License has not been activated. (البرنامج غير مفعل. يرجى إدخال مفتاح التفعيل للمتابعة).',
      };
    }

    const signedLicense: SignedLicense = JSON.parse(raw);
    const { payload, signature } = signedLicense;

    if (!payload || !signature || !payload.serialKey) {
      return {
        isValid: false,
        status: 'malformed',
        message: 'Invalid license key. (بيانات الترخيص المحفوظة تالفة أو غير مكتملة).',
      };
    }

    // تنظيف تراخيص الاختبار السابقة إذا كانت متبقية من إصدار سابق
    if (payload.notes === 'Official Master Lifetime License') {
      await removePersistedLicense();
      return {
        isValid: false,
        status: 'unactivated',
        message: 'License has not been activated. (البرنامج غير مفعل. يرجى إدخال مفتاح التفعيل للمتابعة).',
      };
    }

    // 1. التحقق الصارم من اسم المنتج (Product Validation: TADJIR حصراً)
    const product = (payload.product || '').trim().toUpperCase();
    if (product !== 'TADJIR') {
      return {
        isValid: false,
        status: 'product_mismatch',
        message: 'License is not valid for this product. (هذا الترخيص مخصص لمنتج آخر وليس لبرنامج تاجر TADJIR).',
      };
    }

    // 2. التحقق من التوقيع الرقمي بمفتاح Ed25519 العام فقط (لا وجود للمفتاح الخاص هنا)
    const isSignatureValid = await verifyLicenseSignature(payload, signature);
    if (!isSignatureValid) {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'Invalid license key. (فشل التحقق من التوقيع الرقمي للترخيص).',
      };
    }

    // 3. التحقق من ربط الجهاز إذا كان الترخيص مخصص لجهاز معين (Hardware Fingerprint Lock)
    if (payload.deviceId) {
      const currentDeviceId = await getDeviceFingerprint();
      if (payload.deviceId.toUpperCase() !== currentDeviceId.toUpperCase()) {
        return {
          isValid: false,
          status: 'device_mismatch',
          message: `License is not valid for this device. (هذا المفتاح مخصص لجهاز كمبيوتر آخر: ${payload.deviceId}).`,
        };
      }
    }

    // 4. التحقق الفوري والدوري مع السيرفر المركزي أولاً في حال توفر الاتصال (Authoritative Server-Side Check)
    const currentDevId = await getDeviceFingerprint();
    const remoteRes = await checkRemoteLicenseStatus(
      payload.serialKey,
      payload.licenseId,
      currentDevId
    );

    let hoursRemaining: number | null = null;
    let daysRemaining: number | null = null;
    const nowMs = Date.now();

    if (remoteRes.online) {
      // مزامنة الطابع الزمني الموثوق مع السيرفر المركزي
      if (remoteRes.serverTimestamp) {
        localStorage.setItem(LAST_ONLINE_VERIFIED_KEY, Date.now().toString());
      }

      // إذا أبلغ السيرفر المركزي أن الترخيص منتهي الصلاحية
      if (remoteRes.status === 'expired') {
        return {
          isValid: false,
          status: 'expired',
          message: 'License expired. (انتهت صلاحية هذا الترخيص المؤقت في السيرفر المركزي. يرجى الترقية إلى ترخيص دائم).',
          license: signedLicense,
          daysRemaining: 0,
          hoursRemaining: 0,
          serverTimestamp: remoteRes.serverTimestamp,
        };
      }

      // إذا أبلغ السيرفر أن الترخيص ملغى (Revoked) من قِبل المدير
      if (remoteRes.status === 'revoked') {
        localStorage.setItem(
          DEACTIVATED_FLAG_KEY,
          JSON.stringify({
            status: 'revoked',
            serialKey: payload.serialKey,
            revocationReason: remoteRes.revocationReason || 'License has been revoked.',
          })
        );
        await removePersistedLicense();
        return {
          isValid: false,
          status: 'revoked',
          revocationReason: remoteRes.revocationReason,
          message:
            'License has been revoked. (تم إلغاء تفعيل هذا الترخيص بواسطة الإدارة. يرجى التواصل مع المسؤول أو المطور).',
          serverTimestamp: remoteRes.serverTimestamp,
        };
      }

      // إذا أبلغ السيرفر أن الترخيص معلق مؤقتاً (Suspended)
      if (remoteRes.status === 'suspended') {
        localStorage.setItem(
          DEACTIVATED_FLAG_KEY,
          JSON.stringify({
            status: 'suspended',
            serialKey: payload.serialKey,
          })
        );
        await removePersistedLicense();
        return {
          isValid: false,
          status: 'suspended',
          message: 'تم تعليق هذا الترخيص مؤقتاً بواسطة الإدارة. يرجى التواصل مع المسؤول.',
          serverTimestamp: remoteRes.serverTimestamp,
        };
      }

      // إذا كان هناك اختلاف في معرّف الجهاز المسجل
      if (remoteRes.status === 'device_mismatch') {
        return {
          isValid: false,
          status: 'device_mismatch',
          message: remoteRes.message || 'License is not valid for this device. (معرّف الجهاز غير مطابق للسجل المركزي).',
          serverTimestamp: remoteRes.serverTimestamp,
        };
      }

      if (remoteRes.remainingHours !== undefined) {
        hoursRemaining = remoteRes.remainingHours;
        if (hoursRemaining !== null) {
          daysRemaining = Math.max(0, Math.ceil(hoursRemaining / 24));
        }
      }

      // الترخيص نشط وصالح في السيرفر المركزي (Active)
      if (remoteRes.status === 'active' || remoteRes.valid) {
        // تحديث أعلى طابع زمني موثوق مسجل
        const serverTs = remoteRes.serverTimestamp ? new Date(remoteRes.serverTimestamp).getTime() : nowMs;
        const trustedTs = !isNaN(serverTs) ? Math.max(nowMs, serverTs) : nowMs;
        const highestTs = await getHighestTrustedTimestamp();
        if (!highestTs || trustedTs > highestTs) {
          await updateHighestTrustedTimestamp(trustedTs);
        }

        return {
          isValid: true,
          status: 'valid',
          message: 'البرنامج مفعل بنجاح ومؤكد من السيرفر المركزي.',
          license: signedLicense,
          daysRemaining,
          hoursRemaining,
          durationHours: remoteRes.durationHours || payload.durationHours,
          lastOnlineVerifiedAt: new Date().toISOString(),
          serverTimestamp: remoteRes.serverTimestamp,
        };
      }
    }

    // 5. التحقق من انتهاء الصلاحية والتلاعب بالساعة (Anti-Clock Rollback) للتراخيص المؤقتة
    if (payload.type !== 'lifetime' || payload.expiresAt) {
      // أ) التحقق من تأخير ساعة الويندوز للخلف (Clock Rollback Detection)
      const highestTrustedTs = await getHighestTrustedTimestamp();

      if (highestTrustedTs && nowMs < (highestTrustedTs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
        return {
          isValid: false,
          status: 'clock_rollback_detected',
          message: 'System clock rollback detected. (تم رصد تلاعب في ساعة النظام أو تأخير تاريخ الحاسوب إلى الوراء. يرجى ضبط توقيت النظام بشكل صحيح للمتابعة).',
        };
      }

      // ب) التحقق من أن ساعة النظام الحالية لا تسبق تاريخ إصدار الترخيص نفسه
      if (payload.issuedAt) {
        const issuedMs = new Date(payload.issuedAt).getTime();
        if (!isNaN(issuedMs) && nowMs < (issuedMs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
          return {
            isValid: false,
            status: 'clock_rollback_detected',
            message: 'System clock rollback detected. (تاريخ النظام الحالي يسبق تاريخ إصدار الترخيص. يرجى تصحيح ساعة الجهاز).',
          };
        }
      }

      // ج) التحقق من تاريخ انتهاء الصلاحية
      if (payload.expiresAt) {
        const expDate = new Date(payload.expiresAt);
        if (isNaN(expDate.getTime())) {
          return {
            isValid: false,
            status: 'malformed',
            message: 'Invalid expiration date. (تاريخ انتهاء الصلاحية غير صالح).',
          };
        }

        const diffMs = expDate.getTime() - nowMs;
        hoursRemaining = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (diffMs <= 0) {
          return {
            isValid: false,
            status: 'expired',
            message: 'License expired. (انتهت صلاحية هذا الترخيص المؤقت. يرجى الترقية إلى ترخيص دائم).',
            license: signedLicense,
            daysRemaining: 0,
            hoursRemaining: 0,
          };
        }
      }
    }

    // 6. سياسة العمل دون اتصال بالإنترنت (Offline License Policy)
    if (!remoteRes.online) {
      // أ) التراخيص الدائمة (Lifetime): تعمل أوفلاين للأبد بشكل غير محدود دون أي شرط اتصال بالإنترنت ودون التقيد بمهلة 7 أيام
      if (payload.type === 'lifetime') {
        const highestTs = await getHighestTrustedTimestamp();
        if (!highestTs || nowMs > highestTs) {
          await updateHighestTrustedTimestamp(nowMs);
        }

        return {
          isValid: true,
          status: 'valid',
          message: 'البرنامج مفعل بشكل دائم مدى الحياة (وضع غير متصل بالإنترنت).',
          license: signedLicense,
          daysRemaining: null,
          hoursRemaining: null,
          durationHours: payload.durationHours,
        };
      }

      // ب) التراخيص المؤقتة (تجريبية أو سنوية): تخضع لفترة السماح الأوفلاين
      const rawLastOnline = localStorage.getItem(LAST_ONLINE_VERIFIED_KEY);
      const lastOnlineTimestamp = rawLastOnline
        ? parseInt(rawLastOnline, 10)
        : new Date(signedLicense.activatedAt).getTime();
      const elapsedMs = nowMs - lastOnlineTimestamp;

      if (elapsedMs > OFFLINE_GRACE_PERIOD_MS) {
        return {
          isValid: false,
          status: 'offline_grace_expired',
          message:
            'انتهت فترة السماح بالعمل دون اتصال (Grace Period تجاوزت 7 أيام). يلزم الاتصال بالإنترنت للتحقق من السيرفر المركزي والمتابعة.',
        };
      }

      const highestTs = await getHighestTrustedTimestamp();
      if (!highestTs || nowMs > highestTs) {
        await updateHighestTrustedTimestamp(nowMs);
      }

      return {
        isValid: true,
        status: 'valid',
        isOfflineGrace: true,
        message: 'البرنامج مفعل محلياً (وضع غير متصل بالإنترنت - ضمن فترة السماح).',
        license: signedLicense,
        daysRemaining,
        hoursRemaining,
        durationHours: payload.durationHours,
      };
    }

    // تحديث أعلى طابع زمني في حال الاتصال
    const highestTs = await getHighestTrustedTimestamp();
    if (!highestTs || nowMs > highestTs) {
      await updateHighestTrustedTimestamp(nowMs);
    }

    return {
      isValid: true,
      status: 'valid',
      message: 'البرنامج مفعل بنجاح وبشكل نظامي.',
      license: signedLicense,
      daysRemaining,
      hoursRemaining,
      durationHours: payload.durationHours,
    };
  } catch (error) {
    return {
      isValid: false,
      status: 'malformed',
      message: 'حدث خطأ أثناء قراءة بيانات التفعيل.',
    };
  }
};

// -----------------------------------------------------------------------
// 6. تفعيل البرنامج عبر مفتاح أو رمز أو ملف ترخيص (Offline Activation)
// -----------------------------------------------------------------------
export const activateWithInput = async (
  rawInput: string,
  optionalCustomerName?: string
): Promise<LicenseValidationResult> => {
  const input = rawInput.trim();
  if (!input) {
    return {
      isValid: false,
      status: 'invalid_signature',
      message: 'يرجى إدخال مفتاح السيريال أو رمز التفعيل المعتمد.',
    };
  }

  try {
    let payload: LicensePayload | null = null;
    let signature: string | null = null;

    // الحالة 1: الإدخال يحتوي على رمز تفعيل كامل مشفر وموقّع TADJIR-LIC-Base64
    // (يدعم أيضاً إذا قام العميل بلصق كامل رسالة التسليم الصادرة من License Manager)
    const tokenMatch = input.match(/TADJIR-LIC-[A-Za-z0-9+/=_%-]+/);
    if (tokenMatch) {
      const base64Str = tokenMatch[0].replace('TADJIR-LIC-', '');
      const decodedJson = safeBase64ToString(base64Str);
      if (!decodedJson) {
        return {
          isValid: false,
          status: 'invalid_signature',
          message: 'مفتاح السيريال غير صالح أو غير مصرح به.',
        };
      }
      try {
        const parsed = JSON.parse(decodedJson);
        payload = parsed.payload || parsed.p;
        signature = parsed.signature || parsed.s;
      } catch {
        return {
          isValid: false,
          status: 'invalid_signature',
          message: 'مفتاح السيريال غير صالح أو غير مصرح به.',
        };
      }
    }
    // الحالة 2: الإدخال هو ملف JSON للترخيص
    else if (input.startsWith('{') && input.endsWith('}')) {
      try {
        const parsed = JSON.parse(input);
        if (parsed.payload && parsed.signature) {
          payload = parsed.payload;
          signature = parsed.signature;
        } else if (parsed.p && parsed.s) {
          payload = parsed.p;
          signature = parsed.s;
        }
      } catch {
        return {
          isValid: false,
          status: 'invalid_signature',
          message: 'مفتاح السيريال غير صالح أو غير مصرح به.',
        };
      }
    }
    // الحالة 3: الإدخال هو مفتاح سيريال TADJIR-XXXX-XXXX-XXXX-XXXX
    else if (input.toUpperCase().startsWith('TADJIR-')) {
      const cleanKey = input.trim().toUpperCase();
      // 1. فحص قاعدة البيانات المركزية في السيرفر أولاً
      try {
        const res = await licenseApiFetch('/api/licenses');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.licenses)) {
            const found = data.licenses.find(
              (r: any) => r.serialKey && r.serialKey.trim().toUpperCase() === cleanKey && r.status === 'active'
            );
            if (found && found.signature) {
              payload = {
                customerName: found.customerName || optionalCustomerName || '',
                deviceId: found.deviceId || null,
                expiresAt: found.expiresAt || null,
                issuedAt: found.issuedAt || new Date().toISOString(),
                licenseId: found.licenseId || 'LIC-UNKNOWN',
                notes: found.notes || '',
                product: 'TADJIR',
                serialKey: found.serialKey,
                type: found.type || 'lifetime',
                version: '1.0',
                durationHours: found.duration_hours || found.durationHours,
                duration_hours: found.duration_hours || found.durationHours,
              };
              signature = found.signature;
            }
          }
        }
      } catch {
        // الاستمرار إلى فحص التخزين المحلي في حال عدم الاتصال
      }

      // 2. فحص قاعدة بيانات مدير التراخيص المحلي إذا لم يتم العثور عليه في السيرفر
      if (!payload || !signature) {
        try {
          const rawLmDb = localStorage.getItem('tadjir_lm_database_v1');
          if (rawLmDb) {
            const records: any[] = JSON.parse(rawLmDb);
            const found = records.find(
              (r) => r.serialKey && r.serialKey.trim().toUpperCase() === cleanKey && r.status === 'active'
            );
            if (found && found.signature) {
              payload = {
                customerName: found.customerName || optionalCustomerName || '',
                deviceId: found.deviceId || null,
                expiresAt: found.expiresAt || null,
                issuedAt: found.issuedAt || new Date().toISOString(),
                licenseId: found.licenseId || 'LIC-UNKNOWN',
                notes: found.notes || '',
                product: 'TADJIR',
                serialKey: found.serialKey,
                type: found.type || 'lifetime',
                version: '1.0',
                durationHours: found.duration_hours || found.durationHours,
                duration_hours: found.duration_hours || found.durationHours,
              };
              signature = found.signature;
            }
          }
        } catch {
          // الاستمرار
        }
      }
    }
    // الحالة 4: أي إدخال آخر غير معروف
    else {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'Invalid license key. (مفتاح السيريال غير صالح أو غير مصرح به).',
      };
    }

    if (!payload || !signature) {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'Invalid license key. (مفتاح السيريال غير صالح أو غير مصرح به).',
      };
    }

    // منع استخدام مفاتيح الاختبار
    if (payload.notes === 'Official Master Lifetime License') {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'Invalid license key. (مفتاح السيريال غير صالح أو غير مصرح به).',
      };
    }

    // 1. التحقق الصارم من اسم المنتج (Product Validation: TADJIR حصراً)
    const product = (payload.product || '').trim().toUpperCase();
    if (product !== 'TADJIR') {
      return {
        isValid: false,
        status: 'product_mismatch',
        message: 'License is not valid for this product. (هذا الترخيص مخصص لمنتج آخر وليس لبرنامج تاجر TADJIR).',
      };
    }

    // 2. التحقق الصارم من التوقيع الرقمي بالمفتاح العام Ed25519
    const isValidSignature = await verifyLicenseSignature(payload, signature);
    if (!isValidSignature) {
      return {
        isValid: false,
        status: 'invalid_signature',
        message: 'Invalid license key. (فشل التحقق من التوقيع الرقمي للمفتاح).',
      };
    }

    // 3. التحقق من ربط الجهاز (إذا كان الترخيص مخصصاً لجهاز معين)
    const currentDeviceId = await getDeviceFingerprint();
    if (payload.deviceId && payload.deviceId.toUpperCase() !== currentDeviceId.toUpperCase()) {
      return {
        isValid: false,
        status: 'device_mismatch',
        message: `License is not valid for this device. (هذا الترخيص مخصص لجهاز كمبيوتر آخر: ${payload.deviceId}).`,
      };
    }

    const nowMs = Date.now();

    // 4. التحقق من التلاعب بالساعة (Clock Rollback) وانتهاء الصلاحية للتراخيص المؤقتة
    if (payload.type !== 'lifetime' || payload.expiresAt) {
      const highestTrustedTs = await getHighestTrustedTimestamp();
      if (highestTrustedTs && nowMs < (highestTrustedTs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
        return {
          isValid: false,
          status: 'clock_rollback_detected',
          message: 'System clock rollback detected. (تم رصد تلاعب في ساعة النظام أو تأخير تاريخ الجهاز إلى الوراء. يرجى ضبط توقيت النظام بشكل صحيح للمتابعة).',
        };
      }

      if (payload.issuedAt) {
        const issuedMs = new Date(payload.issuedAt).getTime();
        if (!isNaN(issuedMs) && nowMs < (issuedMs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
          return {
            isValid: false,
            status: 'clock_rollback_detected',
            message: 'System clock rollback detected. (تاريخ النظام الحالي يسبق تاريخ إصدار الترخيص. يرجى تصحيح ساعة الجهاز).',
          };
        }
      }

      if (payload.expiresAt && new Date(payload.expiresAt).getTime() <= nowMs) {
        return {
          isValid: false,
          status: 'expired',
          message: 'License expired. (هذا الترخيص منتهي الصلاحية).',
        };
      }
    }

    // 5. فحص السيرفر المركزي للتأكد من عدم إلغاء أو تعليق الترخيص (Central Server Verification)
    const remoteRes = await checkRemoteLicenseStatus(
      payload.serialKey,
      payload.licenseId,
      currentDeviceId
    );

    if (remoteRes.online) {
      if (remoteRes.status === 'revoked') {
        return {
          isValid: false,
          status: 'revoked',
          revocationReason: remoteRes.revocationReason,
          message:
            'License has been revoked. (تم إلغاء تفعيل هذا الترخيص بواسطة الإدارة. يرجى التواصل مع المسؤول أو المطور).',
        };
      }
      if (remoteRes.status === 'suspended') {
        return {
          isValid: false,
          status: 'suspended',
          message: 'هذا الترخيص معلق مؤقتاً في السيرفر المركزي. يرجى التواصل مع الإدارة.',
        };
      }
      if (remoteRes.status === 'expired') {
        return {
          isValid: false,
          status: 'expired',
          message: 'License expired. (هذا الترخيص منتهي الصلاحية في السيرفر المركزي).',
        };
      }
    }

    // حفظ الترخيص الموقّع بشكل دائم وآمن في LocalStorage و SQLite
    const signedLicense: SignedLicense = {
      payload,
      signature,
      activatedAt: new Date().toISOString(),
      deviceFingerprint: currentDeviceId,
    };

    await persistSignedLicense(signedLicense);
    await updateHighestTrustedTimestamp(nowMs);
    localStorage.setItem(LAST_ONLINE_VERIFIED_KEY, nowMs.toString());

    const trialHoursDisplay = payload.durationHours || (payload as any).duration_hours;
    const trialDesc = trialHoursDisplay ? `نسخة تجريبية (${trialHoursDisplay} ساعة)` : 'نسخة تجريبية';

    return {
      isValid: true,
      status: 'valid',
      durationHours: trialHoursDisplay,
      message:
        payload.type === 'lifetime'
          ? 'تم تفعيل برنامج تاجر بنجاح وبشكل دائم مدى الحياة!'
          : `تم تفعيل برنامج تاجر بنجاح (${payload.type === '1_year' ? 'سنة واحدة' : payload.type === '6_months' ? '6 أشهر' : trialDesc})!`,
      license: signedLicense,
    };
  } catch (error) {
    return {
      isValid: false,
      status: 'invalid_signature',
      message: 'مفتاح السيريال غير صالح أو غير مصرح به.',
    };
  }
};

/**
 * إلغاء التفعيل وحذف الترخيص المحلي
 */
export const deactivateSoftware = async (): Promise<void> => {
  await removePersistedLicense();
};

/**
 * الحصول على الترخيص النشط مباشرة
 */
export const getActiveLicense = (): SignedLicense | null => {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
