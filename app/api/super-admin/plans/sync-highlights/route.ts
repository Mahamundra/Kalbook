import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/super-admin/auth';
import type { Database } from '@/lib/supabase/database.types';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';

type PlanRow = Database['public']['Tables']['plans']['Row'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/super-admin/plans/sync-highlights
 * Sync highlights from translation files to database for all languages
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = createAdminClient();

    // Map database plan names to translation keys (handle both old and new names)
    const planKeyMap: Record<string, string> = {
      'basic': 'free',
      'professional': 'pro',
      'business': 'custom',
      'Free': 'free',
      'Pro': 'pro',
      'Custom': 'custom',
      'free': 'free',
      'pro': 'pro',
      'custom': 'custom',
    };

    // Get all active plans
    const plansResult = await supabase
      .from('plans')
      .select('*')
      .eq('active', true) as { data: PlanRow[] | null; error: any };

    if (plansResult.error) {
      return NextResponse.json(
        { error: plansResult.error.message || 'Failed to fetch plans' },
        { status: 500 }
      );
    }

    const plans = plansResult.data || [];
    const translations: Record<string, any> = { en, he, ar, ru };
    const results: Array<{ planName: string; success: boolean; error?: string; translationKey?: string; highlightsCount?: Record<string, number> }> = [];

    // Update each plan with highlights from translation files
    for (const plan of plans) {
      try {
        const planNameLower = plan.name.toLowerCase();
        let translationKey = planKeyMap[plan.name] || planKeyMap[planNameLower];
        
        // If still not found, try to infer from name
        if (!translationKey) {
          if (planNameLower.includes('free') || planNameLower.includes('basic')) {
            translationKey = 'free';
          } else if (planNameLower.includes('pro') || planNameLower.includes('professional')) {
            translationKey = 'pro';
          } else if (planNameLower.includes('custom') || planNameLower.includes('business')) {
            translationKey = 'custom';
          } else {
            translationKey = planNameLower;
          }
        }
        const currentFeatures = plan.features || {};

        // Get highlights for all languages from translation files
        const highlights_en = translations.en?.home?.pricing?.plans?.[translationKey]?.highlights || [];
        const highlights_he = translations.he?.home?.pricing?.plans?.[translationKey]?.highlights || [];
        const highlights_ar = translations.ar?.home?.pricing?.plans?.[translationKey]?.highlights || [];
        const highlights_ru = translations.ru?.home?.pricing?.plans?.[translationKey]?.highlights || [];

        // Update features JSONB with highlights for all languages
        const updatedFeatures = {
          ...currentFeatures,
          highlights_en: Array.isArray(highlights_en) ? highlights_en : [],
          highlights_he: Array.isArray(highlights_he) ? highlights_he : [],
          highlights_ar: Array.isArray(highlights_ar) ? highlights_ar : [],
          highlights_ru: Array.isArray(highlights_ru) ? highlights_ru : [],
        };

        // Update plan in database
        const updateResult = await (supabase
          .from('plans') as any)
          .update({ features: updatedFeatures })
          .eq('id', plan.id)
          .select()
          .single() as { data: PlanRow | null; error: any };

        if (updateResult.error) {
          results.push({
            planName: plan.name,
            success: false,
            error: updateResult.error.message,
            translationKey,
          });
        } else {
          results.push({
            planName: plan.name,
            success: true,
            translationKey,
            highlightsCount: {
              en: highlights_en.length,
              he: highlights_he.length,
              ar: highlights_ar.length,
              ru: highlights_ru.length,
            },
          });
        }
      } catch (error: any) {
        results.push({
          planName: plan.name,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Highlights synced from translation files to database',
      results,
    });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to sync highlights' },
      { status: 500 }
    );
  }
}

