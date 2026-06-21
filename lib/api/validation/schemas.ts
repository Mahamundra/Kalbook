import { z } from 'zod';

const businessTypeValues = [
  'barbershop',
  'nail_salon',
  'gym_trainer',
  'beauty_salon',
  'makeup_artist',
  'spa',
  'pilates_studio',
  'physiotherapy',
  'life_coach',
  'dietitian',
  'other',
] as const;

export const sendOtpSchema = z.object({
  phone: z.string().trim().min(1).max(30),
  method: z.enum(['sms', 'whatsapp']).optional().default('whatsapp'),
  userType: z.enum(['customer', 'business_owner', 'homepage_admin']).optional().default('customer'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().min(1).max(30),
  code: z.string().trim().min(4).max(10),
  userType: z.enum(['customer', 'business_owner', 'homepage_admin']).optional().default('customer'),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  name: z.string().trim().max(200).optional(),
  redirectUrl: z.string().url().optional(),
  businessSlug: z.string().trim().min(1).max(100).optional(),
});

export const createAppointmentSchema = z
  .object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    workerId: z.string().uuid(),
    start: z.string().trim().min(1),
    end: z.string().trim().min(1),
    status: z.enum(['confirmed', 'pending', 'cancelled']).optional(),
    createdBy: z.enum(['customer', 'admin']).optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .passthrough();

export const createCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(1).max(30),
    email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    notes: z.string().max(5000).optional().nullable(),
    dateOfBirth: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.string().max(50).optional().nullable(),
    consentMarketing: z.boolean().optional(),
    consent_marketing: z.boolean().optional(),
    blocked: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  })
  .passthrough();

export const onboardingCreateSchema = z
  .object({
    businessType: z.enum(businessTypeValues),
    businessInfo: z
      .object({
        name: z.string().trim().min(1).max(200),
        phone: z.string().trim().max(30).optional(),
        email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
        address: z.string().max(500).optional().nullable(),
        previousCalendarType: z.string().max(100).optional().nullable(),
        socialLinks: z
          .object({
            facebook: z.string().optional(),
            instagram: z.string().optional(),
            twitter: z.string().optional(),
            tiktok: z.string().optional(),
            linkedin: z.string().optional(),
            youtube: z.string().optional(),
          })
          .optional(),
      })
      .passthrough(),
    adminUser: z
      .object({
        email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
        phone: z.string().trim().max(30).optional(),
        name: z.string().trim().max(200).optional(),
      })
      .optional(),
    ownerName: z.string().trim().max(200).optional(),
    useAnotherAccount: z.boolean().optional(),
    plan: z.string().trim().max(50).optional(),
    isPortfolio: z.boolean().optional(),
  })
  .passthrough();

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type OnboardingCreateInput = z.infer<typeof onboardingCreateSchema>;
