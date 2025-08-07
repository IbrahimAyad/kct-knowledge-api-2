# KCT Knowledge API - Intelligence Services Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Customer Psychology Intelligence](#customer-psychology-intelligence)
4. [Career Intelligence](#career-intelligence)
5. [Venue Intelligence](#venue-intelligence)
6. [Cultural Adaptation Intelligence](#cultural-adaptation-intelligence)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Response Formats](#response-formats)

## Overview

The KCT Knowledge API Intelligence Services provide advanced AI-powered insights for menswear recommendations based on customer psychology, career trajectory, venue requirements, and cultural considerations.

**Base URL**: `https://api.kctmenswear.com/api/v1/intelligence`

**API Version**: v1.0.0

### Key Features
- **Real-time Analysis**: Process customer behavior and preferences in real-time
- **Multi-dimensional Intelligence**: Combine psychology, career, venue, and cultural factors
- **Caching**: Intelligent caching for optimal performance
- **Scalable**: Designed to handle high-volume requests
- **Secure**: Enterprise-grade security and authentication

## Authentication

All intelligence API endpoints require authentication using API keys or JWT tokens.

### API Key Authentication
```http
Authorization: Bearer YOUR_API_KEY
```

### JWT Token Authentication
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example Authentication Request
```bash
curl -X POST "https://api.kctmenswear.com/api/v1/intelligence/psychology/analyze" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "customer_123",
    "session_duration": 900000,
    "choices_viewed": 25,
    "page_views": 12
  }'
```

## Customer Psychology Intelligence

The Psychology Intelligence service analyzes customer decision fatigue, emotional triggers, and provides personalization recommendations.

### Analyze Decision Fatigue

**Endpoint**: `POST /psychology/analyze`

Analyzes customer decision fatigue and provides actionable insights.

#### Request Body
```json
{
  "customer_id": "customer_123",
  "session_duration": 900000,
  "choices_viewed": 25,
  "page_views": 12,
  "previous_sessions": [
    {
      "duration": 600000,
      "choices_made": 3,
      "abandonment_point": null
    }
  ]
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Unique customer identifier |
| `session_duration` | number | Yes | Current session duration in milliseconds |
| `choices_viewed` | number | Yes | Number of product choices viewed |
| `page_views` | number | Yes | Total page views in session |
| `previous_sessions` | array | No | Array of previous session data |

#### Response
```json
{
  "success": true,
  "data": {
    "fatigue_score": 65,
    "risk_level": "medium",
    "recommended_actions": [
      "Reduce choice complexity",
      "Provide clear recommendations",
      "Offer guided shopping experience"
    ],
    "optimal_choice_count": 5,
    "recovery_timing": 7,
    "emotional_triggers": [
      {
        "trigger_type": "confidence",
        "intensity": 8,
        "context": ["professional", "social"],
        "messaging_approach": "Emphasize how this enhances professional presence"
      }
    ],
    "personalization_adjustments": [
      {
        "adjustment_type": "choice_reduction",
        "specific_action": "Reduce visible options by 50%",
        "expected_impact": "Lower cognitive load, faster decisions"
      }
    ]
  }
}
```

### Get Customer Psychology Profile

**Endpoint**: `GET /psychology/profile/{customerId}`

Retrieves the complete psychology profile for a customer.

#### Response
```json
{
  "success": true,
  "data": {
    "customer_id": "customer_123",
    "decision_fatigue_score": 45,
    "optimal_choice_count": 7,
    "emotional_triggers": [
      {
        "trigger_type": "quality",
        "intensity": 8,
        "context": ["durability", "craftsmanship"],
        "messaging_approach": "Emphasize superior materials and construction"
      }
    ],
    "behavioral_patterns": [
      {
        "pattern_type": "browsing",
        "frequency": "methodical",
        "indicators": ["detailed_comparison"],
        "optimization_strategy": "provide_comprehensive_information"
      }
    ],
    "recovery_timing": 5,
    "risk_level": "low",
    "last_updated": "2023-12-01T10:30:00.000Z"
  }
}
```

### Get Personalization Recommendations

**Endpoint**: `POST /psychology/personalization`

Get personalized recommendations based on customer psychology profile.

#### Request Body
```json
{
  "customer_id": "customer_123",
  "context": {
    "session_duration": 1200000,
    "choices_viewed": 30,
    "page_type": "product_listing",
    "time_of_day": "evening"
  }
}
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "adjustment_type": "choice_reduction",
      "specific_action": "Limit options to 5 items per category",
      "expected_impact": "Reduce cognitive load and improve decision quality"
    },
    {
      "adjustment_type": "messaging_change",
      "specific_action": "Emphasize quality messaging",
      "expected_impact": "Appeal to primary emotional trigger"
    }
  ]
}
```

## Career Intelligence

The Career Intelligence service analyzes professional trajectory and provides wardrobe recommendations based on career stage and advancement probability.

### Analyze Career Trajectory

**Endpoint**: `POST /career/analyze`

Analyzes career trajectory and provides wardrobe investment strategy.

#### Request Body
```json
{
  "customer_id": "customer_123",
  "current_role": "Senior Analyst",
  "industry": "Finance",
  "age_range": "30-35",
  "experience_years": 8,
  "recent_behaviors": [
    {
      "behavior_type": "wardrobe_upgrade",
      "frequency": "recent",
      "indicators": ["premium_suit_inquiry"],
      "context": "career_advancement"
    },
    {
      "behavior_type": "networking",
      "frequency": "increased",
      "indicators": ["industry_events"],
      "context": "professional_development"
    }
  ]
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Unique customer identifier |
| `current_role` | string | Yes | Current job title/role |
| `industry` | string | Yes | Industry sector |
| `age_range` | string | Yes | Age range (e.g., "30-35") |
| `experience_years` | number | Yes | Years of professional experience |
| `recent_behaviors` | array | Yes | Array of recent behavior indicators |

#### Response
```json
{
  "success": true,
  "data": {
    "advancement_probability": 75,
    "predicted_timeline": {
      "next_milestone": "Director level",
      "estimated_months": 12,
      "confidence_level": 75,
      "key_indicators": [
        "Strong advancement signals detected",
        "Investment in professional image"
      ]
    },
    "wardrobe_recommendations": [
      {
        "item_type": "Executive Business Suit",
        "priority": 9,
        "timing": "Next 3 months",
        "reasoning": "High advancement probability requires elevated professional image",
        "budget_range": "$800-2000"
      }
    ],
    "investment_strategy": {
      "immediate_needs": [
        "Executive-level business suits",
        "Premium accessories collection"
      ],
      "medium_term_goals": [
        "Build complete C-suite wardrobe",
        "Develop signature professional style"
      ],
      "long_term_vision": "Complete executive wardrobe that projects authority and success",
      "budget_allocation": {
        "suits": 60,
        "shirts": 20,
        "accessories": 15,
        "shoes": 5
      }
    },
    "promotion_signals": [
      {
        "signal_type": "wardrobe_upgrade",
        "strength": 8,
        "time_horizon": "3-6 months",
        "recommended_actions": [
          "Complete professional wardrobe assessment",
          "Invest in executive-level pieces"
        ]
      }
    ]
  }
}
```

### Get Career Stage Preferences

**Endpoint**: `GET /career/preferences/{stage}/{industry}`

Get styling preferences for specific career stage and industry.

#### Parameters
- `stage`: Career stage (entry_level, establishing, advancing, leadership, executive)
- `industry`: Industry name (e.g., "Finance", "Technology")

#### Response
```json
{
  "success": true,
  "data": {
    "stage_info": {
      "stage": "advancing",
      "age_range": "32-45",
      "typical_wardrobe_needs": ["Premium suits", "Executive shirts", "Luxury accessories"],
      "investment_focus": ["Status signaling", "Industry leadership", "Premium quality"],
      "style_evolution": "Establishing authority"
    },
    "professional_preferences": {
      "preferred_cut": "Sharp, tailored",
      "fit_style": "Modern executive",
      "colors": ["Navy", "Charcoal", "Black"],
      "key_principle": "Executive presence and financial success"
    },
    "wardrobe_focus": ["Authority signaling", "Premium quality", "Industry leadership"],
    "investment_priorities": ["Premium suits", "Executive accessories", "Signature pieces"]
  }
}
```

### Get Industry Recommendations

**Endpoint**: `GET /career/industry/{industry}/{roleLevel}`

Get industry-specific styling recommendations.

#### Response
```json
{
  "success": true,
  "data": {
    "colors": ["Navy", "Charcoal", "Black"],
    "styles": ["Sharp, tailored", "Modern executive"],
    "avoid": ["Casual elements", "Bold patterns"],
    "key_principles": ["Executive presence and financial success"],
    "body_language_goals": ["Authority", "Precision", "Success"]
  }
}
```

### Optimize Wardrobe Timing

**Endpoint**: `POST /career/timing`

Optimize wardrobe investment timing based on career trajectory.

#### Request Body
```json
{
  "customer_id": "customer_123",
  "current_trajectory": {
    "customer_id": "customer_123",
    "current_role": "Manager",
    "target_role": "Director",
    "timeline_months": 12,
    "wardrobe_investment_pattern": {
      "budget_range": "$1000-3000",
      "frequency": "quarterly",
      "priorities": ["suits", "accessories"]
    },
    "advancement_indicators": ["performance_reviews", "leadership_roles"],
    "industry_context": "Finance"
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "immediate_needs": [
      {
        "item_type": "Primary Business Suit",
        "priority": 10,
        "timing": "Within 2 weeks",
        "reasoning": "Immediate professional image requirements",
        "budget_range": "$1000-3000"
      }
    ],
    "upcoming_needs": [
      {
        "item_type": "Secondary Business Suit",
        "priority": 8,
        "timing": "Next 2-3 months",
        "reasoning": "Building professional wardrobe foundation",
        "budget_range": "$1000-3000"
      }
    ],
    "future_planning": [
      {
        "item_type": "Executive Upgrade Package",
        "priority": 6,
        "timing": "Next 6-12 months",
        "reasoning": "Preparing for career advancement",
        "budget_range": "Premium tier"
      }
    ],
    "budget_timeline": {
      "immediate": 800,
      "3_months": 600,
      "6_months": 400,
      "12_months": 200
    }
  }
}
```

## Venue Intelligence

The Venue Intelligence service optimizes styling recommendations based on venue conditions, lighting, and photography requirements.

### Optimize for Venue

**Endpoint**: `POST /venue/optimize`

Optimize styling recommendations for specific venue conditions.

#### Request Body
```json
{
  "venue_type": "church",
  "lighting_conditions": {
    "natural_light": "stained_glass_filtered",
    "artificial_light": "warm_tungsten",
    "color_temperature": "2700K",
    "intensity": "medium_low"
  },
  "season": "fall",
  "time_of_day": "afternoon",
  "photography_requirements": {
    "flash_allowed": false,
    "key_shots": ["ceremony", "group_photos"],
    "lighting_priority": "natural_preference"
  }
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `venue_type` | string | Yes | Type of venue (church, outdoor_garden, hotel_ballroom, etc.) |
| `lighting_conditions` | object | Yes | Detailed lighting conditions |
| `season` | string | Yes | Season (spring, summer, fall, winter) |
| `time_of_day` | string | No | Time of day for the event |
| `photography_requirements` | object | No | Photography-specific requirements |

#### Response
```json
{
  "success": true,
  "data": {
    "venue_intelligence": {
      "lighting_conditions": {
        "natural_light": "stained_glass_filtered",
        "artificial_light": "warm_tungsten",
        "color_temperature": "2700K",
        "intensity": "medium_low"
      },
      "color_preferences": {
        "recommended": ["Navy", "Charcoal", "Deep_Gray"],
        "avoid": ["Bright_Colors", "Flashy_Patterns"],
        "cultural_significance": {
          "Navy": "Respect and solemnity",
          "Black": "Traditional formal"
        }
      },
      "unspoken_rules": [
        {
          "rule_category": "Respect",
          "specific_guideline": "Conservative styling required",
          "violation_risk": "high",
          "cultural_context": "Religious reverence"
        }
      ]
    },
    "color_recommendations": {
      "recommended_colors": ["Navy", "Charcoal", "Deep_Gray"],
      "avoid_colors": ["Bright_Colors", "Flashy_Patterns"],
      "reasoning": [
        "Conservative venue requirements",
        "Warm tungsten lighting optimization",
        "Religious setting appropriateness"
      ]
    },
    "fabric_recommendations": {
      "recommended_fabrics": ["Wool", "Cotton_Blend"],
      "avoid_fabrics": ["Shiny_Materials", "Loud_Textures"],
      "seasonal_adjustments": [
        "Fall-appropriate weights",
        "Heavier wools for church interior"
      ]
    },
    "style_adjustments": [
      "Conservative styling required",
      "Minimal pattern preferences",
      "Traditional formal approach"
    ],
    "confidence_score": 85,
    "potential_issues": [
      "Stained glass may create color cast in photos",
      "Low light may affect fabric texture visibility"
    ],
    "photography_tips": [
      "Use natural light from windows",
      "Avoid flash during ceremony",
      "Position near stained glass for color enhancement"
    ]
  }
}
```

### Get Venue Intelligence

**Endpoint**: `GET /venue/info/{venueType}`

Get detailed intelligence for a specific venue type.

#### Response
```json
{
  "success": true,
  "data": {
    "lighting_conditions": {
      "natural_light": "stained_glass_filtered",
      "artificial_light": "warm_tungsten",
      "color_temperature": "2700K",
      "intensity": "medium_low"
    },
    "color_preferences": {
      "recommended": ["Navy", "Charcoal", "Deep_Gray"],
      "avoid": ["Bright_Colors", "Flashy_Patterns"]
    },
    "fabric_recommendations": {
      "preferred": ["Wool", "Cotton_Blend"],
      "avoid": ["Shiny_Materials", "Loud_Textures"]
    }
  }
}
```

### Analyze Lighting Conditions

**Endpoint**: `POST /venue/lighting/analyze`

Analyze specific lighting conditions and provide recommendations.

#### Request Body
```json
{
  "natural_light": "direct_sunlight",
  "artificial_light": "LED_cool",
  "color_temperature": "6500K",
  "intensity": "high"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "analysis": {
      "lighting_type": "Cool daylight",
      "color_rendering": "Excellent",
      "photography_suitability": "Very good"
    },
    "recommendations": [
      "Colors will appear true to daylight standards",
      "Excellent for photography without flash",
      "Cool tones will be enhanced"
    ],
    "color_adjustments": [
      "Warm colors may appear muted",
      "Cool colors will be vibrant",
      "Consider warmer fabric choices to balance"
    ]
  }
}
```

## Cultural Adaptation Intelligence

The Cultural Adaptation service adapts styling recommendations based on cultural context, regional preferences, and sensitivity requirements.

### Adapt Recommendations

**Endpoint**: `POST /cultural/adapt`

Adapt styling recommendations for cultural context.

#### Request Body
```json
{
  "base_recommendations": [
    {
      "item_type": "Business Suit",
      "color": "Charcoal Gray",
      "fabric": "Wool",
      "style_details": "Modern fit, two-button",
      "seasonal_appropriateness": "Fall/Winter",
      "formality_level": "Business Professional",
      "confidence_score": 85,
      "reasoning": ["Versatile business color", "Professional appearance"]
    }
  ],
  "cultural_context": {
    "primary_culture": "American_Midwest",
    "business_context": "Automotive_Industry",
    "religious_considerations": ["Christianity"],
    "regional_preferences": "Detroit_Area",
    "generation": "Millennial"
  },
  "specific_region": "Detroit",
  "sensitivity_level": "high",
  "occasion_type": "business_meeting"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `base_recommendations` | array | Yes | Array of base styling recommendations to adapt |
| `cultural_context` | object | Yes | Cultural context information |
| `specific_region` | string | No | Specific geographic region |
| `sensitivity_level` | string | Yes | Cultural sensitivity level (low, medium, high) |
| `occasion_type` | string | No | Type of occasion or event |

#### Response
```json
{
  "success": true,
  "data": {
    "adapted_recommendations": [
      {
        "item_type": "Business Suit",
        "color": "Navy Blue",
        "fabric": "Wool",
        "style_details": "Modern fit, practical styling",
        "seasonal_appropriateness": "Fall/Winter",
        "formality_level": "Business Professional",
        "confidence_score": 90,
        "reasoning": [
          "Navy aligns with Detroit automotive heritage",
          "Practical styling preferred in Midwest business culture",
          "Professional appearance with regional sensitivity"
        ],
        "cultural_adaptations": [
          "Color changed to Navy for Detroit automotive heritage alignment",
          "Style emphasizes practicality over fashion-forward elements"
        ]
      }
    ],
    "cultural_insights": [
      "Detroit business culture values practicality and American heritage",
      "Automotive industry prefers function over flash in professional attire",
      "Midwest professionals appreciate quality and durability messaging"
    ],
    "sensitivity_warnings": [],
    "local_preferences": {
      "color_preferences": {
        "preferred_colors": ["Navy", "Charcoal", "Deep_Blue"],
        "avoid_colors": ["Bright_Pink", "Neon_Colors"],
        "cultural_significance": {
          "Blue": "Trust and stability - Detroit automotive heritage"
        }
      },
      "business_culture": {
        "industry_focus": "Automotive, manufacturing, healthcare",
        "networking_style": "Direct and practical",
        "dress_expectations": "Professional but not overly flashy"
      }
    },
    "adaptation_confidence": 85
  }
}
```

### Get Cultural Nuances

**Endpoint**: `GET /cultural/nuances/{region}`

Get cultural nuances for a specific region.

#### Response
```json
{
  "success": true,
  "data": {
    "color_preferences": {
      "preferred_colors": ["Navy", "Charcoal", "Deep_Blue"],
      "avoid_colors": ["Bright_Pink", "Neon_Colors"],
      "cultural_significance": {
        "Blue": "Trust and stability - Detroit automotive heritage",
        "Red": "Passion but use sparingly - sports team associations"
      }
    },
    "style_variations": {
      "business_casual": "More relaxed than coastal cities",
      "formal_wear": "Classic American business style",
      "seasonal_adaptations": {
        "winter": "Heavy emphasis on warmth and practicality",
        "summer": "Breathable fabrics essential due to humidity"
      }
    },
    "business_culture": {
      "industry_focus": "Automotive, manufacturing, healthcare",
      "networking_style": "Direct and practical",
      "dress_expectations": "Professional but not overly flashy"
    }
  }
}
```

### Analyze Color Significance

**Endpoint**: `POST /cultural/color/analyze`

Analyze cultural significance of colors in specific context.

#### Request Body
```json
{
  "color": "Navy",
  "cultural_context": {
    "primary_culture": "American_Business",
    "business_context": "Finance",
    "regional_preferences": "Northeast_US"
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "color": "Navy",
    "cultural_meanings": [
      "Trust and authority in American business culture",
      "Professional standard in finance industry",
      "Conservative choice appropriate for Northeast business"
    ],
    "appropriateness_score": 95,
    "usage_recommendations": [
      "Excellent for business meetings",
      "Safe choice for first impressions",
      "Pairs well with traditional accessories"
    ],
    "potential_issues": []
  }
}
```

## Error Handling

All API endpoints use consistent error response formats.

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "error_code": "SPECIFIC_ERROR_CODE",
  "details": {
    "field": "specific_field_if_applicable",
    "value": "provided_value",
    "expected": "expected_format_or_value"
  },
  "timestamp": "2023-12-01T10:30:00.000Z",
  "request_id": "req_123456789"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | Invalid or missing API key |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `SERVICE_UNAVAILABLE` | 503 | Intelligence service temporarily unavailable |
| `INSUFFICIENT_DATA` | 422 | Not enough data to provide reliable recommendations |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Example Error Responses

#### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "customer_id",
    "value": "",
    "expected": "non-empty string"
  }
}
```

#### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "15 minutes",
    "retry_after": 300
  }
}
```

## Rate Limiting

API requests are rate-limited to ensure service availability and fair usage.

### Rate Limits
- **Standard**: 100 requests per 15 minutes per API key
- **Burst**: 20 requests per minute for short bursts
- **Premium**: Higher limits available with premium plans

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 900
```

### Handling Rate Limits
```javascript
// Example: Handling rate limits in JavaScript
async function makeAPIRequest(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited. Retry after ${retryAfter} seconds`);
      // Implement retry logic with exponential backoff
      return;
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
  }
}
```

## Response Formats

### Success Response Format
```json
{
  "success": true,
  "data": {
    // Response data specific to endpoint
  },
  "metadata": {
    "processing_time_ms": 150,
    "cache_hit": true,
    "confidence_score": 85,
    "timestamp": "2023-12-01T10:30:00.000Z"
  }
}
```

### Pagination (for list endpoints)
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### Health Check Response
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "psychology": {
      "status": "healthy",
      "response_time_ms": 45,
      "data_loaded": true
    },
    "career": {
      "status": "healthy",
      "response_time_ms": 38,
      "data_loaded": true
    },
    "venue": {
      "status": "healthy",
      "response_time_ms": 52,
      "data_loaded": true
    },
    "cultural": {
      "status": "healthy",
      "response_time_ms": 41,
      "data_loaded": true
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const KCTIntelligenceAPI = require('@kct/intelligence-api');

const client = new KCTIntelligenceAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.kctmenswear.com/api/v1/intelligence'
});

// Analyze customer psychology
const psychologyResult = await client.psychology.analyze({
  customer_id: 'customer_123',
  session_duration: 900000,
  choices_viewed: 25,
  page_views: 12
});

// Analyze career trajectory
const careerResult = await client.career.analyze({
  customer_id: 'customer_123',
  current_role: 'Senior Analyst',
  industry: 'Finance',
  age_range: '30-35',
  experience_years: 8,
  recent_behaviors: []
});
```

### Python
```python
from kct_intelligence_api import KCTIntelligenceClient

client = KCTIntelligenceClient(
    api_key='your-api-key',
    base_url='https://api.kctmenswear.com/api/v1/intelligence'
)

# Analyze customer psychology
psychology_result = client.psychology.analyze({
    'customer_id': 'customer_123',
    'session_duration': 900000,
    'choices_viewed': 25,
    'page_views': 12
})

# Optimize for venue
venue_result = client.venue.optimize({
    'venue_type': 'church',
    'lighting_conditions': {
        'natural_light': 'stained_glass_filtered',
        'artificial_light': 'warm_tungsten',
        'color_temperature': '2700K',
        'intensity': 'medium_low'
    },
    'season': 'fall'
})
```

---

## Support

For API support, questions, or feature requests:

- **Documentation**: [https://docs.kctmenswear.com](https://docs.kctmenswear.com)
- **Support Email**: api-support@kctmenswear.com
- **Status Page**: [https://status.kctmenswear.com](https://status.kctmenswear.com)

### API Versioning
- Current version: v1.0.0
- Version format: Semantic versioning (MAJOR.MINOR.PATCH)
- Deprecation policy: 12 months notice for breaking changes

### Terms of Use
By using the KCT Knowledge API Intelligence Services, you agree to our [Terms of Service](https://kctmenswear.com/terms) and [Privacy Policy](https://kctmenswear.com/privacy).