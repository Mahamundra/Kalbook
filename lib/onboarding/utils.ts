/**
 * Onboarding utility functions
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { BusinessType } from '@/lib/supabase/database.types';

/**
 * Generate a URL-friendly slug from business name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by checking database
 */
export async function generateUniqueSlug(baseName: string): Promise<string> {
  const supabase = createAdminClient();
  const baseSlug = generateSlug(baseName);

  // Check if base slug exists
  const exists = await checkSlugExists(baseSlug);
  if (!exists) {
    return baseSlug;
  }

  // Try with number suffix
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (await checkSlugExists(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
    
    // Safety limit
    if (counter > 1000) {
      throw new Error('Could not generate unique slug');
    }
  }

  return uniqueSlug;
}

/**
 * Check if slug exists in database
 */
async function checkSlugExists(slug: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  
  return data !== null;
}

/**
 * Get default services for business type with translations
 */
export function getDefaultServices(
  businessType: BusinessType,
  translations?: {
    barbershop?: {
      haircut?: { name: string; description: string; category: string };
      beardTrim?: { name: string; description: string; category: string };
      haircutBeard?: { name: string; description: string; category: string };
      kidsHaircut?: { name: string; description: string; category: string };
    };
    nail_salon?: {
      manicure?: { name: string; description: string; category: string };
      pedicure?: { name: string; description: string; category: string };
      nailArt?: { name: string; description: string; category: string };
      fullSet?: { name: string; description: string; category: string };
    };
    gym_trainer?: {
      personalTraining?: { name: string; description: string; category: string };
      groupClass?: { name: string; description: string; category: string };
      consultation?: { name: string; description: string; category: string };
      assessment?: { name: string; description: string; category: string };
    };
    other?: {
      service1?: { name: string; description: string; category: string };
      service2?: { name: string; description: string; category: string };
      service3?: { name: string; description: string; category: string };
    };
  }
): Array<{
  name: string;
  description: string;
  category: string;
  duration: number; // minutes
  price: number;
}> {
  // Default English values
  const defaultServices: Record<BusinessType, Array<{
    name: string;
    description: string;
    category: string;
    duration: number;
    price: number;
  }>> = {
    barbershop: [
      {
        name: translations?.barbershop?.haircut?.name || 'Haircut',
        description: translations?.barbershop?.haircut?.description || 'Professional haircut service',
        category: translations?.barbershop?.haircut?.category || 'Hair',
        duration: 30,
        price: 25.00,
      },
      {
        name: translations?.barbershop?.beardTrim?.name || 'Beard Trim',
        description: translations?.barbershop?.beardTrim?.description || 'Beard trimming and styling',
        category: translations?.barbershop?.beardTrim?.category || 'Beard',
        duration: 15,
        price: 15.00,
      },
      {
        name: translations?.barbershop?.haircutBeard?.name || 'Haircut + Beard',
        description: translations?.barbershop?.haircutBeard?.description || 'Complete haircut and beard trim',
        category: translations?.barbershop?.haircutBeard?.category || 'Hair',
        duration: 45,
        price: 35.00,
      },
      {
        name: translations?.barbershop?.kidsHaircut?.name || 'Kids Haircut',
        description: translations?.barbershop?.kidsHaircut?.description || 'Haircut for children',
        category: translations?.barbershop?.kidsHaircut?.category || 'Hair',
        duration: 20,
        price: 20.00,
      },
    ],
    nail_salon: [
      {
        name: translations?.nail_salon?.manicure?.name || 'Manicure',
        description: translations?.nail_salon?.manicure?.description || 'Professional nail care and polish',
        category: translations?.nail_salon?.manicure?.category || 'Nails',
        duration: 45,
        price: 30.00,
      },
      {
        name: translations?.nail_salon?.pedicure?.name || 'Pedicure',
        description: translations?.nail_salon?.pedicure?.description || 'Foot care and nail polish',
        category: translations?.nail_salon?.pedicure?.category || 'Nails',
        duration: 60,
        price: 40.00,
      },
      {
        name: translations?.nail_salon?.nailArt?.name || 'Nail Art',
        description: translations?.nail_salon?.nailArt?.description || 'Custom nail art design',
        category: translations?.nail_salon?.nailArt?.category || 'Nails',
        duration: 60,
        price: 50.00,
      },
      {
        name: translations?.nail_salon?.fullSet?.name || 'Full Set',
        description: translations?.nail_salon?.fullSet?.description || 'Complete manicure and pedicure',
        category: translations?.nail_salon?.fullSet?.category || 'Nails',
        duration: 90,
        price: 65.00,
      },
    ],
    gym_trainer: [
      {
        name: translations?.gym_trainer?.personalTraining?.name || 'Personal Training',
        description: translations?.gym_trainer?.personalTraining?.description || 'One-on-one personal training session',
        category: translations?.gym_trainer?.personalTraining?.category || 'Training',
        duration: 60,
        price: 75.00,
      },
      {
        name: translations?.gym_trainer?.groupClass?.name || 'Group Class',
        description: translations?.gym_trainer?.groupClass?.description || 'Group fitness class',
        category: translations?.gym_trainer?.groupClass?.category || 'Training',
        duration: 45,
        price: 25.00,
      },
      {
        name: translations?.gym_trainer?.consultation?.name || 'Consultation',
        description: translations?.gym_trainer?.consultation?.description || 'Initial fitness consultation',
        category: translations?.gym_trainer?.consultation?.category || 'Consultation',
        duration: 30,
        price: 50.00,
      },
      {
        name: translations?.gym_trainer?.assessment?.name || 'Assessment',
        description: translations?.gym_trainer?.assessment?.description || 'Fitness assessment and evaluation',
        category: translations?.gym_trainer?.assessment?.category || 'Consultation',
        duration: 45,
        price: 60.00,
      },
    ],
    other: [
      {
        name: translations?.other?.service1?.name || 'Service 1',
        description: translations?.other?.service1?.description || 'Standard service',
        category: translations?.other?.service1?.category || 'General',
        duration: 30,
        price: 25.00,
      },
      {
        name: translations?.other?.service2?.name || 'Service 2',
        description: translations?.other?.service2?.description || 'Premium service',
        category: translations?.other?.service2?.category || 'General',
        duration: 45,
        price: 40.00,
      },
      {
        name: translations?.other?.service3?.name || 'Service 3',
        description: translations?.other?.service3?.description || 'Deluxe service',
        category: translations?.other?.service3?.category || 'General',
        duration: 60,
        price: 60.00,
      },
    ],
  };

  return defaultServices[businessType] || defaultServices.other;
}

/**
 * Get default timezone based on business type (optional enhancement)
 */
export function getDefaultTimezone(businessType: BusinessType): string {
  // Default to UTC, can be enhanced based on business type or location
  return 'UTC';
}

/**
 * Get default currency based on business type (optional enhancement)
 */
export function getDefaultCurrency(businessType: BusinessType): string {
  // Default to USD, can be enhanced
  return 'USD';
}

