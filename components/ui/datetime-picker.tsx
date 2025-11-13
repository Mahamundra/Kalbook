"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ported/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ported/ui/popover";
import { Button } from "@/components/ui/button";
import { TimeInput } from "@/components/ui/time-input";
import { cn } from "@/lib/utils";
import { parseTime } from "@internationalized/date";
import type { TimeValue } from "react-aria-components";
import { useLocale } from "@/components/ported/hooks/useLocale";
import { he, ar, ru } from "date-fns/locale";
import type { Locale } from "date-fns";

interface DateTimePickerProps {
  value?: Date | string;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  isRTL?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  isRTL = false,
  className,
}: DateTimePickerProps) {
  const { t, locale, isRTL: localeIsRTL } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const date = value ? (typeof value === 'string' ? new Date(value) : value) : null;
  
  // Get date-fns locale
  const localeMap: Record<string, Locale> = { he: he, ar: ar, ru: ru };
  const dateFnsLocale = localeMap[locale || 'en'];
  const rtl = isRTL || localeIsRTL;
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date || undefined);
  const [selectedTime, setSelectedTime] = useState<TimeValue | null>(
    date
      ? parseTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)
      : null
  );

  // Update selected time when value changes externally
  useEffect(() => {
    if (value) {
      const newDate = typeof value === 'string' ? new Date(value) : value;
      setSelectedDate(newDate);
      setSelectedTime(parseTime(`${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`));
    } else {
      setSelectedDate(undefined);
      setSelectedTime(null);
    }
  }, [value]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    if (newDate && selectedTime) {
      const combinedDate = new Date(newDate);
      combinedDate.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
      onChange(combinedDate);
    } else if (newDate) {
      // If no time selected yet, use current time or default to 9:00
      const combinedDate = new Date(newDate);
      combinedDate.setHours(9, 0, 0, 0);
      onChange(combinedDate);
      setSelectedTime(parseTime("09:00"));
    } else {
      onChange(null);
    }
  };

  const handleTimeChange = (newTime: TimeValue | null) => {
    setSelectedTime(newTime);
    if (selectedDate && newTime) {
      const combinedDate = new Date(selectedDate);
      combinedDate.setHours(newTime.hour, newTime.minute, 0, 0);
      onChange(combinedDate);
    }
  };

  const displayValue = date
    ? `${format(date, "dd/MM/yyyy", { locale: dateFnsLocale })}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : "";

  const defaultPlaceholder = placeholder || t('calendar.chooseStartDate') || 'Pick a date and time';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal h-10 px-3",
            !date && "text-muted-foreground",
            rtl ? "text-right" : "text-left",
            className
          )}
        >
          <div className={cn("flex items-center gap-2 w-full", rtl && "flex-row-reverse")}>
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {!date ? (
              <span className="text-sm text-muted-foreground flex-1">
                {defaultPlaceholder}
              </span>
            ) : (
              <span className="text-sm font-medium text-foreground flex-1">
                {displayValue}
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align={rtl ? "end" : "start"}
        dir={rtl ? 'rtl' : 'ltr'}
        sideOffset={4}
      >
        <div className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={dateFnsLocale}
          />
          {selectedDate && (
            <div className="pt-3 mt-3 border-t">
              <div className={cn("flex items-center gap-2", rtl && "flex-row-reverse")}>
                <label className="text-sm font-medium whitespace-nowrap">
                  {t('calendar.time') || 'Time'}:
                </label>
                <div className="w-20">
                  <TimeInput
                    value={selectedTime}
                    onChange={handleTimeChange}
                    hourCycle={24}
                    className="[&>div]:h-7 [&>div]:text-xs [&>div]:w-20"
                    dateInputClassName="h-7 px-1.5 text-xs w-20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

