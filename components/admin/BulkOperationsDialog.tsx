'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkOperationsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  operation: 'tags' | 'export' | 'communication';
  onComplete: () => void;
}

export function BulkOperationsDialog({
  open,
  onClose,
  selectedIds,
  operation,
  onComplete,
}: BulkOperationsDialogProps) {
  const { t } = useLocale();
  const { isRTL } = useDirection();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState('');
  const [tagOperation, setTagOperation] = useState<'add' | 'remove'>('add');
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const handleBulkTags = async () => {
    if (!tags.trim()) {
      toast.error('Please enter tags');
      return;
    }

    try {
      setLoading(true);
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const response = await fetch('/api/customers/bulk-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds: selectedIds,
          tags: tagArray,
          operation: tagOperation,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${data.results.successful} customers updated`);
        onComplete();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update tags');
      }
    } catch (error) {
      toast.error('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customers/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedIds }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Export completed');
        onClose();
      } else {
        toast.error('Failed to export');
      }
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCommunication = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (channel === 'email' && !subject.trim()) {
      toast.error('Subject is required for email');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/customers/bulk-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds: selectedIds,
          channel,
          message: message.trim(),
          subject: channel === 'email' ? subject.trim() : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${data.results.successful} messages sent`);
        onComplete();
        onClose();
      } else {
        toast.error(data.error || 'Failed to send messages');
      }
    } catch (error) {
      toast.error('Failed to send messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (operation === 'tags') {
      handleBulkTags();
    } else if (operation === 'export') {
      handleBulkExport();
    } else if (operation === 'communication') {
      handleBulkCommunication();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {operation === 'tags' && (t('customers.bulkTags') || 'Bulk Tags')}
            {operation === 'export' && (t('customers.bulkExport') || 'Bulk Export')}
            {operation === 'communication' && (t('customers.bulkCommunication') || 'Bulk Communication')}
          </DialogTitle>
          <DialogDescription>
            {t('customers.bulkOperationDescription')?.replace('{count}', selectedIds.length.toString()) || `Apply to ${selectedIds.length} selected customers`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {operation === 'tags' && (
            <>
              <div>
                <Label>{t('customers.tags') || 'Tags'}</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div>
                <Label>{t('customers.operation') || 'Operation'}</Label>
                <Select value={tagOperation} onValueChange={(v: 'add' | 'remove') => setTagOperation(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">{t('customers.add') || 'Add'}</SelectItem>
                    <SelectItem value="remove">{t('customers.remove') || 'Remove'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {operation === 'communication' && (
            <>
              <div>
                <Label>{t('customers.communications.channel') || 'Channel'}</Label>
                <Select value={channel} onValueChange={(v: 'sms' | 'whatsapp' | 'email') => setChannel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {channel === 'email' && (
                <div>
                  <Label>{t('customers.communications.subject') || 'Subject'}</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('customers.communications.subject') || 'Subject'}
                  />
                </div>
              )}
              <div>
                <Label>{t('customers.communications.message') || 'Message'}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('customers.messagePlaceholder') || 'Type a message here...'}
                  rows={4}
                />
              </div>
            </>
          )}

          {operation === 'export' && (
            <div className="text-sm text-muted-foreground">
              {t('customers.exportDescription') || `Export ${selectedIds.length} customers to CSV`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('customers.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.processing') || 'Processing...'}
              </>
            ) : (
              operation === 'export' ? (t('customers.export') || 'Export') : (t('customers.apply') || 'Apply')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


