'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

const DEFAULT_LENGTH = 6;

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
  className?: string;
};

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  length = DEFAULT_LENGTH,
  className,
}: OtpCodeInputProps) {
  return (
    <div className={cn('flex justify-center px-2', className)} dir="ltr">
      <InputOTP
        maxLength={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="^[0-9]*$"
      >
        <InputOTPGroup className="gap-1 sm:gap-2">
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className="h-12 w-10 sm:h-14 sm:w-14 rounded-md border text-xl sm:text-2xl font-semibold first:rounded-md last:rounded-md"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
