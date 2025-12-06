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
import { Calendar, Clock, Users, MessageSquare, Globe, Check, ArrowRight, ArrowLeft, ChevronDown, User, LogOut, LayoutDashboard, CalendarCheck, CalendarSync, Smartphone, FileText, Repeat, Mail, Phone, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { getTimeBasedGreeting } from '@/lib/utils/greetings';

const translations = { en, he, ar, ru };

// Helper function to get user initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Helper function to get time-based emoji (day/night/evening)
const getTimeBasedEmoji = (): string => {
  const hour = new Date().getHours();
  
  // Morning/Day: 5am - 6pm (sun)
  if (hour >= 5 && hour < 18) {
    return '☀️'; // Sun
  }
  // Evening: 6pm - 10pm (sunset)
  else if (hour >= 18 && hour < 22) {
    return '🌆'; // Sunset/Cityscape
  }
  // Night: 10pm - 5am (stars)
  else {
    return '✨'; // Stars
  }
};

// Helper function to get time-based avatar styling
const getTimeBasedAvatarStyle = (): string => {
  const hour = new Date().getHours();
  
  // Night: 10pm - 5am (palevioletred background with orange border)
  if (hour >= 22 || hour < 5) {
    return 'bg-[palevioletred] border-[.5px] border-solid border-[#FF6A3D] text-gray-700';
  }
  // Default: gray background
  return 'bg-gray-200 text-gray-700';
};

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
  const [expandedFeature, setExpandedFeature] = useState<{ planKey: string; featureIndex: number } | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const { toast } = useToast();

  // Pricing state - moved to parent to prevent re-fetching on hover
  const [pricing, setPricing] = useState<{
    free?: { price: number; currency: string; symbol: string; metadata?: any };
    pro?: { price: number; currency: string; symbol: string; metadata?: any };
    custom?: { price: number; currency: string; symbol: string; metadata?: any };
  }>({});
  const [pricingLoading, setPricingLoading] = useState(true);
  const pricingCacheRef = useRef<{ data: any; timestamp: number; lastUpdated: number; locale?: string } | null>(null);
  const fetchingRef = useRef<boolean>(false);
  const currentLocaleRef = useRef<string>(locale);

  // Clear cache when locale changes
  useEffect(() => {
    if (currentLocaleRef.current !== locale) {
      // Locale changed - clear cache to force fresh fetch
      pricingCacheRef.current = null;
      // Clear localStorage cache for all locales to avoid stale data
      try {
        ['en', 'he', 'ar', 'ru'].forEach(loc => {
          localStorage.removeItem(`pricing_cache_${loc}`);
        });
      } catch (e) {
        // Ignore localStorage errors
      }
      currentLocaleRef.current = locale;
    }
  }, [locale]);

  // Fetch pricing once at parent level - prevents re-fetching on hover
  useEffect(() => {
    // If already fetching, don't start another fetch
    if (fetchingRef.current) {
      return;
    }

    const cacheKey = `pricing_cache_${locale}`;
    
    // Check if we have cached data in memory - verify it's for the current locale
    const cached = pricingCacheRef.current;
    if (cached && cached.data && cached.locale === locale) {
      setPricing(cached.data);
      setPricingLoading(false);
      return; // Use cached data, no API calls
    }

    // Check localStorage as backup - verify locale matches
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only use cache if it has data and locale matches (or no locale stored for backward compatibility)
        if (parsed.data && (!parsed.locale || parsed.locale === locale)) {
          setPricing(parsed.data);
          pricingCacheRef.current = { ...parsed, locale };
          setPricingLoading(false);
          return; // Use cached data, no API calls
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // No cache exists or cache is for different locale, fetch from API
    fetchingRef.current = true;
    let cancelled = false;
    
    async function fetchPricing() {
      try {
        const response = await fetch(`/api/pricing?locale=${locale}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        
        // Don't update state if component unmounted or effect cancelled
        if (cancelled) {
          return;
        }
        
        if (data.success && data.pricing) {
          const cacheData = {
            data: data.pricing,
            timestamp: Date.now(),
            lastUpdated: data.lastUpdated || Date.now(),
            locale: locale, // Store locale with cache data
          };
          
          // Store in memory cache (persists for session)
          pricingCacheRef.current = cacheData;
          
          // Store in localStorage (persists forever, no expiration)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          } catch (e) {
            // Ignore localStorage errors
          }
          
          setPricing(data.pricing);
        } else {
          // Fallback to default pricing
          setPricing({
            free: { price: 0, currency: 'ILS', symbol: '₪' },
            pro: { price: 79, currency: 'ILS', symbol: '₪' },
            custom: { price: 249, currency: 'ILS', symbol: '₪' },
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching pricing:', error);
          // Fallback to default pricing
          setPricing({
            free: { price: 0, currency: 'ILS', symbol: '₪' },
            pro: { price: 79, currency: 'ILS', symbol: '₪' },
            custom: { price: 249, currency: 'ILS', symbol: '₪' },
          });
        }
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
          fetchingRef.current = false;
        }
      }
    }
    
    fetchPricing();
    
    // Cleanup function
    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
  }, [locale]);

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
  
  // Helper function to truncate text for card preview
  const truncateText = (text: string, maxLength: number = 120): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
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

  const toggleFeature = (planKey: string, featureIndex: number) => {
    setExpandedFeature(
      expandedFeature?.planKey === planKey && expandedFeature?.featureIndex === featureIndex
        ? null
        : { planKey, featureIndex }
    );
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
    easyCalendar: Clock,
    reminders: MessageSquare,
    smartCustomers: Users,
    bilingual: Globe,
    cancelAppointments: XCircle,
  };

  // Helper to render description with bold terms
  const renderDescriptionWithBold = (description: string, locale: string): React.ReactNode => {
    if (locale === 'he') {
      // Terms to bold in Hebrew
      const boldTerms = ['יומן חכם', 'תזכורות במייל', 'ניהול לקוחות', 'וואטסאפ', 'WhatsApp'];
      const text = description;
      const matches: Array<{ index: number; length: number; text: string }> = [];
      
      // Find all occurrences of all terms
      boldTerms.forEach(term => {
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            text: match[0]
          });
        }
      });
      
      // Sort matches by index
      matches.sort((a, b) => a.index - b.index);
      
      // Remove overlapping matches (keep first occurrence)
      const nonOverlapping: typeof matches = [];
      let lastEnd = 0;
      matches.forEach(match => {
        if (match.index >= lastEnd) {
          nonOverlapping.push(match);
          lastEnd = match.index + match.length;
        }
      });
      
      // Build parts array
      const parts: (string | React.ReactElement)[] = [];
      let lastIndex = 0;
      
      nonOverlapping.forEach((match, i) => {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        // Add bold term
        parts.push(<strong key={`bold-${i}-${match.index}`}>{match.text}</strong>);
        lastIndex = match.index + match.length;
      });
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length > 0 ? <>{parts}</> : description;
    }
    return description;
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
        'עובד אחד': 'מתאים בדיוק לעצמאיים. אתה הבוס, אתה הצוות – וזו המערכת שלך לניהול פשוט ויעיל.',
        'עד 100 הזמנות בחודש': 'מתאים לעסקים קטנים או בתחילת הדרך. מספיק לייצר הכנסה יפה, ולגדול בזמן שלך.',
        'יומן חכם ונוח': 'תזיז פגישות בקלות עם גרירה פשוטה. תצוגת יום / שבוע / חודש – מה שנוח לך.',
        'ניהול לקוחות קל ונגיש': 'כל לקוח, כל הזמנה, כל הערה – מרוכזים במקום אחד. נגמר הסלט של וואטסאפ, פתקים וזיכרון.',
        'תזכורות במייל – אוטומטיות': 'המערכת דואגת לשלוח אישור ותזכורת לכל לקוח – בלי לרדוף, בלי שכחות.',
        'תמיכה מלאה בעברית + RTL + עוד שפות': 'מתאים לקהלים דוברי עברית, ערבית, רוסית ואנגלית. הממשק מרגיש בבית.',
        'הכול מתוכנית FREE': 'כל מה שאהבת, פשוט בגרסה הרבה יותר עוצמתית.',
        'עד 5 עובדים': 'מתאים לקוסמטיקאיות עם צוות, קליניקות, מכוני יופי או עסקים שצומחים.',
        'הזמנות ללא הגבלה': 'שיווק אגרסיבי? מעולה. תזמין כמה שבא לך. אין חסימות, אין תקרות זכוכית.',
        'לוח בקרה ודו"חות חכמים': 'ראה את הכנסות, כמות פגישות, לקוחות חוזרים ועוד – בלחיצת כפתור. תתחיל להכיר את העסק שלך באמת.',
        'אינטגרציה עם WhatsApp': 'שלח תזכורות ואישורים דרך וואטסאפ. אנשים קוראים את זה. זה עובד.',
        'סנכרון עם Google Calendar': 'התזמונים שלך במקום אחד. בלי כפילויות. בלי בלגן.',
        'מותג מותאם אישית': 'שמים את הלוגו שלך, הצבעים שלך. נראה כמו מערכת פרטית שלך לגמרי.',
        'תזכורות מתקדמות': 'שולח SMS, מייל או וואטסאפ – מתי שאתה בוחר, איך שאתה בוחר. הם לא ישכחו.',
        'תמיכה בעדיפות': 'כשמשהו דחוף – יש לך גב. מענה מהיר ממוקד ומקצועי.',
        'הכול מתוכנית PRO': 'פשוט עם עוד הרבה כוח וגמישות.',
        'עובדים ללא הגבלה': 'יש לך צוות גדול? שלוחות? כולם נכנסים – בלי לשבור את הראש.',
        'גישה מלאה ל-API': 'תחבר את KalBook לכל מערכת שאתה עובד איתה – CRM, ERP, סליקה ועוד.',
        'פתרון White-Label מלא': 'מוריד את השם שלנו, מעלה את שלך. נראה כמו מוצר שאתה פיתחת.',
        'אינטגרציות מותאמות אישית': 'אנחנו מחברים אותך למה שצריך כדי שהעסק יזרום – גם אם זו מערכת נדירה.',
        'דו"חות מותאמים אישית': 'תראה את מה שחשוב לך, לא מה שכולם רואים.',
        'תמיכה במיקומים מרובים': 'ניהול של סניפים שונים תחת לוח בקרה אחד. פשוט ונקי.',
        'זרימות עבודה מותאמות': 'אוטומציה של תהליכים ייחודיים לעסק שלך. עם כללים, טריגרים, חוקים – בדיוק איך שאתה עובד.',
        'תמיכה ייעודית 24/7': 'לא רק צוות תמיכה – מנהל חשבון אישי שמכיר אותך ואת העסק שלך.',
        'פיתוח מותאם אישית': 'צריך פיצ\'ר שאין? נדאג שהוא יהיה. הצוות שלנו מפתח במיוחד עבורך.',
        // Backward compatibility - old feature names
        'יומן חכם': 'תזיז פגישות בקלות עם גרירה פשוטה. תצוגת יום / שבוע / חודש – מה שנוח לך.',
        'ניהול לקוחות': 'כל לקוח, כל הזמנה, כל הערה – מרוכזים במקום אחד. נגמר הסלט של וואטסאפ, פתקים וזיכרון.',
        'תזכורות במייל': 'המערכת דואגת לשלוח אישור ותזכורת לכל לקוח – בלי לרדוף, בלי שכחות.',
        'תמיכה דו לשונית ו-RTL': 'מתאים לקהלים דוברי עברית, ערבית, רוסית ואנגלית. הממשק מרגיש בבית.',
        'הכל בחבילת Free': 'כל מה שאהבת, פשוט בגרסה הרבה יותר עוצמתית.',
        'לוח בקרה ואנליטיקה': 'ראה את הכנסות, כמות פגישות, לקוחות חוזרים ועוד – בלחיצת כפתור. תתחיל להכיר את העסק שלך באמת.',
        'אינטגרציה עם וואטסאפ': 'שלח תזכורות ואישורים דרך וואטסאפ. אנשים קוראים את זה. זה עובד.',
        'אינטגרציה עם Google Calendar': 'התזמונים שלך במקום אחד. בלי כפילויות. בלי בלגן.',
        'הכל בחבילת Pro': 'פשוט עם עוד הרבה כוח וגמישות.',
        'גישה ל-API': 'תחבר את KalBook לכל מערכת שאתה עובד איתה – CRM, ERP, סליקה ועוד.',
        'פתרון White-Label': 'מוריד את השם שלנו, מעלה את שלך. נראה כמו מוצר שאתה פיתחת.',
        'אינטגרציות מותאמות': 'אנחנו מחברים אותך למה שצריך כדי שהעסק יזרום – גם אם זו מערכת נדירה.',
        'דוחות מתקדמים': 'תראה את מה שחשוב לך, לא מה שכולם רואים.',
        'תמיכה ייעודית': 'לא רק צוות תמיכה – מנהל חשבון אישי שמכיר אותך ואת העסק שלך.',
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
    isRTL,
    pricing,
    loading,
    expandedFeature,
    toggleFeature,
    setExpandedFeature
  }: { 
    locale: string; 
    getPlan: (planKey: string, field: string) => string;
    getPricing: (key: string) => string;
    getPlanHighlights: (planKey: string) => string[];
    hoveredFeature: { planKey: string; featureIndex: number } | null;
    setHoveredFeature: (feature: { planKey: string; featureIndex: number } | null) => void;
    getFeatureDescription: (featureText: string, locale: string) => string;
    isRTL: boolean;
    pricing: {
      free?: { price: number; currency: string; symbol: string; metadata?: any };
      pro?: { price: number; currency: string; symbol: string; metadata?: any };
      custom?: { price: number; currency: string; symbol: string; metadata?: any };
    };
    loading: boolean;
    expandedFeature: { planKey: string; featureIndex: number } | null;
    toggleFeature: (planKey: string, featureIndex: number) => void;
    setExpandedFeature: (feature: { planKey: string; featureIndex: number } | null) => void;
  }) {

    const getDisplayPrice = (planKey: string): string => {
      // Always use database price if available (regardless of translation)
      const planPricing = pricing[planKey as keyof typeof pricing];
      if (planPricing) {
        // If price is 0, show "Free"
        if (planPricing.price === 0) return 'Free';
        return planPricing.price.toFixed(0);
      }
      
      // Fallback to translation if database price not available
      const planPrice = getPlan(planKey, 'price');
      if (planPrice === 'dynamic') {
        return '79'; // Default fallback
      }
      if (planPrice === 'custom') {
        return 'Custom';
      }
      // If price is "0" in translation, show "Free"
      if (planPrice === '0') return 'Free';
      return planPrice;
    };

    const getCurrencySymbol = (planKey: string): string => {
      // Always use database pricing if available
      const planPricing = pricing[planKey as keyof typeof pricing];
      if (planPricing) {
        return planPricing.symbol;
      }
      // Fallback
      return '₪';
    };
    
    // Get highlights from database metadata if available, otherwise use translations
    const getHighlightsFromDB = (planKey: string): string[] => {
      const planPricing = pricing[planKey as keyof typeof pricing];
      // Only use database highlights if they exist and are not empty
      // Always prefer translations as they are guaranteed to be in the current locale
      const dbHighlights = planPricing?.metadata?.highlights;
      if (dbHighlights && Array.isArray(dbHighlights) && dbHighlights.length > 0) {
        // Use database highlights if available
        return dbHighlights;
      }
      // Always fallback to translations which are guaranteed to be in the current locale
      const translationHighlights = getPlanHighlights(planKey);
      if (translationHighlights && translationHighlights.length > 0) {
        return translationHighlights;
      }
      // Final fallback - return empty array
      return [];
    };

    return (
      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {['free', 'pro', 'custom'].map((planKey, index) => {
          const isPro = planKey === 'pro';
          const isCustom = planKey === 'custom';
          const highlightsArray = getHighlightsFromDB(planKey);
          const displayPrice = getDisplayPrice(planKey);
          const currencySymbol = getCurrencySymbol(planKey);
          const planMetadata = pricing[planKey as keyof typeof pricing]?.metadata;
          
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
                className={`p-6 h-full relative flex flex-col border border-[#e2e2e2] ${isPro ? 'border-2 border-[#ff411b] shadow-lg scale-105' : ''} ${isCustom ? 'border-2 border-[#e2e2e2]' : ''}`}
              >
                {(isPro || planKey === 'free' || planKey === 'custom') && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPro ? 'bg-[#ff411b] text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {planKey === 'free' ? (locale === 'he' ? 'בסיסי' : 'Basic') : planKey === 'custom' ? 'Custom' : getPricing('bestSeller')}
                    </span>
                  </div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-xl font-bold mb-2 text-[#030408]">
                    <strong>{planMetadata?.name || getPlan(planKey, 'name')}</strong>
                  </h3>
                  <div className="mb-2">
                    {loading ? (
                      <span className="text-3xl font-bold text-gray-700">...</span>
                    ) : displayPrice === 'Free' ? (
                      <span className="text-3xl font-bold text-gray-700">
                        {locale === 'he' ? 'חינם' : 'Free'}
                      </span>
                    ) : planKey === 'custom' ? (
                      <span className="text-3xl font-bold text-gray-700">
                        {(locale === 'he' || locale === 'ar') ? (
                          <>
                            <span className="text-xs text-gray-600 font-normal">
                              {locale === 'he' ? 'החל מ-' : 'بدءًا من'}
                            </span>
                            <span>{currencySymbol}{pricing.custom?.price || 249}</span>
                            <span className="text-gray-500 text-base font-normal ml-1">
                              {' / '}{getPricing('month')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-gray-600 font-normal">
                              {locale === 'ru' ? 'Начиная с ' : 'Starting at '}
                            </span>
                            <span>{currencySymbol}{pricing.custom?.price || 249}</span>
                            <span className="text-gray-500 text-base font-normal ml-1">
                              {' / '}{getPricing('month')}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <>
                        <span className={`text-3xl font-bold ${isPro ? 'text-[#ff411b]' : 'text-gray-700'}`}>
                          {currencySymbol}{displayPrice}
                        </span>
                        <span className="text-gray-500 text-base ml-1">
                          {' / '}{getPricing('month')}
                        </span>
                      </>
                    )}
                  </div>
                  {(planMetadata?.priceNote || getPlan(planKey, 'priceNote')) && (
                    <p className="text-xs text-gray-500 mb-2" style={{ whiteSpace: 'pre-line' }}>
                      {planMetadata?.priceNote || (planKey === 'pro' && locale === 'he' ? 'למקצוענים שבינינו' : getPlan(planKey, 'priceNote'))}
                    </p>
                  )}
                  {(planMetadata?.note || getPlan(planKey, 'note')) && (
                    <p className="text-xs text-gray-500 mb-3">
                      {planMetadata?.note || (planKey === 'free' && locale === 'he' ? (
                        <>
                          התחל לנהל את ההזמנות שלך היום<br />
                          <br />
                          <span className="text-gray-700 font-bold">אין צורך בכרטיס אשראי</span>
                        </>
                      ) : (
                        getPlan(planKey, 'note')
                      ))}
                    </p>
                  )}
                </div>
                <ul className="space-y-1 mb-5 flex-grow relative">
                  {highlightsArray.map((highlight: string, i: number) => {
                    const isExpanded = expandedFeature?.planKey === planKey && expandedFeature?.featureIndex === i;
                    return (
                      <li 
                        key={i} 
                        className="relative"
                      >
                        <div className="overflow-hidden">
                          <button
                            onClick={() => toggleFeature(planKey, i)}
                            style={{
                              backgroundColor: isExpanded ? 'rgb(247, 247, 248)' : undefined
                            }}
                            className={`w-full py-2 px-1 flex items-center justify-between transition-all duration-200 ease-in-out rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
                            onMouseEnter={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.backgroundColor = 'rgb(247, 247, 248)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isExpanded) {
                                e.currentTarget.style.backgroundColor = '';
                              }
                            }}
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <Check className="w-4 h-4 text-[#17a34a] mt-0.5 flex-shrink-0" />
                              <div className="flex-1 pr-4">
                                <span className={`text-sm transition-colors duration-200 ${
                                  isExpanded ? 'text-[#030408] font-bold' : 'text-gray-600 font-semibold'
                                }`}>{highlight}</span>
                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.span
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <br />
                                      <span className="text-sm text-gray-600 leading-relaxed">
                                        {renderDescriptionWithBold(getFeatureDescription(highlight, locale), locale)}
                                      </span>
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 transition-all duration-200 ease-in-out flex-shrink-0 text-gray-400 ${
                                isExpanded 
                                  ? 'transform rotate-180' 
                                  : ''
                              }`}
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {planKey === 'custom' ? (
                  <Button
                    className="w-full border border-[#ff411b] text-[#ff411b] bg-white hover:bg-orange-50"
                    variant="outline"
                    size="lg"
                    onClick={() => setContactModalOpen(true)}
                  >
                    {getPlan(planKey, 'cta')}
                  </Button>
                ) : (
                  <Link href={`/onboarding?plan=${planKey}`} className="block mt-auto">
                    <Button
                      className={`w-full ${isPro ? 'bg-[#ff411b] hover:bg-[#e23a16] text-white' : 'border border-[#ff411b] text-[#ff411b] bg-white hover:bg-orange-50'}`}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
          <div className="flex items-center justify-between gap-2">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <LanguageToggle />
            </div>
            
            {/* User menu / Login button */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {!user && (
                <Button 
                  variant="outline" 
                  className={`h-8 sm:h-10 px-2 sm:px-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                  onClick={() => setLoginModalOpen(true)}
                  disabled={loadingUser}
                  aria-label={t('adminLogin.homepageLogin') || 'Admin Login'}
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className={`text-xs sm:text-sm font-medium ${isRTL ? 'mr-1 sm:mr-2' : 'ml-1 sm:ml-2'}`}>
                    {t('adminLogin.login') || t('auth.login') || 'Login'}
                  </span>
                </Button>
              )}
              {!loadingUser && user && (
                <>
                  <div className="w-2 sm:w-3" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 welcome-back-button ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0">
                          <AvatarFallback className={`${getTimeBasedAvatarStyle()} text-xs sm:text-sm`}>
                            {getTimeBasedEmoji()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {getTimeBasedGreeting(locale as 'en' | 'he' | 'ar' | 'ru')}, <span className="font-medium text-foreground">{user.name}</span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align={isRTL ? "end" : "end"} 
                      className={isRTL ? "text-right [&>*]:text-right" : ""}
                      style={isRTL ? { direction: 'rtl' } : { direction: 'ltr' }}
                    >
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleGoToDashboard} className={`cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.title') || 'My Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer text-[#030408] hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('userDashboard.logout') || 'Logout'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
          
          {/* Center - Logo (absolutely positioned for true centering) */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Link href="/">
              <img 
                src="/kalbook-logo.svg" 
                alt="KalBook.io" 
                className="h-8 sm:h-12 w-auto cursor-pointer"
              />
            </Link>
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
                <div className="relative mx-auto" style={{ width: '100%', aspectRatio: '9/17', maxWidth: '240px' }}>
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
                        <source src="https://urqobqgofkwobbwfszxa.supabase.co/storage/v1/object/public/business-assets/iphone_onboarding.mp4" type="video/mp4" />
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
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Main Content - Centered with improved hierarchy */}
            <div className="max-w-3xl mx-auto">
              {/* Main headline */}
              <div dir={isRTL ? 'rtl' : 'ltr'}>
                <h1 
                  className="text-2xl md:text-3xl font-semibold text-[#030408] text-center leading-snug max-w-[700px] mx-auto"
                >
                  {getHome('hero.title')}
                </h1>
                <p className="text-center text-gray-600 mt-4 text-base md:text-lg">
                  {getHome('hero.subtitle')}
                </p>
              </div>
              
              {/* Bullet list */}
              <div className="mb-3 sm:mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
                {((getHome('hero.bullets') as string[]) || []).map((item: string, itemIndex: number) => (
                  <div 
                    key={itemIndex}
                    className="flex items-center justify-center mb-0.5"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <span className={`text-gray-600 text-3xl ${isRTL ? 'ml-2' : 'mr-2'}`}>•</span>
                    <span className="text-sm sm:text-base text-gray-600 text-center">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Highlight line */}
              <p 
                className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 mb-8 sm:mb-10 mt-6 sm:mt-8 leading-none text-center"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {getHome('hero.highlight')}
              </p>
            </div>
            <div className={`flex gap-3 sm:gap-4 justify-center flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Button 
                size="lg" 
                className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto bg-[#ff411b] hover:bg-[#e23a16] text-white shadow-md"
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
                className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto border border-[#ff411b] text-[#ff411b] bg-white hover:bg-orange-50"
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
                <div className="relative mx-auto" style={{ width: '100%', aspectRatio: '9/17', maxWidth: '240px' }}>
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
                        <source src="https://urqobqgofkwobbwfszxa.supabase.co/storage/v1/object/public/business-assets/iphone_onboarding.mp4" type="video/mp4" />
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#030408]">{getHome('features.title')}</h2>
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
                  className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer bg-[#f7f7f8] border border-[#e2e2e2]"
                  onClick={() => setSelectedFeature(key)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg">
                      <Icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-[#030408]">{getFeature(key, 'title')}</h3>
                      <p className="text-gray-600 line-clamp-2">{getFeature(key, 'desc')}</p>
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
                  <div className="p-3 rounded-lg">
                    {(() => {
                      const Icon = featureIcons[selectedFeature as keyof typeof featureIcons] || Calendar;
                      return <Icon className="w-8 h-8 text-gray-600" />;
                    })()}
                  </div>
                  <DialogTitle className="text-2xl text-[#030408]">{getFeature(selectedFeature, 'title')}</DialogTitle>
                </div>
              </DialogHeader>
              <DialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {getFeature(selectedFeature, 'desc')}
                  </p>
                </div>
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Who is it for Section - Compact Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#030408]">{getHome('whoIsItFor.title')}</h2>
        </motion.div>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {((getHome('whoIsItFor.categories') as string[]) || []).map((category: string, index: number) => (
              <div 
                key={index}
                className={`p-4 bg-[#f7f7f8] border border-[#e2e2e2] rounded-lg text-center ${index === 4 ? 'col-span-2 md:col-span-2' : ''}`}
              >
                <p className="text-sm text-gray-700">{category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#030408]">{getPricing('title')}</h2>
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
            pricing={pricing}
            loading={pricingLoading}
            expandedFeature={expandedFeature}
            toggleFeature={toggleFeature}
            setExpandedFeature={setExpandedFeature}
          />
        </div>
      </section>

      {/* Testimonials Section - Compact */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[#030408]">{getHome('testimonials.title')}</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {((getHome('testimonials.items') as Array<{text: string, author: string}>) || []).map((testimonial: {text: string, author: string}, index: number) => (
            <Card key={index} className="p-4 bg-[#f7f7f8] border border-[#e2e2e2]">
              <p className={`text-sm ${index === 0 ? 'text-gray-700' : 'text-gray-600'} text-center`} dir={isRTL ? 'rtl' : 'ltr'}>
                "{testimonial.text}" – {testimonial.author}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Custom Features Section - Hidden but kept for future use */}
      {/* <section className="bg-white py-16">
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
                  <h3 className="text-xl font-semibold mb-2 text-[#030408]">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#030408]">{t('home.faq.title')}</h2>
        </motion.div>

        <div className="space-y-4">
          {(() => {
            // Show items: 0, 1, 2, 3 (current) + 4, 5, 7, 10, 11, 12 (items 5, 6, 8, 11, 12, 13)
            const faqItems = homeData?.faq?.items || [];
            const indicesToShow = [0, 1, 2, 3, 4, 5, 7, 10, 11, 12];
            const filteredItems = indicesToShow
              .filter(idx => idx < faqItems.length)
              .map(idx => ({ item: faqItems[idx], originalIndex: idx }));
            
            return filteredItems.map(({ item, originalIndex }, displayIndex) => (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.2, delay: displayIndex * 0.05 }}
              >
                <Card className="overflow-hidden bg-white border border-[#e2e2e2]">
                  <button
                    onClick={() => toggleFaq(originalIndex)}
                    style={{
                      backgroundColor: expandedFaq === originalIndex ? 'rgb(247 247 248 / var(--tw-bg-opacity))' : undefined
                    }}
                    className={`w-full p-6 flex items-center justify-between text-left transition-all duration-300 ease-in-out ${
                      expandedFaq === originalIndex 
                        ? 'bg-[#f7f7f8]' 
                        : ''
                    } hover:!bg-[#f7f7f8] text-[#030408] hover:!text-[#030408]`}
                  >
                    <span className={`font-semibold text-lg pr-4 transition-colors duration-300 ${
                      expandedFaq === originalIndex ? 'text-[#030408]' : 'text-[#030408]'
                    }`}>{getFaq(originalIndex, 'q')}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-all duration-300 ease-in-out flex-shrink-0 ${
                        expandedFaq === originalIndex 
                          ? 'transform rotate-180 text-gray-500' 
                          : 'text-gray-500'
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {expandedFaq === originalIndex && (
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
                          <p className="text-gray-600">{getFaq(originalIndex, 'a')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ));
          })()}
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
                  <Mail className="w-5 h-5 text-gray-600" />
                  <a href="mailto:contact@kalbook.io" className="text-sm hover:text-gray-700 transition-colors">
                    contact@kalbook.io
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <a href="tel:+972542636737" className="text-sm hover:text-gray-700 transition-colors">
                    054-263-3737
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <a
                    href="https://wa.me/972542636737"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-gray-700 transition-colors"
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
                  className="bg-[#f7f7f8] border border-[#e2e2e2]"
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
                  className="bg-[#f7f7f8] border border-[#e2e2e2]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">{getHome('contact.message') || 'Message'}</Label>
                <Textarea
                  id="contact-message"
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                  className="bg-[#f7f7f8] border border-[#e2e2e2]"
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingContact} className="w-full bg-[#ff411b] hover:bg-[#e23a16] text-white">
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

