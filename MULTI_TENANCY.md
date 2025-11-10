# Multi-Tenancy Architecture

## Current Architecture: Session-Based Multi-Tenancy

The app uses a **single admin interface** with automatic data filtering based on the logged-in user's session.

### How It Works

1. **Single Admin Panel**: `/admin` (one URL for all businesses)
2. **User Authentication**: Each user belongs to one business via `users.business_id`
3. **Automatic Filtering**: All API calls automatically filter by the user's business_id
4. **Data Isolation**: Users can only see and manage their own business's data

### Benefits

✅ **Simpler**: One codebase, one admin interface  
✅ **Secure**: Data isolation enforced at the database level  
✅ **Scalable**: Easy to add new businesses (just create users)  
✅ **Maintainable**: Single admin codebase to maintain  

### How Data Filtering Works

```typescript
// Middleware (middleware.ts) - Line 94-113
// Gets user's business_id from session
const { data: userData } = await supabase
  .from('users')
  .select('business_id')
  .eq('id', user.id);

// Attaches business_id to all requests
response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
  businessId: userData.business_id,
}));

// API Routes (e.g., app/api/customers/route.ts) - Line 39
// Automatically filters by business_id
.eq('business_id', tenantInfo.businessId);
```

### Example Flow

1. **Business A Owner logs in** → `business_id: "abc-123"`
2. **Visits `/admin/dashboard`** → Shows Business A's metrics
3. **Visits `/admin/customers`** → Shows only Business A's customers
4. **All API calls** → Automatically filtered to `business_id = "abc-123"`

5. **Business B Owner logs in** → `business_id: "xyz-789"`
6. **Visits `/admin/dashboard`** → Shows Business B's metrics
7. **Visits `/admin/customers`** → Shows only Business B's customers
8. **All API calls** → Automatically filtered to `business_id = "xyz-789"`

## Alternative: Business-Slug-Based Admin (Optional)

If you prefer separate admin URLs per business, you can add:

### Option 1: `/b/[slug]/admin` Route

```typescript
// app/b/[slug]/admin/page.tsx
export default async function BusinessAdminPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  // Validate business exists
  const business = await getBusinessBySlug(params.slug);
  
  // Check user has access to this business
  const user = await getUser();
  const userBusiness = await getUserBusiness(user.id);
  
  if (userBusiness.id !== business.id) {
    redirect('/unauthorized');
  }
  
  // Render admin panel
  return <AdminDashboard businessSlug={params.slug} />;
}
```

### Option 2: Subdomain-Based (Advanced)

```
business-a.app.com/admin → Business A's admin
business-b.app.com/admin → Business B's admin
```

### When to Use Alternative Approaches

Use business-slug-based admin if:
- You want direct shareable admin links (`/b/my-business/admin`)
- You want to show business name in URL
- You want clearer URL structure

**Current approach is recommended** because:
- Simpler to implement
- Easier to maintain
- More secure (no business slug guessing)
- Standard SaaS pattern

## Data Isolation Layers

The app has multiple layers of data isolation:

1. **Application Level**: All queries filter by `business_id`
2. **Database Level**: Row Level Security (RLS) policies
3. **Session Level**: User's `business_id` from authentication
4. **API Level**: Tenant context validation in every route

## Security

✅ **Users can't access other businesses' data** - Enforced by `business_id` filtering  
✅ **RLS policies** - Additional database-level protection  
✅ **Session validation** - User must be authenticated and belong to a business  
✅ **API validation** - Every route checks tenant context  

## Summary

**Current Setup**: ✅ Single admin panel (`/admin`) with session-based filtering  
**Data Isolation**: ✅ Automatic via `business_id`  
**Security**: ✅ Multi-layer protection  
**Scalability**: ✅ Easy to add new businesses  

**No need for separate admin panels per business** - the current architecture handles multi-tenancy perfectly!

