# KCT Knowledge API - Quick Reference

## 🎯 What This Is

Analytics and AI recommendation engine for **KCT Menswear** headless Shopify store.

**Purpose**:
- Unified analytics dashboard (GA4 + Shopify + Redis)
- AI-powered outfit recommendations
- Wedding party recommendation tracking
- Real-time visitor metrics

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express + TypeScript |
| Database | Redis (Railway) |
| Analytics | Google Analytics 4 Data API |
| E-commerce | Shopify Admin API (GraphQL) |
| Deployment | Railway (auto-deploy from GitHub) |
| Monitoring | Sentry, Railway logs |

## 🌐 Live URLs

- **Production API**: https://kct-knowledge-api-2-production.up.railway.app
- **Health Check**: https://kct-knowledge-api-2-production.up.railway.app/api/analytics/health
- **API Docs**: https://kct-knowledge-api-2-production.up.railway.app/docs
- **Railway Dashboard**: [Your Railway project link]

## 📡 Key Endpoints

### Analytics (Most Used)
```bash
# Unified dashboard (7-day metrics)
GET /api/analytics/dashboard?days=7

# Real-time active users (last 30 min)
GET /api/analytics/realtime

# Traffic only (GA4)
GET /api/analytics/traffic?days=7

# Sales only (Shopify)
GET /api/analytics/sales?days=7

# System health check
GET /api/analytics/health
```

### Recommendation Tracking
```bash
# Track user interaction with recommendation
POST /api/analytics/track
{
  "eventType": "click",
  "productId": "gid://shopify/Product/123",
  "productTitle": "Navy Tuxedo",
  "occasion": "wedding",
  "source": "ai",
  "sessionId": "session_xxx"
}
```

## 🔑 Environment Variables

**Location**: Railway Dashboard → kct-knowledge-api → Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `GA4_PROPERTY_ID` | `401822822` | ⚠️ Property ID, NOT Stream ID! |
| `GA4_SERVICE_ACCOUNT_JSON` | `{...}` | Single-line JSON string |
| `SHOPIFY_STORE_URL` | `kctmenswear.myshopify.com` | No https:// |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | `shpat_xxx...` | From Custom App |
| `REDIS_URL` | Auto-populated | Railway Redis add-on |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |

See `.env.documented` for full details and security guidance.

## 🚀 Deployment

**Automatic**: Push to `main` branch triggers Railway deployment

```bash
# Check deployment status
railway logs

# Manual redeploy (if needed)
railway up

# View environment variables
railway variables
```

## 🔍 Common Tasks

### Test API Health
```bash
curl https://kct-knowledge-api-2-production.up.railway.app/api/analytics/health | jq
```

### Fetch Dashboard Data
```bash
curl "https://kct-knowledge-api-2-production.up.railway.app/api/analytics/dashboard?days=7" | jq '.data.summary'
```

### Check Realtime Visitors
```bash
curl https://kct-knowledge-api-2-production.up.railway.app/api/analytics/realtime | jq '.data.activeUsers'
```

### View Railway Logs
```bash
railway logs --tail 100
```

## ⚡ Rate Limits

| Endpoint | Limit | Tier |
|----------|-------|------|
| `/api/analytics/*` | 300 req/min | ANALYTICS |
| `/api/analytics/track` | 300 req/min | ANALYTICS |
| `/api/analytics/health` | 1000 req/min | HEALTH |
| General API | 100 req/min | GENERAL |

## 🐛 Quick Debugging

### API Returns 500 Error
1. Check Railway logs: Railway Dashboard → Deployments → Logs
2. Verify environment variables are set
3. Test health endpoint: `/api/analytics/health`

### "Realtime data unavailable"
- **Expected behavior** - GA4 Realtime API has strict quotas
- Dashboard automatically uses fallback (shows 0)
- Not an error, just no active visitors

### "Total Sales doesn't match Shopify"
1. API shows last 7 days by default
2. Check date range: `?days=30`
3. Compare with Shopify Admin → Analytics → Same date range

### GA4 Connection Failed
1. Verify `GA4_PROPERTY_ID=401822822` (NOT Stream ID!)
2. Check service account JSON formatting
3. Ensure private key has proper line breaks: `\n`

## 📊 Data Sources

### Google Analytics 4
- **What**: Real traffic data (sessions, users, pageviews)
- **How**: GA4 Data API via service account
- **Auth**: JSON service account key
- **Update Frequency**: Near real-time (30 sec - 5 min)

### Shopify Admin API
- **What**: Sales, orders, products
- **How**: Direct GraphQL queries (no SDK)
- **Auth**: Admin Access Token (shpat_...)
- **Update Frequency**: Real-time

### Redis (Railway)
- **What**: Recommendation event tracking
- **How**: Redis sorted sets + hashes
- **Data Retention**: 90 days
- **Update Frequency**: Immediate

## 🔗 Related Systems

### Max Out Admin
- **Purpose**: Internal wedding coordination dashboard
- **Connection**: Calls this API for analytics dashboard
- **Tech**: React + Supabase + Vercel
- **Repo**: https://github.com/IbrahimAyad/max-out-admin

### Lovable Frontend (kctmenswear.com)
- **Purpose**: Customer-facing e-commerce site
- **Connection**: Tracks recommendation events to this API
- **Tech**: React + Vite + Cloudflare Pages
- **Domain**: https://kctmenswear.com

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `docs/ai-context/architecture.md` | Complete system architecture |
| `docs/ai-context/common-errors.md` | Troubleshooting guide |
| `.env.documented` | Environment variables reference |
| `docs/API_INTEGRATION_GUIDE.md` | API usage examples |
| `docs/openapi.yaml` | OpenAPI specification |
| `CHANGELOG.md` | Version history |

## 🛠️ Development

### Local Setup
```bash
# Clone repository
git clone [your-repo-url]
cd kct-knowledge-api

# Install dependencies
npm install

# Set up environment variables
cp .env.documented .env
# Edit .env with real values

# Build
npm run build

# Run locally
npm run dev
```

### Common Commands
```bash
# Build TypeScript
npm run build

# Run in development
npm run dev

# Run in production
NODE_ENV=production node dist/server.js

# Check types
npm run type-check

# Lint
npm run lint
```

## ⚠️ Critical Reminders

1. **GA4 Property ID vs Stream ID**
   - ✅ Use: `401822822` (Property ID)
   - ❌ DON'T use: `G-XXXXXXXXX` (Stream ID)

2. **Shopify Token Types**
   - Frontend: Storefront API token
   - Backend: Admin API token (shpat_...)
   - NEVER mix these up!

3. **Service Account JSON**
   - Must be valid single-line JSON string
   - Private key must have `\n` (not actual newlines)
   - No outer quotes in Railway variable

4. **Redis Connection**
   - Auto-configured by Railway
   - Check REDIS_URL is set
   - Connection errors won't crash API (graceful degradation)

## 🆘 Getting Help

1. **Check logs first**: Railway Dashboard → Logs
2. **Review common errors**: `docs/ai-context/common-errors.md`
3. **Test health endpoint**: `/api/analytics/health`
4. **Verify environment variables**: Railway → Variables

## 📊 Current Production Stats (as of 2025-01-30)

- **Sessions (7d)**: 827
- **Total Sales (7d)**: $419.47
- **Orders**: 3
- **Conversion Rate**: 0.36%
- **Active Services**: GA4 ✅ | Shopify ✅ | Redis ✅

---

**Last Updated**: 2025-01-30
**Version**: 1.0
**Maintainer**: Development Team

**Quick Links**:
- [Architecture Diagram](./ai-context/architecture.md)
- [Common Errors](./ai-context/common-errors.md)
- [Environment Variables](./.env.documented)
