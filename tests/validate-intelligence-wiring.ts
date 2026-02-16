/**
 * Sprint 1 Validation Script
 * Run after each wiring step to verify intelligence data loads correctly.
 * Usage: npx ts-node tests/validate-intelligence-wiring.ts
 * Or:    node -e "require('./dist/tests/validate-intelligence-wiring.js')"
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_ROOT = path.join(__dirname, '../src/data');
const INTEL_ROOT = path.join(__dirname, '../KCT Knowledge API Enhancement -Update-Info');

interface ValidationResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function check(step: string, fn: () => { pass: boolean; message: string; details?: string }) {
  try {
    const result = fn();
    results.push({
      step,
      status: result.pass ? 'PASS' : 'FAIL',
      message: result.message,
      details: result.details,
    });
  } catch (err: any) {
    results.push({
      step,
      status: 'FAIL',
      message: `Exception: ${err.message}`,
    });
  }
}

// ============================================================
// CATALOG VALIDATION
// ============================================================

check('Catalog: loads without error', () => {
  const raw = fs.readFileSync(path.join(DATA_ROOT, 'intelligence/product-catalog-mapping.json'), 'utf8');
  const catalog = JSON.parse(raw);
  const colors = Object.keys(catalog.trending_2025_inventory || {});
  return {
    pass: colors.length >= 15,
    message: `${colors.length} colors in catalog`,
  };
});

check('Catalog: all products have type + fabric_type', () => {
  const raw = fs.readFileSync(path.join(DATA_ROOT, 'intelligence/product-catalog-mapping.json'), 'utf8');
  const catalog = JSON.parse(raw);
  const inv = catalog.trending_2025_inventory || {};
  let missing = 0;
  let total = 0;
  for (const [color, data] of Object.entries<any>(inv)) {
    for (const cat of ['suits', 'ties', 'accessories', 'shirts']) {
      for (const p of data[cat] || []) {
        total++;
        if (!p.type || !p.fabric_type) missing++;
      }
    }
  }
  return {
    pass: missing === 0,
    message: `${total} products, ${missing} missing type/fabric_type`,
  };
});

check('Catalog: no duplicate handles within same color', () => {
  const raw = fs.readFileSync(path.join(DATA_ROOT, 'intelligence/product-catalog-mapping.json'), 'utf8');
  const catalog = JSON.parse(raw);
  const inv = catalog.trending_2025_inventory || {};
  const dupes: string[] = [];
  for (const [color, data] of Object.entries<any>(inv)) {
    const handles = new Set<string>();
    for (const cat of ['suits', 'ties', 'accessories', 'shirts']) {
      for (const p of data[cat] || []) {
        if (handles.has(p.handle)) dupes.push(`${color}: ${p.handle}`);
        handles.add(p.handle);
      }
    }
  }
  return {
    pass: dupes.length === 0,
    message: dupes.length === 0 ? 'No intra-color duplicates' : `${dupes.length} duplicates`,
    details: dupes.join('\n'),
  };
});

check('Catalog: occasion_specific populated', () => {
  const raw = fs.readFileSync(path.join(DATA_ROOT, 'intelligence/product-catalog-mapping.json'), 'utf8');
  const catalog = JSON.parse(raw);
  const occasions = catalog.occasion_specific || {};
  const populated = Object.entries(occasions).filter(([_, v]: any) => v.key_products?.length > 0);
  return {
    pass: populated.length >= 4,
    message: `${populated.length}/4 occasions populated`,
  };
});

// ============================================================
// RESEARCH DATA VALIDATION (7 API categories)
// ============================================================

const researchFiles: { name: string; path: string; minSizeKB: number }[] = [
  { name: 'Venue Microdata', path: 'Venue Microdata_ The Hidden Intelligence of Lighti/venue_microdata_analysis.json', minSizeKB: 10 },
  { name: 'Seasonal: Graduation', path: 'Seasonal Micro-Patterns_ Advanced Personalization/graduation_season_timing.csv', minSizeKB: 0.2 },
  { name: 'Seasonal: Monthly', path: 'Seasonal Micro-Patterns_ Advanced Personalization/monthly_seasonal_patterns.csv', minSizeKB: 0.3 },
  { name: 'Fabric Performance', path: 'Technical Style Details_ Fabric Performance Data/fabric_performance_real_world.csv', minSizeKB: 0.5 },
  { name: 'Fabric Construction', path: 'Technical Style Details_ Fabric Performance Data/suit_construction_lifespan.csv', minSizeKB: 0.2 },
  { name: 'Career Stage', path: 'Career Trajectory Patterns_ Advanced Personalizati/career_stage_wardrobe.csv', minSizeKB: 0.2 },
  { name: 'Cultural Nuances', path: 'Cultural & Regional Nuances_ Navigating the Unspok/cultural_regional_nuances.json', minSizeKB: 5 },
  { name: 'Body Language & Fit', path: 'Body Language & Fit Preferences_ The Psychology of/body_language_fit_preferences.json', minSizeKB: 10 },
  { name: 'Color Science: Lighting', path: 'Color Science Gaps in Menswear Formalwear_ Underst/lighting_color_perception_1.csv', minSizeKB: 0.3 },
  { name: 'Color Science: Video', path: 'Color Science Gaps in Menswear Formalwear_ Underst/video_call_undertones.csv', minSizeKB: 0.3 },
  { name: 'Color Science: Colorblind', path: 'Color Science Gaps in Menswear Formalwear_ Underst/colorblind_perception_analysis.csv', minSizeKB: 0.2 },
  { name: 'Decision Fatigue', path: 'Customer Psychology & Behavior - Menswear Formalwe/menswear_decision_fatigue_summary.csv', minSizeKB: 0.2 },
];

for (const file of researchFiles) {
  check(`Research data: ${file.name}`, () => {
    const fullPath = path.join(INTEL_ROOT, file.path);
    const exists = fs.existsSync(fullPath);
    if (!exists) return { pass: false, message: `NOT FOUND: ${file.path}` };
    const stats = fs.statSync(fullPath);
    const sizeKB = stats.size / 1024;
    return {
      pass: sizeKB >= file.minSizeKB,
      message: `${sizeKB.toFixed(1)}KB (min: ${file.minSizeKB}KB)`,
    };
  });
}

// ============================================================
// CORE DATA FILES
// ============================================================

const coreFiles = [
  'core/color-relationships.json',
  'core/color-seasonality.json',
  'core/fabric-seasonality.json',
  'core/formality-index.json',
  'core/never-combine-rules.json',
  'core/venue-compatibility.json',
];

for (const file of coreFiles) {
  check(`Core data: ${file}`, () => {
    const fullPath = path.join(DATA_ROOT, file);
    const exists = fs.existsSync(fullPath);
    if (!exists) return { pass: false, message: 'NOT FOUND' };
    const raw = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(raw); // validate JSON
    return { pass: true, message: 'Valid JSON, exists' };
  });
}

// ============================================================
// SERVICE FILE CHECKS (verify key files exist)
// ============================================================

const serviceFiles = [
  'src/services/product-catalog-service.ts',
  'src/config/scoring-defaults.ts',
  'src/utils/enhanced-data-loader.ts',
  'src/controllers/api.ts',
  // Sprint 1 additions — will be SKIP until created:
  'src/services/recommendation-context-builder.ts',
];

for (const file of serviceFiles) {
  check(`Service file: ${path.basename(file)}`, () => {
    const fullPath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(fullPath);
    return {
      pass: exists,
      status: exists ? 'PASS' : 'SKIP',
      message: exists ? 'Exists' : 'Not yet created (Sprint 1)',
    } as any;
  });
}

// ============================================================
// REPORT
// ============================================================

console.log('\n══════════════════════════════════════════');
console.log('  KCT INTELLIGENCE WIRING — VALIDATION');
console.log('══════════════════════════════════════════\n');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const skipped = results.filter(r => r.status === 'SKIP').length;

for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${r.step}: ${r.message}`);
  if (r.details) console.log(`   ${r.details}`);
}

console.log(`\n── Summary: ${passed} passed, ${failed} failed, ${skipped} skipped ──\n`);

if (failed > 0) {
  process.exit(1);
}
