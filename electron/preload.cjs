// Preload bridge between Electron Main process and React Frontend
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  printReceipt: (htmlContent) => ipcRenderer.invoke('pos:print-receipt', htmlContent),
  printBarcodeLabel: (options) => ipcRenderer.invoke('pos:print-barcode-label', options),
  getPrinters: () => ipcRenderer.invoke('pos:get-printers'),
  openCashDrawer: () => ipcRenderer.invoke('pos:open-cash-drawer'),
  executeSql: (query, params) => ipcRenderer.invoke('db:execute', query, params),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  requestLicenseApi: (endpoint, request) => ipcRenderer.invoke('license-api:request', endpoint, request),
});
