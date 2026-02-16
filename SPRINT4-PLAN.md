# Sprint 4: Wire the Intelligence Engine into API Endpoints

**Goal:** Connect the `recommendationContextBuilder` (15 intelligence signals) to the actual API endpoints that customers hit. Right now the context builder exists but nothing calls it. This sprint makes the intelligence engine live.

**This is the final sprint. After this, every recommendation the API serves will be intelligence-driven.**

---

## Section 4.0 (P0): Wire Context Builder into `/api/recommendations`

**File:** `src/controllers/api.ts`

**Problem:** The `getRecommendations` controller (line ~166) calls `knowledgeBankService.getComprehensiveRecommendations()` directly, bypassing the intelligence engine. The context builder with its 15 signals is never called.

**Task:**

1. Import the context builder at the top of api.ts:
```typescript
import { recommendationContextBuilder } from '../services/recommendation-context-builder';
```

2. In `getRecommendations()`, BEFORE calling `knowledgeBankService.getComprehensiveRecommendations()`, call the context builder:
```typescript
// Build intelligence context from all 15 signals
let intelligenceContext = null;
try {
  intelligenceContext = await recommendationContextBuilder.buildContext({
    occasion: occasion,
    venue_type: venue_type,
    season: season,
    age: age ? parseInt(age) : undefined,
    occupation: occupation,
    cultural_region: cultural_region,
    suit_color: suit_color,
    use_case: customer_profile,
  });
} catch (error) {
  console.warn('Intelligence context builder failed, using base recommendations:', error);
}
```

3. Use the intelligence context to enhance the response. After the existing `enhancedRecommendations` object is built (around line ~269), add the intelligence context data:

```typescript
// Add intelligence context to the response
if (intelligenceContext) {
  enhancedRecommendations.intelligence_context = {
    formality_range: intelligenceContext.formality_range,
    color_filters: intelligenceContext.color_filters,
    fabric_preferences: intelligenceContext.fabric_preferences,
    price_tier: intelligenceContext.price_tier,
    fit_guidance: intelligenceContext.fit_guidance,
    product_tags: intelligenceContext.product_tags,
    max_recommendations: intelligenceContext.max_recommendations,
    reasoning: intelligenceContext.reasoning,
    confidence: intelligenceContext.confidence,
    signals_used: intelligenceContext.signals_used,
  };

  // Override the generic intelligence_insights with real data
  enhancedRecommendations.intelligence_insights = {
    ...enhancedRecommendations.intelligence_insights,
    context_builder: {
      signals_used: intelligenceContext.signals_used.length,
      signal_list: intelligenceContext.signals_used,
      confidence: intelligenceContext.confidence,
      reasoning_points: intelligenceContext.reasoning.length,
    },
    intelligence_adjustments: [
      ...intelligenceAdjustments,
      ...intelligenceContext.reasoning
    ],
    enhanced_features_used: [
      ...intelligenceContext.signals_used,
      customer_id ? 'psychology_analysis' : null,
    ].filter(Boolean)
  };
}
```

4. Use the context to filter product recommendations. After enriching with Shopify links, use context builder data to re-rank:

```typescript
// Use intelligence context to add shop links
if (intelligenceContext) {
  const links = productCatalogService.enrichRecommendationWithLinks(
    intelligenceContext.formality_range?.occasion || occasion,
    undefined  // category determined by recommendations
  );
  if (links.shop_url || links.guide_url) {
    enhancedRecommendations.shop_links = links;
  }
}
```

**Validation:** Hit `POST /api/recommendations` with `{ "suit_color": "navy", "occasion": "wedding", "venue_type": "outdoor", "season": "summer", "age": "28", "occupation": "consulting" }`. Response should include `intelligence_context` with `signals_used` array showing at least 5+ signals, `reasoning` array with wedding color forecast mentions, and `shop_links`.

---

## Section 4.1 (P0): Wire Context Builder into `/api/v2/products/complete-the-look`

**File:** `src/routes/v2-compatibility.ts`

**Problem:** The `complete-the-look` endpoint (line ~115) calls `smartBundleService.generateBundles()` with hardcoded values (`formality_level: 'business_casual'`, `season: 'fall'`, `age_range: '25-45'`). It ignores all intelligence signals.

**Task:**

1. Import the context builder:
```typescript
import { recommendationContextBuilder } from '../services/recommendation-context-builder';
```

2. In the `complete-the-look` handler, build intelligence context from whatever the frontend sends:
```typescript
// Build intelligence context
let intelligenceContext = null;
try {
  intelligenceContext = await recommendationContextBuilder.buildContext({
    occasion: occasion || 'business',
    suit_color: product?.color,
    season: preferences?.season,
    venue_type: preferences?.venue_type,
    age: preferences?.age ? parseInt(preferences.age) : undefined,
    occupation: preferences?.occupation,
    use_case: preferences?.style,
  });
} catch (error) {
  logger.warn('Intelligence context unavailable for complete-the-look', { error: error instanceof Error ? error.message : String(error) });
}
```

3. Use the context to make the `smartBundleService.generateBundles()` call smarter instead of hardcoded:
```typescript
recommendations = await smartBundleService.generateBundles({
  generation_type: 'complete_outfit',
  base_requirements: {
    occasion: occasion || 'business',
    formality_level: intelligenceContext?.formality_range?.range || 'business_casual',
    season: intelligenceContext?.fabric_preferences ?
      (preferences?.season || 'fall') : 'fall',
    target_demographics: {
      age_range: preferences?.age || '25-45',
      style_preference: preferences?.style || 'modern',
      budget_range: intelligenceContext?.price_tier ? {
        min: intelligenceContext.price_tier.min_investment,
        max: intelligenceContext.price_tier.max_investment
      } : { min: 200, max: 1000 },
      body_types: []
    }
  }
});
```

4. Add intelligence context and shop links to the response:
```typescript
// Add to the response object:
intelligence: intelligenceContext ? {
  signals_used: intelligenceContext.signals_used,
  confidence: intelligenceContext.confidence,
  color_guidance: intelligenceContext.color_filters,
  fabric_guidance: intelligenceContext.fabric_preferences,
  price_tier: intelligenceContext.price_tier,
  reasoning: intelligenceContext.reasoning,
  shop_links: productCatalogService.enrichRecommendationWithLinks(occasion, product?.category)
} : null,
```

**Validation:** Hit `POST /api/v2/products/complete-the-look` with `{ "product": { "color": "burgundy", "id": "123" }, "occasion": "prom", "preferences": { "style": "bold" } }`. Response should include `intelligence` object with prom aura system signals and aura-specific reasoning.

---

## Section 4.2 (P1): Add Intelligence Diagnostics Endpoint

**File:** `src/server.ts`

**Task:** Add a new endpoint `GET /api/intelligence/status` that returns what signals are loaded and available. This helps debug the frontend integration and proves the engine is working.

```typescript
app.get("/api/intelligence/status", async (_req, res) => {
  await initializeServices();

  const status = {
    engine_version: '3.0.0',
    services: {
      context_builder: { status: 'active', signals: 15 },
      venue_intelligence: { status: 'active' },
      career_intelligence: { status: 'active' },
      cultural_adaptation: { status: 'active' },
      seasonal_rules: { status: 'active' },
      fabric_performance: { status: 'active' },
      product_tags: { status: 'active', tag_count: productTagService.getAllTags() },
      prom_aura: { status: 'active', auras: promAuraService.getAllAuras() },
      wedding_forecast: { status: 'active', colors: weddingForecastService.getAllColors() },
      site_links: { status: 'active', collections: siteLinksService.getAllCollections() },
      monthly_calendar: { status: 'active' },
      product_catalog: { status: 'active' },
      price_tiers: { status: 'active' },
    },
    data_files_loaded: 19,
    sprints_completed: 4,
    last_deploy: new Date().toISOString()
  };

  res.json({ success: true, data: status });
});
```

Import the needed services at the top of server.ts:
```typescript
import { productTagService } from './services/product-tag-service';
import { promAuraService } from './services/prom-aura-service';
import { weddingForecastService } from './services/wedding-forecast-service';
import { siteLinksService } from './services/site-links-service';
```

**Validation:** Hit `GET /api/intelligence/status`. Should return all services as active, 5 prom auras, 10 wedding colors, 17+ collections.

---

## Section 4.3 (P1): Add Intelligence Test Endpoint

**File:** `src/server.ts`

**Task:** Add `POST /api/intelligence/test` that lets you test the context builder directly without going through the full recommendation pipeline. This is critical for debugging and demonstrating the engine.

```typescript
app.post("/api/intelligence/test", async (req, res) => {
  await initializeServices();

  try {
    const context = await recommendationContextBuilder.buildContext(req.body);

    res.json({
      success: true,
      data: {
        context,
        summary: {
          signals_used: context.signals_used.length,
          reasoning_points: context.reasoning.length,
          confidence: context.confidence,
          formality: context.formality_range?.range,
          preferred_colors: context.color_filters?.preferred?.slice(0, 5),
          recommended_fabrics: context.fabric_preferences?.recommended?.slice(0, 3),
          price_range: context.price_tier ?
            `$${context.price_tier.min_investment}-$${context.price_tier.max_investment}` : null,
          max_recommendations: context.max_recommendations,
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Context builder failed'
    });
  }
});
```

Import at the top if not already imported:
```typescript
import { recommendationContextBuilder } from './services/recommendation-context-builder';
```

**Validation:** Hit `POST /api/intelligence/test` with various payloads:
- `{ "occasion": "wedding", "season": "summer", "venue_type": "outdoor" }` — should return wedding forecast colors + seasonal fabrics
- `{ "occasion": "prom", "suit_color": "red", "use_case": "bold" }` — should return prom aura detection
- `{ "occasion": "business", "occupation": "lawyer", "age": 35 }` — should return career intelligence + formality guidance

---

## Section 4.4 (P2): Add Shop Links to V2 Recommendations

**File:** `src/routes/v2-compatibility.ts`

**Task:** The `/api/v2/recommendations` endpoint (line ~74) also bypasses the intelligence engine. Wire it the same way as 4.1.

1. Import context builder (already done in 4.1)
2. Build context from request body
3. Add `intelligence` and `shop_links` to response
4. Use context to inform the `formality_level` parameter instead of hardcoding `style === 'formal' ? 5 : 3`

```typescript
// Replace hardcoded formality:
const formalityLevel = intelligenceContext?.formality_range?.target ||
  (style === 'formal' ? 5 : 3);

const recommendations = await knowledgeBankService.getComprehensiveRecommendations({
  suit_color: color || 'navy',
  occasion: occasion || 'business',
  customer_profile: customerId,
  formality_level: formalityLevel,
  season: intelligenceContext?.fabric_preferences ? preferences?.season : undefined
});
```

---

## Execution Order

```
4.0 (P0): Wire into /api/recommendations          → The main recommendation endpoint
4.1 (P0): Wire into /api/v2/complete-the-look      → What Lovable calls
4.2 (P1): Intelligence status endpoint              → Diagnostics
4.3 (P1): Intelligence test endpoint                → Direct testing
4.4 (P2): Wire into /api/v2/recommendations         → V2 recommendations
```

**After each section:** `npm run build` to verify TypeScript compiles. Commit each section separately. Deploy after all sections.

---

## Important Notes

- Do NOT modify the context builder itself — it's already complete from Sprint 3
- Do NOT modify any data files — they're all finalized
- The context builder returns gracefully with partial data if signals are missing, so it's safe to always call it
- The `try/catch` around `buildContext()` is critical — if it fails, fall back to the existing behavior so we never break the API
- Add `recommendationContextBuilder` import to server.ts for sections 4.2 and 4.3
- The intelligence endpoints (4.2, 4.3) should NOT require API key auth — they're diagnostic/demo endpoints
