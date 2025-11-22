'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ported/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ported/ui/tabs';
import { Badge } from '@/components/ported/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ported/ui/avatar';
import { Separator } from '@/components/ported/ui/separator';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Footer } from '@/components/ui/Footer';
import { 
  Loader2, 
  LogOut, 
  Settings, 
  Save, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  X, 
  Calendar, 
  Clock,
  User,
  Building2,
  ExternalLink,
  Plus,
  Edit,
  CheckCircle2,
  XCircle,
  Clock3,
  CreditCard,
  Mail,
  Phone,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UpgradeModal } from '@/components/admin/UpgradeModal';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface Business {
  id: string;
  slug: string;
  name: string;
  currentPlanId?: string | null;
  subscriptionStatus?: string | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
  renewedAt?: string | null;
  daysRemaining?: number | null;
  expiresIn7Days?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [savingBusinessId, setSavingBusinessId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedBusinessForUpgrade, setSelectedBusinessForUpgrade] = useState<{ id: string; planName: string; ownerEmail?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('businesses');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileResponse = await fetch('/api/user/profile');
      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          window.location.href = '/';
          return;
        }
        throw new Error('Failed to load profile');
      }
      const profileData = await profileResponse.json();
      if (profileData.success) {
        setUser(profileData.user);
        setEditName(profileData.user.name);
        setEditEmail(profileData.user.email);
        setEditPhone(profileData.user.phone || '');
        
        const initialBusinesses = profileData.businesses || [profileData.business].filter(Boolean);
        
        if (profileData.user?.role === 'owner') {
          const plansResponse = await fetch('/api/user/plans');
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            if (plansData.success) {
              setPlans(plansData.plans || []);
            }
          }

          const businessesWithPlans = await Promise.all(
            initialBusinesses.map(async (business: Business) => {
              const businessPlansResponse = await fetch(`/api/user/plans?businessId=${business.id}`);
              if (businessPlansResponse.ok) {
                const businessPlansData = await businessPlansResponse.json();
                if (businessPlansData.success) {
                  return {
                    ...business,
                    currentPlanId: businessPlansData.currentPlan?.id || null,
                    subscriptionStatus: businessPlansData.subscriptionStatus || null,
                    trialStartedAt: businessPlansData.trialStartedAt || null,
                    trialEndsAt: businessPlansData.trialEndsAt || null,
                    subscriptionStartedAt: businessPlansData.subscriptionStartedAt || null,
                    subscriptionEndsAt: businessPlansData.subscriptionEndsAt || null,
                    renewedAt: businessPlansData.renewedAt || null,
                    daysRemaining: businessPlansData.daysRemaining || null,
                    expiresIn7Days: businessPlansData.expiresIn7Days || false,
                  };
                }
              }
              return {
                ...business,
                currentPlanId: null,
                subscriptionStatus: null,
                daysRemaining: null,
                expiresIn7Days: false,
              };
            })
          );
          setBusinesses(businessesWithPlans);
        } else {
          setBusinesses(initialBusinesses);
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.success) {
        setUser(data.user);
        setIsEditing(false);
        toast.success(t('userDashboard.saved') || 'Profile updated successfully');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async (planId: string, businessId: string) => {
    if (!user || user.role !== 'owner') {
      toast.error(t('userDashboard.planChangeOwnerOnly') || 'Plan changes are only available for business owners');
      return;
    }

    try {
      setSavingBusinessId(businessId);
      setError(null);

      const response = await fetch('/api/user/plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          businessId,
          subscriptionStatus: 'active',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      if (data.success) {
        setBusinesses(prev => prev.map(b => 
          b.id === businessId 
            ? { ...b, currentPlanId: planId, subscriptionStatus: 'active' }
            : b
        ));
        toast.success('Plan changed successfully');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to change plan');
      toast.error(error.message || 'Failed to change plan');
    } finally {
      setSavingBusinessId(null);
    }
  };

  const handleCancelPlan = async (businessId: string) => {
    if (!user || user.role !== 'owner') {
      toast.error('Only business owners can cancel plans');
      return;
    }

    try {
      setSavingBusinessId(businessId);
      setError(null);

      const response = await fetch('/api/user/plans/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel plan');
      }

      if (data.success) {
        setBusinesses(prev => prev.map(b => 
          b.id === businessId 
            ? { ...b, subscriptionStatus: 'cancelled' }
            : b
        ));
        toast.success('Plan cancelled successfully');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to cancel plan');
      toast.error(error.message || 'Failed to cancel plan');
    } finally {
      setSavingBusinessId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanStatus = (business: Business) => {
    const endDate = business.subscriptionEndsAt || business.trialEndsAt;
    let daysRemaining: number | null = null;
    if (endDate) {
      const end = new Date(endDate);
      const diffTime = end.getTime() - currentTime.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, diffDays);
    }
    
    const isExpired = daysRemaining !== null && daysRemaining === 0;
    const isCancelled = business.subscriptionStatus === 'cancelled';
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && !isCancelled;
    
    if (isExpired) return { status: 'expired', label: 'Expired', variant: 'destructive' as const };
    if (isCancelled) return { status: 'cancelled', label: 'Cancelled', variant: 'secondary' as const };
    if (isExpiringSoon) return { status: 'expiring', label: `Expires in ${daysRemaining} days`, variant: 'outline' as const };
    if (business.subscriptionStatus === 'active') return { status: 'active', label: 'Active', variant: 'default' as const };
    return { status: 'trial', label: 'Trial', variant: 'secondary' as const };
  };

  if (loading) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user || businesses.length === 0) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('userDashboard.title') || 'My Account'}</CardTitle>
            <CardDescription>{error || 'User not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              <Home className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
              {t('userDashboard.homepage') || 'Go to Homepage'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <PageHeader />
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-3xl font-bold">{t('userDashboard.title') || 'My Account'}</h1>
                <p className="text-muted-foreground mt-1">
                  {t('userDashboard.welcome') || `Welcome back, ${user.name}`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <LogOut className="w-4 h-4" />
              {t('userDashboard.logout') || 'Logout'}
            </Button>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="businesses" className="gap-2">
              <Building2 className="w-4 h-4" />
              {t('userDashboard.myBusinesses') || 'My Businesses'}
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              {t('userDashboard.profile') || 'Profile'}
            </TabsTrigger>
          </TabsList>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-6">
            {businesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('userDashboard.noBusinesses') || 'No Businesses'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t('userDashboard.noBusinessesDesc') || 'You don\'t have any businesses yet.'}
                  </p>
                  {user.role === 'owner' && (
                    <Link href="/onboarding">
                      <Button>
                        <Plus className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                        {t('userDashboard.createNewBusiness') || 'Create New Business'}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {businesses.map((business) => {
                  const planStatus = getPlanStatus(business);
                  const endDate = business.subscriptionEndsAt || business.trialEndsAt;
                  let daysRemaining: number | null = null;
                  if (endDate) {
                    const end = new Date(endDate);
                    const diffTime = end.getTime() - currentTime.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    daysRemaining = Math.max(0, diffDays);
                  }
                  const currentPlan = plans.find(p => p.id === business.currentPlanId);
                  const startDate = business.subscriptionStartedAt || business.trialStartedAt;

                  return (
                    <Card key={business.id} className="overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Building2 className="w-5 h-5 text-primary" />
                              <CardTitle className="text-xl">{business.name}</CardTitle>
                              <Badge variant={planStatus.variant}>{planStatus.label}</Badge>
                            </div>
                            <CardDescription className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>/{business.slug}</CardDescription>
                            {currentPlan && (
                              <div className={`mt-2 flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {currentPlan.name} - ₪{currentPlan.price}/month
                                </span>
                              </div>
                            )}
                          </div>
                          <Link href={`/b/${business.slug}/admin/dashboard`}>
                            <Button className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              {t('userDashboard.goToAdmin') || 'Go to Admin Panel'}
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      
                      <Separator />
                      
                      <CardContent className="pt-6">
                        {/* Plan Information */}
                        {user.role === 'owner' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {startDate && (
                                <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                    <Calendar className="w-4 h-4" />
                                    <span>{t('userDashboard.planStartDate') || 'Start Date'}</span>
                                  </div>
                                  <p className="font-medium">{formatDate(startDate)}</p>
                                </div>
                              )}
                              {business.renewedAt && (
                                <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                    <Clock className="w-4 h-4" />
                                    <span>{t('userDashboard.planRenewalDate') || 'Renewal Date'}</span>
                                  </div>
                                  <p className="font-medium">{formatDate(business.renewedAt)}</p>
                                </div>
                              )}
                              {endDate && (
                                <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                    <Clock3 className="w-4 h-4" />
                                    <span>{t('userDashboard.planEndDate') || 'End Date'}</span>
                                  </div>
                                  <p className="font-medium">{formatDate(endDate)}</p>
                                  {daysRemaining !== null && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {daysRemaining === 0 
                                        ? t('userDashboard.planExpired') || 'Expired'
                                        : `${daysRemaining} ${t('userDashboard.daysRemaining') || 'days remaining'}`
                                      }
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Warnings and Alerts */}
                            {planStatus.status === 'expiring' && (
                              <Alert className={`bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <AlertDescription className={`text-orange-800 dark:text-orange-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  <div className="space-y-3">
                                    <p className="font-medium">
                                      {t('userDashboard.planExpiringSoon')?.replace('{days}', daysRemaining?.toString() || '0') || 
                                       `Plan is about to end in ${daysRemaining} days. Please contact us to renew your plan.`}
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const subject = encodeURIComponent(`Plan Renewal Request - ${business.name}`);
                                        const body = encodeURIComponent(
                                          `Hello,\n\nI would like to renew my plan for my business:\n\n` +
                                          `Business Name: ${business.name}\n` +
                                          `Business Slug: ${business.slug}\n` +
                                          `Current Plan: ${currentPlan?.name || 'Unknown'}\n` +
                                          `Days Remaining: ${daysRemaining}\n` +
                                          `User Name: ${user.name}\n` +
                                          `User Email: ${user.email}\n` +
                                          `User Phone: ${user.phone || 'N/A'}\n\n` +
                                          `Please contact me to renew my plan.\n\nThank you!`
                                        );
                                        window.location.href = `mailto:plans@kalbook.io?subject=${subject}&body=${body}`;
                                      }}
                                      className={`border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                      {t('userDashboard.upgradeRequest') || 'Contact to Renew'}
                                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                                    </Button>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}

                            {planStatus.status === 'expired' && (
                              <Alert variant="destructive" className={isRTL ? 'flex-row-reverse' : ''}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className={isRTL ? 'text-right' : 'text-left'}>
                                  {t('userDashboard.planExpired') || 'Plan expired. Please renew to continue using the admin panel.'}
                                </AlertDescription>
                              </Alert>
                            )}

                            {planStatus.status === 'cancelled' && endDate && (
                              <Alert className={`bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <AlertDescription className={`text-yellow-800 dark:text-yellow-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {t('userDashboard.planCancelled')?.replace('{date}', formatDate(endDate)) || 
                                   `Plan cancelled. Active until ${formatDate(endDate)}.`}
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Plan Actions */}
                            <div className={`flex flex-col sm:flex-row gap-2 pt-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                              <Button
                                variant="default"
                                size="default"
                                onClick={() => {
                                  const currentPlanName = currentPlan?.name || 'Unknown';
                                  const ownerEmail = user?.role === 'owner' ? user.email : undefined;
                                  setSelectedBusinessForUpgrade({
                                    id: business.id,
                                    planName: currentPlanName,
                                    ownerEmail,
                                  });
                                  setUpgradeModalOpen(true);
                                }}
                                className={`flex-1 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <CreditCard className="w-4 h-4" />
                                {t('userDashboard.upgradeRequest') || 'Upgrade Request'}
                              </Button>
                              
                              {business.subscriptionStatus === 'active' && planStatus.status !== 'expired' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      disabled={savingBusinessId === business.id}
                                      className={`text-destructive hover:text-destructive flex-1 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                      <X className="w-4 h-4" />
                                      {t('userDashboard.cancelPlan') || 'Cancel Plan'}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
                                    <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                                      <AlertDialogTitle>{t('userDashboard.cancelPlan') || 'Cancel Plan'}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('userDashboard.confirmCancelPlan') || 'Are you sure you want to cancel this plan? Your plan will remain active until the end date.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleCancelPlan(business.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {t('userDashboard.cancelPlan') || 'Cancel Plan'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                            
                            {savingBusinessId === business.id && (
                              <p className={`text-xs text-muted-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {t('userDashboard.saving') || 'Saving...'}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Create New Business Button */}
                {user.role === 'owner' && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <Link href="/onboarding">
                        <Button variant="outline" size="lg" className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Plus className="w-5 h-5" />
                          {t('userDashboard.createNewBusiness') || 'Create a new business'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <CardTitle>{t('userDashboard.profile') || 'Profile'}</CardTitle>
                    <CardDescription>
                      {t('userDashboard.profileDesc') || 'Manage your account information'}
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Edit className="w-4 h-4" />
                      {t('userDashboard.editProfile') || 'Edit Profile'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('userDashboard.name') || 'Name'}</Label>
                        <Input
                          id="name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('userDashboard.email') || 'Email'}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('userDashboard.phone') || 'Phone'}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(user.name);
                          setEditEmail(user.email);
                          setEditPhone(user.phone || '');
                        }}
                        disabled={saving}
                        className="flex-1"
                      >
                        {t('common.cancel') || 'Cancel'}
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className={`flex-1 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        {saving ? (
                          <>
                            <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                            {t('userDashboard.saving') || 'Saving...'}
                          </>
                        ) : (
                          <>
                            <Save className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                            {t('common.save') || 'Save'}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-2xl font-semibold">{user.name}</h3>
                        <Badge variant="secondary" className="mt-1 capitalize">
                          {user.role === 'owner' 
                            ? (t('userDashboard.owner') || 'Owner')
                            : (t('userDashboard.worker') || 'Worker')}
                        </Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <Label className={`text-muted-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <Mail className="w-4 h-4" />
                          {t('userDashboard.email') || 'Email'}
                        </Label>
                        <p className="text-lg font-medium">{user.email}</p>
                      </div>
                      {user.phone && (
                        <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <Label className={`text-muted-foreground flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <Phone className="w-4 h-4" />
                            {t('userDashboard.phone') || 'Phone'}
                          </Label>
                          <p className="text-lg font-medium">{user.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="mt-16">
        <Footer />
      </div>
      
      {/* Upgrade Modal */}
      {selectedBusinessForUpgrade && (
        <UpgradeModal
          open={upgradeModalOpen}
          onOpenChange={(open) => {
            setUpgradeModalOpen(open);
            if (!open) {
              setSelectedBusinessForUpgrade(null);
            }
          }}
          businessId={selectedBusinessForUpgrade.id}
          currentPlanName={selectedBusinessForUpgrade.planName}
          ownerEmail={selectedBusinessForUpgrade.ownerEmail}
        />
      )}
    </div>
  );
}
