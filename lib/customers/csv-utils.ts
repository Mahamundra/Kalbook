/**
 * CSV Export/Import utilities for customers
 */

import type { Customer } from '@/components/ported/types/admin';

/**
 * Export customers to CSV string
 */
export function exportCustomersToCSV(customers: Customer[]): string {
  if (customers.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'Name',
    'Phone',
    'Email',
    'Date of Birth',
    'Gender',
    'Last Visit',
    'Tags',
    'Notes',
    'Marketing Consent',
    'Blocked',
    'Created At',
  ];

  // Create CSV rows
  const rows = customers.map((customer) => {
    return [
      escapeCSVField(customer.name),
      escapeCSVField(customer.phone),
      escapeCSVField(customer.email || ''),
      escapeCSVField(customer.dateOfBirth || ''),
      escapeCSVField(customer.gender || ''),
      escapeCSVField(customer.lastVisit || ''),
      escapeCSVField(customer.tags?.join('; ') || ''),
      escapeCSVField(customer.notes || ''),
      customer.consentMarketing ? 'Yes' : 'No',
      customer.blocked ? 'Yes' : 'No',
      escapeCSVField(new Date().toISOString().split('T')[0]), // Created date approximation
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSVField(field: string): string {
  if (!field) return '';
  
  const stringField = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  
  return stringField;
}

/**
 * Parse CSV file content
 */
export function parseCSVFile(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter((line) => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue; // Skip empty rows
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

/**
 * Validate customer CSV row
 */
export interface CSVValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  customer?: Partial<Customer>;
}

export function validateCustomerCSVRow(
  row: Record<string, string>,
  rowIndex: number
): CSVValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize header names (case-insensitive, handle spaces)
  const normalizeHeader = (header: string) => {
    return header.toLowerCase().trim().replace(/\s+/g, ' ');
  };
  
  const getValue = (possibleHeaders: string[]): string => {
    for (const header of possibleHeaders) {
      const normalized = normalizeHeader(header);
      for (const key of Object.keys(row)) {
        if (normalizeHeader(key) === normalized) {
          return row[key];
        }
      }
    }
    return '';
  };

  // Extract values
  const name = getValue(['Name', 'name', 'Customer Name', 'customer name']);
  const phone = getValue(['Phone', 'phone', 'Phone Number', 'phone number', 'Tel', 'tel']);
  const email = getValue(['Email', 'email', 'E-mail', 'e-mail']);
  const dateOfBirth = getValue(['Date of Birth', 'date of birth', 'DOB', 'dob', 'Birthday', 'birthday']);
  const gender = getValue(['Gender', 'gender', 'Sex', 'sex']);
  const lastVisit = getValue(['Last Visit', 'last visit', 'LastVisit', 'lastvisit']);
  const tags = getValue(['Tags', 'tags', 'Tag', 'tag']);
  const notes = getValue(['Notes', 'notes', 'Note', 'note']);
  const consentMarketing = getValue(['Marketing Consent', 'marketing consent', 'Consent', 'consent', 'Marketing', 'marketing']);
  const blocked = getValue(['Blocked', 'blocked', 'Is Blocked', 'is blocked']);

  // Validate required fields
  if (!name || name.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Name is required`);
  }

  if (!phone || phone.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Phone is required`);
  } else {
    // Basic phone validation (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push(`Row ${rowIndex + 1}: Phone number must have at least 10 digits`);
    }
  }

  // Validate email format if provided
  if (email && email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push(`Row ${rowIndex + 1}: Invalid email format`);
    }
  }

  // Validate date formats
  if (dateOfBirth && dateOfBirth.trim() !== '') {
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      errors.push(`Row ${rowIndex + 1}: Invalid date of birth format (use YYYY-MM-DD)`);
    } else if (dobDate > new Date()) {
      errors.push(`Row ${rowIndex + 1}: Date of birth cannot be in the future`);
    }
  }

  if (lastVisit && lastVisit.trim() !== '') {
    const lastVisitDate = new Date(lastVisit);
    if (isNaN(lastVisitDate.getTime())) {
      warnings.push(`Row ${rowIndex + 1}: Invalid last visit date format (use YYYY-MM-DD)`);
    }
  }

  // Validate gender
  if (gender && gender.trim() !== '') {
    const validGenders = ['male', 'female', 'other', 'Male', 'Female', 'Other'];
    if (!validGenders.includes(gender.trim())) {
      warnings.push(`Row ${rowIndex + 1}: Gender should be Male, Female, or Other`);
    }
  }

  // Build customer object if valid
  let customer: Partial<Customer> | undefined;
  if (errors.length === 0) {
    customer = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : undefined,
      gender: gender.trim().toLowerCase() || undefined,
      lastVisit: lastVisit || undefined,
      tags: tags ? tags.split(';').map((t) => t.trim()).filter((t) => t) : [],
      notes: notes.trim() || undefined,
      consentMarketing: consentMarketing ? 
        ['yes', 'true', '1', 'y'].includes(consentMarketing.toLowerCase().trim()) : false,
      blocked: blocked ? 
        ['yes', 'true', '1', 'y'].includes(blocked.toLowerCase().trim()) : false,
    };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    customer,
  };
}

/**
 * Detect duplicate customers by phone number
 */
export function detectDuplicateCustomers(
  existingCustomers: Customer[],
  newCustomer: Partial<Customer>
): Customer | null {
  if (!newCustomer.phone) {
    return null;
  }

  // Normalize phone for comparison
  const normalizePhoneForComparison = (phone: string): string => {
    return phone.replace(/\D/g, ''); // Remove all non-digits
  };

  const newPhoneNormalized = normalizePhoneForComparison(newCustomer.phone);

  return existingCustomers.find((existing) => {
    const existingPhoneNormalized = normalizePhoneForComparison(existing.phone);
    return existingPhoneNormalized === newPhoneNormalized;
  }) || null;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'customers.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}


