"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomField, RegistrationSettings } from '@/types/admin';
// Removed mock data imports - now using API
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCustomerByPhone } from '@/lib/api/services';
import { supabase } from '@/lib/supabase/client';

type LoginStep = 'phone' | 'verify' | 'register';

interface LoginRegisterDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (customerData: any) => void;
  registrationSettings?: RegistrationSettings;
}

export function LoginRegisterDialog({
  open,
  onClose,
  onSuccess,
  registrationSettings,
}: LoginRegisterDialogProps) {
  const { t, isRTL, locale } = useLocale();
  const { dir } = useDirection();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: undefined as Date | undefined,
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',
    customFields: {} as Record<string, any>,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setCode('');
      setIsVerifying(false);
      setIsRegistering(false);
      setFormData({
        name: '',
        email: '',
        dateOfBirth: undefined,
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        gender: '',
        customFields: {},
      });
    }
  }, [open, registrationSettings?.defaultGender]);

  // Auto-focus first OTP input when step changes to verify (fallback if animation callback doesn't work)
  useEffect(() => {
    if (step === 'verify') {
      // Fallback focus after a delay (in case onAnimationComplete doesn't fire)
      const timer = setTimeout(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const inputs = dialog.querySelectorAll('input');
          const otpInput = Array.from(inputs).find((input) => {
            const el = input as HTMLInputElement;
            return el.maxLength === 6 || el.getAttribute('inputmode') === 'numeric' || el.type === 'text';
          }) as HTMLInputElement;
          
          if (otpInput && document.activeElement !== otpInput) {
            otpInput.focus();
          } else if (inputs.length > 0 && document.activeElement !== inputs[0]) {
            (inputs[0] as HTMLInputElement).focus();
          }
        }
      }, 400); // Delay to allow Framer Motion animation to complete
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handlePhoneSubmit = async () => {
    if (!phone) return;
    
    setIsVerifying(true);
    
    try {
      // Call send-otp API
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          method: 'whatsapp', // or 'sms'
          userType: 'customer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setIsVerifying(false);
      setStep('verify');
      toast.success(t('auth.codeSentViaWhatsApp'));
      
      // In development, show the code for testing
      if (data.code && process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP Code: ${data.code}`);
      }
    } catch (error: any) {
      setIsVerifying(false);
      toast.error(error.message || t('auth.sendCodeError') || 'Failed to send code');
    }
  };

  const handleVerifyCode = async () => {
    // Accept both 4-digit test code (1234) and 6-digit real codes
    if (!code || (code.length !== 4 && code.length !== 6)) {
      toast.error(t('auth.invalidCode'));
      return;
    }
    
    // Allow test code 1234 (4 digits) or 6-digit codes
    if (code.length === 4 && code !== '1234') {
      toast.error(t('auth.invalidCode'));
      return;
    }

    setIsVerifying(true);

    try {
      // Call verify-otp API
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          code: code,
          userType: 'customer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setIsVerifying(false);

      // Session is automatically created and stored in cookie
      // The API returns the customer session
      const session = data.session;

      // Check if customer exists in the database by phone number
      try {
        const existingCustomer = await getCustomerByPhone(phone);
        
        if (existingCustomer) {
          // Existing customer - log them in directly and proceed to booking
          const welcomeMessage = t('auth.welcomeBack')?.replace('{{name}}', existingCustomer.name) || `Welcome back, ${existingCustomer.name}!`;
          toast.success(welcomeMessage);
          onSuccess({
            phone: existingCustomer.phone,
            name: existingCustomer.name,
            email: existingCustomer.email || '',
            customerId: existingCustomer.id,
            businessId: session.businessId,
          });
          onClose();
        } else {
          // New customer - proceed to registration to collect additional info
          // Pre-fill phone number and any data from session
          setFormData({
            ...formData,
            email: session.email || formData.email,
            // Keep phone number available for display/reference
          });
          toast.info(t('auth.customerNotFound') || 'Please complete your registration');
          setStep('register');
        }
      } catch (error) {
        // If checking customer fails, assume new customer and show registration
        console.error('Error checking customer:', error);
        toast.info(t('auth.customerNotFound') || 'Please complete your registration');
        setStep('register');
      }
    } catch (error: any) {
      setIsVerifying(false);
      // Check if error message contains "Invalid or expired code" and use translation
      const errorMessage = error.message || '';
      if (errorMessage.includes('Invalid or expired code') || errorMessage.includes('expired')) {
        toast.error(t('auth.invalidOrExpiredCode') || 'Invalid or expired code');
      } else {
        toast.error(errorMessage || t('auth.invalidCode') || 'Invalid code');
      }
    }
  };

  // Handle Google OAuth
  const handleGoogleLogin = async () => {
    try {
      setIsOAuthLoading(true);
      
      // Get the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}&popup=true&type=customer`,
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
          setIsOAuthLoading(false);

          // Wait a bit for cookies to sync
          await new Promise(resolve => setTimeout(resolve, 500));

          // Get Supabase Auth session
          let session = null;
          const maxRetries = 5;
          
          for (let i = 0; i < maxRetries; i++) {
            const { data, error } = await supabase.auth.getSession();
            session = data?.session;
            
            if (session?.user) {
              break;
            }
            
            if (i === 2) {
              const { data: userData } = await supabase.auth.getUser();
              if (userData?.user) {
                const { data: refreshedSession } = await supabase.auth.getSession();
                session = refreshedSession?.session;
                if (session?.user) break;
              }
            }
            
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
            }
          }
          
          if (!session?.user) {
            toast.info('Completing login...');
            window.location.reload();
            return;
          }

          // Pre-fill form with OAuth data
          const userEmail = session.user.email || '';
          const userPhone = session.user.phone || '';
          const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';

          if (userPhone) {
            setPhone(userPhone);
          }
          if (userEmail) {
            setFormData(prev => ({ ...prev, email: userEmail }));
          }
          if (userName) {
            setFormData(prev => ({ ...prev, name: userName }));
          }

          // Create customer session from OAuth
          try {
            const sessionResponse = await fetch('/api/auth/oauth-session-customer', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok) {
              throw new Error(sessionData.error || 'Failed to create session');
            }

            if (!sessionData.success || !sessionData.session) {
              throw new Error('Failed to create customer session');
            }

            const customerSession = sessionData.session;

            // Check if customer has complete profile (name, etc.)
            if (customerSession.name && customerSession.name !== customerSession.phone) {
              // Customer exists with complete profile - log them in
              toast.success(t('auth.welcomeBack')?.replace('{{name}}', customerSession.name) || `Welcome back, ${customerSession.name}!`);
              onSuccess({
                phone: customerSession.phone,
                name: customerSession.name,
                email: customerSession.email || userEmail,
                customerId: customerSession.customerId,
                businessId: customerSession.businessId,
              });
              onClose();
            } else {
              // Customer needs to complete registration
              if (userPhone) setPhone(userPhone);
              if (userEmail) setFormData(prev => ({ ...prev, email: userEmail }));
              if (userName) setFormData(prev => ({ ...prev, name: userName }));
              
              toast.info(t('auth.completeRegistration') || 'Please complete your registration');
              setStep('register');
            }
          } catch (error: any) {
            console.error('Error creating customer session:', error);
            // Pre-fill form and proceed to registration
            if (userPhone) setPhone(userPhone);
            if (userEmail) setFormData(prev => ({ ...prev, email: userEmail }));
            if (userName) setFormData(prev => ({ ...prev, name: userName }));
            
            toast.info(t('auth.completeRegistration') || 'Please complete your registration');
            setStep('register');
          }
        } else if (event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          popup.close();
          setIsOAuthLoading(false);
          toast.error(event.data.error || 'Authentication failed');
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup is closed manually
      checkClosedInterval = setInterval(() => {
        if (popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          window.removeEventListener('message', messageListener);
          setIsOAuthLoading(false);
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setIsOAuthLoading(false);
    }
  };

  // Handle Apple OAuth
  const handleAppleLogin = async () => {
    try {
      setIsOAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}&type=customer`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Apple login');
      setIsOAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      toast.error(t('auth.fillRequiredFields') || 'Please fill in all required fields');
      return;
    }

    setIsRegistering(true);

    try {
      // First, get the current session to know the customer ID
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.success || !sessionData.session) {
        throw new Error('Session not found. Please verify your code again.');
      }

      const customerId = sessionData.session.customerId;
      const businessId = sessionData.session.businessId;

      // Update customer profile via API
      // Note: You'll need to create an API route for updating customer profile
      // For now, we'll update through the verify-otp endpoint by re-verifying with the same code
      // Or better: create a PATCH /api/customers/[id] route
      
      // Update customer using Supabase client
      // Since we're in a client component, we'll need to create an API route
      const updateResponse = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          date_of_birth: formData.dateOfBirth ? formData.dateOfBirth.toISOString().split('T')[0] : null,
          gender: formData.gender || null,
          // Custom fields can be stored in notes or a separate JSONB field
          notes: formData.customFields ? JSON.stringify(formData.customFields) : null,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Refresh session to get updated customer data
      const updatedSessionResponse = await fetch('/api/auth/session');
      const updatedSessionData = await updatedSessionResponse.json();

      setIsRegistering(false);
      onSuccess({
        phone: phone,
        name: formData.name,
        email: formData.email || '',
        customerId: customerId,
        businessId: businessId,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString().split('T')[0] : undefined,
        gender: formData.gender || '',
        customFields: formData.customFields,
      });
      toast.success(t('auth.registrationSuccess') || 'Registration completed successfully!');
      onClose();
    } catch (error: any) {
      setIsRegistering(false);
      console.error('Registration error:', error);
      toast.error(error.message || t('auth.registrationError') || 'Failed to complete registration');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md px-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {step === 'phone' && t('auth.enterPhone')}
            {step === 'verify' && t('auth.verifyCode')}
            {step === 'register' && t('auth.completeRegistration')}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="phone" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.phoneNumber')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (value.includes('+')) {
                      value = '+' + value.replace(/\+/g, '');
                    }
                    setPhone(value);
                  }}
                  placeholder={t('auth.phonePlaceholder')}
                  dir="ltr"
                  className="mt-2"
                />
              </div>
              <Button
                onClick={handlePhoneSubmit}
                disabled={!phone || isVerifying || isOAuthLoading}
                className="w-full"
              >
                {isVerifying ? t('auth.sending') : t('auth.sendCode')}
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
                  disabled={isOAuthLoading || isVerifying}
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
                  disabled={isOAuthLoading || isVerifying}
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
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              onAnimationComplete={() => {
                // Focus the OTP input after animation completes
                setTimeout(() => {
                  const dialog = document.querySelector('[role="dialog"]');
                  if (dialog) {
                    const inputs = dialog.querySelectorAll('input');
                    const otpInput = Array.from(inputs).find((input) => {
                      const el = input as HTMLInputElement;
                      return el.maxLength === 6 || el.getAttribute('inputmode') === 'numeric' || el.type === 'text';
                    }) as HTMLInputElement;
                    
                    if (otpInput) {
                      otpInput.focus();
                    } else if (inputs.length > 0) {
                      (inputs[0] as HTMLInputElement).focus();
                    }
                  }
                }, 50);
              }}
              className="space-y-4"
            >
              <div>
                <Label className={`block mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.verificationCode')}
                </Label>
                <div className="flex justify-center w-full">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    disabled={isVerifying}
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
                <p className={`text-xs text-muted-foreground mt-2 text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.codeSentTo')} {phone}
                </p>
              </div>
                  <Button
                    onClick={handleVerifyCode}
                    disabled={(code.length !== 4 && code.length !== 6) || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? t('auth.verifying') : t('auth.verify')}
                  </Button>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
              className="space-y-4 max-h-[60vh] overflow-y-auto px-1"
            >
              {/* Show verified phone number */}
              <div className="p-3 bg-muted rounded-lg">
                <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.verifiedPhone') || 'Verified Phone:'} <span className="font-medium">{phone}</span>
                </p>
              </div>

              <div>
                <Label htmlFor="name" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.fullName')} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('auth.namePlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="dateOfBirth" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.dateOfBirth') || 'Date of Birth'} *
                </Label>
                <div className={`flex gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Year Select */}
                  <Select
                    value={formData.birthYear}
                    onValueChange={(value) => {
                      // Update date if month and day are already selected
                      if (formData.birthMonth && formData.birthDay) {
                        const year = parseInt(value);
                        const month = parseInt(formData.birthMonth);
                        const day = parseInt(formData.birthDay);
                        const daysInMonth = new Date(year, month, 0).getDate();
                        // Adjust day if it's invalid for the new year (e.g., Feb 29 in non-leap year)
                        const validDay = Math.min(day, daysInMonth);
                        const date = new Date(year, month - 1, validDay);
                        setFormData({ ...formData, birthYear: value, birthDay: validDay.toString().padStart(2, '0'), dateOfBirth: date });
                      } else {
                        setFormData({ ...formData, birthYear: value });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.year') || 'Year'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Month Select */}
                  <Select
                    value={formData.birthMonth}
                    onValueChange={(value) => {
                      // Update date if year and day are already selected
                      if (formData.birthYear && formData.birthDay) {
                        const year = parseInt(formData.birthYear);
                        const month = parseInt(value);
                        const day = parseInt(formData.birthDay);
                        const daysInMonth = new Date(year, month, 0).getDate();
                        // Adjust day if it's invalid for the new month (e.g., day 31 in February)
                        const validDay = Math.min(day, daysInMonth);
                        const date = new Date(year, month - 1, validDay);
                        setFormData({ ...formData, birthMonth: value, birthDay: validDay.toString().padStart(2, '0'), dateOfBirth: date });
                      } else {
                        setFormData({ ...formData, birthMonth: value });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.month') || 'Month'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1;
                        const monthName = new Date(2000, month - 1, 1).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { month: 'long' });
                        return (
                          <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                            {monthName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Day Select */}
                  <Select
                    value={formData.birthDay}
                    onValueChange={(value) => {
                      const day = value;
                      // Only create date if all three are selected
                      if (formData.birthYear && formData.birthMonth) {
                        const year = parseInt(formData.birthYear);
                        const month = parseInt(formData.birthMonth);
                        const date = new Date(year, month - 1, parseInt(day));
                        setFormData({ ...formData, birthDay: day, dateOfBirth: date });
                      } else {
                        setFormData({ ...formData, birthDay: day });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1" dir="ltr">
                      <SelectValue placeholder={t('auth.day') || 'Day'} />
                    </SelectTrigger>
                    <SelectContent dir="ltr">
                      {(() => {
                        // If year and month are selected, show correct days for that month
                        if (formData.birthYear && formData.birthMonth) {
                          const year = parseInt(formData.birthYear);
                          const month = parseInt(formData.birthMonth);
                          const daysInMonth = new Date(year, month, 0).getDate();
                          return Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            return (
                              <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                              </SelectItem>
                            );
                          });
                        } else {
                          // If year/month not selected, show 1-31 as default
                          return Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            return (
                              <SelectItem key={day} value={day.toString().padStart(2, '0')}>
                                {day}
                              </SelectItem>
                            );
                          });
                        }
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="gender" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.gender')}
                </Label>
                <select
                  id="gender"
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg mt-2"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <option value="">{t('auth.selectGender')}</option>
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="email" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('auth.emailPlaceholder')}
                  dir="ltr"
                  className="mt-2"
                />
              </div>

              {/* Custom Fields */}
              {registrationSettings?.customFields?.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id} className={isRTL ? 'text-right' : 'text-left'}>
                    {field.label} {field.required && '*'}
                  </Label>
                  {field.type === 'select' ? (
                    <select
                      id={field.id}
                      value={formData.customFields[field.id] || 'none'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customFields: { ...formData.customFields, [field.id]: e.target.value === 'none' ? '' : e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg mt-2"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      <option value="none">{t('auth.selectOption')}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={field.id}
                      value={formData.customFields[field.id] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customFields: { ...formData.customFields, [field.id]: e.target.value },
                        })
                      }
                      placeholder={field.placeholder}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="w-full px-3 py-2 border rounded-lg mt-2"
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type}
                      value={formData.customFields[field.id] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customFields: { ...formData.customFields, [field.id]: e.target.value },
                        })
                      }
                      placeholder={field.placeholder}
                      dir={field.type === 'number' ? 'ltr' : isRTL ? 'rtl' : 'ltr'}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}

              <Button
                onClick={handleRegister}
                disabled={!formData.name || !formData.birthYear || !formData.birthMonth || !formData.birthDay || isRegistering}
                className="w-full"
              >
                {isRegistering ? t('auth.registering') : t('auth.completeRegistration')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

