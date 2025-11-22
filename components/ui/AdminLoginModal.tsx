'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { LoadingButton } from '@/components/ported/ui/loading-button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ported/ui/dialog';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { KalBookLogo } from '@/components/ui/KalBookLogo';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function AdminLoginModal({ open, onOpenChange, onLoginSuccess }: AdminLoginModalProps) {
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();

  const [step, setStep] = useState<'phone' | 'verify' | 'welcome' | 'notRegistered'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Format phone number with dashes (050-000-0000)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX (always maintain dashes)
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phone.trim()) {
      toast.error(t('adminLogin.phoneRequired') || 'Phone number is required');
      return;
    }

    // Remove dashes for API call
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error(t('adminLogin.invalidPhone') || 'Please enter a valid phone number');
      return;
    }

    setSendingOtp(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.sendCodeError') || 'Failed to send code');
      }

      setSendingOtp(false);
      setStep('verify');
      setOtpDigits(['', '', '', '', '', '']);
      setCode('');
      toast.success(t('adminLogin.codeSent') || 'Code sent successfully');
      // Focus first OTP input after modal opens
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (error: any) {
      setSendingOtp(false);
      setError(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
      toast.error(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
    }
  };

  // Handle OTP digit change
  const handleOtpDigitChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Update code for API
    const newCode = newDigits.join('');
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newCode.length === 6) {
      handleVerifyCode(newCode);
    }
  };

  // Handle OTP key down (backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);
    const pastedCode = pastedData;
    setCode(pastedCode);
    if (pastedCode.length === 6) {
      handleVerifyCode(pastedCode);
    } else {
      otpInputRefs.current[Math.min(pastedCode.length, 5)]?.focus();
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
          redirectTo: `${window.location.origin}/api/auth/callback?next=/&popup=true`,
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

          // Create admin_session cookie by calling our API
          try {
            const response = await fetch('/api/auth/oauth-session', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const data = await response.json();

            if (!response.ok) {
              // Check if user is not registered (404 status)
              if (response.status === 404) {
                setIsLoading(false);
                setStep('notRegistered');
                return;
              }
              throw new Error(data.error || 'Failed to create session');
            }

            // Verify response indicates success
            if (!data.success) {
              throw new Error(data.error || 'Authentication failed');
            }

            // Check if user exists
            if (!data.user || !data.user.id) {
              setIsLoading(false);
              setStep('notRegistered');
              return;
            }

            setIsLoading(false);
            setUserName(data.user?.name || '');
            setStep('welcome');

            // Show welcome message
            toast.success(
              (t('adminLogin.welcomeBack') || 'Welcome Back! {name}').replace('{name}', data.user?.name || '')
            );
            
            // Small delay to show welcome message
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Close modal
            onOpenChange(false);
            
            // Call onLoginSuccess callback if provided, otherwise reload page
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              // Reload to ensure all components see the new session
              window.location.reload();
            }
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
          redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Apple login');
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const codeToUse = codeToVerify || code;
    // Accept both 4-digit test code (1234) and 6-digit real codes
    if (!codeToUse || (codeToUse.length !== 4 && codeToUse.length !== 6)) {
      if (!codeToVerify) {
        setError(t('adminLogin.invalidCode') || 'Invalid code format');
        toast.error(t('adminLogin.invalidCode') || 'Invalid code format');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Remove dashes for API call
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Call verify-otp-homepage API
      const response = await fetch('/api/auth/verify-otp-homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          code: codeToUse,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if user is not registered (404 status)
        if (response.status === 404) {
          setIsLoading(false);
          setStep('notRegistered');
          return;
        }
        throw new Error(data.error || t('adminLogin.invalidCode') || 'Invalid code');
      }

      // Verify response indicates success
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Check if user exists
      if (!data.user || !data.user.id) {
        setIsLoading(false);
        setStep('notRegistered');
        return;
      }

      setIsLoading(false);
      setUserName(data.user?.name || '');
      setStep('welcome');

      // Show welcome message
      toast.success(
        (t('adminLogin.welcomeBack') || 'Welcome Back! {name}').replace('{name}', data.user?.name || '')
      );
      
      // Small delay to show welcome message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close modal
      onOpenChange(false);
      
      // Call onLoginSuccess callback if provided, otherwise reload page
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.invalidCode') || 'Invalid code');
      toast.error(error.message || t('adminLogin.invalidCode') || 'Invalid code');
      // Clear OTP on error
      setOtpDigits(['', '', '', '', '', '']);
      setCode('');
      otpInputRefs.current[0]?.focus();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setStep('phone');
      setPhone('');
      setCode('');
      setOtpDigits(['', '', '', '', '', '']);
      setError(null);
      setUserName('');
      onOpenChange(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setCode('');
    setOtpDigits(['', '', '', '', '', '']);
    setError(null);
  };

  // Focus first OTP input when step changes to verify
  useEffect(() => {
    if (step === 'verify' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md" dir={dir}>
        {step === 'notRegistered' ? (
          <>
            <DialogHeader>
              <div className={`flex flex-col items-center justify-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <KalBookLogo size="lg" variant="full" animated={false} />
              </div>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <DialogTitle className="text-2xl font-bold text-center">
                {t('adminLogin.notRegistered.title') || 'Not Registered'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t('adminLogin.notRegistered.message') || 'It seems that you are not registered in the system.'}
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <DialogHeader>
            <div className={`flex flex-col items-center justify-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <KalBookLogo size="lg" variant="full" animated={false} />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              {step === 'welcome'
                ? (t('adminLogin.welcomeBack') || 'Welcome Back! {name}').replace('{name}', userName)
                : (t('adminLogin.homepageLogin') || t('adminLogin.title') || 'Admin Login')
              }
            </DialogTitle>
            <DialogDescription className="text-center">
              {step === 'welcome'
                ? (t('adminLogin.loginSuccess') || 'Redirecting to your dashboard...')
                : (t('adminLogin.subtitle') || 'Sign in to manage your business')
              }
            </DialogDescription>
          </DialogHeader>
        )}

        {step === 'welcome' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : step === 'notRegistered' ? (
          <div className="space-y-6 text-center">
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-3">
                <p className="text-sm font-medium pb-4">
                  {t('adminLogin.notRegistered.createBusiness') || 'Want to create a new business?'}
                </p>
                <Link href="/onboarding">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Store verified phone in sessionStorage
                      const cleanPhone = phone.replace(/\D/g, '');
                      sessionStorage.setItem('homepage_verified_phone', cleanPhone);
                    }}
                  >
                    {t('adminLogin.notRegistered.createBusinessButton') || 'Create New Business'}
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">
                  {t('adminLogin.notRegistered.needAccess') || 'Need access to an existing business?'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('adminLogin.notRegistered.contactOwner') || 'Please ask the business owner to add you as a user.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleBackToPhone}
              className="w-full"
            >
              {t('adminLogin.back') || 'Back'}
            </Button>
          </div>
        ) : step === 'phone' ? (
          <div className="space-y-6 max-w-md mx-auto">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Phone Input Section */}
            <div className="space-y-4">
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
                  placeholder={t('adminLogin.phonePlaceholder') || t('onboarding.auth.phonePlaceholder') || 'enter phone number'}
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phone.replace(/\D/g, '').length >= 10 && !sendingOtp) {
                      handlePhoneSubmit();
                    }
                  }}
                  maxLength={12}
                  disabled={sendingOtp}
                  autoComplete="tel"
                  className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base`}
                  dir={dir}
                />
              </div>

              <LoadingButton
                onClick={handlePhoneSubmit}
                loading={sendingOtp}
                disabled={!phone.trim() || phone.replace(/\D/g, '').length < 10}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
              >
                {t('adminLogin.login') || t('onboarding.auth.login') || 'Login'}
              </LoadingButton>
            </div>

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

            {/* Terms and Privacy Agreement */}
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const agreementText = t('adminLogin.termsAgreement') || 'By logging in you agree to {terms} and {privacy}';
                  const termsText = t('adminLogin.termsOfUse') || 'terms of use';
                  const privacyText = t('adminLogin.privacyPolicy') || 'privacy policy';
                  
                  // Split by placeholders and insert links
                  const regex = /(\{terms\}|\{privacy\})/g;
                  const parts = agreementText.split(regex);
                  
                  return parts.map((part, index) => {
                    if (part === '{terms}') {
                      return (
                        <Link key={`terms-${index}`} href="/terms" target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline">
                          {termsText}
                        </Link>
                      );
                    } else if (part === '{privacy}') {
                      return (
                        <Link key={`privacy-${index}`} href="/privacy" target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline">
                          {privacyText}
                        </Link>
                      );
                    }
                    return part;
                  });
                })()}
              </p>
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
              <Label className="block mb-3 text-center">
                {t('adminLogin.enterCode') || 'Enter verification code'}
              </Label>
              <div className="flex gap-1 sm:gap-2 justify-center px-2" dir="ltr">
                {otpDigits.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    disabled={isLoading}
                    className="h-12 w-10 sm:h-14 sm:w-14 text-center text-xl sm:text-2xl font-semibold"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
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
                  setOtpDigits(['', '', '', '', '', '']);
                  setError(null);
                }}
                className="flex-1"
                disabled={isLoading}
              >
                {t('adminLogin.back') || 'Back'}
              </Button>
              <LoadingButton
                type="button"
                onClick={() => handleVerifyCode()}
                loading={isLoading}
                disabled={isLoading || code.length < 4}
                className="flex-1"
              >
                {t('adminLogin.verify') || 'Verify'}
              </LoadingButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

