import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateUniqueSlug } from '@/lib/onboarding/utils';
import type { BusinessType } from '@/lib/supabase/database.types';
import type {
  Service,
  Customer,
  Appointment,
  Worker,
  Settings,
  Template,
} from '@/components/ported/types/admin';

/**
 * POST /api/migration/localStorage
 * Migrate localStorage data to Supabase database
 * 
 * Request body:
 * {
 *   businessType: 'barbershop' | 'nail_salon' | 'gym_trainer' | 'other',
 *   adminUser: { email: string, name: string, phone?: string },
 *   data: {
 *     settings: Settings,
 *     services: Service[],
 *     customers: Customer[],
 *     workers: Worker[],
 *     appointments: Appointment[],
 *     templates: Template[]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessType, adminUser, data } = body;

    // Validate required fields
    if (!businessType || !['barbershop', 'nail_salon', 'gym_trainer', 'other'].includes(businessType)) {
      return NextResponse.json(
        { error: 'Valid businessType is required' },
        { status: 400 }
      );
    }

    if (!adminUser?.email || !adminUser?.name) {
      return NextResponse.json(
        { error: 'Admin user email and name are required' },
        { status: 400 }
      );
    }

    if (!data || !data.settings) {
      return NextResponse.json(
        { error: 'Migration data is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Extract data
    const settings: Settings = data.settings;
    const services: Service[] = data.services || [];
    const customers: Customer[] = data.customers || [];
    const workers: Worker[] = data.workers || [];
    const appointments: Appointment[] = data.appointments || [];
    const templates: Template[] = data.templates || [];

    // Validate settings
    if (!settings.businessProfile?.name) {
      return NextResponse.json(
        { error: 'Business name is required in settings' },
        { status: 400 }
      );
    }

    // Create business
    const businessName = settings.businessProfile.name;
    const slug = await generateUniqueSlug(businessName);

    const businessData = {
      slug,
      name: businessName,
      email: settings.businessProfile.email || adminUser.email,
      phone: settings.businessProfile.phone || null,
      whatsapp: settings.businessProfile.whatsapp || settings.businessProfile.phone || null,
      address: settings.businessProfile.address || null,
      timezone: settings.businessProfile.timezone || 'UTC',
      currency: settings.businessProfile.currency || 'USD',
      business_type: businessType as BusinessType,
    };

    const { data: newBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert(businessData as any)
      .select()
      .single();

    if (businessError || !newBusiness) {
      return NextResponse.json(
        { error: businessError?.message || 'Failed to create business' },
        { status: 500 }
      );
    }

    const businessId = (newBusiness as any).id;

    try {
      // Migrate services
      const serviceIdMapping: Record<string, string> = {};
      if (services.length > 0) {
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

        const { data: createdServices, error: servicesError } = await supabase
          .from('services')
          .insert(servicesData as any)
          .select();

        if (servicesError || !createdServices) {
          throw new Error(`Failed to migrate services: ${servicesError?.message}`);
        }

        services.forEach((oldService, index) => {
          if (createdServices[index]) {
            serviceIdMapping[oldService.id] = (createdServices[index] as any).id;
          }
        });
      }

      // Migrate customers
      const customerIdMapping: Record<string, string> = {};
      if (customers.length > 0) {
        for (const customer of customers) {
          const customerData = {
            business_id: businessId,
            name: customer.name,
            phone: customer.phone.replace(/[\s\-\(\)]/g, ''),
            email: customer.email || null,
            notes: customer.notes || null,
            date_of_birth: customer.dateOfBirth || null,
            gender: customer.gender || null,
            consent_marketing: customer.consentMarketing || false,
            blocked: customer.blocked || false,
            last_visit: customer.lastVisit || null,
          };

          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert(customerData as any)
            .select()
            .single();

          if (customerError || !newCustomer) {
            throw new Error(`Failed to migrate customer ${customer.name}: ${customerError?.message}`);
          }

          const newCustomerId = (newCustomer as any).id;
          customerIdMapping[customer.id] = newCustomerId;

          // Migrate tags
          if (customer.tags && customer.tags.length > 0) {
            const tagsData = customer.tags.map((tag) => ({
              customer_id: newCustomerId,
              tag: tag,
            }));

            await supabase.from('customer_tags').insert(tagsData as any);
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

            await supabase.from('visits').insert(visitsData as any);
          }
        }
      }

      // Migrate workers
      const workerIdMapping: Record<string, string> = {};
      if (workers.length > 0) {
        for (const worker of workers) {
          const workerData = {
            business_id: businessId,
            name: worker.name,
            email: worker.email || null,
            phone: worker.phone || null,
            active: worker.active !== false,
            color: worker.color || '#3B82F6',
          };

          const { data: newWorker, error: workerError } = await supabase
            .from('workers')
            .insert(workerData as any)
            .select()
            .single();

          if (workerError || !newWorker) {
            throw new Error(`Failed to migrate worker ${worker.name}: ${workerError?.message}`);
          }

          const newWorkerId = (newWorker as any).id;
          workerIdMapping[worker.id] = newWorkerId;

          // Migrate worker-services relationships
          if (worker.services && worker.services.length > 0) {
            const newServiceIds = worker.services
              .map((oldServiceId) => serviceIdMapping[oldServiceId])
              .filter((id) => id !== undefined);

            if (newServiceIds.length > 0) {
              const workerServicesData = newServiceIds.map((serviceId) => ({
                worker_id: newWorkerId,
                service_id: serviceId,
              }));

              await supabase.from('worker_services').insert(workerServicesData as any);
            }
          }
        }
      }

      // Migrate appointments
      let appointmentsMigrated = 0;
      if (appointments.length > 0) {
        const validAppointments = appointments.filter((apt) => {
          return (
            customerIdMapping[apt.customerId || ''] &&
            serviceIdMapping[apt.serviceId || ''] &&
            workerIdMapping[apt.workerId || apt.staffId || '']
          );
        });

        if (validAppointments.length > 0) {
          const appointmentsData = validAppointments.map((apt) => ({
            business_id: businessId,
            customer_id: customerIdMapping[apt.customerId!],
            service_id: serviceIdMapping[apt.serviceId!],
            worker_id: workerIdMapping[apt.workerId || apt.staffId!],
            start: apt.start,
            end: apt.end,
            status: apt.status || 'pending',
          }));

          const { error: appointmentsError } = await supabase
            .from('appointments')
            .insert(appointmentsData as any);

          if (appointmentsError) {
            throw new Error(`Failed to migrate appointments: ${appointmentsError.message}`);
          }

          appointmentsMigrated = validAppointments.length;
        }
      }

      // Migrate templates
      let templatesMigrated = 0;
      if (templates.length > 0) {
        const templatesData = templates.map((template) => ({
          business_id: businessId,
          channel: template.channel,
          type: template.type,
          locale: template.locale,
          subject: template.subject || null,
          body: template.body,
        }));

        const { error: templatesError } = await supabase
          .from('templates')
          .insert(templatesData as any);

        if (templatesError) {
          throw new Error(`Failed to migrate templates: ${templatesError.message}`);
        }

        templatesMigrated = templates.length;
      }

      // Migrate settings
      const settingsData = {
        business_id: businessId,
        branding: settings.branding || {},
        locale: settings.locale || { language: 'en', rtl: false },
        notifications: settings.notifications || {},
        calendar: settings.calendar || {},
        registration: settings.registration || {},
      };

      const { error: settingsError } = await supabase
        .from('settings')
        .insert(settingsData as any);

      if (settingsError) {
        // Try to update if already exists
        const updateResult = await (supabase
          .from('settings') as any)
          .update(settingsData as any)
          .eq('business_id', businessId) as { error: any };
        const { error: updateError } = updateResult;

        if (updateError) {
          throw new Error(`Failed to migrate settings: ${updateError.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        businessId,
        businessSlug: slug,
        migrated: {
          services: services.length,
          customers: customers.length,
          workers: workers.length,
          appointments: appointmentsMigrated,
          templates: templatesMigrated,
        },
        message: 'Migration completed successfully',
      });
    } catch (error: any) {
      // Rollback: delete business
      await supabase.from('businesses').delete().eq('id', businessId);
      throw error;
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

