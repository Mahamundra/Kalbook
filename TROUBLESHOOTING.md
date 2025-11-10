# Troubleshooting Admin Access

## Issue: Getting 404 on `/b/[slug]/admin/dashboard`

### Step 1: Check if Business Exists

Use the debug endpoint to check if your business slug exists:

```bash
# Check if business "ui" exists
curl http://localhost:3000/api/debug/business?slug=ui
```

Or visit in browser:
```
http://localhost:3000/api/debug/business?slug=ui
```

This will show:
- ✅ If business exists → Shows business info and admin URL
- ❌ If business doesn't exist → Shows available business slugs

### Step 2: Find Your Business Slug

If you don't know your business slug, check in Supabase:

1. Go to Supabase Dashboard → Table Editor → `businesses`
2. Look for the `slug` column
3. Or run SQL:
   ```sql
   SELECT slug, name FROM businesses;
   ```

### Step 3: Common Issues

#### Issue: "Business with slug 'ui' not found"

**Solution:** The slug "ui" doesn't exist. Use one of these:

1. **Check available slugs:**
   ```bash
   curl http://localhost:3000/api/debug/business?slug=any
   ```
   This will list all available business slugs.

2. **Create a business** if you haven't:
   - Use `/api/onboarding/create` endpoint
   - Or use the migration tool if you have localStorage data
   - Or create manually in Supabase

#### Issue: "Unauthorized" or Redirect to Login

**Solution:** Create an admin user for that business:

```javascript
// In browser console
fetch('/api/admin/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    name: 'Admin User',
    phone: '+1234567890',
    businessId: 'your-business-id' // Optional, uses first business if not provided
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Admin created!');
  console.log('Email:', data.user.email);
  console.log('Password:', data.password);
});
```

#### Issue: "User's business doesn't match slug's business"

**Solution:** The logged-in user belongs to a different business. Either:

1. **Use the correct slug** for your user's business
2. **Create a user** for the business you're trying to access
3. **Update the user's business_id** (not recommended)

## Quick Debug Steps

1. **Check if business exists:**
   ```
   http://localhost:3000/api/debug/business?slug=your-slug
   ```

2. **List all businesses:**
   ```sql
   SELECT id, slug, name FROM businesses;
   ```

3. **Check your user's business:**
   ```sql
   SELECT u.id, u.email, u.business_id, b.slug, b.name
   FROM users u
   JOIN businesses b ON u.business_id = b.id;
   ```

4. **Verify route exists:**
   - Check: `app/b/[slug]/admin/dashboard/page.tsx` exists
   - Check: `app/b/[slug]/admin/layout.tsx` exists

## Expected Behavior

✅ **Working:**
- Business slug exists → Shows admin dashboard
- User is authenticated → Can access admin
- User belongs to business → Full access

❌ **Not Working:**
- Business slug doesn't exist → 404 redirect
- User not authenticated → Redirect to login
- User doesn't belong to business → Unauthorized redirect

