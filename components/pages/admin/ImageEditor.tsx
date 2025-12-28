"use client";

import { useState, useRef } from 'react';
import { Upload, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { uploadFile, deleteFile } from '@/lib/api/services';
import { toast } from 'sonner';

interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl?: string;
  onSave: (url: string) => void;
  onRemove?: () => void;
  title: string;
  fileType: 'logo' | 'banner-image' | 'banner-video';
  accept?: string;
}

export function ImageEditor({
  open,
  onOpenChange,
  currentUrl,
  onSave,
  onRemove,
  title,
  fileType,
  accept = 'image/*'
}: ImageEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (fileType === 'logo' || fileType === 'banner-image') {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Check file size (max 2MB for images)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
    } else if (fileType === 'banner-video') {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      // Check file size (max 10MB for videos)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Video size should be less than 10MB');
        return;
      }
    }

    try {
      setUploading(true);
      
      // Delete old file if it exists and is from Supabase Storage
      if (currentUrl && !currentUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(currentUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }

      // Upload new file
      const result = await uploadFile(file, fileType);
      
      if (result.error || !result.url) {
        throw new Error(result.error || 'Failed to upload file');
      }

      setPreviewUrl(result.url);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      // Delete file from Supabase Storage if it exists
      if (!currentUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(currentUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore delete errors
        }
      }

      setPreviewUrl(null);
      if (onRemove) {
        onRemove();
      }
      toast.success('File removed successfully');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error(error?.message || 'Failed to remove file');
    }
  };

  const handleSave = () => {
    if (previewUrl !== currentUrl) {
      onSave(previewUrl || '');
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPreviewUrl(currentUrl || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[10001]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Upload or remove {fileType === 'banner-video' ? 'a video' : 'an image'} for your {fileType === 'logo' ? 'logo' : fileType === 'banner-video' ? 'banner video' : 'banner image'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg bg-muted">
            {previewUrl ? (
              fileType === 'banner-video' ? (
                <video
                  src={previewUrl}
                  className="max-w-full max-h-[200px] object-contain"
                  controls
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[200px] object-contain"
                />
              )
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No {fileType === 'banner-video' ? 'video' : 'image'} selected</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={uploading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={uploading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

