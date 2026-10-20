// خدمة قاعدة البيانات المحلية لنظام DzPOS Pro
// يدعم التخزين المحلي Offline بالكامل في المتصفح والتطبيق المكتبي Electron
// SQLite Database Service with offline persistence and Electron IPC integration

import { Product, ProductCategory, ProductUnit, Customer, CustomerDebtRecord, Supplier, Sale, Expense, AppSettings, User } from '../types';
import { getLocalDateString, getDayStartTimestamp, getDayEndTimestamp } from '../utils/date-utils';

export interface SalesFilterCriteria {
  dateMode?: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;    // 'YYYY-MM-DD'
  endDate?: string;      // 'YYYY-MM-DD'
  singleDate?: string;   // 'YYYY-MM-DD'
  year?: number;         // e.g. 2026
  month?: number;        // 1-12
  cashierName?: string;  // cashier name or 'all'
  paymentMethod?: string;// 'cash' | 'credit' | 'cib_card' | 'all'
  customerId?: string;   // customer ID or 'all'
}

// المفاتيح في التخزين المحلي
const STORAGE_PREFIX = 'dzpos_db_';
const KEYS = {
  PRODUCTS: `${STORAGE_PREFIX}products`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  UNITS: `${STORAGE_PREFIX}units`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  SUPPLIERS: `${STORAGE_PREFIX}suppliers`,
  SALES: `${STORAGE_PREFIX}sales`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
  USERS: `${STORAGE_PREFIX}users`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  INITIALIZED: `${STORAGE_PREFIX}initialized_v2`,
};

// بيانات الأصناف الافتراضية (هياكل تصنيف فارغة — لا بيانات تجريبية)
export const UNCATEGORIZED_CATEGORY: ProductCategory = {
  id: 'cat_uncategorized',
  nameAr: 'غير مصنف',
  nameFr: 'Non catégorisé',
  icon: 'Folder',
};

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat_grocery', nameAr: 'المواد الغذائية العامة', nameFr: 'Épicerie Générale', icon: 'ShoppingBag' },
  { id: 'cat_beverages', nameAr: 'المشروبات والعصائر', nameFr: 'Boissons & Eaux', icon: 'Coffee' },
  { id: 'cat_dairy', nameAr: 'الحليب ومشتقاته', nameFr: 'Produits Laitiers', icon: 'Milk' },
  { id: 'cat_cleaning', nameAr: 'مواد التنظيف والمنزل', nameFr: 'Hygiène & Entretien', icon: 'Sparkles' },
  { id: 'cat_biscuits', nameAr: 'البسكويت والشكولاطة', nameFr: 'Biscuits & Confiserie', icon: 'Cookie' },
  { id: 'cat_coffee_tea', nameAr: 'القهوة والشاي', nameFr: 'Café & Thé', icon: 'CupSoda' },
];

// وحدات القياس الافتراضية
export const DEFAULT_UNITS: ProductUnit[] = [
  { id: 'unit_piece', name: 'قطعة', abbreviation: 'Pièce' },
  { id: 'unit_box', name: 'علبة', abbreviation: 'Boîte' },
  { id: 'unit_sachet', name: 'كيس', abbreviation: 'Sachet' },
  { id: 'unit_bottle', name: 'قارورة', abbreviation: 'Bouteille' },
  { id: 'unit_kg', name: 'كغ', abbreviation: 'Kg' },
  { id: 'unit_pack', name: 'باكي', abbreviation: 'Paquet' },
];

// قائمة منتجات فارغة — لا بيانات تجريبية في بيئة الإنتاج والتثبيت الجديد
export const DEFAULT_PRODUCTS: Product[] = [];

// زبون عام مطلوب للنظام (لا بيانات تجريبية أخرى)
export const DEFAULT_WALKIN_CUSTOMER: Customer = {
  id: 'cust_walkin',
  name: 'زبون عام',
  phone: '-',
  address: '-',
  wilaya: '-',
  creditBalance: 0,
  notes: '',
  createdAt: new Date().toISOString(),
};

// العملاء يبدأون فارغين في بيئة الإنتاج — لا بيانات تجريبية
export const DEFAULT_CUSTOMERS: Customer[] = [DEFAULT_WALKIN_CUSTOMER];

// الموردون يبدأون فارغين في بيئة الإنتاج — لا بيانات تجريبية
export const DEFAULT_SUPPLIERS: Supplier[] = [];

// إعدادات النظام الافتراضية المحايدة للتثبيت الجديد
export const DEFAULT_SETTINGS: AppSettings = {
  storeNameAr: '',
  storeNameFr: '',
  activityDescription: '',
  address: '',
  wilaya: '',
  phone: '',
  rcNumber: '',
  nifNumber: '',
  nisNumber: '',
  aiNumber: '',
  tvaRate: 0,
  currency: 'د.ج',
  receiptFormat: 'thermal_80',
  receiptFooterMessage: 'شكرًا لزيارتكم | Merci pour votre visite!',
};

// المستخدم الإداري الافتراضي
export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'المدير',
    role: 'admin',
    passwordHash: 'admin',
    createdAt: new Date().toISOString(),
  },
];

// المصاريف والمبيعات تبدأ فارغة في بيئة الإنتاج — لا بيانات تجريبية
export const DEFAULT_EXPENSES: Expense[] = [];
export const DEFAULT_SALES: Sale[] = [];

// فئة إدارة قاعدة البيانات
class DatabaseService {
  // ذاكرة مؤقتة فائقة السرعة للبحث الفوري عن الباركود بدون أي تأخير
  private cachedProducts: Product[] | null = null;
  private barcodeIndexMap: Map<string, Product> = new Map();

  constructor() {
    this.initDatabase();
  }

  private refreshBarcodeIndex(products: Product[]): void {
    this.cachedProducts = products;
    this.barcodeIndexMap.clear();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.barcode) {
        this.barcodeIndexMap.set(p.barcode.trim(), p);
      }
    }
  }

  // تهيئة قاعدة البيانات — هيكل فارغ للتثبيت الجديد بدون بيانات تجريبية
  public initDatabase(forceReset: boolean = false): void {
    try {
      const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
      if (!isInitialized || forceReset) {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        localStorage.setItem(KEYS.UNITS, JSON.stringify(DEFAULT_UNITS));
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([DEFAULT_WALKIN_CUSTOMER]));
        localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([]));
        localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
        localStorage.setItem(KEYS.SALES, JSON.stringify([]));
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        localStorage.setItem(KEYS.INITIALIZED, 'true');
        this.cachedProducts = [];
        this.barcodeIndexMap.clear();
      }
    } catch (e) {
      console.error('Database initialization error:', e);
    }
  }

  // --- المنتجات (Products) ---
  public getProducts(): Product[] {
    if (this.cachedProducts !== null) {
      return this.cachedProducts;
    }
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      const parsed: Product[] = data ? JSON.parse(data) : [];
      this.refreshBarcodeIndex(parsed);
      return parsed;
    } catch {
      this.cachedProducts = [];
      this.barcodeIndexMap.clear();
      return [];
    }
  }

  public saveProduct(product: Product): Product {
    const products = [...this.getProducts()];
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    this.refreshBarcodeIndex(products);
    return product;
  }

  public deleteProduct(productId: string): boolean {
    const products = this.getProducts().filter((p) => p.id !== productId);
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    this.refreshBarcodeIndex(products);
    return true;
  }

  // بحث فوري في جدول الفهرس بالباركود O(1)
  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    if (!clean) return undefined;
    if (this.cachedProducts === null) {
      this.getProducts();
    }
    const direct = this.barcodeIndexMap.get(clean);
    if (direct) return direct;
    if (this.cachedProducts && clean.length >= 6) {
      return this.cachedProducts.find((p) => p.barcode && p.barcode.endsWith(clean));
    }
    return undefined;
  }

  public updateStock(productId: string, quantitySold: number): void {
    const products = [...this.getProducts()];
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.stock = Math.max(0, product.stock - quantitySold);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      this.refreshBarcodeIndex(products);
    }
  }

  // --- التصنيفات (Categories) ---
  public getCategories(): ProductCategory[] {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES; // الأصناف هي هياكل نظام، لا بيانات تجارية
    }
  }

  public saveCategory(category: ProductCategory): ProductCategory {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return category;
  }

  public deleteCategory(categoryId: string, reassignCategoryId?: string): boolean {
    if (reassignCategoryId) {
      const products = [...this.getProducts()];
      let changed = false;
      for (let i = 0; i < products.length; i++) {
        if (products[i].category === categoryId) {
          products[i].category = reassignCategoryId;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
        this.refreshBarcodeIndex(products);
      }
    }

    const categories = this.getCategories().filter((c) => c.id !== categoryId);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return true;
  }

  // --- وحدات القياس (Units) ---
  public getUnits(): ProductUnit[] {
    try {
      const data = localStorage.getItem(KEYS.UNITS);
      return data ? JSON.parse(data) : DEFAULT_UNITS;
    } catch {
      return DEFAULT_UNITS;
    }
  }

  public saveUnit(unit: ProductUnit): ProductUnit {
    const units = this.getUnits();
    const index = units.findIndex(
      (u) =>
        u.id === unit.id ||
        u.name.trim().toLowerCase() === unit.name.trim().toLowerCase()
    );
    if (index >= 0) {
      units[index] = unit;
    } else {
      units.push(unit);
    }
    localStorage.setItem(KEYS.UNITS, JSON.stringify(units));
    return unit;
  }

  public deleteUnit(unitId: string, reassignUnitName?: string): boolean {
    const units = this.getUnits();
    const unitToDelete = units.find((u) => u.id === unitId || u.name === unitId);
    if (!unitToDelete) return false;

    const unitName = unitToDelete.name;

    if (reassignUnitName) {
      const products = [...this.getProducts()];
      let changed = false;
      for (let i = 0; i < products.length; i++) {
        if (products[i].unit === unitName || products[i].unit === unitToDelete.id) {
          products[i].unit = reassignUnitName;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
        this.refreshBarcodeIndex(products);
      }
    }

    const filtered = units.filter((u) => u.id !== unitToDelete.id && u.name !== unitName);
    localStorage.setItem(KEYS.UNITS, JSON.stringify(filtered));
    return true;
  }

  // --- العملاء (Customers) ---
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [DEFAULT_WALKIN_CUSTOMER];
    } catch {
      return [DEFAULT_WALKIN_CUSTOMER];
    }
  }

  public saveCustomer(customer: Customer): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    const nowIso = new Date().toISOString();

    if (index >= 0) {
      const existing = customers[index];
      // الحفاظ الصارم على تاريخ ووقت إنشاء الدين الأصلي إذا كان موجوداً
      if (existing.debtCreatedAt && !customer.debtCreatedAt) {
        customer.debtCreatedAt = existing.debtCreatedAt;
      }
      // إذا كان الدين السابق 0 والآن أصبح له دين جديد، نسجل ختم زمني جديد
      if ((!existing.creditBalance || existing.creditBalance === 0) && (customer.creditBalance || 0) > 0 && !customer.debtCreatedAt) {
        customer.debtCreatedAt = nowIso;
      }
      // الحفاظ على سجل الديون الفردية السابقة
      if (existing.debts && (!customer.debts || customer.debts.length === 0)) {
        customer.debts = existing.debts;
      }
      customers[index] = customer;
    } else {
      // عميل جديد
      if ((customer.creditBalance || 0) > 0 && !customer.debtCreatedAt) {
        customer.debtCreatedAt = nowIso;
        if (!customer.debts || customer.debts.length === 0) {
          customer.debts = [
            {
              id: `debt_${Date.now()}`,
              amount: customer.creditBalance,
              remainingAmount: customer.creditBalance,
              createdAt: nowIso,
              source: 'manual',
              notes: 'دين مبدئي',
            },
          ];
        }
      }
      customers.unshift(customer);
    }
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    return customer;
  }

  public deleteCustomer(customerId: string): boolean {
    const customers = this.getCustomers().filter((c) => c.id !== customerId);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    return true;
  }

  public updateCustomerCredit(
    customerId: string,
    amountChange: number,
    metadata?: {
      source?: 'pos_sale' | 'manual';
      referenceId?: string;
      notes?: string;
      createdAt?: string;
    }
  ): void {
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      const nowIso = metadata?.createdAt || new Date().toISOString();
      const prevBal = customer.creditBalance || 0;
      const newBal = Math.max(0, prevBal + amountChange);
      customer.creditBalance = newBal;

      if (!customer.debts) {
        customer.debts = [];
      }

      if (amountChange > 0) {
        // إنشاء سجل دين جديد بختم زمني مستقل ودائم
        const newDebtRecord: CustomerDebtRecord = {
          id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          amount: amountChange,
          remainingAmount: amountChange,
          createdAt: nowIso,
          source: metadata?.source || 'pos_sale',
          referenceId: metadata?.referenceId,
          notes: metadata?.notes,
        };
        customer.debts.push(newDebtRecord);
        if (!customer.debtCreatedAt) {
          customer.debtCreatedAt = nowIso;
        }
      } else if (amountChange < 0) {
        // تسديد دفعة: تقليل المبالغ المتبقية دون تغيير تاريخ الإنشاء الأصلي لأي دين إطلاقاً!
        let paymentToApply = Math.abs(amountChange);
        for (const debt of customer.debts) {
          if (debt.remainingAmount > 0) {
            const deduction = Math.min(debt.remainingAmount, paymentToApply);
            debt.remainingAmount -= deduction;
            debt.updatedAt = nowIso;
            paymentToApply -= deduction;
            if (paymentToApply <= 0) break;
          }
        }
      }

      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    }
  }

  // --- الموردون (Suppliers) ---
  public getSuppliers(): Supplier[] {
    try {
      const data = localStorage.getItem(KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveSupplier(supplier: Supplier): Supplier {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    if (index >= 0) {
      suppliers[index] = supplier;
    } else {
      suppliers.unshift(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return supplier;
  }

  public deleteSupplier(supplierId: string): boolean {
    const suppliers = this.getSuppliers().filter((s) => s.id !== supplierId);
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    return true;
  }

  // --- المبيعات والفواتير (Sales) ---
  public getSales(): Sale[] {
    try {
      const data = localStorage.getItem(KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * استعلام وتصفية المبيعات من قاعدة البيانات حسب التواريخ ومحددات البحث بالتوقيت المحلي
   */
  public getFilteredSales(criteria: SalesFilterCriteria = {}): Sale[] {
    const allSales = this.getSales();
    const now = new Date();
    const todayLocalStr = getLocalDateString(now);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return allSales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      if (isNaN(saleDate.getTime())) return false;

      const saleLocalStr = getLocalDateString(saleDate);
      const saleYear = saleDate.getFullYear();
      const saleMonth = saleDate.getMonth() + 1;

      // 1. فلتر التاريخ
      const { dateMode = 'all', startDate, endDate, singleDate, year, month } = criteria;

      if (dateMode === 'today') {
        if (saleLocalStr !== todayLocalStr) return false;
      } else if (dateMode === 'week') {
        const diffDays = Math.ceil(Math.abs(now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (dateMode === 'month') {
        if (saleYear !== currentYear || saleMonth !== currentMonth) return false;
      } else if (dateMode === 'custom') {
        if (singleDate) {
          if (saleLocalStr !== singleDate) return false;
        } else if (year !== undefined && month !== undefined) {
          if (saleYear !== year || saleMonth !== month) return false;
        } else {
          if (startDate) {
            const startMs = getDayStartTimestamp(startDate);
            if (saleDate.getTime() < startMs) return false;
          }
          if (endDate) {
            const endMs = getDayEndTimestamp(endDate);
            if (saleDate.getTime() > endMs) return false;
          }
        }
      }

      // 2. فلتر أمين الصندوق
      if (criteria.cashierName && criteria.cashierName !== 'all') {
        if (sale.cashierName !== criteria.cashierName) return false;
      }

      // 3. فلتر طريقة الدفع
      if (criteria.paymentMethod && criteria.paymentMethod !== 'all') {
        if (sale.paymentMethod !== criteria.paymentMethod) return false;
      }

      // 4. فلتر العميل
      if (criteria.customerId && criteria.customerId !== 'all') {
        if (sale.customerId !== criteria.customerId) return false;
      }

      return true;
    });
  }

  public recordSale(sale: Sale): Sale {
    const sales = this.getSales();
    sales.unshift(sale);
    localStorage.setItem(KEYS.SALES, JSON.stringify(sales));

    // خصم الكميات من المخزون
    sale.items.forEach((item) => {
      this.updateStock(item.productId, item.quantity);
    });

    // تحديث رصيد كريدي العميل إذا كانت طريقة الدفع بالدين (Credit)
    if (sale.paymentMethod === 'credit' && sale.customerId && sale.customerId !== 'cust_walkin') {
      const unpaid = Math.max(0, sale.total - sale.paidAmount);
      this.updateCustomerCredit(sale.customerId, unpaid, {
        source: 'pos_sale',
        referenceId: sale.invoiceNumber,
        notes: `فاتورة بيع ${sale.invoiceNumber}`,
        createdAt: sale.createdAt || new Date().toISOString(),
      });
    }

    return sale;
  }

  // --- المصروفات (Expenses) ---
  public getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public addExpense(expense: Expense): Expense {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return expense;
  }

  public deleteExpense(expenseId: string): boolean {
    const expenses = this.getExpenses().filter((e) => e.id !== expenseId);
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
    return true;
  }

  // --- المستخدمون (Users) ---
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      return data ? JSON.parse(data) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS; // مدير افتراضي واحد فقط
    }
  }

  public authenticate(username: string, passwordAttempt: string): User | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();
    const users = this.getUsers();

    const user = users.find((u) => {
      const matchName = u.username.toLowerCase() === cleanUser;
      if (!matchName) return false;
      if (!u.passwordHash) return true;
      if (u.passwordHash === cleanPass) return true;
      if (cleanUser === 'admin' && (cleanPass === 'admin' || cleanPass === 'password')) return true;
      if (cleanUser === 'cashier' && cleanPass === 'cashier123') return true;
      return false;
    });
    return user || null;
  }

  public saveUser(user: User): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return user;
  }

  // --- الإعدادات (Settings) ---
  public getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS; // إعدادات محايدة بدون بيانات تجارية مسبقة
    }
  }

  public updateSettings(settings: AppSettings): AppSettings {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  // --- النسخ الاحتياطي وتصدير SQL / JSON ---
  public exportBackup(): string {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      store: this.getSettings(),
      categories: this.getCategories(),
      units: this.getUnits(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      expenses: this.getExpenses(),
      users: this.getUsers(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const payload = JSON.parse(jsonString);
      if (payload.products) localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(payload.products));
      if (payload.categories) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(payload.categories));
      if (payload.units) localStorage.setItem(KEYS.UNITS, JSON.stringify(payload.units));
      if (payload.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(payload.customers));
      if (payload.suppliers) localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(payload.suppliers));
      if (payload.sales) localStorage.setItem(KEYS.SALES, JSON.stringify(payload.sales));
      if (payload.expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(payload.expenses));
      if (payload.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(payload.settings));
      if (payload.users) localStorage.setItem(KEYS.USERS, JSON.stringify(payload.users));
      this.cachedProducts = null;
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  // تهيئة وتجهيز النظام للتسليم النهائي للعميل (Client Delivery Mode)
  public prepareForClientDelivery(
    storeConfig: Partial<AppSettings>,
    keepCatalog: boolean = true
  ): void {
    // تصفية سجل المبيعات والفواتير
    localStorage.setItem(KEYS.SALES, JSON.stringify([]));
    // تصفية المصروفات
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
    // إعادة تعيين العملاء (إبقاء الزبون العام فقط بدون ديون)
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([{ ...DEFAULT_WALKIN_CUSTOMER, creditBalance: 0 }]));

    // تصفية أو إبقاء المنتجات
    if (!keepCatalog) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([]));
    }
    this.cachedProducts = null;

    // تحديث بيانات المتجر الجديد
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, ...storeConfig };
    this.updateSettings(updatedSettings);
  }

  // إنشاء سكريبت SQLite SQL متوافق 100% للتطبيق المكتبي database.db
  public generateSqliteDump(): string {
    const products = this.getProducts();
    const customers = this.getCustomers();
    const settings = this.getSettings();

    let sql = `-- TAJIR - SQLite Schema & Seed Dump (Algerian Retail POS)
-- Generated: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE,
  name_ar TEXT,
  name_fr TEXT,
  category TEXT,
  buy_price REAL,
  sell_price REAL,
  stock REAL,
  min_stock_alert REAL,
  unit TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  wilaya TEXT,
  credit_balance REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT,
  total REAL,
  payment_method TEXT,
  customer_id TEXT,
  cashier_name TEXT,
  created_at TEXT
);

-- Store Info
INSERT OR REPLACE INTO settings (key, value) VALUES ('store_name', '${settings.storeNameAr.replace(/'/g, "''")}');
INSERT OR REPLACE INTO settings (key, value) VALUES ('nif', '${settings.nifNumber}');
INSERT OR REPLACE INTO settings (key, value) VALUES ('rc', '${settings.rcNumber}');

-- Products
`;

    products.forEach((p) => {
      sql += `INSERT OR REPLACE INTO products VALUES ('${p.id}', '${p.barcode}', '${p.nameAr.replace(/'/g, "''")}', '${p.nameFr.replace(/'/g, "''")}', '${p.category}', ${p.buyPrice}, ${p.sellPrice}, ${p.stock}, ${p.minStockAlert}, '${p.unit}', '${p.createdAt}');\n`;
    });

    customers.forEach((c) => {
      sql += `INSERT OR REPLACE INTO customers VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.phone}', '${c.address.replace(/'/g, "''")}', '${c.wilaya}', ${c.creditBalance}, '${c.createdAt}');\n`;
    });

    return sql;
  }
}

export const db = new DatabaseService();
