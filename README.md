# KCT Knowledge API

Fashion intelligence and analytics engine for [KCT Menswear](https://kctmenswear.com). Powers AI outfit recommendations, color matching, real-time analytics, and product catalog integration for the headless Shopify storefront.

**Production**: https://kct-knowledge-api-2-production.up.railway.app
**Docs**: https://kct-knowledge-api-2-production.up.railway.app/docs
**Health**: https://kct-knowledge-api-2-production.up.railway.app/health

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS + TypeScript |
| Framework | Express.js |
| Cache | Redis (Railway managed) |
| Database | PostgreSQL (Supabase) + SQLite |
| Analytics | Google Analytics 4 Data API |
| E-commerce | Shopify Admin API (GraphQL) |
| Monitoring | Sentry, Railway logs |
| Deployment | Railway (auto-deploy from GitHub `main`) |

## Project Structure

```
src/
├── config/          # Database, Redis, Sentry configuration
├── controllers/     # Request handlers (api.ts, smart-bundle-api.ts)
├── data/            # JSON knowledge base (colors, styles, products)
│   ├── core/        # Color relationships, formality, seasonality
│   ├── intelligence/# Trending, demographics, product catalog
│   ├── training/    # Style profiles, upsell patterns
│   ├── validation/  # Combination rules, edge cases
│   └── visual/      # Color hex mapping, texture compatibility
├── middleware/       # Auth, cache, compression, rate limiting
├── routes/          # Route definitions (analytics, v2-compatibility)
├── services/        # Business logic (50+ services)
│   └── _archived/   # Disabled services (voice, SEO, chat)
├── types/           # TypeScript interfaces
├── utils/           # Data loader, logger, validation schemas
└── server.ts        # Express app entry point
```

## Key Endpoints

### Analytics
```
GET  /api/analytics/dashboard?days=7   # Unified dashboard (GA4 + Shopify)
GET  /api/analytics/realtime           # Active visitors (last 30 min)
GET  /api/analytics/traffic?days=7     # GA4 traffic data
GET  /api/analytics/sales?days=7       # Shopify sales data
GET  /api/analytics/health             # Service health check
POST /api/analytics/track              # Track recommendation events
```

### Fashion Intelligence
```
GET  /api/colors                       # Color catalog
GET  /api/colors/:color/relationships  # Color pairings and conflicts
POST /api/recommendations              # AI outfit recommendations (with Shopify product links)
POST /api/combinations/validate        # Validate outfit combinations
GET  /api/trending                     # Current fashion trends
GET  /api/venues/:type/recommendations # Venue-specific attire
GET  /api/styles/:profile              # Style profile details
POST /api/rules/check                  # Fashion rules validation
```

### V2 Compatibility
```
POST /api/v2/recommendations                   # V2 format recommendations
POST /api/v2/products/complete-the-look         # Complete the look with product links
GET  /api/v2/trending                           # V2 trending data
GET  /api/v2/colors                             # V2 color data
POST /api/recommendations/complete-look         # Alias
POST /api/style/validate-outfit                 # Alias
```

### System
```
GET  /health          # Health check (Railway uses this)
GET  /docs            # Swagger UI
GET  /docs/openapi.yaml
```

## Quick Start

### Local Development
```bash
git clone https://github.com/IbrahimAyad/kct-knowledge-api-2.git
cd kct-knowledge-api-2
npm install
cp .env.documented .env   # Edit with real values
npm run dev               # http://localhost:3000
```

### Build & Run
```bash
npm run build
npm start
```

## Environment Variables

See `.env.documented` for the full reference. Key variables:

| Variable | Example | Notes |
|----------|---------|-------|
| `GA4_PROPERTY_ID` | `401822822` | Property ID, NOT Stream ID |
| `GA4_SERVICE_ACCOUNT_JSON` | `{...}` | Single-line JSON |
| `SHOPIFY_STORE_URL` | `kctmenswear.myshopify.com` | No https:// |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | `shpat_xxx` | From Custom App |
| `REDIS_URL` | Auto-populated | Railway Redis add-on |
| `SENTRY_DSN` | `https://...ingest.sentry.io/...` | Error monitoring |
| `API_KEY` | your-key | API authentication |

## Deployment

Deploys automatically when you push to `main`. Railway uses `Dockerfile.railway` with:
- Node.js 20 Alpine base
- 1024MB heap allocation (`--max-old-space-size=1024`)
- Health check on `/health`
- Auto-restart on failure (max 10 retries)

### Manual deploy
```bash
railway up
```

## Architecture Notes

### Product Catalog Integration
Recommendations return real Shopify product links. The mapping lives in `src/data/intelligence/product-catalog-mapping.json` (15 colors, 157 products). Service: `src/services/product-catalog-service.ts`.

### Memory Management
Four automatic cleanup intervals prevent unbounded growth: MetricsCollector (5min), DataLoader (2min), HealthMonitor (on-add), CacheInvalidation (on-invalidate). All collections are capped (alerts: 200, keyMetrics: 500, endpoints: 100).

### Archived Services
25+ files in `src/services/_archived/` and `src/routes/_archived/` — voice AI, SEO crawler, chat system, conversation tracking. These are disabled but preserved for potential future use.

### Scoring
All recommendation scores use deterministic `stableScore()` hashing (not `Math.random()`), so identical inputs produce identical outputs.

## Authentication

API key via `X-API-Key` header. Public endpoints (colors, recommendations, trending, analytics) don't require auth. Rate limited at 1000 req/15min per IP.

## Related Systems

| System | Purpose | Connection |
|--------|---------|------------|
| [kctmenswear.com](https://kctmenswear.com) | Customer storefront | Calls this API for recommendations, tracks events |
| Max Out Admin | Internal dashboard | Calls this API for analytics |
| Shopify | E-commerce backend | Product data, orders, sales |
| Google Analytics 4 | Traffic analytics | Real-time and historical data |

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/QUICK_REFERENCE.md` | Day-to-day operations cheat sheet |
| `docs/ai-context/architecture.md` | Full system architecture |
| `docs/ai-context/common-errors.md` | Troubleshooting guide |
| `.env.documented` | Environment variables reference |
| `docs/archive/` | Historical implementation docs |

## License

MIT
