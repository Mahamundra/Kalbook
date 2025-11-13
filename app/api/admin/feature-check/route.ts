import { NextRequest, NextResponse } from 'next/server';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';
import { canBusinessPerformAction } from '@/lib/trial/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/feature-check?feature=feature_name
 * Check if current business can perform a specific action
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

    const { searchParams } = new URL(request.url);
    const featureName = searchParams.get('feature');

    if (!featureName) {
      return NextResponse.json(
        { error: 'feature parameter is required' },
        { status: 400 }
      );
    }

    const canPerform = await canBusinessPerformAction(tenantInfo.businessId, featureName);

    return NextResponse.json({
      success: true,
      canPerform,
      feature: featureName,
    });
  } catch (error: any) {
    console.error('Error checking feature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check feature' },
      { status: 500 }
    );
  }
}

