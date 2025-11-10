# localStorage to Supabase Migration

This utility migrates existing localStorage data to the Supabase database.

## Overview

The migration utility:
1. ✅ Reads data from localStorage
2. ✅ Validates data structure
3. ✅ Creates business in database
4. ✅ Migrates all related data (services, customers, appointments, workers, templates, settings)
5. ✅ Maps old IDs to new database UUIDs
6. ✅ Handles errors and rollback if needed
7. ✅ Clears localStorage after successful migration

## Quick Start

### Option 1: Use the Migration Page (Easiest)

1. **Navigate to the migration page:**
   ```
   http://localhost:3000/migration
   ```

2. **Fill in the form:**
   - Business Type: Select your business type
   - Admin Email: Your admin email address
   - Admin Name: Your admin name
   - Admin Phone: (Optional)

3. **Click "Start Migration"**

4. **After successful migration:**
   - localStorage will be cleared automatically
   - You'll see your business slug
   - Visit your booking page at `/b/[slug]`

### Option 2: Use the API Route Directly

```typescript
// Client component
'use client';

import { getServices, getCustomers, getWorkers, getAppointments, getTemplates, getSettings } from '@/components/ported/lib/mockData';

async function migrateData() {
  // Read all data from localStorage
  const data = {
    settings: getSettings(),
    services: getServices(),
    customers: getCustomers(),
    workers: getWorkers(),
    appointments: getAppointments(),
    templates: getTemplates(),
  };

  // Call migration API
  const response = await fetch('/api/migration/localStorage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessType: 'barbershop', // 'barbershop' | 'nail_salon' | 'gym_trainer' | 'other'
      adminUser: {
        email: 'admin@example.com',
        name: 'Admin User',
        phone: '+1234567890', // Optional
      },
      data,
    }),
  });

  const result = await response.json();

  if (result.success) {
    // Clear localStorage
    localStorage.removeItem('bookinghub-services');
    localStorage.removeItem('bookinghub-customers');
    localStorage.removeItem('bookinghub-workers');
    localStorage.removeItem('bookinghub-appointments');
    localStorage.removeItem('bookinghub-templates');
    localStorage.removeItem('bookinghub-settings');

    console.log('✅ Migration successful!', result);
    console.log(`Business slug: /b/${result.businessSlug}`);
  } else {
    console.error('❌ Migration failed:', result.error);
  }
}
```

### Option 3: Use the Client-Side Utility (Advanced)

```typescript
import { migrateLocalStorageToSupabase, hasLocalStorageData } from '@/lib/migration/migrate-localStorage';

// Check if localStorage has data
if (hasLocalStorageData()) {
  try {
    const result = await migrateLocalStorageToSupabase({
      businessType: 'barbershop',
      adminUser: {
        email: 'admin@example.com',
        name: 'Admin User',
        phone: '+1234567890',
      },
      businessName: 'My Business', // Optional, defaults to settings.businessProfile.name
    });

    if (result.success) {
      console.log('✅ Migration successful!', result);
      console.log(`Business slug: ${result.businessSlug}`);
    } else {
      console.error('❌ Migration failed:', result.errors);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}
```

## Migration Process

### 1. Data Reading
- Reads from localStorage keys:
  - `bookinghub-services`
  - `bookinghub-customers`
  - `bookinghub-workers`
  - `bookinghub-appointments`
  - `bookinghub-templates`
  - `bookinghub-settings`

### 2. Validation
- Validates that settings contain required business information
- Ensures business name is present

### 3. Business Creation
- Creates business from settings
- Generates unique slug from business name
- Uses business type from options

### 4. Data Migration Order
1. **Services** → Creates service records
2. **Customers** → Creates customer records, tags, and visit history
3. **Workers** → Creates worker records and worker-service relationships
4. **Appointments** → Creates appointments (maps old IDs to new UUIDs)
5. **Templates** → Creates template records
6. **Settings** → Creates settings record

### 5. ID Mapping
- Maintains mapping between old localStorage IDs and new database UUIDs
- Used to update relationships (e.g., appointments referencing customers, services, workers)

### 6. Rollback
- If any step fails, automatically rolls back by deleting the created business
- All related data is deleted via CASCADE constraints

## Error Handling

The migration includes comprehensive error handling:

- **Validation Errors**: Returns early if data is invalid
- **Database Errors**: Catches and reports database insertion errors
- **Rollback**: Automatically deletes created business if migration fails
- **Missing References**: Skips appointments with missing customer/service/worker references

## Example Migration Result

```json
{
  "success": true,
  "businessId": "uuid-here",
  "businessSlug": "my-business",
  "migrated": {
    "services": 4,
    "customers": 3,
    "workers": 2,
    "appointments": 4,
    "templates": 3
  }
}
```

## Notes

- **ID Mapping**: Old localStorage IDs (strings/numbers) are mapped to new UUIDs
- **Phone Normalization**: Phone numbers are normalized (spaces, dashes removed)
- **Missing References**: Appointments with missing references are skipped (not migrated)
- **Visit History**: Customer visit history is migrated to the `visits` table
- **Tags**: Customer tags are migrated to the `customer_tags` table
- **Worker Services**: Worker-service relationships are migrated to `worker_services` table

## Troubleshooting

**Issue**: "Business name is missing in settings"
- **Solution**: Ensure `settings.businessProfile.name` exists in localStorage

**Issue**: "Failed to migrate customer: duplicate phone number"
- **Solution**: Phone numbers must be unique. Check for duplicates in localStorage data

**Issue**: "Failed to migrate appointments: missing references"
- **Solution**: Ensure all appointments reference existing customers, services, and workers

**Issue**: "Rollback failed"
- **Solution**: Manually delete the business from Supabase dashboard if needed

## Next Steps

After successful migration:

1. **Create Admin User**: Use the onboarding API or create a user manually
2. **Update Settings**: Review and update business settings in the admin panel
3. **Verify Data**: Check that all data migrated correctly
4. **Test Functionality**: Test booking, appointments, and other features

