import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

/**
 * Helper function to check if business is gym_trainer
 */
async function checkGymTrainerBusiness(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('business_type')
    .eq('id', businessId)
    .single() as { data: { business_type: string } | null; error: any };
  
  return business?.business_type === 'gym_trainer';
}

/**
 * GET /api/dashboard/inactive-clients
 * Get clients who haven't had an appointment in the last N days (gym_trainer only)
 * Query params: days (default: 14)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Check if business is gym_trainer
    const isGymTrainer = await checkGymTrainerBusiness(tenantInfo.businessId);
    if (!isGymTrainer) {
      return NextResponse.json(
        { error: 'This feature is only available for gym_trainer businesses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    const supabase = createAdminClient();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all customers for this business
    const { data: allCustomers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, phone, email, created_at')
      .eq('business_id', tenantInfo.businessId);

    if (customersError) {
      return NextResponse.json(
        { error: customersError.message || 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    if (!allCustomers || allCustomers.length === 0) {
      return NextResponse.json({
        success: true,
        customers: [],
      });
    }

    // Get customers with appointments after cutoff date
    const { data: recentAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('customer_id')
      .eq('business_id', tenantInfo.businessId)
      .gte('start', cutoffDate.toISOString())
      .neq('status', 'cancelled');

    if (appointmentsError) {
      return NextResponse.json(
        { error: appointmentsError.message || 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Get unique customer IDs with recent appointments
    const activeCustomerIds = new Set(
      (recentAppointments || []).map((a: any) => a.customer_id)
    );

    // Filter out customers with recent appointments
    const inactiveCustomers = (allCustomers || []).filter(
      (customer: any) => !activeCustomerIds.has(customer.id)
    );

    // Calculate days since last appointment for each inactive customer
    const customersWithLastAppointment = await Promise.all(
      inactiveCustomers.map(async (customer: any) => {
        const { data: lastAppointment } = await supabase
          .from('appointments')
          .select('start')
          .eq('business_id', tenantInfo.businessId)
          .eq('customer_id', customer.id)
          .neq('status', 'cancelled')
          .order('start', { ascending: false })
          .limit(1)
          .single() as { data: { start: string } | null; error: any };

        let daysSinceLastAppointment: number | null = null;
        if (lastAppointment?.start) {
          const lastApptDate = new Date(lastAppointment.start);
          const daysDiff = Math.floor(
            (cutoffDate.getTime() - lastApptDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysSinceLastAppointment = daysDiff;
        } else {
          // Never had an appointment
          const createdDate = new Date(customer.created_at);
          const daysDiff = Math.floor(
            (cutoffDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysSinceLastAppointment = daysDiff;
        }

        return {
          ...customer,
          daysSinceLastAppointment,
        };
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithLastAppointment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch inactive clients' },
      { status: 500 }
    );
  }
}

