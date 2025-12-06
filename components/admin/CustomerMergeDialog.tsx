'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/types/admin';

interface CustomerMergeDialogProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onMerge: () => void;
}

export function CustomerMergeDialog({
  open,
  onClose,
  customers,
  onMerge,
}: CustomerMergeDialogProps) {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [primaryId, setPrimaryId] = useState<string>('');
  const [secondaryId, setSecondaryId] = useState<string>('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (customers.length >= 2) {
      setPrimaryId(customers[0].id);
      setSecondaryId(customers[1].id);
    }
  }, [customers]);

  const handleMerge = async () => {
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      toast.error('Please select two different customers');
      return;
    }

    try {
      setMerging(true);
      const response = await fetch('/api/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryCustomerId: primaryId,
          secondaryCustomerId: secondaryId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('customers.merge.success') || 'Customers merged successfully');
        onMerge();
        onClose();
      } else {
        toast.error(data.error || 'Failed to merge customers');
      }
    } catch (error) {
      toast.error('Failed to merge customers');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('customers.merge.title') || 'Merge Customers'}</DialogTitle>
          <DialogDescription>
            {t('customers.merge.description') || 'Select two customers to merge. The secondary customer will be deleted.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t('customers.merge.selectPrimary') || 'Primary Customer'}</Label>
            <Select value={primaryId} onValueChange={setPrimaryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('customers.merge.selectSecondary') || 'Secondary Customer'}</Label>
            <Select value={secondaryId} onValueChange={setSecondaryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customers.filter(c => c.id !== primaryId).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={merging}>
            {t('customers.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleMerge} disabled={merging || !primaryId || !secondaryId || primaryId === secondaryId}>
            {merging ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.merging') || 'Merging...'}
              </>
            ) : (
              t('customers.merge.confirm') || 'Confirm Merge'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

