import { fetchAllCities, searchStreets } from '@/lib/address/gov-data-client';
import { matchesSearchQuery } from '@/lib/address/normalize';
import type { CityOption, StreetOption } from '@/lib/address/types';

const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STREET_CACHE_TTL_MS = 5 * 60 * 1000;

let cityCache: { data: CityOption[]; expiresAt: number } | null = null;
const streetCache = new Map<string, { data: StreetOption[]; expiresAt: number }>();

export async function getCachedCities(query?: string): Promise<CityOption[]> {
  const now = Date.now();

  if (!cityCache || cityCache.expiresAt <= now) {
    const cities = await fetchAllCities();
    cityCache = {
      data: cities,
      expiresAt: now + CITY_CACHE_TTL_MS,
    };
  }

  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return cityCache.data.slice(0, 30);
  }

  return cityCache.data
    .filter((city) => matchesSearchQuery(city.label, trimmedQuery))
    .slice(0, 30);
}

export async function getCachedStreets(cityCode: string, query?: string): Promise<StreetOption[]> {
  const cacheKey = `${cityCode}:${query?.trim().toLowerCase() || ''}`;
  const now = Date.now();
  const cached = streetCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const streets = await searchStreets(cityCode, query);
  streetCache.set(cacheKey, {
    data: streets,
    expiresAt: now + STREET_CACHE_TTL_MS,
  });

  return streets;
}
