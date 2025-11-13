import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { 
  getPlanLimit, 
  countBusinessWorkers, 
  countBusinessServices, 
  countBusinessAppointmentsThisMonth 
} from '@/lib/trial/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/plan-limits
 * Get current plan limits and usage for the business
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

    // Get all limits
    const [maxStaff, maxServices, maxBookings] = await Promise.all([
      getPlanLimit(tenantInfo.businessId, 'max_staff'),
      getPlanLimit(tenantInfo.businessId, 'max_services'),
      getPlanLimit(tenantInfo.businessId, 'max_bookings_per_month'),
    ]);

    // Get current counts
    const [currentStaff, currentServices, currentBookings] = await Promise.all([
      countBusinessWorkers(tenantInfo.businessId),
      countBusinessServices(tenantInfo.businessId),
      countBusinessAppointmentsThisMonth(tenantInfo.businessId),
    ]);

    // Ensure all values are numbers for comparison
    const maxStaffNum = Number(maxStaff);
    const maxServicesNum = Number(maxServices);
    const maxBookingsNum = Number(maxBookings);
    const currentStaffNum = Number(currentStaff);
    const currentServicesNum = Number(currentServices);
    const currentBookingsNum = Number(currentBookings);

    return NextResponse.json({
      success: true,
      limits: {
        max_staff: {
          limit: maxStaffNum,
          current: currentStaffNum,
          canAdd: maxStaffNum === -1 || currentStaffNum < maxStaffNum,
        },
        max_services: {
          limit: maxServicesNum,
          current: currentServicesNum,
          canAdd: maxServicesNum === -1 || currentServicesNum < maxServicesNum,
        },
        max_bookings_per_month: {
          limit: maxBookingsNum,
          current: currentBookingsNum,
          canAdd: maxBookingsNum === -1 || currentBookingsNum < maxBookingsNum,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching plan limits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plan limits' },
      { status: 500 }
    );
  }
}

