# Supabase Database Schema

This directory contains the database migrations for the multi-tenant booking SaaS application.

## Migration File

- `migrations/001_initial_schema.sql` - Complete database schema with all tables, indexes, RLS policies, and constraints

## Running the Migration

### Method 1: Using Supabase Dashboard (Recommended - No CLI Required)

This is the easiest method and doesn't require any CLI installation:

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `supabase/migrations/001_initial_schema.sql` in your editor
6. Copy the entire contents of the file (Ctrl+A / Cmd+A, then Ctrl+C / Cmd+C)
7. Paste it into the SQL Editor
8. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
9. Wait for the migration to complete - you should see "Success. No rows returned"

### Method 2: Using Supabase CLI

If you prefer using the CLI:

1. **Install Supabase CLI** (choose one method):
   
   **Option A: Using Homebrew (macOS/Linux)**
   ```bash
   brew install supabase/tap/supabase
   ```
   
   **Option B: Using npm**
   ```bash
   npm install -g supabase
   ```
   
   **Option C: Using Scoop (Windows)**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Link your project** to Supabase:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/[YOUR_PROJECT_REF]`

3. **Run the migration**:
   ```bash
   supabase db push
   ```

**Note:** If you encounter CLI installation issues, use Method 1 (Dashboard) instead.

## Schema Overview

### Multi-Tenant Architecture

All tenant-specific tables include a `business_id` column for data isolation. Row Level Security (RLS) policies ensure that users can only access data for their business.

### Tables

1. **businesses** - Root tenant table
2. **users** - Business owners/admins
3. **services** - Services offered by businesses
4. **workers** - Staff members
5. **worker_services** - Many-to-many: workers ↔ services
6. **customers** - Customer information
7. **customer_tags** - Customer tags (many-to-many)
8. **visits** - Historical visit records
9. **appointments** - Booking appointments
10. **settings** - Business settings (JSONB)
11. **templates** - Email/SMS templates
12. **otp_codes** - Phone verification codes

### Key Features

- **Multi-tenant isolation**: All tables use `business_id` for tenant separation
- **Row Level Security (RLS)**: Enabled on all tables with tenant-based policies
- **Indexes**: Optimized for queries on `business_id`, phone numbers, and appointment dates
- **Foreign keys**: All relationships properly constrained
- **Auto-updating timestamps**: `updated_at` columns automatically update on changes

### Performance Considerations

The schema is optimized for:
- 5 businesses with 700-1000 appointments/month each
- Fast tenant-scoped queries (indexed on `business_id`)
- Efficient calendar queries (indexed on appointment `start`/`end`)
- Quick customer lookups (indexed on `phone`)

## Authentication Setup

The RLS policies assume you're using Supabase Auth. To make them work:

1. When a user signs up, create a corresponding record in the `users` table
2. Store the `business_id` in the user's session or metadata
3. The policies will automatically filter data based on the user's business

### Example: Creating a Business and User

```sql
-- 1. Create business
INSERT INTO businesses (slug, name, email, phone, business_type)
VALUES ('my-barbershop', 'My Barbershop', 'owner@example.com', '+1234567890', 'barbershop')
RETURNING id;

-- 2. Create user (after Supabase Auth user is created)
INSERT INTO users (id, business_id, email, name, role)
VALUES (
  'auth-user-uuid-here',  -- From auth.users.id
  'business-uuid-from-step-1',
  'owner@example.com',
  'John Doe',
  'owner'
);
```

## Next Steps

1. Run the migration
2. Set up Supabase Auth in your Next.js app
3. Create initial business records
4. Configure your application to use the database schema

## Notes

- All timestamps use `TIMESTAMPTZ` for timezone support
- UUIDs are used for all primary keys
- The `settings` table uses JSONB for flexible configuration storage
- OTP codes are not tenant-specific (phone verification is global)

