'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ported/ui/alert-dialog';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Footer } from '@/components/ui/Footer';
import { Loader2, LogOut, Settings, Save, ArrowRight, ArrowLeft, AlertTriangle, X, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user profile
      const profileResponse = await fetch('/api/user/profile');
      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          // Not authenticated, redirect to homepage
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
        
        // Load plans for each business (only if owner)
        if (profileData.user?.role === 'owner') {
          // First, get all available plans (same for all businesses)
          const plansResponse = await fetch('/api/user/plans');
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            if (plansData.success) {
              setPlans(plansData.plans || []);
            }
          }

          // Then, load plan info for each business
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
          // For non-owners, just set businesses without plans
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
        // Update the business in the businesses array
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
        // Update the business in the businesses array
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
      // Call logout API to properly clear cookie
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      
      // Redirect to homepage
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: try to clear cookie manually and redirect
      document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading') || 'Loading...'}</p>
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
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <PageHeader />
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('userDashboard.title') || 'My Account'}</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('userDashboard.profile') || 'Profile'}</CardTitle>
                  <CardDescription>
                    {t('userDashboard.role') || 'Role'}: {user.role === 'owner' 
                      ? (t('userDashboard.owner') || 'Owner')
                      : (t('userDashboard.worker') || 'Worker')}
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
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
                  <div className="flex gap-2">
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
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                          {t('userDashboard.saving') || 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-muted-foreground">{t('userDashboard.name') || 'Name'}</Label>
                    <p className="text-lg font-medium">{user.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('userDashboard.email') || 'Email'}</Label>
                    <p className="text-lg font-medium">{user.email}</p>
                  </div>
                  {user.phone && (
                    <div>
                      <Label className="text-muted-foreground">{t('userDashboard.phone') || 'Phone'}</Label>
                      <p className="text-lg font-medium">{user.phone}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>


          {/* Businesses List Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('userDashboard.myBusinesses') || 'My Businesses'}</CardTitle>
              <CardDescription>
                {businesses.length === 1 
                  ? t('userDashboard.oneBusiness') || '1 business'
                  : `${businesses.length} ${t('userDashboard.businesses') || 'businesses'}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* List of businesses */}
              <div className="space-y-4">
                {businesses.map((business) => {
                  // Calculate days remaining in real-time
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
                  const showWarning = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && !isCancelled;
                  const startDate = business.subscriptionStartedAt || business.trialStartedAt;

                  return (
                    <div key={business.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{business.name}</h3>
                          <p className="text-sm text-muted-foreground">{business.slug}</p>
                          {business.currentPlanId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('userDashboard.currentPlan') || 'Current Plan'}: {plans.find(p => p.id === business.currentPlanId)?.name || 'Unknown'}
                              {plans.find(p => p.id === business.currentPlanId) && (
                                <span> - ₪{plans.find(p => p.id === business.currentPlanId)?.price}/month</span>
                              )}
                            </p>
                          )}
                        </div>
                        <Link href={`/b/${business.slug}/admin/dashboard`}>
                          <Button variant="outline" size="sm">
                            {t('userDashboard.goToAdmin') || 'Go to Admin Panel'}
                            {isRTL ? (
                              <ArrowLeft className="w-4 h-4 ml-2" />
                            ) : (
                              <ArrowRight className="w-4 h-4 ml-2" />
                            )}
                          </Button>
                        </Link>
                      </div>

                      {/* Plan Dates Section - Always show for owners */}
                      {user.role === 'owner' && (
                        <div className="pt-3 border-t space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {startDate ? (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{t('userDashboard.planStartDate') || 'Start Date'}</span>
                                </div>
                                <p className="font-medium">{formatDate(startDate)}</p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{t('userDashboard.planStartDate') || 'Start Date'}</span>
                                </div>
                                <p className="font-medium text-muted-foreground">-</p>
                              </div>
                            )}
                            {business.renewedAt ? (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{t('userDashboard.planRenewalDate') || 'Renewal Date'}</span>
                                </div>
                                <p className="font-medium">{formatDate(business.renewedAt)}</p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{t('userDashboard.planRenewalDate') || 'Renewal Date'}</span>
                                </div>
                                <p className="font-medium text-muted-foreground">-</p>
                              </div>
                            )}
                            {endDate ? (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Calendar className="w-4 h-4" />
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
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{t('userDashboard.planEndDate') || 'End Date'}</span>
                                </div>
                                <p className="font-medium text-muted-foreground">-</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 7-Day Warning */}
                      {showWarning && user.role === 'owner' && (
                        <Alert variant="default" className="bg-orange-50 border-orange-200">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800">
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
                                    `Current Plan: ${plans.find(p => p.id === business.currentPlanId)?.name || 'Unknown'}\n` +
                                    `Days Remaining: ${daysRemaining}\n` +
                                    `User Name: ${user.name}\n` +
                                    `User Email: ${user.email}\n` +
                                    `User Phone: ${user.phone || 'N/A'}\n\n` +
                                    `Please contact me to renew my plan.\n\nThank you!`
                                  );
                                  window.location.href = `mailto:plans@kalbook.io?subject=${subject}&body=${body}`;
                                }}
                                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                              >
                                {t('userDashboard.upgradeRequest') || 'Contact to Renew'}
                                {isRTL ? (
                                  <ArrowLeft className="w-4 h-4 ml-2" />
                                ) : (
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                )}
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Expired Plan Alert */}
                      {isExpired && user.role === 'owner' && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t('userDashboard.planExpired') || 'Plan expired. Please renew to continue using the admin panel.'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Cancelled Plan Status */}
                      {isCancelled && endDate && user.role === 'owner' && (
                        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                          <AlertDescription className="text-yellow-800">
                            {t('userDashboard.planCancelled')?.replace('{date}', formatDate(endDate)) || 
                             `Plan cancelled. Active until ${formatDate(endDate)}.`}
                          </AlertDescription>
                        </Alert>
                      )}
                    
                      {/* Plan Management for this business (Owner Only) */}
                      {user.role === 'owner' && (
                        <div className="space-y-3 pt-3 border-t">
                          {/* Current Plan Display (Read-only) */}
                          {business.currentPlanId && (
                            <div>
                              <Label className="text-sm text-muted-foreground">{t('userDashboard.currentPlan') || 'Current Plan'}</Label>
                              <p className="font-medium mt-1">
                                {plans.find(p => p.id === business.currentPlanId)?.name || 'Unknown'} - ₪{plans.find(p => p.id === business.currentPlanId)?.price || 0}/month
                              </p>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Upgrade Request Button */}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                const subject = encodeURIComponent(`Upgrade Request - ${business.name}`);
                                const body = encodeURIComponent(
                                  `Hello,\n\nI would like to request an upgrade for my business:\n\n` +
                                  `Business Name: ${business.name}\n` +
                                  `Business Slug: ${business.slug}\n` +
                                  `Current Plan: ${plans.find(p => p.id === business.currentPlanId)?.name || 'Unknown'}\n` +
                                  `User Name: ${user.name}\n` +
                                  `User Email: ${user.email}\n` +
                                  `User Phone: ${user.phone || 'N/A'}\n\n` +
                                  `Please contact me to discuss upgrade options.\n\nThank you!`
                                );
                                window.location.href = `mailto:plans@kalbook.io?subject=${subject}&body=${body}`;
                              }}
                              className="flex-1"
                            >
                              {t('userDashboard.upgradeRequest') || 'Upgrade Request'}
                              {isRTL ? (
                                <ArrowLeft className="w-4 h-4 ml-2" />
                              ) : (
                                <ArrowRight className="w-4 h-4 ml-2" />
                              )}
                            </Button>
                            
                            {/* Cancel Plan Button - Show for all active subscriptions */}
                            {business.subscriptionStatus === 'active' && !isExpired && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={savingBusinessId === business.id}
                                    className="text-destructive hover:text-destructive flex-1"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    {t('userDashboard.cancelPlan') || 'Cancel Plan'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('userDashboard.cancelPlan') || 'Cancel Plan'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('userDashboard.confirmCancelPlan') || 'Are you sure you want to cancel this plan? Your plan will remain active until the end date.'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
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
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {t('userDashboard.saving') || 'Saving...'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Create New Business Button */}
              {user.role === 'owner' && (
                <div className="pt-4 border-t">
                  <Link href="/onboarding">
                    <Button className="w-full" variant="default">
                      {t('userDashboard.createNewBusiness') || 'Create a new business'}
                      {isRTL ? (
                        <ArrowLeft className="w-4 h-4 ml-2" />
                      ) : (
                        <ArrowRight className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logout Button at Bottom */}
        <div className="mt-8 pt-6 border-t flex justify-center">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
            {t('userDashboard.logout') || 'Logout'}
          </Button>
        </div>
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}

