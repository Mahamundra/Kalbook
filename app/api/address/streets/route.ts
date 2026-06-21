import { NextRequest, NextResponse } from 'next/server';
import { getCachedStreets } from '@/lib/address/city-cache';
import { apiError, internalError } from '@/lib/api/responses';

export async function GET(request: NextRequest) {
  try {
    const cityCode = request.nextUrl.searchParams.get('cityCode')?.trim();
    const q = request.nextUrl.searchParams.get('q') ?? undefined;

    if (!cityCode) {
      return apiError('VALIDATION_ERROR', 'cityCode is required', 400);
    }

    const streets = await getCachedStreets(cityCode, q);

    return NextResponse.json({
      success: true,
      streets,
    });
  } catch (error) {
    console.error('Error fetching streets:', error);
    return internalError('Failed to fetch streets');
  }
}
