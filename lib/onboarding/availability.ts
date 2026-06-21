import type { SupabaseClient } from '@supabase/supabase-js';
import { toE164Format } from '@/lib/customers/utils';

export type AvailabilityResult = {
  available: boolean;
  field?: 'email' | 'phone';
  error?: string;
};

export type ExistingBusinessResult = {
  hasBusiness: boolean;
  business?: { id: string; slug: string; name: string };
  businesses?: Array<{ id: string; slug: string; name: string }>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhoneForComparison(phone: string): string | null {
  try {
    const e164 = toE164Format(phone);
    if (!e164.startsWith('+') || e164.length < 10) {
      return null;
    }
    return e164;
  } catch {
    return null;
  }
}

export function getPhoneLookupVariants(phone: string): string[] {
  const normalized = normalizePhoneForComparison(phone);
  if (!normalized) {
    return [phone.trim()];
  }

  const variants = new Set<string>([normalized]);

  if (normalized.startsWith('+972')) {
    const local = `0${normalized.slice(4)}`;
    variants.add(local);
    variants.add(normalized.slice(1));
    variants.add(normalized.slice(4));
  }

  const digits = phone.replace(/\D/g, '');
  if (digits) {
    variants.add(digits);
  }

  return [...variants];
}

export function phonesMatch(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
  if (!phoneA || !phoneB) {
    return false;
  }

  const normalizedA = normalizePhoneForComparison(phoneA);
  const normalizedB = normalizePhoneForComparison(phoneB);

  if (normalizedA && normalizedB) {
    return normalizedA === normalizedB;
  }

  return phoneA.replace(/\D/g, '') === phoneB.replace(/\D/g, '');
}

export async function findAuthUserByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<{ id: string; email?: string | null; phone?: string | null } | null> {
  const normalizedTarget = normalizePhoneForComparison(phone);
  if (!normalizedTarget) {
    return null;
  }

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => phonesMatch(user.phone, normalizedTarget));
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ id: string; email?: string | null; phone?: string | null } | null> {
  const normalizedEmail = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

export async function findUserByPhoneInDb(
  supabase: SupabaseClient,
  phone: string
): Promise<{ id: string; email: string | null; phone: string | null; business_id: string; role: string } | null> {
  const variants = getPhoneLookupVariants(phone);

  for (const variant of variants) {
    const { data } = await supabase
      .from('users')
      .select('id, email, phone, business_id, role')
      .eq('phone', variant)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  return null;
}

export async function findBusinessAdminByPhone(
  supabase: SupabaseClient,
  phone: string,
  businessId: string
): Promise<{
  id: string;
  business_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
} | null> {
  const variants = getPhoneLookupVariants(phone);

  for (const variant of variants) {
    const { data } = await supabase
      .from('users')
      .select('id, business_id, email, phone, name, role')
      .eq('phone', variant)
      .eq('business_id', businessId)
      .in('role', ['admin', 'owner'])
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  const { data: allUsers } = await supabase
    .from('users')
    .select('id, business_id, email, phone, name, role')
    .eq('business_id', businessId)
    .in('role', ['admin', 'owner']);

  if (allUsers) {
    for (const dbUser of allUsers) {
      if (phonesMatch(phone, dbUser.phone)) {
        return dbUser;
      }
    }
  }

  return null;
}

export async function findWorkerByPhoneInBusiness(
  supabase: SupabaseClient,
  phone: string,
  businessId: string
): Promise<{ id: string; phone: string | null; email: string | null } | null> {
  const variants = getPhoneLookupVariants(phone);

  for (const variant of variants) {
    const { data } = await supabase
      .from('workers')
      .select('id, phone, email')
      .eq('phone', variant)
      .eq('business_id', businessId)
      .maybeSingle();

    if (data) {
      return data;
    }
  }

  const { data: allWorkers } = await supabase
    .from('workers')
    .select('id, phone, email')
    .eq('business_id', businessId);

  if (allWorkers) {
    for (const worker of allWorkers) {
      if (phonesMatch(phone, worker.phone)) {
        return worker;
      }
    }
  }

  return null;
}

export async function findExistingBusinessOwner(
  supabase: SupabaseClient,
  options: { email?: string | null; phone?: string | null }
): Promise<ExistingBusinessResult> {
  const { email, phone } = options;
  let existingUsers: Array<{ business_id: string; role: string }> = [];
  let phoneMatchedBusinessId: string | undefined;

  if (email && email.trim()) {
    const normalizedEmail = normalizeEmail(email);
    const { data: usersByEmail } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('email', normalizedEmail)
      .eq('role', 'owner')
      .limit(10);

    if (usersByEmail?.length) {
      existingUsers = [...existingUsers, ...usersByEmail];
    }
  }

  if (phone) {
    const dbUser = await findUserByPhoneInDb(supabase, phone);
    if (dbUser?.role === 'owner') {
      phoneMatchedBusinessId = dbUser.business_id;
      const alreadyTracked = existingUsers.some((user) => user.business_id === dbUser.business_id);
      if (!alreadyTracked) {
        existingUsers.push({ business_id: dbUser.business_id, role: dbUser.role });
      }
    }
  }

  if (existingUsers.length === 0) {
    return { hasBusiness: false };
  }

  const businessIds = [...new Set(existingUsers.map((user) => user.business_id))];
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, slug, name')
    .in('id', businessIds)
    .limit(10);

  if (!businesses?.length) {
    return { hasBusiness: false };
  }

  const matchedBusiness = phoneMatchedBusinessId
    ? businesses.find((b) => b.id === phoneMatchedBusinessId)
    : undefined;

  return {
    hasBusiness: true,
    businesses,
    business: matchedBusiness ?? businesses[0],
  };
}

export async function checkOnboardingAvailability(
  supabase: SupabaseClient,
  options: {
    email?: string | null;
    phone?: string | null;
    excludeAuthUserId?: string | null;
  }
): Promise<AvailabilityResult> {
  const { email, phone, excludeAuthUserId } = options;

  if (email && typeof email === 'string' && email.trim()) {
    const normalizedEmail = normalizeEmail(email);

    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUserByEmail) {
      return {
        available: false,
        field: 'email',
        error: 'Email address already registered by another user',
      };
    }

    const authUserByEmail = await findAuthUserByEmail(supabase, normalizedEmail);
    if (authUserByEmail && authUserByEmail.id !== excludeAuthUserId) {
      return {
        available: false,
        field: 'email',
        error: 'Email address already registered by another user',
      };
    }
  }

  if (phone && typeof phone === 'string') {
    const normalizedPhone = normalizePhoneForComparison(phone);

    if (normalizedPhone) {
      const existingUserByPhone = await findUserByPhoneInDb(supabase, phone);

      if (existingUserByPhone) {
        return {
          available: false,
          field: 'phone',
          error: 'Phone number already registered by another user',
        };
      }

      const authUserByPhone = await findAuthUserByPhone(supabase, normalizedPhone);
      if (authUserByPhone && authUserByPhone.id !== excludeAuthUserId) {
        return {
          available: false,
          field: 'phone',
          error: 'Phone number already registered by another user',
        };
      }
    }
  }

  return { available: true };
}
