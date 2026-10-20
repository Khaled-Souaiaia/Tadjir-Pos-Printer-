// =======================================================================
// TADJIR License Manager - Developer Data Types
// =======================================================================

export type LicenseType = 'lifetime' | '1_year' | '6_months' | 'trial' | 'custom_trial';

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'suspended' | 'transferred';

export interface LicensePayload {
  product: string;             // 'TADJIR'
  version: string;             // '1.0'
  licenseId: string;           // e.g. LIC-2026-XXXX
  serialKey: string;           // TADJIR-XXXX-XXXX-XXXX-XXXX
  customerName: string;
  type: LicenseType;
  issuedAt: string;            // ISO Date
  expiresAt: string | null;    // null for lifetime
  durationHours?: number;      // Custom trial duration in hours
  duration_hours?: number;
  deviceId?: string | null;    // Hardware binding DZ-XXXX-XXXX-XXXX
  notes?: string;
}

export interface SignedLicenseCertificate {
  payload: LicensePayload;
  signature: string;           // Ed25519 Base64 signature
  activationToken: string;     // TADJIR-LIC-<base64>
}

export interface ManagedLicenseRecord {
  id: string;
  licenseId: string;
  serialKey: string;
  license_key_hash?: string;
  customerName: string;
  customerPhone?: string;
  customerWilaya?: string;
  type: LicenseType;
  license_type?: string;
  duration_hours?: number;
  durationHours?: number;
  issuedAt: string;
  created_at?: string;
  expiresAt: string | null;
  expires_at?: string | null;
  deviceId: string | null;
  hardware_lock?: string | null;
  notes: string;
  status: LicenseStatus;
  signature: string;
  activationToken: string;
  pricePaidDzd?: number;
  revocationReason?: string;
  revocation_reason?: string;
  revoked_at?: string | null;
  history?: Array<{
    date: string;
    action: string;
    notes?: string;
  }>;
}

export interface DeveloperSession {
  isAuthenticated: boolean;
  lastActive: number;
}
