"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type PlanOption = {
  key: string;
  name?: string;
  price: number;
  symbol: string;
  metadata?: {
    name?: string;
    highlights?: string[];
    priceNote?: string;
    cta?: string;
  };
};

interface PlanSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanOption[];
  selectedPlan: string;
  dir: "rtl" | "ltr";
  isRTL: boolean;
  t: (key: string) => string;
  getTranslation: (key: string) => unknown;
  onSelectPlan: (planKey: string) => void;
  onContactUs?: () => void;
}

const PLAN_ORDER = ["portfolio", "free", "pro"] as const;

function resolvePlanHighlights(
  planKey: string,
  metadata: PlanOption["metadata"],
  getTranslation: (key: string) => unknown
): string[] {
  if (metadata?.highlights?.length) {
    return metadata.highlights;
  }

  const translationKeyMap: Record<string, string> = {
    free: "home.pricing.plans.basic",
    pro: "home.pricing.plans.professional",
    portfolio: "home.pricing.plans.portfolio",
  };

  const primary = getTranslation(`home.pricing.plans.${planKey}.highlights`);
  if (Array.isArray(primary) && primary.length > 0) {
    return primary as string[];
  }

  const fallbackKey = translationKeyMap[planKey];
  if (fallbackKey) {
    const fallback = getTranslation(`${fallbackKey}.highlights`);
    if (Array.isArray(fallback) && fallback.length > 0) {
      return fallback as string[];
    }
  }

  return [];
}

function resolvePlanDisplayName(
  planKey: string,
  plan: PlanOption,
  getTranslation: (key: string) => unknown
): string {
  const translated = getTranslation(`home.pricing.plans.${planKey}.name`);
  if (typeof translated === "string" && translated.trim()) {
    const trimmed = translated.trim();
    const hebrewPlanMatch = trimmed.match(/^תוכנית\s+(.+?)(?:\s*[–—-]\s*|$)/);
    if (hebrewPlanMatch) {
      return hebrewPlanMatch[1].trim();
    }
    if (trimmed.length <= 28) {
      return trimmed;
    }
  }

  const shortFallbacks: Record<string, string> = {
    free: "home.pricing.basic",
  };
  const fallbackKey = shortFallbacks[planKey];
  if (fallbackKey) {
    const short = getTranslation(fallbackKey);
    if (typeof short === "string" && short) {
      return short;
    }
  }

  if (planKey === "pro") {
    return "Pro";
  }

  return plan.metadata?.name || plan.name || planKey;
}

function resolvePlanCta(
  planKey: string,
  metadata: PlanOption["metadata"],
  getTranslation: (key: string) => unknown,
  t: (key: string) => string
): string {
  if (metadata?.cta) return metadata.cta;
  const translated = getTranslation(`home.pricing.plans.${planKey}.cta`);
  if (typeof translated === "string" && translated) return translated;
  return t("onboarding.selectPlan") || "Select Plan";
}

function formatPlanPrice(plan: PlanOption, monthLabel: string): string {
  if (plan.key === "portfolio" || plan.price === 0) {
    return `${plan.symbol}${plan.price}`;
  }
  return `${plan.symbol}${plan.price}${monthLabel}`;
}

function PlanBadge({
  planKey,
  t,
}: {
  planKey: string;
  t: (key: string) => string;
}) {
  if (planKey === "portfolio") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-green-800">
        {t("home.pricing.free") || "FREE"}
      </span>
    );
  }
  if (planKey === "pro") {
    return (
      <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
        {t("home.pricing.bestSeller") || "Best Seller"}
      </span>
    );
  }
  return null;
}

export function PlanSelectionModal({
  open,
  onOpenChange,
  plans,
  selectedPlan,
  dir,
  isRTL,
  t,
  getTranslation,
  onSelectPlan,
  onContactUs,
}: PlanSelectionModalProps) {
  const [expandedPlan, setExpandedPlan] = useState<string | undefined>(selectedPlan);

  const orderedPlans = useMemo(
    () =>
      PLAN_ORDER.map((key) => plans.find((plan) => plan.key === key)).filter(
        (plan): plan is PlanOption => Boolean(plan)
      ),
    [plans]
  );

  useEffect(() => {
    if (open) {
      setExpandedPlan(selectedPlan);
    }
  }, [open, selectedPlan]);

  const monthLabel = t("home.pricing.month") || "/month";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] sm:w-full max-w-lg max-h-[90vh] !flex !flex-col overflow-hidden p-0 rounded-xl !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2"
        dir={dir}
      >
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 border-b border-gray-100">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {t("onboarding.choosePlan") || "Choose Your Plan"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm mt-1 text-muted-foreground">
            {t("onboarding.choosePlanDescription") ||
              "Select the plan that best fits your business needs. You can change this anytime during setup."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 scrollbar-thin">
          <Accordion
            type="single"
            collapsible
            dir={dir}
            value={expandedPlan}
            onValueChange={setExpandedPlan}
            className="w-full space-y-3"
          >
            {orderedPlans.map((plan) => {
              const planKey = plan.key;
              const isSelected = selectedPlan === planKey;
              const planName = resolvePlanDisplayName(planKey, plan, getTranslation);
              const planHighlights = resolvePlanHighlights(planKey, plan.metadata, getTranslation);

              return (
                <AccordionItem
                  key={planKey}
                  value={planKey}
                  className={cn(
                    "rounded-xl border border-solid px-0 overflow-hidden",
                    isSelected
                      ? "border-green-500 bg-green-50/60 shadow-sm"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <AccordionTrigger
                    className={cn(
                      "plan-accordion-trigger w-full px-3 sm:px-4 py-3 sm:py-4 hover:no-underline [&>svg]:text-green-600 [&>svg]:shrink-0",
                      isRTL ? "text-right" : "text-left"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm sm:text-base text-gray-900">
                          {planName}
                        </span>
                        <PlanBadge planKey={planKey} t={t} />
                        {isSelected && (
                          <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {t("onboarding.planSelected") || "Selected"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-green-600 mt-0.5">
                        {formatPlanPrice(plan, monthLabel)}
                      </p>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent
                    className={cn(
                      "w-full px-3 sm:px-4 pb-4 pt-0 border-t border-green-100/80",
                      isRTL ? "text-right" : "text-left"
                    )}
                  >
                    {plan.metadata?.priceNote && (
                      <p className="text-xs text-muted-foreground mb-3 pt-3 whitespace-pre-line">
                        {plan.metadata.priceNote}
                      </p>
                    )}

                    {planHighlights.length > 0 && (
                      <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto scrollbar-thin w-full">
                        {planHighlights.map((highlight, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-xs sm:text-sm"
                          >
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600 break-words flex-1">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className={cn(
                        "w-full h-10",
                        isSelected
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                      )}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => onSelectPlan(planKey)}
                    >
                      {isSelected
                        ? t("onboarding.planSelected") || "Selected"
                        : resolvePlanCta(planKey, plan.metadata, getTranslation, t)}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {onContactUs && (
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white rounded-b-xl">
            <p
              className={cn(
                "text-center text-xs text-muted-foreground",
                isRTL ? "text-right sm:text-center" : ""
              )}
            >
              {t("onboarding.needCustomPlan") || "Need a custom plan?"}{" "}
              <button
                type="button"
                className="text-green-600 font-medium hover:underline"
                onClick={onContactUs}
              >
                {t("onboarding.contactUsLink") || "Contact us"}
              </button>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
