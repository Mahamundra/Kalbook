/**
 * Script to create the first business in the database
 * Run with: npx tsx scripts/create-first-business.ts
 * 
 * Or use the SQL file: supabase/scripts/create-first-business.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
let envVars: Record<string, string> = {};

try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.error('⚠️  Could not read .env.local, using process.env');
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFirstBusiness() {
  console.log('🚀 Creating first business...\n');

  const businessData = {
    slug: 'demo-barbershop',
    name: 'Demo Barbershop',
    email: 'owner@example.com',
    phone: '+1234567890',
    whatsapp: '+1234567890',
    address: '123 Main St, City, Country',
    timezone: 'America/New_York',
    currency: 'USD',
    business_type: 'barbershop' as const,
  };

  const { data, error } = await supabase
    .from('businesses')
    .insert(businessData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.error('❌ Business with this slug already exists!');
      console.error('   Try a different slug or check existing businesses.');
      console.error('\n   To see existing businesses, run:');
      console.error('   SELECT * FROM businesses;');
    } else {
      console.error('❌ Error creating business:', error.message);
      console.error('   Error code:', error.code);
    }
    process.exit(1);
  }

  console.log('✅ Business created successfully!\n');
  console.log('📋 Business Details:');
  console.log(`   ID: ${data.id}`);
  console.log(`   Slug: ${data.slug}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Email: ${data.email}`);
  console.log(`   Type: ${data.business_type}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Save this business ID for creating your first user');
  console.log('   2. Update the business details in Supabase dashboard or via your app');
  console.log(`   3. Your booking URL will be: /booking/${data.slug}`);
  console.log('\n📝 To create a user for this business, you\'ll need to:');
  console.log('   - Sign up via Supabase Auth');
  console.log('   - Then insert a record in the users table with this business_id');
}

createFirstBusiness().catch(console.error);

