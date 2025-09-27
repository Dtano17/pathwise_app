import { storage } from "./storage";
import { type Contact, type User } from "@shared/schema";
import { normalizeEmail, normalizePhone, generatePhoneContactId, deduplicateContacts } from './utils/contactNormalizer';

// Contact syncing and sharing service
export class ContactSyncService {
  
  // Create contacts from phone contact picker data
  async syncPhoneContacts(userId: string, phoneContacts: Array<{
    name: string;
    emails?: string[];
    tel?: string[];
  }>): Promise<{ syncedCount: number; contacts: Contact[] }> {
    // Normalize and deduplicate contacts
    const normalizedContacts = phoneContacts.map(contact => ({
      name: contact.name.trim(),
      emails: (contact.emails || []).map(normalizeEmail),
      phones: (contact.tel || []).map(normalizePhone),
    }));
    
    const deduplicatedContacts = deduplicateContacts(normalizedContacts);
    const syncedContacts: Contact[] = [];
    
    for (const contact of deduplicatedContacts) {
      try {
        // Generate consistent external ID for deduplication
        const externalId = generatePhoneContactId(contact.name, contact.emails, contact.phones);
        
        // Check if contact already exists
        const existingContact = await storage.findContactByExternalId(userId, 'phone', externalId);
        
        if (existingContact) {
          // Update existing contact with new data if different
          const updatedContact = await storage.updateContact(existingContact.id, userId, {
            name: contact.name,
            emails: contact.emails || [],
            phones: contact.phones || [],
          });
          syncedContacts.push(updatedContact);
        } else {
          // Create new contact record
          const newContact = await storage.createContact({
            ownerUserId: userId,
            source: 'phone',
            name: contact.name,
            emails: contact.emails || [],
            phones: contact.phones || [],
            externalId,
          });
          
          syncedContacts.push(newContact);
        }
      } catch (error) {
        // Log error without exposing PII
        console.error(`Failed to sync contact (ID: ${syncedContacts.length + 1}):`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // After syncing, try to match contacts with existing JournalMate users
    await storage.updateContactMatches();
    
    return {
      syncedCount: syncedContacts.length,
      contacts: syncedContacts
    };
  }

  // Create manual contact entry
  async addManualContact(userId: string, contactData: {
    name: string;
    email?: string;
    phone?: string;
  }): Promise<Contact> {
    // Normalize input data
    const emails = contactData.email ? [normalizeEmail(contactData.email)] : [];
    const phones = contactData.phone ? [normalizePhone(contactData.phone)] : [];
    const normalizedName = contactData.name.trim();
    
    // Check for duplicates
    const existingContacts = await storage.getUserContacts(userId);
    const isDuplicate = existingContacts.some(contact => 
      contact.name.toLowerCase() === normalizedName.toLowerCase() &&
      (emails.some(email => (contact.emails || []).includes(email)) ||
       phones.some(phone => (contact.phones || []).includes(phone)))
    );
    
    if (isDuplicate) {
      throw new Error('Contact already exists');
    }
    
    const contact = await storage.createContact({
      ownerUserId: userId,
      source: 'manual',
      name: normalizedName,
      emails,
      phones,
    });
    
    // Try to match with existing users
    await storage.updateContactMatches();
    
    return contact;
  }

  // Get user's contacts with JournalMate status
  async getUserContactsWithStatus(userId: string): Promise<Array<Contact & {
    status: 'on_journalmate' | 'invited' | 'not_invited';
    user?: User;
  }>> {
    const contacts = await storage.getUserContacts(userId);
    const enrichedContacts = [];
    
    for (const contact of contacts) {
      let status: 'on_journalmate' | 'invited' | 'not_invited' = 'not_invited';
      let user: User | undefined;
      
      if (contact.matchedUserId) {
        // User is already on JournalMate
        status = 'on_journalmate';
        user = await storage.getUser(contact.matchedUserId);
      } else {
        // Check if we've sent an invite (this would be tracked in a future invites table)
        status = 'not_invited';
      }
      
      enrichedContacts.push({
        ...contact,
        status,
        user
      });
    }
    
    return enrichedContacts;
  }

  // Generate sharing invite link with group invite code
  generateInviteLink(groupId: string, inviteCode: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
      'http://localhost:5000';
    
    return `${baseUrl}/join/${inviteCode}?group=${groupId}`;
  }

  // Send invite message (SMS/Email content)
  generateInviteMessage(inviterName: string, planTitle: string, inviteLink: string): string {
    return `Hi! ${inviterName} invited you to collaborate on "${planTitle}" using JournalMate - an AI-powered lifestyle planner. Join here: ${inviteLink}`;
  }
}

export const contactSyncService = new ContactSyncService();