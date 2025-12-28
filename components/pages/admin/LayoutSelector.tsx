"use client";

import { Layout, LayoutPanelLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { useDirection } from "@/components/providers/DirectionProvider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type LayoutType = 'classic' | 'sidebar' | 'hero';

interface LayoutOption {
  id: LayoutType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

export function LayoutSelector({ currentLayout, onLayoutChange }: LayoutSelectorProps) {
  const { t } = useLocale();
  const { dir } = useDirection();
  const isRTL = dir === "rtl";

  const layouts: LayoutOption[] = [
    {
      id: 'classic',
      name: t('settings.homepageEditor.classicLayout') || 'Classic Layout',
      description: t('settings.homepageEditor.classicLayoutDescription') || 'Centered, card-based design',
      icon: <Layout className="w-5 h-5" />,
    },
    {
      id: 'sidebar',
      name: t('settings.homepageEditor.sidebarLayout') || 'Sidebar Layout',
      description: t('settings.homepageEditor.sidebarLayoutDescription') || 'Two-column with sticky sidebar',
      icon: <LayoutPanelLeft className="w-5 h-5" />,
    },
    {
      id: 'hero',
      name: t('settings.homepageEditor.heroLayout') || 'Hero Layout',
      description: t('settings.homepageEditor.heroLayoutDescription') || 'Full-width hero section',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  return (
    <div className="space-y-3">
      {layouts.map((layout) => (
        <Button
          key={layout.id}
          variant={currentLayout === layout.id ? "default" : "outline"}
          className={cn(
            "w-full justify-start gap-3 h-auto p-4",
            "hover:bg-gray-100",
            currentLayout === layout.id && "bg-primary text-primary-foreground hover:bg-primary/90",
            isRTL && "flex-row-reverse"
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
          <div className={cn("flex-1 text-left", isRTL && "text-right")}>
            <div className="font-medium text-sm">{layout.name}</div>
            <div className={cn(
              "text-xs mt-0.5",
              currentLayout === layout.id ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {layout.description}
            </div>
          </div>
          {currentLayout === layout.id && (
            <Check className={cn("w-5 h-5 flex-shrink-0", isRTL ? "ml-2" : "mr-2")} />
          )}
        </Button>
      ))}
    </div>
  );
}


