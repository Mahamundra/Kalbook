'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ported/ui/card';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ported/ui/input-otp';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { KalBookLogo } from '@/components/ui/KalBookLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { t, isRTL, locale } = useLocale();
  const { dir } = useDirection();

  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Get business data for display
  useEffect(() => {
    async function fetchBusiness() {
      try {
        const response = await fetch(`/api/debug/business?slug=${slug}`);
        const data = await response.json();
        if (data.exists && data.business) {
          setBusinessName(data.business.name);
        }
        
        // Fetch settings to get logo (using slug-based approach)
        try {
          // We'll try to get settings from the business context
          // Since we're on login page, we can't use tenant context, so we'll fetch from business slug
          const settingsResponse = await fetch(`/api/settings?businessSlug=${slug}`);
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            if (settingsData.success && settingsData.settings?.branding?.logoUrl) {
              setLogoUrl(settingsData.settings.branding.logoUrl);
            }
          }
        } catch (settingsError) {
          // Settings might not be accessible before login, that's okay
        }
      } catch (error) {
      }
    }
    fetchBusiness();
  }, [slug]);

  const handlePhoneSubmit = async () => {
    if (!phone || phone.trim() === '') {
      setError(t('adminLogin.phoneRequired') || 'Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          method: 'whatsapp',
          userType: 'business_owner',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.sendCodeError') || 'Failed to send code');
      }

      setIsLoading(false);
      setStep('verify');
      toast.success(t('adminLogin.codeSent') || 'Code sent successfully');
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
      toast.error(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
    }
  };

  const handleVerifyCode = async () => {
    // Accept both 4-digit test code (1234) and 6-digit real codes
    if (!code || (code.length !== 4 && code.length !== 6)) {
      setError(t('adminLogin.invalidCode') || 'Invalid code format');
      toast.error(t('adminLogin.invalidCode') || 'Invalid code format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call verify-otp API with business slug
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          code: code,
          userType: 'business_owner',
          businessSlug: slug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.invalidCode') || 'Invalid code');
      }

      // Verify response indicates success
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      setIsLoading(false);

      // Success - redirect to dashboard
      toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
      
      // Small delay to ensure cookie is set by browser and toast is visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use window.location.href for full page reload to ensure cookie is read by middleware
      // This forces a complete page reload which will properly read the Set-Cookie header
      window.location.href = `/b/${slug}/admin/dashboard`;
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.invalidCode') || 'Invalid code');
      toast.error(error.message || t('adminLogin.invalidCode') || 'Invalid code');
    }
  };

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {/* System Name and Logo */}
          <div className={`flex flex-col items-center justify-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt={businessName || 'Business logo'} 
                className="h-12 w-auto object-contain"
              />
            )}
            <KalBookLogo size="lg" variant="full" />
          </div>
          
          <CardTitle className={`text-2xl font-bold text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('adminLogin.title') || 'Admin Login'}
          </CardTitle>
          <CardDescription className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            {businessName 
              ? (t('adminLogin.subtitleWithBusiness') || 'Sign in to {businessName}').replace('{businessName}', businessName)
              : (t('adminLogin.subtitle') || 'Sign in to manage your business')
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <Phone className="w-4 h-4" />
                  {t('adminLogin.phone') || 'Phone Number'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('adminLogin.phonePlaceholder') || '+1234567890'}
                  value={phone}
                  onChange={(e) => {
                    let value = e.target.value;
                    // If there's a + anywhere, move it to the beginning
                    if (value.includes('+')) {
                      value = '+' + value.replace(/\+/g, '');
                    }
                    setPhone(value);
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="tel"
                  dir="ltr"
                  className="w-full"
                />
              </div>

              <Button
                type="button"
                onClick={handlePhoneSubmit}
                className="w-full"
                disabled={isLoading || !phone.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                    {t('adminLogin.sending') || 'Sending...'}
                  </>
                ) : (
                  t('adminLogin.sendCode') || 'Send Code'
                )}
              </Button>

              <div className={`mt-4 text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                <p>{t('adminLogin.testCodeHint') || 'For testing, use code: 1234'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className={`block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('adminLogin.enterCode') || 'Enter verification code'}
                </Label>
                <div className="flex justify-center w-full">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    disabled={isLoading}
                    className="w-full justify-center"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <InputOTPGroup className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className={`text-xs text-center text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('adminLogin.codeHint') || 'Enter the 6-digit code sent to your phone, or use 1234 for testing'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                  }}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {t('adminLogin.back') || 'Back'}
                </Button>
                <Button
                  type="button"
                  onClick={handleVerifyCode}
                  className="flex-1"
                  disabled={isLoading || code.length < 4}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                      {t('adminLogin.verifying') || 'Verifying...'}
                    </>
                  ) : (
                    t('adminLogin.verify') || 'Verify'
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className={`mt-6 pt-4 border-t text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
            <p>{t('adminLogin.noAccount') || 'Don\'t have an account?'}</p>
            <p className="mt-1">
              {t('adminLogin.contactOwner') || 'Contact your business owner to create an admin account.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
