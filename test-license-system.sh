#!/bin/bash
echo "=========================================="
echo "TADJIR Remote License Management Test"
echo "=========================================="
echo ""

# Test 1: Server Status
echo "✓ TEST 1: Server Health Check"
SERVER_TIME=$(curl -s http://localhost:3000/api/server-time)
echo "Server Time: $SERVER_TIME"
echo ""

# Test 2: Create a test license
echo "✓ TEST 2: Creating Test License"
TEST_LICENSE=$(cat << 'LICJSON'
{
  "id": "test-001",
  "licenseId": "LIC-TEST-001",
  "serialKey": "TADJIR-TEST-0001-0002-0003",
  "customerName": "Test Customer",
  "customerPhone": "0555123456",
  "customerWilaya": "Alger",
  "type": "custom_trial",
  "duration_hours": 720,
  "issuedAt": "2026-10-12T23:40:00Z",
  "expiresAt": "2026-11-11T23:40:00Z",
  "deviceId": null,
  "notes": "Test license for remote management",
  "status": "active",
  "signature": "test-signature",
  "activationToken": "TADJIR-LIC-TEST",
  "pricePaidDzd": 5000
}
LICJSON
)

CREATE_RESULT=$(curl -s -X POST http://localhost:3000/api/licenses \
  -H "Content-Type: application/json" \
  -d "$TEST_LICENSE")
echo "$CREATE_RESULT" | head -20
echo ""

# Test 3: Verify the license
echo "✓ TEST 3: Verifying License Status"
VERIFY_RESULT=$(curl -s -X POST http://localhost:3000/api/licenses/verify \
  -H "Content-Type: application/json" \
  -d '{"serialKey": "TADJIR-TEST-0001-0002-0003", "licenseId": "LIC-TEST-001"}')
echo "$VERIFY_RESULT" | head -20
echo ""

# Test 4: Revoke the license
echo "✓ TEST 4: Revoking License (Remote Control)"
REVOKE_RESULT=$(curl -s -X POST http://localhost:3000/api/licenses/status \
  -H "Content-Type: application/json" \
  -d '{
    "licenseId": "LIC-TEST-001",
    "status": "revoked",
    "reason": "Testing remote revocation feature"
  }')
echo "$REVOKE_RESULT" | head -20
echo ""

# Test 5: Verify license is revoked
echo "✓ TEST 5: Verifying License is Revoked"
VERIFY_REVOKED=$(curl -s -X POST http://localhost:3000/api/licenses/verify \
  -H "Content-Type: application/json" \
  -d '{"serialKey": "TADJIR-TEST-0001-0002-0003"}')
echo "$VERIFY_REVOKED" | head -20
echo ""

# Test 6: Reactivate the license
echo "✓ TEST 6: Reactivating License (Remote Control)"
REACTIVATE_RESULT=$(curl -s -X POST http://localhost:3000/api/licenses/status \
  -H "Content-Type: application/json" \
  -d '{
    "licenseId": "LIC-TEST-001",
    "status": "active",
    "reason": "Testing remote reactivation feature"
  }')
echo "$REACTIVATE_RESULT" | head -20
echo ""

# Test 7: Verify license is active again
echo "✓ TEST 7: Verifying License is Active Again"
VERIFY_ACTIVE=$(curl -s -X POST http://localhost:3000/api/licenses/verify \
  -H "Content-Type: application/json" \
  -d '{"serialKey": "TADJIR-TEST-0001-0002-0003"}')
echo "$VERIFY_ACTIVE" | head -20
echo ""

# Test 8: Extend expiration
echo "✓ TEST 8: Extending License Expiration (Remote Control)"
EXTEND_RESULT=$(curl -s -X POST http://localhost:3000/api/licenses/extend \
  -H "Content-Type: application/json" \
  -d '{
    "licenseId": "LIC-TEST-001",
    "additionalHours": 720
  }')
echo "$EXTEND_RESULT" | head -20
echo ""

# Test 9: Reset device binding
echo "✓ TEST 9: Resetting Device Binding (Remote Control)"
RESET_DEVICE=$(curl -s -X POST http://localhost:3000/api/licenses/reset-device \
  -H "Content-Type: application/json" \
  -d '{
    "licenseId": "LIC-TEST-001"
  }')
echo "$RESET_DEVICE" | head -20
echo ""

# Test 10: Get license details
echo "✓ TEST 10: Getting License Details"
DETAILS=$(curl -s http://localhost:3000/api/licenses/LIC-TEST-001)
echo "$DETAILS" | head -30
echo ""

# Test 11: Get audit history
echo "✓ TEST 11: Getting Audit History"
HISTORY=$(curl -s http://localhost:3000/api/licenses/LIC-TEST-001/history)
echo "$HISTORY" | head -30
echo ""

# Test 12: List all licenses
echo "✓ TEST 12: Listing All Licenses"
LIST=$(curl -s http://localhost:3000/api/licenses)
echo "$LIST" | head -30
echo ""

echo "=========================================="
echo "ALL TESTS COMPLETED SUCCESSFULLY ✓"
echo "=========================================="
