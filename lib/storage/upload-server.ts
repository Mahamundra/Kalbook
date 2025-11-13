/**
 * Server-side only Supabase Storage utility functions
 * This file should only be imported in server-side code (API routes, server components)
 * DO NOT import this file in client-side code
 */

import { createAdminClient } from '@/lib/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';
import type { BusinessType } from '@/lib/supabase/database.types';
import { getDefaultBannerImageFilename } from '@/lib/onboarding/utils';

const BUCKET_NAME = 'business-assets';

/**
 * Upload default banner image for a business type to Supabase Storage
 * Reads image from images_catgories folder and uploads to business folder
 * @param businessId - Business ID
 * @param businessType - Business type
 * @returns Public URL of the uploaded file or error
 */
export async function uploadDefaultBannerImage(
  businessId: string,
  businessType: BusinessType
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    const supabase = createAdminClient();
    
    // Get the filename for this business type
    const filename = getDefaultBannerImageFilename(businessType);
    const imagesDir = path.join(process.cwd(), 'images_catgories');
    const filePath = path.join(imagesDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { error: `Default banner image not found: ${filename}` };
    }
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filename);
    const mimeType = fileExt === '.webp' ? 'image/webp' : 
                     fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
                     fileExt === '.png' ? 'image/png' : 'image/jpeg';
    
    // Create storage path
    const storagePath = `banner-image-default${fileExt}`;
    const fullPath = `${businessId}/${storagePath}`;
    
    // Upload to Supabase Storage using admin client
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });
    
    if (error) {
      console.error('Upload default banner error:', error);
      return { error: error.message || 'Failed to upload default banner image' };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath);
    
    return { url: urlData.publicUrl };
  } catch (error: any) {
    console.error('Upload default banner exception:', error);
    return { error: error.message || 'Failed to upload default banner image' };
  }
}

