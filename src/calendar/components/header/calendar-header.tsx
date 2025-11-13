import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
  onViewChange?: (view: TCalendarView) => void;
}

export function CalendarHeader({ view, events, onViewChange }: IProps) {
  // Header is now minimal since controls are moved to top
  // This component is kept for compatibility but renders minimal content
  return (
    <div className="border-b">
      {/* Controls moved to top controls area in Calendar.tsx */}
    </div>
  );
}
