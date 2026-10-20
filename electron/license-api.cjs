const { app, ipcMain } = require('electron');

// Restricted routes for Customer POS app:
// ONLY verification and read routes required for legitimate client activation are allowed.
// Administrative modification routes (status changes, bulk sync, creation, extension) are strictly prohibited.
const customerAllowedRoutes = new Map([
  ['/api/licenses/verify', new Set(['POST'])],
  ['/api/server-time', new Set(['GET'])],
  ['/api/licenses', new Set(['GET'])],
]);

// Full routes for authorized developer License Manager:
const managerAllowedRoutes = new Map([
  ['/api/licenses', new Set(['GET', 'POST'])],
  ['/api/licenses/status', new Set(['POST'])],
  ['/api/licenses/verify', new Set(['POST'])],
  ['/api/licenses/sync', new Set(['POST'])],
  ['/api/licenses/extend', new Set(['POST'])],
  ['/api/licenses/reset-device', new Set(['POST'])],
  ['/api/server-time', new Set(['GET'])],
]);

function getAllowedRoutes() {
  const isLicenseManager = Boolean(app && app.name === 'TADJIR License Manager');
  return isLicenseManager ? managerAllowedRoutes : customerAllowedRoutes;
}

ipcMain.handle('license-api:request', async (_event, endpoint, request = {}) => {
  const allowedRoutes = getAllowedRoutes();

  if (typeof endpoint !== 'string' || !allowedRoutes.has(endpoint)) {
    throw new Error('Access denied: Unauthorized or unsupported license API endpoint');
  }

  const method = String(request.method || 'GET').toUpperCase();
  if (!allowedRoutes.get(endpoint).has(method)) {
    throw new Error(`Access denied: Unsupported ${method} request for ${endpoint}`);
  }

  const apiOrigin = new URL(process.env.TADJIR_LICENSE_API_URL || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(apiOrigin.protocol)) {
    throw new Error('TADJIR_LICENSE_API_URL must use HTTP or HTTPS');
  }

  const url = new URL(endpoint, apiOrigin);
  const response = await fetch(url, {
    method,
    headers: request.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: request.body === undefined ? undefined : String(request.body),
  });

  return {
    status: response.status,
    body: await response.text(),
  };
});
