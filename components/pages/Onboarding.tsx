"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scissors, Sparkles, Dumbbell, Briefcase, Trash2, Plus, Heart, Palette, Waves, Activity, HeartPulse, Users, Apple, Home, Check, User, LogOut, LayoutDashboard, ChevronDown, Mail, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useLocale } from "@/hooks/useLocale";
import { TypingAnimation } from "@/components/ui/TypingAnimation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTimeBasedGreeting } from "@/lib/utils/greetings";
import { Footer } from "@/components/ui/Footer";
import { getDefaultServices } from "@/lib/onboarding/utils";
import type { BusinessType } from "@/lib/supabase/database.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [planDetails, setPlanDetails] = useState<{name: string, price: number, symbol: string, metadata?: any} | null>(null);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [allPlans, setAllPlans] = useState<Array<{name: string, price: number, symbol: string, key: string, metadata?: any}>>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<{ planKey: string; featureIndex: number } | null>(null);
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
  const isMobile = useIsMobile();
  const lastBusinessTypeRef = useRef<BusinessType | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  
  // Total steps - 10 steps (excluding authentication step 1)
  const TOTAL_STEPS = 10;
  
  // Calculate display step (step 1 is authentication, not counted)
  const displayStep = step > 1 ? step - 1 : 0;
  
  // Current service step (for steps 8-10)
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);

  // User state for header
  const [user, setUser] = useState<{ name: string; email: string; business: { slug: string } } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

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
    // Redirect to user dashboard
    router.push('/user/dashboard');
  };

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

  const getHome = (key: string): string => {
    const homeData = getTranslation('home');
    if (!homeData) return '';
    const keys = key.split('.');
    let value: any = homeData;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    return value || '';
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
      setShowPlanModal(false);
    } catch (error) {
      toast.error(getHome('contact.error') || 'Failed to send message. Please try again.');
    } finally {
      setSubmittingContact(false);
    }
  };

  const toggleFeature = (planKey: string, featureIndex: number) => {
    setExpandedFeature(
      expandedFeature?.planKey === planKey && expandedFeature?.featureIndex === featureIndex
        ? null
        : { planKey, featureIndex }
    );
  };

  const renderDescriptionWithBold = (description: string, locale: string): React.ReactNode => {
    if (locale === 'he') {
      // Terms to bold in Hebrew
      const boldTerms = ['יומן חכם', 'תזכורות במייל', 'ניהול לקוחות', 'וואטסאפ', 'WhatsApp'];
      const parts: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let key = 0;
      
      // Find all matches and their positions
      const matches: Array<{ term: string; index: number; length: number }> = [];
      boldTerms.forEach(term => {
        // Escape special regex characters in the term
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedTerm, 'gi');
        let match;
        let lastIndex = 0;
        while ((match = regex.exec(description)) !== null) {
          // Prevent infinite loop if regex doesn't advance
          if (match.index === lastIndex) {
            regex.lastIndex++;
            continue;
          }
          lastIndex = match.index;
          matches.push({ term: match[0], index: match.index, length: match[0].length });
        }
      });
      
      // Sort matches by index
      matches.sort((a, b) => a.index - b.index);
      
      // Remove overlapping matches (keep first occurrence)
      const filteredMatches: Array<{ term: string; index: number; length: number }> = [];
      matches.forEach(match => {
        const overlaps = filteredMatches.some(existing => 
          (match.index >= existing.index && match.index < existing.index + existing.length) ||
          (existing.index >= match.index && existing.index < match.index + match.length)
        );
        if (!overlaps) {
          filteredMatches.push(match);
        }
      });
      
      // Build parts array
      filteredMatches.forEach(match => {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(description.substring(lastIndex, match.index));
        }
        // Add bold match
        parts.push(<strong key={key++}>{match.term}</strong>);
        lastIndex = match.index + match.length;
      });
      
      // Add remaining text
      if (lastIndex < description.length) {
        parts.push(description.substring(lastIndex));
      }
      
      return <span>{parts}</span>;
    }
    return description;
  };

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
        'Dedicated support': 'Get a dedicated account manager and priority support for all your needs.',
        'Custom development': 'We can build custom features tailored specifically to your business requirements.',
        'משתמש אחד': 'מושלם ליזמים עצמאיים. נהל את העסק שלך עם חשבון עובד אחד.',
        'עד 100 הזמנות בחודש': 'אידיאלי לעסקים קטנים שמתחילים. שדרג כשתצטרך יותר קיבולת.',
        'יומן חכם': 'צפה בלוח הזמנים שלך בפורמט יומי, שבועי או חודשי. גרור ושחרר כדי לשנות תורים.',
        'ניהול לקוחות': 'אחסן מידע על לקוחות, היסטוריית הזמנות והערות במקום אחד.',
        'תזכורות במייל': 'אישורים ותזכורות אוטומטיים במייל כדי להפחית אי-הגעה.',
        'תמיכה דו לשונית ו-RTL': 'תמיכה מלאה בעברית, אנגלית, ערבית ורוסית עם פריסה מימין לשמאל.',
        'עד 5 עובדים': 'הוסף עד 5 חברי צוות. מושלם לעסקים קטנים ובינוניים.',
        'עובדים ללא הגבלה': 'הוסף כמה חברי צוות שאתה צריך. מושלם לעסקים גדלים.',
        'הזמנות ללא הגבלה': 'אין הגבלות על כמה תורים אתה יכול לנהל. גדל ללא הגבלות.',
        'הכל בחבילת Free': 'כל התכונות מתוכנית Free כלולות ב-Pro.',
        'לוח בקרה ואנליטיקה': 'עקוב אחר הכנסות, מגמות הזמנות ותובנות לקוחות עם דוחות מפורטים.',
        'אינטגרציה עם וואטסאפ': 'שלח אישורי תורים ותזכורות דרך WhatsApp לשיפור מעורבות.',
        'אינטגרציה עם Google Calendar': 'סנכרן את התורים שלך עם Google Calendar. כל התורים שלך במקום אחד.',
        'מותג מותאם אישית': 'הוסף את הלוגו וצבעי המותג שלך כדי להפוך את דף ההזמנה לשליך באמת.',
        'תזכורות מתקדמות': 'תזמון תזכורות ניתן להתאמה אישית וערוצי תזכורות מרובים.',
        'תמיכה בעדיפות': 'קבל זמני תגובה מהירים יותר ותמיכה ייעודית כשאתה צריך עזרה.',
        'הכל בחבילת Pro': 'כל תכונות תוכנית Pro כלולות ב-Custom.',
        'גישה ל-API': 'גישה מלאה ל-REST API לשילוב KalBook עם המערכות והתהליכים הקיימים שלך.',
        'פתרון White-Label': 'הסר לחלוטין את המותג שלנו והשתמש בשלך. מושלם לסוכנויות וסוחרים.',
        'אינטגרציות מותאמות': 'חבר את KalBook ל-CRM, ERP, מעבדי תשלום וכלי עסק אחרים שלך.',
        'דוחות מתקדמים': 'דוחות מותאמים אישית לצרכי העסק שלך עם יכולות ייצוא.',
        'תמיכה במיקומים מרובים': 'נהל סניפים או מיקומים מרובים מדאשבורד אחד.',
        'אוטומציות עבודה מותאמות': 'הפעל את תהליכי העסק הייחודיים שלך עם כללים וטריגרים מותאמים אישית.',
        'תמיכה ייעודית': 'קבל מנהל חשבונות ייעודי ותמיכה בעדיפות לכל הצרכים שלך.',
        'פיתוח מותאם אישית': 'אנחנו יכולים לבנות תכונות מותאמות אישית המותאמות במיוחד לדרישות העסק שלך.',
      },
      he: {
        'משתמש אחד': 'מושלם ליזמים עצמאיים. נהל את העסק שלך עם חשבון עובד אחד.',
        'עד 100 הזמנות בחודש': 'אידיאלי לעסקים קטנים שמתחילים. שדרג כשתצטרך יותר קיבולת.',
        'יומן חכם': 'צפה בלוח הזמנים שלך בפורמט יומי, שבועי או חודשי. גרור ושחרר כדי לשנות תורים.',
        'ניהול לקוחות': 'אחסן מידע על לקוחות, היסטוריית הזמנות והערות במקום אחד.',
        'תזכורות במייל': 'אישורים ותזכורות אוטומטיים במייל כדי להפחית אי-הגעה.',
        'תמיכה דו לשונית ו-RTL': 'תמיכה מלאה בעברית, אנגלית, ערבית ורוסית עם פריסה מימין לשמאל.',
        'עד 5 עובדים': 'הוסף עד 5 חברי צוות. מושלם לעסקים קטנים ובינוניים.',
        'עובדים ללא הגבלה': 'הוסף כמה חברי צוות שאתה צריך. מושלם לעסקים גדלים.',
        'הזמנות ללא הגבלה': 'אין הגבלות על כמה תורים אתה יכול לנהל. גדל ללא הגבלות.',
        'הכל בחבילת Free': 'כל התכונות מתוכנית Free כלולות ב-Pro.',
        'לוח בקרה ואנליטיקה': 'עקוב אחר הכנסות, מגמות הזמנות ותובנות לקוחות עם דוחות מפורטים.',
        'אינטגרציה עם וואטסאפ': 'שלח אישורי תורים ותזכורות דרך WhatsApp לשיפור מעורבות.',
        'אינטגרציה עם Google Calendar': 'סנכרן את התורים שלך עם Google Calendar. כל התורים שלך במקום אחד.',
        'מותג מותאם אישית': 'הוסף את הלוגו וצבעי המותג שלך כדי להפוך את דף ההזמנה לשליך באמת.',
        'תזכורות מתקדמות': 'תזמון תזכורות ניתן להתאמה אישית וערוצי תזכורות מרובים.',
        'תמיכה בעדיפות': 'קבל זמני תגובה מהירים יותר ותמיכה ייעודית כשאתה צריך עזרה.',
        'הכל בחבילת Pro': 'כל תכונות תוכנית Pro כלולות ב-Custom.',
        'גישה ל-API': 'גישה מלאה ל-REST API לשילוב KalBook עם המערכות והתהליכים הקיימים שלך.',
        'פתרון White-Label': 'הסר לחלוטין את המותג שלנו והשתמש בשלך. מושלם לסוכנויות וסוחרים.',
        'אינטגרציות מותאמות': 'חבר את KalBook ל-CRM, ERP, מעבדי תשלום וכלי עסק אחרים שלך.',
        'דוחות מתקדמים': 'דוחות מותאמים אישית לצרכי העסק שלך עם יכולות ייצוא.',
        'תמיכה במיקומים מרובים': 'נהל סניפים או מיקומים מרובים מדאשבורד אחד.',
        'אוטומציות עבודה מותאמות': 'הפעל את תהליכי העסק הייחודיים שלך עם כללים וטריגרים מותאמים אישית.',
        'תמיכה ייעודית': 'קבל מנהל חשבונות ייעודי ותמיכה בעדיפות לכל הצרכים שלך.',
        'פיתוח מותאם אישית': 'אנחנו יכולים לבנות תכונות מותאמות אישית המותאמות במיוחד לדרישות העסק שלך.',
      },
      ar: {},
      ru: {},
    };

    const localeDescriptions = descriptions[locale] || descriptions['en'];
    return localeDescriptions[featureText] || featureText;
  };

  // Get encouragement message based on progress
  const getEncouragementMessage = (currentStep: number, totalSteps: number): string => {
    const percentage = Math.round((currentStep / totalSteps) * 100);
    const messages = {
      en: {
        early: "You're on the right track! 🚀",
        middle: "Great! You're already halfway there ✨",
        late: "Almost done! Your system is almost ready 🎉",
        final: "That's it! One more moment and you're in the system 🎊"
      },
      he: {
        early: "אתה בדרך הנכונה! 🚀",
        middle: "מעולה! אתה כבר באמצע הדרך ✨",
        late: "כמעט סיימת! עוד רגע המערכת שלך מוכנה 🎉",
        final: "זהו! עוד שנייה ואתה בתוך המערכת 🎊"
      },
      ar: {
        early: "أنت على الطريق الصحيح! 🚀",
        middle: "رائع! أنت بالفعل في منتصف الطريق ✨",
        late: "كادت تنتهي! لحظة أخرى ونظامك جاهز 🎉",
        final: "هذا كل شيء! لحظة أخرى وستكون في النظام 🎊"
      },
      ru: {
        early: "Вы на правильном пути! 🚀",
        middle: "Отлично! Вы уже на полпути ✨",
        late: "Почти готово! Еще момент и ваша система готова 🎉",
        final: "Вот и все! Еще секунда и вы в системе 🎊"
      }
    };
    
    const langMessages = messages[locale as keyof typeof messages] || messages.en;
    
    if (percentage < 30) return langMessages.early;
    if (percentage < 60) return langMessages.middle;
    if (percentage < 90) return langMessages.late;
    return langMessages.final;
  };

  // Get step-specific feedback message
  const getStepFeedback = (currentStep: number): string => {
    const feedbacks: Record<number, Record<string, string>> = {
      2: {
        en: "Great! The business name is almost ready.",
        he: "מצוין! שם העסק עוד רגע מוכן.",
        ar: "رائع! اسم العمل جاهز تقريبًا.",
        ru: "Отлично! Название бизнеса почти готово."
      },
      3: {
        en: "Nice! A few more details and you'll have an active system.",
        he: "יפה! עוד כמה פרטים ויש לך מערכת פעילה.",
        ar: "جميل! بضع تفاصيل أخرى وستحصل على نظام نشط.",
        ru: "Отлично! Еще несколько деталей и у вас будет активная система."
      },
      4: {
        en: "Perfect! This helps us build you an accurate display.",
        he: "מעולה! זה עוזר לנו לבנות לך תצוגה מדויקת.",
        ar: "مثالي! هذا يساعدنا في بناء عرض دقيق لك.",
        ru: "Отлично! Это помогает нам создать для вас точный дисплей."
      },
      5: {
        en: "Excellent! Your system is almost ready.",
        he: "נהדר! עוד רגע המערכת שלך מוכנה.",
        ar: "ممتاز! نظامك جاهز تقريبًا.",
        ru: "Отлично! Ваша система почти готова."
      },
      8: {
        en: "Nice! 2 more services and you'll have an active menu.",
        he: "יפה! עוד 2 שירותים ויש לך תפריט פעיל.",
        ar: "جميل! خدمتان أخريان وستحصل على قائمة نشطة.",
        ru: "Отлично! Еще 2 услуги и у вас будет активное меню."
      },
      9: {
        en: "Great! One more service and you'll have a full menu.",
        he: "מצוין! עוד שירות אחד ויש לך תפריט מלא.",
        ar: "رائع! خدمة أخرى وستحصل على قائمة كاملة.",
        ru: "Отлично! Еще одна услуга и у вас будет полное меню."
      },
      10: {
        en: "Perfect! Your menu is ready.",
        he: "מושלם! התפריט שלך מוכן.",
        ar: "مثالي! قائمتك جاهزة.",
        ru: "Отлично! Ваше меню готово."
      }
    };
    
    const stepFeedback = feedbacks[currentStep];
    if (!stepFeedback) return "";
    
    return stepFeedback[locale] || stepFeedback.en || "";
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
    // Focus on phone input (desktop only)
    if (!isMobile) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
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
        // Format phone for display (remove country code, add dashes)
        const displayPhone = formatPhoneForDisplay(phoneNumber);
        setAuthenticatedUser({ phone: phoneNumber });
        setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
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

  // Handle Google OAuth - use redirect on mobile, popup on desktop
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      if (isMobile) {
        // Mobile: Use redirect flow (same page)
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding&type=onboarding`,
          },
        });

        if (error) throw error;
        // Redirect will happen automatically - no need to handle response
        return;
      } else {
        // Desktop: Use popup flow
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

            // Wait a bit for cookies to sync between popup and parent window
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get Supabase Auth session to extract user info
            try {
              // Retry getting session with exponential backoff
              let session = null;
              let sessionError = null;
              const maxRetries = 5;
              
              for (let i = 0; i < maxRetries; i++) {
                const { data, error } = await supabase.auth.getSession();
                session = data?.session;
                sessionError = error;
                
                if (session?.user) {
                  break;
                }
                
                // If not found, try getUser() which might force a refresh
                if (i === 2) {
                  const { data: userData } = await supabase.auth.getUser();
                  if (userData?.user) {
                    // If getUser works but getSession doesn't, refresh the session
                    const { data: refreshedSession } = await supabase.auth.getSession();
                    session = refreshedSession?.session;
                    if (session?.user) break;
                  }
                }
                
                // Wait before retrying (exponential backoff)
                if (i < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
                }
              }
              
              if (sessionError || !session?.user) {
                // If we still don't have a session, reload the page to ensure cookies are read
                toast.info('Completing login...');
                window.location.reload();
                return;
              }

              // Set authenticated user data from Supabase Auth session
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
            } catch (error: any) {
              setLoading(false);
              toast.error(error.message || 'Failed to get user information');
            }
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
      }

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
    const validPlans = ['free', 'pro', 'custom', 'basic', 'professional', 'business'];
    if (planParam && validPlans.includes(planParam.toLowerCase())) {
      // Map old plan names to new ones
      const planMapping: Record<string, string> = {
        'basic': 'free',
        'professional': 'pro',
        'business': 'custom'
      };
      const mappedPlan = planMapping[planParam.toLowerCase()] || planParam.toLowerCase();
      // Prevent custom plan from being selected via URL - default to 'free' instead
      if (mappedPlan === 'custom' || planParam.toLowerCase() === 'custom') {
        setSelectedPlan('free');
      } else {
        setSelectedPlan(mappedPlan);
      }
    } else {
      // Default to 'free' if no plan or invalid plan provided
      setSelectedPlan('free');
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
              // Use translated name from metadata if available, otherwise use plan key
              const planName = currentPlanData.metadata?.name || 
                             selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
              setPlanDetails({
                name: planName,
                price: currentPlanData.price,
                symbol: currentPlanData.symbol,
                metadata: currentPlanData.metadata,
              });
            }
            // Set all plans for modal
            const plansArray = [
              { key: 'free', ...data.pricing.free, metadata: data.pricing.free.metadata },
              { key: 'pro', ...data.pricing.pro, metadata: data.pricing.pro.metadata },
              { key: 'custom', ...data.pricing.custom, metadata: data.pricing.custom.metadata },
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

        // Check for OAuth callback (redirect flow for mobile)
        const code = searchParams.get('code');
        const type = searchParams.get('type');
        if (code && type === 'onboarding') {
          // Wait a bit for session to be set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get Supabase Auth session to extract user info
          try {
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
            
            if (session?.user) {
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
              
              // Clean URL
              window.history.replaceState({}, '', '/onboarding');
              
              // Continue to step 2
              setTimeout(() => {
                setStep(2);
              }, 500);
            }
          } catch (error: any) {
            console.error('Error handling OAuth callback:', error);
            toast.error(error.message || 'Failed to get user information');
          }
        }

        // Check for OAuth error
        const errorParam = searchParams.get('error');
        if (errorParam === 'oauth_error') {
          toast.error(t('onboarding.auth.oauthError') || 'Authentication failed. Please try again.');
        }

        // Check Supabase session
        // First check if user is a super-admin - if so, ignore their session
        let isSuperAdminUser = false;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const verifyResponse = await fetch('/api/super-admin/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            });
            const verifyData = await verifyResponse.json();
            isSuperAdminUser = verifyData.isSuperAdmin === true;
          }
        } catch (error) {
          // If check fails, assume not super-admin
        }

        // Only use session if user is not a super-admin
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && !otpVerified && !isSuperAdminUser) {
          // User authenticated via OAuth (and not a super-admin)
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

        // Also check existing user profile API (but skip if super-admin)
        if (!isSuperAdminUser) {
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
                const userPhone = data.user.phone || '';
                const displayPhone = userPhone ? formatPhoneForDisplay(userPhone) : '';
                setAuthenticatedUser({
                  email: data.user.email,
                  phone: userPhone,
                  name: data.user.name,
                });
                setBusinessInfo(prev => ({
                  ...prev,
                  email: data.user.email,
                  phone: displayPhone,
                }));
                setOwnerName(data.user.name);
                setOtpVerified(true);
                // Automatically move to step 2 after authentication
                if (step === 1) {
                  setTimeout(() => {
                    setStep(2);
                  }, 500);
                }
              }
            }
          }
        }
      } catch (error) {
        // User is not logged in, continue normally
      }
    };
    checkAuth();
  }, [searchParams, otpVerified, step]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Ensure phone and email are filled when on step 4 (contact info step)
  useEffect(() => {
    if (step === 4) {
      // If authenticated user has phone but businessInfo doesn't, fill it
      if (authenticatedUser?.phone && !businessInfo.phone) {
        const displayPhone = formatPhoneForDisplay(authenticatedUser.phone);
        setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
      }
      // If authenticated user has email but businessInfo doesn't, fill it
      if (authenticatedUser?.email && !businessInfo.email) {
        setBusinessInfo(prev => ({ ...prev, email: authenticatedUser.email! }));
      }
      // Format phone if it's not already formatted (no dashes or has country code)
      if (businessInfo.phone && !authenticatedUser?.phone) {
        const digits = businessInfo.phone.replace(/\D/g, '');
        if (digits.length > 10 || !businessInfo.phone.includes('-')) {
          const formatted = formatPhoneForDisplay(businessInfo.phone);
          if (formatted !== businessInfo.phone) {
            setBusinessInfo(prev => ({ ...prev, phone: formatted }));
          }
        } else {
          // Ensure it's formatted with dashes
          const formatted = formatPhoneNumber(businessInfo.phone);
          if (formatted !== businessInfo.phone) {
            setBusinessInfo(prev => ({ ...prev, phone: formatted }));
          }
        }
      }
    }
  }, [step, businessInfo.phone, businessInfo.email, authenticatedUser?.phone, authenticatedUser?.email]);

  // Scroll to continue button when business type is selected on step 6
  useEffect(() => {
    if (step === 6 && businessType && continueButtonRef.current) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [businessType, step]);

  // Load default services when business type is selected and moving to step 7
  useEffect(() => {
    if (businessType && step === 7 && services.length === 0) {
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

  // Handle Enter key press to trigger Continue button on desktop
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle on desktop (not mobile)
      if (isMobile) return;
      
      // Only handle Enter key
      if (event.key !== 'Enter') return;
      
      // Don't trigger if a modal is open
      if (showOtpModal || showPlanModal) return;
      
      // Don't trigger if loading
      if (loading) return;
      
      const target = event.target as HTMLElement;
      
      // Allow Enter in single-line INPUT fields to trigger Continue
      // But exclude textareas (multi-line), selects, and contentEditable
      if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }
      
      // For INPUT fields, check if it's in OTP modal (don't trigger Continue there)
      if (target.tagName === 'INPUT') {
        const isOtpInput = target.closest('[role="dialog"]') !== null;
        if (isOtpInput) return;
      }
      
      // Only trigger if continue button is visible and enabled
      if (continueButtonRef.current && !continueButtonRef.current.disabled) {
        event.preventDefault();
        continueButtonRef.current.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, showOtpModal, showPlanModal, loading]);

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
      // Email is optional - only validate format if provided
      if (value.trim() && !validateEmail(value)) {
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
    // Step 2: Business name - validate
    if (step === 2) {
      setTouched({ name: true });
      const nameError = getFieldError('name', businessInfo.name);
      if (nameError) {
        setErrors({ name: nameError });
        toast.error(nameError);
        return;
      }
      setErrors({});
    }
    // Step 3: Owner name - validate
    if (step === 3) {
      setTouched({ ownerName: true });
      const ownerError = getFieldError('ownerName', ownerName);
      if (ownerError) {
        setErrors({ ownerName: ownerError });
        toast.error(ownerError);
        return;
      }
      setErrors({});
    }
    // Step 4: Contact Info (Phone + Email) - validate
    if (step === 4) {
      setTouched({ phone: true });
      // Check phone from businessInfo or authenticatedUser
      const phoneToValidate = businessInfo.phone || (authenticatedUser?.phone ? formatPhoneForDisplay(authenticatedUser.phone) : '');
      const phoneError = getFieldError('phone', phoneToValidate);
      if (phoneError) {
        setErrors({ phone: phoneError });
        toast.error(phoneError);
        return;
      }
      // Email is optional - no validation needed
      setErrors({});
    }
    // Step 5: Address - optional, no validation needed
    if (step === 5) {
      setErrors({});
    }
    // Step 6: Business type - check if selected
    if (step === 6 && !businessType) {
      toast.error(t('onboarding.errors.selectBusinessType'));
      return;
    }
    // Step 7-9: Services - validate current service
    if (step >= 7 && step <= 9) {
      const serviceIndex = step - 7;
      // Ensure we have enough services
      while (services.length <= serviceIndex) {
        setServices([...services, {
          id: `new-${Date.now()}-${services.length}`,
          name: '',
          description: '',
          category: '',
          duration: 30,
          price: 0,
        }]);
      }
      
      const currentService = services[serviceIndex];
      if (currentService && currentService.name.trim()) {
        // Validate service if it has a name
        if (currentService.duration <= 0 || currentService.price < 0) {
          setErrors({ services: t('onboarding.errors.invalidService') });
          toast.error(t('onboarding.errors.invalidService'));
          return;
        }
      }
      setErrors({});
    }
    // Step 10: Plan confirmation - move to final step
    if (step === 10) {
      setErrors({});
      setStep(11);
    } else if (step < 11) {
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
            plan: selectedPlan || 'free',
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
        
        // After business creation, automatically log in the user via OTP
        // to establish Supabase Auth session
        const businessSlug = result.slug || result.business?.slug;
        if (businessSlug && phoneNumber) {
          // User already verified OTP during onboarding, so we can use that
          // to establish a session by calling the business admin verify-otp endpoint
          const cleanPhone = phoneNumber.replace(/\D/g, '');
          
          // Get the OTP code from state (user already entered it)
          // If we don't have it, redirect to login page
          if (otpCode && otpCode.length === 6) {
            try {
              // Call verify-otp for the business admin to establish session
              const loginResponse = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: cleanPhone,
                  code: otpCode,
                  userType: 'business_owner',
                  businessSlug: businessSlug,
                }),
              });
              
              if (loginResponse.ok) {
                // Session established, redirect to dashboard
                setTimeout(() => {
                  window.location.href = `/b/${businessSlug}/admin/dashboard`;
                }, 1000);
              } else {
                // If login fails, redirect to login page
                setTimeout(() => {
                  window.location.href = `/b/${businessSlug}/admin/login`;
                }, 1000);
              }
            } catch (error) {
              // If login fails, redirect to login page
              setTimeout(() => {
                window.location.href = `/b/${businessSlug}/admin/login`;
              }, 1000);
            }
          } else {
            // No OTP code available, redirect to login page
            setTimeout(() => {
              window.location.href = `/b/${businessSlug}/admin/login`;
            }, 2000);
          }
        } else {
          // Fallback to home if slug not available
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
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
        {/* Header - Same as main page */}
        <header className="bg-white border-b mb-8 rounded-lg shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
            <div className="flex items-center justify-between gap-2">
              {/* Language Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <LanguageToggle />
              </div>
              
              {/* User menu / Greetings */}
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {!loadingUser && user && (
                  <>
                    <div className="w-2 sm:w-3" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 welcome-back-button ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{user.name}</span>
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
                  className="h-8 sm:h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
          </div>
        </header>
        
        {/* Plan Banner - Softer */}
        {planDetails && step < 10 && step > 1 && (
          <Card className="mb-6 p-4 border-green-200 bg-green-50">
            <div className="flex items-center justify-between" dir={dir}>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">
                  {t('onboarding.selectedPlan') || 'Selected Plan'}
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-gray-800">
                    {planDetails.name}
                  </span>
                  {selectedPlan === 'free' && (
                    <span className="text-sm text-gray-600">
                      חינם - לא נדרש אמצעי תשלום
                    </span>
                  )}
                  {planDetails.price > 0 && (
                    <span className="text-gray-600">
                      {planDetails.symbol}{planDetails.price}/{t('home.pricing.month') || 'month'}
                    </span>
                  )}
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
        
        {/* Enhanced Progress Bar - Soft Green/Turquoise */}
        {step > 1 && (
          <div className="mb-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {locale === 'he' ? `שלב ${displayStep} מתוך ${TOTAL_STEPS}` : 
                   locale === 'ar' ? `الخطوة ${displayStep} من ${TOTAL_STEPS}` :
                   locale === 'ru' ? `Шаг ${displayStep} из ${TOTAL_STEPS}` :
                   `Step ${displayStep} of ${TOTAL_STEPS}`}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round((displayStep / TOTAL_STEPS) * 100)}% {t('onboarding.complete') || (locale === 'he' ? 'הושלם' : locale === 'ar' ? 'مكتمل' : locale === 'ru' ? 'завершено' : 'complete')}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(displayStep / TOTAL_STEPS) * 100}%`,
                    background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                  }}
                />
              </div>
              {/* Encouragement message - more friendly */}
              <p className="text-xs text-gray-600 mt-2 text-center">
                {getEncouragementMessage(displayStep, TOTAL_STEPS)}
              </p>
            </div>
          </div>
        )}

        {/* Step Content - Softer, more modern card */}
        <Card className="p-6 sm:p-8 shadow-lg border-gray-200 bg-white rounded-2xl">
          {step === 1 && (
            <div className="animate-fade-in">
              {/* Welcome Message - Softer */}
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium mb-2 text-gray-700">{t('onboarding.auth.welcome') || t('onboarding.auth.title') || 'Get Started'}</h2>
                <p className="text-sm text-gray-600">
                  {locale === 'he' ? 'זה לוקח פחות מדקה :)' :
                   locale === 'ar' ? 'يستغرق أقل من دقيقة :)' :
                   locale === 'ru' ? 'Это займет меньше минуты :)' :
                   "This takes less than a minute :)"}
                </p>
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
                        className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20`}
                        dir={dir}
                      />
                    </div>

                    <LoadingButton
                      onClick={handleSendOtp}
                      loading={sendingOtp}
                      disabled={!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 10}
                      className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
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
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t('onboarding.auth.authenticated') || 'Authenticated!'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {authenticatedUser?.phone && (() => {
                      const formattedPhone = formatPhoneForDisplay(authenticatedUser.phone);
                      return t('onboarding.auth.phoneVerified')?.replace('{phone}', formattedPhone) || `Phone ${formattedPhone} verified`;
                    })() || 
                     authenticatedUser?.email && t('onboarding.auth.emailVerified')?.replace('{email}', authenticatedUser.email) ||
                     t('onboarding.auth.readyToContinue') || 'You\'re ready to continue'}
                  </p>
                  <LoadingButton 
                    onClick={handleNext} 
                    loading={loading} 
                    className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    {t('onboarding.buttons.continue') || 'Continue'}
                  </LoadingButton>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">
                {locale === 'he' ? 'מה שם העסק שלך?' :
                 locale === 'ar' ? 'ما اسم عملك؟' :
                 locale === 'ru' ? 'Какое название вашего бизнеса?' :
                 "What's your business name?"}
              </h2>
              
              {/* Subtitle - more friendly */}
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'he' ? 'כדי שנוכל להציג אותו ללקוחות במסך קביעת תור' :
                 locale === 'ar' ? 'حتى نتمكن من عرضه للعملاء في شاشة الحجز' :
                 locale === 'ru' ? 'Чтобы мы могли показать его клиентам на экране бронирования' :
                 "So we can show it to customers on the booking page"}
              </p>
              
              {/* Reassuring message - softer */}
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                 "💡 Don't worry – everything can be changed later"}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="name" className="text-center block">
                    {locale === 'he' ? 'שם העסק' :
                     locale === 'ar' ? 'اسم العمل' :
                     locale === 'ru' ? 'Название бизнеса' :
                     'Business Name'}
                  </Label>
                  <Input
                    id="name"
                    placeholder={locale === 'he' ? 'לדוגמה: סטודיו חן פיטנס' : (t('onboarding.businessInfo.namePlaceholder') || 'e.g., Dima\'s Barbershop')}
                    value={businessInfo.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    dir={dir}
                    className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.name ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    autoFocus={!isMobile}
                  />
                  {/* Explanation under field - removed as it's in subtitle */}
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                
                {/* Preview - softer design */}
                {businessInfo.name && !errors.name && (
                  <div className="mt-5 p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-xs text-gray-600 mb-2">
                      {locale === 'he' ? '✨ כך זה ייראה ללקוחות:' :
                       locale === 'ar' ? '✨ هكذا سيظهر للعملاء:' :
                       locale === 'ru' ? '✨ Так это будет выглядеть для клиентов:' :
                       '✨ This is how it will look to customers:'}
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      KalBook - {businessInfo.name}
                    </p>
                  </div>
                )}
                
                {/* Positive feedback - softer */}
                {businessInfo.name && !errors.name && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-3">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">{getStepFeedback(2)}</span>
                  </div>
                )}
                
                {/* Error message - softer */}
                {errors.name && (
                  <p className="mt-2 text-sm text-slate-500">
                    {locale === 'he' ? 'צריך רק למלא את שם העסק כדי להמשיך :)' :
                     locale === 'ar' ? 'تحتاج فقط لملء اسم العمل للمتابعة :)' :
                     locale === 'ru' ? 'Нужно просто заполнить название бизнеса, чтобы продолжить :)' :
                     'Just need to fill in the business name to continue :)'}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Owner Name */}
          {step === 3 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">
                {locale === 'he' ? 'מה השם שלך?' :
                 locale === 'ar' ? 'מה اسمك؟' :
                 locale === 'ru' ? 'Как вас зовут?' :
                 "What's your name?"}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'he' ? 'כך נציג אותך במערכת' :
                 locale === 'ar' ? 'هكذا سنعرضك في النظام' :
                 locale === 'ru' ? 'Так мы покажем вас в системе' :
                 "This is how we'll show you in the system"}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                 "💡 Don't worry – everything can be changed later"}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="ownerName" className="text-center block">
                    {locale === 'he' ? 'שם הבעלים' :
                     locale === 'ar' ? 'اسم المالك' :
                     locale === 'ru' ? 'Имя владельца' :
                     'Owner Name'}
                  </Label>
                  <Input
                    id="ownerName"
                    placeholder={locale === 'he' ? 'מי בעל הבית!?' : (t('onboarding.businessInfo.ownerNamePlaceholder') || 'Enter your name')}
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (touched.ownerName) {
                        validateField('ownerName', e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur('ownerName')}
                    dir={dir}
                    className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.ownerName ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    autoFocus={!isMobile}
                  />
                  {errors.ownerName && (
                    <p className="mt-1 text-sm text-red-500">{errors.ownerName}</p>
                  )}
                </div>
                
                {ownerName && !errors.ownerName && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span>{getStepFeedback(3)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Contact Info (Phone + Email) */}
          {step === 4 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">
                {locale === 'he' ? 'איך ליצור איתך קשר?' :
                 locale === 'ar' ? 'كيف يمكن التواصل معك؟' :
                 locale === 'ru' ? 'Как с вами связаться?' :
                 "How can we contact you?"}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'he' ? 'כך לקוחות יוכלו ליצור איתך קשר ולקבל עדכונים' :
                 locale === 'ar' ? 'هكذا يمكن للعملاء التواصل معك والحصول على التحديثات' :
                 locale === 'ru' ? 'Так клиенты смогут связаться с вами и получать обновления' :
                 "This is how customers can contact you and receive updates"}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                 "💡 Don't worry – everything can be changed later"}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                {/* Phone Field */}
                <div>
                  <Label htmlFor="phone" className="text-center block">
                    {locale === 'he' ? 'מספר טלפון' :
                     locale === 'ar' ? 'رقم الهاتف' :
                     locale === 'ru' ? 'Номер телефона' :
                     'Phone Number'}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('onboarding.businessInfo.phonePlaceholder') || '050-000-0000'}
                    value={businessInfo.phone ? formatPhoneNumber(businessInfo.phone) : (authenticatedUser?.phone ? formatPhoneForDisplay(authenticatedUser.phone) : '')}
                    onChange={(e) => {
                      if (!authenticatedUser?.phone) {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleFieldChange('phone', formatted);
                      }
                    }}
                    onBlur={() => handleBlur('phone')}
                    disabled={!!authenticatedUser?.phone}
                    dir="ltr"
                    maxLength={12}
                    className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''} ${authenticatedUser?.phone ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    autoFocus={!authenticatedUser?.phone && !isMobile}
                  />
                  {authenticatedUser?.phone && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
                  )}
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
                
                {/* Email Field */}
                <div>
                  <Label htmlFor="email" className="text-center block">
                    {locale === 'he' ? 'אימייל (אופציונלי)' :
                     locale === 'ar' ? 'البريد الإلكتروني (اختياري)' :
                     locale === 'ru' ? 'Email (необязательно)' :
                     'Email (optional)'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('onboarding.businessInfo.emailPlaceholder') || 'Enter email address'}
                    value={businessInfo.email || authenticatedUser?.email || ''}
                    onChange={(e) => {
                      if (!authenticatedUser?.email) {
                        handleFieldChange('email', e.target.value);
                      }
                    }}
                    onBlur={() => handleBlur('email')}
                    disabled={!!authenticatedUser?.email}
                    dir="ltr"
                    className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''} ${authenticatedUser?.email ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    autoFocus={!!(authenticatedUser?.phone && !authenticatedUser?.email) && !isMobile}
                  />
                  {authenticatedUser?.email && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
                  )}
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                
                {/* Positive feedback */}
                {(businessInfo.phone || authenticatedUser?.phone) && !errors.phone && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-3">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">{getStepFeedback(4)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 5: Address (Optional) */}
          {step === 5 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">
                {locale === 'he' ? 'מה הכתובת של העסק? (אופציונלי)' :
                 locale === 'ar' ? 'ما عنوان العمل؟ (اختياري)' :
                 locale === 'ru' ? 'Какой адрес бизнеса? (необязательно)' :
                 "What's the business address? (optional)"}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'he' ? 'נציג אותה ללקוחות (אופציונלי)' :
                 locale === 'ar' ? 'سنعرضه للعملاء (اختياري)' :
                 locale === 'ru' ? 'Мы покажем его клиентам (необязательно)' :
                 "We'll show it to customers (optional)"}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                 "💡 Don't worry – everything can be changed later"}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="address" className="text-center block">
                    {locale === 'he' ? 'כתובת' :
                     locale === 'ar' ? 'العنوان' :
                     locale === 'ru' ? 'Адрес' :
                     'Address'}
                  </Label>
                  <Input
                    id="address"
                    placeholder={t('onboarding.businessInfo.addressPlaceholder') || 'Enter business address'}
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    dir={dir}
                    className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                    autoFocus={!isMobile}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 6: Business Type */}
          {step === 6 && (
            <div className="animate-fade-in text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">{t('onboarding.chooseBusinessType.title')}</h2>
              <p className="text-sm text-gray-600 mb-4">{t('onboarding.chooseBusinessType.subtitle')}</p>
              
              {/* Info message */}
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? 'בחרו את סוג העסק שמתאים לכם ביותר' :
                 locale === 'ar' ? 'اختر نوع العمل الذي يناسبك أكثر' :
                 locale === 'ru' ? 'Выберите тип бизнеса, который вам больше всего подходит' :
                 "Choose the business type that best fits you"}
              </p>
              
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
                {filteredBusinessTypes.map((type) => {
                  const isSelected = businessType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={(e) => {
                        // Only allow one selection at a time
                        // Clear any hover state
                        e.currentTarget.style.backgroundColor = '';
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.color = '';
                        // Select this type (deselects any previously selected type)
                        setBusinessType(type.id);
                      }}
                      className={`group p-6 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-green-500 bg-green-500 text-white shadow-md"
                          : "border-gray-200 hover:!bg-green-500 hover:!border-green-500 hover:!text-white hover:shadow-md"
                      }`}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#22c55e'; // green-500
                          e.currentTarget.style.borderColor = '#22c55e';
                          e.currentTarget.style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '';
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.color = '';
                        }
                      }}
                      dir={dir}
                    >
                    <div className={`flex flex-col ${dir === 'rtl' ? 'items-start text-right' : 'items-start text-left'}`}>
                      <type.icon className={`w-8 h-8 mb-3 transition-colors ${
                        isSelected 
                          ? "text-white" 
                          : "text-muted-foreground group-hover:text-white"
                      }`} />
                      <h3 className={`text-lg font-semibold mb-1 transition-colors ${
                        isSelected 
                          ? "text-white" 
                          : "text-foreground group-hover:text-white"
                      }`}>{type.title}</h3>
                      <p className={`text-sm transition-colors ${
                        isSelected 
                          ? "text-white" 
                          : "text-muted-foreground group-hover:text-white"
                      }`}>{type.description}</p>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Steps 8-10: Services - one at a time */}
          {step >= 7 && step <= 9 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              {(() => {
                const serviceIndex = step - 7;
                // Ensure we have enough services
                const currentServices = services.length > serviceIndex ? services : [
                  ...services,
                  ...Array(serviceIndex + 1 - services.length).fill(null).map((_, i) => ({
                    id: `new-${Date.now()}-${services.length + i}`,
                    name: '',
                    description: '',
                    category: '',
                    duration: 30,
                    price: 0,
                  }))
                ];
                const currentService = currentServices[serviceIndex] || {
                  id: `new-${Date.now()}`,
                  name: '',
                  description: '',
                  category: '',
                  duration: 30,
                  price: 0,
                };
                
                return (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium mb-2 text-gray-700">
                        {locale === 'he' ? `שירות ${serviceIndex + 1} (מתוך 3)` :
                         locale === 'ar' ? `الخدمة ${serviceIndex + 1} (من 3)` :
                         locale === 'ru' ? `Услуга ${serviceIndex + 1} (из 3)` :
                         `Service ${serviceIndex + 1} (of 3)`}
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        {locale === 'he' ? 'רק 2-3 שירותים להתחלה, תמיד אפשר להוסיף עוד אחרי ההקמה' :
                         locale === 'ar' ? 'فقط 2-3 خدمات للبدء، يمكنك دائمًا إضافة المزيد بعد الإعداد' :
                         locale === 'ru' ? 'Только 2-3 услуги для начала, всегда можно добавить больше после настройки' :
                         'Just 2-3 services to start, you can always add more after setup'}
                      </p>
                      <p className="text-xs text-gray-500 mb-5">
                        {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                         locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                         locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                         "💡 Don't worry – everything can be changed later"}
                      </p>
                    </div>
                    
                    <Card className="p-5 bg-gray-50 border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`service-name-${serviceIndex}`}>
                            {locale === 'he' ? 'שם השירות' :
                             locale === 'ar' ? 'اسم الخدمة' :
                             locale === 'ru' ? 'Название услуги' :
                             'Service Name'}
                          </Label>
                          <Input
                            id={`service-name-${serviceIndex}`}
                            value={currentService.name}
                            onChange={(e) => {
                              const updated = [...currentServices];
                              updated[serviceIndex] = { ...updated[serviceIndex], name: e.target.value };
                              setServices(updated);
                            }}
                            className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                            placeholder={locale === 'he' ? 'לדוגמה: תספורת' : (t('onboarding.services.namePlaceholder') || 'e.g., Haircut')}
                            autoFocus={!isMobile}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`service-description-${serviceIndex}`}>
                            {locale === 'he' ? 'תיאור (אופציונלי)' :
                             locale === 'ar' ? 'الوصف (اختياري)' :
                             locale === 'ru' ? 'Описание (необязательно)' :
                             'Description (optional)'}
                          </Label>
                          <Input
                            id={`service-description-${serviceIndex}`}
                            value={currentService.description}
                            onChange={(e) => {
                              const updated = [...currentServices];
                              updated[serviceIndex] = { ...updated[serviceIndex], description: e.target.value };
                              setServices(updated);
                            }}
                            className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                            placeholder={t('onboarding.services.descriptionPlaceholder') || 'Brief description'}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`service-duration-${serviceIndex}`}>
                              {locale === 'he' ? 'משך זמן (דקות)' :
                               locale === 'ar' ? 'المدة (بالدقائق)' :
                               locale === 'ru' ? 'Продолжительность (минуты)' :
                               'Duration (minutes)'}
                            </Label>
                            <Input
                              id={`service-duration-${serviceIndex}`}
                              type="number"
                              min="1"
                              value={currentService.duration}
                              onChange={(e) => {
                                const updated = [...currentServices];
                                updated[serviceIndex] = { ...updated[serviceIndex], duration: parseInt(e.target.value) || 0 };
                                setServices(updated);
                              }}
                              className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                              placeholder="30"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`service-price-${serviceIndex}`}>
                              {locale === 'he' ? 'מחיר (₪)' :
                               locale === 'ar' ? 'السعر (₪)' :
                               locale === 'ru' ? 'Цена (₪)' :
                               'Price (₪)'}
                            </Label>
                            <Input
                              id={`service-price-${serviceIndex}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={currentService.price}
                              onChange={(e) => {
                                const updated = [...currentServices];
                                updated[serviceIndex] = { ...updated[serviceIndex], price: parseFloat(e.target.value) || 0 };
                                setServices(updated);
                              }}
                              className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        
                        {currentService.name && (
                          <div className="flex items-center gap-2 text-sm text-green-600 mt-4 font-medium">
                            <Check className="w-4 h-4" />
                            <span>{getStepFeedback(step)}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                    
                    {/* Skip button */}
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          // If service has no name, skip it
                          if (!currentService.name.trim()) {
                            handleNext();
                          } else {
                            // Service has name, validate and continue
                            handleNext();
                          }
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        {locale === 'he' ? 'דלג - תמיד אפשר להוסיף אחרי ההקמה' :
                         locale === 'ar' ? 'تخطي - يمكنك دائمًا إضافة المزيد بعد الإعداد' :
                         locale === 'ru' ? 'Пропустить - всегда можно добавить после настройки' :
                         'Skip - you can always add more after setup'}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* Old step 4 - removed, replaced with steps 8-10 */}
          {false && step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-lg sm:text-3xl font-bold mb-2">{t('onboarding.services.title')}</h2>
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

          {/* Step 10: Plan Confirmation */}
          {step === 10 && (
            <div className="animate-fade-in text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">{t('onboarding.planConfirmation.title') || 'Plan Confirmation'}</h2>
              <p className="text-sm text-gray-600 mb-4">{t('onboarding.planConfirmation.subtitle') || 'Review your selected plan'}</p>
              
              {/* Reassuring message - softer */}
              <p className="text-xs text-gray-500 mb-5">
                {locale === 'he' ? '💡 אל דאגה – הכל ניתן לשנות אחר כך' :
                 locale === 'ar' ? '💡 لا تقلق – يمكن تغيير كل شيء لاحقًا' :
                 locale === 'ru' ? '💡 Не волнуйтесь – все можно изменить позже' :
                 "💡 Don't worry – everything can be changed later"}
              </p>
              
              {planDetails && (
                <div className="space-y-6">
                  {/* Plan Details Card */}
                  <Card className="p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="text-center">
                        <h3 className="text-xl font-semibold mb-2">{planDetails.name}</h3>
                        {selectedPlan === 'free' && (
                          <p className="text-sm text-gray-600 mb-2">חינם - לא נדרש אמצעי תשלום</p>
                        )}
                        {planDetails.price > 0 && (
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-3xl font-bold text-green-600">
                              {planDetails.symbol}{planDetails.price}/{t('home.pricing.month') || 'month'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conditional Content Based on Plan */}
                    {selectedPlan !== 'free' && (
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
                          // Get all features from plan metadata (from API)
                          let allFeatures: string[] = [];
                          
                          // Use highlights from planDetails.metadata if available
                          if (planDetails?.metadata?.highlights && Array.isArray(planDetails.metadata.highlights)) {
                            allFeatures = planDetails.metadata.highlights;
                          } else {
                            // Fallback to old translation system
                            if (selectedPlan === 'custom') {
                              // Custom: Start with Free + Pro, then add/override with Custom
                              const freeFeatures = getTranslation('home.pricing.plans.free.highlights') as string[] || 
                                                  getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                              const proFeatures = getTranslation('home.pricing.plans.pro.highlights') as string[] || 
                                                 getTranslation('home.pricing.plans.professional.highlights') as string[] || [];
                              const customFeatures = getTranslation('home.pricing.plans.custom.highlights') as string[] || 
                                                    getTranslation('home.pricing.plans.business.highlights') as string[] || [];
                            
                              // Start with Free features (excluding "Everything in Free" type items)
                              allFeatures = freeFeatures.filter(f => 
                                !f.toLowerCase().includes('everything in') && 
                                !f.includes('הכל בחבילת') &&
                                !f.includes('הכל ב')
                              );
                              
                              // Add Pro features, replacing conflicts
                              proFeatures.forEach(profFeature => {
                                if (profFeature.toLowerCase().includes('everything in') || 
                                    profFeature.includes('הכל בחבילת') ||
                                    profFeature.includes('הכל ב')) {
                                  return;
                                }
                                const isStaffFeature = profFeature.toLowerCase().includes('staff') || 
                                                      profFeature.toLowerCase().includes('employee') ||
                                                      profFeature.includes('עובד') ||
                                                      profFeature.includes('עובדים');
                                const isBookingFeature = profFeature.toLowerCase().includes('booking') ||
                                                        profFeature.includes('הזמנות');
                                
                                if (isStaffFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('staff') || 
                                      f.toLowerCase().includes('employee') ||
                                      f.includes('עובד') ||
                                      f.includes('עובדים'))
                                  );
                                  allFeatures.push(profFeature);
                                } else if (isBookingFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                  );
                                  allFeatures.push(profFeature);
                                } else {
                                  allFeatures.push(profFeature);
                                }
                              });
                              
                              // Add Custom features, replacing conflicts
                              customFeatures.forEach(customFeature => {
                                if (customFeature.toLowerCase().includes('everything in') || 
                                    customFeature.includes('הכל בחבילת') ||
                                    customFeature.includes('הכל ב')) {
                                  return;
                                }
                                const isStaffFeature = customFeature.toLowerCase().includes('staff') || 
                                                      customFeature.toLowerCase().includes('employee') ||
                                                      customFeature.includes('עובד') ||
                                                      customFeature.includes('עובדים');
                                const isBookingFeature = customFeature.toLowerCase().includes('booking') ||
                                                        customFeature.includes('הזמנות');
                                
                                if (isStaffFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('staff') || 
                                      f.toLowerCase().includes('employee') ||
                                      f.includes('עובד') ||
                                      f.includes('עובדים'))
                                  );
                                  allFeatures.push(customFeature);
                                } else if (isBookingFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                  );
                                  allFeatures.push(customFeature);
                                } else {
                                  allFeatures.push(customFeature);
                                }
                              });
                            } else if (selectedPlan === 'pro') {
                              // Pro: Start with Free, then add/override with Pro
                              const freeFeatures = getTranslation('home.pricing.plans.free.highlights') as string[] || 
                                                  getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                              const proFeatures = getTranslation('home.pricing.plans.pro.highlights') as string[] || 
                                                 getTranslation('home.pricing.plans.professional.highlights') as string[] || [];
                              
                              // Start with Free features (excluding "Everything in Free" type items)
                              allFeatures = freeFeatures.filter(f => 
                                !f.toLowerCase().includes('everything in') && 
                                !f.includes('הכל בחבילת') &&
                                !f.includes('הכל ב')
                              );
                              
                              // Add Pro features, replacing conflicts
                              proFeatures.forEach(profFeature => {
                                if (profFeature.toLowerCase().includes('everything in') || 
                                    profFeature.includes('הכל בחבילת') ||
                                    profFeature.includes('הכל ב')) {
                                  // Skip "Everything in Free" placeholder
                                  return;
                                }
                                // Check for conflicts (staff/workers, bookings, etc.)
                                const isStaffFeature = profFeature.toLowerCase().includes('staff') || 
                                                      profFeature.toLowerCase().includes('employee') ||
                                                      profFeature.includes('עובד') ||
                                                      profFeature.includes('עובדים');
                                const isBookingFeature = profFeature.toLowerCase().includes('booking') ||
                                                        profFeature.includes('הזמנות');
                                
                                if (isStaffFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('staff') || 
                                      f.toLowerCase().includes('employee') ||
                                      f.includes('עובד') ||
                                      f.includes('עובדים'))
                                  );
                                  allFeatures.push(profFeature);
                                } else if (isBookingFeature) {
                                  allFeatures = allFeatures.filter(f => 
                                    !(f.toLowerCase().includes('booking') || f.includes('הזמנות'))
                                  );
                                  allFeatures.push(profFeature);
                                } else {
                                  allFeatures.push(profFeature);
                                }
                              });
                            } else {
                              // Free: Show only Free features
                              allFeatures = getTranslation('home.pricing.plans.free.highlights') as string[] || 
                                          getTranslation('home.pricing.plans.basic.highlights') as string[] || [];
                            }
                          }
                          
                          return allFeatures.map((highlight: string, i: number) => {
                            const isExpanded = expandedFeature?.planKey === selectedPlan && expandedFeature?.featureIndex === i;
                            return (
                              <li key={i} className="relative">
                                <div className="overflow-hidden">
                                  <button
                                    onClick={() => toggleFeature(selectedPlan, i)}
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
                                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
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
                          });
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

          {/* Step 12: Final Step (moved from step 6) */}
          {step === 11 && (
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-500">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-lg font-medium mb-2 text-gray-700">{t('onboarding.almostThere.title')}</h2>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                {t('onboarding.almostThere.subtitle').replace('{businessType}', businessTypes.find(t => t.id === businessType)?.title || businessType?.replace('_', ' ') || '')}
              </p>
              <div className={`bg-muted/50 rounded-lg p-6 max-w-md mx-auto ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
                <h3 className={`font-semibold mb-3 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('onboarding.almostThere.whatsBeingCreated')}</h3>
                <ul className={`space-y-2 text-sm text-muted-foreground ${dir === 'rtl' ? 'text-right' : 'text-left'}`} dir={dir}>
                  {(getTranslation('onboarding.almostThere.items') as string[] || []).map((item, i) => (
                    <li key={i} className="flex items-center gap-2" dir={dir}>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
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
              <LoadingButton 
                ref={continueButtonRef} 
                onClick={handleNext} 
                loading={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {step === 11 ? t('onboarding.buttons.completeSetup') : t('onboarding.buttons.continue')}
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
                    className="h-12 w-10 sm:h-14 sm:w-14 text-center text-xl sm:text-2xl font-semibold"
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
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
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
                  className="h-auto p-0 text-green-600 hover:text-green-700"
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
        <DialogContent className="w-[90vw] sm:w-full max-w-[90vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[90vh] !flex !flex-col overflow-hidden p-0 rounded-lg !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2" dir={dir}>
          <DialogHeader className="flex-shrink-0 p-3 sm:p-6 pb-2 sm:pb-4 border-b">
            <DialogTitle className="text-base sm:text-xl">{t('onboarding.choosePlan') || 'Choose Your Plan'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {t('onboarding.choosePlanDescription') || 'Select the plan that best fits your business needs. You can change this anytime during setup.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-6 py-3 sm:py-6 scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {allPlans.map((plan) => {
              const planKey = plan.key;
              // Prevent custom plan from being selected
              const isSelected = planKey !== 'custom' && selectedPlan === planKey;
              const isProfessional = planKey === 'pro';
              // Use translated name from metadata if available, otherwise use plan key
              const planName = plan.metadata?.name || planKey.charAt(0).toUpperCase() + planKey.slice(1);
              // Use highlights from metadata if available, otherwise fallback to translations
              const planHighlights = plan.metadata?.highlights || 
                                    getTranslation(`home.pricing.plans.${planKey}.highlights`) as string[] || 
                                    getTranslation(`home.pricing.plans.${planKey === 'free' ? 'basic' : planKey === 'pro' ? 'professional' : 'business'}.highlights`) as string[] || [];
              
              return (
                <Card
                  key={planKey}
                  className={`p-3 sm:p-6 h-full flex flex-col relative transition-all ${
                    isSelected
                      ? 'border-2 border-green-500 bg-green-50'
                      : 'border border-gray-200 hover:border-green-300 bg-white'
                  } ${isProfessional && !isSelected ? 'border-green-300' : ''}`}
                >
                  {isProfessional && !isSelected && (
                    <div className="absolute -top-2.5 sm:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="bg-green-600 text-white px-2 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                        {t('home.pricing.bestSeller') || 'Best Seller'}
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-2 sm:mb-4 pt-1">
                    <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">{planName}</h3>
                    <div className="mb-1 sm:mb-2">
                      <span className="text-xl sm:text-3xl font-bold text-green-600">
                        {plan.symbol}{plan.price}{plan.price > 0 ? '/' : ''}{plan.price > 0 ? (t('home.pricing.month') || 'month') : ''}
                      </span>
                    </div>
                    {plan.metadata?.priceNote && (
                      <p className="text-xs text-muted-foreground mb-2" style={{ whiteSpace: 'pre-line' }}>
                        {plan.metadata.priceNote}
                      </p>
                    )}
                  </div>
                  <ul className="space-y-1 sm:space-y-2 mb-3 sm:mb-8 flex-grow overflow-y-auto">
                    {planHighlights.map((highlight: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 break-words">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    <Button
                      className="w-full text-xs sm:text-base h-8 sm:h-11"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        // For custom plan, open contact form instead of selecting
                        if (planKey === 'custom') {
                          setShowPlanModal(false);
                          setContactModalOpen(true);
                          return;
                        }
                        setSelectedPlan(planKey);
                        setShowPlanModal(false);
                        // Scroll to bottom where continue button is (only on step 10)
                        if (step === 10) {
                          setTimeout(() => {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                          }, 100);
                        }
                      }}
                    >
                      {isSelected
                        ? (t('onboarding.planSelected') || 'Selected')
                        : (plan.metadata?.cta || getTranslation(`home.pricing.plans.${planKey}.cta`) || t('onboarding.selectPlan') || 'Select Plan')}
                    </Button>
                  </div>
                </Card>
              );
            })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-[600px]" dir={dir}>
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
    </div>
  );
};

export default Onboarding;
