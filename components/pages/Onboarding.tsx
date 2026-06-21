"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingButton } from "@/components/ui/loading-button";
import { OtpCodeInput } from "@/components/ui/OtpCodeInput";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scissors, Sparkles, Dumbbell, Briefcase, Trash2, Plus, Heart, Palette, Waves, Activity, HeartPulse, Users, Apple, Home, Check, User, LogOut, LayoutDashboard, ChevronDown, Mail, Phone, MessageSquare, ArrowRight, ArrowLeft, AlertCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { useLocale } from "@/hooks/useLocale";
import { TypingAnimation } from "@/components/ui/TypingAnimation";
import {
  formatIsraeliPhoneInput,
  formatPhoneForDisplay,
  phoneInputToE164,
} from "@/lib/phone/display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTimeBasedGreeting } from "@/lib/utils/greetings";
import { Footer } from "@/components/ui/Footer";
import { getApiErrorMessage, getApiRetryAfter } from "@/lib/api/error-message";
import { IsraelAddressFields } from "@/components/address/IsraelAddressFields";
import { PlanSelectionModal } from "@/components/onboarding/PlanSelectionModal";
import { getDefaultServices } from "@/lib/onboarding/utils";
import type { BusinessType } from "@/lib/supabase/database.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// Social Media Icon Components
const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TwitterIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const TikTokIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const LinkedInIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const YouTubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'facebook' as const, Icon: FacebookIcon, label: { he: 'פייסבוק', ar: 'فيسبوك', ru: 'Facebook', en: 'Facebook' } },
  { key: 'instagram' as const, Icon: InstagramIcon, label: { he: 'אינסטגרם', ar: 'إنستغرام', ru: 'Instagram', en: 'Instagram' } },
  { key: 'twitter' as const, Icon: TwitterIcon, label: { he: 'טוויטר', ar: 'تويتر', ru: 'Twitter', en: 'Twitter' } },
  { key: 'tiktok' as const, Icon: TikTokIcon, label: { he: 'טיקטוק', ar: 'تيك توك', ru: 'TikTok', en: 'TikTok' } },
  { key: 'linkedin' as const, Icon: LinkedInIcon, label: { he: 'לינקדאין', ar: 'لينكد إن', ru: 'LinkedIn', en: 'LinkedIn' } },
  { key: 'youtube' as const, Icon: YouTubeIcon, label: { he: 'יוטיוב', ar: 'يوتيوب', ru: 'YouTube', en: 'YouTube' } },
];

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
    socialLinks: {
      facebook: undefined,
      instagram: undefined,
      twitter: undefined,
      tiktok: undefined,
      linkedin: undefined,
      youtube: undefined,
    },
  });
  const [ownerName, setOwnerName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [useAnotherAccount, setUseAnotherAccount] = useState(false);
  const [useDifferentBusinessPhone, setUseDifferentBusinessPhone] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{email: string, phone: string, name: string} | null>(null);
  // Authentication state
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{phone?: string, email?: string, name?: string} | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSessionKey, setOtpSessionKey] = useState(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('portfolio');
  const [isPortfolio, setIsPortfolio] = useState<boolean>(true);
  const hasCheckedExistingBusiness = useRef<boolean>(false);
  const isRedirecting = useRef<boolean>(false);
  const [planDetails, setPlanDetails] = useState<{name: string, price: number, symbol: string, metadata?: any} | null>(null);
  const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [allPlans, setAllPlans] = useState<Array<{name: string, price: number, symbol: string, key: string, metadata?: any}>>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', message: '' });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
  
  // Countdown timer effect for rate limiting
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
        'הכל בחבילת Basic': 'כל מה שחבילת הBasic והרבה מעבר.',
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
        'הכל בחבילת Basic': 'כל מה שחבילת הBasic והרבה מעבר.',
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
        const retryAfter = getApiRetryAfter(data);
        // Handle rate limiting with countdown
        if (response.status === 429 && retryAfter) {
          setRateLimitCountdown(retryAfter);
          const errorMessage = getApiErrorMessage(
            data.error,
            t('auth.rateLimitMessage')?.replace('{seconds}', retryAfter.toString()) || `Too many requests. Please try again in ${retryAfter} seconds.`
          );
          toast.error(errorMessage);
          setSendingOtp(false);
          return;
        } else {
          throw new Error(getApiErrorMessage(data.error, 'Failed to send OTP'));
        }
      }

      setOtpSent(true);
      setShowOtpModal(true);
      setOtpCountdown(30);
      setOtpSessionKey((k) => k + 1);
      setOtpCode('');
      setRateLimitCountdown(null);
      toast.success(
        loginMethod === 'phone' 
          ? (t('onboarding.auth.otpSentToPhone')?.replace('{phone}', phoneNumber) || `Verification code sent successfully to ${phoneNumber}`)
          : (t('onboarding.auth.otpSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`)
      );
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
    setOtpCountdown(0);
    if (loginMethod === 'phone') {
      setPhoneNumber('');
    } else {
      setEmail('');
    }
    // Focus on phone input (desktop only)
    if (!isMobile && loginMethod === 'phone') {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
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

    setVerifyingOtp(true);
    try {
      if (loginMethod === 'email') {
        // Verify email OTP using custom API
        const response = await fetch('/api/auth/verify-email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            code: code,
            userType: 'homepage_admin',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(getApiErrorMessage(data.error, 'Invalid or expired code'));
        }

        // Handle both existing user and new user cases
        if (data.isNewUser) {
          // New user - just set email, they'll register during onboarding
          setAuthenticatedUser({ email: email });
          setBusinessInfo(prev => ({ ...prev, email: email }));
        } else if (data.user) {
          // Existing user - set all user data
          setAuthenticatedUser({ 
            email: data.user.email,
            phone: data.user.phone,
            name: data.user.name,
          });
          setBusinessInfo(prev => ({ 
            ...prev, 
            email: data.user.email || prev.email,
          }));
          if (data.user.name) {
            setOwnerName(data.user.name);
          }
        } else {
          // Fallback - new user
          setAuthenticatedUser({ email: email });
          setBusinessInfo(prev => ({ ...prev, email: email }));
        }

        const emailGate = await gateOnboardingIdentity(email, undefined);
        if (!emailGate.allowed) {
          if (emailGate.error) {
            toast.error(emailGate.error);
            if (emailGate.field) {
              setErrors((prev) => ({ ...prev, [emailGate.field!]: emailGate.error! }));
            }
          }
          return;
        }

        setOtpVerified(true);
      } else {
        // Phone OTP verification (existing flow)
        const cleanPhone = phoneNumber.replace(/\D/g, '');

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
          throw new Error(getApiErrorMessage(data.error, 'Invalid OTP code'));
        }

        if (data.business?.slug) {
          setShowOtpModal(false);
          redirectToExistingBusinessLogin(data.business.slug);
          return;
        }

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

        const phoneForGate = data.user?.phone || phoneNumber;
        const phoneGate = await gateOnboardingIdentity(data.user?.email, phoneForGate);
        if (!phoneGate.allowed) {
          if (phoneGate.error) {
            toast.error(phoneGate.error);
            if (phoneGate.field) {
              setErrors((prev) => ({ ...prev, [phoneGate.field!]: phoneGate.error! }));
            }
          }
          return;
        }

        setOtpVerified(true);
      }
      setShowOtpModal(false);
      toast.success(loginMethod === 'phone' 
        ? (t('onboarding.auth.verified') || 'Phone number verified')
        : (t('onboarding.auth.emailVerified') || 'Email verified')
      );
      // Automatically move to step 2 after successful authentication
      setTimeout(() => {
        setStep(2);
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP code');
      // Clear OTP on error
      setOtpCode('');
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

  // Handle Google OAuth - use redirect flow (same page)
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      // Get base URL - prefer NEXT_PUBLIC_APP_URL, fallback to current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      // Use redirect flow (same page)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/api/auth/callback?next=/onboarding&type=onboarding`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Google login');
      setLoading(false);
    }
  };

  // Handle Facebook OAuth
  const handleFacebookLogin = async () => {
    try {
      setLoading(true);
      
      // Get base URL - prefer NEXT_PUBLIC_APP_URL, fallback to current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${baseUrl}/api/auth/callback?next=/onboarding`,
        },
      });

      if (error) throw error;
      // Redirect will happen automatically - no need to handle response
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Facebook login');
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast.error(t('auth.emailRequired') || 'Email is required');
      return;
    }

    setSendingOtp(true);

    try {
      // Use custom email OTP API
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const retryAfter = getApiRetryAfter(data);
        // Handle rate limiting with countdown
        if (response.status === 429 && retryAfter) {
          setRateLimitCountdown(retryAfter);
          const errorMessage = getApiErrorMessage(
            data.error,
            t('auth.rateLimitMessage')?.replace('{seconds}', retryAfter.toString()) || `Too many requests. Please try again in ${retryAfter} seconds.`
          );
          toast.error(errorMessage);
          setSendingOtp(false);
          return;
        } else {
          throw new Error(getApiErrorMessage(data.error, 'Failed to send OTP'));
        }
      }

      setSendingOtp(false);
      setOtpSent(true);
      setShowOtpModal(true);
      setOtpCountdown(30);
      setOtpSessionKey((k) => k + 1);
      setOtpCode('');
      setRateLimitCountdown(null);
      
      // In development, log the code
      if (process.env.NODE_ENV === 'development' && data.code) {
        console.log(`[DEV] Email OTP Code: ${data.code}`);
      }
      
      toast.success(t('onboarding.auth.otpSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`);
    } catch (error: any) {
      setSendingOtp(false);
      toast.error(error.message || t('auth.sendCodeError') || 'Failed to send code');
    }
  };

  // Read plan from URL params on mount
  useEffect(() => {
    const planParam = searchParams.get('plan');
    const validPlans = ['portfolio', 'free', 'pro', 'basic', 'professional'];
    const salesOnlyPlans = ['custom', 'business'];
    if (planParam && (validPlans.includes(planParam.toLowerCase()) || salesOnlyPlans.includes(planParam.toLowerCase()))) {
      // Map old plan names to new ones
      const planMapping: Record<string, string> = {
        'basic': 'free',
        'professional': 'pro',
      };
      const normalizedPlan = planParam.toLowerCase();
      // Custom/business are sales-led — not available in onboarding
      if (salesOnlyPlans.includes(normalizedPlan)) {
        setSelectedPlan('portfolio');
        setIsPortfolio(true);
      } else {
        const mappedPlan = planMapping[normalizedPlan] || normalizedPlan;
        setSelectedPlan(mappedPlan);
        setIsPortfolio(mappedPlan === 'portfolio');
      }
    } else {
      // Default to 'portfolio' if no plan or invalid plan provided
      setSelectedPlan('portfolio');
      setIsPortfolio(true);
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
            // Set all plans for modal - portfolio first, then paid plans
            const plansArray = [];
            // Add portfolio if available
            if (data.pricing.portfolio) {
              plansArray.push({ key: 'portfolio', ...data.pricing.portfolio, metadata: data.pricing.portfolio.metadata });
            }
            // Add paid plans
            plansArray.push(
              { key: 'free', ...data.pricing.free, metadata: data.pricing.free.metadata },
              { key: 'pro', ...data.pricing.pro, metadata: data.pricing.pro.metadata },
            );
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
        if (verifiedPhone && step === 1 && !otpVerified && !hasCheckedExistingBusiness.current && !isRedirecting.current) {
          // User came from homepage login - phone already verified
          const displayPhone = formatPhoneForDisplay(verifiedPhone);
          setPhoneNumber(displayPhone);
          setAuthenticatedUser({ phone: verifiedPhone });
          setBusinessInfo(prev => ({ ...prev, phone: displayPhone }));
          setOtpVerified(true);
          // Clear the sessionStorage after using it
          sessionStorage.removeItem('homepage_verified_phone');
          
          // Mark that we're checking
          hasCheckedExistingBusiness.current = true;
          
          // Check if user already has a business before proceeding
          const phoneForCheck = convertPhoneToE164(verifiedPhone);
          const existingBusiness = await checkExistingBusiness(undefined, phoneForCheck);
          
          if (existingBusiness.hasBusiness && existingBusiness.business?.slug) {
            isRedirecting.current = true;
            toast.error(
              t('onboarding.alreadyRegistered')
            );
            setTimeout(() => {
              window.location.href = `/b/${existingBusiness.business!.slug}/admin/login`;
            }, 2000);
            return;
          }
          
          // Automatically move to step 2
          setTimeout(() => {
            setStep(2);
          }, 500);
          return;
        }

        // Check for OAuth callback (redirect flow)
        const type = searchParams.get('type');
        const oauthSuccess = searchParams.get('oauth_success');
        if (type === 'onboarding' && oauthSuccess === 'true' && !hasCheckedExistingBusiness.current && !isRedirecting.current) {
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
              
              // Mark that we're checking
              hasCheckedExistingBusiness.current = true;
              
              // Check if user already has a business before proceeding
              const phoneForCheck = userPhone ? convertPhoneToE164(userPhone) : undefined;
              const existingBusiness = await checkExistingBusiness(userEmail, phoneForCheck);
              
              if (existingBusiness.hasBusiness && existingBusiness.business?.slug) {
                isRedirecting.current = true;
                toast.error(t('onboarding.alreadyRegistered'));
                // Clean URL
                window.history.replaceState({}, '', '/onboarding');
                // Redirect to login page for their business
                setTimeout(() => {
                  window.location.href = `/b/${existingBusiness.business!.slug}/admin/login`;
                }, 2000);
                return;
              }
              
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

        // DISABLED: Don't auto-login on onboarding page - always start fresh for new business registration
        // const { data: { session }, error } = await supabase.auth.getSession();
        // if (session?.user && !otpVerified && !isSuperAdminUser) { ... }
        
        // DISABLED: Don't auto-fill from existing user profile on onboarding
        // if (!isSuperAdminUser) { const response = await fetch('/api/user/profile'); ... }
      } catch (error) {
        // User is not logged in, continue normally
      }
    };
    checkAuth();
  }, [searchParams, otpVerified, step]);

  // Keep navigation visible after step changes (avoid scroll-to-top jump)
  useEffect(() => {
    if (step === 1) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    requestAnimationFrame(() => {
      continueButtonRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'end' });
    });
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
          const formatted = formatIsraeliPhoneInput(businessInfo.phone);
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
      requestAnimationFrame(() => {
        continueButtonRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'end' });
      });
    }
  }, [businessType, step]);

  // Focus service name input without scrolling the page
  useEffect(() => {
    if (step >= 7 && step <= 9 && !isMobile) {
      requestAnimationFrame(() => {
        document.getElementById(`service-name-${step - 7}`)?.focus({ preventScroll: true });
      });
    }
  }, [step, isMobile]);

  // Load default services when business type is selected and moving to step 7
  useEffect(() => {
    if (businessType && step === 7) {
      // Get translations for default services
      const servicesTranslations = getTranslation(`onboarding.services.defaultServices.${businessType}`);
      const defaultServices = getDefaultServices(businessType, servicesTranslations ? {
        [businessType]: servicesTranslations
      } : undefined);
      
      // Reload services when business type changes
      if (lastBusinessTypeRef.current !== businessType || services.length === 0) {
        // Set all default services for the new business type
        setServices(
          defaultServices.map((service, index) => ({
            id: `default-${index}`,
            ...service,
          }))
        );
        lastBusinessTypeRef.current = businessType;
      }
    }
  }, [businessType, step]);

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

  // Check if email/phone is already registered
  const checkEmailPhoneAvailability = async (email?: string, phone?: string): Promise<{ available: boolean; field?: string; error?: string }> => {
    try {
      const response = await fetch('/api/onboarding/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          available: false,
          field: data.field,
          error: data.error || 'Failed to check availability',
        };
      }
      return data;
    } catch (error) {
      return {
        available: false,
        error: t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.',
      };
    }
  };

  const redirectToExistingBusinessLogin = (slug: string) => {
    isRedirecting.current = true;
    toast.error(t('onboarding.alreadyRegistered'));
    setTimeout(() => {
      window.location.href = `/b/${slug}/admin/login`;
    }, 2000);
  };

  const gateOnboardingIdentity = async (
    email?: string,
    phone?: string
  ): Promise<{ allowed: boolean; field?: 'email' | 'phone'; error?: string }> => {
    const phoneForCheck = phone ? convertPhoneToE164(phone) : undefined;

    try {
      const existingBusiness = await checkExistingBusiness(email, phoneForCheck);
      if (existingBusiness.error) {
        return {
          allowed: false,
          error: t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.',
        };
      }
      if (existingBusiness.hasBusiness && existingBusiness.business?.slug) {
        redirectToExistingBusinessLogin(existingBusiness.business.slug);
        return { allowed: false };
      }

      const availability = await checkEmailPhoneAvailability(email, phoneForCheck);
      if (!availability.available) {
        const errorMessage =
          availability.error ||
          (availability.field === 'email'
            ? 'Email address already registered by another user'
            : t('onboarding.errors.phoneAlreadyRegistered') || 'Phone number already registered by another user');
        return {
          allowed: false,
          field: availability.field === 'email' ? 'email' : 'phone',
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('Failed onboarding identity gate:', error);
      return {
        allowed: false,
        error: t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.',
      };
    }

    return { allowed: true };
  };

  // Check if user already has a registered business
  const checkExistingBusiness = async (email?: string, phone?: string): Promise<{ hasBusiness: boolean; business?: { slug: string; name: string }; businesses?: Array<{ slug: string; name: string }>; error?: string }> => {
    try {
      const response = await fetch('/api/onboarding/check-existing-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { hasBusiness: false, error: data.error || 'Failed to check existing business' };
      }
      return data;
    } catch (error) {
      return { hasBusiness: false, error: 'Failed to check existing business' };
    }
  };

  // Convert phone to E.164 format for API
  const convertPhoneToE164 = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 9) {
      return '+972' + digits;
    } else if (digits.length === 10 && digits.startsWith('0')) {
      return '+972' + digits.substring(1);
    } else if (digits.length === 10 && !digits.startsWith('0')) {
      return '+972' + digits;
    } else if (!phone.startsWith('+')) {
      return '+972' + digits;
    }
    return phone;
  };

  // Handle field blur
  const handleBlur = async (field: 'name' | 'englishName' | 'email' | 'phone' | 'ownerName') => {
    setTouched({ ...touched, [field]: true });
    if (field === 'ownerName') {
      validateField('ownerName', ownerName);
    } else {
      validateField(field, businessInfo[field]);
    }

    // Real-time availability check for email/phone in step 4
    if (step === 4 && (field === 'email' || field === 'phone')) {
      const emailToCheck = field === 'email' ? businessInfo.email : (authenticatedUser?.email || '');
      const phoneToCheck = field === 'phone' ? businessInfo.phone : (authenticatedUser?.phone || '');
      
      // Only check if field has a value and is valid
      if (field === 'email' && emailToCheck && validateEmail(emailToCheck)) {
        const availability = await checkEmailPhoneAvailability(emailToCheck, undefined);
        if (!availability.available) {
          const errorMessage = availability.error || 'Email address already registered by another user';
          setErrors(prev => ({ ...prev, email: errorMessage }));
        } else {
          // Clear email error if available
          setErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors.email && newErrors.email.includes('already registered')) {
              delete newErrors.email;
            }
            return newErrors;
          });
        }
      } else if (field === 'phone' && phoneToCheck && validatePhone(phoneToCheck)) {
        const phoneForCheck = convertPhoneToE164(phoneToCheck);
        const availability = await checkEmailPhoneAvailability(undefined, phoneForCheck);
        if (!availability.available) {
          const errorMessage = availability.error || 'Phone number already registered by another user';
          setErrors(prev => ({ ...prev, phone: errorMessage }));
        } else {
          // Clear phone error if available
          setErrors(prev => {
            const newErrors = { ...prev };
            if (newErrors.phone && newErrors.phone.includes('already registered')) {
              delete newErrors.phone;
            }
            return newErrors;
          });
        }
      }
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

  // Handle social link change
  const handleSocialLinkChange = (platform: keyof typeof businessInfo.socialLinks, value: string) => {
    setBusinessInfo({
      ...businessInfo,
      socialLinks: {
        ...businessInfo.socialLinks,
        [platform]: value,
      },
    });
  };

  // Handle adding a social link
  const handleAddSocialLink = (platform: keyof typeof businessInfo.socialLinks) => {
    setBusinessInfo({
      ...businessInfo,
      socialLinks: {
        ...businessInfo.socialLinks,
        [platform]: '',
      },
    });
  };

  // Handle removing a social link
  const handleRemoveSocialLink = (platform: keyof typeof businessInfo.socialLinks) => {
    const updated = { ...businessInfo.socialLinks };
    delete updated[platform];
    setBusinessInfo({
      ...businessInfo,
      socialLinks: updated,
    });
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
      setTouched({ phone: true, email: true });
      // Check phone from businessInfo or authenticatedUser
      const phoneToValidate = businessInfo.phone || (authenticatedUser?.phone ? formatPhoneForDisplay(authenticatedUser.phone) : '');
      const phoneError = getFieldError('phone', phoneToValidate);
      if (phoneError) {
        setErrors({ phone: phoneError });
        toast.error(phoneError);
        return;
      }

      // Validate email format if provided
      const emailToValidate = businessInfo.email || authenticatedUser?.email || '';
      if (emailToValidate && !validateEmail(emailToValidate)) {
        const emailError = t('onboarding.errors.invalidEmail') || 'Invalid email format';
        setErrors({ email: emailError });
        toast.error(emailError);
        return;
      }

      // Check if email/phone is already registered
      setLoading(true);
      try {
        const emailToCheck = businessInfo.email || authenticatedUser?.email;
        const ownerPhoneSource = authenticatedUser?.phone || phoneToValidate;
        const phoneForCheck = ownerPhoneSource ? convertPhoneToE164(ownerPhoneSource) : undefined;

        const existingBusiness = await checkExistingBusiness(emailToCheck, phoneForCheck);
        if (existingBusiness.error) {
          const errorMessage = t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
        if (existingBusiness.hasBusiness && existingBusiness.business?.slug) {
          redirectToExistingBusinessLogin(existingBusiness.business.slug);
          setLoading(false);
          return;
        }

        const availability = await checkEmailPhoneAvailability(emailToCheck, phoneForCheck);
        
        if (!availability.available) {
          const errorField = availability.field === 'email' ? 'email' : 'phone';
          const errorMessage = availability.error || 
            (availability.field === 'email' 
              ? 'Email address already registered by another user'
              : t('onboarding.errors.phoneAlreadyRegistered') || 'Phone number already registered by another user');
          
          setErrors({ [errorField]: errorMessage });
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
      } catch (error: unknown) {
        const errorMessage = t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.';
        console.error('Failed to check availability:', error);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
      setLoading(false);
      
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
    // Step 10: Plan confirmation - validate identity before final step
    if (step === 10) {
      setLoading(true);
      try {
        const emailToCheck = businessInfo.email || authenticatedUser?.email;
        const ownerPhone = authenticatedUser?.phone || businessInfo.phone;
        const gate = await gateOnboardingIdentity(emailToCheck, ownerPhone);
        if (!gate.allowed) {
          if (gate.error) {
            toast.error(gate.error);
            if (gate.field) {
              setErrors({ [gate.field]: gate.error });
              setStep(4);
            }
          }
          setLoading(false);
          return;
        }
      } catch (error) {
        toast.error(t('onboarding.errors.identityCheckFailed') || 'Could not verify account details. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
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
        const emailToCheck = businessInfo.email || authenticatedUser?.email;
        const ownerPhoneSource = authenticatedUser?.phone || businessInfo.phone;
        const gate = await gateOnboardingIdentity(emailToCheck, ownerPhoneSource);
        if (!gate.allowed) {
          if (gate.error) {
            toast.error(gate.error);
            if (gate.field) {
              setErrors({ [gate.field]: gate.error });
              setStep(4);
            }
          }
          setLoading(false);
          return;
        }

        // Format business phone (for business contact - can be different from owner's phone)
        const businessPhoneForApi = businessInfo.phone 
          ? phoneInputToE164(businessInfo.phone)
          : (authenticatedUser?.phone ? phoneInputToE164(authenticatedUser.phone) : '');
        
        // Format owner's phone (for authentication/login - ALWAYS use authenticated user's phone)
        const ownerPhoneForApi = authenticatedUser?.phone 
          ? phoneInputToE164(authenticatedUser.phone)
          : '';
        
        const response = await fetch('/api/onboarding/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType,
            businessInfo: {
              ...businessInfo,
              phone: businessPhoneForApi, // Business contact phone (can be different)
            },
            services: services.map(({ id, ...service }) => service),
            ownerName,
            useAnotherAccount,
            plan: selectedPlan || 'portfolio',
            isPortfolio: isPortfolio || selectedPlan === 'portfolio',
            adminUser: {
              email: businessInfo.email || authenticatedUser?.email || '',
              name: ownerName || authenticatedUser?.name || '',
              phone: ownerPhoneForApi, // Owner's login phone (ALWAYS from authenticatedUser)
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
        } else if (errorMessage.includes('already have a registered business')) {
          displayMessage = t('onboarding.alreadyRegistered') || errorMessage;
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
        socialLinks: {
          facebook: undefined,
          instagram: undefined,
          twitter: undefined,
          tiktok: undefined,
          linkedin: undefined,
          youtube: undefined,
        },
      });
      setOwnerName("");
      setServices([]);
      setPhoneNumber("");
      setOtpCode("");
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
    <div dir={dir} className="min-h-screen bg-background flex flex-col">
      {/* Header - Same as main page */}
      <header className="bg-background border-b fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-sm bg-background/95 supports-[backdrop-filter]:bg-background/80 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/80 safe-area-top shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
            <div className="flex items-center justify-between gap-2">
              {/* Language Toggle and Dark Mode Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <LanguageToggle />
                <DarkModeToggle />
              </div>
              
              {/* User menu / Login button */}
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                {!user && (
                  <Button 
                    variant="outline" 
                    className={`h-8 sm:h-10 px-2 sm:px-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    aria-label={t('adminLogin.homepageLogin') || 'Admin Login'}
                    style={{ display: 'none' }}
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className={`text-xs sm:text-sm font-medium ${isRTL ? 'mr-1 sm:mr-2' : 'ml-1 sm:ml-2'}`}>
                      {t('adminLogin.login') || t('auth.login') || 'Login'}
                    </span>
                  </Button>
                )}
                {!loadingUser && user && (
                  <div style={{ display: 'none' }}>
                    <div className="w-2 sm:w-3" />
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
                        className={`${isRTL ? "text-right [&>*]:text-right" : ""} w-[var(--radix-dropdown-menu-trigger-width)]`}
                        style={{
                          direction: isRTL ? 'rtl' : 'ltr',
                          width: 'var(--radix-dropdown-menu-trigger-width)',
                        }}
                      >
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleGoToDashboard} className={`cursor-pointer hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row justify-end' : ''}`}>
                          <LayoutDashboard className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          <span className={isRTL ? 'text-right' : ''}>{t('userDashboard.title') || 'My Account'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className={`cursor-pointer text-[#030408] hover:bg-[#030408] hover:text-white focus:bg-[#030408] focus:text-white ${isRTL ? 'flex-row justify-end' : ''}`}>
                          <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          <span className={isRTL ? 'text-right' : ''}>{t('userDashboard.logout') || 'Logout'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
        
        {/* Content Container */}
        <div className="flex-1 flex items-start justify-center pt-20 sm:pt-16 md:pt-24 p-6 pb-24">
          <div className="w-full max-w-4xl">
        
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
                  {(selectedPlan === 'free' || selectedPlan === 'portfolio') && (
                    <span className="text-sm text-gray-600">
                      {selectedPlan === 'portfolio' ? t('onboarding.planBanner.freeForever') : t('onboarding.planBanner.freeNoPayment')}
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
                  {t('onboarding.stepOf').replace('{step}', String(displayStep)).replace('{total}', String(TOTAL_STEPS))}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round((displayStep / TOTAL_STEPS) * 100)}% {t('onboarding.complete')}
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
                  {t('onboarding.lessThanMinute')}
                </p>
              </div>
              
              {!otpVerified && !authenticatedUser ? (
                <div className="space-y-6 max-w-md mx-auto">
                  {/* Email/Phone Tabs */}
                  <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as 'phone' | 'email')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="phone">{t('auth.phone') || 'Phone'}</TabsTrigger>
                      <TabsTrigger value="email">{t('auth.email') || 'Email'}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="phone" className="space-y-4 mt-4">
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
                          onChange={(e) => setPhoneNumber(formatIsraeliPhoneInput(e.target.value))}
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
                    </TabsContent>
                    
                    <TabsContent value="email" className="space-y-4 mt-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder') || 'Enter your email'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && email.trim() && !sendingOtp) {
                              handleEmailSubmit();
                            }
                          }}
                          disabled={otpSent}
                          className={`pl-10 ${dir === 'rtl' ? 'pr-10 pl-3' : ''} h-12 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20`}
                          dir="ltr"
                        />
                      </div>

                      <LoadingButton
                        onClick={handleEmailSubmit}
                        loading={sendingOtp}
                        disabled={!email.trim()}
                        className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                      >
                        {t('onboarding.auth.login') || t('onboarding.auth.sendOtp') || 'Login'}
                      </LoadingButton>
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
                {t('onboarding.steps.businessName.title')}
              </h2>
              
              {/* Subtitle - more friendly */}
              <p className="text-sm text-gray-600 mb-4">
                {t('onboarding.steps.businessName.subtitle')}
              </p>
              
              {/* Reassuring message - softer */}
              <p className="text-xs text-gray-500 mb-5">
                {t('onboarding.steps.reassurance')}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="name" className="text-center block">
                    {t('onboarding.steps.businessName.label')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip open={errors.name ? true : undefined}>
                      <TooltipTrigger asChild>
                        <div>
                          <Input
                            id="name"
                            placeholder={t('onboarding.steps.businessName.placeholder')}
                            value={businessInfo.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            onBlur={() => handleBlur('name')}
                            dir={dir}
                            className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.name ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                            autoFocus={!isMobile}
                          />
                        </div>
                      </TooltipTrigger>
                      {errors.name && (
                        <TooltipContent side="bottom" className="bg-red-500 text-white border-red-600 -mt-1">
                          <p>{t('onboarding.steps.fieldRequired')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Preview - matches actual booking page appearance */}
                {businessInfo.name && !errors.name && (
                  <div className="mt-5 p-6 bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 shadow-sm">
                    <p className="text-xs text-gray-600 mb-4 text-center">
                      {t('onboarding.steps.businessName.preview')}
                    </p>
                    {/* Preview matches booking page styling */}
                    <div className="text-center">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                        {businessInfo.name}
                      </h1>
                    </div>
                  </div>
                )}
                
                {/* Positive feedback - softer */}
                {businessInfo.name && !errors.name && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-3">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">{getStepFeedback(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Owner Name */}
          {step === 3 && (
            <div className="animate-fade-in max-w-lg mx-auto text-center">
              <h2 className="text-lg font-medium mb-2 text-gray-700">
                {t('onboarding.steps.ownerName.title')}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('onboarding.steps.ownerName.subtitle')}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {t('onboarding.steps.ownerName.greeting')}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label htmlFor="ownerName" className="text-center block">
                    {t('onboarding.steps.ownerName.label')}
                  </Label>
                  <TooltipProvider>
                    <Tooltip open={errors.ownerName ? true : undefined}>
                      <TooltipTrigger asChild>
                        <div>
                          <Input
                            id="ownerName"
                            placeholder={t('onboarding.steps.ownerName.placeholder')}
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
                        </div>
                      </TooltipTrigger>
                      {errors.ownerName && (
                        <TooltipContent side="bottom" className="bg-red-500 text-white border-red-600 -mt-1">
                          <p>{t('onboarding.steps.fieldRequired')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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
                {t('onboarding.steps.contact.title')}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('onboarding.steps.contact.subtitle')}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {t('onboarding.steps.reassurance')}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                {/* Phone Field */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    {t('onboarding.steps.contact.phoneHint')}
                  </p>
                  
                  {/* Show owner's phone info if authenticated and not using different phone */}
                  {authenticatedUser?.phone && !useDifferentBusinessPhone && (
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            {t('onboarding.steps.contact.yourPhone')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1" dir="ltr">
                            {formatPhoneForDisplay(authenticatedUser.phone)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip open={errors.phone ? true : undefined}>
                      <TooltipTrigger asChild>
                        <div>
                          <Input
                            id="phone"
                            type="tel"
                            aria-label={t('onboarding.steps.contact.phoneLabel')}
                            placeholder={t('onboarding.businessInfo.phonePlaceholder') || '050-000-0000'}
                            value={
                              useDifferentBusinessPhone 
                                ? (businessInfo.phone ? formatIsraeliPhoneInput(businessInfo.phone) : '')
                                : (authenticatedUser?.phone ? formatPhoneForDisplay(authenticatedUser.phone) : (businessInfo.phone ? formatIsraeliPhoneInput(businessInfo.phone) : ''))
                            }
                            onChange={(e) => {
                              if (useDifferentBusinessPhone || !authenticatedUser?.phone) {
                                const formatted = formatIsraeliPhoneInput(e.target.value);
                                handleFieldChange('phone', formatted);
                              }
                            }}
                            onBlur={() => handleBlur('phone')}
                            disabled={!!authenticatedUser?.phone && !useDifferentBusinessPhone}
                            dir="ltr"
                            maxLength={12}
                            className={`mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20 ${errors.phone ? 'border-red-400 focus-visible:ring-red-400' : ''} ${(authenticatedUser?.phone && !useDifferentBusinessPhone) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            autoFocus={(!authenticatedUser?.phone || useDifferentBusinessPhone) && !isMobile}
                          />
                        </div>
                      </TooltipTrigger>
                      {errors.phone && (
                        <TooltipContent side="bottom" className="bg-red-500 text-white border-red-600 -mt-1">
                          <p>{t('onboarding.steps.fieldRequired')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Checkbox to use different phone */}
                  {authenticatedUser?.phone && (
                    <div className="mt-3 flex items-center gap-2">
                      <Checkbox
                        id="useDifferentPhone"
                        checked={useDifferentBusinessPhone}
                        onCheckedChange={(checked) => {
                          setUseDifferentBusinessPhone(checked === true);
                          if (checked === true) {
                            // Clear the field when enabling
                            handleFieldChange('phone', '');
                          } else {
                            // Reset to owner's phone when disabling
                            const displayPhone = authenticatedUser?.phone ? formatPhoneForDisplay(authenticatedUser.phone) : '';
                            handleFieldChange('phone', displayPhone);
                          }
                        }}
                      />
                      <Label 
                        htmlFor="useDifferentPhone" 
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {t('onboarding.steps.contact.useDifferentPhone')}
                      </Label>
                    </div>
                  )}
                  
                  {authenticatedUser?.phone && !useDifferentBusinessPhone && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('onboarding.steps.contact.phoneDisplayNote')}
                    </p>
                  )}
                </div>
                
                {/* Email Field */}
                <div>
                  <Label htmlFor="email" className="text-center block">
                    {t('onboarding.steps.contact.emailOptional')}
                  </Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2 text-center">
                    {t('onboarding.steps.contact.emailHint')}
                  </p>
                  <TooltipProvider>
                    <Tooltip open={errors.email ? true : undefined}>
                      <TooltipTrigger asChild>
                        <div>
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
                        </div>
                      </TooltipTrigger>
                      {errors.email && (
                        <TooltipContent side="bottom" className="bg-red-500 text-white border-red-600 -mt-1">
                          <p>{errors.email}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  {authenticatedUser?.email && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.autoFilledFromAccount') || 'Auto-filled from your account'}</p>
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
                {t('onboarding.steps.address.title')}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('onboarding.steps.address.subtitle')}
              </p>
              
              <p className="text-xs text-gray-500 mb-5">
                {t('onboarding.steps.reassurance')}
              </p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <IsraelAddressFields
                  idPrefix="onboarding-address"
                  value={businessInfo.address}
                  onChange={(address) => setBusinessInfo({ ...businessInfo, address })}
                  dir={dir}
                />
                
                {/* Social Links Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  {/* Description */}
                  <p className={`text-xs text-gray-500 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('onboarding.steps.address.socialHint')}
                  </p>

                  {/* Add Link Button - Always visible if there are available platforms */}
                  {SOCIAL_PLATFORMS.filter(platform => businessInfo.socialLinks?.[platform.key] === undefined).length > 0 && (
                    <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} mb-4`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={isRTL ? 'flex-row-reverse' : ''}
                            type="button"
                          >
                            <Plus className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
                            {t('onboarding.steps.address.addSocialLink')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align={isRTL ? 'end' : 'start'}
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          {SOCIAL_PLATFORMS.filter(platform => businessInfo.socialLinks?.[platform.key] === undefined).map((platform) => {
                            const IconComponent = platform.Icon;
                            return (
                              <DropdownMenuItem
                                key={platform.key}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleAddSocialLink(platform.key);
                                }}
                                className="flex items-center gap-3"
                              >
                                <IconComponent className="w-4 h-4" />
                                {platform.label[locale] || platform.label.en}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Existing Links - Only show inputs that have been added */}
                  {SOCIAL_PLATFORMS.some(platform => {
                    const value = businessInfo.socialLinks?.[platform.key];
                    return value !== undefined && value !== null;
                  }) && (
                    <div className="space-y-4">
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const linkValue = businessInfo.socialLinks?.[platform.key];
                        // Only show if link has been added (even if empty string - means user clicked add)
                        if (linkValue === undefined || linkValue === null) return null;

                        const IconComponent = platform.Icon;
                        return (
                          <div key={platform.key} className="flex items-start gap-2">
                            <div className="flex-1">
                              <label className={`text-sm font-medium mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                                <span className="inline-flex items-center gap-3">
                                  <IconComponent className="w-4 h-4" />
                                  {platform.label[locale] || platform.label.en}
                                </span>
                              </label>
                              <Input
                                value={businessInfo.socialLinks?.[platform.key] || ''}
                                onChange={(e) => handleSocialLinkChange(platform.key, e.target.value)}
                                placeholder={`https://${platform.key}.com/yourpage`}
                                dir="ltr"
                                className="text-left"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="mt-8"
                              onClick={() => handleRemoveSocialLink(platform.key)}
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                {t('onboarding.chooseBusinessType.stepSubtitle')}
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
                        {t('onboarding.steps.services.serviceCounter')
                          .replace('{current}', String(serviceIndex + 1))
                          .replace('{total}', '3')}
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('onboarding.steps.services.hint')}
                      </p>
                      <p className="text-xs text-gray-500 mb-5">
                        {t('onboarding.steps.reassurance')}
                      </p>
                    </div>
                    
                    <Card className="p-5 bg-gray-50 border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`service-name-${serviceIndex}`}>
                            {t('onboarding.steps.services.serviceName')}
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
                            placeholder={t('onboarding.steps.services.serviceNamePlaceholder')}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`service-description-${serviceIndex}`}>
                            {t('onboarding.steps.services.descriptionOptional')}
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
                              {t('onboarding.steps.services.durationMinutes')}
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
                              {t('onboarding.steps.services.priceIls')}
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
                        {t('onboarding.steps.services.skip')}
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
                {t('onboarding.steps.reassurance')}
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
                            if (selectedPlan === 'pro') {
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
                            const displayHighlight = (locale === 'he')
                              ? highlight
                                  .replace('הכל בחבילת Free', 'הכל בחבילת Basic')
                                  .replace('הכול בחבילת Free', 'הכול בחבילת Basic')
                                  .replace('הכול מתוכנית FREE', 'הכול מתוכנית BASIC')
                              : highlight;
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
                                        }`}>{displayHighlight}</span>
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
            <div className="sticky bottom-0 z-10 flex justify-between mt-8 pt-4 pb-2 border-t bg-white/95 backdrop-blur-sm -mx-6 px-6 sm:-mx-8 sm:px-8">
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
              {loginMethod === 'phone' 
                ? (t('onboarding.auth.otpSentTo')?.replace('{phone}', phoneNumber) || `We sent a verification code to ${phoneNumber}`)
                : (t('onboarding.auth.otpSentToEmail')?.replace('{email}', email) || `We sent a verification code to ${email}`)
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Success message with email/phone */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {loginMethod === 'phone' 
                  ? (t('onboarding.auth.otpSentToPhone')?.replace('{phone}', phoneNumber) || `Verification code sent successfully to ${phoneNumber}`)
                  : (t('onboarding.auth.otpSentToEmail')?.replace('{email}', email) || `Verification code sent successfully to ${email}`)
                }
              </p>
            </div>
            <div>
              <Label htmlFor="otp-code-modal" className="block mb-3 text-center">
                {t('onboarding.auth.otpCode') || 'OTP Code'}
              </Label>
              <OtpCodeInput
                key={otpSessionKey}
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(value) => handleVerifyOtp(value)}
                disabled={verifyingOtp}
                autoFocus
              />
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
                  type="button"
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || sendingOtp}
                  className="inline-link-button h-auto min-h-0 rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0 font-medium text-green-600 shadow-none hover:!border-green-600 hover:!bg-transparent hover:!text-green-700 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-70"
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
                {loginMethod === 'phone' 
                  ? (t('onboarding.auth.enterOtherNumber') || 'Enter other number')
                  : (t('onboarding.auth.enterOtherEmail') || 'Enter other email')
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PlanSelectionModal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        plans={allPlans}
        selectedPlan={selectedPlan}
        dir={dir}
        isRTL={isRTL}
        t={t}
        getTranslation={getTranslation}
        onSelectPlan={(planKey) => {
          setSelectedPlan(planKey);
          setIsPortfolio(planKey === "portfolio");
          setShowPlanModal(false);
          if (step === 10) {
            setTimeout(() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }, 100);
          }
        }}
        onContactUs={() => {
          setShowPlanModal(false);
          setContactModalOpen(true);
        }}
      />

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
