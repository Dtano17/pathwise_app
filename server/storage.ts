import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, isNull, or, lte, inArray, sql } from "drizzle-orm";
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
  type ActivityFeedback,
  type InsertActivityFeedback,
  type TaskFeedback,
  type InsertTaskFeedback,
  type Group,
  type InsertGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type GroupActivity,
  type InsertGroupActivity,
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
  userPreferences,
  activityFeedback,
  taskFeedback,
  groups,
  groupMemberships,
  groupActivities
} from "@shared/schema";

const sqlClient = neon(process.env.DATABASE_URL!);
export const db = drizzle(sqlClient);

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
  getUserArchivedActivities(userId: string): Promise<ActivityWithProgress[]>;
  getActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  getActivityByShareToken(shareToken: string): Promise<Activity | undefined>;
  getExistingCopyByShareToken(userId: string, shareToken: string): Promise<Activity | undefined>;
  updateActivity(activityId: string, updates: Partial<Activity>, userId: string): Promise<Activity | undefined>;
  deleteActivity(activityId: string, userId: string): Promise<void>;
  archiveActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  getPublicActivities(limit?: number): Promise<Activity[]>;
  generateShareableLink(activityId: string, userId: string): Promise<string | null>;
  
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

  // Activity Feedback (Like/Unlike)
  upsertActivityFeedback(activityId: string, userId: string, feedbackType: 'like' | 'dislike'): Promise<ActivityFeedback>;
  getUserActivityFeedback(activityId: string, userId: string): Promise<ActivityFeedback | undefined>;
  deleteActivityFeedback(activityId: string, userId: string): Promise<void>;
  getActivityFeedbackStats(activityId: string): Promise<{ likes: number; dislikes: number }>;

  // Task Feedback (Like/Unlike)
  upsertTaskFeedback(taskId: string, userId: string, feedbackType: 'like' | 'dislike'): Promise<TaskFeedback>;
  getUserTaskFeedback(taskId: string, userId: string): Promise<TaskFeedback | undefined>;
  deleteTaskFeedback(taskId: string, userId: string): Promise<void>;
  getTaskFeedbackStats(taskId: string): Promise<{ likes: number; dislikes: number }>;

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
  
  // Personal Journal with Media
  addPersonalJournalEntry(userId: string, category: string, entry: {
    text: string;
    media?: Array<{ url: string; type: 'image' | 'video'; thumbnail?: string }>;
    keywords?: string[];
    aiConfidence?: number;
    activityId?: string;
    linkedActivityTitle?: string;
    mood?: 'great' | 'good' | 'okay' | 'poor';
  }): Promise<UserPreferences>;
  getPersonalJournalEntries(userId: string, category?: string): Promise<UserPreferences | undefined>;
  updatePersonalJournalEntry(userId: string, category: string, entryId: string, updates: Partial<{
    text: string;
    media?: Array<{ url: string; type: 'image' | 'video'; thumbnail?: string }>;
  }>): Promise<UserPreferences>;
  deletePersonalJournalEntry(userId: string, category: string, entryId: string): Promise<UserPreferences>;

  // Lifestyle Planner Sessions
  createLifestylePlannerSession(session: InsertLifestylePlannerSession & { userId: string }): Promise<LifestylePlannerSession>;
  getLifestylePlannerSession(sessionId: string, userId: string): Promise<LifestylePlannerSession | undefined>;
  updateLifestylePlannerSession(sessionId: string, updates: Partial<LifestylePlannerSession>, userId: string): Promise<LifestylePlannerSession | undefined>;
  getUserLifestylePlannerSessions(userId: string, limit?: number): Promise<LifestylePlannerSession[]>;
  getActiveLifestylePlannerSession(userId: string): Promise<LifestylePlannerSession | undefined>;
  deleteLifestylePlannerSession(sessionId: string, userId: string): Promise<void>;

  // Community Plans
  getCommunityPlans(category?: string, search?: string, limit?: number): Promise<Activity[]>;
  seedCommunityPlans(force?: boolean): Promise<void>;
  incrementActivityViews(activityId: string): Promise<void>;

  // Groups
  createGroup(group: InsertGroup & { createdBy: string }): Promise<Group>;
  getGroup(groupId: string): Promise<Group | undefined>;
  createGroupMembership(membership: InsertGroupMembership & { userId: string }): Promise<GroupMembership>;
  createGroupActivity(groupActivity: InsertGroupActivity): Promise<GroupActivity>;
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

  async updateUserField(id: string, field: string, value: any): Promise<User | undefined> {
    const updates: any = { [field]: value, updatedAt: new Date() };
    const [result] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
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
    // First get all activities (exclude archived and isArchived)
    const userActivities = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        or(eq(activities.archived, false), isNull(activities.archived)),
        or(eq(activities.isArchived, false), isNull(activities.isArchived))
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

  async getUserArchivedActivities(userId: string): Promise<ActivityWithProgress[]> {
    // Get all archived activities (isArchived = true)
    const userActivities = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        eq(activities.isArchived, true)
      ))
      .orderBy(desc(activities.updatedAt)); // Show most recently archived first

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

  async getActivityByShareToken(shareToken: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(and(eq(activities.shareToken, shareToken), eq(activities.isPublic, true)));
    return result;
  }

  async getExistingCopyByShareToken(userId: string, shareToken: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        eq(activities.copiedFromShareToken, shareToken),
        eq(activities.isArchived, false)
      ))
      .orderBy(desc(activities.createdAt))
      .limit(1);
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
    const shareToken = crypto.randomUUID().replace(/-/g, '');
    // Store the token and mark as public
    const result = await db.update(activities)
      .set({ 
        shareToken,
        isPublic: true,
        updatedAt: new Date()
      })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .returning();
    
    if (result.length === 0) {
      return null; // Activity not found or user doesn't own it
    }
    
    return shareToken;
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

  // Activity Feedback Methods
  async upsertActivityFeedback(activityId: string, userId: string, feedbackType: 'like' | 'dislike'): Promise<ActivityFeedback> {
    // Try to update first
    const existing = await db.select().from(activityFeedback)
      .where(and(eq(activityFeedback.activityId, activityId), eq(activityFeedback.userId, userId)));
    
    if (existing.length > 0) {
      // Update existing feedback
      const result = await db.update(activityFeedback)
        .set({ feedbackType, updatedAt: new Date() })
        .where(and(eq(activityFeedback.activityId, activityId), eq(activityFeedback.userId, userId)))
        .returning();
      return result[0];
    } else {
      // Create new feedback
      const result = await db.insert(activityFeedback)
        .values({ activityId, userId, feedbackType })
        .returning();
      return result[0];
    }
  }

  async getUserActivityFeedback(activityId: string, userId: string): Promise<ActivityFeedback | undefined> {
    const result = await db.select().from(activityFeedback)
      .where(and(eq(activityFeedback.activityId, activityId), eq(activityFeedback.userId, userId)));
    return result[0];
  }

  async deleteActivityFeedback(activityId: string, userId: string): Promise<void> {
    await db.delete(activityFeedback)
      .where(and(eq(activityFeedback.activityId, activityId), eq(activityFeedback.userId, userId)));
  }

  async getActivityFeedbackStats(activityId: string): Promise<{ likes: number; dislikes: number }> {
    const feedback = await db.select().from(activityFeedback)
      .where(eq(activityFeedback.activityId, activityId));
    
    const likes = feedback.filter(f => f.feedbackType === 'like').length;
    const dislikes = feedback.filter(f => f.feedbackType === 'dislike').length;
    
    return { likes, dislikes };
  }

  // Task Feedback Methods
  async upsertTaskFeedback(taskId: string, userId: string, feedbackType: 'like' | 'dislike'): Promise<TaskFeedback> {
    // Try to update first
    const existing = await db.select().from(taskFeedback)
      .where(and(eq(taskFeedback.taskId, taskId), eq(taskFeedback.userId, userId)));
    
    if (existing.length > 0) {
      // Update existing feedback
      const result = await db.update(taskFeedback)
        .set({ feedbackType, updatedAt: new Date() })
        .where(and(eq(taskFeedback.taskId, taskId), eq(taskFeedback.userId, userId)))
        .returning();
      return result[0];
    } else {
      // Create new feedback
      const result = await db.insert(taskFeedback)
        .values({ taskId, userId, feedbackType })
        .returning();
      return result[0];
    }
  }

  async getUserTaskFeedback(taskId: string, userId: string): Promise<TaskFeedback | undefined> {
    const result = await db.select().from(taskFeedback)
      .where(and(eq(taskFeedback.taskId, taskId), eq(taskFeedback.userId, userId)));
    return result[0];
  }

  async deleteTaskFeedback(taskId: string, userId: string): Promise<void> {
    await db.delete(taskFeedback)
      .where(and(eq(taskFeedback.taskId, taskId), eq(taskFeedback.userId, userId)));
  }

  async getTaskFeedbackStats(taskId: string): Promise<{ likes: number; dislikes: number }> {
    const feedback = await db.select().from(taskFeedback)
      .where(eq(taskFeedback.taskId, taskId));
    
    const likes = feedback.filter(f => f.feedbackType === 'like').length;
    const dislikes = feedback.filter(f => f.feedbackType === 'dislike').length;
    
    return { likes, dislikes };
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

  // Personal Journal with Media operations
  async addPersonalJournalEntry(userId: string, category: string, entry: {
    text: string;
    media?: Array<{ url: string; type: 'image' | 'video'; thumbnail?: string }>;
    keywords?: string[];
    aiConfidence?: number;
    activityId?: string;
    linkedActivityTitle?: string;
    mood?: 'great' | 'good' | 'okay' | 'poor';
  }): Promise<UserPreferences> {
    const prefs = await this.getUserPreferences(userId);
    const currentPrefs = prefs?.preferences || {};
    const currentJournal = currentPrefs.journalData || {};
    const categoryEntries = currentJournal[category] || [];
    
    // Check if there's already an entry from today in this category
    const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
    const todayEntryIndex = categoryEntries.findIndex((e: any) => {
      const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
      return entryDate === today;
    });
    
    if (todayEntryIndex !== -1) {
      // Merge with existing entry from today
      const existingEntry = categoryEntries[todayEntryIndex];
      
      // Combine text with newline
      const combinedText = existingEntry.text ? `${existingEntry.text}\n${entry.text}` : entry.text;
      
      // Merge media arrays
      const existingMedia = existingEntry.media || [];
      const newMedia = entry.media || [];
      const combinedMedia = [...existingMedia, ...newMedia];
      
      // Merge keywords (unique)
      const existingKeywords = existingEntry.keywords || [];
      const newKeywords = entry.keywords || [];
      const combinedKeywords = Array.from(new Set([...existingKeywords, ...newKeywords]));
      
      // Update the existing entry
      categoryEntries[todayEntryIndex] = {
        ...existingEntry,
        text: combinedText,
        media: combinedMedia.length > 0 ? combinedMedia : undefined,
        keywords: combinedKeywords.length > 0 ? combinedKeywords : undefined,
        aiConfidence: entry.aiConfidence || existingEntry.aiConfidence,
        activityId: entry.activityId || existingEntry.activityId,
        linkedActivityTitle: entry.linkedActivityTitle || existingEntry.linkedActivityTitle,
        mood: entry.mood || existingEntry.mood,
        timestamp: new Date().toISOString(), // Update timestamp to latest
      };
    } else {
      // Create new entry for today
      const newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        text: entry.text,
        media: entry.media,
        timestamp: new Date().toISOString(),
        aiConfidence: entry.aiConfidence,
        keywords: entry.keywords,
        activityId: entry.activityId,
        linkedActivityTitle: entry.linkedActivityTitle,
        mood: entry.mood,
      };
      
      categoryEntries.push(newEntry);
    }
    currentJournal[category] = categoryEntries;
    
    return this.upsertUserPreferences(userId, {
      preferences: {
        ...currentPrefs,
        journalData: currentJournal,
      },
    });
  }

  async getPersonalJournalEntries(userId: string, category?: string): Promise<UserPreferences | undefined> {
    return this.getUserPreferences(userId);
  }

  async updatePersonalJournalEntry(userId: string, category: string, entryId: string, updates: Partial<{
    text: string;
    media?: Array<{ url: string; type: 'image' | 'video'; thumbnail?: string }>;
  }>): Promise<UserPreferences> {
    const prefs = await this.getUserPreferences(userId);
    const currentPrefs = prefs?.preferences || {};
    const currentJournal = currentPrefs.journalData || {};
    const categoryEntries = currentJournal[category] || [];
    
    const entryIndex = categoryEntries.findIndex((e: any) => e.id === entryId);
    if (entryIndex === -1) {
      throw new Error('Journal entry not found');
    }
    
    categoryEntries[entryIndex] = {
      ...categoryEntries[entryIndex],
      ...updates,
    };
    
    currentJournal[category] = categoryEntries;
    
    return this.upsertUserPreferences(userId, {
      preferences: {
        ...currentPrefs,
        journalData: currentJournal,
      },
    });
  }

  async deletePersonalJournalEntry(userId: string, category: string, entryId: string): Promise<UserPreferences> {
    const prefs = await this.getUserPreferences(userId);
    const currentPrefs = prefs?.preferences || {};
    const currentJournal = currentPrefs.journalData || {};
    const categoryEntries = currentJournal[category] || [];
    
    currentJournal[category] = categoryEntries.filter((e: any) => e.id !== entryId);
    
    return this.upsertUserPreferences(userId, {
      preferences: {
        ...currentPrefs,
        journalData: currentJournal,
      },
    });
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

  // Community Plans
  async getCommunityPlans(category?: string, search?: string, limit: number = 50): Promise<Activity[]> {
    let query = db.select().from(activities)
      .where(and(
        eq(activities.isPublic, true),
        eq(activities.featuredInCommunity, true)
      ));

    // Apply category filter (map frontend categories to schema categories)
    if (category && category !== 'trending') {
      const categoryMap: Record<string, string> = {
        'travel': 'travel',
        'fitness': 'health',
        'productivity': 'work',
        'events': 'personal',
        'career': 'work',
        'home': 'home',
        'learning': 'learning'
      };
      const dbCategory = categoryMap[category.toLowerCase()];
      if (dbCategory) {
        query = db.select().from(activities)
          .where(and(
            eq(activities.isPublic, true),
            eq(activities.featuredInCommunity, true),
            eq(activities.category, dbCategory)
          ));
      }
    }

    let results = await query;

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      results = results.filter(activity => 
        activity.title?.toLowerCase().includes(searchLower) ||
        activity.description?.toLowerCase().includes(searchLower) ||
        activity.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by trendingScore (trending tab) or just by creation date
    if (!category || category === 'trending') {
      results.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    } else {
      results.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    }

    return results.slice(0, limit);
  }

  async seedCommunityPlans(force: boolean = false): Promise<void> {
    const { demoCommunityPlans } = await import('./seedData/communityPlans');
    
    // Check if we already have seeded data
    const existingPlans = await db.select().from(activities)
      .where(eq(activities.featuredInCommunity, true))
      .limit(1);
    
    if (existingPlans.length > 0 && !force) {
      console.log('[SEED] Community plans already seeded, skipping');
      return;
    }

    // If force, delete existing community plans
    if (force && existingPlans.length > 0) {
      console.log('[SEED] Force reseeding - deleting existing community plans...');
      await db.delete(activities).where(eq(activities.featuredInCommunity, true));
    }

    console.log('[SEED] Seeding community plans...');
    
    // Create a demo user for community plans
    let demoUser = await this.getUserByEmail('community@journalmate.demo');
    if (!demoUser) {
      demoUser = await this.createUser({
        username: 'community',
        email: 'community@journalmate.demo',
        source: 'manual',
        firstName: 'Community',
        lastName: 'Creator'
      });
    }

    for (const plan of demoCommunityPlans) {
      // Generate a unique share token for the activity
      const shareToken = crypto.randomBytes(16).toString('hex');
      
      // Create the activity with shareToken
      const activity = await this.createActivity({
        ...plan.activity,
        userId: demoUser.id,
        shareToken
      });

      // Create and associate tasks
      for (const taskData of plan.tasks) {
        const task = await this.createTask({
          ...taskData,
          userId: demoUser.id,
          completed: false,
          archived: false
        });

        await this.addTaskToActivity(activity.id, task.id);
      }
    }

    console.log('[SEED] Community plans seeded successfully');
  }

  async incrementActivityViews(activityId: string): Promise<void> {
    await db.update(activities)
      .set({
        viewCount: sql`COALESCE(${activities.viewCount}, 0) + 1`,
        trendingScore: sql`COALESCE(${activities.viewCount}, 0) + 1 + COALESCE(${activities.likeCount}, 0) * 2`,
        updatedAt: new Date()
      })
      .where(eq(activities.id, activityId));
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

  // Groups
  async createGroup(groupData: InsertGroup & { createdBy: string }): Promise<Group> {
    const [group] = await db.insert(groups).values(groupData).returning();
    return group;
  }

  async getGroup(groupId: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    return group;
  }

  async createGroupMembership(membershipData: InsertGroupMembership & { userId: string }): Promise<GroupMembership> {
    const [membership] = await db.insert(groupMemberships).values(membershipData).returning();
    return membership;
  }

  async createGroupActivity(groupActivityData: InsertGroupActivity): Promise<GroupActivity> {
    const [groupActivity] = await db.insert(groupActivities).values(groupActivityData).returning();
    return groupActivity;
  }

  // Get all groups a user is a member of
  async getUserGroups(userId: string): Promise<Array<Group & { memberCount: number; role: string }>> {
    // Use raw SQL to avoid Drizzle ORM circular reference bug
    const result = await sqlClient`
      SELECT 
        g.id,
        g.name,
        g.description,
        g.created_by as "createdBy",
        g.is_private as "isPrivate",
        g.invite_code as "inviteCode",
        g.created_at as "createdAt",
        g.updated_at as "updatedAt",
        gm.role,
        (SELECT COUNT(*) FROM group_memberships WHERE group_id = g.id)::int as "memberCount"
      FROM groups g
      INNER JOIN group_memberships gm ON g.id = gm.group_id
      WHERE gm.user_id = ${userId}
    `;

    return result as any;
  }

  // Get group details with members
  async getGroupById(groupId: string, userId: string): Promise<any> {
    // Use raw SQL to avoid Drizzle ORM circular reference bug
    // Check if user is a member
    const membershipResult = await sqlClient`
      SELECT role FROM group_memberships 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    if (membershipResult.length === 0) {
      return null; // User not authorized
    }

    // Get group details
    const groupResult = await sqlClient`
      SELECT 
        id, name, description,
        created_by as "createdBy",
        is_private as "isPrivate",
        invite_code as "inviteCode",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM groups 
      WHERE id = ${groupId}
    `;

    if (groupResult.length === 0) {
      return null;
    }

    // Get all members
    const members = await sqlClient`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.profile_image_url as "profileImageUrl",
        gm.role,
        gm.joined_at as "joinedAt"
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId}
    `;

    return {
      ...groupResult[0],
      members,
      currentUserRole: membershipResult[0].role,
    };
  }

  // Join group by invite code
  async joinGroupByInviteCode(inviteCode: string, userId: string): Promise<any> {
    // Find group by invite code
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode));

    if (!group) {
      return null;
    }

    // Check if already a member
    const [existingMembership] = await db
      .select()
      .from(groupMemberships)
      .where(and(
        eq(groupMemberships.groupId, group.id),
        eq(groupMemberships.userId, userId)
      ));

    if (existingMembership) {
      throw new Error('User is already a member of this group');
    }

    // Add user as member
    const [membership] = await db
      .insert(groupMemberships)
      .values({
        groupId: group.id,
        userId: userId,
        role: 'member',
      })
      .returning();

    return { group, membership };
  }

  // Get group membership
  async getGroupMembership(groupId: string, userId: string): Promise<GroupMembership | undefined> {
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      ));

    return membership;
  }

  // Add member to group
  async addGroupMember(groupId: string, userId: string, role: string): Promise<GroupMembership> {
    // Check if already a member
    const existing = await this.getGroupMembership(groupId, userId);
    if (existing) {
      throw new Error('User is already a member of this group');
    }

    const [membership] = await db
      .insert(groupMemberships)
      .values({
        groupId,
        userId,
        role,
      })
      .returning();

    return membership;
  }

  // Remove member from group
  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMemberships)
      .where(and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      ));
  }

  // Update group
  async updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
    const [updatedGroup] = await db
      .update(groups)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId))
      .returning();

    return updatedGroup;
  }

  // Delete group
  async deleteGroup(groupId: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, groupId));
  }

  // Share activity to group
  async shareActivityToGroup(activityId: string, groupId: string, userId: string): Promise<GroupActivity> {
    // Check if already shared
    const [existing] = await db
      .select()
      .from(groupActivities)
      .where(and(
        eq(groupActivities.groupId, groupId),
        eq(groupActivities.activityId, activityId)
      ));

    if (existing) {
      throw new Error('Activity is already shared to this group');
    }

    // Get activity details for canonical version
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId));

    if (!activity) {
      throw new Error('Activity not found');
    }

    // Get activity tasks
    const activityTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.activityId, activityId));

    // Create canonical version
    const canonicalVersion = {
      title: activity.title,
      description: activity.description,
      tasks: activityTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        category: task.category,
        priority: task.priority || 'medium',
        order: task.order,
      })),
    };

    // Create group activity
    const [groupActivity] = await db
      .insert(groupActivities)
      .values({
        groupId,
        activityId,
        canonicalVersion,
        isPublic: false,
      })
      .returning();

    return groupActivity;
  }

  // Get group activities
  async getGroupActivities(groupId: string): Promise<any[]> {
    // Use raw SQL to avoid Drizzle ORM circular reference bug
    const groupActivitiesData = await sqlClient`
      SELECT 
        ga.id,
        ga.group_id as "groupId",
        ga.activity_id as "activityId",
        ga.canonical_version as "canonicalVersion",
        ga.is_public as "isPublic",
        ga.created_at as "createdAt",
        a.title as "activityTitle",
        a.description as "activityDescription",
        a.category as "activityCategory",
        a.status as "status"
      FROM group_activities ga
      INNER JOIN activities a ON ga.activity_id = a.id
      WHERE ga.group_id = ${groupId}
      ORDER BY ga.created_at DESC
    `;

    return groupActivitiesData;
  }

  // Remove activity from group
  async removeActivityFromGroup(groupActivityId: string): Promise<void> {
    await db.delete(groupActivities).where(eq(groupActivities.id, groupActivityId));
  }

  // Get activity change logs for a group
  async getGroupActivityChangeLogs(groupId: string): Promise<any[]> {
    // Use raw SQL to get activity change logs with user info
    const logs = await sqlClient`
      SELECT 
        acl.id,
        acl.user_id as "userId",
        acl.change_type as "changeType",
        acl.change_description as "description",
        acl.timestamp,
        u.username,
        u.first_name as "firstName",
        u.last_name as "lastName"
      FROM activity_change_logs acl
      INNER JOIN group_activities ga ON acl.group_activity_id = ga.id
      LEFT JOIN users u ON acl.user_id = u.id
      WHERE ga.group_id = ${groupId}
      ORDER BY acl.timestamp DESC
      LIMIT 50
    `;

    return logs.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      username: log.username || `${log.firstName || ''} ${log.lastName || ''}`.trim() || 'Someone',
      activityType: log.changeType === 'task_added' ? 'added' : log.changeType === 'task_edited' ? 'edited' : 'completed',
      description: log.description,
      timestamp: log.timestamp,
    }));
  }

  // === Contact Shares / Invites ===

  // Create a contact share record for phone/email invite
  async createContactShare(data: {
    groupId: string;
    invitedBy: string;
    contactType: 'phone' | 'email';
    contactValue: string;
    inviteMessage?: string;
  }): Promise<any> {
    const [contactShare] = await db
      .insert(contactShares)
      .values({
        groupId: data.groupId,
        invitedBy: data.invitedBy,
        contactType: data.contactType,
        contactValue: data.contactValue,
        inviteMessage: data.inviteMessage || null,
        status: 'pending',
      })
      .returning();

    return contactShare;
  }

  // Get all invites sent for a group
  async getGroupInvites(groupId: string): Promise<any[]> {
    return await db
      .select()
      .from(contactShares)
      .where(eq(contactShares.groupId, groupId))
      .orderBy(contactShares.createdAt);
  }

  // Mark contact share as accepted when user joins
  async acceptContactShare(contactShareId: string, userId: string): Promise<void> {
    await db
      .update(contactShares)
      .set({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date(),
      })
      .where(eq(contactShares.id, contactShareId));
  }

  // Find pending invite by contact value
  async findPendingInvite(contactValue: string): Promise<any | null> {
    const [invite] = await db
      .select()
      .from(contactShares)
      .where(and(
        eq(contactShares.contactValue, contactValue),
        eq(contactShares.status, 'pending')
      ))
      .limit(1);

    return invite || null;
  }
}

export const storage = new DatabaseStorage();
