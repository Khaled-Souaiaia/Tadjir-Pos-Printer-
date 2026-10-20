import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// مسار حفظ قاعدة بيانات التراخيص المركزية على الخادم
const DATA_DIR = path.resolve(process.env.TADJIR_LICENSE_DATA_DIR || path.join(__dirname, 'data'));
const CENTRAL_DB_FILE = path.resolve(DATA_DIR, 'central-licenses.json');

// التأكد من وجود مجلد البيانات
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const hashLicenseKey = (key: string): string => {
  return crypto.createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
};

export type CentralLicenseStatus = 'active' | 'revoked' | 'suspended' | 'expired';

export interface CentralLicenseRecord {
  id: string;
  licenseId: string;
  serialKey: string;
  license_key_hash?: string;
  customerName: string;
  customerPhone?: string;
  customerWilaya?: string;
  type: string;
  license_type?: string;
  duration_hours?: number;
  durationHours?: number;
  issuedAt: string;
  created_at?: string;
  expiresAt: string | null;
  expires_at?: string | null;
  deviceId: string | null;
  hardware_lock?: string | null;
  notes: string;
  status: CentralLicenseStatus;
  signature: string;
  activationToken: string;
  pricePaidDzd?: number;
  revocationReason?: string;
  revocation_reason?: string;
  revoked_at?: string | null;
  updatedAt?: string;
  history?: Array<{
    date: string;
    action: string;
    notes?: string;
  }>;
}

// المفتاح الخاص للمطور لتوليد وتوقيع التراخيص الرسمية المشفرة Ed25519
const MASTER_PRIVATE_KEY_JWK = {
  key_ops: ['sign'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  d: 'Byjtc9rtQIjHkKA5MW2RgfSMy_RhrFAdKshburjCHoM',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

const serializePayloadCanonical = (payload: any): string => {
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

export const signLicensePayload = async (payload: any): Promise<string> => {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    MASTER_PRIVATE_KEY_JWK,
    { name: 'Ed25519' },
    false,
    ['sign']
  );
  const data = new TextEncoder().encode(serializePayloadCanonical(payload));
  const sigBuffer = await crypto.subtle.sign({ name: 'Ed25519' }, privKey, data);
  return Buffer.from(sigBuffer).toString('base64');
};

// سجل التراخيص المركزية الافتراضي (يحتوي على ترخيص تقييم معتمد دائم)
const DEFAULT_CENTRAL_LICENSES: CentralLicenseRecord[] = [
  {
    id: 'lic-demo-evaluation',
    licenseId: 'LIC-2026-LIFE-DEMO',
    serialKey: 'TADJIR-DEMO-2026-TEST-PASS',
    license_key_hash: hashLicenseKey('TADJIR-DEMO-2026-TEST-PASS'),
    customerName: 'نسخة تجريبية / تقييم النظام',
    type: 'lifetime',
    license_type: 'lifetime',
    issuedAt: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    expires_at: null,
    deviceId: null,
    hardware_lock: null,
    notes: 'Official Evaluation License',
    status: 'active',
    signature: 'Ya0LKJiSWoyAgCOXAMF12+epng1vx7ePTJn+2cNxI4+psczyk5+smKS/14goXRve1rR9JIpuSPpjQhf8q4xwBQ==',
    activationToken: 'TADJIR-LIC-JTdCJTIycGF5bG9hZCUyMiUzQSU3QiUyMnByb2R1Y3QlMjIlM0ElMjJUQURKSVIlMjIlMkMlMjJ2ZXJzaW9uJTIyJTNBJTIyMS4wJTIyJTJDJTIybGljZW5zZUlkJTIyJTNBJTIyTElDLTIwMjYtTElGRS1ERU1PJTIyJTJDJTIyc2VyaWFsS2V5JTIyJTNBJTIyVEFESklSLURFTU8tMjAyNi1URVNULVBBU1MlMjIlMkMlMjJjdXN0b21lck5hbWUlMjIlM0ElMjIlRDklODYlRDglQjMlRDglQUUlRDglQTklMjAlRDglQUElRDglQUMlRDglQjElRDklOEElRDglQTglRDklOEElRDglQTklMjAlMkYlMjAlRDglQUElRDklODIlRDklOEElRDklOEElRDklODUlMjAlRDglQTclRDklODQlRDklODYlRDglQjglRDglQTclRDklODUlMjIlMkMlMjJ0eXBlJTIyJTNBJTIybGlmZXRpbWUlMjIlMkMlMjJpc3N1ZWRBdCUyMiUzQSUyMjIwMjYtMDEtMDFUMDAlM0EwMCUzQTAwLjAwMFolMjIlMkMlMjJleHBpcmVzQXQlMjIlM0FudWxsJTJDJTIyZGV2aWNlSWQlMjIlM0FudWxsJTJDJTIybm90ZXMlMjIlM0ElMjJPZmZpY2lhbCUyMEV2YWx1YXRpb24lMjBMaWNlbnNlJTIyJTdEJTJDJTIyc2lnbmF0dXJlJTIyJTNBJTIyWWEwTEtKaVNXb3lBZ0NPWEFNRjEyJTJCZXBuZzF2eDdlUFRKbiUyQjJjTnhJNCUyQnBzY3p5azUlMkJzbUtTJTJGMTRnb1hSdmUxclI5SklwdVNQcGpRaGY4cTR4d0JRJTNEJTNEJTIyJTdE',
    pricePaidDzd: 0,
    updatedAt: new Date().toISOString(),
  },
];

// قراءة التراخيص من الملف المركزي
const readCentralLicenses = (): CentralLicenseRecord[] => {
  try {
    if (!fs.existsSync(CENTRAL_DB_FILE)) {
      fs.writeFileSync(CENTRAL_DB_FILE, JSON.stringify(DEFAULT_CENTRAL_LICENSES, null, 2), 'utf8');
      return [...DEFAULT_CENTRAL_LICENSES];
    }
    const raw = fs.readFileSync(CENTRAL_DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fs.writeFileSync(CENTRAL_DB_FILE, JSON.stringify(DEFAULT_CENTRAL_LICENSES, null, 2), 'utf8');
      return [...DEFAULT_CENTRAL_LICENSES];
    }
    const hasDemo = parsed.some((l) => l.serialKey === 'TADJIR-DEMO-2026-TEST-PASS');
    if (!hasDemo) {
      parsed.push(...DEFAULT_CENTRAL_LICENSES);
      fs.writeFileSync(CENTRAL_DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch (err) {
    console.error('Error reading central licenses DB:', err);
    return [...DEFAULT_CENTRAL_LICENSES];
  }
};

// كتابة التراخيص إلى الملف المركزي
const writeCentralLicenses = (licenses: CentralLicenseRecord[]): void => {
  try {
    fs.writeFileSync(CENTRAL_DB_FILE, JSON.stringify(licenses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing central licenses DB:', err);
  }
};

// =======================================================================
// مسارات API للتراخيص المركزية والتحقق الفوري (Central License API)
// =======================================================================

// مسار توقيت السيرفر الرسمي لإنشاء وتوثيق الطوابع الزمنية للديون والعمليات
app.get('/api/server-time', (_req: Request, res: Response) => {
  const now = new Date();
  res.json({
    success: true,
    iso: now.toISOString(),
    timestamp: now.getTime(),
  });
});

// 1. جلب جميع التراخيص المسجلة في السيرفر المركزي
app.get('/api/licenses', (_req: Request, res: Response) => {
  const licenses = readCentralLicenses();
  res.json({
    success: true,
    count: licenses.length,
    licenses,
  });
});

// 2. تسجيل أو إنشاء ترخيص جديد في السيرفر المركزي (عند التوليد من License Manager)
app.post('/api/licenses', (req: Request, res: Response) => {
  const license: Partial<CentralLicenseRecord> = req.body;
  if (!license || !license.serialKey || !license.licenseId) {
    return res.status(400).json({ success: false, message: 'Invalid license key. بيانات الترخيص غير مكتملة' });
  }

  const cleanSerial = String(license.serialKey).trim().toUpperCase();
  const cleanId = String(license.licenseId).trim().toUpperCase();
  const keyHash = hashLicenseKey(cleanSerial);

  const licenses = readCentralLicenses();

  // منع تكرار مفاتيح السيريال عبر تراخيص مختلفة (Prevent Duplicate Keys)
  const duplicateIndex = licenses.findIndex(
    (l) => l.licenseId !== cleanId && (l.serialKey?.trim().toUpperCase() === cleanSerial || l.license_key_hash === keyHash)
  );
  if (duplicateIndex >= 0) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate license key. مفتاح السيريال مستخدم بالفعل في ترخيص آخر',
    });
  }

  const existingIndex = licenses.findIndex(
    (l) => l.licenseId === cleanId || l.serialKey?.trim().toUpperCase() === cleanSerial
  );

  const serverNow = new Date();
  const issuedAtStr = license.issuedAt || license.created_at || serverNow.toISOString();

  // حساب وقت الانتهاء بالساعات بدقة استناداً إلى وقت السيرفر (Automatic Expiration Calculation)
  let durationHours = license.duration_hours || license.durationHours;
  let expiresAtStr: string | null = license.expiresAt || license.expires_at || null;

  if (license.type === 'trial' || license.type === 'custom_trial' || license.license_type === 'custom_trial') {
    if (durationHours && durationHours > 0) {
      const expDate = new Date(new Date(issuedAtStr).getTime() + durationHours * 3600 * 1000);
      expiresAtStr = expDate.toISOString();
    } else if (!expiresAtStr) {
      durationHours = 24;
      expiresAtStr = new Date(new Date(issuedAtStr).getTime() + 24 * 3600 * 1000).toISOString();
    }
  }

  const updatedRecord: CentralLicenseRecord = {
    id: license.id || `lic-${Date.now()}`,
    licenseId: cleanId,
    serialKey: cleanSerial,
    license_key_hash: keyHash,
    customerName: license.customerName || 'عميل تجريبي',
    customerPhone: license.customerPhone || '',
    customerWilaya: license.customerWilaya || '',
    type: (license.type || license.license_type || 'trial') as string,
    license_type: (license.license_type || license.type || 'trial') as string,
    duration_hours: durationHours,
    durationHours: durationHours,
    issuedAt: issuedAtStr,
    created_at: issuedAtStr,
    expiresAt: expiresAtStr,
    expires_at: expiresAtStr,
    deviceId: license.deviceId || license.hardware_lock || null,
    hardware_lock: license.hardware_lock || license.deviceId || null,
    notes: license.notes || '',
    status: license.status || 'active',
    signature: license.signature || '',
    activationToken: license.activationToken || '',
    pricePaidDzd: license.pricePaidDzd || 0,
    revocationReason: license.revocationReason || license.revocation_reason,
    revocation_reason: license.revocation_reason || license.revocationReason,
    revoked_at: license.revoked_at || null,
    updatedAt: serverNow.toISOString(),
    history: license.history || [
      {
        date: serverNow.toISOString(),
        action: 'تسجيل الترخيص في السيرفر المركزي',
        notes: `النوع: ${license.type}, الصلاحية: ${durationHours ? `${durationHours}h` : 'دائم'}`,
      },
    ],
  };

  if (existingIndex >= 0) {
    licenses[existingIndex] = { ...licenses[existingIndex], ...updatedRecord };
  } else {
    licenses.unshift(updatedRecord);
  }

  writeCentralLicenses(licenses);
  return res.json({ success: true, license: updatedRecord });
});

// 3. تحديث حالة الترخيص عن بعد (Deactivate / Revoke / Suspend / Reactivate)
app.post('/api/licenses/status', (req: Request, res: Response) => {
  const { id, licenseId, serialKey, status, reason } = req.body;
  if (!status || (!id && !licenseId && !serialKey)) {
    return res.status(400).json({ success: false, message: 'معرف الترخيص والحالة مطلوبان' });
  }

  const validStatuses: CentralLicenseStatus[] = ['active', 'revoked', 'suspended', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
  }

  const licenses = readCentralLicenses();
  const cleanSerial = serialKey ? String(serialKey).trim().toUpperCase() : '';
  const cleanKeyHash = cleanSerial ? hashLicenseKey(cleanSerial) : '';

  const record = licenses.find(
    (l) =>
      (id && l.id === id) ||
      (licenseId && l.licenseId === licenseId) ||
      (cleanSerial && l.serialKey?.trim().toUpperCase() === cleanSerial) ||
      (cleanKeyHash && l.license_key_hash === cleanKeyHash)
  );

  if (!record) {
    return res.status(404).json({ success: false, message: 'Invalid license key. الترخيص غير موجود في السجل المركزي' });
  }

  const previousStatus = record.status;
  const nowIso = new Date().toISOString();
  record.status = status;
  record.updatedAt = nowIso;
  if (status === 'revoked') {
    record.revocationReason = reason || 'License has been revoked. (إلغاء الترخيص بواسطة الإدارة)';
    record.revocation_reason = record.revocationReason;
    record.revoked_at = nowIso;
  } else if (status === 'active') {
    record.revocationReason = undefined;
    record.revocation_reason = undefined;
    record.revoked_at = null;
  }

  record.history = record.history || [];
  record.history.push({
    date: nowIso,
    action: `تغيير الحالة من ${previousStatus} إلى ${status}`,
    notes: reason || '',
  });

  writeCentralLicenses(licenses);
  console.log(`[Central License Server] License ${record.licenseId} (${record.customerName}) changed to ${status}`);

  return res.json({
    success: true,
    message: `تم تحديث حالة الترخيص إلى ${status} بنجاح`,
    license: record,
  });
});

// 4. التحقق الفوري والدوري للترخيص من تطبيق TADJIR العميل (Authoritative Server-Side Validation)
app.post('/api/licenses/verify', (req: Request, res: Response) => {
  const { serialKey, licenseId, deviceId } = req.body;

  if (!serialKey && !licenseId) {
    return res.status(400).json({
      valid: false,
      status: 'invalid_request',
      message: 'License has not been activated. مفتاح السيريال أو معرف الترخيص مطلوب للتحقق.',
    });
  }

  const licenses = readCentralLicenses();
  const cleanSerial = serialKey ? String(serialKey).trim().toUpperCase() : '';
  const cleanId = licenseId ? String(licenseId).trim().toUpperCase() : '';
  const keyHash = cleanSerial ? hashLicenseKey(cleanSerial) : '';

  const record = licenses.find(
    (l) =>
      (cleanSerial && l.serialKey && l.serialKey.trim().toUpperCase() === cleanSerial) ||
      (cleanId && l.licenseId && l.licenseId.trim().toUpperCase() === cleanId) ||
      (keyHash && l.license_key_hash === keyHash)
  );

  const serverNow = Date.now();
  const serverTimestamp = new Date().toISOString();

  // إذا لم يكن الترخيص مسجلاً في السيرفر المركزي بعد
  if (!record) {
    return res.json({
      found: false,
      valid: false,
      status: 'not_found',
      message: 'Invalid license key. الترخيص غير مسجل في السيرفر المركزي. يرجى تزويد المطور برمز التفعيل.',
      serverTimestamp,
    });
  }

  // 1. التحقق من تاريخ الانتهاء بالساعة والدقيقة استناداً حصرياً إلى توقيت السيرفر
  const expStr = record.expiresAt || record.expires_at;
  if (expStr) {
    const expTime = new Date(expStr).getTime();
    if (isNaN(expTime) || expTime <= serverNow) {
      record.status = 'expired';
      writeCentralLicenses(licenses);
      return res.json({
        found: true,
        valid: false,
        status: 'expired',
        message: 'License expired. (انتهت صلاحية هذا الترخيص المؤقت. يرجى الترقية إلى ترخيص دائم).',
        serverTimestamp,
        expiresAt: expStr,
        hoursRemaining: 0,
      });
    }
  }

  // 2. إذا كان الترخيص ملغى (Revoked) من قِبل المدير
  if (record.status === 'revoked') {
    return res.json({
      found: true,
      valid: false,
      status: 'revoked',
      revocationReason: record.revocationReason || record.revocation_reason || 'License has been revoked.',
      message: 'License has been revoked. (تم إلغاء تفعيل هذا الترخيص بواسطة الإدارة).',
      serverTimestamp,
    });
  }

  // 3. إذا كان الترخيص معلقاً مؤقتاً (Suspended)
  if (record.status === 'suspended') {
    return res.json({
      found: true,
      valid: false,
      status: 'suspended',
      message: 'تم تعليق هذا الترخيص مؤقتاً. يرجى التواصل مع الإدارة لتسوية الحساب.',
      serverTimestamp,
    });
  }

  // 4. التحقق من ربط الجهاز إن وجد (Hardware Lock)
  const lockedDevice = record.hardware_lock || record.deviceId;
  if (lockedDevice && deviceId) {
    const recordDev = lockedDevice.trim().toUpperCase();
    const clientDev = String(deviceId).trim().toUpperCase();
    if (recordDev !== clientDev) {
      return res.json({
        found: true,
        valid: false,
        status: 'device_mismatch',
        message: `License is not valid for this device. (هذا الترخيص مخصص لجهاز كمبيوتر آخر: ${lockedDevice}).`,
        serverTimestamp,
      });
    }
  }

  // حساب الساعات المتبقية بدقة
  let remainingHours: number | null = null;
  if (expStr) {
    const diffMs = Math.max(0, new Date(expStr).getTime() - serverNow);
    remainingHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  }

  // الترخيص نشط وصالح بنجاح (Active)
  return res.json({
    found: true,
    valid: true,
    status: 'active',
    customerName: record.customerName,
    type: record.type || record.license_type,
    durationHours: record.duration_hours || record.durationHours,
    issuedAt: record.issuedAt || record.created_at,
    expiresAt: expStr,
    remainingHours,
    hoursRemaining: remainingHours,
    gracePeriodHours: 168, // فترة سماح دون اتصال بالإنترنت = 7 أيام
    serverTimestamp,
    message: 'الترخيص نشط ومصرح به في السيرفر المركزي.',
  });
});

// 5. مزامنة جماعية من License Manager (Bulk Sync)
app.post('/api/licenses/sync', (req: Request, res: Response) => {
  const { licenses: incomingLicenses } = req.body;
  if (!Array.isArray(incomingLicenses)) {
    return res.status(400).json({ success: false, message: 'قائمة تراخيص غير صالحة' });
  }

  const existing = readCentralLicenses();
  const map = new Map<string, CentralLicenseRecord>();

  existing.forEach((l) => map.set(l.licenseId, l));
  incomingLicenses.forEach((l) => {
    if (l && l.licenseId) {
      const prev = map.get(l.licenseId);
      // الحفاظ على حالة الإلغاء إذا تم إلغاؤها من السيرفر
      const mergedStatus = prev?.status === 'revoked' ? 'revoked' : l.status || 'active';
      map.set(l.licenseId, { ...prev, ...l, status: mergedStatus, updatedAt: new Date().toISOString() });
    }
  });

  const merged = Array.from(map.values());
  writeCentralLicenses(merged);

  return res.json({
    success: true,
    count: merged.length,
    message: 'تمت مزامنة التراخيص مع السيرفر المركزي بنجاح',
  });
});

// 6. تمديد تاريخ الانتهاء لترخيص معين (Extend Expiration)
app.post('/api/licenses/extend', (req: Request, res: Response) => {
  const { id, licenseId, serialKey, newExpiresAt, additionalHours } = req.body;

  if (!id && !licenseId && !serialKey) {
    return res.status(400).json({ success: false, message: 'معرف الترخيص مطلوب' });
  }

  if (!newExpiresAt && !additionalHours) {
    return res.status(400).json({ success: false, message: 'يجب تحديد تاريخ انتهاء جديد أو ساعات إضافية' });
  }

  const licenses = readCentralLicenses();
  const cleanSerial = serialKey ? String(serialKey).trim().toUpperCase() : '';
  const cleanKeyHash = cleanSerial ? hashLicenseKey(cleanSerial) : '';

  const record = licenses.find(
    (l) =>
      (id && l.id === id) ||
      (licenseId && l.licenseId === licenseId) ||
      (cleanSerial && l.serialKey?.trim().toUpperCase() === cleanSerial) ||
      (cleanKeyHash && l.license_key_hash === cleanKeyHash)
  );

  if (!record) {
    return res.status(404).json({ success: false, message: 'الترخيص غير موجود' });
  }

  const nowIso = new Date().toISOString();
  const oldExpiry = record.expiresAt || record.expires_at;

  if (newExpiresAt) {
    record.expiresAt = newExpiresAt;
    record.expires_at = newExpiresAt;
  } else if (additionalHours) {
    const currentExpiry = oldExpiry ? new Date(oldExpiry) : new Date();
    const extended = new Date(currentExpiry.getTime() + additionalHours * 3600 * 1000);
    record.expiresAt = extended.toISOString();
    record.expires_at = extended.toISOString();
  }

  record.updatedAt = nowIso;
  record.history = record.history || [];
  record.history.push({
    date: nowIso,
    action: 'تمديد تاريخ الانتهاء',
    notes: `من ${oldExpiry || 'دائم'} إلى ${record.expiresAt}`,
  });

  writeCentralLicenses(licenses);
  console.log(`[Central License Server] License ${record.licenseId} expiration extended`);

  return res.json({
    success: true,
    message: 'تم تمديد تاريخ انتهاء الترخيص بنجاح',
    license: record,
  });
});

// 7. إعادة تعيين ربط الجهاز (Reset Device Binding)
app.post('/api/licenses/reset-device', (req: Request, res: Response) => {
  const { id, licenseId, serialKey } = req.body;

  if (!id && !licenseId && !serialKey) {
    return res.status(400).json({ success: false, message: 'معرف الترخيص مطلوب' });
  }

  const licenses = readCentralLicenses();
  const cleanSerial = serialKey ? String(serialKey).trim().toUpperCase() : '';
  const cleanKeyHash = cleanSerial ? hashLicenseKey(cleanSerial) : '';

  const record = licenses.find(
    (l) =>
      (id && l.id === id) ||
      (licenseId && l.licenseId === licenseId) ||
      (cleanSerial && l.serialKey?.trim().toUpperCase() === cleanSerial) ||
      (cleanKeyHash && l.license_key_hash === cleanKeyHash)
  );

  if (!record) {
    return res.status(404).json({ success: false, message: 'الترخيص غير موجود' });
  }

  const nowIso = new Date().toISOString();
  const oldDevice = record.deviceId || record.hardware_lock;

  record.deviceId = null;
  record.hardware_lock = null;
  record.updatedAt = nowIso;
  record.history = record.history || [];
  record.history.push({
    date: nowIso,
    action: 'إعادة تعيين ربط الجهاز',
    notes: `تم إزالة الربط بالجهاز ${oldDevice || 'غير محدد'}`,
  });

  writeCentralLicenses(licenses);
  console.log(`[Central License Server] License ${record.licenseId} device binding reset`);

  return res.json({
    success: true,
    message: 'تم إعادة تعيين ربط الجهاز بنجاح',
    license: record,
  });
});

// 8. جلب حالة الترخيص بالتفصيل (Get License Status with Full Details)
app.get('/api/licenses/:identifier', (req: Request, res: Response) => {
  const { identifier } = req.params;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'معرف الترخيص مطلوب' });
  }

  const licenses = readCentralLicenses();
  const cleanId = identifier.trim().toUpperCase();
  const keyHash = hashLicenseKey(cleanId);

  const record = licenses.find(
    (l) =>
      l.id === identifier ||
      l.licenseId?.trim().toUpperCase() === cleanId ||
      l.serialKey?.trim().toUpperCase() === cleanId ||
      l.license_key_hash === keyHash
  );

  if (!record) {
    return res.status(404).json({ success: false, message: 'الترخيص غير موجود' });
  }

  return res.json({
    success: true,
    license: record,
  });
});

// 9. سجل التدقيق (Audit Log) - جلب التاريخ الكامل لترخيص معين
app.get('/api/licenses/:identifier/history', (req: Request, res: Response) => {
  const { identifier } = req.params;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'معرف الترخيص مطلوب' });
  }

  const licenses = readCentralLicenses();
  const cleanId = identifier.trim().toUpperCase();
  const keyHash = hashLicenseKey(cleanId);

  const record = licenses.find(
    (l) =>
      l.id === identifier ||
      l.licenseId?.trim().toUpperCase() === cleanId ||
      l.serialKey?.trim().toUpperCase() === cleanId ||
      l.license_key_hash === keyHash
  );

  if (!record) {
    return res.status(404).json({ success: false, message: 'الترخيص غير موجود' });
  }

  return res.json({
    success: true,
    licenseId: record.licenseId,
    customerName: record.customerName,
    history: record.history || [],
  });
});

// 10. توليد وتفعيل ترخيص تجريبي فوري للتقييم (Quick Trial Activation Endpoint)
app.post('/api/licenses/quick-trial', async (req: Request, res: Response) => {
  try {
    const { deviceId, customerName } = req.body || {};
    const now = new Date();
    const cleanDeviceId = deviceId ? String(deviceId).trim().toUpperCase() : null;
    const clientName = customerName ? String(customerName).trim() : 'تجربة فورية (Quick Trial)';
    const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randKeyHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const serialKey = `TADJIR-${randKeyHex()}-${randKeyHex()}-${randKeyHex()}-${randKeyHex()}`;
    const licenseId = `LIC-${now.getFullYear()}-TRL-${randHex}`;

    const expDate = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7 days trial
    const payload = {
      product: 'TADJIR',
      version: '1.0',
      licenseId,
      serialKey,
      customerName: clientName,
      type: 'trial',
      issuedAt: now.toISOString(),
      expiresAt: expDate.toISOString(),
      durationHours: 168,
      duration_hours: 168,
      deviceId: cleanDeviceId,
      notes: 'Quick Evaluation Trial',
    };

    const signature = await signLicensePayload(payload);
    const bundle = { payload, signature };
    const activationToken = `TADJIR-LIC-${Buffer.from(encodeURIComponent(JSON.stringify(bundle))).toString('base64')}`;

    const record: CentralLicenseRecord = {
      id: `lic-${Date.now()}`,
      licenseId,
      serialKey,
      license_key_hash: hashLicenseKey(serialKey),
      customerName: clientName,
      type: 'trial',
      license_type: 'trial',
      duration_hours: 168,
      durationHours: 168,
      issuedAt: now.toISOString(),
      expiresAt: expDate.toISOString(),
      deviceId: cleanDeviceId,
      notes: 'Quick Evaluation Trial',
      status: 'active',
      signature,
      activationToken,
      pricePaidDzd: 0,
      updatedAt: now.toISOString(),
    };

    const licenses = readCentralLicenses();
    licenses.unshift(record);
    writeCentralLicenses(licenses);

    return res.json({
      success: true,
      serialKey,
      activationToken,
      license: record,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating trial' });
  }
});

// إعادة توجيه مسار مدير التراخيص إلى /license-manager/ فقط إذا كان المسار دقيقاً دون سلاش
app.use((req, res, next) => {
  if (req.path === '/license-manager') {
    return res.redirect(301, '/license-manager/');
  }
  next();
});

// =======================================================================
// إعداد Vite في بيئة التطوير أو تقديم الملفات الثابتة في الإنتاج
// =======================================================================
// Serve static assets from public/ folder (sample PDFs, icons, assets)
app.use(express.static(path.resolve('public')));

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('/license-manager*', (_req: Request, res: Response) => {
      const lmPath = path.resolve(distPath, 'license-manager', 'index.html');
      if (fs.existsSync(lmPath)) {
        res.sendFile(lmPath);
      } else {
        res.sendFile(path.resolve(distPath, 'index.html'));
      }
    });

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[TADJIR Full-Stack Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
