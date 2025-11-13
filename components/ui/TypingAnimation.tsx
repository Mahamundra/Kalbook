"use client";

import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  suffix?: string;
  suffixDelay?: number;
  typingSpeed?: number;
  pauseAfterComplete?: number;
  className?: string;
  locale?: string;
}

export function TypingAnimation({
  text,
  suffix = '.io',
  suffixDelay = 800,
  typingSpeed = 100,
  pauseAfterComplete = 2000,
  className = '',
  locale = 'en',
}: TypingAnimationProps) {
  // Force LTR direction for Arabic and Hebrew
  const isRTL = locale === 'ar' || locale === 'he';
  const [displayedText, setDisplayedText] = useState('');
  const [displayedSuffix, setDisplayedSuffix] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [suffixIndex, setSuffixIndex] = useState(0);
  const [isTypingSuffix, setIsTypingSuffix] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Phase 1: Typing the main text
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } 
    // Phase 2: Wait before starting to type suffix
    else if (currentIndex === text.length && !isTypingSuffix && suffixIndex === 0) {
      const timer = setTimeout(() => {
        setIsTypingSuffix(true);
      }, suffixDelay);

      return () => clearTimeout(timer);
    }
    // Phase 3: Typing the suffix character by character
    else if (isTypingSuffix && suffixIndex < suffix.length) {
      const timer = setTimeout(() => {
        setDisplayedSuffix(suffix.slice(0, suffixIndex + 1));
        setSuffixIndex(suffixIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    }
    // Phase 4: After completing suffix, mark as complete
    else if (isTypingSuffix && suffixIndex === suffix.length && !isComplete) {
      setIsComplete(true);
    }
    // Phase 5: After showing complete text, wait then reset
    else if (isComplete) {
      const timer = setTimeout(() => {
        // Reset everything to start the animation over
        setDisplayedText('');
        setDisplayedSuffix('');
        setCurrentIndex(0);
        setSuffixIndex(0);
        setIsTypingSuffix(false);
        setIsComplete(false);
      }, pauseAfterComplete);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, typingSpeed, suffixDelay, isTypingSuffix, suffixIndex, suffix, isComplete, pauseAfterComplete]);

  const isTyping = currentIndex < text.length || (isTypingSuffix && suffixIndex < suffix.length);

  return (
    <span 
      className={className}
      style={isRTL ? { direction: 'ltr', display: 'inline-block' } : {}}
    >
      {displayedText}
      {displayedSuffix}
      {isTyping && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

