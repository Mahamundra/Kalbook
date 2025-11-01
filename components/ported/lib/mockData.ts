import type { Metric, ScheduleItem, Service, Customer, Template, Settings, Appointment, Worker } from '@/types/admin';

const SERVICES_KEY = 'bookinghub-services';
const CUSTOMERS_KEY = 'bookinghub-customers';
const TEMPLATES_KEY = 'bookinghub-templates';
const SETTINGS_KEY = 'bookinghub-settings';
const APPOINTMENTS_KEY = 'bookinghub-appointments';
const WORKERS_KEY = 'bookinghub-workers';

const defaultServices: Service[] = [
  { id: '1', name: 'Haircut', description: 'Professional haircut and styling', category: 'Hair', duration: 30, price: 120, taxRate: 17, active: true },
  { id: '2', name: 'Beard Trim', description: 'Beard shaping and trimming', category: 'Beard', duration: 20, price: 60, taxRate: 17, active: true },
  { id: '3', name: 'Haircut + Beard', description: 'Complete grooming package', category: 'Package', duration: 45, price: 160, taxRate: 17, active: true },
  { id: '4', name: 'Kids Haircut', description: 'Haircut for children under 12', category: 'Hair', duration: 20, price: 80, taxRate: 17, active: true },
];

const defaultCustomers: Customer[] = [
  { id: '1', name: 'John Doe', phone: '+972-50-123-4567', email: 'john@example.com', lastVisit: '2025-10-25', tags: ['VIP', 'Regular'], notes: 'Prefers morning appointments', visitHistory: [{ date: '2025-10-25', service: 'Haircut', staff: 'David' }, { date: '2025-10-10', service: 'Haircut + Beard', staff: 'David' }], consentMarketing: true },
  { id: '2', name: 'Mike Smith', phone: '+972-50-234-5678', email: 'mike@example.com', lastVisit: '2025-10-28', tags: ['Regular'], notes: '', visitHistory: [{ date: '2025-10-28', service: 'Beard Trim', staff: 'David' }], consentMarketing: false },
  { id: '3', name: 'Alex Johnson', phone: '+972-50-345-6789', email: 'alex@example.com', lastVisit: '2025-10-20', tags: ['New'], notes: 'Allergic to certain products', visitHistory: [{ date: '2025-10-20', service: 'Haircut', staff: 'Sarah' }], consentMarketing: true },
];

const defaultTemplates: Template[] = [
  { id: '1', channel: 'email', type: 'booking_confirmation', locale: 'en', subject: 'Your booking is confirmed!', body: `Hi {{customer.name}},\n\nYour {{service.name}} appointment is confirmed for {{booking.start}}.\n\nStaff: {{staff.name}}\nDuration: {{service.duration}} minutes\n\nView or manage your booking: {{booking.link}}\n\nWe look forward to seeing you!\n\nBest regards,\nStyle Studio` },
  { id: '2', channel: 'email', type: 'reminder', locale: 'en', subject: 'Reminder: Upcoming appointment', body: `Hi {{customer.name}},\n\nThis is a reminder for your {{service.name}} appointment tomorrow at {{booking.start}}.\n\nStaff: {{staff.name}}\nLocation: Style Studio\n\nIf you need to reschedule or cancel, please use this link: {{booking.link}}\n\nSee you soon!` },
  { id: '3', channel: 'email', type: 'booking_confirmation', locale: 'he', subject: 'ההזמנה שלך אושרה!', body: `שלום {{customer.name}},\n\nהתור שלך ל{{service.name}} אושר ל-{{booking.start}}.\n\nמטפל: {{staff.name}}\nמשך: {{service.duration}} דקות\n\nצפה בהזמנה או נהל אותה: {{booking.link}}\n\nנשמח לראותך!\n\nבברכה,\nStyle Studio` },
];

const defaultSettings: Settings = {
  businessProfile: { name: 'Style Studio', email: 'info@stylestudio.com', phone: '+972-50-123-4567', whatsapp: '+972-50-123-4567', address: '123 Main St, Tel Aviv, Israel', timezone: 'Asia/Jerusalem', currency: 'ILS' },
  branding: { logoUrl: '', themeColor: '#0EA5E9' },
  locale: { language: 'en', rtl: false },
  notifications: { senderName: 'Style Studio', senderEmail: 'noreply@stylestudio.com' },
  calendar: {
    weekStartDay: 0, // Sunday
    workingDays: [0, 1, 2, 3, 4], // Sunday to Thursday
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
  },
};

const defaultAppointments: Appointment[] = [
  { id: '1', staffId: '1', workerId: '1', service: 'Haircut', serviceId: '1', customer: 'John Doe', customerId: '1', start: '2025-10-30T09:00:00', end: '2025-10-30T09:30:00', status: 'confirmed' },
  { id: '2', staffId: '1', workerId: '1', service: 'Beard Trim', serviceId: '2', customer: 'Mike Smith', customerId: '2', start: '2025-10-30T10:00:00', end: '2025-10-30T10:20:00', status: 'confirmed' },
  { id: '3', staffId: '2', workerId: '2', service: 'Haircut + Beard', serviceId: '3', customer: 'Alex Johnson', customerId: '3', start: '2025-10-30T11:30:00', end: '2025-10-30T12:15:00', status: 'confirmed' },
  { id: '4', staffId: '1', workerId: '1', service: 'Kids Haircut', serviceId: '4', customer: 'Tommy Lee', customerId: '1', start: '2025-10-30T14:00:00', end: '2025-10-30T14:20:00', status: 'pending' },
];

const defaultWorkers: Worker[] = [
  { id: '1', name: 'David Cohen', email: 'david@stylestudio.com', phone: '+972-50-111-2222', services: ['1', '2', '3'], active: true },
  { id: '2', name: 'Sarah Levy', email: 'sarah@stylestudio.com', phone: '+972-50-333-4444', services: ['1', '3', '4'], active: true },
];

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const getMetrics = (t?: (key: string) => string): Metric[] => {
  const getLabel = (key: string) => t ? t(key) : key;
  const getChange = (template: string, value: string) => {
    if (!t) return template.replace('{value}', value);
    return t(template).replace('{value}', value);
  };

  return [
    { 
      label: getLabel('dashboard.todaysBookings'), 
      value: 8, 
      change: getChange('dashboard.fromYesterday', '2'), 
      trend: 'up' 
    },
    { 
      label: getLabel('dashboard.thisWeek'), 
      value: 42, 
      change: getChange('dashboard.fromLastWeek', '12'), 
      trend: 'up' 
    },
    { 
      label: getLabel('dashboard.revenueMTD'), 
      value: '₪4,850', 
      change: getChange('dashboard.fromLastMonth', '18'), 
      trend: 'up' 
    },
    { 
      label: getLabel('dashboard.noShowRate'), 
      value: '3.2%', 
      change: getChange('dashboard.improvement', '1.1'), 
      trend: 'down' 
    },
  ];
};

export const getTodaysSchedule = (): ScheduleItem[] => {
  const appointments = getAppointments();
  const workers = getWorkers();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Filter appointments for today only
  const todaysAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start);
    const aptDateStr = aptDate.toISOString().split('T')[0];
    return aptDateStr === todayStr && apt.status !== 'cancelled';
  });
  
  // Convert to ScheduleItem format and sort by time
  const schedule: ScheduleItem[] = todaysAppointments
    .map((apt) => {
      const startTime = new Date(apt.start);
      const workerId = apt.workerId || apt.staffId;
      const worker = workers.find((w) => w.id === workerId);
      
      return {
        id: apt.id,
        time: startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        service: apt.service,
        customer: apt.customer,
        staff: worker?.name || 'Unknown',
      };
    })
    .sort((a, b) => {
      // Sort by time (compare time strings)
      return a.time.localeCompare(b.time);
    });
  
  return schedule;
};

export const getServices = (): Service[] => getFromStorage(SERVICES_KEY, defaultServices);

export const createService = (data: Omit<Service, 'id'>): Service => {
  const services = getServices();
  const newService: Service = { ...data, id: Date.now().toString() };
  saveToStorage(SERVICES_KEY, [...services, newService]);
  return newService;
};

export const updateService = (id: string, data: Partial<Service>): Service | null => {
  const services = getServices();
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return null;
  services[index] = { ...services[index], ...data };
  saveToStorage(SERVICES_KEY, services);
  return services[index];
};

export const deleteService = (id: string): boolean => {
  const services = getServices();
  const filtered = services.filter((s) => s.id !== id);
  if (filtered.length === services.length) return false;
  saveToStorage(SERVICES_KEY, filtered);
  return true;
};

export const getCustomers = (): Customer[] => getFromStorage(CUSTOMERS_KEY, defaultCustomers);

export const getCustomer = (id: string): Customer | null => {
  const customers = getCustomers();
  return customers.find((c) => c.id === id) || null;
};

export const createCustomer = (data: Omit<Customer, 'id'>): Customer => {
  const customers = getCustomers();
  const newCustomer: Customer = { ...data, id: Date.now().toString() };
  saveToStorage(CUSTOMERS_KEY, [...customers, newCustomer]);
  return newCustomer;
};

export const updateCustomer = (id: string, data: Partial<Customer>): Customer | null => {
  const customers = getCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return null;
  customers[index] = { ...customers[index], ...data };
  saveToStorage(CUSTOMERS_KEY, customers);
  return customers[index];
};

export const deleteCustomer = (id: string): boolean => {
  const customers = getCustomers();
  const filtered = customers.filter((c) => c.id !== id);
  if (filtered.length === customers.length) return false;
  saveToStorage(CUSTOMERS_KEY, filtered);
  return true;
};

export const getTemplates = (channel?: 'email' | 'message'): Template[] => {
  const templates = getFromStorage(TEMPLATES_KEY, defaultTemplates);
  return channel ? templates.filter((t) => t.channel === channel) : templates;
};

export const updateTemplate = (id: string, data: Partial<Template>): Template | null => {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return null;
  templates[index] = { ...templates[index], ...data };
  saveToStorage(TEMPLATES_KEY, templates);
  return templates[index];
};

export const getSettings = (): Settings => getFromStorage(SETTINGS_KEY, defaultSettings);

export const updateSettings = (data: Partial<Settings>): Settings => {
  const current = getSettings();
  const updated = {
    ...current,
    ...data,
    businessProfile: { ...current.businessProfile, ...data.businessProfile },
    branding: { ...current.branding, ...data.branding },
    locale: { ...current.locale, ...data.locale },
    notifications: { ...current.notifications, ...data.notifications },
    calendar: { ...current.calendar, ...data.calendar },
  } as Settings;
  saveToStorage(SETTINGS_KEY, updated);
  return updated;
};

export const getAppointments = (): Appointment[] => getFromStorage(APPOINTMENTS_KEY, defaultAppointments);

export const createAppointment = (data: Omit<Appointment, 'id'>): Appointment => {
  const appointments = getAppointments();
  const newAppointment: Appointment = { ...data, id: Date.now().toString() };
  saveToStorage(APPOINTMENTS_KEY, [...appointments, newAppointment]);
  return newAppointment;
};

export const updateAppointment = (id: string, data: Partial<Appointment>): Appointment | null => {
  const appointments = getAppointments();
  const index = appointments.findIndex((a) => a.id === id);
  if (index === -1) return null;
  appointments[index] = { ...appointments[index], ...data };
  saveToStorage(APPOINTMENTS_KEY, appointments);
  return appointments[index];
};

export const deleteAppointment = (id: string): boolean => {
  const appointments = getAppointments();
  const filtered = appointments.filter((a) => a.id !== id);
  if (filtered.length === appointments.length) return false;
  saveToStorage(APPOINTMENTS_KEY, filtered);
  return true;
};

export const getWorkers = (): Worker[] => getFromStorage(WORKERS_KEY, defaultWorkers);

export const createWorker = (data: Omit<Worker, 'id'>): Worker => {
  const workers = getWorkers();
  const newWorker: Worker = { ...data, id: Date.now().toString() };
  saveToStorage(WORKERS_KEY, [...workers, newWorker]);
  return newWorker;
};

export const updateWorker = (id: string, data: Partial<Worker>): Worker | null => {
  const workers = getWorkers();
  const index = workers.findIndex((w) => w.id === id);
  if (index === -1) return null;
  workers[index] = { ...workers[index], ...data };
  saveToStorage(WORKERS_KEY, workers);
  return workers[index];
};

export const deleteWorker = (id: string): boolean => {
  const workers = getWorkers();
  const filtered = workers.filter((w) => w.id !== id);
  if (filtered.length === workers.length) return false;
  saveToStorage(WORKERS_KEY, filtered);
  return true;
};


