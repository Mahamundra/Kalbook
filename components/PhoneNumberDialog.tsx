"use client";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/customers/utils';

interface PhoneNumberDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess?: () => void;
}

export function PhoneNumberDialog({
  open,
  onClose,
  customerId,
  onSuccess,
}: PhoneNumberDialogProps) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Format phone number with dashes (050-000-0000)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits (Israeli phone numbers are 10 digits)
    const limited = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX (always maintain dashes)
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSave = async () => {
    // Validate phone number
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      toast.error(t('phoneDialog.invalidPhone') || 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizedPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(t('phoneDialog.phoneExists') || 'This phone number is already registered');
        } else {
          toast.error(data.error || t('phoneDialog.saveError') || 'Failed to save phone number');
        }
        setIsSaving(false);
        return;
      }

      toast.success(t('phoneDialog.saveSuccess') || 'Phone number saved successfully!');
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset and close
      setPhone('');
      onClose();
    } catch (error: any) {
      console.error('Error saving phone number:', error);
      toast.error(error.message || t('phoneDialog.saveError') || 'Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setPhone('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('phoneDialog.title') || 'Add Your Phone Number'}
          </DialogTitle>
          <DialogDescription>
            {t('phoneDialog.description') || 'Add your phone number to receive WhatsApp reminders about your appointments and to login easily next time.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t('phoneDialog.phoneLabel') || 'Phone Number'}
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('phoneDialog.phonePlaceholder') || '050-000-0000'}
              value={phone}
              onChange={handlePhoneChange}
              disabled={isSaving}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSaving}
          >
            {t('phoneDialog.skip') || 'Skip'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || normalizePhone(phone).length < 10}
          >
            {isSaving 
              ? (t('phoneDialog.saving') || 'Saving...') 
              : (t('phoneDialog.save') || 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

