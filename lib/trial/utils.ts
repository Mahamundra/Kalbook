/**
 * Trial and subscription utility functions
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];
type PlanRow = Database['public']['Tables']['plans']['Row'];
type PlanFeatureRow = Database['public']['Tables']['plan_features']['Row'];

/**
 * Check if a business's trial has expired
 */
export async function isTrialExpired(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  const businessResult = await supabase
    .from('businesses')
    .select('trial_ends_at, subscription_status')
    .eq('id', businessId)
    .single() as { data: BusinessRow | null; error: any };
  
  const business = businessResult.data;
  
  if (!business) {
    return true; // Business not found, consider expired
  }
  
  // If not in trial, check subscription status
  if (business.subscription_status !== 'trial') {
    return business.subscription_status === 'expired' || business.subscription_status === 'cancelled';
  }
  
  // Check if trial has ended
  if (!business.trial_ends_at) {
    return true; // No trial end date, consider expired
  }
  
  const trialEndDate = new Date(business.trial_ends_at);
  const now = new Date();
  
  return now > trialEndDate;
}

/**
 * Get remaining trial days for a business
 */
export async function getTrialDaysRemaining(businessId: string): Promise<number | null> {
  const supabase = createAdminClient();
  
  const businessResult = await supabase
    .from('businesses')
    .select('trial_ends_at, subscription_status')
    .eq('id', businessId)
    .single() as { data: BusinessRow | null; error: any };
  
  const business = businessResult.data;
  
  if (!business || business.subscription_status !== 'trial' || !business.trial_ends_at) {
    return null;
  }
  
  const trialEndDate = new Date(business.trial_ends_at);
  const now = new Date();
  const diffTime = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if a business has access to a specific feature
 */
export async function checkPlanFeature(
  businessId: string,
  featureName: string
): Promise<boolean> {
  const supabase = createAdminClient();
  
  // Get business plan
  const businessResult = await supabase
    .from('businesses')
    .select('plan_id, subscription_status')
    .eq('id', businessId)
    .single() as { data: BusinessRow | null; error: any };
  
  const business = businessResult.data;
  
  if (!business || !business.plan_id) {
    return false; // No plan assigned
  }
  
  // Check if subscription is active (not expired or cancelled)
  if (business.subscription_status === 'expired' || business.subscription_status === 'cancelled') {
    return false;
  }
  
  // If in trial, check if trial is still valid
  if (business.subscription_status === 'trial') {
    const expired = await isTrialExpired(businessId);
    if (expired) {
      return false;
    }
  }
  
  // Get plan feature
  const featureResult = await supabase
    .from('plan_features')
    .select('enabled')
    .eq('plan_id', business.plan_id)
    .eq('feature_name', featureName)
    .single() as { data: PlanFeatureRow | null; error: any };
  
  const feature = featureResult.data;
  
  return feature?.enabled === true;
}

/**
 * Get business plan information
 */
export async function getBusinessPlan(businessId: string): Promise<PlanRow | null> {
  const supabase = createAdminClient();
  
  const businessResult = await supabase
    .from('businesses')
    .select('plan_id')
    .eq('id', businessId)
    .single() as { data: BusinessRow | null; error: any };
  
  const business = businessResult.data;
  
  if (!business || !business.plan_id) {
    return null;
  }
  
  const planResult = await supabase
    .from('plans')
    .select('*')
    .eq('id', business.plan_id)
    .single() as { data: PlanRow | null; error: any };
  
  return planResult.data;
}

/**
 * Get all features for a business's plan
 */
export async function getBusinessPlanFeatures(businessId: string): Promise<Record<string, boolean>> {
  const supabase = createAdminClient();
  
  const businessResult = await supabase
    .from('businesses')
    .select('plan_id')
    .eq('id', businessId)
    .single() as { data: BusinessRow | null; error: any };
  
  const business = businessResult.data;
  
  if (!business || !business.plan_id) {
    return {};
  }
  
  const featuresResult = await supabase
    .from('plan_features')
    .select('feature_name, enabled')
    .eq('plan_id', business.plan_id) as { data: Array<{ feature_name: string; enabled: boolean }> | null; error: any };
  
  const features = featuresResult.data || [];
  
  const featuresMap: Record<string, boolean> = {};
  features.forEach(f => {
    featuresMap[f.feature_name] = f.enabled;
  });
  
  return featuresMap;
}

/**
 * Check if business can perform action (trial not expired and feature enabled)
 */
export async function canBusinessPerformAction(
  businessId: string,
  featureName: string
): Promise<boolean> {
  // First check if trial expired
  const expired = await isTrialExpired(businessId);
  if (expired) {
    return false;
  }
  
  // Then check if feature is enabled
  return await checkPlanFeature(businessId, featureName);
}

/**
 * Map settings path to feature name
 * Returns the feature name required for a given settings path, or null if no feature check needed
 */
export function getFeatureForSettingsPath(settingsPath: string): string | null {
  // Normalize path (remove leading/trailing slashes and dots)
  const normalizedPath = settingsPath.replace(/^\.+|\.+$/g, '').toLowerCase();
  
  // Map settings paths to features
  if (normalizedPath.startsWith('branding')) {
    return 'custom_branding';
  }
  
  if (normalizedPath.includes('whatsapp') || normalizedPath.includes('notifications')) {
    // Check if it's specifically WhatsApp-related
    if (normalizedPath.includes('whatsapp')) {
      return 'whatsapp_integration';
    }
    // General notifications don't require a feature check
    return null;
  }
  
  if (normalizedPath.startsWith('locale') || normalizedPath.includes('language')) {
    return 'multi_language';
  }
  
  // Other settings paths don't require feature checks
  return null;
}

/**
 * Check if business can update a specific settings path
 */
export async function canUpdateSettingsPath(
  businessId: string,
  settingsPath: string
): Promise<boolean> {
  const featureName = getFeatureForSettingsPath(settingsPath);
  
  // If no feature check needed, allow the update
  if (!featureName) {
    return true;
  }
  
  // Check if business has access to the required feature
  return await canBusinessPerformAction(businessId, featureName);
}

/**
 * Get a plan limit value for a business
 * Returns the limit value or -1 if unlimited/not set
 */
export async function getPlanLimit(
  businessId: string,
  limitName: 'max_staff' | 'max_services' | 'max_bookings_per_month'
): Promise<number> {
  const plan = await getBusinessPlan(businessId);
  
  if (!plan || !plan.features) {
    return -1; // Default to unlimited if no plan
  }
  
  const limit = plan.features[limitName];
  
  if (limit === undefined || limit === null) {
    return -1; // Unlimited if not set
  }
  
  return Number(limit);
}

/**
 * Check if a business has reached a plan limit
 * Returns true if limit is reached, false if not limited or under limit
 */
export async function checkPlanLimit(
  businessId: string,
  limitName: 'max_staff' | 'max_services' | 'max_bookings_per_month',
  currentCount: number
): Promise<{ isLimited: boolean; limit: number; canProceed: boolean }> {
  const limit = await getPlanLimit(businessId, limitName);
  
  // -1 means unlimited
  if (limit === -1) {
    return { isLimited: false, limit: -1, canProceed: true };
  }
  
  // Ensure both values are numbers for comparison
  const limitNum = Number(limit);
  const currentCountNum = Number(currentCount);
  
  // If currentCount is already at or above the limit, cannot proceed
  // Example: limit=3, currentCount=3 means they already have 3, cannot add more
  // Example: limit=3, currentCount=2 means they can add 1 more (will become 3)
  const isLimited = currentCountNum >= limitNum;
  
  return {
    isLimited,
    limit: limitNum,
    canProceed: !isLimited, // canProceed is true if NOT limited
  };
}

/**
 * Count current workers for a business
 */
export async function countBusinessWorkers(businessId: string): Promise<number> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('workers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('active', true) as { count: number | null; error: any };
  
  return result.count || 0;
}

/**
 * Count current services for a business
 * Counts ALL services (active and inactive) because the limit applies to total services
 */
export async function countBusinessServices(businessId: string): Promise<number> {
  const supabase = createAdminClient();
  
  const result = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId) as { count: number | null; error: any };
  
  return result.count || 0;
}

/**
 * Count appointments for current month for a business
 */
export async function countBusinessAppointmentsThisMonth(businessId: string): Promise<number> {
  const supabase = createAdminClient();
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const result = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('start', startOfMonth.toISOString())
    .lte('start', endOfMonth.toISOString()) as { count: number | null; error: any };
  
  return result.count || 0;
}

