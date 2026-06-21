import { createAdminClient } from '@/lib/supabase/admin';

export type AdminSupabaseClient = ReturnType<typeof createAdminClient>;
