/**
 * أدوات ومساعدات معالجة التواريخ والتوقيت المحلي لنظام TADJIR POS
 * Timezone-aware date utilities for reporting & sales filtering
 */

export const MONTHS_AR = [
  'جانفي (يناير)',
  'فيفري (فبراير)',
  'مارس',
  'أفريل (أبريل)',
  'ماي (مايو)',
  'جوان (يونيو)',
  'جويلية (يوليو)',
  'أوت (أغسطس)',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const DAYS_AR_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
export const DAYS_FR_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * استخراج نص التاريخ بصيغة YYYY-MM-DD وفق التوقيت المحلي للجهاز
 */
export const getLocalDateString = (input?: Date | string | number | null): string => {
  if (!input) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dateObj = typeof input === 'object' && input instanceof Date ? input : new Date(input);
  if (isNaN(dateObj.getTime())) return '';

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * بداية اليوم بالتوقيت المحلي (00:00:00.000) بالمللي ثانية
 */
export const getDayStartTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return 0;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
};

/**
 * نهاية اليوم بالتوقيت المحلي (23:59:59.999) بالمللي ثانية
 */
export const getDayEndTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return 0;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
};

/**
 * تنسيق التاريخ للعرض: DD/MM/YYYY
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/**
 * تنسيق التاريخ بنص كامل: مثلاً 15 سبتمبر 2026
 */
export const formatDateLong = (dateStr: string, lang: 'ar' | 'fr' = 'ar'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const year = parts[0];
  const monthIdx = parts[1] - 1;
  const day = parts[2];

  if (lang === 'fr') {
    const monthName = MONTHS_FR[monthIdx] || `${parts[1]}`;
    return `${day} ${monthName} ${year}`;
  }

  const monthName = MONTHS_AR[monthIdx] || `${parts[1]}`;
  return `${day} ${monthName} ${year}`;
};

/**
 * تنسيق الشهر والسنة: مثلاً سبتمبر 2026
 */
export const formatMonthYear = (year: number, month: number, lang: 'ar' | 'fr' = 'ar'): string => {
  const monthIdx = month - 1;
  if (lang === 'fr') {
    const monthName = MONTHS_FR[monthIdx] || `Mois ${month}`;
    return `${monthName} ${year}`;
  }
  const monthName = MONTHS_AR[monthIdx] || `شهر ${month}`;
  return `${monthName} ${year}`;
};

/**
 * التحقق من صلاحية النطاق الزمني: تاريخ النهاية يجب أن يكون مساوياً أو بعد البداية
 */
export const isValidDateRange = (startDateStr: string, endDateStr: string): boolean => {
  if (!startDateStr || !endDateStr) return false;
  return startDateStr <= endDateStr;
};

/**
 * عدد الأيام في شهر معين وسنة معينة
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * اليوم الأول في الشهر (0 = أحد، 1 = إثنين... 6 = سبت)
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month - 1, 1).getDay();
};

/**
 * تنسيق التاريخ والوقت للعرض بالتوقيت المحلي بدقة متناهية: DD/MM/YYYY - HH:mm
 * يمنع تماماً أي إزاحة في الأيام بسبب المنطقة الزمنية
 */
export const formatDateTimeDisplay = (
  input?: Date | string | number | null,
  lang: 'ar' | 'fr' = 'ar',
  includeSeconds: boolean = false
): string => {
  if (!input) return '';
  const d = typeof input === 'object' && input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  const timePart = includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  return `${day}/${m}/${y} - ${timePart}`;
};
