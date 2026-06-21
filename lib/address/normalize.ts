/**
 * Normalize text for Hebrew/Latin address search matching.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^א-תa-z0-9]+/gi, '');
}

/**
 * Fix bracket ordering in gov.il city names (ported from legacy import logic).
 */
export function normalizeGovLabel(value: string): string {
  const trimmed = trimExtraSpaces(value);
  if (trimmed.includes(')') && trimmed.indexOf(')') > trimmed.indexOf('(')) {
    return trimmed;
  }
  return trimExtraSpaces(
    trimmed.replace(/\(/g, ']').replace(/\)/g, '(').replace(/\]/g, ')')
  );
}

function trimExtraSpaces(value: string): string {
  return value.replace(/\s{2,}/g, ' ').trim();
}

export function composeIsraeliAddress(parts: {
  street?: string;
  houseNumber?: string;
  city?: string;
}): string {
  const streetPart = [parts.street?.trim(), parts.houseNumber?.trim()].filter(Boolean).join(' ');
  const cityPart = parts.city?.trim();

  if (streetPart && cityPart) {
    return `${streetPart}, ${cityPart}`;
  }

  return streetPart || cityPart || '';
}

export function matchesSearchQuery(label: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(label).includes(normalizedQuery);
}
