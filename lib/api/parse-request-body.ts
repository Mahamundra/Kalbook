import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api/responses';

export function validationErrorResponse(error: z.ZodError) {
  return apiError('VALIDATION_ERROR', 'Invalid request body', 422, error.flatten());
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return {
      success: false,
      response: apiError('INVALID_JSON', 'Request body must be valid JSON', 400),
    };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return { success: false, response: validationErrorResponse(result.error) };
  }

  return { success: true, data: result.data };
}
