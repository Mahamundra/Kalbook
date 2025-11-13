"use client";

import { format, parseISO } from "date-fns";
import { he, ar, ru } from "date-fns/locale";
import type { Locale } from "date-fns";
import { Calendar, Clock, Text, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from "@/calendar/hooks/use-translations";
import { useLocale } from "@/components/ported/hooks/useLocale";
import { useAppointmentContext } from "@/lib/calendar/appointment-context";
import { CustomEditEventDialog } from "@/calendar/components/dialogs/custom-edit-event-dialog";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  event: IEvent;
  children: React.ReactNode;
  onEventClick?: (event: IEvent) => void;
}

export function EventDetailsDialog({ event, children, onEventClick }: IProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { services, workers, customers, appointments, onUpdateAppointment, onDeleteAppointment } = useAppointmentContext();
  
  const localeMap: Record<string, Locale> = {
    he: he,
    ar: ar,
    ru: ru,
  };
  const dateFnsLocale = localeMap[locale || 'en'];
  
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);

  const handleOpenChange = (open: boolean) => {
    if (open && onEventClick) {
      onEventClick(event);
    }
  };

  return (
    <>
      <Dialog onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <User className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.responsible}</p>
                <p className="text-sm text-muted-foreground">{event.user.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.startDate}</p>
                <p className="text-sm text-muted-foreground">{format(startDate, "MMM d, yyyy h:mm a", { locale: dateFnsLocale })}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.endDate}</p>
                <p className="text-sm text-muted-foreground">{format(endDate, "MMM d, yyyy h:mm a", { locale: dateFnsLocale })}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Text className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.description}</p>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <CustomEditEventDialog
              event={event}
              appointments={appointments}
              services={services}
              workers={workers}
              customers={customers}
              onUpdateAppointment={onUpdateAppointment}
              onDeleteAppointment={onDeleteAppointment}
              onEventClick={onEventClick}
            >
              <Button type="button" variant="outline">
                {t.edit}
              </Button>
            </CustomEditEventDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
