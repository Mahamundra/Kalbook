/**
 * Migration utility to migrate localStorage data to Supabase database
 * 
 * This utility:
 * 1. Reads data from localStorage
 * 2. Validates data structure
 * 3. Creates business in database
 * 4. Migrates all related data (services, customers, appointments, etc.)
 * 5. Clears localStorage after successful migration
 * 6. Handles errors and rollback if needed
 * 
 * Usage:
 * import { migrateLocalStorageToSupabase } from '@/lib/migration/migrate-localStorage';
 * await migrateLocalStorageToSupabase({
 *   businessType: 'barbershop',
 *   adminUser: { email: 'admin@example.com', name: 'Admin', phone: '+1234567890' }
 * });
 */

import type {
  Service,
  Customer,
  Appointment,
  Worker,
  Settings,
  Template,
} from '@/components/ported/types/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateUniqueSlug } from '@/lib/onboarding/utils';
import type { BusinessType } from '@/lib/supabase/database.types';

// localStorage keys
const SERVICES_KEY = 'bookinghub-services';
const CUSTOMERS_KEY = 'bookinghub-customers';
const TEMPLATES_KEY = 'bookinghub-templates';
const SETTINGS_KEY = 'bookinghub-settings';
const APPOINTMENTS_KEY = 'bookinghub-appointments';
const WORKERS_KEY = 'bookinghub-workers';

interface MigrationOptions {
  businessType: BusinessType;
  adminUser: {
    email: string;
    name: string;
    phone?: string;
  };
  businessName?: string; // Optional, defaults to settings.businessProfile.name
}

interface MigrationResult {
  success: boolean;
  businessId?: string;
  businessSlug?: string;
  migrated: {
    services: number;
    customers: number;
    workers: number;
    appointments: number;
    templates: number;
  };
  errors?: string[];
}

interface IdMapping {
  [oldId: string]: string; // old localStorage ID -> new database UUID
}

/**
 * Read data from localStorage
 */
function readFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Validate data structure
 */
function validateData(settings: Settings): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!settings.businessProfile?.name) {
    errors.push('Business name is missing in settings');
  }

  if (!settings.businessProfile?.email) {
    errors.push('Business email is missing in settings');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create business from settings
 */
async function createBusiness(
  settings: Settings,
  options: MigrationOptions
): Promise<{ businessId: string; businessSlug: string }> {
  const supabase = createAdminClient();
  const businessName = options.businessName || settings.businessProfile.name;

  // Generate unique slug
  const slug = await generateUniqueSlug(businessName);

  // Create business
  const businessData = {
    slug,
    name: businessName,
    email: settings.businessProfile.email || options.adminUser.email,
    phone: settings.businessProfile.phone || null,
    whatsapp: settings.businessProfile.whatsapp || settings.businessProfile.phone || null,
    address: settings.businessProfile.address || null,
    timezone: settings.businessProfile.timezone || 'UTC',
    currency: settings.businessProfile.currency || 'USD',
    business_type: options.businessType,
  };

  const { data: newBusiness, error } = await supabase
    .from('businesses')
    .insert(businessData as any)
    .select()
    .single();

  if (error || !newBusiness) {
    throw new Error(`Failed to create business: ${error?.message || 'Unknown error'}`);
  }

  return {
    businessId: (newBusiness as any).id,
    businessSlug: slug,
  };
}

/**
 * Migrate services
 */
async function migrateServices(
  services: Service[],
  businessId: string
): Promise<IdMapping> {
  const supabase = createAdminClient();
  const idMapping: IdMapping = {};

  if (services.length === 0) {
    return idMapping;
  }

  // Prepare service data
  const servicesData = services.map((service) => ({
    business_id: businessId,
    name: service.name,
    description: service.description || null,
    category: service.category || null,
    duration: service.duration,
    price: service.price,
    tax_rate: service.taxRate || 0,
    active: service.active !== false,
  }));

  // Insert services
  const { data: createdServices, error } = await supabase
    .from('services')
    .insert(servicesData as any)
    .select();

  if (error || !createdServices) {
    throw new Error(`Failed to migrate services: ${error?.message || 'Unknown error'}`);
  }

  // Create ID mapping
  services.forEach((oldService, index) => {
    if (createdServices[index]) {
      idMapping[oldService.id] = (createdServices[index] as any).id;
    }
  });

  return idMapping;
}

/**
 * Migrate customers
 */
async function migrateCustomers(
  customers: Customer[],
  businessId: string
): Promise<IdMapping> {
  const supabase = createAdminClient();
  const idMapping: IdMapping = {};

  if (customers.length === 0) {
    return idMapping;
  }

  // Insert customers
  const customerPromises = customers.map(async (customer) => {
    const customerData = {
      business_id: businessId,
      name: customer.name,
      phone: customer.phone.replace(/[\s\-\(\)]/g, ''), // Normalize phone
      email: customer.email || null,
      notes: customer.notes || null,
      date_of_birth: customer.dateOfBirth || null,
      gender: customer.gender || null,
      consent_marketing: customer.consentMarketing || false,
      blocked: customer.blocked || false,
      last_visit: customer.lastVisit || null,
    };

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData as any)
      .select()
      .single();

    if (error || !newCustomer) {
      throw new Error(`Failed to migrate customer ${customer.name}: ${error?.message}`);
    }

    const newCustomerId = (newCustomer as any).id;
    idMapping[customer.id] = newCustomerId;

    // Migrate customer tags
    if (customer.tags && customer.tags.length > 0) {
      const tagsData = customer.tags.map((tag) => ({
        customer_id: newCustomerId,
        tag: tag,
      }));

      const { error: tagsError } = await supabase
        .from('customer_tags')
        .insert(tagsData as any);

      if (tagsError) {
        console.warn(`Failed to migrate tags for customer ${customer.name}:`, tagsError);
      }
    }

    // Migrate visit history
    if (customer.visitHistory && customer.visitHistory.length > 0) {
      const visitsData = customer.visitHistory.map((visit) => ({
        customer_id: newCustomerId,
        business_id: businessId,
        date: visit.date,
        service_name: visit.service,
        staff_name: visit.staff,
      }));

      const { error: visitsError } = await supabase
        .from('visits')
        .insert(visitsData as any);

      if (visitsError) {
        console.warn(`Failed to migrate visit history for customer ${customer.name}:`, visitsError);
      }
    }

    return newCustomerId;
  });

  await Promise.all(customerPromises);

  return idMapping;
}

/**
 * Migrate workers
 */
async function migrateWorkers(
  workers: Worker[],
  businessId: string,
  serviceIdMapping: IdMapping
): Promise<IdMapping> {
  const supabase = createAdminClient();
  const idMapping: IdMapping = {};

  if (workers.length === 0) {
    return idMapping;
  }

  // Insert workers
  const workerPromises = workers.map(async (worker) => {
    const workerData = {
      business_id: businessId,
      name: worker.name,
      email: worker.email || null,
      phone: worker.phone || null,
      active: worker.active !== false,
      color: worker.color || '#3B82F6',
    };

    const { data: newWorker, error } = await supabase
      .from('workers')
      .insert(workerData as any)
      .select()
      .single();

    if (error || !newWorker) {
      throw new Error(`Failed to migrate worker ${worker.name}: ${error?.message}`);
    }

    const newWorkerId = (newWorker as any).id;
    idMapping[worker.id] = newWorkerId;

    // Migrate worker-services relationships
    if (worker.services && worker.services.length > 0) {
      // Map old service IDs to new service IDs
      const newServiceIds = worker.services
        .map((oldServiceId) => serviceIdMapping[oldServiceId])
        .filter((id) => id !== undefined);

      if (newServiceIds.length > 0) {
        const workerServicesData = newServiceIds.map((serviceId) => ({
          worker_id: newWorkerId,
          service_id: serviceId,
        }));

        const { error: servicesError } = await supabase
          .from('worker_services')
          .insert(workerServicesData as any);

        if (servicesError) {
          console.warn(`Failed to migrate services for worker ${worker.name}:`, servicesError);
        }
      }
    }

    return newWorkerId;
  });

  await Promise.all(workerPromises);

  return idMapping;
}

/**
 * Migrate appointments
 */
async function migrateAppointments(
  appointments: Appointment[],
  businessId: string,
  customerIdMapping: IdMapping,
  serviceIdMapping: IdMapping,
  workerIdMapping: IdMapping
): Promise<number> {
  const supabase = createAdminClient();

  if (appointments.length === 0) {
    return 0;
  }

  // Filter out appointments with missing references
  const validAppointments = appointments.filter((apt) => {
    const hasCustomer = customerIdMapping[apt.customerId || ''];
    const hasService = serviceIdMapping[apt.serviceId || ''];
    const hasWorker = workerIdMapping[apt.workerId || apt.staffId || ''];
    return hasCustomer && hasService && hasWorker;
  });

  if (validAppointments.length === 0) {
    console.warn('No valid appointments to migrate (missing references)');
    return 0;
  }

  // Prepare appointment data
  const appointmentsData = validAppointments.map((apt) => ({
    business_id: businessId,
    customer_id: customerIdMapping[apt.customerId!],
    service_id: serviceIdMapping[apt.serviceId!],
    worker_id: workerIdMapping[apt.workerId || apt.staffId!],
    start: apt.start,
    end: apt.end,
    status: apt.status || 'pending',
  }));

  // Insert appointments
  const { error } = await supabase
    .from('appointments')
    .insert(appointmentsData as any);

  if (error) {
    throw new Error(`Failed to migrate appointments: ${error.message}`);
  }

  return validAppointments.length;
}

/**
 * Migrate templates
 */
async function migrateTemplates(
  templates: Template[],
  businessId: string
): Promise<number> {
  const supabase = createAdminClient();

  if (templates.length === 0) {
    return 0;
  }

  // Prepare template data
  const templatesData = templates.map((template) => ({
    business_id: businessId,
    channel: template.channel,
    type: template.type,
    locale: template.locale,
    subject: template.subject || null,
    body: template.body,
  }));

  // Insert templates
  const { error } = await supabase
    .from('templates')
    .insert(templatesData as any);

  if (error) {
    throw new Error(`Failed to migrate templates: ${error.message}`);
  }

  return templates.length;
}

/**
 * Migrate settings
 */
async function migrateSettings(
  settings: Settings,
  businessId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Prepare settings data
  const settingsData = {
    business_id: businessId,
    branding: settings.branding || {},
    locale: settings.locale || { language: 'en', rtl: false },
    notifications: settings.notifications || {},
    calendar: settings.calendar || {},
    registration: settings.registration || {},
  };

  // Insert or update settings
  const { error } = await supabase
    .from('settings')
    .insert(settingsData as any);

  if (error) {
    // If settings already exist, update them
    const { error: updateError } = await supabase
      .from('settings')
      .update(settingsData as any)
      .eq('business_id', businessId);

    if (updateError) {
      throw new Error(`Failed to migrate settings: ${updateError.message}`);
    }
  }
}

/**
 * Clear localStorage
 */
function clearLocalStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(SERVICES_KEY);
    localStorage.removeItem(CUSTOMERS_KEY);
    localStorage.removeItem(TEMPLATES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(APPOINTMENTS_KEY);
    localStorage.removeItem(WORKERS_KEY);
    console.log('✅ localStorage cleared');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    throw error;
  }
}

/**
 * Rollback migration (delete created data)
 */
async function rollbackMigration(businessId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Delete business (cascade will delete related data)
    await supabase.from('businesses').delete().eq('id', businessId);
    console.log('✅ Rollback completed');
  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
export async function migrateLocalStorageToSupabase(
  options: MigrationOptions
): Promise<MigrationResult> {
  if (typeof window === 'undefined') {
    throw new Error('Migration must run in browser environment');
  }

  const errors: string[] = [];
  let businessId: string | undefined;
  let businessSlug: string | undefined;

  try {
    console.log('🚀 Starting migration from localStorage to Supabase...');

    // 1. Read data from localStorage
    console.log('📖 Reading data from localStorage...');
    const settings = readFromLocalStorage<Settings>(SETTINGS_KEY, {} as Settings);
    const services = readFromLocalStorage<Service[]>(SERVICES_KEY, []);
    const customers = readFromLocalStorage<Customer[]>(CUSTOMERS_KEY, []);
    const workers = readFromLocalStorage<Worker[]>(WORKERS_KEY, []);
    const appointments = readFromLocalStorage<Appointment[]>(APPOINTMENTS_KEY, []);
    const templates = readFromLocalStorage<Template[]>(TEMPLATES_KEY, []);

    // 2. Validate data
    console.log('✅ Validating data...');
    const validation = validateData(settings);
    if (!validation.isValid) {
      throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // 3. Create business
    console.log('🏢 Creating business...');
    const { businessId: createdBusinessId, businessSlug: createdSlug } =
      await createBusiness(settings, options);
    businessId = createdBusinessId;
    businessSlug = createdSlug;
    console.log(`✅ Business created: ${createdSlug} (${createdBusinessId})`);

    // 4. Migrate services
    console.log(`📦 Migrating ${services.length} services...`);
    const serviceIdMapping = await migrateServices(services, businessId);
    console.log(`✅ Migrated ${services.length} services`);

    // 5. Migrate customers
    console.log(`👥 Migrating ${customers.length} customers...`);
    const customerIdMapping = await migrateCustomers(customers, businessId);
    console.log(`✅ Migrated ${customers.length} customers`);

    // 6. Migrate workers
    console.log(`👨‍💼 Migrating ${workers.length} workers...`);
    const workerIdMapping = await migrateWorkers(
      workers,
      businessId,
      serviceIdMapping
    );
    console.log(`✅ Migrated ${workers.length} workers`);

    // 7. Migrate appointments
    console.log(`📅 Migrating ${appointments.length} appointments...`);
    const appointmentsMigrated = await migrateAppointments(
      appointments,
      businessId,
      customerIdMapping,
      serviceIdMapping,
      workerIdMapping
    );
    console.log(`✅ Migrated ${appointmentsMigrated} appointments`);

    // 8. Migrate templates
    console.log(`📝 Migrating ${templates.length} templates...`);
    const templatesMigrated = await migrateTemplates(templates, businessId);
    console.log(`✅ Migrated ${templatesMigrated} templates`);

    // 9. Migrate settings
    console.log('⚙️ Migrating settings...');
    await migrateSettings(settings, businessId);
    console.log('✅ Settings migrated');

    // 10. Clear localStorage
    console.log('🧹 Clearing localStorage...');
    clearLocalStorage();

    console.log('✅ Migration completed successfully!');

    return {
      success: true,
      businessId,
      businessSlug,
      migrated: {
        services: services.length,
        customers: customers.length,
        workers: workers.length,
        appointments: appointmentsMigrated,
        templates: templatesMigrated,
      },
    };
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    errors.push(error.message || 'Unknown error');

    // Rollback if business was created
    if (businessId) {
      console.log('🔄 Rolling back migration...');
      try {
        await rollbackMigration(businessId);
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
        errors.push(`Rollback failed: ${rollbackError}`);
      }
    }

    return {
      success: false,
      errors,
    };
  }
}

/**
 * Check if localStorage has data to migrate
 */
export function hasLocalStorageData(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasServices = !!localStorage.getItem(SERVICES_KEY);
  const hasCustomers = !!localStorage.getItem(CUSTOMERS_KEY);
  const hasWorkers = !!localStorage.getItem(WORKERS_KEY);
  const hasAppointments = !!localStorage.getItem(APPOINTMENTS_KEY);
  const hasTemplates = !!localStorage.getItem(TEMPLATES_KEY);
  const hasSettings = !!localStorage.getItem(SETTINGS_KEY);

  return hasServices || hasCustomers || hasWorkers || hasAppointments || hasTemplates || hasSettings;
}

