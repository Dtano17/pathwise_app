import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";
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
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type TaskReminder,
  type InsertTaskReminder,
  type SchedulingSuggestion,
  type InsertSchedulingSuggestion,
  users,
  goals,
  tasks,
  journalEntries,
  progressStats,
  chatImports,
  notificationPreferences,
  taskReminders,
  schedulingSuggestions
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
    const result = await db.insert(schedulingSuggestions).values(suggestion).returning();
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
}

export const storage = new DatabaseStorage();
