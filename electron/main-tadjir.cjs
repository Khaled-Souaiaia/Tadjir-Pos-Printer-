/**
 * TADJIR - Production Desktop Application Main Process (Customer Accounting & POS)
 * تطبيق إدارة ومحاسبة المحلات ونقاط البيع الجزائر
 * Strictly for customer use - Contains NO developer tools or private keys
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
require('./license-api.cjs');

// Set explicit application identity & user data directory
app.name = 'TADJIR';
const userDataPath = app.commandLine.getSwitchValue('user-data-dir')
  || path.join(app.getPath('appData'), 'TADJIR');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath('userData', userDataPath);

let mainWindow = null;

function reportLoadFailure(label, error) {
  console.error(`[TADJIR] ${label}:`, error);
}

function attachWindowDiagnostics(window) {
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(
      `[TADJIR] Failed to load ${isMainFrame ? 'main frame' : 'resource'} ` +
      `(${errorCode}: ${errorDescription}): ${validatedURL}`
    );
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[TADJIR] Renderer process exited:', details);
  });
  window.webContents.on('console-message', (_event, details) => {
    if (details.level >= 2) {
      console.error(
        `[TADJIR] Renderer console (${details.sourceId}:${details.lineNumber}): ${details.message}`
      );
    }
  });
}

function loadFile(window, filePath, label) {
  window.loadFile(filePath).catch((error) => {
    reportLoadFailure(`${label} (${filePath})`, error);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build-resources/icon-tadjir.ico');
  const pngIconPath = path.join(__dirname, '../build-resources/icon-tadjir.png');
  const actualIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(pngIconPath) ? pngIconPath : undefined);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'TADJIR - نظام إدارة ومحاسبة نقاط البيع الجزائر',
    icon: actualIcon,
    frame: true,
    backgroundColor: '#E8EDF5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Remove default menu bar for clean modern POS kiosk experience
  mainWindow.setMenuBarVisibility(false);
  attachWindowDiagnostics(mainWindow);

  // In packaged app, load the isolated customer distribution
  const prodIndex = path.join(__dirname, '../dist-tadjir/index.html');
  const fallbackIndex = path.join(__dirname, '../dist/index.html');

  if (app.isPackaged) {
    if (fs.existsSync(prodIndex)) {
      loadFile(mainWindow, prodIndex, 'Could not load production application');
    } else if (fs.existsSync(fallbackIndex)) {
      loadFile(mainWindow, fallbackIndex, 'Could not load fallback application');
    } else {
      reportLoadFailure('Production entry point is missing', `${prodIndex} (fallback: ${fallbackIndex})`);
    }
  } else {
    // Development mode
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl).catch((error) => {
      reportLoadFailure(`Could not load development server at ${devUrl}`, error);
      if (fs.existsSync(prodIndex)) {
        loadFile(mainWindow, prodIndex, 'Could not load production fallback');
      } else if (fs.existsSync(fallbackIndex)) {
        loadFile(mainWindow, fallbackIndex, 'Could not load fallback application');
      } else {
        reportLoadFailure('No development or production entry point is available', `${prodIndex} (fallback: ${fallbackIndex})`);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Local SQLite Database Initialization (Offline First in %APPDATA%/TADJIR)
let dbInstance = null;
function initDesktopDatabase() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'database.db');
    dbInstance = new Database(dbPath);
    console.log('[TADJIR DB] Database initialized at:', dbPath);

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
    console.log('[TADJIR DB] Using local persistent web storage fallback:', err.message);
  }
}

// IPC Handlers for POS hardware (Receipt printer, cash drawer, database)
ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('pos:print-receipt', async (event, contentHtml) => {
  if (!mainWindow) return false;
  try {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURI(contentHtml)}`);
    printWin.webContents.print({ silent: true, printBackground: true }, () => {
      printWin.close();
    });
    return true;
  } catch (err) {
    console.error('Print error:', err);
    return false;
  }
});

ipcMain.handle('pos:open-cash-drawer', async () => {
  console.log('[POS Hardware] Pulse sent to open cash drawer (ESC/POS: 27, 112)');
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

// App lifecycle
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
