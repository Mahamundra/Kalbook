'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OtpCodeInput } from '@/components/ui/OtpCodeInput';
import {
  cleanPhoneDigits,
  formatIsraeliPhoneInput,
  ISRAELI_PHONE_INPUT_MAX_LENGTH,
  phoneInputToE164,
} from '@/lib/phone/display';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { t, isRTL, locale } = useLocale();
  const { dir } = useDirection();
  const isMobile = useIsMobile();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSessionKey, setOtpSessionKey] = useState(0);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const oauthCallbackHandled = useRef(false);

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is already logged in by checking the profile endpoint
        const profileResponse = await fetch('/api/user/profile', {
          credentials: 'include',
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          // If user is authenticated and has a businessId, redirect to dashboard
          if (profileData.user?.businessId) {
            // Get return URL from query params or default to dashboard
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return');
            const redirectPath = returnUrl 
              ? decodeURIComponent(returnUrl)
              : `/b/${slug}/admin/dashboard`;
            router.push(redirectPath);
          }
        }
      } catch (error) {
        // Not authenticated, continue with login page
      }
    };
    
    checkAuth();
  }, [slug, router]);

  // Get business data for display
  useEffect(() => {
    async function fetchBusiness() {
      try {
        const response = await fetch(`/api/business?slug=${slug}`);
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
      const type = urlParams.get('type');
      const oauthSuccess = urlParams.get('oauth_success');
      
      // Check if this is an OAuth callback for business admin
      if (type === 'business_admin' && oauthSuccess === 'true') {
        // Prevent multiple executions
        if (oauthCallbackHandled.current) {
          return;
        }
        oauthCallbackHandled.current = true;

        try {
          setIsLoading(true);
          setError(null); // Clear any previous errors
          
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
            // Check if error matches the no admin account message and translate it
            const errorMessage = data.error || 'Authentication failed';
            const isNoAdminAccountError = errorMessage.includes('No admin account found with this email for this business');
            const translatedError = isNoAdminAccountError 
              ? (t('adminLogin.noAdminAccountFound') || errorMessage)
              : errorMessage;
            setError(translatedError);
            // Show toast only once
            toast.error(translatedError);
            // Clean URL immediately to prevent re-triggering
            window.history.replaceState({}, '', `/b/${slug}/admin/login`);
          }
        } catch (error: any) {
          setIsLoading(false);
          const errorMsg = error.message || 'Failed to complete login';
          setError(errorMsg);
          // Show toast only once
          toast.error(errorMsg);
          // Clean URL immediately to prevent re-triggering
          window.history.replaceState({}, '', `/b/${slug}/admin/login`);
        }
      } else {
        // Reset the flag if not an OAuth callback
        oauthCallbackHandled.current = false;
      }
    };

    handleOAuthCallback();
  }, [slug, t]);

  const handlePhoneSubmit = async () => {
    const cleanPhone = cleanPhoneDigits(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      setError(t('adminLogin.phoneRequired') || 'Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const phoneForApi = phoneInputToE164(phone);

      // Check if phone belongs to worker or owner of this business
      const accessCheckResponse = await fetch('/api/auth/check-business-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForApi,
          businessSlug: slug,
        }),
      });

      const accessCheckData = await accessCheckResponse.json();

      if (!accessCheckData.hasAccess) {
        setIsLoading(false);
        const errorMessage = t('adminLogin.noBusinessAccess') || 'Seems you don\'t have access to this business admin panel';
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Phone has access, proceed with sending OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForApi,
          method: 'whatsapp',
          userType: 'business_owner',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.sendCodeError') || 'Failed to send code');
      }

      setIsLoading(false);
      setShowOtpModal(true);
      setOtpCountdown(30);
      setOtpSessionKey((k) => k + 1);
      setCode('');
      toast.success(
        loginMethod === 'phone' 
          ? (t('adminLogin.codeSentToPhone')?.replace('{phone}', phone.replace(/\D/g, '')) || `Verification code sent successfully to ${phone}`)
          : (t('adminLogin.codeSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`)
      );
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
      toast.error(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
    }
  };

  // Handle Google OAuth - use redirect flow (same page)
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Get base URL - prefer NEXT_PUBLIC_APP_URL, fallback to current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      // Use redirect flow (same page)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/api/auth/callback?next=/b/${slug}/admin/login&type=business_admin`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setIsLoading(false);
    }
  };

  // Handle Facebook OAuth
  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      
      // Get base URL - prefer NEXT_PUBLIC_APP_URL, fallback to current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${baseUrl}/api/auth/callback?next=/b/${slug}/admin/login&type=business_admin`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Facebook login');
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setError(t('adminLogin.emailRequired') || 'Email is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use custom email OTP API
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          userType: 'business_owner',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429 && data.retryAfter) {
          const errorMessage = data.error || t('auth.rateLimitMessage')?.replace('{seconds}', data.retryAfter.toString()) || `Too many requests. Please try again in ${data.retryAfter} seconds.`;
          setError(errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        } else {
          throw new Error(data.error || 'Failed to send code');
        }
      }

      setIsLoading(false);
      setShowOtpModal(true);
      setOtpCountdown(30);
      setOtpSessionKey((k) => k + 1);
      setCode('');
      
      // In development, log the code
      if (process.env.NODE_ENV === 'development' && data.code) {
        console.log(`[DEV] Email OTP Code: ${data.code}`);
      }
      
      toast.success(
        loginMethod === 'phone' 
          ? (t('adminLogin.codeSentToPhone')?.replace('{phone}', phone.replace(/\D/g, '')) || `Verification code sent successfully to ${phone}`)
          : (t('adminLogin.codeSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`)
      );
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
      toast.error(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    await handlePhoneSubmit();
  };

  // Handle enter other number
  const handleEnterOtherNumber = () => {
    setShowOtpModal(false);
    setCode('');
    setOtpCountdown(0);
    setError(null);
    if (loginMethod === 'phone') {
      setPhone('');
    } else {
      setEmail('');
    }
    if (!isMobile && loginMethod === 'phone') {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const codeToUse = codeToVerify || code;
    // Accept both 4-digit test code (1234) and 6-digit real codes
    if (!codeToUse || (codeToUse.length !== 4 && codeToUse.length !== 6)) {
      setError(t('adminLogin.invalidCode') || 'Invalid code format');
      toast.error(t('adminLogin.invalidCode') || 'Invalid code format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (loginMethod === 'email') {
        // Verify email OTP using custom API
        const response = await fetch('/api/auth/verify-email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            code: codeToUse,
            userType: 'business_owner',
            businessSlug: slug,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid or expired code');
        }

        if (!data.success) {
          throw new Error(data.error || 'Authentication failed');
        }

        setIsLoading(false);
        setShowOtpModal(false);

        toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
        
        // Wait for cookie to be set and verify it exists before redirecting
        // This ensures the middleware will see the cookie when the redirect happens
        // Start with a minimum wait (like OAuth flow) then check for cookie
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let cookieSet = false;
        let attempts = 0;
        const maxAttempts = 10; // 10 attempts * 200ms = 2 seconds additional wait
        
        while (!cookieSet && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          // Check if is_logged_in cookie is set (non-httpOnly, so we can check it)
          cookieSet = document.cookie.includes('is_logged_in=true');
          attempts++;
        }
        
        if (!cookieSet) {
          console.warn('[LOGIN] Cookie not detected after verification, but redirecting anyway. Middleware will handle authentication.');
        }
        
        // Get return URL from query params or default to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        const redirectPath = returnUrl 
          ? decodeURIComponent(returnUrl)
          : `/b/${slug}/admin/dashboard`;
        
        // Use window.location.href for full page reload to ensure cookie is sent
        window.location.href = redirectPath;
      } else {
        const phoneForApi = phoneInputToE164(phone);

        // Get return URL from query params or default to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        const redirectPath = returnUrl 
          ? decodeURIComponent(returnUrl)
          : `/b/${slug}/admin/dashboard`;

        // Call verify-otp API - don't pass redirectUrl, get JSON response and set cookie
        // Then redirect manually on client side
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          credentials: 'include', // Ensure cookies are sent and received
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneForApi,
            code: codeToUse,
            userType: 'business_owner',
            businessSlug: slug,
            // Don't pass redirectUrl - get JSON response instead
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Check if error is "Invalid or expired code" and use translation
          const errorMessage = data.error || '';
          const lowerErrorMessage = errorMessage.toLowerCase();
          if (lowerErrorMessage.includes('invalid') && lowerErrorMessage.includes('expired')) {
            throw new Error(t('adminLogin.invalidOrExpiredCode') || 'Invalid or expired code');
          }
          throw new Error(data.error || t('adminLogin.invalidCode') || 'Invalid code');
        }

        // Verify response indicates success
        if (!data.success) {
          throw new Error(data.error || 'Authentication failed');
        }

        // Success - cookie should be set in the response
        setIsLoading(false);
        setShowOtpModal(false);
        toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
        
        // Wait for cookie to be set and verify it exists before redirecting
        let cookieSet = false;
        let attempts = 0;
        const maxAttempts = 20; // 20 attempts * 100ms = 2 seconds max wait
        
        while (!cookieSet && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          // Check if is_logged_in cookie is set (non-httpOnly, so we can check it)
          cookieSet = document.cookie.includes('is_logged_in=true');
          attempts++;
          if (cookieSet) {
            console.log('[LOGIN] Cookie detected after', attempts, 'attempts');
          }
        }
        
        if (!cookieSet) {
          console.warn('[LOGIN] Cookie not detected after verification, but redirecting anyway');
        }
        
        // Redirect to dashboard - cookie should be set now
        console.log('[LOGIN] Redirecting to:', redirectPath);
        window.location.href = redirectPath;

        // If not a redirect, check for JSON response (error case)
        if (!response.ok) {
          // Try to parse JSON error response
          let errorMessage = 'Authentication failed';
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const text = await response.text();
              if (text) {
                const data = JSON.parse(text);
                errorMessage = data.error || errorMessage;
              }
            } else {
              errorMessage = response.statusText || errorMessage;
            }
          } catch (e) {
            // If JSON parsing fails, use status text
            console.error('[LOGIN] Error parsing error response:', e);
            errorMessage = response.statusText || errorMessage;
          }
          
          const lowerErrorMessage = errorMessage.toLowerCase();
          if (lowerErrorMessage.includes('invalid') && lowerErrorMessage.includes('expired')) {
            throw new Error(t('adminLogin.invalidOrExpiredCode') || 'Invalid or expired code');
          }
          throw new Error(errorMessage || t('adminLogin.invalidCode') || 'Invalid code');
        }

        // Fallback: if API returned JSON instead of redirect (shouldn't happen with redirectUrl)
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            if (text) {
              const data = JSON.parse(text);
              if (!data.success) {
                throw new Error(data.error || 'Authentication failed');
              }
              // If we get here, API returned JSON success (shouldn't happen with redirectUrl, but handle it)
              setIsLoading(false);
              setShowOtpModal(false);
              toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
              window.location.href = redirectPath;
            } else {
              // Empty response, assume redirect worked
              console.warn('[LOGIN] Empty JSON response, assuming redirect succeeded');
              setIsLoading(false);
              setShowOtpModal(false);
              toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
              window.location.href = redirectPath;
            }
          } else {
            // No JSON content type, assume redirect worked
            console.warn('[LOGIN] Response has no JSON content-type, assuming redirect succeeded');
            setIsLoading(false);
            setShowOtpModal(false);
            toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
            window.location.href = redirectPath;
          }
        } catch (e) {
          // If JSON parsing fails, assume redirect worked but we got an empty response
          console.warn('[LOGIN] Could not parse response as JSON, assuming redirect succeeded:', e);
          setIsLoading(false);
          setShowOtpModal(false);
          toast.success(t('adminLogin.loginSuccess') || 'Logged in successfully');
          window.location.href = redirectPath;
        }
      }
    } catch (error: any) {
      setIsLoading(false);
      // Check if error message contains "invalid" and "expired" to use proper translation
      const errorMessage = error.message || '';
      const lowerErrorMessage = errorMessage.toLowerCase();
      let displayError = errorMessage;
      if (lowerErrorMessage.includes('invalid') && lowerErrorMessage.includes('expired')) {
        displayError = t('adminLogin.invalidOrExpiredCode') || 'Invalid or expired code';
      } else if (lowerErrorMessage.includes('invalid')) {
        displayError = t('adminLogin.invalidCode') || 'Invalid code';
      } else if (errorMessage.includes('No admin account found with this email for this business')) {
        displayError = t('adminLogin.noAdminAccountFound') || errorMessage;
      }
      setError(displayError);
      toast.error(displayError);
      setCode('');
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => {
        setOtpCountdown(otpCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Same as onboarding and homepage */}
      <header className="bg-white border-b fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-sm bg-white/95 supports-[backdrop-filter]:bg-white/80 safe-area-top shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
          <div className="flex items-center justify-between gap-2">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <LanguageToggle />
            </div>
            
            {/* Empty space for right side (can add user menu later if needed) */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            </div>
          </div>
          
          {/* Center - Logo (absolutely positioned for true centering) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Link href="/">
              <img 
                src="/kalbook-logo.svg" 
                alt="KalBook.io" 
                className="h-8 sm:h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex items-center justify-center pt-20 sm:pt-16 md:pt-24">
        <div className="w-full max-w-4xl px-6">

          {/* Login Card - Same styling as onboarding */}
          <Card className="w-full max-w-md mx-auto shadow-lg border-gray-200 bg-white rounded-2xl p-6 sm:p-8">
            <div className="animate-fade-in">
              {/* Welcome Message */}
              <div className="text-center mb-6">
                {businessName && (
                  <h1 className="text-xl font-bold mb-3 text-gray-900">{businessName}</h1>
                )}
                <h2 className="text-lg font-medium text-gray-700">{t('adminLogin.title') || 'Admin Login'}</h2>
              </div>
              
              <div className="space-y-6 max-w-md mx-auto">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Email/Phone Tabs */}
                <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as 'phone' | 'email')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="phone">{t('auth.phone') || 'Phone'}</TabsTrigger>
                    <TabsTrigger value="email">{t('auth.email') || 'Email'}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="phone" className="space-y-4 mt-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <Input
                        ref={phoneInputRef}
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        placeholder={t('adminLogin.phonePlaceholder') || t('onboarding.auth.phonePlaceholder') || 'enter phone number'}
                        value={phone}
                        onChange={(e) => setPhone(formatIsraeliPhoneInput(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && cleanPhoneDigits(phone).length >= 10 && !isLoading) {
                            handlePhoneSubmit();
                          }
                        }}
                        required
                        disabled={isLoading}
                        autoComplete="tel"
                        dir={dir}
                        maxLength={ISRAELI_PHONE_INPUT_MAX_LENGTH}
                        className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20`}
                      />
                    </div>

                    <LoadingButton
                      onClick={handlePhoneSubmit}
                      loading={isLoading}
                      disabled={!phone.trim() || cleanPhoneDigits(phone).length < 10}
                      className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                    >
                      {t('adminLogin.login') || t('onboarding.auth.login') || 'Login'}
                    </LoadingButton>
                  </TabsContent>
                  
                  <TabsContent value="email" className="space-y-4 mt-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && email.trim() && !isLoading) {
                            handleEmailSubmit();
                          }
                        }}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        dir="ltr"
                        className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20`}
                      />
                    </div>

                    <LoadingButton
                      onClick={handleEmailSubmit}
                      loading={isLoading}
                      disabled={!email.trim()}
                      className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                    >
                      {t('adminLogin.login') || t('onboarding.auth.login') || 'Login'}
                    </LoadingButton>
                  </TabsContent>
                </Tabs>

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
                    className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                    onClick={handleFacebookLogin}
                    disabled={isLoading}
                  >
                    <svg 
                      className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-5 w-5`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                    {t('onboarding.auth.signInWithFacebook') || 'Sign in with Facebook'}
                  </Button>
                </div>
              </div>

              <div className={`mt-6 pt-4 border-t text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                <p>{t('adminLogin.noAccount') || 'Don\'t have an account?'}</p>
                <p className="mt-1">
                  {t('adminLogin.contactOwner') || 'Contact your business owner to create an admin account.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('adminLogin.enterCode') || t('onboarding.auth.enterOtp') || 'Enter OTP Code'}</DialogTitle>
            <DialogDescription>
              {loginMethod === 'phone' 
                ? (t('onboarding.auth.otpSentTo')?.replace('{phone}', phone) || `We sent a verification code to ${phone}`)
                : (t('onboarding.auth.otpSentToEmail')?.replace('{email}', email) || `We sent a verification code to ${email}`)
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Success message with email/phone */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {loginMethod === 'phone' 
                  ? (t('adminLogin.codeSentToPhone')?.replace('{phone}', phone.replace(/\D/g, '')) || `Verification code sent successfully to ${phone}`)
                  : (t('adminLogin.codeSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`)
                }
              </p>
            </div>
            
            <div>
              <Label htmlFor="otp-code-modal" className="block mb-3 text-center">
                {t('onboarding.auth.otpCode') || 'OTP Code'}
              </Label>
              <OtpCodeInput
                key={otpSessionKey}
                value={code}
                onChange={setCode}
                onComplete={(value) => handleVerifyCode(value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <LoadingButton
                onClick={() => handleVerifyCode()}
                loading={isLoading}
                disabled={code.length !== 6 && code.length !== 4}
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
              >
                {t('adminLogin.verify') || t('onboarding.auth.verify') || 'Verify'}
              </LoadingButton>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t('onboarding.auth.didntReceiveCode') || "Didn't receive code?"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || isLoading}
                  className="inline-link-button h-auto min-h-0 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0 font-medium text-green-600 shadow-none hover:!border-green-600 hover:!bg-transparent hover:!text-green-700 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-70"
                >
                  {otpCountdown > 0 
                    ? t('onboarding.auth.sendAgainIn')?.replace('{seconds}', otpCountdown.toString()) || `Send again in ${otpCountdown}s`
                    : t('onboarding.auth.sendAgain') || 'Send again'}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleEnterOtherNumber}
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {loginMethod === 'phone' 
                  ? (t('onboarding.auth.enterOtherNumber') || 'Enter other number')
                  : (t('onboarding.auth.enterOtherEmail') || 'Enter other email')
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
