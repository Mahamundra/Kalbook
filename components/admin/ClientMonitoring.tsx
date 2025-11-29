'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { AlertCircle, Users, Calendar, TrendingDown } from 'lucide-react';
import { Link } from 'next/navigation';

interface MonitoringClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  memberships?: any[];
  daysSinceLastAppointment?: number;
}

interface ClientMonitoringProps {
  businessType?: string;
}

export function ClientMonitoring({ businessType }: ClientMonitoringProps) {
  const { t, isRTL } = useLocale();
  const [monitoringClients, setMonitoringClients] = useState<MonitoringClient[]>([]);
  const [expiringMemberships, setExpiringMemberships] = useState<MonitoringClient[]>([]);
  const [inactiveClients, setInactiveClients] = useState<MonitoringClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessType === 'gym_trainer') {
      fetchMonitoringData();
    }
  }, [businessType]);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const [monitoringRes, expiringRes, inactiveRes] = await Promise.all([
        fetch('/api/dashboard/monitoring-clients'),
        fetch('/api/dashboard/expiring-memberships?days=7'),
        fetch('/api/dashboard/inactive-clients?days=14'),
      ]);

      const monitoringData = await monitoringRes.json();
      const expiringData = await expiringRes.json();
      const inactiveData = await inactiveRes.json();

      if (monitoringData.success) {
        setMonitoringClients(monitoringData.customers || []);
      }
      if (expiringData.success) {
        setExpiringMemberships(expiringData.customers || []);
      }
      if (inactiveData.success) {
        setInactiveClients(inactiveData.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (businessType !== 'gym_trainer') {
    return null;
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('dashboard.clientMonitoring') || 'Client Monitoring'}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('dashboard.underMonitoring') || 'Under Monitoring'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{monitoringClients.length}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.clientsWithFollowUps') || 'Clients with pending follow-ups or tasks'}
            </p>
            {monitoringClients.length > 0 && (
              <Link href="/admin/customers">
                <Button variant="outline" size="sm" className="w-full">
                  {t('dashboard.viewAll') || 'View All'}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              {t('dashboard.expiringMemberships') || 'Expiring Memberships'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-orange-600">{expiringMemberships.length}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.expiringWithin7Days') || 'Memberships expiring within 7 days'}
            </p>
            {expiringMemberships.length > 0 && (
              <div className="space-y-2">
                {expiringMemberships.slice(0, 3).map((client) => (
                  <div key={client.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{client.name}</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {client.memberships?.[0]?.remaining_sessions || 0} sessions
                    </Badge>
                  </div>
                ))}
                {expiringMemberships.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{expiringMemberships.length - 3} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              {t('dashboard.inactiveClients') || 'Inactive Clients'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-red-600">{inactiveClients.length}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.noAppointments14Days') || 'No appointments in last 14 days'}
            </p>
            {inactiveClients.length > 0 && (
              <div className="space-y-2">
                {inactiveClients.slice(0, 3).map((client) => (
                  <div key={client.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{client.name}</span>
                    {client.daysSinceLastAppointment !== undefined && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {client.daysSinceLastAppointment} days
                      </Badge>
                    )}
                  </div>
                ))}
                {inactiveClients.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{inactiveClients.length - 3} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

