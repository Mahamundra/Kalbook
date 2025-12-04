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
import { useIsMobile } from '@/components/ported/hooks/use-mobile';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { t, isRTL, locale } = useLocale();
  const { dir } = useDirection();
  const isMobile = useIsMobile();

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

  // Handle OAuth callback for business admin login (redirect flow)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const type = urlParams.get('type');
      const businessSlugParam = urlParams.get('businessSlug');
      
      // Check if this is an OAuth callback for business admin
      if (code && type === 'business_admin' && businessSlugParam === slug) {
        try {
          setIsLoading(true);
          
          // Wait a bit for session to be set
          await new Promise(resolve => setTimeout(resolve, 500));

          // Verify user belongs to this business and create admin_session cookie
          const response = await fetch('/api/auth/oauth-session-business', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              businessSlug: slug,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Success - redirect to dashboard
            toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.href = `/b/${slug}/admin/dashboard`;
          } else {
            setIsLoading(false);
            setError(data.error || 'Authentication failed');
            toast.error(data.error || 'Authentication failed');
            // Clean URL
            window.history.replaceState({}, '', `/b/${slug}/admin/login`);
          }
        } catch (error: any) {
          setIsLoading(false);
          setError(error.message || 'Failed to complete login');
          toast.error(error.message || 'Failed to complete login');
          // Clean URL
          window.history.replaceState({}, '', `/b/${slug}/admin/login`);
        }
      }
    };

    handleOAuthCallback();
  }, [slug, t]);

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

  // Handle Google OAuth with popup
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Get the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/b/${slug}/admin/login&popup=true`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to get OAuth URL');

      // Open popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'google-auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for message from popup
      let checkClosedInterval: NodeJS.Timeout | null = null;
      const messageListener = async (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          popup.close();
          setIsLoading(false);

          // Wait a bit for cookies to sync between popup and parent window
          await new Promise(resolve => setTimeout(resolve, 500));

          // Wait a bit for cookies to sync between popup and parent window
          await new Promise(resolve => setTimeout(resolve, 500));

          // Get Supabase Auth session
          let session = null;
          let sessionError = null;
          const maxRetries = 5;
          
          for (let i = 0; i < maxRetries; i++) {
            const { data, error } = await supabase.auth.getSession();
            session = data?.session;
            sessionError = error;
            
            if (session?.user) {
              break;
            }
            
            // If not found, try getUser() which might force a refresh
            if (i === 2) {
              const { data: userData } = await supabase.auth.getUser();
              if (userData?.user) {
                const { data: refreshedSession } = await supabase.auth.getSession();
                session = refreshedSession?.session;
                if (session?.user) break;
              }
            }
            
            // Wait before retrying (exponential backoff)
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
            }
          }
          
          if (sessionError || !session?.user) {
            // If we still don't have a session, reload the page to ensure cookies are read
            toast.info('Completing login...');
            window.location.reload();
            return;
          }

          // Verify user belongs to this business and create admin_session cookie
          try {
            const response = await fetch('/api/auth/oauth-session-business', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                businessSlug: slug,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Authentication failed');
            }

            if (!data.success) {
              throw new Error(data.error || 'Authentication failed');
            }

            // Success - redirect to dashboard
            toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.href = `/b/${slug}/admin/dashboard`;
          } catch (error: any) {
            setIsLoading(false);
            setError(error.message || 'Failed to complete login');
            toast.error(error.message || 'Failed to complete login');
          }
        } else if (event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          popup.close();
          setIsLoading(false);
          toast.error(event.data.error || 'Authentication failed');
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup is closed manually
      checkClosedInterval = setInterval(() => {
        if (popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          window.removeEventListener('message', messageListener);
          setIsLoading(false);
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setIsLoading(false);
    }
  };

  // Handle Apple OAuth
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/b/${slug}/admin/login`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Apple login');
      setIsLoading(false);
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
            <KalBookLogo size="lg" variant="full" animated={false} />
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

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground">
                    {t('onboarding.auth.additionalOptions') || t('onboarding.auth.or') || 'Additional login options'}
                  </span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-medium"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <svg className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-5 w-5`} viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {t('onboarding.auth.signInWithGoogle') || 'Sign in with Google'}
                </Button>
                <Button
                  type="button"
                  className="w-full h-12 bg-black hover:bg-gray-900 text-white font-medium"
                  onClick={handleAppleLogin}
                  disabled={isLoading}
                >
                  <svg 
                    aria-hidden="true" 
                    focusable="false" 
                    data-prefix="fab" 
                    data-icon="apple" 
                    className={`svg-inline--fa fa-apple text-white text-xl ${dir === 'rtl' ? 'ml-2' : 'mr-2'}`}
                    role="img" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 384 512"
                  >
                    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path>
                  </svg>
                  {t('onboarding.auth.signInWithApple') || 'Sign in with Apple'}
                </Button>
              </div>

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
