'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Membership {
  id: string;
  package_id: string | null;
  package_name: string;
  total_sessions: number;
  remaining_sessions: number;
  purchased_at: string;
  expires_at: string | null;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  notes: string | null;
}

interface MembershipPackage {
  id: string;
  name: string;
  session_count: number;
  duration_days: number;
  price: number;
}

interface MembershipCardProps {
  customerId: string;
  onUpdate?: () => void;
}

export function MembershipCard({ customerId, onUpdate }: MembershipCardProps) {
  const { t, locale } = useLocale();
  const { isRTL } = useDirection();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    package_id: '',
    total_sessions: '',
    duration_days: '',
    notes: '',
  });

  useEffect(() => {
    fetchMemberships();
    fetchPackages();
  }, [customerId]);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/memberships?customer_id=${customerId}`);
      const data = await response.json();
      if (data.success) {
        setMemberships(data.memberships || []);
      }
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/membership-packages?active=true');
      const data = await response.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  };

  const handlePackageChange = (packageId: string) => {
    if (packageId === 'custom') {
      setFormData({
        ...formData,
        package_id: '',
        total_sessions: '',
        duration_days: '',
      });
    } else {
      const selectedPackage = packages.find(p => p.id === packageId);
      if (selectedPackage) {
        setFormData({
          ...formData,
          package_id: packageId,
          total_sessions: selectedPackage.session_count.toString(),
          duration_days: selectedPackage.duration_days.toString(),
        });
      }
    }
  };

  const handleCreate = async () => {
    if (!formData.package_id && !formData.total_sessions) {
      toast.error('Please select a package or enter session count');
      return;
    }

    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          package_id: formData.package_id || null,
          total_sessions: formData.total_sessions ? parseInt(formData.total_sessions) : undefined,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : undefined,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Membership created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ package_id: '', total_sessions: '', duration_days: '', notes: '' });
        fetchMemberships();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to create membership');
      }
    } catch (error) {
      console.error('Failed to create membership:', error);
      toast.error('Failed to create membership');
    }
  };

  const activeMembership = memberships.find(m => m.status === 'active');
  const isExpiringSoon = activeMembership?.expires_at 
    ? new Date(activeMembership.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('memberships.title') || 'Membership'}
        </h3>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t('memberships.addMembership') || 'Add Membership'}
        </Button>
      </div>

      {activeMembership ? (
        <Card className={isExpiringSoon ? 'border-orange-500' : ''}>
          <CardHeader>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CardTitle className="text-base">{activeMembership.package_name}</CardTitle>
              <Badge variant={activeMembership.status === 'active' ? 'default' : 'secondary'}>
                {activeMembership.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('memberships.remainingSessions') || 'Remaining'}</p>
                <p className="text-2xl font-bold">{activeMembership.remaining_sessions}</p>
                <p className="text-xs text-muted-foreground">of {activeMembership.total_sessions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('memberships.usedSessions') || 'Used'}</p>
                <p className="text-2xl font-bold">{activeMembership.total_sessions - activeMembership.remaining_sessions}</p>
              </div>
            </div>
            {activeMembership.expires_at && (
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {t('memberships.expires') || 'Expires'}: {formatDate(activeMembership.expires_at, locale)}
                </span>
                {isExpiringSoon && (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {t('memberships.purchased') || 'Purchased'}: {formatDate(activeMembership.purchased_at, locale)}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t('memberships.noActiveMembership') || 'No active membership'}
          </CardContent>
        </Card>
      )}

      {memberships.filter(m => m.status !== 'active').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('memberships.history') || 'History'}</h4>
          {memberships
            .filter(m => m.status !== 'active')
            .map((membership) => (
              <Card key={membership.id}>
                <CardContent className="py-3">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="font-medium text-sm">{membership.package_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {membership.total_sessions - membership.remaining_sessions} / {membership.total_sessions} sessions used
                      </p>
                    </div>
                    <Badge variant="secondary">{membership.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberships.createMembership') || 'Create Membership'}</DialogTitle>
            <DialogDescription>
              {t('memberships.createDescription') || 'Add a new membership package for this client'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('memberships.package') || 'Package'}</Label>
              <Select value={formData.package_id || 'custom'} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('memberships.selectPackage') || 'Select package or create custom'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t('memberships.customPackage') || 'Custom Package'}</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.session_count} sessions, {pkg.duration_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(!formData.package_id || formData.package_id === 'custom') && (
              <>
                <div>
                  <Label>{t('memberships.totalSessions') || 'Total Sessions'}</Label>
                  <Input
                    type="number"
                    value={formData.total_sessions}
                    onChange={(e) => setFormData({ ...formData, total_sessions: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>{t('memberships.durationDays') || 'Duration (days)'}</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    min="1"
                  />
                </div>
              </>
            )}
            <div>
              <Label>{t('memberships.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate}>
              {t('common.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
