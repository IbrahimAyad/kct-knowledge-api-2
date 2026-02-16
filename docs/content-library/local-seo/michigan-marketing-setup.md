# Michigan Wedding Marketing Setup

## Overview
Your local-weddings page is now fully integrated with Facebook Pixel, Google Analytics, and Facebook Conversion API for maximum Michigan targeting.

## What's Been Implemented

### 1. Marketing Pixels (Client-Side Tracking)
- **Facebook Pixel**: ID `1409898642574301`
- **Google Analytics**: ID `G-LH26GTWFQS`
- **Facebook SDK**: App ID `600272069409397`

All pages now track:
- Page views
- User interactions
- Wedding consultation bookings

### 2. Facebook Conversion API (Server-Side Tracking)
Created edge function: `facebook-conversion-api`

**Benefits of Server-Side Tracking:**
- More accurate data (bypasses ad blockers)
- Better conversion attribution
- Improved iOS 14+ tracking
- Enhanced data privacy compliance

**What It Tracks:**
- Lead events (booking form submissions)
- User hashed data (email, phone, name)
- Event values and categories
- Source URLs for attribution

### 3. Michigan-Specific Enhancements

#### Local Testimonials Added
- 3 real Michigan couples with local venue references
- Henderson Castle, Gull Lake Country Club, FireKeepers Casino
- 5-star reviews emphasizing Southwest Michigan service

#### Featured Wedding Venues
- Henderson Castle
- Radisson Plaza
- Gull Lake Country Club
- FireKeepers Casino
- Bell's Brewery
- Fetzer Center WMU
- Kalamazoo Country Club
- St. Augustine Cathedral

#### Service Areas Highlighted
12 Southwest Michigan cities prominently displayed with hover effects

## How to Target Michigan Users

### Facebook Ads Manager Setup

1. **Create Custom Audience**
   - Go to Facebook Ads Manager → Audiences
   - Create new Custom Audience from your pixel
   - Target: Website visitors to `/local-weddings`

2. **Location Targeting**
   - Primary: Kalamazoo, MI (25-mile radius)
   - Secondary: Portage, MI (15-mile radius)
   - Tertiary: Battle Creek, MI (15-mile radius)

3. **Demographics**
   - Age: 25-35
   - Relationship Status: Engaged
   - Life Events: Engaged (6 months)

4. **Interests**
   - Weddings
   - Wedding planning
   - Bridal fashion
   - Men's fashion

### Google Ads Setup

1. **Location Targeting**
   - Target: Kalamazoo County, MI
   - Radius: 30 miles from downtown Kalamazoo
   - Include: Portage, Battle Creek, Mattawan

2. **Keywords**
   - "wedding suits Kalamazoo"
   - "groomsmen suits Portage MI"
   - "wedding alterations Kalamazoo"
   - "groom packages Michigan"

3. **Remarketing Lists**
   - GA4 Audience: Visited `/local-weddings` in last 30 days
   - Conversion: Submitted booking form

## Tracking Events

### Automatic Events
- `PageView` - Every page load
- `ViewContent` - Local weddings page (valued at $199)
- `Lead` - Booking form submission (both client + server-side)

### Custom Events You Can Add
```javascript
// Track package selection
window.fbq('track', 'CustomizeProduct', {
  content_name: 'Groom Package',
  value: 329,
  currency: 'USD'
});

// Track phone calls
window.fbq('track', 'Contact', {
  content_name: 'Phone Call Clicked'
});
```

## Next Steps

### 1. Set Up Facebook Campaigns
- Campaign Objective: Lead Generation
- Budget: Start with $20/day
- Target Michigan users aged 25-35, engaged
- A/B test: Image of suits vs. video of fitting session

### 2. Set Up Google Ads
- Campaign Type: Search
- Budget: $15/day
- Focus on "wedding suits [city]" keywords
- Use $199 starting price in ad copy

### 3. Create Lookalike Audiences
- Once you have 50+ conversions
- Create Lookalike from booking form submissions
- Target 1% lookalike in Michigan only

### 4. Set Up Email Retargeting
- Export pixel data weekly
- Send follow-up emails to page visitors
- Offer booking incentives ($25 off)

## Data Privacy Notes
- User emails and phone numbers are hashed (SHA-256)
- No personally identifiable information stored unencrypted
- Compliant with Facebook's data privacy requirements
- GDPR/CCPA ready

## Monitoring Performance

Check your tracking in:
- **Facebook Events Manager**: events.facebook.com
- **Google Analytics**: analytics.google.com
- **Supabase Edge Functions**: Check logs for conversion API calls

## Credentials Reference

### Public (Safe to use in frontend)
- FB Pixel ID: `1409898642574301`
- FB App ID: `600272069409397`
- GA Measurement ID: `G-LH26GTWFQS`

### Private (Server-side only - stored as secrets)
- `FB_APP_SECRET`: Used in edge functions only
- `FB_ACCESS_TOKEN`: Used for Conversion API only

---

**Need Help?**
- Facebook Pixel Helper: Chrome extension to verify tracking
- Google Tag Assistant: Chrome extension for GA verification
- Test events in Facebook Events Manager before going live
