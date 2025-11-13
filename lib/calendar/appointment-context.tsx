/**
 * Context for providing appointment creation functionality to big-calendar components
 */

"use client";

import { createContext, useContext, ReactNode } from 'react';
import type { Service, Worker, Customer } from '@/components/ported/types/admin';

interface AppointmentContextType {
  services: Service[];
  workers: Worker[];
  customers: Customer[];
  appointments: any[];
  onCreateAppointment: (appointment: {
    serviceId: string;
    customerId: string;
    workerId: string;
    start: string;
    end: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }) => Promise<void>;
  onUpdateAppointment: (appointmentId: string, appointment: Partial<any>) => Promise<void>;
  onDeleteAppointment: (appointmentId: string) => Promise<void>;
  onQuickCreateCustomer?: () => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ 
  children, 
  services, 
  workers, 
  customers,
  appointments,
  onCreateAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onQuickCreateCustomer,
}: { 
  children: ReactNode;
  services: Service[];
  workers: Worker[];
  customers: Customer[];
  appointments: any[];
  onCreateAppointment: (appointment: {
    serviceId: string;
    customerId: string;
    workerId: string;
    start: string;
    end: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }) => Promise<void>;
  onUpdateAppointment: (appointmentId: string, appointment: Partial<any>) => Promise<void>;
  onDeleteAppointment: (appointmentId: string) => Promise<void>;
  onQuickCreateCustomer?: () => void;
}) {
  return (
    <AppointmentContext.Provider value={{ 
      services, 
      workers, 
      customers, 
      appointments,
      onCreateAppointment, 
      onUpdateAppointment,
      onDeleteAppointment,
      onQuickCreateCustomer 
    }}>
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointmentContext() {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointmentContext must be used within AppointmentProvider');
  }
  return context;
}

