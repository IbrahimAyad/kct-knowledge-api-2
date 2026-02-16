# Sprint 2: Wire Real KCT Product Data Into Intelligence Engine
**Prepared by:** Cowork (review & prep)
**Date:** Feb 16, 2026
**Prerequisites:** Sprint 1 complete (all 6 sections deployed, verified clean)
**Reference data:** `docs/KCT-DATA-MANIFEST.md` — real Supabase production data from Lovable

---

## Why Sprint 2 Matters

Sprint 1 built the intelligence engine with CSV research data. But the engine still doesn't know what products KCT actually sells. Right now:

- `color_to_products` map is **EMPTY** — the main product lookup returns nothing
- Only 16 color families in the alias system — KCT has **69 tie colors** and **26 suit colors**
- Price tiers are generic career-based ($200-$1200 guesses) — KCT's actual tiers are Entry ($119-$179), Mid ($179-$259), Premium ($259-$400), Luxury ($400+)
- Product tags (496 prom-tagged, 331 groomsmen, 288 wedding) are completely unwired
- 5 suit colors missing entirely: Pink (34 products), Purple (30), Orange (16), Teal (10), Champagne (9)

Sprint 2 fixes all of this by loading the real KCT catalog data from the data manifest.

---

## Section 2.0: Populate color_to_products Map

**Priority:** P0 — Nothing else works without this
**File:** `src/data/intelligence/product-catalog-mapping.json`

The `color_to_products` object is currently `{}`. Populate it with ALL 26 suit colors from the manifest (Part 3.2):

```json
"color_to_products": {
  "black": { "product_count": 190, "tier": "core", "categories": ["Suit", "Tuxedo", "Blazer", "Three-Piece Tuxedo", "Double-Breasted Suit"] },
  "blue": { "product_count": 116, "tier": "core", "categories": ["Suit", "Blazer"] },
  "red": { "product_count": 70, "tier": "core", "categories": ["Suit", "Blazer"] },
  "white": { "product_count": 69, "tier": "core", "categories": ["Suit", "Tuxedo"] },
  "gold": { "product_count": 66, "tier": "core", "categories": ["Suit", "Tuxedo"] },
  "green": { "product_count": 62, "tier": "core", "categories": ["Suit", "Blazer"] },
  "navy": { "product_count": 51, "tier": "strong", "categories": ["Suit", "Blazer", "Tuxedo"] },
  "royal_blue": { "product_count": 38, "tier": "strong", "categories": ["Suit", "Tuxedo"] },
  "burgundy": { "product_count": 34, "tier": "strong", "categories": ["Suit", "Tuxedo"] },
  "silver": { "product_count": 34, "tier": "strong", "categories": ["Suit", "Tuxedo"] },
  "pink": { "product_count": 34, "tier": "strong", "categories": ["Suit", "Blazer"] },
  "purple": { "product_count": 30, "tier": "strong", "categories": ["Suit", "Tuxedo"] },
  "tan": { "product_count": 20, "tier": "available", "categories": ["Suit", "Blazer"] },
  "ivory": { "product_count": 16, "tier": "available", "categories": ["Suit", "Tuxedo"] },
  "orange": { "product_count": 16, "tier": "available", "categories": ["Suit", "Blazer"] },
  "charcoal": { "product_count": 12, "tier": "available", "categories": ["Suit"] },
  "teal": { "product_count": 10, "tier": "available", "categories": ["Suit"] },
  "emerald": { "product_count": 9, "tier": "limited", "categories": ["Suit", "Tuxedo"] },
  "champagne": { "product_count": 9, "tier": "limited", "categories": ["Suit", "Tuxedo"] },
  "gray": { "product_count": 7, "tier": "limited", "categories": ["Suit"] },
  "wine": { "product_count": 4, "tier": "limited", "categories": ["Suit"] },
  "blush": { "product_count": 2, "tier": "rare", "categories": ["Suit"] },
  "cream": { "product_count": 2, "tier": "rare", "categories": ["Suit"] },
  "rust": { "product_count": 1, "tier": "rare", "categories": ["Suit"] },
  "sage": { "product_count": 1, "tier": "rare", "categories": ["Suit"] },
  "slate": { "product_count": 1, "tier": "rare", "categories": ["Suit"] },
  "brown": { "product_count": 1, "tier": "rare", "categories": ["Suit"] }
}
```

Then update `product-catalog-service.ts` to:
1. Load colors from `color_to_products` (not just `trending_2025_inventory`)
2. Add a `getAvailableColors()` method that returns all 26 colors with their tiers
3. Add inventory tier logic: Core/Strong = default recommendations, Available = secondary, Limited/Rare = only when context-matched (e.g., sage for garden wedding)

---

## Section 2.1: Expand Color Alias System to Cover 69 Tie Colors

**Priority:** P0
**File:** `src/services/product-catalog-service.ts` → `getColorAliases()`

Current alias map has 16 families. KCT stocks 69 tie/bowtie colors. Add these missing color families and their aliases:

```typescript
// NEW tie color families to add (53 colors not currently mapped):
'apple_red': ['apple', 'bright_red'],
'aqua': ['aqua_blue'],
'baby_blue': ['light_baby_blue'],  // distinct from light_blue
'banana_yellow': ['yellow', 'bright_yellow'],
'blush': ['blush_pink', 'light_blush'],
'burnt_orange': ['burnt'],  // distinct from terracotta
'canary': ['canary_yellow'],
'carolina_blue': ['carolina', 'tar_heel_blue'],
'champagne': ['champagne_gold'],
'chianti': ['chianti_red', 'dark_wine'],
'chocolate_brown': ['chocolate', 'dark_chocolate'],  // already aliased to brown — need separate entry
'cinnamon': ['cinnamon_brown', 'warm_brown'],
'cobalt': ['cobalt_blue'],  // distinct from royal_blue
'coral': ['coral_pink', 'salmon_pink'],
'dark_olive': ['olive_dark'],
'dark_red': ['deep_red'],
'dark_silver': ['gunmetal', 'dark_grey_silver'],
'deep_purple': ['deep_violet', 'eggplant'],
'denim_blue': ['denim', 'jean_blue'],
'dusty_pink': ['mauve_pink', 'muted_pink'],
'dusty_rose': ['dusty', 'antique_rose'],
'dusty_sage': ['muted_sage'],
'emerald_green': ['emerald'],  // already exists — add tie data
'forest_green': ['forest', 'deep_green'],  // already aliased to hunter_green
'french_blue': ['french', 'parisian_blue'],
'french_rose': ['french_pink'],
'fuchsia': ['hot_pink', 'magenta_pink'],
'gold': ['gold_tie', 'metallic_gold'],
'ivory': ['off_white_tie'],  // already aliased to white
'lavender': ['light_purple', 'lavender_purple'],
'lettuce_green': ['lettuce', 'bright_green'],
'light_lilac': ['pale_lilac'],
'light_pink': ['pastel_pink', 'soft_pink'],
'lilac': ['lilac_purple'],
'lime': ['lime_green', 'neon_green'],
'magenta': ['bright_magenta'],
'mauve': ['dusty_mauve'],
'medium_brown': ['mid_brown', 'camel'],
'medium_orange': ['mid_orange'],
'medium_purple': ['mid_purple'],
'mermaid_green': ['mermaid', 'sea_green', 'teal_green'],
'mint_green': ['mint', 'pastel_green'],
'nutmeg': ['spice_brown', 'warm_spice'],
'olive_green': ['olive', 'military_green'],
'orange': ['bright_orange'],
'pastel_green': ['soft_green'],
'pastel_purple': ['soft_purple', 'wisteria'],
'peach': ['peach_pink', 'apricot'],
'plum': ['plum_purple', 'dark_plum'],
'powder_blue': ['powdered_blue', 'ice_blue'],  // already exists — merge
'rose_gold': ['rose', 'pink_gold'],
'rust': ['rust_orange'],  // already aliased to terracotta — needs own entry for tie
'salmon': ['salmon_orange', 'coral_salmon'],
'sapphire_blue': ['sapphire', 'deep_blue'],
'taupe': ['grey_brown', 'warm_grey'],
'teal': ['teal_blue', 'dark_teal'],
'tiffany_blue': ['tiffany', 'robin_egg_blue'],
'true_red': ['classic_red', 'fire_red'],
'turquoise': ['turquoise_blue', 'aqua_green'],
'wine': ['wine_red', 'dark_burgundy']  // already exists — add tie data
```

Also create a new `tie-color-inventory.json` data file with all 69 colors and which ones have matching suspender+bowtie sets:

```json
{
  "tie_colors": {
    "black": { "has_suspender_set": true, "category": "neutral" },
    "dark_grey": { "has_suspender_set": true, "category": "neutral" },
    "gold": { "has_suspender_set": true, "category": "metallic" },
    "light_blue": { "has_suspender_set": true, "category": "pastel" },
    "pink": { "has_suspender_set": true, "category": "pastel" },
    "purple": { "has_suspender_set": true, "category": "bold" },
    "royal_blue": { "has_suspender_set": true, "category": "bold" },
    "silver": { "has_suspender_set": true, "category": "metallic" },
    "true_red": { "has_suspender_set": true, "category": "bold" },
    "white": { "has_suspender_set": true, "category": "neutral" },
    "wine": { "has_suspender_set": true, "category": "rich" }
  },
  "total_colors": 69,
  "suspender_set_colors": 11
}
```

Add an `upsellSuspenderSet(tieColor)` method to product-catalog-service that checks if a tie color has a matching suspender+bowtie set and returns the upsell suggestion.

---

## Section 2.2: Replace Generic Price Tiers with KCT Actual Tiers

**Priority:** P1
**Files:** `src/services/recommendation-context-builder.ts`, `src/services/product-catalog-service.ts`

The context builder currently uses career-based price ranges ($200-$1200). Replace with KCT's real price tier system from the manifest (Part 3.5):

```typescript
const KCT_PRICE_TIERS = {
  entry: {
    suit_range: [119, 179],
    shirt_range: [19, 34],
    tie_range: [24.99, 24.99],
    shoes_range: [49, 79],
    max_accessory_pct: 0.25  // accessories < 25% of suit cost
  },
  mid: {
    suit_range: [179, 259],
    shirt_range: [34, 49],
    tie_range: [24.99, 44.99],
    shoes_range: [79, 109],
    max_accessory_pct: 0.25
  },
  premium: {
    suit_range: [259, 400],
    shirt_range: [49, 69],
    tie_range: [39.99, 49.99],
    shoes_range: [109, 129],
    max_accessory_pct: 0.25
  },
  luxury: {
    suit_range: [400, 999],
    shirt_range: [69, 150],
    tie_range: [44.99, 99.99],
    shoes_range: [129, 250],
    max_accessory_pct: 0.25
  }
};
```

Create a `kct-price-tiers.json` data file so this is data-driven, not hardcoded. Update the context builder's `buildBudgetConstraints()` to use these tiers.

**Critical rule:** Never recommend a $129 shoe with a $119 suit. Keep accessory cost < 25% of suit cost.

---

## Section 2.3: Wire Product Tag Filtering

**Priority:** P1
**Files:** New `src/services/product-tag-service.ts`, update context builder

The manifest shows rich product tags (Part 3.6) that should drive occasion matching:

| Tag | Count | Signal Type |
|-----|-------|-------------|
| prom | 496 | Occasion |
| formal | 407 | Occasion |
| groomsmen | 331 | Occasion |
| slim-fit | 330 | Fit |
| wedding | 288 | Occasion |
| groom | 252 | Occasion |
| quinceanera | 244 | Occasion |
| summer-wedding | 236 | Season+Occasion |
| satin | 220 | Fabric |
| outdoor-wedding | 196 | Venue+Occasion |
| velvet | 59 | Fabric |
| business-casual | 59 | Occasion |

Create `product-tag-mapping.json` with these tags and their signal types. Create a `ProductTagService` that:

1. `getTagsForOccasion(occasion)` — "wedding" returns products tagged: wedding, groom, groomsmen, summer-wedding, spring-wedding, etc.
2. `getTagsForVenue(venue)` — "outdoor" returns: outdoor-wedding, garden-wedding, beach-wedding
3. `getTagsForSeason(season)` — "winter" returns: winter-wedding, velvet
4. `getTagsForStyle(style)` — "bold" returns: shiny, sequin, satin

Wire into context builder so occasion/venue/season queries surface tag-matched products first.

---

## Section 2.4: Add KCT Event Calendar to Seasonal Engine

**Priority:** P2
**File:** `src/services/seasonal-rules-engine.ts`

The manifest (Part 3.7) defines KCT's actual event calendar:

| Period | Primary Event | Secondary Events | KB Focus |
|--------|--------------|-------------------|----------|
| Jan-Feb | Prom prep begins | Valentine's | Early bird bundles, prom previews |
| Mar-Apr | **Peak Prom** | Spring weddings | Prom bundles, bold colors, accessories |
| May-Jun | **Peak Wedding** | Graduation, galas | Wedding packages, groomsmen deals |
| Jul-Aug | Summer events | Beach weddings | Lightweight fabrics, lighter colors |
| Sep-Oct | Fall weddings | Homecoming, galas | Rich tones (burgundy, forest green) |
| Nov-Dec | Holiday events | Winter weddings | Velvet, darker tones, gift bundles |

Create `kct-event-calendar.json` and add methods:
1. `getCurrentEvents()` — returns primary + secondary events for current month
2. `getRecommendationFocus()` — returns what to push based on month
3. `getLeadTimeWindow(event)` — e.g., May weddings → push in March-April

---

## Section 2.5: Category Catalog Reference

**Priority:** P2
**File:** New `src/data/intelligence/kct-category-catalog.json`

Load the full category catalog from manifest (Part 3.4) with price ranges:

```json
{
  "categories": {
    "Blazer": { "count": 138, "price_min": 149.99, "price_max": 289.99, "price_avg": 223.50 },
    "Suit": { "count": 119, "price_min": 119.99, "price_max": 299.00, "price_avg": 230.64 },
    "Tuxedo": { "count": 100, "price_min": 159.99, "price_max": 329.00, "price_avg": 251.42 },
    "Tie & Bowtie Collection": { "count": 69, "price_min": 24.99, "price_max": 24.99, "price_avg": 24.99 },
    "Bundle": { "count": 63, "price_min": 229.99, "price_max": 279.99, "price_avg": 247.61 },
    "Dress Shirt": { "count": 62, "price_min": 19.99, "price_max": 69.99, "price_avg": 43.62 },
    "Dress Shoes": { "count": 53, "price_min": 9.99, "price_max": 129.99, "price_avg": 97.82 },
    "Three-Piece Tuxedo": { "count": 42, "price_min": 199.99, "price_max": 229.99, "price_avg": 202.13 },
    "Suit Bundle": { "count": 39, "price_min": 249.99, "price_max": 249.99, "price_avg": 249.99 },
    "Accessories": { "count": 37, "price_min": 50.00, "price_max": 50.00, "price_avg": 50.00 },
    "Suspenders": { "count": 28, "price_min": 28.00, "price_max": 44.99, "price_avg": 32.06 },
    "Double-Breasted Suit": { "count": 19, "price_min": 199.99, "price_max": 279.99, "price_avg": 217.88 },
    "Tuxedos (Premium)": { "count": 18, "price_min": 256.00, "price_max": 500.00, "price_avg": 335.17 },
    "Vest Set": { "count": 18, "price_min": 44.99, "price_max": 229.99, "price_avg": 144.71 },
    "Casual Suit Bundle": { "count": 16, "price_min": 229.99, "price_max": 229.99, "price_avg": 229.99 },
    "Boys Suits": { "count": 8, "price_min": 129.99, "price_max": 139.99, "price_avg": 131.24 },
    "Wedding Package": { "count": 6, "price_min": 179.99, "price_max": 329.99, "price_avg": 239.99 }
  }
}
```

Add a `getCategoryInfo(category)` method to product-catalog-service that returns price ranges and product counts. This validates that recommendations stay within real price boundaries.

---

## Execution Order

1. **Section 2.0** first — populates the empty color map (everything depends on this)
2. **Section 2.1** next — expands aliases so color matching actually works for 69 tie colors
3. **Section 2.2** — fixes price tier logic with real KCT numbers
4. **Section 2.3** — wires product tags for occasion filtering
5. **Section 2.4** — seasonal calendar integration
6. **Section 2.5** — category catalog reference

Each section should be a separate commit. Deploy and verify after Section 2.1 (the two P0 items together).

---

## Validation Checklist

After Sprint 2, these should all pass:

- [ ] `getAvailableColors()` returns 26 suit colors with correct tiers
- [ ] `color_to_products["black"]` returns `{ product_count: 190, tier: "core" }`
- [ ] Color alias for "dusty_rose" resolves to a valid tie color
- [ ] Color alias for "tiffany_blue" resolves to a valid tie color
- [ ] `upsellSuspenderSet("royal_blue")` returns suspender+bowtie set info
- [ ] Price tier for a $150 suit returns "entry" (not generic "budget")
- [ ] Accessory recommendation for a $119 suit stays under $30 (25% rule)
- [ ] Occasion "prom" surfaces prom-tagged products (496 products)
- [ ] Occasion "wedding" + venue "outdoor" surfaces outdoor-wedding tags (196 products)
- [ ] February returns "Prom prep begins" as current event focus
- [ ] Category lookup for "Tuxedo" returns price range $159.99-$329.00
