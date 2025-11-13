import { useMemo } from "react";
import { formatDate } from "date-fns";
import { he, ar, ru } from "date-fns/locale";
import type { Locale } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useTranslations } from "@/calendar/hooks/use-translations";
import { useLocale } from "@/components/ported/hooks/useLocale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getEventsCount, navigateDate, rangeText } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function DateNavigator({ view, events }: IProps) {
  const { selectedDate, setSelectedDate } = useCalendar();
  const t = useTranslations();
  const { locale, isRTL } = useLocale();

  const localeMap: Record<string, Locale> = {
    he: he,
    ar: ar,
    ru: ru,
  };
  const dateFnsLocale = localeMap[locale || 'en'];

  const month = formatDate(selectedDate, "MMMM", { locale: dateFnsLocale });
  const year = selectedDate.getFullYear();

  const eventCount = useMemo(() => getEventsCount(events, selectedDate, view), [events, selectedDate, view]);

  // For RTL, swap the navigation logic: left arrow goes forward, right arrow goes backward
  const handlePrevious = () => {
    if (isRTL) {
      setSelectedDate(navigateDate(selectedDate, view, "next"));
    } else {
      setSelectedDate(navigateDate(selectedDate, view, "previous"));
    }
  };
  
  const handleNext = () => {
    if (isRTL) {
      setSelectedDate(navigateDate(selectedDate, view, "previous"));
    } else {
      setSelectedDate(navigateDate(selectedDate, view, "next"));
    }
  };

  // For RTL, swap the arrow directions visually
  const PreviousIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">
          {month} {year}
        </span>
        <Badge variant="outline" className="px-1.5 text-xs">
          {eventCount} {t.events}
        </Badge>
      </div>

      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handlePrevious}>
          <PreviousIcon />
        </Button>

        <p className="text-xs text-muted-foreground">{rangeText(view, selectedDate, locale)}</p>

        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handleNext}>
          <NextIcon />
        </Button>
      </div>
    </div>
  );
}
