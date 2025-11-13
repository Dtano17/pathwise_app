import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
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

export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
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

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;

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
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }).notNull(),
  sharedBy: varchar("shared_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  shareType: text("share_type").notNull(), // 'app_invitation' | 'activity' | 'group'
  activityId: varchar("activity_id").references(() => activities.id, { onDelete: "cascade" }), // Optional: specific activity shared
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }), // Optional: specific group shared
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'expired'
  invitationMessage: text("invitation_message"),
  sharedAt: timestamp("shared_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactShareIndex: index("contact_share_index").on(table.contactId, table.status),
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
  trendingScore: integer("trending_score").default(0), // Calculated trending score
  featuredInCommunity: boolean("featured_in_community").default(false), // Featured plans
  creatorName: text("creator_name"), // Display name of creator for discovery
  creatorAvatar: text("creator_avatar"), // Avatar URL for discovery cards
  
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
  
  // Location and context
  location: text("location"),
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

export const insertActivityBookmarkSchema = createInsertSchema(activityBookmarks).omit({
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
  bio: text("bio"), // Personal bio/description
  heightCm: integer("height_cm"), // Height in centimeters
  weightKg: integer("weight_kg"), // Weight in kilograms
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
      }>
    }; // Personal journal entries by category with media support
    customJournalCategories?: Array<{ id: string; name: string; color: string }>; // User-created journal categories
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
