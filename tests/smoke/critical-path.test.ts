import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createAppointmentSchema,
  createCustomerSchema,
  onboardingCreateSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '@/lib/api/validation/schemas';
import { getClientIP, checkRateLimit, getOTPRateLimitConfig } from '@/lib/auth/rate-limit';
import { apiError, businessContextRequired } from '@/lib/api/responses';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';

function mockRequest(headers: Record<string, string>, ip?: string): NextRequest {
  return {
    headers: new Headers(headers),
    ip,
  } as NextRequest;
}

describe('api responses', () => {
  it('returns structured error payloads', async () => {
    const response = businessContextRequired();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('BUSINESS_CONTEXT_REQUIRED');
  });

  it('supports optional error details', async () => {
    const response = apiError('RATE_LIMITED', 'Too many requests', 429, { retryAfter: 30 });
    const body = await response.json();

    expect(body.error.details).toEqual({ retryAfter: 30 });
  });
});

describe('critical path validation schemas', () => {
  it('rejects empty payloads for all high-risk routes', () => {
    expect(sendOtpSchema.safeParse({}).success).toBe(false);
    expect(verifyOtpSchema.safeParse({}).success).toBe(false);
    expect(createAppointmentSchema.safeParse({}).success).toBe(false);
    expect(createCustomerSchema.safeParse({}).success).toBe(false);
    expect(onboardingCreateSchema.safeParse({}).success).toBe(false);
  });

  it('accepts minimal valid onboarding payload', () => {
    const result = onboardingCreateSchema.safeParse({
      businessType: 'barbershop',
      businessInfo: { name: 'Demo Shop' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal valid booking chain payloads', () => {
    const sendOtp = sendOtpSchema.safeParse({ phone: '0541234567' });
    const verifyOtp = verifyOtpSchema.safeParse({ phone: '0541234567', code: '123456' });
    const customer = createCustomerSchema.safeParse({ name: 'Test User', phone: '0541234567' });
    const appointment = createAppointmentSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      serviceId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      workerId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      start: '2026-07-01T10:00:00.000Z',
      end: '2026-07-01T11:00:00.000Z',
    });

    expect(sendOtp.success).toBe(true);
    expect(verifyOtp.success).toBe(true);
    expect(customer.success).toBe(true);
    expect(appointment.success).toBe(true);
  });
});

describe('getClientIP', () => {
  it('prefers x-real-ip over spoofable x-forwarded-for', () => {
    const request = mockRequest({
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.99',
    });

    expect(getClientIP(request)).toBe('203.0.113.10');
  });

  it('falls back to request.ip when platform headers are missing', () => {
    const request = mockRequest({}, '198.51.100.50');
    expect(getClientIP(request)).toBe('198.51.100.50');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OTP_MAX_HOURLY_PER_PHONE = '2';
    process.env.OTP_MAX_HOURLY_PER_IP = '3';
  });

  it('blocks when phone hourly limit is exceeded', async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== 'otp_codes') {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn((_columns: string, options?: { count?: string; head?: boolean }) => {
            if (options?.head) {
              return {
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockResolvedValue({ count: 2, error: null }),
              };
            }

            return mockFrom();
          }),
        };
      }),
    });

    const result = await checkRateLimit('+972541234567', '203.0.113.10');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('phone_hourly');
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('uses configured hourly limits from environment', () => {
    expect(getOTPRateLimitConfig().phoneHourlyLimit).toBe(2);
    expect(getOTPRateLimitConfig().ipHourlyLimit).toBe(3);
  });
});
