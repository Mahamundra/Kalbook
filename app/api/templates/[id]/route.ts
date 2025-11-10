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
 * GET /api/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get template and verify it belongs to the business
    const templateResult = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: TemplateRow | null; error: any };
    const { data: template, error } = templateResult;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to fetch template' },
        { status: 500 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Map to Template interface
    const mappedTemplate = mapTemplateToInterface(template);

    return NextResponse.json({
      success: true,
      template: mappedTemplate,
    });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
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

    // Get existing template
    const fetchResult = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: TemplateRow | null; error: any };
    const { data: existingTemplate, error: fetchError } = fetchResult;

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (body.channel !== undefined) {
      if (body.channel !== 'email' && body.channel !== 'message') {
        return NextResponse.json(
          { error: 'Invalid channel. Must be "email" or "message"' },
          { status: 400 }
        );
      }
      updateData.channel = body.channel;
    }

    if (body.type !== undefined) {
      if (
        body.type !== 'booking_confirmation' &&
        body.type !== 'reminder' &&
        body.type !== 'cancellation'
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid type. Must be "booking_confirmation", "reminder", or "cancellation"',
          },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }

    if (body.locale !== undefined) {
      if (typeof body.locale !== 'string') {
        return NextResponse.json(
          { error: 'Locale must be a string' },
          { status: 400 }
        );
      }
      updateData.locale = body.locale;
    }

    if (body.subject !== undefined) {
      const channel = body.channel !== undefined ? body.channel : existingTemplate.channel;
      if (channel === 'email' && (!body.subject || body.subject.trim() === '')) {
        return NextResponse.json(
          { error: 'Subject is required for email templates' },
          { status: 400 }
        );
      }
      updateData.subject = body.subject || null;
    }

    if (body.body !== undefined) {
      if (typeof body.body !== 'string' || body.body.trim() === '') {
        return NextResponse.json(
          { error: 'Body cannot be empty' },
          { status: 400 }
        );
      }
      updateData.body = body.body.trim();
    }

    // Check for duplicate if channel, type, or locale changed
    if (body.channel !== undefined || body.type !== undefined || body.locale !== undefined) {
      const checkChannel = body.channel !== undefined ? body.channel : existingTemplate.channel;
      const checkType = body.type !== undefined ? body.type : existingTemplate.type;
      const checkLocale = body.locale !== undefined ? body.locale : existingTemplate.locale;

      const duplicateTemplateResult = await supabase
        .from('templates')
        .select('id')
        .eq('business_id', tenantInfo.businessId)
        .eq('channel', checkChannel)
        .eq('type', checkType)
        .eq('locale', checkLocale)
        .neq('id', templateId)
        .maybeSingle() as { data: TemplateRow | null; error: any };
      const { data: duplicateTemplate } = duplicateTemplateResult;

      if (duplicateTemplate) {
        return NextResponse.json(
          {
            error: 'Template with this channel, type, and locale already exists',
            duplicateTemplateId: duplicateTemplate.id,
          },
          { status: 409 }
        );
      }
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      const mappedTemplate = mapTemplateToInterface(existingTemplate);
      return NextResponse.json({
        success: true,
        template: mappedTemplate,
      });
    }

    // Update template
    const updateResult = await (supabase
      .from('templates') as any)
      .update(updateData)
      .eq('id', templateId)
      .eq('business_id', tenantInfo.businessId)
      .select()
      .single() as { data: TemplateRow | null; error: any };
    const { data: updatedTemplate, error: updateError } = updateResult;

    if (updateError || !updatedTemplate) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update template' },
        { status: 500 }
      );
    }

    // Map to Template interface
    const mappedTemplate = mapTemplateToInterface(updatedTemplate);

    return NextResponse.json({
      success: true,
      template: mappedTemplate,
    });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify template exists and belongs to business
    const checkResult = await supabase
      .from('templates')
      .select('id, business_id')
      .eq('id', templateId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: TemplateRow | null; error: any };
    const { data: existingTemplate, error: checkError } = checkResult;

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('business_id', tenantInfo.businessId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

