"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '@/components/ui/Footer';
import { useLocale } from '@/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTimeBasedGreeting } from '@/lib/utils/greetings';
import { LogOut, LayoutDashboard, ChevronDown, User, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const { t, locale, isRTL } = useLocale();
  const { dir } = useDirection();
  const router = useRouter();
  const pathname = usePathname();
  
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

  return (
    <div dir={dir} className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Same as onboarding and homepage */}
      <header className="bg-white border-b fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-sm bg-white/95 supports-[backdrop-filter]:bg-white/80 safe-area-top shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative">
          <div className="flex items-center justify-between gap-2">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <LanguageToggle />
            </div>
            
            {/* User menu / Greetings */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {!loadingUser && user && (
                <div style={{ display: 'none' }}>
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
                className="h-8 sm:h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
        </div>
        
        {/* Navigation Bookmarks */}
        <div className="border-t bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="flex items-center gap-4">
                <Link 
                  href="/terms" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === '/terms' ? 'text-primary' : 'text-muted-foreground'
                  } relative inline-block group`}
                >
                  {t('home.footer.terms') || 'Terms'}
                  <span className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} h-[1.5px] bg-primary transition-all duration-300 ${
                    pathname === '/terms' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
                <Link 
                  href="/privacy" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === '/privacy' ? 'text-primary' : 'text-muted-foreground'
                  } relative inline-block group`}
                >
                  {t('home.footer.privacy') || 'Privacy'}
                  <span className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} h-[1.5px] bg-primary transition-all duration-300 ${
                    pathname === '/privacy' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-28 md:pt-36 pb-8">
          <div className="prose prose-lg max-w-none">
            {/* Back Button */}
            <div className="mb-6 flex w-full justify-start">
              <button
                onClick={() => router.back()}
                className="group flex items-center gap-2 text-muted-foreground hover:!text-black hover:!bg-transparent transition-colors relative"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                <span className="relative">
                  {t('nav.back') || t('userDashboard.back') || 'Back'}
                  <span className={`absolute bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-0 h-[1.5px] bg-black transition-all duration-300 group-hover:w-full`}></span>
                </span>
              </button>
            </div>
            
            <h1 className="text-4xl font-bold mb-2 text-center">{t('privacy.title')}</h1>
            <p className="text-muted-foreground mb-8 text-center">{t('privacy.lastUpdated')}</p>
            
            <div className="space-y-6 text-foreground">
              <section>
                <p className="mb-4">
                  {t('privacy.intro').split('KalBook.io').map((part, index, array) => 
                    index === array.length - 1 ? part : (
                      <span key={index}>
                        {part}
                        <a href="https://kalbook.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">KalBook.io</a>
                      </span>
                    )
                  )}
                </p>
                <p className="mb-4">{t('privacy.intro2')}</p>
                <p className="mb-4">{t('privacy.genderNote')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">1. {t('privacy.section1.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section1.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item3')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item4')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.item5')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.item6')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.customerItem3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.customerItem4')}</p>
                <p className="mb-3">{t('privacy.section1.p3')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p4')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section1.techItem3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section1.techItem4')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section1.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section1.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">2. {t('privacy.section2.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section2.subtitle1')}</strong></p>
                <p className="mb-2 ms-4">{t('privacy.section2.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section2.item2')}</p>
                <p className="mb-3 ms-4">{t('privacy.section2.item3')}</p>
                <p className="mb-3">{t('privacy.section2.p1')}</p>
                <p className="mb-3">{t('privacy.section2.p2')}</p>
                <p className="mb-3">{t('privacy.section2.p3')}</p>
                <p className="mb-3">{t('privacy.section2.p4')}</p>
                <p className="mb-3">{t('privacy.section2.p5')}</p>
                <p className="mb-3">{t('privacy.section2.p6')}</p>
                <p className="mb-3">{t('privacy.section2.p7')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">3. {t('privacy.section3.title')}</h2>
                <p className="mb-3">{t('privacy.section3.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section3.item3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section3.item4')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">4. {t('privacy.section4.title')}</h2>
                <p className="mb-3"><strong>{t('privacy.section4.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section4.item3')}</p>
                <p className="mb-3 ms-4">{t('privacy.section4.item4')}</p>
                <p className="mb-3">{t('privacy.section4.p2')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p3')}</p>
                <p className="mb-3">{t('privacy.section4.p4')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p5')}</p>
                
                <p className="mb-3 mt-4"><strong>{t('privacy.section4.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section4.p6')}</p>
                <p className="mb-3">{t('privacy.section4.p7')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">5. {t('privacy.section5.title')}</h2>
                <p className="mb-3">{t('privacy.section5.p1')}</p>
                <p className="mb-3">{t('privacy.section5.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">6. {t('privacy.section6.title')}</h2>
                <p className="mb-3">{t('privacy.section6.p1')}</p>
                <p className="mb-3">{t('privacy.section6.p2')}</p>
                <p className="mb-3">{t('privacy.section6.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">7. {t('privacy.section7.title')}</h2>
                <p className="mb-3">{t('privacy.section7.p1')}</p>
                <p className="mb-3">{t('privacy.section7.p2')}</p>
                <p className="mb-3">{t('privacy.section7.p3')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">8. {t('privacy.section8.title')}</h2>
                <p className="mb-3">{t('privacy.section8.p1')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle1')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p2')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle2')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p3')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle3')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p4')}</p>
                <p className="mb-3"><strong>{t('privacy.section8.subtitle4')}</strong></p>
                <p className="mb-3">{t('privacy.section8.p5')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">9. {t('privacy.section9.title')}</h2>
                <p className="mb-3">{t('privacy.section9.p1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item1')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item2')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item3')}</p>
                <p className="mb-2 ms-4">{t('privacy.section9.item4')}</p>
                <p className="mb-3">{t('privacy.section9.p2')}</p>
                <p className="mb-3">
                  {t('privacy.section9.p3').split('Google Analytics').map((part, index, array) => 
                    index === array.length - 1 ? part : (
                      <span key={index}>
                        {part}
                        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics</a>
                      </span>
                    )
                  )}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">10. {t('privacy.section10.title')}</h2>
                <p className="mb-3">{t('privacy.section10.p1')}</p>
                <p className="mb-3">{t('privacy.section10.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">11. {t('privacy.section11.title')}</h2>
                <p className="mb-3">{t('privacy.section11.p1')}</p>
                <p className="mb-3">{t('privacy.section11.p2')}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4">12. {t('privacy.section12.title')}</h2>
                <p className="mb-3">{t('privacy.section12.p1')}</p>
                <div className="mb-3 space-y-2">
                  <p><strong>{t('privacy.section12.businessName')}</strong> {t('privacy.section12.businessNameValue')}</p>
                  <p><strong>{t('privacy.section12.email')}</strong> <a href={`mailto:${t('privacy.section12.emailValue')}`} className="text-primary hover:underline">{t('privacy.section12.emailValue')}</a></p>
                  <p><strong>{t('privacy.section12.phone')}</strong> <a href={`tel:+972542636737`} className="text-primary hover:underline">{t('privacy.section12.phoneValue')}</a> / <a href="https://wa.me/972542636737" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a></p>
                  <p><strong>{t('privacy.section12.address')}</strong> {t('privacy.section12.addressValue')}</p>
                </div>
                <p className="mb-3">{t('privacy.section12.p2')}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

