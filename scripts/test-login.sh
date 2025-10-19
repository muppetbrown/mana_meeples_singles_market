#!/bin/bash

# Admin Login Test Script - Updated for Refactored Code
# Tests the admin login endpoint with detailed diagnostics

echo "🧪 Testing Admin Login Endpoint (Refactored Version)"
echo "======================================================"
echo ""

# Configuration
API_URL="${API_URL:-https://mana-meeples-api.onrender.com}"
USERNAME="${ADMIN_USERNAME:-admin}"
PASSWORD="${ADMIN_PASSWORD}"

if [ -z "$PASSWORD" ]; then
  read -sp "Enter admin password: " PASSWORD
  echo ""
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Username: $USERNAME"
echo "  Password: ${PASSWORD//?/*}"
echo ""

# Step 1: Health Check
echo -e "${BLUE}Step 1: Health Check${NC}"
echo "  GET $API_URL/health"
echo ""

HEALTH=$(curl -s "$API_URL/health" 2>&1)
if echo "$HEALTH" | grep -q '"ok".*true'; then
  echo -e "  ${GREEN}✅ Server is online${NC}"
  
  # Check environment variables
  if echo "$HEALTH" | grep -q '"hasAdminUsername".*true'; then
    echo -e "  ${GREEN}✅ ADMIN_USERNAME configured${NC}"
  else
    echo -e "  ${RED}❌ ADMIN_USERNAME not configured${NC}"
  fi
  
  if echo "$HEALTH" | grep -q '"hasAdminPasswordHash".*true'; then
    echo -e "  ${GREEN}✅ ADMIN_PASSWORD_HASH configured${NC}"
  else
    echo -e "  ${RED}❌ ADMIN_PASSWORD_HASH not configured${NC}"
  fi
  
  if echo "$HEALTH" | grep -q '"hasJwtSecret".*true'; then
    echo -e "  ${GREEN}✅ JWT_SECRET configured${NC}"
  else
    echo -e "  ${RED}❌ JWT_SECRET not configured${NC}"
  fi
else
  echo -e "  ${RED}❌ Server health check failed${NC}"
  echo "  Response: $HEALTH"
fi
echo ""

# Step 2: Test Login
echo -e "${BLUE}Step 2: Testing Login${NC}"
echo "  POST $API_URL/api/auth/admin/login"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nCONTENT_TYPE:%{content_type}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -c "$HOME/admin-cookies.txt" \
  "$API_URL/api/auth/admin/login" 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CONTENT_TYPE=$(echo "$LOGIN_RESPONSE" | grep "CONTENT_TYPE:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE:/d' | sed '/CONTENT_TYPE:/d')

echo "  HTTP Status: ${HTTP_CODE:-UNKNOWN}"
echo "  Content-Type: ${CONTENT_TYPE:-UNKNOWN}"
echo ""
echo "  Response Body:"
if [ -n "$BODY" ]; then
  echo "$BODY" | jq '.' 2>/dev/null || echo "  $BODY"
else
  echo -e "  ${YELLOW}⚠️  EMPTY RESPONSE BODY${NC}"
  echo ""
  echo -e "${RED}  This is the bug! Server returned HTTP $HTTP_CODE with no body.${NC}"
  echo ""
  echo -e "${YELLOW}  Diagnosis:${NC}"
  echo "  - The route handler is being called"
  echo "  - res.json() is probably being overridden"
  echo "  - Response is being intercepted by middleware"
  echo ""
  echo -e "${YELLOW}  Solution:${NC}"
  echo "  - Remove the 'res.json = function...' override in routes/auth.ts"
  echo "  - Use the fixed version from the artifact"
  echo "  - Redeploy to Render"
fi
echo ""

# Check cookies
if [ -f /tmp/cookies_test.txt ]; then
  if grep -q "adminToken" /tmp/cookies_test.txt; then
    echo -e "  ${GREEN}✅ adminToken cookie was set${NC}"
    COOKIE_VALUE=$(grep "adminToken" /tmp/cookies_test.txt | awk '{print $7}')
    echo "  Cookie value: ${COOKIE_VALUE:0:20}..."
  else
    echo -e "  ${RED}❌ No adminToken cookie${NC}"
  fi
else
  echo -e "  ${RED}❌ No cookies file${NC}"
fi
echo ""

# Evaluate results
if [ "$HTTP_CODE" = "200" ]; then
  if [ -n "$BODY" ] && echo "$BODY" | grep -q '"success".*true'; then
    echo -e "${GREEN}✅ LOGIN TEST PASSED!${NC}"
    echo ""
    
    # Step 3: Test Auth Check
    echo -e "${BLUE}Step 3: Testing Auth Check${NC}"
    echo "  GET $API_URL/api/auth/admin/auth/check"
    echo ""
    
    AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -b "$HOME/admin-cookies.txt" \
      "$API_URL/api/auth/admin/auth/check" 2>&1)
    
    AUTH_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "  HTTP Status: ${AUTH_CODE:-UNKNOWN}"
    echo "  Response:"
    echo "$AUTH_BODY" | jq '.' 2>/dev/null || echo "  $AUTH_BODY"
    echo ""
    
    if [ "$AUTH_CODE" = "200" ] && echo "$AUTH_BODY" | grep -q '"authenticated".*true'; then
      echo -e "${GREEN}✅ AUTH CHECK PASSED!${NC}"
      echo ""
      echo -e "${GREEN}🎉 ALL TESTS PASSED! Your login is working!${NC}"
    else
      echo -e "${RED}❌ AUTH CHECK FAILED${NC}"
    fi
    
  elif [ "$HTTP_CODE" = "200" ] && [ -z "$BODY" ]; then
    echo -e "${RED}❌ LOGIN TEST FAILED - EMPTY RESPONSE${NC}"
    echo ""
    echo -e "${YELLOW}This is THE bug you're experiencing!${NC}"
    echo ""
    echo "The server returned HTTP 200 but with no response body."
    echo "This means:"
    echo "  1. The route handler IS being called"
    echo "  2. Authentication logic IS working"
    echo "  3. But res.json() is being intercepted/overridden"
    echo ""
    echo "Fix:"
    echo "  1. Remove response method override in routes/auth.ts"
    echo "  2. Use the fixed code from Artifact 1"
    echo "  3. Redeploy"
    
  else
    echo -e "${RED}❌ LOGIN TEST FAILED - UNEXPECTED RESPONSE${NC}"
    echo ""
    echo "Expected: {\"success\":true,...}"
    echo "Got: $BODY"
  fi
  
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}❌ LOGIN TEST FAILED - INVALID CREDENTIALS${NC}"
  echo ""
  echo "Possible causes:"
  echo "  1. Wrong password"
  echo "  2. ADMIN_PASSWORD_HASH doesn't match your password"
  echo ""
  echo "Fix:"
  echo "  cd apps/api && pnpm run generate:admin"
  echo "  Copy new hash to Render environment variables"
  
elif [ "$HTTP_CODE" = "400" ]; then
  echo -e "${RED}❌ LOGIN TEST FAILED - BAD REQUEST${NC}"
  echo ""
  echo "The request format is invalid."
  echo "Check that Content-Type: application/json is set"
  
elif [ "$HTTP_CODE" = "500" ]; then
  echo -e "${RED}❌ LOGIN TEST FAILED - SERVER ERROR${NC}"
  echo ""
  echo "Check Render logs for error details"
  
else
  echo -e "${RED}❌ LOGIN TEST FAILED - HTTP $HTTP_CODE${NC}"
fi

# Cleanup
rm -f /tmp/cookies_test.txt

echo ""
echo "======================================================"
echo "Test Complete"
echo "======================================================"
