# Prom New Arrivals Section

## Overview

The Prom New Arrivals section displays products that have been tagged as "new" for prom in the Admin Product Review page. This mirrors the functionality of the main homepage's "New Arrivals" section but specifically for prom products.

## Location

- **Component**: `src/components/prom/PromNewArrivalsShowcase.tsx`
- **Page**: `src/pages/PromPage.tsx` (appears after the TikTok carousel section)

## Data Flow

```
Admin tags product as "new" in Product Admin (with prom context)
    ↓
Product receives `prom-priority` tag in Shopify
    ↓
PromNewArrivalsShowcase queries Shopify for `tag:prom-priority`
    ↓
Products displayed on Prom page as "New Arrivals"
```

## How It Works

### 1. Admin Tags Products

In the Admin Product Review page (`/admin/products`):
1. Admin selects a product
2. Clicks the "New" tag button
3. System applies the `prom-priority` tag to the product in Shopify

### 2. Component Fetches Products

The `PromNewArrivalsShowcase` component:

```typescript
// Step 1: Check for featured products in Supabase (optional ordering)
const { data: featuredData } = await supabase
  .from('featured_products')
  .select('product_handle, position')
  .eq('collection_tag', 'prom-priority')
  .order('position', { ascending: true });

// Step 2: Fetch all prom-priority products from Shopify
const allProducts = await searchProductsByDate('tag:prom-priority', 50);

// Step 3: Combine featured first, then remaining by date
const combined = [...featuredProducts, ...remainingProducts].slice(0, 20);
```

### 3. Display

- Products shown in a 4-column grid (responsive: 2 columns on mobile)
- Each product card shows:
  - Product image with hover effect (shows alternate image)
  - "NEW" badge
  - Star badge if featured
  - Product title and price
  - Link to product detail page

## Tag Mapping

| Admin Action | Shopify Tag Applied |
|--------------|---------------------|
| Tag as "new" in main product admin | `priority` |
| Tag as "new" in prom context | `prom-priority` |

## Styling

The section uses the Prom page theme:
- Dark background (`bg-black/50`)
- Yellow/gold accent colors (`text-yellow-400`, `from-yellow-500`)
- Red accent for text on buttons (`text-red-900`)
- Gradient headlines matching the prom page style

## Related Files

- `src/components/homepage/NewArrivalsShowcase.tsx` - Main homepage version (uses `priority` tag)
- `src/lib/shopify-collections.ts` - Shopify query functions
- `src/pages/admin/ProductAdmin.tsx` - Admin interface for tagging

## Notes

- Maximum of 20 products displayed
- Products sorted by creation date (newest first)
- Featured products (via Supabase `featured_products` table) appear first
- Section is hidden if no products have the `prom-priority` tag
