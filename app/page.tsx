"use client";
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { LoadingButton } from '@/components/ported/ui/loading-button';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import en from '@/messages/en.json';
import he from '@/messages/he.json';
import ar from '@/messages/ar.json';
import ru from '@/messages/ru.json';

export default function Index() {
  const [mounted, setMounted] = useState(false);
  const { locale, t } = useLocale();
  const { isTransitioning } = useDirection();

  // Prevent hydration mismatch by only rendering locale-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const features = [
    {
      title: t('home.features.setup3min.title'),
      desc: t('home.features.setup3min.desc'),
    },
    {
      title: t('home.features.easyCalendar.title'),
      desc: t('home.features.easyCalendar.desc'),
    },
    {
      title: t('home.features.smartCustomers.title'),
      desc: t('home.features.smartCustomers.desc'),
    },
    {
      title: t('home.features.reminders.title'),
      desc: t('home.features.reminders.desc'),
    },
    {
      title: t('home.features.bilingual.title'),
      desc: t('home.features.bilingual.desc'),
    },
    {
      title: t('home.features.security.title'),
      desc: t('home.features.security.desc'),
    },
  ];

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

  // Get highlights safely
  const getHighlights = (planKey: string): string[] => {
    const value = getTranslation(`home.pricing.plans.${planKey}.highlights`);
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return [];
  };

  const plans = [
    {
      name: t('home.pricing.plans.basic.name'),
      price: 99,
      cta: t('home.pricing.plans.basic.cta'),
      highlights: getHighlights('basic'),
      note: t('home.pricing.plans.basic.note'),
    },
    {
      name: t('home.pricing.plans.professional.name'),
      price: 239,
      cta: t('home.pricing.plans.professional.cta'),
      highlighted: true,
      highlights: getHighlights('professional'),
      note: t('home.pricing.plans.professional.note'),
    },
    {
      name: t('home.pricing.plans.business.name'),
      price: 329,
      cta: t('home.pricing.plans.business.cta'),
      highlights: getHighlights('business'),
      note: t('home.pricing.plans.business.note'),
    },
  ];

  const faqs = getTranslation('home.faq.items') as Array<{ q: string; a: string }>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 relative">
      {/* Reload Animation Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('home.switchingLanguage')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top brand banner */}
      <div className="w-full bg-gradient-to-r from-primary to-primary/80 text-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Check className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">BookingHub</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            {mounted ? (
              <>
                <span className="opacity-90">{t('home.freeTrial')}</span>
                <a
                  href="#pricing"
                  className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20 transition"
                >
                  {t('home.pricingLabel')}
                </a>
              </>
            ) : (
              <>
                <span className="opacity-90">Free Trial</span>
                <a
                  href="#pricing"
                  className="rounded-xl bg-white/10 px-3 py-1.5 hover:bg-white/20 transition"
                >
                  Pricing
                </a>
              </>
            )}
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {t('home.title')}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-gray-600">
              {t('home.subtitle')}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/onboarding"
                className="px-5 py-3 rounded-2xl bg-primary text-white font-semibold shadow transition transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t('home.startNow')}
              </Link>
              <a
                href="#features"
                className="px-5 py-3 rounded-2xl bg-white text-primary font-semibold ring-1 ring-primary/20 transition hover:ring-primary/50 hover:shadow-lg"
              >
                {t('home.seeFeatures')}
              </a>
              <Link
                href="/admin/dashboard"
                className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-900 font-semibold shadow transition transform hover:-translate-y-0.5"
              >
                {t('home.adminDemo')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features summary */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:ring-primary/60 hover:-translate-y-0.5"
            >
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-extrabold">
            {t('home.pricing.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('home.pricing.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <PlanCard key={i} {...plan} />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('home.pricing.monthlyNote')}
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h3 className="text-xl font-bold mb-4">
          {t('home.faq.title')}
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <Faq key={i} {...faq} />
          ))}
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} BookingHub.{' '}
            {t('home.footer.rights')}
          </p>
          <div className="flex gap-4 text-sm">
            <a href="#" className="hover:text-gray-900 text-gray-500">
              {t('home.footer.terms')}
            </a>
            <a href="#" className="hover:text-gray-900 text-gray-500">
              {t('home.footer.privacy')}
            </a>
            <a href="#pricing" className="hover:text-gray-900 text-gray-500">
              {t('home.pricingLabel')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cta,
  highlights,
  highlighted = false,
  note,
}: {
  name: string;
  price: number;
  cta: string;
  highlights: string[];
  highlighted?: boolean;
  note?: string;
}) {
  const { t } = useLocale();

  return (
    <div
      className={`relative rounded-3xl p-6 sm:p-8 transition transform hover:-translate-y-0.5 hover:shadow-lg ${
        highlighted
          ? 'bg-white shadow-xl ring-2 ring-primary'
          : 'bg-white shadow-sm ring-1 ring-gray-200'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow ltr:right-4 rtl:left-4">
          {t('home.pricing.bestSeller')}
        </span>
      )}
      <h3 className="text-xl font-bold text-gray-900">{name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-4xl font-extrabold text-gray-900">₪{price}</span>
        <span className="text-gray-500">
          {t('home.pricing.month')}
        </span>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {Array.isArray(highlights) && highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0"></span>
            <span className="text-gray-600">{typeof h === 'string' ? h : String(h)}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-gray-500">{note}</p>}
      <Link
        href="/onboarding"
        className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 font-semibold transition hover:shadow-lg ${
          highlighted
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {cta}
      </Link>
      <p className="mt-2 text-center text-xs text-gray-500">
        {t('home.pricing.riskFree')}
      </p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:ring-primary/60 hover:-translate-y-0.5">
      <p className="font-semibold text-gray-900">{q}</p>
      <p className="mt-1 text-gray-600">{a}</p>
    </div>
  );
}
