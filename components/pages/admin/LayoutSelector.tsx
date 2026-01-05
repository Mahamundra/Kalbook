"use client";

import { Layout, Sparkles, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/useLocale";
import { useDirection } from "@/components/providers/DirectionProvider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type LayoutType = 'classic' | 'hero' | 'compact';

interface LayoutOption {
  id: LayoutType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  loginFirst?: boolean;
  onLoginFirstChange?: (loginFirst: boolean) => void;
}

export function LayoutSelector({ currentLayout, onLayoutChange, loginFirst = false, onLoginFirstChange }: LayoutSelectorProps) {
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();
  const rtl = dir === "rtl";

  const layouts: LayoutOption[] = [
    {
      id: 'classic',
      name: t('settings.homepageEditor.classicLayout') || 'Classic Layout',
      description: t('settings.homepageEditor.classicLayoutDescription') || 'Centered, card-based design',
      icon: <Layout className="w-5 h-5" />,
    },
    {
      id: 'hero',
      name: t('settings.homepageEditor.heroLayout') || 'Hero Layout',
      description: t('settings.homepageEditor.heroLayoutDescription') || 'Full-width hero section',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'compact',
      name: t('settings.homepageEditor.compactLayout') || 'Compact Dashboard',
      description: t('settings.homepageEditor.compactLayoutDescription') || 'Space-efficient dashboard style',
      icon: <LayoutGrid className="w-5 h-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Layout Selection */}
      <div className="space-y-3">
        {layouts.map((layout) => (
          <Button
            key={layout.id}
            variant={currentLayout === layout.id ? "default" : "outline"}
            className={cn(
              "w-full justify-start gap-3 h-auto p-4",
              "hover:bg-gray-100",
              currentLayout === layout.id && "bg-primary text-primary-foreground hover:bg-primary/90",
              rtl && "flex-row-reverse"
            )}
            onClick={() => onLayoutChange(layout.id)}
          >
            <span className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
              currentLayout === layout.id 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-gray-100 text-gray-700"
            )}>
              {layout.icon}
            </span>
            <div className={cn("flex-1 text-left", rtl && "text-right")}>
              <div className="font-medium text-sm">{layout.name}</div>
              <div className={cn(
                "text-xs mt-0.5",
                currentLayout === layout.id ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {layout.description}
              </div>
            </div>
            {currentLayout === layout.id && (
              <Check className={cn("w-5 h-5 flex-shrink-0", rtl ? "ml-2" : "mr-2")} />
            )}
          </Button>
        ))}
      </div>

      {/* Login Component Order Toggle */}
      {onLoginFirstChange && (
        <div className={cn("pt-4 border-t", rtl && "text-right")}>
          <div className={cn("flex items-center justify-between", rtl && "flex-row-reverse")}>
            <div className={cn("flex flex-col gap-2", rtl && "text-right")}>
              <Label className="text-base font-medium">
                {t('settings.homepageEditor.showLoginFirst') || 'Show Login First'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {loginFirst 
                  ? (t('settings.homepageEditor.loginFirstEnabled') || 'Login component will appear before business information')
                  : (t('settings.homepageEditor.loginFirstDisabled') || 'Login component will appear after business information')
                }
              </p>
            </div>
            <Switch
              checked={loginFirst}
              onCheckedChange={onLoginFirstChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}









