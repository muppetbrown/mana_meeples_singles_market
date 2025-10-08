# CORS Issue - Quick Fix Guide

## Problem
Backend server at `https://mana-meeples-singles-market.onrender.com` is not sending CORS headers to requests from `https://manaandmeeples.co.nz`, causing API calls to fail.

## Most Likely Cause
The `ALLOWED_ORIGINS` environment variable is not set in the Render deployment, causing the server to only allow `http://localhost:3000`.

## Quick Fix (5 minutes)

### Step 1: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Log in to your account
3. Find and click on your service: `mana-meeples-singles-market`

### Step 2: Update Environment Variables
1. Click on the "Environment" tab in the left sidebar
2. Look for an environment variable named `ALLOWED_ORIGINS`
3. If it exists, click "Edit"
4. If it doesn't exist, click "Add Environment Variable"

### Step 3: Set the Value
Set `ALLOWED_ORIGINS` to:
```
https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz,http://localhost:3000
```

**Important Notes:**
- Use commas to separate multiple origins (no spaces after commas)
- Include both `www` and non-www versions
- Use `https://` not `http://` for production domains
- No trailing slashes on URLs

### Step 4: Save and Redeploy
1. Click "Save Changes"
2. Render will automatically redeploy your service (takes 2-3 minutes)
3. Wait for deployment to complete

### Step 5: Verify the Fix

#### Option A: Using the test script
```bash
chmod +x test-cors-simple.sh
./test-cors-simple.sh
```

#### Option B: Manual verification
Open your browser and visit:
```
https://mana-meeples-singles-market.onrender.com/api/cors-debug
```

You should see output like:
```json
{
  "allowedOrigins": [
    "https://www.manaandmeeples.co.nz",
    "https://manaandmeeples.co.nz",
    "http://localhost:3000"
  ],
  "environmentVariables": {
    "ALLOWED_ORIGINS": "https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz,http://localhost:3000",
    "NODE_ENV": "production"
  }
}
```

#### Option C: Test with curl
```bash
curl -i -H "Origin: https://manaandmeeples.co.nz" https://mana-meeples-singles-market.onrender.com/health
```

Look for this header in the response:
```
access-control-allow-origin: https://manaandmeeples.co.nz
```

## If It Still Doesn't Work

### Check 1: Verify NODE_ENV
In Render environment variables, make sure:
```
NODE_ENV=production
```

### Check 2: Check Server Logs
1. In Render dashboard, go to "Logs" tab
2. Look for messages like:
   ```
   🔍 CORS Debug - Origin: https://manaandmeeples.co.nz
   🔍 CORS Debug - Allowed origins: ...
   ✅ CORS allowed for origin: https://manaandmeeples.co.nz
   ```
   OR
   ```
   ⚠️  Blocked CORS request from: https://manaandmeeples.co.nz
   ```

### Check 3: Verify Frontend API URL
The frontend might be sending requests to the wrong backend. Check browser console logs for:
```
🔗 Final API URL configured as: https://mana-meeples-singles-market.onrender.com/api
```

If it shows a different URL, the frontend configuration needs updating.

### Check 4: Clear Browser Cache
Sometimes browsers cache CORS preflight responses:
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Common Mistakes to Avoid

❌ **Wrong**: `ALLOWED_ORIGINS=https://manaandmeeples.co.nz/`
✅ **Correct**: `ALLOWED_ORIGINS=https://manaandmeeples.co.nz`
(No trailing slash)

❌ **Wrong**: `ALLOWED_ORIGINS=manaandmeeples.co.nz`
✅ **Correct**: `ALLOWED_ORIGINS=https://manaandmeeples.co.nz`
(Include protocol)

❌ **Wrong**: `ALLOWED_ORIGINS=https://www.manaandmeeples.co.nz, https://manaandmeeples.co.nz`
✅ **Correct**: `ALLOWED_ORIGINS=https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz`
(No spaces after commas)

## Need More Help?

See the detailed analysis in `CORS_DEBUG_ANALYSIS.md` for:
- Complete technical explanation
- Advanced debugging steps
- Server configuration details
- Alternative solutions

## Quick Reference: Required Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$...
NODE_ENV=production
PORT=10000

# CORS Configuration (THIS IS THE ONE YOU NEED TO FIX)
ALLOWED_ORIGINS=https://www.manaandmeeples.co.nz,https://manaandmeeples.co.nz,http://localhost:3000

# Optional but recommended
SESSION_SECRET=your_session_secret
CSP_CONNECT_SRC=https://mana-meeples-singles-market.onrender.com
```

## After Fixing CORS

Once CORS is working, you should:
1. Test all API endpoints from your frontend
2. Test both www and non-www versions of your site
3. Check that authentication/cookies work (if applicable)
4. Monitor server logs for any remaining CORS warnings

## Contact

If you continue to have issues after following this guide, provide:
1. Output from `/api/cors-debug` endpoint
2. Browser console error messages
3. Relevant server logs from Render
4. The exact origin URL your frontend is using
