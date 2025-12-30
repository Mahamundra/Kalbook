"use client";

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';

interface TextColorEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentColor: 'white' | 'black' | undefined;
  onSave: (color: 'white' | 'black') => void;
}

const TEXT_COLORS = [
  { name: 'White', value: 'white' as const, color: '#FFFFFF' },
  { name: 'Black', value: 'black' as const, color: '#000000' },
];

export function TextColorEditor({
  open,
  onOpenChange,
  currentColor,
  onSave,
}: TextColorEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>(currentColor || 'black');

  const handleSave = () => {
    onSave(selectedColor);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedColor(currentColor || 'black');
    onOpenChange(false);
  };

  const handleColorClick = (color: 'white' | 'black') => {
    setSelectedColor(color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.textColor') || 'Text Color'}</DialogTitle>
          <DialogDescription>
            {t('settings.textColorDescription') || 'Choose a text color for your booking page. This will apply to all text elements.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Color Options */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.textColor') || 'Text Color'}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {TEXT_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => handleColorClick(colorOption.value)}
                  className={`relative w-full h-24 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md ${
                    selectedColor === colorOption.value
                      ? 'border-foreground ring-2 ring-primary ring-offset-2'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: colorOption.color }}
                >
                  {selectedColor === colorOption.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        colorOption.value === 'white' ? 'bg-black/20' : 'bg-white/20'
                      }`}>
                        <Check className={`w-5 h-5 ${
                          colorOption.value === 'white' ? 'text-black' : 'text-white'
                        }`} />
                      </div>
                    </div>
                  )}
                  <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-medium ${
                    colorOption.value === 'white' ? 'text-black' : 'text-white'
                  }`}>
                    {colorOption.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



