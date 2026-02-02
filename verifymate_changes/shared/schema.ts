import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for VerifyMate
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

  // Basic profile
  timezone: text("timezone").default("UTC"),

  // Onboarding
  hasCompletedTutorial: boolean("has_completed_tutorial").default(false),

  // Subscription & Billing
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free' | 'pro'
  subscriptionInterval: varchar("subscription_interval"), // 'monthly' | 'yearly' - null for free tier
  subscriptionStatus: varchar("subscription_status").default("active"), // 'active' | 'canceled' | 'past_due' | 'trialing'
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),

  // Verification count for tier-based limits (5 free/month)
  verificationCount: integer("verification_count").default(0), // Monthly verification count
  verificationCountResetDate: timestamp("verification_count_reset_date"), // When to reset count
  trialEndsAt: timestamp("trial_ends_at"), // 7-day trial end date
  subscriptionEndsAt: timestamp("subscription_ends_at"), // For canceled subscriptions

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auth identities for multi-provider OAuth (Google, Apple, etc.)
export const authIdentities = pgTable("auth_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google' | 'apple' | 'facebook'
  providerId: varchar("provider_id").notNull(), // External ID from provider
  providerEmail: varchar("provider_email"),
  providerData: jsonb("provider_data").$type<Record<string, unknown>>(), // Additional provider-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("auth_identities_provider_id_idx").on(table.provider, table.providerId),
]);

// Verifications table - core of VerifyMate
export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Source content
  sourceUrl: text("source_url"), // Original URL of the post
  sourcePlatform: varchar("source_platform", { length: 50 }), // 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook' | 'threads' | 'linkedin' | 'news' | 'screenshot'
  sourceContent: text("source_content"), // Extracted text content
  sourceMediaUrls: jsonb("source_media_urls").$type<string[]>().default([]), // Images/videos from the post
  sourceAuthor: jsonb("source_author").$type<{
    username?: string;
    displayName?: string;
    followers?: number;
    verified?: boolean;
    accountAge?: string;
  }>(),

  // Overall verdict
  trustScore: integer("trust_score").notNull(), // 0-100 overall trust score
  verdict: varchar("verdict", { length: 20 }).notNull(), // 'verified' | 'mostly_true' | 'mixed' | 'misleading' | 'false' | 'unverifiable'
  verdictSummary: text("verdict_summary").notNull(), // AI-generated summary of the verdict

  // Claims analysis
  claims: jsonb("claims").$type<Array<{
    id: string;
    text: string;
    type: 'factual' | 'opinion' | 'speculation' | 'exaggeration' | 'misleading';
    verdict: 'verified' | 'partially_true' | 'unverified' | 'false' | 'opinion';
    confidence: number; // 0-100
    evidence?: string;
    sources?: Array<{ title: string; url: string; credibility?: number }>;
  }>>().default([]),

  // AI content detection
  aiDetection: jsonb("ai_detection").$type<{
    isAiGenerated: boolean;
    confidence: number;
    textAiScore?: number; // 0-100 likelihood text is AI-generated
    imageAiScore?: number; // 0-100 likelihood images are AI-generated
    videoAiScore?: number; // 0-100 likelihood video is AI-generated/deepfake
    synthIdDetected?: boolean; // Google SynthID watermark detected
    detectionMethod?: string; // 'synthid' | 'hive' | 'pattern_analysis'
  }>(),

  // Account/Bot analysis
  accountAnalysis: jsonb("account_analysis").$type<{
    isSuspectedBot: boolean;
    botScore: number; // 0-100 likelihood of being a bot
    redFlags?: string[]; // List of suspicious patterns
    accountCredibility: number; // 0-100 account credibility score
  }>(),

  // Business verification (if applicable)
  businessVerification: jsonb("business_verification").$type<{
    businessName?: string;
    isVerified: boolean;
    bbbRating?: string;
    bbbAccredited?: boolean;
    trustpilotScore?: number;
    domainAge?: string;
    domainRegistrar?: string;
    scamAdviserScore?: number;
    redFlags?: string[];
    recommendations?: string[];
  }>(),

  // Bias and source analysis
  biasAnalysis: jsonb("bias_analysis").$type<{
    politicalBias?: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'unknown';
    sensationalism: number; // 0-100
    emotionalLanguage: number; // 0-100
    clickbait: boolean;
  }>(),

  // SOURCE TRACING - Track original source of content
  sourceTracing: jsonb("source_tracing").$type<{
    originalSourceFound: boolean;
    originalSource?: {
      url: string;
      platform: string;
      author?: string;
      publishedAt?: string; // ISO date when first appeared
      title?: string;
    };
    spreadTimeline?: Array<{
      platform: string;
      url?: string;
      date: string;
      reach?: number; // estimated views/shares
    }>;
    viralityScore?: number; // 0-100 how viral the content has become
    firstAppearance?: string; // ISO date of earliest known appearance
    isOriginalPoster: boolean; // Is the shared post the original source?
    sourceConfidence: number; // 0-100 confidence in source tracing
  }>(),

  // EVENT CORRELATION - Match content to real-world events
  eventCorrelation: jsonb("event_correlation").$type<{
    correlatedEventFound: boolean;
    event?: {
      title: string;
      description: string;
      date: string; // When the event actually occurred
      location?: string;
      category: 'news' | 'incident' | 'announcement' | 'disaster' | 'political' | 'entertainment' | 'sports' | 'other';
      verifiedSources: Array<{ title: string; url: string; credibility: number }>;
    };
    eventMatch: 'exact' | 'related' | 'misattributed' | 'fabricated' | 'not_found';
    discrepancies?: string[]; // Differences between post and actual event
    manipulationIndicators?: string[]; // Signs the event was misrepresented
    noCorrelationReason?: string; // Why no event was found (if applicable)
  }>(),

  // TIMELINE ANALYSIS - When things happened vs when posted
  timelineAnalysis: jsonb("timeline_analysis").$type<{
    postDate: string; // When user received/shared this
    contentCreationDate?: string; // When content was likely created
    eventDate?: string; // When the actual event occurred (if applicable)
    timelineMismatch: boolean; // Does posting date not match event date?
    mismatchSeverity?: 'none' | 'minor' | 'significant' | 'critical';
    mismatchExplanation?: string;
    isRecycledContent: boolean; // Old content being reshared as new
    recycledFromDate?: string; // Original date if recycled
    ageAnalysis: {
      contentAge: string; // "2 hours ago", "3 months old", etc.
      relevanceToday: 'current' | 'recent' | 'dated' | 'outdated' | 'historical';
      recommendation: string; // "This content is current" or "This is old news being recirculated"
    };
  }>(),

  // Processing metadata
  processingTimeMs: integer("processing_time_ms"),
  geminiModel: varchar("gemini_model", { length: 50 }),
  webGroundingUsed: boolean("web_grounding_used").default(false),

  // Share functionality
  isPublic: boolean("is_public").default(false),
  shareId: varchar("share_id", { length: 20 }).unique(), // Short shareable ID for public links

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("verifications_user_id_idx").on(table.userId),
  index("verifications_created_at_idx").on(table.createdAt),
  index("verifications_share_id_idx").on(table.shareId),
]);

// External OAuth tokens storage (for refresh tokens)
export const externalOAuthTokens = pgTable("external_oauth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google' | 'apple'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: varchar("token_type", { length: 50 }),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("external_oauth_tokens_user_provider_idx").on(table.userId, table.provider),
]);

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuthIdentitySchema = createInsertSchema(authIdentities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type InsertAuthIdentity = typeof authIdentities.$inferInsert;
export type ExternalOAuthToken = typeof externalOAuthTokens.$inferSelect;
export type Session = typeof sessions.$inferSelect;
