'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/lib/i18n';
import { Send, MessageSquare, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Communication {
  id: string;
  channel: 'sms' | 'whatsapp' | 'email';
  direction: 'inbound' | 'outbound';
  subject?: string;
  message: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface CommunicationHistoryProps {
  customerId: string;
  onSend?: () => void;
}

export function CommunicationHistory({ customerId, onSend }: CommunicationHistoryProps) {
  const { t, locale } = useLocale();
  const { isRTL } = useDirection();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendChannel, setSendChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCommunications();
  }, [customerId, channelFilter]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (channelFilter !== 'all') {
        params.append('channel', channelFilter);
      }
      const response = await fetch(`/api/customers/${customerId}/communications?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error(t('customers.messageRequired') || 'Please enter a message');
      return;
    }

    if (sendChannel === 'email' && !subject.trim()) {
      toast.error('Subject is required for email');
      return;
    }

    try {
      setSending(true);
      const endpoint = sendChannel === 'sms' 
        ? `/api/customers/${customerId}/send-sms`
        : sendChannel === 'whatsapp'
        ? `/api/customers/${customerId}/send-whatsapp`
        : `/api/customers/${customerId}/send-email`;

      const body = sendChannel === 'email'
        ? { subject, body: message }
        : { message };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('customers.messageSent') || 'Message sent successfully');
        setMessage('');
        setSubject('');
        setShowSendDialog(false);
        fetchCommunications();
        onSend?.();
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
      case 'whatsapp':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold">{t('customers.communications.title') || 'Communications'}</h3>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('customers.communications.all') || 'All Channels'}</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowSendDialog(true)} size="sm">
                <Send className={`h-4 w-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                {t('customers.communications.send') || 'Send Message'}
              </Button>
        </div>
      </div>

      {showSendDialog && (
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <Label>{t('customers.communications.channel') || 'Channel'}</Label>
            <Select value={sendChannel} onValueChange={(v: 'sms' | 'whatsapp' | 'email') => setSendChannel(v)}>
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
          {sendChannel === 'email' && (
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
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? 'Sending...' : t('customers.communications.send') || 'Send'}
            </Button>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              {t('customers.cancel') || 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : communications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('customers.communications.noCommunications') || 'No communications found'}
        </div>
      ) : (
        <div className="space-y-2">
          {communications.map((comm) => (
            <div key={comm.id} className="border rounded-lg p-4">
              <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {getChannelIcon(comm.channel)}
                    <Badge variant="secondary">{comm.channel.toUpperCase()}</Badge>
                    <Badge variant={comm.status === 'sent' ? 'default' : 'secondary'}>
                      {comm.status}
                    </Badge>
                  </div>
                  {comm.subject && (
                    <div className="font-semibold mb-1">{comm.subject}</div>
                  )}
                  <div className="text-sm text-muted-foreground mb-2">{comm.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {comm.sent_at ? formatDate(comm.sent_at, locale) : formatDate(comm.created_at, locale)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

