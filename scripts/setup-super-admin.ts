/**
 * Setup script to create the first super admin user
 * 
 * Usage:
 * 1. Set environment variables:
 *    SUPER_ADMIN_EMAIL=admin@kalbook.com
 *    SUPER_ADMIN_PASSWORD=your-secure-password
 *    SUPER_ADMIN_NAME=Super Admin
 * 
 * 2. Run: npx tsx scripts/setup-super-admin.ts
 * 
 * Or call the API endpoint:
 * curl -X POST http://localhost:3000/api/super-admin/setup \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"admin@kalbook.com","password":"secure-password","name":"Super Admin"}'
 */

import { createAdminClient } from '../lib/supabase/admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('No .env.local file found, using environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const email = process.env.SUPER_ADMIN_EMAIL || 'admin@kalbook.com';
const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123456';
const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

async function setupSuperAdmin() {
  console.log('🔧 Setting up super admin user...\n');
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Name: ${name}\n`);

  const supabase = createAdminClient();

  try {
    // Check if super admin already exists
    const { data: existingAdmins } = await supabase
      .from('super_admin_users')
      .select('id')
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      console.error('❌ Super admin already exists! Only one super admin is allowed.');
      console.log('   To create a new one, first delete the existing super admin from the database.');
      process.exit(1);
    }

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    
    if (emailExists) {
      console.error(`❌ Email ${email} is already registered in auth.users`);
      console.log('   Please use a different email or delete the existing user first.');
      process.exit(1);
    }

    // Create auth user
    console.log('📝 Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'super_admin',
      },
      app_metadata: {
        role: 'super_admin',
      },
    });

    if (authError || !authData.user) {
      console.error('❌ Failed to create auth user:', authError?.message);
      process.exit(1);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create super admin record
    console.log('📝 Creating super admin record...');
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admin_users')
      .insert({
        id: authData.user.id,
        is_super_admin: true,
      } as any)
      .select()
      .single();

    if (superAdminError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error('❌ Failed to create super admin record:', superAdminError.message);
      process.exit(1);
    }

    console.log('✅ Super admin record created\n');
    console.log('🎉 Super admin setup complete!\n');
    console.log('📋 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    console.log('🔗 Access super admin panel at:');
    console.log('   http://localhost:3000/super-admin/businesses\n');
    console.log('⚠️  IMPORTANT: Save these credentials securely!');
    console.log('   This is the only super admin account.\n');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupSuperAdmin();

