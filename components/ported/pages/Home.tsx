"use client";

import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Button } from '@/components/ported/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Textarea } from '@/components/ported/ui/textarea';
import { useToast } from '@/components/ported/ui/use-toast';
import Link from 'next/link';
import { Calendar, Clock, Users, MessageSquare, Globe, Check, ArrowRight, ArrowLeft, ChevronDown, User, LogOut, LayoutDashboard, CalendarCheck, CalendarSync, Smartphone, FileText, Repeat, Mail, Phone } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [hoveredFeature, setHoveredFeature] = useState<{ planKey: string; featureIndex: number } | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const { toast } = useToast();

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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    try {
      // Here you would typically send the form data to an API endpoint
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      toast.success(getHome('contact.success') || 'Thank you! We\'ll get back to you soon.');
      setContactFormData({ name: '', email: '', message: '' });
      setContactModalOpen(false);
    } catch (error) {
      toast.error(getHome('contact.error') || 'Failed to send message. Please try again.');
    } finally {
      setSubmittingContact(false);
    }
  };

  const featureIcons = {
    setup3min: Calendar,
    professionalBooking: FileText,
    onlineBooking: CalendarCheck,
    mobileOptimized: Smartphone,
    easyCalendar: Clock,
    reminders: MessageSquare,
    smartCustomers: Users,
    recurringAppointments: Repeat,
    googleCalendar: CalendarSync,
    bilingual: Globe,
  };

  // Feature descriptions for popups
  const getFeatureDescription = (featureText: string, locale: string): string => {
    const descriptions: Record<string, Record<string, string>> = {
      en: {
        '1 staff member': 'Perfect for solo entrepreneurs. Manage your business with one staff account.',
        'Up to 50 bookings/month': 'Ideal for small businesses getting started. Upgrade when you need more capacity.',
        'Smart calendar': 'View your schedule in daily, weekly, or monthly format. Drag and drop to reschedule appointments.',
        'Customer management': 'Store customer information, booking history, and notes all in one place.',
        'Email reminders': 'Automated email confirmations and reminders to reduce no-shows.',
        'Bilingual & RTL support': 'Full support for Hebrew, English, Arabic, and Russian with right-to-left layout.',
        'Up to 5 staff': 'Add up to 5 team members. Perfect for small to medium businesses.',
        'Unlimited staff': 'Add as many team members as you need. Perfect for growing businesses.',
        'Unlimited bookings': 'No limits on how many appointments you can manage. Scale without restrictions.',
        'Everything in Free Plan': 'All features from the Free plan are included in Pro.',
        'Analytics dashboard': 'Track revenue, booking trends, and customer insights with detailed reports.',
        'WhatsApp integration': 'Send appointment confirmations and reminders via WhatsApp for better engagement.',
        'Google Calendar integration': 'Sync your appointments with Google Calendar. All your appointments in one place.',
        'Custom branding': 'Add your logo and brand colors to make the booking page truly yours.',
        'Advanced reminders': 'Customizable reminder timing and multiple reminder channels.',
        'Priority support': 'Get faster response times and dedicated support when you need help.',
        'Everything in Pro': 'All Pro plan features are included in Custom.',
        'API Access': 'Full REST API access to integrate KalBook with your existing systems and workflows.',
        'White-label solution': 'Completely remove our branding and use your own. Perfect for agencies and resellers.',
        'Custom integrations': 'Connect KalBook to your CRM, ERP, payment processors, and other business tools.',
        'Advanced reporting': 'Custom reports tailored to your business needs with export capabilities.',
        'Multi-location support': 'Manage multiple branches or locations from a single dashboard.',
        'Custom workflows': 'Automate your unique business processes with custom rules and triggers.',
        'Dedicated support': 'Personal account manager and 24/7 priority support for your business.',
        'Custom development': 'We build unique features specifically for your business requirements.',
      },
      he: {
        'עובד אחד': 'מושלם ליזמים עצמאיים. נהל את העסק שלך עם חשבון עובד אחד.',
        'עד 50 הזמנות בחודש': 'אידיאלי לעסקים קטנים שמתחילים. שדרג כשתצטרך יותר קיבולת.',
        'יומן חכם': 'צפה בלוח הזמנים שלך בפורמט יומי, שבועי או חודשי. גרור ושחרר כדי לשנות תורים.',
        'ניהול לקוחות': 'אחסן מידע לקוחות, היסטוריית הזמנות והערות במקום אחד.',
        'תזכורות במייל': 'אישורים ותזכורות אוטומטיים במייל כדי להפחית אי-הגעה.',
        'תמיכה דו לשונית ו-RTL': 'תמיכה מלאה בעברית, אנגלית, ערבית ורוסית עם פריסה מימין לשמאל.',
            'עד 5 עובדים': 'הוסף עד 5 חברי צוות. מושלם לעסקים קטנים ובינוניים.',
            'עובדים ללא הגבלה': 'הוסף כמה חברי צוות שאתה צריך. מושלם לעסקים גדלים.',
        'הזמנות ללא הגבלה': 'אין הגבלות על כמה תורים אתה יכול לנהל. גדל ללא הגבלות.',
        'הכל בחבילת Free': 'כל התכונות מחבילת Free כלולות ב-Pro.',
        'לוח בקרה ואנליטיקה': 'עקוב אחר הכנסות, מגמות הזמנות ותובנות לקוחות עם דוחות מפורטים.',
        'אינטגרציה עם וואטסאפ': 'שלח אישורי תורים ותזכורות דרך וואטסאפ לשיפור מעורבות.',
        'אינטגרציה עם Google Calendar': 'סנכרן את התורים שלך עם Google Calendar. כל התורים במקום אחד.',
        'מותג מותאם אישית': 'הוסף את הלוגו וצבעי המותג שלך כדי להפוך את דף ההזמנות לשלך באמת.',
        'תזכורות מתקדמות': 'תזמון תזכורות מותאם אישית וערוצי תזכורת מרובים.',
        'תמיכה בעדיפות': 'קבל זמני תגובה מהירים יותר ותמיכה ייעודית כשאתה צריך עזרה.',
        'הכל בחבילת Pro': 'כל תכונות חבילת Pro כלולות ב-Custom.',
        'גישה ל-API': 'גישה מלאה ל-REST API לשילוב KalBook עם המערכות והזרימות הקיימות שלך.',
        'פתרון White-Label': 'הסר לחלוטין את המותג שלנו והשתמש בשלך. מושלם לסוכנויות וסוחרים.',
        'אינטגרציות מותאמות': 'חבר את KalBook ל-CRM, ERP, מעבדי תשלומים וכלי עסק אחרים שלך.',
        'דוחות מתקדמים': 'דוחות מותאמים אישית לצרכי העסק שלך עם יכולות ייצוא.',
        'תמיכה במיקומים מרובים': 'נהל מספר סניפים או מיקומים מדשבורד אחד.',
        'זרימות עבודה מותאמות': 'אוטומציה של תהליכי העסק הייחודיים שלך עם כללים וטריגרים מותאמים.',
        'תמיכה ייעודית': 'מנהל חשבון אישי ותמיכה בעדיפות 24/7 לעסק שלך.',
        'פיתוח מותאם אישית': 'אנחנו בונים תכונות ייחודיות במיוחד לדרישות העסק שלך.',
      },
      ar: {
        'موظف واحد': 'مثالي لرجال الأعمال المستقلين. إدارة عملك بحساب موظف واحد.',
        'حتى 50 حجز/شهر': 'مثالي للشركات الصغيرة التي تبدأ. قم بالترقية عندما تحتاج إلى سعة أكبر.',
        'تقويم ذكي': 'عرض جدولك بتنسيق يومي أو أسبوعي أو شهري. اسحب وأفلت لإعادة جدولة المواعيد.',
        'إدارة العملاء': 'تخزين معلومات العملاء وتاريخ الحجوزات والملاحظات في مكان واحد.',
        'تذكيرات البريد الإلكتروني': 'تأكيدات وتذكيرات تلقائية بالبريد الإلكتروني لتقليل عدم الحضور.',
        'دعم ثنائي اللغة و RTL': 'دعم كامل للعبرية والإنجليزية والعربية والروسية مع تخطيط من اليمين إلى اليسار.',
        'موظفون غير محدودين': 'أضف أكبر عدد من أعضاء الفريق حسب حاجتك. مثالي للشركات النامية.',
        'حجوزات غير محدودة': 'لا توجد حدود على عدد المواعيد التي يمكنك إدارتها. قم بالتوسع دون قيود.',
        'كل شيء في خطة Free': 'جميع الميزات من خطة Free متضمنة في Pro.',
        'لوحة تحليلات': 'تتبع الإيرادات واتجاهات الحجز ورؤى العملاء مع تقارير مفصلة.',
        'تكامل واتساب': 'إرسال تأكيدات المواعيد والتذكيرات عبر واتساب لتحسين المشاركة.',
        'تكامل مع Google Calendar': 'قم بمزامنة مواعيدك مع Google Calendar. جميع مواعيدك في مكان واحد.',
        'علامة تجارية مخصصة': 'أضف شعارك وألوان علامتك التجارية لجعل صفحة الحجز ملكك حقًا.',
        'تذكيرات متقدمة': 'توقيت تذكير قابل للتخصيص وقنوات تذكير متعددة.',
        'دعم ذو أولوية': 'احصل على أوقات استجابة أسرع ودعم مخصص عندما تحتاج إلى المساعدة.',
        'كل شيء في Pro': 'جميع ميزات خطة Pro متضمنة في Custom.',
        'وصول API': 'وصول كامل إلى REST API لدمج KalBook مع أنظمتك وسير العمل الحالية.',
        'حل White-Label': 'قم بإزالة علامتنا التجارية تمامًا واستخدم علامتك الخاصة. مثالي للوكالات والبائعين.',
        'تكاملات مخصصة': 'قم بتوصيل KalBook بـ CRM و ERP ومعالجات الدفع وأدوات الأعمال الأخرى.',
        'تقارير متقدمة': 'تقارير مخصصة مصممة خصيصًا لاحتياجات عملك مع إمكانيات التصدير.',
        'دعم مواقع متعددة': 'إدارة عدة فروع أو مواقع من لوحة تحكم واحدة.',
        'سير عمل مخصص': 'أتمتة عمليات عملك الفريدة مع قواعد ومشغلات مخصصة.',
        'دعم مخصص': 'مدير حساب شخصي ودعم ذو أولوية على مدار الساعة لعملك.',
        'تطوير مخصص': 'نقوم ببناء ميزات فريدة خصيصًا لمتطلبات عملك.',
      },
      ru: {
        '1 сотрудник': 'Идеально для индивидуальных предпринимателей. Управляйте своим бизнесом с одной учетной записью сотрудника.',
        'До 50 записей/месяц': 'Идеально для малого бизнеса, который только начинается. Обновите, когда вам понадобится больше возможностей.',
        'Умный календарь': 'Просматривайте свое расписание в ежедневном, еженедельном или ежемесячном формате. Перетаскивайте для переноса записей.',
        'Управление клиентами': 'Храните информацию о клиентах, историю записей и заметки в одном месте.',
        'Напоминания по email': 'Автоматические подтверждения и напоминания по электронной почте для уменьшения неявок.',
        'Поддержка двуязычного и RTL': 'Полная поддержка иврита, английского, арабского и русского языков с макетом справа налево.',
        'До 5 сотрудников': 'Добавляйте до 5 членов команды. Идеально для малого и среднего бизнеса.',
        'Неограниченные сотрудники': 'Добавляйте столько членов команды, сколько вам нужно. Идеально для растущего бизнеса.',
        'Неограниченные записи': 'Нет ограничений на количество записей, которыми вы можете управлять. Масштабируйте без ограничений.',
        'Все из плана Free': 'Все функции из плана Free включены в Pro.',
        'Панель аналитики': 'Отслеживайте доходы, тенденции записей и аналитику клиентов с подробными отчетами.',
        'Интеграция WhatsApp': 'Отправляйте подтверждения записей и напоминания через WhatsApp для лучшего взаимодействия.',
        'Интеграция с Google Calendar': 'Синхронизируйте свои записи с Google Calendar. Все ваши записи в одном месте.',
        'Пользовательский брендинг': 'Добавьте свой логотип и цвета бренда, чтобы сделать страницу записи действительно своей.',
        'Расширенные напоминания': 'Настраиваемое время напоминаний и несколько каналов напоминаний.',
        'Приоритетная поддержка': 'Получайте более быстрые ответы и выделенную поддержку, когда вам нужна помощь.',
        'Все из Pro': 'Все функции плана Pro включены в Custom.',
        'Доступ к API': 'Полный доступ к REST API для интеграции KalBook с вашими существующими системами и рабочими процессами.',
        'White-Label решение': 'Полностью удалите наш брендинг и используйте свой собственный. Идеально для агентств и реселлеров.',
        'Индивидуальные интеграции': 'Подключите KalBook к вашему CRM, ERP, платежным процессорам и другим бизнес-инструментам.',
        'Расширенная отчетность': 'Индивидуальные отчеты, адаптированные к потребностям вашего бизнеса, с возможностью экспорта.',
        'Поддержка нескольких локаций': 'Управляйте несколькими филиалами или локациями с одной панели управления.',
        'Индивидуальные рабочие процессы': 'Автоматизируйте свои уникальные бизнес-процессы с помощью настраиваемых правил и триггеров.',
        'Выделенная поддержка': 'Персональный менеджер аккаунта и приоритетная поддержка 24/7 для вашего бизнеса.',
        'Индивидуальная разработка': 'Мы создаем уникальные функции специально для требований вашего бизнеса.',
      },
    };
    return descriptions[locale as keyof typeof descriptions]?.[featureText] || featureText;
  };

  // Pricing Plans Component
  function PricingPlansSection({ 
    locale, 
    getPlan, 
    getPricing, 
    getPlanHighlights,
    hoveredFeature,
    setHoveredFeature,
    getFeatureDescription,
    isRTL
  }: { 
    locale: string; 
    getPlan: (planKey: string, field: string) => string;
    getPricing: (key: string) => string;
    getPlanHighlights: (planKey: string) => string[];
    hoveredFeature: { planKey: string; featureIndex: number } | null;
    setHoveredFeature: (feature: { planKey: string; featureIndex: number } | null) => void;
    getFeatureDescription: (featureText: string, locale: string) => string;
    isRTL: boolean;
  }) {
    // Static pricing - no API calls needed
    const pricing = {
      free: { price: 0, currency: 'ILS', symbol: '₪' },
      pro: { price: 79, currency: 'ILS', symbol: '₪' },
    };
    const loading = false;

    const getDisplayPrice = (planKey: string): string => {
      const planPrice = getPlan(planKey, 'price');
      if (planPrice === 'dynamic') {
        const planPricing = pricing[planKey as keyof typeof pricing];
        return planPricing ? planPricing.price.toFixed(0) : '79';
      }
      if (planPrice === 'custom') {
        return 'Custom';
      }
      return planPrice;
    };

    const getCurrencySymbol = (planKey: string): string => {
      const planPrice = getPlan(planKey, 'price');
      if (planPrice === 'dynamic') {
        const planPricing = pricing[planKey as keyof typeof pricing];
        return planPricing ? planPricing.symbol : '₪';
      }
      // Always show currency symbol, even for free plan
      return '₪';
    };

    return (
      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {['free', 'pro', 'custom'].map((planKey, index) => {
          const isPro = planKey === 'pro';
          const isCustom = planKey === 'custom';
          const highlightsArray = getPlanHighlights(planKey);
          const displayPrice = getDisplayPrice(planKey);
          const currencySymbol = getCurrencySymbol(planKey);
          
          return (
            <div
              key={planKey}
              className="opacity-100"
              onMouseLeave={() => {
                // Close popup when leaving the entire plan card area
                if (hoveredFeature?.planKey === planKey) {
                  setHoveredFeature(null);
                }
              }}
            >
              <Card 
                className={`p-6 h-full relative flex flex-col ${isPro ? 'border-2 border-primary shadow-lg scale-105' : ''} ${isCustom ? 'border-2 border-gray-300' : ''}`}
              >
                {(isPro || planKey === 'free' || planKey === 'custom') && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      {planKey === 'free' ? (locale === 'he' ? 'בסיסי' : 'Basic') : planKey === 'custom' ? 'Custom' : getPricing('bestSeller')}
                    </span>
                  </div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-xl font-bold mb-2">{getPlan(planKey, 'name')}</h3>
                  <div className="mb-2">
                    {loading && getPlan(planKey, 'price') === 'dynamic' && planKey !== 'custom' ? (
                      <span className="text-3xl font-bold text-primary">...</span>
                    ) : planKey === 'free' ? (
                      <span className="text-3xl font-bold text-primary">
                        {locale === 'he' ? 'חינם' : 'Free'}
                      </span>
                    ) : planKey === 'custom' ? (
                      <>
                        <div className="text-xs text-gray-600 mb-1">
                          {locale === 'he' ? 'החל מ-' : locale === 'ar' ? 'بدءًا من' : locale === 'ru' ? 'Начиная с' : 'Starting at'}
                        </div>
                        <span className="text-3xl font-bold text-primary">
                          {locale === 'he' ? '₪' : '₪'}249
                        </span>
                        <span className="text-gray-500 text-base ml-1">
                          {' / '}{getPricing('month')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-primary">
                          {currencySymbol}{displayPrice}
                        </span>
                        <span className="text-gray-500 text-base ml-1">
                          {' / '}{getPricing('month')}
                        </span>
                      </>
                    )}
                  </div>
                  {getPlan(planKey, 'priceNote') && (
                    <p className="text-xs text-gray-500 mb-2" style={{ whiteSpace: 'pre-line' }}>
                      {planKey === 'pro' && locale === 'he' ? 'למקצוענים שבינינו' : getPlan(planKey, 'priceNote')}
                    </p>
                  )}
                  {getPlan(planKey, 'note') && (
                    <p className="text-xs text-gray-500 mb-3">
                      {planKey === 'free' && locale === 'he' ? (
                        <>
                          התחל לנהל את ההזמנות שלך היום<br />
                          <br />
                          <span className="text-primary font-bold">אין צורך בכרטיס אשראי</span>
                        </>
                      ) : (
                        getPlan(planKey, 'note')
                      )}
                    </p>
                  )}
                </div>
                <ul className="space-y-1.5 mb-5 flex-grow relative">
                  {highlightsArray.map((highlight: string, i: number) => {
                    const isHovered = hoveredFeature?.planKey === planKey && hoveredFeature?.featureIndex === i;
                    return (
                      <li 
                        key={i} 
                        className="relative"
                      >
                        <div
                          className={`flex items-start gap-2 py-1 px-2 rounded-lg transition-all cursor-pointer group ${isHovered ? 'bg-primary/10' : 'hover:bg-primary/10'}`}
                          onMouseEnter={() => {
                            setHoveredFeature({ planKey, featureIndex: i });
                          }}
                          onMouseLeave={() => {
                            // Close immediately when leaving the feature item
                            setHoveredFeature(null);
                          }}
                        >
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className={`text-sm text-gray-700 transition-all ${isHovered ? 'font-bold' : 'group-hover:font-bold'}`}>{highlight}</span>
                        </div>
                        {isHovered && (
                          <div 
                            className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-72 p-4 bg-white border border-gray-200 rounded-lg shadow-xl`}
                            style={{ pointerEvents: 'none' }}
                          >
                            <h4 className="font-semibold text-primary mb-2 text-base">{highlight}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{getFeatureDescription(highlight, locale)}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {planKey === 'custom' ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() => setContactModalOpen(true)}
                  >
                    {getPlan(planKey, 'cta')}
                  </Button>
                ) : (
                  <Link href={`/onboarding?plan=${planKey}`} className="block mt-auto">
                    <Button
                      className="w-full"
                      variant={isPro ? 'default' : 'outline'}
                      size="lg"
                    >
                      {getPlan(planKey, 'cta')}
                    </Button>
                  </Link>
                )}
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-16 md:pt-24 pb-12 sm:pb-16 md:pb-20">
        <div className="flex flex-col md:grid md:grid-cols-[1fr_1fr] gap-6 sm:gap-8 md:gap-12 items-center" dir="ltr">
          {/* Phone Mockup Side - First for RTL, Second for LTR */}
          {isRTL && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center items-center w-full md:w-auto order-2 md:order-none"
            >
              <div className="relative w-full" style={{ maxWidth: '240px' }}>
                {/* Phone Frame */}
                <div className="relative mx-auto" style={{ width: '100%', aspectRatio: '9/18', maxWidth: '240px' }}>
                  {/* Phone Container */}
                  <div 
                    className="relative bg-black rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-0.5 sm:p-1 md:p-1.5 shadow-2xl w-full h-full"
                    style={{
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                    }}
                  >
                    {/* Notch */}
                    <div 
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-lg sm:rounded-b-xl z-10"
                      style={{ width: 'clamp(60px, 25%, 100px)', height: 'clamp(12px, 3%, 18px)' }}
                    />
                    
                    {/* Speaker */}
                    <div 
                      className="absolute top-0.5 sm:top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full z-10"
                      style={{ width: 'clamp(28px, 15%, 45px)', height: 'clamp(2px, 0.6%, 3px)' }}
                    />
                    
                    {/* Screen */}
                    <div 
                      className="relative bg-white rounded-[1.25rem] sm:rounded-[1.75rem] md:rounded-[2.25rem] overflow-hidden w-full h-full"
                    >
                      {/* Screen Content - Video */}
                      <video
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src="https://urqobqgofkwobbwfszxa.supabase.co/storage/v1/object/public/business-assets/out.mp4" type="video/mp4" />
                      </video>
                    </div>
                    
                    {/* Home Indicator (for modern phones) */}
                    <div 
                      className="absolute bottom-1.5 sm:bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-400 rounded-full z-10"
                      style={{ width: 'clamp(60px, 38%, 100px)', height: 'clamp(2px, 0.6%, 3px)' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Text Content Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center order-1 md:order-none"
          >
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <img 
                src="/kalbook-logo.svg" 
                alt="KalBook.io" 
                className="h-10 sm:h-12 md:h-16 lg:h-20 w-auto flex-shrink-0"
              />
            </div>
            <div className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 space-y-3 sm:space-y-4">
              {getHome('subtitle').split('\n\n').map((paragraph: string, index: number, array: string[]) => (
                <p 
                  key={index} 
                  className={index === array.length - 1 ? 'font-semibold' : ''}
                  style={index === array.length - 1 ? { color: '#ff3e1b', fontSize: 'clamp(18px, 4vw, 20px)' } : {}}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {paragraph.split('\n').map((line: string, lineIndex: number, lines: string[]) => {
                    // Fix period placement for RTL - use LRM to keep period on the right
                    const trimmedLine = line.trim();
                    const fixedLine = isRTL && trimmedLine.endsWith('.') 
                      ? trimmedLine.slice(0, -1) + '\u200E.' // Add LRM before period to keep it on right
                      : line;
                    return (
                      <span key={lineIndex}>
                        {fixedLine}
                        {lineIndex < lines.length - 1 && <br />}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
            <div className={`flex gap-3 sm:gap-4 justify-center flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Button 
                size="lg" 
                className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
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
                className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
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

          {/* Phone Mockup Side - Second for LTR */}
          {!isRTL && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center items-center order-2 md:order-none"
            >
              <div className="relative w-full" style={{ maxWidth: '240px' }}>
                {/* Phone Frame */}
                <div className="relative mx-auto" style={{ width: '100%', aspectRatio: '9/18', maxWidth: '240px' }}>
                  {/* Phone Container */}
                  <div 
                    className="relative bg-black rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-0.5 sm:p-1 md:p-1.5 shadow-2xl w-full h-full"
                    style={{
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                    }}
                  >
                    {/* Notch */}
                    <div 
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-lg sm:rounded-b-xl z-10"
                      style={{ width: 'clamp(60px, 25%, 100px)', height: 'clamp(12px, 3%, 18px)' }}
                    />
                    
                    {/* Speaker */}
                    <div 
                      className="absolute top-0.5 sm:top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full z-10"
                      style={{ width: 'clamp(28px, 15%, 45px)', height: 'clamp(2px, 0.6%, 3px)' }}
                    />
                    
                    {/* Screen */}
                    <div 
                      className="relative bg-white rounded-[1.25rem] sm:rounded-[1.75rem] md:rounded-[2.25rem] overflow-hidden w-full h-full"
                    >
                      {/* Screen Content - Video */}
                      <video
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src="https://urqobqgofkwobbwfszxa.supabase.co/storage/v1/object/public/business-assets/out.mp4" type="video/mp4" />
                      </video>
                    </div>
                    
                    {/* Home Indicator (for modern phones) */}
                    <div 
                      className="absolute bottom-1.5 sm:bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-400 rounded-full z-10"
                      style={{ width: 'clamp(60px, 38%, 100px)', height: 'clamp(2px, 0.6%, 3px)' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.3 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{getHome('features.title')}</h2>
          <p className="text-gray-600 text-lg">{getHome('features.subtitle') || 'Everything you need to run your service business smoothly'}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {Object.keys(featureIcons).map((key, index) => {
            const Icon = featureIcons[key as keyof typeof featureIcons] || Calendar;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
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
      <section id="pricing" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{getPricing('title')}</h2>
            <p className="text-gray-600 text-lg mb-2">{getPricing('subtitle')}</p>
          </motion.div>

          <PricingPlansSection 
            locale={locale} 
            getPlan={getPlan} 
            getPricing={getPricing} 
            getPlanHighlights={getPlanHighlights}
            hoveredFeature={hoveredFeature}
            setHoveredFeature={setHoveredFeature}
            getFeatureDescription={getFeatureDescription}
            isRTL={isRTL}
          />
        </div>
      </section>

      {/* Custom Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {locale === 'he' ? 'תכונות נוספות שניתן לפתח' : 'Additional Features We Can Develop'}
            </h2>
            <p className="text-gray-600 text-lg">
              {locale === 'he' ? 'תכונות מתקדמות ומותאמות אישית עבור הצרכים הספציפיים שלך' : 'Advanced and custom features tailored to your specific needs'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: locale === 'he' ? 'גישה ל-API' : 'API Access', 
                desc: locale === 'he' ? 'אינטגרציה מלאה עם המערכות שלך' : 'Full integration with your systems' 
              },
              { 
                title: locale === 'he' ? 'פתרון White-Label' : 'White-Label Solution', 
                desc: locale === 'he' ? 'מותג מותאם אישית ללא לוגו שלנו' : 'Fully branded solution without our logo' 
              },
              { 
                title: locale === 'he' ? 'אינטגרציות מותאמות' : 'Custom Integrations', 
                desc: locale === 'he' ? 'חיבור למערכות CRM, ERP וכלים אחרים' : 'Connect to CRM, ERP and other tools' 
              },
              { 
                title: locale === 'he' ? 'דוחות מתקדמים' : 'Advanced Reports', 
                desc: locale === 'he' ? 'דוחות מותאמים אישית וניתוחים עמוקים' : 'Custom reports and deep analytics' 
              },
              { 
                title: locale === 'he' ? 'תמיכה במיקומים מרובים' : 'Multi-Location Support', 
                desc: locale === 'he' ? 'ניהול מספר סניפים ממקום אחד' : 'Manage multiple branches from one place' 
              },
              { 
                title: locale === 'he' ? 'זרימות עבודה מותאמות' : 'Custom Workflows', 
                desc: locale === 'he' ? 'אוטומציה מותאמת אישית לתהליכים שלך' : 'Custom automation for your processes' 
              },
              { 
                title: locale === 'he' ? 'אוטומציה מתקדמת' : 'Advanced Automation', 
                desc: locale === 'he' ? 'כללי עסק מותאמים אישית וטריגרים' : 'Custom business rules and triggers' 
              },
              { 
                title: locale === 'he' ? 'תמיכה ייעודית' : 'Dedicated Support', 
                desc: locale === 'he' ? 'מנהל חשבון אישי ותמיכה 24/7' : 'Personal account manager and 24/7 support' 
              },
              { 
                title: locale === 'he' ? 'פיתוח מותאם אישית' : 'Custom Development', 
                desc: locale === 'he' ? 'תכונות ייחודיות לפי הזמנה' : 'Unique features built to order' 
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold mb-2 text-primary">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.faq.title')}</h2>
        </motion.div>

        <div className="space-y-4">
          {(homeData?.faq?.items || []).slice(0, 4).map((item: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
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

      {/* Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{getHome('contact.title') || 'Contact Us'}</DialogTitle>
            <DialogDescription>
              {getHome('contact.description') || 'Get in touch with us. We\'d love to hear from you!'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{getHome('contact.info') || 'Contact Information'}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <a href="mailto:contact@kalbook.io" className="text-sm hover:text-primary transition-colors">
                    contact@kalbook.io
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <a href="tel:+972542636737" className="text-sm hover:text-primary transition-colors">
                    054-263-3737
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <a
                    href="https://wa.me/972542636737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">{getHome('contact.name') || 'Name'}</Label>
                <Input
                  id="contact-name"
                  value={contactFormData.name}
                  onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">{getHome('contact.email') || 'Email'}</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">{getHome('contact.message') || 'Message'}</Label>
                <Textarea
                  id="contact-message"
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingContact} className="w-full">
                {submittingContact ? (getHome('contact.submitting') || 'Sending...') : (getHome('contact.submit') || 'Send Message')}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Login Modal */}
      <AdminLoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen}
        onLoginSuccess={checkUser}
      />
    </div>
  );
}

