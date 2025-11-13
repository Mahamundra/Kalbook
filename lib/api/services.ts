/**
 * API service layer - replaces localStorage operations with API calls
 * All functions use the same interface as mockData.ts for drop-in replacement
 */

import type {
  Service,
  Customer,
  Appointment,
  Worker,
  Settings,
  Template,
} from '@/components/ported/types/admin';

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an API request with error handling
 * Includes credentials to send cookies (for business context)
 */
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin', // Include cookies (business-slug cookie)
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ApiError(`Network error: ${error.message}`);
    }
    throw new ApiError('Unknown error occurred');
  }
}

// ============================================================================
// SERVICES
// ============================================================================

export const getServices = async (): Promise<Service[]> => {
  const response = await apiRequest<{ success: boolean; services: Service[] }>(
    '/api/services'
  );
  return response.services;
};

export const createService = async (
  data: Omit<Service, 'id'>
): Promise<Service> => {
  const response = await apiRequest<{ success: boolean; service: Service }>(
    '/api/services',
    {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        category: data.category,
        duration: data.duration,
        price: data.price,
        taxRate: data.taxRate,
        active: data.active,
      }),
    }
  );
  return response.service;
};

export const updateService = async (
  id: string,
  data: Partial<Service>
): Promise<Service | null> => {
  try {
    const response = await apiRequest<{ success: boolean; service: Service }>(
      `/api/services/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          duration: data.duration,
          price: data.price,
          taxRate: data.taxRate,
          active: data.active,
        }),
      }
    );
    return response.service;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteService = async (id: string): Promise<boolean> => {
  try {
    await apiRequest<{ success: boolean }>(`/api/services/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
};

// ============================================================================
// CUSTOMERS
// ============================================================================

export const getCustomers = async (): Promise<Customer[]> => {
  // Get all customers (no pagination limit for compatibility)
  const response = await apiRequest<{
    success: boolean;
    customers: Customer[];
    count: number;
  }>('/api/customers?limit=10000');
  return response.customers;
};

export const getCustomer = async (id: string): Promise<Customer | null> => {
  try {
    const response = await apiRequest<{ success: boolean; customer: Customer }>(
      `/api/customers/${id}`
    );
    return response.customer;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getCustomerByPhone = async (
  phone: string
): Promise<Customer | null> => {
  try {
    // Normalize phone for URL
    const normalizedPhone = encodeURIComponent(phone);
    const response = await apiRequest<{ success: boolean; customer: Customer }>(
      `/api/customers/phone/${normalizedPhone}`
    );
    return response.customer;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createCustomer = async (
  data: Omit<Customer, 'id'>
): Promise<Customer> => {
  const response = await apiRequest<{ success: boolean; customer: Customer }>(
    '/api/customers',
    {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        tags: data.tags || [],
        consentMarketing: data.consentMarketing,
      }),
    }
  );
  return response.customer;
};

export const updateCustomer = async (
  id: string,
  data: Partial<Customer>
): Promise<Customer | null> => {
  try {
    const response = await apiRequest<{ success: boolean; customer: Customer }>(
      `/api/customers/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email,
          notes: data.notes,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          tags: data.tags,
          consentMarketing: data.consentMarketing,
          blocked: data.blocked,
        }),
      }
    );
    return response.customer;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  try {
    await apiRequest<{ success: boolean }>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
};

export const deleteCustomers = async (ids: string[]): Promise<number> => {
  // Delete customers one by one (no bulk delete endpoint)
  let deletedCount = 0;
  for (const id of ids) {
    try {
      await deleteCustomer(id);
      deletedCount++;
    } catch (error) {
      // Continue deleting others even if one fails
      console.error(`Failed to delete customer ${id}:`, error);
    }
  }
  return deletedCount;
};

export const getAppointmentsByCustomerId = async (
  customerId: string
): Promise<Appointment[]> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      appointments: Appointment[];
    }>(`/api/customers/${customerId}/appointments`);
    return response.appointments || [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const cancelCustomerAppointments = async (
  customerId: string
): Promise<number> => {
  // Get all appointments for customer
  const appointments = await getAppointmentsByCustomerId(customerId);
  let canceledCount = 0;

  // Cancel each appointment
  for (const apt of appointments) {
    if (apt.status !== 'cancelled') {
      try {
        await apiRequest<{ success: boolean }>(
          `/api/appointments/${apt.id}/cancel`,
          {
            method: 'POST',
          }
        );
        canceledCount++;
      } catch (error) {
        console.error(`Failed to cancel appointment ${apt.id}:`, error);
      }
    }
  }

  return canceledCount;
};

export const toggleCustomerBlocked = async (
  customerId: string,
  blocked: boolean
): Promise<Customer | null> => {
  try {
    const response = await apiRequest<{ success: boolean; customer: Customer }>(
      `/api/customers/${customerId}/block`,
      {
        method: 'POST',
        body: JSON.stringify({ blocked }),
      }
    );
    return response.customer;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

// ============================================================================
// APPOINTMENTS
// ============================================================================

export const getAppointments = async (): Promise<Appointment[]> => {
  const response = await apiRequest<{
    success: boolean;
    appointments: Appointment[];
    count: number;
  }>('/api/appointments');
  return response.appointments || [];
};

export const createAppointment = async (
  data: Omit<Appointment, 'id'> & { createdBy?: 'customer' | 'admin' }
): Promise<Appointment> => {
  // Determine if this is a customer request based on the calling context
  // If createdBy is not explicitly set, try to detect from window location
  let createdBy = data.createdBy;
  if (!createdBy && typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.includes('/booking') || pathname.includes('/b/')) {
      createdBy = 'customer';
    }
  }
  
  const response = await apiRequest<{ success: boolean; appointment: Appointment }>(
    '/api/appointments',
    {
      method: 'POST',
      body: JSON.stringify({
        customerId: data.customerId,
        serviceId: data.serviceId,
        workerId: data.workerId || data.staffId,
        start: data.start,
        end: data.end,
        status: data.status || 'pending',
        createdBy: createdBy || 'customer', // Default to customer for booking page calls
      }),
    }
  );
  return response.appointment;
};

export const updateAppointment = async (
  id: string,
  data: Partial<Appointment>
): Promise<Appointment | null> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      appointment: Appointment;
    }>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        customerId: data.customerId,
        serviceId: data.serviceId,
        workerId: data.workerId || data.staffId,
        start: data.start,
        end: data.end,
        status: data.status,
      }),
    });
    return response.appointment;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const cancelAppointment = async (id: string): Promise<Appointment | null> => {
  try {
    const response = await apiRequest<{ success: boolean; appointment: Appointment }>(
      `/api/appointments/${id}/cancel`,
      {
        method: 'POST',
      }
    );
    return response.appointment;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteAppointment = async (id: string): Promise<boolean> => {
  try {
    await apiRequest<{ success: boolean }>(`/api/appointments/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
};

// ============================================================================
// WORKERS
// ============================================================================

export const getWorkers = async (): Promise<Worker[]> => {
  const response = await apiRequest<{ success: boolean; workers: Worker[] }>(
    '/api/workers'
  );
  return response.workers || [];
};

export const createWorker = async (
  data: Omit<Worker, 'id'>
): Promise<Worker> => {
  const response = await apiRequest<{ success: boolean; worker: Worker }>(
    '/api/workers',
    {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        services: data.services || [],
        active: data.active,
        color: data.color,
      }),
    }
  );
  return response.worker;
};

export const updateWorker = async (
  id: string,
  data: Partial<Worker>
): Promise<Worker | null> => {
  try {
    const response = await apiRequest<{ success: boolean; worker: Worker }>(
      `/api/workers/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          services: data.services,
          active: data.active,
          color: data.color,
        }),
      }
    );
    return response.worker;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteWorker = async (id: string): Promise<boolean> => {
  try {
    await apiRequest<{ success: boolean }>(`/api/workers/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
};

// ============================================================================
// SETTINGS
// ============================================================================

export const getSettings = async (): Promise<Settings> => {
  const response = await apiRequest<{ success: boolean; settings: Settings }>(
    '/api/settings'
  );
  return response.settings;
};

export const updateSettings = async (
  data: Partial<Settings>
): Promise<Settings> => {
  const response = await apiRequest<{ success: boolean; settings: Settings }>(
    '/api/settings',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
  return response.settings;
};

// ============================================================================
// FILE UPLOAD
// ============================================================================

export interface UploadFileResponse {
  success: boolean;
  url: string;
  path: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage via API
 */
export const uploadFile = async (
  file: File,
  fileType: 'logo' | 'banner-image' | 'banner-video'
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const response = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header, let browser set it with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  return response.json();
};

/**
 * Delete a file from Supabase Storage via API
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  const response = await fetch('/api/storage/upload', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete file');
  }
};

// ============================================================================
// TEMPLATES
// ============================================================================

export const getTemplates = async (
  channel?: 'email' | 'message'
): Promise<Template[]> => {
  const url =
    channel !== undefined
      ? `/api/templates?channel=${channel}`
      : '/api/templates';
  const response = await apiRequest<{
    success: boolean;
    templates: Template[];
    count: number;
  }>(url);
  return response.templates || [];
};

export const updateTemplate = async (
  id: string,
  data: Partial<Template>
): Promise<Template | null> => {
  try {
    const response = await apiRequest<{ success: boolean; template: Template }>(
      `/api/templates/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          channel: data.channel,
          type: data.type,
          locale: data.locale,
          subject: data.subject,
          body: data.body,
        }),
      }
    );
    return response.template;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Get metrics - this would use the dashboard metrics API
 * Note: This function signature matches mockData.ts but uses API
 */
export const getMetrics = async (): Promise<any[]> => {
  // This would call /api/dashboard/metrics
  // For now, return empty array to maintain compatibility
  // The actual implementation would depend on how metrics are used
  return [];
};

/**
 * Get today's schedule
 * Note: This function signature matches mockData.ts but uses API
 */
export const getTodaysSchedule = async (): Promise<any[]> => {
  try {
    const response = await apiRequest<{
      success: boolean;
      metrics: { todaysSchedule: any[] };
    }>('/api/dashboard/metrics');
    return response.metrics.todaysSchedule || [];
  } catch (error) {
    console.error('Failed to fetch today\'s schedule:', error);
    return [];
  }
};

