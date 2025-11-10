# Debugging Multi-Tenancy Issue

## The Problem
When deleting customers from one business (slug), they're also deleted from another business.

## Root Cause Analysis

Based on your data:
- Your user is linked to: **demo-barbershop**
- You're trying to access: **ui** business (which has 4 customers)
- The businesses are separate (different IDs)

## Possible Issues

### Issue 1: Using Old Admin Route
If you're accessing `/admin` instead of `/b/ui/admin`, the middleware uses your **user's business_id** (demo-barbershop) instead of the URL slug.

**Solution:** Always use `/b/[slug]/admin` routes:
- ✅ `/b/ui/admin` - Correct
- ❌ `/admin` - Wrong (uses user's business)

### Issue 2: Cookie Not Updated
The `business-slug` cookie might be stale or pointing to the wrong business.

**Solution:** Clear cookies and re-login:
1. Open browser DevTools → Application → Cookies
2. Delete `business-slug` cookie
3. Navigate to `/b/ui/admin/login`
4. Log in again

### Issue 3: API Calls Not Sending Cookie
Client-side API calls might not be sending the cookie.

**Fixed:** Added `credentials: 'same-origin'` to API requests.

## How to Test

1. **Check which route you're using:**
   - Look at your browser URL bar
   - Should be: `http://localhost:3000/b/ui/admin/...`
   - NOT: `http://localhost:3000/admin/...`

2. **Check the debug endpoint:**
   ```
   http://localhost:3000/api/debug/check-businesses?slug1=ui&slug2=demo-barbershop
   ```

3. **Check server logs:**
   When you delete a customer, check your terminal/console for:
   ```
   [DELETE CUSTOMER] Tenant Info: { businessId: '...', businessSlug: '...' }
   ```
   This shows which business_id is being used.

4. **Test the fix:**
   - Navigate to `/b/ui/admin/customers`
   - Delete a customer
   - Check server logs to see which business_id was used
   - Verify customer is only deleted from "ui" business

## Quick Fix

If you want to access the "ui" business as your default:

1. Update your user to point to "ui" business:
   ```sql
   UPDATE users 
   SET business_id = (SELECT id FROM businesses WHERE slug = 'ui')
   WHERE email = 'test@example.com';
   ```

2. Then you can use either:
   - `/admin` (uses your user's business = "ui")
   - `/b/ui/admin` (uses URL slug = "ui")

## Next Steps

1. Check which URL you're using when deleting customers
2. Check server logs when deleting
3. Share the logs so we can see what's happening

