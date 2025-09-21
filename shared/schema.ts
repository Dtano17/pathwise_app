import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";
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
