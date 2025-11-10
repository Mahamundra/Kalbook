import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import type { Template } from '@/components/ported/types/admin';
import type { Database } from '@/lib/supabase/database.types';

type TemplateRow = Database['public']['Tables']['templates']['Row'];

/**
 * Map database template row to Template interface
 */
function mapTemplateToInterface(template: TemplateRow): Template {
  return {
    id: template.id,
    channel: template.channel,
    type: template.type,
    locale: template.locale as 'en' | 'he',
    subject: template.subject || undefined,
    body: template.body,
  };
}

/**
 * GET /api/templates
 * Get all templates for the current business (with filtering)
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel'); // 'email' or 'message'
    const type = searchParams.get('type'); // 'booking_confirmation', 'reminder', 'cancellation'
    const locale = searchParams.get('locale'); // 'en' or 'he'

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from('templates')
      .select('*')
      .eq('business_id', tenantInfo.businessId);

    // Apply filters
    if (channel) {
      if (channel !== 'email' && channel !== 'message') {
        return NextResponse.json(
          { error: 'Invalid channel. Must be "email" or "message"' },
          { status: 400 }
        );
      }
      query = query.eq('channel', channel);
    }

    if (type) {
      if (
        type !== 'booking_confirmation' &&
        type !== 'reminder' &&
        type !== 'cancellation'
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid type. Must be "booking_confirmation", "reminder", or "cancellation"',
          },
          { status: 400 }
        );
      }
      query = query.eq('type', type);
    }

    if (locale) {
      query = query.eq('locale', locale);
    }

    // Order by channel, type, locale
    query = query.order('channel', { ascending: true })
      .order('type', { ascending: true })
      .order('locale', { ascending: true });

    const { data: templates, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Map to Template interface
    const mappedTemplates: Template[] = (templates || []).map(
      mapTemplateToInterface
    );

    return NextResponse.json({
      success: true,
      templates: mappedTemplates,
      count: mappedTemplates.length,
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template
 */
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!body.channel || (body.channel !== 'email' && body.channel !== 'message')) {
      return NextResponse.json(
        { error: 'Channel is required and must be "email" or "message"' },
        { status: 400 }
      );
    }

    if (
      !body.type ||
      (body.type !== 'booking_confirmation' &&
        body.type !== 'reminder' &&
        body.type !== 'cancellation')
    ) {
      return NextResponse.json(
        {
          error:
            'Type is required and must be "booking_confirmation", "reminder", or "cancellation"',
        },
        { status: 400 }
      );
    }

    if (!body.locale || typeof body.locale !== 'string') {
      return NextResponse.json(
        { error: 'Locale is required' },
        { status: 400 }
      );
    }

    if (!body.body || typeof body.body !== 'string' || body.body.trim() === '') {
      return NextResponse.json(
        { error: 'Body is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Subject is required for email templates
    if (body.channel === 'email' && (!body.subject || body.subject.trim() === '')) {
      return NextResponse.json(
        { error: 'Subject is required for email templates' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if template with same channel, type, and locale already exists
      const existingTemplateResult = await supabase
        .from('templates')
        .select('id')
        .eq('business_id', tenantInfo.businessId)
        .eq('channel', body.channel)
        .eq('type', body.type)
        .eq('locale', body.locale)
        .maybeSingle() as { data: TemplateRow | null; error: any };
      const { data: existingTemplate } = existingTemplateResult;

      if (existingTemplate) {
      return NextResponse.json(
        {
          error: 'Template with this channel, type, and locale already exists',
          existingTemplateId: existingTemplate.id,
        },
        { status: 409 }
      );
    }

    // Prepare template data
    const templateData = {
      business_id: tenantInfo.businessId,
      channel: body.channel,
      type: body.type,
      locale: body.locale,
      subject: body.channel === 'email' ? body.subject : null,
      body: body.body.trim(),
    };

    // Create template
    const { data: newTemplate, error } = await supabase
      .from('templates')
      .insert(templateData as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create template' },
        { status: 500 }
      );
    }

    // Map to Template interface
    const mappedTemplate = mapTemplateToInterface(newTemplate);

    return NextResponse.json(
      {
        success: true,
        template: mappedTemplate,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

