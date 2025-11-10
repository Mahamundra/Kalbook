# Multi-Tenant Middleware Documentation

## Overview

The multi-tenant middleware system automatically extracts, validates, and attaches business/tenant context to all requests in your Next.js 14 application.

## URL Patterns Supported

1. **Slug-based routing**: `/b/[slug]` - e.g., `/b/demo-barbershop`
2. **Query parameter**: `/booking?business=slug` - e.g., `/booking?business=demo-barbershop`
3. **Subdomain** (optional): `business-slug.yourdomain.com` - can be enabled in `lib/tenant.ts`

## Files Created

### Core Files
- `lib/business.ts` - Business lookup functions
- `lib/tenant.ts` - Tenant context utilities and types
- `lib/tenant/api.ts` - API route helpers
- `middleware.ts` - Next.js middleware (updated)
- `app/b/[slug]/page.tsx` - Slug-based booking route

## Usage Examples

### Server Components

```typescript
import { getTenantContext } from '@/lib/tenant';

export default async function BookingPage() {
  const tenantContext = await getTenantContext();
  
  if (!tenantContext) {
    return <div>Business not found</div>;
  }

  return (
    <div>
      <h1>Welcome to {tenantContext.business.name}</h1>
      <p>Business ID: {tenantContext.businessId}</p>
      <p>Slug: {tenantContext.businessSlug}</p>
    </div>
  );
}
```

### API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant/api';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await requireTenantContext(request);
    
    // Use tenantContext.businessId for all queries
    // RLS policies will automatically enforce tenant isolation
    
    return NextResponse.json({
      business: tenantContext.business,
      data: [] // Your tenant-specific data
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Tenant context required' },
      { status: 400 }
    );
  }
}
```

### Lightweight Tenant Info (No Database Fetch)

```typescript
import { getTenantInfo } from '@/lib/tenant';

export default async function Page() {
  const tenantInfo = await getTenantInfo();
  
  if (!tenantInfo) {
    return <div>No tenant context</div>;
  }

  // Just businessId and businessSlug, no full business object
  console.log(tenantInfo.businessId);
  console.log(tenantInfo.businessSlug);
}
```

## How It Works

1. **Middleware** (`middleware.ts`):
   - Extracts business slug from URL/subdomain
   - Validates business exists in database
   - Attaches business context to request headers
   - Sets cookie for client-side access

2. **Server Components / API Routes**:
   - Read tenant context from headers
   - Fetch full business data if needed
   - Use businessId for all database queries (RLS handles isolation)

3. **Admin Routes**:
   - Uses authenticated user's business_id from session
   - Automatically attached by middleware

## Tenant Isolation

All database queries automatically respect tenant boundaries through:
- **Row Level Security (RLS)** policies in Supabase
- **Business context** attached to every request
- **Automatic filtering** by business_id in all queries

## Environment Variables

Make sure you have:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # For admin client in business.ts
```

## Error Handling

- Invalid business slug → Redirects to `/404`
- Missing business parameter on `/booking` → Redirects to `/onboarding`
- Missing tenant context in API routes → Returns 400 error

