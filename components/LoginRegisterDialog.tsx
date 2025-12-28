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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

  // Helper function to format loading text with correct RTL ellipsis
  const formatLoadingText = (text: string): string => {
    if (!isRTL) return text;
    // In RTL, to show ellipsis on the right side visually,
    // we need to use a left-to-right mark before the ellipsis
    // This keeps the dots on the right side even in RTL context
    if (text.endsWith('...')) {
      // Use Unicode Left-to-Right Mark (U+200E) before ellipsis to keep it on right
      return text.slice(0, -3) + '\u200E...';
    }
    if (text.startsWith('...')) {
      // If ellipsis is at start, move to end with LRM
      return text.slice(3) + '\u200E...';
    }
    return text;
  };
  const [step, setStep] = useState<LoginStep>('phone');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [codeSentViaWhatsApp, setCodeSentViaWhatsApp] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to darken color for hover state
  const darkenColor = (color: string, amount: number = 0.1): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    const newG = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    const newB = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };
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

  // Countdown timer effect
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) {
      if (rateLimitCountdown === 0) {
        setRateLimitCountdown(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  // Fetch business primary color when dialog opens
  useEffect(() => {
    if (open) {
      const fetchPrimaryColor = async () => {
        try {
          // Get slug from URL
          const pathname = window.location.pathname;
          const slugMatch = pathname.match(/\/b\/([^\/]+)/);
          const slug = slugMatch ? slugMatch[1] : null;
          
          if (slug) {
            const response = await fetch(`/api/settings?businessSlug=${slug}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.settings?.branding?.themeColor) {
                setPrimaryColor(data.settings.branding.themeColor);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching primary color:', error);
        }
      };
      
      fetchPrimaryColor();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('phone');
      setLoginMethod('phone');
      setPhone('');
      setEmail('');
      setCode('');
      setIsVerifying(false);
      setIsRegistering(false);
      setRateLimitCountdown(null);
      setCodeSentViaWhatsApp(false);
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
    
    // Remove dashes for API call (keep only digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error(t('auth.invalidPhone') || 'Please enter a valid phone number');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Call send-otp API
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          method: 'whatsapp', // or 'sms'
          userType: 'customer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting with countdown
        if (response.status === 429 && data.retryAfter) {
          setRateLimitCountdown(data.retryAfter);
          const errorMessage = data.error || t('auth.rateLimitMessage')?.replace('{seconds}', data.retryAfter.toString()) || `Too many requests. Please try again in ${data.retryAfter} seconds.`;
          toast.error(errorMessage);
          setIsVerifying(false);
          return;
        } else {
          throw new Error(data.error || 'Failed to send OTP');
        }
      }

      setIsVerifying(false);
      setStep('verify');
      setRateLimitCountdown(null);
      setCodeSentViaWhatsApp(true);
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

  const handleEmailSubmit = async () => {
    if (!email) return;
    
    setIsVerifying(true);
    
    try {
      // Use Supabase signInWithOtp for email OTP
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}&type=customer`,
        },
      });

      if (error) throw error;

      setIsVerifying(false);
      setStep('verify');
      setCodeSentViaWhatsApp(false);
      toast.success(t('auth.codeSentToEmail')?.replace('{email}', email) || `Verification code sent to ${email}`);
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
      if (loginMethod === 'email') {
        // Verify email OTP using Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          email: email,
          token: code,
          type: 'email',
        });

        if (error) throw error;

        // Get user info from Supabase session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Failed to get user information');
        }

        // For email login, we need to create/update customer session
        // Check if customer exists by email
        try {
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success && sessionData.session) {
            const session = sessionData.session;
            // Try to find customer by email
            const customerResponse = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
            const customerData = await customerResponse.json();
            
            if (customerData.success && customerData.customer) {
              const existingCustomer = customerData.customer;
              const welcomeMessage = t('auth.welcomeBack')?.replace('{{name}}', existingCustomer.name) || `Welcome back, ${existingCustomer.name}!`;
              toast.success(welcomeMessage);
              onSuccess({
                phone: existingCustomer.phone || '',
                name: existingCustomer.name,
                email: existingCustomer.email || email,
                customerId: existingCustomer.id,
                businessId: session.businessId,
              });
              onClose();
            } else {
              // New customer - proceed to registration
              setFormData({
                ...formData,
                email: email,
              });
              toast.info(t('auth.customerNotFound') || 'Please complete your registration');
              setStep('register');
            }
          } else {
            throw new Error('Session not found');
          }
        } catch (error) {
          console.error('Error checking customer:', error);
          toast.info(t('auth.customerNotFound') || 'Please complete your registration');
          setStep('register');
        }
      } else {
        // Phone OTP verification (existing flow)
        // Remove dashes for API call (keep only digits)
        const cleanPhone = phone.replace(/\D/g, '');
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
            code: code,
            userType: 'customer',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify code');
        }

        // Session is automatically created and stored in cookie
        // The API returns the customer session
        const session = data.session;

        // Check if customer exists in the database by phone number
        try {
          const existingCustomer = await getCustomerByPhone(cleanPhone);
          
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
      }

      setIsVerifying(false);
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

  // Handle Google OAuth - use redirect flow (same page)
  const handleGoogleLogin = async () => {
    try {
      setIsOAuthLoading(true);
      
      // Use redirect flow (same page)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}&type=customer`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setIsOAuthLoading(false);
    }
  };

  // Handle Facebook OAuth
  const handleFacebookLogin = async () => {
    try {
      setIsOAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}&type=customer`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Facebook login');
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
              {/* Email/Phone Tabs */}
              <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as 'phone' | 'email')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone">{t('auth.phone') || 'Phone'}</TabsTrigger>
                  <TabsTrigger value="email">{t('auth.email') || 'Email'}</TabsTrigger>
                </TabsList>
                <TabsContent value="phone" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="phone" className={isRTL ? 'text-right block' : 'text-left block'}>
                      {t('auth.phoneNumber')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setPhone(formatted);
                      }}
                      placeholder={t('auth.phonePlaceholder') || '050-123-4567'}
                      dir="ltr"
                      className="mt-2"
                      maxLength={12}
                    />
                  </div>
                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={!phone || isVerifying || isOAuthLoading}
                    className="w-full"
                    style={primaryColor ? {
                      backgroundColor: primaryColor,
                      color: '#ffffff',
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (primaryColor && !e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = darkenColor(primaryColor);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (primaryColor) {
                        e.currentTarget.style.backgroundColor = primaryColor;
                      }
                    }}
                  >
                    <span dir={isRTL ? 'rtl' : 'ltr'}>
                      {isVerifying ? formatLoadingText(t('auth.sending')) : t('auth.sendCode')}
                    </span>
                  </Button>
                </TabsContent>
                <TabsContent value="email" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email" className={isRTL ? 'text-right block' : 'text-left block'}>
                      {t('auth.email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                      dir="ltr"
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleEmailSubmit}
                    disabled={!email || isVerifying || isOAuthLoading}
                    className="w-full"
                    style={primaryColor ? {
                      backgroundColor: primaryColor,
                      color: '#ffffff',
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (primaryColor && !e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = darkenColor(primaryColor);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (primaryColor) {
                        e.currentTarget.style.backgroundColor = primaryColor;
                      }
                    }}
                  >
                    <span dir={isRTL ? 'rtl' : 'ltr'}>
                      {isVerifying ? formatLoadingText(t('auth.sending')) : t('auth.sendCode')}
                    </span>
                  </Button>
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
                  className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                  onClick={handleFacebookLogin}
                  disabled={isOAuthLoading || isVerifying}
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
              {/* Success message with email/phone */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300" dir={isRTL ? 'rtl' : 'ltr'}>
                  {loginMethod === 'phone' 
                    ? (codeSentViaWhatsApp 
                        ? (locale === 'he' 
                            ? `קוד נשלח אל ${phone} ב-WhatsApp`
                            : locale === 'ar'
                            ? `تم إرسال الكود إلى ${phone} عبر WhatsApp`
                            : `Code sent to ${phone} via WhatsApp`)
                        : (t('auth.codeSentTo')?.replace('{phone}', phone) || `Code sent to ${phone}`))
                    : (t('auth.codeSentToEmail')?.replace('{email}', email) || `Verification code sent to ${email}`)
                  }
                </p>
              </div>
              
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
                {loginMethod === 'phone' && codeSentViaWhatsApp && (
                  <p className={`text-xs text-muted-foreground mt-2 text-center ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {locale === 'he' 
                      ? 'הזן את הקוד שקיבלת ב-WhatsApp'
                      : locale === 'ar'
                      ? 'أدخل الرمز الذي استلمته على WhatsApp'
                      : 'Enter the code you received on WhatsApp'}
                  </p>
                )}
              </div>
                  <Button
                    onClick={handleVerifyCode}
                    disabled={(code.length !== 4 && code.length !== 6) || isVerifying}
                    className="w-full"
                    style={primaryColor ? {
                      backgroundColor: primaryColor,
                      color: '#ffffff',
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (primaryColor && !e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = darkenColor(primaryColor);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (primaryColor) {
                        e.currentTarget.style.backgroundColor = primaryColor;
                      }
                    }}
                  >
                    <span dir={isRTL ? 'rtl' : 'ltr'}>
                      {isVerifying ? formatLoadingText(t('auth.verifying')) : t('auth.verify')}
                    </span>
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
                <div className={`flex flex-col sm:flex-row gap-2 mt-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                  {/* Year Select */}
                  <select
                    id="birthYear"
                    value={formData.birthYear}
                    onChange={(e) => {
                      const value = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="">{t('auth.year') || 'Year'}</option>
                    {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      );
                    })}
                  </select>

                  {/* Month Select */}
                  <select
                    id="birthMonth"
                    value={formData.birthMonth}
                    onChange={(e) => {
                      const value = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="">{t('auth.month') || 'Month'}</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      let localeString = 'en-US';
                      if (locale === 'he') localeString = 'he-IL';
                      else if (locale === 'ar') localeString = 'ar-SA';
                      const monthName = new Date(2000, month - 1, 1).toLocaleDateString(localeString, { month: 'long' });
                      return (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                          {monthName}
                        </option>
                      );
                    })}
                  </select>

                  {/* Day Select */}
                  <select
                    id="birthDay"
                    value={formData.birthDay}
                    onChange={(e) => {
                      const day = e.target.value;
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
                    className="w-full sm:flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <option value="">{t('auth.day') || 'Day'}</option>
                    {(() => {
                      // If year and month are selected, show correct days for that month
                      if (formData.birthYear && formData.birthMonth) {
                        const year = parseInt(formData.birthYear);
                        const month = parseInt(formData.birthMonth);
                        const daysInMonth = new Date(year, month, 0).getDate();
                        return Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          return (
                            <option key={day} value={day.toString().padStart(2, '0')}>
                              {day}
                            </option>
                          );
                        });
                      } else {
                        // If year/month not selected, show 1-31 as default
                        return Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          return (
                            <option key={day} value={day.toString().padStart(2, '0')}>
                              {day}
                            </option>
                          );
                        });
                      }
                    })()}
                  </select>
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

              {/* Only show email field if user logged in with email method */}
              {loginMethod === 'email' && (
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
              )}

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
                style={primaryColor ? {
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                } : undefined}
                onMouseEnter={(e) => {
                  if (primaryColor && !e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = darkenColor(primaryColor);
                  }
                }}
                onMouseLeave={(e) => {
                  if (primaryColor) {
                    e.currentTarget.style.backgroundColor = primaryColor;
                  }
                }}
              >
                <span dir={isRTL ? 'rtl' : 'ltr'}>
                  {isRegistering ? formatLoadingText(t('auth.registering')) : t('auth.completeRegistration')}
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

