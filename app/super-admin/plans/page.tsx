"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader2, CheckCircle2, Plus, X, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';

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

// Mapping from homepage highlights to feature names
const HIGHLIGHT_TO_FEATURE: Record<string, string> = {
  'Smart calendar': 'create_appointments',
  'Customer management': 'manage_customers',
  'Email reminders': 'manage_templates',
  'Bilingual & RTL support': 'multi_language',
  'Analytics dashboard': 'view_analytics',
  'WhatsApp integration': 'whatsapp_integration',
  'Google Calendar integration': 'google_calendar_sync',
  'Custom branding': 'custom_branding',
  'Advanced reminders': 'custom_templates',
  'Priority support': 'priority_support',
  'API Access': 'api_access',
  'White-label solution': 'white_label',
  'Custom integrations': 'custom_integrations',
  'Advanced reporting': 'advanced_reports',
  'Multi-location support': 'multi_location',
  'Custom workflows': 'custom_workflows',
  'Dedicated support': 'dedicated_support',
  'Custom development': 'custom_development',
};

// Feature definitions
const FEATURE_DEFINITIONS: Record<string, { label: string; description: string; category: string }> = {
  create_appointments: { label: 'Smart Calendar', description: 'Create and manage appointments', category: 'Core Features' },
  manage_customers: { label: 'Customer Management', description: 'Add, edit, and manage customer information', category: 'Core Features' },
  manage_workers: { label: 'Staff Management', description: 'Add, edit, and manage staff/workers', category: 'Core Features' },
  manage_services: { label: 'Service Management', description: 'Create and manage service offerings', category: 'Core Features' },
  manage_templates: { label: 'Email Reminders', description: 'Send automated email confirmations and reminders', category: 'Core Features' },
  multi_language: { label: 'Bilingual & RTL Support', description: 'Full support for Hebrew, English, Arabic, and Russian', category: 'Core Features' },
  whatsapp_integration: { label: 'WhatsApp Integration', description: 'Send appointment confirmations via WhatsApp', category: 'Integrations' },
  google_calendar_sync: { label: 'Google Calendar Integration', description: 'Sync your appointments with Google Calendar', category: 'Integrations' },
  custom_branding: { label: 'Custom Branding', description: 'Add your logo and brand colors', category: 'Branding & Customization' },
  view_analytics: { label: 'Analytics Dashboard', description: 'Track revenue, booking trends, and customer insights', category: 'Analytics & Reporting' },
  advanced_reports: { label: 'Advanced Reporting', description: 'Custom reports tailored to your business needs', category: 'Analytics & Reporting' },
  priority_support: { label: 'Priority Support', description: 'Get faster response times and dedicated support', category: 'Support & Services' },
  dedicated_support: { label: 'Dedicated Support', description: 'Personal account manager and 24/7 priority support', category: 'Support & Services' },
  api_access: { label: 'API Access', description: 'Full REST API access to integrate KalBook', category: 'Advanced Features' },
  white_label: { label: 'White-Label Solution', description: 'Completely remove our branding and use your own', category: 'Advanced Features' },
  custom_integrations: { label: 'Custom Integrations', description: 'Connect KalBook to your CRM, ERP, and other tools', category: 'Advanced Features' },
  multi_location: { label: 'Multi-Location Support', description: 'Manage multiple branches or locations', category: 'Advanced Features' },
  custom_workflows: { label: 'Custom Workflows', description: 'Automate your unique business processes', category: 'Advanced Features' },
  custom_development: { label: 'Custom Development', description: 'We build unique features specifically for your business', category: 'Advanced Features' },
  group_appointments: { label: 'Group Appointments', description: 'Allow creating group services', category: 'Additional Features' },
  custom_templates: { label: 'Advanced Reminders', description: 'Customizable reminder timing', category: 'Additional Features' },
  qr_codes: { label: 'QR Codes', description: 'Access to QR code generation', category: 'Additional Features' },
  cloud_storage: { label: 'Cloud Storage', description: 'Store files and documents in the cloud', category: 'Additional Features' },
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
  const [savingLimits, setSavingLimits] = useState<Record<string, boolean>>({});
  const [savingMetadata, setSavingMetadata] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState<Record<string, boolean>>({});
  const [featureStates, setFeatureStates] = useState<Record<string, Record<string, boolean>>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [limitEdits, setLimitEdits] = useState<Record<string, { max_staff: string; max_services: string; max_bookings_per_month: string }>>({});
  
  // Plan metadata edits - highlights per language
  const [planMetadata, setPlanMetadata] = useState<Record<string, {
    name: string;
    priceNote: string;
    cta: string;
    note: string;
    highlights_en: string[];
    highlights_he: string[];
    highlights_ar: string[];
    highlights_ru: string[];
  }>>({});
  
  // Current language for highlights editing
  const [currentHighlightLang, setCurrentHighlightLang] = useState<string>('en');

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
        
        // Initialize all states
        const states: Record<string, Record<string, boolean>> = {};
        const prices: Record<string, string> = {};
        const limits: Record<string, { max_staff: string; max_services: string; max_bookings_per_month: string }> = {};
        const metadata: Record<string, { name: string; priceNote: string; cta: string; note: string; highlights_en: string[]; highlights_he: string[]; highlights_ar: string[]; highlights_ru: string[] }> = {};
        
        // Map database plan names to translation keys (handle all possible names)
        const planKeyMap: Record<string, string> = {
          'basic': 'free',
          'professional': 'pro',
          'business': 'custom',
          'Free': 'free',
          'Pro': 'pro',
          'Custom': 'custom',
          'free': 'free',
          'pro': 'pro',
          'custom': 'custom',
        };
        
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
          
          // Initialize metadata from features JSONB
          // Map database plan names to homepage names if not already set
          let displayName = features.name || plan.name || '';
          if (!features.name) {
            // Map old database names to homepage names
            if (plan.name === 'basic') displayName = 'Free';
            else if (plan.name === 'professional') displayName = 'Pro';
            else if (plan.name === 'business') displayName = 'Custom';
          }
          
          // Get translation key for this plan
          const planNameLower = plan.name.toLowerCase();
          let translationKey = planKeyMap[plan.name] || planKeyMap[planNameLower];
          
          // If still not found, try to infer from name
          if (!translationKey) {
            if (planNameLower.includes('free') || planNameLower.includes('basic')) {
              translationKey = 'free';
            } else if (planNameLower.includes('pro') || planNameLower.includes('professional')) {
              translationKey = 'pro';
            } else if (planNameLower.includes('custom') || planNameLower.includes('business')) {
              translationKey = 'custom';
            } else {
              translationKey = planNameLower;
            }
          }
          
          // Get highlights from database or fallback to translation files
          const getHighlights = (lang: 'en' | 'he' | 'ar' | 'ru'): string[] => {
            const dbKey = `highlights_${lang}` as keyof typeof features;
            const dbHighlights = features[dbKey];
            
            // Use database highlights if they exist and have content
            if (dbHighlights && Array.isArray(dbHighlights) && dbHighlights.length > 0) {
              return dbHighlights as string[];
            }
            
            // Fallback to translation files
            const translations: Record<string, any> = { en, he, ar, ru };
            const trans = translations[lang];
            const highlights = trans?.home?.pricing?.plans?.[translationKey]?.highlights;
            return Array.isArray(highlights) ? highlights : [];
          };
          
          metadata[plan.id] = {
            name: displayName,
            priceNote: features.priceNote || '',
            cta: features.cta || '',
            note: features.note || '',
            highlights_en: getHighlights('en'),
            highlights_he: getHighlights('he'),
            highlights_ar: getHighlights('ar'),
            highlights_ru: getHighlights('ru'),
          };
          
          // Initialize feature states
          (plan.planFeatures || []).forEach((feature: PlanFeature) => {
            states[plan.id][feature.feature_name] = feature.enabled;
          });
        });
        
        setFeatureStates(states);
        setPriceEdits(prices);
        setLimitEdits(limits);
        setPlanMetadata(metadata);
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
        
        // Clear pricing cache for all locales so homepage shows new prices
        const locales = ['en', 'he', 'ar', 'ru'];
        locales.forEach(locale => {
          try {
            localStorage.removeItem(`pricing_cache_${locale}`);
          } catch (e) {
            // Ignore errors
          }
        });
        
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
        await loadPlans();
      }
    } catch (error: any) {
      console.error('Error saving limits:', error);
      toast.error(error.message || 'Failed to save limits');
    } finally {
      setSavingLimits(prev => ({ ...prev, [planId]: false }));
    }
  };

  const savePlanMetadata = async (planId: string) => {
    try {
      setSavingMetadata(prev => ({ ...prev, [planId]: true }));

      const metadata = planMetadata[planId];
      if (!metadata) {
        toast.error('No metadata to save');
        return;
      }

      const response = await fetch(`/api/super-admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metadata.name,
          priceNote: metadata.priceNote,
          cta: metadata.cta,
          note: metadata.note,
          highlights_en: metadata.highlights_en,
          highlights_he: metadata.highlights_he,
          highlights_ar: metadata.highlights_ar,
          highlights_ru: metadata.highlights_ru,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save plan metadata');
      }

      if (data.success) {
        toast.success('Plan metadata saved successfully');
        
        // Clear pricing cache for all locales so homepage shows updated metadata
        const locales = ['en', 'he', 'ar', 'ru'];
        locales.forEach(locale => {
          try {
            localStorage.removeItem(`pricing_cache_${locale}`);
          } catch (e) {
            // Ignore errors
          }
        });
        
        await loadPlans();
      }
    } catch (error: any) {
      console.error('Error saving plan metadata:', error);
      toast.error(error.message || 'Failed to save plan metadata');
    } finally {
      setSavingMetadata(prev => ({ ...prev, [planId]: false }));
    }
  };

  // Unified save function that saves everything
  const saveAllPlanData = async (planId: string) => {
    try {
      setSavingAll(prev => ({ ...prev, [planId]: true }));
      const errors: string[] = [];

      // Save price if it was edited
      if (priceEdits[planId] !== undefined && priceEdits[planId] !== plans.find(p => p.id === planId)?.price.toString()) {
        try {
          const price = parseFloat(priceEdits[planId] || '0');
          if (!isNaN(price) && price >= 0) {
            const response = await fetch(`/api/super-admin/plans/${planId}/price`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price }),
            });
            const data = await response.json();
            if (!response.ok) {
              errors.push(`Price: ${data.error || 'Failed to save'}`);
            }
          }
        } catch (error: any) {
          errors.push(`Price: ${error.message}`);
        }
      }

      // Save metadata with per-language highlights
      if (planMetadata[planId]) {
        try {
          const response = await fetch(`/api/super-admin/plans/${planId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: planMetadata[planId].name,
              priceNote: planMetadata[planId].priceNote,
              cta: planMetadata[planId].cta,
              note: planMetadata[planId].note,
              highlights_en: planMetadata[planId].highlights_en,
              highlights_he: planMetadata[planId].highlights_he,
              highlights_ar: planMetadata[planId].highlights_ar,
              highlights_ru: planMetadata[planId].highlights_ru,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            errors.push(`Metadata: ${data.error || 'Failed to save'}`);
          }
        } catch (error: any) {
          errors.push(`Metadata: ${error.message}`);
        }
      }

      // Save limits if they were edited
      if (limitEdits[planId]) {
        try {
          const limits = limitEdits[planId];
          const max_staff = limits.max_staff === '' ? -1 : parseInt(limits.max_staff);
          const max_services = limits.max_services === '' ? -1 : parseInt(limits.max_services);
          const max_bookings_per_month = limits.max_bookings_per_month === '' ? -1 : parseInt(limits.max_bookings_per_month);

          if (!isNaN(max_staff) && max_staff >= -1 && !isNaN(max_services) && max_services >= -1 && !isNaN(max_bookings_per_month) && max_bookings_per_month >= -1) {
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
              errors.push(`Limits: ${data.error || 'Failed to save'}`);
            }
          }
        } catch (error: any) {
          errors.push(`Limits: ${error.message}`);
        }
      }

      // Save features if they were changed
      if (featureStates[planId] && Object.keys(featureStates[planId]).length > 0) {
        try {
          const features = Object.entries(featureStates[planId]).map(([feature_name, enabled]) => ({
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
            errors.push(`Features: ${data.error || 'Failed to save'}`);
          }
        } catch (error: any) {
          errors.push(`Features: ${error.message}`);
        }
      }

      // Clear cache and reload if any save succeeded
      if (errors.length === 0 || errors.length < 4) {
        const locales = ['en', 'he', 'ar', 'ru'];
        locales.forEach(locale => {
          try {
            localStorage.removeItem(`pricing_cache_${locale}`);
          } catch (e) {
            // Ignore errors
          }
        });
        await loadPlans();
      }

      if (errors.length > 0) {
        toast.error(`Some saves failed: ${errors.join(', ')}`);
      } else {
        toast.success('All plan data saved successfully');
      }
    } catch (error: any) {
      console.error('Error saving plan data:', error);
      toast.error(error.message || 'Failed to save plan data');
    } finally {
      setSavingAll(prev => ({ ...prev, [planId]: false }));
    }
  };

  const addHighlight = (planId: string, lang: string) => {
    const langKey = `highlights_${lang}` as 'highlights_en' | 'highlights_he' | 'highlights_ar' | 'highlights_ru';
    setPlanMetadata(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [langKey]: [...((prev[planId]?.[langKey] as string[]) || []), ''],
      },
    }));
  };

  const removeHighlight = (planId: string, index: number, lang: string) => {
    const langKey = `highlights_${lang}` as 'highlights_en' | 'highlights_he' | 'highlights_ar' | 'highlights_ru';
    setPlanMetadata(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [langKey]: ((prev[planId]?.[langKey] as string[]) || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateHighlight = (planId: string, index: number, value: string, lang: string) => {
    const langKey = `highlights_${lang}` as 'highlights_en' | 'highlights_he' | 'highlights_ar' | 'highlights_ru';
    setPlanMetadata(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [langKey]: ((prev[planId]?.[langKey] as string[]) || []).map((h, i) => i === index ? value : h),
      },
    }));
  };

  const moveHighlight = (planId: string, fromIndex: number, toIndex: number, lang: string) => {
    const langKey = `highlights_${lang}` as 'highlights_en' | 'highlights_he' | 'highlights_ar' | 'highlights_ru';
    setPlanMetadata(prev => {
      const highlights = [...((prev[planId]?.[langKey] as string[]) || [])];
      const [moved] = highlights.splice(fromIndex, 1);
      highlights.splice(toIndex, 0, moved);
      return {
        ...prev,
        [planId]: {
          ...prev[planId],
          [langKey]: highlights,
        },
      };
    });
  };

  const formatPrice = (price: number) => {
    // When price is 0, display as "Free" (matches homepage behavior)
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
        <h1 className="text-2xl font-bold">Plan Management - Match Homepage</h1>
        <Button onClick={loadPlans} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const metadata = planMetadata[plan.id] || { 
            name: '', 
            priceNote: '', 
            cta: '', 
            note: '', 
            highlights_en: [], 
            highlights_he: [], 
            highlights_ar: [], 
            highlights_ru: [] 
          };
          
          return (
          <Card key={plan.id} className="p-6">
              {/* Plan Name & Basic Info */}
            <div className="mb-6">
                <div className="mb-4">
                  <Label htmlFor={`${plan.id}-name`} className="text-sm font-semibold">
                    Plan Name (as shown on homepage)
                  </Label>
                  <Input
                    id={`${plan.id}-name`}
                    value={metadata.name}
                    onChange={(e) => setPlanMetadata(prev => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], name: e.target.value },
                    }))}
                    placeholder="Free, Pro, or Custom"
                    className="mt-1"
                  />
              </div>

                <div className="mb-4">
                  <Label htmlFor={`${plan.id}-price`} className="text-xs text-gray-600">
                    Price (ILS)
                  </Label>
                <Input
                    id={`${plan.id}-price`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceEdits[plan.id] || plan.price.toString()}
                  onChange={(e) => setPriceEdits(prev => ({ ...prev, [plan.id]: e.target.value }))}
                    className="h-8 text-sm mt-1"
                  />
                  <span className="text-lg font-semibold text-primary mt-2 block">
                  {formatPrice(plan.price)}
                </span>
                </div>

                <div className="mb-4">
                  <Label htmlFor={`${plan.id}-priceNote`} className="text-xs text-gray-600">
                    Price Note (e.g., "Perfect for getting started", "per month")
                  </Label>
                  <Input
                    id={`${plan.id}-priceNote`}
                    value={metadata.priceNote}
                    onChange={(e) => setPlanMetadata(prev => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], priceNote: e.target.value },
                    }))}
                    placeholder="Price note"
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor={`${plan.id}-cta`} className="text-xs text-gray-600">
                    CTA Button Text (e.g., "Start Free", "Start Pro", "Contact Us")
                  </Label>
                  <Input
                    id={`${plan.id}-cta`}
                    value={metadata.cta}
                    onChange={(e) => setPlanMetadata(prev => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], cta: e.target.value },
                    }))}
                    placeholder="Button text"
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor={`${plan.id}-note`} className="text-xs text-gray-600">
                    Description/Note (text below price)
                  </Label>
                  <Textarea
                    id={`${plan.id}-note`}
                    value={metadata.note}
                    onChange={(e) => setPlanMetadata(prev => ({
                      ...prev,
                      [plan.id]: { ...prev[plan.id], note: e.target.value },
                    }))}
                    placeholder="Plan description"
                    className="text-sm mt-1 min-h-[60px]"
                  />
                </div>

              </div>

              {/* Highlights Section - Multi-language */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Highlights (as shown on homepage)
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addHighlight(plan.id, currentHighlightLang)}
                    className="h-6 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {/* Language Tabs */}
                <div className="flex gap-2 mb-3 border-b border-blue-200">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'he', label: 'עברית' },
                    { code: 'ar', label: 'العربية' },
                    { code: 'ru', label: 'Русский' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setCurrentHighlightLang(lang.code)}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        currentHighlightLang === lang.code
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-2">
                  {((metadata[`highlights_${currentHighlightLang}` as keyof typeof metadata] as string[]) || []).map((highlight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <Input
                        value={highlight}
                        onChange={(e) => updateHighlight(plan.id, index, e.target.value, currentHighlightLang)}
                        placeholder={`e.g., ${currentHighlightLang === 'en' ? "'1 staff member', 'Smart calendar'" : currentHighlightLang === 'he' ? "'עובד אחד', 'יומן חכם'" : currentHighlightLang === 'ar' ? "'موظف واحد', 'تقويم ذكي'" : "'1 сотрудник', 'Умный календарь'"}`}
                        className="h-8 text-sm flex-1"
                        dir={currentHighlightLang === 'he' || currentHighlightLang === 'ar' ? 'rtl' : 'ltr'}
                      />
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveHighlight(plan.id, index, index - 1, currentHighlightLang)}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                      )}
                      {index < ((metadata[`highlights_${currentHighlightLang}` as keyof typeof metadata] as string[]) || []).length - 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveHighlight(plan.id, index, index + 1, currentHighlightLang)}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeHighlight(plan.id, index, currentHighlightLang)}
                        className="h-8 w-8 p-0 text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {((metadata[`highlights_${currentHighlightLang}` as keyof typeof metadata] as string[]) || []).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No highlights yet. Click "Add" to add one.</p>
                  )}
                </div>
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
                      className="h-8 text-sm mt-1"
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
                      className="h-8 text-sm mt-1"
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
                      className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
            </div>

              {/* Feature Toggles - Collapsed by default, can expand */}
              <details className="mb-6">
                <summary className="text-sm font-semibold text-gray-700 mb-3 cursor-pointer uppercase tracking-wide">
                  Feature Toggles (Click to expand)
                </summary>
                <div className="space-y-4 mt-4">
                  {Object.entries(
                    Object.keys(FEATURE_DEFINITIONS).reduce((acc, featureName) => {
                      const category = FEATURE_DEFINITIONS[featureName].category;
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(featureName);
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([category, features]) => (
                <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">{category}</h4>
                      <div className="space-y-2">
                    {features.map((featureName) => {
                      const featureDef = FEATURE_DEFINITIONS[featureName];
                      const isEnabled = featureStates[plan.id]?.[featureName] || false;
                      
                      return (
                            <div key={featureName} className="flex items-start gap-2">
                          <Checkbox
                            id={`${plan.id}-${featureName}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              handleFeatureToggle(plan.id, featureName, checked === true)
                            }
                            className="mt-1"
                          />
                            <Label
                              htmlFor={`${plan.id}-${featureName}`}
                                className="text-xs cursor-pointer flex-1"
                            >
                              {featureDef.label}
                            </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
              </details>

              <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
                  onClick={() => saveAllPlanData(plan.id)}
                  disabled={savingAll[plan.id]}
              className="w-full"
                  size="default"
                  variant="default"
            >
                  {savingAll[plan.id] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving All Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                      Save All Changes
                </>
              )}
            </Button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                Plan ID: {plan.id.substring(0, 8)}...
              </p>
          </Card>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-3 text-lg">How This Works</h3>
        <p className="text-sm text-gray-700 mb-4">
          This page allows you to edit all fields that appear on the homepage pricing section. Changes made here should be reflected on the homepage.
        </p>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li><strong>Plan Name:</strong> Should match homepage exactly (Free, Pro, Custom)</li>
          <li><strong>Price:</strong> Number for Free/Pro, or "custom" for Custom plan</li>
          <li><strong>Highlights:</strong> Array of strings exactly as shown on homepage</li>
          <li><strong>Limits:</strong> Control max_staff, max_services, max_bookings_per_month</li>
          <li><strong>Features:</strong> Toggle individual features on/off per plan</li>
            </ul>
      </div>
    </div>
  );
}
