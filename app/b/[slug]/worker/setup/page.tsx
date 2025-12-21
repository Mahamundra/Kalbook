'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/ui/loading-button';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { toE164Format } from '@/lib/customers/utils';

export default function WorkerSetupPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const inviteToken = searchParams.get('invite');
  const { t, isRTL, locale } = useLocale();
  const { dir } = useDirection();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workerData, setWorkerData] = useState<{
    id: string;
    name: string;
    email: string | null;
  } | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Validate invite token on mount
  useEffect(() => {
    async function validateInvite() {
      if (!inviteToken) {
        setError('Invalid invite link. Missing invite token.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/workers/validate-invite?invite=${encodeURIComponent(inviteToken)}&slug=${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Invalid or expired invite link. Please contact your administrator for a new invite.');
          setLoading(false);
          return;
        }

        setWorkerData({
          id: data.worker.id,
          name: data.worker.name,
          email: data.worker.email,
        });
        setBusinessName(data.business.name);
        setLoading(false);
      } catch (error: any) {
        console.error('Error validating invite:', error);
        setError('Failed to validate invite link. Please try again.');
        setLoading(false);
      }
    }

    validateInvite();
  }, [inviteToken, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Convert phone to E.164 format
      let e164Phone: string;
      try {
        e164Phone = toE164Format(formData.phone);
      } catch (error) {
        setError('Invalid phone number format. Please use E.164 format (e.g., +972542636737)');
        setSubmitting(false);
        return;
      }

      // Submit setup
      const response = await fetch('/api/workers/setup-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteToken,
          businessSlug: slug,
          name: formData.name.trim(),
          phone: e164Phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to set up account. Please try again.');
        setSubmitting(false);
        return;
      }

      // Success - redirect to admin dashboard
      toast.success('Account set up successfully! Redirecting...');
      router.push(`/b/${slug}/admin/dashboard`);
    } catch (error: any) {
      console.error('Error setting up account:', error);
      setError('Failed to set up account. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir={dir}>
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating invite link...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !workerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir={dir}>
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/b/${slug}`)}
              className="mt-4"
              variant="outline"
            >
              Go to Booking Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir={dir}>
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <KalBookLogo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Account</h1>
          <p className="text-gray-600 mt-2">
            Welcome to <strong>{businessName}</strong>
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          {workerData?.email && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={workerData.email}
                disabled
                className="bg-gray-50"
              />
            </div>
          )}

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+972542636737"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Please use E.164 format (e.g., +972542636737)
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          <LoadingButton
            type="submit"
            loading={submitting}
            className="w-full"
          >
            Set Up Account
          </LoadingButton>
        </form>
      </Card>
    </div>
  );
}

