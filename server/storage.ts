import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, isNull } from "drizzle-orm";
import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Goal,
  type InsertGoal,
  type Task,
  type InsertTask,
  type JournalEntry,
  type InsertJournalEntry,
  type ProgressStats,
  type InsertProgressStats,
  type ChatImport,
  type InsertChatImport,
  type Priority,
  type InsertPriority,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type TaskReminder,
  type InsertTaskReminder,
  type SchedulingSuggestion,
  type InsertSchedulingSuggestion,
  type AuthIdentity,
  type InsertAuthIdentity,
  type ExternalOAuthToken,
  type InsertExternalOAuthToken,
  type Contact,
  type InsertContact,
  type UserProfile,
  type InsertUserProfile,
  type UserPreferences,
  type InsertUserPreferences,
  type UserConsent,
  type InsertUserConsent,
  type TaskAction,
  type InsertTaskAction,
  type Achievement,
  type InsertAchievement,
  type UserStatistics,
  type InsertUserStatistics,
  users,
  goals,
  tasks,
  journalEntries,
  progressStats,
  chatImports,
  priorities,
  taskActions,
  achievements,
  userStatistics,
  notificationPreferences,
  taskReminders,
  schedulingSuggestions,
  authIdentities,
  externalOAuthTokens,
  contacts,
  userProfiles,
  userPreferences,
  userConsent
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Legacy user operations (will be phased out)
  createUser(user: InsertUser): Promise<User>;
  createUserWithId(user: InsertUser & { id: string }): Promise<User>;

  // Goals
  createGoal(goal: InsertGoal & { userId: string }): Promise<Goal>;
  getUserGoals(userId: string): Promise<Goal[]>;
  deleteGoal(goalId: string, userId: string): Promise<void>;

  // Tasks
  createTask(task: InsertTask & { userId: string }): Promise<Task>;
  getUserTasks(userId: string): Promise<Task[]>;
  updateTask(taskId: string, updates: Partial<Task>, userId: string): Promise<Task | undefined>;
  completeTask(taskId: string, userId: string): Promise<Task | undefined>;
  deleteTask(taskId: string, userId: string): Promise<void>;

  // Journal Entries
  createJournalEntry(entry: InsertJournalEntry & { userId: string }): Promise<JournalEntry>;
  updateJournalEntry(entryId: string, updates: Partial<JournalEntry>, userId: string): Promise<JournalEntry | undefined>;
  getUserJournalEntry(userId: string, date: string): Promise<JournalEntry | undefined>;
  getUserJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]>;

  // Progress Stats
  createProgressStats(stats: InsertProgressStats & { userId: string }): Promise<ProgressStats>;
  getUserProgressStats(userId: string, date: string): Promise<ProgressStats | undefined>;
  getUserProgressHistory(userId: string, days: number): Promise<ProgressStats[]>;

  // Chat Imports
  createChatImport(chatImport: InsertChatImport & { userId: string }): Promise<ChatImport>;
  getUserChatImports(userId: string): Promise<ChatImport[]>;
  getChatImport(id: string, userId: string): Promise<ChatImport | undefined>;
  updateChatImport(id: string, updates: Partial<ChatImport>, userId: string): Promise<ChatImport | undefined>;

  // Priorities
  createPriority(priority: InsertPriority & { userId: string }): Promise<Priority>;
  getUserPriorities(userId: string): Promise<Priority[]>;
  deletePriority(priorityId: string, userId: string): Promise<void>;

  // Notification Preferences
  getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  createNotificationPreferences(prefs: InsertNotificationPreferences & { userId: string }): Promise<NotificationPreferences>;
  updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined>;

  // Task Reminders
  createTaskReminder(reminder: InsertTaskReminder & { userId: string }): Promise<TaskReminder>;
  getUserTaskReminders(userId: string): Promise<TaskReminder[]>;
  getPendingReminders(): Promise<TaskReminder[]>;
  markReminderSent(reminderId: string): Promise<void>;
  deleteTaskReminder(reminderId: string, userId: string): Promise<void>;

  // Scheduling Suggestions
  createSchedulingSuggestion(suggestion: InsertSchedulingSuggestion & { userId: string }): Promise<SchedulingSuggestion>;
  getUserSchedulingSuggestions(userId: string, date?: string): Promise<SchedulingSuggestion[]>;
  acceptSchedulingSuggestion(suggestionId: string, userId: string): Promise<SchedulingSuggestion | undefined>;
  deleteSchedulingSuggestion(suggestionId: string, userId: string): Promise<void>;

  // Auth Identities
  createAuthIdentity(identity: InsertAuthIdentity & { userId: string }): Promise<AuthIdentity>;
  getAuthIdentity(provider: string, providerUserId: string): Promise<AuthIdentity | undefined>;
  getUserAuthIdentities(userId: string): Promise<AuthIdentity[]>;

  // OAuth Tokens
  upsertOAuthToken(token: InsertExternalOAuthToken & { userId: string }): Promise<ExternalOAuthToken>;
  getOAuthToken(userId: string, provider: string): Promise<ExternalOAuthToken | undefined>;
  deleteOAuthToken(userId: string, provider: string): Promise<void>;

  // User lookup helpers
  getUserByEmail(email: string): Promise<User | undefined>;

  // Contacts
  createContact(contact: InsertContact & { ownerUserId: string }): Promise<Contact>;
  getUserContacts(userId: string, source?: string): Promise<Contact[]>;
  updateContact(contactId: string, ownerUserId: string, updates: Partial<Omit<Contact, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt'>>): Promise<Contact>;
  findContactByExternalId(userId: string, source: string, externalId: string): Promise<Contact | null>;
  updateContactMatches(): Promise<void>; // Batch match contacts to users by email
  deleteUserContacts(userId: string, source?: string): Promise<void>;

  // User Profile
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(userId: string, profile: InsertUserProfile): Promise<UserProfile>;
  deleteUserProfile(userId: string): Promise<void>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences>;
  deleteUserPreferences(userId: string): Promise<void>;

  // User Consent
  getUserConsent(userId: string): Promise<UserConsent | undefined>;
  upsertUserConsent(userId: string, consent: InsertUserConsent): Promise<UserConsent>;
  deleteUserConsent(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Legacy user operations (will be phased out)
  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createUserWithId(userData: InsertUser & { id: string }): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  // Goals
  async createGoal(goal: InsertGoal & { userId: string }): Promise<Goal> {
    const result = await db.insert(goals).values(goal).returning();
    return result[0];
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  }

  // Tasks
  async createTask(task: InsertTask & { userId: string }): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  }

  async updateTask(taskId: string, updates: Partial<Task>, userId: string): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result[0];
  }

  async completeTask(taskId: string, userId: string): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({ completed: true, completedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  // Journal Entries
  async createJournalEntry(entry: InsertJournalEntry & { userId: string }): Promise<JournalEntry> {
    const result = await db.insert(journalEntries).values(entry).returning();
    return result[0];
  }

  async updateJournalEntry(entryId: string, updates: Partial<JournalEntry>, userId: string): Promise<JournalEntry | undefined> {
    const result = await db.update(journalEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)))
      .returning();
    return result[0];
  }

  async getUserJournalEntry(userId: string, date: string): Promise<JournalEntry | undefined> {
    const result = await db.select().from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
      .limit(1);
    return result[0];
  }

  async getUserJournalEntries(userId: string, limit = 30): Promise<JournalEntry[]> {
    return await db.select().from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.date))
      .limit(limit);
  }

  // Progress Stats
  async createProgressStats(stats: InsertProgressStats & { userId: string }): Promise<ProgressStats> {
    const result = await db.insert(progressStats).values(stats).returning();
    return result[0];
  }

  async getUserProgressStats(userId: string, date: string): Promise<ProgressStats | undefined> {
    const result = await db.select().from(progressStats)
      .where(and(eq(progressStats.userId, userId), eq(progressStats.date, date)))
      .limit(1);
    return result[0];
  }

  async getUserProgressHistory(userId: string, days: number): Promise<ProgressStats[]> {
    return await db.select().from(progressStats)
      .where(eq(progressStats.userId, userId))
      .orderBy(desc(progressStats.date))
      .limit(days);
  }

  // Chat Imports
  async createChatImport(chatImport: InsertChatImport & { userId: string }): Promise<ChatImport> {
    const result = await db.insert(chatImports).values(chatImport).returning();
    return result[0];
  }

  async getUserChatImports(userId: string): Promise<ChatImport[]> {
    return await db.select().from(chatImports)
      .where(eq(chatImports.userId, userId))
      .orderBy(desc(chatImports.createdAt));
  }

  async getChatImport(id: string, userId: string): Promise<ChatImport | undefined> {
    const result = await db.select().from(chatImports)
      .where(and(eq(chatImports.id, id), eq(chatImports.userId, userId)))
      .limit(1);
    return result[0];
  }

  async updateChatImport(id: string, updates: Partial<ChatImport>, userId: string): Promise<ChatImport | undefined> {
    const result = await db.update(chatImports)
      .set(updates)
      .where(and(eq(chatImports.id, id), eq(chatImports.userId, userId)))
      .returning();
    return result[0];
  }

  // Priorities
  async createPriority(priority: InsertPriority & { userId: string }): Promise<Priority> {
    const result = await db.insert(priorities).values(priority).returning();
    return result[0];
  }

  async getUserPriorities(userId: string): Promise<Priority[]> {
    return await db.select().from(priorities)
      .where(eq(priorities.userId, userId))
      .orderBy(desc(priorities.createdAt));
  }

  async deletePriority(priorityId: string, userId: string): Promise<void> {
    await db.delete(priorities).where(and(eq(priorities.id, priorityId), eq(priorities.userId, userId)));
  }

  // Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const result = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return result[0];
  }

  async createNotificationPreferences(prefs: InsertNotificationPreferences & { userId: string }): Promise<NotificationPreferences> {
    const result = await db.insert(notificationPreferences).values(prefs).returning();
    return result[0];
  }

  async updateNotificationPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<NotificationPreferences | undefined> {
    const result = await db.update(notificationPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return result[0];
  }

  // Task Reminders
  async createTaskReminder(reminder: InsertTaskReminder & { userId: string }): Promise<TaskReminder> {
    const result = await db.insert(taskReminders).values(reminder).returning();
    return result[0];
  }

  async getUserTaskReminders(userId: string): Promise<TaskReminder[]> {
    return await db.select().from(taskReminders)
      .where(eq(taskReminders.userId, userId))
      .orderBy(desc(taskReminders.scheduledAt));
  }

  async getPendingReminders(): Promise<TaskReminder[]> {
    const now = new Date();
    return await db.select().from(taskReminders)
      .where(and(
        eq(taskReminders.isSent, false)
        // We'll add proper time filtering later when we implement the reminder processor
      ))
      .orderBy(taskReminders.scheduledAt);
  }

  async markReminderSent(reminderId: string): Promise<void> {
    await db.update(taskReminders)
      .set({ isSent: true, sentAt: new Date() })
      .where(eq(taskReminders.id, reminderId));
  }

  async deleteTaskReminder(reminderId: string, userId: string): Promise<void> {
    await db.delete(taskReminders)
      .where(and(eq(taskReminders.id, reminderId), eq(taskReminders.userId, userId)));
  }

  // Scheduling Suggestions
  async createSchedulingSuggestion(suggestion: InsertSchedulingSuggestion & { userId: string }): Promise<SchedulingSuggestion> {
    const result = await db.insert(schedulingSuggestions).values([suggestion]).returning();
    return result[0];
  }

  async getUserSchedulingSuggestions(userId: string, date?: string): Promise<SchedulingSuggestion[]> {
    if (date) {
      return await db.select().from(schedulingSuggestions)
        .where(and(eq(schedulingSuggestions.userId, userId), eq(schedulingSuggestions.targetDate, date)))
        .orderBy(desc(schedulingSuggestions.score));
    }
    
    return await db.select().from(schedulingSuggestions)
      .where(eq(schedulingSuggestions.userId, userId))
      .orderBy(desc(schedulingSuggestions.createdAt));
  }

  async acceptSchedulingSuggestion(suggestionId: string, userId: string): Promise<SchedulingSuggestion | undefined> {
    const result = await db.update(schedulingSuggestions)
      .set({ accepted: true, acceptedAt: new Date() })
      .where(and(eq(schedulingSuggestions.id, suggestionId), eq(schedulingSuggestions.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteSchedulingSuggestion(suggestionId: string, userId: string): Promise<void> {
    await db.delete(schedulingSuggestions)
      .where(and(eq(schedulingSuggestions.id, suggestionId), eq(schedulingSuggestions.userId, userId)));
  }

  // Auth Identities
  async createAuthIdentity(identity: InsertAuthIdentity & { userId: string }): Promise<AuthIdentity> {
    const [result] = await db.insert(authIdentities).values(identity).returning();
    return result;
  }

  async getAuthIdentity(provider: string, providerUserId: string): Promise<AuthIdentity | undefined> {
    const [identity] = await db.select().from(authIdentities)
      .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerUserId, providerUserId)));
    return identity;
  }

  async getUserAuthIdentities(userId: string): Promise<AuthIdentity[]> {
    return await db.select().from(authIdentities).where(eq(authIdentities.userId, userId));
  }

  // OAuth Tokens
  async upsertOAuthToken(token: InsertExternalOAuthToken & { userId: string }): Promise<ExternalOAuthToken> {
    const [result] = await db
      .insert(externalOAuthTokens)
      .values(token)
      .onConflictDoUpdate({
        target: [externalOAuthTokens.userId, externalOAuthTokens.provider],
        set: {
          ...token,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getOAuthToken(userId: string, provider: string): Promise<ExternalOAuthToken | undefined> {
    const [token] = await db.select().from(externalOAuthTokens)
      .where(and(eq(externalOAuthTokens.userId, userId), eq(externalOAuthTokens.provider, provider)));
    return token;
  }

  async deleteOAuthToken(userId: string, provider: string): Promise<void> {
    await db.delete(externalOAuthTokens).where(
      and(eq(externalOAuthTokens.userId, userId), eq(externalOAuthTokens.provider, provider))
    );
  }

  // Contacts
  async createContact(contact: InsertContact & { ownerUserId: string }): Promise<Contact> {
    const [result] = await db.insert(contacts).values([contact]).returning();
    return result;
  }

  async getUserContacts(userId: string, source?: string): Promise<Contact[]> {
    const conditions = [eq(contacts.ownerUserId, userId)];
    if (source) {
      conditions.push(eq(contacts.source, source));
    }
    return await db.select().from(contacts).where(and(...conditions)).orderBy(contacts.name);
  }

  async updateContact(contactId: string, ownerUserId: string, updates: Partial<Omit<Contact, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt'>>): Promise<Contact> {
    const [result] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.ownerUserId, ownerUserId)))
      .returning();
    return result;
  }

  async findContactByExternalId(userId: string, source: string, externalId: string): Promise<Contact | null> {
    const results = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.ownerUserId, userId),
        eq(contacts.source, source),
        eq(contacts.externalId, externalId)
      ))
      .limit(1);
    
    return results[0] || null;
  }

  async updateContactMatches(): Promise<void> {
    // Match contacts to existing users by email
    // This is a batch operation to find JournalMate users among imported contacts
    const contactsWithEmails = await db.select().from(contacts)
      .where(isNull(contacts.matchedUserId));
    
    for (const contact of contactsWithEmails) {
      if (contact.emails && contact.emails.length > 0) {
        for (const email of contact.emails) {
          const [user] = await db.select().from(users).where(eq(users.email, email));
          if (user) {
            await db.update(contacts)
              .set({ matchedUserId: user.id, updatedAt: new Date() })
              .where(eq(contacts.id, contact.id));
            break; // Found a match, stop checking other emails
          }
        }
      }
    }
  }

  async deleteUserContacts(userId: string, source?: string): Promise<void> {
    const conditions = [eq(contacts.ownerUserId, userId)];
    if (source) {
      conditions.push(eq(contacts.source, source));
    }
    await db.delete(contacts).where(and(...conditions));
  }

  // User lookup helpers
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // User Profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(userId: string, profile: InsertUserProfile): Promise<UserProfile> {
    const existingProfile = await this.getUserProfile(userId);
    
    if (existingProfile) {
      const [updated] = await db.update(userProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfiles)
        .values({ ...profile, userId })
        .returning();
      return created;
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  }

  // User Preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(userId: string, preferences: InsertUserPreferences): Promise<UserPreferences> {
    const existingPreferences = await this.getUserPreferences(userId);
    
    if (existingPreferences) {
      const [updated] = await db.update(userPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences)
        .values({ ...preferences, userId })
        .returning();
      return created;
    }
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
  }

  // User Consent operations
  async getUserConsent(userId: string): Promise<UserConsent | undefined> {
    const [consent] = await db.select().from(userConsent).where(eq(userConsent.userId, userId));
    return consent;
  }

  async upsertUserConsent(userId: string, consent: InsertUserConsent): Promise<UserConsent> {
    const existingConsent = await this.getUserConsent(userId);
    
    if (existingConsent) {
      const [updated] = await db.update(userConsent)
        .set({ ...consent, lastUpdated: new Date() })
        .where(eq(userConsent.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userConsent)
        .values({ ...consent, userId })
        .returning();
      return created;
    }
  }

  async deleteUserConsent(userId: string): Promise<void> {
    await db.delete(userConsent).where(eq(userConsent.userId, userId));
  }
}

export const storage = new DatabaseStorage();
