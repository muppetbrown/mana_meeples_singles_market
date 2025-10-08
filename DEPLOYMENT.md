# Deployment Guide

This guide covers how to properly deploy the Mana & Meeples Singles Market application.

## 🚨 Critical Changes Made

The application has been updated to fix deployment issues where the React frontend wasn't being served. Key changes:

1. **Static File Serving**: Server now serves React build files at `/shop` path in production
2. **Environment Variable Handling**: Improved API URL detection and CORS configuration
3. **Build Integration**: Added build scripts to properly compile the React app during deployment

## 🛠 Environment Variables

### Required for Production

Set these environment variables in your hosting platform:

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
JWT_SECRET=your_strong_jwt_secret_key
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD_HASH=your_bcrypt_hashed_password

# Server
NODE_ENV=production
PORT=10000

# CORS (optional - will auto-detect if not set)
ALLOWED_ORIGINS=https://your-domain.com

# Frontend API URL (optional - will auto-detect if not set)
REACT_APP_API_URL=https://your-domain.com/api
```

### For Render.com Deployment

Render automatically sets `RENDER_EXTERNAL_URL`, which is used for CORS configuration.

## 🚀 Build Process

The application now has proper build integration:

1. **Automatic Build**: `npm run postinstall` automatically builds the React app after installation
2. **Manual Build**: Run `npm run build` to build just the frontend
3. **Clean Build**: Run `npm run clean` to remove all build artifacts

## 📁 Application Structure

```
/
├── server.js              # Backend server (serves API + React app)
├── mana-meeples-shop/     # React frontend source
│   ├── src/
│   └── build/             # Built React app (served at /shop)
├── routes/                # API routes
└── package.json           # Build scripts
```

## 🌐 URL Structure

- **Frontend**: `https://your-domain.com/shop` (React app)
- **API**: `https://your-domain.com/api/*` (Backend API)
- **Health Check**: `https://your-domain.com/health`
- **Admin**: `https://your-domain.com/shop/admin` (React admin interface)

## 🔧 Local Development

```bash
# Install backend dependencies
npm install

# Install frontend dependencies and build
npm run build

# Start in development mode
npm run dev

# Run frontend dev server separately (optional)
npm run dev:frontend
```

## 🚦 Testing the Fix

1. **Before**: Visiting your domain showed 404 or only API responses
2. **After**: Visiting your domain redirects to `/shop` and shows the React app
3. **API**: All API endpoints at `/api/*` continue to work
4. **Admin**: Admin interface accessible at `/shop/admin`

## 🐛 Troubleshooting

### React App Not Loading

1. Check that `NODE_ENV=production` is set
2. Verify the React app was built: look for `mana-meeples-shop/build/` directory
3. Check server logs for static file serving errors

### API Connection Issues

1. Verify `REACT_APP_API_URL` is set correctly or let it auto-detect
2. Check CORS configuration with `ALLOWED_ORIGINS`
3. Ensure API routes are accessible at `/api/*`

### Build Failures

1. Check Node.js version compatibility (requires >=18.0.0)
2. Verify all dependencies install correctly
3. Check for memory issues on free hosting tiers

## 📊 Performance Improvements

The deployment now includes:

- Static file caching (1 day for assets)
- Gzip compression via Helmet
- Proper error handling for production
- Environment variable validation
- Graceful shutdown handling