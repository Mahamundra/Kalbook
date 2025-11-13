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

    // Get all active plans from database
    const plansResult = await supabase
      .from('plans')
      .select('name, price')
      .eq('active', true)
      .order('price', { ascending: true }) as { data: Array<{ name: string; price: number }> | null; error: any };

    if (plansResult.error) {
      throw new Error(plansResult.error.message || 'Failed to fetch plans');
    }

    const plans = plansResult.data || [];

    // Get currency symbol based on locale
    const currency = locale === 'he' || locale === 'ar' ? 'ILS' : 'USD';
    const symbol = getCurrencySymbol(currency);

    // Build pricing object
    const pricing: Record<string, { price: number; currency: string; symbol: string }> = {};

    plans.forEach((plan) => {
      const planName = plan.name.toLowerCase();
      if (['basic', 'professional', 'business'].includes(planName)) {
        // Prices are stored in ILS, convert to display currency if needed
        let displayPrice = Number(plan.price);
        
        // For now, we'll show ILS prices directly (no conversion)
        // If you want currency conversion, uncomment the following:
        // if (currency === 'USD') {
        //   displayPrice = displayPrice / 3.7; // Approximate ILS to USD conversion
        // }
        
        pricing[planName] = {
          price: displayPrice,
          currency: 'ILS', // Always ILS for now
          symbol: '₪', // Always show ILS symbol
        };
      }
    });

    // Ensure all three plans are present (fallback to 0 if missing)
    if (!pricing.basic) pricing.basic = { price: 0, currency: 'ILS', symbol: '₪' };
    if (!pricing.professional) pricing.professional = { price: 0, currency: 'ILS', symbol: '₪' };
    if (!pricing.business) pricing.business = { price: 0, currency: 'ILS', symbol: '₪' };

    return NextResponse.json({
      success: true,
      pricing,
      locale,
    });
  } catch (error: any) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}

