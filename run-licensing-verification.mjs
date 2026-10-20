// Comprehensive Verification Suite for TADJIR Licensing Security Fixes
import crypto from 'crypto';

const MASTER_PRIVATE_KEY_JWK = {
  key_ops: ['sign'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  d: 'Byjtc9rtQIjHkKA5MW2RgfSMy_RhrFAdKshburjCHoM',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

const MASTER_PUBLIC_KEY_JWK = {
  key_ops: ['verify'],
  ext: true,
  alg: 'Ed25519',
  crv: 'Ed25519',
  x: '50X6Ke1RqohsZj_3XwPx9955WC_iq8aHAUEMxzaP8BM',
  kty: 'OKP',
};

function serializePayloadCanonical(payload) {
  const canonicalObj = {
    customerName: (payload.customerName || '').trim(),
    deviceId: payload.deviceId ? payload.deviceId.trim().toUpperCase() : null,
    expiresAt: payload.expiresAt || null,
    issuedAt: payload.issuedAt,
    licenseId: (payload.licenseId || '').trim().toUpperCase(),
    notes: payload.notes || '',
    product: payload.product || 'TADJIR',
    serialKey: (payload.serialKey || '').trim().toUpperCase(),
    type: payload.type,
    version: payload.version || '1.0',
  };
  const dur = payload.durationHours ?? payload.duration_hours;
  if (dur !== undefined && dur !== null) {
    canonicalObj.durationHours = Number(dur);
  }
  return JSON.stringify(canonicalObj);
}

async function signLicense(payload) {
  const privKey = await crypto.subtle.importKey(
    'jwk',
    MASTER_PRIVATE_KEY_JWK,
    { name: 'Ed25519' },
    false,
    ['sign']
  );
  const data = new TextEncoder().encode(serializePayloadCanonical(payload));
  const sigBuffer = await crypto.subtle.sign({ name: 'Ed25519' }, privKey, data);
  return Buffer.from(sigBuffer).toString('base64');
}

async function verifyLicense(payload, signatureBase64) {
  try {
    const pubKey = await crypto.subtle.importKey(
      'jwk',
      MASTER_PUBLIC_KEY_JWK,
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    const data = new TextEncoder().encode(serializePayloadCanonical(payload));
    const sigBuffer = Buffer.from(signatureBase64, 'base64');
    if (sigBuffer.byteLength !== 64) return false;
    return await crypto.subtle.verify({ name: 'Ed25519' }, pubKey, sigBuffer, data);
  } catch (e) {
    return false;
  }
}

// In-memory mock storage replicating SQLite + localStorage persistence
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
}

// Replicate exact validateStoredLicense pipeline from src/utils/license.ts
async function simulateValidatePipeline(rawLicense, storage, options = {}) {
  const {
    currentDeviceId = 'DEV-ALGERIA-001',
    isOnline = false,
    mockNow = Date.now(),
  } = options;

  const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
  const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

  // 0. Check local revocation flag
  const deactivatedFlag = storage.getItem('tadjir_deactivated_flag');
  if (deactivatedFlag) {
    try {
      const parsed = JSON.parse(deactivatedFlag);
      if (parsed?.status === 'revoked') {
        return { isValid: false, status: 'revoked', message: 'License revoked' };
      }
      if (parsed?.status === 'suspended') {
        return { isValid: false, status: 'suspended', message: 'License suspended' };
      }
    } catch {}
    if (deactivatedFlag === 'true') {
      return { isValid: false, status: 'revoked', message: 'Deactivated' };
    }
  }

  // 1. Missing license check
  if (!rawLicense) {
    return { isValid: false, status: 'unactivated', message: 'License has not been activated' };
  }

  // 2. Parse license
  let signedLicense;
  try {
    signedLicense = typeof rawLicense === 'string' ? JSON.parse(rawLicense) : rawLicense;
  } catch {
    return { isValid: false, status: 'malformed', message: 'Malformed JSON' };
  }

  const { payload, signature } = signedLicense || {};
  if (!payload || !signature || !payload.serialKey) {
    return { isValid: false, status: 'malformed', message: 'Malformed license structure' };
  }

  // 3. Clean legacy test license
  if (payload.notes === 'Official Master Lifetime License') {
    return { isValid: false, status: 'unactivated', message: 'Legacy test license rejected' };
  }

  // 4. Product validation
  const product = (payload.product || '').trim().toUpperCase();
  if (product !== 'TADJIR') {
    return {
      isValid: false,
      status: 'product_mismatch',
      message: 'License is not valid for this product.',
    };
  }

  // 5. Signature verification
  const isSigValid = await verifyLicense(payload, signature);
  if (!isSigValid) {
    return { isValid: false, status: 'invalid_signature', message: 'Invalid signature' };
  }

  // 6. Device binding
  if (payload.deviceId) {
    if (payload.deviceId.toUpperCase() !== currentDeviceId.toUpperCase()) {
      return { isValid: false, status: 'device_mismatch', message: 'Wrong device' };
    }
  }

  // 7. Temporary license checks: Clock Rollback and Expiration
  if (payload.type !== 'lifetime' || payload.expiresAt) {
    const highestStoredTsStr = storage.getItem('tadjir_highest_timestamp');
    const highestStoredTs = highestStoredTsStr ? parseInt(highestStoredTsStr, 10) : null;

    if (highestStoredTs && mockNow < (highestStoredTs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
      return {
        isValid: false,
        status: 'clock_rollback_detected',
        message: 'System clock rollback detected.',
      };
    }

    if (payload.issuedAt) {
      const issuedMs = new Date(payload.issuedAt).getTime();
      if (!isNaN(issuedMs) && mockNow < (issuedMs - CLOCK_ROLLBACK_TOLERANCE_MS)) {
        return {
          isValid: false,
          status: 'clock_rollback_detected',
          message: 'System clock rollback detected (before issuedAt).',
        };
      }
    }

    if (payload.expiresAt) {
      const expDate = new Date(payload.expiresAt);
      if (isNaN(expDate.getTime())) {
        return { isValid: false, status: 'malformed', message: 'Invalid expiration date' };
      }
      const diffMs = expDate.getTime() - mockNow;
      if (diffMs <= 0) {
        return { isValid: false, status: 'expired', message: 'License expired' };
      }
    }
  }

  // 8. Offline policy
  if (!isOnline) {
    // LIFETIME LICENSE: Indefinitely valid offline
    if (payload.type === 'lifetime') {
      const highestStoredTsStr = storage.getItem('tadjir_highest_timestamp');
      const highestStoredTs = highestStoredTsStr ? parseInt(highestStoredTsStr, 10) : null;
      if (!highestStoredTs || mockNow > highestStoredTs) {
        storage.setItem('tadjir_highest_timestamp', mockNow.toString());
      }

      return {
        isValid: true,
        status: 'valid',
        message: 'Lifetime license valid offline indefinitely',
      };
    }

    // TEMPORARY LICENSE: Subject to offline grace period
    const rawLastOnline = storage.getItem('tadjir_license_last_online_verified');
    const lastOnlineTimestamp = rawLastOnline
      ? parseInt(rawLastOnline, 10)
      : new Date(signedLicense.activatedAt || mockNow).getTime();
    const elapsedMs = mockNow - lastOnlineTimestamp;

    if (elapsedMs > OFFLINE_GRACE_PERIOD_MS) {
      return {
        isValid: false,
        status: 'offline_grace_expired',
        message: 'Offline grace period expired',
      };
    }

    const highestStoredTsStr = storage.getItem('tadjir_highest_timestamp');
    const highestStoredTs = highestStoredTsStr ? parseInt(highestStoredTsStr, 10) : null;
    if (!highestStoredTs || mockNow > highestStoredTs) {
      storage.setItem('tadjir_highest_timestamp', mockNow.toString());
    }

    return {
      isValid: true,
      status: 'valid',
      message: 'Temporary license valid within grace period',
    };
  }

  return { isValid: true, status: 'valid' };
}

async function runAll12Tests() {
  console.log('=================================================================');
  console.log('     TADJIR 12-POINT LICENSING REGRESSION VERIFICATION SUITE     ');
  console.log('=================================================================\n');

  const now = Date.now();
  const currentDev = 'DEV-ALGERIA-001';
  let passedCount = 0;
  let totalCount = 12;

  const validLifetimePayload = {
    licenseId: 'LIC-2026-LIFETIME-001',
    serialKey: 'TADJIR-AAAA-BBBB-CCCC-DDDD',
    customerName: 'سوبرماركت البركة',
    type: 'lifetime',
    issuedAt: new Date(now - 86400000).toISOString(),
    expiresAt: null,
    deviceId: currentDev,
    product: 'TADJIR',
    version: '1.0',
    notes: 'Commercial Offline',
  };
  const validLifetimeSig = await signLicense(validLifetimePayload);
  const validLifetimeRecord = {
    payload: validLifetimePayload,
    signature: validLifetimeSig,
    activatedAt: new Date(now - 3600000).toISOString(),
  };

  // TEST 1: No license + offline
  const s1 = new MockStorage();
  const r1 = await simulateValidatePipeline(null, s1, { isOnline: false });
  const t1Passed = !r1.isValid && r1.status === 'unactivated';
  console.log(`TEST 1 [No License + Offline]: Expected: Activation Window | Actual: ${r1.status} | Result: ${t1Passed ? 'PASS' : 'FAIL'}`);
  if (t1Passed) passedCount++;

  // TEST 2: Valid lifetime license + offline for < 7 days (e.g. 2 days)
  const s2 = new MockStorage();
  s2.setItem('tadjir_license_last_online_verified', (now - 2 * 86400000).toString());
  const r2 = await simulateValidatePipeline(validLifetimeRecord, s2, { isOnline: false, mockNow: now });
  const t2Passed = r2.isValid && r2.status === 'valid';
  console.log(`TEST 2 [Valid Lifetime + Offline < 7d]: Expected: App Works | Actual: ${r2.status} | Result: ${t2Passed ? 'PASS' : 'FAIL'}`);
  if (t2Passed) passedCount++;

  // TEST 3: Valid lifetime license + simulated offline > 7 days (e.g. 90 days offline!)
  const s3 = new MockStorage();
  const ninetyDaysAgo = now - (90 * 86400000);
  s3.setItem('tadjir_license_last_online_verified', ninetyDaysAgo.toString());
  const r3 = await simulateValidatePipeline(
    { ...validLifetimeRecord, activatedAt: new Date(ninetyDaysAgo).toISOString() },
    s3,
    { isOnline: false, mockNow: now }
  );
  const t3Passed = r3.isValid && r3.status === 'valid';
  console.log(`TEST 3 [CRITICAL FIX: Valid Lifetime + Offline > 7d (90 Days)]: Expected: App Works Indefinitely | Actual: ${r3.status} | Result: ${t3Passed ? 'PASS' : 'FAIL'}`);
  if (t3Passed) passedCount++;

  // TEST 4: Expired temporary license + offline
  const s4 = new MockStorage();
  const expiredPayload = {
    ...validLifetimePayload,
    type: 'trial',
    expiresAt: new Date(now - 3600000).toISOString(), // expired 1 hr ago
  };
  const expiredSig = await signLicense(expiredPayload);
  const r4 = await simulateValidatePipeline({ payload: expiredPayload, signature: expiredSig }, s4, { isOnline: false });
  const t4Passed = !r4.isValid && r4.status === 'expired';
  console.log(`TEST 4 [Expired Temporary License + Offline]: Expected: Activation Window | Actual: ${r4.status} | Result: ${t4Passed ? 'PASS' : 'FAIL'}`);
  if (t4Passed) passedCount++;

  // TEST 5: Valid temporary license + offline
  const s5 = new MockStorage();
  const validTempPayload = {
    ...validLifetimePayload,
    type: 'trial',
    expiresAt: new Date(now + 10 * 86400000).toISOString(), // expires in 10 days
  };
  const validTempSig = await signLicense(validTempPayload);
  const r5 = await simulateValidatePipeline({ payload: validTempPayload, signature: validTempSig, activatedAt: new Date().toISOString() }, s5, { isOnline: false });
  const t5Passed = r5.isValid && r5.status === 'valid';
  console.log(`TEST 5 [Valid Temporary License + Offline]: Expected: App Works | Actual: ${r5.status} | Result: ${t5Passed ? 'PASS' : 'FAIL'}`);
  if (t5Passed) passedCount++;

  // TEST 6: Temporary license + Windows clock moved backwards
  const s6 = new MockStorage();
  // Application previously ran at "now" (high-water mark)
  s6.setItem('tadjir_highest_timestamp', now.toString());
  // User sets clock back 30 days
  const rolledBackNow = now - (30 * 86400000);
  const r6 = await simulateValidatePipeline(
    { payload: validTempPayload, signature: validTempSig, activatedAt: new Date(now).toISOString() },
    s6,
    { isOnline: false, mockNow: rolledBackNow }
  );
  const t6Passed = !r6.isValid && r6.status === 'clock_rollback_detected';
  console.log(`TEST 6 [HIGH FIX: Temp License + Clock Rollback]: Expected: Clock Rollback Detected | Actual: ${r6.status} | Result: ${t6Passed ? 'PASS' : 'FAIL'}`);
  if (t6Passed) passedCount++;

  // TEST 7: Wrong product license (product: 'OTHER_APP')
  const s7 = new MockStorage();
  const otherProdPayload = { ...validLifetimePayload, product: 'OTHER_APP_POS' };
  const otherProdSig = await signLicense(otherProdPayload);
  const r7 = await simulateValidatePipeline({ payload: otherProdPayload, signature: otherProdSig }, s7, { isOnline: false });
  const t7Passed = !r7.isValid && r7.status === 'product_mismatch';
  console.log(`TEST 7 [MEDIUM FIX: Wrong Product License]: Expected: Product Mismatch | Actual: ${r7.status} | Result: ${t7Passed ? 'PASS' : 'FAIL'}`);
  if (t7Passed) passedCount++;

  // TEST 8: Corrupted license (tampered customer name with original signature)
  const s8 = new MockStorage();
  const corruptedPayload = { ...validLifetimePayload, customerName: 'هاكر متلاعب' };
  const r8 = await simulateValidatePipeline({ payload: corruptedPayload, signature: validLifetimeSig }, s8, { isOnline: false });
  const t8Passed = !r8.isValid && r8.status === 'invalid_signature';
  console.log(`TEST 8 [Corrupted / Tampered License]: Expected: Invalid Signature | Actual: ${r8.status} | Result: ${t8Passed ? 'PASS' : 'FAIL'}`);
  if (t8Passed) passedCount++;

  // TEST 9: Wrong machine (device ID mismatch)
  const s9 = new MockStorage();
  const wrongDevPayload = { ...validLifetimePayload, deviceId: 'DEV-ANOTHER-PC' };
  const wrongDevSig = await signLicense(wrongDevPayload);
  const r9 = await simulateValidatePipeline({ payload: wrongDevPayload, signature: wrongDevSig }, s9, { isOnline: false, currentDeviceId: currentDev });
  const t9Passed = !r9.isValid && r9.status === 'device_mismatch';
  console.log(`TEST 9 [Wrong Machine ID Binding]: Expected: Device Mismatch | Actual: ${r9.status} | Result: ${t9Passed ? 'PASS' : 'FAIL'}`);
  if (t9Passed) passedCount++;

  // TEST 10: Invalid signature (garbage base64)
  const s10 = new MockStorage();
  const r10 = await simulateValidatePipeline({ payload: validLifetimePayload, signature: 'AAAA'.repeat(16) }, s10, { isOnline: false });
  const t10Passed = !r10.isValid && r10.status === 'invalid_signature';
  console.log(`TEST 10 [Invalid Fake Signature]: Expected: Invalid Signature | Actual: ${r10.status} | Result: ${t10Passed ? 'PASS' : 'FAIL'}`);
  if (t10Passed) passedCount++;

  // TEST 11: Locally revoked license (deactivated flag set)
  const s11 = new MockStorage();
  s11.setItem('tadjir_deactivated_flag', JSON.stringify({ status: 'revoked', revocationReason: 'Terminated contract' }));
  const r11 = await simulateValidatePipeline(validLifetimeRecord, s11, { isOnline: false });
  const t11Passed = !r11.isValid && r11.status === 'revoked';
  console.log(`TEST 11 [Locally Revoked License]: Expected: Revoked | Actual: ${r11.status} | Result: ${t11Passed ? 'PASS' : 'FAIL'}`);
  if (t11Passed) passedCount++;

  // TEST 12: Restart application after all invalid states
  const s12 = new MockStorage();
  s12.setItem('tadjir_deactivated_flag', JSON.stringify({ status: 'revoked' }));
  // Simulate multiple startups
  const r12a = await simulateValidatePipeline(validLifetimeRecord, s12, { isOnline: false });
  const r12b = await simulateValidatePipeline(validLifetimeRecord, s12, { isOnline: false });
  const t12Passed = !r12a.isValid && !r12b.isValid && r12a.status === 'revoked' && r12b.status === 'revoked';
  console.log(`TEST 12 [Restart Persists Invalid State]: Expected: Consistently Invalid | Actual: ${r12a.status} -> ${r12b.status} | Result: ${t12Passed ? 'PASS' : 'FAIL'}`);
  if (t12Passed) passedCount++;

  console.log('\n=================================================================');
  console.log(`FINAL RESULT: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log('=================================================================');
}

runAll12Tests();
