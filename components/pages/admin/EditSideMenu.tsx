"use client";

import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Type,
  Image as ImageIcon,
  Palette,
  Link2,
  LayoutPanelLeft,
  Sparkles,
  Layout,
  Circle,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { useDirection } from "@/components/providers/DirectionProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type EditItemType = "text" | "image" | "color" | "links" | "settings" | "layout";

interface EditItem {
  id: string;
  label: string;
  type: EditItemType;
  icon: React.ReactNode;
}

interface EditSection {
  id: string;
  label: string;
  items: EditItem[];
}

interface EditSideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: (elementId: string, elementType: EditItemType) => void;
}

interface EditSideMenuContentProps {
  onEdit: (elementId: string, elementType: EditItemType) => void;
  showHeader?: boolean;
}

// Component to get all edit items flattened from sections for mobile drawer
export function MobileEditMenuItems({ onEdit, onItemClick }: { onEdit: (elementId: string, elementType: EditItemType) => void; onItemClick?: () => void }) {
  const { t } = useLocale();
  const { dir } = useDirection();
  const isRTL = dir === "rtl";
  
  const sections: EditSection[] = [
    {
      id: "design",
      label: t("settings.homepageEditor.designSection") || "Design & Layout",
      items: [
        {
          id: "layout",
          label: t("settings.homepageEditor.layout") || "Page Layout",
          type: "layout",
          icon: <Layout className="w-4 h-4" />,
        },
        {
          id: "banner",
          label: t("settings.homepageEditor.banner") || "Banner Cover",
          type: "image",
          icon: <LayoutPanelLeft className="w-4 h-4" />,
        },
        {
          id: "theme-color",
          label: t("settings.homepageEditor.themeColor") || "Theme Color",
          type: "color",
          icon: <Palette className="w-4 h-4" />,
        },
        {
          id: "text-color",
          label: t("settings.homepageEditor.textColor") || "Text Color",
          type: "color",
          icon: <Type className="w-4 h-4" />,
        },
      ],
    },
    {
      id: "content",
      label: t("settings.homepageEditor.contentSection") || "Content & Messages",
      items: [
        {
          id: "guest-message",
          label: t("settings.homepageEditor.guestMessage") || "Guest Message",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "logged-in-message",
          label: t("settings.homepageEditor.loggedInMessage") || "Logged-in Message",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
      ],
    },
    {
      id: "branding",
      label: t("settings.homepageEditor.brandingSection") || "Branding",
      items: [
        {
          id: "business-name",
          label: t("settings.homepageEditor.businessName") || "Business Name",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "business-description",
          label: t("settings.homepageEditor.businessDescription") || "Business Description",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "logo-shape",
          label: t("settings.homepageEditor.logoShape") || "Logo Shape",
          type: "settings",
          icon: <Circle className="w-4 h-4" />,
        },
        {
          id: "social-links",
          label: t("settings.homepageEditor.socialLinks") || "Social Links",
          type: "links",
          icon: <Link2 className="w-4 h-4" />,
        },
      ],
    },
  ];
  
  // Flatten all items from all sections
  const allItems = sections.flatMap(section => section.items);
  
  return (
    <>
      {allItems.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-14 min-h-[56px] text-base",
            "hover:bg-gray-100 active:bg-gray-200",
            isRTL ? "flex-row-reverse" : ""
          )}
          onClick={() => {
            onEdit(item.id, item.type);
            onItemClick?.();
          }}
        >
          <span className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex-shrink-0",
            isRTL ? "ml-3" : "mr-3"
          )}>
            {item.icon}
          </span>
          <span className={cn("text-sm font-medium flex-1", isRTL ? "text-right" : "text-left")}>{item.label}</span>
        </Button>
      ))}
    </>
  );
}

// Extracted menu content component for reuse in both sidebar and Sheet
export function EditSideMenuContent({ onEdit, showHeader = true }: EditSideMenuContentProps) {
  const { t } = useLocale();
  const { dir } = useDirection();
  const isRTL = dir === "rtl";

  const sections: EditSection[] = [
    {
      id: "design",
      label: t("settings.homepageEditor.designSection") || "Design & Layout",
      items: [
        {
          id: "layout",
          label: t("settings.homepageEditor.layout") || "Page Layout",
          type: "layout",
          icon: <Layout className="w-4 h-4" />,
        },
        {
          id: "banner",
          label: t("settings.homepageEditor.banner") || "Banner Cover",
          type: "image",
          icon: <LayoutPanelLeft className="w-4 h-4" />,
        },
        {
          id: "theme-color",
          label: t("settings.homepageEditor.themeColor") || "Theme Color",
          type: "color",
          icon: <Palette className="w-4 h-4" />,
        },
        {
          id: "text-color",
          label: t("settings.homepageEditor.textColor") || "Text Color",
          type: "color",
          icon: <Type className="w-4 h-4" />,
        },
      ],
    },
    {
      id: "content",
      label: t("settings.homepageEditor.contentSection") || "Content & Messages",
      items: [
        {
          id: "guest-message",
          label: t("settings.homepageEditor.guestMessage") || "Guest Message",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "logged-in-message",
          label: t("settings.homepageEditor.loggedInMessage") || "Logged-in Message",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
      ],
    },
    {
      id: "branding",
      label: t("settings.homepageEditor.brandingSection") || "Branding",
      items: [
        {
          id: "business-name",
          label: t("settings.homepageEditor.businessName") || "Business Name",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "business-description",
          label: t("settings.homepageEditor.businessDescription") || "Business Description",
          type: "text",
          icon: <Type className="w-4 h-4" />,
        },
        {
          id: "logo-shape",
          label: t("settings.homepageEditor.logoShape") || "Logo Shape",
          type: "settings",
          icon: <Circle className="w-4 h-4" />,
        },
        {
          id: "social-links",
          label: t("settings.homepageEditor.socialLinks") || "Social Links",
          type: "links",
          icon: <Link2 className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Sparkles className="w-4 h-4 text-primary" />
            {t("settings.homepageEditor.editMenu") || "Edit Menu"}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {sections.map((section) => (
          <Card 
            key={section.id} 
            className="overflow-hidden border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 bg-white"
          >
            {/* Section Header */}
            <div className={cn(
              "px-4 py-2.5 border-b border-gray-200/60",
              isRTL ? "bg-gradient-to-l from-gray-50 to-gray-100/50" : "bg-gradient-to-r from-gray-50 to-gray-100/50"
            )}>
              <div className={cn(
                "flex items-center gap-2",
                isRTL ? "flex-row-reverse justify-end" : "justify-start"
              )}>
                <div className="p-1.5 rounded-md bg-white shadow-sm border border-gray-200/50 flex-shrink-0">
                  {section.id === "design" && <Layout className="w-3.5 h-3.5 text-blue-600" />}
                  {section.id === "content" && <Type className="w-3.5 h-3.5 text-purple-600" />}
                  {section.id === "branding" && <Circle className="w-3.5 h-3.5 text-orange-600" />}
                </div>
                <span className={cn(
                  "text-xs font-bold text-gray-700 uppercase tracking-wider",
                  isRTL ? "text-right" : "text-left"
                )}>
                  {section.label}
                </span>
              </div>
            </div>
            
            {/* Section Items */}
            <div className="p-2 space-y-1">
              {section.items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-3 h-11 text-gray-700",
                    "hover:bg-gray-50 hover:text-gray-900",
                    "transition-all duration-200",
                    "rounded-lg",
                    isRTL ? "flex-row-reverse" : ""
                  )}
                  onClick={() => onEdit(item.id, item.type)}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg",
                    "bg-gradient-to-br from-gray-50 to-gray-100",
                    "border border-gray-200/60",
                    "shadow-sm",
                    "text-gray-600",
                    "group-hover:shadow transition-shadow"
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    "text-sm font-medium flex-1",
                    isRTL ? "text-right" : "text-left"
                  )}>
                    {item.label}
                  </span>
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Desktop sidebar component
export function EditSideMenu({ isOpen, onToggle, onEdit }: EditSideMenuProps) {
  const { t } = useLocale();
  const { dir } = useDirection();
  const isRTL = dir === "rtl";

  const toggleIcon = isRTL
    ? isOpen
      ? <ChevronLeft className="w-4 h-4" />
      : <ChevronRight className="w-4 h-4" />
    : isOpen
    ? <ChevronRight className="w-4 h-4" />
    : <ChevronLeft className="w-4 h-4" />;

  return (
    <div
      className={cn(
        "bg-gradient-to-b from-white to-gray-50/30",
        "border-r border-l border-gray-200",
        "shadow-xl overflow-hidden transition-all duration-300",
        "flex flex-col h-full flex-shrink-0",
        isOpen ? "w-80" : "w-14",
        isRTL ? "border-l border-r-0" : "border-r border-l-0"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-gray-200 bg-white/95 backdrop-blur-sm",
        isOpen ? "justify-between px-4 py-3" : "justify-center py-3"
      )}>
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-gray-800">
              {t("settings.homepageEditor.editMenu") || "Edit Menu"}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-lg",
            "hover:bg-gray-100",
            "transition-colors"
          )}
          onClick={onToggle}
          aria-label={isOpen ? "Collapse edit menu" : "Expand edit menu"}
        >
          {toggleIcon}
        </Button>
      </div>

      {isOpen && <EditSideMenuContent onEdit={onEdit} showHeader={false} />}
    </div>
  );
}

