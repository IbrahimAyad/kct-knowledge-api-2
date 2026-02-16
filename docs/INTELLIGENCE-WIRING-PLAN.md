# KCT Intelligence Wiring Plan v2

## Key Insight: Two Different Jobs

The 21 research categories serve two fundamentally different purposes:

**Job 1 — Customer-facing API:** Help customers pick outfits. This is what Lovable calls.
**Job 2 — Business intelligence for Abe:** Inform marketing, pricing, inventory, email campaigns.

Cramming both into the same API is why the intelligence layer became stubs. Nobody built consumers for endpoints that return "emotional trigger word data" as JSON — because the consumer isn't a frontend app, it's marketing strategy.

This plan splits them cleanly.

---

## Research Categories: Where They Belong

### API (directly improves customer recommendations) — 7 categories

| # | Category | Why It Belongs in the API | Data Files |
|---|----------|--------------------------|------------|
| 1 | **Venue Microdata** | "Outdoor garden wedding" needs different colors than "church" | `venue_microdata_analysis.json` |
| 2 | **Seasonal Micro-Patterns** | Spring recs should differ from winter; graduation/wedding/holiday demand curves | `graduation_season_timing.csv`, `monthly_seasonal_patterns.csv`, `holiday_vs_wedding_trends.csv` |
| 3 | **Fabric Performance** | "This suit is wrinkle-resistant for travel" — real product specs | `fabric_performance_real_world.csv`, `suit_construction_lifespan.csv` |
| 4 | **Career Stage** | 25yo first suit ≠ 45yo executive — different quality/formality/investment | `career_stage_wardrobe.csv`, `age_career_progression.csv` |
| 5 | **Cultural Nuances** | Detroit market specifics, religious dress codes, color taboos | `cultural_regional_nuances.json` |
| 6 | **Body Language & Fit** | Industry-specific fit preferences (lawyer vs creative vs banker) | `body_language_fit_preferences.json` |
| 7 | **Color Science** | Video call undertones, lighting perception — helps pick colors that photograph well | `lighting_color_perception.csv`, `video_call_undertones.csv` |

### Business Intelligence (for Abe's strategy, NOT the API) — 14 categories

| # | Category | What It's For | Data Files |
|---|----------|---------------|------------|
| 8 | **Decision Fatigue** | Optimize how many products to show on Lovable pages | `menswear_decision_fatigue_summary.csv` |
| 9 | **Emotional Triggers** | Shopify product descriptions, email subject lines | `emotional_triggers_menswear.csv`, `buying_journey_emotions.csv` |
| 10 | **Loyalty Triggers** | Email sequences: prom buyer → lifetime customer path | `prom_to_lifetime_conversion.csv`, `referral_recommendation_triggers.csv` |
| 11 | **Price Sensitivity** | Bundle pricing strategy, discount tiers | `menswear_price_sensitivity_analysis.csv`, `bundle_strategy_effectiveness.csv` |
| 12 | **Social Proof** | Which review/testimonial type works best by generation | `social_proof_dynamics.csv`, `wedding_party_group_dynamics.csv` |
| 13 | **Wedding Planning Indicators** | Automated email flows: detect engaged couples early | `wedding_planning_indicators.csv`, `proposal_purchase_indicators.csv` |
| 14 | **Return Psychology** | Fix product descriptions to prevent returns (55% are size issues) | `customer_fit_language.csv` |
| 15 | **Visual Recognition** | Instagram/photo guidance for marketing content | `instagram_filter_color_impact.csv`, `phone_camera_color_distortion.csv` |
| 16 | **Advanced Personalization** | Lifestyle→fabric preference mapping for email segmentation | `lifestyle_menswear_impact.csv`, `hobby_style_influence.csv` |
| 17 | **AI Training Gaps** | Improve chatbot/AI customer service responses | `conversation_dead_ends.csv`, `slang_colloquialisms_gaps.csv` |
| 18 | **Competitor Blind Spots** | Positioning strategy, sizing advantages | `sizing_chart_failures.csv`, `customer_questions_blind_spots.csv` |
| 19 | **Promotion Signals** | Predict when customers are about to level up spending | `promotion_signals.csv`, `wardrobe_upgrade_timing.csv` |
| 20 | **Micro-Trend Detection** | Inventory planning, seasonal buying | `micro_trend_detection_data.json` |
| 21 | **Untapped Markets** | Growth strategy — 44% of Americans never wear suits | `untapped_menswear_markets.json` |

---

## Phase 1: Wire Up the 7 API Categories (for Claude Code)

Fix the intelligence services to query REAL data for customer-facing recommendations.
Then build the two layers that make it all work together.

### 1.0 THE CORE: Build the Recommendation Context Builder (DO THIS FIRST)

**This is the most important piece.** Without it, the 7 data categories are just 7 isolated lookups.

**New file:** `src/services/recommendation-context-builder.ts`

**What it does:** Takes ALL available signals about a customer request and fuses them into
a single `RecommendationContext` object BEFORE any color matching or product lookup happens.

```typescript
interface RecommendationContext {
  // Fused from all intelligence sources
  formality_range: [number, number];      // from venue + occasion + career
  color_filters: {
    preferred: string[];                   // from season + culture + venue lighting
    avoid: string[];                       // from cultural taboos + venue clashes
    photograph_well: string[];             // from color science + venue lighting
  };
  fabric_preferences: {
    recommended: string[];                 // from venue (outdoor→breathable) + season
    avoid: string[];                       // from weather + venue context
  };
  price_tier: {
    range: string;                         // from career stage data
    quality_level: string;                 // from career stage + occasion importance
  };
  fit_guidance: {
    style: string;                         // from occupation + age + body language data
    details: string[];                     // "Structured shoulders", "Peak lapels", etc.
  };
  max_recommendations: number;             // from decision fatigue data (4-5 optimal)
  reasoning: string[];                     // Human-readable explanations for every decision
}
```

**How it works:**
```
Input: { suit_color: "navy", occasion: "wedding", venue_type: "church",
         age: 28, occupation: "lawyer", season: "summer", cultural_region: "detroit" }

Step 1: Career lookup → age 28 + lawyer = "establishing" stage → mid-high quality tier
Step 2: Venue lookup → church = tungsten lighting, conservative formality 6-9
Step 3: Cultural lookup → Detroit + church = traditional, avoid flashy colors
Step 4: Seasonal lookup → June = peak wedding season, breathable fabrics
Step 5: Color science → tungsten lighting enhances warm tones, dulls blues slightly
Step 6: Fit preferences → lawyers prefer structured shoulders, peak lapels
Step 7: Decision fatigue → cap at 5 recommendations (85% effectiveness)
Step 8: Build reasoning array explaining each decision

Output: One unified RecommendationContext that drives everything downstream
```

**Where it plugs in:** The `/api/recommendations` endpoint calls `buildContext(request)` first,
then passes the context to color matching, product lookup, and response formatting.
Every downstream service reads from this ONE context instead of doing its own independent lookup.

**The reasoning array becomes the "why" in every recommendation:**
```json
{
  "suit_color": "navy",
  "reasoning": [
    "Navy is ideal for church weddings — conservative and respectful",
    "Under tungsten lighting, navy maintains its depth and photographs well",
    "At your career stage, worsted wool (10-year lifespan) is the right investment",
    "For a June wedding, we recommend a lighter weight wool for breathability"
  ],
  "fabric_recommendation": "Lightweight worsted wool",
  "fit_guidance": "Structured shoulders with peak lapels — standard for legal professionals"
}
```

This is what separates a lookup table from a recommendation engine.
Farfetch and Stitch Fix both do this — they fuse signals first, THEN recommend.

---

### 1.0b Decision Fatigue Logic (Built Into the API, Not a Dashboard Stat)

**Data source:** `menswear_decision_fatigue_summary.csv`

Key thresholds from your research:
- Optimal personalized recommendations: **4-5 items** (85% effectiveness)
- Choice overload threshold: **24+ options** (severe paralysis)
- Optimal browsing window: **5-15 minutes** (70-80% purchase likelihood)
- Critical fatigue point: **25-30 minutes** (52% abandonment)

**What to do:** Build this INTO the recommendation logic:

```typescript
// In recommendation-context-builder.ts
private calculateMaxRecommendations(sessionContext: any): number {
  // From your research data:
  const OPTIMAL_PERSONALIZED = 5;    // 85% effectiveness
  const OPTIMAL_GENERIC = 10;        // 45% peak conversion at 9-12
  const FATIGUE_REDUCED = 3;         // For sessions > 25 min

  if (sessionContext.session_duration > 25) {
    return FATIGUE_REDUCED;  // Customer is fatigued — show fewer, better options
  }
  if (sessionContext.customer_id) {
    return OPTIMAL_PERSONALIZED;  // Known customer — 4-5 items is the sweet spot
  }
  return OPTIMAL_GENERIC;  // Anonymous — show up to 10
}
```

The `/api/recommendations` endpoint uses this to cap results.
This is Stitch Fix's core insight: **fewer, better recommendations beat more options every time.**

---

### 1.1 Fix venue-intelligence-service.ts

**Current state:** Hardcoded 4-venue map (beach/garden/church/ballroom) in api.ts.
**Data available:** `venue_microdata_analysis.json` has indoor (ballroom, church, historic) + outdoor (garden, beach, vineyard) with lighting characteristics, color considerations, and club dress codes.

**What to do:**
- Replace the hardcoded `venueMap` in `controllers/api.ts` lines 520-549
- Build venue index from loaded JSON keyed by venue type (normalize: "outdoor_garden" matches "garden")
- Return lighting-specific color recommendations from actual data
- Add club dress code data when venue matches elite/prestigious types
- Fallback to generic "formal" if venue type not found

### 1.2 Fix seasonal logic with real micro-patterns

**Current state:** Seasonal data exists in `color-seasonality.json` but the trending endpoint uses `stableScore()` — a deterministic hash pretending to be trends.
**Data available:** `graduation_season_timing.csv` (May = 45% volume, $1500 avg spend), `monthly_seasonal_patterns.csv` (12-month urgency scores), `holiday_vs_wedding_trends.csv`.

**What to do:**
- Add loaders to `enhanced-data-loader.ts` for the 3 seasonal CSVs
- In `trending-analysis-service.ts`, replace `stableScore()` with actual seasonal weight from CSV data
- Match current month → seasonal pattern → weight trending colors accordingly
- In `/api/recommendations`, add seasonal_context from real monthly data

### 1.3 Wire fabric performance into recommendations

**Current state:** `loadFabricPerformanceData()` exists and is called from `intelligence-api.ts` but data isn't used in main recommendations.
**Data available:** 15 fabric types with durability (1-10), wrinkle resistance, breathability, shape retention, moisture management, professional lifespan, cost range.

**What to do:**
- When recommending products, cross-reference fabric type from product catalog
- Add fabric_insights to recommendation response: "Worsted wool: 9/10 durability, 10-year lifespan"
- For venue-specific recs, suggest fabrics by context: travel → wrinkle-resistant, outdoor summer → breathable

### 1.4 Fix career-intelligence-service.ts

**Current state:** Always returns hardcoded `advancement_probability: 72` and same career stage structure.
**Data available:** `career_stage_wardrobe.csv` — 6 levels (Entry to C-Suite) with investment amounts, quality levels, formality scores.

**What to do:**
- Build career stage index from CSV on service init
- Match input `role_level` + `age` to appropriate career stage
- Return real investment ranges and quality expectations from data
- Use this in `/api/recommendations` to adjust price tier of recommended products

### 1.5 Fix cultural-adaptation-service.ts

**Current state:** Returns boilerplate "respect local customs" for any region.
**Data available:** `cultural_regional_nuances.json` — religious dress codes (Catholic, Orthodox, Hindu, Jewish, Muslim), Detroit regional styles, cultural color taboos.

**What to do:**
- Build region/culture index from JSON
- Normalize input: "Detroit", "detroit", "MI" → detroit_regional_styles
- For religious contexts: return actual dress code requirements (e.g., "Catholic church: conservative, avoid bright colors")
- Apply color taboos: filter out inappropriate colors from recommendations

### 1.6 Wire body language & fit preferences

**Current state:** Loaded by psychology + career services but data is ignored.
**Data available:** Professional preferences by industry (Lawyers, Investment Bankers, Consultants, Creative), personality type (MBTI), age group, generational trends.

**What to do:**
- In `/api/recommendations`, when `occupation` is provided, look up professional preferences
- Return industry-specific fit guidance: "Lawyers prefer structured shoulders, peak lapels"
- When `age` is provided, apply generational fit preferences

### 1.7 Add color science to recommendations

**Current state:** Not loaded at all.
**Data available:** `lighting_color_perception.csv` (how colors look under different lighting), `video_call_undertones.csv` (how colors appear on webcam).

**What to do:**
- Add loaders for color science CSVs
- When venue has specific lighting (fluorescent office, outdoor natural, etc.), adjust color confidence scores based on how those colors actually look under that light
- Optional: add `use_case=video_call` param to recommend colors that look good on camera

### Testing Phase 1

```bash
# THE KEY TEST: Full context fusion — same suit, totally different recommendations
curl -X POST /api/recommendations -d '{
  "suit_color":"navy",
  "occasion":"wedding",
  "venue_type":"church",
  "age":28,
  "occupation":"lawyer",
  "season":"summer",
  "cultural_region":"detroit"
}'
# Expect:
#   - reasoning array explaining WHY navy, WHY this fabric, WHY this fit
#   - max 5 recommendations (decision fatigue cap for personalized request)
#   - fabric: lightweight worsted wool (summer + church)
#   - fit: structured shoulders (lawyer preference)
#   - colors that photograph well under tungsten lighting
#   - no cultural taboo violations

# Compare: same suit, different person — recs should be DIFFERENT
curl -X POST /api/recommendations -d '{
  "suit_color":"navy",
  "occasion":"prom",
  "venue_type":"ballroom",
  "age":17,
  "season":"spring"
}'
# Expect:
#   - different price tier (entry level, not mid-career)
#   - different fit guidance (Gen Z preferences, not lawyer fit)
#   - different fabric (spring ballroom, not summer church)
#   - up to 10 recommendations (no customer_id = generic, higher cap)

# Venue — should return real lighting data, not just 4 hardcoded venues
curl /api/venues/vineyard/recommendations
# Expect: lighting analysis, fabric suggestions based on outdoor context

# Decision fatigue — long session should get fewer results
curl -X POST /api/recommendations -d '{
  "suit_color":"navy",
  "customer_id":"returning_customer",
  "session_duration":35,
  "choices_viewed":20
}'
# Expect: only 3 recommendations (fatigued customer), with reasoning noting
#   "Simplified selection — you've been browsing for a while"
```

---

## Phase 2: Business Intelligence Dashboard (Separate from API)

The other 14 categories don't belong as API endpoints. They belong in a tool Abe uses.

### Option A: Static HTML Dashboard (Simplest)

Build an interactive HTML page that visualizes the research data:
- Emotional triggers ranked by purchase likelihood increase
- Wedding timeline showing when grooms start shopping
- Price sensitivity chart by segment
- Seasonal demand curves (graduation, holiday, wedding peaks)
- Social proof effectiveness by generation

**Pros:** No infrastructure. One HTML file. Open in browser.
**Cons:** Static. No live updates.

### Option B: Perplexity-Powered Research Tool

A simple endpoint (or even a CLI script) where Abe can ask questions like:
- "What's trending in wedding suits for spring 2026?"
- "What emotional triggers work best for email subject lines right now?"
- "How are competitors pricing 3-piece suit bundles?"

Combines static research data with live Perplexity queries.

**Pros:** Fresh data. Actionable. Uses the Perplexity API Abe already has.
**Cons:** Requires API key management. Costs per query.

### Option C: Both — Dashboard + Perplexity Refresh Button

Static dashboard showing all research data with a "Refresh with current data" button per section that queries Perplexity to update the insights.

**Recommended approach.** Gets the most value from both the static research AND the Perplexity API.

---

## Phase 3: Perplexity Integration

### For the API (lightweight)

Add a single `perplexity-client.ts` utility and a `perplexity-enricher-service.ts`:
- `?enrich=true` query param on `/api/recommendations` and `/api/trending`
- Cached 48 hours. Non-blocking. Falls back to base data if Perplexity is down.
- Adds a `trend_insights` field to responses with current market context
- NOT a dependency — the API works fine without it

### For the Dashboard (the real Perplexity value)

This is where Perplexity shines. On-demand queries for Abe:
- "What are groomsmen trends for spring 2026?" → fresh competitive intel
- "What price points are working for menswear bundles right now?" → pricing strategy
- Run against the static research to show what's changed since summer

### New files

```
src/utils/perplexity-client.ts          — HTTP client wrapper
src/services/perplexity-enricher.ts     — Cache + fallback logic
src/config/perplexity-prompts.ts        — Menswear-specific prompt templates
```

### Environment config

```env
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx
PERPLEXITY_ENABLED=true
PERPLEXITY_MODEL=sonar-pro
PERPLEXITY_CACHE_TTL_HOURS=48
```

**Critical:** API key in environment only, never in source code. (Also: move the existing hardcoded API key from auth.ts to an env var while you're at it.)

---

## Pre-Sprint Prep (Cowork — Done Before Claude Code Starts)

### Prep A: Color Science Data Cleanup ✅
Duplicate `_1` files identified. `colorblind_perception_analysis_1.csv` and `video_call_undertones_1.csv` are exact dupes (ignore). `lighting_color_perception_1.csv` has an extra `Overall_Accuracy` column — use this version. See `DATA-CLEANUP-NOTES.md` in the color science folder.

### Prep B: Seasonal Regional Data Gap
Current seasonal CSVs treat all regions identically. January in Detroit ≠ January in Miami.
**Action:** Use Perplexity to generate regional seasonal patterns for top KCT shipping metros.
This can happen in parallel with Sprint 1 — the seasonal service (1.2) should be built to accept regional data when available, with a national-average fallback.

### Prep C: Fabric Tags on Shopify Products ✅
All 138 products now have `fabric_type` field. 14 fabric types mapped: polyester_blend, velvet, satin_poly, stretch_poly_blend, sequin_poly, patterned_poly_blend, jacquard_poly, wool_tweed, linen_blend, wool_blend, leather, satin, cotton_blend, polyester.

### Prep D: Product Catalog Cleanup ✅
Full audit completed. Fixed 21 misplaced products (14 non-burgundy items removed from burgundy bucket), deduplicated navy↔midnight_blue, added `type` field to 80 untyped products (ties, accessories, shirts). Added `royal_blue` color category. Catalog reduced from 157 → 138 accurate products. See `product-catalog-audit-report.md`.

### Prep E: Occasion-Specific Product Mappings ✅
All 4 occasions populated with recommended colors, seasonal overrides, formality ranges, budget tiers, and key product handles: wedding (7 colors, 6 products), prom (5 colors, 7 products), black_tie (4 colors, 5 products), business (4 colors, 6 products). Also added 10 recommended_combinations and 2 wedding_party_packages.

### Prep F: Core Data Consistency Fixes ✅
- Added `royal_blue` to `color-relationships.json` (was missing from all core files)
- Added `chocolate_brown` and `terracotta` to fall primary colors in `color-seasonality.json`
- Added `emerald_green` to winter primary colors in `color-seasonality.json`
- Created validation test script: `tests/validate-intelligence-wiring.ts`

---

## Implementation Order

### Sprint 1 (Claude Code): Phase 1 — Build the intelligence engine

**Order matters. Do it in this sequence:**

1. **Build recommendation-context-builder.ts** — the fusion layer (Section 1.0)
2. **Add decision fatigue logic** — smart result capping (Section 1.0b)
3. **Fix venue service** — real venue/lighting data (Section 1.1)
4. **Add seasonal loaders** — real monthly demand patterns (Section 1.2)
5. **Wire fabric data** — specs into recommendations (Section 1.3)
6. **Fix career service** — real investment tiers (Section 1.4)
7. **Fix cultural service** — real dress codes + color taboos (Section 1.5)
8. **Wire fit preferences** — occupation/age-based guidance (Section 1.6)
9. **Add color science** — lighting-aware color scores (Section 1.7)
10. **Plug context builder into /api/recommendations** — replace the current scattered logic

**Result:** One recommendation endpoint that fuses all signals, caps results intelligently,
and explains WHY each recommendation was made. This is the Farfetch/Stitch Fix approach.

### Sprint 2 (Cowork or Claude Code): Phase 2 — Business dashboard
- Build HTML dashboard visualizing the 14 business intelligence categories
- No API changes needed — reads CSVs/JSONs directly
- **Result:** Abe has a strategy tool with all his research visible

### Sprint 3 (Claude Code): Phase 3 — Perplexity integration
- Add perplexity-client.ts + enricher service
- Wire `?enrich=true` into API endpoints
- Add "refresh" capability to business dashboard
- **Result:** Intelligence stays fresh, Perplexity API investment pays off

---

## Memory Budget (1024MB heap on Railway)

- 7 API categories loaded: ~8-10MB
- Service indexes and lookup maps: ~20-30MB
- Perplexity cache (50 items): ~1MB
- App runtime + Express: ~100-150MB
- **Available headroom: ~850MB** — more than enough

Note: The 14 business intelligence categories do NOT need to be loaded into the API's memory. They're consumed by the dashboard separately.

---

## Security Reminder

Before starting Phase 1, fix the hardcoded API key:
1. Move `kct-menswear-api-2024-secret` from `src/middleware/auth.ts` to Railway environment variable
2. Update auth.ts to read from `process.env.API_KEY`
3. Rotate the key since the old one is in git history
