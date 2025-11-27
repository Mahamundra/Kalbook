import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { getSession } from '@/lib/auth/session';
import type { Database } from '@/lib/supabase/database.types';

type NotesHistoryRow = Database['public']['Tables']['customer_notes_history']['Row'];

/**
 * GET /api/customers/[id]/notes-history
 * Get notes history for a customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const customerId = params.id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const customerResult = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get notes history
    const notesResult = await supabase
      .from('customer_notes_history')
      .select(`
        *,
        users (id, name, email)
      `)
      .eq('customer_id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .order('created_at', { ascending: false }) as {
      data: Array<NotesHistoryRow & {
        users: { id: string; name: string; email: string } | null;
      }> | null;
      error: any;
    };

    if (notesResult.error) {
      return NextResponse.json(
        { error: notesResult.error.message || 'Failed to fetch notes history' },
        { status: 500 }
      );
    }

    // Format response
    const notes = (notesResult.data || []).map((note) => ({
      id: note.id,
      customerId: note.customer_id,
      noteText: note.note_text,
      createdBy: note.created_by,
      createdByUser: note.users ? {
        id: note.users.id,
        name: note.users.name,
        email: note.users.email,
      } : null,
      createdAt: note.created_at,
    }));

    return NextResponse.json({
      success: true,
      notes,
    });
  } catch (error: any) {
    console.error('Error fetching notes history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/notes-history
 * Add a new note to customer history
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const customerId = params.id;
    const body = await request.json();
    const { noteText } = body;

    if (!noteText || typeof noteText !== 'string' || noteText.trim() === '') {
      return NextResponse.json(
        { error: 'Note text is required' },
        { status: 400 }
      );
    }

    // Get user ID from session
    const session = await getSession();
    const userId = session?.user?.id;

    const supabase = createAdminClient();

    // Verify customer belongs to business
    const customerResult = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('business_id', tenantInfo.businessId)
      .single() as { data: { id: string } | null; error: any };

    if (customerResult.error || !customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Add note to history
    const noteResult = await supabase
      .from('customer_notes_history')
      .insert({
        customer_id: customerId,
        business_id: tenantInfo.businessId,
        note_text: noteText.trim(),
        created_by: userId || null,
      } as never)
      .select(`
        *,
        users (id, name, email)
      `)
      .single() as {
      data: NotesHistoryRow & {
        users: { id: string; name: string; email: string } | null;
      } | null;
      error: any;
    };

    if (noteResult.error || !noteResult.data) {
      return NextResponse.json(
        { error: noteResult.error?.message || 'Failed to add note' },
        { status: 500 }
      );
    }

    // Update customer's notes field with latest note
    await supabase
      .from('customers')
      .update({ notes: noteText.trim() } as never)
      .eq('id', customerId);

    // Format response
    const note = {
      id: noteResult.data.id,
      customerId: noteResult.data.customer_id,
      noteText: noteResult.data.note_text,
      createdBy: noteResult.data.created_by,
      createdByUser: noteResult.data.users ? {
        id: noteResult.data.users.id,
        name: noteResult.data.users.name,
        email: noteResult.data.users.email,
      } : null,
      createdAt: noteResult.data.created_at,
    };

    return NextResponse.json({
      success: true,
      note,
    });
  } catch (error: any) {
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}


