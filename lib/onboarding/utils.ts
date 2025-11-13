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
    beauty_salon?: {
      eyebrowShaping?: { name: string; description: string; category: string };
      facialTreatment?: { name: string; description: string; category: string };
      hairRemoval?: { name: string; description: string; category: string };
    };
    makeup_artist?: {
      makeupApplication?: { name: string; description: string; category: string };
      hairStyling?: { name: string; description: string; category: string };
      fullMakeupHair?: { name: string; description: string; category: string };
    };
    spa?: {
      swedishMassage?: { name: string; description: string; category: string };
      deepTissueMassage?: { name: string; description: string; category: string };
      fullBodyTreatment?: { name: string; description: string; category: string };
    };
    pilates_studio?: {
      pilatesClass?: { name: string; description: string; category: string };
      yogaClass?: { name: string; description: string; category: string };
      privateSession?: { name: string; description: string; category: string };
    };
    physiotherapy?: {
      initialConsultation?: { name: string; description: string; category: string };
      treatmentSession?: { name: string; description: string; category: string };
      followUpSession?: { name: string; description: string; category: string };
    };
    life_coach?: {
      initialConsultation?: { name: string; description: string; category: string };
      coachingSession?: { name: string; description: string; category: string };
      followUpSession?: { name: string; description: string; category: string };
    };
    dietitian?: {
      initialConsultation?: { name: string; description: string; category: string };
      nutritionPlan?: { name: string; description: string; category: string };
      followUpSession?: { name: string; description: string; category: string };
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
    beauty_salon: [
      {
        name: translations?.beauty_salon?.eyebrowShaping?.name || 'Eyebrow Shaping',
        description: translations?.beauty_salon?.eyebrowShaping?.description || 'Professional eyebrow shaping and styling',
        category: translations?.beauty_salon?.eyebrowShaping?.category || 'Eyebrows',
        duration: 30,
        price: 40.00,
      },
      {
        name: translations?.beauty_salon?.facialTreatment?.name || 'Facial Treatment',
        description: translations?.beauty_salon?.facialTreatment?.description || 'Deep cleansing and rejuvenating facial',
        category: translations?.beauty_salon?.facialTreatment?.category || 'Facial',
        duration: 60,
        price: 80.00,
      },
      {
        name: translations?.beauty_salon?.hairRemoval?.name || 'Hair Removal',
        description: translations?.beauty_salon?.hairRemoval?.description || 'Professional hair removal service',
        category: translations?.beauty_salon?.hairRemoval?.category || 'Hair Removal',
        duration: 45,
        price: 60.00,
      },
    ],
    makeup_artist: [
      {
        name: translations?.makeup_artist?.makeupApplication?.name || 'Makeup Application',
        description: translations?.makeup_artist?.makeupApplication?.description || 'Professional makeup application',
        category: translations?.makeup_artist?.makeupApplication?.category || 'Makeup',
        duration: 60,
        price: 100.00,
      },
      {
        name: translations?.makeup_artist?.hairStyling?.name || 'Hair Styling',
        description: translations?.makeup_artist?.hairStyling?.description || 'Professional hair styling service',
        category: translations?.makeup_artist?.hairStyling?.category || 'Hair',
        duration: 45,
        price: 80.00,
      },
      {
        name: translations?.makeup_artist?.fullMakeupHair?.name || 'Full Makeup & Hair',
        description: translations?.makeup_artist?.fullMakeupHair?.description || 'Complete makeup and hair styling package',
        category: translations?.makeup_artist?.fullMakeupHair?.category || 'Full Service',
        duration: 120,
        price: 150.00,
      },
    ],
    spa: [
      {
        name: translations?.spa?.swedishMassage?.name || 'Swedish Massage',
        description: translations?.spa?.swedishMassage?.description || 'Relaxing Swedish massage therapy',
        category: translations?.spa?.swedishMassage?.category || 'Massage',
        duration: 60,
        price: 90.00,
      },
      {
        name: translations?.spa?.deepTissueMassage?.name || 'Deep Tissue Massage',
        description: translations?.spa?.deepTissueMassage?.description || 'Therapeutic deep tissue massage',
        category: translations?.spa?.deepTissueMassage?.category || 'Massage',
        duration: 60,
        price: 110.00,
      },
      {
        name: translations?.spa?.fullBodyTreatment?.name || 'Full Body Treatment',
        description: translations?.spa?.fullBodyTreatment?.description || 'Complete full body spa treatment',
        category: translations?.spa?.fullBodyTreatment?.category || 'Full Treatment',
        duration: 90,
        price: 150.00,
      },
    ],
    pilates_studio: [
      {
        name: translations?.pilates_studio?.pilatesClass?.name || 'Pilates Class',
        description: translations?.pilates_studio?.pilatesClass?.description || 'Group Pilates class session',
        category: translations?.pilates_studio?.pilatesClass?.category || 'Pilates',
        duration: 60,
        price: 30.00,
      },
      {
        name: translations?.pilates_studio?.yogaClass?.name || 'Yoga Class',
        description: translations?.pilates_studio?.yogaClass?.description || 'Group Yoga class session',
        category: translations?.pilates_studio?.yogaClass?.category || 'Yoga',
        duration: 60,
        price: 30.00,
      },
      {
        name: translations?.pilates_studio?.privateSession?.name || 'Private Session',
        description: translations?.pilates_studio?.privateSession?.description || 'One-on-one private training session',
        category: translations?.pilates_studio?.privateSession?.category || 'Private',
        duration: 60,
        price: 80.00,
      },
    ],
    physiotherapy: [
      {
        name: translations?.physiotherapy?.initialConsultation?.name || 'Initial Consultation',
        description: translations?.physiotherapy?.initialConsultation?.description || 'Initial assessment and consultation',
        category: translations?.physiotherapy?.initialConsultation?.category || 'Consultation',
        duration: 45,
        price: 100.00,
      },
      {
        name: translations?.physiotherapy?.treatmentSession?.name || 'Treatment Session',
        description: translations?.physiotherapy?.treatmentSession?.description || 'Physiotherapy treatment session',
        category: translations?.physiotherapy?.treatmentSession?.category || 'Treatment',
        duration: 60,
        price: 120.00,
      },
      {
        name: translations?.physiotherapy?.followUpSession?.name || 'Follow-up Session',
        description: translations?.physiotherapy?.followUpSession?.description || 'Follow-up treatment session',
        category: translations?.physiotherapy?.followUpSession?.category || 'Follow-up',
        duration: 45,
        price: 100.00,
      },
    ],
    life_coach: [
      {
        name: translations?.life_coach?.initialConsultation?.name || 'Initial Consultation',
        description: translations?.life_coach?.initialConsultation?.description || 'Initial life coaching consultation',
        category: translations?.life_coach?.initialConsultation?.category || 'Consultation',
        duration: 60,
        price: 120.00,
      },
      {
        name: translations?.life_coach?.coachingSession?.name || 'Coaching Session',
        description: translations?.life_coach?.coachingSession?.description || 'Life coaching session',
        category: translations?.life_coach?.coachingSession?.category || 'Coaching',
        duration: 60,
        price: 100.00,
      },
      {
        name: translations?.life_coach?.followUpSession?.name || 'Follow-up Session',
        description: translations?.life_coach?.followUpSession?.description || 'Follow-up coaching session',
        category: translations?.life_coach?.followUpSession?.category || 'Follow-up',
        duration: 45,
        price: 90.00,
      },
    ],
    dietitian: [
      {
        name: translations?.dietitian?.initialConsultation?.name || 'Initial Consultation',
        description: translations?.dietitian?.initialConsultation?.description || 'Initial nutrition consultation',
        category: translations?.dietitian?.initialConsultation?.category || 'Consultation',
        duration: 60,
        price: 120.00,
      },
      {
        name: translations?.dietitian?.nutritionPlan?.name || 'Nutrition Plan',
        description: translations?.dietitian?.nutritionPlan?.description || 'Custom nutrition plan creation',
        category: translations?.dietitian?.nutritionPlan?.category || 'Planning',
        duration: 45,
        price: 150.00,
      },
      {
        name: translations?.dietitian?.followUpSession?.name || 'Follow-up Session',
        description: translations?.dietitian?.followUpSession?.description || 'Follow-up nutrition consultation',
        category: translations?.dietitian?.followUpSession?.category || 'Follow-up',
        duration: 30,
        price: 80.00,
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

/**
 * Get default banner image filename for business type
 * Returns the appropriate image filename based on business type
 */
export function getDefaultBannerImageFilename(businessType: BusinessType): string {
  // Known mappings for business types to image files
  const imageMap: Record<BusinessType, string> = {
    barbershop: 'barber.jpg',
    beauty_salon: 'hair_saloon.jpg',
    makeup_artist: 'makeupartist.jpg',
    nail_salon: 'beauty_spa.jpg',
    spa: 'spamassage.jpg',
    gym_trainer: 'gym_trainer.webp',
    pilates_studio: 'pilates.webp',
    physiotherapy: 'psyhothrapist-min.jpg',
    life_coach: 'lifecoach.jpg',
    dietitian: 'dietitan.jpg',
    other: 'other.webp',
  };
  
  return imageMap[businessType] || imageMap.other;
}

/**
 * Get default theme color for business type
 */
export function getDefaultThemeColor(businessType: BusinessType): string {
  const colorMap: Record<BusinessType, string> = {
    barbershop: '#1F2937', // dark gray/charcoal
    beauty_salon: '#EC4899', // pink
    makeup_artist: '#F59E0B', // amber/gold
    nail_salon: '#8B5CF6', // purple
    spa: '#10B981', // emerald green
    gym_trainer: '#EF4444', // red
    pilates_studio: '#06B6D4', // cyan
    physiotherapy: '#3B82F6', // blue
    life_coach: '#6366F1', // indigo
    dietitian: '#14B8A6', // teal
    other: '#0EA5E9', // sky blue (current default)
  };
  
  return colorMap[businessType] || colorMap.other;
}

