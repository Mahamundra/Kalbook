import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { unsignCookie } from '@/lib/auth/cookie-sign';

const STORAGE_BUCKET = 'business-assets';

/**
 * Get admin session from cookie
 */
function getAdminSession(request: NextRequest): { userId: string; businessId: string; email: string; phone: string; name: string; role: string } | null {
  const adminSessionCookie = request.cookies.get('admin_session')?.value;
  if (!adminSessionCookie) {
    return null;
  }

  try {
    // Verify and unsign the cookie
    const unsignedData = unsignCookie(adminSessionCookie);
    if (!unsignedData) {
      // Cookie signature invalid - possible tampering
      return null;
    }
    
    return JSON.parse(unsignedData);
  } catch (error) {
    return null;
  }
}

/**
 * POST /api/user/avatar
 * Upload user avatar image
 */
export async function POST(request: NextRequest) {
  try {
    const session = getAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.id === STORAGE_BUCKET);
    
    if (!bucketExists) {
      return NextResponse.json(
        { error: 'Storage bucket not found' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `user-avatar-${session.userId}-${Date.now()}.${fileExt}`;
    const filePath = `user-avatars/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to upload avatar' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    // Update user record with avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', session.userId);

    if (updateError) {
      console.error('Error updating user avatar:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error in avatar upload route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

