# Sprint 3: Wire Pre-Built Intelligence Data

**Goal:** Wire the 4 pre-built JSON data files into services and plug them into the recommendation chain. Fix the 2 known edge cases.

**Pre-condition:** All 4 JSON files already exist in `src/data/intelligence/`. Do NOT recreate them — just load and wire them.

---

## Section 3.0 (P0): Prom Aura System

**File:** `src/data/intelligence/prom-aura-system.json` (already exists)

**Task:** Create `src/services/prom-aura-service.ts` that:
1. Loads `prom-aura-system.json` at construction time (sync, like ProductTagService)
2. Exports singleton `promAuraService`
3. Methods:
   - `detectAura(signals: { style_preference?: string; color_preference?: string; personality?: string }): AuraResult` — Returns the best-matching aura based on input signals. If no signals, return null.
   - `getAuraDetails(auraName: string): AuraDetails | null` — Returns full aura object (product_tags, recommended_colors, route, styling_notes)
   - `getAuraProductTags(auraName: string): string[]` — Returns just the product tags for filtering
   - `getAllAuras(): string[]` — Returns list of aura names
4. Wire into `recommendation-context-builder.ts`:
   - In `buildContext()`, after Step 6 (product tags), add Step 6.5: **Prom Aura Enhancement**
   - Only triggers when `request.occasion === 'prom'`
   - If aura detected, boost matching product tags and add aura colors to `color_filters.preferred`
   - Add reasoning: `"Prom aura: {auraName} — {styling_notes}"`
   - Add to `signals_used: 'prom_aura_system'`

**The JSON structure looks like this:**
```json
{
  "auras": {
    "main_character": {
      "display_name": "Main Character Energy",
      "product_tags": { "tuxedos": [...], "suits": [...], "accessories": [...] },
      "recommended_colors": [...],
      "route": "/collections/prom-main-character",
      "styling_notes": "..."
    }
  },
  "matching_logic": { ... }
}
```

**Validation:** `node -e "var s = require('./dist/services/prom-aura-service'); console.log(s.promAuraService.getAllAuras())"` should return 5 auras.

---

## Section 3.1 (P0): Wedding 2026 Color Forecast

**File:** `src/data/intelligence/wedding-2026-color-forecast.json` (already exists)

**Task:** Create `src/services/wedding-forecast-service.ts` that:
1. Loads `wedding-2026-color-forecast.json` at construction time
2. Exports singleton `weddingForecastService`
3. Methods:
   - `getTopWeddingColors(limit?: number): WeddingColor[]` — Returns top N wedding colors sorted by market_share_pct
   - `getColorForecast(colorName: string): WeddingColorDetail | null` — Full detail for one color
   - `getStylingFormula(colorName: string): StylingFormula | null` — Returns suit/shirt/tie/shoes/accessories formula
   - `getBridgertonEffect(): { yoy_growth: number; wedding_share: string; key_colors: string[] }` — Returns Bridgerton trend data
   - `getSeasonalWeddingColors(season: string): WeddingColor[]` — Filter colors by season
4. Wire into `recommendation-context-builder.ts`:
   - In `buildColorFilters()`, when `request.occasion === 'wedding'`:
   - Get top 5 wedding colors, map their `kct_suit_colors` to `preferred` array
   - Add reasoning: `"2026 wedding trend: {colorName} ({market_share}% of weddings)"`
   - Add to `signals_used: 'wedding_2026_forecast'`

**The JSON structure looks like this:**
```json
{
  "forecast_year": 2026,
  "top_colors": [
    { "rank": 1, "color": "Dusty Blue", "market_share_pct": 18, "kct_suit_colors": [...], "kct_tie_matches": [...] }
  ],
  "styling_formulas": { ... },
  "key_themes": { "bridgerton_effect": { ... } }
}
```

**Validation:** `node -e "var s = require('./dist/services/wedding-forecast-service'); console.log(s.weddingForecastService.getTopWeddingColors(3).map(c => c.color))"` should return top 3 colors.

---

## Section 3.2 (P1): Site Links Enrichment

**File:** `src/data/intelligence/kct-site-links.json` (already exists)

**Task:** Create `src/services/site-links-service.ts` that:
1. Loads `kct-site-links.json` at construction time
2. Exports singleton `siteLinksService`
3. Methods:
   - `getCollectionUrl(category: string): string | null` — Maps category to collection URL
   - `getOccasionUrl(occasion: string): string | null` — Maps occasion to page URL
   - `getWeddingUrl(role: string): string | null` — Maps wedding role to URL (groom, groomsmen, etc.)
   - `getPromUrl(): string` — Returns prom collection URL
   - `getResourceUrl(topic: string): string | null` — Maps topic to blog/guide URL
   - `enrichResponseWithLinks(context: { occasion?: string; category?: string; season?: string }): { shop_url?: string; guide_url?: string; occasion_url?: string }` — Returns relevant links for API response enrichment
4. Wire into `product-catalog-service.ts`:
   - Add method `enrichRecommendationWithLinks(occasion?: string, category?: string): object` that calls siteLinksService
   - This enables API responses to include "shop this look" links

**The JSON structure looks like this:**
```json
{
  "collections": { "suits": "https://kctmenswear.com/collections/suits", ... },
  "occasions": { "wedding": "https://kctmenswear.com/pages/weddings", ... },
  "seasonal_priority": { ... }
}
```

**Validation:** `node -e "var s = require('./dist/services/site-links-service'); console.log(s.siteLinksService.getOccasionUrl('wedding'))"` should return the wedding URL.

---

## Section 3.3 (P1): Monthly Calendar Intelligence

**File:** `src/data/intelligence/kct-monthly-calendar.json` (already exists)

**Task:** Enhance `src/services/seasonal-rules-engine.ts` to also load the monthly calendar:
1. In `initialize()`, add loading of `kct-monthly-calendar.json` (alongside existing `kct-event-calendar.json`)
2. Store as `this.monthlyCalendar`
3. Add new methods:
   - `getMonthlyIntelligence(month?: number): MonthlyIntel` — Returns full month data (season, temp_range, venue_pct, wedding_share, events, colors, fabrics, buyer_mindset)
   - `getBuyerMindset(month?: number): string` — Returns buyer psychology for the month
   - `getMonthlyColorPalette(month?: number): string[]` — Returns recommended colors for the month
   - `getMonthlyFabrics(month?: number): string[]` — Returns recommended fabrics for the month
   - `getVenueDistribution(month?: number): object` — Returns venue percentage breakdown
4. Wire into `recommendation-context-builder.ts`:
   - In `buildColorFilters()`, get monthly color palette and merge with seasonal colors
   - In `buildFabricPreferences()`, get monthly fabrics and merge with seasonal fabrics
   - Add reasoning about buyer mindset when available
   - Add to `signals_used: 'monthly_calendar_intelligence'`

**The JSON structure looks like this:**
```json
{
  "months": {
    "january": { "season": "winter", "temp_range": "15-35°F", "venue_pct": {...}, "wedding_share": "3%", "events": [...], "colors": [...], "fabrics": [...], "buyer_mindset": "..." }
  }
}
```

**Validation:** `node -e "var e = require('./dist/services/seasonal-rules-engine'); e.seasonalRulesEngine.initialize().then(() => console.log(e.seasonalRulesEngine.getMonthlyIntelligence(2)))"` should return February data.

---

## Section 3.4 (P2): Fix Accessory Pricing Edge Case

**File:** `src/services/recommendation-context-builder.ts`

**Task:** In `calculatePriceTier()`, after computing `maxAccessoryCost`:
1. If the computed max accessory cost is below the minimum shoe price for that tier, relax the rule:
```typescript
// After line ~487 where maxAccessoryCost is computed:
const minShoePrice = kctTier.shoes_range?.[0] || 49;
if (maxAccessoryCost < minShoePrice) {
  reasoning.push(`Note: Entry-tier accessory budget ($${maxAccessoryCost}) is below minimum shoe price ($${minShoePrice}) — recommending entry-tier shoes regardless`);
  // Don't filter out shoes that exceed the 25% rule at entry tier
}
```
2. This is documentation/reasoning only — the engine should never refuse to recommend shoes just because the ratio math doesn't work at the bottom of the entry tier.

**Validation:** Build and verify no errors. The reasoning array should include the note when entry tier is selected with a $119 suit.

---

## Section 3.5 (P2): Fabric Photography Filtering

**File:** `src/services/fabric-performance-service.ts`

**Task:** In `getPhotographyPerformance()` method (or wherever photography flag is handled):
1. When `photography: true` is passed, actually sort/filter results by photo performance scores from `fabric_photography_performance.csv`
2. The CSV has columns for photography-relevant metrics — use them to boost fabrics that photograph well
3. Return top fabrics sorted by photo score, not just all fabrics

**Validation:** Call with `photography: true` and verify results are sorted by photo performance.

---

## Execution Order

```
3.0 (prom aura)     → New service + context builder integration
3.1 (wedding)        → New service + context builder integration
3.2 (site links)     → New service + product catalog integration
3.3 (monthly cal)    → Enhance seasonal engine + context builder
3.4 (accessory fix)  → Quick fix in context builder
3.5 (photo filter)   → Quick fix in fabric service
```

**After each section:** `npm run build` to verify TypeScript compiles. After all sections: `git add . && git commit` per section, then deploy.

---

## Important Notes

- All 4 JSON files already exist. Do NOT modify them. Just load and use them.
- Follow the existing singleton + constructor pattern used by ProductTagService
- Use `fs.readFileSync` for small JSON files (all are under 12KB)
- Add proper logging: emoji + service name on successful load
- Add graceful fallbacks if JSON not found (warn, don't crash)
- The recommendation-context-builder imports should follow existing pattern
