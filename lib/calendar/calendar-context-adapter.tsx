/**
 * Calendar Context Adapter
 * Syncs our appointment state with big-calendar's context
 */

"use client";

import { useEffect, useRef } from 'react';
import { useCalendar } from '@/calendar/contexts/calendar-context';
import type { IEvent } from '@/calendar/interfaces';

interface CalendarContextAdapterProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedWorkerId: string;
  onWorkerChange: (workerId: string) => void;
  events: IEvent[];
  onEventClick?: (event: IEvent) => void;
}

/**
 * Adapter component to sync our state with big-calendar context
 */
export function CalendarContextAdapter({
  selectedDate,
  onDateChange,
  selectedWorkerId,
  onWorkerChange,
  events,
  onEventClick,
}: CalendarContextAdapterProps) {
  const { selectedDate: contextDate, setSelectedDate, selectedUserId, setSelectedUserId, setLocalEvents } = useCalendar();
  
  // Use refs to track last values and prevent circular updates
  const lastSelectedDateRef = useRef<string>(selectedDate.toISOString());
  const lastSelectedWorkerIdRef = useRef<string>(selectedWorkerId);
  const isInternalUpdateRef = useRef(false);

  // Sync selected date from parent to context (only when parent changes)
  useEffect(() => {
    const dateStr = selectedDate.toISOString();
    if (dateStr !== lastSelectedDateRef.current && !isInternalUpdateRef.current) {
      lastSelectedDateRef.current = dateStr;
      isInternalUpdateRef.current = true;
      setSelectedDate(selectedDate);
      // Reset flag in next tick
      requestAnimationFrame(() => {
        isInternalUpdateRef.current = false;
      });
    }
  }, [selectedDate, setSelectedDate]);

  // Sync worker filter from parent to context (only when parent changes)
  useEffect(() => {
    if (selectedWorkerId !== lastSelectedWorkerIdRef.current && !isInternalUpdateRef.current) {
      lastSelectedWorkerIdRef.current = selectedWorkerId;
      isInternalUpdateRef.current = true;
      setSelectedUserId(selectedWorkerId === 'all' ? 'all' : selectedWorkerId);
      // Reset flag in next tick
      requestAnimationFrame(() => {
        isInternalUpdateRef.current = false;
      });
    }
  }, [selectedWorkerId, setSelectedUserId]);

  // Sync events (always one-way from parent)
  useEffect(() => {
    setLocalEvents(events);
  }, [events, setLocalEvents]);

  // Listen for date changes from big-calendar (only when context changes and not from our update)
  useEffect(() => {
    const contextDateStr = contextDate.toISOString();
    if (contextDateStr !== lastSelectedDateRef.current && !isInternalUpdateRef.current) {
      lastSelectedDateRef.current = contextDateStr;
      onDateChange(contextDate);
    }
  }, [contextDate, onDateChange]);

  // Listen for worker filter changes from big-calendar (only when context changes and not from our update)
  useEffect(() => {
    if (selectedUserId !== lastSelectedWorkerIdRef.current && selectedUserId !== 'all' && !isInternalUpdateRef.current) {
      lastSelectedWorkerIdRef.current = selectedUserId;
      onWorkerChange(selectedUserId);
    }
  }, [selectedUserId, onWorkerChange]);

  return null;
}

