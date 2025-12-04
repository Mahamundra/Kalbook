# How to Access Admin Panel

After creating a business, you need to set up an admin user to access the admin panel.

## Quick Setup (Easiest Method)

### Step 1: Create Admin User

**Option A: Use the API endpoint (Recommended)**

```bash
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "name": "Admin User",
    "phone": "+1234567890"
  }'
```

The response will include user information:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin User",
    "businessId": "..."
  },
  "message": "Admin user created successfully. User can login via OTP using their phone number."
}
```

**Option B: Use browser console**

```javascript
// Run in browser console at http://localhost:3000
fetch('/api/admin/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    name: 'Admin User',
    phone: '+1234567890'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Admin user created!');
  console.log('Email:', data.user.email);
  console.log('Phone:', data.user.phone || 'Add phone number to login via OTP');
});
```

### Step 2: Access Your Business Admin Login

1. **Find your business slug:**
   - Check the migration result or onboarding response
   - Or query: `SELECT slug FROM businesses;` in Supabase
   - Or visit: `http://localhost:3000/api/businesses`

2. **Go to your business admin login page:**
   ```
   http://localhost:3000/b/[your-business-slug]/admin/login
   ```
   Example: `http://localhost:3000/b/demo-barbershop/admin/login`

3. **Sign in:**
   - **Option A (Quick Test):** In development mode, click the "🔧 Use Test Account" button - it will auto-create and login with test credentials
   - **Option B (OTP):** Enter your phone number and verify with OTP code sent via SMS/WhatsApp
   - You'll be redirected to `/b/[slug]/admin/dashboard`

4. **You should now see the admin dashboard!**

## Quick Test Login (Development Only)

For quick testing, each business login page has a "Use Test Account" button that:
- Creates a default test user with test credentials
- Automatically logs you in
- Links the user to your business

**Note:** This button only appears in development mode (`NODE_ENV=development`).

## Business Admin URLs

Each business has its own admin panel accessible via:

- `/b/[slug]/admin/login` → **Login page** (start here!)
- `/b/[slug]/admin` → Redirects to dashboard (requires login)
- `/b/[slug]/admin/dashboard` → Dashboard with metrics
- `/b/[slug]/admin/services` → Manage services
- `/b/[slug]/admin/customers` → Manage customers
- `/b/[slug]/admin/workers` → Manage workers
- `/b/[slug]/admin/calendar` → Calendar view
- `/b/[slug]/admin/settings` → Business settings
- `/b/[slug]/admin/templates` → Email/SMS templates
- `/b/[slug]/admin/qr` → QR code generator

**Example:** If your business slug is `my-barbershop`:
1. **Login:** `http://localhost:3000/b/my-barbershop/admin/login`
2. **After login:** `http://localhost:3000/b/my-barbershop/admin/dashboard`
3. **Other pages:** `http://localhost:3000/b/my-barbershop/admin/customers`, etc.

## Login Flow

1. **Access admin panel** → Redirects to login if not authenticated
2. **Enter phone number** → System sends OTP code via SMS/WhatsApp
3. **Enter OTP code** → Verify and create session
4. **Verify business access** → System checks user belongs to that business
5. **Redirect to dashboard** → On success, redirected to admin dashboard
6. **Session persists** → Stay logged in until you logout

## Security

- ✅ **Business isolation**: Users can only access their own business's admin
- ✅ **Slug verification**: System verifies user's business matches the URL slug
- ✅ **Automatic redirect**: Unauthenticated users redirected to login
- ✅ **Session management**: Uses Supabase Auth for secure sessions

## Setting Up Admin User (Other Methods)

### Option 1: Create Admin User via Onboarding API

If you created a business via migration and need to create an admin user:

```bash
curl -X POST http://localhost:3000/api/onboarding/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "barbershop",
    "businessInfo": {
      "name": "Your Business Name",
      "email": "admin@example.com",
      "phone": "+1234567890"
    },
    "adminUser": {
      "email": "admin@example.com",
      "name": "Admin User",
      "phone": "+1234567890"
    }
  }'
```

**Note:** This will create a NEW business. If you already have a business, use Option 2.

### Option 2: Create Admin User Manually (For Existing Business)

**Note:** Users login via OTP (phone), so you need to ensure the user has a phone number.

1. **Create user record in database:**

   Go to Supabase Dashboard → SQL Editor and run:

   ```sql
   -- Replace with your actual values
   -- Generate a UUID for the user (will be created in Supabase Auth on first OTP login)
   INSERT INTO users (
     id,
     business_id,
     email,
     name,
     phone,
     role
   ) VALUES (
     gen_random_uuid(),     -- Generate UUID (Supabase Auth user created on first login)
     'your-business-id',    -- Your business ID from businesses table
     'admin@example.com',
     'Admin User',
     '+1234567890',         -- REQUIRED: Phone number for OTP login
     'owner'
   );
   ```

   **Note:** The Supabase Auth user will be automatically created when the user logs in via OTP for the first time.

2. **Find your business ID:**

   ```sql
   SELECT id, slug, name FROM businesses;
   ```

### Option 3: Use OTP Flow (Recommended)

Users login via OTP (phone-based authentication):
1. Go to `/b/[slug]/admin/login`
2. Enter your phone number
3. Receive OTP code via SMS/WhatsApp
4. Enter OTP code to verify
5. System automatically creates Supabase Auth user if it doesn't exist
6. Session is created and you're logged in

## Accessing Admin Panel

Once you have an admin user set up:

1. **Sign in:**
   - Go to `/b/[slug]/admin/login` (replace `[slug]` with your business slug)
   - Enter your phone number
   - Verify with OTP code sent via SMS/WhatsApp

2. **Admin Routes Available:**
   - `/admin` → Redirects to `/admin/dashboard`
   - `/admin/dashboard` → Dashboard with metrics
   - `/admin/services` → Manage services
   - `/admin/customers` → Manage customers
   - `/admin/workers` → Manage workers
   - `/admin/calendar` → Calendar view
   - `/admin/settings` → Business settings
   - `/admin/templates` → Email/SMS templates

## Development Bypass (Temporary)

If you want to bypass authentication in development for testing:

1. **Modify middleware.ts** (temporary):

   ```typescript
   // In middleware.ts, around line 88
   if (!user) {
     // In development, allow access without auth
     if (process.env.NODE_ENV === 'development') {
       // Set a test business_id for development
       response.headers.set(TENANT_CONTEXT_HEADER, JSON.stringify({
         businessId: 'your-test-business-id',
         businessSlug: null,
       }));
       return response;
     }
     // In production, redirect to login
     return NextResponse.redirect(new URL('/login', request.url));
   }
   ```

2. **Or create a test user:**
   - Use Supabase Dashboard to create a test user
   - Set up the user record as shown above

## Troubleshooting

**Issue:** "Cannot access /admin" or redirects
- **Solution:** Create an admin user first (see Option 2 above)

**Issue:** "User not found" error
- **Solution:** Make sure the user record exists in the `users` table with the correct `business_id`

**Issue:** "Business not found"
- **Solution:** Verify your business exists:
  ```sql
  SELECT * FROM businesses;
  ```

**Issue:** Can't sign in
- **Solution:** 
  - Use OTP login (phone + code)
  - Ensure user has phone number in database
  - Check OTP code is correct and not expired (codes expire after 10 minutes)
  - Verify Twilio/SMS service is configured (or use test code `123456` in development)

## Finding Your Business ID

If you need to specify a business ID when creating a user:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run:**
   ```sql
   SELECT id, slug, name FROM businesses ORDER BY created_at DESC;
   ```
3. **Copy the business ID** you want to use

## Admin Panel Routes

Once signed in, you can access:

- `/admin` → Redirects to dashboard
- `/admin/dashboard` → Dashboard with metrics
- `/admin/services` → Manage services
- `/admin/customers` → Manage customers
- `/admin/workers` → Manage workers
- `/admin/calendar` → Calendar view
- `/admin/settings` → Business settings
- `/admin/templates` → Email/SMS templates
- `/admin/qr` → QR code generator

## Quick Test Script

Create a test admin user quickly:

```javascript
// Run in browser console at http://localhost:3000
fetch('/api/admin/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@test.com',
    name: 'Test Admin',
    phone: '+1234567890'
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ Admin user created!');
    console.log('Email:', data.user.email);
    console.log('Phone:', data.user.phone || '⚠️ Add phone number to enable OTP login');
    console.log('Now go to /b/[your-slug]/admin/login and sign in with OTP');
  } else {
    console.error('❌ Error:', data.error);
  }
});
```

