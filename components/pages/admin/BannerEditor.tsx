"use client";

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Video, Check, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { uploadFile, deleteFile } from '@/lib/api/services';
import { bannerPatterns } from '@/lib/mockData';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';

interface BannerEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBanner?: {
    type: 'upload' | 'pattern';
    uploadUrl?: string;
    videoUrl?: string;
    patternId?: string;
    position?: { x: number; y: number };
  };
  onSave: (banner: {
    type: 'upload' | 'pattern';
    uploadUrl?: string;
    videoUrl?: string;
    patternId?: string;
    position?: { x: number; y: number };
  }) => void;
  onRemove?: () => void;
}

export function BannerEditor({
  open,
  onOpenChange,
  currentBanner,
  onSave,
  onRemove,
}: BannerEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [bannerType, setBannerType] = useState<'upload' | 'pattern'>(
    currentBanner?.type || 'pattern'
  );
  const [uploadUrl, setUploadUrl] = useState<string | null>(
    currentBanner?.uploadUrl || null
  );
  const [videoUrl, setVideoUrl] = useState<string | null>(
    currentBanner?.videoUrl || null
  );
  const [patternId, setPatternId] = useState<string>(
    currentBanner?.patternId || 'pattern1'
  );
  const [position, setPosition] = useState<{ x: number; y: number }>(
    currentBanner?.position || { x: 50, y: 50 }
  );
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && currentBanner) {
      setBannerType(currentBanner.type);
      setUploadUrl(currentBanner.uploadUrl || null);
      setVideoUrl(currentBanner.videoUrl || null);
      setPatternId(currentBanner.patternId || 'pattern1');
      setPosition(currentBanner.position || { x: 50, y: 50 });
    }
  }, [open, currentBanner]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      // Delete old image if exists
      if (uploadUrl && !uploadUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(uploadUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore
        }
      }

      const result = await uploadFile(file, 'banner-image');

      if (result.error || !result.url) {
        throw new Error(result.error || 'Failed to upload image');
      }

      setUploadUrl(result.url);
      setBannerType('upload');
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video size should be less than 50MB');
      return;
    }

    try {
      setUploading(true);

      // Delete old video if exists
      if (videoUrl && !videoUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(videoUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore
        }
      }

      const result = await uploadFile(file, 'banner-video');

      if (result.error || !result.url) {
        throw new Error(result.error || 'Failed to upload video');
      }

      setVideoUrl(result.url);
      setBannerType('upload');
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      // Delete files from storage
      if (uploadUrl && !uploadUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(uploadUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore
        }
      }

      if (videoUrl && !videoUrl.startsWith('data:')) {
        try {
          const urlObj = new URL(videoUrl);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (pathMatch) {
            await deleteFile(pathMatch[1]);
          }
        } catch (err) {
          // Ignore
        }
      }

      setUploadUrl(null);
      setVideoUrl(null);
      setBannerType('pattern');
      setPatternId('pattern1');
      if (onRemove) {
        onRemove();
      }
      toast.success('Banner removed successfully');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error(error?.message || 'Failed to remove banner');
    }
  };

  const handleSave = () => {
    const banner = {
      type: bannerType,
      ...(bannerType === 'upload'
        ? {
            uploadUrl: uploadUrl || undefined,
            videoUrl: videoUrl || undefined,
            // Always persist position for uploads/videos so X/Y sliders are saved
            position: position || { x: 50, y: 50 },
          }
        : {
            patternId: patternId,
          }),
    };
    onSave(banner);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (currentBanner) {
      setBannerType(currentBanner.type);
      setUploadUrl(currentBanner.uploadUrl || null);
      setVideoUrl(currentBanner.videoUrl || null);
      setPatternId(currentBanner.patternId || 'pattern1');
      setPosition(currentBanner.position || { x: 50, y: 50 });
    }
    onOpenChange(false);
  };

  const getPatternBackground = (id: string) => {
    switch (id) {
      case 'pattern1':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'pattern2':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'pattern3':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'pattern4':
        return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      default:
        return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.bannerCover') || 'Edit Banner'}</DialogTitle>
          <DialogDescription>
            {t('settings.bannerCoverDescription') || 'Upload an image or video, or choose a pattern for your banner.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={bannerType} onValueChange={(v) => setBannerType(v as 'upload' | 'pattern')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              {t('settings.uploadBanner') || 'Upload'}
            </TabsTrigger>
            <TabsTrigger value="pattern">
              {t('settings.choosePattern') || 'Pattern'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            {/* Preview */}
            <div className="relative w-full h-48 border-2 border-dashed rounded-lg bg-muted overflow-hidden">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${position.x}% ${position.y}%`,
                  }}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : uploadUrl ? (
                <img
                  src={uploadUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${position.x}% ${position.y}%`,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('settings.noBanner') || 'No banner uploaded'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? t('common.loading') || 'Uploading...' : t('settings.uploadBannerImage') || 'Upload Image'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Video className="w-4 h-4 mr-2" />
                {uploading ? t('common.loading') || 'Uploading...' : t('settings.uploadVideo') || 'Upload Video'}
              </Button>
              {(uploadUrl || videoUrl) && (
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

            {/* Position Controls */}
            {(uploadUrl || videoUrl) && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium">
                    {t('settings.dragToReposition') || 'Image Position'}
                  </label>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      X: {position.x}%
                    </label>
                    <Slider
                      value={[position.x]}
                      onValueChange={([value]) => setPosition({ ...position, x: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Y: {position.y}%
                    </label>
                    <Slider
                      value={[position.y]}
                      onValueChange={([value]) => setPosition({ ...position, y: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="pattern" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {bannerPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={`relative h-24 rounded-lg border-2 cursor-pointer transition-all ${
                    patternId === pattern.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPatternId(pattern.id)}
                  style={{
                    background: getPatternBackground(pattern.id),
                  }}
                >
                  {patternId === pattern.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={uploading}>
            {t('common.save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

