/**
 * Test Supabase connection and fetch business
 * Run with: node scripts/test-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local');
let envVars = {};

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

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  try {
    // Test 1: Get business by slug
    console.log('📋 Test 1: Fetching business by slug "demo-barbershop"...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', 'demo-barbershop')
      .single();

    if (businessError) {
      console.error('❌ Error fetching business:', businessError.message);
      return;
    }

    console.log('✅ Business found!\n');
    console.log('Business Details:');
    console.log(`   ID: ${business.id}`);
    console.log(`   Slug: ${business.slug}`);
    console.log(`   Name: ${business.name}`);
    console.log(`   Email: ${business.email}`);
    console.log(`   Phone: ${business.phone}`);
    console.log(`   Type: ${business.business_type}`);
    console.log(`   Timezone: ${business.timezone}`);
    console.log(`   Currency: ${business.currency}\n`);

    // Test 2: Check services
    console.log('📋 Test 2: Checking services...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id);

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError.message);
    } else {
      console.log(`✅ Found ${services?.length || 0} services`);
      if (services && services.length > 0) {
        services.forEach(service => {
          console.log(`   - ${service.name} (${service.duration}min, $${service.price})`);
        });
      } else {
        console.log('   💡 No services found. Run add-initial-data.sql to add sample data.');
      }
    }

    console.log('\n📋 Test 3: Checking workers...');
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', business.id);

    if (workersError) {
      console.error('❌ Error fetching workers:', workersError.message);
    } else {
      console.log(`✅ Found ${workers?.length || 0} workers`);
      if (workers && workers.length > 0) {
        workers.forEach(worker => {
          console.log(`   - ${worker.name} (${worker.active ? 'Active' : 'Inactive'})`);
        });
      } else {
        console.log('   💡 No workers found. Run add-initial-data.sql to add sample data.');
      }
    }

    console.log('\n✅ All tests passed! Your Supabase connection is working.\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testConnection();








