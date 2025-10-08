#!/bin/bash

# CORS Fix Test Script
# Tests if CORS is working correctly for the mana-meeples app

echo "🔍 Testing CORS Configuration..."
echo "================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="https://mana-meeples-singles-market.onrender.com"
FRONTEND_ORIGIN="https://manaandmeeples.co.nz"

echo "📊 Step 1: Checking server health..."
HEALTH_CHECK=$(curl -s "$API_BASE/health" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Server is responding${NC}"
else
    echo -e "${RED}❌ Server is not responding${NC}"
    echo "   Check if the backend is deployed and running"
    exit 1
fi

echo
echo "📊 Step 2: Checking CORS debug endpoint..."
CORS_DEBUG=$(curl -s "$API_BASE/api/cors-debug" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ CORS debug endpoint accessible${NC}"
    echo "   Allowed origins:"
    echo "$CORS_DEBUG" | grep -o '"allowedOrigins":\[[^]]*\]' | sed 's/.*:\[/   - /' | sed 's/","/\n   - /g' | sed 's/"]$//' | sed 's/"//g'
else
    echo -e "${RED}❌ Cannot access CORS debug endpoint${NC}"
fi

echo
echo "📊 Step 3: Testing CORS with Origin header..."
CORS_TEST=$(curl -s -i -H "Origin: $FRONTEND_ORIGIN" "$API_BASE/health" 2>/dev/null)
if echo "$CORS_TEST" | grep -q "access-control-allow-origin: $FRONTEND_ORIGIN"; then
    echo -e "${GREEN}✅ CORS working correctly${NC}"
    echo "   Server allows requests from: $FRONTEND_ORIGIN"
else
    echo -e "${RED}❌ CORS not working${NC}"
    echo "   Server is NOT sending Access-Control-Allow-Origin header"
    echo
    echo -e "${YELLOW}🔧 Fix needed:${NC}"
    echo "   1. Go to Render Dashboard"
    echo "   2. Set ALLOWED_ORIGINS environment variable to:"
    echo "      https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz,http://localhost:3000"
    echo "   3. Save and wait for redeploy"
fi

echo
echo "📊 Step 4: Testing API endpoint with CORS..."
API_TEST=$(curl -s -i -H "Origin: $FRONTEND_ORIGIN" "$API_BASE/api/filters" 2>/dev/null)
if echo "$API_TEST" | grep -q "access-control-allow-origin"; then
    if echo "$API_TEST" | grep -q "200 OK"; then
        echo -e "${GREEN}✅ API endpoint working with CORS${NC}"
    else
        echo -e "${YELLOW}⚠️  CORS headers present but API returned error${NC}"
        echo "   This might be a different issue (database, etc.)"
    fi
else
    echo -e "${RED}❌ API endpoint not sending CORS headers${NC}"
fi

echo
echo "📊 Summary:"
echo "=========="

# Check if the main issue is fixed
if echo "$CORS_TEST" | grep -q "access-control-allow-origin: $FRONTEND_ORIGIN"; then
    echo -e "${GREEN}🎉 CORS is working! Your frontend should now be able to make API calls.${NC}"
    echo
    echo "✅ Next steps:"
    echo "   1. Test your frontend at: https://manaandmeeples.co.nz/shop/"
    echo "   2. Test admin login at: https://manaandmeeples.co.nz/shop/admin/login"
    echo "   3. Check browser console for any remaining errors"
else
    echo -e "${RED}❌ CORS is still not working.${NC}"
    echo
    echo "🔧 Action required:"
    echo "   1. Set ALLOWED_ORIGINS in Render environment variables"
    echo "   2. Wait 2-3 minutes for redeploy"
    echo "   3. Run this script again to verify"
    echo
    echo "💡 Quick fix:"
    echo "   ALLOWED_ORIGINS=https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz,http://localhost:3000"
fi

echo