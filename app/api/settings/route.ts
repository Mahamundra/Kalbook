import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { mapSettingsToInterface, prepareSettingsUpdate, mergeSettingsUpdate } from '@/lib/settings/utils';
import type { Settings } from '@/components/ported/types/admin';

/**
 * GET /api/settings
 * Get business settings (combines businesses table + settings table)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessSlug = searchParams.get('businessSlug');
    
    // Get tenant context (or use slug if provided)
    let tenantInfo = await getTenantInfoFromRequest(request);
    
    // If slug is provided and no tenant context, get business by slug
    if (businessSlug && !tenantInfo?.businessId) {
      const { getBusinessBySlug } = await import('@/lib/business');
      const business = await getBusinessBySlug(businessSlug);
      if (business) {
        tenantInfo = {
          businessId: business.id,
          businessSlug: business.slug,
        };
      }
    }
    
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', tenantInfo.businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get settings data
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .maybeSingle();

    if (settingsError && settingsError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: settingsError.message || 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Map to Settings interface
    const mappedSettings = mapSettingsToInterface(business, settings);

    return NextResponse.json({
      success: true,
      settings: mappedSettings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings
 * Update settings with partial merge (not replace)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', tenantInfo.businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get current settings
    const { data: currentSettings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .maybeSingle();

    if (settingsError && settingsError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: settingsError.message || 'Failed to fetch current settings' },
        { status: 500 }
      );
    }

    // Map current settings to interface
    const currentMappedSettings = mapSettingsToInterface(business, currentSettings);

    // Merge updates with current settings (deep merge)
    const updatedSettings = mergeSettingsUpdate(currentMappedSettings, body);

    // Prepare updates for database
    const { businessUpdate, settingsUpdate } = prepareSettingsUpdate(
      updatedSettings,
      tenantInfo.businessId
    );

    // Update business table if needed
    if (Object.keys(businessUpdate).length > 0) {
      const { error: updateBusinessError } = await supabase
        .from('businesses')
        .update(businessUpdate)
        .eq('id', tenantInfo.businessId);

      if (updateBusinessError) {
        return NextResponse.json(
          { error: updateBusinessError.message || 'Failed to update business profile' },
          { status: 500 }
        );
      }
    }

    // Update or create settings
    if (Object.keys(settingsUpdate).length > 0) {
      if (currentSettings) {
        // Update existing settings with deep merge for JSONB columns
        const mergedSettings: any = {
          branding: currentSettings.branding
            ? { ...currentSettings.branding, ...settingsUpdate.branding }
            : settingsUpdate.branding,
          locale: currentSettings.locale
            ? { ...currentSettings.locale, ...settingsUpdate.locale }
            : settingsUpdate.locale,
          notifications: currentSettings.notifications
            ? { ...currentSettings.notifications, ...settingsUpdate.notifications }
            : settingsUpdate.notifications,
          calendar: currentSettings.calendar
            ? { ...currentSettings.calendar, ...settingsUpdate.calendar }
            : settingsUpdate.calendar,
          registration: currentSettings.registration
            ? { ...currentSettings.registration, ...settingsUpdate.registration }
            : settingsUpdate.registration,
        };

        // Remove undefined values
        Object.keys(mergedSettings).forEach((key) => {
          if (mergedSettings[key] === undefined) {
            delete mergedSettings[key];
          }
        });

        const { error: updateSettingsError } = await supabase
          .from('settings')
          .update(mergedSettings)
          .eq('business_id', tenantInfo.businessId);

        if (updateSettingsError) {
          return NextResponse.json(
            { error: updateSettingsError.message || 'Failed to update settings' },
            { status: 500 }
          );
        }
      } else {
        // Create new settings record
        const { error: createSettingsError } = await supabase
          .from('settings')
          .insert({
            business_id: tenantInfo.businessId,
            ...settingsUpdate,
          } as any);

        if (createSettingsError) {
          return NextResponse.json(
            { error: createSettingsError.message || 'Failed to create settings' },
            { status: 500 }
          );
        }
      }
    }

    // Fetch updated data
    const { data: updatedBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', tenantInfo.businessId)
      .single();

    const { data: updatedSettingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('business_id', tenantInfo.businessId)
      .maybeSingle();

    // Map to Settings interface
    const finalSettings = mapSettingsToInterface(updatedBusiness!, updatedSettingsData);

    return NextResponse.json({
      success: true,
      settings: finalSettings,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

