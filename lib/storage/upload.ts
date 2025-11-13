/**
 * Supabase Storage utility functions for file uploads
 * Note: For server-side only functions, see upload-server.ts
 */

import { supabase } from '@/lib/supabase/client';

const BUCKET_NAME = 'business-assets';

/**
 * Upload a file to Supabase Storage
 * @param file - File to upload
 * @param path - Storage path (e.g., 'logos/logo.png', 'banners/banner.jpg')
 * @param businessId - Business ID for folder organization
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  path: string,
  businessId: string
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    // Validate file
    if (!file || file.size === 0) {
      return { error: 'File is empty' };
    }

    // Create full path: businessId/folder/filename
    const fullPath = `${businessId}/${path}`;

    // Upload file using client (requires auth)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Upload error:', error);
      return { error: error.message || 'Failed to upload file' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath);

    return { url: urlData.publicUrl };
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { error: error.message || 'Failed to upload file' };
  }
}

/**
 * Upload file via server-side API (more secure, uses service role)
 * This is the recommended method for production
 */
export async function uploadFileViaAPI(
  file: File,
  path: string,
  businessId: string
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  try {
    // Convert file to FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('businessId', businessId);

    // Upload via API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'Failed to upload file' };
    }

    return { url: result.url };
  } catch (error: any) {
    console.error('Upload API error:', error);
    return { error: error.message || 'Failed to upload file' };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param path - Storage path (e.g., 'logos/logo.png')
 * @param businessId - Business ID
 */
export async function deleteFile(
  path: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fullPath = `${businessId}/${path}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fullPath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete file' };
  }
}

/**
 * Delete file via server-side API
 */
export async function deleteFileViaAPI(
  path: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, businessId }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      return { success: false, error: result.error || 'Failed to delete file' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete file' };
  }
}

/**
 * Extract filename from a URL or path
 */
export function getFilenameFromPath(path: string): string {
  return path.split('/').pop() || 'file';
}

/**
 * Generate a unique filename with timestamp
 */
export function generateFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop() || '';
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  const prefixPart = prefix ? `${prefix}_` : '';
  return `${prefixPart}${sanitizedName}_${timestamp}.${ext}`;
}
