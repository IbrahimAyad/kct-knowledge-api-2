# SEO Crawler API

## Overview

Lightweight Node.js backend for crawling JavaScript-rendered websites and performing comprehensive SEO audits.

## Features

✅ **JavaScript Rendering** - Uses Puppeteer to render React/Next.js sites
✅ **Sitemap Discovery** - Automatically follows sitemap.xml
✅ **robots.txt Respect** - Honors crawl delays and disallow rules
✅ **Full SEO Analysis** - 20+ checks across errors, warnings, notices
✅ **Health Scoring** - 0-100 score based on issue severity
✅ **No Database** - Stateless API, returns JSON reports

## API Endpoints

### 1. Full Site Audit

**POST** `/api/seo/audit`

Crawls entire site and runs comprehensive SEO analysis.

**Request Body:**
```json
{
  "url": "https://kctmenswear.com",
  "maxPages": 100,
  "followSitemap": true,
  "respectRobotsTxt": true,
  "waitForSelector": ".product-grid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://kctmenswear.com",
    "crawledAt": "2025-12-02T20:00:00Z",
    "totalPages": 87,
    "healthScore": 82,
    "summary": {
      "errors": 3,
      "warnings": 12,
      "notices": 8
    },
    "issues": [
      {
        "type": "missing_h1",
        "severity": "error",
        "message": "2 page(s) missing H1 tag",
        "affectedUrls": ["/about", "/contact"],
        "recommendation": "Add exactly one H1 tag to each page"
      }
    ],
    "pages": [...]
  }
}
```

### 2. Single Page Analysis

**POST** `/api/seo/analyze-page`

Analyzes a single page (faster, no crawling).

**Request Body:**
```json
{
  "url": "https://kctmenswear.com/products/navy-suit",
  "waitForSelector": ".product-details"
}
```

### 3. Health Check

**GET** `/api/seo/health`

```json
{
  "success": true,
  "status": "healthy",
  "service": "SEO Crawler API",
  "version": "1.0.0"
}
```

## SEO Checks

### Errors (Critical Issues)
- ❌ Missing title tag
- ❌ Missing H1 tag
- ❌ Multiple H1 tags
- ❌ Missing meta description
- ❌ Missing SSL/HTTPS
- ❌ Broken pages (404, 500)

### Warnings (Important)
- ⚠️ Title too short (<30) or too long (>60)
- ⚠️ Meta description too short (<120) or too long (>160)
- ⚠️ Thin content (<300 words)
- ⚠️ Missing image alt text
- ⚠️ Duplicate titles across pages
- ⚠️ Duplicate meta descriptions

### Notices (Improvements)
- ℹ️ Missing canonical tag
- ℹ️ Missing Open Graph tags
- ℹ️ Missing Twitter Card tags
- ℹ️ Missing schema markup
- ℹ️ No sitemap.xml

## Health Score Algorithm

```
Starting Score: 100

Deductions:
- Errors: -10 points each (max -40)
- Warnings: -5 points each (max -30)
- Notices: -2 points each (max -20)

Final Score: 0-100
```

**Scoring Guide:**
- 90-100: Excellent
- 75-89: Good
- 60-74: Fair
- 40-59: Poor
- 0-39: Critical

## Deployment to Railway

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add SEO crawler service"
git push origin main
```

### Step 2: Deploy on Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `kct-knowledge-api`
4. Railway will detect `nixpacks.toml` and install Puppeteer dependencies automatically

### Step 3: Environment Variables

No additional environment variables needed! The crawler is stateless.

(Optional) If you want to limit crawling:
```bash
SEO_MAX_PAGES=100
SEO_CRAWL_DELAY=1000
```

### Step 4: Test Deployment

```bash
curl https://your-railway-url.railway.app/api/seo/health
```

## Frontend Integration

### Example: Call from MiniMax/Lovable

```typescript
async function runSEOAudit(url: string) {
  const response = await fetch('https://your-api.railway.app/api/seo/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      maxPages: 100,
      followSitemap: true,
      respectRobotsTxt: true
    })
  });

  const { data } = await response.json();
  return data; // SEOAuditReport
}

// Usage
const report = await runSEOAudit('https://kctmenswear.com');
console.log(`Health Score: ${report.healthScore}/100`);
console.log(`Issues: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
```

### Download Report as PDF

```typescript
function downloadReport(report: SEOAuditReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seo-audit-${new Date().toISOString()}.json`;
  a.click();
}
```

## Performance

- **Single page analysis**: ~3-5 seconds
- **100 page crawl**: ~2-3 minutes (with 1 second delay between pages)
- **Memory usage**: ~300-500MB (Chromium overhead)

## Troubleshooting

### "Browser launch failed"
Railway needs the `nixpacks.toml` configuration to install Chromium dependencies. Make sure the file is committed.

### "Timeout waiting for selector"
The `waitForSelector` is optional. If your site doesn't have that element, remove it or adjust the timeout.

### "Rate limited"
Add a longer `crawlDelay` in robots.txt or reduce `maxPages`.

## Technical Details

**Stack:**
- Puppeteer 24.x - Headless Chrome
- Cheerio - HTML parsing
- Express - API routes
- TypeScript - Type safety

**Architecture:**
```
Frontend (MiniMax)
    ↓ POST /api/seo/audit
Backend (Railway)
    ↓ Puppeteer
Target Site (JS rendered)
    ↓ HTML
SEO Analysis
    ↓ JSON Report
Frontend (display & download)
```

## Limitations

- Max 100 pages per audit (configurable)
- 1 second delay between pages (respect servers)
- No authentication/user accounts
- No historical data storage
- Reports not saved (download only)

## Future Enhancements

- [ ] Lighthouse integration for performance scores
- [ ] Mobile vs Desktop comparison
- [ ] Competitor analysis
- [ ] Historical trend tracking (requires database)
- [ ] Scheduled audits
- [ ] Email reports

## Support

Created for KCT Menswear SEO audit tool.

For issues, check logs in Railway dashboard.
