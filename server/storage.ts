import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, isNull, or, lte, inArray } from "drizzle-orm";
import crypto from "crypto";
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
  type ContactShare,
  type InsertContactShare,
  type Activity,
  type InsertActivity,
  type ActivityTask,
  type InsertActivityTask,
  type ActivityWithProgress,
  type ActivityPermissionRequest,
  type InsertActivityPermissionRequest,
  type LifestylePlannerSession,
  type InsertLifestylePlannerSession,
  type UserProfile,
  type InsertUserProfile,
  type UserPreferences,
  type InsertUserPreferences,
  users,
  goals,
  tasks,
  journalEntries,
  progressStats,
  chatImports,
  priorities,
  notificationPreferences,
  taskReminders,
  schedulingSuggestions,
  authIdentities,
  externalOAuthTokens,
  contacts,
  contactShares,
  activities,
  activityTasks,
  activityPermissionRequests,
  lifestylePlannerSessions,
  userProfiles,
  userPreferences
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Legacy user operations (will be phased out)
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
  archiveTask(taskId: string, userId: string): Promise<Task | undefined>;

  // Activities
  createActivity(activity: InsertActivity & { userId: string }): Promise<Activity>;
  getUserActivities(userId: string): Promise<ActivityWithProgress[]>;
  getActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  updateActivity(activityId: string, updates: Partial<Activity>, userId: string): Promise<Activity | undefined>;
  deleteActivity(activityId: string, userId: string): Promise<void>;
  archiveActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  getPublicActivities(limit?: number): Promise<Activity[]>;
  generateShareableLink(activityId: string): Promise<string>;
  
  // Activity Tasks
  addTaskToActivity(activityId: string, taskId: string, order?: number): Promise<ActivityTask>;
  getActivityTasks(activityId: string, userId: string): Promise<Task[]>;
  removeTaskFromActivity(activityId: string, taskId: string): Promise<void>;
  updateActivityTaskOrder(activityId: string, taskId: string, order: number): Promise<void>;

  // Activity Permission Requests
  createPermissionRequest(request: InsertActivityPermissionRequest): Promise<ActivityPermissionRequest>;
  getActivityPermissionRequests(activityId: string): Promise<ActivityPermissionRequest[]>;
  getUserPermissionRequests(userId: string): Promise<ActivityPermissionRequest[]>;
  getOwnerPermissionRequests(ownerId: string): Promise<ActivityPermissionRequest[]>;
  updatePermissionRequest(requestId: string, status: string, ownerId: string): Promise<ActivityPermissionRequest | undefined>;

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
  
  // User Context for Personalized Planning
  getUserContext(userId: string): Promise<{
    user: User;
    priorities: Priority[];
    wellnessPriorities: {
      sleep: boolean;
      nap: boolean;
      meditation: boolean;
      reflection: boolean;
    };
    sleepSchedule?: any;
    timezone?: string;
    schedulingSuggestions: SchedulingSuggestion[];
  }>;

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

  // Lifestyle Planner Sessions
  createLifestylePlannerSession(session: InsertLifestylePlannerSession & { userId: string }): Promise<LifestylePlannerSession>;
  getLifestylePlannerSession(sessionId: string, userId: string): Promise<LifestylePlannerSession | undefined>;
  updateLifestylePlannerSession(sessionId: string, updates: Partial<LifestylePlannerSession>, userId: string): Promise<LifestylePlannerSession | undefined>;
  getUserLifestylePlannerSessions(userId: string, limit?: number): Promise<LifestylePlannerSession[]>;
  getActiveLifestylePlannerSession(userId: string): Promise<LifestylePlannerSession | undefined>;
  deleteLifestylePlannerSession(sessionId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [result] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result;
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
  async createUser(userData: any): Promise<User> {
    // Handle both legacy and new signatures
    if (typeof userData === 'object' && !userData.id) {
      // New signature: create without ID
      const result = await db.insert(users).values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    } else {
      // Legacy signature: create with all fields
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    }
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
    const now = new Date();
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        or(eq(tasks.archived, false), isNull(tasks.archived)),
        or(eq(tasks.completed, false), isNull(tasks.completed)),
        or(eq(tasks.skipped, false), isNull(tasks.skipped)),
        or(
          isNull(tasks.snoozeUntil),
          lte(tasks.snoozeUntil, now)
        )
      ))
      .orderBy(desc(tasks.createdAt));
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

  async archiveTask(taskId: string, userId: string): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({ archived: true })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return result[0];
  }

  // Activities implementation
  async createActivity(activity: InsertActivity & { userId: string }): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  async getUserActivities(userId: string): Promise<ActivityWithProgress[]> {
    // First get all activities (exclude archived)
    const userActivities = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        or(eq(activities.archived, false), isNull(activities.archived))
      ))
      .orderBy(desc(activities.createdAt));

    // For each activity, calculate progress from associated tasks
    const activitiesWithProgress = await Promise.all(
      userActivities.map(async (activity) => {
        // Get all tasks associated with this activity
        const activityTasksResult = await db
          .select({
            taskId: activityTasks.taskId,
            completed: tasks.completed,
          })
          .from(activityTasks)
          .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
          .where(eq(activityTasks.activityId, activity.id));

        const totalTasks = activityTasksResult.length;
        const completedTasks = activityTasksResult.filter(t => t.completed).length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...activity,
          totalTasks,
          completedTasks,
          progressPercent,
        };
      })
    );

    return activitiesWithProgress;
  }

  async getActivity(activityId: string, userId: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
    return result;
  }

  async updateActivity(activityId: string, updates: Partial<Activity>, userId: string): Promise<Activity | undefined> {
    const result = await db.update(activities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteActivity(activityId: string, userId: string): Promise<void> {
    // First get all task IDs associated with this activity
    const activityTasksToDelete = await db
      .select({ taskId: activityTasks.taskId })
      .from(activityTasks)
      .where(eq(activityTasks.activityId, activityId));

    const taskIds = activityTasksToDelete.map(at => at.taskId);

    // Delete the activity (this will cascade delete activityTasks join table entries)
    await db.delete(activities).where(and(eq(activities.id, activityId), eq(activities.userId, userId)));

    // Delete all associated tasks
    if (taskIds.length > 0) {
      await db.delete(tasks).where(inArray(tasks.id, taskIds));
    }
  }

  async archiveActivity(activityId: string, userId: string): Promise<Activity | undefined> {
    const result = await db.update(activities)
      .set({ archived: true, updatedAt: new Date() })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .returning();
    return result[0];
  }

  async getPublicActivities(limit: number = 20): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.isPublic, true))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async generateShareableLink(activityId: string, userId: string): Promise<string | null> {
    const shareToken = crypto.randomUUID();
    // Store just the token in the database, with ownership validation
    const result = await db.update(activities)
      .set({ shareableLink: shareToken })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      return null; // Activity not found or user doesn't own it
    }
    
    return shareToken;
  }

  async getActivityByShareToken(shareToken: string): Promise<ActivityWithProgress | null> {
    // Look up directly by the token stored in shareableLink
    const result = await db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        category: activities.category,
        status: activities.status,
        priority: activities.priority,
        startDate: activities.startDate,
        endDate: activities.endDate,
        userId: activities.userId,
        goalId: activities.goalId,
        isPublic: activities.isPublic,
        shareableLink: activities.shareableLink,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
      })
      .from(activities)
      .where(eq(activities.shareableLink, shareToken))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const activity = result[0];

    // Calculate progress like we do in getUserActivities
    const tasksQuery = await db
      .select({
        totalTasks: sql<number>`COUNT(*)::int`.as('totalTasks'),
        completedTasks: sql<number>`SUM(CASE WHEN ${tasks.completed} = true THEN 1 ELSE 0 END)::int`.as('completedTasks'),
      })
      .from(activityTasks)
      .leftJoin(tasks, eq(activityTasks.taskId, tasks.id))
      .where(eq(activityTasks.activityId, activity.id))
      .limit(1);

    const { totalTasks, completedTasks } = tasksQuery[0] || { totalTasks: 0, completedTasks: 0 };
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...activity,
      totalTasks,
      completedTasks,
      progressPercentage,
    };
  }

  // Activity Tasks implementation
  async addTaskToActivity(activityId: string, taskId: string, order: number = 0): Promise<ActivityTask> {
    const result = await db.insert(activityTasks).values({
      activityId,
      taskId,
      order,
    }).returning();
    return result[0];
  }

  async getActivityTasks(activityId: string, userId: string): Promise<Task[]> {
    const result = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        goalId: tasks.goalId,
        title: tasks.title,
        description: tasks.description,
        category: tasks.category,
        priority: tasks.priority,
        completed: tasks.completed,
        completedAt: tasks.completedAt,
        dueDate: tasks.dueDate,
        timeEstimate: tasks.timeEstimate,
        context: tasks.context,
        createdAt: tasks.createdAt,
      })
      .from(activityTasks)
      .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
      .where(and(eq(activityTasks.activityId, activityId), eq(tasks.userId, userId)))
      .orderBy(activityTasks.order, tasks.createdAt);
    return result;
  }

  async removeTaskFromActivity(activityId: string, taskId: string): Promise<void> {
    await db.delete(activityTasks)
      .where(and(eq(activityTasks.activityId, activityId), eq(activityTasks.taskId, taskId)));
  }


  async updateActivityTaskOrder(activityId: string, taskId: string, order: number): Promise<void> {
    await db.update(activityTasks)
      .set({ order })
      .where(and(eq(activityTasks.activityId, activityId), eq(activityTasks.taskId, taskId)));
  }

  // Activity Permission Requests
  async createPermissionRequest(request: InsertActivityPermissionRequest): Promise<ActivityPermissionRequest> {
    const result = await db.insert(activityPermissionRequests).values(request).returning();
    return result[0];
  }

  async getActivityPermissionRequests(activityId: string): Promise<ActivityPermissionRequest[]> {
    return await db.select().from(activityPermissionRequests)
      .where(eq(activityPermissionRequests.activityId, activityId))
      .orderBy(desc(activityPermissionRequests.requestedAt));
  }

  async getUserPermissionRequests(userId: string): Promise<ActivityPermissionRequest[]> {
    return await db.select().from(activityPermissionRequests)
      .where(eq(activityPermissionRequests.requestedBy, userId))
      .orderBy(desc(activityPermissionRequests.requestedAt));
  }

  async getOwnerPermissionRequests(ownerId: string): Promise<ActivityPermissionRequest[]> {
    return await db.select().from(activityPermissionRequests)
      .where(eq(activityPermissionRequests.ownerId, ownerId))
      .orderBy(desc(activityPermissionRequests.requestedAt));
  }

  async updatePermissionRequest(requestId: string, status: string, ownerId: string): Promise<ActivityPermissionRequest | undefined> {
    const result = await db.update(activityPermissionRequests)
      .set({ status, respondedAt: new Date() })
      .where(and(eq(activityPermissionRequests.id, requestId), eq(activityPermissionRequests.ownerId, ownerId)))
      .returning();
    return result[0];
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
    const [result] = await db
      .insert(authIdentities)
      .values(identity)
      .onConflictDoUpdate({
        target: [authIdentities.provider, authIdentities.providerUserId],
        set: {
          ...identity,
          updatedAt: new Date(),
        },
      })
      .returning();
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

  // Get comprehensive user context for personalized planning
  async getUserContext(userId: string) {
    const [user, priorities, schedulingSuggestions] = await Promise.all([
      this.getUserById(userId),
      this.getUserPriorities(userId),
      this.getUserSchedulingSuggestions(userId)
    ]);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Analyze wellness priorities from user data
    const wellnessPriorities = {
      sleep: priorities.some(p => p.category.toLowerCase() === 'sleep' && p.importance === 'high') || 
             (user.sleepSchedule && Object.keys(user.sleepSchedule).length > 0),
      nap: priorities.some(p => p.category.toLowerCase().includes('nap') && p.importance === 'high'),
      meditation: priorities.some(p => p.category.toLowerCase() === 'meditation' && p.importance === 'high'),
      reflection: priorities.some(p => p.category.toLowerCase().includes('reflection') && p.importance === 'high') ||
                 priorities.some(p => p.category.toLowerCase().includes('journal') && p.importance === 'high')
    };

    return {
      user,
      priorities,
      wellnessPriorities,
      sleepSchedule: user.sleepSchedule,
      timezone: user.timezone || 'UTC',
      schedulingSuggestions
    };
  }

  // Lifestyle Planner Sessions implementation
  async createLifestylePlannerSession(session: InsertLifestylePlannerSession & { userId: string }): Promise<LifestylePlannerSession> {
    const result = await db.insert(lifestylePlannerSessions).values(session).returning();
    return result[0];
  }

  async getLifestylePlannerSession(sessionId: string, userId: string): Promise<LifestylePlannerSession | undefined> {
    const [result] = await db.select().from(lifestylePlannerSessions)
      .where(and(eq(lifestylePlannerSessions.id, sessionId), eq(lifestylePlannerSessions.userId, userId)));
    return result;
  }

  async updateLifestylePlannerSession(sessionId: string, updates: Partial<LifestylePlannerSession>, userId: string): Promise<LifestylePlannerSession | undefined> {
    const result = await db.update(lifestylePlannerSessions)
      .set({
        ...updates,
        updatedAt: new Date(),
        lastInteractionAt: new Date(),
      })
      .where(and(eq(lifestylePlannerSessions.id, sessionId), eq(lifestylePlannerSessions.userId, userId)))
      .returning();
    return result[0];
  }

  async getUserLifestylePlannerSessions(userId: string, limit: number = 20): Promise<LifestylePlannerSession[]> {
    return await db.select().from(lifestylePlannerSessions)
      .where(eq(lifestylePlannerSessions.userId, userId))
      .orderBy(desc(lifestylePlannerSessions.lastInteractionAt))
      .limit(limit);
  }

  async getActiveLifestylePlannerSession(userId: string): Promise<LifestylePlannerSession | undefined> {
    const [result] = await db.select().from(lifestylePlannerSessions)
      .where(and(
        eq(lifestylePlannerSessions.userId, userId),
        eq(lifestylePlannerSessions.isComplete, false)
      ))
      .orderBy(desc(lifestylePlannerSessions.lastInteractionAt))
      .limit(1);
    return result;
  }

  async deleteLifestylePlannerSession(sessionId: string, userId: string): Promise<void> {
    await db.delete(lifestylePlannerSessions)
      .where(and(eq(lifestylePlannerSessions.id, sessionId), eq(lifestylePlannerSessions.userId, userId)));
  }

  // NEW METHODS FOR SIDEBAR FEATURES

  async getActivitiesWithProgress(userId: string, filters: { status?: string; category?: string; includeArchived?: boolean }) {
    try {
      const conditions = [eq(activities.userId, userId)];

      if (filters.status) {
        conditions.push(eq(activities.status, filters.status));
      }

      if (filters.category) {
        conditions.push(eq(activities.category, filters.category));
      }

      if (!filters.includeArchived) {
        conditions.push(eq(activities.archived, false));
      }

      const activitiesList = await db.select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(desc(activities.createdAt));

      // Get task counts for each activity
      const activitiesWithProgress = await Promise.all(
        activitiesList.map(async (activity) => {
          const activityTasksList = await db.select({
            task: tasks,
            activityTask: activityTasks
          })
            .from(activityTasks)
            .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
            .where(eq(activityTasks.activityId, activity.id));

          const totalTasks = activityTasksList.length;
          const completedTasks = activityTasksList.filter(at => at.task.completed).length;
          const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
            ...activity,
            completedTasks,
            totalTasks,
            progressPercentage
          };
        })
      );

      return activitiesWithProgress;
    } catch (error) {
      console.error('[STORAGE] Error getting activities with progress:', error);
      return [];
    }
  }

  async getProgressStats(userId: string, days: number) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all activities for the user
      const allActivities = await db.select()
        .from(activities)
        .where(eq(activities.userId, userId));

      const completedActivities = allActivities.filter(a => a.status === 'completed');
      const activeActivities = allActivities.filter(a => a.status === 'active');

      const completionRate = allActivities.length > 0
        ? Math.round((completedActivities.length / allActivities.length) * 100)
        : 0;

      // Get all tasks for category stats
      const allTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.userId, userId));

      const completedTasks = allTasks.filter(t => t.completed);
      
      // Category stats based on tasks
      const categoryMap = new Map<string, { completed: number; total: number }>();
      allTasks.forEach(task => {
        const cat = task.category || 'uncategorized';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { completed: 0, total: 0 });
        }
        const stats = categoryMap.get(cat)!;
        stats.total++;
        if (task.completed) {
          stats.completed++;
        }
      });

      const categoryStats = Array.from(categoryMap.entries()).map(([name, stats]) => ({
        name,
        completed: stats.completed,
        total: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }));

      // Timeline data (last N days)
      const timelineData: Array<{ date: string; completed: number; created: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const completed = completedActivities.filter(a =>
          a.completedAt && a.completedAt.toISOString().split('T')[0] === dateStr
        ).length;

        const created = allActivities.filter(a =>
          a.createdAt.toISOString().split('T')[0] === dateStr
        ).length;

        timelineData.push({ date: dateStr, completed, created });
      }

      // Calculate streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        const hasActivity = completedTasks.some(t =>
          t.completedAt && t.completedAt.toISOString().split('T')[0] === dateStr
        );

        if (hasActivity) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }

      // Milestones
      const milestones: Array<{
        id: string;
        title: string;
        description: string;
        achievedAt: string;
        type: string;
      }> = [];

      if (completedActivities.length >= 10) {
        milestones.push({
          id: 'milestone-10-activities',
          title: '10 Activities Completed!',
          description: `You've completed ${completedActivities.length} activities`,
          achievedAt: new Date().toISOString(),
          type: 'completion'
        });
      }

      if (currentStreak >= 7) {
        milestones.push({
          id: 'milestone-7-day-streak',
          title: '7-Day Streak!',
          description: `You've been active for ${currentStreak} days in a row`,
          achievedAt: new Date().toISOString(),
          type: 'streak'
        });
      }

      // Top rated activities
      const topRatedActivities = completedActivities
        .filter(a => a.rating && a.rating >= 4)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          title: a.title,
          rating: a.rating || 0,
          category: a.category || 'uncategorized'
        }));

      const averageRating = completedActivities.filter(a => a.rating).length > 0
        ? completedActivities.reduce((sum, a) => sum + (a.rating || 0), 0) / completedActivities.filter(a => a.rating).length
        : 0;

      return {
        totalActivities: allActivities.length,
        completedActivities: completedActivities.length,
        activeActivities: activeActivities.length,
        completionRate,
        currentStreak,
        longestStreak: currentStreak,
        categoryStats,
        timelineData,
        milestones,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        taskCompletionRate: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0,
        averageRating,
        topRatedActivities
      };
    } catch (error) {
      console.error('[STORAGE] Error getting progress stats:', error);
      throw error;
    }
  }

  async getActivitiesByChatImportId(importId: string, userId: string) {
    try {
      // This would require adding a chatImportId field to activities table
      // For now, return empty array as placeholder
      // TODO: Add relationship between chat imports and activities
      return [];
    } catch (error) {
      console.error('[STORAGE] Error getting activities by chat import:', error);
      return [];
    }
  }

  async createContactShare(shareData: {
    contactId: string;
    sharedBy: string;
    shareType: string;
    activityId?: string;
    groupId?: string;
    invitationMessage?: string;
    status: string;
  }) {
    try {
      const [share] = await db.insert(contactShares).values({
        ...shareData,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }).returning();

      return share;
    } catch (error) {
      console.error('[STORAGE] Error creating contact share:', error);
      throw error;
    }
  }

  async getContactsWithShareStatus(userId: string) {
    try {
      const userContacts = await db.select()
        .from(contacts)
        .where(eq(contacts.ownerUserId, userId));

      const contactsWithStatus = await Promise.all(
        userContacts.map(async (contact) => {
          const shares = await db.select()
            .from(contactShares)
            .where(and(
              eq(contactShares.contactId, contact.id),
              eq(contactShares.sharedBy, userId)
            ))
            .orderBy(desc(contactShares.sharedAt));

          return {
            ...contact,
            shares: shares || [],
            hasActiveShare: shares.some(s => s.status === 'accepted'),
            pendingInvitations: shares.filter(s => s.status === 'pending').length
          };
        })
      );

      return contactsWithStatus;
    } catch (error) {
      console.error('[STORAGE] Error getting contacts with share status:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
