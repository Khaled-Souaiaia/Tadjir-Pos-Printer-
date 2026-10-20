/**
 * TADJIR License Manager - Developer Edition Main Process
 * تطبيق المطور لإصدار وتوقيع تراخيص برنامج تاجر
 * Strictly for developer use
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
require('./license-api.cjs');

// Set explicit developer app identity
app.name = 'TADJIR License Manager';
const userDataPath = app.commandLine.getSwitchValue('user-data-dir')
  || path.join(app.getPath('appData'), 'TADJIR License Manager');
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath('userData', userDataPath);

let mainWindow = null;

function reportLoadFailure(label, error) {
  console.error(`[TADJIR License Manager] ${label}:`, error);
}

function attachWindowDiagnostics(window) {
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(
      `[TADJIR License Manager] Failed to load ${isMainFrame ? 'main frame' : 'resource'} ` +
      `(${errorCode}: ${errorDescription}): ${validatedURL}`
    );
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[TADJIR License Manager] Renderer process exited:', details);
  });
  window.webContents.on('console-message', (_event, details) => {
    if (details.level >= 2) {
      console.error(
        `[TADJIR License Manager] Renderer console (${details.sourceId}:${details.lineNumber}): ${details.message}`
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
  const iconPath = path.join(__dirname, '../build-resources/icon-license-manager.ico');
  const pngIconPath = path.join(__dirname, '../build-resources/icon-license-manager.png');
  const actualIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(pngIconPath) ? pngIconPath : undefined);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'TADJIR License Manager - Developer Suite',
    icon: actualIcon,
    frame: true,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  attachWindowDiagnostics(mainWindow);

  // In packaged mode, load the isolated developer distribution
  const prodIndex1 = path.join(__dirname, '../dist-license-manager/license-manager/index.html');
  const prodIndex2 = path.join(__dirname, '../dist-license-manager/index.html');
  const fallbackIndex = path.join(__dirname, '../dist/license-manager/index.html');

  if (app.isPackaged) {
    if (fs.existsSync(prodIndex1)) {
      loadFile(mainWindow, prodIndex1, 'Could not load production application');
    } else if (fs.existsSync(prodIndex2)) {
      loadFile(mainWindow, prodIndex2, 'Could not load secondary production entry point');
    } else if (fs.existsSync(fallbackIndex)) {
      loadFile(mainWindow, fallbackIndex, 'Could not load fallback application');
    } else {
      reportLoadFailure('Production entry point is missing', `${prodIndex1} (fallbacks: ${prodIndex2}, ${fallbackIndex})`);
    }
  } else {
    // Development mode
    const baseDevUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
    const devUrl = `${baseDevUrl}/license-manager/`;
    mainWindow.loadURL(devUrl).catch((error) => {
      reportLoadFailure(`Could not load development server at ${devUrl}`, error);
      if (fs.existsSync(prodIndex1)) {
        loadFile(mainWindow, prodIndex1, 'Could not load production fallback');
      } else if (fs.existsSync(prodIndex2)) {
        loadFile(mainWindow, prodIndex2, 'Could not load secondary production fallback');
      } else {
        reportLoadFailure('No development or production entry point is available', `${prodIndex1} (fallback: ${prodIndex2})`);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('app:version', () => app.getVersion());

app.whenReady().then(() => {
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
