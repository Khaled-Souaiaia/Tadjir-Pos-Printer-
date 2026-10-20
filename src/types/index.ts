// تعريف أنواع البيانات لتطبيق DzPOS Pro المحاسبي لإدارة المحلات التجارية في الجزائر
// Data types and interfaces for DzPOS Pro Algerian Retail ERP

export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash?: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  nameAr: string;
  nameFr: string;
  icon?: string;
  description?: string;
}

export interface ProductUnit {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface Product {
  id: string;
  barcode: string;
  nameAr: string;
  nameFr: string;
  category: string;
  buyPrice: number;     // سعر الشراء بالدينار الجزائري
  sellPrice: number;    // سعر البيع بالدينار الجزائري
  stock: number;        // الكمية المتوفرة
  minStockAlert: number; // حد التنبيه عند انخفاض المخزون
  unit: string;         // وحدة القياس: قطعة، كغ، حزمة
  imageUrl?: string;    // صورة المنتج
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;     // تخفيض إفرادي بالدينار
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'credit' | 'cib_card';

export interface SaleItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  buyPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tvaRate: number;      // نسبة الضريبة الافتراضية 19%
  tvaAmount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
  status: 'completed' | 'refunded' | 'cancelled';
}

export interface CustomerDebtRecord {
  id: string;
  amount: number;
  remainingAmount: number;
  createdAt: string;       // ختم زمني دائم لإنشاء الدين (ISO 8601 Timestamp)
  updatedAt?: string;
  source: 'manual' | 'pos_sale';
  referenceId?: string;    // رقم فاتورة البيع مثلا FAC-2026-0001
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  wilaya: string;
  creditBalance: number; // رصيد الديون (الكريدي)
  notes?: string;
  createdAt: string;     // تاريخ تسجيل العميل
  debtCreatedAt?: string; // تاريخ ووقت إنشاء الدين (الكريدي) الأصلي
  debts?: CustomerDebtRecord[]; // سجل الديون المنفصلة مع تواريخ إنشائها
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  address: string;
  debtBalance: number;   // مستحقات المورد
  createdAt: string;
}

export type ExpenseCategory = 'rent' | 'electricity_gas' | 'salaries' | 'transport' | 'maintenance' | 'taxes' | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  notes?: string;
  date: string;
  createdByName: string;
}

export interface AppSettings {
  storeNameAr: string;
  storeNameFr: string;
  activityDescription: string;
  address: string;
  wilaya: string;
  phone: string;
  rcNumber: string;       // السجل التجاري
  nifNumber: string;      // الرقم التعريفي الجبائي NIF
  nisNumber: string;      // الرقم التعريفي الإحصائي NIS
  aiNumber: string;       // رقم المادة Article d'imposition
  tvaRate: number;        // نسبة TVA (19% افتراضيا في الجزائر)
  currency: string;       // د.ج أو DZD
  receiptFormat: 'thermal_80' | 'thermal_58' | 'a4';
  receiptFooterMessage: string;
  logoUrl?: string;
}

// ==========================================
// أنظمة الترخيص ومفاتيح التفعيل مدى الحياة (Lifetime License)
// ==========================================
export type LicenseType = 'lifetime' | '1_year' | '6_months' | 'trial' | 'custom_trial';

export interface LicensePayload {
  product?: string;            // 'TADJIR'
  version?: string;            // '1.0'
  licenseId: string;
  serialKey: string;           // TADJIR-XXXX-XXXX-XXXX-XXXX
  customerName: string;
  type: LicenseType;
  issuedAt: string;            // ISO Date
  expiresAt: string | null;    // null for lifetime
  durationHours?: number;      // Custom trial duration in hours
  duration_hours?: number;
  deviceId?: string | null;    // optional hardware lock
  notes?: string;
}

export interface SignedLicense {
  payload: LicensePayload;
  signature: string;           // Base64 Signature
  activatedAt: string;
  deviceFingerprint: string;
}

export interface LicenseValidationResult {
  isValid: boolean;
  status:
    | 'valid'
    | 'expired'
    | 'revoked'
    | 'suspended'
    | 'offline_grace_expired'
    | 'device_mismatch'
    | 'invalid_signature'
    | 'malformed'
    | 'clock_rollback_detected'
    | 'product_mismatch'
    | 'unactivated';
  message: string;
  license?: SignedLicense;
  daysRemaining?: number | null;
  hoursRemaining?: number | null;
  durationHours?: number;
  revocationReason?: string;
  isOfflineGrace?: boolean;
  lastOnlineVerifiedAt?: string;
  serverTimestamp?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      printReceipt: (htmlContent: string) => Promise<boolean>;
      openCashDrawer: () => Promise<boolean>;
      executeSql: (query: string, params?: unknown[]) => Promise<{ success: boolean; data?: unknown; error?: string }>;
      getAppVersion: () => Promise<string>;
    };
  }
}

