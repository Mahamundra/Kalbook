/**
 * Validation utilities for settings forms
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: true }; // Email is optional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
    };
  }
  
  return { isValid: true };
}

/**
 * Validate phone number format (supports XXX-XXX-XXXX format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Phone is optional in some contexts
  }
  
  // Remove dashes and spaces for validation
  const cleaned = phone.replace(/[-\s]/g, '');
  
  // Check if it's all digits and has reasonable length (7-15 digits)
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Phone number must contain only digits and dashes',
    };
  }
  
  if (cleaned.length < 7 || cleaned.length > 15) {
    return {
      isValid: false,
      error: 'Phone number must be between 7 and 15 digits',
    };
  }
  
  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: true }; // URL is optional
  }
  
  try {
    // Try to create a URL object
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL',
    };
  }
}

/**
 * Validate required field
 */
export function validateRequired(value: string | undefined | null, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }
  
  return { isValid: true };
}

/**
 * Validate time format (HH:mm)
 */
export function validateTime(time: string): ValidationResult {
  if (!time || time.trim() === '') {
    return {
      isValid: false,
      error: 'Time is required',
    };
  }
  
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return {
      isValid: false,
      error: 'Please enter a valid time in HH:mm format (e.g., 09:00)',
    };
  }
  
  return { isValid: true };
}

/**
 * Validate working hours (start must be before end)
 */
export function validateWorkingHours(start: string, end: string): ValidationResult {
  const startValidation = validateTime(start);
  if (!startValidation.isValid) {
    return startValidation;
  }
  
  const endValidation = validateTime(end);
  if (!endValidation.isValid) {
    return endValidation;
  }
  
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  
  if (startTotal >= endTotal) {
    return {
      isValid: false,
      error: 'Start time must be before end time',
    };
  }
  
  return { isValid: true };
}

/**
 * Validate hex color code
 */
export function validateHexColor(color: string): ValidationResult {
  if (!color) {
    return {
      isValid: false,
      error: 'Color is required',
    };
  }
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(color)) {
    return {
      isValid: false,
      error: 'Please enter a valid hex color code (e.g., #0EA5E9)',
    };
  }
  
  return { isValid: true };
}





