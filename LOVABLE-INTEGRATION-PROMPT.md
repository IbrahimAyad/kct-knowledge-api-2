# Lovable Integration Prompt — KCT Intelligence Engine

## Context

The KCT Knowledge API now has a **15-signal intelligence engine** that returns context-aware recommendations. The API is live at:

```
https://kct-knowledge-api-2-production.up.railway.app
```

The intelligence layer is already wired into the existing endpoints the frontend calls. Every response from `/api/recommendations`, `/api/v2/recommendations`, and `/api/v2/products/complete-the-look` now includes an `intelligence` or `intelligence_context` object with real data — color guidance, fabric recommendations, price tiers, reasoning, and shop links.

**The frontend currently ignores this intelligence data.** This integration updates Lovable to consume and display it.

---

## What Changed on the API (Already Deployed — No Backend Work Needed)

All 3 recommendation endpoints now return additional fields:

### `/api/v2/products/complete-the-look` response now includes:
```json
{
  "success": true,
  "data": {
    "outfitSuggestions": [...],
    "shopProducts": {...},
    "intelligence": {
      "signals_used": ["formality_rules", "seasonal_fabrics", "wedding_colors_2026", "venue_lighting"],
      "confidence": 0.85,
      "color_guidance": {
        "preferred": ["navy", "charcoal", "light_blue"],
        "avoid": ["black"],
        "photograph_well": ["navy", "medium_grey"]
      },
      "fabric_guidance": {
        "recommended": ["tropical_wool", "linen_blend"],
        "avoid": ["heavy_tweed"],
        "performance_priorities": ["breathable", "wrinkle_resistant"]
      },
      "price_tier": {
        "range": "mid",
        "min_investment": 299,
        "max_investment": 699,
        "quality_level": "professional"
      },
      "reasoning": [
        "Summer outdoor wedding: lightweight breathable fabrics recommended",
        "Navy suit photographs exceptionally well in natural lighting",
        "2026 wedding color forecast: dusty blue and sage are trending"
      ],
      "shop_links": {
        "shop_url": "https://kctmenswear.com/collections/wedding-suits",
        "guide_url": "https://kctmenswear.com/pages/wedding-guide"
      }
    }
  }
}
```

### `/api/v2/recommendations` response now includes:
```json
{
  "intelligence": {
    "signals_used": [...],
    "confidence": 0.85,
    "color_guidance": {...},
    "fabric_guidance": {...},
    "price_tier": {...},
    "reasoning": [...],
    "shop_links": {...}
  }
}
```

### `/api/recommendations` response now includes:
```json
{
  "intelligence_context": {
    "formality_range": [6, 9],
    "color_filters": { "preferred": [...], "avoid": [...], "photograph_well": [...] },
    "fabric_preferences": { "recommended": [...], "avoid": [...] },
    "price_tier": { "range": "mid", "min_investment": 299, "max_investment": 699 },
    "fit_guidance": { "style": "modern", "details": [...] },
    "product_tags": { "all_tags": [...], "prioritized_tags": [...] },
    "max_recommendations": 5,
    "reasoning": [...],
    "confidence": 0.85,
    "signals_used": [...]
  },
  "intelligence_insights": {
    "context_builder": { "signals_used": 8, "confidence": 0.85 },
    "reasoning_points": 6
  },
  "shop_links": {
    "shop_url": "https://kctmenswear.com/collections/...",
    "guide_url": "https://kctmenswear.com/pages/..."
  }
}
```

---

## Integration Tasks for Lovable

### Task 1: Pass Intelligence Parameters in API Calls

When calling the recommendation endpoints, include these additional parameters so the intelligence engine can work:

**For Complete the Look calls:**
```typescript
// BEFORE (current)
const response = await fetch(`${API_BASE}/api/recommendations/complete-look`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product: { color: suitColor, id: productId, category },
    occasion,
    preferences: { style }
  })
});

// AFTER (with intelligence parameters)
const response = await fetch(`${API_BASE}/api/recommendations/complete-look`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product: { color: suitColor, id: productId, category },
    occasion,
    preferences: {
      style,
      season: getCurrentSeason(),       // 'spring' | 'summer' | 'fall' | 'winter'
      venue_type: venueType || undefined, // 'outdoor' | 'indoor' | 'church' | 'beach' | 'ballroom'
      age: customerAge || undefined,
      occupation: customerOccupation || undefined
    }
  })
});
```

**For Recommendations calls:**
```typescript
// AFTER (with intelligence parameters)
const response = await fetch(`${API_BASE}/api/v2/recommendations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    color: suitColor,
    occasion,
    style,
    preferences: {
      season: getCurrentSeason(),
      venue_type: venueType || undefined,
      age: customerAge || undefined,
      occupation: customerOccupation || undefined
    }
  })
});
```

**Helper function for season detection:**
```typescript
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}
```

### Task 2: Display Intelligence Reasoning on Product/Recommendation Pages

When the API returns intelligence data, display the `reasoning` array as styling tips. These are human-readable explanations like "Summer outdoor wedding: lightweight breathable fabrics recommended."

**Example component:**
```tsx
// IntelligenceInsights.tsx
interface IntelligenceData {
  signals_used: string[];
  confidence: number;
  color_guidance: {
    preferred: string[];
    avoid: string[];
    photograph_well: string[];
  };
  fabric_guidance: {
    recommended: string[];
    avoid: string[];
    performance_priorities: string[];
  };
  price_tier: {
    range: string;
    min_investment: number;
    max_investment: number;
    quality_level: string;
  };
  reasoning: string[];
  shop_links?: {
    shop_url?: string;
    guide_url?: string;
  };
}

function IntelligenceInsights({ intelligence }: { intelligence: IntelligenceData | null }) {
  if (!intelligence || !intelligence.reasoning?.length) return null;

  return (
    <div className="bg-stone-50 rounded-lg p-4 mt-4 border border-stone-200">
      <h3 className="text-sm font-semibold text-stone-800 mb-2 flex items-center gap-2">
        <span>✨</span> Styling Intelligence
        {intelligence.confidence >= 0.8 && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            High Confidence
          </span>
        )}
      </h3>
      <ul className="space-y-1">
        {intelligence.reasoning.map((reason, i) => (
          <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            {reason}
          </li>
        ))}
      </ul>
      {intelligence.shop_links?.shop_url && (
        <a
          href={intelligence.shop_links.shop_url}
          className="inline-block mt-3 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
        >
          Shop this look →
        </a>
      )}
    </div>
  );
}
```

### Task 3: Use Color Guidance for Visual Highlights

When the intelligence returns `color_guidance.preferred`, highlight those colors in the recommendation UI. When it returns `color_guidance.avoid`, de-emphasize or add a subtle note.

**Example: Color chip with intelligence overlay**
```tsx
function ColorChip({ color, intelligence }: { color: string; intelligence: IntelligenceData | null }) {
  const isPreferred = intelligence?.color_guidance?.preferred?.includes(color);
  const shouldAvoid = intelligence?.color_guidance?.avoid?.includes(color);
  const photographsWell = intelligence?.color_guidance?.photograph_well?.includes(color);

  return (
    <div className="relative">
      <div className={cn(
        "w-8 h-8 rounded-full border-2",
        isPreferred && "border-green-500 ring-2 ring-green-200",
        shouldAvoid && "border-red-300 opacity-60",
        !isPreferred && !shouldAvoid && "border-stone-300"
      )} />
      {photographsWell && (
        <span className="absolute -top-1 -right-1 text-xs">📸</span>
      )}
    </div>
  );
}
```

### Task 4: Display Price Tier Guidance

When intelligence returns a `price_tier`, use it to sort/filter recommendations and show a budget guidance badge.

```tsx
function PriceTierBadge({ priceTier }: { priceTier: IntelligenceData['price_tier'] | null }) {
  if (!priceTier) return null;

  const tierLabels: Record<string, string> = {
    entry: 'Great Value',
    mid: 'Smart Investment',
    high: 'Premium Quality',
    luxury: 'Luxury Collection'
  };

  return (
    <div className="flex items-center gap-2 text-sm text-stone-600">
      <span className="font-medium">{tierLabels[priceTier.range] || priceTier.range}</span>
      <span className="text-stone-400">·</span>
      <span>${priceTier.min_investment}–${priceTier.max_investment}</span>
    </div>
  );
}
```

### Task 5: Fabric Recommendations Display

Show fabric guidance when available, particularly useful for occasion-specific shopping:

```tsx
function FabricGuidance({ fabricGuidance }: { fabricGuidance: IntelligenceData['fabric_guidance'] | null }) {
  if (!fabricGuidance?.recommended?.length) return null;

  return (
    <div className="text-sm text-stone-600 mt-2">
      <span className="font-medium">Recommended fabrics: </span>
      {fabricGuidance.recommended.map(f => f.replace(/_/g, ' ')).join(', ')}
      {fabricGuidance.performance_priorities?.length > 0 && (
        <span className="text-stone-400 ml-1">
          ({fabricGuidance.performance_priorities.join(', ')})
        </span>
      )}
    </div>
  );
}
```

### Task 6: Wedding & Prom Occasion Pages — Enhanced Intelligence

For wedding and prom occasion pages, the intelligence engine provides extra data:

- **Wedding**: 2026 color forecast, venue-optimized colors, photography tips
- **Prom**: Aura detection (Classic Gentleman, Bold Rebel, Romantic, Trendsetter, Edgy Modern), aura-specific product tags

Display the prom aura as a fun personality result on prom pages. Display wedding color forecast as trend guidance on wedding pages.

### Task 7: Add Intelligence Diagnostics (Optional but Recommended)

The API provides two diagnostic endpoints for testing and debugging the intelligence engine:

#### 7.1: Intelligence Status Check

Check if all intelligence services are active and loaded:

```typescript
// Check if intelligence engine is healthy
const statusResponse = await fetch(`${API_BASE}/api/intelligence/status`);
const status = await statusResponse.json();

/* Returns:
{
  "success": true,
  "data": {
    "engine_version": "3.0.0",
    "services": {
      "context_builder": { "status": "active", "signals": 15 },
      "venue_intelligence": { "status": "active" },
      "career_intelligence": { "status": "active" },
      "cultural_adaptation": { "status": "active" },
      "seasonal_rules": { "status": "active" },
      "fabric_performance": { "status": "active" },
      "product_tags": { "status": "active", "tag_count": 26 },
      "prom_aura": { "status": "active", "auras": 5 },
      "wedding_forecast": { "status": "active", "colors": 10 },
      "site_links": { "status": "active", "collections": 17 },
      "monthly_calendar": { "status": "active" },
      "product_catalog": { "status": "active" },
      "price_tiers": { "status": "active" }
    },
    "data_files_loaded": 19,
    "sprints_completed": 4,
    "last_deploy": "2026-02-14T..."
  }
}
*/
```

**Use case**: Display a status indicator in admin/developer panels to verify the intelligence engine is working.

#### 7.2: Direct Intelligence Testing

Test the context builder directly to see what intelligence it generates for specific inputs:

```typescript
// Test intelligence for a specific scenario
const testResponse = await fetch(`${API_BASE}/api/intelligence/test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    occasion: 'wedding',
    season: 'summer',
    venue_type: 'outdoor',
    age: 28,
    occupation: 'consulting'
  })
});

const testResult = await testResponse.json();

/* Returns:
{
  "success": true,
  "data": {
    "context": {
      // Full intelligence context with all 15 signals
      "formality_range": [6, 9],
      "color_filters": { "preferred": [...], "avoid": [...] },
      "fabric_preferences": { "recommended": [...] },
      "price_tier": { "range": "mid", "min_investment": 299 },
      // ... full context
    },
    "summary": {
      "signals_used": 8,
      "reasoning_points": 6,
      "confidence": 0.85,
      "formality": "6-9",
      "preferred_colors": ["navy", "charcoal", "light_blue", "sage", "dusty_blue"],
      "recommended_fabrics": ["tropical_wool", "linen_blend", "cotton_blend"],
      "price_range": "$299-$699",
      "max_recommendations": 5
    }
  }
}
*/
```

**Use case**: Build an interactive "See Your Style Intelligence" feature where users input their occasion details and see the AI's reasoning before shopping.

**Example UI Component:**
```tsx
function IntelligenceDebugger() {
  const [occasion, setOccasion] = useState('wedding');
  const [season, setSeason] = useState('summer');
  const [results, setResults] = useState(null);

  const testIntelligence = async () => {
    const res = await fetch(`${API_BASE}/api/intelligence/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion, season, venue_type: 'outdoor' })
    });
    const data = await res.json();
    setResults(data.data.summary);
  };

  return (
    <div className="p-4 bg-stone-50 rounded-lg">
      <h3 className="font-semibold mb-3">Test Intelligence Engine</h3>
      <div className="space-y-2">
        <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          <option value="wedding">Wedding</option>
          <option value="prom">Prom</option>
          <option value="business">Business</option>
        </select>
        <select value={season} onChange={(e) => setSeason(e.target.value)}>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="fall">Fall</option>
          <option value="winter">Winter</option>
        </select>
        <button onClick={testIntelligence} className="btn-primary">
          Test Intelligence
        </button>
      </div>
      {results && (
        <div className="mt-4 p-3 bg-white rounded border">
          <p><strong>Signals Used:</strong> {results.signals_used}</p>
          <p><strong>Confidence:</strong> {results.confidence}</p>
          <p><strong>Top Colors:</strong> {results.preferred_colors?.join(', ')}</p>
          <p><strong>Fabrics:</strong> {results.recommended_fabrics?.join(', ')}</p>
          <p><strong>Price Range:</strong> {results.price_range}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Important Notes

1. **All intelligence fields are optional in responses.** The API wraps the context builder in try/catch — if it fails, the response comes back normally without the `intelligence` object. Always null-check before rendering.

2. **No API key needed** for v2 endpoints. The intelligence is automatically included.

3. **CORS is already configured** for Lovable domains (`.lovable.app` and `.lovableproject.com`).

4. **The intelligence data is already in the responses.** Even without any frontend changes, the API is already returning it. This integration is about displaying what's already there.

5. **Season auto-detection** is the biggest quick win — just adding `getCurrentSeason()` to your API calls means the intelligence engine starts working immediately.

---

## Testing Verification

The intelligence engine has been fully deployed and verified ✅

### Sprint 4 Completion Status (FINAL SPRINT)

**All 5 sections completed and deployed:**
- ✅ Section 4.0 (P0): `/api/recommendations` now intelligence-driven
- ✅ Section 4.1 (P0): `/api/v2/products/complete-the-look` enhanced with context builder
- ✅ Section 4.2 (P1): `GET /api/intelligence/status` diagnostics endpoint added
- ✅ Section 4.3 (P1): `POST /api/intelligence/test` direct testing endpoint added
- ✅ Section 4.4 (P2): `/api/v2/recommendations` now uses context-derived formality

### Intelligence Engine Status

```bash
GET https://kct-knowledge-api-2-production.up.railway.app/api/intelligence/status
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "engine_version": "3.0.0",
    "services": {
      "context_builder": { "status": "active", "signals": 15 },
      "venue_intelligence": { "status": "active" },
      "career_intelligence": { "status": "active" },
      "cultural_adaptation": { "status": "active" },
      "seasonal_rules": { "status": "active" },
      "fabric_performance": { "status": "active" },
      "product_tags": { "status": "active", "tag_count": 26 },
      "prom_aura": { "status": "active", "auras": 5 },
      "wedding_forecast": { "status": "active", "colors": 10 },
      "site_links": { "status": "active", "collections": 17 },
      "monthly_calendar": { "status": "active" },
      "product_catalog": { "status": "active" },
      "price_tiers": { "status": "active" }
    },
    "data_files_loaded": 19,
    "sprints_completed": 4
  }
}
```

### Test Examples

**Test Wedding Intelligence:**
```bash
curl -X POST https://kct-knowledge-api-2-production.up.railway.app/api/intelligence/test \
  -H "Content-Type: application/json" \
  -d '{
    "occasion": "wedding",
    "season": "summer",
    "venue_type": "outdoor"
  }'
```

**Test Prom Intelligence:**
```bash
curl -X POST https://kct-knowledge-api-2-production.up.railway.app/api/intelligence/test \
  -H "Content-Type: application/json" \
  -d '{
    "occasion": "prom",
    "suit_color": "red",
    "use_case": "bold"
  }'
```

**Test Business Intelligence:**
```bash
curl -X POST https://kct-knowledge-api-2-production.up.railway.app/api/intelligence/test \
  -H "Content-Type: application/json" \
  -d '{
    "occasion": "business",
    "occupation": "lawyer",
    "age": 35
  }'
```

### Deployment Status

- ✅ TypeScript compiles clean
- ✅ All endpoints wrapped in try/catch for safety
- ✅ Railway auto-deploy successful
- ✅ Zero errors in production logs
- ✅ All 3 recommendation endpoints now return intelligence data
- ✅ Graceful fallback if context builder fails
- ✅ CORS configured for Lovable domains

**The intelligence engine is now LIVE and serving real customer traffic.**
