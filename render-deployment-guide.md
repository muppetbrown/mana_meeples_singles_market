# Render Deployment Environment Variables Guide

## Required Environment Variables

Your Render deployment **MUST** have these environment variables set in the Render dashboard:

### Admin Authentication
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=YOUR_BCRYPT_HASH_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE
```

### Server Configuration
```
PORT=10000
NODE_ENV=production
```

### Database (if using)
```
DATABASE_URL=your_postgres_connection_string
```

## How to Set Environment Variables on Render

1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable from above with your actual values

## Getting Your Values

### For ADMIN_PASSWORD_HASH
Run this command locally to generate a hash:
```bash
pnpm run generate:admin
```

### For JWT_SECRET
Generate a secure random string (32+ characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing Your Deployment

After setting the environment variables:

1. **Check the health endpoint**: Visit `https://mana-meeples-web.onrender.com/api/health`
   - Should show `hasAdminUsername: true`, `hasAdminPasswordHash: true`, `hasJwtSecret: true`

2. **Test admin login**: Visit `https://mana-meeples-web.onrender.com/admin/login`
   - Use username: `admin` and your password

## Common Issues

- **"Failed to fetch"**: Environment variables not set on Render
- **"Server configuration error"**: Missing ADMIN_USERNAME, ADMIN_PASSWORD_HASH, or JWT_SECRET
- **"Login response: undefined"**: API routes failing due to missing environment variables

## Debugging

The server logs on Render will now show:
```
🔐 Environment variables status:
  ADMIN_USERNAME: ✅ SET
  ADMIN_PASSWORD_HASH: ✅ SET
  JWT_SECRET: ✅ SET
  NODE_ENV: production
```

If any show "❌ MISSING", add them in the Render dashboard.