/**
 * Utility functions for normalizing and validating contact data
 */

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number - basic implementation
 * In production, consider using libphonenumber-js for proper E.164 formatting
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic US number normalization (extend for international support)
  if (cleaned.match(/^\d{10}$/)) {
    return `+1${cleaned}`;
  }
  if (cleaned.match(/^1\d{10}$/)) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Generate a unique external ID for phone contacts using crypto hash
 */
export function generatePhoneContactId(name: string, emails: string[], phones: string[]): string {
  const normalizedEmails = emails.map(normalizeEmail).sort().join(',');
  const normalizedPhones = phones.map(normalizePhone).sort().join(',');
  const key = `${name.trim()}|${normalizedEmails}|${normalizedPhones}`;
  
  // Create a cryptographic hash-based identifier
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('base64url').slice(0, 16);
}

/**
 * Check if two contacts are duplicates based on normalized data
 */
export function areContactsDuplicate(
  contact1: { name: string; emails: string[]; phones: string[] },
  contact2: { name: string; emails: string[]; phones: string[] }
): boolean {
  // Check if names are similar (basic check)
  if (contact1.name.toLowerCase().trim() !== contact2.name.toLowerCase().trim()) {
    return false;
  }
  
  // Check for overlapping emails
  const emails1 = contact1.emails.map(normalizeEmail);
  const emails2 = contact2.emails.map(normalizeEmail);
  const hasCommonEmail = emails1.some(email => emails2.includes(email));
  
  // Check for overlapping phones
  const phones1 = contact1.phones.map(normalizePhone);
  const phones2 = contact2.phones.map(normalizePhone);
  const hasCommonPhone = phones1.some(phone => phones2.includes(phone));
  
  return hasCommonEmail || hasCommonPhone;
}

/**
 * Deduplicate a list of contacts
 */
export function deduplicateContacts<T extends { name: string; emails: string[]; phones: string[] }>(
  contacts: T[]
): T[] {
  const result: T[] = [];
  
  for (const contact of contacts) {
    const isDuplicate = result.some(existing => areContactsDuplicate(contact, existing));
    if (!isDuplicate) {
      result.push(contact);
    }
  }
  
  return result;
}