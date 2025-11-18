# Setup Guide

## 1. Database Migration ✅

The database schema has been created. All tables, indexes, and RLS policies are in place.

## 2. Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```bash
# Get these from: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To find your credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" and "anon public" key

## 3. Supabase Client Setup ✅

The Supabase client has been configured:
- **Client-side**: `lib/supabase/client.ts` - Use in React components
- **Server-side**: `lib/supabase/server.ts` - Use in Server Components, API routes, Server Actions
- **Types**: `lib/supabase/database.types.ts` - Full TypeScript types

## 4. Authentication Setup

### Enable Supabase Auth

1. Go to your Supabase dashboard → Authentication → Providers
2. Enable the authentication methods you need (Email, Phone, OAuth, etc.)

### Create Your First Business and User

After enabling auth, you'll need to:

1. **Create a business** (you can do this via SQL Editor or your app):

```sql
INSERT INTO businesses (slug, name, email, phone, business_type)
VALUES ('demo-barbershop', 'Demo Barbershop', 'owner@example.com', '+1234567890', 'barbershop')
RETURNING id;
```

2. **After a user signs up via Supabase Auth**, create a corresponding record in the `users` table:

```typescript
// Example: After user signs up
import { supabase } from '@/lib/supabase/client';

const { data: { user } } = await supabase.auth.signUp({
  email: 'owner@example.com',
  password: 'secure-password'
});

// Then create user record
if (user) {
  await supabase.from('users').insert({
    id: user.id,
    business_id: 'your-business-id-from-step-1',
    email: user.email!,
    name: 'John Doe',
    role: 'owner'
  });
}
```

## 5. Using the Database

### Client-Side Example

```typescript
'use client';

import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function ServicesList() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('active', true);
      
      setServices(data || []);
    }
    
    fetchServices();
  }, []);

  return <div>{/* Render services */}</div>;
}
```

### Server-Side Example

```typescript
import { createClient } from '@/lib/supabase/server';
import { getActiveServices } from '@/lib/supabase/helpers';

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Get user's business_id
  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  // Get services for the business
  const services = await getActiveServices(userData.business_id);

  return <div>{/* Render services */}</div>;
}
```

### Using Helper Functions

```typescript
import { 
  getActiveServices, 
  getActiveWorkers,
  getAppointmentsByDateRange 
} from '@/lib/supabase/helpers';

// Get services for a business
const services = await getActiveServices(businessId);

// Get appointments for a date range
const appointments = await getAppointmentsByDateRange(
  businessId,
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

## 6. Row Level Security (RLS)

RLS is enabled on all tables. The policies automatically:
- ✅ Restrict users to only see data from their business
- ✅ Prevent cross-tenant data access
- ✅ Allow appropriate CRUD operations based on user role

**Important**: Make sure users are authenticated and have a corresponding record in the `users` table for RLS to work correctly.

## 7. Next Steps

1. ✅ Set up environment variables
2. ✅ Enable authentication in Supabase dashboard
3. ✅ Create your first business and user
4. ✅ Start building your booking features!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### RLS policies blocking access
- Ensure the user has a record in the `users` table with the correct `business_id`
- Check that the user is authenticated: `await supabase.auth.getUser()`

### Type errors
- The types are in `lib/supabase/database.types.ts`
- Make sure you're importing from `@/lib/supabase/database.types` or `@/lib/supabase/client`

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Database Schema](./supabase/README.md)






