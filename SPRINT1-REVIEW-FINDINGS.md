# Sprint 1 Review Findings
**Reviewer:** Cowork (parallel prep)
**Date:** Feb 16, 2026
**Scope:** Claude Code's Section 1.0 (Context Builder) + Section 1.1 (Venue Intelligence)

---

## 1. Memory Warning — FALSE ALARM (no action needed)

The deploy log shows `⚠️ Warning: Memory usage 95-96%` at 3 min after boot.

**Root cause:** `metrics-collector.ts` line 499 calculates `heapUsed / heapTotal`. This is V8's internal heap ratio, NOT system memory. V8 allocates heap lazily, so `heapUsed/heapTotal` is typically 90-96% for healthy Node apps — it just means V8 hasn't over-provisioned its heap.

**Recommendation:** Raise `memoryUsageWarning` threshold from `0.95` to `0.98` in metrics-collector.ts line 113, or switch to tracking RSS against Railway's container memory limit for a meaningful metric. The current warning is just noise.

---

## 2. Seasonal Data Mismatches — ACTION NEEDED (Section 1.2)

The context builder (`recommendation-context-builder.ts`) has hardcoded seasonal maps at lines 579-619 that DON'T match the canonical JSON files. Claude Code should wire these to the JSON files during Section 1.2 instead of maintaining duplicate data.

### Colors — `getSeasonalColors()` vs `color-seasonality.json`

| Season | Missing from Context Builder (exists in JSON) |
|--------|-----------------------------------------------|
| Spring | `cream`, `powder_blue` |
| Summer | `khaki` |
| Fall | `chocolate_brown` (uses `brown`), `navy`, `terracotta` |
| Winter | `midnight_blue`, `emerald_green` |

**All accent colors ignored:** Context builder only uses 4 primary colors per season. JSON has 5-6 primaries + 5 accent colors per season. This means the engine can't recommend seasonal accents like `coral` (spring), `turquoise` (summer), `rust`/`gold` (fall), or `silver`/`royal_blue` (winter).

### Fabrics — `getSeasonalFabrics()` vs `fabric-seasonality.json`

| Issue | Detail |
|-------|--------|
| Winter velvet gap | JSON shows velvet at 88% winter popularity, but context builder doesn't recommend it |
| Summer avoid list incomplete | Missing `cashmere` and `tweed` from avoid list |
| Fall naming mismatch | Context uses `worsted_wool`, JSON uses `mid_weight_wool` (280-340g) |
| Fall missing fabric | `wool_cashmere_blend` (85 popularity) not in context builder |
| Trans-seasonal ignored | JSON has `trans_seasonal_fabrics` data entirely unused |

**Fix:** Section 1.2 should make `getSeasonalColors()` and `getSeasonalFabrics()` read from the JSON files via the data loader instead of hardcoding. This ensures our prep work (adding chocolate_brown, terracotta, emerald_green to the JSON) actually propagates to recommendations.

---

## 3. Data Loader File Paths — ALL CLEAR

All 24 file paths referenced in `enhanced-data-loader.ts` verified. Every JSON and CSV file exists at the expected location. No runtime fallback-to-defaults risk from missing files.

The loader's 10-minute TTL cache with LRU eviction is well-designed. Silent failure mode (console.warn, no throw) means services degrade gracefully.

---

## 4. Architecture Notes

### Context Builder Not Yet Wired to API
`recommendationContextBuilder` is only imported by its own file. Nothing in `server.ts` or API controllers calls it yet. Expected — will be wired when Claude Code integrates the full recommendation pipeline.

### Cultural Service is Scaffolding Only
`findCulturalNuancesByRegion()` returns `null` — never reads `cultural_regional_nuances.json`. Marked for Section 1.5, but the context builder already calls it (line 239), so cultural color filtering will always hit defaults until then.

### Career Heuristics Working Correctly
`getCareerFormality()` and `getCareerPricingTier()` are clean temporary heuristics. Maps occupation strings to formality 5-9 and pricing tiers. Will be replaced in Section 1.4 with full CSV-backed career intelligence.

---

## 5. Action Items for Claude Code

| Priority | Item | When |
|----------|------|------|
| **P1** | Wire `getSeasonalColors()` to `color-seasonality.json` instead of hardcoding | Section 1.2 (now) |
| **P1** | Wire `getSeasonalFabrics()` to `fabric-seasonality.json` instead of hardcoding | Section 1.2 (now) |
| **P2** | Add accent color support to seasonal color logic | Section 1.2 |
| **P2** | Add `velvet` to winter fabric recommendations | Section 1.2 |
| **P3** | Raise memory warning threshold to 0.98 or switch to RSS-based metric | Any time |
| **P3** | Fix 3 pre-existing build errors (server.ts:892, ai-scoring-system.ts:1030, product-catalog-service.ts:87) | Before Sprint 2 |
