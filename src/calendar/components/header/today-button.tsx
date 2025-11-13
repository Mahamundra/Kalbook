import { formatDate } from "date-fns";
import { he, ar, ru } from "date-fns/locale";
import type { Locale } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useLocale } from "@/components/ported/hooks/useLocale";

export function TodayButton() {
  const { setSelectedDate } = useCalendar();
  const { locale } = useLocale();

  const today = new Date();
  const handleClick = () => setSelectedDate(today);

  const localeMap: Record<string, Locale> = {
    he: he,
    ar: ar,
    ru: ru,
  };
  const dateFnsLocale = localeMap[locale || 'en'];

  return (
    <button
      className="flex size-14 flex-col items-start overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={handleClick}
    >
      <p className="flex h-6 w-full items-center justify-center bg-primary text-center text-xs font-semibold text-primary-foreground">
        {formatDate(today, "MMM", { locale: dateFnsLocale }).toUpperCase()}
      </p>
      <p className="flex w-full items-center justify-center text-lg font-bold">{today.getDate()}</p>
    </button>
  );
}
