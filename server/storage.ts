import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, isNull, isNotNull, or, lte, inArray, sql } from "drizzle-orm";
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
  type ActivityReminder,
  type InsertActivityReminder,
  type DeviceToken,
  type InsertDeviceToken,
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
  type ActivityBookmark,
  type InsertActivityBookmark,
  type UserPin,
  type InsertUserPin,
  type PlanEngagement,
  type InsertPlanEngagement,
  type PlannerProfile,
  type InsertPlannerProfile,
  type Group,
  type InsertGroup,
  type GroupMembership,
  type InsertGroupMembership,
  type GroupActivity,
  type InsertGroupActivity,
  type GroupActivityFeedItem,
  type InsertGroupActivityFeedItem,
  type ShareLink,
  type InsertShareLink,
  type ActivityReport,
  type InsertActivityReport,
  type UserNotification,
  type JournalTemplate,
  type InsertJournalTemplate,
  type AiPlanImport,
  type InsertAiPlanImport,
  type ExtensionToken,
  type InsertExtensionToken,
  type UrlContentCache,
  type InsertUrlContentCache,
  type UserSavedContent,
  type InsertUserSavedContent,
  type ContentImport,
  type InsertContentImport,
  users,
  goals,
  tasks,
  journalEntries,
  progressStats,
  chatImports,
  priorities,
  notificationPreferences,
  taskReminders,
  activityReminders,
  deviceTokens,
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
  plannerProfiles,
  activityFeedback,
  taskFeedback,
  activityBookmarks,
  userPins,
  planEngagement,
  groups,
  groupMemberships,
  groupActivities,
  groupActivityFeed,
  shareLinks,
  activityReports,
  userNotifications,
  journalTemplates,
  aiPlanImports,
  extensionTokens,
  urlContentCache,
  userSavedContent,
  contentImports
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL?.includes('neondb.io') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined
});
export const db = drizzle(pool);

// In-memory storage for mobile auth tokens (one-time use, expire in 5 min)
// Used for OAuth deep link flow when session cookies can't be shared between browser and WebView
const mobileAuthTokens = new Map<string, { userId: number; expiresAt: Date }>();

// Clean up expired tokens periodically (every 5 minutes)
setInterval(() => {
  const now = new Date();
  for (const [token, record] of mobileAuthTokens.entries()) {
    if (record.expiresAt < now) {
      mobileAuthTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
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
  getTask(taskId: string, userId: string): Promise<Task | undefined>;
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
  getActivityById(activityId: string): Promise<Activity | undefined>;
  getActivityByShareToken(shareToken: string): Promise<Activity | undefined>;
  getExistingCopyByShareToken(userId: string, shareToken: string): Promise<Activity | undefined>;
  
  // Share Links (permanent links with snapshots)
  createShareLink(shareLink: InsertShareLink & { shareToken: string; userId: string }): Promise<ShareLink>;
  getShareLink(shareToken: string): Promise<ShareLink | undefined>;
  updateShareLinkSnapshot(shareToken: string, snapshotData: any, activityUpdatedAt: Date): Promise<ShareLink | undefined>;
  markShareLinkActivityDeleted(shareToken: string): Promise<ShareLink | undefined>;
  incrementShareLinkViewCount(shareToken: string): Promise<void>;
  incrementShareLinkCopyCount(shareToken: string): Promise<void>;
  
  updateActivity(activityId: string, updates: Partial<Activity>, userId: string): Promise<Activity | undefined>;
  deleteActivity(activityId: string, userId: string): Promise<void>;
  archiveActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  getPublicActivities(limit?: number): Promise<Activity[]>;
  generateShareableLink(activityId: string, userId: string, groupId?: string): Promise<string | null>;
  
  // Activity Tasks
  addTaskToActivity(activityId: string, taskId: string, order?: number): Promise<ActivityTask>;
  getActivityTasks(activityId: string, userId: string): Promise<Task[]>;
  getTasksByActivity(activityId: string, userId: string): Promise<Task[]>; // Alias for getActivityTasks
  getActivityTasksForTask(taskId: string): Promise<ActivityTask[]>; // Get all activity-task links for a given task
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
  getBulkActivityFeedback(activityIds: string[], userId: string): Promise<Map<string, { userHasLiked: boolean; likeCount: number }>>;

  // Task Feedback (Like/Unlike)
  upsertTaskFeedback(taskId: string, userId: string, feedbackType: 'like' | 'dislike'): Promise<TaskFeedback>;
  getUserTaskFeedback(taskId: string, userId: string): Promise<TaskFeedback | undefined>;
  deleteTaskFeedback(taskId: string, userId: string): Promise<void>;
  getTaskFeedbackStats(taskId: string): Promise<{ likes: number; dislikes: number }>;

  // Activity Bookmarks
  createBookmark(activityId: string, userId: string): Promise<ActivityBookmark>;
  deleteBookmark(activityId: string, userId: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<Activity[]>;
  isBookmarked(activityId: string, userId: string): Promise<boolean>;
  getBulkBookmarkStatus(activityIds: string[], userId: string): Promise<Map<string, boolean>>;
  
  // Engagement tracking (transactional helpers that update state + counts + emit events)
  toggleActivityLike(activityId: string, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  toggleActivityBookmark(activityId: string, userId: string): Promise<{ bookmarked: boolean; bookmarkCount: number }>;

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
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>; // Alias for getUserNotificationPreferences
  
  // User Notifications (in-app notifications)
  createUserNotification(notification: { userId: string; sourceGroupId: string | null; actorUserId: string | null; type: string; title: string; body: string | null; metadata: any }): Promise<any>;
  getUserNotifications(userId: string, limit?: number): Promise<any[]>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  clearReadNotifications(userId: string): Promise<void>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  getTotalNotificationsCount(userId: string): Promise<number>;

  // Task Reminders
  createTaskReminder(reminder: InsertTaskReminder & { userId: string }): Promise<TaskReminder>;
  getUserTaskReminders(userId: string): Promise<TaskReminder[]>;
  getPendingReminders(): Promise<TaskReminder[]>;
  markReminderSent(reminderId: string): Promise<void>;
  deleteTaskReminder(reminderId: string, userId: string): Promise<void>;

  // Activity Reminders (for plan notifications)
  createActivityReminder(reminder: InsertActivityReminder & { userId: string }): Promise<ActivityReminder>;
  getActivityReminders(activityId: string): Promise<ActivityReminder[]>;
  getUserActivityReminders(userId: string): Promise<ActivityReminder[]>;
  getPendingActivityReminders(beforeTime: Date): Promise<ActivityReminder[]>;
  markActivityReminderSent(reminderId: string): Promise<void>;
  deleteActivityReminders(activityId: string): Promise<void>;
  getUpcomingActivitiesForReminders(beforeDate: Date): Promise<Activity[]>;

  // Device Tokens (for push notifications)
  upsertDeviceToken(userId: string, token: InsertDeviceToken): Promise<DeviceToken>;
  getUserDeviceTokens(userId: string): Promise<DeviceToken[]>;
  getDeviceTokenByToken(token: string): Promise<DeviceToken | undefined>;
  deleteDeviceToken(token: string, userId: string): Promise<void>;
  deactivateDeviceToken(token: string): Promise<void>;
  updateDeviceTokenActivity(token: string): Promise<void>;

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
  getOAuthTokenByAccessToken(provider: string, accessToken: string): Promise<ExternalOAuthToken | undefined>;
  deleteOAuthToken(userId: string, provider: string): Promise<void>;
  deleteOAuthTokenByAccessToken(provider: string, accessToken: string): Promise<void>;

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
  
  // Complete User Deletion (Admin only)
  deleteCompleteUser(userId: string): Promise<void>;
  deleteCompleteUserByEmail(email: string): Promise<void>;
  
  // Planner Profiles (for community plan verification)
  getPlannerProfile(userId: string): Promise<PlannerProfile | undefined>;
  upsertPlannerProfile(userId: string, profile: InsertPlannerProfile): Promise<PlannerProfile>;
  
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
    activityId?: string;
    linkedActivityTitle?: string;
  }>): Promise<UserPreferences>;
  deletePersonalJournalEntry(userId: string, category: string, entryId: string): Promise<UserPreferences>;

  // Domain-based journal search for planning personalization
  searchJournalByCategories(
    userId: string,
    categories: string[],
    options?: {
      location?: string;
      limit?: number;
      budgetTier?: string;
    }
  ): Promise<{
    id: string;
    category: string;
    text: string;
    venueName?: string;
    venueType?: string;
    location?: { city?: string; neighborhood?: string };
    budgetTier?: string;
    priceRange?: string;
    keywords?: string[];
    timestamp: string;
    mood?: string;
  }[]>;

  // Lifestyle Planner Sessions
  createLifestylePlannerSession(session: InsertLifestylePlannerSession & { userId: string }): Promise<LifestylePlannerSession>;
  getLifestylePlannerSession(sessionId: string, userId: string): Promise<LifestylePlannerSession | undefined>;
  updateLifestylePlannerSession(sessionId: string, updates: Partial<LifestylePlannerSession>, userId: string): Promise<LifestylePlannerSession | undefined>;
  getUserLifestylePlannerSessions(userId: string, limit?: number): Promise<LifestylePlannerSession[]>;
  getActiveLifestylePlannerSession(userId: string): Promise<LifestylePlannerSession | undefined>;
  deleteLifestylePlannerSession(sessionId: string, userId: string): Promise<void>;

  // Community Plans
  getCommunityPlans(
    userId: string,
    category?: string, 
    search?: string, 
    limit?: number, 
    budgetRange?: string,
    locationFilter?: { lat: number; lon: number; radiusKm?: number }
  ): Promise<Array<Activity & { distanceKm?: number }>>;
  seedCommunityPlans(force?: boolean): Promise<void>;
  incrementActivityViews(activityId: string): Promise<void>;
  
  // Activity Reports (Community Moderation)
  createActivityReport(report: InsertActivityReport): Promise<ActivityReport>;
  getActivityReports(activityId: string): Promise<ActivityReport[]>;
  getUserReports(userId: string): Promise<ActivityReport[]>;
  checkDuplicateReport(activityId: string, reportedBy: string): Promise<ActivityReport | undefined>;
  
  // Publication Management
  unpublishActivity(activityId: string, userId: string): Promise<Activity | undefined>;
  republishActivity(activityId: string, userId: string): Promise<Activity | undefined>;

  // Groups
  createGroup(group: InsertGroup & { createdBy: string }): Promise<Group>;
  getGroup(groupId: string): Promise<Group | undefined>;
  createGroupMembership(membership: InsertGroupMembership & { userId: string }): Promise<GroupMembership>;
  createGroupActivity(groupActivity: InsertGroupActivity): Promise<GroupActivity>;
  getGroupsForUser(userId: string): Promise<Array<Group & { memberCount: number; role: string }>>;
  getGroupMembers(groupId: string): Promise<Array<{ userId: string; userName: string; role: string; joinedAt: Date }>>;
  joinGroupByInviteCode(inviteCode: string, userId: string): Promise<{ group: Group; membership: GroupMembership } | null>;
  shareActivityToGroup(activityId: string, groupId: string, userId: string, forceUpdate?: boolean): Promise<GroupActivity>;
  
  // Group Progress & Activity Feed
  getGroupProgress(groupId: string): Promise<Array<{ groupActivityId: string; activityTitle: string; totalTasks: number; completedTasks: number }>>;
  getGroupActivityFeed(groupId: string, limit?: number): Promise<GroupActivityFeedItem[]>;
  logGroupActivity(feedItem: InsertGroupActivityFeedItem): Promise<GroupActivityFeedItem>;
  getGroupActivityByTaskId(taskId: string): Promise<GroupActivity | null>;
  getGroupActivityById(groupActivityId: string): Promise<GroupActivity | null>;
  logActivityChange(change: { groupActivityId: string; userId: string; changeType: string; changeDescription: string }): Promise<void>;
  getMemberProgressForGroupActivity(groupActivityId: string): Promise<Array<{ userId: string; username: string; totalTasks: number; completedTasks: number }>>;

  // Journal Templates
  getUserJournalTemplates(userId: string): Promise<JournalTemplate[]>;
  createJournalTemplate(template: InsertJournalTemplate): Promise<JournalTemplate>;
  updateJournalTemplate(templateId: string, userId: string, updates: Partial<InsertJournalTemplate>): Promise<JournalTemplate | undefined>;
  deleteJournalTemplate(templateId: string, userId: string): Promise<void>;

  // AI Plan Imports (Extension/Mobile)
  createAiPlanImport(planImport: InsertAiPlanImport & { userId: string }): Promise<AiPlanImport>;
  getAiPlanImport(importId: string, userId: string): Promise<AiPlanImport | undefined>;
  getUserAiPlanImports(userId: string, status?: string): Promise<AiPlanImport[]>;
  updateAiPlanImport(importId: string, userId: string, updates: Partial<AiPlanImport>): Promise<AiPlanImport | undefined>;
  confirmAiPlanImport(importId: string, userId: string, activityId: string): Promise<AiPlanImport | undefined>;
  discardAiPlanImport(importId: string, userId: string): Promise<void>;
  getUserMonthlyImportCount(userId: string): Promise<number>;

  // Extension Tokens
  createExtensionToken(token: InsertExtensionToken & { userId: string }): Promise<ExtensionToken>;
  getExtensionToken(token: string): Promise<ExtensionToken | undefined>;
  getUserExtensionTokens(userId: string): Promise<ExtensionToken[]>;
  updateExtensionTokenActivity(token: string): Promise<void>;
  revokeExtensionToken(tokenId: string, userId: string): Promise<void>;
  revokeAllExtensionTokens(userId: string): Promise<void>;

  // URL Content Cache (permanent storage for extracted URL content)
  getUrlContentCache(normalizedUrl: string): Promise<UrlContentCache | undefined>;
  createUrlContentCache(cache: InsertUrlContentCache): Promise<UrlContentCache>;

  // User Saved Content (personalized content from social media shares)
  createUserSavedContent(content: InsertUserSavedContent): Promise<UserSavedContent>;
  getUserSavedContent(userId: string, filters?: {
    city?: string;
    location?: string;
    category?: string;
    platform?: string;
    limit?: number;
  }): Promise<UserSavedContent[]>;
  getUserSavedContentById(contentId: string, userId: string): Promise<UserSavedContent | undefined>;
  updateUserSavedContent(contentId: string, userId: string, updates: Partial<InsertUserSavedContent>): Promise<UserSavedContent | undefined>;
  deleteUserSavedContent(contentId: string, userId: string): Promise<void>;
  incrementContentReferenceCount(contentId: string): Promise<void>;
  getUserSavedLocations(userId: string): Promise<Array<{ city: string; country: string | null; count: number }>>;
  getUserSavedCategories(userId: string): Promise<Array<{ category: string; count: number }>>;

  // Content Imports (stores ALL extracted items from URL for alternatives/swapping)
  createContentImport(contentImport: InsertContentImport): Promise<ContentImport>;
  getContentImport(importId: string, userId: string): Promise<ContentImport | undefined>;
  getContentImportByNormalizedUrl(normalizedUrl: string, userId: string): Promise<ContentImport | undefined>;
  getContentImportByActivityId(activityId: string): Promise<ContentImport | undefined>;
  updateContentImport(importId: string, userId: string, updates: Partial<InsertContentImport>): Promise<ContentImport | undefined>;
  getAlternativesFromImport(importId: string, excludeTaskIds?: string[]): Promise<Array<{
    id: string;
    venueName: string;
    venueType: string;
    location?: { city?: string; neighborhood?: string };
    priceRange?: string;
    budgetTier?: string;
    estimatedCost?: number;
    category?: string;
  }>>;
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

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
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

  async getTask(taskId: string, userId: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        or(eq(tasks.archived, false), isNull(tasks.archived)),
        or(eq(tasks.completed, false), isNull(tasks.completed))
      ))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(
    taskId: string,
    updates: Partial<Task>,
    userId: string,
    expectedVersion?: number
  ): Promise<{ task?: Task; conflict?: boolean; currentTask?: Task }> {
    // Simple update - version checking is no longer supported
    if (expectedVersion !== undefined) {
      // Get the current task
      const currentTask = await this.getTask(taskId, userId);

      if (!currentTask) {
        return { conflict: false, task: undefined };
      }

      // Just update the task (no version field available)
      const result = await db.update(tasks)
        .set({
          ...updates,
        })
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId)
        ))
        .returning();

      if (result.length === 0) {
        const currentTask = await this.getTask(taskId, userId);
        return {
          conflict: true,
          currentTask,
        };
      }

      return { task: result[0], conflict: false };
    }

    // No version check - simple update
    const result = await db.update(tasks)
      .set({
        ...updates,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return { task: result[0], conflict: false };
  }

  async completeTask(
    taskId: string,
    userId: string,
    expectedVersion?: number
  ): Promise<{ task?: Task; conflict?: boolean; currentTask?: Task }> {
    // Use updateTask with optimistic locking
    return this.updateTask(
      taskId,
      { completed: true, completedAt: new Date() },
      userId,
      expectedVersion
    );
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
    const userActivities = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        or(eq(activities.archived, false), isNull(activities.archived))
      ))
      .orderBy(desc(activities.createdAt));

    if (userActivities.length === 0) {
      return [];
    }

    const activityIds = userActivities.map(a => a.id);
    const allTaskData = await db
      .select({
        activityId: activityTasks.activityId,
        taskId: activityTasks.taskId,
        completed: tasks.completed,
      })
      .from(activityTasks)
      .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
      .where(inArray(activityTasks.activityId, activityIds));

    const tasksByActivity = new Map<string, Array<{ completed: boolean }>>();
    for (const task of allTaskData) {
      if (!tasksByActivity.has(task.activityId)) {
        tasksByActivity.set(task.activityId, []);
      }
      tasksByActivity.get(task.activityId)!.push({ completed: task.completed ?? false });
    }

    return userActivities.map(activity => {
      const activityTasks = tasksByActivity.get(activity.id) || [];
      const totalTasks = activityTasks.length;
      const completedTasks = activityTasks.filter(t => t.completed).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...activity,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });
  }

  async getUserArchivedActivities(userId: string): Promise<ActivityWithProgress[]> {
    const userActivities = await db.select().from(activities)
      .where(and(
        eq(activities.userId, userId),
        eq(activities.archived, true)
      ))
      .orderBy(desc(activities.createdAt));

    if (userActivities.length === 0) {
      return [];
    }

    const activityIds = userActivities.map(a => a.id);
    const allTaskData = await db
      .select({
        activityId: activityTasks.activityId,
        taskId: activityTasks.taskId,
        completed: tasks.completed,
      })
      .from(activityTasks)
      .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
      .where(inArray(activityTasks.activityId, activityIds));

    const tasksByActivity = new Map<string, Array<{ completed: boolean }>>();
    for (const task of allTaskData) {
      if (!tasksByActivity.has(task.activityId)) {
        tasksByActivity.set(task.activityId, []);
      }
      tasksByActivity.get(task.activityId)!.push({ completed: task.completed ?? false });
    }

    return userActivities.map(activity => {
      const activityTasks = tasksByActivity.get(activity.id) || [];
      const totalTasks = activityTasks.length;
      const completedTasks = activityTasks.filter(t => t.completed).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...activity,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });
  }

  async getActivity(activityId: string, userId: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
    return result;
  }

  async getActivityById(activityId: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(eq(activities.id, activityId));
    return result;
  }

  async getActivityByShareToken(shareToken: string): Promise<Activity | undefined> {
    const [result] = await db.select().from(activities)
      .where(eq(activities.shareToken, shareToken));
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

  async createShareLink(shareLinkData: InsertShareLink & { shareToken: string; userId: string }): Promise<ShareLink> {
    const [result] = await db.insert(shareLinks).values(shareLinkData).returning();
    return result;
  }

  async getShareLink(shareToken: string): Promise<ShareLink | undefined> {
    const [result] = await db.select().from(shareLinks)
      .where(eq(shareLinks.shareToken, shareToken));
    return result;
  }

  async updateShareLinkSnapshot(shareToken: string, snapshotData: any, activityUpdatedAt: Date): Promise<ShareLink | undefined> {
    const [result] = await db.update(shareLinks)
      .set({
        snapshotData,
        snapshotAt: new Date(),
        activityUpdatedAt,
        updatedAt: new Date(),
      })
      .where(eq(shareLinks.shareToken, shareToken))
      .returning();
    return result;
  }

  async markShareLinkActivityDeleted(shareToken: string): Promise<ShareLink | undefined> {
    const [result] = await db.update(shareLinks)
      .set({
        isActivityDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(shareLinks.shareToken, shareToken))
      .returning();
    return result;
  }

  async incrementShareLinkViewCount(shareToken: string): Promise<void> {
    await db.update(shareLinks)
      .set({
        viewCount: sql`${shareLinks.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(shareLinks.shareToken, shareToken));
  }

  async incrementShareLinkCopyCount(shareToken: string): Promise<void> {
    await db.update(shareLinks)
      .set({
        copyCount: sql`${shareLinks.copyCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(shareLinks.shareToken, shareToken));
  }

  async updateActivity(
    activityId: string,
    updates: Partial<Activity>,
    userId: string,
    expectedVersion?: number
  ): Promise<{ activity?: Activity; conflict?: boolean; currentActivity?: Activity }> {
    // Simple update - version checking is no longer supported
    if (expectedVersion !== undefined) {
      const currentActivity = await this.getActivity(activityId, userId);

      if (!currentActivity) {
        return { conflict: false, activity: undefined };
      }

      // Just update the activity (no version field available)
      const result = await db.update(activities)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(
          eq(activities.id, activityId),
          eq(activities.userId, userId)
        ))
        .returning();

      if (result.length === 0) {
        const currentActivity = await this.getActivity(activityId, userId);
        return {
          conflict: true,
          currentActivity,
        };
      }

      return { activity: result[0], conflict: false };
    }

    // Simple update
    const result = await db.update(activities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .returning();
    return { activity: result[0], conflict: false };
  }

  async createUserPin(activityId: string, userId: string): Promise<UserPin> {
    const result = await db.insert(userPins)
      .values({ activityId, userId })
      .returning();
    return result[0];
  }

  async deleteUserPin(activityId: string, userId: string): Promise<void> {
    await db.delete(userPins)
      .where(and(eq(userPins.activityId, activityId), eq(userPins.userId, userId)));
  }

  async toggleUserPin(activityId: string, userId: string): Promise<{ isPinned: boolean }> {
    // Check if pin exists
    const existing = await db.select()
      .from(userPins)
      .where(and(eq(userPins.activityId, activityId), eq(userPins.userId, userId)))
      .limit(1);
    
    if (existing.length > 0) {
      // Unpin
      await this.deleteUserPin(activityId, userId);
      return { isPinned: false };
    } else {
      // Pin
      await this.createUserPin(activityId, userId);
      return { isPinned: true };
    }
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

  async generateShareableLink(activityId: string, userId: string, groupId?: string): Promise<string | null> {
    const shareToken = crypto.randomUUID().replace(/-/g, '');
    
    // First get the activity to create a snapshot
    const activity = await this.getActivity(activityId, userId);
    if (!activity) {
      return null;
    }
    
    // Get activity tasks for the snapshot
    const activityTasksList = await this.getActivityTasks(activityId, userId);
    
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
    
    // Determine the groupId - from param, or check activity's targetGroupId, or check group_activities table
    let resolvedGroupId = groupId || (activity as any).targetGroupId;
    
    if (!resolvedGroupId) {
      // Check if activity is in any group via group_activities table
      try {
        const groupCheckResult = await db.execute(
          sql`SELECT group_id FROM group_activities WHERE activity_id = ${activityId} LIMIT 1`
        );
        if (groupCheckResult.rows && groupCheckResult.rows.length > 0) {
          resolvedGroupId = (groupCheckResult.rows[0] as any).group_id;
        }
      } catch (err) {
        console.error('[generateShareableLink] Error checking group_activities:', err);
      }
    }
    
    // Create snapshot data - includes activity and tasks with completion state
    const snapshotData = {
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        category: activity.category,
        status: activity.status,
        planSummary: (activity as any).planSummary,
        shareTitle: (activity as any).shareTitle,
        socialText: (activity as any).socialText,
        backdrop: (activity as any).backdrop,
        isPublic: true, // Snapshots are always public since link was shared
        authorName: (activity as any).authorName,
        authorImage: (activity as any).authorImage,
        sourceType: (activity as any).sourceType,
      },
      tasks: activityTasksList.map(t => ({
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        dueDate: t.dueDate,
        timeEstimate: t.timeEstimate,
        context: t.context,
        completed: t.completed, // Preserve completion state in snapshot
        completedAt: t.completedAt,
      })),
    };
    
    // Create the permanent share link record with groupId if available
    const shareLinkData: any = {
      shareToken,
      activityId,
      userId,
      snapshotData,
      snapshotAt: new Date(),
      activityUpdatedAt: activity.updatedAt || activity.createdAt,
      isActivityDeleted: false,
      viewCount: 0,
      copyCount: 0,
    };
    
    if (resolvedGroupId) {
      shareLinkData.groupId = resolvedGroupId;
      console.log('[generateShareableLink] Storing groupId in share_link:', resolvedGroupId);
    }
    
    await db.insert(shareLinks).values(shareLinkData);
    
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

  async getTasksByActivity(activityId: string, userId: string): Promise<Task[]> {
    return this.getActivityTasks(activityId, userId);
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

  async getActivityTasksForTask(taskId: string): Promise<ActivityTask[]> {
    return await db.select().from(activityTasks)
      .where(eq(activityTasks.taskId, taskId));
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

  async getBulkActivityFeedback(activityIds: string[], userId: string): Promise<Map<string, { userHasLiked: boolean; likeCount: number }>> {
    if (activityIds.length === 0) {
      return new Map();
    }

    // Get all feedback for these activities in one query
    const allFeedback = await db.select().from(activityFeedback)
      .where(inArray(activityFeedback.activityId, activityIds));
    
    // Build a map of activity feedback
    const feedbackMap = new Map<string, { userHasLiked: boolean; likeCount: number }>();
    
    // Initialize all activities
    for (const activityId of activityIds) {
      feedbackMap.set(activityId, { userHasLiked: false, likeCount: 0 });
    }
    
    // Process feedback
    for (const feedback of allFeedback) {
      const current = feedbackMap.get(feedback.activityId)!;
      
      // Check if this user liked it
      if (feedback.userId === userId && feedback.feedbackType === 'like') {
        current.userHasLiked = true;
      }
      
      // Count likes
      if (feedback.feedbackType === 'like') {
        current.likeCount++;
      }
    }
    
    return feedbackMap;
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

  // Activity Bookmarks
  async createBookmark(activityId: string, userId: string): Promise<ActivityBookmark> {
    const result = await db.insert(activityBookmarks)
      .values({ activityId, userId })
      .returning();
    return result[0];
  }

  async deleteBookmark(activityId: string, userId: string): Promise<void> {
    await db.delete(activityBookmarks)
      .where(and(eq(activityBookmarks.activityId, activityId), eq(activityBookmarks.userId, userId)));
  }

  async getUserBookmarks(userId: string): Promise<Activity[]> {
    const bookmarks = await db.select({ activity: activities })
      .from(activityBookmarks)
      .innerJoin(activities, eq(activityBookmarks.activityId, activities.id))
      .where(eq(activityBookmarks.userId, userId))
      .orderBy(desc(activityBookmarks.createdAt));
    
    return bookmarks.map(b => b.activity);
  }

  async isBookmarked(activityId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(activityBookmarks)
      .where(and(eq(activityBookmarks.activityId, activityId), eq(activityBookmarks.userId, userId)));
    return result.length > 0;
  }

  async getBulkBookmarkStatus(activityIds: string[], userId: string): Promise<Map<string, boolean>> {
    if (activityIds.length === 0) {
      return new Map();
    }

    const bookmarks = await db.select()
      .from(activityBookmarks)
      .where(and(
        inArray(activityBookmarks.activityId, activityIds),
        eq(activityBookmarks.userId, userId)
      ));

    const bookmarkMap = new Map<string, boolean>();
    activityIds.forEach(id => bookmarkMap.set(id, false));
    bookmarks.forEach(bookmark => bookmarkMap.set(bookmark.activityId, true));
    
    return bookmarkMap;
  }

  // Engagement tracking - Explicit add/remove helpers
  async setActivityLike(activityId: string, userId: string, shouldLike: boolean): Promise<{ liked: boolean; likeCount: number }> {
    return await db.transaction(async (tx) => {
      // Check current state
      const existingFeedback = await tx.select()
        .from(activityFeedback)
        .where(and(
          eq(activityFeedback.activityId, activityId),
          eq(activityFeedback.userId, userId),
          eq(activityFeedback.feedbackType, 'like')
        ))
        .limit(1);

      const isCurrentlyLiked = existingFeedback.length > 0;

      // If already in desired state, no-op (idempotent)
      if (isCurrentlyLiked === shouldLike) {
        const activity = await tx.select({ likeCount: activities.likeCount })
          .from(activities)
          .where(eq(activities.id, activityId))
          .limit(1);
        
        return {
          liked: isCurrentlyLiked,
          likeCount: activity[0]?.likeCount || 0
        };
      }

      const actionType = shouldLike ? 'like' : 'unlike';
      const delta = shouldLike ? 1 : -1;

      // Update state table
      if (shouldLike) {
        await tx.insert(activityFeedback)
          .values({ activityId, userId, feedbackType: 'like' })
          .onConflictDoUpdate({
            target: [activityFeedback.activityId, activityFeedback.userId],
            set: { feedbackType: 'like', updatedAt: new Date() }
          });
      } else {
        await tx.delete(activityFeedback)
          .where(and(
            eq(activityFeedback.activityId, activityId),
            eq(activityFeedback.userId, userId)
          ));
      }

      // Update denormalized counter atomically
      await tx.update(activities)
        .set({ 
          likeCount: sql`GREATEST(COALESCE(like_count, 0) + ${delta}, 0)` 
        })
        .where(eq(activities.id, activityId));

      // Emit engagement event for analytics
      await tx.insert(planEngagement)
        .values({
          activityId,
          userId,
          actionType,
          metadata: {}
        });

      // Get updated count
      const activity = await tx.select({ likeCount: activities.likeCount })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      return {
        liked: shouldLike,
        likeCount: activity[0]?.likeCount || 0
      };
    });
  }

  // Legacy toggle helper for backward compatibility
  async toggleActivityLike(activityId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    // Check current state and flip it
    const existingFeedback = await db.select()
      .from(activityFeedback)
      .where(and(
        eq(activityFeedback.activityId, activityId),
        eq(activityFeedback.userId, userId),
        eq(activityFeedback.feedbackType, 'like')
      ))
      .limit(1);

    const isCurrentlyLiked = existingFeedback.length > 0;
    return this.setActivityLike(activityId, userId, !isCurrentlyLiked);
  }

  async setActivityBookmark(activityId: string, userId: string, shouldBookmark: boolean): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
    return await db.transaction(async (tx) => {
      // Check current state
      const existingBookmark = await tx.select()
        .from(activityBookmarks)
        .where(and(
          eq(activityBookmarks.activityId, activityId),
          eq(activityBookmarks.userId, userId)
        ))
        .limit(1);

      const isCurrentlyBookmarked = existingBookmark.length > 0;

      // If already in desired state, no-op (idempotent)
      if (isCurrentlyBookmarked === shouldBookmark) {
        const activity = await tx.select({ bookmarkCount: activities.bookmarkCount })
          .from(activities)
          .where(eq(activities.id, activityId))
          .limit(1);
        
        return {
          bookmarked: isCurrentlyBookmarked,
          bookmarkCount: activity[0]?.bookmarkCount || 0
        };
      }

      const actionType = shouldBookmark ? 'bookmark' : 'unbookmark';
      const delta = shouldBookmark ? 1 : -1;

      // Update state table
      if (shouldBookmark) {
        await tx.insert(activityBookmarks)
          .values({ activityId, userId });
      } else {
        await tx.delete(activityBookmarks)
          .where(and(
            eq(activityBookmarks.activityId, activityId),
            eq(activityBookmarks.userId, userId)
          ));
      }

      // Update denormalized counter atomically
      await tx.update(activities)
        .set({ 
          bookmarkCount: sql`GREATEST(COALESCE(bookmark_count, 0) + ${delta}, 0)` 
        })
        .where(eq(activities.id, activityId));

      // Emit engagement event for analytics
      await tx.insert(planEngagement)
        .values({
          activityId,
          userId,
          actionType,
          metadata: {}
        });

      // Get updated count
      const activity = await tx.select({ bookmarkCount: activities.bookmarkCount })
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      return {
        bookmarked: shouldBookmark,
        bookmarkCount: activity[0]?.bookmarkCount || 0
      };
    });
  }

  // Legacy toggle helper for backward compatibility
  async toggleActivityBookmark(activityId: string, userId: string): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
    // Check current state and flip it
    const existingBookmark = await db.select()
      .from(activityBookmarks)
      .where(and(
        eq(activityBookmarks.activityId, activityId),
        eq(activityBookmarks.userId, userId)
      ))
      .limit(1);

    const isCurrentlyBookmarked = existingBookmark.length > 0;
    return this.setActivityBookmark(activityId, userId, !isCurrentlyBookmarked);
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

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    return this.getUserNotificationPreferences(userId);
  }

  // User Notifications (in-app notifications)
  async createUserNotification(notification: { userId: string; sourceGroupId: string | null; actorUserId: string | null; type: string; title: string; body: string | null; metadata: any }): Promise<any> {
    const [result] = await db.insert(userNotifications).values(notification).returning();
    return result;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<any[]> {
    return await db.select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    await db.update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(userNotifications.id, notificationId), eq(userNotifications.userId, userId)));
  }

  async clearReadNotifications(userId: string): Promise<void> {
    await db.delete(userNotifications)
      .where(and(
        eq(userNotifications.userId, userId),
        isNotNull(userNotifications.readAt)
      ));
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(userNotifications)
      .where(and(
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt)
      ));
    return result[0]?.count || 0;
  }

  async getTotalNotificationsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));
    return result[0]?.count || 0;
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

  // Activity Reminders (for plan notifications)
  async createActivityReminder(reminder: InsertActivityReminder & { userId: string }): Promise<ActivityReminder> {
    const [result] = await db.insert(activityReminders).values(reminder).returning();
    return result;
  }

  async getActivityReminders(activityId: string): Promise<ActivityReminder[]> {
    return await db.select().from(activityReminders)
      .where(eq(activityReminders.activityId, activityId))
      .orderBy(activityReminders.scheduledAt);
  }

  async getUserActivityReminders(userId: string): Promise<ActivityReminder[]> {
    return await db.select().from(activityReminders)
      .where(and(
        eq(activityReminders.userId, userId),
        eq(activityReminders.isSent, false)
      ))
      .orderBy(activityReminders.scheduledAt);
  }

  async getPendingActivityReminders(beforeTime: Date): Promise<ActivityReminder[]> {
    return await db.select().from(activityReminders)
      .where(and(
        eq(activityReminders.isSent, false),
        lte(activityReminders.scheduledAt, beforeTime)
      ))
      .orderBy(activityReminders.scheduledAt);
  }

  async markActivityReminderSent(reminderId: string): Promise<void> {
    await db.update(activityReminders)
      .set({ isSent: true, sentAt: new Date() })
      .where(eq(activityReminders.id, reminderId));
  }

  async deleteActivityReminders(activityId: string): Promise<void> {
    await db.delete(activityReminders)
      .where(eq(activityReminders.activityId, activityId));
  }

  async getUpcomingActivitiesForReminders(beforeDate: Date): Promise<Activity[]> {
    const now = new Date();
    return await db.select().from(activities)
      .where(and(
        sql`${activities.startDate} IS NOT NULL`,
        sql`${activities.startDate} > ${now}`,
        sql`${activities.startDate} <= ${beforeDate}`
      ));
  }

  // Device Tokens (for push notifications)
  async upsertDeviceToken(userId: string, token: InsertDeviceToken): Promise<DeviceToken> {
    // Check if token already exists
    const [existing] = await db.select().from(deviceTokens).where(eq(deviceTokens.token, token.token));
    
    if (existing) {
      // Update existing token (refresh last used time, update device info, reactivate if inactive)
      const [updated] = await db.update(deviceTokens)
        .set({
          userId,
          deviceInfo: token.deviceInfo,
          isActive: true,
          lastUsedAt: new Date(),
        })
        .where(eq(deviceTokens.token, token.token))
        .returning();
      return updated;
    } else {
      // Create new token
      const [created] = await db.insert(deviceTokens).values({ ...token, userId }).returning();
      return created;
    }
  }

  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    return await db.select()
      .from(deviceTokens)
      .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.isActive, true)));
  }

  async getDeviceTokenByToken(token: string): Promise<DeviceToken | undefined> {
    const [result] = await db.select().from(deviceTokens).where(eq(deviceTokens.token, token));
    return result;
  }

  async deleteDeviceToken(token: string, userId: string): Promise<void> {
    await db.delete(deviceTokens)
      .where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)));
  }

  async deactivateDeviceToken(token: string): Promise<void> {
    await db.update(deviceTokens)
      .set({ isActive: false })
      .where(eq(deviceTokens.token, token));
  }

  async updateDeviceTokenActivity(token: string): Promise<void> {
    await db.update(deviceTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(deviceTokens.token, token));
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

  async getOAuthTokenByAccessToken(provider: string, accessToken: string): Promise<ExternalOAuthToken | undefined> {
    const [token] = await db.select().from(externalOAuthTokens)
      .where(and(eq(externalOAuthTokens.provider, provider), eq(externalOAuthTokens.accessToken, accessToken)));
    return token;
  }

  async deleteOAuthTokenByAccessToken(provider: string, accessToken: string): Promise<void> {
    await db.delete(externalOAuthTokens).where(
      and(eq(externalOAuthTokens.provider, provider), eq(externalOAuthTokens.accessToken, accessToken))
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
    const result = await db.select().from(contacts).where(and(...conditions)).orderBy(contacts.name);
    console.log('[STORAGE] getUserContacts for userId:', userId, 'source:', source || 'all', 'count:', result.length);
    return result;
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

  // Search journal entries by categories for planning personalization
  async searchJournalByCategories(
    userId: string,
    categories: string[],
    options?: {
      location?: string;
      limit?: number;
      budgetTier?: string;
    }
  ): Promise<{
    id: string;
    category: string;
    text: string;
    venueName?: string;
    venueType?: string;
    location?: { city?: string; neighborhood?: string };
    budgetTier?: string;
    priceRange?: string;
    keywords?: string[];
    timestamp: string;
    mood?: string;
  }[]> {
    const limit = options?.limit || 10;
    const locationFilter = options?.location?.toLowerCase();

    // Get user preferences with journalData
    const prefs = await this.getUserPreferences(userId);
    if (!prefs?.preferences?.journalData) {
      return [];
    }

    const journalData = prefs.preferences.journalData as Record<string, any[]>;
    const results: any[] = [];

    // Search through each requested category
    for (const category of categories) {
      const entries = journalData[category];
      if (!entries || !Array.isArray(entries)) continue;

      for (const entry of entries) {
        // Apply location filter if specified
        if (locationFilter) {
          const entryCity = entry.location?.city?.toLowerCase() || '';
          const entryNeighborhood = entry.location?.neighborhood?.toLowerCase() || '';
          const entryText = entry.text?.toLowerCase() || '';

          const matchesLocation =
            entryCity.includes(locationFilter) ||
            entryNeighborhood.includes(locationFilter) ||
            entryText.includes(locationFilter);

          if (!matchesLocation) continue;
        }

        // Apply budget filter if specified
        if (options?.budgetTier && entry.budgetTier && entry.budgetTier !== options.budgetTier) {
          continue;
        }

        results.push({
          id: entry.id,
          category,
          text: entry.text,
          venueName: entry.venueName,
          venueType: entry.venueType,
          location: entry.location ? {
            city: entry.location.city,
            neighborhood: entry.location.neighborhood
          } : undefined,
          budgetTier: entry.budgetTier,
          priceRange: entry.priceRange,
          keywords: entry.keywords,
          timestamp: entry.timestamp,
          mood: entry.mood
        });
      }
    }

    // Sort by timestamp (most recent first) and limit
    results.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    return results.slice(0, limit);
  }

  // Complete User Deletion (Admin only)
  async deleteCompleteUser(userId: string): Promise<void> {
    console.log(`[STORAGE] Deleting complete user account: ${userId}`);
    
    // Delete all user-related data in the correct order (respecting foreign key constraints)
    // Note: Many tables have ON DELETE CASCADE, but we'll be explicit for clarity
    
    // 1. Delete auth identities
    await db.delete(authIdentities).where(eq(authIdentities.userId, userId));
    console.log(`  - Deleted auth identities`);
    
    // 2. Delete OAuth tokens
    await db.delete(externalOAuthTokens).where(eq(externalOAuthTokens.userId, userId));
    console.log(`  - Deleted OAuth tokens`);
    
    // 3. Delete contacts
    await db.delete(contacts).where(eq(contacts.ownerUserId, userId));
    console.log(`  - Deleted contacts`);
    
    // 4. Delete contact shares
    await db.delete(contactShares).where(eq(contactShares.sharedBy, userId));
    console.log(`  - Deleted contact shares`);
    
    // 5. Delete user preferences
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    console.log(`  - Deleted user preferences`);
    
    // 6. Delete user profile
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    console.log(`  - Deleted user profile`);
    
    // 7. Delete planner profile
    await db.delete(plannerProfiles).where(eq(plannerProfiles.userId, userId));
    console.log(`  - Deleted planner profile`);
    
    // 8. Delete notification preferences
    await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    console.log(`  - Deleted notification preferences`);
    
    // 9. Delete task reminders
    await db.delete(taskReminders).where(eq(taskReminders.userId, userId));
    console.log(`  - Deleted task reminders`);
    
    // 10. Delete device tokens
    await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
    console.log(`  - Deleted device tokens`);
    
    // 11. Delete scheduling suggestions
    await db.delete(schedulingSuggestions).where(eq(schedulingSuggestions.userId, userId));
    console.log(`  - Deleted scheduling suggestions`);
    
    // 11. Delete priorities
    await db.delete(priorities).where(eq(priorities.userId, userId));
    console.log(`  - Deleted priorities`);
    
    // 12. Delete chat imports
    await db.delete(chatImports).where(eq(chatImports.userId, userId));
    console.log(`  - Deleted chat imports`);
    
    // 13. Delete lifestyle planner sessions
    await db.delete(lifestylePlannerSessions).where(eq(lifestylePlannerSessions.userId, userId));
    console.log(`  - Deleted lifestyle planner sessions`);
    
    // 14. Delete activity feedback
    await db.delete(activityFeedback).where(eq(activityFeedback.userId, userId));
    console.log(`  - Deleted activity feedback`);
    
    // 15. Delete task feedback
    await db.delete(taskFeedback).where(eq(taskFeedback.userId, userId));
    console.log(`  - Deleted task feedback`);
    
    // 16. Delete activity bookmarks
    await db.delete(activityBookmarks).where(eq(activityBookmarks.userId, userId));
    console.log(`  - Deleted activity bookmarks`);
    
    // 17. Delete user pins
    await db.delete(userPins).where(eq(userPins.userId, userId));
    console.log(`  - Deleted user pins`);
    
    // 18. Delete plan engagement
    await db.delete(planEngagement).where(eq(planEngagement.userId, userId));
    console.log(`  - Deleted plan engagement`);
    
    // 19. Delete activity reports (reported by user)
    await db.delete(activityReports).where(eq(activityReports.reportedBy, userId));
    console.log(`  - Deleted activity reports`);
    
    // 20. Delete permission requests
    await db.delete(activityPermissionRequests).where(
      or(
        eq(activityPermissionRequests.requestedBy, userId),
        eq(activityPermissionRequests.ownerId, userId)
      )
    );
    console.log(`  - Deleted activity permission requests`);
    
    // 21. Delete group memberships
    await db.delete(groupMemberships).where(eq(groupMemberships.userId, userId));
    console.log(`  - Deleted group memberships`);
    
    // 22. Delete group activities shared by user
    await db.delete(groupActivities).where(eq(groupActivities.sharedBy, userId));
    console.log(`  - Deleted group activities`);
    
    // 23. Delete group activity feed items
    await db.delete(groupActivityFeed).where(eq(groupActivityFeed.actorUserId, userId));
    console.log(`  - Deleted group activity feed items`);
    
    // 24. Delete groups created by user
    await db.delete(groups).where(eq(groups.createdBy, userId));
    console.log(`  - Deleted groups`);
    
    // 25. Delete tasks (will cascade delete activity_tasks)
    await db.delete(tasks).where(eq(tasks.userId, userId));
    console.log(`  - Deleted tasks`);
    
    // 26. Delete goals
    await db.delete(goals).where(eq(goals.userId, userId));
    console.log(`  - Deleted goals`);
    
    // 27. Delete activities (and their associated activity_tasks via cascade)
    await db.delete(activities).where(eq(activities.userId, userId));
    console.log(`  - Deleted activities`);
    
    // 28. Delete journal entries
    await db.delete(journalEntries).where(eq(journalEntries.userId, userId));
    console.log(`  - Deleted journal entries`);
    
    // 29. Delete progress stats
    await db.delete(progressStats).where(eq(progressStats.userId, userId));
    console.log(`  - Deleted progress stats`);
    
    // 30. Finally, delete the user record itself
    await db.delete(users).where(eq(users.id, userId));
    console.log(`  - Deleted user record`);
    
    console.log(`[STORAGE] Complete user deletion finished for: ${userId}`);
  }

  async deleteCompleteUserByEmail(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    await this.deleteCompleteUser(user.id);
  }

  // Planner Profile operations (for community plan verification)
  async getPlannerProfile(userId: string): Promise<PlannerProfile | undefined> {
    const [profile] = await db.select().from(plannerProfiles).where(eq(plannerProfiles.userId, userId));
    return profile;
  }

  async upsertPlannerProfile(userId: string, profile: InsertPlannerProfile): Promise<PlannerProfile> {
    // Normalize handles: lowercase, remove trailing slashes
    const normalizedProfile = {
      ...profile,
      twitterHandle: profile.twitterHandle?.toLowerCase().replace(/\/$/, ''),
      instagramHandle: profile.instagramHandle?.toLowerCase().replace(/\/$/, ''),
      threadsHandle: profile.threadsHandle?.toLowerCase().replace(/\/$/, ''),
      websiteUrl: profile.websiteUrl?.toLowerCase().replace(/\/$/, ''),
    };

    // Use INSERT ... ON CONFLICT for idempotent upsert
    const [upserted] = await db
      .insert(plannerProfiles)
      .values({ ...normalizedProfile, userId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: plannerProfiles.userId,
        set: { ...normalizedProfile, updatedAt: new Date() },
      })
      .returning();
    
    return upserted;
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
      // Safely handle invalid/missing timestamps
      if (!e.timestamp) return false;
      try {
        const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
        return entryDate === today;
      } catch (error) {
        console.warn(`[JOURNAL] Invalid timestamp in entry:`, e.timestamp);
        return false;
      }
    });
    
    if (todayEntryIndex !== -1) {
      // Merge with existing entry from today
      const existingEntry = categoryEntries[todayEntryIndex];
      
      // Check if the new text is already in the existing entry (duplicate detection)
      const trimmedNewText = entry.text.trim();
      const existingText = existingEntry.text || '';
      const isDuplicate = existingText.includes(trimmedNewText) || trimmedNewText === existingText.trim();
      
      // Combine text with newline (skip if duplicate)
      const combinedText = isDuplicate 
        ? existingEntry.text 
        : existingEntry.text ? `${existingEntry.text}\n${entry.text}` : entry.text;
      
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
    activityId?: string;
    linkedActivityTitle?: string;
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
  async getCommunityPlans(
    userId: string, 
    category?: string, 
    search?: string, 
    limit: number = 50, 
    budgetRange?: string,
    locationFilter?: { lat: number; lon: number; radiusKm?: number }
  ): Promise<Array<Activity & { userHasPinned: boolean; distanceKm?: number }>> {
    const radiusKm = locationFilter?.radiusKm ?? 50; // Default 50km radius
    
    // Build the base query with optional distance calculation
    // Only show live, published community plans
    let queryConditions = and(
      eq(activities.isPublic, true),
      eq(activities.featuredInCommunity, true),
      eq(activities.communityStatus, 'live')
    );

    // Apply category filter
    if (category && category !== 'trending' && category !== 'all') {
      const categoryMap: Record<string, string> = {
        'travel': 'travel',
        'fitness': 'fitness',
        'career': 'career',
        'personal': 'personal'
      };
      const dbCategory = categoryMap[category.toLowerCase()];
      if (dbCategory) {
        queryConditions = and(
          eq(activities.isPublic, true),
          eq(activities.featuredInCommunity, true),
          eq(activities.communityStatus, 'live'),
          eq(activities.category, dbCategory)
        );
      }
    }

    // If location filter is enabled, add distance-based filtering
    if (locationFilter) {
      const { lat, lon } = locationFilter;
      
      // Haversine formula: distance = 6371 * acos(cos(lat1) * cos(lat2) * cos(lon2-lon1) + sin(lat1) * sin(lat2))
      // Only include activities with coordinates within radius
      const distanceFormula = sql<number>`
        6371 * acos(
          cos(radians(${lat})) * cos(radians(${activities.latitude})) * 
          cos(radians(${activities.longitude}) - radians(${lon})) + 
          sin(radians(${lat})) * sin(radians(${activities.latitude}))
        )
      `;
      
      queryConditions = and(
        queryConditions,
        sql`${activities.latitude} IS NOT NULL`,
        sql`${activities.longitude} IS NOT NULL`,
        sql`${distanceFormula} <= ${radiusKm}`
      );
      
      // Query with distance calculation and planner profile data
      const resultsWithDistance = await db
        .select({
          activity: activities,
          distanceKm: distanceFormula,
          plannerProfile: plannerProfiles
        })
        .from(activities)
        .leftJoin(plannerProfiles, eq(activities.plannerProfileId, plannerProfiles.id))
        .where(queryConditions);
      
      const results = resultsWithDistance.map(r => ({
        ...r.activity,
        distanceKm: r.distanceKm,
        // Include planner profile social media URLs for verification badges
        twitterPostUrl: r.plannerProfile?.twitterPostUrl || null,
        instagramPostUrl: r.plannerProfile?.instagramPostUrl || null,
        threadsPostUrl: r.plannerProfile?.threadsPostUrl || null,
        linkedinPostUrl: r.plannerProfile?.linkedinPostUrl || null,
        // Include social handles for profile links
        instagramHandle: r.plannerProfile?.instagramHandle || null,
        twitterHandle: r.plannerProfile?.twitterHandle || null
      }));
      
      return this.applyFiltersAndSort(results, userId, search, budgetRange, category, limit);
    }

    // No location filter - standard query with planner profile data
    const resultsWithProfiles = await db
      .select({
        activity: activities,
        plannerProfile: plannerProfiles
      })
      .from(activities)
      .leftJoin(plannerProfiles, eq(activities.plannerProfileId, plannerProfiles.id))
      .where(queryConditions);
    
    const results = resultsWithProfiles.map(r => ({
      ...r.activity,
      // Include planner profile social media URLs for verification badges
      twitterPostUrl: r.plannerProfile?.twitterPostUrl || null,
      instagramPostUrl: r.plannerProfile?.instagramPostUrl || null,
      threadsPostUrl: r.plannerProfile?.threadsPostUrl || null,
      linkedinPostUrl: r.plannerProfile?.linkedinPostUrl || null,
      // Include social handles for profile links
      instagramHandle: r.plannerProfile?.instagramHandle || null,
      twitterHandle: r.plannerProfile?.twitterHandle || null
    }));
    
    return this.applyFiltersAndSort(results, userId, search, budgetRange, category, limit);
  }

  private async applyFiltersAndSort(
    results: Activity[], 
    userId: string, 
    search?: string, 
    budgetRange?: string, 
    category?: string,
    limit: number = 50
  ): Promise<Array<Activity & { userHasPinned: boolean; distanceKm?: number }>> {

    // Get user's pinned activity IDs
    const userPinRecords = await db.select()
      .from(userPins)
      .where(eq(userPins.userId, userId));
    const pinnedActivityIds = new Set(userPinRecords.map(p => p.activityId));

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      results = results.filter(activity => 
        activity.title?.toLowerCase().includes(searchLower) ||
        activity.description?.toLowerCase().includes(searchLower) ||
        activity.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply budget range filter if provided
    if (budgetRange && budgetRange !== 'all') {
      const budgetRanges: Record<string, {min: number, max: number}> = {
        'free': { min: 0, max: 0 },
        'low': { min: 1, max: 10000 },        // $1-$100
        'medium': { min: 10000, max: 50000 }, // $100-$500
        'high': { min: 50000, max: 100000 },  // $500-$1000
        'premium': { min: 100000, max: Infinity } // $1000+
      };
      
      const range = budgetRanges[budgetRange];
      if (range) {
        results = results.filter(activity => {
          const budget = activity.budget || 0;
          if (budgetRange === 'free') {
            return budget === 0;
          } else if (budgetRange === 'premium') {
            return budget >= range.min;
          } else {
            return budget >= range.min && budget < range.max;
          }
        });
      }
    }

    // Apply trending filter if category is 'trending' (25000+ trending score)
    if (category === 'trending') {
      results = results.filter(activity => (activity.trendingScore || 0) >= 25000);
    }

    // Map results to include userHasPinned
    const resultsWithPins = results.map(activity => ({
      ...activity,
      userHasPinned: pinnedActivityIds.has(activity.id)
    }));

    // Sort by userHasPinned first, then by trendingScore descending
    resultsWithPins.sort((a, b) => {
      if (a.userHasPinned !== b.userHasPinned) {
        return a.userHasPinned ? -1 : 1;
      }
      return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
    });

    return resultsWithPins.slice(0, limit);
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
      
      // Get all community plan activity IDs
      const communityActivities = await db.select({ id: activities.id })
        .from(activities)
        .where(eq(activities.featuredInCommunity, true));
      
      const activityIds = communityActivities.map(a => a.id);
      
      if (activityIds.length > 0) {
        // Delete activity_tasks associations first
        await db.delete(activityTasks)
          .where(inArray(activityTasks.activityId, activityIds));
        
        // Then delete the activities
        await db.delete(activities).where(eq(activities.featuredInCommunity, true));
        
        console.log(`[SEED] Deleted ${activityIds.length} existing community plans`);
      }
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
      
      // Create the activity with shareToken and set as live for community discovery
      const activity = await this.createActivity({
        ...plan.activity,
        userId: demoUser.id,
        shareToken,
        communityStatus: 'live',
        publishedAt: new Date()
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
  
  // Activity Reports (Community Moderation)
  async createActivityReport(report: InsertActivityReport): Promise<ActivityReport> {
    const [newReport] = await db.insert(activityReports).values({
      ...report,
      status: 'pending'
    }).returning();
    return newReport;
  }
  
  async getActivityReports(activityId: string): Promise<ActivityReport[]> {
    const reports = await db.select()
      .from(activityReports)
      .where(eq(activityReports.activityId, activityId))
      .orderBy(desc(activityReports.createdAt));
    return reports;
  }
  
  async getUserReports(userId: string): Promise<ActivityReport[]> {
    const reports = await db.select()
      .from(activityReports)
      .where(eq(activityReports.reportedBy, userId))
      .orderBy(desc(activityReports.createdAt));
    return reports;
  }
  
  async checkDuplicateReport(activityId: string, reportedBy: string): Promise<ActivityReport | undefined> {
    const [report] = await db.select()
      .from(activityReports)
      .where(and(
        eq(activityReports.activityId, activityId),
        eq(activityReports.reportedBy, reportedBy)
      ))
      .limit(1);
    return report;
  }
  
  // Publication Management
  async unpublishActivity(activityId: string, userId: string): Promise<Activity | undefined> {
    // First verify ownership and current status
    const [existing] = await db.select()
      .from(activities)
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .limit(1);
    
    if (!existing) {
      return undefined; // Not found or not owned
    }
    
    // Only unpublish if currently live
    if (existing.communityStatus !== 'live' && !existing.isPublic) {
      return existing; // Already unpublished, return as-is
    }
    
    const [activity] = await db.update(activities)
      .set({
        isPublic: false,
        featuredInCommunity: false,
        communityStatus: 'offline',
        unpublishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .returning();
    return activity;
  }
  
  async republishActivity(activityId: string, userId: string): Promise<Activity | undefined> {
    // First verify ownership and current status
    const [existing] = await db.select()
      .from(activities)
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .limit(1);
    
    if (!existing) {
      return undefined; // Not found or not owned
    }
    
    // Only republish if currently offline or pending changes
    if (existing.communityStatus === 'live' && existing.isPublic) {
      return existing; // Already live, return as-is
    }
    
    // Calculate content hash for change detection
    const crypto = await import('crypto');
    const contentToHash = JSON.stringify({
      title: existing.title,
      description: existing.description,
      planSummary: existing.planSummary,
      category: existing.category
    });
    const contentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
    
    const [activity] = await db.update(activities)
      .set({
        isPublic: true,
        featuredInCommunity: existing.featuredInCommunity || false, // Preserve featured status
        communityStatus: 'live',
        publishedAt: existing.publishedAt || new Date(), // Keep original publish date if exists
        lastPublishedHash: contentHash,
        updatedAt: new Date()
      })
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .returning();
    return activity;
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
  async getUserGroups(userId: string): Promise<Array<Group & { memberCount: number; role: string; tasksCompleted?: number; tasksTotal?: number }>> {
    // Use raw SQL to avoid Drizzle ORM circular reference bug
    const result = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.created_by as "createdBy",
        g.is_private as "isPrivate",
        g.invite_code as "inviteCode",
        g.created_at as "createdAt",
        g.updated_at as "updatedAt",
        gm.role,
        (SELECT COUNT(*) FROM group_memberships WHERE group_id = g.id)::int as "memberCount",
        COALESCE((
          SELECT COUNT(*) FILTER (WHERE t.completed = true)
          FROM group_activities ga
          INNER JOIN activity_tasks at ON ga.activity_id = at.activity_id
          INNER JOIN tasks t ON at.task_id = t.id
          WHERE ga.group_id = g.id
        ), 0)::int as "tasksCompleted",
        COALESCE((
          SELECT COUNT(*)
          FROM group_activities ga
          INNER JOIN activity_tasks at ON ga.activity_id = at.activity_id
          INNER JOIN tasks t ON at.task_id = t.id
          WHERE ga.group_id = g.id
        ), 0)::int as "tasksTotal"
      FROM groups g
      INNER JOIN group_memberships gm ON g.id = gm.group_id
      WHERE gm.user_id = $1`,
      [userId]
    );

    return result.rows as any;
  }

  // Get group details with members
  async getGroupById(groupId: string, userId: string): Promise<any> {
    // Use raw SQL to avoid Drizzle ORM circular reference bug
    // Check if user is a member
    const membershipResult = await pool.query(
      `SELECT role FROM group_memberships 
      WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (membershipResult.rows.length === 0) {
      return null; // User not authorized
    }

    // Get group details
    const groupResult = await pool.query(
      `SELECT 
        id, name, description,
        created_by as "createdBy",
        is_private as "isPrivate",
        invite_code as "inviteCode",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM groups 
      WHERE id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return null;
    }

    // Get all members
    const members = await pool.query(
      `SELECT 
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
      WHERE gm.group_id = $1`,
      [groupId]
    );

    return {
      ...groupResult.rows[0],
      members: members.rows,
      currentUserRole: membershipResult.rows[0].role,
    };
  }

  // Join group by invite code
  async joinGroupByInviteCode(inviteCode: string, userId: string): Promise<any> {
    // Normalize invite code - remove dashes for comparison
    const normalizedCode = inviteCode.toUpperCase().replace(/-/g, '');
    
    // Find group by invite code - need to find the code that matches with or without dashes
    // Query all groups and filter manually since DB stores with dashes
    const allGroups = await db
      .select()
      .from(groups);
    
    const group = allGroups.find(g => {
      if (!g.inviteCode) return false;
      // Normalize both for comparison
      const dbCode = g.inviteCode.toUpperCase().replace(/-/g, '');
      return dbCode === normalizedCode;
    });

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

  // Add member to group (handles duplicates gracefully)
  async addGroupMember(groupId: string, userId: string, role: string): Promise<GroupMembership> {
    // Check if already a member - return existing if so
    const existing = await this.getGroupMembership(groupId, userId);
    if (existing) {
      return existing; // Idempotent - return existing membership instead of throwing
    }

    try {
      const [membership] = await db
        .insert(groupMemberships)
        .values({
          groupId,
          userId,
          role,
        })
        .returning();

      return membership;
    } catch (error: any) {
      // Handle concurrent insert race condition (duplicate key)
      if (error.code === '23505') { // PostgreSQL unique violation
        const existingMembership = await this.getGroupMembership(groupId, userId);
        if (existingMembership) {
          return existingMembership;
        }
      }
      throw error;
    }
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
  async shareActivityToGroup(activityId: string, groupId: string, userId: string, forceUpdate = false): Promise<GroupActivity> {
    // Check if already shared
    const [existing] = await db
      .select()
      .from(groupActivities)
      .where(and(
        eq(groupActivities.groupId, groupId),
        eq(groupActivities.activityId, activityId)
      ));

    if (existing && !forceUpdate) {
      throw new Error('Activity is already shared to this group');
    }
    
    if (existing && forceUpdate) {
      // Return existing if force update requested
      return existing;
    }

    // Get activity details for canonical version
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId));

    if (!activity) {
      throw new Error('Activity not found');
    }

    // Get activity tasks using the join table
    const taskResults = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        category: tasks.category,
        priority: tasks.priority,
        order: activityTasks.order,
      })
      .from(activityTasks)
      .innerJoin(tasks, eq(activityTasks.taskId, tasks.id))
      .where(eq(activityTasks.activityId, activityId))
      .orderBy(activityTasks.order);

    // Create canonical version
    const canonicalVersion = {
      title: activity.title,
      description: activity.description,
      tasks: taskResults.map(task => ({
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
    // Use raw SQL to avoid Drizzle ORM circular reference bug and get task counts
    const groupActivitiesData = await pool.query(
      `SELECT 
        ga.id,
        ga.group_id as "groupId",
        ga.activity_id as "activityId",
        ga.canonical_version as "canonicalVersion",
        ga.is_public as "isPublic",
        ga.created_at as "createdAt",
        ga.created_at as "sharedAt",
        a.title,
        a.description,
        a.category,
        a.status,
        a.user_id as "sharedById",
        u.username as "sharedBy",
        COALESCE(task_counts.total_tasks, 0) as "totalTasks",
        COALESCE(task_counts.completed_tasks, 0) as "completedTasks"
      FROM group_activities ga
      INNER JOIN activities a ON ga.activity_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE t.completed = true) as completed_tasks
        FROM activity_tasks at
        INNER JOIN tasks t ON at.task_id = t.id
        WHERE at.activity_id = ga.activity_id
      ) task_counts ON true
      WHERE ga.group_id = $1
      ORDER BY ga.created_at DESC`,
      [groupId]
    );

    return groupActivitiesData.rows;
  }

  // Remove activity from group
  async removeActivityFromGroup(groupActivityId: string): Promise<void> {
    await db.delete(groupActivities).where(eq(groupActivities.id, groupActivityId));
  }

  // Get activity change logs for a group
  async getGroupActivityChangeLogs(groupId: string): Promise<any[]> {
    // Use raw SQL to get activity change logs with user info
    const logs = await pool.query(
      `SELECT 
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
      WHERE ga.group_id = $1
      ORDER BY acl.timestamp DESC
      LIMIT 50`,
      [groupId]
    );

    return logs.rows.map((log: any) => ({
      id: log.id,
      userId: log.userId,
      username: log.username || `${log.firstName || ''} ${log.lastName || ''}`.trim() || 'Someone',
      activityType: log.changeType === 'task_added' ? 'added' : log.changeType === 'task_edited' ? 'edited' : 'completed',
      description: log.description,
      timestamp: log.timestamp,
    }));
  }

  // Get group progress - calculate completion stats for each group activity
  async getGroupProgress(groupId: string): Promise<Array<{ groupActivityId: string; activityTitle: string; totalTasks: number; completedTasks: number }>> {
    const progressData = await pool.query(
      `SELECT 
        ga.id as "groupActivityId",
        a.title as "activityTitle",
        COUNT(DISTINCT t.id) as "totalTasks",
        COUNT(DISTINCT CASE WHEN t.completed = true THEN t.id END) as "completedTasks"
      FROM group_activities ga
      INNER JOIN activities a ON ga.activity_id = a.id
      INNER JOIN activity_tasks at ON at.activity_id = a.id
      INNER JOIN tasks t ON at.task_id = t.id
      WHERE ga.group_id = $1
      GROUP BY ga.id, a.title
      ORDER BY ga.created_at DESC`,
      [groupId]
    );

    return progressData.rows.map((row: any) => ({
      groupActivityId: row.groupActivityId,
      activityTitle: row.activityTitle,
      totalTasks: Number(row.totalTasks),
      completedTasks: Number(row.completedTasks),
    }));
  }

  // Get group activity feed - recent member actions
  async getGroupActivityFeed(groupId: string, limit = 20): Promise<GroupActivityFeedItem[]> {
    const feedItems = await db
      .select()
      .from(groupActivityFeed)
      .where(eq(groupActivityFeed.groupId, groupId))
      .orderBy(desc(groupActivityFeed.timestamp))
      .limit(limit);

    return feedItems;
  }

  // Log a group activity event
  async logGroupActivity(feedItem: InsertGroupActivityFeedItem): Promise<GroupActivityFeedItem> {
    const [loggedItem] = await db
      .insert(groupActivityFeed)
      .values(feedItem)
      .returning();

    return loggedItem;
  }

  async getGroupActivityByTaskId(taskId: string): Promise<GroupActivity | null> {
    const result = await pool.query(
      `SELECT ga.*
      FROM group_activities ga
      INNER JOIN activity_tasks at ON ga.activity_id = at.activity_id
      WHERE at.task_id = $1
      LIMIT 1`,
      [taskId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getGroupActivityById(groupActivityId: string): Promise<GroupActivity | null> {
    const [result] = await db
      .select()
      .from(groupActivities)
      .where(eq(groupActivities.id, groupActivityId))
      .limit(1);
    
    return result || null;
  }

  async logActivityChange(change: { groupActivityId: string; userId: string; changeType: string; changeDescription: string }): Promise<void> {
    // Get the group activity details to populate the feed
    const groupActivityResult = await pool.query(
      `SELECT ga.group_id, a.title as activity_title
      FROM group_activities ga
      INNER JOIN activities a ON ga.activity_id = a.id
      WHERE ga.id = $1
      LIMIT 1`,
      [change.groupActivityId]
    );

    if (groupActivityResult.rows.length === 0) {
      console.error('Group activity not found for logging');
      return;
    }

    const { group_id: groupId, activity_title: activityTitle } = groupActivityResult.rows[0];

    // Get user info
    const userResult = await pool.query(
      `SELECT username, first_name, last_name
      FROM users
      WHERE id = $1
      LIMIT 1`,
      [change.userId]
    );

    const userName = userResult.rows.length > 0
      ? userResult.rows[0].username || `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim() || 'Someone'
      : 'Someone';

    // Insert into groupActivityFeed with correct field names
    await db.insert(groupActivityFeed).values({
      groupId,
      userId: change.userId,
      userName,
      activityType: change.changeType, // 'task_completed' | 'task_added' | etc.
      activityTitle,
      taskTitle: change.changeDescription, // The task name
      groupActivityId: change.groupActivityId,
    });
  }

  async getMemberProgressForGroupActivity(groupActivityId: string): Promise<Array<{ userId: string; username: string; totalTasks: number; completedTasks: number }>> {
    // Query all activities that are linked to this group activity with sharing enabled
    const result = await pool.query(
      `SELECT 
        a.user_id as "userId",
        u.username,
        a.id as "activityId"
      FROM activities a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.linked_group_activity_id = $1
        AND a.shares_progress_with_group = true`,
      [groupActivityId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    // For each linked activity, get task progress
    const memberProgress = await Promise.all(
      result.rows.map(async (row: any) => {
        const tasks = await this.getActivityTasks(row.activityId, row.userId);
        const completedTasks = tasks.filter(t => t.completed).length;

        return {
          userId: row.userId,
          username: row.username || 'Unknown User',
          totalTasks: tasks.length,
          completedTasks,
        };
      })
    );

    return memberProgress;
  }

  // Get groups for a user with member count and their role
  async getGroupsForUser(userId: string): Promise<Array<Group & { memberCount: number; role: string }>> {
    const userGroups = await pool.query(
      `SELECT 
        g.*,
        gm.role,
        COUNT(DISTINCT gm2.user_id) as "memberCount"
      FROM groups g
      INNER JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN group_memberships gm2 ON g.id = gm2.group_id
      WHERE gm.user_id = $1
      GROUP BY g.id, g.name, g.description, g.invite_code, g.created_by, g.created_at, gm.role
      ORDER BY g.created_at DESC`,
      [userId]
    );

    return userGroups.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      inviteCode: row.invite_code,
      createdBy: row.created_by,
      createdAt: row.created_at,
      memberCount: Number(row.memberCount),
      role: row.role,
    }));
  }

  // Get all members of a group
  async getGroupMembers(groupId: string): Promise<Array<{ userId: string; userName: string; role: string; joinedAt: Date }>> {
    const members = await pool.query(
      `SELECT 
        gm.user_id as "userId",
        COALESCE(u.username, CONCAT(u.first_name, ' ', u.last_name)) as "userName",
        gm.role,
        gm.joined_at as "joinedAt"
      FROM group_memberships gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    return members.rows.map((row: any) => ({
      userId: row.userId,
      userName: row.userName || 'Anonymous',
      role: row.role,
      joinedAt: new Date(row.joinedAt),
    }));
  }

  // === Contact Shares / Invites ===

  // Create a contact share record for phone/email group invite
  async createGroupContactInvite(data: {
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
        sharedBy: data.invitedBy, // Same as invitedBy for group invites
        shareType: 'group',
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

  // Journal Templates
  async getUserJournalTemplates(userId: string): Promise<JournalTemplate[]> {
    return await db
      .select()
      .from(journalTemplates)
      .where(eq(journalTemplates.userId, userId))
      .orderBy(desc(journalTemplates.createdAt));
  }

  async createJournalTemplate(template: InsertJournalTemplate): Promise<JournalTemplate> {
    const [created] = await db
      .insert(journalTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateJournalTemplate(templateId: string, userId: string, updates: Partial<InsertJournalTemplate>): Promise<JournalTemplate | undefined> {
    const [updated] = await db
      .update(journalTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(journalTemplates.id, templateId),
        eq(journalTemplates.userId, userId)
      ))
      .returning();
    return updated;
  }

  async deleteJournalTemplate(templateId: string, userId: string): Promise<void> {
    await db
      .delete(journalTemplates)
      .where(and(
        eq(journalTemplates.id, templateId),
        eq(journalTemplates.userId, userId)
      ));
  }

  // AI Plan Imports (Extension/Mobile)
  async createAiPlanImport(planImport: InsertAiPlanImport & { userId: string }): Promise<AiPlanImport> {
    const [created] = await db
      .insert(aiPlanImports)
      .values(planImport)
      .returning();
    return created;
  }

  async getAiPlanImport(importId: string, userId: string): Promise<AiPlanImport | undefined> {
    const [result] = await db
      .select()
      .from(aiPlanImports)
      .where(and(
        eq(aiPlanImports.id, importId),
        eq(aiPlanImports.userId, userId)
      ));
    return result;
  }

  async getUserAiPlanImports(userId: string, status?: string): Promise<AiPlanImport[]> {
    if (status) {
      return await db
        .select()
        .from(aiPlanImports)
        .where(and(
          eq(aiPlanImports.userId, userId),
          eq(aiPlanImports.status, status)
        ))
        .orderBy(desc(aiPlanImports.createdAt));
    }
    return await db
      .select()
      .from(aiPlanImports)
      .where(eq(aiPlanImports.userId, userId))
      .orderBy(desc(aiPlanImports.createdAt));
  }

  async updateAiPlanImport(importId: string, userId: string, updates: Partial<AiPlanImport>): Promise<AiPlanImport | undefined> {
    const [updated] = await db
      .update(aiPlanImports)
      .set(updates)
      .where(and(
        eq(aiPlanImports.id, importId),
        eq(aiPlanImports.userId, userId)
      ))
      .returning();
    return updated;
  }

  async confirmAiPlanImport(importId: string, userId: string, activityId: string): Promise<AiPlanImport | undefined> {
    const [updated] = await db
      .update(aiPlanImports)
      .set({
        status: 'confirmed',
        activityId,
        confirmedAt: new Date()
      })
      .where(and(
        eq(aiPlanImports.id, importId),
        eq(aiPlanImports.userId, userId)
      ))
      .returning();
    return updated;
  }

  async discardAiPlanImport(importId: string, userId: string): Promise<void> {
    await db
      .update(aiPlanImports)
      .set({ status: 'discarded' })
      .where(and(
        eq(aiPlanImports.id, importId),
        eq(aiPlanImports.userId, userId)
      ));
  }

  async getUserMonthlyImportCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiPlanImports)
      .where(and(
        eq(aiPlanImports.userId, userId),
        sql`${aiPlanImports.createdAt} >= ${startOfMonth}`
      ));
    return result[0]?.count || 0;
  }

  // Extension Tokens
  async createExtensionToken(token: InsertExtensionToken & { userId: string }): Promise<ExtensionToken> {
    const [created] = await db
      .insert(extensionTokens)
      .values(token)
      .returning();
    return created;
  }

  async getExtensionToken(token: string): Promise<ExtensionToken | undefined> {
    const [result] = await db
      .select()
      .from(extensionTokens)
      .where(and(
        eq(extensionTokens.token, token),
        eq(extensionTokens.isActive, true)
      ));
    return result;
  }

  async getUserExtensionTokens(userId: string): Promise<ExtensionToken[]> {
    return await db
      .select()
      .from(extensionTokens)
      .where(eq(extensionTokens.userId, userId))
      .orderBy(desc(extensionTokens.createdAt));
  }

  async updateExtensionTokenActivity(token: string): Promise<void> {
    await db
      .update(extensionTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(extensionTokens.token, token));
  }

  async revokeExtensionToken(tokenId: string, userId: string): Promise<void> {
    await db
      .update(extensionTokens)
      .set({ isActive: false })
      .where(and(
        eq(extensionTokens.id, tokenId),
        eq(extensionTokens.userId, userId)
      ));
  }

  async revokeAllExtensionTokens(userId: string): Promise<void> {
    await db
      .update(extensionTokens)
      .set({ isActive: false })
      .where(eq(extensionTokens.userId, userId));
  }

  // URL Content Cache
  async getUrlContentCache(normalizedUrl: string): Promise<UrlContentCache | undefined> {
    const [result] = await db
      .select()
      .from(urlContentCache)
      .where(eq(urlContentCache.normalizedUrl, normalizedUrl));
    return result;
  }

  async createUrlContentCache(cache: InsertUrlContentCache): Promise<UrlContentCache> {
    const [created] = await db
      .insert(urlContentCache)
      .values(cache)
      .onConflictDoUpdate({
        target: urlContentCache.normalizedUrl,
        set: {
          extractedContent: cache.extractedContent,
          extractionSource: cache.extractionSource,
          wordCount: cache.wordCount,
          metadata: cache.metadata,
          extractedAt: new Date(),
        }
      })
      .returning();
    return created;
  }

  // User Saved Content
  async createUserSavedContent(content: InsertUserSavedContent): Promise<UserSavedContent> {
    const [created] = await db
      .insert(userSavedContent)
      .values(content)
      .returning();
    return created;
  }

  async getUserSavedContent(userId: string, filters?: {
    city?: string;
    location?: string;
    category?: string;
    platform?: string;
    limit?: number;
  }): Promise<UserSavedContent[]> {
    const conditions = [eq(userSavedContent.userId, userId)];
    
    if (filters?.city) {
      conditions.push(sql`LOWER(${userSavedContent.city}) LIKE LOWER(${'%' + filters.city + '%'})`);
    }
    if (filters?.location) {
      conditions.push(sql`LOWER(${userSavedContent.location}) LIKE LOWER(${'%' + filters.location + '%'})`);
    }
    if (filters?.category) {
      conditions.push(eq(userSavedContent.category, filters.category));
    }
    if (filters?.platform) {
      conditions.push(eq(userSavedContent.platform, filters.platform));
    }

    let query = db
      .select()
      .from(userSavedContent)
      .where(and(...conditions))
      .orderBy(desc(userSavedContent.savedAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async getUserSavedContentById(contentId: string, userId: string): Promise<UserSavedContent | undefined> {
    const [result] = await db
      .select()
      .from(userSavedContent)
      .where(and(
        eq(userSavedContent.id, contentId),
        eq(userSavedContent.userId, userId)
      ));
    return result;
  }

  async updateUserSavedContent(contentId: string, userId: string, updates: Partial<InsertUserSavedContent>): Promise<UserSavedContent | undefined> {
    const [updated] = await db
      .update(userSavedContent)
      .set(updates)
      .where(and(
        eq(userSavedContent.id, contentId),
        eq(userSavedContent.userId, userId)
      ))
      .returning();
    return updated;
  }

  async deleteUserSavedContent(contentId: string, userId: string): Promise<void> {
    await db
      .delete(userSavedContent)
      .where(and(
        eq(userSavedContent.id, contentId),
        eq(userSavedContent.userId, userId)
      ));
  }

  async incrementContentReferenceCount(contentId: string): Promise<void> {
    await db
      .update(userSavedContent)
      .set({
        referenceCount: sql`${userSavedContent.referenceCount} + 1`,
        lastReferencedAt: new Date()
      })
      .where(eq(userSavedContent.id, contentId));
  }

  async getUserSavedLocations(userId: string): Promise<Array<{ city: string; country: string | null; count: number }>> {
    const results = await db
      .select({
        city: userSavedContent.city,
        country: userSavedContent.country,
        count: sql<number>`COUNT(*)::int`
      })
      .from(userSavedContent)
      .where(and(
        eq(userSavedContent.userId, userId),
        sql`${userSavedContent.city} IS NOT NULL`
      ))
      .groupBy(userSavedContent.city, userSavedContent.country)
      .orderBy(sql`COUNT(*) DESC`);
    
    return results.filter(r => r.city !== null) as Array<{ city: string; country: string | null; count: number }>;
  }

  async getUserSavedCategories(userId: string): Promise<Array<{ category: string; count: number }>> {
    const results = await db
      .select({
        category: userSavedContent.category,
        count: sql<number>`COUNT(*)::int`
      })
      .from(userSavedContent)
      .where(and(
        eq(userSavedContent.userId, userId),
        sql`${userSavedContent.category} IS NOT NULL`
      ))
      .groupBy(userSavedContent.category)
      .orderBy(sql`COUNT(*) DESC`);
    
    return results.filter(r => r.category !== null) as Array<{ category: string; count: number }>;
  }

  // Content Imports (stores ALL extracted items from URL for alternatives/swapping)
  async createContentImport(contentImport: InsertContentImport): Promise<ContentImport> {
    const [created] = await db
      .insert(contentImports)
      .values(contentImport)
      .returning();
    return created;
  }

  async getContentImport(importId: string, userId: string): Promise<ContentImport | undefined> {
    const [result] = await db
      .select()
      .from(contentImports)
      .where(and(
        eq(contentImports.id, importId),
        eq(contentImports.userId, userId)
      ));
    return result;
  }

  async getContentImportByNormalizedUrl(normalizedUrl: string, userId: string): Promise<ContentImport | undefined> {
    const [result] = await db
      .select()
      .from(contentImports)
      .where(and(
        eq(contentImports.normalizedUrl, normalizedUrl),
        eq(contentImports.userId, userId)
      ))
      .orderBy(desc(contentImports.createdAt))
      .limit(1);
    return result;
  }

  async getContentImportByActivityId(activityId: string): Promise<ContentImport | undefined> {
    const [result] = await db
      .select()
      .from(contentImports)
      .where(eq(contentImports.activityId, activityId));
    return result;
  }

  async updateContentImport(importId: string, userId: string, updates: Partial<InsertContentImport>): Promise<ContentImport | undefined> {
    const [updated] = await db
      .update(contentImports)
      .set(updates)
      .where(and(
        eq(contentImports.id, importId),
        eq(contentImports.userId, userId)
      ))
      .returning();
    return updated;
  }

  async getAlternativesFromImport(importId: string, excludeTaskIds?: string[]): Promise<Array<{
    id: string;
    venueName: string;
    venueType: string;
    location?: { city?: string; neighborhood?: string };
    priceRange?: string;
    budgetTier?: string;
    estimatedCost?: number;
    category?: string;
  }>> {
    const [importData] = await db
      .select()
      .from(contentImports)
      .where(eq(contentImports.id, importId));
    
    if (!importData || !importData.extractedItems) {
      return [];
    }

    // Filter out items that were selected for the plan (have a taskId in excludeTaskIds)
    const alternatives = (importData.extractedItems as Array<any>).filter(item => {
      // Exclude items that are linked to excluded tasks
      if (excludeTaskIds && item.taskId && excludeTaskIds.includes(item.taskId)) {
        return false;
      }
      // Include items that weren't selected for the plan
      return !item.selectedForPlan || (excludeTaskIds && !excludeTaskIds.includes(item.taskId));
    });

    return alternatives.map(item => ({
      id: item.id,
      venueName: item.venueName,
      venueType: item.venueType,
      location: item.location,
      priceRange: item.priceRange,
      budgetTier: item.budgetTier,
      estimatedCost: item.estimatedCost,
      category: item.category
    }));
  }

  // Mobile Auth Token functions (for OAuth deep link flow)
  async createMobileAuthToken(userId: number, token: string): Promise<void> {
    mobileAuthTokens.set(token, {
      userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });
    console.log(`[MOBILE_AUTH] Created token for user ${userId}, expires in 5 min`);
  }

  async consumeMobileAuthToken(token: string): Promise<{ userId: number } | null> {
    const record = mobileAuthTokens.get(token);
    if (!record) {
      console.log('[MOBILE_AUTH] Token not found');
      return null;
    }
    if (record.expiresAt < new Date()) {
      mobileAuthTokens.delete(token);
      console.log('[MOBILE_AUTH] Token expired');
      return null;
    }
    mobileAuthTokens.delete(token); // One-time use
    console.log(`[MOBILE_AUTH] Token consumed for user ${record.userId}`);
    return { userId: record.userId };
  }
}

export const storage = new DatabaseStorage();
