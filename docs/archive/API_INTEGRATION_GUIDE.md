# KCT Knowledge API Integration Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Core Concepts](#core-concepts)
4. [API Endpoints](#api-endpoints)
5. [Integration Examples](#integration-examples)
6. [Best Practices](#best-practices)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Webhooks](#webhooks)
10. [SDKs and Libraries](#sdks-and-libraries)
11. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Get Your API Key

```bash
# Contact KCT API Support to obtain your API key
# Email: api-support@kctmenswear.com
# Or visit: https://api.kctmenswear.com/signup
```

### 2. Make Your First Request

```bash
curl -X GET "https://api.kctmenswear.com/v2/colors" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json"
```

### 3. Test Outfit Validation

```bash
curl -X POST "https://api.kctmenswear.com/v2/combinations/validate" \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "suit_color": "navy",
    "shirt_color": "white", 
    "tie_color": "burgundy",
    "occasion": "business_formal"
  }'
```

## Authentication

The KCT Knowledge API uses API key authentication via the `X-API-Key` header.

### API Key Management

```javascript
// Store your API key securely
const API_KEY = process.env.KCT_API_KEY;

// Include in all requests
const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};
```

### Security Best Practices

- **Never expose API keys in frontend code**
- **Use environment variables for API keys**
- **Rotate API keys regularly**
- **Implement API key validation on your backend**

```javascript
// ✅ Good - Backend implementation
const apiKey = process.env.KCT_API_KEY;

// ❌ Bad - Frontend exposure  
const apiKey = 'your_api_key_here'; // Never do this!
```

## Core Concepts

### Validation Confidence Scoring

All validation results include confidence scores (0-1 scale):

- **0.9-1.0**: Excellent/Perfect match
- **0.8-0.89**: Very good choice
- **0.7-0.79**: Good combination
- **0.6-0.69**: Acceptable but improvable
- **0.0-0.59**: Poor choice, needs adjustment

### Severity Levels

- **success**: Excellent choice, no issues
- **info**: Informational feedback
- **low**: Minor improvements suggested
- **medium**: Noticeable issues, adjustment recommended
- **high**: Significant problems, changes needed
- **critical**: Fundamental fashion rule violations

### Formality Scale

1-10 scale where:
- **10**: White tie (most formal)
- **9**: Black tie
- **8**: Black tie optional
- **7**: Formal business
- **6**: Cocktail
- **5**: Business casual
- **4**: Smart casual
- **3**: Casual Friday
- **2**: Weekend casual
- **1**: Beach casual (least formal)

## API Endpoints

### Colors API

#### Get All Colors
```javascript
const response = await fetch('https://api.kctmenswear.com/v2/colors', {
  headers: { 'X-API-Key': API_KEY }
});

const { data } = await response.json();
// Access color families, universal rules, trending colors
```

#### Get Color Relationships
```javascript
const getColorMatches = async (color) => {
  const response = await fetch(`https://api.kctmenswear.com/v2/colors/${color}/relationships`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  const { data } = await response.json();
  return {
    perfectMatches: data.relationships.perfect_matches,
    goodMatches: data.relationships.good_matches,
    confidence: data.confidence_scores.overall_confidence
  };
};
```

### Validation API

#### Comprehensive Outfit Validation
```javascript
const validateOutfit = async (combination) => {
  const response = await fetch('https://api.kctmenswear.com/v2/combinations/validate', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      suit_color: combination.suit,
      shirt_color: combination.shirt,
      tie_color: combination.tie,
      occasion: combination.occasion,
      season: combination.season,
      venue_type: combination.venue,
      customer_profile: combination.profile
    })
  });

  const { data } = await response.json();
  
  return {
    score: data.overall_score,
    passed: data.validation_passed,
    violations: data.violations,
    suggestions: data.improvement_suggestions,
    alternatives: data.alternatives
  };
};
```

#### Quick Rule Check
```javascript
const checkFashionRules = async (combination, context) => {
  const response = await fetch('https://api.kctmenswear.com/v2/rules/check', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ combination, context })
  });

  const { data } = await response.json();
  return {
    passed: data.validation_passed,
    score: data.overall_score,
    violations: data.violations,
    recommendations: data.recommendations
  };
};
```

### Recommendations API

#### Get AI-Powered Recommendations
```javascript
const getRecommendations = async (preferences) => {
  const response = await fetch('https://api.kctmenswear.com/v2/recommendations', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      suit_color: preferences.suitColor,
      customer_profile: preferences.profile,
      occasion: preferences.occasion,
      season: preferences.season,
      formality_level: preferences.formalityLevel,
      age: preferences.age,
      occupation: preferences.occupation
    })
  });

  const { data } = await response.json();
  
  return {
    primary: data.primary_recommendations,
    alternatives: data.alternative_options,
    insights: data.style_insights,
    upsells: data.upsell_opportunities
  };
};
```

### Trending API

#### Get Current Trends
```javascript
const getTrendingData = async (timeframe = '30d', limit = 10) => {
  const response = await fetch(
    `https://api.kctmenswear.com/v2/trending?timeframe=${timeframe}&limit=${limit}`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  const { data } = await response.json();
  
  return {
    combinations: data.trending_combinations,
    colors: data.color_trends,
    seasonal: data.seasonal_trends,
    demographics: data.demographic_insights
  };
};
```

## Integration Examples

### E-commerce Product Recommendations

```javascript
class OutfitRecommendationEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.kctmenswear.com/v2';
  }

  async getProductRecommendations(productId, customerProfile) {
    try {
      // Get product details
      const product = await this.getProduct(productId);
      
      // Get recommendations based on product color
      const recommendations = await this.callKCTAPI('/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          suit_color: product.color,
          customer_profile: customerProfile.styleProfile,
          occasion: customerProfile.primaryOccasion,
          season: this.getCurrentSeason(),
          age: customerProfile.age,
          occupation: customerProfile.occupation
        })
      });

      // Transform recommendations to product suggestions
      return this.transformToProductSuggestions(recommendations.data);
      
    } catch (error) {
      console.error('Recommendation error:', error);
      return this.getFallbackRecommendations(productId);
    }
  }

  async validateCustomerSelection(items) {
    const combination = this.extractCombination(items);
    
    const validation = await this.callKCTAPI('/combinations/validate', {
      method: 'POST', 
      body: JSON.stringify(combination)
    });

    return {
      isValid: validation.data.validation_passed,
      score: validation.data.overall_score,
      feedback: this.formatFeedback(validation.data),
      improvements: validation.data.improvement_suggestions
    };
  }

  async callKCTAPI(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  transformToProductSuggestions(recommendations) {
    return recommendations.primary_recommendations.map(rec => ({
      type: 'complete_outfit',
      confidence: rec.ai_confidence,
      items: [
        { category: 'suit', color: rec.suit_color, priority: 1 },
        { category: 'shirt', color: rec.shirt_color, priority: 2 },
        { category: 'tie', color: rec.tie_color, priority: 3 }
      ],
      reasoning: rec.reasoning,
      occasion_fit: rec.occasion_appropriateness
    }));
  }

  formatFeedback(validationData) {
    const feedback = [];
    
    if (validationData.violations.length > 0) {
      feedback.push({
        type: 'error',
        messages: validationData.violations.map(v => v.message)
      });
    }

    if (validationData.warnings.length > 0) {
      feedback.push({
        type: 'warning',
        messages: validationData.warnings.map(w => w.message)
      });
    }

    if (validationData.suggestions.length > 0) {
      feedback.push({
        type: 'suggestion',
        messages: validationData.suggestions.map(s => s.message)
      });
    }

    return feedback;
  }
}

// Usage
const engine = new OutfitRecommendationEngine(process.env.KCT_API_KEY);

// Get recommendations for a navy suit
const recommendations = await engine.getProductRecommendations('navy-suit-123', {
  styleProfile: 'modern_adventurous',
  primaryOccasion: 'business_professional',
  age: 32,
  occupation: 'marketing_executive'
});

// Validate customer's outfit selection
const validation = await engine.validateCustomerSelection([
  { type: 'suit', color: 'navy' },
  { type: 'shirt', color: 'light_blue' },
  { type: 'tie', color: 'burgundy' }
]);
```

### Style Quiz Integration

```javascript
class StyleQuizIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.kctmenswear.com/v2';
  }

  async processQuizResults(quizAnswers) {
    // Determine style profile from quiz answers
    const styleProfile = this.mapQuizToProfile(quizAnswers);
    
    // Get style profile details from API
    const profileData = await this.getStyleProfile(styleProfile);
    
    // Generate personalized recommendations
    const recommendations = await this.getPersonalizedRecommendations(
      styleProfile, 
      quizAnswers
    );

    return {
      profile: {
        type: styleProfile,
        characteristics: profileData.characteristics,
        confidence: profileData.metadata.confidence
      },
      recommendations: recommendations.primary_recommendations,
      stylingTips: profileData.styling_tips,
      colorPalette: profileData.color_palette,
      shoppingGuide: profileData.shopping_guide
    };
  }

  async getStyleProfile(profileType) {
    const response = await fetch(
      `${this.baseUrl}/styles/${profileType}`,
      { headers: { 'X-API-Key': this.apiKey } }
    );
    
    const { data } = await response.json();
    return data;
  }

  async getPersonalizedRecommendations(profile, preferences) {
    const response = await fetch(`${this.baseUrl}/recommendations`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_profile: profile,
        occasion: preferences.primaryOccasion || 'business_professional',
        season: this.getCurrentSeason(),
        formality_level: preferences.formalityPreference || 7,
        age: preferences.age,
        occupation: preferences.occupation
      })
    });

    const { data } = await response.json();
    return data;
  }

  mapQuizToProfile(answers) {
    // Quiz logic to determine style profile
    const adventureScore = this.calculateAdventureScore(answers);
    const valueScore = this.calculateValueScore(answers);
    const qualityScore = this.calculateQualityScore(answers);

    if (qualityScore > 8) return 'luxury_connoisseur';
    if (valueScore > 7) return 'practical_value_seeker';
    if (adventureScore > 6) return 'modern_adventurous';
    return 'classic_conservative';
  }

  calculateAdventureScore(answers) {
    // Implementation based on quiz questions
    return answers.colorPreference === 'bold' ? 8 : 
           answers.colorPreference === 'classic' ? 4 : 6;
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
}

// Usage
const quiz = new StyleQuizIntegration(process.env.KCT_API_KEY);

const quizResults = await quiz.processQuizResults({
  colorPreference: 'contemporary',
  formalityPreference: 7,
  primaryOccasion: 'business_professional',
  age: 35,
  occupation: 'consultant',
  budgetRange: 'premium'
});
```

### Real-time Validation Widget

```javascript
class OutfitValidationWidget {
  constructor(containerId, apiKey) {
    this.container = document.getElementById(containerId);
    this.apiKey = apiKey;
    this.currentCombination = {};
    this.debounceTimer = null;
    
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
  }

  createWidget() {
    this.container.innerHTML = `
      <div class="outfit-validator">
        <div class="color-selectors">
          <div class="selector">
            <label>Suit Color:</label>
            <select id="suit-color">
              <option value="">Select...</option>
              <option value="navy">Navy</option>
              <option value="charcoal">Charcoal</option>
              <option value="light_grey">Light Grey</option>
              <option value="burgundy">Burgundy</option>
            </select>
          </div>
          
          <div class="selector">
            <label>Shirt Color:</label>
            <select id="shirt-color">
              <option value="">Select...</option>
              <option value="white">White</option>
              <option value="light_blue">Light Blue</option>
              <option value="pink">Pink</option>
            </select>
          </div>
          
          <div class="selector">
            <label>Tie Color:</label>
            <select id="tie-color">
              <option value="">Select...</option>
              <option value="burgundy">Burgundy</option>
              <option value="navy">Navy</option>
              <option value="silver">Silver</option>
            </select>
          </div>
        </div>
        
        <div id="validation-results" class="validation-results"></div>
      </div>
    `;
  }

  attachEventListeners() {
    ['suit-color', 'shirt-color', 'tie-color'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.updateCombination(id.replace('-', '_'), e.target.value);
      });
    });
  }

  updateCombination(key, value) {
    this.currentCombination[key] = value;
    
    // Debounce API calls
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.validateCombination();
    }, 500);
  }

  async validateCombination() {
    if (!this.isComplete()) {
      this.showIncompleteMessage();
      return;
    }

    this.showLoading();

    try {
      const validation = await this.callValidationAPI();
      this.displayResults(validation);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async callValidationAPI() {
    const response = await fetch('https://api.kctmenswear.com/v2/combinations/validate', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.currentCombination)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const { data } = await response.json();
    return data;
  }

  displayResults(validation) {
    const resultsContainer = document.getElementById('validation-results');
    
    const scoreClass = validation.overall_score >= 80 ? 'excellent' :
                      validation.overall_score >= 70 ? 'good' :
                      validation.overall_score >= 60 ? 'acceptable' : 'poor';

    resultsContainer.innerHTML = `
      <div class="validation-summary ${scoreClass}">
        <div class="score">
          <span class="score-value">${validation.overall_score}</span>
          <span class="score-label">Styling Score</span>
        </div>
        
        <div class="status ${validation.validation_passed ? 'passed' : 'failed'}">
          ${validation.validation_passed ? '✓ Great combination!' : '⚠ Needs improvement'}
        </div>
      </div>

      ${validation.violations.length > 0 ? `
        <div class="violations">
          <h4>Issues to Address:</h4>
          <ul>
            ${validation.violations.map(v => `<li>${v.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${validation.improvement_suggestions.length > 0 ? `
        <div class="suggestions">
          <h4>Suggestions:</h4>
          <ul>
            ${validation.improvement_suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${validation.alternatives.length > 0 ? `
        <div class="alternatives">
          <h4>Alternative Combinations:</h4>
          ${validation.alternatives.map(alt => `
            <div class="alternative">
              <div class="combination">
                ${alt.combination.suit_color} suit, 
                ${alt.combination.shirt_color} shirt, 
                ${alt.combination.tie_color} tie
              </div>
              <div class="reasoning">${alt.reasoning}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  isComplete() {
    return this.currentCombination.suit_color && 
           this.currentCombination.shirt_color && 
           this.currentCombination.tie_color;
  }

  showLoading() {
    document.getElementById('validation-results').innerHTML = 
      '<div class="loading">Validating combination...</div>';
  }

  showIncompleteMessage() {
    document.getElementById('validation-results').innerHTML = 
      '<div class="incomplete">Please select all three items to validate.</div>';
  }

  showError(message) {
    document.getElementById('validation-results').innerHTML = 
      `<div class="error">Error: ${message}</div>`;
  }
}

// Usage
const validator = new OutfitValidationWidget('validation-widget', 'your_api_key');
```

## Best Practices

### 1. Caching Strategy

```javascript
class KCTAPIClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes
  }

  async getWithCache(endpoint, params = {}) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await this.makeRequest(endpoint, params);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  async makeRequest(endpoint, params) {
    // Implementation
  }
}
```

### 2. Error Handling

```javascript
class APIErrorHandler {
  static handle(error, context = {}) {
    if (error.status === 401) {
      return this.handleUnauthorized(error, context);
    }
    
    if (error.status === 429) {
      return this.handleRateLimit(error, context);
    }
    
    if (error.status >= 500) {
      return this.handleServerError(error, context);
    }
    
    return this.handleGenericError(error, context);
  }

  static handleUnauthorized(error, context) {
    console.error('API Authentication failed:', error);
    // Refresh API key or redirect to auth
    return { error: 'Authentication required', retry: false };
  }

  static handleRateLimit(error, context) {
    const retryAfter = error.headers?.['retry-after'] || 60;
    console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    return { 
      error: 'Rate limit exceeded', 
      retry: true, 
      retryAfter: retryAfter * 1000 
    };
  }

  static handleServerError(error, context) {
    console.error('Server error:', error);
    return { 
      error: 'Service temporarily unavailable', 
      retry: true, 
      retryAfter: 5000 
    };
  }
}
```

### 3. Batch Processing

```javascript
class BatchProcessor {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.batchSize = options.batchSize || 10;
    this.concurrency = options.concurrency || 3;
  }

  async validateMultipleCombinations(combinations) {
    const batches = this.createBatches(combinations, this.batchSize);
    const results = [];

    for (const batch of batches) {
      const batchPromises = batch.map(combo => 
        this.validateSingleCombination(combo)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));
    }

    return results;
  }

  createBatches(array, size) {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }
}
```

### 4. Performance Monitoring

```javascript
class APIPerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      responseTimeHistory: []
    };
  }

  async trackRequest(apiCall) {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordError(Date.now() - startTime, error);
      throw error;
    }
  }

  recordSuccess(responseTime) {
    this.metrics.requestCount++;
    this.updateResponseTime(responseTime);
  }

  recordError(responseTime, error) {
    this.metrics.requestCount++;
    this.metrics.errorCount++;
    this.updateResponseTime(responseTime);
    
    console.error('API Error:', {
      error: error.message,
      responseTime,
      errorRate: this.metrics.errorCount / this.metrics.requestCount
    });
  }

  updateResponseTime(responseTime) {
    this.metrics.responseTimeHistory.push(responseTime);
    if (this.metrics.responseTimeHistory.length > 100) {
      this.metrics.responseTimeHistory.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.metrics.responseTimeHistory.reduce((a, b) => a + b, 0) / 
      this.metrics.responseTimeHistory.length;
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.errorCount / this.metrics.requestCount,
      successRate: (this.metrics.requestCount - this.metrics.errorCount) / this.metrics.requestCount
    };
  }
}
```

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request parameters and format |
| 401 | Unauthorized | Verify API key is correct and active |
| 403 | Forbidden | Check API key permissions |
| 404 | Not Found | Verify endpoint URL and resource exists |
| 429 | Rate Limited | Implement backoff and retry logic |
| 500 | Server Error | Retry request, contact support if persistent |

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": "suit_color, shirt_color, and tie_color are required",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Implementing Retry Logic

```javascript
class RetryableAPIClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
  }

  async makeRequestWithRetry(url, options = {}, retryCount = 0) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        const delay = this.calculateDelay(retryCount);
        await this.sleep(delay);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    // Retry on network errors or server errors (5xx)
    return !error.status || error.status >= 500;
  }

  calculateDelay(retryCount) {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Rate Limiting

### Rate Limit Headers

The API includes rate limiting information in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits

```javascript
class RateLimiter {
  constructor() {
    this.requests = [];
    this.windowMs = 60 * 60 * 1000; // 1 hour
  }

  async checkRateLimit(limit) {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    if (this.requests.length >= limit) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      throw new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
    }

    this.requests.push(now);
  }
}
```

## Webhooks

### Setting Up Webhooks

```javascript
// Express.js webhook handler
app.post('/webhooks/kct', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-kct-signature'];
  
  // Verify webhook signature
  if (!verifyWebhookSignature(payload, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  const event = JSON.parse(payload);
  
  switch (event.type) {
    case 'trend.updated':
      handleTrendUpdate(event.data);
      break;
      
    case 'validation.completed':
      handleValidationComplete(event.data);
      break;
      
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }
  
  res.status(200).send('OK');
});

function verifyWebhookSignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.KCT_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  return signature === `sha256=${expectedSignature}`;
}
```

## SDKs and Libraries

### Official JavaScript SDK

```bash
npm install @kct/knowledge-api-sdk
```

```javascript
import { KCTKnowledgeAPI } from '@kct/knowledge-api-sdk';

const client = new KCTKnowledgeAPI({
  apiKey: process.env.KCT_API_KEY,
  environment: 'production' // or 'staging'
});

// Validate outfit
const validation = await client.validateCombination({
  suit: 'navy',
  shirt: 'white',
  tie: 'burgundy',
  occasion: 'business_formal'
});

// Get recommendations
const recommendations = await client.getRecommendations({
  suitColor: 'navy',
  profile: 'modern_adventurous',
  occasion: 'cocktail'
});
```

### Python SDK

```bash
pip install kct-knowledge-api
```

```python
from kct_knowledge_api import KCTClient

client = KCTClient(api_key=os.environ['KCT_API_KEY'])

# Validate combination
validation = client.validate_combination(
    suit_color='navy',
    shirt_color='white',
    tie_color='burgundy',
    occasion='business_formal'
)

# Get trending data
trends = client.get_trending(timeframe='30d', limit=10)
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Check API key validity
curl -I -H "X-API-Key: your_api_key" https://api.kctmenswear.com/v2/health
```

#### 2. Slow Response Times
- Enable request/response compression
- Implement caching for frequently accessed data
- Use batch endpoints when available
- Monitor network latency

#### 3. Validation Inconsistencies
- Ensure all required parameters are provided
- Check parameter formats match API specification
- Verify enum values are correct
- Test with minimal viable parameters first

### Debug Mode

```javascript
const client = new KCTAPIClient(apiKey, { debug: true });

// This will log all requests and responses
client.debug = true;
```

### Support Channels

- **Documentation**: https://docs.kctmenswear.com/api
- **Email Support**: api-support@kctmenswear.com
- **Status Page**: https://status.kctmenswear.com
- **Community Forum**: https://community.kctmenswear.com/api
- **GitHub Issues**: https://github.com/kct-menswear/api-issues

### Health Monitoring

```javascript
// Check API health
const healthCheck = async () => {
  try {
    const response = await fetch('https://api.kctmenswear.com/v2/health');
    const health = await response.json();
    
    console.log('API Status:', health.status);
    console.log('Dependencies:', health.dependencies);
    
    return health.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
```

## Conclusion

The KCT Knowledge API provides powerful fashion intelligence capabilities for building sophisticated menswear applications. By following this integration guide and best practices, you can create reliable, performant applications that deliver exceptional styling experiences to your users.

For additional support or advanced integration scenarios, please contact our API support team at api-support@kctmenswear.com.

---

*Last Updated: January 15, 2024*
*API Version: 2.0.0*