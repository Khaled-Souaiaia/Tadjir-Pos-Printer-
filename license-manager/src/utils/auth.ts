// =======================================================================
// TADJIR License Manager - Developer Security & Authentication
// Protects the License Manager against unauthorized access
// =======================================================================

const AUTH_STORAGE_KEY = 'tadjir_lm_auth_hash_v1';
const FAILED_ATTEMPTS_KEY = 'tadjir_lm_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'tadjir_lm_lockout_until';
const SESSION_KEY = 'tadjir_lm_active_session';
const AUTO_LOCK_MINUTES_KEY = 'tadjir_lm_autolock_minutes';

const DEFAULT_SALT = 'TADJIR_DEV_SECURE_SALT_2026';
// كلمة المرور الافتراضية الأولية للمطور: Admin@Tajir2026!
const DEFAULT_INITIAL_PASS = 'Admin@Tajir2026!';

/**
 * تجزئة كلمة المرور تشفيرياً باستخدام SHA-256 مع الملح
 */
export const hashPassword = async (password: string, salt: string = DEFAULT_SALT): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * التحقق مما إذا كان حساب المطور مقفلاً مؤقتاً بسبب المحاولات الخاطئة
 */
export const getLockoutStatus = (): { isLocked: boolean; remainingSeconds: number } => {
  const lockoutUntilStr = localStorage.getItem(LOCKOUT_UNTIL_KEY);
  if (!lockoutUntilStr) return { isLocked: false, remainingSeconds: 0 };

  const lockoutUntil = parseInt(lockoutUntilStr, 10);
  const now = Date.now();
  if (now < lockoutUntil) {
    const remaining = Math.ceil((lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds: remaining };
  }

  // انتهى وقت القفل
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  return { isLocked: false, remainingSeconds: 0 };
};

/**
 * التحقق من كلمة مرور المطور لتسجيل الدخول
 */
export const authenticateDeveloper = async (passwordInput: string): Promise<{
  success: boolean;
  message?: string;
  remainingAttempts?: number;
  lockoutSeconds?: number;
}> => {
  // التحقق من حالة القفل
  const lockout = getLockoutStatus();
  if (lockout.isLocked) {
    return {
      success: false,
      message: `تم قفل الحساب مؤقتًا لحمايته من الهجمات. يرجى الانتظار ${lockout.remainingSeconds} ثانية.`,
      lockoutSeconds: lockout.remainingSeconds,
    };
  }

  const storedHash = localStorage.getItem(AUTH_STORAGE_KEY);
  let expectedHash = storedHash;

  // إذا كانت المرة الأولى، يتم اعتماد الهاش الافتراضي
  if (!expectedHash) {
    expectedHash = await hashPassword(DEFAULT_INITIAL_PASS);
    localStorage.setItem(AUTH_STORAGE_KEY, expectedHash);
  }

  const inputHash = await hashPassword(passwordInput);

  if (inputHash === expectedHash) {
    // نجاح الدخول - إعادة تعيين عداد الفشل
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);

    // إنشاء الجلسة
    const sessionData = {
      authenticated: true,
      lastActive: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true };
  } else {
    // فشل الدخول - تسجيل المحاولة
    const currentFailed = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
    localStorage.setItem(FAILED_ATTEMPTS_KEY, currentFailed.toString());

    const maxAttempts = 5;
    const remaining = Math.max(0, maxAttempts - currentFailed);

    if (currentFailed >= maxAttempts) {
      // قفل الحساب لمدة 60 ثانية
      const lockoutPeriodMs = 60 * 1000;
      localStorage.setItem(LOCKOUT_UNTIL_KEY, (Date.now() + lockoutPeriodMs).toString());
      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم قفل الدخول لمدة 60 ثانية.',
        lockoutSeconds: 60,
      };
    }

    return {
      success: false,
      message: `كلمة المرور غير صحيحة! المحاولات المتبقية قبل القفل: ${remaining}`,
      remainingAttempts: remaining,
    };
  }
};

/**
 * التحقق من صلاحية الجلسة الحالية وتحديث وقت النشاط
 */
export const checkDeveloperSession = (): boolean => {
  const sessionStr = sessionStorage.getItem(SESSION_KEY);
  if (!sessionStr) return false;

  try {
    const session = JSON.parse(sessionStr);
    if (!session.authenticated) return false;

    const timeoutMinutes = parseInt(localStorage.getItem(AUTO_LOCK_MINUTES_KEY) || '5', 10);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = Date.now();

    if (now - session.lastActive > timeoutMs) {
      // انتهاء مهلة عدم النشاط
      lockDeveloperSession();
      return false;
    }

    // تحديث وقت النشاط
    session.lastActive = now;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
};

/**
 * قفل الجلسة يدويًا أو تلقائيًا
 */
export const lockDeveloperSession = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};

/**
 * تغيير كلمة مرور المطور
 */
export const changeDeveloperPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const auth = await authenticateDeveloper(currentPassword);
  if (!auth.success) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة.' };
  }

  if (newPassword.length < 8) {
    return { success: false, message: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.' };
  }

  const newHash = await hashPassword(newPassword);
  localStorage.setItem(AUTH_STORAGE_KEY, newHash);
  return { success: true, message: 'تم تحديث كلمة مرور المطور بنجاح.' };
};
