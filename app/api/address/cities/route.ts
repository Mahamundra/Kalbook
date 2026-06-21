import { NextRequest, NextResponse } from 'next/server';
import { getCachedCities } from '@/lib/address/city-cache';
import { internalError } from '@/lib/api/responses';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    const cities = await getCachedCities(q);

    return NextResponse.json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return internalError('Failed to fetch cities');
  }
}
