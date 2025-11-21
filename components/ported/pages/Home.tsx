"use client";

import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Button } from '@/components/ported/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Calendar, Clock, Users, MessageSquare, Globe, Check, ArrowRight, ArrowLeft, ChevronDown, BarChart3, QrCode, Package, Palette, Smartphone, ShieldCheck, User, LogOut, LayoutDashboard, Repeat } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLoginModal } from '@/components/ui/AdminLoginModal';
import { Avatar, AvatarFallback } from '@/components/ported/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ported/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ported/ui/dialog';
import { useRouter } from 'next/navigation';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';
import { Footer } from '@/components/ui/Footer';

const translations = { en, he, ar, ru };

export default function Home() {
  const router = useRouter();
  const { t, locale, isRTL } = useLocale();
  const { dir } = useDirection();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; business: { slug: string } } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const getNested = (obj: any, path: string) => {
    return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
  };

  const homeData = getNested(translations[locale as keyof typeof translations] || translations.en, 'home');
  const getHome = (key: string) => getNested(homeData, key) || '';
  const getFeature = (key: string, field: string) => getNested(homeData?.features, `${key}.${field}`) || '';
  const getFeatureDetails = (key: string): string => {
    // Get detailed description, fallback to regular desc if details not available
    const details = getNested(homeData?.features, `${key}.details`);
    if (details) return details;
    // If no details field, return the description with some enhancements
    const desc = getFeature(key, 'desc');
    return desc;
  };
  const getPricing = (key: string) => getNested(homeData?.pricing, key) || '';
  const getPlan = (planKey: string, field: string) => getNested(homeData?.pricing?.plans, `${planKey}.${field}`) || '';
  const getFaq = (index: number, field: 'q' | 'a') => getNested(homeData?.faq?.items, `${index}.${field}`) || '';
  const getFooter = (key: string) => getNested(homeData?.footer, key) || '';
  const getPlanHighlights = (planKey: string): string[] => {
    const highlights = getNested(homeData?.pricing?.plans, `${planKey}.highlights`);
    return Array.isArray(highlights) ? highlights : [];
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Handle scroll to show/hide header
  useEffect(() => {
    let lastScrollTop = window.scrollY || 0;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || 0;
          const scrollDifference = currentScrollY - lastScrollTop;
          
          // Only update if scroll difference is significant (reduces unnecessary updates)
          if (Math.abs(scrollDifference) > 10) {
            const scrollingUp = scrollDifference < 0;
            const atTop = currentScrollY < 10;
            
            // Show header when scrolling up or at the top
            if (scrollingUp || atTop) {
              setIsHeaderVisible(true);
            } 
            // Hide header when scrolling down (and not at the top)
            else if (scrollDifference > 0 && currentScrollY > 50) {
              setIsHeaderVisible(false);
            }
            
            lastScrollTop = currentScrollY;
          }
          
          ticking = false;
        });
        
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user is logged in
  const checkUser = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser({
            name: data.user.name,
            email: data.user.email,
            business: data.business,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout API to properly clear cookie
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      
      // Clear user state
      setUser(null);
      
      // Reload page to update UI
      window.location.href = '/';
    } catch (error) {
      // Fallback: try to clear cookie manually and reload
      document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setUser(null);
      window.location.href = '/';
    }
  };

  const handleGoToDashboard = () => {
    router.push('/user/dashboard');
  };

  const featureIcons = {
    setup3min: Calendar,
    easyCalendar: Clock,
    smartCustomers: Users,
    reminders: MessageSquare,
    bilingual: Globe,
    analytics: BarChart3,
    qrCodes: QrCode,
    groupServices: Package,
    customBranding: Palette,
    mobileOptimized: Smartphone,
    noShowPrevention: ShieldCheck,
    recurringAppointments: Repeat,
  };

  // Pricing Plans Component
  function PricingPlansSection({ 
    locale, 
    getPlan, 
    getPricing, 
    getPlanHighlights 
  }: { 
    locale: string; 
    getPlan: (planKey: string, field: string) => string;
    getPricing: (key: string) => string;
    getPlanHighlights: (planKey: string) => string[];
  }) {
    const [pricing, setPricing] = useState<{
      basic: { price: number; currency: string; symbol: string };
      professional: { price: number; currency: string; symbol: string };
      business: { price: number; currency: string; symbol: string };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchPricing() {
        try {
          const response = await fetch(`/api/pricing?locale=${locale}`);
          const data = await response.json();
          if (data.success && data.pricing) {
            setPricing(data.pricing);
          }
        } catch (error) {
        } finally {
          setLoading(false);
        }
      }
      fetchPricing();
    }, [locale]);

    const getDisplayPrice = (planKey: string): string => {
      const planPrice = getPlan(planKey, 'price');
      if (planPrice === 'dynamic') {
        if (!pricing) return '...';
        const planPricing = pricing[planKey as keyof typeof pricing];
        return planPricing ? planPricing.price.toFixed(0) : '...';
      }
      return planPrice;
    };

    const getCurrencySymbol = (planKey: string): string => {
      const planPrice = getPlan(planKey, 'price');
      if (planPrice === 'dynamic') {
        if (!pricing) return locale === 'he' ? '₪' : '$';
        const planPricing = pricing[planKey as keyof typeof pricing];
        return planPricing ? planPricing.symbol : (locale === 'he' ? '₪' : '$');
      }
      return planPrice === '0' ? '' : (locale === 'he' ? '₪' : '$');
    };

    return (
      <div className="grid md:grid-cols-3 gap-8">
        {['basic', 'professional', 'business'].map((planKey, index) => {
          const isProfessional = planKey === 'professional';
          const highlightsArray = getPlanHighlights(planKey);
          const displayPrice = getDisplayPrice(planKey);
          const currencySymbol = getCurrencySymbol(planKey);
          
          return (
            <div
              key={planKey}
              className="opacity-100"
            >
              <Card className={`p-8 h-full relative flex flex-col ${isProfessional ? 'border-2 border-primary shadow-lg' : ''}`}>
                {isProfessional && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      {getPricing('bestSeller')}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{getPlan(planKey, 'name')}</h3>
                  {planKey === 'basic' && (
                    <p className="text-xs font-semibold text-primary mb-2">14 Days Free Trial</p>
                  )}
                  <div className="mb-3">
                    {loading && getPlan(planKey, 'price') === 'dynamic' ? (
                      <span className="text-4xl font-bold text-primary">...</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-primary">
                          {currencySymbol}{displayPrice}
                        </span>
                        {displayPrice !== '0' && (
                          <span className="text-gray-500 text-lg ml-1">
                            {getPricing('month')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {getPlan(planKey, 'priceNote') && (
                    <p className="text-sm text-gray-500 mb-2" style={{ whiteSpace: 'pre-line' }}>
                      {getPlan(planKey, 'priceNote')}
                    </p>
                  )}
                  {getPlan(planKey, 'note') && (
                    <p className="text-sm text-gray-500 mb-4">{getPlan(planKey, 'note')}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {highlightsArray.map((highlight: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/onboarding?plan=${planKey}`} className="block mt-auto">
                  <Button
                    className="w-full"
                    variant={isProfessional ? 'default' : 'outline'}
                    size="lg"
                  >
                    {getPlan(planKey, 'cta')}
                  </Button>
                </Link>
              </Card>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className={`bg-white border-b fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-sm bg-white/95 supports-[backdrop-filter]:bg-white/80 safe-area-top shadow-sm transition-transform duration-300 ease-in-out will-change-transform ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <img 
                src="/kalbook-logo.svg" 
                alt="KalBook.io" 
                className="h-8 sm:h-12 w-auto"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <LanguageToggle />
              {!loadingUser && !user && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setLoginModalOpen(true)}
                  aria-label={t('adminLogin.homepageLogin') || 'Admin Login'}
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              {!loadingUser && user && (
                <>
                  <div className="w-2 sm:w-3" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "start" : "end"}>
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGoToDashboard} className="cursor-pointer hover:bg-[#ff3e1b] hover:text-white focus:bg-[#ff3e1b] focus:text-white">
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.title') || 'My Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-[#ff3e1b] hover:bg-[#ff3e1b] hover:text-white focus:bg-[#ff3e1b] focus:text-white">
                        <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.logout') || 'Logout'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={`flex items-center justify-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`} style={isRTL ? { flexDirection: 'row-reverse' } : {}}>
            <img 
              src="/kalbook-logo.svg" 
              alt="KalBook.io" 
              className="h-12 md:h-16 lg:h-20 w-auto flex-shrink-0"
            />
          </div>
          <div className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto space-y-4">
            {getHome('subtitle').split('\n\n').map((paragraph: string, index: number, array: string[]) => (
              <p key={index} className={index === array.length - 1 ? 'font-semibold text-lg' : ''}>
                {paragraph.split('\n').map((line: string, lineIndex: number, lines: string[]) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => {
                const pricingSection = document.getElementById('pricing');
                if (pricingSection) {
                  pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              {getHome('startNow')}
              {isRTL ? (
                <ArrowLeft className="mr-2 w-5 h-5" />
              ) : (
                <ArrowRight className="ml-2 w-5 h-5" />
              )}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8"
              onClick={() => {
                const featuresSection = document.getElementById('features');
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              {getHome('seeFeatures')}
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Section Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-t border-gray-200/60"></div>
      </div>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{getHome('features.title')}</h2>
          <p className="text-gray-600 text-lg">{getHome('features.subtitle') || 'Everything you need to run your service business smoothly'}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(featureIcons).map((key, index) => {
            const Icon = featureIcons[key as keyof typeof featureIcons] || Calendar;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card 
                  className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedFeature(key)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{getFeature(key, 'title')}</h3>
                      <p className="text-gray-600">{getFeature(key, 'desc')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Section Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-t border-gray-200/60"></div>
      </div>

      {/* Feature Details Dialog */}
      <Dialog open={selectedFeature !== null} onOpenChange={(open) => !open && setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    {(() => {
                      const Icon = featureIcons[selectedFeature as keyof typeof featureIcons] || Calendar;
                      return <Icon className="w-8 h-8 text-primary" />;
                    })()}
                  </div>
                  <DialogTitle className="text-2xl">{getFeature(selectedFeature, 'title')}</DialogTitle>
                </div>
              </DialogHeader>
              <DialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-base text-gray-700 leading-relaxed">
                    {getFeatureDetails(selectedFeature)}
                  </p>
                </div>
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{getPricing('title')}</h2>
            <p className="text-gray-600 text-lg mb-2">{getPricing('subtitle')}</p>
          </motion.div>

          <PricingPlansSection locale={locale} getPlan={getPlan} getPricing={getPricing} getPlanHighlights={getPlanHighlights} />
        </div>
      </section>

      {/* Section Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-t border-gray-200/60"></div>
      </div>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.faq.title')}</h2>
        </motion.div>

        <div className="space-y-4">
          {(homeData?.faq?.items || []).map((item: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className={`w-full p-6 flex items-center justify-between text-left transition-all duration-300 ease-in-out ${
                    expandedFaq === index 
                      ? 'bg-primary/5 text-primary' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`font-semibold text-lg pr-4 transition-colors duration-300 ${
                    expandedFaq === index ? 'text-primary' : ''
                  }`}>{getFaq(index, 'q')}</span>
                  <ChevronDown
                    className={`w-5 h-5 transition-all duration-300 ease-in-out flex-shrink-0 ${
                      expandedFaq === index 
                        ? 'transform rotate-180 text-primary' 
                        : 'text-gray-500'
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pt-4 pb-6">
                        <p className="text-gray-600">{getFaq(index, 'a')}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />

      {/* Admin Login Modal */}
      <AdminLoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen}
        onLoginSuccess={checkUser}
      />
    </div>
  );
}

