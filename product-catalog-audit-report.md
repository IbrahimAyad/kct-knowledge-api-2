# KCT Menswear Product Catalog Audit Report

**Date:** February 15, 2026
**Source file:** `src/data/intelligence/product-catalog-mapping.json` (v3.0)
**Auditor:** Cowork automated audit

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total products | 157 |
| Color categories | 15 |
| Suits/Tuxedos | 70 |
| Ties/Bowties | 44 |
| Accessories | 40 |
| Shirts | 3 |
| Complete-the-look bundles | 3 |

### Issues Found

| Issue Type | Count | Severity |
|-----------|-------|----------|
| Misplaced products (wrong color bucket) | 21 | HIGH |
| Duplicate handles (same product in 2+ colors) | 10 | HIGH |
| Missing `type` field | 87 | MEDIUM |
| "copy-of" Shopify handles | 3 | MEDIUM |
| Empty catalog sections (stubs) | 6 | MEDIUM |
| Sparse color categories | 9 | LOW |
| Fabric metadata coverage | 0/157 (0%) | PREP |

---

## CRITICAL: Misplaced Products (21 items)

These products are filed under a color category that doesn't match their title. This means the API will recommend the WRONG products — e.g., a customer searching for burgundy suits could be shown a "Light Blue Sequin Tuxedo."

### Burgundy bucket contains 14 non-burgundy products:

| Product Title | Actual Color | Price |
|--------------|-------------|-------|
| Men's Light Blue Sequin Lapel Three-Piece Prom Tuxedo | Light Blue | $299.99 |
| Ocean Blue Textured Double-Breasted Suit | Blue | $249.99 |
| Hunter Green Tuxedo Jacket | Hunter Green | $199.99 |
| Shiny Lavender Suit | Lavender | $229.99 |
| Shiny Blush Pink Satin Suit | Pink | $229.99 |
| Shiny Red Suit | Red | $229.99 |
| Shiny Navy Suit | Navy | $229.99 |
| Shiny Black Suit | Black | $229.99 |
| Slim Royal Blue Tuxedo | Royal Blue | $179.99 |
| Slim Light Grey Tuxedo | Light Grey | $179.99 |
| Light Blush Tuxedo with Matching Bowtie | Blush | $229.99 |
| Light Orange Tuxedo with Matching Bowtie | Orange | $229.99 |
| Light Gold Tuxedo with Matching Bowtie | Gold | $229.99 |
| Sly Blue Tuxedo with Matching Bowtie | Blue | $229.99 |

### Other misplaced items (7):

| Color Bucket | Product Title | Actual Color |
|-------------|--------------|-------------|
| sage_green | Classic Gray Double-Breasted Suit Ensemble | Gray |
| chocolate_brown | Black Floral Prom Tuxedo Blazer – 2025 | Black |
| chocolate_brown | Red Floral Prom Tuxedo Blazer | Red |
| chocolate_brown | Men's Bronze & Black Geometric Tuxedo Blazer | Bronze/Black |
| emerald_green | Modern Black Double-Breasted Tuxedo | Black |
| emerald_green | White Tuxedo with Black Trim (handle says emerald green) | White |
| chocolate_brown | Nutmeg Ties & Bowties Collection | Nutmeg (borderline) |

**Recommended action:** Move each product to its correct color category or create new color categories (lavender, pink, red, royal_blue, gold, orange) if these colors should be represented. The burgundy bucket is inflated from 54 to actually ~40 real burgundy products.

---

## CRITICAL: Duplicate Handles (10 products appear in 2+ colors)

When the same Shopify handle appears under multiple colors, the API treats one product as two. This inflates the catalog count and creates confusing recommendations.

| Handle | Product Title | Found In Colors | Confidence |
|--------|-------------|-----------------|------------|
| `two-piece-navy-suit` | Two-Piece Navy Suit | navy, midnight_blue | Definite — same product |
| `slim-navy-tuxedo` | Slim Navy Tuxedo | navy, midnight_blue | Definite — same product |
| `navy-wedding-bundle` | Navy Ties & Bowties | navy, midnight_blue | Definite — same product |
| `satin-black-suit` | Shiny Black Suit | burgundy, black | Definite — misplaced in burgundy |
| `slim-light-grey-tuxedo-1` | Slim Light Grey Tuxedo | burgundy, light_grey | Definite — misplaced in burgundy |
| `hunter-green-tuxedo-jacket-...` | Hunter Green Tuxedo Jacket | burgundy, hunter_green | Definite — misplaced in burgundy |
| `men-s-light-blue-sequin-...` | Light Blue Sequin Tuxedo | burgundy, light_blue | Definite — misplaced in burgundy |
| `powder-blue-wedding-bundle` | Powder Blue Ties | light_blue, powder_blue | Likely intentional alias |
| `elegant-powdered-blue-tuxedo-...` | Powdered Blue Tuxedo | light_blue, powder_blue | Likely intentional alias |
| `sly-blue-tuxedo-with-...` | Sly Blue Tuxedo + Bowtie | burgundy, light_blue | Definite — misplaced in burgundy |

**Recommended action:** Remove duplicates from the wrong color bucket. For intentional aliases (light_blue ↔ powder_blue), keep in one primary bucket and let the service's `getColorAliases()` handle the mapping (it already does this).

---

## MEDIUM: Missing Product Type Field (87 of 157 products = 55%)

Only 70 products have a `type` field (Suit, Tuxedo, Three-Piece Tuxedo, etc.). The other 87 — all ties, accessories, and shirts — have no type, which means the API can't filter or sort by product type.

**Breakdown of typed vs untyped:**
- Suits category: 70/70 have type (100%)
- Ties category: 0/44 have type (0%)
- Accessories category: 0/40 have type (0%)
- Shirts category: 0/3 have type (0%)

**Recommended types to add:**

| Category | Suggested Types |
|----------|----------------|
| Ties | Necktie, Bowtie, Skinny Tie, Tie Collection, Tie Bundle, Suspender Set |
| Accessories | Blazer, Vest Set, Peacoat, Cardigan, Loafers, Chelsea Boots, Dress Shirt |
| Shirts | Slim Fit Dress Shirt, Regular Fit Dress Shirt, Satin Dress Shirt |

**Note:** Many "accessories" are actually blazers ($199-$299) that should arguably be in the suits category. At minimum, they need a type field so the recommendation engine knows the difference between a $249.99 blazer and a $49.99 vest set.

---

## MEDIUM: "copy-of" Shopify Handles (3 products)

These were cloned in Shopify from another product and still carry the original's handle:

| Product Title | Handle | Problem |
|--------------|--------|---------|
| Burgundy with Diamond Pattern Prom Blazer | `copy-of-green-with-diamond-pattern-prom-blazer` | Cloned from green version |
| Burgundy with Black Floral Blazer | `copy-of-rose-brown-sparkle-prom-blazer` | Cloned from rose brown |
| Burgundy & Black Patterned Vested Slim Fit | `copy-of-red-paisley-tuxedo-1` | Cloned from red paisley |

**Recommended action:** Update the handles in Shopify to match the actual product. These "copy-of" URLs look unprofessional in links and could confuse SEO.

---

## MEDIUM: Empty Catalog Sections (6 stubs)

These sections exist in the JSON but contain no data:

| Section | Status | Impact |
|---------|--------|--------|
| `color_to_products` | Empty object `{}` | Legacy field — unused |
| `recommended_combinations` | Empty array `[]` | Was supposed to hold pre-built combos |
| `occasion_specific.wedding` | Empty array | No wedding-specific product mappings |
| `occasion_specific.prom` | Empty array | No prom-specific product mappings |
| `occasion_specific.black_tie` | Empty array | No black-tie-specific product mappings |
| `occasion_specific.business` | Empty array | No business-specific product mappings |
| `wedding_party_packages` | Empty array | No group/party package mappings |

**Recommended action:** Either populate these (the intelligence wiring plan Phase 1 will need occasion-specific mappings) or remove the stubs to avoid confusion. The `complete_the_look_bundles` section (3 bundles) is the only populated bundle data.

---

## LOW: Sparse Color Categories

These colors have minimal product coverage, which limits recommendation quality:

| Color | Suits | Ties | Accessories | Shirts | Notes |
|-------|-------|------|-------------|--------|-------|
| white | 0 | 2 | 0 | 2 | No white suits in catalog |
| terracotta | 0 | 3 | 1 | 0 | Ties only, no suits |
| powder_blue | 1 | 1 | 0 | 0 | Minimal coverage |
| sage_green | 2 | 1 | 0 | 0 | CRITICAL gap (trending +72%) |
| midnight_blue | 2 | 1 | 0 | 0 | Duplicates navy products |
| hunter_green | 1 | 2 | 1 | 0 | Only 1 suit |

**Shirts across entire catalog:** Only 3 shirts total (1 black satin, 1 slim white, 1 regular white). Every other color has an empty shirts array. This is a major gap since the recommendation engine will suggest "white shirt with navy suit" but has almost no shirts to link to.

---

## PREP: Fabric Metadata (0% coverage)

No products have a `fabric_type` field. This blocks the intelligence wiring plan Section 1.3 (fabric performance matching).

**Recommended action:** Add `fabric_type` to at least the 70 suit entries. Based on the product knowledge skill:

| Product Pattern | Likely Fabric |
|----------------|---------------|
| Standard suits ($169-199) | `polyester_blend` |
| Stretch/Travelers suits ($249) | `stretch_poly_blend` |
| Velvet suits/blazers | `velvet` |
| Tweed suits | `wool_tweed` |
| Linen suits | `linen_blend` |
| Satin/Shiny suits ($229) | `satin_poly` |
| Sequin items | `sequin_poly` |

---

## Corrected Product Count

After accounting for misplaced and duplicate products:

| Metric | Reported | Actual |
|--------|----------|--------|
| Total unique products | 157 | ~137 (after removing dupes) |
| Burgundy products | 54 | ~40 (14 are misplaced) |
| True catalog colors represented | 15 | ~20 (lavender, pink, red, royal blue, gold, orange not mapped) |

---

## Priority Action Items

### Must Fix Before Intelligence Wiring (Sprint 1)

1. **Remove 14 misplaced products from burgundy bucket** — they'll cause wrong recommendations immediately
2. **Deduplicate navy ↔ midnight_blue** — these share 3 products; decide if midnight_blue is a real category or just an alias
3. **Add `type` field to ties and accessories** — the recommendation engine needs to distinguish blazers from vest sets

### Should Fix Soon

4. **Create new color categories** for products that don't fit existing buckets (lavender, pink, red, royal blue, gold, orange)
5. **Fix "copy-of" Shopify handles** — update in Shopify admin
6. **Populate `occasion_specific` sections** — the context builder needs occasion-to-product mappings
7. **Add more shirts** — only 3 in the entire catalog

### Prep for Phase 1

8. **Add `fabric_type` to suit entries** — enables fabric performance matching
9. **Decide on midnight_blue vs navy** — merge or differentiate
10. **Populate or remove empty stubs** (`color_to_products`, `recommended_combinations`, `wedding_party_packages`)
