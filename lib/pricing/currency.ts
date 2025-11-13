/**
 * Currency conversion utilities
 * Uses free exchange rate API to convert prices based on locale
 */

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/ILS';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

let exchangeRatesCache: {
  rates: Record<string, number>;
  timestamp: number;
} | null = null;

/**
 * Get exchange rates from API (with caching)
 */
async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache first
  if (exchangeRatesCache && Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION) {
    return exchangeRatesCache.rates;
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rates = data.rates || {};

    // Cache the rates
    exchangeRatesCache = {
      rates,
      timestamp: Date.now(),
    };

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Fallback to default rates if API fails
    return {
      USD: 0.27, // 1 ILS = 0.27 USD (approximate)
      EUR: 0.25, // 1 ILS = 0.25 EUR (approximate)
      ILS: 1,    // Base currency
      RUB: 25,   // 1 ILS = 25 RUB (approximate)
    };
  }
}

/**
 * Get currency code based on locale
 */
export function getCurrencyFromLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'USD',
    he: 'ILS',
    ar: 'ILS', // Arabic speakers in Israel typically use ILS
    ru: 'USD', // Russian speakers - default to USD
  };

  return localeMap[locale] || 'USD';
}

/**
 * Get currency symbol based on currency code
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    ILS: '₪',
    EUR: '€',
    RUB: '₽',
  };

  return symbols[currency] || '$';
}

/**
 * Convert price from ILS to target currency
 */
export async function convertPrice(
  priceILS: number,
  targetCurrency: string
): Promise<number> {
  if (targetCurrency === 'ILS') {
    return priceILS;
  }

  const rates = await getExchangeRates();
  const rate = rates[targetCurrency];

  if (!rate) {
    // If currency not found, return original price
    console.warn(`Exchange rate not found for ${targetCurrency}, using ILS price`);
    return priceILS;
  }

  return Math.round(priceILS * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Get pricing for all plans in a specific currency
 */
export async function getPricingByCurrency(
  locale: string
): Promise<{
  basic: { price: number; currency: string; symbol: string };
  professional: { price: number; currency: string; symbol: string };
  business: { price: number; currency: string; symbol: string };
}> {
  const currency = getCurrencyFromLocale(locale);
  const symbol = getCurrencySymbol(currency);

  // Base prices in ILS
  const basePrices = {
    basic: 39, // 14 days free, then 39 ILS/month
    professional: 79,
    business: 149,
  };

  // Convert prices
  const [basicPrice, professionalPrice, businessPrice] = await Promise.all([
    convertPrice(basePrices.basic, currency),
    convertPrice(basePrices.professional, currency),
    convertPrice(basePrices.business, currency),
  ]);

  return {
    basic: {
      price: basicPrice,
      currency,
      symbol,
    },
    professional: {
      price: professionalPrice,
      currency,
      symbol,
    },
    business: {
      price: businessPrice,
      currency,
      symbol,
    },
  };
}

