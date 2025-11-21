import { useState, useEffect, useRef } from "react";
import { LoadingButton } from "@/components/ported/ui/loading-button";
import { Card } from "@/components/ported/ui/card";
import { Input } from "@/components/ported/ui/input";
import { Label } from "@/components/ported/ui/label";
import { Button } from "@/components/ported/ui/button";
import { Checkbox } from "@/components/ported/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import { Scissors, Sparkles, Dumbbell, Briefcase, Trash2, Plus, Heart, Palette, Waves, Activity, HeartPulse, Users, Apple, Home, Check } from "lucide-react";
import { useToast } from "@/components/ported/ui/use-toast";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLocale } from "@/components/ported/hooks/useLocale";
import { TypingAnimation } from "@/components/ui/TypingAnimation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Footer } from "@/components/ui/Footer";
import { getDefaultServices } from "@/lib/onboarding/utils";
import type { BusinessType } from "@/lib/supabase/database.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ported/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ported/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import en from "@/messages/en.json";
import he from "@/messages/he.json";
import ar from "@/messages/ar.json";
import ru from "@/messages/ru.json";

type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  price: number;
};

const Onboarding = () => {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    englishName: "",
    email: "",
    phone: "",
    address: "",
    previousCalendarType: "" as 'appointment_scheduling_app' | 'paper_calendar' | 'google_phone_calendar' | 'not_using_calendar' | '',
  });
  const [ownerName, setOwnerName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [useAnotherAccount, setUseAnotherAccount] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{email: string, phone: string, name: string} | null>(null);
  // Authentication state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{phone?: string, email?: string, name?: string} | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [planDetails, setPlanDetails] = useState<{name: string, price: number, symbol: string} | null>(null);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [allPlans, setAllPlans] = useState<Array<{name: string, price: number, symbol: string, key: string}>>([]);
  const [errors, setErrors] = useState<{
    name?: string;
    englishName?: string;
    email?: string;
    phone?: string;
    ownerName?: string;
    services?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    englishName?: boolean;
    email?: boolean;
    phone?: boolean;
    ownerName?: boolean;
  }>({});
  const router = useRouter();
  const { toast } = useToast();
  const { locale, t, dir, isRTL } = useLocale();
  const lastBusinessTypeRef = useRef<BusinessType | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  // Helper function to get nested values from translations
  const getTranslation = (key: string): any => {
    try {
      const keys = key.split('.');
      const messages = { en, he, ar, ru }[locale] || en;
      let value: any = messages;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
      return value !== undefined ? value : null;
    } catch {
      return null;
    }
  };

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

  // Convert E.164 format (+972540000000) to display format (050-000-0000)
  const formatPhoneForDisplay = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // If it starts with country code (972 for Israel), remove it
    if (digits.startsWith('972') && digits.length > 10) {
      digits = '0' + digits.substring(3);
    }
    
    // Limit to 10 digits and format
    const limited = digits.slice(-10); // Take last 10 digits
    
    // Format as XXX-XXX-XXXX
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  // Handle OTP send
  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t('onboarding.auth.phoneRequired') || 'Phone number is required');
      return;
    }

    // Remove dashes for API call
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error(t('onboarding.auth.invalidPhone') || 'Please enter a valid phone number');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setShowOtpModal(true);
      setOtpCountdown(30);
      setOtpCode('');
      setOtpDigits(['', '', '', '', '', '']);
      toast.success(t('onboarding.auth.otpSent') || 'OTP code sent successfully');
      // Focus first OTP input after modal opens
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    
    await handleSendOtp();
  };

  // Handle enter other number
  const handleEnterOtherNumber = () => {
    setShowOtpModal(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpCountdown(0);
    // Focus on phone input
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  };

  // Handle OTP digit change
  const handleOtpDigitChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Update otpCode for API
    const code = newDigits.join('');
    setOtpCode(code);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (code.length === 6) {
      handleVerifyOtp(code);
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
    setOtpCode(pastedData);
    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    } else {
      otpInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // Handle OTP verify
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (!code || code.length !== 6) {
      if (!codeToVerify) {
        toast.error(t('onboarding.auth.otpRequired') || 'OTP code is required');
      }
      return;
    }

    // Remove dashes for API call
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    setVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-otp-homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          code: code,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP code');
      }

      setOtpVerified(true);
      // Handle both existing user and new user cases
      if (data.isNewUser) {
        // New user - just set phone, they'll register during onboarding
        setAuthenticatedUser({ phone: phoneNumber });
        setBusinessInfo(prev => ({ ...prev, phone: phoneNumber }));
      } else {
        // Existing user - set all user data
        const userPhone = data.user?.phone || phoneNumber;
        setAuthenticatedUser({ 
          phone: userPhone,
          email: data.user?.email,
          name: data.user?.name,
        });
        // Format phone for display (remove country code, add dashes)
        const displayPhone = formatPhoneForDisplay(userPhone);
        setBusinessInfo(prev => ({ 
          ...prev, 
          phone: displayPhone,
          email: data.user?.email || prev.email,
        }));
        if (data.user?.name) {
          setOwnerName(data.user.name);
        }
      }
      setShowOtpModal(false);
      toast.success(t('onboarding.auth.verified') || 'Phone number verified');
      // Automatically move to step 2 after successful authentication
      setTimeout(() => {
        setStep(2);
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP code');
      // Clear OTP on error
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifyingOtp(false);
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

  // Focus first OTP input when modal opens
  useEffect(() => {
    if (showOtpModal && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [showOtpModal]);

  // Handle Google OAuth with popup
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      // Get the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding&popup=true`,
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
          setLoading(false);

          // Get the session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session?.user) {
            toast.error('Failed to get session after authentication');
            return;
          }

          // Set authenticated user data
          const userEmail = session.user.email || '';
          const userPhone = session.user.phone || '';
          const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          
          setAuthenticatedUser({
            email: userEmail,
            phone: userPhone,
            name: userName,
          });
          
          if (userPhone) {
            const displayPhone = formatPhoneForDisplay(userPhone);
            setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
          }
          if (userEmail) {
            setBusinessInfo(prev => ({ ...prev, email: userEmail }));
          }
          if (userName) {
            setOwnerName(userName);
          }
          setOtpVerified(true);
          toast.success(t('onboarding.auth.verified') || 'Successfully authenticated with Google');
          
          // Continue to step 2
          setTimeout(() => {
            setStep(2);
          }, 500);
        } else if (event.data.type === 'OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          popup.close();
          setLoading(false);
          toast.error(event.data.error || 'Authentication failed');
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup is closed manually
      checkClosedInterval = setInterval(() => {
        if (popup.closed) {
          if (checkClosedInterval) clearInterval(checkClosedInterval);
          window.removeEventListener('message', messageListener);
          setLoading(false);
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setLoading(false);
    }
  };

  // Handle Apple OAuth
  const handleAppleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Apple login');
    }
  };

  // Read plan from URL params on mount
  useEffect(() => {
    const planParam = searchParams.get('plan');
    const validPlans = ['basic', 'professional', 'business'];
    if (planParam && validPlans.includes(planParam.toLowerCase())) {
      setSelectedPlan(planParam.toLowerCase());
    } else {
      // Default to 'basic' if no plan or invalid plan provided
      setSelectedPlan('basic');
    }
  }, [searchParams]);

  // Fetch plan details and all plans
  useEffect(() => {
    const fetchPlanDetails = async () => {
      setLoadingPlanDetails(true);
      try {
        const response = await fetch(`/api/pricing?locale=${locale}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.pricing) {
            // Set current plan details
            const currentPlanData = data.pricing[selectedPlan];
            if (currentPlanData) {
              setPlanDetails({
                name: selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1),
                price: currentPlanData.price,
                symbol: currentPlanData.symbol,
              });
            }
            // Set all plans for modal
            const plansArray = [
              { key: 'basic', ...data.pricing.basic },
              { key: 'professional', ...data.pricing.professional },
              { key: 'business', ...data.pricing.business },
            ];
            setAllPlans(plansArray);
          }
        }
      } catch (error) {
      } finally {
        setLoadingPlanDetails(false);
      }
    };
    fetchPlanDetails();
  }, [selectedPlan, locale]);

  // Check if user is authenticated via OAuth or existing session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for verified phone from homepage login (notRegistered flow)
        // Stored in sessionStorage to avoid URL params
        const verifiedPhone = sessionStorage.getItem('homepage_verified_phone');
        if (verifiedPhone && step === 1 && !otpVerified) {
          // User came from homepage login - phone already verified
          const displayPhone = formatPhoneForDisplay(verifiedPhone);
          setPhoneNumber(displayPhone);
          setAuthenticatedUser({ phone: verifiedPhone });
          setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
          setOtpVerified(true);
          // Clear the sessionStorage after using it
          sessionStorage.removeItem('homepage_verified_phone');
          // Automatically move to step 2
          setTimeout(() => {
            setStep(2);
          }, 500);
          return;
        }

        // Check for OAuth callback
        const errorParam = searchParams.get('error');
        if (errorParam === 'oauth_error') {
          toast.error(t('onboarding.auth.oauthError') || 'Authentication failed. Please try again.');
        }

        // Check Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && !otpVerified) {
          // User authenticated via OAuth
          const userEmail = session.user.email || '';
          const userPhone = session.user.phone || '';
          const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          
          setAuthenticatedUser({
            email: userEmail,
            phone: userPhone,
            name: userName,
          });
          
          if (userPhone) {
            // Format phone for display (remove country code, add dashes)
            const displayPhone = formatPhoneForDisplay(userPhone);
            setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
          }
          if (userEmail) {
            setBusinessInfo(prev => ({ ...prev, email: userEmail }));
          }
          if (userName) {
            setOwnerName(userName);
          }
          setOtpVerified(true);
          // Automatically move to step 2 after OAuth authentication
          if (step === 1) {
            setTimeout(() => {
              setStep(2);
            }, 500);
          }
        }

        // Also check existing user profile API
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setIsLoggedIn(true);
            setLoggedInUser({
              email: data.user.email,
              phone: data.user.phone || '',
              name: data.user.name,
            });
            if (!authenticatedUser) {
              setAuthenticatedUser({
                email: data.user.email,
                phone: data.user.phone || '',
                name: data.user.name,
              });
              setBusinessInfo(prev => ({
                ...prev,
                email: data.user.email,
                phone: data.user.phone || '',
              }));
              setOwnerName(data.user.name);
              setOtpVerified(true);
            }
          }
        }
      } catch (error) {
        // User is not logged in, continue normally
      }
    };
    checkAuth();
  }, [searchParams, otpVerified]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Scroll to continue button when business type is selected on step 3
  useEffect(() => {
    if (step === 3 && businessType && continueButtonRef.current) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [businessType, step]);

  // Load default services when business type is selected and moving to step 4
  useEffect(() => {
    if (businessType && step === 4) {
      // Always reload services when business type changes or when locale changes
      // Get translations for default services
      const servicesTranslations = getTranslation(`onboarding.services.defaultServices.${businessType}`);
      const defaultServices = getDefaultServices(businessType, servicesTranslations ? {
        [businessType]: servicesTranslations
      } : undefined);
      
      // Update if business type changed, services are empty, or locale changed
      if (lastBusinessTypeRef.current !== businessType || services.length === 0) {
        // Initial load - set all default services
        setServices(
          defaultServices.map((service, index) => ({
            id: `default-${index}`,
            ...service,
          }))
        );
        lastBusinessTypeRef.current = businessType;
      } else if (lastBusinessTypeRef.current === businessType && services.length > 0) {
        // Locale changed - update services that match default structure with new translations
        // Preserve user edits by checking if service still matches default structure
        const updatedServices = services.map((existingService, index) => {
          const defaultService = defaultServices[index];
          if (!defaultService) return existingService;
          
          // Check if service matches default structure (user hasn't edited it)
          // Compare by checking if it's still one of the default services
          const matchesDefault = services.length === defaultServices.length && 
            existingService.duration === defaultService.duration &&
            existingService.price === defaultService.price;
          
          if (matchesDefault) {
            // Service matches default - update with new translation
            return {
              ...existingService,
              name: defaultService.name,
              description: defaultService.description,
              category: defaultService.category,
            };
          }
          
          // Service has been edited - keep user's version
          return existingService;
        });
        
        setServices(updatedServices);
      }
    }
  }, [businessType, step, locale]);

  const businessTypes = [
    {
      id: "barbershop" as BusinessType,
      icon: Scissors,
      title: t('onboarding.chooseBusinessType.businessTypes.barbershop.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.barbershop.description'),
      category: 'beauty_aesthetics',
    },
    {
      id: "beauty_salon" as BusinessType,
      icon: Heart,
      title: t('onboarding.chooseBusinessType.businessTypes.beauty_salon.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.beauty_salon.description'),
      category: 'beauty_aesthetics',
    },
    {
      id: "makeup_artist" as BusinessType,
      icon: Palette,
      title: t('onboarding.chooseBusinessType.businessTypes.makeup_artist.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.makeup_artist.description'),
      category: 'beauty_aesthetics',
    },
    {
      id: "gym_trainer" as BusinessType,
      icon: Dumbbell,
      title: t('onboarding.chooseBusinessType.businessTypes.gym_trainer.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.gym_trainer.description'),
      category: 'fitness_wellness',
    },
    {
      id: "spa" as BusinessType,
      icon: Waves,
      title: t('onboarding.chooseBusinessType.businessTypes.spa.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.spa.description'),
      category: 'fitness_wellness',
    },
    {
      id: "pilates_studio" as BusinessType,
      icon: Activity,
      title: t('onboarding.chooseBusinessType.businessTypes.pilates_studio.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.pilates_studio.description'),
      category: 'fitness_wellness',
    },
    {
      id: "physiotherapy" as BusinessType,
      icon: HeartPulse,
      title: t('onboarding.chooseBusinessType.businessTypes.physiotherapy.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.physiotherapy.description'),
      category: 'fitness_wellness',
    },
    {
      id: "life_coach" as BusinessType,
      icon: Users,
      title: t('onboarding.chooseBusinessType.businessTypes.life_coach.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.life_coach.description'),
      category: 'personal_care_coaching',
    },
    {
      id: "dietitian" as BusinessType,
      icon: Apple,
      title: t('onboarding.chooseBusinessType.businessTypes.dietitian.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.dietitian.description'),
      category: 'personal_care_coaching',
    },
    {
      id: "nail_salon" as BusinessType,
      icon: Sparkles,
      title: t('onboarding.chooseBusinessType.businessTypes.nail_salon.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.nail_salon.description'),
      category: 'beauty_aesthetics',
    },
    {
      id: "other" as BusinessType,
      icon: Briefcase,
      title: t('onboarding.chooseBusinessType.businessTypes.other.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.other.description'),
      category: 'other',
    },
  ];

  // Filter business types by selected category, always include "other" option at the end
  const otherType = businessTypes.find(type => type.id === 'other');
  const filteredBusinessTypes = (() => {
    if (selectedCategory === 'all') {
      return businessTypes;
    }
    
    // Get business types for the selected category, excluding "other"
    const categoryTypes = businessTypes.filter(
      type => type.category === selectedCategory && type.id !== 'other'
    );
    
    // Always add "other" at the end if it exists
    return otherType ? [...categoryTypes, otherType] : categoryTypes;
  })();

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    // Remove all non-digit characters except + at the start
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Phone should have at least 7 digits (international format) or start with +
    // Allow formats like: +1234567890, 1234567890, etc.
    return cleaned.length >= 7 && (cleaned.startsWith('+') ? cleaned.length >= 8 : cleaned.length >= 7);
  };

  // Validate a specific field and return error message
  const getFieldError = (field: 'name' | 'englishName' | 'email' | 'phone' | 'ownerName', value: string): string | undefined => {
    if (field === 'name') {
      if (!value.trim()) {
        return t('onboarding.errors.fillRequiredFields');
      }
    } else if (field === 'englishName') {
      if (!value.trim()) {
        return t('onboarding.errors.fillRequiredFields');
      }
      // Validate English name contains only English characters
      const englishRegex = /^[a-zA-Z0-9\s\-_]+$/;
      if (!englishRegex.test(value.trim())) {
        return t('onboarding.errors.invalidEnglishName');
      }
    } else if (field === 'email') {
      if (!value.trim()) {
        return t('onboarding.errors.fillRequiredFields');
      } else if (!validateEmail(value)) {
        return t('onboarding.errors.invalidEmail');
      }
    } else if (field === 'phone') {
      if (!value.trim()) {
        return t('onboarding.errors.fillRequiredFields');
      } else if (!validatePhone(value)) {
        return t('onboarding.errors.invalidPhone');
      }
    } else if (field === 'ownerName') {
      if (!value.trim()) {
        return t('onboarding.errors.ownerNameRequired') || t('onboarding.errors.fillRequiredFields');
      }
    }
    return undefined;
  };

  // Validate a specific field and update errors state
  const validateField = (field: 'name' | 'englishName' | 'email' | 'phone' | 'ownerName', value: string) => {
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      const error = getFieldError(field, value);
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  // Handle field blur
  const handleBlur = (field: 'name' | 'englishName' | 'email' | 'phone' | 'ownerName') => {
    setTouched({ ...touched, [field]: true });
    if (field === 'ownerName') {
      validateField('ownerName', ownerName);
    } else {
      validateField(field, businessInfo[field]);
    }
  };

  // Handle field change
  const handleFieldChange = (field: 'name' | 'englishName' | 'email' | 'phone', value: string) => {
    setBusinessInfo({ ...businessInfo, [field]: value });
    // Only validate if field has been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleNext = async () => {
    // Step 1: Authentication - check if user is authenticated
    if (step === 1) {
      if (!otpVerified && !authenticatedUser) {
        toast.error(t('onboarding.auth.pleaseAuthenticate') || 'Please authenticate to continue');
        return;
      }
    }
    // Step 2: Business info - validate required fields
    if (step === 2) {
      setTouched({ name: true, phone: true });
      
      const newErrors: typeof errors = {};
      const nameError = getFieldError('name', businessInfo.name);
      const phoneError = getFieldError('phone', businessInfo.phone);
      
      if (nameError) newErrors.name = nameError;
      if (phoneError) newErrors.phone = phoneError;
      
      setErrors(newErrors);
      
      if (Object.keys(newErrors).length > 0) {
        toast.error(t('onboarding.errors.fillRequiredFields'));
        return;
      }
    }
    // Step 3: Business type - check if selected
    if (step === 3 && !businessType) {
      toast.error(t('onboarding.errors.selectBusinessType'));
      return;
    }
    // Step 4: Services - validate services
    if (step === 4) {
      if (services.length === 0) {
        setErrors({ services: t('onboarding.errors.atLeastOneService') });
        toast.error(t('onboarding.errors.atLeastOneService'));
        return;
      }
      const invalidServices = services.filter(
        (s) => !s.name.trim() || s.duration <= 0 || s.price < 0
      );
      if (invalidServices.length > 0) {
        setErrors({ services: t('onboarding.errors.invalidService') });
        toast.error(t('onboarding.errors.invalidService'));
        return;
      }
    }
    // Step 5: Plan confirmation - move to final step
    if (step === 5) {
      setErrors({});
      setStep(6);
    } else if (step < 6) {
      // Clear errors when moving to next step
      setErrors({});
      setStep(step + 1);
    } else {
      // Complete onboarding - submit to API
      setLoading(true);
      try {
        // Convert phone to E.164 format for API (remove dashes, add country code if needed)
        let phoneForApi = businessInfo.phone || authenticatedUser?.phone || '';
        if (phoneForApi) {
          // Remove dashes and spaces
          const digits = phoneForApi.replace(/\D/g, '');
          // If it's 9 digits (Israeli number without leading 0), add 0
          // If it's 10 digits starting with 0, convert to E.164 (+972)
          if (digits.length === 9) {
            phoneForApi = '+972' + digits;
          } else if (digits.length === 10 && digits.startsWith('0')) {
            phoneForApi = '+972' + digits.substring(1);
          } else if (digits.length === 10 && !digits.startsWith('0')) {
            // Already 10 digits without 0, assume it's Israeli and add +972
            phoneForApi = '+972' + digits;
          } else if (!phoneForApi.startsWith('+')) {
            // If it doesn't start with +, try to add country code
            phoneForApi = '+972' + digits;
          }
        }
        
        const response = await fetch('/api/onboarding/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType,
            businessInfo: {
              ...businessInfo,
              phone: phoneForApi, // Send E.164 format to API
            },
            services: services.map(({ id, ...service }) => service),
            ownerName,
            useAnotherAccount,
            plan: selectedPlan || 'basic',
            adminUser: {
              email: businessInfo.email || authenticatedUser?.email || '',
              name: ownerName || authenticatedUser?.name || '',
              phone: phoneForApi, // Send E.164 format to API
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || 'Failed to create business';
          throw new Error(errorMessage);
        }

        const result = await response.json();
        toast.success(t('onboarding.success.businessSetup'));
        // Redirect to user dashboard
        // Use window.location for full page reload to ensure cookie is picked up
        setTimeout(() => {
          window.location.href = '/user/dashboard';
        }, 2000);
      } catch (error: any) {
        // Check if error message matches phone number error and use translation
        const errorMessage = error.message || '';
        let displayMessage = errorMessage;
        if (errorMessage.includes('Phone number already registered') || errorMessage.includes('phone number already')) {
          displayMessage = t('onboarding.errors.phoneAlreadyRegistered') || errorMessage;
        } else if (!errorMessage) {
          displayMessage = t('onboarding.errors.setupFailed');
        }
        toast.error(displayMessage);
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      // Clear errors when going back
      setErrors({});
      setTouched({});
      setStep(step - 1);
    }
  };

  // Handle start over - clear all session data and reset to step 1
  const handleStartOver = async () => {
    try {
      // Save current locale before clearing cookies
      const currentLocale = locale;
      const localeStorageKey = 'bookinghub-locale';
      const localeCookieKey = 'locale';
      
      // Preserve locale in localStorage (it should already be there, but ensure it)
      if (currentLocale) {
        localStorage.setItem(localeStorageKey, currentLocale);
      }
      
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear specific cookies (admin_session and any auth cookies, but NOT locale)
      const cookiesToClear = ['admin_session', 'sb-access-token', 'sb-refresh-token'];
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      });
      
      // Clear all cookies except locale
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        // Skip locale cookie
        if (cookieName !== localeCookieKey) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      });
      
      // Restore locale cookie after clearing others
      if (currentLocale) {
        document.cookie = `${localeCookieKey}=${currentLocale}; path=/; max-age=31536000; SameSite=Lax`;
      }
      
      // Clear all state
      setStep(1);
      setBusinessType(null);
      setBusinessInfo({
        name: "",
        englishName: "",
        email: "",
        phone: "",
        address: "",
        previousCalendarType: "",
      });
      setOwnerName("");
      setServices([]);
      setPhoneNumber("");
      setOtpCode("");
      setOtpDigits(['', '', '', '', '', '']);
      setOtpSent(false);
      setOtpVerified(false);
      setAuthenticatedUser(null);
      setShowOtpModal(false);
      setOtpCountdown(0);
      setErrors({});
      setTouched({});
      setSelectedPlan('basic');
      setIsLoggedIn(false);
      setUseAnotherAccount(false);
      setLoggedInUser(null);
      
      // Clear URL params and reload to ensure clean state
      router.replace('/onboarding');
      
      // Small delay to ensure state is cleared before showing message
      setTimeout(() => {
        toast.success(t('onboarding.startOver.success') || 'Starting over... Please login again.');
        // Reload page to ensure all state is cleared
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error starting over:', error);
      toast.error(t('onboarding.startOver.error') || 'Failed to start over. Please refresh the page.');
      // Force reload even on error
      window.location.reload();
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-background flex flex-col p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl">
        {/* Header with Main Page Button, Progress Bar, and Language Toggle */}
        <PageHeader 
          homepageButtonText={t('onboarding.buttons.mainPage') || 'Main Page'}
          homepageHref="/"
        />
        
        {/* Plan Banner */}
        {planDetails && step < 5 && step > 1 && (
          <Card className="mb-6 p-4 border-primary/20">
            <div className="flex items-center justify-between" dir={dir}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('onboarding.selectedPlan') || 'Selected Plan'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">
                      {planDetails.name}
                    </span>
                    {planDetails.price > 0 && (
                      <span className="text-muted-foreground">
                        {planDetails.symbol}{planDetails.price}
                        {t('home.pricing.month') || '/month'}
                      </span>
                    )}
                    {selectedPlan === 'basic' && (
                      <span className="text-xs text-primary font-semibold">
                        {t('home.pricing.monthlyNote')?.split('.')[0] || '14 Days Free Trial'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlanModal(true)}
              >
                {t('onboarding.changePlan') || 'Change Plan'}
              </Button>
            </div>
          </Card>
        )}
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">{t('onboarding.stepOf').replace('{step}', step.toString()).replace('{total}', '6')}</span>
              <span className="text-sm text-muted-foreground">{Math.round((step / 6) * 100)}% {t('onboarding.complete')}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 shadow-card">
          {step === 1 && (
            <div className="animate-fade-in">
              {/* Welcome Message */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">{t('onboarding.auth.welcome') || t('onboarding.auth.title') || 'Get Started'}</h2>
              </div>
              
              {!otpVerified && !authenticatedUser ? (
                <div className="space-y-6 max-w-md mx-auto">
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
                        id="phone-number"
                        type="tel"
                        placeholder={t('onboarding.auth.phonePlaceholder') || t('onboarding.auth.phoneNumber') || 'Phone Number'}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && phoneNumber.replace(/\D/g, '').length >= 10 && !sendingOtp) {
                            handleSendOtp();
                          }
                        }}
                        maxLength={12}
                        disabled={otpSent}
                        className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base`}
                        dir={dir}
                      />
                    </div>

                    <LoadingButton
                      onClick={handleSendOtp}
                      loading={sendingOtp}
                      disabled={!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 10}
                      className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                    >
                      {t('onboarding.auth.login') || t('onboarding.auth.sendOtp') || 'Login'}
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
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t('onboarding.auth.authenticated') || 'Authenticated!'}
                  </h3>
                  <p className="text-muted-foreground">
                    {authenticatedUser?.phone && t('onboarding.auth.phoneVerified')?.replace('{phone}', authenticatedUser.phone) || 
                     authenticatedUser?.email && t('onboarding.auth.emailVerified')?.replace('{email}', authenticatedUser.email) ||
                     t('onboarding.auth.readyToContinue') || 'You\'re ready to continue'}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.businessInfo.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('onboarding.businessInfo.subtitle')}</p>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name">{t('onboarding.businessInfo.name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('onboarding.businessInfo.namePlaceholder')}
                    value={businessInfo.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    dir={dir}
                    className={`mt-2 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ownerName">{t('onboarding.businessInfo.ownerName') || 'Business Owner Name'}</Label>
                  <Input
                    id="ownerName"
                    placeholder={t('onboarding.businessInfo.ownerNamePlaceholder') || 'Enter owner name'}
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (touched.ownerName) {
                        validateField('ownerName', e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur('ownerName')}
                    dir={dir}
                    className={`mt-2 ${errors.ownerName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.ownerName && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address">{t('onboarding.businessInfo.address')}</Label>
                  <Input
                    id="address"
                    placeholder={t('onboarding.businessInfo.addressPlaceholder')}
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    dir={dir}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('onboarding.businessInfo.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('onboarding.businessInfo.emailPlaceholder') || 'Enter email address'}
                    value={businessInfo.email}
                    onChange={(e) => {
                      // Only allow changes if not authenticated via OAuth
                      if (!authenticatedUser?.email) {
                        handleFieldChange('email', e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur('email')}
                    disabled={!!authenticatedUser?.email}
                    dir="ltr"
                    className={`mt-2 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} ${authenticatedUser?.email ? 'bg-muted cursor-not-allowed' : ''}`}
                  />
                  {authenticatedUser?.email && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
                  )}
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">{t('onboarding.businessInfo.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('onboarding.businessInfo.phonePlaceholder')}
                    value={businessInfo.phone}
                    onChange={(e) => {
                      // Format as user types (only if not disabled)
                      if (!authenticatedUser?.phone) {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleFieldChange('phone', formatted);
                      }
                    }}
                    onBlur={() => handleBlur('phone')}
                    disabled={!!authenticatedUser?.phone}
                    dir="ltr"
                    className={`mt-2 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''} ${authenticatedUser?.phone ? 'bg-muted cursor-not-allowed' : ''}`}
                  />
                  {authenticatedUser?.phone && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
                  )}
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="previousCalendar">{t('onboarding.businessInfo.previousCalendar') || 'Which calendar did you use until now?'}</Label>
                  <Select
                    value={businessInfo.previousCalendarType}
                    onValueChange={(value) => setBusinessInfo({ ...businessInfo, previousCalendarType: value as typeof businessInfo.previousCalendarType })}
                  >
                    <SelectTrigger id="previousCalendar" className="mt-2" dir={dir}>
                      <SelectValue placeholder={t('onboarding.businessInfo.previousCalendarPlaceholder') || 'Select an option (optional)'} />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      <SelectItem value="appointment_scheduling_app">
                        {t('onboarding.businessInfo.calendarOptions.appointmentSchedulingApp') || 'Appointment scheduling application'}
                      </SelectItem>
                      <SelectItem value="paper_calendar">
                        {t('onboarding.businessInfo.calendarOptions.paperCalendar') || 'Paper calendar'}
                      </SelectItem>
                      <SelectItem value="google_phone_calendar">
                        {t('onboarding.businessInfo.calendarOptions.googlePhoneCalendar') || 'Google/Phone calendar'}
                      </SelectItem>
                      <SelectItem value="not_using_calendar">
                        {t('onboarding.businessInfo.calendarOptions.notUsingCalendar') || 'Not using a calendar'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.businessInfo.previousCalendarHint') || 'This helps us understand your needs better (optional)'}</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.chooseBusinessType.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('onboarding.chooseBusinessType.subtitle')}</p>
              
              {/* Category Filter */}
              <div 
                className="mb-6 flex items-center gap-4"
                style={dir === 'rtl' ? { flexDirection: 'row', direction: 'rtl' } : { flexDirection: 'row' }}
                dir={dir}
              >
                <Label htmlFor="category-filter" className="whitespace-nowrap">
                  {t('onboarding.chooseBusinessType.filterByCategory')}:
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" className="w-[250px]" dir={dir}>
                    <SelectValue placeholder={t('onboarding.chooseBusinessType.allCategories')} />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    <SelectItem value="all">{t('onboarding.chooseBusinessType.allCategories')}</SelectItem>
                    <SelectItem value="beauty_aesthetics">{t('onboarding.chooseBusinessType.categories.beauty_aesthetics')}</SelectItem>
                    <SelectItem value="fitness_wellness">{t('onboarding.chooseBusinessType.categories.fitness_wellness')}</SelectItem>
                    <SelectItem value="personal_care_coaching">{t('onboarding.chooseBusinessType.categories.personal_care_coaching')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Microcopy based on selected category */}
              {selectedCategory !== 'all' && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    {t(`onboarding.chooseBusinessType.microcopy.${selectedCategory}`) || t('onboarding.chooseBusinessType.microcopy.default')}
                  </p>
                </div>
              )}

              {selectedCategory === 'all' && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    {t('onboarding.chooseBusinessType.microcopy.default')}
                  </p>
                </div>
              )}

              <div 
                className="grid md:grid-cols-2 gap-4"
                style={dir === 'rtl' ? { direction: 'rtl' } : undefined}
                dir={dir}
              >
                {filteredBusinessTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id)}
                    className={`group p-6 rounded-lg border-2 transition-all ${
                      businessType === type.id
                        ? "border-[#ff421c] bg-[#ff421c] text-white shadow-soft"
                        : "border-border hover:bg-[#030408] hover:text-white hover:border-[#030408]"
                    }`}
                    dir={dir}
                  >
                    <div className={`flex flex-col ${dir === 'rtl' ? 'items-start text-right' : 'items-start text-left'}`}>
                      <type.icon className={`w-8 h-8 mb-3 transition-colors ${
                        businessType === type.id 
                          ? "text-white" 
                          : "text-muted-foreground group-hover:text-white"
                      }`} />
                      <h3 className={`text-lg font-semibold mb-1 transition-colors ${
                        businessType === type.id 
                          ? "text-white" 
                          : "text-foreground group-hover:text-white"
                      }`}>{type.title}</h3>
                      <p className={`text-sm transition-colors ${
                        businessType === type.id 
                          ? "text-white" 
                          : "text-muted-foreground group-hover:text-white"
                      }`}>{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.services.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('onboarding.services.subtitle')}</p>
              <div className="space-y-4">
                {services.map((service, index) => (
                  <Card key={service.id} className="p-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setServices(services.filter((_, i) => i !== index));
                      }}
                      className={`absolute top-1 ${dir === 'rtl' ? 'left-1' : 'right-1'} text-destructive hover:text-white hover:bg-black z-10`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`service-name-${index}`}>{t('onboarding.services.name')}</Label>
                          <Input
                            id={`service-name-${index}`}
                            value={service.name}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setServices(updated);
                            }}
                            className="mt-2"
                            placeholder={t('onboarding.services.namePlaceholder')}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`service-category-${index}`}>{t('onboarding.services.category')}</Label>
                          <Input
                            id={`service-category-${index}`}
                            value={service.category}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[index] = { ...updated[index], category: e.target.value };
                              setServices(updated);
                            }}
                            className="mt-2"
                            placeholder={t('onboarding.services.categoryPlaceholder')}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`service-description-${index}`}>{t('onboarding.services.description')}</Label>
                          <Input
                            id={`service-description-${index}`}
                            value={service.description}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setServices(updated);
                            }}
                            className="mt-2"
                            placeholder={t('onboarding.services.descriptionPlaceholder')}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`service-duration-${index}`}>{t('onboarding.services.duration')}</Label>
                            <Input
                              id={`service-duration-${index}`}
                              type="number"
                              min="1"
                              value={service.duration}
                              onChange={(e) => {
                                const updated = [...services];
                                updated[index] = { ...updated[index], duration: parseInt(e.target.value) || 0 };
                                setServices(updated);
                              }}
                              className="mt-2"
                              placeholder={t('onboarding.services.durationPlaceholder')}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`service-price-${index}`}>{t('onboarding.services.price')}</Label>
                            <Input
                              id={`service-price-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={service.price}
                              onChange={(e) => {
                                const updated = [...services];
                                updated[index] = { ...updated[index], price: parseFloat(e.target.value) || 0 };
                                setServices(updated);
                              }}
                              className="mt-2"
                              placeholder={t('onboarding.services.pricePlaceholder')}
                            />
                          </div>
                        </div>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setServices([
                      ...services,
                      {
                        id: `new-${Date.now()}`,
                        name: '',
                        description: '',
                        category: '',
                        duration: 30,
                        price: 0,
                      },
                    ]);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('onboarding.services.addService')}
                </Button>
                {errors.services && (
                  <p className="text-sm text-red-500 mt-2">{errors.services}</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.planConfirmation.title') || 'Plan Confirmation'}</h2>
              <p className="text-muted-foreground mb-8">{t('onboarding.planConfirmation.subtitle') || 'Review your selected plan'}</p>
              
              {planDetails && (
                <div className="space-y-6">
                  {/* Plan Details Card */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{planDetails.name}</h3>
                        {planDetails.price > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-primary">
                              {planDetails.symbol}{planDetails.price}
                            </span>
                            <span className="text-muted-foreground">
                              {t('home.pricing.month') || '/month'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conditional Content Based on Plan */}
                    {selectedPlan === 'basic' ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h4 className="font-semibold text-primary">
                              {t('onboarding.planConfirmation.freeTrial') || '14 Days Free Trial'}
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('onboarding.planConfirmation.trialExplanation') || 'Start with 14 days free, no credit card required'}
                          </p>
                        </div>
                        {planDetails.price > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {t('onboarding.planConfirmation.afterTrial')?.replace('{price}', `${planDetails.symbol}${planDetails.price}`) || `After the trial period, you'll be charged ${planDetails.symbol}${planDetails.price} per month`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg border">
                          <h4 className="font-semibold mb-2">
                            {t('onboarding.planConfirmation.monthlyCharge') || 'Monthly Charge'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {t('onboarding.planConfirmation.chargedMonthly') || 'This amount will be charged monthly'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Plan Features Summary */}
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-3">
                        {t('onboarding.planConfirmation.planDetails') || 'Plan Details'}
                      </h4>
                      <ul className="space-y-2">
                        {(() => {
                          // Get all features, merging lower plans and replacing conflicts
                          let allFeatures: string[] = [];
                          
                          if (selectedPlan === 'business') {
                            // Business: Start with Basic + Professional, then add/override with Business
                            const basicFeatures = getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                            const professionalFeatures = getTranslation('home.pricing.plans.professional.highlights') as string[] || [];
                            const businessFeatures = getTranslation('home.pricing.plans.business.highlights') as string[] || [];
                            
                            // Start with Basic features (excluding "Everything in Basic" type items)
                            allFeatures = basicFeatures.filter(f => 
                              !f.toLowerCase().includes('everything in') && 
                              !f.includes('הכל בחבילת') &&
                              !f.includes('הכל ב')
                            );
                            
                            // Add Professional features, replacing conflicts
                            professionalFeatures.forEach(profFeature => {
                              if (profFeature.toLowerCase().includes('everything in') || 
                                  profFeature.includes('הכל בחבילת') ||
                                  profFeature.includes('הכל ב')) {
                                // Skip "Everything in Basic" placeholder
                                return;
                              }
                              // Check for conflicts (staff/workers, bookings, etc.)
                              // Check in both English and Hebrew
                              const isStaffFeature = profFeature.toLowerCase().includes('staff') || 
                                                    profFeature.toLowerCase().includes('employee') ||
                                                    profFeature.includes('עובד') ||
                                                    profFeature.includes('עובדים');
                              const isBookingFeature = profFeature.toLowerCase().includes('booking') ||
                                                      profFeature.includes('הזמנות');
                              
                              if (isStaffFeature) {
                                // Replace staff/worker feature - remove any feature mentioning workers/staff/employees
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('staff') || 
                                    f.toLowerCase().includes('employee') ||
                                    f.includes('עובד') ||
                                    f.includes('עובדים'))
                                );
                                allFeatures.push(profFeature);
                              } else if (isBookingFeature) {
                                // Replace booking feature
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                );
                                allFeatures.push(profFeature);
                              } else {
                                // Add new feature
                                allFeatures.push(profFeature);
                              }
                            });
                            
                            // Add Business features, replacing conflicts
                            businessFeatures.forEach(bizFeature => {
                              if (bizFeature.toLowerCase().includes('everything in') || 
                                  bizFeature.includes('הכל בחבילת') ||
                                  bizFeature.includes('הכל ב')) {
                                // Skip "Everything in Professional" placeholder
                                return;
                              }
                              // Check for conflicts
                              // Check in both English and Hebrew
                              const isStaffFeature = bizFeature.toLowerCase().includes('staff') || 
                                                    bizFeature.toLowerCase().includes('employee') ||
                                                    bizFeature.includes('עובד') ||
                                                    bizFeature.includes('עובדים');
                              const isBookingFeature = bizFeature.toLowerCase().includes('booking') ||
                                                      bizFeature.includes('הזמנות');
                              
                              if (isStaffFeature) {
                                // Replace staff/worker feature - remove any feature mentioning workers/staff/employees
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('staff') || 
                                    f.toLowerCase().includes('employee') ||
                                    f.includes('עובד') ||
                                    f.includes('עובדים'))
                                );
                                allFeatures.push(bizFeature);
                              } else if (isBookingFeature) {
                                // Replace booking feature
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                );
                                allFeatures.push(bizFeature);
                              } else {
                                // Add new feature
                                allFeatures.push(bizFeature);
                              }
                            });
                          } else if (selectedPlan === 'professional') {
                            // Professional: Start with Basic, then add/override with Professional
                            const basicFeatures = getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                            const professionalFeatures = getTranslation('home.pricing.plans.professional.highlights') as string[] || [];
                            
                            // Start with Basic features (excluding "Everything in Basic" type items)
                            allFeatures = basicFeatures.filter(f => 
                              !f.toLowerCase().includes('everything in') && 
                              !f.includes('הכל בחבילת') &&
                              !f.includes('הכל ב')
                            );
                            
                            // Add Professional features, replacing conflicts
                            professionalFeatures.forEach(profFeature => {
                              if (profFeature.toLowerCase().includes('everything in') || 
                                  profFeature.includes('הכל בחבילת') ||
                                  profFeature.includes('הכל ב')) {
                                // Skip "Everything in Basic" placeholder
                                return;
                              }
                              // Check for conflicts (staff/workers, bookings, etc.)
                              // Check in both English and Hebrew
                              const isStaffFeature = profFeature.toLowerCase().includes('staff') || 
                                                    profFeature.toLowerCase().includes('employee') ||
                                                    profFeature.includes('עובד') ||
                                                    profFeature.includes('עובדים');
                              const isBookingFeature = profFeature.toLowerCase().includes('booking') ||
                                                      profFeature.includes('הזמנות');
                              
                              if (isStaffFeature) {
                                // Replace staff/worker feature - remove any feature mentioning workers/staff/employees
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('staff') || 
                                    f.toLowerCase().includes('employee') ||
                                    f.includes('עובד') ||
                                    f.includes('עובדים'))
                                );
                                allFeatures.push(profFeature);
                              } else if (isBookingFeature) {
                                // Replace booking feature
                                allFeatures = allFeatures.filter(f => 
                                  !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                );
                                allFeatures.push(profFeature);
                              } else {
                                // Add new feature
                                allFeatures.push(profFeature);
                              }
                            });
                          } else {
                            // Basic: Show only Basic features
                            allFeatures = getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                          }
                          
                          return allFeatures.map((highlight: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{highlight}</span>
                            </li>
                          ));
                        })()}
                      </ul>
                    </div>
                  </Card>
                  {planDetails && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPlanModal(true)}
                      >
                        {t('onboarding.changePlan') || 'Change Plan'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#ff421c' }}>
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.almostThere.title')}</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {t('onboarding.almostThere.subtitle').replace('{businessType}', businessTypes.find(t => t.id === businessType)?.title || businessType?.replace('_', ' ') || '')}
              </p>
              <div className={`bg-muted/50 rounded-lg p-6 max-w-md mx-auto ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
                <h3 className={`font-semibold mb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('onboarding.almostThere.whatsBeingCreated')}</h3>
                <ul className={`space-y-2 text-sm text-muted-foreground ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
                  {(getTranslation('onboarding.almostThere.items') as string[] || []).map((item, i) => (
                    <li key={i} className="flex items-center gap-2" dir={dir}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step > 1 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step === 2 ? (
                <LoadingButton
                  variant="outline"
                  onClick={handleStartOver}
                  disabled={loading}
                >
                  {t('onboarding.buttons.startOver') || 'Start Over'}
                </LoadingButton>
              ) : (
                <LoadingButton
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  {t('onboarding.buttons.back')}
                </LoadingButton>
              )}
              <LoadingButton ref={continueButtonRef} onClick={handleNext} loading={loading}>
                {step === 6 ? t('onboarding.buttons.completeSetup') : t('onboarding.buttons.continue')}
              </LoadingButton>
            </div>
          )}
        </Card>
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('onboarding.auth.enterOtp') || 'Enter OTP Code'}</DialogTitle>
            <DialogDescription>
              {t('onboarding.auth.otpSentTo')?.replace('{phone}', phoneNumber) || `We sent a verification code to ${phoneNumber}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="otp-code-modal" className="block mb-3 text-center">
                {t('onboarding.auth.otpCode') || 'OTP Code'}
              </Label>
              <div className="flex gap-2 justify-center" dir="ltr">
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
                    className="h-14 w-14 text-center text-2xl font-semibold"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <LoadingButton
                onClick={() => handleVerifyOtp()}
                loading={verifyingOtp}
                disabled={otpCode.length !== 6}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
              >
                {t('onboarding.auth.verify') || 'Verify'}
              </LoadingButton>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t('onboarding.auth.didntReceiveCode') || "Didn't receive code?"}
                </span>
                <Button
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || sendingOtp}
                  className="h-auto p-0 text-primary"
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
              >
                {t('onboarding.auth.enterOtherNumber') || 'Enter other number'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Selection Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="max-w-4xl" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('onboarding.choosePlan') || 'Choose Your Plan'}</DialogTitle>
            <DialogDescription>
              {t('onboarding.choosePlanDescription') || 'Select the plan that best fits your business needs. You can change this anytime during setup.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {allPlans.map((plan) => {
              const planKey = plan.key;
              const isSelected = selectedPlan === planKey;
              const isProfessional = planKey === 'professional';
              const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
              const planHighlights = getTranslation(`home.pricing.plans.${planKey}.highlights`) as string[] || [];
              
              return (
                <Card
                  key={planKey}
                  className={`p-6 h-full flex flex-col relative transition-all ${
                    isSelected
                      ? 'border-2 border-primary'
                      : 'border hover:border-primary/50'
                  } ${isProfessional && !isSelected ? 'border-primary/30' : ''}`}
                >
                  {isProfessional && !isSelected && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        {t('home.pricing.bestSeller') || 'Best Seller'}
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold mb-2">{planName}</h3>
                    {planKey === 'basic' && (
                      <p className="text-xs font-semibold text-primary mb-2">
                        {t('home.pricing.monthlyNote')?.split('.')[0] || '14 Days Free Trial'}
                      </p>
                    )}
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-primary">
                        {plan.symbol}{plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground text-lg ml-1">
                          {t('home.pricing.month') || '/month'}
                        </span>
                      )}
                    </div>
                    {getTranslation(`home.pricing.plans.${planKey}.priceNote`) && (
                      <p className="text-xs text-muted-foreground mb-2" style={{ whiteSpace: 'pre-line' }}>
                        {getTranslation(`home.pricing.plans.${planKey}.priceNote`)}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-8 flex-grow">
                    {planHighlights.map((highlight: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button
                      className="w-full"
                      variant={isSelected ? 'default' : 'outline'}
                      size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(planKey);
                      setShowPlanModal(false);
                      // Scroll to bottom where continue button is (only on step 5)
                      if (step === 5) {
                        setTimeout(() => {
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }, 100);
                      }
                    }}
                    >
                      {isSelected
                        ? (t('onboarding.planSelected') || 'Selected')
                        : (getTranslation(`home.pricing.plans.${planKey}.cta`) || t('onboarding.selectPlan') || 'Select Plan')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Onboarding;
