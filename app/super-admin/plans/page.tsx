"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ported/ui/button';
import { Checkbox } from '@/components/ported/ui/checkbox';
import { Label } from '@/components/ported/ui/label';
import { toast } from 'sonner';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ported/ui/input';

interface PlanFeature {
  id: string;
  plan_id: string;
  feature_name: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  features: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
  planFeatures?: PlanFeature[];
}

// Feature definitions with human-readable names and descriptions
const FEATURE_DEFINITIONS: Record<string, { label: string; description: string; category: string }> = {
  create_appointments: {
    label: 'Create Appointments',
    description: 'Allow businesses to create and manage appointments',
    category: 'Core'
  },
  manage_customers: {
    label: 'Manage Customers',
    description: 'Add, edit, and manage customer information',
    category: 'Core'
  },
  manage_workers: {
    label: 'Manage Workers',
    description: 'Add, edit, and manage staff/workers',
    category: 'Core'
  },
  manage_services: {
    label: 'Manage Services',
    description: 'Create and manage service offerings',
    category: 'Core'
  },
  view_analytics: {
    label: 'View Analytics',
    description: 'Access to analytics dashboard and reports',
    category: 'Analytics'
  },
  custom_branding: {
    label: 'Custom Branding',
    description: 'Customize booking page with logo and colors',
    category: 'Branding'
  },
  whatsapp_integration: {
    label: 'WhatsApp Integration',
    description: 'Send notifications via WhatsApp',
    category: 'Communication'
  },
  multi_language: {
    label: 'Multi-Language',
    description: 'Support for multiple languages',
    category: 'Localization'
  },
  cloud_storage: {
    label: 'Cloud Storage',
    description: 'Store files and documents in the cloud',
    category: 'Storage'
  },
  priority_support: {
    label: 'Priority Support',
    description: 'Priority customer support access',
    category: 'Support'
  },
  advanced_reports: {
    label: 'Advanced Reports',
    description: 'Access to advanced reporting features',
    category: 'Analytics'
  },
  group_appointments: {
    label: 'Group Appointments',
    description: 'Allow creating group services with multiple participants',
    category: 'Services'
  },
  custom_templates: {
    label: 'Custom Templates',
    description: 'Allow creating custom message templates',
    category: 'Communication'
  },
  qr_codes: {
    label: 'QR Codes',
    description: 'Access to QR code generation for booking pages',
    category: 'Marketing'
  },
};

// Get all unique features from definitions
const ALL_FEATURES = Object.keys(FEATURE_DEFINITIONS);

// Group features by category
const FEATURES_BY_CATEGORY = ALL_FEATURES.reduce((acc, featureName) => {
  const category = FEATURE_DEFINITIONS[featureName].category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(featureName);
  return acc;
}, {} as Record<string, string[]>);

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
  const [savingLimits, setSavingLimits] = useState<Record<string, boolean>>({});
  const [featureStates, setFeatureStates] = useState<Record<string, Record<string, boolean>>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [limitEdits, setLimitEdits] = useState<Record<string, { max_staff: string; max_services: string; max_bookings_per_month: string }>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/plans');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans');
      }

      if (data.success) {
        setPlans(data.plans || []);
        
        // Initialize feature states
        const states: Record<string, Record<string, boolean>> = {};
        const prices: Record<string, string> = {};
        const limits: Record<string, { max_staff: string; max_services: string; max_bookings_per_month: string }> = {};
        (data.plans || []).forEach((plan: Plan) => {
          states[plan.id] = {};
          prices[plan.id] = plan.price.toString();
          
          // Initialize limits from features JSONB
          const features = plan.features || {};
          limits[plan.id] = {
            max_staff: features.max_staff?.toString() || '1',
            max_services: features.max_services?.toString() || '-1',
            max_bookings_per_month: features.max_bookings_per_month?.toString() || '-1',
          };
          
          (plan.planFeatures || []).forEach((feature: PlanFeature) => {
            states[plan.id][feature.feature_name] = feature.enabled;
          });
          // Initialize missing features as false
          ALL_FEATURES.forEach(featureName => {
            if (!(featureName in states[plan.id])) {
              states[plan.id][featureName] = false;
            }
          });
        });
        setFeatureStates(states);
        setPriceEdits(prices);
        setLimitEdits(limits);
      }
    } catch (error: any) {
      console.error('Error loading plans:', error);
      toast.error(error.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (planId: string, featureName: string, enabled: boolean) => {
    setFeatureStates(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [featureName]: enabled,
      },
    }));
  };

  const savePlanFeatures = async (planId: string) => {
    try {
      setSaving(prev => ({ ...prev, [planId]: true }));

      const features = Object.entries(featureStates[planId] || {}).map(([feature_name, enabled]) => ({
        feature_name,
        enabled,
      }));

      const response = await fetch(`/api/super-admin/plans/${planId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save features');
      }

      if (data.success) {
        toast.success('Features saved successfully');
        // Reload plans to get updated data
        await loadPlans();
      }
    } catch (error: any) {
      console.error('Error saving features:', error);
      toast.error(error.message || 'Failed to save features');
    } finally {
      setSaving(prev => ({ ...prev, [planId]: false }));
    }
  };

  const savePlanPrice = async (planId: string) => {
    try {
      setSavingPrice(prev => ({ ...prev, [planId]: true }));

      const price = parseFloat(priceEdits[planId] || '0');
      if (isNaN(price) || price < 0) {
        toast.error('Please enter a valid price');
        return;
      }

      const response = await fetch(`/api/super-admin/plans/${planId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save price');
      }

      if (data.success) {
        toast.success('Price updated successfully');
        // Reload plans to get updated data
        await loadPlans();
      }
    } catch (error: any) {
      console.error('Error saving price:', error);
      toast.error(error.message || 'Failed to save price');
    } finally {
      setSavingPrice(prev => ({ ...prev, [planId]: false }));
    }
  };

  const savePlanLimits = async (planId: string) => {
    try {
      setSavingLimits(prev => ({ ...prev, [planId]: true }));

      const limits = limitEdits[planId];
      if (!limits) {
        toast.error('No limits to save');
        return;
      }

      const max_staff = limits.max_staff === '' ? -1 : parseInt(limits.max_staff);
      const max_services = limits.max_services === '' ? -1 : parseInt(limits.max_services);
      const max_bookings_per_month = limits.max_bookings_per_month === '' ? -1 : parseInt(limits.max_bookings_per_month);

      if (isNaN(max_staff) || max_staff < -1) {
        toast.error('Max Staff must be a number >= -1 (-1 = unlimited)');
        return;
      }
      if (isNaN(max_services) || max_services < -1) {
        toast.error('Max Services must be a number >= -1 (-1 = unlimited)');
        return;
      }
      if (isNaN(max_bookings_per_month) || max_bookings_per_month < -1) {
        toast.error('Max Bookings must be a number >= -1 (-1 = unlimited)');
        return;
      }

      const response = await fetch(`/api/super-admin/plans/${planId}/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_staff,
          max_services,
          max_bookings_per_month,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save limits');
      }

      if (data.success) {
        toast.success('Limits updated successfully');
        // Reload plans to get updated data
        await loadPlans();
      }
    } catch (error: any) {
      console.error('Error saving limits:', error);
      toast.error(error.message || 'Failed to save limits');
    } finally {
      setSavingLimits(prev => ({ ...prev, [planId]: false }));
    }
  };

  const getPlanDisplayName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `₪${price}/month`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading plans...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plan Features Management</h1>
        <Button onClick={loadPlans} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{getPlanDisplayName(plan.name)}</h2>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Price (ILS):</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceEdits[plan.id] || plan.price.toString()}
                  onChange={(e) => setPriceEdits(prev => ({ ...prev, [plan.id]: e.target.value }))}
                  className="w-24 h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => savePlanPrice(plan.id)}
                  disabled={savingPrice[plan.id]}
                >
                  {savingPrice[plan.id] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
                <span className="text-lg font-semibold text-primary ml-auto">
                  {formatPrice(plan.price)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Plan ID: {plan.id.substring(0, 8)}...
              </p>
            </div>

            {/* Plan Limits Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Plan Limits
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor={`${plan.id}-max_staff`} className="text-xs text-gray-600">
                    Max Staff (-1 = unlimited)
                  </Label>
                  <Input
                    id={`${plan.id}-max_staff`}
                    type="number"
                    min="-1"
                    value={limitEdits[plan.id]?.max_staff || ''}
                    onChange={(e) => setLimitEdits(prev => ({
                      ...prev,
                      [plan.id]: {
                        ...prev[plan.id],
                        max_staff: e.target.value,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`${plan.id}-max_services`} className="text-xs text-gray-600">
                    Max Services (-1 = unlimited)
                  </Label>
                  <Input
                    id={`${plan.id}-max_services`}
                    type="number"
                    min="-1"
                    value={limitEdits[plan.id]?.max_services || ''}
                    onChange={(e) => setLimitEdits(prev => ({
                      ...prev,
                      [plan.id]: {
                        ...prev[plan.id],
                        max_services: e.target.value,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`${plan.id}-max_bookings`} className="text-xs text-gray-600">
                    Max Bookings/Month (-1 = unlimited)
                  </Label>
                  <Input
                    id={`${plan.id}-max_bookings`}
                    type="number"
                    min="-1"
                    value={limitEdits[plan.id]?.max_bookings_per_month || ''}
                    onChange={(e) => setLimitEdits(prev => ({
                      ...prev,
                      [plan.id]: {
                        ...prev[plan.id],
                        max_bookings_per_month: e.target.value,
                      }
                    }))}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => savePlanLimits(plan.id)}
                  disabled={savingLimits[plan.id]}
                  className="w-full"
                >
                  {savingLimits[plan.id] ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-2" />
                      Save Limits
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {Object.entries(FEATURES_BY_CATEGORY).map(([category, features]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {features.map((featureName) => {
                      const featureDef = FEATURE_DEFINITIONS[featureName];
                      const isEnabled = featureStates[plan.id]?.[featureName] || false;
                      
                      return (
                        <div key={featureName} className="flex items-start gap-3">
                          <Checkbox
                            id={`${plan.id}-${featureName}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              handleFeatureToggle(plan.id, featureName, checked === true)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`${plan.id}-${featureName}`}
                              className="font-medium cursor-pointer"
                            >
                              {featureDef.label}
                            </Label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {featureDef.description}
                            </p>
                          </div>
                          {isEnabled && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => savePlanFeatures(plan.id)}
              disabled={saving[plan.id]}
              className="w-full"
            >
              {saving[plan.id] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-3 text-lg">Feature Hierarchy Guide</h3>
        <p className="text-sm text-gray-700 mb-4">
          Features are organized by category. Each plan builds upon the previous one:
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-primary mb-2">Basic Plan</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Core Features</li>
              <li>• Create & Manage Appointments</li>
              <li>• Customer Management</li>
              <li>• Worker Management</li>
              <li>• Service Management</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-primary mb-2">Professional Plan</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Everything in Basic</li>
              <li>• Analytics & Reports</li>
              <li>• Custom Branding</li>
              <li>• WhatsApp Integration</li>
              <li>• Multi-Language Support</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-primary mb-2">Business Plan</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Everything in Professional</li>
              <li>• Cloud Storage</li>
              <li>• Priority Support</li>
              <li>• Advanced Reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

