"use client";

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface ThemeColorEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentColor: string;
  onSave: (color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Blue', color: '#0EA5E9' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Purple', color: '#A855F7' },
  { name: 'Green', color: '#10B981' },
  { name: 'Yellow', color: '#F59E0B' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Cyan', color: '#06B6D4' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Black', color: '#1F2937' },
];

export function ThemeColorEditor({
  open,
  onOpenChange,
  currentColor,
  onSave,
}: ThemeColorEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [colorValue, setColorValue] = useState(currentColor.replace('#', '').toUpperCase());

  const handleSave = () => {
    const hexColor = colorValue.length === 6 ? `#${colorValue}` : currentColor;
    onSave(hexColor);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setColorValue(currentColor.replace('#', '').toUpperCase());
    onOpenChange(false);
  };

  const handlePresetClick = (presetColor: string) => {
    setColorValue(presetColor.replace('#', '').toUpperCase());
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (value.length > 6) value = value.substring(0, 6);
    setColorValue(value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    let value = pastedText.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    value = value.replace('#', '');
    if (value.length > 6) value = value.substring(0, 6);
    setColorValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key.startsWith('Arrow') ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }
    if (!/^[0-9A-Fa-f]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const displayColor = colorValue.length === 6 ? `#${colorValue}` : currentColor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.themeColor') || 'Theme Color'}</DialogTitle>
          <DialogDescription>
            {t('settings.themeColorDescription') || 'Choose a color to customize your booking page theme. This color will be used for buttons, links, and other primary elements.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hex Color Input */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.themeColor')}
            </label>
            <div className="flex gap-2 items-center mb-3">
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                <Input
                  type="text"
                  value={colorValue}
                  onChange={handleHexChange}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  placeholder="0EA5E9"
                  maxLength={6}
                  className={`pl-8 font-mono ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
              <div
                className="w-40 h-10 rounded border-2 border-border flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: displayColor }}
              >
                <span className="text-xs text-white/90 font-medium px-2 text-center leading-tight whitespace-nowrap">
                  {isRTL ? 'הזן קוד HEX' : 'HEX Color'}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Colors */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.presetColors') || 'Preset Colors'}
            </label>
            <div className="grid grid-cols-4 gap-1 justify-items-center">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => handlePresetClick(preset.color)}
                  className={`w-14 h-14 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-md ${
                    displayColor === preset.color
                      ? 'border-foreground ring-2 ring-primary ring-offset-2'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                >
                  {displayColor === preset.color && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
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

