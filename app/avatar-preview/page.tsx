"use client";

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useDirection } from '@/components/providers/DirectionProvider';

// Helper function to get time-based emoji (day/night/evening)
const getTimeBasedEmoji = (timeOfDay: 'day' | 'evening' | 'night'): string => {
  if (timeOfDay === 'day') {
    return '☀️'; // Sun
  } else if (timeOfDay === 'evening') {
    return '🌆'; // Sunset/Cityscape
  } else {
    return '✨'; // Stars
  }
};

// Helper function to get time-based avatar styling
const getTimeBasedAvatarStyle = (timeOfDay: 'day' | 'evening' | 'night'): string => {
  if (timeOfDay === 'night') {
    return 'bg-[palevioletred] border-[.5px] border-solid border-[#FF6A3D] text-gray-700';
  }
  // Default: gray background
  return 'bg-gray-200 text-gray-700';
};

export default function AvatarPreviewPage() {
  const { dir, isRTL } = useDirection();

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left side - Language Toggle */}
            <div className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 ${isRTL ? 'order-3' : 'order-1'}`}>
              <LanguageToggle />
            </div>
            
            {/* Center - Logo */}
            <div className="flex-1 flex justify-center items-center order-2">
              <img 
                src="/kalbook-logo.svg" 
                alt="KalBook.io" 
                className="h-8 sm:h-12 w-auto"
              />
            </div>
            
            {/* Right side - Empty space for balance */}
            <div className={`flex-shrink-0 ${isRTL ? 'order-1' : 'order-3'}`} style={{ width: 'calc(8rem + 1rem)' }}></div>
          </div>
        </div>
      </header>

      <div className="p-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center text-[#030408]">
            Avatar Time-Based Design Preview
          </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Day Avatar */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Day (5am - 6pm)</h2>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('day')}`}>
                  {getTimeBasedEmoji('day')}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-600 text-center">
                Background: gray-200<br />
                Border: none<br />
                Emoji: ☀️
              </p>
            </div>
          </div>

          {/* Evening Avatar */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Evening (6pm - 10pm)</h2>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('evening')}`}>
                  {getTimeBasedEmoji('evening')}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-600 text-center">
                Background: gray-200<br />
                Border: none<br />
                Emoji: 🌆
              </p>
            </div>
          </div>

          {/* Night Avatar */}
          <div className="flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Night (10pm - 5am)</h2>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-600 text-center">
                Background: palevioletred<br />
                Border: 0.5px solid #FF6A3D<br />
                Emoji: ✨
              </p>
            </div>
          </div>
        </div>

        {/* Different Sizes */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#030408]">Different Sizes</h2>
          <div className="flex flex-wrap justify-center items-end gap-8 p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Small */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className={`text-xs ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">Small (6x6)</span>
            </div>
            
            {/* Medium */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={`text-base ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">Medium (10x10)</span>
            </div>
            
            {/* Large */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">Large (16x16)</span>
            </div>
            
            {/* Extra Large */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20">
                <AvatarFallback className={`text-3xl ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600">XL (20x20)</span>
            </div>
          </div>
        </div>

        {/* All Time Periods Side by Side */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#030408]">All Time Periods</h2>
          <div className="flex justify-center items-center gap-12 p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('day')}`}>
                  {getTimeBasedEmoji('day')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">Day</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('evening')}`}>
                  {getTimeBasedEmoji('evening')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">Evening</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-2xl ${getTimeBasedAvatarStyle('night')}`}>
                  {getTimeBasedEmoji('night')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">Night</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

