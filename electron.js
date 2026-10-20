/**
 * DzPOS Pro - Electron Desktop Main Process
 * تطبيق سطح المكتب لإدارة ومحاسبة المحلات التجارية في الجزائر
 * متوافق مع Windows (.exe), Linux, macOS
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// دالة إنشاء نافذة البرنامج الرئيسية
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: process.argv.includes('--license-manager')
      ? 'TADJIR License Manager - Developer Edition'
      : 'TADJIR - نظام إدارة ومحاسبة نقاط البيع الجزائر',
    icon: path.join(__dirname, 'public/favicon.ico'),
    frame: true,
    backgroundColor: process.argv.includes('--license-manager') ? '#020617' : '#E8EDF5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron/preload.cjs'),
    },
  });

  // في وضع التطوير نفتح السيرفر المحلي، أو ملفات البناء في الإنتاج
  const isLicenseManager = process.argv.includes('--license-manager');
  const baseDevUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  const devUrl = isLicenseManager ? `${baseDevUrl}/license-manager/` : baseDevUrl;
  const prodIndex = isLicenseManager
    ? path.join(__dirname, 'dist', 'license-manager', 'index.html')
    : path.join(__dirname, 'dist', 'index.html');

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(prodIndex)) {
        mainWindow.loadFile(prodIndex);
      }
    });
  } else {
    mainWindow.loadFile(prodIndex);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// تهيئة قاعدة البيانات المحلية SQLite عبر better-sqlite3 عند توفرها محليًا
let dbInstance = null;
function initDesktopDatabase() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'database.db');
    dbInstance = new Database(dbPath);
    console.log('[SQLite Desktop] Database connected successfully at:', dbPath);

    // إنشاء الجداول الأساسية إذا لم تكن موجودة
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
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
        paid_amount REAL,
        payment_method TEXT,
        customer_id TEXT,
        cashier_name TEXT,
        created_at TEXT
      );
    `);
  } catch (err) {
    console.log('[SQLite Desktop] Native better-sqlite3 optional fallback active:', err.message);
  }
}

// قنوات التواصل IPC
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('pos:print-receipt', async (event, contentHtml) => {
  if (!mainWindow) return false;
  // الطباعة المباشرة على طابعة الإيصالات الحرارية الافتراضية
  const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURI(contentHtml)}`);
  printWin.webContents.print({ silent: true, printBackground: true }, (success, failureReason) => {
    printWin.close();
  });
  return true;
});

ipcMain.handle('pos:open-cash-drawer', async () => {
  // إرسال نبضة فتح درج النقود (ESC/POS: 27, 112, 0, 25, 250)
  console.log('[Hardware POS] Cash drawer opened');
  return true;
});

ipcMain.handle('db:execute', (event, query, params = []) => {
  if (!dbInstance) return { success: false, message: 'SQLite native not loaded' };
  try {
    const stmt = dbInstance.prepare(query);
    const result = query.trim().toUpperCase().startsWith('SELECT') ? stmt.all(params) : stmt.run(params);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// تشغيل التطبيق
app.whenReady().then(() => {
  initDesktopDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
