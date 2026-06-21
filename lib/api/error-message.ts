type ApiErrorResponse = {
  error?: unknown;
  retryAfter?: number;
};

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function getApiRetryAfter(data: ApiErrorResponse): number | undefined {
  if (typeof data.retryAfter === 'number') return data.retryAfter;

  const error = data.error;
  if (error && typeof error === 'object' && 'details' in error) {
    const details = (error as { details?: unknown }).details;
    if (details && typeof details === 'object' && 'retryAfter' in details) {
      const retryAfter = (details as { retryAfter?: unknown }).retryAfter;
      if (typeof retryAfter === 'number') return retryAfter;
    }
  }

  return undefined;
}
