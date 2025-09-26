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

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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
  context: text("context"), // Why this task matters and tips for success
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

// Groups for shared goals and collaborative tracking
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  isPrivate: boolean("is_private").default(false),
  inviteCode: varchar("invite_code").unique(), // Optional invite code for joining
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

// Zod schemas for validation
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

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMembership = typeof groupMemberships.$inferSelect;
export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;

export type SharedGoal = typeof sharedGoals.$inferSelect;
export type InsertSharedGoal = z.infer<typeof insertSharedGoalSchema>;

export type SharedTask = typeof sharedTasks.$inferSelect;
export type InsertSharedTask = z.infer<typeof insertSharedTaskSchema>;

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

export type TaskReminder = typeof taskReminders.$inferSelect;
export type InsertTaskReminder = z.infer<typeof insertTaskReminderSchema>;

export type SchedulingSuggestion = typeof schedulingSuggestions.$inferSelect;
export type InsertSchedulingSuggestion = z.infer<typeof insertSchedulingSuggestionSchema>;

// Authentication identities for multi-provider support
export const authIdentities = pgTable("auth_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // 'google' | 'facebook' | 'replit'
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
  provider: text("provider").notNull(), // 'google' | 'facebook'
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
  matchedUserId: varchar("matched_user_id").references(() => users.id), // Matched PathWise user
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerSourceIndex: index("owner_source_index").on(table.ownerUserId, table.source),
  matchedUserIndex: index("matched_user_index").on(table.matchedUserId),
  // Unique constraint for synced contacts (handles nulls properly)
  uniqueSyncedContact: uniqueIndex("unique_synced_contact").on(table.ownerUserId, table.source, table.externalId),
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

// Add TypeScript types for new tables
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type InsertAuthIdentity = z.infer<typeof insertAuthIdentitySchema>;

export type ExternalOAuthToken = typeof externalOAuthTokens.$inferSelect;
export type InsertExternalOAuthToken = z.infer<typeof insertExternalOAuthTokenSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

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
