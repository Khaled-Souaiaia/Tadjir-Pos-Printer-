interface LicenseApiReply {
  status: number;
  body: string;
}

interface ElectronLicenseApi {
  requestLicenseApi?: (
    endpoint: string,
    request: { method?: string; body?: BodyInit | null }
  ) => Promise<LicenseApiReply>;
}

const configuredApiOrigin = typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_LICENSE_API_BASE_URL?.trim().replace(/\/+$/, '') || '')
  : '';

export const licenseApiFetch = async (
  endpoint: string,
  request: RequestInit = {},
): Promise<Response> => {
  const electronApi = typeof window === 'undefined'
    ? undefined
    : (window as Window & { electronAPI?: ElectronLicenseApi }).electronAPI;

  if (electronApi?.requestLicenseApi) {
    const reply = await electronApi.requestLicenseApi(endpoint, {
      method: request.method,
      body: request.body,
    });
    return new Response(reply.body, {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const packagedFallback = typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';
  const apiOrigin = configuredApiOrigin || packagedFallback;
  return fetch(`${apiOrigin}${endpoint}`, request);
};
