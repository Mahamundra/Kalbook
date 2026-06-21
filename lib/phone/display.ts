import { toE164Format } from '@/lib/customers/utils';

/** Format live phone input as 054-263-6737 (Israeli mobile) */
export function formatIsraeliPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length === 0) {
    return '';
  }
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Convert stored/E.164 phone to display format 054-263-6737 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) {
    return '';
  }

  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('972') && digits.length > 10) {
    digits = `0${digits.substring(3)}`;
  }

  return formatIsraeliPhoneInput(digits.slice(-10));
}

export function cleanPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phoneInputToE164(phone: string): string {
  const digits = cleanPhoneDigits(phone);
  if (!digits) {
    return '';
  }
  // Israeli mobile without leading 0 (9 digits)
  if (digits.length === 9) {
    return `+972${digits}`;
  }
  return toE164Format(digits);
}

export const ISRAELI_PHONE_INPUT_MAX_LENGTH = 12;
