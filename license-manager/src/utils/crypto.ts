// =======================================================================
// TADJIR License Manager - Cryptographic Signing & Key Engine
// Asymmetric Digital Signatures via Ed25519 Web Crypto API
// The Private Key in this file exists ONLY inside TADJIR License Manager!
// =======================================================================

import { LicensePayload, LicenseType, SignedLicenseCertificate } from '../types';

// المفتاح الخاص السري لتوليد وتوقيع التراخيص
// Master Private Key (Signing Only - STRICTLY DEVELOPER ONLY)
// Never share, export, or include in customer TADJIR builds!
export const MASTER_PRIVATE_KEY_JWK: JsonWebKey = {
  key_ops: ['sign'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  d: 'Byjtc9rtQIjHkKA5MW2RgfSMy_RhrFAdKshburjCHoM',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

// المفتاح العام المرافق للتحقق (مطابق تماماً لما تم تضمينه داخل TADJIR)
// Master Public Key (Verification Only - Embedded in TADJIR)
export const MASTER_PUBLIC_KEY_JWK: JsonWebKey = {
  key_ops: ['verify'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

/**
 * تسلسل البيانات بصيغة نصية قياسية موحدة ودقيقة
 */
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

  const dur = payload.durationHours ?? payload.duration_hours;
  if (dur !== undefined && dur !== null) {
    canonicalObj.durationHours = Number(dur);
  }

  return JSON.stringify(canonicalObj);
};

export const hashLicenseKey = async (serialKey: string): Promise<string> => {
  const cleanKey = serialKey.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const safeBase64ToArrayBuffer = (input: string): ArrayBuffer | null => {
  try {
    if (!input || typeof input !== 'string') return null;

    let clean = input.trim();
    if (clean.includes('%')) {
      try {
        clean = decodeURIComponent(clean);
      } catch {
        // Continue
      }
    }

    clean = clean.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    const mod = clean.length % 4;
    if (mod === 2) clean += '==';
    else if (mod === 3) clean += '=';
    else if (mod === 1) return null;

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
        // Continue
      }
    }

    clean = clean.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
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

/**
 * توقيع ترخيص رقمي باستخدام المفتاح الخاص Ed25519 للمطور
 */
export const signLicensePayload = async (
  payload: LicensePayload,
  privateKeyJwk: JsonWebKey = MASTER_PRIVATE_KEY_JWK
): Promise<string> => {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'Ed25519' },
    false,
    ['sign']
  );

  const canonicalString = serializePayloadCanonical(payload);
  const data = new TextEncoder().encode(canonicalString);

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privKey,
    data
  );

  return arrayBufferToBase64(signatureBuffer);
};

/**
 * التحقق من صحة التوقيع الرقمي للترخيص بالمفتاح العام
 */
export const verifyLicenseSignature = async (
  payload: LicensePayload,
  signatureBase64: string,
  publicKeyJwk: JsonWebKey = MASTER_PUBLIC_KEY_JWK
): Promise<boolean> => {
  try {
    if (!payload || !signatureBase64) return false;

    const signatureBuffer = safeBase64ToArrayBuffer(signatureBase64);
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

/**
 * توليد مفتاح سيريال عشوائي قوي: TADJIR-XXXX-XXXX-XXXX-XXXX
 */
export const generateSerialKeyString = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const getRandomGroup = (len = 4) => {
    let res = '';
    const randomVals = new Uint8Array(len);
    crypto.getRandomValues(randomVals);
    for (let i = 0; i < len; i++) {
      res += chars[randomVals[i] % chars.length];
    }
    return res;
  };

  return `TADJIR-${getRandomGroup(4)}-${getRandomGroup(4)}-${getRandomGroup(4)}-${getRandomGroup(4)}`;
};

/**
 * توليد معرّف ترخيص تلقائي
 */
export const generateLicenseId = (type: LicenseType): string => {
  const year = new Date().getFullYear();
  const prefix = type === 'lifetime' ? 'LIFE' : type === '1_year' ? 'YR1' : type === '6_months' ? 'M06' : 'TRL';
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LIC-${year}-${prefix}-${randomHex}`;
};

/**
 * إنشاء وتوقيع شهادة ترخيص كاملة مع رمز التفعيل المشفر TADJIR-LIC-Base64
 */
export const createSignedLicenseCertificate = async (options: {
  customerName: string;
  licenseId?: string;
  type: LicenseType;
  serialKey?: string;
  deviceId?: string | null;
  notes?: string;
  durationHours?: number;
  durationDays?: number;
  customExpiresAt?: string | null;
  issuedAt?: string;
}): Promise<SignedLicenseCertificate> => {
  const now = options.issuedAt ? new Date(options.issuedAt) : new Date();
  let expiresAt: string | null = null;
  let durationHours: number | undefined = options.durationHours;

  if (options.customExpiresAt !== undefined) {
    expiresAt = options.customExpiresAt;
  } else if (options.type === '1_year') {
    const exp = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
    expiresAt = exp.toISOString();
    durationHours = 365 * 24;
  } else if (options.type === '6_months') {
    const exp = new Date(now.getTime() + 180 * 24 * 3600 * 1000);
    expiresAt = exp.toISOString();
    durationHours = 180 * 24;
  } else if (options.type === 'trial' || options.type === 'custom_trial') {
    // دعم الصلاحية المخصصة بالساعات (Custom Hours Validity)
    const hours = options.durationHours !== undefined && options.durationHours > 0
      ? Number(options.durationHours)
      : (options.durationDays !== undefined && options.durationDays > 0 ? options.durationDays * 24 : 24);
    durationHours = hours;
    const exp = new Date(now.getTime() + hours * 3600 * 1000);
    expiresAt = exp.toISOString();
  }

  const payload: LicensePayload = {
    product: 'TADJIR',
    version: '1.0',
    licenseId: (options.licenseId || generateLicenseId(options.type)).trim().toUpperCase(),
    serialKey: (options.serialKey || generateSerialKeyString()).trim().toUpperCase(),
    customerName: options.customerName.trim(),
    type: options.type,
    issuedAt: now.toISOString(),
    expiresAt,
    durationHours,
    duration_hours: durationHours,
    deviceId: options.deviceId ? options.deviceId.trim().toUpperCase() : null,
    notes: options.notes || '',
  };

  const signature = await signLicensePayload(payload);
  const bundle = { payload, signature };
  const activationToken = `TADJIR-LIC-${btoa(encodeURIComponent(JSON.stringify(bundle)))}`;

  return { payload, signature, activationToken };
};
