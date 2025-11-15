'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ported/ui/button';
import { Input } from '@/components/ported/ui/input';
import { Label } from '@/components/ported/ui/label';
import { Alert, AlertDescription } from '@/components/ported/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ported/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ported/ui/dialog';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { KalBokLogo } from '@/components/ui/KalBookLogo';
import Link from 'next/link';

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminLoginModal({ open, onOpenChange }: AdminLoginModalProps) {
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { dir } = useDirection();

  const [step, setStep] = useState<'phone' | 'verify' | 'welcome'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const handlePhoneSubmit = async () => {
    if (!phone || phone.trim() === '') {
      setError(t('adminLogin.phoneRequired') || 'Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          method: 'whatsapp',
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.sendCodeError') || 'Failed to send code');
      }

      setIsLoading(false);
      setStep('verify');
      toast.success(t('adminLogin.codeSent') || 'Code sent successfully');
      
      // In development, show the code for testing
      if (data.code && process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP Code: ${data.code}`);
      }
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
      toast.error(error.message || t('adminLogin.sendCodeError') || 'Failed to send code');
    }
  };

  const handleVerifyCode = async () => {
    // Accept both 4-digit test code (1234) and 6-digit real codes
    if (!code || (code.length !== 4 && code.length !== 6)) {
      setError(t('adminLogin.invalidCode') || 'Invalid code format');
      toast.error(t('adminLogin.invalidCode') || 'Invalid code format');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call verify-otp-homepage API
      const response = await fetch('/api/auth/verify-otp-homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          code: code,
          userType: 'homepage_admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('adminLogin.invalidCode') || 'Invalid code');
      }

      // Verify response indicates success
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      setIsLoading(false);
      setUserName(data.user?.name || '');
      setStep('welcome');

      // Show welcome message
      toast.success(
        (t('adminLogin.welcomeBack') || 'Welcome Back! {name}').replace('{name}', data.user?.name || '')
      );
      
      // Small delay to show welcome message, then redirect to homepage
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close modal and redirect to homepage to show user menu
      onOpenChange(false);
      window.location.href = '/';
    } catch (error: any) {
      setIsLoading(false);
      setError(error.message || t('adminLogin.invalidCode') || 'Invalid code');
      toast.error(error.message || t('adminLogin.invalidCode') || 'Invalid code');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setStep('phone');
      setPhone('');
      setCode('');
      setError(null);
      setUserName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir={dir}>
        <DialogHeader>
          <div className={`flex flex-col items-center justify-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <KalBokLogo size="lg" variant="full" />
          </div>
          <DialogTitle className={`text-2xl font-bold text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            {step === 'welcome'
              ? (t('adminLogin.welcomeBack') || 'Welcome Back! {name}').replace('{name}', userName)
              : (t('adminLogin.homepageLogin') || t('adminLogin.title') || 'Admin Login')
            }
          </DialogTitle>
          <DialogDescription className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
            {step === 'welcome'
              ? (t('adminLogin.loginSuccess') || 'Redirecting to your dashboard...')
              : (t('adminLogin.subtitle') || 'Sign in to manage your business')
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'welcome' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : step === 'phone' ? (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <Phone className="w-4 h-4" />
                {t('adminLogin.phone') || 'Phone Number'}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('adminLogin.phonePlaceholder') || '+1234567890'}
                value={phone}
                onChange={(e) => {
                  let value = e.target.value;
                  // If there's a + anywhere, move it to the beginning
                  if (value.includes('+')) {
                    value = '+' + value.replace(/\+/g, '');
                  }
                  setPhone(value);
                }}
                required
                disabled={isLoading}
                autoComplete="tel"
                dir="ltr"
                className="w-full"
              />
            </div>

            <Button
              type="button"
              onClick={handlePhoneSubmit}
              className="w-full"
              disabled={isLoading || !phone.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                  {t('adminLogin.sending') || 'Sending...'}
                </>
              ) : (
                t('adminLogin.sendCode') || 'Send Code'
              )}
            </Button>

            <div className={`mt-4 text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
              <p>{t('adminLogin.testCodeHint') || 'For testing, use code: 1234'}</p>
            </div>

            <div className={`mt-6 pt-4 border-t text-center text-sm text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
              <p>{t('adminLogin.noUserYet') || 'If you have not user yet'}</p>
              <Link href="/onboarding" className="text-primary hover:underline mt-1 block">
                {t('adminLogin.createNewBusiness') || 'Create new business'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className={`block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('adminLogin.enterCode') || 'Enter verification code'}
              </Label>
              <div className="flex justify-center w-full">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  disabled={isLoading}
                  className="w-full justify-center"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <InputOTPGroup className={`gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className={`text-xs text-center text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('adminLogin.codeHint') || 'Enter the 6-digit code sent to your phone, or use 1234 for testing'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                className="flex-1"
                disabled={isLoading}
              >
                {t('adminLogin.back') || 'Back'}
              </Button>
              <Button
                type="button"
                onClick={handleVerifyCode}
                className="flex-1"
                disabled={isLoading || code.length < 4}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'} animate-spin`} />
                    {t('adminLogin.verifying') || 'Verifying...'}
                  </>
                ) : (
                  t('adminLogin.verify') || 'Verify'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

