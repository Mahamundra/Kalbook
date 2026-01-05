/**
 * Script to create an admin user for a business
 * 
 * Usage: 
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-admin-user.ts
 * 
 * Or set environment variables in .env.local and run:
 *   npx tsx scripts/create-admin-user.ts
 * 
 * Make sure to set environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { toE164Format } from '@/lib/customers/utils';

async function createAdminUser() {
  const businessId = '899081';
  const phone = '0546147474';
  const name = 'Admin User'; // You can customize this

  const supabase = createAdminClient();

  // Verify business exists
  console.log(`Checking if business ${businessId} exists...`);
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    console.error('❌ Business not found:', businessError?.message || 'Business does not exist');
    process.exit(1);
  }

  console.log(`✅ Business found: ${business.name} (${business.slug})`);

  // Convert phone to E.164 format
  const e164Phone = toE164Format(phone);
  console.log(`📱 Phone number: ${phone} -> ${e164Phone}`);

  // Check if user already exists with this phone for this business
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, phone, name')
    .eq('business_id', businessId)
    .eq('phone', e164Phone)
    .maybeSingle();

  if (existingUser) {
    console.log('⚠️  User with this phone number already exists for this business:');
    console.log(JSON.stringify(existingUser, null, 2));
    console.log('Skipping creation.');
    process.exit(0);
  }

  // Generate a placeholder email (Supabase Auth may require it)
  // Format: phone-{businessId}@kalbook.local
  const placeholderEmail = `admin-${businessId}@kalbook.local`;

  // Generate random password (required by Supabase Auth but not used for OTP login)
  const password = Math.random().toString(36).slice(-12) + 'A1!';

  console.log('Creating admin user in Supabase Auth...');
  
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: placeholderEmail,
    phone: e164Phone,
    password: password,
    email_confirm: true,
    user_metadata: {
      name: name,
      business_id: businessId,
      role: 'admin',
    },
    app_metadata: {
      business_id: businessId,
      role: 'admin',
    },
  });

  if (authError || !authData.user) {
    console.error('❌ Failed to create user in auth:', authError?.message);
    process.exit(1);
  }

  const authUserId = authData.user.id;
  console.log(`✅ Auth user created with ID: ${authUserId}`);

  // Create user record in users table
  console.log('Creating user record in users table...');
  const userData = {
    id: authUserId,
    business_id: businessId,
    email: null, // No email, only phone
    phone: e164Phone,
    name: name.trim(),
    role: 'admin' as const,
    is_main_admin: false, // Not the main admin
  };

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert(userData as any)
    .select()
    .single();

  if (userError) {
    // Rollback: delete auth user
    console.error('❌ Failed to create user record, rolling back...');
    await supabase.auth.admin.deleteUser(authUserId);
    console.error('Error:', userError.message);
    process.exit(1);
  }

  console.log('✅ Admin user created successfully!');
  console.log('\nUser details:');
  console.log(JSON.stringify({
    id: (newUser as any).id,
    name: (newUser as any).name,
    phone: (newUser as any).phone,
    businessId: businessId,
    businessName: business.name,
    businessSlug: business.slug,
    role: (newUser as any).role,
  }, null, 2));
  console.log('\n📝 Note: User can login via OTP using their phone number.');
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

