# KCT Knowledge API v2.0.0 - Usage Examples

## Overview
The KCT Knowledge API provides comprehensive fashion intelligence, including color recommendations, style profiling, conversion optimization, and outfit validation.

**Base URL:** `http://localhost:3000/api/v1`

## Authentication
Currently in development mode - no API key required. In production, include `X-API-Key` header.

## Core Endpoints

### 1. Color Recommendations

#### Get Color Recommendations
```bash
POST /api/v1/colors/recommendations
Content-Type: application/json

{
  "suit_color": "navy",
  "occasion": "wedding_groom",  
  "season": "spring",
  "formality_level": 7,
  "customer_profile": "classic_conservative"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shirt_recommendations": [
      {
        "color": "white",
        "confidence": 98,
        "reasoning": "Perfect match based on color theory and customer data"
      }
    ],
    "tie_recommendations": [
      {
        "color": "burgundy", 
        "confidence": 98,
        "reasoning": "Perfect match based on color theory and customer data"
      }
    ],
    "formality_score": 7,
    "occasion_appropriate": true,
    "seasonal_notes": ["navy is a seasonal favorite for spring"]
  }
}
```

#### Get Color Families
```bash
GET /api/v1/colors
```

#### Get Complementary Colors
```bash
GET /api/v1/colors/navy/complementary
```

### 2. Style Profile Management

#### Identify Customer Style Profile
```bash
POST /api/v1/profiles/identify
Content-Type: application/json

{
  "quiz_answers": {
    "question_1_style_preference": "classic",
    "question_2_color_comfort": "navy_black",
    "question_3_shopping_style": "research_everything"
  },
  "behavioral_data": {
    "pages_viewed": ["about", "size-guide", "navy-suits"],
    "time_spent": 480,
    "clicked_sections": ["quality-guarantee"]
  },
  "demographics": {
    "age_range": "35-45",
    "occupation": "finance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile_type": "classic_conservative",
    "confidence": 87,
    "characteristics": {
      "color_preferences": ["navy", "charcoal", "black", "grey"],
      "pattern_tolerance": "low",
      "adventure_level": "minimal"
    },
    "recommended_combinations": ["navy_white_burgundy", "charcoal_white_silver"],
    "messaging_style": "Formal, detailed, quality-focused",
    "bundle_preference": "premium"
  }
}
```

#### Get All Profiles
```bash
GET /api/v1/profiles
```

#### Get Quiz Questions
```bash
GET /api/v1/profiles/quiz/questions
```

### 3. Conversion Optimization

#### Get Conversion Optimization
```bash
POST /api/v1/conversion/optimize
Content-Type: application/json

{
  "combination": "navy_white_burgundy",
  "customer_profile": "classic_conservative",
  "occasion": "wedding_groom",
  "price_tier": "premium"
}
```

#### Predict Conversion Rate
```bash
POST /api/v1/conversion/predict
Content-Type: application/json

{
  "combination": "navy_white_burgundy",
  "customer_profile": "luxury_connoisseur",
  "occasion": "wedding_groom",
  "device": "desktop",
  "season": "spring"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predicted_rate": 31.2,
    "confidence": 85,
    "factors_considered": ["Historical combination data", "Customer profile analysis"],
    "benchmark_comparison": {
      "above_average": true,
      "percentage_difference": 62
    }
  }
}
```

#### Get Top Converting Combinations
```bash
GET /api/v1/conversion/top-combinations?limit=5
```

### 4. Comprehensive Recommendations

#### Get Complete Fashion Recommendations  
```bash
POST /api/v1/recommendations
Content-Type: application/json

{
  "suit_color": "navy",
  "occasion": "wedding_groom",
  "season": "spring", 
  "customer_profile": "luxury_connoisseur",
  "age": "35-45",
  "occupation": "executive"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "color_recommendations": { /* Color recommendations */ },
    "style_profile": { /* Identified style profile */ },
    "conversion_insights": { /* Conversion data for occasion */ },
    "complete_looks": [
      {
        "suit_color": "navy",
        "shirt_color": "white", 
        "tie_color": "burgundy",
        "confidence": 95,
        "formality_score": 7,
        "conversion_prediction": 28.5
      }
    ]
  }
}
```

### 5. Outfit Validation

#### Validate Complete Outfit
```bash
POST /api/v1/validation/outfit
Content-Type: application/json

{
  "suit_color": "navy",
  "shirt_color": "white",
  "tie_color": "burgundy", 
  "occasion": "wedding_groom",
  "customer_profile": "classic_conservative"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validation": {
      "valid": true,
      "confidence": 95,
      "issues": [],
      "improvements": []
    },
    "optimization": {
      "predicted_conversion_rate": 24.3,
      "optimization_suggestions": ["Add pocket square", "Consider premium fabric"],
      "upsell_opportunities": ["brown_shoes", "leather_belt", "cufflinks"]
    },
    "alternatives": []
  }
}
```

### 6. Personalization

#### Get Personalized Experience
```bash
POST /api/v1/personalization
Content-Type: application/json

{
  "profile": "modern_adventurous",
  "age": "28-35",
  "occupation": "creative",
  "shopping_behavior": ["views_new_arrivals", "clicks_trending"],
  "previous_purchases": ["sage_green_suit", "patterned_ties"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommended_homepage": "Trending Now: Sage Green",
    "messaging_style": "Friendly, enthusiastic, trend-aware", 
    "product_sort_order": "new_arrivals_first",
    "bundle_preference": "luxury",
    "color_preferences": ["burgundy", "sage_green", "powder_blue"],
    "recommended_combinations": ["sage_green_white_rust", "burgundy_pink_patterned"],
    "upsell_opportunities": ["navy_suit_white_shirt_burgundy_tie"]
  }
}
```

### 7. Fashion Intelligence

#### Get Fashion Intelligence Dashboard
```bash
GET /api/v1/intelligence
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trending_colors": {
      "rising": ["sage_green", "powder_blue"],
      "stable": ["navy", "charcoal"],
      "declining": []
    },
    "seasonal_champions": { /* Seasonal data */ },
    "top_combinations": [ /* Top converting combinations */ ],
    "conversion_leaders": { /* Best performing items */ },
    "style_distribution": {
      "classic_conservative": "42%",
      "modern_adventurous": "23%"
    }
  }
}
```

### 8. System Health & Info

#### Check System Health
```bash
GET /api/v1/health
```

#### Get Knowledge Bank Information
```bash
GET /api/v1/info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "index": { /* Knowledge bank index */ },
    "statistics": {
      "total_combinations": 68,
      "color_relationships": 12,
      "style_profiles": 5,
      "conversion_data_points": 847293,
      "last_updated": "2024-01-09"
    },
    "coverage": {
      "colors": ["navy", "charcoal", "burgundy", "sage_green", ...],
      "occasions": ["wedding_groom", "business_professional", ...],
      "profiles": ["classic_conservative", "modern_adventurous", ...],
      "seasons": ["spring", "summer", "fall", "winter"]
    }
  }
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

Common HTTP status codes:
- `200` Success
- `400` Bad Request (validation error)
- `404` Resource Not Found  
- `500` Internal Server Error

## Rate Limiting

In production:
- 100 requests per minute per IP
- 1000 requests per hour per API key

## SDK Usage (JavaScript/TypeScript)

```typescript
import { KCTKnowledgeAPI } from 'kct-knowledge-api-client';

const api = new KCTKnowledgeAPI({
  baseUrl: 'http://localhost:3000/api/v1',
  apiKey: 'your-api-key' // In production
});

// Get color recommendations
const recommendations = await api.colors.getRecommendations({
  suit_color: 'navy',
  occasion: 'wedding_groom',
  season: 'spring'
});

// Identify style profile
const profile = await api.profiles.identify({
  quiz_answers: {
    question_1_style_preference: 'classic'
  }
});

// Validate outfit
const validation = await api.validation.validateOutfit({
  suit_color: 'navy',
  shirt_color: 'white', 
  tie_color: 'burgundy'
});
```

## Integration Examples

### E-commerce Product Recommendation
```typescript
// Get personalized recommendations for homepage
const personalizedData = await api.personalization.getExperience({
  profile: customerProfile,
  previous_purchases: customerHistory
});

// Update homepage with recommended products
updateHomepage(personalizedData.recommended_combinations);
```

### AI Styling Assistant
```typescript
// Comprehensive styling session
const stylingSession = await api.recommendations.getComprehensive({
  suit_color: userSelection.suit,
  occasion: userSelection.event,
  customer_profile: identifiedProfile
});

// Present complete looks to user
displayCompleteLooks(stylingSession.complete_looks);
```

### Conversion Optimization
```typescript
// Optimize product page based on combination
const optimization = await api.conversion.optimize({
  combination: currentProduct.combination,
  customer_profile: userProfile
});

// Apply optimization suggestions
applyOptimizations(optimization.optimization_suggestions);
```