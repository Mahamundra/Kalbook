"use client";

import { useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, DateSelectArg, EventClickArg, EventDropArg, EventResizeArg, ViewApi } from '@fullcalendar/core';
import heLocale from '@fullcalendar/core/locales/he';
import arLocale from '@fullcalendar/core/locales/ar';
import ruLocale from '@fullcalendar/core/locales/ru';
import type { LocaleInput } from '@fullcalendar/core';

interface FullCalendarWrapperProps {
  events: EventInput[];
  currentDate: Date;
  view: 'day' | 'week' | 'month';
  locale: string;
  isRTL: boolean;
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onEventClick: (event: EventInput) => void;
  onDateClick: (date: Date) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  workingHours?: {
    start: string;
    end: string;
  };
  weekStartDay?: number;
  height?: string | number;
}

export function FullCalendarWrapper({
  events,
  currentDate,
  view,
  locale,
  isRTL,
  onDateChange,
  onViewChange,
  onEventClick,
  onDateClick,
  onEventDrop,
  onEventResize,
  workingHours,
  weekStartDay = 0,
  height = 'auto',
}: FullCalendarWrapperProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Map locale to FullCalendar locale
  const fullCalendarLocale = useMemo<LocaleInput>(() => {
    switch (locale) {
      case 'he':
        return heLocale;
      case 'ar':
        return arLocale;
      case 'ru':
        return ruLocale;
      default:
        return undefined; // English is default
    }
  }, [locale]);

  // Map view to FullCalendar view
  const fullCalendarView = useMemo(() => {
    switch (view) {
      case 'day':
        return 'timeGridDay';
      case 'week':
        return 'timeGridWeek';
      case 'month':
        return 'dayGridMonth';
      default:
        return 'timeGridWeek';
    }
  }, [view]);

  // Handle date navigation and view change
  const handleDatesSet = (arg: { view: ViewApi; start: Date; end: Date }) => {
    // Update parent with the current date from calendar
    const currentDate = arg.view.currentStart;
    onDateChange(new Date(currentDate));
    
    // Handle view change
    const viewType = arg.view.type;
    if (viewType === 'timeGridDay') {
      onViewChange('day');
    } else if (viewType === 'timeGridWeek') {
      onViewChange('week');
    } else if (viewType === 'dayGridMonth') {
      onViewChange('month');
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const eventInput: EventInput = {
      id: event.id,
      title: event.title,
      start: event.start ? event.start.toISOString() : '',
      end: event.end ? event.end.toISOString() : '',
      extendedProps: event.extendedProps,
    };
    onEventClick(eventInput);
  };

  // Handle date click (for time slots in day/week view)
  const handleDateClick = (selectInfo: DateSelectArg) => {
    onDateClick(selectInfo.start);
  };

  // Handle day cell click in month view
  const handleDayCellClick = (date: Date) => {
    onDateClick(date);
  };

  // Handle event drop (drag & drop)
  const handleEventDrop = (dropInfo: EventDropArg) => {
    const event = dropInfo.event;
    const newStart = event.start!;
    const newEnd = event.end || new Date(newStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end
    
    if (onEventDrop && event.id) {
      onEventDrop(String(event.id), newStart, newEnd);
    }
  };

  // Handle event resize
  const handleEventResize = (resizeInfo: EventResizeArg) => {
    const event = resizeInfo.event;
    const newStart = event.start!;
    const newEnd = event.end || new Date(newStart.getTime() + 60 * 60 * 1000);
    
    if (onEventResize && event.id) {
      onEventResize(String(event.id), newStart, newEnd);
    }
  };

  // Configure working hours
  const slotMinTime = workingHours?.start || '00:00:00';
  const slotMaxTime = workingHours?.end || '24:00:00';

  // Configure week start day
  const firstDay = weekStartDay;

  // Count events per day for month view indicators
  const eventsByDate = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(event => {
      if (event.start) {
        const dateStr = new Date(event.start).toISOString().split('T')[0];
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    });
    return map;
  }, [events]);

  // Custom event content for different views
  const renderEventContent = (eventInfo: any) => {
    const viewType = eventInfo.view.type;
    
    // In month view, show compact event title
    if (viewType === 'dayGridMonth') {
      return {
        html: `
          <div class="fc-event-main-frame" style="padding: 2px 4px; font-size: 0.75rem;">
            <div class="fc-event-title">${eventInfo.event.title}</div>
          </div>
        `,
      };
    }
    
    // In week/day view, show full event with time
    return {
      html: `
        <div class="fc-event-main-frame" style="padding: 4px 6px;">
          <div class="fc-event-time" style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 2px;">
            ${eventInfo.timeText}
          </div>
          <div class="fc-event-title" style="font-weight: 600; font-size: 0.875rem;">
            ${eventInfo.event.title}
          </div>
        </div>
      `,
    };
  };

  // Sync calendar when currentDate or view changes externally
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const currentView = calendarApi.view;
      const currentViewType = currentView.type;
      
      // Update date if it changed externally
      const calendarDate = new Date(currentView.currentStart);
      const targetDate = new Date(currentDate);
      if (Math.abs(calendarDate.getTime() - targetDate.getTime()) > 1000) {
        calendarApi.gotoDate(currentDate);
      }
      
      // Update view if it changed externally
      const targetView = fullCalendarView;
      if (currentViewType !== targetView) {
        calendarApi.changeView(targetView);
      }
    }
  }, [currentDate, fullCalendarView]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={fullCalendarView}
        initialDate={currentDate}
        locale={fullCalendarLocale}
        dir={isRTL ? 'rtl' : 'ltr'}
        events={events}
        height={height}
        headerToolbar={false}
        buttonText={{
          today: locale === 'he' ? 'היום' : locale === 'ar' ? 'اليوم' : locale === 'ru' ? 'Сегодня' : 'Today',
          month: locale === 'he' ? 'חודש' : locale === 'ar' ? 'شهر' : locale === 'ru' ? 'Месяц' : 'Month',
          week: locale === 'he' ? 'שבוע' : locale === 'ar' ? 'أسبوع' : locale === 'ru' ? 'Неделя' : 'Week',
          day: locale === 'he' ? 'יום' : locale === 'ar' ? 'يوم' : locale === 'ru' ? 'День' : 'Day',
        }}
        firstDay={firstDay}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        allDaySlot={false}
        editable={!!onEventDrop || !!onEventResize}
        droppable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        dayCellDidMount={(arg) => {
          // Make day cells clickable in month view and add appointment count badge
          if (arg.view.type === 'dayGridMonth') {
            arg.el.style.cursor = 'pointer';
            
            // Add appointment count badge
            const dateStr = arg.date.toISOString().split('T')[0];
            const eventCount = eventsByDate.get(dateStr) || 0;
            
            if (eventCount > 0) {
              // Find the day number element and add count badge after it
              const dayNumberEl = arg.el.querySelector('.fc-daygrid-day-number');
              if (dayNumberEl && !arg.el.querySelector('.fc-daygrid-event-count-badge')) {
                const badge = document.createElement('div');
                badge.className = 'fc-daygrid-event-count-badge';
                badge.textContent = eventCount.toString();
                badge.style.cssText = `
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  min-width: 18px;
                  height: 18px;
                  padding: 0 4px;
                  background: hsl(var(--primary));
                  color: hsl(var(--primary-foreground));
                  border-radius: 9px;
                  font-size: 0.7rem;
                  font-weight: 600;
                  margin-top: 4px;
                  margin-left: 4px;
                `;
                const dayTop = arg.el.querySelector('.fc-daygrid-day-top');
                if (dayTop) {
                  dayTop.appendChild(badge);
                }
              }
            }
            
            const handleClick = (e: MouseEvent) => {
              // Don't trigger if clicking on an event
              if ((e.target as HTMLElement).closest('.fc-event')) {
                return;
              }
              // Get the date from the day cell
              const clickedDateStr = arg.dateStr;
              const clickedDate = new Date(clickedDateStr + 'T00:00:00');
              handleDayCellClick(clickedDate);
            };
            arg.el.addEventListener('click', handleClick);
          }
        }}
        dayHeaderDidMount={(arg) => {
          // Make day headers clickable in week view
          if (arg.view.type === 'timeGridWeek') {
            arg.el.style.cursor = 'pointer';
            const handleClick = () => {
              // Get the date from the header
              const date = arg.date;
              handleDayCellClick(date);
            };
            arg.el.addEventListener('click', handleClick);
          }
        }}
        eventDrop={onEventDrop ? handleEventDrop : undefined}
        eventResize={onEventResize ? handleEventResize : undefined}
        datesSet={handleDatesSet}
        eventDisplay="block"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        eventClassNames="cursor-pointer"
        eventContent={renderEventContent}
        nowIndicator={true}
        // RTL specific configurations
        rtl={isRTL}
        // Styling
        dayHeaderFormat={{
          weekday: 'short',
        }}
        // Prevent event overlap
        eventOverlap={false}
        // Allow events to be dragged outside calendar bounds
        eventConstraint={{
          start: slotMinTime,
          end: slotMaxTime,
        }}
        />
      </div>
    </div>
  );
}

