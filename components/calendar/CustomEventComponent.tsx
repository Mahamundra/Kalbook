/**
 * Custom event component for calendar
 * Displays appointments with service icons, worker colors, and group info
 */

import { Clock, Scissors, Sparkles, Droplet, User } from 'lucide-react';
import type { ExtendedSchedulerEvent } from '@/lib/calendar/event-mapper';

interface CustomEventComponentProps {
  event: ExtendedSchedulerEvent;
  onClick?: (event: ExtendedSchedulerEvent) => void;
}

// Helper function to get service icon
const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  
  if (name.includes('gel') || name.includes('nail') || name.includes('polish')) {
    return <Sparkles className="w-3 h-3" />;
  }
  if (name.includes('haircut') || name.includes('hair')) {
    return <Scissors className="w-3 h-3" />;
  }
  if (name.includes('beard') || name.includes('trim')) {
    return <User className="w-3 h-3" />;
  }
  if (name.includes('peeling') || name.includes('peel')) {
    return <Droplet className="w-3 h-3" />;
  }
  if (name.includes('facial') || name.includes('face')) {
    return <Clock className="w-3 h-3" />;
  }
  return <Clock className="w-3 h-3" />;
};

export default function CustomEventComponent({
  event,
  onClick,
}: CustomEventComponentProps) {
  const serviceIcon = getServiceIcon(event.service || event.title);
  const start = event.startDate;
  const end = event.endDate;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="h-full w-full p-1.5 cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        borderLeftColor: event.color,
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-start gap-1.5 mb-0.5">
        {serviceIcon}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-semibold text-xs truncate">
            {event.title}
          </div>
          <div className="text-[10px] opacity-90 mt-0.5 truncate">
            {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} -{' '}
            {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      {event.description && (
        <div className="text-[10px] font-medium mt-1 truncate">
          {event.description}
        </div>
      )}
    </div>
  );
}

