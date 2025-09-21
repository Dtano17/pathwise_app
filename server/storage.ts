import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";
import { 
  type User, 
  type InsertUser, 
  type Goal,
  type InsertGoal,
  type Task,
  type InsertTask,
  type JournalEntry,
  type InsertJournalEntry,
  type ProgressStats,
  type InsertProgressStats,
  users,
  goals,
  tasks,
  journalEntries,
  progressStats
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
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
    const result = await db.insert(journalEntries).values([entry]).returning();
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
    const result = await db.insert(progressStats).values([stats]).returning();
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
}

export const storage = new DatabaseStorage();
