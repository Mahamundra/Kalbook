import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Creates a Supabase client with service role key
 * WARNING: This bypasses RLS policies - use only in server-side admin operations
 * Never expose the service role key to the client!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

