"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ported/ui/dialog';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { Textarea } from '@/components/ported/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/ported/hooks/useLocale';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrialStatus {
  success: boolean;
  planName: string;
  subscriptionStatus: string;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [formData, setFormData] = useState({
    desiredPlan: '',
    contactEmail: '',
    message: '',
  });

  useEffect(() => {
    if (open) {
      // Fetch current trial status
      fetch('/api/admin/trial-status')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTrialStatus(data);
            setFormData(prev => ({
              ...prev,
              contactEmail: '', // Will be pre-filled from business if available
            }));
          }
        })
        .catch(err => console.error('Error fetching trial status:', err));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.desiredPlan) {
      toast.error(t('trial.upgradeModal.desiredPlanRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/upgrade/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('trial.upgradeModal.title')}</DialogTitle>
          <DialogDescription>
            {t('trial.upgradeModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900 mb-2">
            {t('trial.upgradeModal.contactInfo')}
          </p>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>{t('trial.upgradeModal.phone')}:</strong>{' '}
              <a href="tel:0542636737" className="underline hover:text-blue-900">
                054-263-6737
              </a>
            </p>
            <p>
              <strong>{t('trial.upgradeModal.email')}:</strong>{' '}
              <a href="mailto:plans@kalbook.io" className="underline hover:text-blue-900">
                plans@kalbook.io
              </a>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPlan">{t('trial.upgradeModal.currentPlan')}</Label>
            <Input
              id="currentPlan"
              value={trialStatus?.planName ? trialStatus.planName.charAt(0).toUpperCase() + trialStatus.planName.slice(1) : t('common.loading')}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desiredPlan">{t('trial.upgradeModal.desiredPlan')} *</Label>
            <Select
              value={formData.desiredPlan}
              onValueChange={(value) => setFormData({ ...formData, desiredPlan: value })}
            >
              <SelectTrigger id="desiredPlan">
                <SelectValue placeholder={t('trial.upgradeModal.desiredPlan')} />
              </SelectTrigger>
              <SelectContent>
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
  );
}

