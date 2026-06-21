import { describe, expect, it } from 'vitest';
import {
  formatIsraeliPhoneInput,
  formatPhoneForDisplay,
  phoneInputToE164,
} from '@/lib/phone/display';

describe('phone display helpers', () => {
  it('formats live input with dashes', () => {
    expect(formatIsraeliPhoneInput('0542636737')).toBe('054-263-6737');
    expect(formatIsraeliPhoneInput('054')).toBe('054');
    expect(formatIsraeliPhoneInput('054263')).toBe('054-263');
    expect(formatIsraeliPhoneInput('')).toBe('');
  });

  it('limits input to 10 digits', () => {
    expect(formatIsraeliPhoneInput('054263673712345')).toBe('054-263-6737');
  });

  it('formats E.164 for display', () => {
    expect(formatPhoneForDisplay('+972542636737')).toBe('054-263-6737');
    expect(formatPhoneForDisplay('054-263-6737')).toBe('054-263-6737');
    expect(formatPhoneForDisplay('')).toBe('');
  });

  it('converts formatted input to E.164', () => {
    expect(phoneInputToE164('054-263-6737')).toBe('+972542636737');
    expect(phoneInputToE164('542636737')).toBe('+972542636737');
  });
});
