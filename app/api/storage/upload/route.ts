import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantInfoFromRequest } from '@/lib/tenant/api';

const STORAGE_BUCKET = 'business-assets';

/**
 * POST /api/storage/upload
 * Upload a file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as 'logo' | 'banner-image' | 'banner-video';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!fileType || !['logo', 'banner-image', 'banner-video'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be: logo, banner-image, or banner-video' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (fileType === 'logo') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Logo must be an image file' },
          { status: 400 }
        );
      }
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Logo size must be less than 2MB' },
          { status: 400 }
        );
      }
    } else if (fileType === 'banner-image') {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Banner must be an image file' },
          { status: 400 }
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Banner image size must be less than 5MB' },
          { status: 400 }
        );
      }
    } else if (fileType === 'banner-video') {
      if (!file.type.startsWith('video/')) {
        return NextResponse.json(
          { error: 'Banner must be a video file' },
          { status: 400 }
        );
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Banner video size must be less than 50MB' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Check if bucket exists, create if it doesn't
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.id === STORAGE_BUCKET);
    
    if (!bucketExists) {
      // Create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(
        STORAGE_BUCKET,
        {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'video/mp4',
            'video/webm',
          ],
        }
      );

      if (createError) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json(
          { 
            error: 'Storage bucket not found and could not be created. Please run the migration: supabase/migrations/003_create_storage_bucket.sql',
            details: createError.message 
          },
          { status: 500 }
        );
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${fileType}-${Date.now()}.${fileExt}`;
    const filePath = `${tenantInfo.businessId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      
      // Provide helpful error message for bucket not found
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not found. Please create the bucket "business-assets" in your Supabase dashboard or run the migration: supabase/migrations/003_create_storage_bucket.sql',
            details: error.message 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/upload
 * Delete a file from Supabase Storage
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get tenant context
    const tenantInfo = await getTenantInfoFromRequest(request);
    if (!tenantInfo?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path required' },
        { status: 400 }
      );
    }

    // Verify file belongs to this business
    if (!filePath.startsWith(`${tenantInfo.businessId}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized: File does not belong to this business' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Delete file
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in delete route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

