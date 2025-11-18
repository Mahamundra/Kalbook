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
  });
  const [ownerName, setOwnerName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [useAnotherAccount, setUseAnotherAccount] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{email: string, phone: string, name: string} | null>(null);
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
  const dir = typeof document !== "undefined" ? (document.documentElement.dir as "ltr" | "rtl") : "ltr";
  const { locale, t } = useLocale();
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

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
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
            // Pre-fill email and phone
            setBusinessInfo(prev => ({
              ...prev,
              email: data.user.email,
              phone: data.user.phone || '',
            }));
            setOwnerName(data.user.name);
          }
        }
      } catch (error) {
        // User is not logged in, continue normally
      }
    };
    checkLoggedIn();
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Scroll to continue button when business type is selected on step 1
  useEffect(() => {
    if (step === 1 && businessType && continueButtonRef.current) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [businessType, step]);

  // Load default services when business type is selected and moving to step 2
  useEffect(() => {
    if (businessType && step === 2) {
      // Always reload services when business type changes or when locale changes
      // Get translations for default services
      const servicesTranslations = getTranslation(`onboarding.services.defaultServices.${businessType}`);
      const defaultServices = getDefaultServices(businessType, servicesTranslations ? {
        [businessType]: servicesTranslations
      } : undefined);
      
      // Only update if business type changed or services are empty
      // This prevents overwriting user edits when only locale changes
      if (lastBusinessTypeRef.current !== businessType || services.length === 0) {
        setServices(
          defaultServices.map((service, index) => ({
            id: `default-${index}`,
            ...service,
          }))
        );
        lastBusinessTypeRef.current = businessType;
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
    if (step === 1 && !businessType) {
      toast.error(t('onboarding.errors.selectBusinessType'));
      return;
    }
    if (step === 2) {
      // Validate services - at least one required
      if (services.length === 0) {
        setErrors({ services: t('onboarding.errors.atLeastOneService') });
        toast.error(t('onboarding.errors.atLeastOneService'));
        return;
      }
      // Validate each service has required fields
      const invalidServices = services.filter(
        (s) => !s.name.trim() || s.duration <= 0 || s.price < 0
      );
      if (invalidServices.length > 0) {
        setErrors({ services: t('onboarding.errors.invalidService') });
        toast.error(t('onboarding.errors.invalidService'));
        return;
      }
    }
    if (step === 3) {
      // Mark all fields as touched
      setTouched({ name: true, englishName: true, email: true, phone: true, ownerName: true });
      
      // Validate all fields
      const newErrors: typeof errors = {};
      const nameError = getFieldError('name', businessInfo.name);
      const englishNameError = getFieldError('englishName', businessInfo.englishName);
      const emailError = getFieldError('email', businessInfo.email);
      const phoneError = getFieldError('phone', businessInfo.phone);
      const ownerNameError = getFieldError('ownerName', ownerName);
      
      if (nameError) newErrors.name = nameError;
      if (englishNameError) newErrors.englishName = englishNameError;
      if (emailError) newErrors.email = emailError;
      if (phoneError) newErrors.phone = phoneError;
      if (ownerNameError) newErrors.ownerName = ownerNameError;
      
      setErrors(newErrors);
      
      // If there are errors, don't proceed
      if (Object.keys(newErrors).length > 0) {
        toast.error(t('onboarding.errors.fillRequiredFields'));
        return;
      }
    }
    if (step === 3) {
      // Move to step 5 (plan confirmation) for all plans
      setErrors({});
      setStep(5);
    } else if (step === 5) {
      // Move from plan confirmation to final step (step 6)
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
        const response = await fetch('/api/onboarding/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType,
            businessInfo,
            services: services.map(({ id, ...service }) => service),
            ownerName,
            useAnotherAccount,
            plan: selectedPlan || 'basic',
            adminUser: {
              email: businessInfo.email,
              name: ownerName,
              phone: businessInfo.phone,
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
      if (step === 6) {
        // Go back from final step to plan confirmation
        setStep(5);
      } else if (step === 5) {
        // Go back from plan confirmation to business info
        setStep(3);
      } else {
      setStep(step - 1);
      }
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
        {planDetails && step < 5 && (
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
                    className={`p-6 rounded-lg border-2 transition-all ${
                      businessType === type.id
                        ? "border-primary bg-accent shadow-soft"
                        : "border-border hover:border-primary/50"
                    }`}
                    dir={dir}
                  >
                    <div className={`flex flex-col ${dir === 'rtl' ? 'items-start text-right' : 'items-start text-left'}`}>
                      <type.icon className={`w-8 h-8 mb-3 ${businessType === type.id ? "text-accent-foreground" : "text-muted-foreground"}`} />
                      <h3 className="text-lg font-semibold mb-1">{type.title}</h3>
                      <p className={`text-sm ${businessType === type.id ? "text-white" : "text-muted-foreground"}`}>{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
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
                    className={`mt-2 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="englishName">{t('onboarding.businessInfo.englishName')}</Label>
                  <Input
                    id="englishName"
                    placeholder={t('onboarding.businessInfo.englishNamePlaceholder')}
                    value={businessInfo.englishName}
                    onChange={(e) => handleFieldChange('englishName', e.target.value)}
                    onBlur={() => handleBlur('englishName')}
                    className={`mt-2 ${errors.englishName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.businessInfo.englishNameHint')}</p>
                  {errors.englishName && (
                    <p className="mt-1 text-sm text-red-500">{errors.englishName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="ownerName">{t('onboarding.ownerName') || 'Owner Name'}</Label>
                  <Input
                    id="ownerName"
                    placeholder={t('onboarding.ownerName') || 'Owner Name'}
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (touched.ownerName) {
                        validateField('ownerName', e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur('ownerName')}
                    className={`mt-2 ${errors.ownerName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {errors.ownerName && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerName}</p>
                  )}
                </div>
                {isLoggedIn && (
                  <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="useAnotherAccount"
                      checked={useAnotherAccount}
                      onCheckedChange={(checked) => {
                        setUseAnotherAccount(checked === true);
                        if (!checked && loggedInUser) {
                          // Reset to logged-in user's info
                          setBusinessInfo(prev => ({
                            ...prev,
                            email: loggedInUser.email,
                            phone: loggedInUser.phone,
                          }));
                          setOwnerName(loggedInUser.name);
                        }
                      }}
                    />
                    <Label htmlFor="useAnotherAccount" className="text-sm font-normal cursor-pointer">
                      {t('onboarding.useAnotherAccount') || 'Use another account for this business'}
                    </Label>
                  </div>
                )}
                <div>
                  <Label htmlFor="email">{t('onboarding.businessInfo.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('onboarding.businessInfo.emailPlaceholder')}
                    value={businessInfo.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    disabled={isLoggedIn && !useAnotherAccount}
                    className={`mt-2 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} ${isLoggedIn && !useAnotherAccount ? 'bg-muted cursor-not-allowed' : ''}`}
                  />
                  {isLoggedIn && !useAnotherAccount && (
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
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    disabled={isLoggedIn && !useAnotherAccount}
                    className={`mt-2 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''} ${isLoggedIn && !useAnotherAccount ? 'bg-muted cursor-not-allowed' : ''}`}
                  />
                  {isLoggedIn && !useAnotherAccount && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
                  )}
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="address">{t('onboarding.businessInfo.address')}</Label>
                  <Input
                    id="address"
                    placeholder={t('onboarding.businessInfo.addressPlaceholder')}
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="mt-2"
                  />
                </div>
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
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-accent-foreground" />
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
          <div className="flex justify-between mt-8 pt-6 border-t">
            <LoadingButton
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              {t('onboarding.buttons.back')}
            </LoadingButton>
            <LoadingButton ref={continueButtonRef} onClick={handleNext} loading={loading}>
              {step === 6 ? t('onboarding.buttons.completeSetup') : t('onboarding.buttons.continue')}
            </LoadingButton>
          </div>
        </Card>
        </div>
      </div>
      <div className="mt-16">
        <Footer />
      </div>

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
