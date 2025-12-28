"use client";

import { useState } from 'react';
import { Check, Circle, Square } from 'lucide-react';
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

interface LogoShapeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentShape: 'circle' | 'square' | undefined;
  onSave: (shape: 'circle' | 'square') => void;
}

const LOGO_SHAPES = [
  { name: 'Circle', value: 'circle' as const, icon: Circle },
  { name: 'Square', value: 'square' as const, icon: Square },
];

export function LogoShapeEditor({
  open,
  onOpenChange,
  currentShape,
  onSave,
}: LogoShapeEditorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const [selectedShape, setSelectedShape] = useState<'circle' | 'square'>(currentShape || 'square');

  const handleSave = () => {
    onSave(selectedShape);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedShape(currentShape || 'square');
    onOpenChange(false);
  };

  const handleShapeClick = (shape: 'circle' | 'square') => {
    setSelectedShape(shape);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[10001]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('settings.logoShape') || 'Logo Shape'}</DialogTitle>
          <DialogDescription>
            {t('settings.logoShapeDescription') || 'Choose a shape for your logo. Circle will apply rounded corners.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shape Options */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('settings.logoShape') || 'Logo Shape'}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {LOGO_SHAPES.map((shapeOption) => {
                const Icon = shapeOption.icon;
                const isSelected = selectedShape === shapeOption.value;
                return (
                  <button
                    key={shapeOption.value}
                    type="button"
                    onClick={() => handleShapeClick(shapeOption.value)}
                    className={`relative w-full h-24 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary ring-offset-2 bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:border-primary/60 hover:bg-primary/2 hover:shadow-sm'
                    }`}
                  >
                    <Icon className={`w-8 h-8 transition-colors duration-200 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'
                    }`} />
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {shapeOption.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
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

