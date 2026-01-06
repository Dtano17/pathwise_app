/**
 * Contact Sync Integration for Capacitor
 *
 * Enables users to invite friends from contacts and sync contact
 * information for collaborative activities
 */

import { Contacts, type GetContactsResult } from '@capacitor-community/contacts';
import { isNative } from './platform';

// Define Contact type locally to match Capacitor ContactPayload
interface Contact {
  contactId: string;
  name?: {
    display?: string | null;
    given?: string | null;
    family?: string | null;
  };
  phones?: Array<{ number?: string | null }>;
  emails?: Array<{ address?: string | null }>;
  image?: {
    base64String?: string | null;
  };
}

export interface SimpleContact {
  id: string;
  displayName: string;
  phoneNumbers?: string[];
  emails?: string[];
  photoUrl?: string;
}

export interface ContactInviteOptions {
  message?: string;
  method?: 'sms' | 'email' | 'both';
}

/**
 * Request contacts permission
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (!isNative()) {
    console.warn('Contacts only available on native platforms');
    return false;
  }

  try {
    const permission = await Contacts.requestPermissions();
    return permission.contacts === 'granted';
  } catch (error) {
    console.error('Failed to request contacts permission:', error);
    return false;
  }
}

/**
 * Check contacts permission status
 */
export async function checkContactsPermission(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const permission = await Contacts.checkPermissions();
    return permission.contacts === 'granted';
  } catch (error) {
    console.error('Failed to check contacts permission:', error);
    return false;
  }
}

/**
 * Get all contacts from device
 */
export async function getContacts(): Promise<SimpleContact[]> {
  if (!isNative()) {
    console.warn('Contacts only available on native platforms');
    return [];
  }

  try {
    // Check permission first
    const hasPermission = await checkContactsPermission();
    if (!hasPermission) {
      const granted = await requestContactsPermission();
      if (!granted) {
        console.warn('Contacts permission not granted');
        return [];
      }
    }

    // Fetch contacts
    const result: GetContactsResult = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
        image: true,
      },
    });

    // Transform to simple format
    return result.contacts.map(transformContact).filter((c) => c !== null) as SimpleContact[];
  } catch (error) {
    console.error('Failed to get contacts:', error);
    return [];
  }
}

/**
 * Search contacts by name
 */
export async function searchContacts(query: string): Promise<SimpleContact[]> {
  const allContacts = await getContacts();

  const lowerQuery = query.toLowerCase();
  return allContacts.filter((contact) =>
    contact.displayName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get contact by ID
 */
export async function getContactById(contactId: string): Promise<SimpleContact | null> {
  const contacts = await getContacts();
  return contacts.find((c) => c.id === contactId) || null;
}

/**
 * Pick a single contact (native contact picker)
 */
export async function pickContact(): Promise<SimpleContact | null> {
  if (!isNative()) {
    console.warn('Contact picker only available on native platforms');
    return null;
  }

  try {
    // Note: @capacitor-community/contacts doesn't have a picker yet
    // This is a placeholder for future implementation
    // You might need to use a different plugin or native module
    console.warn('Contact picker not implemented yet');
    return null;
  } catch (error) {
    console.error('Failed to pick contact:', error);
    return null;
  }
}

/**
 * Invite contacts to use JournalMate
 */
export async function inviteContacts(
  contacts: SimpleContact[],
  options: ContactInviteOptions = {}
): Promise<{ success: boolean; invitedCount: number }> {
  const message =
    options.message ||
    `Hey! I'm using JournalMate to plan my goals and track my journey. Join me! 🚀\n\nhttps://journalmate.ai`;

  let invitedCount = 0;

  for (const contact of contacts) {
    const invited = await inviteContact(contact, message, options.method);
    if (invited) {
      invitedCount++;
    }
  }

  return {
    success: invitedCount > 0,
    invitedCount,
  };
}

/**
 * Invite a single contact
 */
async function inviteContact(
  contact: SimpleContact,
  message: string,
  method: 'sms' | 'email' | 'both' = 'both'
): Promise<boolean> {
  try {
    if (method === 'sms' || method === 'both') {
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const phoneNumber = contact.phoneNumbers[0];
        const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
        return true;
      }
    }

    if (method === 'email' || method === 'both') {
      if (contact.emails && contact.emails.length > 0) {
        const email = contact.emails[0];
        const subject = encodeURIComponent('Join me on JournalMate!');
        const body = encodeURIComponent(message);
        const emailUrl = `mailto:${email}?subject=${subject}&body=${body}`;
        window.location.href = emailUrl;
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to invite contact:', error);
    return false;
  }
}

/**
 * Transform Capacitor Contact to SimpleContact
 */
function transformContact(contact: Contact): SimpleContact | null {
  try {
    const displayName =
      contact.name?.display ||
      `${contact.name?.given || ''} ${contact.name?.family || ''}`.trim() ||
      'Unknown';

    const phoneNumbers = contact.phones?.map((p: { number?: string | null }) => p.number || '').filter(Boolean) || [];
    const emails = contact.emails?.map((e: { address?: string | null }) => e.address || '').filter(Boolean) || [];
    const photoUrl = contact.image?.base64String
      ? `data:image/jpeg;base64,${contact.image.base64String}`
      : undefined;

    return {
      id: contact.contactId,
      displayName,
      phoneNumbers,
      emails,
      photoUrl,
    };
  } catch (error) {
    console.error('Failed to transform contact:', error);
    return null;
  }
}

/**
 * Sync contacts with backend to store and display in app
 * Sends actual contact data (name, emails, phones) for storage
 */
export async function syncContactsWithServer(contacts: SimpleContact[]): Promise<{ syncedCount: number }> {
  try {
    // Transform contacts to the format expected by the backend (syncContactsSchema)
    const formattedContacts = contacts.map((contact) => ({
      name: contact.displayName,
      emails: contact.emails || [],
      tel: contact.phoneNumbers || [],
    }));

    console.log('[CONTACTS] Syncing contacts with server:', formattedContacts.length);

    // Send to server for storage
    const response = await fetch('/api/contacts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contacts: formattedContacts }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to sync contacts');
    }

    const result = await response.json();
    console.log('[CONTACTS] Contacts synced successfully:', result);
    return { syncedCount: result.syncedCount || 0 };
  } catch (error) {
    console.error('[CONTACTS] Failed to sync contacts:', error);
    throw error;
  }
}

/**
 * Simple hash function for privacy (use proper crypto in production)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Get contacts with JournalMate accounts (from server)
 */
export async function getContactsOnJournalMate(): Promise<
  Array<{ contactId: string; userId: string; displayName: string }>
> {
  try {
    const response = await fetch('/api/contacts/on-journalmate');
    if (!response.ok) {
      throw new Error('Failed to fetch JournalMate contacts');
    }

    const data = await response.json();
    return data.contacts || [];
  } catch (error) {
    console.error('Failed to get JournalMate contacts:', error);
    return [];
  }
}

export default {
  requestContactsPermission,
  checkContactsPermission,
  getContacts,
  searchContacts,
  getContactById,
  pickContact,
  inviteContacts,
  syncContactsWithServer,
  getContactsOnJournalMate,
};
