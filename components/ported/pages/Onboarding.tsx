import { useState } from "react";
import { LoadingButton } from "@/components/ported/ui/loading-button";
import { Card } from "@/components/ported/ui/card";
import { Input } from "@/components/ported/ui/input";
import { Label } from "@/components/ported/ui/label";
import { useRouter } from "next/navigation";
import { Scissors, Sparkles, Dumbbell, Briefcase } from "lucide-react";
import { useToast } from "@/components/ported/ui/use-toast";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLocale } from "@/components/ported/hooks/useLocale";
import en from "@/messages/en.json";
import he from "@/messages/he.json";
import ar from "@/messages/ar.json";
import ru from "@/messages/ru.json";

type BusinessType = "barbershop" | "nail_salon" | "gym_trainer" | "other";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const router = useRouter();
  const { toast } = useToast();
  const dir = typeof document !== "undefined" ? (document.documentElement.dir as "ltr" | "rtl") : "ltr";
  const { locale, t } = useLocale();

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

  const businessTypes = [
    {
      id: "barbershop" as BusinessType,
      icon: Scissors,
      title: t('onboarding.chooseBusinessType.businessTypes.barbershop.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.barbershop.description'),
    },
    {
      id: "nail_salon" as BusinessType,
      icon: Sparkles,
      title: t('onboarding.chooseBusinessType.businessTypes.nail_salon.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.nail_salon.description'),
    },
    {
      id: "gym_trainer" as BusinessType,
      icon: Dumbbell,
      title: t('onboarding.chooseBusinessType.businessTypes.gym_trainer.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.gym_trainer.description'),
    },
    {
      id: "other" as BusinessType,
      icon: Briefcase,
      title: t('onboarding.chooseBusinessType.businessTypes.other.title'),
      description: t('onboarding.chooseBusinessType.businessTypes.other.description'),
    },
  ];

  const handleNext = async () => {
    if (step === 1 && !businessType) {
      toast.error(t('onboarding.errors.selectBusinessType'));
      return;
    }
    if (step === 2 && (!businessInfo.name || !businessInfo.email || !businessInfo.phone)) {
      toast.error(t('onboarding.errors.fillRequiredFields'));
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      setLoading(true);
      toast.success(t('onboarding.success.businessSetup'));
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-background flex flex-col p-6">
      {/* Header with Language Toggle */}
      <div className="w-full max-w-7xl mx-auto mb-6 flex justify-end">
        <LanguageToggle />
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">{t('onboarding.stepOf').replace('{step}', step.toString())}</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / 3) * 100)}% {t('onboarding.complete')}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 shadow-card">
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.chooseBusinessType.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('onboarding.chooseBusinessType.subtitle')}</p>
              <div className="grid md:grid-cols-2 gap-4">
                {businessTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id)}
                    className={`p-6 rounded-lg border-2 text-left transition-all ${
                      businessType === type.id
                        ? "border-primary bg-accent shadow-soft"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <type.icon className={`w-8 h-8 mb-3 ${businessType === type.id ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    <h3 className="text-lg font-semibold mb-1">{type.title}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
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
                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('onboarding.businessInfo.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('onboarding.businessInfo.emailPlaceholder')}
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('onboarding.businessInfo.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('onboarding.businessInfo.phonePlaceholder')}
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    className="mt-2"
                  />
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

          {step === 3 && (
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-accent-foreground" />
              </div>
              <h2 className="text-3xl font-bold mb-2">{t('onboarding.almostThere.title')}</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {t('onboarding.almostThere.subtitle').replace('{businessType}', businessTypes.find(t => t.id === businessType)?.title || businessType?.replace('_', ' ') || '')}
              </p>
              <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-3">{t('onboarding.almostThere.whatsBeingCreated')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(getTranslation('onboarding.almostThere.items') as string[] || []).map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
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
            <LoadingButton onClick={handleNext} loading={loading}>
              {step === 3 ? t('onboarding.buttons.completeSetup') : t('onboarding.buttons.continue')}
            </LoadingButton>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
