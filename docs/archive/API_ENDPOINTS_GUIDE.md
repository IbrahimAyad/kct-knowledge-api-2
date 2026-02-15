# KCT Knowledge API v2.0.0 - Complete Endpoints Guide

## Authentication

**Required for all endpoints except health checks**

### API Key Methods:
1. **X-API-Key Header** (Recommended)
   ```bash
   curl -H "X-API-Key: kct-menswear-api-2024-secret"
   ```

2. **Authorization Bearer Token**
   ```bash
   curl -H "Authorization: Bearer kct-menswear-api-2024-secret"
   ```

3. **Query Parameter** (Fallback)
   ```bash
   curl "http://localhost:3000/api/colors?api_key=kct-menswear-api-2024-secret"
   ```

## New Priority API Endpoints

### 1. Colors Catalog - `GET /api/colors`
Get comprehensive color families, relationships, and trending data.

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "color_families": {
      "cool_tones": {
        "colors": ["navy", "light_blue", "grey", "charcoal", "powder_blue"],
        "complement_with": "warm_accents",
        "tie_suggestions": ["burgundy", "rust", "coral"]
      }
    },
    "universal_rules": {
      "white_shirt": {
        "works_with": "any_suit_color",
        "confidence": 100,
        "note": "The ultimate safe choice"
      }
    },
    "trending": {
      "rising": ["sage_green"],
      "stable": ["burgundy"],
      "declining": []
    },
    "total_colors": 3,
    "metadata": {
      "version": "2.0.0",
      "last_updated": "2025-08-05T02:39:34.575Z",
      "description": "Comprehensive color relationship data for menswear styling"
    }
  }
}
```

### 2. Color Relationships - `GET /api/colors/:color/relationships`
Get specific color matching relationships for suits, shirts, and ties.

**Example:** `GET /api/colors/navy/relationships`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "color": "navy",
    "normalized_color": "navy",
    "relationships": {
      "perfect_matches": ["white", "light_blue", "pink", "lavender"],
      "good_matches": ["cream", "light_grey", "navy_pattern"],
      "avoid": []
    },
    "confidence_scores": {
      "shirt_matches": 0.85,
      "tie_matches": 0.85,
      "overall_confidence": 0.90
    },
    "metadata": {
      "source": "KCT Knowledge Bank",
      "last_updated": "2025-08-05T02:39:46.938Z"
    }
  }
}
```

### 3. Combination Validation - `POST /api/combinations/validate`
Validate outfit combinations with confidence scores and improvement suggestions.

**Request Body:**
```json
{
  "suit_color": "navy",
  "shirt_color": "white", 
  "tie_color": "burgundy",
  "occasion": "wedding_guest",
  "season": "spring"
}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "combination_id": "navy-white-burgundy",
    "validation_score": 80,
    "compatibility_matrix": {
      "suit_shirt": 0.90,
      "shirt_tie": 0.85,
      "suit_tie": 0.80
    },
    "occasion_appropriateness": {
      "score": 0.95,
      "reasoning": "General appropriateness assessment"
    },
    "seasonal_fit": {
      "season": "spring",
      "appropriateness": 0.85,
      "notes": "Suitable for spring styling"
    },
    "improvement_suggestions": [
      "Consider adding pocket square for enhanced sophistication"
    ],
    "metadata": {
      "validated_at": "2025-08-05T02:43:29.272Z",
      "knowledge_bank_version": "2.0.0"
    }
  }
}
```

### 4. AI Recommendations - `POST /api/recommendations`
AI-powered outfit recommendations based on customer profile and context.

**Request Body:**
```json
{
  "suit_color": "navy",
  "customer_profile": "modern_adventurous",
  "occasion": "wedding_guest",
  "season": "spring",
  "formality_level": 7,
  "age": "25-35",
  "occupation": "tech"
}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "primary_recommendations": [
      {
        "suit_color": "navy",
        "shirt_color": "lavender",
        "tie_color": "burgundy",
        "rank": 1,
        "ai_confidence": 0.95,
        "personalization_score": 0.90,
        "trending_factor": 0.89
      }
    ],
    "alternative_options": [...],
    "style_insights": {
      "detected_profile": "modern_adventurous",
      "confidence": 0.88,
      "key_characteristics": {
        "color_preferences": ["classic_with_perfect_execution"],
        "adventure_level": "calculated"
      }
    },
    "seasonal_highlights": {
      "season": "spring",
      "trending_colors": {"rising": ["sage_green"]},
      "seasonal_tips": ["Perfect for spring events"]
    },
    "metadata": {
      "generated_at": "2025-08-05T02:43:46.049Z",
      "algorithm_version": "2.0.0",
      "total_combinations_analyzed": 1247
    }
  }
}
```

### 5. Trending Analysis - `GET /api/trending`
Real-time trending combinations and fashion analytics.

**Query Parameters:**
- `limit` (optional): Number of combinations to return (default: 10)
- `timeframe` (optional): Analysis timeframe (default: "30d")

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "trending_combinations": [
      {
        "rank": 1,
        "combination": "navy_suit_white_shirt_burgundy_tie",
        "conversion_rate": "24.3%",
        "average_order_value": 847,
        "trend_score": 0.95,
        "momentum": "rising",
        "social_mentions": 123,
        "celebrity_endorsements": ["red_carpet", "fashion_week"]
      }
    ],
    "color_trends": {
      "rising": ["sage_green", "burgundy", "midnight_blue"],
      "stable": ["navy", "charcoal", "light_grey"],
      "declining": ["tan", "light_blue"]
    },
    "seasonal_trends": {
      "spring": {
        "champion": {"suit": "sage_green", "shirt": "white", "tie": "blush_pink"}
      }
    },
    "analytics": {
      "timeframe": "30d",
      "data_points_analyzed": 15847,
      "confidence_level": 0.92
    }
  }
}
```

### 6. Venue Recommendations - `GET /api/venues/:type/recommendations`
Venue-specific style recommendations for different event types.

**Supported Venue Types:**
- `beach` - Beach/outdoor weddings
- `garden` - Garden parties/outdoor events  
- `church` - Religious ceremonies
- `ballroom` - Formal indoor events

**Query Parameters:**
- `season` (optional): spring, summer, fall, winter
- `formality` (optional): Desired formality level

**Example:** `GET /api/venues/beach/recommendations?season=summer`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "venue_type": "beach",
    "recommendations": {
      "recommended_colors": ["light_grey", "tan", "light_blue"],
      "fabric_suggestions": ["linen", "cotton", "lightweight_wool"],
      "formality_range": [3, 6],
      "seasonal_notes": "Light, breathable fabrics essential",
      "avoid": ["black", "heavy_wool", "velvet"]
    },
    "complete_outfits": [
      {
        "suit_color": "light_grey",
        "shirt_color": "white",
        "tie_color": "burgundy",
        "formality_score": 3,
        "confidence": 0.90,
        "reasoning": "Classic light_grey combination with high versatility"
      }
    ]
  }
}
```

### 7. Style Profiles - `GET /api/styles/:profile`
Get detailed style profile information and recommendations.

**Supported Profiles:**
- `classic_conservative`
- `modern_adventurous`
- `practical_value_seeker`
- `luxury_connoisseur`
- `occasion_driven`

**Example:** `GET /api/styles/modern_adventurous`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "percentage_of_customers": "23%",
    "demographics": {
      "age_range": "25-40",
      "occupations": ["creative", "tech", "marketing"],
      "shopping_behavior": "impulse_friendly"
    },
    "characteristics": {
      "color_preferences": ["burgundy", "sage_green", "powder_blue"],
      "pattern_tolerance": "high",
      "adventure_level": "high"
    },
    "styling_tips": [
      "Experiment with texture mixing",
      "Try seasonal accent colors",
      "Consider patterned shirts with solid ties"
    ],
    "color_palette": {
      "suits": ["midnight_blue", "sage_green", "burgundy"],
      "shirts": ["white", "light_blue", "pink"],
      "ties": ["forest_green", "coral", "purple"]
    },
    "personalization_score": 0.92
  }
}
```

### 8. Fashion Rules Check - `POST /api/rules/check`
Comprehensive fashion rules validation against style guidelines.

**Request Body:**
```json
{
  "combination": {
    "suit_color": "black",
    "shirt_color": "white",
    "tie_color": "burgundy",
    "suit_pattern": "solid",
    "shirt_pattern": "solid",
    "tie_pattern": "solid"
  },
  "context": {
    "occasion": "black_tie",
    "season": "winter",
    "formality_required": 9
  }
}
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "validation_passed": true,
    "overall_score": 0.95,
    "rule_checks": {
      "color_clashing": {"valid": true, "issue": null, "severity": null},
      "formality_mismatch": {"valid": true, "issue": null, "severity": null},
      "seasonal_appropriateness": {"valid": true, "issue": null, "severity": null},
      "occasion_suitability": {"valid": true, "issue": null, "severity": null},
      "pattern_mixing": {"valid": true, "issue": null, "severity": null}
    },
    "violations": [],
    "recommendations": [],
    "metadata": {
      "rules_engine_version": "2.0.0",
      "total_rules_checked": 5,
      "validated_at": "2025-08-05T02:44:36.110Z"
    }
  }
}
```

## Legacy V1 Endpoints

All previous V1 endpoints remain available at `/api/v1/*` for backward compatibility:

- `GET /api/v1/health` - System health check
- `GET /api/v1/colors` - Color families and rules
- `POST /api/v1/colors/recommendations` - Color recommendations
- `GET /api/v1/colors/:color/complementary` - Complementary colors
- `POST /api/v1/recommendations` - Comprehensive recommendations
- `POST /api/v1/profiles/identify` - Style profile identification
- `GET /api/v1/profiles` - All style profiles
- `GET /api/v1/profiles/:profileName` - Specific profile
- `POST /api/v1/conversion/optimize` - Conversion optimization
- `GET /api/v1/conversion/top-combinations` - Top converting combinations
- `POST /api/v1/validation/outfit` - Outfit validation
- `GET /api/v1/intelligence` - Fashion intelligence data
- `POST /api/v1/personalization` - Personalized experience
- `GET /api/v1/info` - Knowledge bank information

## Error Handling

### Authentication Errors
```json
{
  "success": false,
  "error": "API key required. Provide via X-API-Key header, Authorization Bearer token, or api_key query parameter",
  "timestamp": "2025-08-05T02:39:22.436Z"
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "suit_color, shirt_color, and tie_color are required",
  "timestamp": "2025-08-05T02:45:26.370Z"
}
```

### Rate Limiting
- **Limit:** 1000 requests per 15 minutes per IP
- **Headers:** Standard rate limiting headers included
- **Response:** 429 Too Many Requests with retry information

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request throttling
- **API Key Authentication** - Secure access control
- **Input Validation** - Request validation
- **Error Sanitization** - Safe error responses

## Performance Features

- **Compression** - Response compression
- **Caching** - Intelligent data caching
- **Connection Pooling** - Optimized connections
- **Lazy Loading** - On-demand service initialization

## Production Ready

The API is fully production-ready with:
- Comprehensive error handling
- Security best practices
- Performance optimizations
- Detailed logging and monitoring
- Complete test coverage
- Extensive documentation

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** Configure via environment variables

## Contact & Support

For API support, integration assistance, or feature requests, contact the KCT development team.