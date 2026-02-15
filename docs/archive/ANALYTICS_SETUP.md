# Analytics System Setup Guide

## Overview

The Knowledge API now includes a unified analytics dashboard that combines:
- **Google Analytics 4 (GA4)** - Real traffic data from your storefront
- **Shopify Admin API** - Sales, orders, and product data
- **Recommendation Tracking** - Engagement metrics for AI recommendations

## Quick Start

### 1. Install Dependencies

Already installed via `npm install`:
- `@google-analytics/data` - GA4 Data API client
- `@shopify/shopify-api` - Shopify GraphQL API client

### 2. Configure Environment Variables

Copy the required variables to your `.env` file:

```bash
# Google Analytics 4
GA4_PROPERTY_ID=5979716763

# Option A: Service Account JSON file path (recommended)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option B: Or paste JSON directly (for Railway/Vercel)
# GA4_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Shopify
SHOPIFY_STORE_URL=kctmenswear.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Set Up Google Analytics 4 Access

#### A. Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google Analytics Data API"
   - Navigate to APIs & Services > Library
   - Search for "Google Analytics Data API"
   - Click Enable

4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name: `kct-analytics-reader`
   - Role: "Viewer"
   - Click "Done"

5. Create a Key:
   - Click on the service account
   - Go to Keys tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the JSON file

#### B. Grant Access in GA4

1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property (kctmenswear - GA4)
3. Click Admin (gear icon)
4. Under Property column, click "Property Access Management"
5. Click the "+" icon > "Add users"
6. Enter the service account email (from JSON file: `client_email`)
   - Example: `kct-analytics-reader@your-project.iam.gserviceaccount.com`
7. Role: Select "Viewer"
8. Click "Add"

#### C. Find Your Property ID

1. In GA4 Admin > Property Settings
2. Copy the Property ID (e.g., `5979716763`)
3. Add to `.env`:
   ```
   GA4_PROPERTY_ID=5979716763
   ```

### 4. Set Up Shopify Access

#### A. Create a Custom App

1. Go to Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps"
3. Click "Create an app"
4. Name: `KCT Analytics API`

#### B. Configure Admin API Scopes

1. Click "Configure Admin API scopes"
2. Select the following scopes:
   - `read_orders` - Access order data
   - `read_products` - Access product information
   - `read_customers` - Access customer count
   - `read_analytics` - Access analytics data (if available)
3. Click "Save"

#### C. Install and Get Access Token

1. Click "Install app"
2. Confirm installation
3. Click "Reveal token once"
4. Copy the Admin API access token (starts with `shpat_`)
5. Add to `.env`:
   ```
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 5. Test the Setup

```bash
# Build and start the server
npm run build
npm start

# Test analytics health
curl http://localhost:3000/api/analytics/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "ga4": { "status": "healthy", "message": "GA4 API connected" },
    "shopify": { "status": "healthy", "message": "Shopify API connected" },
    "redis": { "status": "healthy", "message": "Redis connected" }
  }
}
```

## API Endpoints

### Dashboard (Unified Metrics)

```bash
GET /api/analytics/dashboard?days=7
```

Returns combined data from all sources:
```json
{
  "success": true,
  "data": {
    "traffic": {
      "sessions": 97,
      "activeUsers": 89,
      "pageViews": 342,
      "avgSessionDuration": 204,
      "bounceRate": "42.35",
      "devices": { "desktop": 54, "mobile": 23, "tablet": 20 }
    },
    "sales": {
      "totalSales": 1250.50,
      "totalOrders": 5,
      "averageOrderValue": 250.10,
      "conversionRate": 5.15
    },
    "recommendations": {
      "views": 234,
      "clicks": 52,
      "clickThroughRate": 22.22,
      "topProducts": [...]
    },
    "summary": {
      "sessions": 97,
      "totalSales": "$1250.50",
      "orders": 5,
      "conversionRate": "5.15%"
    }
  }
}
```

### Traffic Metrics (GA4)

```bash
GET /api/analytics/traffic?days=7
```

### Sales Metrics (Shopify)

```bash
GET /api/analytics/sales?days=7
```

### Recommendation Engagement

```bash
GET /api/analytics/recommendations?days=7
```

### Real-time Metrics

```bash
GET /api/analytics/realtime
```

Returns active users in last 30 minutes.

### Track Events (From Frontend)

```bash
POST /api/analytics/track
Content-Type: application/json

{
  "eventType": "click",
  "productId": "gid://shopify/Product/123",
  "productTitle": "Navy Tuxedo",
  "occasion": "wedding",
  "source": "ai",
  "sessionId": "optional-session-id"
}
```

Event types:
- `view` - Recommendation shown to user
- `click` - User clicked on recommendation
- `add_to_cart` - User added product to cart
- `purchase` - User purchased product

Sources:
- `trending` - From trending endpoint
- `ai` - From AI recommendations
- `similar` - From similar products
- `color` - From color matching
- `style` - From style profiles

## Frontend Integration

### Step 1: Add Event Tracking to Your Storefront

```javascript
// When showing recommendations
async function trackRecommendationView(products, occasion) {
  for (const product of products) {
    await fetch('https://your-api.railway.app/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'view',
        productId: product.id,
        productTitle: product.title,
        occasion: occasion,
        source: 'ai',
        sessionId: getSessionId() // Generate a unique session ID
      })
    });
  }
}

// When user clicks a recommendation
async function trackRecommendationClick(product, occasion) {
  await fetch('https://your-api.railway.app/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'click',
      productId: product.id,
      productTitle: product.title,
      occasion: occasion,
      source: 'ai',
      sessionId: getSessionId()
    })
  });
}

// Session ID helper (store in localStorage)
function getSessionId() {
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}
```

### Step 2: Track Add to Cart

```javascript
// In your add to cart handler
async function handleAddToCart(product) {
  // Your existing add to cart logic
  addToCart(product);

  // Track the event
  await fetch('https://your-api.railway.app/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'add_to_cart',
      productId: product.id,
      productTitle: product.title,
      source: 'ai', // or wherever the recommendation came from
      sessionId: getSessionId()
    })
  });
}
```

### Step 3: Track Purchases (Post-Checkout)

```javascript
// On order confirmation page
async function trackPurchase(order) {
  for (const item of order.line_items) {
    await fetch('https://your-api.railway.app/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'purchase',
        productId: item.product_id,
        productTitle: item.title,
        sessionId: getSessionId()
      })
    });
  }
}
```

## Displaying the Dashboard

### Example: Fetch and Display Metrics

```javascript
async function loadAnalyticsDashboard() {
  const response = await fetch('https://your-api.railway.app/api/analytics/dashboard?days=7');
  const { data } = await response.json();

  // Display in your UI
  document.getElementById('sessions').textContent = data.summary.sessions;
  document.getElementById('sales').textContent = data.summary.totalSales;
  document.getElementById('orders').textContent = data.summary.orders;
  document.getElementById('conversion').textContent = data.summary.conversionRate;
}
```

### React Example

```tsx
import { useEffect, useState } from 'react';

function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch('https://your-api.railway.app/api/analytics/dashboard?days=7')
      .then(res => res.json())
      .then(({ data }) => setMetrics(data));
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <div className="metric">
        <h3>Sessions</h3>
        <p>{metrics.summary.sessions}</p>
      </div>
      <div className="metric">
        <h3>Total Sales</h3>
        <p>{metrics.summary.totalSales}</p>
      </div>
      <div className="metric">
        <h3>Orders</h3>
        <p>{metrics.summary.orders}</p>
      </div>
      <div className="metric">
        <h3>Conversion Rate</h3>
        <p>{metrics.summary.conversionRate}</p>
      </div>
    </div>
  );
}
```

## Troubleshooting

### GA4 Connection Issues

**Error: "GA4 credentials not configured"**
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` points to valid JSON file
- OR set `GA4_SERVICE_ACCOUNT_JSON` with the full JSON content
- Verify the path is absolute, not relative

**Error: "Permission denied"**
- Check that service account email is added in GA4 Property Access Management
- Verify the role is "Viewer" or higher
- Wait 5-10 minutes after adding - permissions take time to propagate

**Error: "Property not found"**
- Double-check `GA4_PROPERTY_ID` matches your property
- Property ID is the number, not the measurement ID (G-XXXXXXX)

### Shopify Connection Issues

**Error: "Shopify credentials not configured"**
- Verify `SHOPIFY_STORE_URL` and `SHOPIFY_ADMIN_ACCESS_TOKEN` are set
- Store URL should be just the domain (no https://)

**Error: "Access denied" or "Insufficient scopes"**
- Check that all required scopes are enabled (read_orders, read_products, read_customers)
- Reinstall the app if you added scopes after installation

**Error: "GraphQL error"**
- Check Shopify API version compatibility
- Verify your store has products and orders to query

### Redis Connection Issues

**Error: "Redis connection not available"**
- Make sure Redis is running
- Check `REDIS_URL` or Redis connection settings in `.env`
- Recommendation tracking will fail gracefully without Redis

## Rate Limits

- **Analytics endpoints**: 300 requests/minute (RELAXED tier)
- **Tracking endpoint**: 300 requests/minute (ANALYTICS tier)
- **Health check**: 1000 requests/minute (GENEROUS tier)

## Data Retention

- **Recommendation events**: 90 days (in Redis)
- **Session attribution**: 24 hours
- **GA4 data**: Per Google's retention settings
- **Shopify data**: Real-time queries (no local storage)

## Next Steps

1. ✅ Set up GA4 and Shopify credentials
2. ✅ Test `/api/analytics/health` endpoint
3. ✅ Test `/api/analytics/dashboard` endpoint
4. Add tracking events to your frontend
5. Monitor metrics and optimize recommendations

## Support

- GA4 API Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1
- Shopify Admin API: https://shopify.dev/docs/api/admin-graphql
- Knowledge API Issues: [Your GitHub repo]
