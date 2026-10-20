// =======================================================================
// TADJIR License Manager - Local License Database & Registry
// Manages all issued licenses, client tracking, and lifecycle operations
// =======================================================================

import { ManagedLicenseRecord, LicenseStatus } from '../types';
import { createSignedLicenseCertificate } from './crypto';
import { licenseApiFetch } from '../../../src/utils/license-api';

const LICENSES_DB_KEY = 'tadjir_lm_database_v1';

// سجل التراخيص يبدأ فارغاً بالكامل في بيئة الإنتاج — لا تراخيص مسجلة مسبقاً
const INITIAL_DEMO_RECORDS: ManagedLicenseRecord[] = [];

export const getLicenseRecords = (): ManagedLicenseRecord[] => {
  try {
    const raw = localStorage.getItem(LICENSES_DB_KEY);
    if (!raw) {
      localStorage.setItem(LICENSES_DB_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * مزامنة الترخيص مع السيرفر المركزي عبر HTTP/HTTPS
 */
export const syncLicenseToCentralServer = async (record: ManagedLicenseRecord): Promise<boolean> => {
  try {
    const res = await licenseApiFetch('/api/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'tadjir-admin-license-key-2026' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.warn('Central server sync deferred (offline/local only):', err);
    return false;
  }
};

/**
 * جلب جميع التراخيص من السيرفر المركزي
 */
export const fetchCentralLicenses = async (): Promise<ManagedLicenseRecord[] | null> => {
  try {
    const res = await licenseApiFetch('/api/licenses', {
      headers: { 'x-admin-key': 'tadjir-admin-license-key-2026' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.licenses && Array.isArray(data.licenses)) {
        localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(data.licenses));
        return data.licenses;
      }
    }
  } catch (err) {
    console.warn('Could not fetch from central server:', err);
  }
  return null;
};

/**
 * تحديث حالة الترخيص في السيرفر المركزي (Active / Revoked / Suspended / Expired)
 */
export const updateCentralLicenseStatus = async (
  licenseId: string,
  status: LicenseStatus,
  reason?: string
): Promise<boolean> => {
  try {
    const res = await licenseApiFetch('/api/licenses/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'tadjir-admin-license-key-2026' },
      body: JSON.stringify({ licenseId, status, reason }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not update status on central server:', err);
    return false;
  }
};

/**
 * تمديد تاريخ انتهاء الترخيص عن بعد (Extend Expiration)
 */
export const extendLicenseExpiration = async (
  licenseId: string,
  additionalHours?: number,
  newExpiresAt?: string
): Promise<{ success: boolean; message?: string; license?: any }> => {
  try {
    const res = await licenseApiFetch('/api/licenses/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'tadjir-admin-license-key-2026' },
      body: JSON.stringify({ licenseId, additionalHours, newExpiresAt }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to extend license expiration:', err);
    return { success: false, message: 'فشل الاتصال بالسيرفر المركزي' };
  }
};

/**
 * إعادة تعيين ربط الجهاز (Reset Device Binding)
 */
export const resetDeviceBinding = async (
  licenseId: string
): Promise<{ success: boolean; message?: string; license?: any }> => {
  try {
    const res = await licenseApiFetch('/api/licenses/reset-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'tadjir-admin-license-key-2026' },
      body: JSON.stringify({ licenseId }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to reset device binding:', err);
    return { success: false, message: 'فشل الاتصال بالسيرفر المركزي' };
  }
};

/**
 * جلب حالة الترخيص الكاملة من السيرفر المركزي
 */
export const fetchLicenseStatus = async (
  licenseId: string
): Promise<{ success: boolean; license?: any; message?: string }> => {
  try {
    const res = await licenseApiFetch(`/api/licenses/${licenseId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch license status:', err);
    return { success: false, message: 'فشل الاتصال بالسيرفر المركزي' };
  }
};

/**
 * جلب سجل التدقيق الكامل لترخيص معين
 */
export const fetchLicenseHistory = async (
  licenseId: string
): Promise<{ success: boolean; history?: any[]; message?: string }> => {
  try {
    const res = await licenseApiFetch(`/api/licenses/${licenseId}/history`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch license history:', err);
    return { success: false, message: 'فشل الاتصال بالسيرفر المركزي' };
  }
};

export const saveLicenseRecord = (record: ManagedLicenseRecord): ManagedLicenseRecord => {
  const records = getLicenseRecords();
  const index = records.findIndex((r) => r.id === record.id || r.licenseId === record.licenseId);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }
  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));

  // مزامنة فورية مع السيرفر المركزي
  syncLicenseToCentralServer(record).catch(() => {});

  return record;
};

export const deleteLicenseRecord = (id: string): boolean => {
  const records = getLicenseRecords().filter((r) => r.id !== id);
  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));
  return true;
};

/**
 * تغيير حالة الترخيص (نشط، ملغى، معلق، منتهي) وتحديث السيرفر المركزي فورياً
 */
export const changeLicenseStatus = async (
  id: string,
  newStatus: LicenseStatus,
  reason?: string
): Promise<ManagedLicenseRecord | null> => {
  const records = getLicenseRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return null;

  const previousStatus = record.status;
  record.status = newStatus;
  if (newStatus === 'revoked') {
    record.revocationReason = reason || 'إلغاء الترخيص بواسطة الإدارة';
  } else if (newStatus === 'active') {
    record.revocationReason = undefined;
  }

  record.history = record.history || [];
  record.history.push({
    date: new Date().toISOString(),
    action: `تغيير الحالة من ${previousStatus} إلى ${newStatus}`,
    notes: reason || '',
  });

  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));

  // تحديث السيرفر المركزي فورياً
  await updateCentralLicenseStatus(record.licenseId, newStatus, reason);

  return record;
};

/**
 * إلغاء ترخيص (Revoke) وتعميمه على السيرفر المركزي
 */
export const revokeLicense = (id: string, reason: string): ManagedLicenseRecord | null => {
  const records = getLicenseRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return null;

  record.status = 'revoked';
  record.revocationReason = reason;
  record.history = record.history || [];
  record.history.push({
    date: new Date().toISOString(),
    action: 'إلغاء الترخيص (Revoke)',
    notes: reason,
  });

  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));

  // تحديث السيرفر المركزي
  updateCentralLicenseStatus(record.licenseId, 'revoked', reason).catch(() => {});

  return record;
};

/**
 * نقل الترخيص إلى جهاز كمبيوتر جديد (Transfer to New Device)
 * يعيد توقيع الترخيص تشفيرياً بالمفتاح الخاص وربطه بالمعرف الجديد
 */
export const transferLicenseToNewDevice = async (
  id: string,
  newDeviceId: string,
  transferNotes: string = 'نقل إلى جهاز جديد'
): Promise<ManagedLicenseRecord | null> => {
  const records = getLicenseRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return null;

  // إعادة التوقيع بالمفتاح الخاص للمعرف الجديد
  const cert = await createSignedLicenseCertificate({
    customerName: record.customerName,
    licenseId: record.licenseId,
    serialKey: record.serialKey,
    type: record.type,
    deviceId: newDeviceId.trim().toUpperCase(),
    notes: `${record.notes || ''} | منقول إلى ${newDeviceId}`,
    customExpiresAt: record.expiresAt,
  });

  const oldDevice = record.deviceId || 'غير محدد';
  record.deviceId = newDeviceId.trim().toUpperCase();
  record.signature = cert.signature;
  record.activationToken = cert.activationToken;
  record.status = 'active';
  record.history = record.history || [];
  record.history.push({
    date: new Date().toISOString(),
    action: 'نقل الترخيص لجهاز جديد',
    notes: `من جهاز ${oldDevice} إلى ${newDeviceId}. ${transferNotes}`,
  });

  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));
  return record;
};

/**
 * تجديد أو تمديد ترخيص مؤقت (Renew / Reactivate)
 */
export const renewLicense = async (
  id: string,
  newExpiresAt: string | null,
  renewalNotes: string = 'تجديد الاشتراك'
): Promise<ManagedLicenseRecord | null> => {
  const records = getLicenseRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return null;

  // إعادة التوقيع بالمفتاح الخاص بتاريخ انتهاء جديد
  const cert = await createSignedLicenseCertificate({
    customerName: record.customerName,
    licenseId: record.licenseId,
    serialKey: record.serialKey,
    type: newExpiresAt === null ? 'lifetime' : record.type,
    deviceId: record.deviceId,
    notes: `${record.notes || ''} | ${renewalNotes}`,
    customExpiresAt: newExpiresAt,
  });

  record.expiresAt = newExpiresAt;
  if (newExpiresAt === null) record.type = 'lifetime';
  record.signature = cert.signature;
  record.activationToken = cert.activationToken;
  record.status = 'active';
  record.history = record.history || [];
  record.history.push({
    date: new Date().toISOString(),
    action: 'تجديد الترخيص',
    notes: renewalNotes,
  });

  localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(records));
  return record;
};

/**
 * تصدير قاعدة بيانات التراخيص إلى ملف JSON
 */
export const exportLicenseDatabaseJson = (): string => {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    app: 'TADJIR License Manager',
    count: getLicenseRecords().length,
    licenses: getLicenseRecords(),
  };
  return JSON.stringify(data, null, 2);
};

/**
 * استيراد قاعدة بيانات التراخيص
 */
export const importLicenseDatabaseJson = (jsonString: string): { success: boolean; count?: number; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    const list = Array.isArray(parsed) ? parsed : parsed.licenses;
    if (!Array.isArray(list)) {
      return { success: false, error: 'الملف لا يحتوي على قائمة تراخيص صالحة.' };
    }

    localStorage.setItem(LICENSES_DB_KEY, JSON.stringify(list));
    return { success: true, count: list.length };
  } catch (err) {
    return { success: false, error: 'تنسيق الملف غير صالح.' };
  }
};
