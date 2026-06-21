import {
  GOV_DATASTORE_BASE_URL,
  GOV_DATASET_IDS,
  type CityOption,
  type GovDatastoreRecord,
  type GovDatastoreResponse,
  type StreetOption,
} from '@/lib/address/types';
import { normalizeGovLabel, normalizeSearchText } from '@/lib/address/normalize';

const USER_AGENT = 'Kalbook/1.0';
const FETCH_TIMEOUT_MS = 15_000;

interface FetchGovDatastoreOptions {
  resourceId: string;
  q?: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
}

function getRecordField(record: GovDatastoreRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

async function fetchGovDatastore({
  resourceId,
  q,
  filters,
  limit = 100,
  offset = 0,
}: FetchGovDatastoreOptions): Promise<GovDatastoreResponse> {
  const url = new URL(GOV_DATASTORE_BASE_URL);
  url.searchParams.set('resource_id', resourceId);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  if (q?.trim()) {
    url.searchParams.set('q', q.trim());
  }

  if (filters && Object.keys(filters).length > 0) {
    url.searchParams.set('filters', JSON.stringify(filters));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      throw new Error(`Gov datastore request failed with status ${response.status}`);
    }

    return (await response.json()) as GovDatastoreResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function mapCityRecord(record: GovDatastoreRecord): CityOption | null {
  const code = getRecordField(record, 'sml_ySHvb', 'סמל_ישוב');
  const label = normalizeGovLabel(getRecordField(record, 'SHm_ySHvb', 'שם_ישוב'));

  if (!code || !label) return null;

  return {
    code,
    label,
    search: normalizeSearchText(label),
  };
}

function mapStreetRecord(record: GovDatastoreRecord): StreetOption | null {
  const status = getRecordField(record, 'street_name_status');
  if (status && status !== 'official') return null;

  const cityCode = getRecordField(record, 'city_code');
  const streetCode = getRecordField(record, 'street_code');
  const label = normalizeGovLabel(getRecordField(record, 'street_name'));

  if (!cityCode || !streetCode || !label) return null;

  return {
    code: streetCode,
    label,
    search: normalizeSearchText(label),
    cityCode,
  };
}

export async function fetchAllCities(): Promise<CityOption[]> {
  const cities: CityOption[] = [];
  const pageSize = 1000;
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const response = await fetchGovDatastore({
      resourceId: GOV_DATASET_IDS.cities,
      limit: pageSize,
      offset,
    });

    if (!response.success || !response.result) {
      throw new Error(response.error?.message || 'Failed to fetch cities from gov.il');
    }

    const records = response.result.records ?? [];
    total = response.result.total ?? records.length;

    for (const record of records) {
      const city = mapCityRecord(record);
      if (city) cities.push(city);
    }

    if (records.length === 0) break;
    offset += records.length;
  }

  return cities.sort((a, b) => a.label.localeCompare(b.label, 'he'));
}

export async function searchStreets(cityCode: string, query?: string): Promise<StreetOption[]> {
  const response = await fetchGovDatastore({
    resourceId: GOV_DATASET_IDS.streets,
    q: query?.trim() || undefined,
    filters: {
      city_code: cityCode,
    },
    limit: 50,
  });

  if (!response.success || !response.result) {
    throw new Error(response.error?.message || 'Failed to fetch streets from gov.il');
  }

  const streets: StreetOption[] = [];
  for (const record of response.result.records ?? []) {
    const street = mapStreetRecord(record);
    if (street) streets.push(street);
  }

  return streets.sort((a, b) => a.label.localeCompare(b.label, 'he'));
}
