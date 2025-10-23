#!/bin/bash

# Render Backend Connectivity Test
# Tests if your Render backend is responding

echo "🔍 Testing Render Backend Connectivity"
echo "======================================"
echo ""

API_URL="https://api.manaandmeeples.co.nz"

# Test 1: Basic connectivity
echo "Test 1: Can we reach the domain?"
echo "Command: curl -I $API_URL"
echo ""
curl -I "$API_URL" 2>&1 | head -n 5
echo ""

# Test 2: Health endpoint
echo "Test 2: Health endpoint check"
echo "Command: curl $API_URL/health"
echo ""
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_URL/health" 2>&1)
echo "$HEALTH_RESPONSE"
echo ""

# Test 3: CORS debug endpoint
echo "Test 3: CORS configuration"
echo "Command: curl $API_URL/cors-debug"
echo ""
curl -s "$API_URL/cors-debug" 2>&1 | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/cors-debug"
echo ""

# Test 4: Admin login endpoint (should reject without credentials)
echo "Test 4: Admin login endpoint exists"
echo "Command: curl -X POST $API_URL/api/auth/admin/login"
echo ""
LOGIN_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST -H "Content-Type: application/json" "$API_URL/api/auth/admin/login" 2>&1)
echo "$LOGIN_TEST"
echo ""

echo "======================================"
echo "Summary:"
echo "======================================"
echo ""
echo "If you see 'Connection refused' or timeouts:"
echo "  → Your Render service is DOWN or not deployed"
echo "  → Go to: https://dashboard.render.com"
echo "  → Check service status and logs"
echo ""
echo "If you see 404 errors:"
echo "  → Routes are not configured correctly"
echo "  → Check apps/api/src/routes/index.ts"
echo ""
echo "If you see CORS errors when testing from browser:"
echo "  → Check ALLOWED_ORIGINS includes http://localhost:5173"
echo "  → Current setting should be in render.yaml"
echo ""
