"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
  currentPlanName?: string;
  ownerEmail?: string;
}

interface TrialStatus {
  success: boolean;
  planName: string;
  subscriptionStatus: string;
  ownerEmail?: string | null;
}

interface PlanWithFeatures {
  id: string;
  name: string;
  price: number;
  planFeatures: Array<{
    id: string;
    plan_id: string;
    feature_name: string;
    enabled: boolean;
  }>;
}

// Feature definitions with human-readable names
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
  manage_templates: {
    label: 'Manage Templates',
    description: 'Create and manage email/SMS templates',
    category: 'Communication'
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

export function UpgradeModal({ open, onOpenChange, businessId, currentPlanName, ownerEmail }: UpgradeModalProps) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<string>('');
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [formData, setFormData] = useState({
    desiredPlan: '',
    contactEmail: '',
    message: '',
  });

  // Fetch plans with features when plan details modal opens
  useEffect(() => {
    if (showPlanDetails) {
      setLoadingPlans(true);
      fetch('/api/user/plans')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.plans) {
            setPlans(data.plans);
          }
        })
        .catch(err => {
          console.error('Error fetching plans:', err);
        })
        .finally(() => {
          setLoadingPlans(false);
        });
    }
  }, [showPlanDetails]);

  useEffect(() => {
    if (open) {
      // If businessId is provided (user dashboard context), use currentPlanName directly
      if (businessId && currentPlanName) {
        // If ownerEmail is not provided, fetch it from API
        if (!ownerEmail) {
          fetch(`/api/admin/trial-status?businessId=${businessId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.ownerEmail) {
                setFormData(prev => ({
                  ...prev,
                  contactEmail: data.ownerEmail,
                }));
              }
            })
            .catch(err => console.error('Error fetching owner email:', err));
        }
        
        setTrialStatus({
          success: true,
          planName: currentPlanName,
          subscriptionStatus: 'active',
          ownerEmail: ownerEmail || null,
        });
        setFormData(prev => ({
          ...prev,
          contactEmail: ownerEmail || '',
        }));
      } else {
        // Otherwise, fetch current trial status (admin dashboard context)
        fetch('/api/admin/trial-status')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setTrialStatus(data);
              setFormData(prev => ({
                ...prev,
                contactEmail: data.ownerEmail || '', // Pre-fill with owner's email
              }));
            }
          })
          .catch(err => console.error('Error fetching trial status:', err));
      }
    }
  }, [open, businessId, currentPlanName, ownerEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.desiredPlan || formData.desiredPlan === 'none' || formData.desiredPlan.trim() === '') {
      toast.error(t('trial.upgradeModal.desiredPlanRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/upgrade/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(businessId && { businessId }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('trial.upgradeModal.error'));
      }

      toast.success(data.message || t('trial.upgradeModal.success'));
      onOpenChange(false);
      setFormData({ desiredPlan: '', contactEmail: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting upgrade request:', error);
      toast.error(error.message || t('trial.upgradeModal.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('trial.upgradeModal.title')}</DialogTitle>
          <DialogDescription>
            {t('trial.upgradeModal.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPlan">{t('trial.upgradeModal.currentPlan')}</Label>
            <Input
              id="currentPlan"
              value={trialStatus?.planName 
                ? trialStatus.planName.charAt(0).toUpperCase() + trialStatus.planName.slice(1)
                : t('common.loading')}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desiredPlan">{t('trial.upgradeModal.desiredPlan')} *</Label>
              <button
                type="button"
                className="h-auto p-0 text-sm text-primary hover:underline hover:bg-transparent hover:!bg-transparent bg-transparent hover:!text-primary"
                onClick={() => {
                  if (formData.desiredPlan && formData.desiredPlan !== 'none') {
                    setSelectedPlanForDetails(formData.desiredPlan);
                    setShowPlanDetails(true);
                  } else {
                    toast.error(t('trial.upgradeModal.selectPlanFirst') || 'Please select a plan first');
                  }
                }}
              >
                {t('trial.upgradeModal.viewPlanDetails') || 'View Plan Details'}
              </button>
            </div>
            <Select
              value={formData.desiredPlan || 'none'}
              onValueChange={(value) => setFormData({ ...formData, desiredPlan: value === 'none' ? '' : value })}
            >
              <SelectTrigger id="desiredPlan">
                <SelectValue placeholder={t('trial.upgradeModal.selectPlan') || 'Select a plan'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('trial.upgradeModal.noPlan') || '-- Choose --'}</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">{t('trial.upgradeModal.contactEmail')}</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="your@email.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t('trial.upgradeModal.contactEmailHelper')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('trial.upgradeModal.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('trial.upgradeModal.messagePlaceholder')}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          {/* Divider with "Or" in circle */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background text-sm font-medium text-muted-foreground">
                  {t('common.or') || 'Or'}
                </span>
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t('trial.upgradeModal.contactByEmail') || 'you can contact us by email'}
            </p>
            <a 
              href="mailto:plans@kalbook.io" 
              className="text-sm text-primary hover:underline font-medium"
            >
              plans@kalbook.io
            </a>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('trial.upgradeModal.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('trial.upgradeModal.submitting')}
                </>
              ) : (
                t('trial.upgradeModal.submitRequest')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Plan Details Modal */}
    <Dialog open={showPlanDetails} onOpenChange={setShowPlanDetails}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('pricing.title') || 'Plan Details'}</DialogTitle>
          <DialogDescription>
            {t('pricing.subtitle') || 'Choose the right plan for your business'}
          </DialogDescription>
        </DialogHeader>

        {loadingPlans ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {(() => {
              // Filter to show only the selected plan
              const planToShow = plans.find(p => p.name.toLowerCase() === selectedPlanForDetails.toLowerCase());
              
              if (!planToShow) {
                return (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {t('trial.upgradeModal.planNotFound') || 'Plan not found'}
                    </p>
                  </div>
                );
              }

              const enabledFeatures = planToShow.planFeatures
                .filter(f => f.enabled)
                .map(f => {
                  const translationKey = `trial.planFeatures.${f.feature_name}`;
                  const translated = t(translationKey);
                  // If translation exists and is not the key itself, use it; otherwise fallback to feature name
                  return translated !== translationKey ? translated : (FEATURE_DEFINITIONS[f.feature_name]?.label || f.feature_name);
                })
                .sort();
              
              return (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      {planToShow.name.charAt(0).toUpperCase() + planToShow.name.slice(1)}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      ₪{planToShow.price}/month
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {enabledFeatures.length > 0 ? (
                      enabledFeatures.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">{t('common.noFeatures') || 'No features available'}</li>
                    )}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowPlanDetails(false)}>
            {t('common.close') || 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

