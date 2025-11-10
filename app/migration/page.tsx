'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ported/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { 
  getServices, 
  getCustomers, 
  getWorkers, 
  getAppointments, 
  getTemplates, 
  getSettings 
} from '@/components/ported/lib/mockData';

interface MigrationResult {
  success: boolean;
  businessId?: string;
  businessSlug?: string;
  migrated?: {
    services: number;
    customers: number;
    workers: number;
    appointments: number;
    templates: number;
  };
  error?: string;
}

export default function MigrationPage() {
  const [hasData, setHasData] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [businessType, setBusinessType] = useState<'barbershop' | 'nail_salon' | 'gym_trainer' | 'other'>('barbershop');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Check if localStorage has data
  useEffect(() => {
    const checkData = () => {
      const hasServices = !!localStorage.getItem('bookinghub-services');
      const hasCustomers = !!localStorage.getItem('bookinghub-customers');
      const hasWorkers = !!localStorage.getItem('bookinghub-workers');
      const hasAppointments = !!localStorage.getItem('bookinghub-appointments');
      const hasTemplates = !!localStorage.getItem('bookinghub-templates');
      const hasSettings = !!localStorage.getItem('bookinghub-settings');
      
      setHasData(hasServices || hasCustomers || hasWorkers || hasAppointments || hasTemplates || hasSettings);

      // Pre-fill admin info from settings if available
      if (hasSettings) {
        try {
          const settings = getSettings();
          if (settings.businessProfile?.email) {
            setAdminEmail(settings.businessProfile.email);
          }
          if (settings.businessProfile?.name) {
            setAdminName(settings.businessProfile.name + ' Admin');
          }
          if (settings.businessProfile?.phone) {
            setAdminPhone(settings.businessProfile.phone);
          }
        } catch (error) {
          console.error('Error reading settings:', error);
        }
      }
    };

    checkData();
  }, []);

  const handleMigration = async () => {
    if (!adminEmail || !adminName) {
      alert('Please fill in admin email and name');
      return;
    }

    setIsMigrating(true);
    setResult(null);

    try {
      // Read all data from localStorage
      const data = {
        settings: getSettings(),
        services: getServices(),
        customers: getCustomers(),
        workers: getWorkers(),
        appointments: getAppointments(),
        templates: getTemplates(),
      };

      // Call migration API
      const response = await fetch('/api/migration/localStorage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          adminUser: {
            email: adminEmail,
            name: adminName,
            phone: adminPhone || undefined,
          },
          data,
        }),
      });

      const result: MigrationResult = await response.json();

      if (result.success) {
        // Clear localStorage
        localStorage.removeItem('bookinghub-services');
        localStorage.removeItem('bookinghub-customers');
        localStorage.removeItem('bookinghub-workers');
        localStorage.removeItem('bookinghub-appointments');
        localStorage.removeItem('bookinghub-templates');
        localStorage.removeItem('bookinghub-settings');

        setHasData(false);
      }

      setResult(result);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Migration failed',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!hasData && !result) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Data Migration</CardTitle>
            <CardDescription>Migrate localStorage data to Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No localStorage data found. There's nothing to migrate.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Migrate localStorage to Supabase</CardTitle>
          <CardDescription>
            This will migrate all your localStorage data to the Supabase database.
            After successful migration, localStorage will be cleared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p className="font-semibold">✅ Migration Successful!</p>
                    {result.businessSlug && (
                      <p className="mt-2">
                        Your business is available at: <code>/b/{result.businessSlug}</code>
                      </p>
                    )}
                    {result.migrated && (
                      <ul className="mt-2 list-disc list-inside">
                        <li>Services: {result.migrated.services}</li>
                        <li>Customers: {result.migrated.customers}</li>
                        <li>Workers: {result.migrated.workers}</li>
                        <li>Appointments: {result.migrated.appointments}</li>
                        <li>Templates: {result.migrated.templates}</li>
                      </ul>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">❌ Migration Failed</p>
                    <p className="mt-2">{result.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                className="w-full p-2 border rounded"
                disabled={isMigrating}
              >
                <option value="barbershop">Barbershop</option>
                <option value="nail_salon">Nail Salon</option>
                <option value="gym_trainer">Gym Trainer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="admin@example.com"
                disabled={isMigrating}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Admin Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Admin User"
                disabled={isMigrating}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Admin Phone (Optional)</label>
              <input
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="+1234567890"
                disabled={isMigrating}
              />
            </div>

            <Button
              onClick={handleMigration}
              disabled={isMigrating || !adminEmail || !adminName}
              className="w-full"
            >
              {isMigrating ? 'Migrating...' : 'Start Migration'}
            </Button>
          </div>

          {result?.success && result.businessSlug && (
            <div className="mt-4 p-4 bg-green-50 rounded">
              <p className="text-sm">
                <strong>Next Steps:</strong>
              </p>
              <ul className="text-sm mt-2 list-disc list-inside space-y-1">
                <li>Visit <a href={`/b/${result.businessSlug}`} className="text-blue-600 underline">your booking page</a></li>
                <li>Go to admin panel to review migrated data</li>
                <li>Create admin user account if needed</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

