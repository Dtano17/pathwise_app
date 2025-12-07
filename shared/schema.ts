import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with enhanced profile for personalization
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  password: text("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Authentication type
  authenticationType: text("authentication_type").default("local"),
  
  // Enhanced profile fields for personalization
  age: integer("age"),
  occupation: text("occupation"),
  location: text("location"),
  timezone: text("timezone").default("UTC"),
  
  // Lifestyle preferences
  workingHours: jsonb("working_hours").$type<{start: string; end: string; days: string[]}>(),
  fitnessLevel: text("fitness_level"), // 'beginner' | 'intermediate' | 'advanced'
  sleepSchedule: jsonb("sleep_schedule").$type<{bedtime: string; wakeup: string}>(),
  
  // Goal preferences
  primaryGoalCategories: jsonb("primary_goal_categories").$type<string[]>().default([]), // ['health', 'work', 'personal', etc.]
  motivationStyle: text("motivation_style"), // 'achievement' | 'progress' | 'social' | 'rewards'
  difficultyPreference: text("difficulty_preference").default("medium"), // 'easy' | 'medium' | 'challenging'
  
  // Personality insights
  interests: jsonb("interests").$type<string[]>().default([]),
  personalityType: text("personality_type"), // Optional: MBTI, Enneagram, etc.
  communicationStyle: text("communication_style"), // 'direct' | 'encouraging' | 'detailed' | 'brief'
  
  // Style and lifestyle preferences for conversational planning
  stylePreferences: jsonb("style_preferences").$type<{
    casualOutfit?: string;
    workOutfit?: string;
    dateOutfit?: string;
    favoriteColors?: string[];
    preferredBrands?: string[];
    bodyType?: string;
    stylePersonality?: 'classic' | 'trendy' | 'bohemian' | 'minimalist' | 'edgy' | 'romantic';
  }>(),
  transportationPreferences: jsonb("transportation_preferences").$type<{
    preferredMethods?: ('driving' | 'rideshare' | 'public' | 'walking' | 'biking' | 'flying')[];
    hasVehicle?: boolean;
    preferredRideServices?: string[];
    environmentalPriority?: 'high' | 'medium' | 'low';
  }>(),
  lifestyleContext: jsonb("lifestyle_context").$type<{
    currentMood?: string;
    energyLevel?: 'high' | 'medium' | 'low';
    socialPreference?: 'solo' | 'small_group' | 'large_group' | 'flexible';
    budgetRange?: { min: number; max: number; currency: string };
    typicalWeatherResponse?: string;
    planningHorizon?: 'spontaneous' | 'same_day' | 'few_days' | 'week_ahead' | 'month_ahead';
  }>(),
  
  // Context for AI personalization
  aboutMe: text("about_me"), // Free-form description
  currentChallenges: jsonb("current_challenges").$type<string[]>().default([]),
  successFactors: jsonb("success_factors").$type<string[]>().default([]),
  
  // Onboarding
  hasCompletedTutorial: boolean("has_completed_tutorial").default(false),
  
  // Gamification & Creator Stats
  creatorPoints: integer("creator_points").default(0),
  creatorBadges: jsonb("creator_badges").$type<string[]>().default([]),
  creatorLevel: varchar("creator_level").default("bronze"), // 'bronze' | 'silver' | 'gold' | 'platinum'
  totalPlansCreated: integer("total_plans_created").default(0),
  totalLikesReceived: integer("total_likes_received").default(0),
  totalCopiesReceived: integer("total_copies_received").default(0),
  
  // Subscription & Billing
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free' | 'pro' | 'family'
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active' | 'canceled' | 'past_due' | 'trialing'
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  planCount: integer("plan_count").default(0), // Monthly AI plan count
  planCountResetDate: timestamp("plan_count_reset_date"), // When to reset planCount
  trialEndsAt: timestamp("trial_ends_at"), // 7-day trial end date
  subscriptionEndsAt: timestamp("subscription_ends_at"), // For canceled subscriptions
  
  // User role for special plan publishing (emergency/sponsored)
  userRole: varchar("user_role").default("standard"), // 'standard' | 'government' | 'sponsor' | 'admin'
  organizationName: text("organization_name"), // Organization/agency name for government/sponsor users
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high'
  createdAt: timestamp("created_at").defaultNow(),
});


export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  goalId: varchar("goal_id").references(() => goals.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high'
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  timeEstimate: text("time_estimate"), // "15 min" | "30 min" | "1 hour" | "2 hours"
  cost: integer("cost"), // Optional cost associated with this task (in cents)
  costNotes: text("cost_notes"), // Details about the cost (e.g., "Round-trip flight LAX-NYC")
  context: text("context"), // Why this task matters and tips for success
  archived: boolean("archived").default(false),
  skipped: boolean("skipped").default(false),
  snoozeUntil: timestamp("snooze_until"),
  originalTaskId: varchar("original_task_id"), // Track original task when copying shared activities
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  mood: text("mood").notNull(), // 'great' | 'good' | 'okay' | 'poor'
  reflection: text("reflection"),
  completedTasks: jsonb("completed_tasks").$type<string[]>().default([]),
  missedTasks: jsonb("missed_tasks").$type<string[]>().default([]),
  achievements: jsonb("achievements").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const progressStats = pgTable("progress_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  completedCount: integer("completed_count").default(0),
  totalCount: integer("total_count").default(0),
  categories: jsonb("categories").$type<{name: string; completed: number; total: number}[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatImports = pgTable("chat_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  source: text("source").notNull(), // 'chatgpt' | 'claude' | 'manual'
  conversationTitle: text("conversation_title"),
  chatHistory: jsonb("chat_history").$type<Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>>().notNull(),
  extractedGoals: jsonb("extracted_goals").$type<string[]>().default([]),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User priorities for personalized planning
export const priorities = pgTable("priorities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'health' | 'family' | 'work' | 'personal' | 'spiritual' | 'social'
  importance: text("importance").notNull(), // 'high' | 'medium' | 'low'
  createdAt: timestamp("created_at").defaultNow(),
});

// Groups for shared goals and collaborative tracking
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  isPrivate: boolean("is_private").default(false),
  inviteCode: varchar("invite_code").unique(), // Optional invite code for joining
  trackingEnabled: boolean("tracking_enabled").default(true), // Enable activity tracking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group memberships to track users in groups
export const groupMemberships = pgTable("group_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // 'admin' | 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  uniqueGroupUser: index("unique_group_user").on(table.groupId, table.userId),
}));

// Shared goals that belong to groups
export const sharedGoals = pgTable("shared_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Individual task assignments within shared goals
export const sharedTasks = pgTable("shared_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sharedGoalId: varchar("shared_goal_id").references(() => sharedGoals.id, { onDelete: "cascade" }),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "cascade" }), // Who this task is assigned to
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "cascade" }), // Who created this task
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  priority: text("priority").notNull(), // 'low' | 'medium' | 'high'
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Group activities - links activities to groups for collaborative tracking
export const groupActivities = pgTable("group_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  canonicalVersion: jsonb("canonical_version").$type<{
    title: string;
    description?: string;
    tasks: Array<{id: string; title: string; description?: string; category: string; priority: string; order: number}>;
    timeline?: any[];
  }>().notNull(), // Admin-controlled canonical version
  isPublic: boolean("is_public").default(false),
  shareToken: varchar("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueGroupActivity: uniqueIndex("unique_group_activity").on(table.groupId, table.activityId),
  groupActivityIndex: index("group_activity_index").on(table.groupId),
}));

// Permanent share links - persists share tokens and snapshots even if original activity is deleted
export const shareLinks = pgTable("share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareToken: varchar("share_token").unique().notNull(),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }), // Nullable - activity may be deleted
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }).notNull(), // Who created the share
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }), // If shared to/from a group
  snapshotData: jsonb("snapshot_data").$type<{
    title: string;
    description?: string;
    category: string;
    planSummary?: string;
    backdrop?: string;
    shareTitle?: string;
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      category: string;
      priority: string;
      order: number;
    }>;
    groupInfo?: {
      id: string;
      name: string;
      description?: string;
      memberCount: number;
    };
  }>().notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(), // When the snapshot was taken
  activityUpdatedAt: timestamp("activity_updated_at"), // Last known activity update time for comparison
  isActivityDeleted: boolean("is_activity_deleted").default(false), // Track if original was deleted
  viewCount: integer("view_count").default(0),
  copyCount: integer("copy_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  shareTokenIndex: uniqueIndex("share_token_index").on(table.shareToken),
  activityShareIndex: index("activity_share_index").on(table.activityId),
  userShareIndex: index("user_share_index").on(table.userId),
}));

// Activity change proposals from group contributors
export const activityChangeProposals = pgTable("activity_change_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupActivityId: varchar("group_activity_id").references(() => groupActivities.id, { onDelete: "cascade" }).notNull(),
  proposedBy: varchar("proposed_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  changeType: text("change_type").notNull(), // 'task_add' | 'task_edit' | 'task_delete' | 'activity_edit' | 'timeline_edit'
  taskId: varchar("task_id"), // Reference to task if change is task-related
  proposedChanges: jsonb("proposed_changes").$type<{
    field?: string;
    oldValue?: any;
    newValue?: any;
    taskData?: any; // Full task data for adds/edits
  }>().notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  proposalNote: text("proposal_note"), // Optional note from contributor
  adminResponse: text("admin_response"), // Optional response from admin
  proposedAt: timestamp("proposed_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  groupActivityProposalIndex: index("group_activity_proposal_index").on(table.groupActivityId, table.status),
  proposerIndex: index("proposer_index").on(table.proposedBy),
}));

// Activity change log for tracking all changes in group activities
export const activityChangeLogs = pgTable("activity_change_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupActivityId: varchar("group_activity_id").references(() => groupActivities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  changeType: text("change_type").notNull(), // 'task_added' | 'task_edited' | 'task_deleted' | 'activity_updated' | 'timeline_updated'
  changeDescription: text("change_description").notNull(), // Human-readable description
  changeData: jsonb("change_data").$type<{
    taskId?: string;
    taskTitle?: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
  }>(),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  groupActivityLogIndex: index("group_activity_log_index").on(table.groupActivityId, table.timestamp),
  userActivityLogIndex: index("user_activity_log_index").on(table.userId),
}));

// Group activity feed - tracks member actions for the activity feed (task completions, additions, etc.)
export const groupActivityFeed = pgTable("group_activity_feed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  userName: text("user_name").notNull(), // Denormalized for faster queries
  activityType: text("activity_type").notNull(), // 'task_completed' | 'task_added' | 'activity_shared'
  activityTitle: text("activity_title"), // Title of the group activity/plan
  taskTitle: text("task_title"), // Title of the task (for task-related events)
  groupActivityId: varchar("group_activity_id").references(() => groupActivities.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  groupFeedIndex: index("group_feed_index").on(table.groupId, table.timestamp),
  userFeedIndex: index("user_feed_index").on(table.userId),
}));

// Zod schemas for validation
// Signup schema - essential fields only for initial registration with strong validation
export const signupUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  firstName: true,
  lastName: true,
}).extend({
  email: z.string().email('Please enter a valid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (!@#$%^&*)'),
});

// Profile completion schema - for enhanced personalization after signup
export const profileCompletionSchema = createInsertSchema(users).pick({
  age: true,
  occupation: true,
  location: true,
  workingHours: true,
  fitnessLevel: true,
  sleepSchedule: true,
  primaryGoalCategories: true,
  motivationStyle: true,
  difficultyPreference: true,
  interests: true,
  communicationStyle: true,
  aboutMe: true,
  currentChallenges: true,
  successFactors: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
  completedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressStatsSchema = createInsertSchema(progressStats).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertChatImportSchema = createInsertSchema(chatImports).omit({
  id: true,
  userId: true,
  createdAt: true,
  processedAt: true,
});

export const insertPrioritySchema = createInsertSchema(priorities).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdBy: true, // Set server-side from authenticated user
  createdAt: true,
  updatedAt: true,
});

export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).omit({
  id: true,
  userId: true, // Set server-side from authenticated user
  joinedAt: true,
});

export const insertSharedGoalSchema = createInsertSchema(sharedGoals).omit({
  id: true,
  createdBy: true, // Set server-side from authenticated user
  createdAt: true,
});

export const insertSharedTaskSchema = createInsertSchema(sharedTasks).omit({
  id: true,
  createdBy: true, // Set server-side from authenticated user
  createdAt: true,
  completedAt: true,
});

export const insertGroupActivitySchema = createInsertSchema(groupActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShareLinkSchema = createInsertSchema(shareLinks).omit({
  id: true,
  viewCount: true,
  copyCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityChangeProposalSchema = createInsertSchema(activityChangeProposals).omit({
  id: true,
  proposedBy: true, // Set server-side from authenticated user
  proposedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  createdAt: true,
});

export const insertActivityChangeLogSchema = createInsertSchema(activityChangeLogs).omit({
  id: true,
  userId: true, // Set server-side from authenticated user
  timestamp: true,
});

// Notification preferences for users
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  enableBrowserNotifications: boolean("enable_browser_notifications").default(true),
  enableTaskReminders: boolean("enable_task_reminders").default(true),
  enableDeadlineWarnings: boolean("enable_deadline_warnings").default(true),
  enableDailyPlanning: boolean("enable_daily_planning").default(false),
  enableGroupNotifications: boolean("enable_group_notifications").default(true), // Group activity updates
  notifyAdminOnChanges: boolean("notify_admin_on_changes").default(true), // When user makes changes to group activities
  reminderLeadTime: integer("reminder_lead_time").default(30), // minutes before task
  dailyPlanningTime: text("daily_planning_time").default("09:00"), // HH:MM format
  quietHoursStart: text("quiet_hours_start").default("22:00"), // HH:MM format
  quietHoursEnd: text("quiet_hours_end").default("08:00"), // HH:MM format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheduled reminders for tasks
export const taskReminders = pgTable("task_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reminderType: text("reminder_type").notNull(), // 'deadline' | 'daily' | 'custom'
  scheduledAt: timestamp("scheduled_at").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduled reminders for activities/plans
export const activityReminders = pgTable("activity_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reminderType: text("reminder_type").notNull(), // 'one_week' | 'three_days' | 'one_day' | 'morning_of' | 'custom'
  scheduledAt: timestamp("scheduled_at").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  metadata: jsonb("metadata").$type<{
    activityTitle?: string;
    location?: string;
    weatherInfo?: string;
    contextualTips?: string[];
  }>().default({}),
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activityIdIndex: index("activity_reminders_activity_id_index").on(table.activityId),
  userIdScheduledIndex: index("activity_reminders_user_scheduled_index").on(table.userId, table.scheduledAt),
  pendingIndex: index("activity_reminders_pending_index").on(table.isSent, table.scheduledAt),
}));

// User notifications for in-app alerts
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sourceGroupId: varchar("source_group_id").references(() => groups.id, { onDelete: "cascade" }), // Optional: group that triggered notification
  actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }), // Optional: user who caused the event
  type: text("type").notNull(), // 'group_member_joined' | 'activity_shared' | etc.
  title: text("title").notNull(),
  body: text("body"),
  metadata: jsonb("metadata").$type<{
    activityTitle?: string;
    viaShareLink?: boolean;
    groupName?: string;
    [key: string]: any;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => ({
  userIdReadAtIndex: index("user_notifications_user_id_read_at_index").on(table.userId, table.readAt),
}));

// Device tokens for push notifications (FCM/APNs)
export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(), // FCM/APNs device token
  platform: text("platform").notNull(), // 'ios' | 'android' | 'web'
  deviceInfo: jsonb("device_info").$type<{
    model?: string;
    osVersion?: string;
    appVersion?: string;
  }>(),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("device_tokens_user_id_index").on(table.userId),
  tokenIndex: index("device_tokens_token_index").on(table.token),
}));

// Smart scheduling suggestions
export const schedulingSuggestions = pgTable("scheduling_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  suggestionType: text("suggestion_type").notNull(), // 'daily' | 'weekly' | 'priority_based'
  targetDate: text("target_date").notNull(), // YYYY-MM-DD format
  suggestedTasks: jsonb("suggested_tasks").$type<{
    taskId: string;
    title: string;
    priority: string;
    estimatedTime: string;
    suggestedStartTime: string; // HH:MM format
    reason: string;
  }[]>().default([]),
  score: integer("score").default(0), // Algorithm confidence score 0-100
  accepted: boolean("accepted").default(false),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add schemas and types for the new tables
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskReminderSchema = createInsertSchema(taskReminders).omit({
  id: true,
  userId: true,
  createdAt: true,
  sentAt: true,
});

export const insertActivityReminderSchema = createInsertSchema(activityReminders).omit({
  id: true,
  userId: true,
  createdAt: true,
  sentAt: true,
  isSent: true,
});

export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertDeviceTokenSchema = createInsertSchema(deviceTokens).omit({
  id: true,
  userId: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertSchedulingSuggestionSchema = createInsertSchema(schedulingSuggestions).omit({
  id: true,
  userId: true,
  createdAt: true,
  acceptedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type ProfileCompletion = z.infer<typeof profileCompletionSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type ProgressStats = typeof progressStats.$inferSelect;
export type InsertProgressStats = z.infer<typeof insertProgressStatsSchema>;

export type ChatImport = typeof chatImports.$inferSelect;
export type InsertChatImport = z.infer<typeof insertChatImportSchema>;

export type Priority = typeof priorities.$inferSelect;
export type InsertPriority = z.infer<typeof insertPrioritySchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMembership = typeof groupMemberships.$inferSelect;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;

export type SharedGoal = typeof sharedGoals.$inferSelect;
export type InsertSharedGoal = z.infer<typeof insertSharedGoalSchema>;

export type SharedTask = typeof sharedTasks.$inferSelect;
export type InsertSharedTask = z.infer<typeof insertSharedTaskSchema>;

export type GroupActivity = typeof groupActivities.$inferSelect;
export type InsertGroupActivity = z.infer<typeof insertGroupActivitySchema>;

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;

export type ActivityChangeProposal = typeof activityChangeProposals.$inferSelect;
export type InsertActivityChangeProposal = z.infer<typeof insertActivityChangeProposalSchema>;

export type ActivityChangeLog = typeof activityChangeLogs.$inferSelect;
export type InsertActivityChangeLog = z.infer<typeof insertActivityChangeLogSchema>;

export const insertGroupActivityFeedSchema = createInsertSchema(groupActivityFeed).omit({
  id: true,
  timestamp: true,
});
export type GroupActivityFeedItem = typeof groupActivityFeed.$inferSelect;
export type InsertGroupActivityFeedItem = z.infer<typeof insertGroupActivityFeedSchema>;

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

export type TaskReminder = typeof taskReminders.$inferSelect;
export type InsertTaskReminder = z.infer<typeof insertTaskReminderSchema>;

export type ActivityReminder = typeof activityReminders.$inferSelect;
export type InsertActivityReminder = z.infer<typeof insertActivityReminderSchema>;

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;

export type SchedulingSuggestion = typeof schedulingSuggestions.$inferSelect;
export type InsertSchedulingSuggestion = z.infer<typeof insertSchedulingSuggestionSchema>;

// Lifestyle Planner Session for conversational planning
export const lifestylePlannerSessions = pgTable("lifestyle_planner_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionState: text("session_state").notNull().default("intake"), // 'intake' | 'gathering' | 'confirming' | 'planning' | 'completed'
  userConfirmedAdd: boolean("user_confirmed_add").notNull().default(false),
  
  // Collected context slots
  slots: jsonb("slots").$type<{
    // Required slots
    activityType?: string;
    location?: { current?: string; destination?: string; type?: 'indoor' | 'outdoor' | 'mixed' };
    timing?: { departureTime?: string; arrivalTime?: string; date?: string; duration?: string };
    vibe?: string;
    transportation?: 'driving' | 'rideshare' | 'public' | 'walking' | 'biking' | 'flying';
    
    // Optional context slots
    outfit?: { style?: string; formality?: 'casual' | 'smart_casual' | 'formal' | 'athletic'; weather_appropriate?: boolean };
    budget?: { range?: string; priority?: 'strict' | 'flexible' };
    companions?: { count?: number; relationships?: string[]; preferences?: string };
    weatherConsiderations?: { conditions?: string; temperature?: number; preparation?: string[] };
    trafficConsiderations?: { peak_time?: boolean; alternate_routes?: boolean; buffer_time?: number };
    mood?: string;
    energyLevel?: 'high' | 'medium' | 'low';
    constraints?: string[];
    
    // Internal generated plan storage
    _generatedPlan?: any;
  }>().default({}),
  
  // External context gathered from APIs
  externalContext: jsonb("external_context").$type<{
    weather?: {
      current?: { temperature: number; condition: string; humidity: number };
      forecast?: { temperature: number; condition: string; time: string }[];
    };
    traffic?: {
      current_conditions?: string;
      estimated_travel_time?: number;
      suggested_departure?: string;
    };
    location?: {
      current_location?: { lat: number; lng: number; address: string };
      destination_details?: { type: string; hours: string; rating?: number };
    };
    // Question counting, mode tracking, and first interaction flag
    isFirstInteraction?: boolean;
    questionCount?: {
      smart: number;
      quick: number;
    };
    currentMode?: 'smart' | 'quick';
    
    // Plan confirmation state
    planConfirmed?: boolean;
    awaitingPlanConfirmation?: boolean;
  }>().default({}),
  
  // Conversation history
  conversationHistory: jsonb("conversation_history").$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: 'question' | 'answer' | 'clarification' | 'confirmation';
  }>>().default([]),
  
  // Generated plan (once complete)
  generatedPlan: jsonb("generated_plan").$type<{
    title?: string;
    summary?: string;
    timeline?: Array<{
      time: string;
      activity: string;
      location?: string;
      notes?: string;
      outfit_suggestion?: string;
    }>;
    tasks?: Array<{
      title: string;
      description: string;
      category: string;
      priority: 'high' | 'medium' | 'low';
      timeEstimate?: string;
    }>;
    outfit_recommendations?: Array<{
      occasion: string;
      suggestion: string;
      weather_notes?: string;
    }>;
    tips?: string[];
  }>(),
  
  // Status tracking
  isComplete: boolean("is_complete").default(false),
  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas and types for lifestyle planner
export const insertLifestylePlannerSessionSchema = createInsertSchema(lifestylePlannerSessions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  lastInteractionAt: true,
});

export type LifestylePlannerSession = typeof lifestylePlannerSessions.$inferSelect;
export type InsertLifestylePlannerSession = z.infer<typeof insertLifestylePlannerSessionSchema>;


// Authentication identities for multi-provider support
export const authIdentities = pgTable("auth_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // 'google' | 'facebook' | 'apple' | 'instagram' | 'replit'
  providerUserId: varchar("provider_user_id").notNull(),
  email: varchar("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueProviderUser: uniqueIndex("unique_provider_user").on(table.provider, table.providerUserId),
}));

// External OAuth tokens for API access (server-only)
export const externalOAuthTokens = pgTable("external_oauth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // 'google' | 'facebook' | 'apple' | 'instagram'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserProvider: uniqueIndex("unique_user_provider_token").on(table.userId, table.provider),
}));

// Synced contacts for sharing invitations
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  source: text("source").notNull(), // 'google' | 'facebook' | 'manual'
  externalId: varchar("external_id"),
  name: text("name").notNull(),
  emails: jsonb("emails").$type<string[]>().default([]),
  phones: jsonb("phones").$type<string[]>().default([]),
  photoUrl: varchar("photo_url"),
  matchedUserId: varchar("matched_user_id").references(() => users.id), // Matched JournalMate user
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerSourceIndex: index("owner_source_index").on(table.ownerUserId, table.source),
  matchedUserIndex: index("matched_user_index").on(table.matchedUserId),
  // Unique constraint for synced contacts (handles nulls properly)
  uniqueSyncedContact: uniqueIndex("unique_synced_contact").on(table.ownerUserId, table.source, table.externalId),
}));

// Contact shares for tracking app invitations and shared activities
export const contactShares = pgTable("contact_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }), // Nullable for external invites
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "cascade" }), // For group invites
  sharedBy: varchar("shared_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  shareType: text("share_type").notNull(), // 'app_invitation' | 'activity' | 'group'
  
  // External contact fields (for inviting non-users)
  contactType: text("contact_type"), // 'email' | 'phone' - for external invites
  contactValue: text("contact_value"), // Email address or phone number
  
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }), // Optional: specific activity shared
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }), // Optional: specific group shared
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'expired'
  invitationMessage: text("invitation_message"),
  inviteMessage: text("invite_message"), // Custom message for group invites
  sharedAt: timestamp("shared_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactValueIndex: index("contact_value_index").on(table.contactValue, table.status),
  sharedByIndex: index("shared_by_index").on(table.sharedBy, table.shareType),
}));

// Planner profiles for community plan verification
export const plannerProfiles = pgTable("planner_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  twitterHandle: varchar("twitter_handle"),
  instagramHandle: varchar("instagram_handle"),
  threadsHandle: varchar("threads_handle"),
  websiteUrl: varchar("website_url"),
  // Social media post URLs for verification
  twitterPostUrl: varchar("twitter_post_url"),
  instagramPostUrl: varchar("instagram_post_url"),
  threadsPostUrl: varchar("threads_post_url"),
  linkedinPostUrl: varchar("linkedin_post_url"),
  verificationStatus: text("verification_status").notNull().default("unverified"), // 'unverified' | 'community_verified' | 'official'
  approvedAt: timestamp("approved_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userProfileIndex: index("user_profile_index").on(table.userId),
  verificationStatusIndex: index("verification_status_index").on(table.verificationStatus),
}));

// Activities table for social sharable experiences
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'travel' | 'health' | 'work' | 'personal' | 'adventure'
  
  // Timeline and dates
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  timeline: jsonb("timeline").$type<Array<{
    id: string;
    title: string;
    description?: string;
    scheduledAt: string;
    completedAt?: string;
    location?: string;
    notes?: string;
  }>>().default([]),
  
  // AI-generated content
  planSummary: text("plan_summary"), // AI-generated summary of the plan
  
  // Social sharing
  isPublic: boolean("is_public").default(false),
  shareToken: varchar("share_token").unique(), // Unique token for public sharing URLs
  shareableLink: varchar("shareable_link"),
  socialText: text("social_text"), // Custom text for social media sharing
  tags: jsonb("tags").$type<string[]>().default([]),
  shareTitle: text("share_title"), // Custom title for shared activity page (falls back to planSummary or title)
  backdrop: text("backdrop"), // Custom backdrop URL or theme name for shared activity page
  targetGroupId: varchar("target_group_id").references(() => groups.id, { onDelete: "set null" }), // Track which group this was shared from for auto-join
  
  // Community and popularity metrics
  viewCount: integer("view_count").default(0), // Total views for discovery
  likeCount: integer("like_count").default(0), // Total likes/uses
  bookmarkCount: integer("bookmark_count").default(0), // Total bookmarks
  trendingScore: integer("trending_score").default(0), // Calculated trending score
  featuredInCommunity: boolean("featured_in_community").default(false), // Featured plans
  communityStatus: text("community_status").default("draft"), // 'draft' | 'live' | 'pending_changes' | 'offline' - Publication status
  publishedAt: timestamp("published_at"), // Timestamp when first published to community
  unpublishedAt: timestamp("unpublished_at"), // Timestamp when unpublished
  lastPublishedHash: text("last_published_hash"), // Hash of content when last published (for change detection)
  contentHash: varchar("content_hash", { length: 64 }), // SHA-256 hash of activity tasks for fast duplicate detection
  creatorName: text("creator_name"), // Display name of creator for discovery
  creatorAvatar: text("creator_avatar"), // Avatar URL for discovery cards
  seasonalTags: jsonb("seasonal_tags").$type<string[]>().default([]), // 'summer' | 'winter' | 'spring' | 'fall' | 'holiday' | 'year-round'

  // Share-to-earn metrics
  shareCount: integer("share_count").default(0), // Total shares (downloads of share cards)
  adoptionCount: integer("adoption_count").default(0), // Total times plan was copied/adopted
  completionCount: integer("completion_count").default(0), // Total times adopted plan was completed
  
  // Rating and feedback
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  highlights: jsonb("highlights").$type<string[]>().default([]),
  
  // Community snapshot (redacted version for Discovery)
  communitySnapshot: jsonb("community_snapshot").$type<{
    title: string;
    description?: string;
    planSummary?: string;
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      category: string;
      priority: string;
      completed: boolean;
      order: number;
    }>;
    privacyPreset: string;
    publishedAt: string;
  }>(),
  
  // Verification and planner profile
  sourceType: text("source_type").notNull().default("community_unverified"), // 'official_seed' | 'community_reviewed' | 'community_unverified'
  plannerProfileId: varchar("planner_profile_id").references(() => plannerProfiles.id, { onDelete: "set null" }), // Link to planner profile for verification
  verificationBadge: text("verification_badge"), // 'twitter' | 'instagram' | 'threads' | 'multi' | null - Social media badge type
  
  // Plan type and enhanced metadata
  planType: text("plan_type").notNull().default("community"), // 'community' | 'emergency' | 'sponsored'
  isPinned: boolean("is_pinned").default(false), // Pin emergency/important plans to top
  sponsorName: text("sponsor_name"), // Brand/organization name for sponsored plans
  sponsorLogoUrl: text("sponsor_logo_url"), // Logo URL for sponsored plans
  sponsorCtaText: text("sponsor_cta_text"), // Call-to-action button text (e.g., "Shop Now")
  sponsorCtaUrl: text("sponsor_cta_url"), // CTA link URL
  issuingAgency: text("issuing_agency"), // Government agency for emergency plans (e.g., "Austin Emergency Management")
  expiresAt: timestamp("expires_at"), // Expiration date for emergency alerts
  locationRadius: integer("location_radius"), // Geofencing radius in miles for emergency plans
  
  // Status
  status: text("status").notNull().default("planning"), // 'planning' | 'active' | 'completed' | 'cancelled'
  completedAt: timestamp("completed_at"),
  archived: boolean("archived").default(false),
  
  // Activity copy tracking
  copiedFromShareToken: varchar("copied_from_share_token"), // Track which share link this was copied from
  isArchived: boolean("is_archived").default(false), // Separate archive flag for history
  
  // Progress sharing with group
  sharesProgressWithGroup: boolean("shares_progress_with_group").default(false), // Whether to share task completions back to the group
  linkedGroupActivityId: varchar("linked_group_activity_id").references(() => groupActivities.id, { onDelete: "set null" }), // Link to group activity if sharing progress
  
  // Location and context
  location: text("location"),
  latitude: real("latitude"), // Latitude coordinate for location-based discovery (nullable)
  longitude: real("longitude"), // Longitude coordinate for location-based discovery (nullable)
  budget: integer("budget").notNull().default(0), // Budget in cents (0 for free activities)
  budgetBreakdown: jsonb("budget_breakdown").$type<Array<{
    category: string;
    amount: number;
    notes?: string;
  }>>().notNull().default([]), // Detailed budget breakdown from AI planner
  budgetBuffer: integer("budget_buffer").notNull().default(0), // Recommended buffer for unexpected costs (in cents)
  participants: jsonb("participants").$type<Array<{
    name: string;
    email?: string;
    userId?: string;
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userStatusIndex: index("activities_user_status_index").on(table.userId, table.status),
  publicActivitiesIndex: index("public_activities_index").on(table.isPublic, table.createdAt),
  userContentHashUnique: uniqueIndex("user_content_hash_unique").on(table.userId, table.contentHash),
}));

// Link tasks to activities (many-to-many relationship)
export const activityTasks = pgTable("activity_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  order: integer("order").default(0), // Task order within activity
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueActivityTask: uniqueIndex("unique_activity_task").on(table.activityId, table.taskId),
  activityOrderIndex: index("activity_order_index").on(table.activityId, table.order),
}));

// Activity permission requests for shared activities
export const activityPermissionRequests = pgTable("activity_permission_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  permissionType: text("permission_type").notNull().default("edit"), // 'edit' | 'view' | 'admin'
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'denied'
  message: text("message"), // Optional message from requester
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activityRequestIndex: index("activity_request_index").on(table.activityId, table.status),
  requesterIndex: index("requester_index").on(table.requestedBy, table.status),
  ownerStatusIndex: index("owner_status_index").on(table.ownerId, table.status),
}));

// Activity feedback for like/unlike tracking
export const activityFeedback = pgTable("activity_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  feedbackType: text("feedback_type").notNull(), // 'like' | 'dislike'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserActivityFeedback: uniqueIndex("unique_user_activity_feedback").on(table.userId, table.activityId),
  activityFeedbackIndex: index("activity_feedback_index").on(table.activityId, table.feedbackType),
}));

// Activity bookmarks for users to save favorite Discovery plans
export const activityBookmarks = pgTable("activity_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserActivityBookmark: uniqueIndex("unique_user_activity_bookmark").on(table.userId, table.activityId),
  activityBookmarkIndex: index("activity_bookmark_index").on(table.activityId),
  userBookmarkIndex: index("user_bookmark_index").on(table.userId, table.createdAt),
}));

// User-specific activity pins - Each user can pin community plans for quick access
export const userPins = pgTable("user_pins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserActivityPin: uniqueIndex("unique_user_activity_pin").on(table.userId, table.activityId),
  activityPinIndex: index("activity_pin_index").on(table.activityId),
  userPinIndex: index("user_pin_index").on(table.userId, table.createdAt),
}));

// Plan engagement tracking - Append-only event log for analytics and trending calculations
// Complements activityFeedback/activityBookmarks (which store current state) by tracking ALL engagement events
// Event emission rules:
//   - like/unlike: emit on state change (synced with activityFeedback)
//   - bookmark/unbookmark: emit on state change (synced with activityBookmarks)
//   - view: emit once per session per user
//   - share/copy: emit on each occurrence
export const planEngagement = pgTable("plan_engagement", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for anonymous views/copies
  actionType: text("action_type").notNull(), // 'like' | 'unlike' | 'bookmark' | 'unbookmark' | 'view' | 'share' | 'copy'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<{
    shareToken?: string;
    platform?: string; // For shares: 'twitter' | 'facebook' | 'link'
    sessionId?: string; // For view deduplication
  }>(),
}, (table) => ({
  // Optimized for "likes in last 48h per plan" queries - equality columns first for better performance
  trendingCalculationIndex: index("trending_calculation_index").on(table.actionType, table.activityId, table.timestamp.desc()),
  // Per-plan recency queries
  activityRecencyIndex: index("activity_recency_index").on(table.activityId, table.timestamp.desc()),
  // User activity tracking
  userEngagementIndex: index("user_engagement_index").on(table.userId, table.timestamp.desc()),
  // Database-level CHECK constraint for actionType validation
  actionTypeCheck: sql`CHECK (action_type IN ('like', 'unlike', 'bookmark', 'unbookmark', 'view', 'share', 'copy'))`,
}));

// Task feedback for like/unlike tracking on individual tasks
export const taskFeedback = pgTable("task_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  feedbackType: text("feedback_type").notNull(), // 'like' | 'dislike'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserTaskFeedback: uniqueIndex("unique_user_task_feedback").on(table.userId, table.taskId),
  taskFeedbackIndex: index("task_feedback_index").on(table.taskId, table.feedbackType),
}));

// Add Zod schemas for new tables
export const insertAuthIdentitySchema = createInsertSchema(authIdentities).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExternalOAuthTokenSchema = createInsertSchema(externalOAuthTokens).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  ownerUserId: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export const insertContactShareSchema = createInsertSchema(contactShares).omit({
  id: true,
  sharedBy: true,
  createdAt: true,
  respondedAt: true,
});

export const insertActivityPermissionRequestSchema = createInsertSchema(activityPermissionRequests).omit({
  id: true,
  requestedAt: true,
  respondedAt: true,
  createdAt: true,
});

export const insertActivityFeedbackSchema = createInsertSchema(activityFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskFeedbackSchema = createInsertSchema(taskFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanEngagementSchema = createInsertSchema(planEngagement).omit({
  id: true,
  timestamp: true,
});

export const insertActivityBookmarkSchema = createInsertSchema(activityBookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertUserPinSchema = createInsertSchema(userPins).omit({
  id: true,
  createdAt: true,
});

export const insertPlannerProfileSchema = createInsertSchema(plannerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Add TypeScript types for new tables
export type PlannerProfile = typeof plannerProfiles.$inferSelect;
export type InsertPlannerProfile = z.infer<typeof insertPlannerProfileSchema>;

// Verification badge enum for community plans
export const VERIFICATION_BADGES = {
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  THREADS: 'threads',
  MULTI: 'multi',
} as const;

export type VerificationBadge = typeof VERIFICATION_BADGES[keyof typeof VERIFICATION_BADGES];

export const PLAN_TYPES = {
  COMMUNITY: 'community',
  EMERGENCY: 'emergency',
  SPONSORED: 'sponsored',
} as const;

export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];

export const USER_ROLES = {
  STANDARD: 'standard',
  GOVERNMENT: 'government',
  SPONSOR: 'sponsor',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export type AuthIdentity = typeof authIdentities.$inferSelect;
export type InsertAuthIdentity = z.infer<typeof insertAuthIdentitySchema>;

export type ExternalOAuthToken = typeof externalOAuthTokens.$inferSelect;
export type InsertExternalOAuthToken = z.infer<typeof insertExternalOAuthTokenSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type ContactShare = typeof contactShares.$inferSelect;
export type InsertContactShare = z.infer<typeof insertContactShareSchema>;

export type ActivityPermissionRequest = typeof activityPermissionRequests.$inferSelect;
export type InsertActivityPermissionRequest = z.infer<typeof insertActivityPermissionRequestSchema>;

export type ActivityFeedback = typeof activityFeedback.$inferSelect;
export type InsertActivityFeedback = z.infer<typeof insertActivityFeedbackSchema>;

export type TaskFeedback = typeof taskFeedback.$inferSelect;
export type InsertTaskFeedback = z.infer<typeof insertTaskFeedbackSchema>;

export type ActivityBookmark = typeof activityBookmarks.$inferSelect;
export type InsertActivityBookmark = z.infer<typeof insertActivityBookmarkSchema>;

export type UserPin = typeof userPins.$inferSelect;
export type InsertUserPin = z.infer<typeof insertUserPinSchema>;

export type PlanEngagement = typeof planEngagement.$inferSelect;
export type InsertPlanEngagement = z.infer<typeof insertPlanEngagementSchema>;

// Additional contact sync validation
export const syncContactsSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    emails: z.array(z.string().email("Invalid email")).optional().default([]),
    tel: z.array(z.string().min(1, "Phone required")).optional().default([]),
  })).max(100, "Too many contacts in one sync")
});

export const addContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(1, "Phone required").optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required"
});

export type SyncContactsRequest = z.infer<typeof syncContactsSchema>;
export type AddContactRequest = z.infer<typeof addContactSchema>;

// Task actions tracking for achievements
export const taskActions = pgTable("task_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // 'completed' | 'skipped' | 'snoozed' | 'created'
  actionData: jsonb("action_data").$type<{
    snoozeHours?: number;
    skipReason?: string;
    category?: string;
    priority?: string;
    timeSpent?: number; // minutes
  }>().default({}),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format for easy grouping
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateIndex: index("user_date_index").on(table.userId, table.date),
  userActionIndex: index("user_action_index").on(table.userId, table.action),
}));

// Achievements tracking
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  achievementType: text("achievement_type").notNull(), // 'daily_streak' | 'tasks_completed' | 'category_master' | 'productivity_boost'
  title: text("title").notNull(),
  description: text("description").notNull(),
  badgeIcon: text("badge_icon").notNull(), // emoji or icon name
  level: integer("level").default(1), // achievement level (1-5)
  points: integer("points").default(0),
  isActive: boolean("is_active").default(true),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userAchievementIndex: index("user_achievement_index").on(table.userId, table.achievementType),
}));

// User statistics aggregated by time period
export const userStatistics = pgTable("user_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  period: text("period").notNull(), // 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  periodKey: text("period_key").notNull(), // '2024-01-01' | '2024-W01' | '2024-01' | '2024-Q1' | '2024'
  stats: jsonb("stats").$type<{
    tasksCompleted: number;
    tasksSkipped: number;
    tasksSnoozed: number;
    tasksCreated: number;
    categoriesWorkedOn: string[];
    totalTimeSpent: number; // minutes
    streakDays: number;
    productivityScore: number; // 0-100
    achievements: string[]; // achievement IDs unlocked in this period
  }>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserPeriod: uniqueIndex("unique_user_period").on(table.userId, table.period, table.periodKey),
  userPeriodIndex: index("user_period_index").on(table.userId, table.period),
}));

// Extended user profiles for personal details
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  nickname: text("nickname"), // Display name / preferred name
  publicBio: text("public_bio"), // Public bio visible to others
  privateBio: text("private_bio"), // Private notes only visible to the user
  height: text("height"), // Height as string (e.g., "5'10" or "178cm")
  weight: text("weight"), // Weight as string (e.g., "170 lbs" or "77kg")
  birthDate: text("birth_date"), // YYYY-MM-DD format for age calculation
  sex: text("sex"), // 'male' | 'female' | 'other' | 'prefer_not_to_say'
  ethnicity: text("ethnicity"), // Self-identified ethnicity
  profileVisibility: text("profile_visibility").default("private"), // 'public' | 'friends' | 'private'
  profileImageUrlOverride: varchar("profile_image_url_override"), // Override social media profile image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserProfile: uniqueIndex("unique_user_profile").on(table.userId),
}));

// User preferences for lifestyle mapping and AI personalization
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  lifestyleGoalSummary: text("lifestyle_goal_summary"), // "Share your intentions" summary
  usePersonalization: boolean("use_personalization").default(false), // Enable AI personalization using profile data
  userContextSummary: text("user_context_summary"), // AI-generated summary of user's profile, preferences, and journal for personalized planning
  contextGeneratedAt: timestamp("context_generated_at"), // When the user context summary was last generated
  
  // Device location permission and coordinates
  locationEnabled: boolean("location_enabled").default(false), // User has granted location permission
  deviceLatitude: real("device_latitude"), // Device GPS latitude
  deviceLongitude: real("device_longitude"), // Device GPS longitude  
  deviceCity: text("device_city"), // Reverse-geocoded city name
  locationUpdatedAt: timestamp("location_updated_at"), // When location was last updated
  
  preferences: jsonb("preferences").$type<{
    notificationWindows?: { start: string; end: string }[];
    preferredTaskTimes?: string[]; // ['morning', 'afternoon', 'evening']
    activityTypes?: string[]; // ['fitness', 'meditation', 'learning', 'social', 'creative']
    dietaryPreferences?: string[]; // ['vegetarian', 'vegan', 'keto', 'paleo', 'none']
    sleepSchedule?: { bedtime: string; wakeTime: string };
    workSchedule?: { startTime: string; endTime: string; workDays: string[] };
    constraints?: string[]; // ['limited_mobility', 'time_constraints', 'budget_conscious']
    communicationTone?: 'formal' | 'casual' | 'encouraging' | 'direct';
    focusAreas?: string[]; // ['career', 'health', 'relationships', 'personal_growth', 'finance']
    journalData?: {
      [category: string]: Array<{
        id: string;
        text: string;
        media?: Array<{
          url: string;
          type: 'image' | 'video';
          thumbnail?: string;
        }>;
        timestamp: string;
        aiConfidence?: number; // 0-1, indicates AI's confidence in categorization
        keywords?: string[]; // Detected keywords like @restaurants
        activityId?: string; // Link to activity this journal entry reflects on
        linkedActivityTitle?: string; // Activity title for display (denormalized for performance)
        mood?: 'great' | 'good' | 'okay' | 'poor'; // Mood associated with this entry
        venueName?: string; // Name of venue/restaurant/place extracted from content
        venueType?: string; // Type of venue: restaurant, bar, cafe, hotel, attraction, etc.
        location?: {
          city?: string;
          country?: string;
          neighborhood?: string;
          address?: string;
        }; // Structured location data for filtering
        priceRange?: string; // Price range like "$", "$$", "$$$", "$$$$" or "₦30,000-₦50,000"
        budgetTier?: 'budget' | 'moderate' | 'luxury' | 'ultra_luxury'; // Normalized budget tier
        estimatedCost?: number; // Numeric cost estimate in local currency
        sourceUrl?: string; // URL of the reel/post this venue was extracted from
        importId?: string; // Unique ID for the import session (groups venues from same reel)
        selectedForPlan?: boolean; // True if this venue was selected for a plan task
      }>
    }; // Personal journal entries by category with media support and venue data for swap alternatives
    customJournalCategories?: Array<{ id: string; name: string; color: string }>; // User-created journal categories
    dailyTheme?: {
      activityId: string;
      activityTitle: string;
      date: string; // YYYY-MM-DD format
      tasks?: { title: string; completed: boolean }[];
    }; // Daily focus theme - saved when user clicks "Set as Theme"
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserPreferences: uniqueIndex("unique_user_preferences").on(table.userId),
}));

// User consent and privacy controls
export const userConsent = pgTable("user_consent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  allowPersonalization: boolean("allow_personalization").default(false), // Can AI use personal data for recommendations?
  shareIntentions: boolean("share_intentions").default(false), // Can the "Share your intentions" summary be used?
  dataProcessingConsent: boolean("data_processing_consent").default(false), // General data processing consent
  marketingConsent: boolean("marketing_consent").default(false), // Marketing communications consent
  consentedAt: timestamp("consented_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => ({
  uniqueUserConsent: uniqueIndex("unique_user_consent").on(table.userId),
}));

// Create insert schemas for new tables
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserConsentSchema = createInsertSchema(userConsent).omit({
  id: true,
  userId: true,
  consentedAt: true,
  lastUpdated: true,
});

// Create insert schemas for Activities
export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  shareableLink: true,
});


// TypeScript types for Activities
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;


// TypeScript types for new tables
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type UserConsent = typeof userConsent.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;

// Task actions tracking types
export const insertTaskActionSchema = createInsertSchema(taskActions).omit({
  id: true,
  userId: true,
  date: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  userId: true,
  unlockedAt: true,
  createdAt: true,
});

export const insertUserStatisticsSchema = createInsertSchema(userStatistics).omit({
  id: true,
  userId: true,
  updatedAt: true,
  createdAt: true,
});

export type TaskAction = typeof taskActions.$inferSelect;
export type InsertTaskAction = z.infer<typeof insertTaskActionSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserStatistics = typeof userStatistics.$inferSelect;
export type InsertUserStatistics = z.infer<typeof insertUserStatisticsSchema>;

// ActivityTask schema
export const insertActivityTaskSchema = createInsertSchema(activityTasks).omit({
  id: true,
  createdAt: true,
});

export type ActivityTask = typeof activityTasks.$inferSelect;
export type InsertActivityTask = z.infer<typeof insertActivityTaskSchema>;

// Extended Activity type with progress calculation
export type ActivityWithProgress = Activity & {
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
};

// User Credits table for share-to-earn rewards system
export const userCredits = pgTable("user_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0), // Track total credits ever earned
  lifetimeSpent: integer("lifetime_spent").notNull().default(0), // Track total credits ever spent
  lastReset: timestamp("last_reset").defaultNow(), // For monthly allowance tracking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("user_credits_user_id_index").on(table.userId),
}));

// Credit Transactions table for tracking all credit movements
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(), // Positive for earn, negative for spend
  type: text("type").notNull(), // 'earn_publish' | 'earn_adoption' | 'earn_completion' | 'earn_shares' | 'spend_plan' | 'bonus' | 'adjustment'
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }), // Related activity if applicable
  description: text("description"), // Human-readable description
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Additional data (e.g., adopter userId, share count milestone)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("credit_transactions_user_id_index").on(table.userId),
  typeIndex: index("credit_transactions_type_index").on(table.type),
  activityIdIndex: index("credit_transactions_activity_id_index").on(table.activityId),
  createdAtIndex: index("credit_transactions_created_at_index").on(table.createdAt),
}));

// Type exports for credits
export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type UserCredit = typeof userCredits.$inferSelect;
export type InsertUserCredit = z.infer<typeof insertUserCreditsSchema>;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Activity Reports table for spam/fraud reporting
export const activityReports = pgTable("activity_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }).notNull(),
  reportedBy: varchar("reported_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reason: text("reason").notNull(), // 'spam' | 'fraud' | 'inappropriate' | 'copyright' | 'other'
  details: text("details"), // Additional context from reporter
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  resolution: text("resolution"), // Admin notes on resolution
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  activityIdIndex: index("activity_reports_activity_id_index").on(table.activityId),
  reportedByIndex: index("activity_reports_reported_by_index").on(table.reportedBy),
  statusIndex: index("activity_reports_status_index").on(table.status),
  createdAtIndex: index("activity_reports_created_at_index").on(table.createdAt),
}));

// Type exports for activity reports
export const insertActivityReportSchema = createInsertSchema(activityReports).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export type ActivityReport = typeof activityReports.$inferSelect;
export type InsertActivityReport = z.infer<typeof insertActivityReportSchema>;

// Journal Templates for customizable journal entries
export const journalTemplates = pgTable("journal_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // e.g., "Morning Pages", "Evening Reflection"
  description: text("description"),
  prompts: jsonb("prompts").$type<string[]>().default([]), // Array of prompts to answer
  isDefault: boolean("is_default").default(false), // Whether this is the default template
  category: text("category").notNull().default("general"), // 'general' | 'morning' | 'evening' | 'weekly' | 'custom'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("journal_templates_user_id_index").on(table.userId),
  categoryIndex: index("journal_templates_category_index").on(table.category),
}));

// Type exports for journal templates
export const insertJournalTemplateSchema = createInsertSchema(journalTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JournalTemplate = typeof journalTemplates.$inferSelect;
export type InsertJournalTemplate = z.infer<typeof insertJournalTemplateSchema>;

// Extension/Mobile AI Plan Imports - tracks imported plans from ChatGPT, Claude, etc.
export const aiPlanImports = pgTable("ai_plan_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  source: text("source").notNull(), // 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'clipboard' | 'share_sheet' | 'extension'
  sourceDevice: text("source_device").notNull(), // 'web_extension' | 'ios' | 'android' | 'web'
  
  // Original content
  rawText: text("raw_text").notNull(),
  parsedTitle: text("parsed_title").notNull(),
  parsedDescription: text("parsed_description"),
  
  // Parsed tasks before user edits
  parsedTasks: jsonb("parsed_tasks").$type<Array<{
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    timeEstimate?: string;
    order: number;
  }>>().notNull(),
  
  // AI parsing confidence
  confidence: real("confidence").default(0),
  
  // Resulting activity (after user confirms)
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }),
  
  // Status
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'discarded'
  confirmedAt: timestamp("confirmed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("ai_plan_imports_user_id_index").on(table.userId),
  statusIndex: index("ai_plan_imports_status_index").on(table.status),
  createdAtIndex: index("ai_plan_imports_created_at_index").on(table.createdAt),
}));

// Type exports for AI plan imports
export const insertAiPlanImportSchema = createInsertSchema(aiPlanImports).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  activityId: true,
});

export type AiPlanImport = typeof aiPlanImports.$inferSelect;
export type InsertAiPlanImport = z.infer<typeof insertAiPlanImportSchema>;

// Extension tokens for secure authentication between browser extension and API
export const extensionTokens = pgTable("extension_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token").notNull().unique(), // Secure random token
  name: text("name").notNull().default("Browser Extension"), // User-friendly device name
  platform: text("platform").notNull(), // 'chrome' | 'firefox' | 'edge' | 'safari'
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("extension_tokens_user_id_index").on(table.userId),
  tokenIndex: index("extension_tokens_token_index").on(table.token),
}));

// Type exports for extension tokens
export const insertExtensionTokenSchema = createInsertSchema(extensionTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type ExtensionToken = typeof extensionTokens.$inferSelect;
export type InsertExtensionToken = z.infer<typeof insertExtensionTokenSchema>;

// Media imports - tracks social media content (images, videos) shared for plan extraction
export const mediaImports = pgTable("media_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Source information
  source: text("source").notNull(), // 'instagram' | 'tiktok' | 'reels' | 'youtube' | 'gallery' | 'camera'
  sourceDevice: text("source_device").notNull(), // 'ios' | 'android' | 'web'
  
  // Media information
  mediaType: text("media_type").notNull(), // 'image' | 'video'
  mediaUrl: text("media_url"), // Temporary URL for processing (deleted after 24h)
  thumbnailUrl: text("thumbnail_url"), // Preview thumbnail for UI
  originalCaption: text("original_caption"), // Caption shared with the media
  
  // Processing results
  extractedText: text("extracted_text"), // OCR result (images) or transcription (videos)
  ocrConfidence: real("ocr_confidence"), // OCR confidence score 0-1
  transcriptionDuration: integer("transcription_duration"), // Video duration in seconds
  
  // Merged content for plan parsing
  mergedContent: text("merged_content"), // caption + extractedText combined
  
  // AI parsing results (same as aiPlanImports)
  parsedTitle: text("parsed_title"),
  parsedDescription: text("parsed_description"),
  parsedTasks: jsonb("parsed_tasks").$type<Array<{
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    timeEstimate?: string;
    order: number;
  }>>(),
  parsingConfidence: real("parsing_confidence"),
  
  // Resulting activity (after user confirms)
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }),
  
  // Status and lifecycle
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'parsed' | 'confirmed' | 'failed' | 'discarded'
  processingError: text("processing_error"), // Error message if failed
  confirmedAt: timestamp("confirmed_at"),
  
  // Privacy: auto-delete raw media after 24 hours
  mediaExpiresAt: timestamp("media_expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("media_imports_user_id_index").on(table.userId),
  statusIndex: index("media_imports_status_index").on(table.status),
  createdAtIndex: index("media_imports_created_at_index").on(table.createdAt),
}));

// Type exports for media imports
export const insertMediaImportSchema = createInsertSchema(mediaImports).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  activityId: true,
  mediaExpiresAt: true,
});

export type MediaImport = typeof mediaImports.$inferSelect;
export type InsertMediaImport = z.infer<typeof insertMediaImportSchema>;

// Plan remixes - tracks when users combine multiple community plans
export const planRemixes = pgTable("plan_remixes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Source plans (activity IDs)
  sourcePlanIds: jsonb("source_plan_ids").$type<string[]>().notNull(),
  
  // Attribution (creator IDs and names for display)
  attributions: jsonb("attributions").$type<Array<{
    activityId: string;
    activityTitle: string;
    creatorId: string;
    creatorName: string;
    tasksUsed: number;
  }>>().notNull(),
  
  // Merged result
  mergedTitle: text("merged_title").notNull(),
  mergedDescription: text("merged_description"),
  mergedTasks: jsonb("merged_tasks").$type<Array<{
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    timeEstimate?: string;
    order: number;
    sourceActivityId?: string; // Which plan this came from
    isDuplicate?: boolean; // Detected as duplicate
  }>>().notNull(),
  
  // Deduplication stats
  originalTaskCount: integer("original_task_count").default(0),
  finalTaskCount: integer("final_task_count").default(0),
  duplicatesRemoved: integer("duplicates_removed").default(0),
  
  // Resulting activity (after user confirms)
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }),
  
  // Status
  status: text("status").notNull().default("draft"), // 'draft' | 'confirmed' | 'discarded'
  confirmedAt: timestamp("confirmed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("plan_remixes_user_id_index").on(table.userId),
  statusIndex: index("plan_remixes_status_index").on(table.status),
}));

// Type exports for plan remixes
export const insertPlanRemixSchema = createInsertSchema(planRemixes).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  activityId: true,
});

export type PlanRemix = typeof planRemixes.$inferSelect;
export type InsertPlanRemix = z.infer<typeof insertPlanRemixSchema>;

// URL Content Cache - permanent storage for extracted URL content
export const urlContentCache = pgTable("url_content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Normalized URL (without tracking params like ?igsh=...)
  normalizedUrl: text("normalized_url").notNull().unique(),
  
  // Original URL as submitted
  originalUrl: text("original_url").notNull(),
  
  // Platform detected (instagram, tiktok, youtube, etc.)
  platform: text("platform"),
  
  // Full extracted content (combined caption + transcript + OCR)
  extractedContent: text("extracted_content").notNull(),
  
  // Extraction source that succeeded
  extractionSource: text("extraction_source").notNull(), // 'social_media_service' | 'tavily' | 'axios'
  
  // Word count for quick reference
  wordCount: integer("word_count").default(0),
  
  // Metadata about the content
  metadata: jsonb("metadata").$type<{
    title?: string;
    author?: string;
    caption?: string;
    hasAudioTranscript?: boolean;
    hasOcrText?: boolean;
    carouselItemCount?: number;
  }>(),
  
  // When the content was extracted
  extractedAt: timestamp("extracted_at").defaultNow(),
}, (table) => ({
  normalizedUrlIndex: uniqueIndex("url_content_cache_normalized_url_idx").on(table.normalizedUrl),
  platformIndex: index("url_content_cache_platform_idx").on(table.platform),
}));

// Type exports for URL content cache
export const insertUrlContentCacheSchema = createInsertSchema(urlContentCache).omit({
  id: true,
  extractedAt: true,
});

export type UrlContentCache = typeof urlContentCache.$inferSelect;
export type InsertUrlContentCache = z.infer<typeof insertUrlContentCacheSchema>;

// User Saved Content - stores categorized content from social media shares for personalized planning
export const userSavedContent = pgTable("user_saved_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // User who saved the content
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Source URL and platform
  sourceUrl: text("source_url").notNull(),
  platform: text("platform").notNull(), // 'instagram' | 'tiktok' | 'youtube' | 'other'
  
  // Location categorization
  location: text("location"), // Full location string e.g. "Los Angeles, California"
  city: text("city"), // Extracted city e.g. "Los Angeles"
  country: text("country"), // Extracted country e.g. "USA"
  neighborhood: text("neighborhood"), // Specific area e.g. "Beverly Hills"
  
  // Activity categorization
  category: text("category"), // 'bars' | 'restaurants' | 'activities' | 'hotels' | 'shopping' | 'nightlife' | 'travel' | 'fitness' | 'other'
  subcategory: text("subcategory"), // More specific e.g. 'wine_bars', 'rooftop_bars'
  
  // Extracted venue/place details
  venues: jsonb("venues").$type<Array<{
    name: string;
    type?: string;
    priceRange?: string; // '$' | '$$' | '$$$' | '$$$$'
    address?: string;
    notes?: string;
  }>>().default([]),
  
  // Budget information
  budgetTier: text("budget_tier"), // 'budget' | 'moderate' | 'upscale' | 'luxury'
  estimatedCost: integer("estimated_cost"), // Estimated cost in cents if mentioned
  
  // Raw extracted content for reference
  rawContent: text("raw_content"),
  
  // Author of the original content (for attribution in Discovery only)
  authorHandle: text("author_handle"),
  authorName: text("author_name"),
  
  // Content title/description
  title: text("title"),
  
  // Reference to cached extraction (if available)
  cacheId: varchar("cache_id").references(() => urlContentCache.id),
  
  // Tags for flexible categorization
  tags: jsonb("tags").$type<string[]>().default([]),
  
  // User's notes about this saved content
  userNotes: text("user_notes"),
  
  // Auto-journal entry ID if created
  journalEntryId: varchar("journal_entry_id"),
  
  // Metadata
  savedAt: timestamp("saved_at").defaultNow(),
  lastReferencedAt: timestamp("last_referenced_at"), // When this was used in a plan
  referenceCount: integer("reference_count").default(0), // How many times used in plans
}, (table) => ({
  userIdIndex: index("user_saved_content_user_id_idx").on(table.userId),
  locationIndex: index("user_saved_content_location_idx").on(table.location),
  cityIndex: index("user_saved_content_city_idx").on(table.city),
  categoryIndex: index("user_saved_content_category_idx").on(table.category),
  platformIndex: index("user_saved_content_platform_idx").on(table.platform),
  userLocationIdx: index("user_saved_content_user_location_idx").on(table.userId, table.city),
  userCategoryIdx: index("user_saved_content_user_category_idx").on(table.userId, table.category),
}));

// Type exports for user saved content
export const insertUserSavedContentSchema = createInsertSchema(userSavedContent).omit({
  id: true,
  savedAt: true,
  lastReferencedAt: true,
  referenceCount: true,
});

export type UserSavedContent = typeof userSavedContent.$inferSelect;
export type InsertUserSavedContent = z.infer<typeof insertUserSavedContentSchema>;

// Content Imports - stores ALL extracted items from a URL for alternatives/swapping
// When a URL is processed, ALL venues/items are stored here (not just the 6-9 selected for the plan)
export const contentImports = pgTable("content_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // User who imported the content
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Source URL information
  sourceUrl: text("source_url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  platform: text("platform"), // 'instagram' | 'tiktok' | 'youtube' | etc.
  
  // Friendly source name for display (e.g., "Instagram Reel", "TikTok Video")
  sourceName: text("source_name"),
  
  // Content creator info (for attribution)
  authorHandle: text("author_handle"),
  authorName: text("author_name"),
  
  // Total items extracted from the content
  totalItemsExtracted: integer("total_items_extracted").default(0),
  
  // ALL extracted items (venues, restaurants, activities, etc.)
  extractedItems: jsonb("extracted_items").$type<Array<{
    id: string; // Unique ID for this item within the import
    venueName: string;
    venueType: string; // 'restaurant' | 'bar' | 'hotel' | 'attraction' | etc.
    location?: {
      city?: string;
      neighborhood?: string;
      country?: string;
      address?: string;
    };
    priceRange?: string; // '$' | '$$' | '$$$' | '$$$$' or "50-100"
    budgetTier?: string; // 'budget' | 'moderate' | 'luxury' | 'ultra_luxury'
    estimatedCost?: number; // In dollars
    category?: string; // 'restaurants' | 'bars_nightlife' | 'hotels_accommodation' | etc.
    description?: string;
    notes?: string; // AI-extracted notes about this venue
    selectedForPlan?: boolean; // Was this item selected for the generated plan?
    taskId?: string; // ID of the task this item was used for (if selected)
  }>>().default([]),
  
  // Reference to the generated activity (if plan was created)
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "set null" }),
  
  // Cache reference for the raw content extraction
  cacheId: varchar("cache_id").references(() => urlContentCache.id),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIndex: index("content_imports_user_id_idx").on(table.userId),
  normalizedUrlIndex: index("content_imports_normalized_url_idx").on(table.normalizedUrl),
  activityIdIndex: index("content_imports_activity_id_idx").on(table.activityId),
}));

// Type exports for content imports
export const insertContentImportSchema = createInsertSchema(contentImports).omit({
  id: true,
  createdAt: true,
});

export type ContentImport = typeof contentImports.$inferSelect;
export type InsertContentImport = z.infer<typeof insertContentImportSchema>;
