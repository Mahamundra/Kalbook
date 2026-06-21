export interface CityOption {
  code: string;
  label: string;
  search: string;
}

export interface StreetOption {
  code: string;
  label: string;
  search: string;
  cityCode: string;
}

export interface GovDatastoreRecord {
  [key: string]: string | number | null | undefined;
}

export interface GovDatastoreResult {
  records: GovDatastoreRecord[];
  total: number;
}

export interface GovDatastoreResponse {
  success: boolean;
  result?: GovDatastoreResult;
  error?: {
    message?: string;
  };
}

export const GOV_DATASET_IDS = {
  cities: '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba',
  streets: 'bf185c7f-1a4e-4662-88c5-fa118a244bda',
} as const;

export const GOV_DATASTORE_BASE_URL = 'https://data.gov.il/api/3/action/datastore_search';
