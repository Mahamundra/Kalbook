# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for file uploads (logos, banners, videos) in your KalBook application.

## Overview

Files are now stored in **Supabase Storage** instead of browser localStorage. This provides:
- ✅ Persistent storage across devices
- ✅ Support for larger files (up to 50MB for videos)
- ✅ Better performance
- ✅ Automatic CDN delivery
- ✅ Secure file access with RLS policies

## Setup Steps

### 1. Create Storage Bucket

You have two options:

#### Option A: Run the Migration (Recommended)

Run the migration file in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/003_create_storage_bucket.sql
```

Or use the Supabase CLI:
```bash
npx supabase db push
```

#### Option B: Manual Setup

1. Go to your Supabase Dashboard → **Storage**
2. Click **Create Bucket**
3. Configure:
   - **Name**: `business-assets`
   - **Public**: ✅ Yes (files will be accessible via public URLs)
   - **File size limit**: 10MB (or 50MB if you want larger videos)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `video/mp4`
     - `video/webm`

### 2. Set Up RLS Policies

The migration automatically creates RLS policies, but if you're setting up manually, run this SQL in your Supabase SQL Editor:

```sql
-- File: supabase/scripts/setup-storage.sql
```

This ensures:
- Users can only upload files to their business folder
- Users can only view/update/delete files in their business folder
- Files are organized by business ID: `{businessId}/logo-{timestamp}.jpg`

### 3. Verify Setup

1. Go to Supabase Dashboard → **Storage** → **Policies**
2. Verify these policies exist:
   - `Users can upload to their business folder`
   - `Users can view files in their business folder`
   - `Users can update files in their business folder`
   - `Users can delete files in their business folder`

### 4. Test File Upload

1. Log in to your admin panel
2. Go to **Settings** → **Branding**
3. Try uploading a logo or banner image
4. Check Supabase Dashboard → **Storage** → **business-assets** to see the uploaded file

## File Organization

Files are organized in the storage bucket as follows:

```
business-assets/
├── {businessId-1}/
│   ├── logo-1234567890.jpg
│   ├── banner-image-1234567891.png
│   └── banner-video-1234567892.mp4
├── {businessId-2}/
│   ├── logo-1234567893.jpg
│   └── banner-image-1234567894.png
└── ...
```

## File Size Limits

- **Logo images**: 2MB max
- **Banner images**: 5MB max
- **Banner videos**: 50MB max

## Migration from localStorage

If you have existing files stored in localStorage (base64), they will continue to work until you upload new files. When you upload a new file, it will replace the old base64 version with a Supabase Storage URL.

To migrate existing files:
1. Download the base64 image/video from localStorage
2. Re-upload it through the Settings page
3. The new file will be stored in Supabase Storage

## Troubleshooting

### Error: "Business context required"

This means the user is not authenticated or doesn't have a business context. Make sure:
- User is logged in
- User has a `business_id` in the `users` table
- Middleware is setting the tenant context header

### Error: "Storage bucket not found"

1. Go to Supabase Dashboard → **Storage**
2. Verify the `business-assets` bucket exists
3. If not, create it manually or run the migration

### Error: "File size exceeds limit"

- Check file size before uploading
- Logo: max 2MB
- Banner image: max 5MB  
- Banner video: max 50MB

### Files not showing up

1. Check browser console for errors
2. Verify RLS policies are set correctly
3. Check Supabase Dashboard → **Storage** → **business-assets** to see if files were uploaded
4. Verify the bucket is set to **Public**

## API Reference

### Upload File

```typescript
import { uploadFile } from '@/lib/api/services';

const result = await uploadFile(file, 'logo');
// or 'banner-image' or 'banner-video'
```

### Delete File

```typescript
import { deleteFile } from '@/lib/api/services';

await deleteFile(filePath);
```

## Security Notes

- All files are stored in a public bucket but organized by business ID
- RLS policies ensure users can only access files in their business folder
- File paths include business ID, so users cannot access other businesses' files
- File types and sizes are validated on both client and server

