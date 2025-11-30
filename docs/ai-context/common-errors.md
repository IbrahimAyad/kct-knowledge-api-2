# Common Errors & Troubleshooting Guide

## Table of Contents
1. [Supabase Errors](#supabase-errors)
2. [Shopify Integration Errors](#shopify-integration-errors)
3. [Edge Function Errors](#edge-function-errors)
4. [KCT Knowledge API Errors](#kct-knowledge-api-errors)
5. [Authentication Errors](#authentication-errors)
6. [Build & Deployment Errors](#build--deployment-errors)
7. [Analytics Errors](#analytics-errors)

---

## Supabase Errors

### Error: "Invalid API key"
**Symptom**: `{ "message": "Invalid API key" }`

**Causes**:
- Wrong `VITE_SUPABASE_PUBLISHABLE_KEY`
- Key doesn't match project
- Project URL mismatch

**Fix**:
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the "anon/public" key (NOT service_role)
3. Update `.env`: `VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."`
4. Restart dev server

**Reference**: Project ID is `gvcswimqaxvylgxbklbz`

---

### Error: "Row Level Security policy violation"
**Symptom**: `new row violates row-level security policy`

**Causes**:
- RLS enabled but no INSERT policy exists
- User not authenticated
- Policy doesn't match user's context

**Fix**:
```sql
-- Example: Allow authenticated users to insert their own data
CREATE POLICY "Users can insert own data"
ON table_name
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

**Debug**:
1. Check if user is logged in: `supabase.auth.getUser()`
2. View policies: Supabase Dashboard → Table Editor → Policies
3. Test query with service role key (bypasses RLS) to confirm data structure

---

### Error: "Connection pool timeout"
**Symptom**: Database queries hanging or timing out

**Causes**:
- Too many concurrent connections
- Unclosed connections in edge functions
- Database overload

**Fix**:
1. Check connection limit: Supabase Dashboard → Database → Connection Pooling
2. Use connection pooling URL in edge functions
3. Always close connections after use
4. Consider upgrading Supabase plan

---

## Shopify Integration Errors

### Error: "Access denied for access token"
**Symptom**: `{ "errors": "Access denied" }`

**Causes**:
- Missing Admin API scopes
- Wrong token type (using Storefront token for Admin API)
- Token expired or revoked

**Fix**:
1. Shopify Admin → Apps → [Your Custom App]
2. Admin API Access → Configure scopes
3. Required scopes:
   - `read_products`
   - `read_orders`
   - `read_customers`
   - `write_products` (if updating products)
4. Install app again to regenerate token
5. Update Supabase secret: `npx supabase secrets set SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxx`

**Important**: Frontend uses Storefront token, backend uses Admin token

---

### Error: "Storefront API throttled"
**Symptom**: `{ "errors": [{ "message": "Throttled" }] }`

**Causes**:
- Exceeded Shopify rate limits (default: 50 requests/second)
- Too many product queries at once

**Fix**:
1. Implement request batching
2. Use caching (TanStack Query has 5-minute cache)
3. Add exponential backoff retry logic
4. Upgrade Shopify plan for higher limits

```typescript
// Example retry logic
const fetchWithRetry = async (url, retries = 3) => {
  try {
    return await fetch(url);
  } catch (error) {
    if (retries > 0 && error.message.includes('Throttled')) {
      await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};
```

---

### Error: "Customer Account API not configured"
**Symptom**: Checkout button doesn't work, blank page on checkout

**Causes**:
- Customer Account API not enabled in Shopify
- Wrong `VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID`
- Redirect URLs not configured

**Fix**:
1. Shopify Admin → Settings → Customer Accounts → Enable "New customer accounts"
2. Shopify Admin → Apps → Customer Account API
3. Add your domain to allowed redirect URLs:
   - `https://your-domain.com/account/callback`
   - `http://localhost:8080/account/callback` (for dev)
4. Copy Client ID and update `.env`

---

## Edge Function Errors

### Error: "Function not found"
**Symptom**: `{ "message": "Function not found" }`

**Causes**:
- Function not deployed
- Wrong function name in `supabase.functions.invoke()`
- Deployment failed silently

**Fix**:
1. Check deployed functions: Supabase Dashboard → Edge Functions
2. Deploy function: `npx supabase functions deploy function-name`
3. View deployment logs for errors
4. Verify function name matches folder name in `supabase/functions/`

---

### Error: "Deno runtime error"
**Symptom**: Edge function returns 500 error

**Causes**:
- TypeScript compilation error
- Missing dependency import
- Environment variable not set

**Fix**:
1. View logs: Supabase Dashboard → Functions → [Function Name] → Logs
2. Check for common issues:
   ```typescript
   // ❌ Wrong - Node.js import
   import axios from 'axios';
   
   // ✅ Correct - Use native fetch or Deno imports
   const response = await fetch(url);
   ```
3. Verify secrets are set:
   ```bash
   npx supabase secrets list
   ```

**Debugging**:
```typescript
// Add logging to edge functions
console.log('Input:', JSON.stringify(req, null, 2));
console.log('Processing step 1...');
// Check logs after invocation
```

---

### Error: "CORS error in edge function"
**Symptom**: `Access to fetch blocked by CORS policy`

**Causes**:
- Missing CORS headers in function response
- OPTIONS preflight not handled

**Fix**:
```typescript
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Your function logic
    const data = await processRequest(req);
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
```

---

## KCT Knowledge API Errors

### Error: "Rate limit exceeded"
**Symptom**: `{ "success": false, "errorCode": "RATE_LIMIT_EXCEEDED" }`

**Causes**:
- Exceeded 300 requests per minute (API default)
- Multiple users making simultaneous requests

**Fix**:
1. Client automatically uses fallback data
2. Implement request debouncing on frontend:
   ```typescript
   const { data } = useQuery({
     queryKey: ['recommendations'],
     queryFn: fetchRecommendations,
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```
3. Contact API admin to increase rate limit tier

---

### Error: "Realtime data unavailable"
**Symptom**: Real-time analytics show "Unavailable"

**Causes**:
- GA4 Realtime API quota exceeded
- Service account permissions issue
- Normal behavior during low traffic

**Fix**:
- This is expected behavior - API automatically falls back to cached data
- Not an error, just unavailable real-time data
- Check Railway logs if persistent: `https://railway.app/project/[project-id]/service/[service-id]/logs`

---

### Error: "GA4 INVALID_ARGUMENT"
**Symptom**: `{ "error": "INVALID_ARGUMENT: Invalid property ID" }`

**Causes**:
- Using Stream ID instead of Property ID
- Wrong format for property ID

**Fix**:
1. ⚠️  **Critical**: Use Property ID, NOT Stream ID
   - Property ID format: `401822822` (just numbers)
   - Stream ID format: `G-XXXXXXXXX` (NOT this!)
2. Update in Railway: Environment Variables → `GA4_PROPERTY_ID=401822822`
3. Restart service after update

**How to find Property ID**:
- Google Analytics → Admin → Property Settings → Property ID (top of page)

---

## Authentication Errors

### Error: "Email not confirmed"
**Symptom**: User can't log in after signup

**Causes**:
- Email confirmation required but not completed
- Confirmation email not sent
- Email provider blocked Supabase

**Fix**:
1. Check email settings: Supabase Dashboard → Authentication → Email Templates
2. For development: Disable email confirmation
   - Authentication → Providers → Email → Disable "Confirm email"
3. For production: Check spam folder, whitelist `noreply@mail.supabase.io`
4. Manually confirm user: Auth → Users → [User] → Confirm email

---

### Error: "Invalid refresh token"
**Symptom**: User logged out unexpectedly

**Causes**:
- Refresh token expired (default: 7 days)
- Token invalidated by password change
- Multiple sessions conflict

**Fix**:
1. Implement auto-refresh:
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'TOKEN_REFRESHED') {
       console.log('Token refreshed');
     }
     if (event === 'SIGNED_OUT') {
       // Redirect to login
     }
   });
   ```
2. Increase token lifetime: Auth → Settings → JWT Expiry (max 604800 seconds / 7 days)
3. Handle sign-out gracefully in UI

---

## Build & Deployment Errors

### Error: "Module not found"
**Symptom**: `Cannot find module '@/components/...'`

**Causes**:
- Missing import
- Typo in import path
- File moved/renamed

**Fix**:
1. Check file exists at path
2. Verify `tsconfig.json` path alias:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
3. Restart dev server

---

### Error: "Type error in production build"
**Symptom**: Build fails with TypeScript errors

**Causes**:
- Strict type checking in production
- Missing type definitions
- Type mismatch in props

**Fix**:
1. Run `npm run build` locally to catch errors
2. Fix type errors:
   ```typescript
   // ❌ Wrong
   const value: string = data.value;
   
   // ✅ Correct
   const value = data.value as string;
   // or
   const value: string | undefined = data.value;
   ```
3. Update Supabase types: Types are auto-generated from database

---

## Analytics Errors

### Error: "Today's Sessions shows 0"
**Symptom**: Analytics card always shows 0

**Causes**:
- No traffic to site
- Analytics not tracking properly
- API returning wrong date range

**Fix**:
1. Test by visiting site yourself
2. Check API response:
   ```bash
   curl "https://kct-knowledge-api-2-production.up.railway.app/api/analytics/dashboard?days=1"
   ```
3. Verify GA4 is receiving data: Google Analytics → Reports → Realtime
4. Check date calculations in API code (timezone issues)

---

### Error: "Total Sales shows incorrect amount"
**Symptom**: Sales numbers don't match Shopify

**Causes**:
- Currency conversion issues
- Test orders included
- Partial refunds not accounted for
- Data sync delay

**Fix**:
1. Check Shopify data source:
   - API returns orders from last 7 days
   - Verify order status filters (only "paid" orders counted)
2. Compare with Shopify: Admin → Analytics → Total Sales
3. Check for test orders: Filter out orders with `test: true`
4. Wait for sync: API may cache for 30 minutes

---

## General Debugging Tips

### Check Logs
1. **Browser Console**: `F12` → Console tab
2. **Network Tab**: `F12` → Network tab (filter by Fetch/XHR)
3. **Supabase Logs**: Dashboard → Logs (Database, Auth, Functions)
4. **Railway Logs**: Railway dashboard → Deployments → Logs

### Test Isolation
1. **Reproduce in incognito** to rule out cache
2. **Test API directly** via Postman/curl
3. **Check with service role key** to bypass RLS
4. **Reduce to minimal example** to identify root cause

### Get Help
1. **Lovable Community**: [Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
2. **Supabase Support**: https://supabase.com/support
3. **Shopify Dev Forum**: https://community.shopify.com/c/shopify-apis-and-sdks/

---

## Quick Reference Links

### Supabase Project
- Dashboard: https://supabase.com/dashboard/project/gvcswimqaxvylgxbklbz
- Database: https://supabase.com/dashboard/project/gvcswimqaxvylgxbklbz/editor
- Auth: https://supabase.com/dashboard/project/gvcswimqaxvylgxbklbz/auth/users
- Functions: https://supabase.com/dashboard/project/gvcswimqaxvylgxbklbz/functions
- Logs: https://supabase.com/dashboard/project/gvcswimqaxvylgxbklbz/logs

### External Services
- KCT Knowledge API: https://kct-knowledge-api-2-production.up.railway.app
- Shopify Admin: https://kctmenswear.myshopify.com/admin
- Google Analytics 4: https://analytics.google.com

---

**Last Updated**: 2025-01-30  
**Version**: 1.0  
**Contribute**: Found a solution to a new error? Add it to this doc!
