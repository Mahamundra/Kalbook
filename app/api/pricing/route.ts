import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrencySymbol } from '@/lib/pricing/currency';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pricing?locale=en
 * Get pricing for all plans from database (prices are stored in ILS)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    const supabase = createAdminClient();

    // Get all active plans from database with features (metadata) and updated_at
    const plansResult = await supabase
      .from('plans')
      .select('name, price, features, updated_at')
      .eq('active', true)
      .order('price', { ascending: true }) as { data: Array<{ name: string; price: number; features: Record<string, any>; updated_at: string }> | null; error: any };

    if (plansResult.error) {
      throw new Error(plansResult.error.message || 'Failed to fetch plans');
    }

    const plans = plansResult.data || [];

    // Get currency symbol based on locale
    const currency = locale === 'he' || locale === 'ar' ? 'ILS' : 'USD';
    const symbol = getCurrencySymbol(currency);

    // Build pricing object - map to homepage plan keys (free, pro, custom)
    const pricing: Record<string, { price: number; currency: string; symbol: string; metadata?: any }> = {};

    plans.forEach((plan) => {
      const planName = plan.name.toLowerCase();
      const features = plan.features || {};
      
      // Map database plan names to homepage plan keys
      // Also check metadata name if it exists
      const metadataName = features.name ? features.name.toLowerCase() : null;
      let homepageKey: string | null = null;
      
      if (planName === 'portfolio' || metadataName === 'portfolio') {
        homepageKey = 'portfolio';
      } else if (planName === 'basic' || planName === 'free' || metadataName === 'free') {
        homepageKey = 'free';
      } else if (planName === 'professional' || planName === 'pro' || metadataName === 'pro') {
        homepageKey = 'pro';
      } else if (planName === 'business' || planName === 'custom' || metadataName === 'custom') {
        homepageKey = 'custom';
      }
      
      if (homepageKey) {
        // Prices are stored in ILS
        let displayPrice = Number(plan.price);
        
        // If this plan key already exists, only update if this plan has a lower price (for ordering)
        if (!pricing[homepageKey] || pricing[homepageKey].price > displayPrice) {
          pricing[homepageKey] = {
            price: displayPrice,
            currency: 'ILS',
            symbol: '₪',
            metadata: {
              name: features.name || plan.name,
              priceNote: features.priceNote || '',
              cta: features.cta || '',
              note: features.note || '',
              // Get highlights for the current locale, fallback to old format or empty
              highlights: features[`highlights_${locale}`] || features.highlights || [],
            },
          };
        }
      }
    });

    // Ensure all plans are present (fallback to defaults if missing)
    // Order matters - portfolio first (0), then free/basic (29), pro (79), custom (249)
    if (!pricing.portfolio) pricing.portfolio = { price: 0, currency: 'ILS', symbol: '₪', metadata: {} };
    if (!pricing.free) pricing.free = { price: 29, currency: 'ILS', symbol: '₪', metadata: {} };
    if (!pricing.pro) pricing.pro = { price: 79, currency: 'ILS', symbol: '₪', metadata: {} };
    if (!pricing.custom) pricing.custom = { price: 249, currency: 'ILS', symbol: '₪', metadata: {} };

    // Get the latest updated_at timestamp from all plans for cache invalidation
    const latestUpdate = plans.length > 0 
      ? Math.max(...plans.map(p => new Date(p.updated_at).getTime()))
      : Date.now();

    return NextResponse.json({
      success: true,
      pricing,
      locale,
      lastUpdated: latestUpdate, // Timestamp for cache invalidation
    }, {
      headers: {
        // Disable all caching - always fetch fresh data from database
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}

