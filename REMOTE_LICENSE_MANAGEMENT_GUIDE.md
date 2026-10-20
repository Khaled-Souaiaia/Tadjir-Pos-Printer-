# TADJIR Remote License Management System - Complete Guide

## Overview

This guide documents the complete remote license management system for TADJIR POS. The system allows administrators to remotely control licenses through a centralized backend API and database.

## Architecture

### Components

1. **Backend API** (`server.ts`) - Central license management server
2. **TADJIR POS** (`src/utils/license.ts`) - Client application with license checking
3. **TADJIR LICENCE MANAGER** (`license-manager/`) - Administrator interface

### Database

The system uses a JSON-based database stored at `data/central-licenses.json`. For production deployment on Vercel, this can be migrated to PostgreSQL with Prisma.

## Remote License Management Features

### 1. Activate License

**From License Manager:**
- Generate a new license with customer details
- License is automatically registered in the central database
- Customer receives activation token or serial key

**From TADJIR POS:**
- Customer enters activation token or serial key
- Application validates with central server
- License binds to device fingerprint (optional)

### 2. Revoke License

**API Endpoint:** `POST /api/licenses/status`

**Request:**
```json
{
  "licenseId": "LIC-XXXX",
  "status": "revoked",
  "reason": "Non-payment or policy violation"
}
```

**Behavior:**
- License status changed to "revoked" in central database
- Revocation timestamp and reason recorded
- TADJIR POS will be locked on next server check or app restart
- User sees: "License has been revoked" message
- Access blocked but customer data preserved

### 3. Reactivate License

**API Endpoint:** `POST /api/licenses/status`

**Request:**
```json
{
  "licenseId": "LIC-XXXX",
  "status": "active",
  "reason": "Payment received / Issue resolved"
}
```

**Behavior:**
- License status changed back to "active"
- Revocation reason cleared
- TADJIR POS grants access on next verification
- User sees: "License activated successfully"

### 4. Suspend License (Temporary)

**API Endpoint:** `POST /api/licenses/status`

**Request:**
```json
{
  "licenseId": "LIC-XXXX",
  "status": "suspended",
  "reason": "Pending payment or investigation"
}
```

**Behavior:**
- Temporary suspension without full revocation
- Can be reactivated without re-entering license key
- Useful for payment disputes or investigations

### 5. Extend Expiration

**API Endpoint:** `POST /api/licenses/extend`

**Request Option 1 (Add Hours):**
```json
{
  "licenseId": "LIC-XXXX",
  "additionalHours": 720
}
```

**Request Option 2 (Set New Date):**
```json
{
  "licenseId": "LIC-XXXX",
  "newExpiresAt": "2027-12-31T23:59:59Z"
}
```

**Behavior:**
- Extends trial or subscription licenses
- Cannot extend lifetime licenses (no expiration)
- Changes reflected immediately on server
- TADJIR POS receives updated expiration on next check

### 6. Reset Device Binding

**API Endpoint:** `POST /api/licenses/reset-device`

**Request:**
```json
{
  "licenseId": "LIC-XXXX"
}
```

**Behavior:**
- Removes device fingerprint lock
- Allows activation on new computer
- Useful when customer changes hardware
- Previous device will be locked out

### 7. Refresh / Sync Status

**From License Manager:**
- Click "Refresh Status" button
- Fetches latest license data from central server
- Updates local display with server state

**From TADJIR POS:**
- Automatic check every 15 minutes while running
- Manual refresh not exposed to end users
- Server check on app startup
- Server check on app close/reopen

### 8. View Status & Audit History

**API Endpoint:** `GET /api/licenses/:identifier`

Returns complete license information including:
- Current status (active/revoked/suspended/expired)
- Activation date
- Expiration date
- Device binding
- Customer information
- Last update timestamp

**API Endpoint:** `GET /api/licenses/:identifier/history`

Returns audit log with:
- All status changes
- Administrator actions
- Timestamps
- Reasons provided

## TADJIR POS License Checking Behavior

### Startup Behavior

1. **Check Local License:**
   - Read stored license from LocalStorage and SQLite
   - Verify digital signature (Ed25519)
   - Validate product name (TADJIR only)
   - Check device fingerprint match

2. **Contact Central Server:**
   - Send license verification request
   - Include: serialKey, licenseId, deviceId
   - Timeout: 2.5 seconds

3. **Server Response Handling:**
   - **Revoked:** Show revocation message, lock immediately
   - **Suspended:** Show suspension message, lock immediately
   - **Expired:** Show expiration message, prompt for upgrade
   - **Active:** Grant access, store verification timestamp
   - **Network Error:** Continue to offline validation

### Periodic Checking (While Running)

- **Frequency:** Every 15 minutes
- **Background:** Non-blocking check
- **On Revocation Detected:** Lock access immediately
- **On Network Error:** Continue with cached status

### Close and Reopen Behavior

- **On Close:** No special action
- **On Reopen:** Full verification cycle
- **Cannot Bypass:** Revocation persists across restarts

### Offline Behavior

#### Lifetime Licenses
- Work offline indefinitely
- No grace period restrictions
- Never require internet connection

#### Trial/Subscription Licenses
- **Grace Period:** 7 days offline
- **Clock Rollback Detection:** Prevents date manipulation
- **Grace Period Expired:** Requires internet to verify

**Offline Grace Period Rules:**
- Starts from last successful online verification
- Device must reconnect within 7 days
- After 7 days: "Grace period expired" message
- Cannot be bypassed by system date changes

### Clock Rollback Detection

**Anti-Tampering Measures:**
- Tracks highest trusted timestamp
- Compares current time with last known good time
- Tolerance: 5 minutes (for NTP adjustments)
- **If Detected:** Immediate lockout with warning

**Prevented Attacks:**
- Setting system date backward
- Restoring system from old backup
- Virtual machine time manipulation

## Security Features

### 1. Digital Signatures
- Ed25519 asymmetric cryptography
- Private key only in License Manager
- Public key only in TADJIR POS
- Cannot forge licenses without private key

### 2. Device Fingerprinting
- Canvas fingerprinting
- Hardware characteristics
- Stable across reboots
- Format: `DZ-XXXX-XXXX-XXXX`

### 3. Server-Side Validation
- All status changes on server
- Client cannot self-activate
- Status stored centrally
- Authoritative server check

### 4. Protected Storage
- LocalStorage + SQLite redundancy
- Encrypted signature validation
- No plain-text secrets

### 5. Network Security
- HTTPS required in production
- Request timeout: 2.5 seconds
- Rate limiting recommended
- Input validation on all endpoints

## Data Preservation

### Customer Data Safety

**Important:** License revocation NEVER deletes customer data.

**Preserved Data:**
- All products and inventory
- All sales and invoices
- All customers and suppliers
- All expenses and reports
- Settings and configurations
- Local SQLite database intact

**Only Blocked:**
- Access to application features
- New transactions
- Report generation

**Recovery:**
- Reactivate license → Full access restored
- Data remains untouched throughout

## Testing the Complete Workflow

### Test Scenario 1: Revoke and Lock

1. **Install TADJIR POS** on test computer
2. **Activate** with valid license key
3. **Verify** TADJIR POS is running normally
4. **Open License Manager** on admin computer
5. **Find license** in license list
6. **Click Revoke** → Enter reason → Confirm
7. **Wait 15 minutes** or close/reopen TADJIR POS
8. **Verify** TADJIR POS shows "License revoked" and blocks access

### Test Scenario 2: Reactivate License

9. **In License Manager**, find the revoked license
10. **Click Reactivate** → Confirm
11. **Close and reopen** TADJIR POS
12. **Verify** Access is restored and application works normally

### Test Scenario 3: Extend Expiration

1. **Create trial license** (24 hours)
2. **Activate** in TADJIR POS
3. **In License Manager**, click "Extend Expiration"
4. **Add 30 days** (720 hours)
5. **Refresh status** in TADJIR POS
6. **Verify** New expiration date is displayed

### Test Scenario 4: Reset Device Binding

1. **Activate license** on Computer A
2. **Try to activate** same license on Computer B
3. **Verify** "Device mismatch" error
4. **In License Manager**, click "Reset Device Binding"
5. **Activate** on Computer B
6. **Verify** Activation succeeds

### Test Scenario 5: Offline Grace Period

1. **Activate trial license** (connected to internet)
2. **Disconnect internet**
3. **Use TADJIR POS** normally for 6 days
4. **Verify** Application works in offline mode
5. **Wait until day 8**
6. **Verify** "Grace period expired" message appears
7. **Reconnect internet**
8. **Verify** Access restored after server check

### Test Scenario 6: Clock Rollback Detection

1. **Activate license** with current date
2. **Close TADJIR POS**
3. **Change system date** to 1 week earlier
4. **Open TADJIR POS**
5. **Verify** "Clock rollback detected" error

## Deployment to Vercel

### Current Setup (Development)

- **File-based storage:** `data/central-licenses.json`
- **Local server:** `http://localhost:3000`
- **No authentication:** Open endpoints

### Production Setup (Recommended)

#### 1. Database Migration (Optional but Recommended)

**Install Prisma:**
```bash
npm install prisma @prisma/client
npx prisma init
```

**Schema (`prisma/schema.prisma`):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model License {
  id                String   @id @default(uuid())
  licenseId         String   @unique
  serialKey         String   @unique
  license_key_hash  String   @unique
  customerName      String
  customerPhone     String?
  customerWilaya    String?
  type              String
  duration_hours    Int?
  issuedAt          DateTime @default(now())
  expiresAt         DateTime?
  deviceId          String?
  hardware_lock     String?
  notes             String?
  status            String   @default("active")
  signature         String
  activationToken   String
  pricePaidDzd      Int?
  revocationReason  String?
  revoked_at        DateTime?
  updatedAt         DateTime @updatedAt
  history           Json?
}
```

**Generate Client:**
```bash
npx prisma generate
npx prisma db push
```

#### 2. Environment Variables

Create `.env.production`:
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/tadjir_licenses?schema=public"

# API Configuration
NODE_ENV=production
PORT=3000
TADJIR_LICENSE_DATA_DIR=/var/data

# Admin Authentication (implement separately)
ADMIN_API_KEY=your-secure-api-key-here

# CORS Origins
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### 3. Deploy to Vercel

**Install Vercel CLI:**
```bash
npm install -g vercel
```

**Deploy:**
```bash
vercel --prod
```

**Configure in Vercel Dashboard:**
1. Add environment variables
2. Connect PostgreSQL database (Vercel Postgres or external)
3. Set up custom domain
4. Enable HTTPS (automatic)

#### 4. Update TADJIR POS Configuration

**In TADJIR POS `.env`:**
```env
VITE_LICENSE_API_BASE_URL=https://your-api-domain.vercel.app
```

**Rebuild TADJIR POS:**
```bash
npm run build:tadjir
```

#### 5. Update License Manager Configuration

**In License Manager:**
```typescript
// license-manager/src/utils/config.ts
export const API_BASE_URL = 
  process.env.NODE_ENV === 'production'
    ? 'https://your-api-domain.vercel.app'
    : 'http://localhost:3000';
```

**Rebuild License Manager:**
```bash
npm run build:license-manager
```

## Security Implementation (Production)

### 1. Admin Authentication

Add to `server.ts`:

```typescript
// Simple API Key Authentication
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

const requireAuth = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  
  next();
};

// Apply to admin endpoints
app.post('/api/licenses/status', requireAuth, (req, res) => { ... });
app.post('/api/licenses/extend', requireAuth, (req, res) => { ... });
app.post('/api/licenses/reset-device', requireAuth, (req, res) => { ... });
```

### 2. Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. CORS Configuration

```bash
npm install cors
```

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
```

## Monitoring and Logging

### Server Logs

All license operations are logged:
```
[Central License Server] License LIC-XXXX (Customer Name) changed to revoked
[Central License Server] License LIC-YYYY expiration extended
[Central License Server] License LIC-ZZZZ device binding reset
```

### Audit Trail

Every license includes a history array:
```json
{
  "history": [
    {
      "date": "2026-10-12T10:00:00Z",
      "action": "تسجيل الترخيص في السيرفر المركزي",
      "notes": "النوع: lifetime, الصلاحية: دائم"
    },
    {
      "date": "2026-10-12T11:30:00Z",
      "action": "تغيير الحالة من active إلى revoked",
      "notes": "عدم الدفع"
    },
    {
      "date": "2026-10-12T14:00:00Z",
      "action": "تغيير الحالة من revoked إلى active",
      "notes": "إعادة تفعيل الترخيص من قبل المدير"
    }
  ]
}
```

## Troubleshooting

### License Not Syncing to Server

**Symptom:** License Manager changes don't affect TADJIR POS

**Solutions:**
1. Check server is running: `http://localhost:3000/api/server-time`
2. Verify network connectivity
3. Check TADJIR POS API URL configuration
4. Review server logs for errors
5. Try manual refresh in TADJIR POS (wait 15 min or restart)

### Revocation Not Taking Effect

**Symptom:** TADJIR POS still works after revocation

**Possible Causes:**
1. **Offline grace period active:** Trial licenses have 7-day grace period
2. **Server not reachable:** Revocation cannot reach offline computer
3. **Lifetime license offline:** Works indefinitely without internet

**Solution:**
- Wait for user to reconnect to internet
- Close and reopen TADJIR POS
- Revocation will take effect on next successful server check

### "Clock Rollback Detected" False Positive

**Symptom:** Legitimate users seeing clock error

**Causes:**
- NTP time synchronization (>5 minute change)
- Time zone changes
- Daylight saving time

**Solution:**
- Ensure system clock is accurate
- Connect to internet for server time sync
- Contact administrator if persistent

## API Reference Summary

### Public Endpoints (TADJIR POS)

- `GET /api/server-time` - Get server timestamp
- `POST /api/licenses/verify` - Verify license status
- `POST /api/licenses` - Register new activation (on first use)

### Admin Endpoints (License Manager)

- `GET /api/licenses` - List all licenses
- `GET /api/licenses/:id` - Get license details
- `GET /api/licenses/:id/history` - Get audit log
- `POST /api/licenses` - Create/update license
- `POST /api/licenses/status` - Change status (revoke/reactivate/suspend)
- `POST /api/licenses/extend` - Extend expiration
- `POST /api/licenses/reset-device` - Reset device binding
- `POST /api/licenses/sync` - Bulk sync (from License Manager)

## Support and Contact

For technical support or questions about the remote license management system:

1. Review this documentation
2. Check server logs for errors
3. Test with the provided test scenarios
4. Review audit history for license
5. Contact developer: KhaLed Souaiaia

---

**Version:** 1.0.0  
**Last Updated:** 2026-10-12  
**License System:** TADJIR Remote License Management  
**Product:** TADJIR POS - Algerian Accounting & Point of Sale System
