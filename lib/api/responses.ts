import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'BUSINESS_CONTEXT_REQUIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export function apiErrorFromMessage(
  message: string,
  status: number,
  code?: ApiErrorCode,
  details?: unknown
) {
  return apiError(code ?? STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR', message, status, details);
}

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function businessContextRequired() {
  return apiError('BUSINESS_CONTEXT_REQUIRED', 'Business context required', 400);
}

export function internalError(message = 'Internal server error') {
  return apiError('INTERNAL_ERROR', message, 500);
}
