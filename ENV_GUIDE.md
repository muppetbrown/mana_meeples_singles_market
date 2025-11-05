# Environment Variables Guide

## Frontend (.env files in apps/web/)

### Required Variables
```bash
# API URL - defaults to localhost:10000 if not set
VITE_API_URL=http://localhost:10000
```

### Optional Variables
```bash
# External error logging endpoint (Sentry, LogRocket, etc.)
VITE_ERROR_LOG_ENDPOINT=https://your-logging-service.com/api/errors

# Analytics ID (Google Analytics, Plausible, etc.)
VITE_ANALYTICS_ID=GA-XXXXXXXXX

# Feature flags (set to 'true' or '1' to enable)
VITE_FEATURE_ADMIN_PANEL=true
VITE_FEATURE_ANALYTICS=false
```

### Environment Files
- `.env` - Default environment variables (committed to git)
- `.env.local` - Local overrides (gitignored)
- `.env.production` - Production-specific variables
- `.env.development` - Development-specific variables

### Important Notes
- **All frontend environment variables MUST be prefixed with `VITE_`**
- Variables without the `VITE_` prefix will not be exposed to the client
- Never commit sensitive data to `.env` files - use `.env.local` for secrets
- Backend environment variables are configured in `apps/api/src/lib/env.ts`

## Backend (See apps/api/README.md for backend variables)

Backend variables are validated using Zod schemas in `apps/api/src/lib/env.ts`.

Key backend variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `ADMIN_USERNAME` - Admin username
- `ADMIN_PASSWORD_HASH` - Bcrypt hashed admin password
- `ALLOWED_ORIGINS` - CORS allowed origins
