const { ipcMain } = require('electron');

const allowedRoutes = new Map([
  ['/api/licenses', new Set(['GET', 'POST'])],
  ['/api/licenses/status', new Set(['POST'])],
  ['/api/licenses/verify', new Set(['POST'])],
  ['/api/licenses/sync', new Set(['POST'])],
]);

ipcMain.handle('license-api:request', async (_event, endpoint, request = {}) => {
  if (typeof endpoint !== 'string' || !allowedRoutes.has(endpoint)) {
    throw new Error('Unsupported license API endpoint');
  }

  const method = String(request.method || 'GET').toUpperCase();
  if (!allowedRoutes.get(endpoint).has(method)) {
    throw new Error(`Unsupported ${method} request for ${endpoint}`);
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
