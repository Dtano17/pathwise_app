import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { sql as drizzleSql } from "drizzle-orm";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  setupMultiProviderAuth,
  isAuthenticatedGeneric,
} from "./multiProviderAuth";
import { aiService } from "./services/aiService";
import { lifestylePlannerAgent } from "./services/lifestylePlannerAgent";
import { langGraphPlanningAgent } from "./services/langgraphPlanningAgent";
import { simpleConversationalPlanner } from "./services/simpleConversationalPlanner";
import { enrichJournalEntry } from "./services/journalEnrichmentService";
import { journalWebEnrichmentService } from "./services/journalWebEnrichmentService";
import { tmdbService } from "./services/tmdbService";
import { contactSyncService } from "./contactSync";
import { getProvider } from "./services/llmProvider";
import { socketService } from "./services/socketService";
import {
  insertGoalSchema,
  syncContactsSchema,
  addContactSchema,
  insertTaskSchema,
  insertJournalEntrySchema,
  insertChatImportSchema,
  insertPrioritySchema,
  insertNotificationPreferencesSchema,
  insertMobilePreferencesSchema,
  insertTaskReminderSchema,
  insertSchedulingSuggestionSchema,
  insertUserProfileSchema,
  insertUserPreferencesSchema,
  insertUserConsentSchema,
  signupUserSchema,
  profileCompletionSchema,
  insertActivitySchema,
  insertActivityTaskSchema,
  insertLifestylePlannerSessionSchema,
  insertGroupSchema,
  tasks as tasksTable,
  userNotifications,
  activities,
  plannerProfiles,
  activityReports,
  users,
  authIdentities,
  contactShares,
  type Task,
  type Activity,
  type ActivityTask,
  type NotificationPreferences,
  type MobilePreferences,
  type SignupUser,
  type ProfileCompletion,
  type LifestylePlannerSession,
  type User,
} from "@shared/schema";
import { eq, and, or, isNull, isNotNull, ne, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";
import { sendWelcomeEmail } from "./emailService";
import { generateContentHash } from "./utils/contentHash";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import {
  sendGroupNotification,
  sendUserNotification,
} from "./services/notificationService";
import {
  tavilyExtract,
  isTavilyConfigured,
  getTavilyStatus,
} from "./services/tavilyProvider";
import {
  getActivityImage,
  searchBackdropOptions,
} from "./services/webImageSearch";
import { socialMediaVideoService } from "./services/socialMediaVideoService";
import { apifyService } from "./services/apifyService";
import {
  categorizeContent,
  detectPlatform,
  isSocialMediaUrl,
  formatCategoryForDisplay,
  formatBudgetTierForDisplay,
  mapAiCategoryToJournalCategory,
  mapAiCategoryNameToJournalCategory,
  mapVenueTypeToJournalCategory,
  getBestJournalCategory,
  getDynamicCategoryInfo,
  type VenueInfo,
  type DynamicCategoryInfo,
  type PrimaryCategorySuggestion,
  type SubcategorySuggestion,
} from "./services/contentCategorizationService";
import { mapToStandardCategoryId } from "./services/categorySynonyms";
import {
  findSimilarCategory,
  findSimilarSubcategory,
  findDuplicateVenue,
  checkDuplicateURL,
  generatePrimaryCategoryId,
  generateSubcategoryId,
  generateColorGradient,
  type DeduplicationConfig,
  DEFAULT_DEDUP_CONFIG,
} from "./services/categoryMatcher";
import {
  scheduleRemindersForActivity,
  cancelRemindersForActivity,
} from "./services/reminderProcessor";
import {
  isGoogleCalendarConfigured,
  hasCalendarAccess,
  pushActivityToCalendar,
  deleteCalendarEvent,
  pullCalendarEvents,
  getUserCalendars,
  syncAllActivitiesToCalendar,
  createCalendarEvent,
  autoSyncActivityToCalendar,
  autoSyncTaskToCalendar,
} from "./services/googleCalendarService";
import { seedGroupsForUser } from "./seedSampleGroups";
import {
  onTaskCreated,
  onTaskUpdated,
  onTaskCompleted,
  onTaskDeleted,
  onActivityCreated,
  onActivityUpdated,
  onActivityDeleted,
  onGoalCreated,
  onGoalUpdated,
  onGoalDeleted,
  onGroupInviteSent,
  onGroupMemberJoined,
  onActivitySharedToGroup,
  onJournalEntryCreated,
  onActivityProcessingComplete,
} from "./services/notificationEventHooks";
import { getBadgesWithProgress, BADGES, checkAndUnlockBadges } from "./services/achievementService";

// Tavily client is now managed by tavilyProvider.ts with automatic key rotation

// Helper function to format plan preview for Smart mode
function formatPlanPreview(plan: any): string {
  if (!plan) return "";

  let preview = `\n\n## 📋 ${plan.title || "Your Plan"}\n\n`;

  if (plan.description) {
    preview += `${plan.description}\n\n`;
  }

  if (plan.tasks && plan.tasks.length > 0) {
    preview += `**Tasks (${plan.tasks.length}):**\n\n`;
    plan.tasks.forEach((task: any, index: number) => {
      preview += `${index + 1}. **${task.taskName || task.title}**`;
      if (task.duration) {
        preview += ` (${task.duration} min)`;
      }
      if (task.notes) {
        preview += `\n   ${task.notes}`;
      }
      preview += "\n";
    });
    preview += "\n";
  }

  if (plan.budget && plan.budget.total) {
    preview += `**💰 Budget Breakdown (Total: $${plan.budget.total}):**\n\n`;
    if (plan.budget.breakdown && plan.budget.breakdown.length > 0) {
      plan.budget.breakdown.forEach((item: any) => {
        preview += `• **${item.category}:** $${item.amount}`;
        if (item.notes) {
          preview += ` - ${item.notes}`;
        }
        preview += "\n";
      });
    }
    if (plan.budget.buffer) {
      preview += `• **Buffer:** $${plan.budget.buffer} (for unexpected costs)\n`;
    }
    preview += "\n";
  }

  if (plan.weather) {
    preview += `**🌤️ Weather:**\n${plan.weather.forecast}\n\n`;
    if (
      plan.weather.recommendations &&
      plan.weather.recommendations.length > 0
    ) {
      preview += `**Recommendations:**\n`;
      plan.weather.recommendations.forEach((rec: string) => {
        preview += `• ${rec}\n`;
      });
      preview += "\n";
    }
  }

  if (plan.tips && plan.tips.length > 0) {
    preview += `**💡 Tips:**\n`;
    plan.tips.forEach((tip: string) => {
      preview += `• ${tip}\n`;
    });
    preview += "\n";
  }

  return preview;
}

// Helper function to format activity success message with clickable link
// Uses [TARGET_ICON] marker that the client will replace with styled <Target /> icon
// Falls back to ◎ (bullseye unicode) if client doesn't support the marker
function formatActivitySuccessMessage(
  activity: { id: string; title: string },
  emoji: string = "[TARGET_ICON]",
  isUpdate: boolean = false,
): string {
  // Use full URL - just go to Activities tab (new activity will be at top)
  const baseUrl = process.env.APP_URL || "https://journalmate.ai";
  const activityUrl = `${baseUrl}/app?tab=activities`;
  // If emoji is a standard emoji (not our marker), use it; otherwise use our marker
  const displayEmoji = emoji === "[TARGET_ICON]" || !emoji ? "[TARGET_ICON]" : emoji;
  const activityLink = `[${displayEmoji} ${activity.title}](${activityUrl})`;
  return isUpdate
    ? `${activityLink}\n\n♻️ Your plan has been updated!`
    : `${activityLink}\n\n✨ Your plan is ready!`;
}

// Configure multer for media uploads
const uploadDir = path.join(process.cwd(), "attached_assets", "journal_media");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "journal_" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only images (JPEG, PNG, GIF) and videos (MP4, MOV, AVI) are allowed",
        ),
      );
    }
  },
});

// Configure multer for document uploads (disk storage for all document types including PDFs and images)
const documentUploadDir = path.join(
  process.cwd(),
  "attached_assets",
  "document_uploads",
);
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "doc_" + uniqueSuffix + path.extname(file.originalname));
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (Whisper API max)
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "audio/webm",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Supported: PDF, Word (.docx), Images, Videos (MP4, WebM, MOV), Audio (MP3, WAV, M4A)`,
        ),
      );
    }
  },
});

// Helper function to extract authenticated user ID from request
function getUserId(req: any): string | null {
  // Priority 1: Passport authentication (OAuth providers - Google, Facebook)
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user?.id) {
      console.log("[Auth] Passport user authenticated:", req.user.id);
      return req.user.id;
    }
    // Check if user ID is stored directly in session by Passport
    if (req.session?.passport?.user) {
      const userId =
        typeof req.session.passport.user === "string"
          ? req.session.passport.user
          : req.session.passport.user.id;
      console.log("[Auth] Passport session user:", userId);
      return userId;
    }
  }

  // Priority 2: Direct session-based authentication (email/password)
  if (req.session?.userId) {
    console.log("[Auth] Direct session user:", req.session.userId);
    return req.session.userId;
  }

  // Priority 3: Replit auth user
  if (req.user?.claims?.sub) {
    console.log("[Auth] Replit auth user:", req.user.claims.sub);
    return req.user.claims.sub;
  }

  return null;
}

// Helper to get session-based demo user ID for unauthenticated users
// Each session gets a unique demo ID to prevent state collision
function getDemoUserId(req: any): string {
  const authUserId = getUserId(req);
  if (authUserId) {
    return authUserId; // Use real user ID if authenticated
  }

  // Create or retrieve session-based demo user ID
  if (!req.session.demoUserId) {
    req.session.demoUserId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return req.session.demoUserId;
}

// Helper function to extract time from task descriptions like "before 12 PM", "morning", etc.
function extractTimeFromDescription(
  text: string | undefined,
): string | undefined {
  if (!text) return undefined;

  const lowerText = text.toLowerCase();

  // Pattern: "before X AM/PM" or "by X AM/PM" - use 1-2 hours before as reasonable start
  const beforeByMatch = lowerText.match(
    /(?:before|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
  );
  if (beforeByMatch) {
    let hour = parseInt(beforeByMatch[1], 10);
    const minutes = beforeByMatch[2] ? parseInt(beforeByMatch[2], 10) : 0;
    const period = beforeByMatch[3].toLowerCase();

    // Convert to 24-hour
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    // Start 2 hours before the deadline (reasonable buffer)
    hour = Math.max(0, hour - 2);
    return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // Pattern: explicit time "at X AM/PM" or just "X AM/PM" or "X:XX AM/PM"
  const explicitTimeMatch = lowerText.match(
    /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
  );
  if (explicitTimeMatch) {
    let hour = parseInt(explicitTimeMatch[1], 10);
    const minutes = explicitTimeMatch[2] ? parseInt(explicitTimeMatch[2], 10) : 0;
    const period = explicitTimeMatch[3].toLowerCase();

    // Convert to 24-hour
    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // Pattern: natural language time periods
  if (/\b(early\s+)?morning\b/i.test(lowerText)) return "09:00";
  if (/\blate\s+morning\b/i.test(lowerText)) return "11:00";
  if (/\bnoon\b|\bmidday\b/i.test(lowerText)) return "12:00";
  if (/\b(early\s+)?afternoon\b/i.test(lowerText)) return "14:00";
  if (/\blate\s+afternoon\b/i.test(lowerText)) return "16:00";
  if (/\b(early\s+)?evening\b/i.test(lowerText)) return "18:00";
  if (/\blate\s+evening\b/i.test(lowerText)) return "20:00";
  if (/\bnight\b/i.test(lowerText)) return "20:00";

  return undefined;
}

// Helper function to get smart default time based on task index and context
function getSmartDefaultTime(taskIndex: number, totalTasks: number): string {
  // Distribute tasks across a reasonable day (9 AM to 8 PM = 11 hours)
  const startHour = 9; // 9 AM
  const endHour = 20; // 8 PM
  const hourSpan = endHour - startHour;

  // Calculate hour based on task position
  const hourOffset = Math.floor((taskIndex / Math.max(1, totalTasks - 1)) * hourSpan);
  const hour = Math.min(startHour + hourOffset, endHour);

  return `${hour.toString().padStart(2, "0")}:00`;
}

// Helper function for Smart Plan structured conversation
async function handleSmartPlanConversation(
  req: any,
  res: any,
  message: string,
  conversationHistory: any[],
  userId: string,
) {
  try {
    // Check if this is a new conversation (frontend has no conversation history)
    const isNewConversation =
      !conversationHistory || conversationHistory.length === 0;

    let session;
    let isFirstMessage;

    if (isNewConversation) {
      // New conversation - create fresh session and clear old one
      console.log(
        "[SMART PLAN] NEW conversation detected - creating fresh session",
      );

      const existingSession =
        await storage.getActiveLifestylePlannerSession(userId);
      if (existingSession) {
        console.log(
          "[SMART PLAN] Completing old session:",
          existingSession.id,
          "with",
          (existingSession.conversationHistory || []).length,
          "messages",
        );
        await storage.updateLifestylePlannerSession(
          existingSession.id,
          {
            isComplete: true,
            sessionState: "completed",
          },
          userId,
        );
      }

      // Create fresh new session for Smart Plan mode
      session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: "intake",
        slots: {},
        conversationHistory: [],
        externalContext: {
          currentMode: "smart",
          questionCount: { smart: 0, quick: 0 },
          isFirstInteraction: true,
        },
      });

      console.log("[SMART PLAN] Created fresh session:", session.id);
      isFirstMessage = true;
    } else {
      // Continuing existing conversation - get active session
      console.log(
        "[SMART PLAN] CONTINUING conversation with",
        conversationHistory.length,
        "messages",
      );
      session = await storage.getActiveLifestylePlannerSession(userId);

      // VALIDATION: Prevent continuing completed sessions
      if (session && session.isComplete) {
        console.warn(
          "[SMART PLAN] Cannot continue completed session:",
          session.id,
        );
        return res.status(400).json({
          error:
            "This conversation has already been completed. Please start a new session.",
          sessionCompleted: true,
        });
      }

      if (!session) {
        // CRITICAL FIX: If frontend has conversation history but backend has no active session,
        // it means the session was completed. Don't silently create a new one - tell frontend to reset.
        console.warn(
          "[SMART PLAN] Frontend has history but backend has no active session - session was likely completed",
        );
        return res.status(400).json({
          error:
            "This conversation session is no longer available. Please start a new chat.",
          sessionCompleted: true,
          requiresReset: true,
        });
      }

      isFirstMessage = false;
    }

    // Get user profile and priorities for personalized questions
    const userProfile = await storage.getUserProfile(userId);
    const userPriorities = await storage.getUserPriorities(userId);

    // Check if user wants to generate/create the plan (natural language commands)
    // Accept: "yes", "generate plan", "create plan", "please generate", etc.
    const lowerMsg = message.toLowerCase().trim();
    const planConfirmed = session.externalContext?.planConfirmed;

    // Strip punctuation and normalize contractions
    const msgNormalized = lowerMsg
      .replace(/[!?.,:;]+/g, " ")
      .replace(/let'?s/g, "lets")
      .replace(/that'?s/g, "thats")
      .replace(/it'?s/g, "its")
      .replace(/\s+/g, " ")
      .trim();

    // Check for negations - but exclude positive idioms like "no problem", "no worries"
    const hasNegation =
      /\b(don'?t|not|stop|wait|hold|never|cancel|abort)\b/i.test(
        msgNormalized,
      ) ||
      (/\bno\b/.test(msgNormalized) &&
        !/\bno (problem|worries|issues?|concerns?)\b/i.test(msgNormalized));

    // Common affirmative patterns (flexible matching)
    const hasAffirmative =
      /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good|fine|alright|absolutely|definitely|sounds? good|that works|lets do|go ahead|proceed)\b/i.test(
        msgNormalized,
      );

    // Generate/create command patterns
    const hasGenerateCommand =
      /\b(generate|create|make)\b.*(plan|activity|it)\b/i.test(msgNormalized);

    const isGenerateCommand =
      !hasNegation && (hasAffirmative || hasGenerateCommand);

    if (planConfirmed && isGenerateCommand) {
      // User wants to create the activity - extract the generated plan
      const generatedPlan = session.slots?._generatedPlan;

      if (generatedPlan) {
        // SECURITY: Block demo users from creating activities/tasks
        if (isDemoUser(userId)) {
          return res.status(403).json({
            error:
              "Demo users cannot create activities. Please sign in to save your plan.",
            requiresAuth: true,
            message:
              "🔒 **Sign In Required**\n\nDemo users can chat with the AI and see plan previews, but you need to sign in to save plans and create tasks.\n\nSign in to unlock:\n✅ Save plans and tasks\n✅ Track your progress\n✅ Collaborate with others",
            session,
          });
        }

        // Check plan usage limits
        const usageCheck = await checkAndIncrementPlanUsage(userId);
        if (!usageCheck.allowed) {
          return res.json({
            message: `⚠️ **Plan Limit Reached**\n\nYou've used all ${usageCheck.planLimit} AI plans for this month on the free tier.\n\n**Upgrade to Pro ($6.99/month) for:**\n✅ **Unlimited AI plans**\n✅ Advanced favorites organization\n✅ Journal insights & analytics\n✅ Export all your data\n\nWould you like to upgrade now?`,
            planLimitReached: true,
            planCount: usageCheck.planCount,
            planLimit: usageCheck.planLimit,
            session,
          });
        }

        // Fetch backdrop image for the activity
        const activityTitle = generatedPlan.title || "Smart Plan Activity";
        const activityCategory = generatedPlan.category || "personal";
        const backdropUrl = await getActivityImage(
          activityTitle,
          activityCategory,
          undefined,
          undefined,
        );

        // Create activity from the structured plan
        const activity = await storage.createActivity({
          title: activityTitle,
          description:
            generatedPlan.summary || "Generated from Smart Plan conversation",
          category: activityCategory,
          status: "planning",
          userId,
          backdrop: backdropUrl,
        });

        // Create tasks and link them to the activity
        const createdTasks = [];
        if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
          for (let i = 0; i < generatedPlan.tasks.length; i++) {
            const taskData = generatedPlan.tasks[i];
            const task = await storage.createTask({
              title: taskData.title,
              description: taskData.description,
              category: taskData.category,
              priority: taskData.priority,
              timeEstimate: taskData.timeEstimate,
              userId,
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Send notification that activity is ready (works even when app is locked)
        onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, 'smart_plan')
          .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

        // Mark session as completed
        await storage.updateLifestylePlannerSession(
          session.id,
          {
            sessionState: "completed",
            isComplete: true,
            generatedPlan: { ...generatedPlan, tasks: createdTasks },
          },
          userId,
        );

        const updatedSession = await storage.getLifestylePlannerSession(
          session.id,
          userId,
        );

        // Get emoji from generated plan or use default
        const activityEmoji = generatedPlan.emoji || "[TARGET_ICON]";

        return res.json({
          message: formatActivitySuccessMessage(activity, activityEmoji),
          activityCreated: true,
          activityId: activity.id,
          activityTitle: activity.title,
          taskCount: createdTasks.length,
          backdropUrl: activity.backdrop,
          activity,
          planComplete: true,
          createdTasks,
          session: updatedSession,
        });
      }
    }

    // Check if we're awaiting plan confirmation
    const awaitingConfirmation =
      session.externalContext?.awaitingPlanConfirmation;

    if (awaitingConfirmation) {
      // User is responding to "Are you comfortable with this plan?"
      // FIXED: Remove ^ anchor to match anywhere in message, handle punctuation
      const msgClean = message
        .trim()
        .toLowerCase()
        .replace(/[!?.,:;]+/g, "");
      const affirmativePattern =
        /\b(yes|yeah|yep|sure|ok|okay|looks good|perfect|great|sounds good|i'?m comfortable|that works|let'?s do it)\b/i;
      const negativePattern =
        /\b(no|nope|not really|not quite|i want to|i'?d like to|can we|could we|change|add|modify)\b/i;

      if (affirmativePattern.test(msgClean)) {
        // User confirmed - AUTOMATICALLY create the activity and tasks
        const generatedPlan = session.slots?._generatedPlan;

        if (generatedPlan) {
          // Check plan usage limits
          const usageCheck = await checkAndIncrementPlanUsage(userId);
          if (!usageCheck.allowed) {
            return res.json({
              message: `⚠️ **Plan Limit Reached**\n\nYou've used all ${usageCheck.planLimit} AI plans for this month on the free tier.\n\n**Upgrade to Pro ($6.99/month) for:**\n✅ **Unlimited AI plans**\n✅ Advanced favorites organization\n✅ Journal insights & analytics\n✅ Export all your data\n\nWould you like to upgrade now?`,
              planLimitReached: true,
              planCount: usageCheck.planCount,
              planLimit: usageCheck.planLimit,
              session,
            });
          }

          // Fetch backdrop image for the activity
          const activityTitle2 = generatedPlan.title || "Smart Plan Activity";
          const activityCategory2 = generatedPlan.category || "personal";
          const backdropUrl2 = await getActivityImage(
            activityTitle2,
            activityCategory2,
            undefined,
            undefined,
          );

          // Create activity from the structured plan
          const activity = await storage.createActivity({
            title: activityTitle2,
            description:
              generatedPlan.summary || "Generated from Smart Plan conversation",
            category: activityCategory2,
            status: "planning",
            userId,
            backdrop: backdropUrl2,
          });

          // Create tasks and link them to the activity
          const createdTasks = [];
          if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
            for (let i = 0; i < generatedPlan.tasks.length; i++) {
              const taskData = generatedPlan.tasks[i];
              const task = await storage.createTask({
                title: taskData.title,
                description: taskData.description,
                category:
                  taskData.category ||
                  generatedPlan.domain ||
                  generatedPlan.category ||
                  "personal",
                priority: taskData.priority,
                timeEstimate: taskData.timeEstimate,
                userId,
              });
              await storage.addTaskToActivity(activity.id, task.id, i);
              createdTasks.push(task);
            }
          }

          // Send notification that activity is ready (works even when app is locked)
          onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, 'smart_plan')
            .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

          // Mark session as completed
          await storage.updateLifestylePlannerSession(
            session.id,
            {
              sessionState: "completed",
              isComplete: true,
              generatedPlan: { ...generatedPlan, tasks: createdTasks },
              externalContext: {
                ...session.externalContext,
                awaitingPlanConfirmation: false,
                planConfirmed: true,
              },
            },
            userId,
          );

          const updatedSession = await storage.getLifestylePlannerSession(
            session.id,
            userId,
          );

          // Get emoji from generated plan or use default
          const activityEmoji = generatedPlan.emoji || "[TARGET_ICON]";

          return res.json({
            message: formatActivitySuccessMessage(activity, activityEmoji),
            activityCreated: true,
            activityId: activity.id,
            activityTitle: activity.title,
            taskCount: createdTasks.length,
            backdropUrl: activity.backdrop,
            activity,
            planComplete: true,
            createdTasks,
            session: updatedSession,
          });
        }
      } else if (
        negativePattern.test(message.trim()) ||
        message.toLowerCase().includes("change") ||
        message.toLowerCase().includes("add")
      ) {
        // User wants to make changes - continue gathering info
        const updatedContext = {
          ...session.externalContext,
          awaitingPlanConfirmation: false,
          planConfirmed: false,
        };

        await storage.updateLifestylePlannerSession(
          session.id,
          {
            externalContext: updatedContext,
          },
          userId,
        );

        // Process their change request with LangGraph
        const langGraphResponse = await langGraphPlanningAgent.processMessage(
          parseInt(userId),
          message,
          userProfile,
          session.conversationHistory,
          storage,
          "smart",
        );

        // Update conversation history
        const updatedHistory = [
          ...session.conversationHistory,
          { role: "user", content: message },
          { role: "assistant", content: langGraphResponse.message },
        ];

        await storage.updateLifestylePlannerSession(
          session.id,
          {
            conversationHistory: updatedHistory,
            slots: {
              ...session.slots,
              _generatedPlan:
                langGraphResponse.finalPlan || session.slots?._generatedPlan,
            },
          },
          userId,
        );

        return res.json({
          message: langGraphResponse.message,
          sessionId: session.id,
          contextChips: [], // LangGraph doesn't use context chips
          planReady: langGraphResponse.readyToGenerate || false,
          session,
        });
      }
      // If unclear response, treat as wanting to make changes/continue conversation
    }

    // Check for help intent - if user asks about what the modes do
    const helpIntentPattern =
      /what.*do(es)?.*it.*do|how.*work|difference.*(quick|smart)|what.*is.*smart.*plan|what.*is.*quick.*plan|explain.*mode|help.*understand/i;
    if (helpIntentPattern.test(message)) {
      return res.json({
        message: `🤖 **Here's how I can help you plan:**

**🧠 Smart Plan Mode:**
• Conversational & thorough planning
• Asks detailed clarifying questions (max 5, often just 3)
• Tracks context with visual chips
• Perfect for complex activities (trips, events, work projects)
• Requires confirmation before creating your plan

**⚡ Quick Plan Mode:**
• Fast & direct suggestions
• Minimal questions (max 3 follow-ups)
• Great when you already know the details
• Immediate action for simple activities

**When to use each:**
• **Smart Plan**: When you want comprehensive planning with detailed conversation
• **Quick Plan**: When you need fast suggestions without extensive back-and-forth

Try saying "help me plan dinner" in either mode to see the difference! 😊`,
        sessionId: session.id,
        contextChips: [],
        planReady: false,
        helpProvided: true,
        session,
      });
    }

    // Check if user is confirming to create the plan
    const confirmationKeywords = [
      "yes",
      "create the plan",
      "sounds good",
      "perfect",
      "great",
      "that works",
      "confirm",
      "proceed",
    ];
    const userWantsToCreatePlan = confirmationKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase()),
    );

    // If user is ready to create plan and confirms
    if (userWantsToCreatePlan && session.sessionState === "confirming") {
      // Create a basic plan structure
      const planData = {
        title: `Smart Plan: ${session.slots?.activityType || "Activity"}`,
        summary: `Personalized plan based on your conversation`,
        category: "personal",
        tasks: [
          {
            title: `Prepare for ${session.slots?.activityType || "activity"}`,
            description: "Get ready and gather what you need",
            category: "preparation",
            priority: "medium",
            timeEstimate: "30 min",
          },
          {
            title: `Execute ${session.slots?.activityType || "activity"}`,
            description: "Follow through with the planned activity",
            category: "action",
            priority: "high",
            timeEstimate: "1-2 hours",
          },
        ],
      };

      // Fetch backdrop image for the activity
      const backdropUrl3 = await getActivityImage(
        planData.title,
        planData.category,
      );

      // Create activity from the structured plan
      const activity = await storage.createActivity({
        title: planData.title,
        description: planData.summary,
        category: planData.category,
        status: "planning",
        userId,
        backdrop: backdropUrl3,
      });

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < planData.tasks.length; i++) {
        const taskData = planData.tasks[i];
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority as "low" | "medium" | "high",
          timeEstimate: taskData.timeEstimate,
          userId,
        });
        await storage.addTaskToActivity(activity.id, task.id, i);
        createdTasks.push(task);
      }

      // Mark session as completed
      await storage.updateLifestylePlannerSession(
        session.id,
        {
          sessionState: "completed",
          isComplete: true,
          generatedPlan: { ...planData, tasks: createdTasks },
        },
        userId,
      );

      // Get updated session for consistent response shape
      const updatedSession = await storage.getLifestylePlannerSession(
        session.id,
        userId,
      );

      return res.json({
        message: formatActivitySuccessMessage(activity, "[TARGET_ICON]"),
        activityCreated: true,
        activityId: activity.id,
        activityTitle: activity.title,
        taskCount: createdTasks.length,
        backdropUrl: activity.backdrop,
        activity,
        planComplete: true,
        createdTasks,
        session: updatedSession,
      });
    }

    // Process with LangGraph planning agent for Smart Plan mode
    const langGraphResponse = await langGraphPlanningAgent.processMessage(
      parseInt(userId),
      message,
      userProfile,
      session.conversationHistory,
      storage,
      "smart",
    );

    // Map LangGraph response to ConversationResponse format
    const response = {
      message: langGraphResponse.message,
      readyToGenerate: langGraphResponse.readyToGenerate || false,
      planReady: langGraphResponse.readyToGenerate || false,
      updatedSlots: session.slots,
      updatedConversationHistory: [
        ...session.conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: langGraphResponse.message },
      ],
      updatedExternalContext: session.externalContext,
      sessionState: langGraphResponse.phase as
        | "gathering"
        | "processing"
        | "confirming"
        | "completed",
      generatedPlan: langGraphResponse.finalPlan,
      createActivity: false,
      progress: langGraphResponse.progress,
      phase: langGraphResponse.phase,
      domain: langGraphResponse.domain,
    };

    // SERVER-SIDE ACTIVITY TYPE DETECTION OVERRIDE
    // If the message contains interview keywords but AI extracted wrong activity type, override it
    const interviewKeywords = [
      "interview",
      "job interview",
      "interview prep",
      "prepare for.*interview",
      "interviewing",
    ];
    const learningKeywords = [
      "study",
      "learn",
      "course",
      "education",
      "prep for exam",
      "test prep",
    ];
    const workoutKeywords = [
      "workout",
      "exercise",
      "gym",
      "fitness",
      "training session",
    ];
    const wellnessKeywords = [
      "meditation",
      "yoga",
      "mindfulness",
      "breathing exercise",
    ];

    const messageLower = message.toLowerCase();
    const hasInterviewKeyword = interviewKeywords.some((kw) =>
      new RegExp(kw, "i").test(messageLower),
    );
    const hasLearningKeyword = learningKeywords.some((kw) =>
      new RegExp(kw, "i").test(messageLower),
    );
    const hasWorkoutKeyword = workoutKeywords.some((kw) =>
      new RegExp(kw, "i").test(messageLower),
    );
    const hasWellnessKeyword = wellnessKeywords.some((kw) =>
      new RegExp(kw, "i").test(messageLower),
    );

    // Priority detection: "the goal is to..." phrase indicates primary activity
    const goalPhraseMatch = messageLower.match(
      /(?:the )?goal (?:is|was) to (?:pass|prepare for|get ready for|ace|nail|do well in|succeed in).*?(?:interview|study|learn|workout|meditate)/i,
    );

    if (response.updatedSlots) {
      const currentActivityType =
        response.updatedSlots.activityType?.toLowerCase() || "";

      // Override if interview detected but not properly classified
      if (
        hasInterviewKeyword ||
        (goalPhraseMatch && goalPhraseMatch[0].includes("interview"))
      ) {
        if (
          currentActivityType !== "interview_prep" &&
          currentActivityType !== "interview"
        ) {
          console.log(
            `[OVERRIDE] Detected interview keywords but AI extracted activityType="${currentActivityType}". Overriding to "interview_prep".`,
          );
          response.updatedSlots.activityType = "interview_prep";
        }
      } else if (hasLearningKeyword && currentActivityType !== "learning") {
        console.log(
          `[OVERRIDE] Detected learning keywords but AI extracted activityType="${currentActivityType}". Overriding to "learning".`,
        );
        response.updatedSlots.activityType = "learning";
      } else if (hasWorkoutKeyword && currentActivityType !== "workout") {
        console.log(
          `[OVERRIDE] Detected workout keywords but AI extracted activityType="${currentActivityType}". Overriding to "workout".`,
        );
        response.updatedSlots.activityType = "workout";
      } else if (hasWellnessKeyword && currentActivityType !== "wellness") {
        console.log(
          `[OVERRIDE] Detected wellness keywords but AI extracted activityType="${currentActivityType}". Overriding to "wellness".`,
        );
        response.updatedSlots.activityType = "wellness";
      }
    }

    // Backend guardrail: NEVER generate plan on first interaction
    if (isFirstMessage && (response.readyToGenerate || response.planReady)) {
      console.warn(
        "Attempted to generate plan on first message - blocking and forcing question",
      );
      response.readyToGenerate = false;
      response.planReady = false;
    }

    // Check if plan is ready for confirmation
    const smartPlanConfirmed = session.externalContext?.planConfirmed;
    const smartAwaitingConfirmation =
      session.externalContext?.awaitingPlanConfirmation;
    const isFirstPlanReady =
      (response.readyToGenerate ||
        response.planReady ||
        response.showGenerateButton) &&
      !smartAwaitingConfirmation;

    // Persist updated session data from agent (includes full conversation history and generated plan)
    await storage.updateLifestylePlannerSession(
      session.id,
      {
        conversationHistory:
          response.updatedConversationHistory || session.conversationHistory,
        slots: {
          ...(response.updatedSlots || session.slots),
          _generatedPlan:
            response.generatedPlan || session.slots?._generatedPlan,
        },
        externalContext: {
          ...(response.updatedExternalContext || session.externalContext),
          isFirstInteraction: false,
          // Set confirmation flags if plan is ready for first time
          ...(isFirstPlanReady
            ? { awaitingPlanConfirmation: true, planConfirmed: false }
            : {}),
        },
        sessionState: isFirstPlanReady ? "confirming" : response.sessionState,
      },
      userId,
    );

    // Handle plan confirmation flow
    console.log("[SMART PLAN] Confirmation flow check:", {
      readyToGenerate: response.readyToGenerate,
      planReady: response.planReady,
      smartPlanConfirmed,
      smartAwaitingConfirmation,
      isFirstPlanReady,
    });

    if (
      response.readyToGenerate ||
      response.planReady ||
      response.showGenerateButton
    ) {
      if (smartPlanConfirmed) {
        console.log(
          "[SMART PLAN] Plan already confirmed - showing generate button",
        );
        // Plan already confirmed - show Generate Plan button immediately
        return res.json({
          message: response.message,
          planReady: true,
          sessionId: session.id,
          showCreatePlanButton: true,
          showGenerateButton: true,
          session,
        });
      } else if (!smartAwaitingConfirmation) {
        console.log(
          "[SMART PLAN] First time plan ready - checking if confirmation prompt already included",
        );
        // Check if AI already asked for confirmation (case-insensitive, flexible matching)
        const messageLower = response.message.toLowerCase();
        const alreadyAskedConfirmation =
          messageLower.includes("are you comfortable") ||
          messageLower.includes("does this work") ||
          messageLower.includes("is this okay") ||
          messageLower.includes("sound good") ||
          /ready to (proceed|generate|create)/.test(messageLower);

        // Get the plan from response (could be in plan, generatedPlan, or extractedInfo.plan)
        const planData =
          response.plan ||
          response.generatedPlan ||
          response.extractedInfo?.plan;
        const planPreview = formatPlanPreview(planData);

        // First time plan is ready - show plan preview and ask for confirmation
        const confirmationMessage = alreadyAskedConfirmation
          ? response.message
          : response.message +
            "\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)";

        return res.json({
          message: planPreview + confirmationMessage,
          planReady: false, // Don't show button yet
          sessionId: session.id,
          showCreatePlanButton: false, // Don't show button until confirmed
          session,
        });
      } else {
        console.log("[SMART PLAN] Awaiting user response to confirmation");
      }
      // If awaitingConfirmation is true but not confirmed yet, fall through to normal response
    }

    // If user confirmed, create the activity
    if (response.createActivity) {
      const planData = response.generatedPlan;

      // Fetch backdrop image for the activity
      const activityTitle4 = planData.title || "Smart Plan Activity";
      const activityCategory4 = planData.category || "personal";
      const backdropUrl4 = await getActivityImage(
        activityTitle4,
        activityCategory4,
      );

      // Create activity from the structured plan
      const activity = await storage.createActivity({
        title: activityTitle4,
        description:
          planData.summary || "Generated from Smart Plan conversation",
        category: activityCategory4,
        status: "planning",
        userId,
        backdrop: backdropUrl4,
      });

      // Create tasks and link them to the activity
      const createdTasks = [];
      if (planData.tasks && Array.isArray(planData.tasks)) {
        for (let i = 0; i < planData.tasks.length; i++) {
          const taskData = planData.tasks[i];
          const task = await storage.createTask({
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            priority: taskData.priority,
            timeEstimate: taskData.timeEstimate,
            userId,
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
          createdTasks.push(task); // Collect real task with database ID
        }
      }

      // Update the generated plan with real tasks
      response.generatedPlan = {
        ...planData,
        tasks: createdTasks,
      };

      // Mark session as completed
      await storage.updateLifestylePlannerSession(
        session.id,
        {
          sessionState: "completed",
          isComplete: true,
          generatedPlan: response.generatedPlan, // Use updated plan with real tasks
        },
        userId,
      );

      // Get updated session for consistent response shape
      const updatedSession = await storage.getLifestylePlannerSession(
        session.id,
        userId,
      );

      // Get emoji from generated plan or use default
      const activityEmoji =
        planData.emoji || response.generatedPlan?.emoji || "[TARGET_ICON]";

      return res.json({
        message: formatActivitySuccessMessage(activity, activityEmoji),
        activityCreated: true,
        activityId: activity.id,
        activityTitle: activity.title,
        taskCount: createdTasks.length,
        backdropUrl: activity.backdrop,
        activity,
        planComplete: true,
        createdTasks,
        session: updatedSession,
      });
    }

    // Regular conversation response (session already updated above with conversation history, slots, and externalContext)
    return res.json({
      message: response.message,
      sessionId: session?.id,
      contextChips: response.contextChips || [],
      planReady: response.planReady || false,
      createdActivity: response.createdActivity
        ? {
            id: response.createdActivity.id,
            title: response.createdActivity.title,
          }
        : undefined,
      progress: response.progress || 0,
      phase: response.phase || "gathering",
      domain: response.domain || "general",
      session,
    });
  } catch (error) {
    console.error("Smart Plan conversation error:", error);
    return res.status(500).json({
      error: "Failed to process Smart Plan conversation",
      message: "Sorry, I encountered an issue. Please try again.",
    });
  }
}

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    })
  : null;

// Helper function to check and increment plan usage
async function checkAndIncrementPlanUsage(
  userId: string,
): Promise<{ allowed: boolean; planCount: number; planLimit: number | null }> {
  const user = await storage.getUserById(userId);

  if (!user) {
    return { allowed: false, planCount: 0, planLimit: null };
  }

  // Check if plan count needs to be reset (monthly)
  const now = new Date();
  if (user.planCountResetDate && new Date(user.planCountResetDate) < now) {
    await storage.updateUserField(userId, "planCount", 0);
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);
    await storage.updateUserField(userId, "planCountResetDate", nextReset);
    user.planCount = 0;
  }

  const tier = user.subscriptionTier || "free";
  const planCount = user.planCount || 0;

  // Free tier: 5 plans per month, Pro/Family: unlimited
  const planLimit = tier === "free" ? 5 : null;

  if (planLimit && planCount >= planLimit) {
    return { allowed: false, planCount, planLimit };
  }

  // Increment plan count
  await storage.updateUserField(userId, "planCount", planCount + 1);

  return { allowed: true, planCount: planCount + 1, planLimit };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Replit Auth integration
  await setupAuth(app);

  // Multi-provider OAuth setup (Google, Facebook)
  await setupMultiProviderAuth(app);

  // ========== ANDROID APP LINKS ==========
  // Digital Asset Links for Android App Links verification
  // Allows HTTPS links to journalmate.ai to open directly in the Android app
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.type("application/json").json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "ai.journalmate.app",
          sha256_cert_fingerprints: [
            "3D:B8:A4:E9:42:6F:4C:33:97:01:0D:24:46:40:1A:39:2C:84:53:72:DC:E7:F4:FC:D4:5A:8B:02:FE:53:D5:20",
          ],
        },
      },
    ]);
  });

  // ========== SITEMAP FOR SEO ==========
  // Dynamic sitemap.xml for search engines and AI crawlers
  // Supports both journalmate.ai and planmate360.ai domains
  app.get("/sitemap.xml", async (req, res) => {
    try {
      // Detect domain from request host header for multi-domain support
      const host = req.get("host") || "";
      let baseUrl = "https://journalmate.ai";
      if (host.includes("planmate360")) {
        baseUrl = "https://planmate360.ai";
      }

      // Static pages with SEO priority - optimized for Google and AI crawlers
      const staticPages = [
        { url: "/", priority: 1.0, changefreq: "weekly" },
        { url: "/discover", priority: 0.9, changefreq: "daily" },
        { url: "/import-plan", priority: 0.9, changefreq: "weekly" },
        { url: "/chatgpt-plan-tracker", priority: 0.9, changefreq: "monthly" },
        { url: "/claude-ai-integration", priority: 0.9, changefreq: "monthly" },
        { url: "/perplexity-plans", priority: 0.9, changefreq: "monthly" },
        { url: "/gemini-plan-importer", priority: 0.9, changefreq: "monthly" },
        { url: "/save-social-media", priority: 0.9, changefreq: "weekly" },
        { url: "/weekend-plans", priority: 0.85, changefreq: "weekly" },
        { url: "/plans-near-me", priority: 0.85, changefreq: "weekly" },
        { url: "/christmas-plans", priority: 0.8, changefreq: "monthly" },
        { url: "/new-year-activities", priority: 0.8, changefreq: "monthly" },
        { url: "/summer-adventures", priority: 0.8, changefreq: "monthly" },
        { url: "/winter-plans", priority: 0.8, changefreq: "monthly" },
        { url: "/date-night-ideas", priority: 0.8, changefreq: "weekly" },
        { url: "/family-activities", priority: 0.8, changefreq: "weekly" },
        { url: "/trending-plans", priority: 0.85, changefreq: "daily" },
        { url: "/about", priority: 0.7, changefreq: "monthly" },
        { url: "/faq", priority: 0.7, changefreq: "monthly" },
        { url: "/privacy", priority: 0.5, changefreq: "yearly" },
        { url: "/terms", priority: 0.5, changefreq: "yearly" },
        { url: "/support", priority: 0.6, changefreq: "monthly" },
      ];

      // Fetch public community plans for dynamic URLs - wrapped in try/catch for resilience
      let dynamicUrls: Array<{
        url: string;
        priority: number;
        changefreq: string;
        lastmod?: string;
      }> = [];
      try {
        const publicPlans = await db.query.activities.findMany({
          where: eq(activities.communityStatus, "live"),
          limit: 1000,
          columns: {
            shareToken: true,
            updatedAt: true,
          },
        });

        // Build dynamic URLs from public plans with null-safe date handling
        dynamicUrls = publicPlans
          .filter((plan) => plan.shareToken) // Only include plans with valid share tokens
          .map((plan) => {
            let lastmod: string | undefined;
            try {
              if (plan.updatedAt) {
                lastmod =
                  plan.updatedAt instanceof Date
                    ? plan.updatedAt.toISOString()
                    : new Date(plan.updatedAt).toISOString();
              }
            } catch {
              // Skip invalid dates
            }
            return {
              url: `/share/${plan.shareToken}`,
              priority: 0.6,
              changefreq: "weekly" as const,
              lastmod,
            };
          });
      } catch (dbError) {
        console.error(
          "[SITEMAP] Database error fetching community plans:",
          dbError,
        );
        // Continue with static pages only
      }

      // Combine static and dynamic URLs
      const allUrls = [...staticPages, ...dynamicUrls];
      const today = new Date().toISOString().split("T")[0];

      // Generate XML sitemap following Google Sitemap Protocol
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(xml);
    } catch (error) {
      console.error("[SITEMAP] Error generating sitemap:", error);
      // Return a minimal valid sitemap on error
      const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://journalmate.ai/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
      res.header("Content-Type", "application/xml");
      res.status(200).send(fallbackXml);
    }
  });

  // ========== RSS FEED FOR COMMUNITY PLANS ==========
  // Atom feed for trending and new community plans
  app.get("/feed.xml", async (_req, res) => {
    try {
      const today = new Date().toISOString();

      // Fetch recent public community plans
      const recentPlans = await db.query.activities.findMany({
        where: eq(activities.communityStatus, "live"),
        limit: 50,
        orderBy: (activities, { desc }) => [desc(activities.updatedAt)],
        columns: {
          id: true,
          title: true,
          description: true,
          shareToken: true,
          updatedAt: true,
        },
      });

      const feedItems = recentPlans
        .map(
          (plan) => `  <entry>
    <title>${plan.title || "Untitled Plan"}</title>
    <link href="https://journalmate.ai/share/${plan.shareToken}" />
    <id>https://journalmate.ai/share/${plan.shareToken}</id>
    <updated>${plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : new Date(plan.updatedAt).toISOString()}</updated>
    <summary>${plan.description || "A community plan on JournalMate"}</summary>
    <content type="html"><![CDATA[<p>${plan.description || "A community plan on JournalMate"}</p><p><a href="https://journalmate.ai/share/${plan.shareToken}">View Plan</a></p>]]></content>
  </entry>`,
        )
        .join("\n");

      const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>JournalMate Community Plans</title>
  <subtitle>Discover and share plans for any goal, event, or activity</subtitle>
  <link href="https://journalmate.ai/" />
  <link href="https://journalmate.ai/feed.xml" rel="self" />
  <id>https://journalmate.ai/feed.xml</id>
  <updated>${today}</updated>
  <author>
    <name>JournalMate Team</name>
    <email>hello@journalmate.ai</email>
  </author>
${feedItems}
</feed>`;

      res.header("Content-Type", "application/atom+xml");
      res.header("Cache-Control", "public, max-age=3600");
      res.send(atom);
    } catch (error) {
      console.error("[FEED] Error generating Atom feed:", error);
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>JournalMate Community Plans</title>
  <id>https://journalmate.ai/feed.xml</id>
  <updated>${new Date().toISOString()}</updated>
</feed>`);
    }
  });

  // ========== IMAGE SITEMAP ==========
  // Image sitemap for plan backdrop images and share previews
  // Seed development data endpoint
  app.post("/api/seed-dev-data", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log(`[SEED] Seeding data for user ${userId}`);
      await seedGroupsForUser(userId);

      res.json({
        success: true,
        message: "Development data seeded successfully",
      });
    } catch (error) {
      console.error("[SEED] Error seeding data:", error);
      res
        .status(500)
        .json({
          error: "Failed to seed data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  app.get("/image-sitemap.xml", async (_req, res) => {
    try {
      // Fetch plans with image data
      const plansWithImages = await db.query.activities.findMany({
        where: eq(activities.communityStatus, "live"),
        limit: 1000,
        columns: {
          shareToken: true,
          backdropImageUrl: true,
        },
      });

      const imageUrls = plansWithImages
        .filter((plan) => plan.backdropImageUrl || plan.shareToken)
        .map((plan) => {
          const images = [];
          if (plan.backdropImageUrl) {
            images.push(
              `<image:image><image:loc>${plan.backdropImageUrl}</image:loc></image:image>`,
            );
          }
          if (plan.shareToken) {
            images.push(
              `<image:image><image:loc>https://journalmate.ai/api/og-image/${plan.shareToken}</image:loc></image:image>`,
            );
          }

          if (images.length === 0) return null;

          return `  <url>
    <loc>https://journalmate.ai/share/${plan.shareToken}</loc>
    ${images.join("\n    ")}
  </url>`;
        })
        .filter(Boolean);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageUrls.join("\n")}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.header("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("[IMAGE SITEMAP] Error generating image sitemap:", error);
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`);
    }
  });

  // ========== SITEMAP INDEX ==========
  // Master sitemap index for all sitemaps
  app.get("/sitemap-index.xml", (_req, res) => {
    const sitemaps = [
      { url: "https://journalmate.ai/sitemap.xml", priority: "daily" },
      { url: "https://journalmate.ai/image-sitemap.xml", priority: "weekly" },
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sitemap) => `  <sitemap>
    <loc>${sitemap.url}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  // ========== OPENSEARCH DESCRIPTION ==========
  // Allow browsers to add JournalMate as a search engine
  app.get("/opensearch.xml", (_req, res) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>JournalMate</ShortName>
  <Description>Discover and plan goals, activities, and events with JournalMate</Description>
  <Url type="text/html" template="https://journalmate.ai/discover?search={searchTerms}" />
  <Url type="application/x-suggestions+json" template="https://journalmate.ai/api/search-suggestions?q={searchTerms}" />
  <Image height="16" width="16" type="image/x-icon">https://journalmate.ai/favicon.ico</Image>
  <Image height="64" width="64" type="image/png">https://journalmate.ai/journalmate-logo-email.png</Image>
  <Contact>hello@journalmate.ai</Contact>
  <Tags>plan tracker discover activity journaling ai</Tags>
  <LongName>JournalMate - Plan, Track, Discover</LongName>
  <SyndicationRight>open</SyndicationRight>
  <Developer>JournalMate Team</Developer>
  <Attribution>Search results powered by JournalMate</Attribution>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
</OpenSearchDescription>`;

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=86400");
    res.send(xml);
  });

  // ========== INTEGRATION STATUS ENDPOINT ==========
  // Shows status of content extraction integrations (Apify, Tavily)
  app.get("/api/integrations/status", async (_req, res) => {
    const tavilyStatus = getTavilyStatus();
    const status = {
      apify: apifyService.getStatus(),
      tavily: tavilyStatus,
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        message: process.env.OPENAI_API_KEY
          ? "OpenAI integration ready (Whisper + OCR)"
          : "OPENAI_API_KEY not set",
      },
      extractionPipeline: {
        instagramReels: apifyService.isAvailable()
          ? "Apify → Whisper → OCR"
          : "Direct extraction → yt-dlp → Whisper → OCR",
        tiktokVideos: apifyService.isAvailable()
          ? "Apify → Whisper → OCR"
          : "Direct extraction → yt-dlp → Whisper → OCR",
        youtube: "yt-dlp → Whisper",
        webContent: tavilyStatus.configured
          ? "Tavily Extract (advanced)"
          : "Basic fetch",
        documents: "PDF/DOCX/Image parsing → OpenAI",
      },
    };

    res.json(status);
  });

  // ========== GOOGLE CALENDAR INTEGRATION ==========
  // Check if Google Calendar is configured (API key exists)
  app.get("/api/calendar/configured", async (_req, res) => {
    res.json({
      configured: isGoogleCalendarConfigured(),
      message: isGoogleCalendarConfigured()
        ? "Google Calendar API configured"
        : "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set",
    });
  });

  // Check if user has Calendar access (valid OAuth tokens with calendar scope)
  app.get(
    "/api/calendar/status",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const hasAccess = await hasCalendarAccess(userId);

        res.json({
          hasAccess,
          configured: isGoogleCalendarConfigured(),
          message: hasAccess
            ? "Calendar access granted"
            : "Please connect your Google Calendar in Settings",
        });
      } catch (error: any) {
        console.error("[CALENDAR] Error checking status:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Get user's calendars list
  app.get(
    "/api/calendar/list",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const result = await getUserCalendars(userId);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({ calendars: result.calendars });
      } catch (error: any) {
        console.error("[CALENDAR] Error getting calendars:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Pull events from Google Calendar
  app.get(
    "/api/calendar/events",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { timeMin, timeMax, maxResults } = req.query;

        const result = await pullCalendarEvents(userId, {
          timeMin: timeMin ? new Date(timeMin as string) : undefined,
          timeMax: timeMax ? new Date(timeMax as string) : undefined,
          maxResults: maxResults ? parseInt(maxResults as string) : undefined,
        });

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({ events: result.events });
      } catch (error: any) {
        console.error("[CALENDAR] Error pulling events:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Create a generic event on Google Calendar (for test events, etc.)
  app.post(
    "/api/calendar/event",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { calendarId, summary, description, start, end, location, reminders } = req.body;

        if (!summary || !start || !end) {
          return res.status(400).json({ error: "Missing required fields: summary, start, end" });
        }

        const result = await createCalendarEvent(userId, {
          calendarId,
          summary,
          description,
          start,
          end,
          location,
          reminders,
        });

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({
          success: true,
          eventId: result.eventId,
          message: "Event created on Google Calendar",
        });
      } catch (error: any) {
        console.error("[CALENDAR] Error creating event:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Push an activity to Google Calendar
  app.post(
    "/api/calendar/sync/:activityId",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const activityId = req.params.activityId;

        // Get the activity
        const activity = await storage.getActivity(activityId, userId);
        if (!activity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        // Push to calendar - use startDate and endDate from activity
        const result = await pushActivityToCalendar(userId, {
          id: activity.id,
          title: activity.title,
          description: activity.description || undefined,
          startDate: activity.startDate?.toISOString() || undefined,
          endDate:
            activity.endDate?.toISOString() ||
            activity.startDate?.toISOString() ||
            undefined,
          location: activity.location || undefined,
          category: activity.category || undefined,
          googleCalendarEventId: activity.googleCalendarEventId || undefined,
        });

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // Update activity with the calendar event ID
        if (
          result.eventId &&
          result.eventId !== activity.googleCalendarEventId
        ) {
          await storage.updateActivity(
            activityId,
            {
              googleCalendarEventId: result.eventId,
            },
            userId,
          );
        }

        res.json({
          success: true,
          eventId: result.eventId,
          message: "Activity synced to Google Calendar",
        });
      } catch (error: any) {
        console.error("[CALENDAR] Error syncing activity:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Delete a calendar event
  app.delete(
    "/api/calendar/event/:eventId",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const eventId = req.params.eventId;

        const result = await deleteCalendarEvent(userId, eventId);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({
          success: true,
          message: "Event deleted from Google Calendar",
        });
      } catch (error: any) {
        console.error("[CALENDAR] Error deleting event:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Sync all activities to Google Calendar (batch operation)
  app.post(
    "/api/calendar/sync-all",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // Get all activities for the user that have start dates
        const allActivities = await storage.getActivitiesByUserId(userId);
        const activitiesWithDates = allActivities.filter((a) => a.startDate);

        if (activitiesWithDates.length === 0) {
          return res.json({
            success: 0,
            failed: 0,
            message: "No activities with dates to sync",
          });
        }

        // Map to calendar format
        const activitiesForCalendar = activitiesWithDates.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description || undefined,
          startDate: a.startDate?.toISOString() || undefined,
          endDate:
            a.endDate?.toISOString() || a.startDate?.toISOString() || undefined,
          location: a.location || undefined,
          category: a.category || undefined,
          googleCalendarEventId: a.googleCalendarEventId || undefined,
        }));

        const result = await syncAllActivitiesToCalendar(
          userId,
          activitiesForCalendar,
        );

        // Update activities with new event IDs (would need to return eventIds from sync)
        // For now, just return the result

        res.json({
          success: result.success,
          failed: result.failed,
          errors: result.errors,
          message: `Synced ${result.success} activities to Google Calendar`,
        });
      } catch (error: any) {
        console.error("[CALENDAR] Error syncing all activities:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // ========== DYNAMIC OPEN GRAPH IMAGE GENERATOR ==========
  // Serve dynamically generated OG images for share previews
  app.get("/api/og-image/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { generateOGImage } = await import("./services/ogImageGenerator");

      // Get activity data (try via share token or activity ID)
      const activity =
        (await storage.getActivityByShareToken(activityId)) ||
        (await storage.getActivity(activityId, DEMO_USER_ID));

      if (!activity || !activity.isPublic) {
        return res.status(404).send("Activity not found or not public");
      }

      const tasks = await storage.getActivityTasks(
        activity.id,
        activity.userId,
      );

      // Construct base URL for absolute image paths (with host validation)
      let baseUrl = process.env.PUBLIC_BASE_URL;
      if (!baseUrl) {
        const requestHost = (req.get("host") || "").toLowerCase();

        // Strip port to get clean hostname for validation
        const hostname = requestHost.split(":")[0];

        // Validate host to prevent header spoofing - exact match or trusted domain suffix
        const trustedDomains = ["replit.app", "repl.co"];
        const trustedExactHosts = ["localhost"];

        const isTrusted =
          trustedExactHosts.includes(hostname) ||
          trustedDomains.some(
            (domain) => hostname === domain || hostname.endsWith("." + domain),
          );

        if (isTrusted) {
          baseUrl = `${req.protocol}://${requestHost}`;
        } else {
          console.warn(
            "[OG IMAGE] Suspicious host header, using localhost fallback:",
            requestHost,
          );
          baseUrl = "http://localhost:5000";
        }
      }

      // Generate image
      const imageBuffer = await generateOGImage({
        activity,
        tasks,
        baseUrl,
      });

      // Set caching headers (cache for 1 hour)
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(imageBuffer);
    } catch (error) {
      console.error("[OG IMAGE] Error generating image:", error);
      res.status(500).send("Error generating image");
    }
  });

  // ========== SERVER-SIDE RENDERED SHARE PAGE FOR SOCIAL CRAWLERS ==========
  // This route must come BEFORE Vite middleware to serve pre-rendered HTML with OG tags
  // Social media crawlers (WhatsApp, Facebook, Twitter) don't execute JavaScript,
  // so we need to inject Open Graph meta tags server-side for rich previews
  app.get("/share/:token", async (req, res, next) => {
    const { token } = req.params;
    const userAgent = req.get("user-agent") || "";

    // Detect social media crawlers and bots
    const isCrawler =
      /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|instagram|pinterest|reddit/i.test(
        userAgent,
      );

    // Real users get the full React SPA with interactive features
    // Only serve static HTML with OG tags for social crawlers
    if (!isCrawler) {
      return next();
    }

    try {
      const activity = await storage.getActivityByShareToken(token);

      // Share links remain valid until activity is deleted or share token is explicitly revoked
      // Do NOT check isPublic - privacy toggles should not break existing share links
      if (!activity) {
        // Fall through to normal SPA handling which will show error
        return next();
      }

      const tasks = await storage.getActivityTasks(
        activity.id,
        activity.userId,
      );

      // Category emoji mapping
      const categoryEmojis: Record<string, string> = {
        fitness: "💪",
        health: "🏥",
        career: "💼",
        learning: "📚",
        finance: "💰",
        relationships: "❤️",
        creativity: "🎨",
        travel: "✈️",
        home: "🏠",
        personal: "⭐",
        other: "📋",
      };
      const emoji = categoryEmojis[activity.category?.toLowerCase()] || "✨";

      // Calculate progress
      const completedTasks = tasks.filter((t) => t.completed).length;
      const totalTasks = tasks.length;
      const progressPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const progressText =
        totalTasks > 0 ? ` - ${progressPercent}% complete!` : "";

      // Create rich, emoji-enhanced title and description
      const baseTitle =
        activity.shareTitle ||
        activity.planSummary ||
        activity.title ||
        "Shared Activity";
      const pageTitle = `${emoji} ${baseTitle}${progressText}`;
      const taskInfo =
        totalTasks > 0
          ? ` • ${totalTasks} tasks • ${completedTasks} completed`
          : "";
      const pageDescription = activity.description
        ? `${activity.description}${taskInfo}`
        : `Join this ${activity.category} plan on JournalMate${taskInfo}`;

      // Use dynamically generated OG image with activity details
      const baseUrl = req.protocol + "://" + req.get("host");
      const shareImage = `${baseUrl}/api/share/${token}/og-image`;
      const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

      // Read client template (works in both dev and production)
      const pathModule = await import("path");
      const fsPromises = await import("fs/promises");
      const clientTemplate = pathModule.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      let template = await fsPromises.readFile(clientTemplate, "utf-8");

      // Escape HTML to prevent XSS (for attributes and content)
      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const safePageTitle = escapeHtml(pageTitle);
      const safePageDescription = escapeHtml(pageDescription);
      const safeCurrentUrl = escapeHtml(currentUrl);
      const safeShareImage = escapeHtml(shareImage);

      // Remove all existing OG/Twitter meta tags from default template
      // This ensures crawlers see our share-specific tags first
      template = template.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "");
      template = template.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");
      template = template.replace(/<meta\s+name="description"[^>]*>/gi, "");

      // Inject share-specific Open Graph and Twitter Card meta tags
      const ogTags = `
    <title>${safePageTitle} - JournalMate</title>
    <meta name="description" content="${safePageDescription}" />
    
    <!-- Facebook App ID (Required for Facebook Sharing Debugger) -->
    <meta property="fb:app_id" content="1675001660123017" />
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${safeCurrentUrl}" />
    <meta property="og:title" content="${safePageTitle}" />
    <meta property="og:description" content="${safePageDescription}" />
    <meta property="og:image" content="${safeShareImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:site_name" content="JournalMate" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${safeCurrentUrl}" />
    <meta name="twitter:title" content="${safePageTitle}" />
    <meta name="twitter:description" content="${safePageDescription}" />
    <meta name="twitter:image" content="${safeShareImage}" />
  </head>`;

      template = template.replace("</head>", ogTags);

      // Send HTML with injected OG tags
      res.status(200).set({ "Content-Type": "text/html" }).send(template);
    } catch (e) {
      console.error("[SHARE SSR] Error serving share page:", e);
      // Fall through to normal SPA handling
      next();
    }
  });

  // ========== STRIPE SUBSCRIPTION ROUTES ==========

  // Create checkout session for subscription
  app.post(
    "/api/subscription/checkout",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      try {
        const { priceId, tier } = req.body;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create or retrieve Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            name: user.username,
            metadata: { userId },
          });
          customerId = customer.id;
          await storage.updateUserField(userId, "stripeCustomerId", customerId);
        }

        // Use production domain (journalmate.ai) for production, or dev domain for development
        const isProduction =
          process.env.REPLIT_DEPLOYMENT === "1" ||
          process.env.NODE_ENV === "production";
        const baseUrl = isProduction
          ? "https://journalmate.ai"
          : process.env.REPLIT_DOMAINS
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
            : "http://localhost:5000";

        // Logo URL - use journalmate.ai for production (deployed static assets)
        const logoUrl = isProduction
          ? "https://journalmate.ai/icons/email/email-logo-512.png"
          : `${baseUrl}/icons/email/email-logo-512.png`;

        // Try to create checkout session, but if customer doesn't exist (old test mode customer in live mode),
        // create a new customer and try again
        let session;
        try {
          session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/subscription/canceled`,
            metadata: { userId, tier },
            subscription_data: {
              trial_period_days: 7,
              metadata: { userId, tier },
            },
            // Add JournalMate branding with HD logo
            custom_text: {
              submit: {
                message:
                  "Start your 7-day free trial and unlock unlimited AI-powered planning!",
              },
            },
          });
        } catch (checkoutError: any) {
          // If customer doesn't exist (likely from test mode → live mode migration), create new customer
          if (
            checkoutError.code === "resource_missing" &&
            checkoutError.param === "customer"
          ) {
            console.log(
              "[CHECKOUT] Customer not found in live mode, creating new customer",
            );
            const newCustomer = await stripe.customers.create({
              email: user.email || undefined,
              name: user.username,
              metadata: { userId },
            });
            customerId = newCustomer.id;
            await storage.updateUserField(
              userId,
              "stripeCustomerId",
              customerId,
            );

            // Retry with new customer
            session = await stripe.checkout.sessions.create({
              customer: customerId,
              mode: "subscription",
              payment_method_types: ["card"],
              line_items: [{ price: priceId, quantity: 1 }],
              success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${baseUrl}/subscription/canceled`,
              metadata: { userId, tier },
              subscription_data: {
                trial_period_days: 7,
                metadata: { userId, tier },
              },
              custom_text: {
                submit: {
                  message:
                    "Start your 7-day free trial and unlock unlimited AI-powered planning!",
                },
              },
            });
          } else {
            throw checkoutError;
          }
        }

        res.json({ sessionId: session.id, url: session.url });
      } catch (error: any) {
        console.error("Checkout session error:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Create Customer Portal session
  app.post(
    "/api/subscription/portal",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      try {
        const userId = req.user?.id;
        const user = await storage.getUserById(userId);

        if (!user?.stripeCustomerId) {
          console.error(
            `[PORTAL] User ${user?.email} missing stripeCustomerId - tier: ${user?.subscriptionTier}`,
          );
          return res.status(400).json({
            error: "Subscription data missing",
            details:
              "Your subscription information is incomplete. Please contact support to resolve this issue.",
            userEmail: user?.email,
            userTier: user?.subscriptionTier,
          });
        }

        // Use production domain (journalmate.ai) for production, or dev domain for development
        const isProduction =
          process.env.REPLIT_DEPLOYMENT === "1" ||
          process.env.NODE_ENV === "production";
        const baseUrl = isProduction
          ? "https://journalmate.ai"
          : process.env.REPLIT_DOMAINS
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
            : "http://localhost:5000";

        let session;
        try {
          session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${baseUrl}/settings`,
          });
        } catch (portalError: any) {
          // If customer doesn't exist (stale/invalid customer ID), try to auto-recover
          if (portalError.code === "resource_missing") {
            console.error(
              `[PORTAL] Customer ${user.stripeCustomerId} not found in Stripe for user ${user.email} - attempting auto-recovery`,
            );

            // Try to find the user's customer in Stripe by email
            try {
              const customers = await stripe.customers.search({
                query: `email:'${user.email}'`,
                limit: 5,
              });

              if (customers.data.length === 0) {
                console.error(
                  `[PORTAL] No Stripe customer found for email ${user.email}`,
                );
                return res.status(400).json({
                  error: "Unable to access subscription portal",
                  details:
                    "No subscription found for your email. Please contact support.",
                  userEmail: user.email,
                });
              }

              // Get the first customer (should only be one per email)
              const customer = customers.data[0];

              // Get their active subscriptions
              const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: "active",
                limit: 5,
              });

              // Also check for trialing subscriptions
              const trialingSubscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: "trialing",
                limit: 5,
              });

              const allSubscriptions = [
                ...subscriptions.data,
                ...trialingSubscriptions.data,
              ];
              const userSubscription = allSubscriptions[0]; // Take first active/trialing subscription

              if (userSubscription) {
                const customerId =
                  typeof userSubscription.customer === "string"
                    ? userSubscription.customer
                    : userSubscription.customer.id;

                console.log(
                  `[PORTAL] Found matching subscription for ${user.email}, updating customer ID to ${customerId}`,
                );

                // Update user with correct IDs
                await storage.updateUser(user.id, {
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: userSubscription.id,
                });

                // Retry portal session with correct customer ID
                session = await stripe.billingPortal.sessions.create({
                  customer: customerId,
                  return_url: `${baseUrl}/settings`,
                });

                console.log(
                  `[PORTAL] Auto-recovery successful for ${user.email}`,
                );
              } else {
                console.error(
                  `[PORTAL] No active subscription found for ${user.email}`,
                );
                return res.status(400).json({
                  error: "Unable to access subscription portal",
                  details:
                    "Your subscription data is out of sync. Please contact support to resolve this issue.",
                  userEmail: user.email,
                  userTier: user.subscriptionTier,
                });
              }
            } catch (recoveryError: any) {
              console.error(
                `[PORTAL] Auto-recovery failed for ${user.email}:`,
                recoveryError.message,
              );
              return res.status(400).json({
                error: "Unable to access subscription portal",
                details:
                  "Could not locate your subscription. Please contact support.",
                userEmail: user.email,
              });
            }
          } else {
            throw portalError;
          }
        }

        res.json({ url: session.url });
      } catch (error: any) {
        console.error("Portal session error:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Get subscription status
  app.get(
    "/api/subscription/status",
    isAuthenticatedGeneric,
    async (req: any, res) => {
      try {
        const userId = req.user?.id;
        const user = await storage.getUserById(userId);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({
          tier: user.subscriptionTier || "free",
          status: user.subscriptionStatus || "active",
          planCount: user.planCount || 0,
          planLimit: user.subscriptionTier === "free" ? 5 : null,
          trialEndsAt: user.trialEndsAt,
          subscriptionEndsAt: user.subscriptionEndsAt,
        });
      } catch (error: any) {
        console.error("Status check error:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // ========== STRIPE WEBHOOK ==========
  // NOTE: Webhook handler moved to server/stripeWebhook.ts and registered in server/index.ts
  // It must be registered BEFORE express.json() to receive raw body buffer for signature verification

  // ========== END STRIPE ROUTES ==========

  // Facebook verification endpoint for popup-based login
  app.post("/api/auth/facebook/verify", async (req: any, res) => {
    try {
      const { accessToken, userInfo } = req.body;

      if (!accessToken || !userInfo) {
        return res
          .status(400)
          .json({ success: false, error: "Missing access token or user info" });
      }

      // Generate appsecret_proof for Facebook API security
      const appsecret_proof = crypto
        .createHmac("sha256", process.env.FACEBOOK_APP_SECRET)
        .update(accessToken)
        .digest("hex");

      // Verify the access token with Facebook and get comprehensive profile data
      const fields =
        "id,name,email,first_name,last_name,picture.type(large),birthday,age_range,location,gender,timezone,locale";
      const fbResponse = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&appsecret_proof=${appsecret_proof}&fields=${fields}`,
      );
      const fbUserData = await fbResponse.json();

      if (fbUserData.error) {
        console.error("Facebook token verification failed:", fbUserData.error);
        return res
          .status(401)
          .json({ success: false, error: "Invalid Facebook token" });
      }

      // Check if user already exists by email
      let user;
      if (fbUserData.email) {
        user = await storage.getUserByEmail(fbUserData.email);
      }

      if (!user) {
        // Generate username from email or Facebook name
        let username =
          fbUserData.name?.replace(/[^a-zA-Z0-9_]/g, "_") ||
          `fb_user_${fbUserData.id}`;
        if (fbUserData.email) {
          username = fbUserData.email
            .split("@")[0]
            .replace(/[^a-zA-Z0-9_]/g, "_");
        }

        // Calculate age from birthday if available
        let calculatedAge;
        if (fbUserData.birthday) {
          const birthDate = new Date(fbUserData.birthday);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            calculatedAge--;
          }
        } else if (fbUserData.age_range?.min) {
          // Use age range minimum as fallback
          calculatedAge = fbUserData.age_range.min;
        }

        // Extract location
        let location;
        if (fbUserData.location?.name) {
          location = fbUserData.location.name;
        }

        // Generate secure random password for OAuth users (they can't use manual login)
        const crypto = require("crypto");
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const hashedRandomPassword = await bcrypt.hash(randomPassword, 12);

        // Create new user with comprehensive profile data
        user = await storage.upsertUser({
          username: username,
          password: hashedRandomPassword, // Secure random password for OAuth users
          email: fbUserData.email || undefined,
          firstName:
            fbUserData.first_name ||
            fbUserData.name?.split(" ")[0] ||
            undefined,
          lastName:
            fbUserData.last_name ||
            fbUserData.name?.split(" ").slice(1).join(" ") ||
            undefined,
          profileImageUrl:
            fbUserData.picture?.data?.url ||
            `https://graph.facebook.com/${fbUserData.id}/picture?type=large`,
          age: calculatedAge || undefined,
          location: location || undefined,
          timezone: fbUserData.timezone || "UTC",
        });
      }

      // Create auth identity link
      try {
        await storage.createAuthIdentity({
          userId: user.id,
          provider: "facebook",
          providerUserId: fbUserData.id,
          email: fbUserData.email || undefined,
        });
      } catch (error) {
        // Auth identity might already exist, that's okay
        console.log(
          "Auth identity already exists for Facebook user:",
          fbUserData.id,
        );
      }

      // Store OAuth token
      try {
        await storage.upsertOAuthToken({
          userId: user.id,
          provider: "facebook",
          accessToken,
          refreshToken: undefined,
          expiresAt: null,
          scope: "email public_profile",
        });
      } catch (error) {
        console.log("OAuth token storage failed (non-critical):", error);
      }

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session creation failed:", err);
          return res
            .status(500)
            .json({ success: false, error: "Session creation failed" });
        }

        console.log("Facebook user authenticated successfully:", {
          userId: user.id,
          username: user.username,
          email: user.email,
        });

        res.json({ success: true, user });
      });
    } catch (error) {
      console.error("Facebook verification error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Check username availability endpoint
  app.get("/api/auth/username-availability", async (req: any, res) => {
    try {
      const username = req.query.username as string;

      if (!username || username.length < 3) {
        return res.json({ available: false, reason: "too_short" });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ available: false, reason: "invalid_format" });
      }

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);

      if (existingUser) {
        return res.json({ available: false, reason: "taken" });
      }

      res.json({ available: true });
    } catch (error) {
      console.error("[USERNAME CHECK] Error:", error);
      res.status(500).json({ available: false, reason: "error" });
    }
  });

  // Manual signup endpoint
  app.post("/api/auth/signup", async (req: any, res) => {
    try {
      console.log("[SIGNUP] Received signup request:", {
        username: req.body.username,
        email: req.body.email,
        hasPassword: !!req.body.password,
        hasFirstName: !!req.body.firstName,
        hasLastName: !!req.body.lastName,
      });

      const validatedData = signupUserSchema.parse(req.body);
      console.log("[SIGNUP] Data validated successfully");

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log("[SIGNUP] User already exists:", validatedData.email);
        return res.status(400).json({
          success: false,
          error:
            "Welcome back! Looks like you already have an account with us. Try logging in instead.",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(
        validatedData.password,
        saltRounds,
      );
      console.log("[SIGNUP] Password hashed successfully");

      // Create user
      const userData = {
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
        firstName: validatedData.firstName || undefined,
        lastName: validatedData.lastName || undefined,
      };

      const user = await storage.upsertUser(userData);
      console.log("[SIGNUP] User created successfully:", {
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      // Send welcome email (don't wait for it)
      sendWelcomeEmail(user.email, user.firstName || "there")
        .then((result) => {
          if (result.success) {
            console.log("[SIGNUP] Welcome email sent to:", user.email);
          } else {
            console.error(
              "[SIGNUP] Failed to send welcome email:",
              result.error,
            );
          }
        })
        .catch((err) => {
          console.error("[SIGNUP] Welcome email error:", err);
        });

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error("[SIGNUP] Session creation failed:", err);
          return res
            .status(500)
            .json({ success: false, error: "Session creation failed" });
        }

        console.log("[SIGNUP] Session created successfully for user:", user.id);
        console.log("[SIGNUP] Session ID:", req.sessionID);
        console.log(
          "[SIGNUP] Is authenticated:",
          req.isAuthenticated ? req.isAuthenticated() : false,
        );

        res.json({ success: true, user: { ...user, password: undefined } });
      });
    } catch (error) {
      console.error("[SIGNUP] Signup error:", error);
      if (error instanceof z.ZodError) {
        console.error(
          "[SIGNUP] Validation errors:",
          JSON.stringify(error.errors, null, 2),
        );
        return res.status(400).json({
          success: false,
          error: "Invalid data",
          details: error.errors,
        });
      }
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Manual login endpoint
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      });

      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Check if this is an OAuth-only user
      if (user.authenticationType === "oauth") {
        return res.status(400).json({
          success: false,
          error:
            "This account uses social login. Please sign in with Facebook or Google.",
        });
      }

      // Verify password with error handling
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            error: "Invalid email or password",
          });
        }
      } catch (error) {
        console.error("Password comparison error:", error);
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session creation failed:", err);
          return res
            .status(500)
            .json({ success: false, error: "Session creation failed" });
        }

        console.log("Manual login successful:", {
          userId: user.id,
          username: user.username,
          email: user.email,
        });

        res.json({ success: true, user: { ...user, password: undefined } });
      });
    } catch (error) {
      console.error("Manual login error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Helper function to get user from request (supports both authenticated and guest users)
  const getUserFromRequest = async (req: any) => {
    let userId: string | null = null;

    // Debug logging for authentication state
    console.log("[getUserFromRequest] Auth state:", {
      isAuthenticatedFn: !!req.isAuthenticated,
      isAuthenticated: req.isAuthenticated?.(),
      hasUser: !!req.user,
      userId: req.user?.id,
      userClaims: req.user?.claims?.sub,
      sessionUserId: req.session?.userId,
      passportUser: req.session?.passport?.user,
      sessionId: req.sessionID,
    });

    // Check multiple authentication methods for session persistence
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
      // Passport authentication (OAuth and manual login)
      userId = req.user.id;
      console.log("[getUserFromRequest] Using req.user.id:", userId);
    } else if (req.session?.userId) {
      // Direct session-based authentication
      userId = req.session.userId;
      console.log("[getUserFromRequest] Using session.userId:", userId);
    } else if (req.session?.passport?.user) {
      // Passport session serialization - handle both string ID and object formats
      const passportUser = req.session.passport.user;
      userId =
        typeof passportUser === "string" ? passportUser : passportUser?.id;
      console.log("[getUserFromRequest] Using session.passport.user:", userId);
    } else if (req.user?.claims?.sub) {
      // Replit auth user
      userId = req.user.claims.sub;
      console.log("[getUserFromRequest] Using user.claims.sub:", userId);
    }

    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          // Remove password from response and add authenticated flag
          const { password, ...userWithoutPassword } = user;

          // Check for profile image override from user_profiles table
          // This allows user-uploaded images to take precedence over OAuth images
          const userProfile = await storage.getUserProfile(userId);
          const effectiveProfileImageUrl =
            userProfile?.profileImageUrlOverride || user.profileImageUrl;

          console.log("Authenticated user found:", {
            userId,
            username: user.username,
            email: user.email,
            hasProfileImageOverride: !!userProfile?.profileImageUrlOverride,
          });

          return {
            ...userWithoutPassword,
            profileImageUrl: effectiveProfileImageUrl,
            authenticated: true,
            isGuest: false,
          };
        }
      } catch (error) {
        console.error("Error fetching authenticated user:", error);
      }
    }

    // Return demo user for guest access
    const demoUser = {
      id: "demo-user",
      username: "guest",
      authenticationType: "guest" as const,
      email: "guest@example.com",
      firstName: "Guest",
      lastName: "User",
      profileImageUrl: null,
      age: null,
      occupation: null,
      location: null,
      timezone: null,
      workingHours: null,
      fitnessLevel: null,
      sleepSchedule: null,
      primaryGoalCategories: [],
      motivationStyle: null,
      difficultyPreference: "medium" as const,
      interests: [],
      personalityType: null,
      communicationStyle: null,
      aboutMe: null,
      currentChallenges: null,
      successFactors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authenticated: false,
      isGuest: true,
    };

    console.log("No authenticated user found, returning demo user");
    return demoUser;
  };

  // Auth routes - supports both authenticated and guest users
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      const user = await getUserFromRequest(req);
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Main user endpoint (alias for /api/auth/user for backward compatibility)
  app.get("/api/user", async (req: any, res) => {
    try {
      // Prevent caching of user data to ensure fresh auth state after sign-in
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const user = await getUserFromRequest(req);
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Supabase auth sync - for Facebook OAuth via Supabase
  app.post("/api/auth/supabase-sync", async (req: any, res) => {
    try {
      const { userId, email, fullName, avatarUrl, provider } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log("Syncing Supabase user:", { userId, email, provider });

      // Check if user already exists by userId
      let user = await storage.getUser(userId);

      if (!user) {
        // Also check if user exists by email (might have logged in via different provider)
        const existingUserByEmail = await storage.getUserByEmail(email);

        if (existingUserByEmail) {
          // User exists with this email but different ID - just use the existing account
          console.log("Found existing user by email:", existingUserByEmail.id);
          user = existingUserByEmail;
        } else {
          // Create new user from Supabase data
          const nameParts = fullName ? fullName.split(" ") : [];
          const firstName = nameParts[0] || email.split("@")[0];
          const lastName =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

          user = await storage.upsertUser({
            id: userId,
            username: email.split("@")[0],
            email: email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: avatarUrl || null,
            authenticationType: "supabase" as const,
          });

          console.log("Created new Supabase user:", userId);
        }
      } else {
        console.log("Supabase user already exists:", userId);
      }

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session creation failed for Supabase user:", err);
          return res
            .status(500)
            .json({ success: false, error: "Session creation failed" });
        }

        console.log("Supabase user session created:", {
          userId: user.id,
          email: user.email,
        });

        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
      });
    } catch (error) {
      console.error("Supabase sync error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Profile completion route - update user profile with personalization data
  app.put("/api/users/:userId/profile", async (req, res) => {
    try {
      const { userId } = req.params;
      const validatedData = profileCompletionSchema.parse(req.body);

      // Update user profile
      const updatedUser = await storage.updateUser(userId, validatedData);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response
      const { password: _, ...safeUser } = updatedUser;

      res.json({
        message: "Profile updated successfully",
        user: safeUser,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Mark tutorial as completed
  app.post("/api/users/:userId/complete-tutorial", async (req, res) => {
    try {
      const { userId } = req.params;

      // Update user with tutorial completion
      const updatedUser = await storage.updateUser(userId, {
        hasCompletedTutorial: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`[TUTORIAL] User ${userId} completed tutorial`);

      res.json({
        success: true,
        message: "Tutorial marked as completed",
      });
    } catch (error) {
      console.error("Tutorial completion error:", error);
      res.status(500).json({ error: "Failed to mark tutorial as completed" });
    }
  });

  // Register device token for push notifications
  app.post("/api/user/device-token", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { token, platform, deviceName } = req.body;

      if (!token || !platform) {
        return res
          .status(400)
          .json({ error: "Token and platform are required" });
      }

      // Upsert device token (creates new or updates existing)
      const deviceToken = await storage.upsertDeviceToken(userId, {
        token,
        platform: platform as "ios" | "android" | "web",
        deviceName: deviceName || null,
        isActive: true,
      });

      console.log(`[DEVICE TOKEN] Registered for user ${userId}:`, {
        platform,
        deviceName: deviceName || "Unknown",
      });

      res.json({
        success: true,
        message: "Device token registered successfully",
      });
    } catch (error) {
      console.error("[DEVICE TOKEN] Registration error:", error);
      res.status(500).json({ error: "Failed to register device token" });
    }
  });

  // Unregister device token (on logout or app uninstall)
  app.delete("/api/user/device-token", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      await storage.deleteDeviceToken(token, userId);

      console.log(`[DEVICE TOKEN] Unregistered for user ${userId}`);

      res.json({
        success: true,
        message: "Device token unregistered successfully",
      });
    } catch (error) {
      console.error("[DEVICE TOKEN] Unregistration error:", error);
      res.status(500).json({ error: "Failed to unregister device token" });
    }
  });

  // ============================================
  // USER SAVED CONTENT / PREFERENCES API
  // ============================================

  // Save content for later (from social media share or URL)
  app.post("/api/user/saved-content", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { sourceUrl, extractedContent, userNotes, autoJournal } = req.body;

      if (!sourceUrl || !extractedContent) {
        return res
          .status(400)
          .json({ error: "Source URL and extracted content are required" });
      }

      const platform = detectPlatform(sourceUrl);

      // STEP 0: Check URL deduplication FIRST (silent skip per user preference)
      const userPrefs = await storage.getUserPreferences(userId);
      const currentPrefs = userPrefs?.preferences || {};
      const existingSharedURLs = currentPrefs.sharedURLs || [];

      if (
        checkDuplicateURL(sourceUrl, existingSharedURLs, DEFAULT_DEDUP_CONFIG)
      ) {
        console.log(
          `[URL DEDUP] ⏭️  URL already shared, skipping silently: ${sourceUrl}`,
        );
        return res.status(200).json({
          success: true,
          message: "Content already saved",
          skipped: true,
          reason: "duplicate_url",
        });
      }

      // Categorize the content using AI
      console.log(
        `[SAVE CONTENT] Categorizing content from ${platform}: ${sourceUrl}`,
      );
      const categorized = await categorizeContent(extractedContent, platform);

      // Log detailed categorization results
      console.log(`[SAVE CONTENT] AI Categorization result:`);
      console.log(
        `  - primaryCategory: "${categorized.primaryCategory.name}" ${categorized.primaryCategory.emoji}`,
      );
      console.log(
        `  - subcategory: "${categorized.subcategory.name}" ${categorized.subcategory.emoji}`,
      );
      console.log(`  - title: "${categorized.title}"`);
      console.log(`  - venues count: ${categorized.venues?.length || 0}`);
      if (categorized.venues && categorized.venues.length > 0) {
        console.log(
          `  - venue types: ${categorized.venues.map((v: any) => v.type).join(", ")}`,
        );
      }

      // Save to database (adapt new two-level structure to existing schema)
      const savedContent = await storage.createUserSavedContent({
        userId,
        sourceUrl,
        platform,
        location: categorized.location,
        city: categorized.city,
        country: categorized.country,
        neighborhood: categorized.neighborhood,
        category: categorized.primaryCategory.name, // Store primary as category
        subcategory: categorized.subcategory.name, // Store subcategory name
        venues: categorized.venues,
        budgetTier: categorized.budgetTier,
        estimatedCost: categorized.estimatedCost,
        rawContent: extractedContent.substring(0, 10000), // Limit stored content
        title: categorized.title,
        tags: categorized.tags,
        userNotes: userNotes || null,
      });

      console.log(
        `[SAVE CONTENT] Saved content ${savedContent.id} for user ${userId}`,
      );
      console.log(
        `[SAVE CONTENT] Categorized: ${categorized.city}, ${categorized.primaryCategory.name} → ${categorized.subcategory.name}, ${categorized.venues?.length || 0} venues`,
      );

      // Auto-create journal entries if requested
      let journalEntryId = null;
      let venuesAddedCount = 0;
      const venueJournalIds: string[] = [];

      if (autoJournal) {
        try {
          // Normalize source URL for duplicate checking
          const normalizeUrlForDuplicateCheck = (urlString: string): string => {
            try {
              const url = new URL(urlString);
              let normalized =
                url.hostname.replace(/^www\./, "") +
                url.pathname.replace(/\/$/, "");
              normalized = normalized.replace(/\/p\/([^\/]+).*/, "/p/$1");
              normalized = normalized.replace(/\?.*$/, "");
              return normalized.toLowerCase();
            } catch {
              return urlString.toLowerCase().replace(/\/$/, "");
            }
          };

          const normalizedSourceUrl = normalizeUrlForDuplicateCheck(sourceUrl);

          // If there are venues, save EACH venue as its own journal item
          if (categorized.venues && categorized.venues.length > 0) {
            // Fetch user preferences once
            const userPrefs = await storage.getUserPreferences(userId);
            const currentPrefs = userPrefs?.preferences || {};
            const journalData = currentPrefs.journalData || {};
            const existingSharedURLs = currentPrefs.sharedURLs || [];

            // Track dynamic categories created during this save
            // Handle both array format (from manual creation) and object format (from smart categorization)
            let existingCustomCategories: Record<string, DynamicCategoryInfo> =
              {};
            if (Array.isArray(currentPrefs.customJournalCategories)) {
              // Convert array to object for consistent handling
              for (const cat of currentPrefs.customJournalCategories) {
                existingCustomCategories[cat.id] = {
                  id: cat.id,
                  label: cat.name || cat.label || cat.id,
                  emoji: cat.emoji || "",
                  color: cat.color || "from-teal-500 to-cyan-500",
                };
              }
            } else if (currentPrefs.customJournalCategories) {
              existingCustomCategories = currentPrefs.customJournalCategories;
            }
            const newDynamicCategories: Record<string, DynamicCategoryInfo> =
              {};
            const newPrimaryCategories: Record<string, any> = {};

            // TWO-LEVEL CATEGORIZATION: Get AI suggestions
            console.log(
              `[TWO-LEVEL] AI suggested Primary: "${categorized.primaryCategory.name}" ${categorized.primaryCategory.emoji}`,
            );
            console.log(
              `[TWO-LEVEL] AI suggested Subcategory: "${categorized.subcategory.name}" ${categorized.subcategory.emoji}`,
            );

            // STEP 1: Fuzzy match PRIMARY category
            const existingPrimaryCategories = Object.values(
              currentPrefs.customPrimaryCategories || {},
            ).map((p: any) => ({ id: p.id, name: p.label }));

            const similarPrimary = findSimilarCategory(
              categorized.primaryCategory.name,
              existingPrimaryCategories,
              DEFAULT_DEDUP_CONFIG,
            );

            let primaryCategoryId: string;
            let primaryCategoryLabel: string;
            let primaryCategoryEmoji: string;

            if (similarPrimary) {
              // Reuse existing primary category
              primaryCategoryId = similarPrimary.id;
              primaryCategoryLabel = similarPrimary.name;
              const existingPrimary =
                currentPrefs.customPrimaryCategories?.[primaryCategoryId];
              primaryCategoryEmoji =
                existingPrimary?.emoji || categorized.primaryCategory.emoji;
              console.log(
                `[TWO-LEVEL] ✅ Reusing primary: "${primaryCategoryLabel}" (${primaryCategoryId})`,
              );
            } else {
              // Create new primary category
              primaryCategoryId = generatePrimaryCategoryId(
                categorized.primaryCategory.name,
              );
              primaryCategoryLabel = categorized.primaryCategory.name;
              primaryCategoryEmoji = categorized.primaryCategory.emoji;

              newPrimaryCategories[primaryCategoryId] = {
                id: primaryCategoryId,
                label: primaryCategoryLabel,
                emoji: primaryCategoryEmoji,
                subcategories: {},
                createdAt: new Date(),
                order: existingPrimaryCategories.length,
              };
              console.log(
                `[TWO-LEVEL] ✨ Created primary: "${primaryCategoryLabel}" ${primaryCategoryEmoji} (${primaryCategoryId})`,
              );
            }

            // STEP 2: Fuzzy match SUBCATEGORY within the primary category
            const existingSubcategories = Object.values(
              currentPrefs.customPrimaryCategories?.[primaryCategoryId]
                ?.subcategories || {},
            ).map((s: any) => ({ id: s.id, name: s.label }));

            const similarSubcategory = findSimilarSubcategory(
              categorized.subcategory.name,
              existingSubcategories,
              DEFAULT_DEDUP_CONFIG,
            );

            let subcategoryId: string;
            let subcategoryLabel: string;
            let subcategoryEmoji: string;

            if (similarSubcategory) {
              // Reuse existing subcategory
              subcategoryId = similarSubcategory.id;
              subcategoryLabel = similarSubcategory.name;
              const existingSubcat =
                currentPrefs.customPrimaryCategories?.[primaryCategoryId]
                  ?.subcategories?.[subcategoryId];
              subcategoryEmoji =
                existingSubcat?.emoji || categorized.subcategory.emoji;
              console.log(
                `[TWO-LEVEL] ✅ Reusing subcategory: "${subcategoryLabel}" (${subcategoryId})`,
              );
            } else {
              // Create new subcategory under the primary
              subcategoryId = generateSubcategoryId(
                categorized.subcategory.name,
              );
              subcategoryLabel = categorized.subcategory.name;
              subcategoryEmoji = categorized.subcategory.emoji;

              const subcategoryInfo = {
                id: subcategoryId,
                label: subcategoryLabel,
                emoji: subcategoryEmoji,
                color: generateColorGradient(),
                usageCount: 0,
                createdAt: new Date(),
              };

              // Add to new or existing primary category
              if (newPrimaryCategories[primaryCategoryId]) {
                newPrimaryCategories[primaryCategoryId].subcategories[
                  subcategoryId
                ] = subcategoryInfo;
              } else {
                // Need to update existing primary category with new subcategory
                if (!newPrimaryCategories[primaryCategoryId]) {
                  newPrimaryCategories[primaryCategoryId] = {
                    ...(currentPrefs.customPrimaryCategories?.[
                      primaryCategoryId
                    ] || {}),
                    subcategories: {
                      ...(currentPrefs.customPrimaryCategories?.[
                        primaryCategoryId
                      ]?.subcategories || {}),
                      [subcategoryId]: subcategoryInfo,
                    },
                  };
                }
              }

              console.log(
                `[TWO-LEVEL] ✨ Created subcategory: "${subcategoryLabel}" ${subcategoryEmoji} under "${primaryCategoryLabel}"`,
              );
            }

            // STEP 3: Use the subcategory ID as the journal category (maintains compatibility)
            const finalJournalCategory = subcategoryId;

            // Create dynamic category info for backward compatibility
            const dynamicInfo: DynamicCategoryInfo = {
              id: subcategoryId,
              label: subcategoryLabel,
              emoji: subcategoryEmoji,
              color: generateColorGradient(),
            };

            if (!existingCustomCategories[subcategoryId]) {
              newDynamicCategories[subcategoryId] = dynamicInfo;
            }

            // Group venues by their target journal category (now using subcategory)
            const venuesByCategory: Record<
              string,
              {
                venue: VenueInfo;
                category: string;
                dynamicInfo: DynamicCategoryInfo | null;
              }[]
            > = {};

            for (const venue of categorized.venues) {
              if (!venuesByCategory[finalJournalCategory]) {
                venuesByCategory[finalJournalCategory] = [];
              }
              venuesByCategory[finalJournalCategory].push({
                venue,
                category: finalJournalCategory,
                dynamicInfo,
              });
            }

            // Process each category and add venues
            console.log(
              `[SAVE CONTENT] Processing ${categorized.venues.length} venues from source`,
            );

            for (const [category, venueItems] of Object.entries(
              venuesByCategory,
            )) {
              const categoryItems = journalData[category] || [];
              const newItems: any[] = [];

              console.log(
                `[SAVE CONTENT] Category "${category}": ${venueItems.length} venues to process, ${categoryItems.length} existing items`,
              );

              for (
                let venueIndex = 0;
                venueIndex < venueItems.length;
                venueIndex++
              ) {
                const { venue } = venueItems[venueIndex];

                // Check for duplicates: same sourceUrl + same venue name (case-insensitive)
                // Check BOTH existing items AND items being added in this batch
                const isDuplicateInExisting = categoryItems.some(
                  (item: any) => {
                    const itemSourceUrl =
                      item.sourceUrl || item.originalUrl || "";
                    if (!itemSourceUrl) return false;
                    try {
                      const itemNormalized =
                        normalizeUrlForDuplicateCheck(itemSourceUrl);
                      const sameSource = itemNormalized === normalizedSourceUrl;
                      const sameName =
                        item.text?.toLowerCase().trim() ===
                        venue.name.toLowerCase().trim();
                      return sameSource && sameName;
                    } catch {
                      return false;
                    }
                  },
                );

                // Also check within the current batch to prevent within-batch duplicates
                // Include location check to allow same-named venues at different locations (e.g., chain restaurants)
                const isDuplicateInBatch = newItems.some((item: any) => {
                  const sameName =
                    item.text?.toLowerCase().trim() ===
                    venue.name.toLowerCase().trim();
                  const sameLocation =
                    (item.location?.toLowerCase().trim() || "") ===
                    (venue.location?.toLowerCase().trim() ||
                      venue.address?.toLowerCase().trim() ||
                      "");
                  return sameName && sameLocation;
                });

                const isDuplicate = isDuplicateInExisting || isDuplicateInBatch;

                if (isDuplicate) {
                  console.log(
                    `[SAVE CONTENT] Skipping duplicate venue #${venueIndex + 1}: "${venue.name}" (existingDup: ${isDuplicateInExisting}, batchDup: ${isDuplicateInBatch})`,
                  );
                  continue;
                }

                // Generate unique ID for the journal item with venue index for better uniqueness
                const venueItemId = `venue-${Date.now()}-${venueIndex}-${Math.random().toString(36).substring(2, 9)}`;

                // Create journal item for this venue
                const venueJournalItem = {
                  id: venueItemId,
                  text: venue.name,
                  date: new Date().toISOString().split("T")[0],
                  notes: venue.description || "",
                  sourceUrl: normalizedSourceUrl,
                  originalUrl: sourceUrl,
                  platform: platform.toLowerCase(),
                  venueType: venue.type,
                  priceRange: venue.priceRange,
                  priceAmount: venue.priceAmount,
                  location:
                    venue.location || venue.address || categorized.city || "",
                  keywords: [
                    platform.toLowerCase(),
                    "imported",
                    venue.type,
                  ].filter(Boolean),
                  aiConfidence: 0.85,
                  isImported: true,
                };

                newItems.push(venueJournalItem);
                venueJournalIds.push(venueItemId);
                venuesAddedCount++;
                console.log(
                  `[SAVE CONTENT] Adding venue #${venueIndex + 1} to journal: "${venue.name}" → ${category} (total so far: ${venuesAddedCount})`,
                );
              }

              // Update this category with new items at the beginning
              if (newItems.length > 0) {
                journalData[category] = [...newItems, ...categoryItems];
              }
            }

            // Batch update preferences with all venue entries, new custom categories, and primary categories
            if (
              venuesAddedCount > 0 ||
              Object.keys(newDynamicCategories).length > 0 ||
              Object.keys(newPrimaryCategories).length > 0
            ) {
              const updatedCustomCategories = {
                ...existingCustomCategories,
                ...newDynamicCategories,
              };

              const updatedPrimaryCategories = {
                ...(currentPrefs.customPrimaryCategories || {}),
                ...newPrimaryCategories,
              };

              // Add URL to shared URLs list for future deduplication
              const updatedSharedURLs = [...existingSharedURLs, sourceUrl];

              await storage.upsertUserPreferences(userId, {
                preferences: {
                  ...currentPrefs,
                  journalData,
                  customJournalCategories: updatedCustomCategories,
                  customPrimaryCategories: updatedPrimaryCategories,
                  sharedURLs: updatedSharedURLs,
                },
              });

              console.log(
                `[URL DEDUP] ✅ Added URL to shared history: ${sourceUrl}`,
              );

              const dynamicCatCount = Object.keys(newDynamicCategories).length;
              const primaryCatCount = Object.keys(newPrimaryCategories).length;
              console.log(
                `[SAVE CONTENT] SUMMARY: ${categorized.venues.length} venues extracted → ${venuesAddedCount} added to journal for user ${userId}`,
              );
              if (primaryCatCount > 0) {
                console.log(
                  `[SAVE CONTENT] Created ${primaryCatCount} new primary categories: ${Object.values(
                    newPrimaryCategories,
                  )
                    .map((c: any) => `${c.emoji} ${c.label}`)
                    .join(", ")}`,
                );
              }
              if (dynamicCatCount > 0) {
                console.log(
                  `[SAVE CONTENT] Created ${dynamicCatCount} new subcategories: ${Object.values(
                    newDynamicCategories,
                  )
                    .map((c) => `${c.emoji} ${c.label}`)
                    .join(", ")}`,
                );
              }
            }
          }

          // Create summary journal entry for backward compatibility
          const journalContent =
            `Saved from ${platform}: ${categorized.title || "Interesting content"}\n\n` +
            `Location: ${categorized.city || categorized.location || "Unknown"}\n` +
            `Category: ${categorized.primaryCategory.name} → ${categorized.subcategory.name}\n` +
            (categorized.venues?.length > 0
              ? `Venues (${venuesAddedCount} added to journal): ${categorized.venues.map((v: any) => v.name).join(", ")}\n`
              : "") +
            (userNotes ? `\nMy notes: ${userNotes}` : "");

          const journalEntry = await storage.createJournalEntry({
            userId,
            content: journalContent,
            category: mapAiCategoryNameToJournalCategory(
              categorized.primaryCategory.name,
            ),
            tags: categorized.tags,
            mood: "excited",
          });
          journalEntryId = journalEntry.id;

          // Update saved content with journal entry reference
          await storage.updateUserSavedContent(savedContent.id, userId, {
            journalEntryId,
          });

          console.log(
            `[SAVE CONTENT] Created summary journal entry ${journalEntryId}, ${venuesAddedCount} venue items added`,
          );
        } catch (journalError) {
          console.error(
            "[SAVE CONTENT] Error creating journal entries:",
            journalError,
          );
        }
      }

      res.json({
        success: true,
        savedContent: {
          ...savedContent,
          categoryDisplay: formatCategoryForDisplay(categorized.category),
          budgetDisplay: formatBudgetTierForDisplay(categorized.budgetTier),
        },
        journalEntryId,
        venuesAddedCount,
        venueJournalIds,
      });
    } catch (error) {
      console.error("Save content error:", error);
      res.status(500).json({ error: "Failed to save content" });
    }
  });

  // Get user's saved content (with filters)
  app.get("/api/user/saved-content", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { city, location, category, platform, limit } = req.query;

      const savedContent = await storage.getUserSavedContent(userId, {
        city: city as string,
        location: location as string,
        category: category as string,
        platform: platform as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        savedContent: savedContent.map((item: any) => ({
          ...item,
          categoryDisplay: formatCategoryForDisplay(item.category),
          budgetDisplay: formatBudgetTierForDisplay(item.budgetTier),
        })),
      });
    } catch (error) {
      console.error("Get saved content error:", error);
      res.status(500).json({ error: "Failed to fetch saved content" });
    }
  });

  // Get user's saved locations (for planning dropdown)
  app.get("/api/user/saved-locations", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const locations = await storage.getUserSavedLocations(userId);
      res.json({ locations });
    } catch (error) {
      console.error("Get saved locations error:", error);
      res.status(500).json({ error: "Failed to fetch saved locations" });
    }
  });

  // Get user's saved categories
  app.get("/api/user/saved-categories", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const categories = await storage.getUserSavedCategories(userId);
      res.json({
        categories: categories.map((c: any) => ({
          ...c,
          display: formatCategoryForDisplay(c.category),
        })),
      });
    } catch (error) {
      console.error("Get saved categories error:", error);
      res.status(500).json({ error: "Failed to fetch saved categories" });
    }
  });

  // Get preferences for a specific location (used by planning agent)
  app.get("/api/user/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { location, city, category } = req.query;

      if (!location && !city) {
        return res
          .status(400)
          .json({ error: "Location or city parameter required" });
      }

      const savedContent = await storage.getUserSavedContent(userId, {
        city: city as string,
        location: location as string,
        category: category as string,
        limit: 20,
      });

      // Format preferences for the planning agent
      const preferences = {
        location: city || location,
        savedItems: savedContent.length,
        venues: savedContent.flatMap((item: any) => item.venues || []),
        categories: [
          ...new Set(savedContent.map((item: any) => item.category)),
        ],
        budgetTiers: [
          ...new Set(
            savedContent
              .filter((item: any) => item.budgetTier)
              .map((item: any) => item.budgetTier),
          ),
        ],
        summary: savedContent.map((item: any) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          venues: item.venues?.map((v: any) => v.name) || [],
          budgetTier: item.budgetTier,
        })),
      };

      res.json({ preferences });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Delete saved content
  app.delete("/api/user/saved-content/:contentId", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { contentId } = req.params;

      await storage.deleteUserSavedContent(contentId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Delete saved content error:", error);
      res.status(500).json({ error: "Failed to delete saved content" });
    }
  });

  // Track when saved content is referenced in a plan
  app.post(
    "/api/user/saved-content/:contentId/reference",
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const { contentId } = req.params;

        // Verify ownership
        const content = await storage.getUserSavedContentById(
          contentId,
          userId,
        );
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        await storage.incrementContentReferenceCount(contentId);

        res.json({ success: true });
      } catch (error) {
        console.error("Reference content error:", error);
        res.status(500).json({ error: "Failed to track reference" });
      }
    },
  );

  // Temporary user ID for demo - in real app this would come from authentication
  const DEMO_USER_ID = "demo-user";

  // Helper function to check if a user is a demo user
  // Handles both static demo user (DEMO_USER_ID) and dynamic session-based demo IDs (demo-<timestamp>-<rand>)
  const isDemoUser = (userId: string | undefined): boolean => {
    if (!userId) return true;
    return (
      userId === DEMO_USER_ID ||
      userId === "demo-user" ||
      userId.startsWith("demo-")
    );
  };

  // GET /api/journal/entries - get all entries for a user
  app.get("/api/journal/entries", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, limit } = req.query;

      const entries = await storage.getUserJournalEntries(
        userId,
        limit ? parseInt(limit as string) : undefined,
      );

      // Filter by category if provided
      const filteredEntries = category
        ? entries.filter((e) => e.category === category)
        : entries;

      res.json({ entries: filteredEntries });
    } catch (error) {
      console.error("Get journal entries error:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  // POST /api/journal/entries/enrich/batch - Refresh and enrich multiple entries
  app.post("/api/journal/entries/enrich/batch", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { entryIds, forceRefresh, forceRevalidate } = req.body;

      if (!Array.isArray(entryIds)) {
        return res.status(400).json({ error: "entryIds array is required" });
      }

      // Get entries from storage
      const allUserEntries = await storage.getUserJournalEntries(userId);
      const entriesToEnrich = allUserEntries
        .filter((e) => entryIds.includes(e.id))
        .map((e) => ({
          id: e.id,
          text: e.content,
          category: e.category,
          existingEnrichment: e.metadata?.enrichment,
        }));

      if (entriesToEnrich.length === 0) {
        return res.json({ success: true, results: [] });
      }

      // Use the web enrichment service for batch processing
      const results = await journalWebEnrichmentService.enrichBatch(
        entriesToEnrich,
        forceRefresh,
      );

      // Save enrichment results back to storage
      for (const result of results) {
        if (result.success && result.enrichedData) {
          const entry = allUserEntries.find((e) => e.id === result.entryId);
          if (entry) {
            const updates: any = {
              metadata: {
                ...(entry.metadata || {}),
                enrichment: result.enrichedData,
              },
            };

            // Apply category correction if requested and suggested
            if (forceRevalidate && result.enrichedData.suggestedCategory) {
              console.log(
                `[JOURNAL_ENRICH] Auto-correcting entry ${entry.id} category: ${entry.category} -> ${result.enrichedData.suggestedCategory}`,
              );
              updates.category = result.enrichedData.suggestedCategory;
            }

            await storage.updateJournalEntry(entry.id, updates, userId);
          }
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Batch enrichment error:", error);
      res.status(500).json({ error: "Failed to process batch enrichment" });
    }
  });

  // POST /api/journal/entries/deduplicate - Remove duplicate entries within each category
  app.post("/api/journal/entries/deduplicate", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { dryRun = false } = req.body;

      console.log(
        `[JOURNAL DEDUP] Starting deduplication for user ${userId} (dryRun: ${dryRun})`,
      );

      // Get user preferences containing journal data
      const preferences = await storage.getUserPreferences(userId);
      const journalData = (preferences?.preferences as any)?.journalData || {};

      const stats: {
        category: string;
        originalCount: number;
        uniqueCount: number;
        duplicatesRemoved: number;
        duplicateNames: string[];
      }[] = [];

      let totalDuplicatesRemoved = 0;
      const cleanedJournalData: Record<string, any[]> = {};

      // Process each category
      for (const [category, entries] of Object.entries(journalData)) {
        if (!Array.isArray(entries)) {
          cleanedJournalData[category] = entries as any;
          continue;
        }

        const originalCount = entries.length;
        const seenNames = new Set<string>();
        const uniqueEntries: any[] = [];
        const duplicateNames: string[] = [];

        for (const entry of entries) {
          // Get the name to check - try multiple fields for different entry types
          const entryName = (
            entry.venueName ||
            entry.text ||
            entry.title ||
            entry.name ||
            ""
          )
            .toLowerCase()
            .trim();

          if (!entryName) {
            // Keep entries without names (shouldn't happen but be safe)
            uniqueEntries.push(entry);
            continue;
          }

          if (seenNames.has(entryName)) {
            // This is a duplicate - skip it
            duplicateNames.push(
              entry.venueName || entry.text || entry.title || entry.name,
            );
            totalDuplicatesRemoved++;
          } else {
            // First occurrence - keep it
            seenNames.add(entryName);
            uniqueEntries.push(entry);
          }
        }

        cleanedJournalData[category] = uniqueEntries;

        stats.push({
          category,
          originalCount,
          uniqueCount: uniqueEntries.length,
          duplicatesRemoved: originalCount - uniqueEntries.length,
          duplicateNames,
        });

        if (duplicateNames.length > 0) {
          console.log(
            `[JOURNAL DEDUP] ${category}: removed ${duplicateNames.length} duplicates: ${duplicateNames.slice(0, 5).join(", ")}${duplicateNames.length > 5 ? "..." : ""}`,
          );
        }
      }

      // Save the cleaned data (unless dry run)
      if (!dryRun && totalDuplicatesRemoved > 0) {
        await storage.upsertUserPreferences(userId, {
          preferences: {
            ...preferences?.preferences,
            journalData: cleanedJournalData,
          },
        });
        console.log(
          `[JOURNAL DEDUP] Saved cleaned journal data - removed ${totalDuplicatesRemoved} total duplicates`,
        );
      }

      res.json({
        success: true,
        dryRun,
        totalDuplicatesRemoved,
        stats,
        message: dryRun
          ? `Found ${totalDuplicatesRemoved} duplicates across all categories (dry run - no changes made)`
          : `Removed ${totalDuplicatesRemoved} duplicate entries from journal`,
      });
    } catch (error) {
      console.error("Journal deduplication error:", error);
      res.status(500).json({ error: "Failed to deduplicate journal entries" });
    }
  });

  // GET /api/journal/entries/confidence-stats - Get confidence score statistics
  app.get("/api/journal/entries/confidence-stats", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all user entries
      const allUserEntries = await storage.getUserJournalEntries(userId);

      // Calculate statistics by category
      const stats: any = {
        total: 0,
        enriched: 0,
        byCategory: {},
        confidenceDistribution: {
          high: 0, // >= 0.9
          medium: 0, // 0.7 - 0.89
          low: 0, // 0.5 - 0.69
          veryLow: 0, // < 0.5
          missing: 0, // no confidence score
        },
      };

      allUserEntries.forEach((entry) => {
        stats.total++;
        const enrichment = entry.metadata?.enrichment;

        if (enrichment) {
          stats.enriched++;
          const confidence = enrichment.categoryConfidence;
          const category = entry.category;

          // Initialize category stats if needed
          if (!stats.byCategory[category]) {
            stats.byCategory[category] = {
              total: 0,
              enriched: 0,
              avgConfidence: 0,
              confidenceSum: 0,
              low: 0,
            };
          }

          stats.byCategory[category].total++;
          stats.byCategory[category].enriched++;

          if (confidence !== undefined) {
            stats.byCategory[category].confidenceSum += confidence;

            // Update distribution
            if (confidence >= 0.9) {
              stats.confidenceDistribution.high++;
            } else if (confidence >= 0.7) {
              stats.confidenceDistribution.medium++;
            } else if (confidence >= 0.5) {
              stats.confidenceDistribution.low++;
            } else {
              stats.confidenceDistribution.veryLow++;
            }

            // Track low confidence entries per category
            if (confidence < 0.7) {
              stats.byCategory[category].low++;
            }
          } else {
            stats.confidenceDistribution.missing++;
          }
        } else {
          const category = entry.category;
          if (!stats.byCategory[category]) {
            stats.byCategory[category] = {
              total: 0,
              enriched: 0,
              avgConfidence: 0,
              confidenceSum: 0,
              low: 0,
            };
          }
          stats.byCategory[category].total++;
        }
      });

      // Calculate averages
      Object.keys(stats.byCategory).forEach((category) => {
        const catStats = stats.byCategory[category];
        if (catStats.enriched > 0) {
          catStats.avgConfidence = catStats.confidenceSum / catStats.enriched;
        }
        delete catStats.confidenceSum; // Remove internal calculation field
      });

      res.json({ success: true, stats });
    } catch (error) {
      console.error("Confidence stats error:", error);
      res.status(500).json({ error: "Failed to get confidence statistics" });
    }
  });

  // POST /api/journal/entries/enrich/batch-smart - Re-enrich entries using AI-powered API selection
  // AI intelligently determines which enrichment API to use (TMDB, Google Books, Spotify, or Tavily)
  app.post("/api/journal/entries/enrich/batch-smart", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { entryIds, forceAll } = req.body;

      // Get all user entries
      const allUserEntries = await storage.getUserJournalEntries(userId);

      // Filter entries to re-enrich
      let entriesToEnrich = allUserEntries;

      if (entryIds && Array.isArray(entryIds) && entryIds.length > 0) {
        // Specific entries requested
        entriesToEnrich = allUserEntries.filter((e) => entryIds.includes(e.id));
      } else if (!forceAll) {
        // Re-enrich entries with low confidence or no enrichment
        entriesToEnrich = allUserEntries.filter((e) => {
          const enrichment = e.metadata?.enrichment;

          // Re-enrich if low confidence or no enrichment
          return (
            !enrichment ||
            (enrichment.categoryConfidence !== undefined &&
              enrichment.categoryConfidence < 0.7)
          );
        });
      }

      console.log(
        `[Batch Smart Enrich] Processing ${entriesToEnrich.length} entries`,
      );

      if (entriesToEnrich.length === 0) {
        return res.json({
          success: true,
          processed: 0,
          results: [],
        });
      }

      // Prepare entries for enrichment
      const entriesForEnrichment = entriesToEnrich.map((e) => ({
        id: e.id,
        text: e.content,
        category: e.category,
        existingEnrichment: e.metadata?.enrichment,
      }));

      // Enrich in batches
      const results = await journalWebEnrichmentService.enrichBatch(
        entriesForEnrichment,
        true,
      ); // forceRefresh = true

      // Save results
      for (const result of results) {
        if (result.success && result.enrichedData) {
          const entry = allUserEntries.find((e) => e.id === result.entryId);
          if (entry) {
            await storage.updateJournalEntry(
              entry.id,
              {
                metadata: {
                  ...(entry.metadata || {}),
                  enrichment: result.enrichedData,
                },
              },
              userId,
            );
          }
        }
      }

      res.json({
        success: true,
        processed: entriesToEnrich.length,
        results: results.map((r) => ({
          id: r.entryId,
          success: r.success,
          venueName: r.enrichedData?.venueName,
          confidence: r.enrichedData?.categoryConfidence,
        })),
      });
    } catch (error) {
      console.error("[Batch Smart Enrich] Error:", error);
      res.status(500).json({ error: "Failed to batch enrich entries" });
    }
  });

  // POST /api/journal/entries/enrich/low-confidence - Re-enrich entries with low confidence scores
  app.post(
    "/api/journal/entries/enrich/low-confidence",
    async (req: any, res) => {
      try {
        const userId = getUserId(req) || DEMO_USER_ID;
        const { confidenceThreshold = 0.7, categories } = req.body;

        console.log(
          `[JOURNAL_RE_ENRICH] Finding low-confidence entries (threshold: ${confidenceThreshold})`,
        );

        // Get all user entries
        const allUserEntries = await storage.getUserJournalEntries(userId);

        // Filter entries with low confidence scores or missing confidence
        const lowConfidenceEntries = allUserEntries.filter((entry) => {
          const enrichment = entry.metadata?.enrichment;

          // Skip entries without enrichment
          if (!enrichment) return false;

          // Filter by category if specified
          if (categories && categories.length > 0) {
            const normalizeCategory = (c: string) =>
              c.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normalizedEntryCategory = normalizeCategory(entry.category);
            const normalizedFilterCategories = categories.map((c: string) =>
              normalizeCategory(c),
            );

            if (!normalizedFilterCategories.includes(normalizedEntryCategory)) {
              return false;
            }
          }

          // Include if confidence is missing or below threshold
          const confidence = enrichment.categoryConfidence;
          return confidence === undefined || confidence < confidenceThreshold;
        });

        console.log(
          `[JOURNAL_RE_ENRICH] Found ${lowConfidenceEntries.length} low-confidence entries to re-enrich`,
        );

        if (lowConfidenceEntries.length === 0) {
          return res.json({
            success: true,
            message: "No low-confidence entries found",
            results: [],
          });
        }

        // Prepare entries for enrichment
        const entriesToEnrich = lowConfidenceEntries.map((e) => ({
          id: e.id,
          text: e.content,
          category: e.category,
          existingEnrichment: e.metadata?.enrichment,
        }));

        // Use the web enrichment service with force refresh
        const results = await journalWebEnrichmentService.enrichBatch(
          entriesToEnrich,
          true,
        );

        // Save enrichment results back to storage and apply category corrections
        let correctedCount = 0;
        for (const result of results) {
          if (result.success && result.enrichedData) {
            const entry = allUserEntries.find((e) => e.id === result.entryId);
            if (entry) {
              const updates: any = {
                metadata: {
                  ...(entry.metadata || {}),
                  enrichment: result.enrichedData,
                },
              };

              // Auto-correct category if confidence improved significantly
              if (
                result.enrichedData.suggestedCategory &&
                result.enrichedData.categoryConfidence &&
                result.enrichedData.categoryConfidence > confidenceThreshold &&
                result.enrichedData.suggestedCategory !== entry.category
              ) {
                console.log(
                  `[JOURNAL_RE_ENRICH] Auto-correcting entry ${entry.id}: ${entry.category} -> ${result.enrichedData.suggestedCategory} (confidence: ${result.enrichedData.categoryConfidence})`,
                );
                updates.category = result.enrichedData.suggestedCategory;
                correctedCount++;
              }

              await storage.updateJournalEntry(entry.id, updates, userId);
            }
          }
        }

        const successCount = results.filter((r) => r.success).length;
        console.log(
          `[JOURNAL_RE_ENRICH] Re-enrichment complete: ${successCount}/${results.length} successful, ${correctedCount} categories corrected`,
        );

        res.json({
          success: true,
          results,
          stats: {
            total: lowConfidenceEntries.length,
            successful: successCount,
            corrected: correctedCount,
          },
        });
      } catch (error) {
        console.error("Low-confidence re-enrichment error:", error);
        res
          .status(500)
          .json({ error: "Failed to process low-confidence re-enrichment" });
      }
    },
  );

  // Create demo user if not exists (for backwards compatibility)
  const existingUser = await storage.getUser(DEMO_USER_ID);
  if (!existingUser) {
    try {
      await storage.upsertUser({
        id: DEMO_USER_ID,
        username: "demo_user",
        password: "demo_password",
        email: "demo@journalmate.ai",
        firstName: "Demo",
        lastName: "User",
      });
      console.log("Demo user created with ID:", DEMO_USER_ID);
    } catch (error: any) {
      // User already exists, that's fine
      if (!error.message?.includes("duplicate key")) {
        console.error("Failed to create demo user:", error);
      }
    }
  }

  // AI-powered goal processing - Returns plan data WITHOUT creating tasks/goals
  // Tasks are only created when user clicks "Create Activity" button
  app.post("/api/goals/process", async (req, res) => {
    try {
      const { goalText, sessionId, activityId, theme } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;

      if (!goalText || typeof goalText !== "string") {
        return res.status(400).json({ error: "Goal text is required" });
      }

      console.log("Processing goal:", goalText);

      // If activityId is provided, load existing activity for context
      let existingActivity:
        | {
            title: string;
            tasks: Array<{ title: string; description?: string }>;
          }
        | undefined;
      if (activityId) {
        try {
          const activity = await storage.getActivity(activityId, userId);
          if (activity) {
            const tasks = await storage.getActivityTasks(activityId, userId);
            existingActivity = {
              title: activity.title,
              tasks: tasks.map((t) => ({
                title: t.title,
                description: t.description || undefined,
              })),
            };
            console.log(
              "Loaded existing activity for refinement:",
              existingActivity.title,
            );
          }
        } catch (error) {
          console.error("Failed to load existing activity:", error);
          // Continue without existing activity context
        }
      }

      // Use AI to process the goal into tasks - switched to Claude as default
      const result = await aiService.processGoalIntoTasks(
        goalText,
        "claude",
        userId,
        existingActivity,
        theme,
      );

      // Generate importId if goal contains URL and has extracted venues
      let importId: string | undefined;
      const urlMatch = goalText.match(/https?:\/\/[^\s]+/i);
      const sourceUrl = urlMatch ? urlMatch[0] : undefined;

      if (
        sourceUrl &&
        result.allExtractedVenues &&
        result.allExtractedVenues.length > 0
      ) {
        importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save all extracted venues to journalData with importId for alternatives
        console.log(
          `[GOALS/PROCESS] Processing ${result.allExtractedVenues.length} venues from allExtractedVenues`,
        );
        try {
          const preferences = await storage.getUserPreferences(userId);
          const currentJournalData =
            (preferences?.preferences as any)?.journalData || {};

          let venuesSavedCount = 0;
          let duplicatesSkipped = 0;
          // Map venues to journal entries with importId
          // IMPORTANT: text field is ONLY the venue name (clean) for journal display
          // Context is stored separately for enrichment
          for (const venue of result.allExtractedVenues) {
            const category = venue.category || "restaurants";
            const entries = currentJournalData[category] || [];

            // DUPLICATE CHECK: Skip if same item already exists in this category
            // Works for all categories: books, movies, restaurants, exercises, travel destinations, etc.
            // Uses normalized comparison to catch variations like "The Dark Knight" vs "Dark Knight, The"
            const normalizeTitle = (title: string): string => {
              return title
                .toLowerCase()
                .replace(/^(the|a|an)\s+/i, '')        // Remove leading articles
                .replace(/,\s*(the|a|an)$/i, '')       // Remove trailing ", The" etc.
                .replace(/[^\w\s]/g, '')               // Remove punctuation
                .replace(/\s+/g, ' ')                  // Normalize whitespace
                .trim();
            };

            const normalizedItemName = normalizeTitle(venue.venueName || "");
            const isDuplicate = entries.some((existing: any) => {
              const existingName = normalizeTitle(
                existing.venueName ||
                existing.text ||
                existing.title ||
                existing.name ||
                ""
              );
              // Check for normalized name match (catches "The Dark Knight" vs "Dark Knight, The")
              if (
                existingName === normalizedItemName &&
                normalizedItemName.length > 0
              ) {
                return true;
              }
              return false;
            });

            if (isDuplicate) {
              console.log(
                `[GOALS/PROCESS DEDUP] Skipping duplicate: "${venue.venueName}" in category "${category}"`,
              );
              duplicatesSkipped++;
              continue;
            }

            entries.push({
              id: `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: venue.venueName, // CLEAN: Just the venue name, no description
              timestamp: new Date().toISOString(),
              venueName: venue.venueName,
              venueType: venue.venueType || category,
              location: venue.location || result.planLocation,
              budgetTier: venue.budgetTier,
              priceRange: venue.priceRange,
              estimatedCost: venue.estimatedCost,
              sourceUrl: sourceUrl,
              importId: importId,
              creator: venue.creator, // Author/director/artist for enrichment
              // Store planContext for smarter journal enrichment
              enrichmentContext: result.planContext
                ? {
                    theme: result.planContext.theme,
                    contentType: result.planContext.contentType,
                    sourceDescription: result.planContext.sourceDescription,
                  }
                : undefined,
            });

            currentJournalData[category] = entries;
            venuesSavedCount++;
          }

          await storage.upsertUserPreferences(userId, {
            preferences: {
              ...preferences?.preferences,
              journalData: currentJournalData,
            },
          });

          console.log(
            `[GOALS/PROCESS] SUMMARY: ${result.allExtractedVenues.length} venues extracted → ${venuesSavedCount} saved, ${duplicatesSkipped} duplicates skipped (importId: ${importId})`,
          );
        } catch (venueError) {
          console.error("[GOALS/PROCESS] Error saving venues:", venueError);
        }
      }

      // Save or update conversation session for history
      if (sessionId) {
        await storage.updateLifestylePlannerSession(
          sessionId,
          {
            conversationHistory: req.body.conversationHistory || [],
            generatedPlan: {
              title: result.planTitle,
              summary: result.summary,
              tasks: result.tasks,
              estimatedTimeframe: result.estimatedTimeframe,
              motivationalNote: result.motivationalNote,
            },
            sessionState: "completed",
          },
          userId,
        );
      }

      // Return plan data WITHOUT creating tasks or goals
      // Tasks will be created when user clicks "Create Activity" button
      res.json({
        planTitle: result.planTitle,
        summary: result.summary,
        tasks: result.tasks, // Return task data for preview, but don't save to DB
        estimatedTimeframe: result.estimatedTimeframe,
        motivationalNote: result.motivationalNote,
        sessionId,
        importId, // Include importId for alternatives lookup
        sourceUrl, // Include sourceUrl for UI display
        message: `Generated ${result.tasks.length} task previews! Click "Create Activity" to save them.`,
      });
    } catch (error) {
      console.error("Goal processing error:", error);
      res.status(500).json({ error: "Failed to process goal" });
    }
  });

  // Load existing activity for editing - returns activity data as plan format
  app.post("/api/goals/load-for-edit", async (req, res) => {
    try {
      const { activityId } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;

      if (!activityId) {
        return res.status(400).json({ error: "Activity ID is required" });
      }

      // Get current activity and tasks
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      const tasks = await storage.getActivityTasks(activityId, userId);

      // Return activity in the same format as processGoalIntoTasks
      res.json({
        planTitle: activity.title,
        summary: activity.planSummary || activity.description || "",
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || "",
          completed: t.completed || false,
        })),
        estimatedTimeframe: "",
        motivationalNote: "",
        activityId: activity.id, // Include activityId so we know to update instead of create
      });
    } catch (error) {
      console.error("Load activity error:", error);
      res.status(500).json({ error: "Failed to load activity" });
    }
  });

  // Save conversation session
  app.post("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { conversationHistory, generatedPlan, planningMode } = req.body;

      // Normalize planTitle to title for schema consistency
      const normalizedPlan = generatedPlan
        ? {
            ...generatedPlan,
            title: generatedPlan.title || generatedPlan.planTitle,
          }
        : {};

      const session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: "completed",
        conversationHistory: conversationHistory || [],
        generatedPlan: normalizedPlan,
        slots: {},
        externalContext: {
          currentMode: planningMode || "direct",
          savedFromMainApp: true,
        },
      });

      res.json(session);
    } catch (error) {
      console.error("Save conversation error:", error);
      res.status(500).json({ error: "Failed to save conversation" });
    }
  });

  // Get all conversation sessions for history
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      const sessions = await storage.getUserLifestylePlannerSessions(userId);

      res.json(sessions);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get specific conversation session
  app.get("/api/conversations/:sessionId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { sessionId } = req.params;

      const session = await storage.getLifestylePlannerSession(
        sessionId,
        userId,
      );

      if (!session) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Update existing conversation session
  app.put("/api/conversations/:sessionId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { sessionId } = req.params;
      const { conversationHistory, generatedPlan, planningMode } = req.body;

      // Verify session exists and belongs to user
      const existingSession = await storage.getLifestylePlannerSession(
        sessionId,
        userId,
      );
      if (!existingSession) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Normalize planTitle to title for consistency with schema
      const normalizedPlan = generatedPlan
        ? {
            ...generatedPlan,
            title: generatedPlan.title || generatedPlan.planTitle,
          }
        : existingSession.generatedPlan;

      // Update session
      const updatedSession = await storage.updateLifestylePlannerSession(
        sessionId,
        {
          conversationHistory:
            conversationHistory || existingSession.conversationHistory,
          generatedPlan: normalizedPlan,
          externalContext: {
            ...existingSession.externalContext,
            currentMode:
              planningMode || existingSession.externalContext?.currentMode,
          },
        },
        userId,
      );

      res.json(updatedSession);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // NEW ENDPOINTS FOR SIDEBAR FEATURES

  // Get recent activities with progress info
  app.get("/api/activities/recent", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { status, category } = req.query;

      const activities = await storage.getActivitiesWithProgress(userId, {
        status: status as string,
        category: category as string,
        includeArchived: false,
      });

      res.json(activities);
    } catch (error) {
      console.error("Get recent activities error:", error);
      res.status(500).json({ error: "Failed to fetch recent activities" });
    }
  });

  // Get comprehensive progress statistics
  app.get("/api/progress/stats", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const days = parseInt(req.query.days as string) || 7;

      const stats = await storage.getProgressStats(userId, days);

      res.json(stats);
    } catch (error) {
      console.error("Get progress stats error:", error);
      res.status(500).json({ error: "Failed to fetch progress statistics" });
    }
  });

  // Get activities created from a specific chat import
  app.get("/api/chat-imports/:importId/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { importId } = req.params;

      const activities = await storage.getActivitiesByChatImportId(
        importId,
        userId,
      );

      res.json(activities);
    } catch (error) {
      console.error("Get chat import activities error:", error);
      res.status(500).json({ error: "Failed to fetch chat import activities" });
    }
  });

  // Share app or activity with a contact
  app.post("/api/contacts/:contactId/share", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { contactId } = req.params;
      const { shareType, activityId, groupId, invitationMessage } = req.body;

      const share = await storage.createContactShare({
        contactId,
        sharedBy: userId,
        shareType: shareType || "app_invitation",
        activityId,
        groupId,
        invitationMessage,
        status: "pending",
      });

      res.json(share);
    } catch (error) {
      console.error("Share with contact error:", error);
      res.status(500).json({ error: "Failed to share with contact" });
    }
  });

  // Get contacts with sharing status
  app.get("/api/contacts/shared", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      const contactsWithShares =
        await storage.getContactsWithShareStatus(userId);

      res.json(contactsWithShares);
    } catch (error) {
      console.error("Get shared contacts error:", error);
      res.status(500).json({ error: "Failed to fetch shared contacts" });
    }
  });

  // Get user tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const tasks = await storage.getUserTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Widget API: Get compact data for home screen widgets (v2 - new design)
  // Returns EXACT same values as Progress Dashboard - Tasks, Streak, Total, Rate, Notifications
  // Supports both Bearer token auth (Authorization header) and X-User-ID header
  app.get("/api/tasks/widget", async (req, res) => {
    try {
      // First try to authenticate via Bearer token
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const tokenData = await storage.getNativeAuthToken(token);
          if (tokenData) {
            userId = tokenData.userId;
          }
        } catch (e) {
          // Token lookup failed, fall through to other methods
        }
      }

      // Fall back to X-User-ID header or session
      if (!userId) {
        userId = getUserId(req) || DEMO_USER_ID;
      }

      // Use the EXACT SAME query and calculation as /api/progress endpoint
      // Query ALL tasks (including completed) - same as Progress Dashboard
      const tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.userId, userId),
            or(eq(tasksTable.archived, false), isNull(tasksTable.archived)),
          ),
        );

      // Get unread notifications count
      const unreadNotifications =
        await storage.getUnreadNotificationsCount(userId);

      // Get today's date in YYYY-MM-DD format (local timezone) - SAME as /api/progress
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Calculate completed tasks - SAME as /api/progress
      const completedTasks = tasks.filter(
        (task: any) => task.completed === true,
      );

      // Calculate completed TODAY - SAME as /api/progress
      const completedToday = completedTasks.filter((task: any) => {
        if (!task.completedAt) return false;
        const completionDate =
          task.completedAt instanceof Date
            ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, "0")}-${String(task.completedAt.getDate()).padStart(2, "0")}`
            : task.completedAt.toString().split("T")[0];
        return completionDate === today;
      }).length;

      // Count active tasks for today - SAME as /api/progress
      const activeTasks = tasks.filter((task: any) => {
        if (!task.completed) return true;
        if (!task.completedAt) return false;
        const completionDate =
          task.completedAt instanceof Date
            ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, "0")}-${String(task.completedAt.getDate()).padStart(2, "0")}`
            : task.completedAt.toString().split("T")[0];
        return completionDate === today;
      });
      const totalToday = activeTasks.length;

      // Calculate actual consecutive day streak - SAME as /api/progress
      let weeklyStreak = 0;
      {
        const streakToday = new Date();
        streakToday.setHours(0, 0, 0, 0);
        const getDateStrForStreak = (d: any): string | null => {
          if (!d) return null;
          if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return d.toString().split('T')[0];
        };
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(streakToday);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          const hasActivity = completedTasks.some((t: any) => getDateStrForStreak(t.completedAt) === dateStr);
          if (hasActivity) {
            weeklyStreak++;
          } else if (i > 0) {
            break;
          }
        }
      }

      // Total completed - SAME as /api/progress
      const totalCompleted = completedTasks.length;

      // Completion rate - SAME as /api/progress
      const completionRate =
        tasks.length > 0
          ? Math.round((totalCompleted / tasks.length) * 100)
          : 0;

      // Response matches Progress Dashboard exactly:
      // - Tasks: completedToday / totalToday (e.g., 15/185)
      // - Streak: weeklyStreak (e.g., 7)
      // - Total: totalCompleted (e.g., 43)
      // - Rate: completionRate (e.g., 20%)
      // - Notifications: unreadNotifications (badge count)
      res.json({
        tasksCompleted: completedToday,
        tasksTotal: totalToday,
        streak: weeklyStreak,
        totalCompleted: totalCompleted,
        completionRate: completionRate,
        unreadNotifications: unreadNotifications,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Widget data error:", error);
      res.status(500).json({ error: "Failed to fetch widget data" });
    }
  });

  // Complete a task (swipe right)
  app.post("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const task = await storage.completeTask(taskId, userId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Check if this task belongs to a group activity and log completion + notify
      try {
        const groupActivity = await storage.getGroupActivityByTaskId(taskId);
        if (groupActivity) {
          await storage.logActivityChange({
            groupActivityId: groupActivity.id,
            userId,
            changeType: "task_completed",
            changeDescription: `completed "${task.title}"`,
          });

          // Send notification to group members
          const completingUser = await storage.getUser(userId);
          const activity = await storage.getActivity(
            groupActivity.activityId,
            userId,
          );

          await sendGroupNotification(storage, {
            groupId: groupActivity.groupId,
            actorUserId: userId,
            excludeUserIds: [userId], // Don't notify the person who completed the task
            notificationType: "task_completed",
            payload: {
              title: `Task completed in ${activity?.title || "group activity"}`,
              body: `${completingUser?.username || "Someone"} completed "${task.title}"`,
              data: {
                groupId: groupActivity.groupId,
                groupActivityId: groupActivity.id,
                taskId,
              },
              route: `/groups/${groupActivity.groupId}`,
            },
          });

          // Send real-time WebSocket update
          socketService.emitTaskCompleted(
            groupActivity.groupId,
            taskId,
            userId,
            completingUser?.username || "Someone",
            task.title,
          );
        }
      } catch (logError) {
        console.error("Failed to log group activity:", logError);
        // Don't fail the request if logging fails
      }

      // ALSO check if this task belongs to a PERSONAL activity that shares progress with a group
      try {
        // Get all activities this task belongs to
        const activityTasks = await storage.getActivityTasksForTask(taskId);
        console.log(
          "[TASK COMPLETE] Checking progress sharing for task:",
          taskId,
          "- Found",
          activityTasks.length,
          "activity-task links",
        );

        for (const at of activityTasks) {
          const activity = await storage.getActivityById(at.activityId);
          console.log("[TASK COMPLETE] Activity check:", {
            activityId: at.activityId,
            title: activity?.title,
            sharesProgressWithGroup: activity?.sharesProgressWithGroup,
            linkedGroupActivityId: activity?.linkedGroupActivityId,
            targetGroupId: activity?.targetGroupId,
          });

          // If this activity shares progress with a group, log it to the group feed
          if (
            activity &&
            activity.sharesProgressWithGroup &&
            activity.linkedGroupActivityId
          ) {
            const completingUser = await storage.getUser(userId);
            const groupActivity = await storage.getGroupActivityById(
              activity.linkedGroupActivityId,
            );

            if (groupActivity) {
              // Log to group activity feed
              await storage.logGroupActivity({
                groupId: groupActivity.groupId,
                userId,
                userName: completingUser?.username || "Someone",
                activityType: "task_completed",
                activityTitle: activity.title,
                taskTitle: task.title,
                groupActivityId: groupActivity.id,
              });

              // Send notification to group members
              await sendGroupNotification(storage, {
                groupId: groupActivity.groupId,
                actorUserId: userId,
                excludeUserIds: [userId], // Don't notify the person who completed the task
                notificationType: "task_completed",
                payload: {
                  title: `Member progress update`,
                  body: `${completingUser?.username || "Someone"} completed "${task.title}" in ${activity.title}`,
                  data: {
                    groupId: groupActivity.groupId,
                    groupActivityId: groupActivity.id,
                    taskId,
                    userId,
                  },
                  route: `/groups/${groupActivity.groupId}`,
                },
              });

              // Send real-time WebSocket update
              socketService.emitTaskCompleted(
                groupActivity.groupId,
                taskId,
                userId,
                completingUser?.username || "Someone",
                task.title,
              );
            }
          }
        }
      } catch (shareError) {
        console.error("Failed to sync progress sharing:", shareError);
        // Don't fail the request if sharing fails
      }

      // Trigger smart notification: cancel pending reminders and update streak
      onTaskCompleted(storage, task, userId).catch((err) =>
        console.error("[NOTIFICATION] Task completed hook error:", err),
      );

      // Check and unlock badges based on new task completion
      checkAndUnlockBadges(storage, userId, 'task_completed').catch((err) =>
        console.error("[ACHIEVEMENT] Badge check error on task complete:", err),
      );

      res.json({
        task,
        message: "Task completed! 🎉",
        achievement: {
          title: "Task Master!",
          description: `You completed "${task.title}"! Keep up the amazing work!`,
          type: "task",
          points: 10,
        },
      });
    } catch (error) {
      console.error("Complete task error:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Uncomplete a task (undo completion)
  app.post("/api/tasks/:taskId/uncomplete", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Reset task completion status
      const task = await storage.updateTask(
        taskId,
        {
          completed: false,
          completedAt: null,
        },
        userId,
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // If task belongs to an activity, uncomplete the activity too (since it's no longer 100% complete)
      const activityTaskLinks = await storage.getActivityTasksForTask(taskId);
      let activityUncompleted = false;

      for (const link of activityTaskLinks) {
        const activity = await storage.getActivity(link.activityId, userId);
        if (activity && activity.completedAt) {
          // Activity was completed, now uncomplete it since a task is incomplete
          await storage.updateActivity(
            link.activityId,
            {
              completedAt: null,
            },
            userId,
          );
          activityUncompleted = true;
        }
      }

      res.json({
        task,
        activityUncompleted,
        message: activityUncompleted
          ? "Task and activity marked as incomplete. You can complete them again when ready!"
          : "Task marked as incomplete. You can complete it again when ready!",
      });
    } catch (error) {
      console.error("Uncomplete task error:", error);
      res.status(500).json({ error: "Failed to uncomplete task" });
    }
  });

  // Skip a task (swipe left)
  app.post("/api/tasks/:taskId/skip", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Mark task as skipped
      const task = await storage.updateTask(
        taskId,
        {
          skipped: true,
        },
        userId,
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({
        task,
        message: "Task skipped. You can always come back to it later!",
      });
    } catch (error) {
      console.error("Skip task error:", error);
      res.status(500).json({ error: "Failed to skip task" });
    }
  });

  // Snooze a task (swipe up)
  app.post("/api/tasks/:taskId/snooze", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const snoozeSchema = z.object({
        hours: z.number().int().positive().max(168), // Max 1 week
      });

      const { hours } = snoozeSchema.parse(req.body);

      // Calculate snooze time (current time + hours)
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);

      const task = await storage.updateTask(
        taskId,
        {
          snoozeUntil: snoozeUntil,
        },
        userId,
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json({
        task,
        message: `Task snoozed for ${hours} hour${hours !== 1 ? "s" : ""}! It will reappear in your list later.`,
        snoozeUntil: snoozeUntil.toISOString(),
      });
    } catch (error) {
      console.error("Snooze task error:", error);
      res.status(500).json({ error: "Failed to snooze task" });
    }
  });

  // Create a new task manually
  app.post("/api/tasks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { reminders, ...taskBody } = req.body;
      const taskData = insertTaskSchema.parse(taskBody);
      const task = await storage.createTask({
        ...taskData,
        userId,
      });

      // Create task reminders if provided and task has a due date
      if (task.dueDate && reminders && Array.isArray(reminders)) {
        const dueDate = new Date(task.dueDate);
        for (const reminder of reminders) {
          const scheduledAt = new Date(
            dueDate.getTime() - (reminder.minutesBefore || 30) * 60 * 1000,
          );
          // Only create reminder if it's in the future
          if (scheduledAt > new Date()) {
            await storage.createTaskReminder({
              taskId: task.id,
              userId,
              reminderType: reminder.type || "custom",
              scheduledAt,
              title: `Task Due: ${task.title}`,
              message:
                reminder.minutesBefore === 0
                  ? `Your task "${task.title}" is due now!`
                  : `Your task "${task.title}" is due in ${reminder.minutesBefore} minutes.`,
            });
          }
        }
      }

      // Trigger smart notification scheduling if task has a due date
      if (task.dueDate) {
        onTaskCreated(storage, task, userId).catch((err) =>
          console.error("[NOTIFICATION] Task created hook error:", err),
        );

        // Auto-sync task to Google Calendar if user has it enabled
        autoSyncTaskToCalendar(parseInt(userId), {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          dueDate: task.dueDate,
        }).catch((err) =>
          console.error("[CALENDAR] Task auto-sync error:", err),
        );
      }

      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  // Update a task
  app.patch("/api/tasks/:taskId", async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { reminders, ...updates } = req.body;

      // Sanitize date fields - convert ISO strings to Date objects
      if (updates.dueDate !== undefined) {
        updates.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      }
      if (updates.completedAt !== undefined) {
        updates.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
      }
      if (updates.snoozeUntil !== undefined) {
        updates.snoozeUntil = updates.snoozeUntil ? new Date(updates.snoozeUntil) : null;
      }

      // Validate task exists and belongs to user
      const existingTask = await storage.getTask(taskId, userId);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Update the task
      const result = await storage.updateTask(taskId, updates, userId);
      const task = result.task;
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Handle reminders if task has a due date
      if (task.dueDate && reminders && Array.isArray(reminders)) {
        // Delete existing reminders for this task
        const existingReminders = await storage.getTaskReminders(taskId);
        for (const existing of existingReminders) {
          await storage.deleteTaskReminder(existing.id, userId);
        }

        // Create new reminders
        const dueDate = new Date(task.dueDate);
        for (const reminder of reminders) {
          const scheduledAt = new Date(
            dueDate.getTime() - (reminder.minutesBefore || 30) * 60 * 1000,
          );
          // Only create reminder if it's in the future
          if (scheduledAt > new Date()) {
            await storage.createTaskReminder({
              taskId: task.id,
              userId,
              reminderType: reminder.type || "custom",
              scheduledAt,
              title: `Task Due: ${task.title}`,
              message:
                reminder.minutesBefore === 0
                  ? `Your task "${task.title}" is due now!`
                  : `Your task "${task.title}" is due in ${reminder.minutesBefore} minutes.`,
            });
          }
        }
      }

      // Trigger smart notification update if task has a due date
      if (task.dueDate) {
        onTaskUpdated(storage, task, updates, userId).catch((err) =>
          console.error("[NOTIFICATION] Task updated hook error:", err),
        );

        // Auto-sync task to Google Calendar if dueDate was updated and user has sync enabled
        if ("dueDate" in updates) {
          autoSyncTaskToCalendar(parseInt(userId), {
            id: task.id,
            title: task.title,
            description: task.description || undefined,
            dueDate: task.dueDate,
          }).catch((err) =>
            console.error("[CALENDAR] Task auto-sync error:", err),
          );
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  // Task feedback endpoints
  app.post("/api/tasks/:taskId/feedback", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { feedbackType } = req.body;

      if (feedbackType !== "like" && feedbackType !== "dislike") {
        return res
          .status(400)
          .json({
            error: 'Invalid feedback type. Must be "like" or "dislike"',
          });
      }

      // Check if removing feedback (same type clicked twice)
      const existingFeedback = await storage.getUserTaskFeedback(
        taskId,
        userId,
      );

      if (existingFeedback && existingFeedback.feedbackType === feedbackType) {
        // Remove feedback
        await storage.deleteTaskFeedback(taskId, userId);
        const stats = await storage.getTaskFeedbackStats(taskId);
        return res.json({ feedback: null, stats });
      }

      // Upsert feedback
      const feedback = await storage.upsertTaskFeedback(
        taskId,
        userId,
        feedbackType,
      );
      const stats = await storage.getTaskFeedbackStats(taskId);

      res.json({ feedback, stats });
    } catch (error) {
      console.error("Task feedback error:", error);
      res.status(500).json({ error: "Failed to save task feedback" });
    }
  });

  app.get("/api/tasks/:taskId/feedback", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const userFeedback = await storage.getUserTaskFeedback(taskId, userId);
      const stats = await storage.getTaskFeedbackStats(taskId);

      res.json({
        userFeedback: userFeedback || null,
        stats,
      });
    } catch (error) {
      console.error("Get task feedback error:", error);
      res.status(500).json({ error: "Failed to fetch task feedback" });
    }
  });

  // End-of-Day Review: Get today's completed tasks
  app.get("/api/tasks/completed-today", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all tasks for the user
      const allTasks = await storage.getUserTasks(userId);

      // Filter tasks completed today
      const today = new Date().toISOString().split("T")[0];
      const completedToday = allTasks.filter((task) => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt)
          .toISOString()
          .split("T")[0];
        return completedDate === today;
      });

      res.json({ tasks: completedToday });
    } catch (error) {
      console.error("Get completed tasks error:", error);
      res.status(500).json({ error: "Failed to fetch completed tasks" });
    }
  });

  // End-of-Day Review: Save task reactions
  app.post("/api/tasks/reactions", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { date, reactions } = req.body;

      if (!date || !Array.isArray(reactions)) {
        return res
          .status(400)
          .json({ error: "Date and reactions array required" });
      }

      // Store reactions in user preferences for analytics
      let prefs = await storage.getUserPreferences(userId);
      const currentPrefs = prefs?.preferences || {};
      const taskReactions = currentPrefs.taskReactions || {};

      // Store reactions by date
      taskReactions[date] = reactions;

      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          taskReactions,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Save reactions error:", error);
      res.status(500).json({ error: "Failed to save reactions" });
    }
  });

  // GET /api/alternatives - fetch alternative venues from journal or ContentImport based on location and budget tier
  app.get("/api/alternatives", async (req: any, res) => {
    try {
      const userId = getUserId(req) || getDemoUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const {
        location,
        budgetTier,
        category,
        excludeIds,
        sourceUrl,
        importId,
        matchBudget,
      } = req.query;

      // If importId is provided, fetch alternatives from ContentImport table
      if (importId) {
        try {
          const contentImport = await storage.getContentImport(
            String(importId),
            String(userId),
          );
          if (contentImport && contentImport.extractedItems) {
            const excludeIdList = excludeIds
              ? String(excludeIds).split(",").filter(Boolean)
              : [];

            // Filter to non-selected items not in exclude list
            // Note: For imports, we allow all items to be swappable alternatives, don't filter by selectedForPlan
            const alternatives = (contentImport.extractedItems as any[])
              .filter((item: any) => {
                if (excludeIdList.includes(item.id)) return false;
                // Don't filter by selectedForPlan for imports - all items should be swappable
                if (!item.venueName) return false;
                return true;
              })
              .map((item: any) => ({
                id: item.id,
                venueName: item.venueName,
                venueType: item.venueType,
                location: item.location,
                priceRange: item.priceRange,
                budgetTier: item.budgetTier,
                category: item.category,
                sourceUrl: contentImport.sourceUrl,
                importId: contentImport.id,
                estimatedCost: item.estimatedCost,
              }));

            console.log(
              `[ALTERNATIVES] Found ${alternatives.length} from ContentImport ${importId}`,
            );
            return res.json({ alternatives, source: "content_import" });
          }
        } catch (error) {
          console.error("[ALTERNATIVES] ContentImport lookup failed:", error);
          // Fall through to journal-based lookup
        }
      }

      // Fetch user's journal entries from preferences (fallback)
      const preferences = await storage.getUserPreferences(userId);
      const journalData = preferences?.preferences?.journalData || {};

      // Collect all journal entries across categories
      const allEntries: any[] = [];
      Object.keys(journalData).forEach((cat) => {
        const entries = journalData[cat] || [];
        entries.forEach((entry: any) => {
          allEntries.push({ ...entry, journalCategory: cat });
        });
      });

      // Parse excludeIds if provided
      const excludeIdList = excludeIds
        ? String(excludeIds).split(",").filter(Boolean)
        : [];

      // Extract city from various location formats (string or object)
      const getCity = (loc: any): string | null => {
        if (!loc) return null;
        if (typeof loc === "string") {
          // Parse "Austin, TX" or "Lagos, Nigeria" format - extract first part before comma
          return loc.split(",")[0].trim().toLowerCase();
        }
        if (typeof loc === "object") {
          return (loc.city || loc.neighborhood || "").toLowerCase();
        }
        return null;
      };

      // Helper: fuzzy city match (case-insensitive, partial match)
      const cityMatches = (entryLocation: any, searchCity: string): boolean => {
        if (!searchCity) return false;
        const entryCity = getCity(entryLocation);
        if (!entryCity) return false;
        const searchLower = searchCity.toLowerCase();
        return (
          entryCity.includes(searchLower) || searchLower.includes(entryCity)
        );
      };

      // Helper: budget tier adjacency (budget ↔ moderate ↔ luxury ↔ ultra_luxury)
      const budgetAdjacent = (
        entryTier: string,
        targetTier: string,
      ): boolean => {
        if (!entryTier || !targetTier) return true; // If no tier specified, include all
        const tiers = ["budget", "moderate", "luxury", "ultra_luxury"];
        const entryIdx = tiers.indexOf(entryTier);
        const targetIdx = tiers.indexOf(targetTier);
        if (entryIdx === -1 || targetIdx === -1) return true;
        return Math.abs(entryIdx - targetIdx) <= 1;
      };

      // Filter entries
      let alternatives = allEntries.filter((entry) => {
        // Exclude entries by ID
        if (excludeIdList.includes(entry.id)) return false;

        // Must have venue name
        if (!entry.venueName) return false;

        // Don't filter by selectedForPlan - all venues from a source should be swappable

        // Filter by sourceUrl - show only venues from same source
        if (sourceUrl && entry.sourceUrl !== String(sourceUrl)) return false;

        // Filter by importId - show only venues from same import batch
        if (importId && entry.importId !== String(importId)) return false;

        // Filter by location if provided
        if (location && !cityMatches(entry.location, String(location)))
          return false;

        // Filter by budget tier - if matchBudget=true, only exact match; otherwise include adjacent tiers
        if (budgetTier) {
          if (matchBudget === "true") {
            // Exact budget match only
            if (entry.budgetTier !== String(budgetTier)) return false;
          } else {
            // Include adjacent budget tiers
            if (!budgetAdjacent(entry.budgetTier, String(budgetTier)))
              return false;
          }
        }

        // Filter by category if provided
        if (category) {
          const entryCat = (
            entry.venueType ||
            entry.journalCategory ||
            ""
          ).toLowerCase();
          const searchCat = String(category).toLowerCase();
          if (!entryCat.includes(searchCat) && !searchCat.includes(entryCat))
            return false;
        }

        return true;
      });

      // NO FALLBACK: Only return venues from the matching city
      // If no alternatives found for the location, return empty array

      // Format response - return all alternatives (no hard limit)
      const response = alternatives.map((entry) => ({
        id: entry.id,
        venueName: entry.venueName,
        venueType: entry.venueType || entry.journalCategory,
        location: entry.location,
        priceRange: entry.priceRange,
        budgetTier: entry.budgetTier,
        category: entry.journalCategory,
        sourceUrl: entry.sourceUrl,
        importId: entry.importId,
        estimatedCost: entry.estimatedCost,
      }));

      res.json({ alternatives: response });
    } catch (error) {
      console.error("Fetch alternatives error:", error);
      res.status(500).json({ error: "Failed to fetch alternatives" });
    }
  });

  // PATCH /api/tasks/:taskId/swap - swap task venue while preserving original task format
  app.patch("/api/tasks/:taskId/swap", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { taskId } = req.params;
      const {
        venueName,
        venueType,
        location,
        priceRange,
        budgetTier,
        contentItemId,
        estimatedCost,
        originalVenueName,
      } = req.body;

      if (!venueName) {
        return res.status(400).json({ error: "venueName is required" });
      }

      // Get the original task to preserve its format
      const originalTask = await storage.getTask(taskId, userId);
      if (!originalTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Preserve original task format - only swap the venue name and update venue-specific fields
      let newTitle = originalTask.title;
      let newDescription = originalTask.description;

      // If we know the original venue name, do a targeted replacement
      if (originalVenueName && newTitle.includes(originalVenueName)) {
        newTitle = newTitle.replace(originalVenueName, venueName);
      } else {
        // Fallback: Look for common patterns and replace venue-like words
        // Pattern: "Book [Venue Name] for..." or "Visit [Venue Name]" or "[Venue Name] - ..."
        const venuePatterns = [
          /^(Book\s+)([^-–\n]+?)(\s+for\s+)/i,
          /^(Visit\s+)([^-–\n]+?)(\s+[-–]|\s+in\s+|\s*$)/i,
          /^(Try\s+)([^-–\n]+?)(\s+[-–]|\s+in\s+|\s*$)/i,
          /^([^-–]+?)(\s+[-–]\s+)/,
        ];

        let matched = false;
        for (const pattern of venuePatterns) {
          const match = newTitle.match(pattern);
          if (match) {
            // Replace the venue portion (group 2) with new venue name
            newTitle = match[1] + venueName + (match[3] || "");
            matched = true;
            break;
          }
        }

        // If no pattern matched, just prepend venue name with original title structure hint
        if (!matched) {
          // Keep original structure but update venue
          const actionVerbs = ["Book", "Visit", "Try", "Check out", "Explore"];
          const hasActionVerb = actionVerbs.some((v) =>
            newTitle.toLowerCase().startsWith(v.toLowerCase()),
          );
          if (!hasActionVerb) {
            newTitle = venueName;
          }
        }
      }

      // Update description with venue details if it contains venue-related info
      if (newDescription) {
        // Add/update location in description
        const locationStr = location?.city || location?.neighborhood || "";
        if (locationStr && !newDescription.includes(locationStr)) {
          // Append location if not present
          newDescription =
            newDescription.replace(/\.$/, "") + ` in ${locationStr}.`;
        }

        // Update price range if present
        if (priceRange && estimatedCost) {
          // Replace any existing price pattern or add new one
          const pricePattern = /\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?/g;
          if (pricePattern.test(newDescription)) {
            newDescription = newDescription.replace(pricePattern, priceRange);
          }
        }
      }

      const task = await storage.updateTask(
        taskId,
        {
          title: newTitle,
          description: newDescription,
          contentItemId: contentItemId,
          estimatedCost: estimatedCost,
        },
        userId,
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      console.log(
        `[SWAP] Task ${taskId}: "${originalTask.title}" → "${newTitle}"`,
      );
      res.json({ task, message: `Task swapped to "${venueName}"` });
    } catch (error) {
      console.error("Swap task error:", error);
      res.status(500).json({ error: "Failed to swap task" });
    }
  });

  // ===== SUBSCRIPTION TIER ENFORCEMENT =====

  // Helper function to check if user has required subscription tier
  async function checkSubscriptionTier(
    userId: string,
    requiredTier: "pro" | "family",
  ): Promise<{ allowed: boolean; tier: string; message?: string }> {
    // Check if demo premium mode is enabled (for development/testing)
    const enableDemoPremium = process.env.ENABLE_DEMO_PREMIUM === "true";

    const user = await storage.getUserById(userId);

    // Treat missing users (including demo user) as free tier
    const tier = user?.subscriptionTier || "free";

    // If demo premium mode is enabled, treat demo users as having family tier
    if (enableDemoPremium && (userId === DEMO_USER_ID || !user)) {
      console.log(
        "[DEMO PREMIUM] Bypassing tier check for demo user - granting access",
      );
      return { allowed: true, tier: "family" };
    }

    // Check tier hierarchy: free < pro < family
    if (requiredTier === "family") {
      if (tier === "family") {
        return { allowed: true, tier };
      }
      return {
        allowed: false,
        tier,
        message:
          "This feature requires a Family & Friends subscription ($14.99/month). Upgrade to collaborate with up to 5 users!",
      };
    }

    if (requiredTier === "pro") {
      if (tier === "pro" || tier === "family") {
        return { allowed: true, tier };
      }
      return {
        allowed: false,
        tier,
        message:
          "This feature requires a Pro subscription ($6.99/month). Upgrade for unlimited AI plans, insights, and more!",
      };
    }

    return { allowed: true, tier };
  }

  // ===== GROUPS & COLLABORATIVE PLANNING API =====

  // Helper function to generate invite codes
  function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const parts = [3, 3, 3].map((len) =>
      Array.from(
        { length: len },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join(""),
    );
    return parts.join("-");
  }

  // Helper function to inherit/copy an activity to a group
  async function inheritActivityToGroup(
    activityId: string,
    groupId: string,
    userId: string,
  ): Promise<Activity> {
    try {
      // Get the source activity
      const sourceActivity = await storage.getActivity(activityId, userId);
      if (!sourceActivity) {
        throw new Error("Source activity not found");
      }

      // Get all tasks from the source activity
      const sourceTasks = await storage.getActivityTasks(activityId, userId);

      // Create a copy of the activity with trackingEnabled set to true
      const newActivity = await storage.createActivity({
        title: sourceActivity.title,
        description: sourceActivity.description,
        category: sourceActivity.category,
        status: sourceActivity.status,
        planSummary: sourceActivity.planSummary,
        planningMode: sourceActivity.planningMode,
        isPublic: false, // Group activities are private by default
        trackingEnabled: true, // Enable tracking for group activities
        userId,
      });

      // Copy all tasks to the new activity
      const copiedTasks = [];
      for (let i = 0; i < sourceTasks.length; i++) {
        const sourceTask = sourceTasks[i];
        const newTask = await storage.createTask({
          title: sourceTask.title,
          description: sourceTask.description,
          category: sourceTask.category,
          priority: sourceTask.priority,
          timeEstimate: sourceTask.timeEstimate,
          dueDate: sourceTask.dueDate,
          userId,
        });

        // Link task to the new activity
        await storage.addTaskToActivity(newActivity.id, newTask.id, i);
        copiedTasks.push(newTask);
      }

      // Create the canonical version for group activity
      const canonicalVersion = {
        title: newActivity.title,
        description: newActivity.description || "",
        tasks: copiedTasks.map((task, idx) => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          category: task.category,
          priority: task.priority,
          order: idx,
        })),
      };

      // Create groupActivity link
      const groupActivity = await storage.createGroupActivity({
        groupId,
        activityId: newActivity.id,
        canonicalVersion,
        isPublic: false,
        trackingEnabled: true,
      });

      // Get user info for feed entry
      const user = await storage.getUser(userId);
      const userName = user?.username || user?.email || "Unknown User";

      // Create activity feed entry
      await storage.logGroupActivity({
        groupId,
        userId,
        userName,
        activityType: "activity_shared",
        activityTitle: newActivity.title,
        groupActivityId: groupActivity.id,
      });

      return newActivity;
    } catch (error) {
      console.error("Error inheriting activity to group:", error);
      throw error;
    }
  }

  // Create a new group (Family tier required)
  app.post("/api/groups", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check subscription tier - Pro or Family required for Groups
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message:
            "This feature requires a Pro subscription ($6.99/month) or higher. Upgrade for Groups, unlimited AI plans, and more!",
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      const { name, description, isPrivate, activityId } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Group name is required" });
      }

      // Generate unique invite code
      const inviteCode = generateInviteCode();

      const group = await storage.createGroup({
        name: name.trim(),
        description: description?.trim() || null,
        isPrivate: isPrivate !== false, // Default to private
        inviteCode,
        createdBy: userId,
      });

      // Add the creator as an admin member
      await storage.createGroupMembership({
        groupId: group.id,
        userId: userId,
        role: "admin",
        joinedAt: new Date(),
      });

      // If an activityId is provided, inherit the activity to the group
      let inheritedActivity = null;
      if (activityId) {
        try {
          inheritedActivity = await inheritActivityToGroup(
            activityId,
            group.id,
            userId,
          );
        } catch (error) {
          console.error("Error inheriting activity to group:", error);
          // Don't fail group creation if activity inheritance fails
          // Just log the error and continue
        }
      }

      res.json({
        group,
        activity: inheritedActivity,
        message: `Group "${name}" created successfully!${inheritedActivity ? " Activity has been shared to the group." : ""}`,
      });
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  // Get user's groups
  app.get("/api/groups", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const groups = await storage.getUserGroups(userId);
      res.json({ groups });
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Get all group activity feed across all user's groups (MUST come before /:groupId routes)
  app.get("/api/groups/activity", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all user's groups
      const groups = await storage.getUserGroups(userId);

      // Get activity feed for all groups
      const allActivities = [];

      for (const group of groups) {
        try {
          const feedItems = await storage.getGroupActivityFeed(group.id, 20);
          // Add group name to each feed item
          const itemsWithGroup = feedItems.map((item: any) => ({
            ...item,
            groupName: group.name,
          }));
          allActivities.push(...itemsWithGroup);
        } catch (err) {
          console.error(`Error fetching activity for group ${group.id}:`, err);
        }
      }

      // Sort by timestamp descending (most recent first)
      allActivities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Return top 20 most recent activities
      res.json(allActivities.slice(0, 20));
    } catch (error) {
      console.error("Get group activity feed error:", error);
      res.status(500).json({ error: "Failed to fetch group activity feed" });
    }
  });

  // Get group details with members
  app.get("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const group = await storage.getGroupById(groupId, userId);

      if (!group) {
        return res
          .status(404)
          .json({ error: "Group not found or access denied" });
      }

      res.json({ group });
    } catch (error) {
      console.error("Get group details error:", error);
      res.status(500).json({ error: "Failed to fetch group details" });
    }
  });

  // Join group via invite code
  app.post("/api/groups/join", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { inviteCode } = req.body;

      if (!inviteCode || inviteCode.trim().length === 0) {
        return res.status(400).json({ error: "Invite code is required" });
      }

      const result = await storage.joinGroupByInviteCode(
        inviteCode.trim().toUpperCase(),
        userId,
      );

      if (!result) {
        return res
          .status(404)
          .json({ error: "Invalid invite code or group not found" });
      }

      const joiningUser = await storage.getUser(userId);

      // Check if user was invited via email/phone and mark invite as accepted
      let inviterUserId: string | null = null;
      try {
        if (joiningUser?.email) {
          const pendingInvite = await storage.findPendingInvite(
            joiningUser.email,
          );
          if (pendingInvite && pendingInvite.groupId === result.group.id) {
            // Mark invite as accepted
            await db
              .update(contactShares)
              .set({
                status: "accepted",
                respondedAt: new Date(),
              })
              .where(eq(contactShares.id, pendingInvite.id));

            inviterUserId = pendingInvite.invitedBy;
          }
        }
      } catch (inviteError) {
        console.error("Error checking pending invites:", inviteError);
        // Continue even if this fails
      }

      // Create activity feed entry for member joining
      try {
        console.log(
          `[JOIN GROUP] Creating activity feed entry for ${joiningUser?.username || "Someone"} joining group ${result.group.id}`,
        );
        await storage.logGroupActivity({
          groupId: result.group.id,
          userId,
          userName: joiningUser?.username || "Someone",
          activityType: "member_joined",
          activityTitle: `${joiningUser?.username || "Someone"} joined the group`,
          taskTitle: null,
          groupActivityId: null,
        });
        console.log(`[JOIN GROUP] Activity feed entry created`);
      } catch (feedError) {
        console.error("Error creating activity feed entry:", feedError);
        // Don't fail the operation if feed logging fails
      }

      // Send notification to admin and existing members
      try {
        console.log(
          `[JOIN GROUP] Sending notification for user ${userId} joining group ${result.group.id}`,
        );
        await sendGroupNotification(storage, {
          groupId: result.group.id,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the person who joined
          notificationType: "member_added",
          payload: {
            title: "New member joined",
            body: `${joiningUser?.username || "Someone"} joined "${result.group.name}" via invite code`,
            data: { groupId: result.group.id, newMemberId: userId },
            route: `/groups/${result.group.id}`,
          },
        });
        console.log(`[JOIN GROUP] Notification sent successfully`);

        // Send real-time WebSocket update
        socketService.emitMemberJoined(
          result.group.id,
          userId,
          joiningUser?.username || "Someone",
        );

        // If this user was invited via email/phone, send special notification to inviter
        // Use sendUserNotification to send both in-app AND push notification
        if (inviterUserId) {
          await sendUserNotification(storage, inviterUserId, {
            title: "Invite accepted!",
            body: `${joiningUser?.username || "Someone"} accepted your invite and joined "${result.group.name}"`,
            data: {
              groupId: result.group.id,
              newMemberId: userId,
              type: "group_invite_accepted",
            },
            route: `/groups/${result.group.id}`,
          });
        }
      } catch (notifError) {
        console.error("Failed to send join notification:", notifError);
        // Don't fail the operation if notification fails
      }

      res.json({
        group: result.group,
        membership: result.membership,
        message: `Successfully joined "${result.group.name}"!`,
      });
    } catch (error: any) {
      if (error.message?.includes("already a member")) {
        return res
          .status(400)
          .json({ error: "You are already a member of this group" });
      }
      console.error("Join group error:", error);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  // Add member to group (by admin)
  app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { memberId, role } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: "Member ID is required" });
      }

      // Check if requester is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ error: "Only admins can add members" });
      }

      const newMembership = await storage.addGroupMember(
        groupId,
        memberId,
        role || "member",
      );

      // Send notification to new member and existing members
      try {
        const group = await storage.getGroupById(groupId, userId);
        const addedUser = await storage.getUser(memberId);

        // Notify the new member
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the admin who added
          notificationType: "member_added",
          payload: {
            title: `Welcome to ${group?.name || "the group"}!`,
            body: `You've been added to ${group?.name || "a group"}`,
            data: { groupId, groupName: group?.name },
            route: `/groups/${groupId}`,
          },
        });

        // Notify existing members
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId, memberId], // Don't notify admin or new member
          notificationType: "member_added",
          payload: {
            title: `New member joined`,
            body: `${addedUser?.username || "Someone"} joined ${group?.name || "your group"}`,
            data: { groupId, groupName: group?.name, newMemberId: memberId },
            route: `/groups/${groupId}`,
          },
        });
      } catch (notifError) {
        console.error("Failed to send member added notification:", notifError);
      }

      res.json({
        membership: newMembership,
        message: "Member added successfully",
      });
    } catch (error: any) {
      if (error.message?.includes("already a member")) {
        return res
          .status(400)
          .json({ error: "User is already a member of this group" });
      }
      console.error("Add member error:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  // Remove member from group
  app.delete("/api/groups/:groupId/members/:memberId", async (req, res) => {
    try {
      const { groupId, memberId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if requester is admin or removing themselves
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      const canRemove = membership.role === "admin" || userId === memberId;
      if (!canRemove) {
        return res
          .status(403)
          .json({ error: "Only admins can remove other members" });
      }

      // Get member and group info before removing
      const leavingUser = await storage.getUser(memberId);
      const group = await storage.getGroup(groupId);

      await storage.removeGroupMember(groupId, memberId);

      // Create activity feed entry for member leaving
      try {
        console.log(
          `[LEAVE GROUP] Creating activity feed entry for ${leavingUser?.username || "Someone"} leaving group ${groupId}`,
        );
        await storage.logGroupActivity({
          groupId,
          userId: memberId,
          userName: leavingUser?.username || "Someone",
          activityType: "member_left",
          activityTitle: `${leavingUser?.username || "Someone"} left the group`,
          taskTitle: null,
          groupActivityId: null,
        });
        console.log(`[LEAVE GROUP] Activity feed entry created`);
      } catch (feedError) {
        console.error("Error creating leave activity feed entry:", feedError);
      }

      // CRITICAL: Stop group tracking for this user's activities in this group
      // This prevents duplicate entries and ensures progress stops reflecting their updates
      // User activities are preserved but dissociated from the group
      try {
        console.log(
          `[LEAVE GROUP] Updating tracking links for user ${memberId} in group ${groupId}`,
        );
        const userActivities = await storage.getActivities(memberId);
        for (const activity of userActivities) {
          if (
            activity.targetGroupId === groupId &&
            activity.sharesProgressWithGroup
          ) {
            console.log(
              `[LEAVE GROUP] Disconnecting activity ${activity.id} from group ${groupId}`,
            );
            // We set sharesProgressWithGroup to false, but keep targetGroupId for historical reflection
            // This allows the user to still see that this activity was originally part of this group
            await storage.updateActivity(
              activity.id,
              {
                sharesProgressWithGroup: false,
                // linkedGroupActivityId remains so they can see the original group activity context if needed
                // targetGroupId remains as a reference to the group they were in
              },
              memberId,
            );
          }
        }
      } catch (trackError) {
        console.error(
          "[LEAVE GROUP] Error severing tracking links:",
          trackError,
        );
      }

      // Send notification to remaining group members
      try {
        console.log(
          `[LEAVE GROUP] Sending notification for user ${memberId} leaving group ${groupId}`,
        );
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: memberId,
          excludeUserIds: [memberId], // Don't notify the person who left
          notificationType: "member_removed",
          payload: {
            title: "Member left",
            body: `${leavingUser?.username || "Someone"} left "${group?.name || "the group"}"`,
            data: { groupId, memberId },
            route: `/groups/${groupId}`,
          },
        });
        console.log(`[LEAVE GROUP] Notification sent successfully`);
      } catch (notifError) {
        console.error("Failed to send leave notification:", notifError);
        // Don't fail the operation if notification fails
      }

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  // Update group details
  app.put("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { name, description, isPrivate } = req.body;

      // Check if requester is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only admins can update group details" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined)
        updates.description = description?.trim() || null;
      if (isPrivate !== undefined) updates.isPrivate = isPrivate;

      const updatedGroup = await storage.updateGroup(groupId, updates);

      res.json({
        group: updatedGroup,
        message: "Group updated successfully",
      });
    } catch (error) {
      console.error("Update group error:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  // Delete group (admin only)
  app.delete("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if requester is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete groups" });
      }

      await storage.deleteGroup(groupId);

      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // Share activity to group
  app.post("/api/groups/:groupId/activities", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { activityId } = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "Activity ID is required" });
      }

      // Check if user is member of group
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res
          .status(403)
          .json({ error: "You must be a member to share activities" });
      }

      const groupActivity = await storage.shareActivityToGroup(
        activityId,
        groupId,
        userId,
      );

      // Send notification to group members
      try {
        const activity = await storage.getActivity(activityId, userId);
        const group = await storage.getGroupById(groupId, userId);
        const sharingUser = await storage.getUser(userId);

        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the person who shared
          notificationType: "activity_shared",
          payload: {
            title: `New activity shared`,
            body: `${sharingUser?.username || "Someone"} shared "${activity?.title}" in ${group?.name || "your group"}`,
            data: { groupId, activityId, groupActivityId: groupActivity.id },
            route: `/groups/${groupId}`,
          },
        });

        // Send real-time WebSocket update
        socketService.emitActivityShared(
          groupId,
          activityId,
          activity?.title || "an activity",
          sharingUser?.username || "Someone",
        );
      } catch (notifError) {
        console.error(
          "Failed to send activity shared notification:",
          notifError,
        );
      }

      res.json({
        groupActivity,
        message: "Activity shared to group successfully",
      });
    } catch (error: any) {
      if (error.message?.includes("already shared")) {
        return res
          .status(400)
          .json({ error: "Activity is already shared to this group" });
      }
      console.error("Share activity error:", error);
      res.status(500).json({ error: "Failed to share activity" });
    }
  });

  // Get group activities
  app.get("/api/groups/:groupId/activities", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if user is member (restore privacy check)
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      const activities = await storage.getGroupActivities(groupId);

      res.json({ activities });
    } catch (error) {
      console.error("Get group activities error:", error);
      res.status(500).json({ error: "Failed to fetch group activities" });
    }
  });

  // Get member progress for a specific group activity
  app.get(
    "/api/groups/:groupId/activities/:groupActivityId/member-progress",
    async (req, res) => {
      try {
        const { groupId, groupActivityId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;

        // Check if user is member
        const membership = await storage.getGroupMembership(groupId, userId);
        if (!membership) {
          return res.status(403).json({ error: "Access denied" });
        }

        const memberProgress =
          await storage.getMemberProgressForGroupActivity(groupActivityId);

        res.json({ memberProgress });
      } catch (error) {
        console.error("Get member progress error:", error);
        res.status(500).json({ error: "Failed to fetch member progress" });
      }
    },
  );

  // Get group progress - task completion stats
  app.get("/api/groups/:groupId/progress", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if user is member
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      const progress = await storage.getGroupProgress(groupId);

      res.json({ progress });
    } catch (error) {
      console.error("Get group progress error:", error);
      res.status(500).json({ error: "Failed to fetch group progress" });
    }
  });

  // Get group activity feed - recent member actions
  app.get("/api/groups/:groupId/feed", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      // Check if user is member
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      const feed = await storage.getGroupActivityFeed(groupId, limit);

      res.json({ feed });
    } catch (error) {
      console.error("Get group activity feed error:", error);
      res.status(500).json({ error: "Failed to fetch activity feed" });
    }
  });

  // Log group activity event
  app.post("/api/groups/:groupId/log-activity", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { actionType, targetName, description } = req.body;

      // Check if user is member
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get user name
      const user = await storage.getUser(userId);
      const userName = user
        ? user.username ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : "Someone";

      const feedItem = await storage.logGroupActivity({
        groupId,
        userId,
        userName,
        actionType,
        targetName,
        description: description || null,
      });

      res.json({ feedItem });
    } catch (error) {
      console.error("Log group activity error:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  });

  // Remove activity from group
  app.delete(
    "/api/groups/:groupId/activities/:groupActivityId",
    async (req, res) => {
      try {
        const { groupId, groupActivityId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;

        // Check if user is admin
        const membership = await storage.getGroupMembership(groupId, userId);
        if (!membership || membership.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Only admins can remove activities" });
        }

        await storage.removeActivityFromGroup(groupActivityId);

        res.json({ message: "Activity removed from group" });
      } catch (error) {
        console.error("Remove activity error:", error);
        res.status(500).json({ error: "Failed to remove activity" });
      }
    },
  );

  // Copy group activity to personal library ("Copy to My Plans")
  app.post(
    "/api/groups/:groupId/activities/:groupActivityId/copy",
    async (req, res) => {
      try {
        const { groupId, groupActivityId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;
        const { joinGroup, shareProgress } = req.body; // Add shareProgress parameter

        // Get group details first
        const group = await storage.getGroup(groupId);
        if (!group) {
          return res.status(404).json({ error: "Group not found" });
        }

        // Check if user is already a member
        const existingMembership = await storage.getGroupMembership(
          groupId,
          userId,
        );

        // SECURITY: Non-members must either join the group or use share links
        // This endpoint is only for members and users opting to join
        if (!existingMembership && !joinGroup) {
          return res.status(403).json({
            error:
              "You must be a member of this group to copy activities. Use the share link to copy publicly shared activities.",
            requiresMembership: true,
          });
        }

        // If joinGroup is true and user is not a member, add them
        let newMembership = null;
        if (joinGroup && !existingMembership) {
          newMembership = await storage.addGroupMember(
            groupId,
            userId,
            "member",
          );

          // Get user info for notification
          const joiningUser = await storage.getUser(userId);

          // Send notification to admin and existing members
          try {
            await sendGroupNotification(storage, {
              groupId,
              actorUserId: userId,
              excludeUserIds: [userId], // Don't notify the person who joined
              notificationType: "member_added",
              payload: {
                title: "New member joined",
                body: `${joiningUser?.username || "Someone"} joined "${group.name}" by copying an activity`,
                data: { groupId, newMemberId: userId },
                route: `/groups/${groupId}`,
              },
            });
          } catch (notifError) {
            console.error("Failed to send join notification:", notifError);
            // Don't fail the operation if notification fails
          }
        }

        // Get the group activity
        const groupActivity =
          await storage.getGroupActivityById(groupActivityId);
        if (!groupActivity || groupActivity.groupId !== groupId) {
          return res.status(404).json({ error: "Group activity not found" });
        }

        // Get the original activity and its tasks (use getActivityById to allow access regardless of ownership)
        const originalActivity = await storage.getActivityById(
          groupActivity.activityId,
        );
        if (!originalActivity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        const tasks = await storage.getActivityTasks(groupActivity.activityId);

        // Create a copy in user's personal library
        const copiedActivity = await storage.createActivity({
          userId,
          title: `${originalActivity.title} (Copy)`,
          planSummary: originalActivity.planSummary,
          category: originalActivity.category,
          notes: originalActivity.notes || null,
          backdrop: originalActivity.backdrop,
          shareTitle: originalActivity.shareTitle,
          isPublic: false, // Personal copy is private by default
          sharesProgressWithGroup: shareProgress === true, // Track progress sharing preference
          linkedGroupActivityId:
            shareProgress === true ? groupActivityId : null, // Link to group activity if sharing
        });

        // Copy all tasks
        for (const task of tasks) {
          await storage.createActivityTask({
            activityId: copiedActivity.id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            duration: task.duration,
            notes: task.notes,
            order: task.order,
          });
        }

        res.json({
          activity: copiedActivity,
          membership: newMembership || existingMembership,
          message:
            joinGroup && newMembership
              ? `Joined "${group.name}" and copied activity successfully!`
              : "Activity copied to your personal library successfully",
        });
      } catch (error) {
        console.error("Copy activity error:", error);
        res.status(500).json({ error: "Failed to copy activity" });
      }
    },
  );

  // === Phone/Email Invite Endpoints ===

  // Send invites via phone/email
  app.post("/api/groups/:groupId/invite", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { contacts, message } = req.body;

      // Verify user is admin of the group
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only group admins can send invites" });
      }

      // Get group details
      const group = await storage.getGroupById(groupId, userId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Get user info for personalized messages
      const user = await storage.getUser(userId);
      const inviterName = user?.username || "A friend";

      const { InviteService } = await import("./services/inviteService");
      const results = [];

      for (const contact of contacts) {
        const { type, value } = contact;

        // Create contact share record
        const contactShare = await storage.createGroupContactInvite({
          groupId,
          invitedBy: userId,
          contactType: type,
          contactValue: value,
          inviteMessage: message,
        });

        if (type === "phone") {
          // Send SMS
          const formattedPhone = InviteService.formatPhoneNumber(value);
          const smsMessage = InviteService.generateSMSMessage(
            inviterName,
            group.name,
            group.inviteCode,
          );
          const result = await InviteService.sendSMS({
            to: formattedPhone,
            message: smsMessage,
          });

          results.push({
            contact: value,
            type: "phone",
            success: result.success,
            error: result.error,
          });
        } else if (type === "email") {
          // Send Email
          if (!InviteService.isValidEmail(value)) {
            results.push({
              contact: value,
              type: "email",
              success: false,
              error: "Invalid email format",
            });
            continue;
          }

          const emailHTML = InviteService.generateEmailHTML(
            inviterName,
            group.name,
            group.inviteCode,
            message,
          );
          const emailText = InviteService.generateEmailText(
            inviterName,
            group.name,
            group.inviteCode,
            message,
          );

          const result = await InviteService.sendEmail({
            to: value,
            subject: `You're invited to join "${group.name}" on JournalMate`,
            html: emailHTML,
            text: emailText,
          });

          results.push({
            contact: value,
            type: "email",
            success: result.success,
            error: result.error,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      res.json({
        message: `Sent ${successCount} invites successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
        results,
        successCount,
        failureCount,
      });
    } catch (error) {
      console.error("Send invites error:", error);
      res.status(500).json({ error: "Failed to send invites" });
    }
  });

  // Get all invites sent for a group
  app.get("/api/groups/:groupId/invites", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Verify user is a member of the group
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res
          .status(403)
          .json({ error: "Not authorized to view group invites" });
      }

      const invites = await storage.getGroupInvites(groupId);

      res.json({ invites });
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Failed to get invites" });
    }
  });

  // Like an activity (idempotent - adds like if not already liked)
  app.post("/api/activities/:activityId/like", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityLike(activityId, userId, true);
      return res.json({
        liked: result.liked,
        likeCount: result.likeCount,
      });
    } catch (error) {
      console.error("Like activity error:", error);
      res.status(500).json({ error: "Failed to like activity" });
    }
  });

  // Unlike an activity (idempotent - removes like if exists)
  app.delete("/api/activities/:activityId/unlike", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityLike(activityId, userId, false);
      return res.json({
        liked: result.liked,
        likeCount: result.likeCount,
      });
    } catch (error) {
      console.error("Unlike activity error:", error);
      res.status(500).json({ error: "Failed to unlike activity" });
    }
  });

  // Activity feedback endpoints (legacy - kept for backward compatibility)
  app.post("/api/activities/:activityId/feedback", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { feedbackType } = req.body;

      if (feedbackType !== "like" && feedbackType !== "dislike") {
        return res
          .status(400)
          .json({
            error: 'Invalid feedback type. Must be "like" or "dislike"',
          });
      }

      // Redirect "like" to new engagement tracking endpoint
      if (feedbackType === "like") {
        const result = await storage.toggleActivityLike(activityId, userId);
        return res.json({
          feedback: result.liked ? { feedbackType: "like" } : null,
          stats: { likes: result.likeCount, dislikes: 0 },
        });
      }

      // Legacy dislike handling (kept for backward compatibility)
      const existingFeedback = await storage.getUserActivityFeedback(
        activityId,
        userId,
      );

      if (existingFeedback && existingFeedback.feedbackType === feedbackType) {
        await storage.deleteActivityFeedback(activityId, userId);
        const stats = await storage.getActivityFeedbackStats(activityId);
        return res.json({ feedback: null, stats });
      }

      const feedback = await storage.upsertActivityFeedback(
        activityId,
        userId,
        feedbackType,
      );
      const stats = await storage.getActivityFeedbackStats(activityId);

      res.json({ feedback, stats });
    } catch (error) {
      console.error("Activity feedback error:", error);
      res.status(500).json({ error: "Failed to save activity feedback" });
    }
  });

  app.get("/api/activities/:activityId/feedback", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const userFeedback = await storage.getUserActivityFeedback(
        activityId,
        userId,
      );
      const stats = await storage.getActivityFeedbackStats(activityId);

      res.json({
        userFeedback: userFeedback || null,
        stats,
      });
    } catch (error) {
      console.error("Get activity feedback error:", error);
      res.status(500).json({ error: "Failed to fetch activity feedback" });
    }
  });

  // Bookmark an activity (idempotent - adds bookmark if not already bookmarked)
  app.post("/api/activities/:activityId/bookmark", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityBookmark(
        activityId,
        userId,
        true,
      );
      return res.json({
        bookmarked: result.bookmarked,
        bookmarkCount: result.bookmarkCount,
      });
    } catch (error) {
      console.error("Bookmark activity error:", error);
      res.status(500).json({ error: "Failed to bookmark activity" });
    }
  });

  // Unbookmark an activity (idempotent - removes bookmark if exists)
  app.delete("/api/activities/:activityId/unbookmark", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityBookmark(
        activityId,
        userId,
        false,
      );
      return res.json({
        bookmarked: result.bookmarked,
        bookmarkCount: result.bookmarkCount,
      });
    } catch (error) {
      console.error("Unbookmark activity error:", error);
      res.status(500).json({ error: "Failed to unbookmark activity" });
    }
  });

  // Pin an activity (toggle user-specific pin)
  app.post("/api/activities/:activityId/pin", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.toggleUserPin(activityId, userId);
      return res.json({
        isPinned: result.isPinned,
      });
    } catch (error) {
      console.error("Pin activity error:", error);
      res.status(500).json({ error: "Failed to pin activity" });
    }
  });

  // Get user's bookmarked activities
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const bookmarkedActivities = await storage.getUserBookmarks(userId);
      res.json(bookmarkedActivities);
    } catch (error) {
      console.error("Get bookmarks error:", error);
      res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
  });

  // Archive task
  app.patch("/api/tasks/:taskId/archive", async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get the task first to check for calendar event ID
      const existingTask = await storage.getTask(taskId, userId);

      const task = await storage.archiveTask(taskId, userId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Delete from Google Calendar if event was synced
      if (existingTask?.googleCalendarEventId) {
        try {
          const numericUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;
          if (!isNaN(numericUserId)) {
            const deleteResult = await deleteCalendarEvent(numericUserId, existingTask.googleCalendarEventId);
            console.log("[TASK ARCHIVE] Calendar event deleted:", deleteResult.success);
          }
        } catch (calendarError) {
          console.error("[TASK ARCHIVE] Failed to delete calendar event:", calendarError);
          // Continue with archive even if calendar delete fails
        }
      }

      res.json(task);
    } catch (error) {
      console.error("Archive task error:", error);
      res.status(500).json({ error: "Failed to archive task" });
    }
  });

  // ===== ACTIVITIES API ENDPOINTS =====

  // Get user activities
  app.get("/api/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const activities = await storage.getUserActivities(userId);

      const activityIds = activities.map((a) => a.id);
      const feedbackMap = await storage.getBulkActivityFeedback(
        activityIds,
        userId,
      );

      const activitiesWithFeedback = activities.map((activity) => ({
        ...activity,
        userLiked: feedbackMap.get(activity.id)?.userHasLiked || false,
      }));

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.json(activitiesWithFeedback);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Get user archived activities (history)
  app.get("/api/activities/history", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const archivedActivities =
        await storage.getUserArchivedActivities(userId);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.json(archivedActivities);
    } catch (error) {
      console.error("Get archived activities error:", error);
      res.status(500).json({ error: "Failed to fetch archived activities" });
    }
  });

  // Create new activity
  app.post("/api/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...activityData,
        userId,
      });

      // Schedule reminders if the activity has a start date
      if (activity.startDate) {
        try {
          const result = await scheduleRemindersForActivity(
            storage,
            activity.id,
            userId,
          );
          console.log(
            `[ACTIVITY] Scheduled ${result.created} reminders for activity ${activity.id}`,
          );
        } catch (reminderError) {
          console.error(
            "[ACTIVITY] Failed to schedule reminders:",
            reminderError,
          );
        }
      }

      // Trigger smart notification scheduling for the new activity
      onActivityCreated(storage, activity, userId).catch((err) =>
        console.error("[NOTIFICATION] Activity created hook error:", err),
      );

      res.json(activity);
    } catch (error) {
      console.error("Create activity error:", error);
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  // Get specific activity with tasks
  app.get("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const activity = await storage.getActivity(activityId, userId);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      const activityTasks = await storage.getActivityTasks(activityId);
      res.json({ ...activity, tasks: activityTasks });
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Update activity
  app.put("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { expectedVersion, ...updates } = req.body;

      // Call updateActivity with optimistic locking if expectedVersion provided
      const result = await storage.updateActivity(
        activityId,
        updates,
        userId,
        expectedVersion,
      );

      // Handle conflict
      if (result.conflict && result.currentActivity) {
        return res.status(409).json({
          error: "Conflict detected",
          message: "This activity was modified by another user",
          currentActivity: result.currentActivity,
        });
      }

      if (!result.activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      res.json(result.activity);
    } catch (error) {
      console.error("Update activity error:", error);
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  // Patch activity (partial update)
  app.patch("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { expectedVersion, ...updates } = req.body;
      console.log("[PRIVACY TOGGLE DEBUG] PATCH request received:", {
        activityId,
        userId,
        updates,
        expectedVersion,
      });

      // Call updateActivity with optimistic locking if expectedVersion provided
      const result = await storage.updateActivity(
        activityId,
        updates,
        userId,
        expectedVersion,
      );
      console.log("[PRIVACY TOGGLE DEBUG] Activity after update:", {
        id: result.activity?.id,
        isPublic: result.activity?.isPublic,
        conflict: result.conflict,
      });

      // Handle conflict
      if (result.conflict && result.currentActivity) {
        return res.status(409).json({
          error: "Conflict detected",
          message: "This activity was modified by another user",
          currentActivity: result.currentActivity,
        });
      }

      if (!result.activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Reschedule reminders if startDate was updated
      if ("startDate" in updates && result.activity) {
        try {
          if (result.activity.startDate) {
            const reminderResult = await scheduleRemindersForActivity(
              storage,
              result.activity.id,
              userId,
            );
            console.log(
              `[ACTIVITY] Rescheduled ${reminderResult.created} reminders for activity ${result.activity.id}`,
            );

            // Auto-sync to Google Calendar if user has it enabled
            autoSyncActivityToCalendar(parseInt(userId), {
              id: parseInt(result.activity.id),
              title: result.activity.title,
              description: result.activity.description || undefined,
              startDate: result.activity.startDate?.toISOString(),
              endDate: result.activity.endDate?.toISOString() || undefined,
              location: result.activity.location || undefined,
              category: result.activity.category || undefined,
              googleCalendarEventId: result.activity.googleCalendarEventId || undefined,
            }).catch((err) =>
              console.error("[CALENDAR] Auto-sync error:", err),
            );
          } else {
            await cancelRemindersForActivity(storage, activityId);
            console.log(
              `[ACTIVITY] Cancelled reminders for activity ${result.activity.id} (no start date)`,
            );
          }
        } catch (reminderError) {
          console.error(
            "[ACTIVITY] Failed to reschedule reminders:",
            reminderError,
          );
        }
      }

      res.json(result.activity);
    } catch (error) {
      console.error("Patch activity error:", error);
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  // Delete activity
  app.delete("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Cancel reminders when activity is deleted
      try {
        await cancelRemindersForActivity(storage, activityId);
      } catch (err) {
        console.error("[ACTIVITY] Failed to cancel reminders on delete:", err);
      }

      // Cancel smart notifications for this activity
      onActivityDeleted(storage, activityId).catch((err) =>
        console.error("[NOTIFICATION] Activity deleted hook error:", err),
      );

      await storage.deleteActivity(activityId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete activity error:", error);
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  // ==================== REMINDERS API ====================

  // Get user's upcoming reminders
  app.get("/api/reminders/activities/me", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const reminders = await storage.getUserActivityReminders(userId);
      res.json({ reminders });
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // Get reminders for a specific activity
  app.get("/api/reminders/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const reminders = await storage.getActivityReminders(activityId);
      res.json({ reminders });
    } catch (error) {
      console.error("Get activity reminders error:", error);
      res.status(500).json({ error: "Failed to fetch activity reminders" });
    }
  });

  // Manually trigger reminder scheduling for an activity
  app.post("/api/reminders/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await scheduleRemindersForActivity(
        storage,
        activityId,
        userId,
      );
      res.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        message: `Scheduled ${result.created} reminders for this activity`,
      });
    } catch (error) {
      console.error("Schedule reminders error:", error);
      res.status(500).json({ error: "Failed to schedule reminders" });
    }
  });

  // Cancel all reminders for an activity
  app.delete("/api/reminders/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      await cancelRemindersForActivity(storage, activityId);
      res.json({ success: true, message: "All reminders cancelled" });
    } catch (error) {
      console.error("Cancel reminders error:", error);
      res.status(500).json({ error: "Failed to cancel reminders" });
    }
  });

  // Dismiss a specific reminder
  app.patch("/api/reminders/:reminderId/dismiss", async (req, res) => {
    try {
      const { reminderId } = req.params;
      await storage.markActivityReminderSent(reminderId);
      res.json({ success: true, message: "Reminder dismissed" });
    } catch (error) {
      console.error("Dismiss reminder error:", error);
      res.status(500).json({ error: "Failed to dismiss reminder" });
    }
  });

  // Archive activity
  app.patch("/api/activities/:activityId/archive", async (req: any, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const activity = await storage.archiveActivity(activityId, userId);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      res.json(activity);
    } catch (error) {
      console.error("Archive activity error:", error);
      res.status(500).json({ error: "Failed to archive activity" });
    }
  });

  // Privacy scan endpoint - AI-powered PII/PHI redaction
  app.post("/api/activities/:activityId/privacy-scan", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { privacySettings } = req.body;

      // Get activity and its tasks
      const activity = await storage.getActivityById(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      const tasks = await storage.getTasksByActivity(activityId, userId);

      // If privacy shield is off or public mode, return as-is
      if (!privacySettings || Object.values(privacySettings).every((v) => !v)) {
        return res.json({
          activity,
          tasks,
          redacted: false,
        });
      }

      // Build AI prompt for redaction
      const redactionInstructions: string[] = [];
      if (privacySettings.redactNames) {
        redactionInstructions.push(
          "Replace exact names with generic terms like 'Someone', 'Friend', 'A person'",
        );
      }
      if (privacySettings.redactLocations) {
        redactionInstructions.push(
          "Replace exact addresses with city only or generic 'A location in [city]', 'A restaurant', 'A venue'",
        );
      }
      if (privacySettings.redactContact) {
        redactionInstructions.push(
          "Remove or replace phone numbers and email addresses with [Contact Info]",
        );
      }
      if (privacySettings.redactDates) {
        redactionInstructions.push(
          "Generalize specific dates/times to 'morning', 'afternoon', 'evening', 'this week', etc.",
        );
      }
      if (privacySettings.redactContext) {
        redactionInstructions.push(
          "Remove or generalize personal context like family member names, medical information, personal relationships",
        );
      }

      const prompt = `You are a privacy protection assistant. Review the following activity and tasks, and redact sensitive information according to these rules:

${redactionInstructions.map((rule, i) => `${i + 1}. ${rule}`).join("\n")}

Activity Title: ${activity.title}
Activity Description: ${activity.description || "None"}
Plan Summary: ${activity.planSummary || "None"}

Tasks:
${tasks.map((task, i) => `${i + 1}. ${task.title}${task.description ? ` - ${task.description}` : ""}`).join("\n")}

Return a JSON object with redacted versions in this exact format:
{
  "title": "redacted title",
  "description": "redacted description or null",
  "planSummary": "redacted summary or null",
  "tasks": [
    {"title": "redacted task title", "description": "redacted task description or null"}
  ]
}

IMPORTANT: Only redact as specified. Preserve the overall meaning and usefulness of the content.`;

      // Call LLM for redaction
      const llmProvider = getProvider("openai-mini");
      if (!llmProvider) {
        return res
          .status(503)
          .json({
            error: "AI service unavailable - OpenAI provider not configured",
          });
      }

      const messages = [
        {
          role: "system" as const,
          content:
            "You are a privacy protection assistant that redacts PII/PHI from content while preserving usefulness.",
        },
        { role: "user" as const, content: prompt },
      ];

      const response = await llmProvider.generateChatCompletion(messages, {
        temperature: 0.3,
        max_tokens: 2000,
      });

      // Validate JSON response
      let redactedData;
      try {
        redactedData = JSON.parse(response);

        // Validate structure
        if (!redactedData.title || !Array.isArray(redactedData.tasks)) {
          throw new Error("Invalid response structure from AI");
        }
      } catch (parseError) {
        console.error("Privacy scan JSON parse error:", parseError);
        return res.status(502).json({
          error: "AI service returned malformed response",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        });
      }

      // Build redacted activity and tasks
      const redactedActivity = {
        ...activity,
        title: redactedData.title,
        description: redactedData.description,
        planSummary: redactedData.planSummary,
      };

      const redactedTasks = tasks.map((task, i) => ({
        ...task,
        title: redactedData.tasks[i]?.title || task.title,
        description: redactedData.tasks[i]?.description || task.description,
      }));

      res.json({
        activity: redactedActivity,
        tasks: redactedTasks,
        redacted: true,
        redactionSummary: redactionInstructions,
      });
    } catch (error) {
      console.error("Privacy scan error:", error);
      res.status(500).json({ error: "Failed to scan for privacy" });
    }
  });

  // URL validation utility for social media handles
  function validateSocialMediaHandles(handles: {
    twitterHandle?: string;
    instagramHandle?: string;
    threadsHandle?: string;
    websiteUrl?: string;
  }): { valid: boolean; error?: string } {
    // Trim all inputs and reassign
    const twitterHandle = handles.twitterHandle?.trim();
    const instagramHandle = handles.instagramHandle?.trim();
    const threadsHandle = handles.threadsHandle?.trim();
    const websiteUrl = handles.websiteUrl?.trim();

    // Require at least one non-empty handle
    const hasValidLink = [
      twitterHandle,
      instagramHandle,
      threadsHandle,
      websiteUrl,
    ].some((link) => link && link.length > 0);
    if (!hasValidLink) {
      return {
        valid: false,
        error: "At least one social media link is required",
      };
    }

    // Domain whitelist
    const allowedDomains = [
      "twitter.com",
      "x.com",
      "instagram.com",
      "threads.net",
    ];

    // Validate each provided handle
    if (twitterHandle) {
      try {
        const url = new URL(
          twitterHandle.startsWith("http")
            ? twitterHandle
            : `https://${twitterHandle}`,
        );
        const domain = url.hostname.replace(/^www\./, "");
        if (!["twitter.com", "x.com"].includes(domain)) {
          return {
            valid: false,
            error: "Twitter/X handle must be from twitter.com or x.com",
          };
        }
      } catch {
        return { valid: false, error: "Invalid Twitter/X URL format" };
      }
    }

    if (instagramHandle) {
      try {
        const url = new URL(
          instagramHandle.startsWith("http")
            ? instagramHandle
            : `https://${instagramHandle}`,
        );
        const domain = url.hostname.replace(/^www\./, "");
        if (domain !== "instagram.com") {
          return {
            valid: false,
            error: "Instagram handle must be from instagram.com",
          };
        }
      } catch {
        return { valid: false, error: "Invalid Instagram URL format" };
      }
    }

    if (threadsHandle) {
      try {
        const url = new URL(
          threadsHandle.startsWith("http")
            ? threadsHandle
            : `https://${threadsHandle}`,
        );
        const domain = url.hostname.replace(/^www\./, "");
        if (domain !== "threads.net") {
          return {
            valid: false,
            error: "Threads handle must be from threads.net",
          };
        }
      } catch {
        return { valid: false, error: "Invalid Threads URL format" };
      }
    }

    if (websiteUrl) {
      try {
        new URL(
          websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
        );
      } catch {
        return { valid: false, error: "Invalid website URL format" };
      }
    }

    return { valid: true };
  }

  // Publish activity to Community Discovery
  app.post("/api/activities/:activityId/publish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const {
        privacySettings,
        privacyPreset,
        twitterHandle,
        instagramHandle,
        threadsHandle,
        websiteUrl,
        forceDuplicate,
      } = req.body;

      // Get activity and its tasks
      const activity = await storage.getActivityById(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Get canonical tasks from storage first (needed for hash generation)
      const canonicalTasks = await storage.getTasksByActivity(
        activityId,
        userId,
      );

      // Generate content hash from activity tasks for duplicate detection
      // Hash is based on task titles, order, and count - same content = same hash
      const contentHash = generateContentHash(canonicalTasks);

      // Store content hash on activity BEFORE duplicate check to engage unique constraint
      // This prevents race conditions where concurrent publishes of identical content both succeed
      // Skip if forceDuplicate is true (allows intentional duplicate publishes)
      if (!forceDuplicate) {
        try {
          await db
            .update(activities)
            .set({ contentHash })
            .where(eq(activities.id, activityId));
        } catch (error: any) {
          // Unique constraint violation means duplicate content
          if (error.code === "23505") {
            return res.status(409).json({
              error: "Duplicate plan detected",
              message:
                "You have already published an identical plan. Please update your existing plan instead.",
            });
          }
          // Re-throw other errors
          throw error;
        }
      }

      // Check for duplicate community plans by content hash (FAST - single indexed DB query)
      // Only check if this activity is not already published AND user hasn't forced override
      if (!activity.featuredInCommunity && !forceDuplicate) {
        // Query database for existing plan with same content hash by this user
        // This is O(log n) thanks to the contentHash index, vs O(n*m) for title similarity
        const [existingPlan] = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.userId, userId),
              eq(activities.contentHash, contentHash),
              eq(activities.featuredInCommunity, true),
              sql`${activities.id} != ${activityId}`, // Exclude current activity
            ),
          )
          .limit(1);

        if (existingPlan) {
          return res.status(409).json({
            error: "Duplicate plan detected",
            message: `You've already published an identical plan: "${existingPlan.shareTitle || existingPlan.title}". Please update your existing plan instead of creating a duplicate.`,
            duplicatePlanId: existingPlan.id,
            duplicatePlanTitle: existingPlan.shareTitle || existingPlan.title,
          });
        }
      }

      // Get user info for creator display
      const user = await storage.getUser(userId);
      const creatorName = user?.username || "Anonymous";
      const creatorAvatar = user?.profileImage || null;

      // Apply privacy redaction if needed (for Community Discovery ONLY)
      let publicTitle = activity.title;
      let publicDescription = activity.description;
      let publicPlanSummary = activity.planSummary;
      let publicTasks = [...canonicalTasks]; // Start with canonical data

      if (privacyPreset && privacyPreset !== "off" && privacySettings) {
        // Build AI prompt for redaction (including tasks)
        const redactionInstructions: string[] = [];
        if (privacySettings.redactNames) {
          redactionInstructions.push(
            "Replace exact names with generic terms like 'Someone', 'Friend', 'A person'",
          );
        }
        if (privacySettings.redactLocations) {
          redactionInstructions.push(
            "Replace exact addresses with city only or generic 'A location in [city]', 'A restaurant', 'A venue'",
          );
        }
        if (privacySettings.redactContact) {
          redactionInstructions.push(
            "Remove or replace phone numbers and email addresses with [Contact Info]",
          );
        }
        if (privacySettings.redactDates) {
          redactionInstructions.push(
            "Generalize specific dates/times to 'morning', 'afternoon', 'evening', 'this week', etc.",
          );
        }
        if (privacySettings.redactContext) {
          redactionInstructions.push(
            "Remove or generalize personal context like family member names, medical information, personal relationships",
          );
        }

        const prompt = `You are a privacy protection assistant. Review the following activity and tasks, and redact sensitive information according to these rules:

${redactionInstructions.map((rule, i) => `${i + 1}. ${rule}`).join("\n")}

Activity Title: ${activity.title}
Activity Description: ${activity.description || "None"}
Plan Summary: ${activity.planSummary || "None"}

Tasks:
${canonicalTasks.map((task, i) => `${i + 1}. ${task.title}${task.description ? ` - ${task.description}` : ""}`).join("\n")}

Return a JSON object with redacted versions in this exact format:
{
  "title": "redacted title",
  "description": "redacted description or null",
  "planSummary": "redacted summary or null",
  "tasks": [
    {"title": "redacted task title", "description": "redacted task description or null"}
  ]
}

IMPORTANT: Only redact as specified. Preserve the overall meaning and usefulness of the content.`;

        // Call LLM for redaction
        const llmProvider = getProvider("openai-mini");
        if (!llmProvider) {
          return res
            .status(503)
            .json({
              error: "AI service unavailable - OpenAI provider not configured",
            });
        }

        const messages = [
          {
            role: "system" as const,
            content:
              "You are a privacy protection assistant that redacts PII/PHI from content while preserving usefulness.",
          },
          { role: "user" as const, content: prompt },
        ];

        const response = await llmProvider.generateChatCompletion(messages, {
          temperature: 0.3,
          max_tokens: 3000,
        });

        // Validate JSON response
        try {
          const redactedData = JSON.parse(response);
          // Use redacted values or safe fallbacks (NOT originals, to prevent PII leaks)
          publicTitle = redactedData.title || "[Private Plan]";
          publicDescription = redactedData.description || null;
          publicPlanSummary = redactedData.planSummary || null;

          // Apply task redactions - use safe fallbacks
          if (Array.isArray(redactedData.tasks)) {
            publicTasks = publicTasks.map((originalTask, index) => {
              const redactedTask = redactedData.tasks[index];
              return {
                ...originalTask,
                // Use redacted values or generic fallbacks (NEVER original PII)
                title: redactedTask?.title || `Task ${index + 1}`,
                description: redactedTask?.description || null,
              };
            });
          } else {
            // If LLM didn't return tasks, use generic placeholders
            publicTasks = publicTasks.map((task, index) => ({
              ...task,
              title: `Task ${index + 1}`,
              description: null,
            }));
          }
        } catch (parseError) {
          console.error("Publish redaction JSON parse error:", parseError);
          // On error, use safe generic fallbacks to prevent PII exposure
          publicTitle = "[Private Plan]";
          publicDescription = null;
          publicPlanSummary = null;
          publicTasks = publicTasks.map((task, index) => ({
            ...task,
            title: `Task ${index + 1}`,
            description: null,
          }));
        }
      }

      // REQUIRED: Social media verification for community publishing
      // At least one social media link must be provided for community verification
      if (!twitterHandle && !instagramHandle && !threadsHandle) {
        return res.status(400).json({
          error: "Social media verification required",
          message:
            "Please provide at least one social media link (Twitter/X, Instagram, or Threads) to verify your plan. This helps other users verify the authenticity of community plans.",
        });
      }

      // Validate social media handles
      const validation = validateSocialMediaHandles({
        twitterHandle,
        instagramHandle,
        threadsHandle,
        websiteUrl,
      });
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Upsert planner profile with social POST URLs (not handles)
      // Note: Despite variable names, these are actually POST URLs from the request body
      const profile = await storage.upsertPlannerProfile(userId, {
        twitterPostUrl: twitterHandle || null,
        instagramPostUrl: instagramHandle || null,
        threadsPostUrl: threadsHandle || null,
        websiteUrl: websiteUrl || null,
      });
      const plannerProfileId = profile.id;

      // Determine badge: 'twitter'|'instagram'|'threads'|'linkedin'|'multi'
      const provided = [twitterHandle, instagramHandle, threadsHandle].filter(
        Boolean,
      );
      const verificationBadge =
        provided.length > 1
          ? "multi"
          : twitterHandle
            ? "twitter"
            : instagramHandle
              ? "instagram"
              : "threads";

      // Generate unique share token if not already present
      const crypto = await import("crypto");
      const existingActivity = await storage.getActivityById(
        activityId,
        userId,
      );
      const shareToken =
        existingActivity?.shareToken || crypto.randomBytes(16).toString("hex");

      // Determine base URL for share links
      let baseUrl = "http://localhost:5000";
      if (
        process.env.REPLIT_DEPLOYMENT === "1" ||
        process.env.NODE_ENV === "production"
      ) {
        baseUrl = "https://journalmate.ai";
      } else if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(",").map((d) =>
          d.trim(),
        );
        baseUrl = `https://${domains[0]}`;
      }
      const shareableLink = `${baseUrl}/share/${shareToken}`;

      // Store community snapshot with FULL task data for reconciliation
      // This preserves ALL user data (timeline, highlights, etc.)
      const communitySnapshot = {
        title: publicTitle,
        description: publicDescription,
        planSummary: publicPlanSummary,
        tasks: publicTasks.map((t) => ({
          id: t.id, // CRITICAL: Include ID for reconciliation
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          completed: t.completed, // Include completion state
          order: t.order || 0,
        })),
        privacyPreset: privacyPreset || "off",
        publishedAt: new Date().toISOString(),
      };

      // Update activity to publish to community using dedicated communitySnapshot field
      // Only set contentHash if NOT forcing duplicate (to allow intentional duplicates)
      const updateData: any = {
        isPublic: true, // CRITICAL: Must be true for Discovery to show the plan
        featuredInCommunity: true,
        communityStatus: "live", // CRITICAL: Required for Community Discovery query
        creatorName,
        creatorAvatar,
        shareTitle: publicTitle, // Display redacted title in Discovery
        communitySnapshot, // Dedicated field - no data loss
        sourceType: "community_reviewed", // User provided social media verification
        plannerProfileId,
        verificationBadge,
        shareToken,
        shareableLink,
      };

      // Only include contentHash if not forcing duplicate (allows intentional duplicates to bypass unique constraint)
      if (!forceDuplicate) {
        updateData.contentHash = contentHash;
      }

      const updatedActivity = await storage.updateActivity(
        activityId,
        updateData,
        userId,
      );

      if (!updatedActivity) {
        return res.status(500).json({ error: "Failed to publish activity" });
      }

      // Grant Discovery Bonus: +2 extra imports EVERY time user publishes to Discovery
      // This bonus accumulates and persists even if they unpublish later
      if (user) {
        const currentBonus = user.discoveryBonusImports || 0;
        await db
          .update(users)
          .set({ discoveryBonusImports: currentBonus + 2 })
          .where(eq(users.id, userId));
        console.log(
          `[Discovery Bonus] Granted +2 to user ${userId} - now has ${currentBonus + 2} bonus imports`,
        );
      }

      res.json({
        success: true,
        publishedToCommunity: true,
        shareableLink,
        activity: updatedActivity,
        discoveryBonusGranted: true, // Always true since bonus is granted every publish
        newBonusTotal: (user?.discoveryBonusImports || 0) + 2,
      });
    } catch (error) {
      console.error("Publish activity error:", error);
      res
        .status(500)
        .json({ error: "Failed to publish activity to community" });
    }
  });

  // Unpublish an activity from community discovery
  app.patch("/api/activities/:activityId/unpublish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const activity = await storage.unpublishActivity(activityId, userId);

      if (!activity) {
        return res
          .status(404)
          .json({
            error:
              "Activity not found or you do not have permission to unpublish it",
          });
      }

      res.json({
        success: true,
        message: "Activity unpublished from community",
        activity,
      });
    } catch (error) {
      console.error("Unpublish activity error:", error);
      res.status(500).json({ error: "Failed to unpublish activity" });
    }
  });

  // Republish an activity to community discovery
  app.patch("/api/activities/:activityId/republish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const activity = await storage.republishActivity(activityId, userId);

      if (!activity) {
        return res
          .status(404)
          .json({
            error:
              "Activity not found or you do not have permission to republish it",
          });
      }

      res.json({
        success: true,
        message: "Activity republished to community",
        activity,
      });
    } catch (error) {
      console.error("Republish activity error:", error);
      res.status(500).json({ error: "Failed to republish activity" });
    }
  });

  // DEPRECATED: This endpoint has been replaced with the unified endpoint below
  // that uses the inheritActivityToGroup helper function
  /*
  app.post("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId} = req.params;
      const { createGroup, groupName, groupDescription } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Check subscription tier if creating group
      if (createGroup) {
        const tierCheck = await checkSubscriptionTier(userId, 'family');
        if (!tierCheck.allowed) {
          return res.status(403).json({ 
            error: 'Subscription required',
            message: tierCheck.message,
            requiredTier: 'family',
            currentTier: tierCheck.tier
          });
        }
        
        // Validate group creation fields
        if (!groupName || groupName.trim().length === 0) {
          return res.status(400).json({ error: 'Group name is required' });
        }
        if (groupName.length > 100) {
          return res.status(400).json({ error: 'Group name cannot exceed 100 characters' });
        }
        if (groupDescription && groupDescription.length > 500) {
          return res.status(400).json({ error: 'Group description cannot exceed 500 characters' });
        }
      }
      
      // Generate unique share token
      const crypto = await import('crypto');
      const shareToken = crypto.randomBytes(16).toString('hex');
      
      // Determine base URL for share links
      // Priority: Production domain > REPLIT_DOMAINS > localhost
      let baseUrl = 'http://localhost:5000';
      
      // Always use production domain if available
      if (process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production') {
        baseUrl = 'https://journalmate.ai';
      } else if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',').map(d => d.trim());
        baseUrl = `https://${domains[0]}`;
      }
      
      const activity = await storage.updateActivity(activityId, {
        isPublic: true,
        shareToken,
        shareableLink: `${baseUrl}/share/${shareToken}`
      }, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      let groupId;
      if (createGroup && groupName) {
        // Create the group with generated invite code
        const inviteCode = generateInviteCode();
        const group = await storage.createGroup({
          name: groupName.trim(),
          description: groupDescription?.trim() || null,
          isPrivate: false,
          inviteCode,
          createdBy: userId
        });

        groupId = group.id;
        console.log('[SHARE] Created new group with invite code:', inviteCode);

        // Add creator as admin
        await storage.createGroupMembership({
          groupId: group.id,
          role: 'admin',
          userId
        });

        // Get activity tasks to create canonical version
        const tasks = await storage.getActivityTasks(activityId, userId);
        
        // Create group activity with canonical version
        await storage.createGroupActivity({
          groupId: group.id,
          activityId: activity.id,
          canonicalVersion: {
            title: activity.title,
            description: activity.description || undefined,
            tasks: tasks.map((task, index) => ({
              id: task.id,
              title: task.title,
              description: task.description || undefined,
              category: task.category,
              priority: task.priority,
              order: index
            }))
          },
          isPublic: true,
          shareToken: shareToken
        });
      }

      res.json({
        shareToken: activity.shareToken,
        shareableLink: activity.shareableLink,
        isPublic: activity.isPublic,
        groupId: groupId || undefined,
        groupCreated: !!groupId
      });
    } catch (error) {
      console.error('Generate share link error:', error);
      res.status(500).json({ error: 'Failed to generate share link' });
    }
  });
  */

  // Revoke shareable link
  app.delete("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const activity = await storage.updateActivity(
        activityId,
        {
          isPublic: false,
          shareToken: null,
          shareableLink: null,
        },
        userId,
      );

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Revoke share link error:", error);
      res.status(500).json({ error: "Failed to revoke share link" });
    }
  });

  // Get public activity by share token (no auth required)
  app.get("/api/share/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;

      // Get activity and its tasks
      const activity = await storage.getActivityByShareToken(shareToken);

      // Share links remain valid until activity is deleted or share token is explicitly revoked
      // Do NOT check isPublic - privacy toggles should not break existing share links
      if (!activity) {
        return res
          .status(404)
          .json({ error: "Shared activity not found or has been deleted" });
      }

      // Get tasks for this activity
      const tasks = await storage.getActivityTasks(
        activity.id,
        activity.userId,
      );

      // Get owner info (without sensitive data)
      const owner = await storage.getUser(activity.userId);

      // If activity is part of a group, include group info for join prompt
      let groupInfo = null;
      if (activity.targetGroupId) {
        try {
          const group = await storage.getGroup(activity.targetGroupId);
          if (group) {
            const members = await storage.getGroupMembers(
              activity.targetGroupId,
            );

            // Check if current user (if authenticated) is already a member
            const currentUserId = getUserId(req);
            const isUserMember = currentUserId
              ? members.some((m) => m.userId === currentUserId)
              : false;

            groupInfo = {
              id: group.id,
              name: group.name,
              description: group.description,
              memberCount: members.length,
              isUserMember,
              inviteCode: group.inviteCode || null,
            };
          }
        } catch (error) {
          console.error(
            "[SHARE] Error fetching group info from targetGroupId:",
            error,
          );
          // Don't fail the request if group fetch fails
        }
      }

      // FIRST check the share_links table - this is where the groupId is stored when sharing
      if (!groupInfo) {
        console.log(
          "[SHARE] Checking share_links table for groupId:",
          shareToken,
        );
        try {
          const shareLink = await storage.getShareLink(shareToken);
          console.log("[SHARE] share_links result:", {
            found: !!shareLink,
            hasGroupId: !!shareLink?.groupId,
            groupId: shareLink?.groupId,
          });

          if (shareLink?.groupId) {
            const group = await storage.getGroup(shareLink.groupId);
            if (group) {
              const members = await storage.getGroupMembers(shareLink.groupId);
              const currentUserId = getUserId(req);
              const isUserMember = currentUserId
                ? members.some((m) => m.userId === currentUserId)
                : false;

              groupInfo = {
                id: group.id,
                name: group.name,
                description: group.description || null,
                memberCount: members.length,
                isUserMember,
                inviteCode: group.inviteCode || null,
              };
              console.log(
                "[SHARE] ✅ Built groupInfo from share_links:",
                groupInfo,
              );
            }
          }
        } catch (shareLinkErr) {
          console.error(
            "[SHARE] Failed to get group info from share_links:",
            shareLinkErr,
          );
        }
      }

      // If still no groupInfo, check if this activity is shared to any groups (in group_activities table)
      if (!groupInfo) {
        console.log(
          "[SHARE] Checking group_activities table for activity:",
          activity.id,
        );
        try {
          const groupActivitiesResult: any = await db.execute(
            drizzleSql.raw(`
            SELECT ga.group_id, g.name, g.description, g.invite_code
            FROM group_activities ga
            INNER JOIN groups g ON ga.group_id = g.id
            WHERE ga.activity_id = '${activity.id}'
            LIMIT 1
          `),
          );

          console.log("[SHARE] group_activities query result:", {
            hasRows: !!groupActivitiesResult.rows,
            rowCount: groupActivitiesResult.rows?.length || 0,
            firstRow: groupActivitiesResult.rows?.[0],
          });

          if (
            groupActivitiesResult.rows &&
            groupActivitiesResult.rows.length > 0
          ) {
            const groupRow = groupActivitiesResult.rows[0];
            const members = await storage.getGroupMembers(groupRow.group_id);

            // Check if current user (if authenticated) is already a member
            const currentUserId = getUserId(req);
            const isUserMember = currentUserId
              ? members.some((m) => m.userId === currentUserId)
              : false;

            groupInfo = {
              id: groupRow.group_id,
              name: groupRow.name,
              description: groupRow.description || null,
              memberCount: members.length,
              isUserMember,
              inviteCode: groupRow.invite_code || null,
            };
            console.log(
              "[SHARE] Built groupInfo from group_activities:",
              groupInfo,
            );
          }
        } catch (groupErr) {
          console.error(
            "[SHARE] Failed to get group info from group_activities:",
            groupErr,
          );
        }
      }

      res.json({
        activity: {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          category: activity.category,
          startDate: activity.startDate,
          endDate: activity.endDate,
          planSummary: activity.planSummary,
          shareTitle: activity.shareTitle,
          backdrop: activity.backdrop,
          userId: activity.userId,
          status: activity.status,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
          targetGroupId: activity.targetGroupId,
        },
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          completed: task.completed,
          completedAt: task.completedAt,
          timeEstimate: task.timeEstimate,
          dueDate: task.dueDate,
        })),
        requiresAuth: false,
        sharedBy: {
          name: owner?.firstName || owner?.username || "Anonymous",
        },
        groupInfo,
      });
    } catch (error) {
      console.error("Get shared activity error:", error);
      res.status(500).json({ error: "Failed to fetch shared activity" });
    }
  });

  // Generate OG image for shared activity (no auth required)
  app.get("/api/share/:shareToken/og-image", async (req, res) => {
    try {
      const { shareToken } = req.params;

      // Get activity and its tasks
      const activity = await storage.getActivityByShareToken(shareToken);

      // Share links remain valid until activity is deleted or share token is explicitly revoked
      // Do NOT check isPublic - privacy toggles should not break existing share links
      if (!activity) {
        return res
          .status(404)
          .json({ error: "Shared activity not found or has been deleted" });
      }

      // Get tasks for this activity
      const tasks = await storage.getActivityTasks(
        activity.id,
        activity.userId,
      );

      // Import the OG image generator (dynamic import to avoid circular deps)
      const { generateOGImage } = await import("./services/ogImageGenerator");

      // Construct base URL for absolute image paths (with host validation)
      let baseUrl = process.env.PUBLIC_BASE_URL;
      if (!baseUrl) {
        const requestHost = (req.get("host") || "").toLowerCase();

        // Strip port to get clean hostname for validation
        const hostname = requestHost.split(":")[0];

        // Validate host to prevent header spoofing - exact match or trusted domain suffix
        const trustedDomains = ["replit.app", "repl.co"];
        const trustedExactHosts = ["localhost"];

        const isTrusted =
          trustedExactHosts.includes(hostname) ||
          trustedDomains.some(
            (domain) => hostname === domain || hostname.endsWith("." + domain),
          );

        if (isTrusted) {
          baseUrl = `${req.protocol}://${requestHost}`;
        } else {
          console.warn(
            "[OG IMAGE] Suspicious host header, using localhost fallback:",
            requestHost,
          );
          baseUrl = "http://localhost:5000";
        }
      }

      // Generate the OG image
      const imageBuffer = await generateOGImage({
        activity,
        tasks,
        baseUrl,
      });

      // Set appropriate cache headers (24 hours)
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      res.setHeader("Content-Length", imageBuffer.length);

      res.send(imageBuffer);
    } catch (error) {
      console.error("Generate OG image error:", error);
      res.status(500).json({ error: "Failed to generate preview image" });
    }
  });

  // Add task to activity
  app.post("/api/activities/:activityId/tasks", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { taskId, order } = req.body;
      const activityTask = await storage.addTaskToActivity(
        activityId,
        taskId,
        order,
      );
      res.json(activityTask);
    } catch (error) {
      console.error("Add task to activity error:", error);
      res.status(500).json({ error: "Failed to add task to activity" });
    }
  });

  // Get tasks for an activity
  app.get("/api/activities/:activityId/tasks", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const tasks = await storage.getActivityTasks(activityId, userId);
      res.json(tasks);
    } catch (error) {
      console.error("Get activity tasks error:", error);
      res.status(500).json({ error: "Failed to fetch activity tasks" });
    }
  });

  // Remove task from activity
  app.delete("/api/activities/:activityId/tasks/:taskId", async (req, res) => {
    try {
      const { activityId, taskId } = req.params;
      await storage.removeTaskFromActivity(activityId, taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove task from activity error:", error);
      res.status(500).json({ error: "Failed to remove task from activity" });
    }
  });

  // Get backdrop image options for activity (for image picker UI)
  app.get("/api/activities/:activityId/backdrop-options", async (req, res) => {
    try {
      const { activityId } = req.params;
      const variation = parseInt(req.query.variation as string) || 0;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get the activity
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Fetch backdrop options based on activity title, category, and description
      // Pass variation to get different results on each refresh
      // Pass activityId for caching (reduces API costs by ~85-90%)
      const options = await searchBackdropOptions(
        activity.title,
        activity.category || "personal",
        activity.planSummary || activity.description || undefined,
        8, // max 8 options for more variety
        variation, // different query variation for each refresh
        activityId, // for caching
      );

      // If activity already has a custom backdrop, include it first
      if (activity.backdrop) {
        options.unshift({
          url: activity.backdrop,
          source: "user" as const,
          label: "Current",
        });
      }

      res.json({ options });
    } catch (error) {
      console.error("Error fetching backdrop options:", error);
      res.status(500).json({ error: "Failed to fetch backdrop options" });
    }
  });

  // Update activity backdrop
  app.patch("/api/activities/:activityId/backdrop", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { backdropUrl } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get the activity
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Update the backdrop
      const updated = await storage.updateActivity(
        activityId,
        { backdrop: backdropUrl },
        userId,
      );

      res.json({ success: true, activity: updated });
    } catch (error) {
      console.error("Error updating backdrop:", error);
      res.status(500).json({ error: "Failed to update backdrop" });
    }
  });

  // Generate shareable link for activity OR share to existing group
  app.post("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId } = req.params;
      const {
        groupId,
        targetGroupId,
        createGroup,
        groupName,
        groupDescription,
        shareCaption,
      } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check subscription tier if creating group - Pro or Family required
      if (createGroup) {
        const tierCheck = await checkSubscriptionTier(userId, "pro");
        if (!tierCheck.allowed) {
          return res.status(403).json({
            error: "Subscription required",
            message:
              "This feature requires a Pro subscription ($6.99/month) or higher. Upgrade for Groups, unlimited AI plans, and more!",
            requiredTier: "pro",
            currentTier: tierCheck.tier,
          });
        }

        // Validate group creation fields
        if (!groupName || groupName.trim().length === 0) {
          return res.status(400).json({ error: "Group name is required" });
        }
        if (groupName.length > 100) {
          return res
            .status(400)
            .json({ error: "Group name cannot exceed 100 characters" });
        }
        if (groupDescription && groupDescription.length > 500) {
          return res
            .status(400)
            .json({ error: "Group description cannot exceed 500 characters" });
        }
      }

      // Check if activity exists
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // If groupId is provided, share to the group (add activity directly to group)
      if (groupId) {
        // Verify user is a member of the group
        const userGroups = await storage.getGroupsForUser(userId);
        const isMember = userGroups.some((g) => g.id === groupId);

        if (!isMember) {
          return res
            .status(403)
            .json({
              error:
                "You must be a member of the group to share activities to it",
            });
        }

        try {
          // Inherit the activity to the group
          const inheritedActivity = await inheritActivityToGroup(
            activityId,
            groupId,
            userId,
          );

          return res.json({
            success: true,
            activity: inheritedActivity,
            message: "Activity has been successfully shared to the group",
          });
        } catch (error) {
          console.error("Error sharing activity to group:", error);
          return res
            .status(500)
            .json({ error: "Failed to share activity to group" });
        }
      }

      // Handle new group creation if requested
      let newGroupId;
      let newGroupShareToken;
      if (createGroup && groupName) {
        // Create the group with generated invite code
        const inviteCode = generateInviteCode();
        const group = await storage.createGroup({
          name: groupName.trim(),
          description: groupDescription?.trim() || null,
          isPrivate: false,
          inviteCode,
          createdBy: userId,
        });

        newGroupId = group.id;
        console.log("[SHARE] Created new group with invite code:", inviteCode);

        // Add creator as admin
        await storage.createGroupMembership({
          groupId: group.id,
          role: "admin",
          userId,
        });

        // Get CANONICAL (original) tasks for group activity - NOT redacted ones
        const canonicalTasks = await storage.getActivityTasks(
          activityId,
          userId,
        );

        // Generate share token for group activity
        const crypto = await import("crypto");
        newGroupShareToken = crypto.randomBytes(16).toString("hex");

        // Create group activity with CANONICAL version (full task data)
        await storage.createGroupActivity({
          groupId: group.id,
          activityId: activity.id,
          canonicalVersion: {
            title: activity.title, // Use original title, not redacted
            description: activity.description || undefined,
            tasks: canonicalTasks.map((task, index) => ({
              id: task.id,
              title: task.title, // Original task data
              description: task.description || undefined,
              category: task.category,
              priority: task.priority,
              order: index,
            })),
          },
          isPublic: true,
          shareToken: newGroupShareToken,
        });
      }

      // Otherwise, generate shareable link
      // If targetGroupId is provided, verify user is a member and store it
      if (targetGroupId) {
        const userGroups = await storage.getGroupsForUser(userId);
        const isMember = userGroups.some((g) => g.id === targetGroupId);

        if (!isMember) {
          return res
            .status(403)
            .json({
              error: "You must be a member of the group to share from it",
            });
        }
      }

      // Generate share token and make activity public - pass targetGroupId to store in share_links
      const shareToken = await storage.generateShareableLink(
        activityId,
        userId,
        targetGroupId || newGroupId,
      );

      // Update activity with isPublic, targetGroupId if provided, and caption for OG tags
      const updateData: any = { isPublic: true };
      if (targetGroupId) {
        updateData.targetGroupId = targetGroupId;
      }
      // Store caption if provided for OG meta tags
      if (shareCaption) {
        updateData.shareCaption = shareCaption;
      }
      await storage.updateActivity(activityId, updateData, userId);

      if (!shareToken) {
        return res
          .status(404)
          .json({ error: "Failed to generate share token" });
      }

      // Determine base URL for share links
      // Priority: Production domain > REPLIT_DOMAINS > localhost
      let baseUrl = "http://localhost:5000";

      // Always use production domain if available
      if (
        process.env.REPLIT_DEPLOYMENT === "1" ||
        process.env.NODE_ENV === "production"
      ) {
        baseUrl = "https://journalmate.ai";
      } else if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(",").map((d) =>
          d.trim(),
        );
        baseUrl = `https://${domains[0]}`;
      }

      // Generate compelling social text with emoji
      const categoryEmojis: Record<string, string> = {
        fitness: "💪",
        health: "🏥",
        career: "💼",
        learning: "📚",
        finance: "💰",
        relationships: "❤️",
        creativity: "🎨",
        travel: "✈️",
        home: "🏠",
        personal: "⭐",
        other: "📋",
      };
      const emoji = categoryEmojis[activity.category?.toLowerCase()] || "✨";

      // Get tasks to calculate progress
      let tasks: any[] = [];
      try {
        tasks = await storage.getActivityTasks(activityId, userId);
      } catch (err) {
        console.error("Error fetching tasks for social text:", err);
      }

      const completedTasks = tasks.filter((t) => t.completed).length;
      const totalTasks = tasks.length;
      const progressPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const shareTitle =
        activity.shareTitle || activity.planSummary || activity.title;
      const shareDescription =
        activity.description ||
        `Join me in planning this amazing ${activity.category} experience`;

      // Generate conversational social text with engaging copy
      const progressLine =
        totalTasks > 0
          ? `${progressPercent}% complete with ${totalTasks} tasks!`
          : "Just getting started!";
      const socialText = `✨ Check out my ${shareTitle}!

${shareDescription}
Track progress, own and edit your own version!

${emoji} ${progressLine}

👉`;

      // Update activity with social text
      await storage.updateActivity(activityId, { socialText }, userId);

      const shareableLink = `${baseUrl}/share/${shareToken}`;
      res.json({
        shareableLink,
        socialText,
        groupCreated: !!newGroupId,
        groupId: newGroupId || undefined,
      });
    } catch (error) {
      console.error("Generate share link error:", error);
      res.status(500).json({ error: "Failed to generate shareable link" });
    }
  });

  // Copy shared activity to user's account
  app.post("/api/activities/copy/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      const { forceUpdate, joinGroup, shareProgress } = req.body; // Client can request an update, opt into joining group, and enable progress sharing
      const currentUserId = getUserId(req);

      console.log("[COPY ACTIVITY] 📥 Copy request received:", {
        shareToken,
        currentUserId,
        requestBody: req.body,
        forceUpdate,
        joinGroup,
        shareProgress,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.user,
      });

      // SECURITY: Block demo users from copying activities
      // If no user ID, use demo-user for viewing but block copying
      const userId = currentUserId || "demo-user";
      console.log(
        "[COPY ACTIVITY] Using userId:",
        userId,
        currentUserId ? "(authenticated)" : "(demo user)",
      );

      // Demo users cannot copy/save activities
      if (isDemoUser(userId)) {
        console.log(
          "[COPY ACTIVITY] Blocked - demo user cannot copy activities",
        );
        return res.status(403).json({
          error:
            "Demo users cannot copy activities. Please sign in to save this plan.",
          requiresAuth: true,
          message: "Sign in to save and track this plan!",
        });
      }

      // Get the activity by share token
      const sharedActivity = await storage.getActivityByShareToken(shareToken);

      if (!sharedActivity) {
        console.log(
          "[COPY ACTIVITY] Activity not found for token:",
          shareToken,
        );
        return res
          .status(404)
          .json({ error: "Shared activity not found or link has expired" });
      }

      console.log("[COPY ACTIVITY] Found shared activity:", {
        activityId: sharedActivity.id,
        title: sharedActivity.title,
        ownerId: sharedActivity.userId,
        isPublic: sharedActivity.isPublic,
      });

      // Check if activity is public
      if (!sharedActivity.isPublic) {
        console.log("[COPY ACTIVITY] Activity is not public");
        return res
          .status(403)
          .json({ error: "This activity is not public and cannot be copied" });
      }

      // Don't allow copying your own activity
      if (sharedActivity.userId === userId) {
        console.log("[COPY ACTIVITY] User trying to copy their own activity");
        return res
          .status(400)
          .json({ error: "You cannot copy your own activity" });
      }

      // Check if user already has a copy of this activity
      const existingCopy = await storage.getExistingCopyByShareToken(
        userId,
        shareToken,
      );

      if (existingCopy && !forceUpdate) {
        console.log(
          "[COPY ACTIVITY] User already has a copy - prompting for update",
        );
        return res.status(409).json({
          error: "You already have this activity",
          requiresConfirmation: true,
          existingActivity: existingCopy,
          message:
            "You already have this plan. Would you like to update it with the latest version?",
        });
      }

      // Get the tasks for the shared activity
      // Fetching from storage using the owner's ID to ensure we get the canonical tasks
      const originalTasks = await storage.getActivityTasks(
        sharedActivity.id,
        sharedActivity.userId,
      );
      console.log("[COPY ACTIVITY] Found tasks for original activity:", {
        activityId: sharedActivity.id,
        ownerId: sharedActivity.userId,
        count: originalTasks.length,
      });

      if (originalTasks.length === 0) {
        console.warn(
          "[COPY ACTIVITY] ⚠️ No tasks found for original activity. This might be a data integrity issue.",
        );
      }

      // If updating existing copy, archive the old one and preserve progress
      let oldTasks: Task[] = [];
      if (existingCopy && forceUpdate) {
        console.log(
          "[COPY ACTIVITY] Archiving old copy and preserving progress",
        );
        oldTasks = await storage.getActivityTasks(existingCopy.id, userId);
        await storage.updateActivity(
          existingCopy.id,
          { isArchived: true },
          userId,
        );
      }

      // Create a copy of the activity for the current user
      // If shareProgress is enabled and activity has a targetGroupId, link to the group activity
      const activityData: any = {
        userId: userId,
        title: joinGroup
          ? sharedActivity.title
          : `${sharedActivity.title} (Copy)`,
        description: sharedActivity.description || "No description provided",
        category: sharedActivity.category,
        planSummary: sharedActivity.planSummary,
        status: "planning", // Reset status to planning
        isPublic: false, // Make private by default
        startDate: sharedActivity.startDate,
        endDate: sharedActivity.endDate,
        copiedFromShareToken: shareToken, // Track where it came from
        backdrop: sharedActivity.backdrop, // Preserve the stock image/backdrop
      };

      // Check if activity belongs to any group (for progress sharing)
      // Priority: 1. share_links.groupId (what user sees in dialog), 2. group_activities, 3. activity.targetGroupId
      let activityGroupId: string | null = null;
      let groupActivityRecordId: string | null = null;

      // FIRST check share_links table for groupId - this is what the user SEES in the join dialog!
      // The share link's groupId is authoritative because it matches the group shown to the user
      try {
        const shareLink = await storage.getShareLink(shareToken);
        if (shareLink?.groupId) {
          activityGroupId = shareLink.groupId;
          console.log(
            "[COPY ACTIVITY] ✅ Found group from share_links (authoritative):",
            activityGroupId,
          );

          // Now try to find the group_activities record for this group
          const gaResult: any = await db.execute(
            drizzleSql.raw(`
            SELECT id FROM group_activities WHERE activity_id = '${sharedActivity.id}' AND group_id = '${activityGroupId}' LIMIT 1
          `),
          );
          if (gaResult.rows && gaResult.rows.length > 0) {
            groupActivityRecordId = gaResult.rows[0].id;
          }
        }
      } catch (err) {
        console.error(
          "[COPY ACTIVITY] Error checking share_links for groupId:",
          err,
        );
      }

      // Fallback: check group_activities table if no share_link groupId
      if (!activityGroupId) {
        try {
          const groupCheckResult: any = await db.execute(
            drizzleSql.raw(`
            SELECT id, group_id FROM group_activities WHERE activity_id = '${sharedActivity.id}' LIMIT 1
          `),
          );
          if (groupCheckResult.rows && groupCheckResult.rows.length > 0) {
            activityGroupId = groupCheckResult.rows[0].group_id;
            groupActivityRecordId = groupCheckResult.rows[0].id;
            console.log(
              "[COPY ACTIVITY] ✅ Found group from group_activities (fallback):",
              { activityGroupId, groupActivityRecordId },
            );
          }
        } catch (err) {
          console.error(
            "[COPY ACTIVITY] Error checking group_activities:",
            err,
          );
        }
      }

      // Fallback to activity.targetGroupId if no group found from other sources
      if (!activityGroupId && sharedActivity.targetGroupId) {
        activityGroupId = sharedActivity.targetGroupId;
        console.log(
          "[COPY ACTIVITY] Using targetGroupId as fallback:",
          activityGroupId,
        );

        // Try to find group_activities record
        try {
          const gaResult: any = await db.execute(
            drizzleSql.raw(`
            SELECT id FROM group_activities WHERE activity_id = '${sharedActivity.id}' AND group_id = '${activityGroupId}' LIMIT 1
          `),
          );
          if (gaResult.rows && gaResult.rows.length > 0) {
            groupActivityRecordId = gaResult.rows[0].id;
          }
        } catch (err) {
          console.error(
            "[COPY ACTIVITY] Error getting group_activities record:",
            err,
          );
        }
      }

      // If we have a group but no group_activities record and user wants progress sharing,
      // create the group_activities record now (this enables tracking for newly shared activities)
      if (shareProgress && activityGroupId && !groupActivityRecordId) {
        console.log(
          "[COPY ACTIVITY] 🔧 Creating group_activities record for progress sharing...",
        );
        try {
          // Get the original activity owner for shared_by field
          const originalOwner = sharedActivity.userId;

          // Create group_activities record using storage method
          const newGroupActivity = await storage.shareActivityToGroup(
            sharedActivity.id,
            activityGroupId,
            originalOwner,
            true, // forceUpdate = true to handle existing records gracefully
          );
          groupActivityRecordId = newGroupActivity.id;
          console.log(
            "[COPY ACTIVITY] ✅ Created group_activities record:",
            groupActivityRecordId,
          );
        } catch (err: any) {
          console.error(
            "[COPY ACTIVITY] ❌ Failed to create group_activities record:",
            err.message,
          );
          // Don't fail the copy - just disable progress sharing
        }
      }

      // Enable progress sharing if we have a valid group_activities record
      if (shareProgress && groupActivityRecordId) {
        activityData.sharesProgressWithGroup = true;
        activityData.linkedGroupActivityId = groupActivityRecordId;
        activityData.targetGroupId = activityGroupId;
        console.log("[COPY ACTIVITY] ✅ Progress sharing enabled:", {
          groupId: activityGroupId,
          groupActivityRecordId,
        });
      } else if (shareProgress && activityGroupId && !groupActivityRecordId) {
        // We have a group but couldn't create group_activities record - warn
        console.warn(
          "[COPY ACTIVITY] ⚠️ Progress sharing disabled: could not create/find group_activities record",
          {
            groupId: activityGroupId,
          },
        );
        // Still store targetGroupId for group join purposes
        activityData.targetGroupId = activityGroupId;
      }

      const copiedActivity = await storage.createActivity(activityData);
      console.log("[COPY ACTIVITY] Activity copied successfully:", {
        newActivityId: copiedActivity.id,
        userId: userId,
      });

      // Copy all tasks and preserve completion status where possible
      const copiedTasks = [];
      let taskOrder = 0;
      for (const task of originalTasks) {
        // Try to find matching task in old version using originalTaskId first, then title
        let matchingOldTask;
        if (task.originalTaskId || task.id) {
          // First attempt: match by originalTaskId (if task was previously copied)
          const searchId = task.originalTaskId || task.id;
          matchingOldTask = oldTasks.find(
            (t) => t.originalTaskId === searchId || t.id === searchId,
          );
        }

        // Fallback: match by title if no ID match found
        if (!matchingOldTask) {
          matchingOldTask = oldTasks.find(
            (t) =>
              t.title.trim().toLowerCase() === task.title.trim().toLowerCase(),
          );
        }

        const newTask = await storage.createTask({
          userId: userId,
          activityId: copiedActivity.id,
          title: task.title,
          description: task.description,
          category: task.category || "general",
          priority: task.priority || "medium",
          completed: matchingOldTask?.completed || false, // Preserve completion status
          completedAt: matchingOldTask?.completedAt || null,
          dueDate: task.dueDate,
          originalTaskId: task.originalTaskId || task.id, // Track original source task
        });

        // Add task to activity via join table
        await storage.addTaskToActivity(
          copiedActivity.id,
          newTask.id,
          taskOrder++,
        );
        copiedTasks.push(newTask);
      }
      console.log(
        "[COPY ACTIVITY] Tasks copied successfully:",
        copiedTasks.length,
      );

      // Count preserved progress
      const preservedCompletions = copiedTasks.filter(
        (t) => t.completed,
      ).length;

      // Use the already-resolved activityGroupId for group join
      // This was resolved earlier from: group_activities table -> share_links.groupId -> activity.targetGroupId
      const groupIdToJoin = activityGroupId;
      console.log("[COPY ACTIVITY] 🔍 Group join check:", {
        groupIdToJoin,
        joinGroupFlag: joinGroup,
        currentUserId,
        shareToken,
      });

      // Join group if user opted in (joinGroup=true) and we found a group
      let joinedGroup = null;
      console.log("[COPY ACTIVITY] 🔍 Group join decision point:", {
        hasGroupId: !!groupIdToJoin,
        hasCurrentUserId: !!currentUserId,
        joinGroupFlag: joinGroup,
        willAttemptJoin: !!(groupIdToJoin && currentUserId && joinGroup),
      });

      // CRITICAL: Log explicit warning if join was requested but we can't proceed
      if (joinGroup && groupIdToJoin && !currentUserId) {
        console.error(
          "[COPY ACTIVITY] ⚠️ JOIN SKIPPED: User requested to join group but session not authenticated!",
          {
            groupIdToJoin,
            joinGroupRequested: true,
            reason:
              "currentUserId is null - session may not be properly hydrated",
          },
        );
      } else if (joinGroup && !groupIdToJoin) {
        console.warn(
          "[COPY ACTIVITY] ⚠️ JOIN SKIPPED: User requested to join but no group found",
          {
            joinGroupRequested: true,
            targetGroupId: sharedActivity.targetGroupId,
            reason: "No group associated with this activity",
          },
        );
      }

      if (groupIdToJoin && currentUserId && joinGroup) {
        console.log(
          "[COPY ACTIVITY] ✅ Attempting to join group:",
          groupIdToJoin,
        );
        try {
          // Check if user is already a member
          const userGroups = await storage.getGroupsForUser(currentUserId);
          const alreadyMember = userGroups.some((g) => g.id === groupIdToJoin);
          console.log("[COPY ACTIVITY] 🔍 Membership check:", {
            userId: currentUserId,
            groupId: groupIdToJoin,
            userGroupsCount: userGroups.length,
            alreadyMember,
          });

          if (!alreadyMember) {
            console.log("[COPY ACTIVITY] 🚀 Adding user to group...");
            // Add user to the group
            await storage.addGroupMember(
              groupIdToJoin,
              currentUserId,
              "member",
            );
            console.log("[COPY ACTIVITY] ✅ User added to group successfully");

            // Get user and group info
            const user = await storage.getUser(currentUserId);
            const group = await storage.getGroup(groupIdToJoin);
            joinedGroup = group;
            console.log("[COPY ACTIVITY] 📊 Join details:", {
              userName: user?.username || user?.email,
              groupName: group?.name,
              groupId: group?.id,
            });

            // Create activity feed entry for member joining (shows in "Recent Group Activity")
            try {
              console.log(
                `[COPY ACTIVITY] 📝 Creating activity feed entry for ${user?.username || "Someone"} joining group ${groupIdToJoin}`,
              );
              await storage.logGroupActivity({
                groupId: groupIdToJoin,
                userId: currentUserId,
                userName: user?.username || "Someone",
                activityType: "member_joined",
                activityTitle: `${user?.username || "Someone"} joined the group`,
                taskTitle: null,
                groupActivityId: null,
              });
              console.log(`[COPY ACTIVITY] ✅ Activity feed entry created`);
            } catch (feedError) {
              console.error(
                "[COPY ACTIVITY] ❌ Error creating activity feed entry:",
                feedError,
              );
              // Don't fail the operation if feed logging fails
            }

            // Send notification to admin and members using proper notification service
            try {
              console.log(
                "[COPY ACTIVITY] 🔔 Sending group join notifications...",
              );
              await sendGroupNotification(storage, {
                groupId: groupIdToJoin,
                actorUserId: currentUserId,
                excludeUserIds: [currentUserId], // Don't notify the person who joined
                notificationType: "member_added",
                payload: {
                  title: "New member joined",
                  body: `${user?.username || "Someone"} joined "${group?.name || "your group"}" via shared activity`,
                  data: {
                    groupId: groupIdToJoin,
                    newMemberId: currentUserId,
                    activityTitle: sharedActivity.title,
                    viaShareLink: true,
                  },
                  route: `/groups/${groupIdToJoin}`,
                },
              });
              console.log(
                "[COPY ACTIVITY] ✅ Group join notifications sent successfully",
              );
            } catch (notifError) {
              console.error(
                "[COPY ACTIVITY] ❌ Error sending group notifications:",
                notifError,
              );
              // Don't fail the operation if notification fails
            }

            console.log(
              "[COPY ACTIVITY] ✅ User joined group successfully:",
              groupIdToJoin,
            );
          } else {
            console.log(
              "[COPY ACTIVITY] ℹ️ User already member of group:",
              groupIdToJoin,
            );
            // Still set joinedGroup so we can show appropriate message
            joinedGroup = await storage.getGroup(groupIdToJoin);
          }
        } catch (error) {
          console.error(
            "[COPY ACTIVITY] ❌ CRITICAL ERROR joining group:",
            error,
          );
          console.error("[COPY ACTIVITY] Error stack:", (error as Error).stack);
          // Don't fail the whole copy operation if group join fails
        }
      } else {
        console.log("[COPY ACTIVITY] ⏭️ Skipping group join:", {
          reason: !groupIdToJoin
            ? "No group ID"
            : !currentUserId
              ? "No user ID"
              : "joinGroup flag is false",
          groupIdToJoin,
          currentUserId,
          joinGroup,
        });
      }

      console.log("[COPY ACTIVITY] 📝 Final result:", {
        joinedGroup: joinedGroup
          ? { id: joinedGroup.id, name: joinedGroup.name }
          : null,
        willReturnJoinInfo: !!joinedGroup,
      });

      res.json({
        activity: copiedActivity,
        tasks: copiedTasks,
        isUpdate: !!forceUpdate,
        preservedProgress: preservedCompletions,
        joinedGroup,
        message: forceUpdate
          ? `Update complete! ${preservedCompletions} completed tasks preserved. Previous version moved to History.`
          : joinedGroup
            ? `Activity copied successfully! You've been added to ${joinedGroup.name}.`
            : "Activity copied successfully!",
      });
    } catch (error) {
      console.error("[COPY ACTIVITY] Error copying activity:", error);
      res.status(500).json({ error: "Failed to copy activity" });
    }
  });

  // View shared activity by token - PERMANENT LINKS that never expire
  app.get("/api/share/activity/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const currentUserId = getUserId(req);

      // First check for share_link record (permanent link with snapshot)
      const shareLink = await storage.getShareLink(token);

      // Try to get the live activity
      const liveActivity = await storage.getActivityByShareToken(token);

      // If no share_link AND no live activity, the link is truly invalid
      if (!shareLink && !liveActivity) {
        return res
          .status(404)
          .json({ error: "Shared activity not found or link has expired" });
      }

      // Increment view count for permanent links
      if (shareLink) {
        await storage.incrementShareLinkViewCount(token);
      }

      // Determine which data to use: live activity OR snapshot
      let activity: any;
      let activityTasks: any[] = [];
      let isUsingSnapshot = false;
      let hasUpdates = false;
      let isActivityDeleted = false;
      let snapshotAt: Date | null = null;

      if (liveActivity) {
        // Live activity exists - use it
        activity = liveActivity;
        try {
          activityTasks = await storage.getActivityTasks(
            activity.id,
            activity.userId,
          );
        } catch (taskError) {
          console.error("Error fetching activity tasks:", taskError);
          activityTasks = [];
        }

        // Check if there are updates since the snapshot was created
        if (shareLink && shareLink.activityUpdatedAt) {
          const activityLastUpdated = activity.updatedAt || activity.createdAt;
          hasUpdates = activityLastUpdated > shareLink.snapshotAt;
          snapshotAt = shareLink.snapshotAt;
        }
      } else if (shareLink && shareLink.snapshotData) {
        // Live activity was deleted - use snapshot (link NEVER breaks)
        console.log("[SHARE] Activity deleted, using snapshot from share_link");
        isUsingSnapshot = true;
        isActivityDeleted = true;
        snapshotAt = shareLink.snapshotAt;

        const snapshot = shareLink.snapshotData as {
          activity: any;
          tasks: any[];
        };
        activity = {
          ...snapshot.activity,
          shareToken: token,
          userId: shareLink.userId,
          isPublic: true, // Snapshots are always publicly accessible - the link was shared
        };
        // Preserve task completion state from snapshot - don't force incomplete
        activityTasks = snapshot.tasks.map((t: any, index: number) => ({
          ...t,
          id: `snapshot-task-${index}`,
          userId: shareLink.userId,
        }));

        // Mark the share link as having a deleted activity
        if (!shareLink.isActivityDeleted) {
          await storage.markShareLinkActivityDeleted(token);
        }
      } else {
        // Fallback: old share links without snapshot data
        return res
          .status(404)
          .json({ error: "Shared activity not found or link has expired" });
      }

      // IMPORTANT: Share links NEVER require authentication since they were explicitly shared
      // If we got here, the token is valid because:
      // - We already returned 404 if both shareLink AND liveActivity were missing
      // - So reaching this point means the token was found in the system
      // The act of sharing (generating a share token) implies public access
      // Share tokens are intentionally public - no auth required
      const requiresAuth = false;

      // Get owner information for "sharedBy"
      let sharedBy = undefined;
      const ownerUserId = shareLink?.userId || activity.userId;
      try {
        const owner = await storage.getUser(ownerUserId);
        if (owner) {
          const ownerName =
            owner.firstName && owner.lastName
              ? `${owner.firstName} ${owner.lastName}`
              : owner.firstName || owner.lastName || owner.email || "Anonymous";
          sharedBy = {
            name: ownerName,
            email: owner.email || undefined,
          };
        }
      } catch (err) {
        console.error("Failed to get owner info:", err);
      }

      // Generate plan summary if not present
      const planSummary =
        activity.socialText ||
        `${activity.title} - A ${activity.category} plan with ${activityTasks.length} tasks`;

      // Check if this activity is shared to any group
      let groupInfo = undefined;
      let isGroupMember = false;

      // Use group ID from share_link if available
      const groupId = shareLink?.groupId || activity.targetGroupId;

      // First check if activity has targetGroupId (for personal copies linked to groups)
      if (groupId && currentUserId) {
        try {
          const group = await storage.getGroup(groupId);
          if (group) {
            const members = await storage.getGroupMembers(groupId);
            isGroupMember = members.some((m) => m.userId === currentUserId);

            groupInfo = {
              id: group.id,
              name: group.name,
              description: group.description,
              memberCount: members.length,
              isUserMember: isGroupMember,
              inviteCode: group.inviteCode || null,
            };
          }
        } catch (groupErr) {
          console.error(
            "Failed to get group info from targetGroupId:",
            groupErr,
          );
        }
      }

      // If no targetGroupId, check if this activity is shared to any groups (in group_activities table)
      if (!groupInfo && !isUsingSnapshot && activity.id) {
        console.log(
          "[SHARE] Checking group_activities table for activity:",
          activity.id,
        );
        try {
          const groupActivitiesResult: any = await db.execute(
            drizzleSql.raw(`
            SELECT ga.group_id, g.name, g.description, g.invite_code
            FROM group_activities ga
            INNER JOIN groups g ON ga.group_id = g.id
            WHERE ga.activity_id = '${activity.id}'
            LIMIT 1
          `),
          );

          console.log("[SHARE] group_activities query result:", {
            hasRows: !!groupActivitiesResult.rows,
            rowCount: groupActivitiesResult.rows?.length || 0,
            firstRow: groupActivitiesResult.rows?.[0],
          });

          if (
            groupActivitiesResult.rows &&
            groupActivitiesResult.rows.length > 0
          ) {
            const groupRow = groupActivitiesResult.rows[0];
            const members = await storage.getGroupMembers(groupRow.group_id);

            // Check membership only if user is authenticated
            if (currentUserId) {
              isGroupMember = members.some((m) => m.userId === currentUserId);
            }

            groupInfo = {
              id: groupRow.group_id,
              name: groupRow.name,
              description: groupRow.description || null,
              memberCount: members.length,
              isUserMember: isGroupMember,
              inviteCode: groupRow.invite_code || null,
            };
            console.log("[SHARE] Built groupInfo:", groupInfo);
          }
        } catch (groupErr) {
          console.error(
            "[SHARE] Failed to get group info from group_activities:",
            groupErr,
          );
        }
      }

      res.json({
        activity: {
          ...activity,
          planSummary,
        },
        tasks: activityTasks,
        requiresAuth,
        sharedBy,
        groupInfo,
        // New fields for permanent link tracking
        linkStatus: {
          isUsingSnapshot,
          isActivityDeleted,
          hasUpdates,
          snapshotAt: snapshotAt?.toISOString() || null,
          viewCount: shareLink?.viewCount || 0,
          copyCount: shareLink?.copyCount || 0,
        },
      });
    } catch (error) {
      console.error("Get shared activity error:", error);
      res.status(500).json({ error: "Failed to fetch shared activity" });
    }
  });

  // Get public activities (for social feed)
  app.get("/api/activities/public", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await storage.getPublicActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Get public activities error:", error);
      res.status(500).json({ error: "Failed to fetch public activities" });
    }
  });

  // Get community plans (for discovery page)
  app.get("/api/community-plans", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const budgetRange = req.query.budgetRange as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      // Optional location-based filtering
      let locationFilter:
        | { lat: number; lon: number; radiusKm?: number }
        | undefined;
      if (req.query.lat && req.query.lon) {
        const lat = parseFloat(req.query.lat as string);
        const lon = parseFloat(req.query.lon as string);
        const radiusKm = req.query.radius
          ? parseFloat(req.query.radius as string)
          : 50;

        // Validate coordinates
        if (
          !isNaN(lat) &&
          !isNaN(lon) &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180
        ) {
          // Clamp radius to 5-500 km
          const clampedRadius = Math.max(5, Math.min(500, radiusKm));
          locationFilter = { lat, lon, radiusKm: clampedRadius };
        }
      }

      const plans = await storage.getCommunityPlans(
        userId,
        category,
        search,
        limit,
        budgetRange,
        locationFilter,
      );

      // Get all feedback in bulk (single query)
      const activityIds = plans.map((p) => p.id);
      const feedbackMap = await storage.getBulkActivityFeedback(
        activityIds,
        userId,
      );

      // Add user's like status and updated like count to each plan
      const plansWithLikeStatus = plans.map((plan) => {
        const feedback = feedbackMap.get(plan.id) || {
          userHasLiked: false,
          likeCount: 0,
        };
        return {
          ...plan,
          userHasLiked: feedback.userHasLiked,
          likeCount: feedback.likeCount,
        };
      });

      res.json(plansWithLikeStatus);
    } catch (error) {
      console.error("Get community plans error:", error);
      res.status(500).json({ error: "Failed to fetch community plans" });
    }
  });

  // Debug endpoint to test Instagram/social media URL extraction
  app.post("/api/debug/test-extraction", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`[DEBUG] Testing extraction for URL: ${url}`);

      // Check Apify status
      const apifyStatus = {
        available: apifyService.isAvailable(),
        status: apifyService.getStatus(),
      };
      console.log(`[DEBUG] Apify status:`, apifyStatus);

      // Detect platform
      const platform = socialMediaVideoService.detectPlatform(url);
      console.log(`[DEBUG] Detected platform: ${platform}`);

      if (!platform) {
        return res.json({
          success: false,
          apifyStatus,
          platform: null,
          error: "Unsupported platform",
          supportedPlatforms: [
            "instagram",
            "tiktok",
            "youtube",
            "twitter/x",
            "facebook",
            "reddit",
          ],
        });
      }

      // Attempt extraction
      const startTime = Date.now();
      const result = await socialMediaVideoService.extractContent(url);
      const extractionTime = Date.now() - startTime;

      console.log(`[DEBUG] Extraction result:`, {
        success: result.success,
        platform: result.platform,
        hasCaption: !!result.caption,
        hasMetadata: !!result.metadata,
        hasTranscript: !!result.audioTranscript,
        hasOcr: !!result.ocrText,
        error: result.error,
        extractionTimeMs: extractionTime,
      });

      return res.json({
        success: result.success,
        apifyStatus,
        platform,
        extractionTimeMs: extractionTime,
        result: {
          caption: result.caption?.substring(0, 500),
          metadata: result.metadata,
          hasTranscript: !!result.audioTranscript,
          transcriptPreview: result.audioTranscript?.substring(0, 200),
          hasOcr: !!result.ocrText,
          ocrPreview: result.ocrText?.substring(0, 200),
          error: result.error,
        },
      });
    } catch (error: any) {
      console.error("[DEBUG] Extraction test error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

  // Send retroactive welcome emails to existing OAuth users
  app.post("/api/admin/send-oauth-welcome-emails", async (req, res) => {
    try {
      const { adminSecret, excludeEmails } = req.body;

      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
      }

      console.log(
        "[ADMIN] Starting retroactive welcome email send for OAuth users...",
      );

      // Get all users with OAuth identities who have emails
      const oauthUsers = await db
        .select({
          userId: authIdentities.userId,
          email: users.email,
          firstName: users.firstName,
          provider: authIdentities.provider,
        })
        .from(authIdentities)
        .innerJoin(users, eq(authIdentities.userId, users.id))
        .where(and(isNotNull(users.email), ne(users.email, "")))
        .execute();

      // Filter out excluded emails
      const excludeSet = new Set(
        (excludeEmails || []).map((e: string) => e.toLowerCase()),
      );
      const filteredUsers = oauthUsers.filter(
        (u) => !excludeSet.has(u.email!.toLowerCase()),
      );

      console.log(
        `[ADMIN] Found ${oauthUsers.length} OAuth users with emails, ${filteredUsers.length} after filtering`,
      );

      let successCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      // Send emails in batches to avoid rate limiting
      for (const user of filteredUsers) {
        try {
          const result = await sendWelcomeEmail(
            user.email!,
            user.firstName || "there",
          );
          if (result.success) {
            successCount++;
            console.log(
              `[ADMIN] Welcome email sent to ${user.email} (${user.provider})`,
            );
          } else {
            failedCount++;
            errors.push({ email: user.email, error: result.error });
            console.error(
              `[ADMIN] Failed to send to ${user.email}:`,
              result.error,
            );
          }

          // Delay between emails to respect rate limit (2 emails/second = 500ms minimum)
          await new Promise((resolve) => setTimeout(resolve, 600));
        } catch (error: any) {
          failedCount++;
          errors.push({ email: user.email, error: error.message });
          console.error(`[ADMIN] Error sending to ${user.email}:`, error);
        }
      }

      console.log(
        `[ADMIN] Retroactive welcome emails complete: ${successCount} sent, ${failedCount} failed`,
      );

      res.json({
        success: true,
        message: "Retroactive welcome emails sent",
        stats: {
          total: oauthUsers.length,
          filtered: filteredUsers.length,
          sent: successCount,
          failed: failedCount,
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Only return first 10 errors
      });
    } catch (error: any) {
      console.error("[ADMIN] Retroactive email error:", error);
      res
        .status(500)
        .json({
          error: "Failed to send retroactive welcome emails",
          details: error.message,
        });
    }
  });

  // Delete complete user account (for testing purposes)
  app.delete("/api/admin/delete-user", async (req, res) => {
    try {
      const { adminSecret, email, userId } = req.body;

      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
      }

      if (!email && !userId) {
        return res
          .status(400)
          .json({ error: "Either email or userId must be provided" });
      }

      console.log("[ADMIN] Deleting user account:", email || userId);

      if (email) {
        await storage.deleteCompleteUserByEmail(email);
        console.log("[ADMIN] User deleted successfully by email:", email);
        res.json({
          success: true,
          message: `User account with email ${email} has been completely deleted`,
        });
      } else {
        await storage.deleteCompleteUser(userId);
        console.log("[ADMIN] User deleted successfully by ID:", userId);
        res.json({
          success: true,
          message: `User account with ID ${userId} has been completely deleted`,
        });
      }
    } catch (error: any) {
      console.error("[ADMIN] Delete user error:", error);
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      res
        .status(500)
        .json({
          error: "Failed to delete user account",
          details: error.message,
        });
    }
  });

  // Sync subscription tiers from Stripe (for existing Pro users stuck as "free")
  app.post("/api/admin/sync-stripe-subscriptions", async (req, res) => {
    try {
      const { adminSecret } = req.body;

      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
      }

      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      console.log("[ADMIN] Starting Stripe subscription sync...");

      // Get all users with stripe subscription IDs
      const users = (await (storage as any).getAllUsers?.()) || [];
      const usersWithSubscriptions = users.filter(
        (u: any) => u.stripeSubscriptionId,
      );

      console.log(
        `[ADMIN] Found ${usersWithSubscriptions.length} users with Stripe subscriptions`,
      );

      let syncedCount = 0;
      let errorCount = 0;
      const syncResults: any[] = [];

      // Check each user's subscription status in Stripe
      for (const user of usersWithSubscriptions) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
          );

          // Derive tier from price ID
          let tier = null;
          if (subscription.items?.data?.[0]?.price?.id) {
            const priceId = subscription.items.data[0].price.id;
            const proMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
            const proAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
            const familyMonthly = process.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY;
            const familyAnnual = process.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL;

            if (priceId === proMonthly || priceId === proAnnual) {
              tier = "pro";
            } else if (priceId === familyMonthly || priceId === familyAnnual) {
              tier = "family";
            }
          }

          // Update user if we found a tier and it's different from current
          if (tier && tier !== user.subscriptionTier) {
            await storage.updateUserField(user.id, "subscriptionTier", tier);
            await storage.updateUserField(
              user.id,
              "subscriptionStatus",
              subscription.status,
            );
            syncedCount++;
            syncResults.push({
              email: user.email,
              userId: user.id,
              oldTier: user.subscriptionTier,
              newTier: tier,
              status: subscription.status,
            });
            console.log(
              `[ADMIN] Synced ${user.email}: ${user.subscriptionTier} -> ${tier}`,
            );
          } else if (tier) {
            console.log(
              `[ADMIN] No change needed for ${user.email}: already ${tier}`,
            );
          } else {
            console.warn(`[ADMIN] Could not determine tier for ${user.email}`);
          }
        } catch (error: any) {
          errorCount++;
          console.error(`[ADMIN] Error syncing ${user.email}:`, error.message);
          syncResults.push({
            email: user.email,
            userId: user.id,
            error: error.message,
          });
        }
      }

      console.log(
        `[ADMIN] Sync complete: ${syncedCount} synced, ${errorCount} errors`,
      );

      res.json({
        success: true,
        message: "Stripe subscription sync complete",
        stats: {
          totalChecked: usersWithSubscriptions.length,
          synced: syncedCount,
          errors: errorCount,
        },
        results: syncResults,
      });
    } catch (error: any) {
      console.error("[ADMIN] Sync error:", error);
      res
        .status(500)
        .json({
          error: "Failed to sync subscriptions",
          details: error.message,
        });
    }
  });

  // Backfill missing Stripe IDs by querying Stripe API directly
  // This fixes users who have tier='pro' but NULL stripeCustomerId/stripeSubscriptionId
  app.post("/api/admin/backfill-stripe-ids", async (req, res) => {
    try {
      const { adminSecret } = req.body;

      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
      }

      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      console.log("[ADMIN] Starting Stripe ID backfill...");

      // Get ALL users (not just ones with Stripe IDs)
      const users = (await (storage as any).getAllUsers?.()) || [];
      console.log(`[ADMIN] Found ${users.length} total users in database`);

      let backfilledCount = 0;
      let errorCount = 0;
      const backfillResults: any[] = [];

      // Query Stripe for ALL subscriptions
      const stripeSubscriptions = [];
      let hasMore = true;
      let startingAfter = undefined;

      while (hasMore) {
        const result = await stripe.subscriptions.list({
          limit: 100,
          starting_after: startingAfter,
          expand: ["data.customer"],
        });

        stripeSubscriptions.push(...result.data);
        hasMore = result.has_more;
        if (result.data.length > 0) {
          startingAfter = result.data[result.data.length - 1].id;
        }
      }

      console.log(
        `[ADMIN] Found ${stripeSubscriptions.length} subscriptions in Stripe`,
      );

      // Build a map of email -> Array of Stripe subscriptions (handles family plans with multiple users)
      const emailToStripeData = new Map<string, Array<any>>();
      for (const sub of stripeSubscriptions) {
        const customer = sub.customer as any;
        const email = customer?.email?.toLowerCase();
        if (email) {
          const data = {
            subscriptionId: sub.id,
            customerId: typeof customer === "string" ? customer : customer.id,
            status: sub.status,
            priceId: sub.items?.data?.[0]?.price?.id,
          };

          if (!emailToStripeData.has(email)) {
            emailToStripeData.set(email, []);
          }
          emailToStripeData.get(email)!.push(data);
        }
      }

      // Match users to Stripe data by email
      // SAFETY: Only process users already marked as Pro/Family to avoid incorrect promotions
      const proFamilyUsers = users.filter(
        (u) => u.subscriptionTier === "pro" || u.subscriptionTier === "family",
      );
      console.log(
        `[ADMIN] Found ${proFamilyUsers.length} Pro/Family users to check for missing Stripe IDs`,
      );

      for (const user of proFamilyUsers) {
        if (!user.email) continue;

        // SAFETY: Skip users who already have BOTH IDs - they're fine
        if (user.stripeSubscriptionId && user.stripeCustomerId) {
          console.log(
            `[ADMIN] Skipping ${user.email} - already has complete Stripe IDs`,
          );
          continue;
        }

        const stripeSubs = emailToStripeData.get(user.email.toLowerCase());
        if (!stripeSubs || stripeSubs.length === 0) {
          console.warn(
            `[ADMIN] Pro/Family user ${user.email} has no Stripe subscriptions - manual review needed`,
          );
          backfillResults.push({
            email: user.email,
            userId: user.id,
            warning:
              "No Stripe subscription found for Pro/Family user - manual review required",
          });
          continue;
        }

        try {
          // Find the right subscription for this user
          // Priority: 1) Match existing stripeSubscriptionId, 2) Match existing stripeCustomerId, 3) Use ONLY active subscription
          let stripeData = null;

          if (user.stripeSubscriptionId) {
            // Try to match existing subscription ID
            stripeData = stripeSubs.find(
              (s) => s.subscriptionId === user.stripeSubscriptionId,
            );
          }

          if (!stripeData && user.stripeCustomerId) {
            // Try to match existing customer ID
            stripeData = stripeSubs.find(
              (s) => s.customerId === user.stripeCustomerId,
            );
          }

          if (!stripeData) {
            // SAFETY: Only use active/trialing subscriptions for new matches
            const activeSubs = stripeSubs.filter(
              (s) => s.status === "active" || s.status === "trialing",
            );
            if (activeSubs.length === 1) {
              // Only auto-match if there's exactly ONE active subscription
              stripeData = activeSubs[0];
            } else if (activeSubs.length > 1) {
              console.warn(
                `[ADMIN] User ${user.email} has ${activeSubs.length} active subscriptions - manual review needed`,
              );
              backfillResults.push({
                email: user.email,
                userId: user.id,
                warning: `${activeSubs.length} active subscriptions found - manual disambiguation required`,
              });
              continue;
            } else {
              console.warn(
                `[ADMIN] User ${user.email} has no active subscriptions - manual review needed`,
              );
              backfillResults.push({
                email: user.email,
                userId: user.id,
                warning:
                  "No active Stripe subscription - manual review required",
              });
              continue;
            }
          }

          if (!stripeData) continue;

          // Derive tier from price ID
          let tier = null;
          if (stripeData.priceId) {
            const proMonthly = process.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
            const proAnnual = process.env.VITE_STRIPE_PRICE_PRO_ANNUAL;
            const familyMonthly = process.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY;
            const familyAnnual = process.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL;

            if (
              stripeData.priceId === proMonthly ||
              stripeData.priceId === proAnnual
            ) {
              tier = "pro";
            } else if (
              stripeData.priceId === familyMonthly ||
              stripeData.priceId === familyAnnual
            ) {
              tier = "family";
            }
          }

          // Build update object - always update IDs to fix stale data
          const updates: any = {};
          let needsUpdate = false;

          // Update subscription ID if missing or different
          if (user.stripeSubscriptionId !== stripeData.subscriptionId) {
            updates.stripeSubscriptionId = stripeData.subscriptionId;
            needsUpdate = true;
          }

          // Update customer ID if missing or different
          if (user.stripeCustomerId !== stripeData.customerId) {
            updates.stripeCustomerId = stripeData.customerId;
            needsUpdate = true;
          }

          // Update tier if we derived one and it's different
          if (tier && user.subscriptionTier !== tier) {
            updates.subscriptionTier = tier;
            needsUpdate = true;
          }

          // Update status if different
          if (user.subscriptionStatus !== stripeData.status) {
            updates.subscriptionStatus = stripeData.status;
            needsUpdate = true;
          }

          // Update if needed
          if (needsUpdate) {
            await storage.updateUser(user.id, updates);
            backfilledCount++;
            backfillResults.push({
              email: user.email,
              userId: user.id,
              matchedBy: user.stripeSubscriptionId
                ? "subscriptionId"
                : user.stripeCustomerId
                  ? "customerId"
                  : "newMatch",
              updates: updates,
            });
            console.log(`[ADMIN] Backfilled ${user.email}:`, updates);
          }
        } catch (error: any) {
          errorCount++;
          console.error(
            `[ADMIN] Error backfilling ${user.email}:`,
            error.message,
          );
          backfillResults.push({
            email: user.email,
            userId: user.id,
            error: error.message,
          });
        }
      }

      console.log(
        `[ADMIN] Backfill complete: ${backfilledCount} updated, ${errorCount} errors`,
      );

      res.json({
        success: true,
        message: "Stripe ID backfill complete",
        stats: {
          totalUsers: users.length,
          proFamilyUsers: proFamilyUsers.length,
          totalStripeSubscriptions: stripeSubscriptions.length,
          backfilled: backfilledCount,
          errors: errorCount,
          warnings: backfillResults.filter((r) => r.warning).length,
        },
        results: backfillResults,
      });
    } catch (error: any) {
      console.error("[ADMIN] Backfill error:", error);
      res
        .status(500)
        .json({
          error: "Failed to backfill Stripe IDs",
          details: error.message,
        });
    }
  });

  // Test welcome email endpoint (temporary - for development only)
  app.post("/api/admin/test-welcome-email", async (req, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json({ error: "This endpoint is only available in development mode" });
    }

    try {
      const { email, firstName } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      console.log("[TEST EMAIL] Sending test welcome email to:", email);
      const result = await sendWelcomeEmail(email, firstName || "there");

      if (result.success) {
        res.json({
          success: true,
          message: "Test welcome email sent successfully",
          emailId: result.emailId,
        });
      } else {
        res
          .status(500)
          .json({
            success: false,
            error: "Failed to send email",
            details: result.error,
          });
      }
    } catch (error) {
      console.error("Test welcome email error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Test email endpoint - requires authentication
  app.post("/api/test-email", async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "You must be signed in to send test emails",
      });
    }

    try {
      const { email, firstName } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: "Email is required" });
      }

      console.log(
        "[TEST EMAIL] Sending test welcome email to:",
        email,
        "for user:",
        userId,
      );
      const result = await sendWelcomeEmail(email, firstName || "there");

      if (result.success) {
        res.json({
          success: true,
          message: "Test welcome email sent successfully!",
          emailId: result.emailId,
        });
      } else {
        res
          .status(500)
          .json({
            success: false,
            error: result.error || "Failed to send email",
          });
      }
    } catch (error: any) {
      console.error("[TEST EMAIL] Error:", error);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to send test email",
        });
    }
  });

  // Increment activity views
  app.post("/api/activities/:activityId/increment-views", async (req, res) => {
    try {
      const { activityId } = req.params;
      await storage.incrementActivityViews(activityId);
      res.json({ success: true });
    } catch (error) {
      console.error("Increment views error:", error);
      res.status(500).json({ error: "Failed to increment views" });
    }
  });

  // Track share card downloads for credit system
  app.post("/api/activities/:activityId/track-share", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { platform, count = 1 } = req.body;

      // Increment share count
      await db
        .update(activities)
        .set({ shareCount: sql`${activities.shareCount} + ${count}` })
        .where(eq(activities.id, activityId));

      // Award milestone credits if applicable
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);
      if (activity) {
        const newShareCount = (activity.shareCount || 0) + count;

        // Check for milestones (100, 500, 1000)
        if ([100, 500, 1000].includes(newShareCount)) {
          const { CreditService } = await import("./services/creditService.js");
          await CreditService.awardShareMilestoneCredits(
            activity.userId,
            activityId,
            newShareCount,
          );
        }
      }

      res.json({ success: true, platform });
    } catch (error) {
      console.error("[track-share] Error:", error);
      res.status(500).json({ error: "Failed to track share" });
    }
  });

  // Save social media post URLs for activity verification
  app.post("/api/activities/:activityId/social-links", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user owns the activity
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);
      if (!activity || activity.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const {
        twitterPostUrl,
        instagramPostUrl,
        threadsPostUrl,
        linkedinPostUrl,
      } = req.body;

      // Upsert planner profile with social links
      const [plannerProfile] = await db
        .insert(plannerProfiles)
        .values({
          userId,
          twitterPostUrl: twitterPostUrl || null,
          instagramPostUrl: instagramPostUrl || null,
          threadsPostUrl: threadsPostUrl || null,
          linkedinPostUrl: linkedinPostUrl || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: plannerProfiles.userId,
          set: {
            twitterPostUrl: twitterPostUrl || null,
            instagramPostUrl: instagramPostUrl || null,
            threadsPostUrl: threadsPostUrl || null,
            linkedinPostUrl: linkedinPostUrl || null,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Link plannerProfileId to activity if not already linked
      if (
        plannerProfile &&
        (!activity.plannerProfileId ||
          activity.plannerProfileId !== plannerProfile.id)
      ) {
        await db
          .update(activities)
          .set({ plannerProfileId: plannerProfile.id })
          .where(eq(activities.id, activityId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[social-links] Error:", error);
      res.status(500).json({ error: "Failed to save social links" });
    }
  });

  // Get social media post URLs for a planner profile (public endpoint)
  app.get("/api/planner-profiles/:profileId/social-links", async (req, res) => {
    try {
      const { profileId } = req.params;

      const [profile] = await db
        .select({
          twitterPostUrl: plannerProfiles.twitterPostUrl,
          instagramPostUrl: plannerProfiles.instagramPostUrl,
          threadsPostUrl: plannerProfiles.threadsPostUrl,
          linkedinPostUrl: plannerProfiles.linkedinPostUrl,
        })
        .from(plannerProfiles)
        .where(eq(plannerProfiles.id, profileId))
        .limit(1);

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("[planner-profile-social-links] Error:", error);
      res.status(500).json({ error: "Failed to fetch social links" });
    }
  });

  // Report an activity for spam/fraud (with rate limiting)
  const reportRateLimiter = new Map<
    string,
    { count: number; resetAt: number }
  >();

  app.post("/api/activities/:activityId/report", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Rate limiting: 5 reports per hour per user
      const now = Date.now();
      const rateLimitKey = `report:${userId}`;
      const rateLimitData = reportRateLimiter.get(rateLimitKey);

      if (rateLimitData) {
        if (now < rateLimitData.resetAt) {
          if (rateLimitData.count >= 5) {
            const minutesRemaining = Math.ceil(
              (rateLimitData.resetAt - now) / 60000,
            );
            return res.status(429).json({
              error: "Rate limit exceeded",
              message: `You can submit up to 5 reports per hour. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`,
            });
          }
          rateLimitData.count++;
        } else {
          // Reset window expired
          reportRateLimiter.set(rateLimitKey, {
            count: 1,
            resetAt: now + 3600000,
          });
        }
      } else {
        // First report
        reportRateLimiter.set(rateLimitKey, {
          count: 1,
          resetAt: now + 3600000,
        });
      }

      const { reason, details } = req.body;

      // Validate reason
      const validReasons = [
        "spam",
        "fraud",
        "inappropriate",
        "copyright",
        "other",
      ];
      if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({ error: "Invalid report reason" });
      }

      // Check if activity exists (use public access - users can report any public activity)
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Only allow reporting public/featured activities
      if (!activity.isPublic && !activity.featuredInCommunity) {
        return res
          .status(403)
          .json({ error: "You can only report public community plans" });
      }

      // Check if user already reported this activity (prevents duplicate reports)
      const existingReport = await storage.checkDuplicateReport(
        activityId,
        userId,
      );
      if (existingReport && existingReport.status !== "dismissed") {
        return res
          .status(400)
          .json({ error: "You have already reported this activity" });
      }

      // Create report using storage interface
      await storage.createActivityReport({
        activityId,
        reportedBy: userId,
        reason,
        details: details || null,
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
      });

      res.json({
        success: true,
        message:
          "Report submitted successfully. Thank you for helping keep our community safe.",
      });
    } catch (error) {
      console.error("[report-activity] Error:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  // Request edit permission for a shared activity - copies the activity to user's account
  app.post(
    "/api/activities/:activityId/request-permission",
    async (req, res) => {
      try {
        const { activityId } = req.params;
        const userId = getUserId(req);

        if (!userId) {
          return res.status(401).json({
            error: "Sign in required",
            message:
              "You must be signed in to request permission to edit this activity.",
            requiresAuth: true,
          });
        }

        // Get the original activity
        const [originalActivity] = await db
          .select()
          .from(activities)
          .where(eq(activities.id, activityId))
          .limit(1);
        if (!originalActivity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        // Check if user is already the owner
        if (originalActivity.userId === userId) {
          return res
            .status(400)
            .json({ error: "You already own this activity" });
        }

        // Check if user already has a copy of this activity
        const existingCopy = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.userId, userId),
              eq(activities.title, `${originalActivity.title} (Copy)`),
            ),
          )
          .limit(1);

        if (existingCopy.length > 0) {
          return res.json({
            success: true,
            message: "You already have a copy of this activity",
            activity: existingCopy[0],
          });
        }

        // Get all tasks associated with the original activity
        const originalTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.activityId, activityId));

        // Create a copy of the activity for the user
        const [copiedActivity] = await db
          .insert(activities)
          .values({
            userId,
            title: `${originalActivity.title} (Copy)`,
            description: originalActivity.description,
            category: originalActivity.category,
            status: "active",
            priority: originalActivity.priority,
            startDate: originalActivity.startDate,
            endDate: originalActivity.endDate,
            planSummary: originalActivity.planSummary,
            isPublic: false, // Don't automatically share the copy
            shareToken: null,
            shareableLink: null,
          })
          .returning();

        // Copy all tasks associated with the activity
        const copiedTasks = [];
        for (const task of originalTasks) {
          const [newTask] = await db
            .insert(tasks)
            .values({
              userId,
              activityId: copiedActivity.id,
              title: task.title,
              description: task.description,
              category: task.category,
              priority: task.priority,
              status: "pending",
              completed: false,
              dueDate: task.dueDate,
              timeEstimate: task.timeEstimate,
            })
            .returning();
          copiedTasks.push(newTask);
        }

        res.json({
          success: true,
          message: `Activity "${originalActivity.title}" has been copied to your account with ${copiedTasks.length} tasks`,
          activity: copiedActivity,
          tasks: copiedTasks,
        });
      } catch (error) {
        console.error("Request permission error:", error);
        res.status(500).json({ error: "Failed to copy activity" });
      }
    },
  );

  // Get permission requests for an activity (owner only)
  app.get(
    "/api/activities/:activityId/permission-requests",
    async (req, res) => {
      try {
        const { activityId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;

        // Verify the user owns this activity
        const activity = await storage.getActivity(activityId, userId);
        if (!activity) {
          return res
            .status(404)
            .json({ error: "Activity not found or unauthorized" });
        }

        const requests =
          await storage.getActivityPermissionRequests(activityId);
        res.json(requests);
      } catch (error) {
        console.error("Get permission requests error:", error);
        res.status(500).json({ error: "Failed to fetch permission requests" });
      }
    },
  );

  // Get all permission requests for the current user (as requester)
  app.get("/api/permission-requests", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const requests = await storage.getUserPermissionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Get user permission requests error:", error);
      res.status(500).json({ error: "Failed to fetch permission requests" });
    }
  });

  // Get all permission requests for the current user (as owner)
  app.get("/api/permission-requests/owner", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const requests = await storage.getOwnerPermissionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Get owner permission requests error:", error);
      res.status(500).json({ error: "Failed to fetch permission requests" });
    }
  });

  // Approve or deny a permission request (owner only)
  app.patch("/api/permission-requests/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body; // 'approved' or 'denied'
      const userId = getUserId(req) || DEMO_USER_ID;

      if (!["approved", "denied"].includes(status)) {
        return res
          .status(400)
          .json({ error: "Invalid status. Must be approved or denied" });
      }

      const request = await storage.updatePermissionRequest(
        requestId,
        status,
        userId,
      );

      if (!request) {
        return res
          .status(404)
          .json({ error: "Permission request not found or unauthorized" });
      }

      res.json({ success: true, request });
    } catch (error) {
      console.error("Update permission request error:", error);
      res.status(500).json({ error: "Failed to update permission request" });
    }
  });

  // Create activity from dialogue (AI-generated tasks)
  // Update existing activity with new plan (replaces all tasks)
  app.post(
    "/api/activities/:activityId/update-from-dialogue",
    async (req: any, res) => {
      try {
        const { activityId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;
        const { title, description, category, tasks } = req.body;

        // Verify ownership
        const existingActivity = await storage.getActivity(activityId, userId);
        if (!existingActivity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        // Update activity metadata
        const updatedActivity = await storage.updateActivity(
          activityId,
          {
            title,
            description,
            category,
          },
          userId,
        );

        // ATOMIC TASK REPLACEMENT WITH ROLLBACK:
        // 1. Create all new tasks first (don't link yet)
        // 2. Save reference to existing tasks before removal
        // 3. Remove old tasks and link new ones
        // 4. If linking fails, rollback by restoring old task links

        const newTasks: any[] = [];
        let existingTasks: any[] = [];

        try {
          // Step 1: Create all new tasks (without linking)
          if (tasks && Array.isArray(tasks)) {
            for (const taskData of tasks) {
              const task = await storage.createTask({
                ...taskData,
                userId,
                category: taskData.category || category || "general",
              });
              newTasks.push(task);
            }
          }

          // Step 2: Get existing tasks BEFORE removal
          existingTasks = await storage.getActivityTasks(activityId, userId);

          // Step 3: Remove old task associations (but keep task records for potential rollback)
          for (const task of existingTasks) {
            await storage.removeTaskFromActivity(activityId, task.id);
          }

          // Step 4: Link new tasks to the activity (CRITICAL SECTION)
          // If this fails, we rollback to original tasks
          for (let i = 0; i < newTasks.length; i++) {
            await storage.addTaskToActivity(activityId, newTasks[i].id, i);
          }
        } catch (linkError) {
          console.error(
            "Failed during task replacement, rolling back:",
            linkError,
          );

          // ROLLBACK: Restore original task links
          try {
            // Remove any partially-linked new tasks
            for (const newTask of newTasks) {
              await storage
                .removeTaskFromActivity(activityId, newTask.id)
                .catch(() => {});
              await storage.deleteTask(newTask.id, userId).catch(() => {});
            }

            // Restore original task links (tasks still exist because we haven't deleted them yet)
            for (let i = 0; i < existingTasks.length; i++) {
              await storage.addTaskToActivity(
                activityId,
                existingTasks[i].id,
                i,
              );
            }

            console.log("Successfully rolled back to original tasks");
          } catch (rollbackError) {
            console.error("CRITICAL: Rollback failed:", rollbackError);
          }

          throw new Error("Failed to update tasks, changes rolled back");
        }

        // Step 5: ONLY delete old tasks AFTER successful linking
        // At this point, new tasks are safely linked and we can cleanup
        for (const task of existingTasks) {
          await storage.deleteTask(task.id, userId).catch((err) => {
            console.error("Failed to delete old task (non-critical):", err);
            // Non-critical: new tasks are already linked, old tasks just orphaned
          });
        }

        // Get the complete updated activity with new tasks
        const activityTasks = await storage.getActivityTasks(
          activityId,
          userId,
        );
        res.json({ ...updatedActivity, tasks: activityTasks });
      } catch (error) {
        console.error("Update activity from dialogue error:", error);
        res.status(500).json({ error: "Failed to update activity" });
      }
    },
  );

  // This creates BOTH the activity AND all tasks linked to it
  app.post("/api/activities/from-dialogue", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { title, description, category, tasks } = req.body;

      // Check if user is authenticated - non-authenticated users limited to 1 activity per session
      const isAuthenticated = getUserId(req) !== null;
      if (!isAuthenticated) {
        // Initialize session counter if it doesn't exist
        if (!req.session.demoActivityCount) {
          req.session.demoActivityCount = 0;
        }

        // Check session-based limit (1 activity per session for demo users)
        if (req.session.demoActivityCount >= 1) {
          return res.status(403).json({
            error: "Sign in required",
            message:
              "You've created your free activity! Sign in to create unlimited activities and unlock premium features like sharing, progress tracking, and AI-powered insights.",
            requiresAuth: true,
          });
        }
      }

      // Create the activity
      const activity = await storage.createActivity({
        title,
        description,
        category,
        status: "planning",
        userId,
      });

      // Create tasks and link them to the activity
      // This ensures ALL tasks belong to an activity (no orphan tasks)
      if (tasks && Array.isArray(tasks)) {
        for (let i = 0; i < tasks.length; i++) {
          const taskData = tasks[i];
          const task = await storage.createTask({
            ...taskData,
            userId,
            category: taskData.category || category || "general",
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
        }
      }

      // Increment counter AFTER successful creation (for demo users only)
      if (!isAuthenticated) {
        req.session.demoActivityCount += 1;
      }

      // Auto-journal if the description contains a URL source (imported content)
      let journalEntryId = null;
      const urlMatch = description?.match(/https?:\/\/[^\s]+/i);
      const isSocialMedia =
        urlMatch &&
        /instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|facebook\.com|reddit\.com/i.test(
          urlMatch[0],
        );

      if (isSocialMedia && isAuthenticated) {
        try {
          const sourceUrl = urlMatch[0];

          // Normalize URL for consistent duplicate detection
          const normalizeUrlForDuplicateCheck = (urlString: string): string => {
            try {
              const parsed = new URL(urlString);
              if (parsed.hostname.includes("instagram.com")) {
                const pathMatch = parsed.pathname.match(
                  /\/(reel|p|stories)\/([^\/]+)/,
                );
                if (pathMatch) {
                  return `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
                }
              }
              if (parsed.hostname.includes("tiktok.com")) {
                const pathMatch = parsed.pathname.match(
                  /\/@?[^\/]+\/video\/(\d+)/,
                );
                if (pathMatch) {
                  return `https://www.tiktok.com/video/${pathMatch[1]}`;
                }
              }
              if (
                parsed.hostname.includes("youtube.com") ||
                parsed.hostname.includes("youtu.be")
              ) {
                const videoId =
                  parsed.searchParams.get("v") ||
                  parsed.pathname.split("/").pop();
                if (videoId) {
                  return `https://www.youtube.com/watch?v=${videoId}`;
                }
              }
              parsed.search = "";
              parsed.hash = "";
              return parsed.toString();
            } catch {
              return urlString;
            }
          };

          const normalizedSourceUrl = normalizeUrlForDuplicateCheck(sourceUrl);

          // Check for duplicate in journalData preferences (primary source of truth)
          const prefs = await storage.getUserPreferences(userId);
          const journalData = prefs?.preferences?.journalData || {};
          let existsInPreferences = false;

          for (const categoryKey of Object.keys(journalData)) {
            const items = journalData[categoryKey] || [];
            if (
              items.some((item: any) => {
                if (!item.sourceUrl) return false;
                const itemNormalizedUrl = normalizeUrlForDuplicateCheck(
                  item.sourceUrl,
                );
                return itemNormalizedUrl === normalizedSourceUrl;
              })
            ) {
              existsInPreferences = true;
              console.log(
                `[AUTO-JOURNAL] Entry already exists in journalData.${categoryKey} for normalized URL: ${normalizedSourceUrl}`,
              );
              break;
            }
          }

          if (existsInPreferences) {
            console.log(
              `[AUTO-JOURNAL] Skipping duplicate - URL already exists in journal preferences`,
            );
          } else {
            const platform = sourceUrl.includes("instagram")
              ? "Instagram"
              : sourceUrl.includes("tiktok")
                ? "TikTok"
                : sourceUrl.includes("youtube") ||
                    sourceUrl.includes("youtu.be")
                  ? "YouTube"
                  : sourceUrl.includes("twitter") || sourceUrl.includes("x.com")
                    ? "Twitter/X"
                    : sourceUrl.includes("facebook")
                      ? "Facebook"
                      : sourceUrl.includes("reddit")
                        ? "Reddit"
                        : "Social Media";

            // Map category to journal category using centralized function
            // For AI-categorized content, try to use ContentCategory format first
            const contentCategoryMap: Record<string, string> = {
              food_dining: "restaurants",
              entertainment: "entertainment",
              travel_adventure: "travel_itinerary",
              fitness_wellness: "fitness",
              reading: "other",
              shopping: "shopping",
              nightlife: "bars_nightlife",
              creative: "other",
              productivity: "other",
              general: "other",
            };
            const contentCategory = contentCategoryMap[category] || category;
            const journalCategory =
              mapAiCategoryNameToJournalCategory(contentCategory);

            // Try to look up cached content for enrichment
            let cachedContent: any = null;
            let thumbnailUrl: string | null = null;
            let extractedDescription: string | null = null;

            try {
              // Normalize URL for cache lookup
              const normalizeUrlForCache = (urlString: string): string => {
                try {
                  const parsed = new URL(urlString);
                  if (parsed.hostname.includes("instagram.com")) {
                    const pathMatch = parsed.pathname.match(
                      /\/(reel|p|stories)\/([^\/]+)/,
                    );
                    if (pathMatch) {
                      return `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
                    }
                  }
                  if (parsed.hostname.includes("tiktok.com")) {
                    const pathMatch = parsed.pathname.match(
                      /\/@?[^\/]+\/video\/(\d+)/,
                    );
                    if (pathMatch) {
                      return `https://www.tiktok.com/video/${pathMatch[1]}`;
                    }
                  }
                  parsed.search = "";
                  parsed.hash = "";
                  return parsed.toString();
                } catch {
                  return urlString;
                }
              };

              const normalizedUrl = normalizeUrlForCache(sourceUrl);
              cachedContent = await storage.getUrlContentCache(normalizedUrl);

              if (cachedContent) {
                console.log(
                  `[AUTO-JOURNAL] Found cached content for URL: ${normalizedUrl}`,
                );
                thumbnailUrl = cachedContent.metadata?.thumbnail || null;
                extractedDescription =
                  cachedContent.extractedContent?.substring(0, 500) || null;
              }
            } catch (cacheError) {
              console.warn("[AUTO-JOURNAL] Cache lookup failed:", cacheError);
            }

            // First, add to journalData in user preferences (primary source of truth)
            // This is checked FIRST before creating journal entry to minimize race window
            try {
              // Re-fetch preferences to get latest state
              const latestPrefs = await storage.getUserPreferences(userId);
              const currentPrefs = latestPrefs?.preferences || {};
              const journalData = currentPrefs.journalData || {};
              const categoryItems = journalData[journalCategory] || [];

              // Final duplicate check with freshly fetched data
              const alreadyExists = categoryItems.some((item: any) => {
                if (!item.sourceUrl) return false;
                try {
                  const itemNormalized = normalizeUrlForDuplicateCheck(
                    item.sourceUrl,
                  );
                  return itemNormalized === normalizedSourceUrl;
                } catch {
                  return item.sourceUrl === sourceUrl;
                }
              });

              if (alreadyExists) {
                console.log(
                  `[AUTO-JOURNAL] Duplicate detected on final check, skipping all journal creation`,
                );
              } else {
                // Build media array with proper null checks
                const cachedMedia = Array.isArray(
                  cachedContent?.metadata?.media,
                )
                  ? cachedContent.metadata.media.filter(
                      (m: any) =>
                        m &&
                        (m.type === "image" || m.type === "video") &&
                        m.url,
                    )
                  : [];
                const mediaItems =
                  cachedMedia.length > 0
                    ? cachedMedia
                    : thumbnailUrl
                      ? [{ type: "image", url: thumbnailUrl }]
                      : [];

                // Generate a temporary ID for the journal item (will be updated after journal_entries creation)
                const tempId = `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                // Get platform emoji for visual formatting
                const platformEmojis: Record<string, string> = {
                  instagram: "📸",
                  tiktok: "🎵",
                  youtube: "📺",
                  twitter: "🐦",
                  x: "𝕏",
                  facebook: "📘",
                  reddit: "🔗",
                  chatgpt: "🤖",
                  claude: "🧠",
                  gemini: "✨",
                };
                const platformEmoji =
                  platformEmojis[platform.toLowerCase()] || "📌";

                // Extract hashtags from title and description
                const hashtagRegex = /#\w+/g;
                const extractedHashtags = [
                  ...(title?.match(hashtagRegex) || []),
                  ...(description?.match(hashtagRegex) || []),
                  ...(extractedDescription?.match(hashtagRegex) || []),
                ].map((tag) => tag.toLowerCase());
                const uniqueHashtags = [...new Set(extractedHashtags)];

                // Get category emoji
                const categoryEmojis: Record<string, string> = {
                  restaurants: "🍽️",
                  travel: "✈️",
                  music: "🎵",
                  movies: "🎬",
                  books: "📚",
                  products: "🛍️",
                  workouts: "💪",
                  fitness: "💪",
                  personal: "✨",
                  "custom-exercise": "🏋️",
                };
                const categoryEmoji = categoryEmojis[journalCategory] || "📝";

                // Create enriched text with emojis and source reference
                const enrichedText = `${categoryEmoji} ${title}\n\n${platformEmoji} Saved from ${platform}`;

                // Build enhanced keywords with hashtags and platform info
                const enhancedKeywords = [
                  platform.toLowerCase(),
                  "imported",
                  journalCategory,
                  ...uniqueHashtags.slice(0, 5), // Include up to 5 hashtags as keywords
                ].filter(Boolean);

                // Create new journal item with enriched data and normalized URL
                const newJournalItem = {
                  id: tempId,
                  text: enrichedText,
                  date: new Date().toISOString().split("T")[0],
                  notes: description || "",
                  sourceUrl: normalizedSourceUrl,
                  originalUrl: sourceUrl,
                  platform: platform.toLowerCase(),
                  platformEmoji,
                  categoryEmoji,
                  thumbnail: thumbnailUrl || null,
                  media: mediaItems,
                  keywords: enhancedKeywords,
                  hashtags: uniqueHashtags,
                  aiConfidence: 0.9,
                  isImported: true,
                  activityId: activity.id,
                };

                // Add to the beginning of the category items
                const updatedItems = [newJournalItem, ...categoryItems];

                // Reserve the slot in preferences first
                await storage.upsertUserPreferences(userId, {
                  preferences: {
                    ...currentPrefs,
                    journalData: {
                      ...journalData,
                      [journalCategory]: updatedItems,
                    },
                  },
                });

                console.log(
                  `[AUTO-JOURNAL] Reserved slot in journalData.${journalCategory} for user ${userId}`,
                );

                // Now create the journal entry in the database
                const tasksList =
                  tasks?.map((t: any) => t.title).join("\n- ") || "";
                const journalReflection =
                  `## Saved from ${platform}: ${title}\n\n` +
                  `**Source:** ${sourceUrl}\n\n` +
                  (extractedDescription
                    ? `### Content\n${extractedDescription}\n\n`
                    : "") +
                  `### Plan Summary\n${description || "No summary available"}\n\n` +
                  `### Tasks\n- ${tasksList}`;

                const journalEntry = await storage.createJournalEntry({
                  userId,
                  date: new Date().toISOString().split("T")[0],
                  mood: "great",
                  reflection: journalReflection,
                });
                journalEntryId = journalEntry.id;

                // Update the temporary ID with the real journal entry ID
                const finalPrefs = await storage.getUserPreferences(userId);
                const finalCurrentPrefs = finalPrefs?.preferences || {};
                const finalJournalData = finalCurrentPrefs.journalData || {};
                const finalCategoryItems =
                  finalJournalData[journalCategory] || [];

                // Find and update the pending item with the real ID
                const updatedFinalItems = finalCategoryItems.map((item: any) =>
                  item.id === tempId ? { ...item, id: journalEntryId } : item,
                );

                await storage.upsertUserPreferences(userId, {
                  preferences: {
                    ...finalCurrentPrefs,
                    journalData: {
                      ...finalJournalData,
                      [journalCategory]: updatedFinalItems,
                    },
                  },
                });

                console.log(
                  `[AUTO-JOURNAL] Created journal entry ${journalEntryId} from ${platform} URL for activity ${activity.id} in category: ${journalCategory}`,
                );
              }
            } catch (prefError) {
              console.warn(
                "[AUTO-JOURNAL] Failed to create journal entry:",
                prefError,
              );
            }
          }
        } catch (journalError) {
          console.error(
            "[AUTO-JOURNAL] Error creating journal entry:",
            journalError,
          );
          // Don't fail the whole request if journaling fails
        }
      }

      // Get the complete activity with tasks
      const activityTasks = await storage.getActivityTasks(activity.id, userId);
      res.json({ ...activity, tasks: activityTasks, journalEntryId });
    } catch (error) {
      console.error("Create activity from dialogue error:", error);
      res
        .status(500)
        .json({ error: "Failed to create activity from dialogue" });
    }
  });

  // Get progress dashboard data
  app.get("/api/progress", async (req, res) => {
    try {
      // Disable caching and ETags for this endpoint to always get fresh data
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("ETag", ""); // Disable ETag
      res.removeHeader("ETag"); // Ensure no ETag

      const userId = getUserId(req) || DEMO_USER_ID;

      // Get ALL tasks (including completed) for progress calculation
      // Note: getUserTasks() filters out completed tasks, so we query directly
      const tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.userId, userId),
            or(eq(tasksTable.archived, false), isNull(tasksTable.archived)),
          ),
        );

      // Get today's date in YYYY-MM-DD format (local timezone)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      console.log("[PROGRESS] Today's date:", today);

      // Calculate today's progress based on completion date
      console.log(
        "[PROGRESS] Sample task data:",
        tasks.slice(0, 3).map((t) => ({
          title: t.title,
          completed: t.completed,
          completedType: typeof t.completed,
          completedAt: t.completedAt,
        })),
      );

      const completedTasks = tasks.filter((task) => task.completed === true);
      console.log("[PROGRESS] Total completed tasks:", completedTasks.length);

      const completedToday = completedTasks.filter((task) => {
        if (!task.completedAt) return false;
        const completionDate =
          task.completedAt instanceof Date
            ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, "0")}-${String(task.completedAt.getDate()).padStart(2, "0")}`
            : task.completedAt.toString().split("T")[0];

        console.log(
          "[PROGRESS] Task:",
          task.title,
          "| Completed at:",
          task.completedAt,
          "| Completion date:",
          completionDate,
          "| Matches today?",
          completionDate === today,
        );
        return completionDate === today;
      }).length;

      console.log("[PROGRESS] Completed today:", completedToday);

      // Count all active tasks (not completed or completed today)
      const activeTasks = tasks.filter((task) => {
        if (!task.completed) return true;
        if (!task.completedAt) return false;
        const completionDate =
          task.completedAt instanceof Date
            ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, "0")}-${String(task.completedAt.getDate()).padStart(2, "0")}`
            : task.completedAt.toString().split("T")[0];
        return completionDate === today;
      });
      const totalToday = activeTasks.length;

      // Calculate categories
      const categoryMap = new Map<
        string,
        { completed: number; total: number }
      >();
      tasks.forEach((task) => {
        const existing = categoryMap.get(task.category) || {
          completed: 0,
          total: 0,
        };
        existing.total++;
        if (task.completed) existing.completed++;
        categoryMap.set(task.category, existing);
      });

      const categories = Array.from(categoryMap.entries()).map(
        ([name, stats]) => ({
          name,
          ...stats,
        }),
      );

      // Calculate actual consecutive day streak from task completions
      let weeklyStreak = 0;
      {
        const streakToday = new Date();
        streakToday.setHours(0, 0, 0, 0);
        const getDateStrForStreak = (d: Date | string | null): string | null => {
          if (!d) return null;
          if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return d.toString().split('T')[0];
        };
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(streakToday);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          const hasActivity = completedTasks.some((t: any) => getDateStrForStreak(t.completedAt) === dateStr);
          if (hasActivity) {
            weeklyStreak++;
          } else if (i > 0) {
            break;
          }
        }
      }

      const totalCompleted = completedTasks.length;
      const completionRate =
        tasks.length > 0
          ? Math.round((totalCompleted / tasks.length) * 100)
          : 0;

      // Generate lifestyle suggestions
      const recentCompletedTasks = completedTasks
        .slice(0, 10)
        .map((task: any) => task.title);

      const suggestions = await aiService.generateLifestyleSuggestions(
        recentCompletedTasks,
        categories,
        weeklyStreak,
      );

      res.json({
        completedToday,
        totalToday,
        weeklyStreak,
        totalCompleted,
        completionRate,
        categories,
        recentAchievements: [
          `${completedToday}-task day`,
          `${weeklyStreak}-day active`,
          "Consistency building",
          "Goal crusher",
        ],
        lifestyleSuggestions: suggestions,
      });
    } catch (error) {
      console.error("Progress data error:", error);
      res.status(500).json({ error: "Failed to fetch progress data" });
    }
  });

  // Get all badges with progress for user
  app.get("/api/achievements", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check and unlock any earned badges (retroactive)
      await checkAndUnlockBadges(storage, userId, 'achievements_view').catch((err) =>
        console.error("[ACHIEVEMENT] Badge check error on achievements view:", err),
      );

      const badgesWithProgress = await getBadgesWithProgress(storage, userId);

      // Separate unlocked and locked badges
      const unlocked = badgesWithProgress.filter(b => b.unlocked);
      const locked = badgesWithProgress.filter(b => !b.unlocked);

      // Sort unlocked by most recently earned
      unlocked.sort((a, b) => {
        if (!a.unlockedAt || !b.unlockedAt) return 0;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      });

      // Sort locked by closest to completion
      locked.sort((a, b) => {
        const aProgress = a.progress / a.progressMax;
        const bProgress = b.progress / b.progressMax;
        return bProgress - aProgress;
      });

      res.json({
        unlocked,
        locked,
        totalUnlocked: unlocked.length,
        totalBadges: Object.keys(BADGES).length,
      });
    } catch (error) {
      console.error("Achievements error:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Get comprehensive reports data (progress + activities + achievements)
  app.get("/api/reports", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all tasks
      const tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.userId, userId),
            or(eq(tasksTable.archived, false), isNull(tasksTable.archived)),
          ),
        );

      // Get all activities
      const userActivities = await storage.getUserActivities(userId);

      // Calculate today's date
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Tasks calculations
      const completedTasks = tasks.filter(t => t.completed === true);
      const completedToday = completedTasks.filter(t => {
        if (!t.completedAt) return false;
        const completionDate = t.completedAt instanceof Date
          ? `${t.completedAt.getFullYear()}-${String(t.completedAt.getMonth() + 1).padStart(2, "0")}-${String(t.completedAt.getDate()).padStart(2, "0")}`
          : t.completedAt.toString().split("T")[0];
        return completionDate === today;
      }).length;

      // Calculate actual streak from consecutive days
      const streakDays = await calculateActualStreak(userId);

      // Activity statistics - use the progress data already computed by getUserActivities
      // userActivities is of type ActivityWithProgress[] which includes totalTasks, completedTasks, progressPercent
      const completedActivities = userActivities.filter(a =>
        a.totalTasks > 0 && a.completedTasks === a.totalTasks
      );

      // Activity breakdown with task counts - use pre-computed progress
      const activityStats = userActivities.map(activity => ({
        id: activity.id,
        title: activity.title,
        category: activity.category,
        totalTasks: activity.totalTasks,
        completedTasks: activity.completedTasks,
        progress: activity.progressPercent,
        isComplete: activity.totalTasks > 0 && activity.completedTasks === activity.totalTasks,
        startDate: activity.startDate,
        createdAt: activity.createdAt,
      }));

      // Category breakdown
      const categoryMap = new Map<string, { completed: number; total: number }>();
      tasks.forEach(task => {
        const cat = task.category || 'Uncategorized';
        const existing = categoryMap.get(cat) || { completed: 0, total: 0 };
        existing.total++;
        if (task.completed) existing.completed++;
        categoryMap.set(cat, existing);
      });

      const categories = Array.from(categoryMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      }));

      // Check and unlock any earned badges (retroactive)
      await checkAndUnlockBadges(storage, userId, 'reports_view').catch((err) =>
        console.error("[ACHIEVEMENT] Badge check error on reports view:", err),
      );

      // Get achievements (after badge check so newly unlocked badges show)
      const badgesWithProgress = await getBadgesWithProgress(storage, userId);
      const unlockedBadges = badgesWithProgress.filter(b => b.unlocked);
      const lockedBadges = badgesWithProgress.filter(b => !b.unlocked);

      // Weekly summary (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const completedThisWeek = completedTasks.filter(t => {
        if (!t.completedAt) return false;
        const date = t.completedAt instanceof Date
          ? t.completedAt.toISOString().split('T')[0]
          : t.completedAt.toString().split('T')[0];
        return date >= weekAgoStr;
      }).length;

      res.json({
        // Overview
        summary: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          completedToday,
          completedThisWeek,
          totalActivities: userActivities.length,
          completedActivities: completedActivities.length,
          currentStreak: streakDays,
          completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        },
        // Category breakdown
        categories,
        // Activity-level stats
        activities: activityStats.sort((a, b) => {
          // Sort by most recent first
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        }),
        // Achievements
        achievements: {
          unlocked: unlockedBadges,
          locked: lockedBadges,
          totalUnlocked: unlockedBadges.length,
          totalBadges: Object.keys(BADGES).length,
          recentBadges: unlockedBadges.slice(0, 5),
        },
        // For widget sync
        widgetData: {
          streakCount: streakDays,
          completedToday,
          totalToday: tasks.filter(t => !t.completed).length + completedToday,
          totalCompleted: completedTasks.length,
          completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("Reports data error:", error);
      res.status(500).json({ error: "Failed to fetch reports data" });
    }
  });

  // Helper function to calculate actual consecutive day streak
  async function calculateActualStreak(userId: string): Promise<number> {
    try {
      // Get progress stats for last 100 days
      const progressHistory = await storage.getUserProgressHistory(userId, 100);

      if (progressHistory.length === 0) return 0;

      // Sort by date descending
      const sortedDays = progressHistory
        .filter(p => (p.completedCount || 0) > 0)
        .map(p => p.date)
        .sort()
        .reverse();

      if (sortedDays.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      let checkDate = new Date(today);

      // Start from today or yesterday
      const todayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

      // If no activity today, start checking from yesterday
      if (!sortedDays.includes(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Count consecutive days
      for (let i = 0; i < 100; i++) {
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

        if (sortedDays.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  }

  // Journal entry endpoints
  // NOTE: More specific routes MUST come before parameterized routes
  // This prevents /api/journal/:date from matching /api/journal/entries

  // Get all journal entries for the current user
  app.get("/api/journal/entries", async (req, res) => {
    try {
      // Disable caching to ensure fresh data
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const userId = getUserId(req) || DEMO_USER_ID;
      console.log("[JOURNAL] Fetching entries for user:", userId);

      let prefs = await storage.getPersonalJournalEntries(userId);
      console.log(
        "[JOURNAL] Retrieved preferences:",
        prefs ? "exists" : "null",
      );
      console.log(
        "[JOURNAL] JournalData exists:",
        prefs?.preferences?.journalData ? "yes" : "no",
      );

      if (!prefs || !prefs.preferences?.journalData) {
        console.log("[JOURNAL] No journal data found, returning empty array");
        return res.json({ entries: [] });
      }

      // Flatten all entries from all categories into a single array
      const journalData = prefs.preferences.journalData;
      const allEntries: any[] = [];

      console.log("[JOURNAL] Processing categories:", Object.keys(journalData));

      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          console.log(
            `[JOURNAL] Category "${category}" has ${entries.length} entries`,
          );
          entries.forEach((entry: any) => {
            allEntries.push({
              ...entry,
              category,
            });
          });
        }
      }

      // Sort by timestamp descending (newest first)
      allEntries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      console.log("[JOURNAL] Returning", allEntries.length, "total entries");
      console.log(
        "[JOURNAL] First entry sample:",
        allEntries[0]
          ? JSON.stringify(allEntries[0]).substring(0, 100)
          : "none",
      );

      // SYNCHRONOUS enrichment for authenticated users - fetch web data before returning
      // Skip demo users to save API costs
      const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
      const entriesToEnrich = isDemoUser(userId)
        ? []
        : allEntries
            .filter((entry: any) => {
              if (typeof entry === "string") return false;
              if (!entry.webEnrichment) return true;
              if (!entry.webEnrichment.enrichedAt) return true;
              const enrichedTime = new Date(
                entry.webEnrichment.enrichedAt,
              ).getTime();
              return Date.now() - enrichedTime > FIVE_HOURS_MS;
            })
            .slice(0, 5); // Limit to 5 for faster response

      let enrichedEntries = allEntries;

      if (entriesToEnrich.length > 0) {
        console.log(
          `[JOURNAL] SYNC enrichment for ${entriesToEnrich.length} entries`,
        );
        try {
          const entriesForService = entriesToEnrich.map((entry: any) => ({
            id: entry.id,
            text: entry.text || (typeof entry === "string" ? entry : ""),
            category: entry.category,
            venueName: entry.venueName,
            location: entry.location,
            existingEnrichment: entry.webEnrichment,
          }));

          const results =
            await journalWebEnrichmentService.enrichBatch(entriesForService);
          const enrichedCount = results.filter((r) => r.success).length;

          if (enrichedCount > 0) {
            console.log(
              `[JOURNAL SYNC ENRICH] Enriched ${enrichedCount} entries`,
            );

            // Update entries in memory for immediate response
            const enrichmentMap = new Map(
              results
                .filter((r) => r.success && r.enrichedData)
                .map((r) => [r.entryId, r.enrichedData]),
            );

            enrichedEntries = allEntries.map((entry: any) => {
              const enrichment = enrichmentMap.get(entry.id);
              if (enrichment) {
                return {
                  ...entry,
                  webEnrichment: enrichment,
                  venueType: enrichment.venueType || entry.venueType,
                };
              }
              return entry;
            });

            // Also persist to storage for future requests
            const freshPrefs = await storage.getUserPreferences(userId);
            const freshJournalData = freshPrefs?.preferences?.journalData || {};

            for (const result of results) {
              if (!result.success || !result.enrichedData) continue;

              for (const [cat, entries] of Object.entries(freshJournalData)) {
                if (!Array.isArray(entries)) continue;
                const entryIndex = entries.findIndex(
                  (e: any) => e.id === result.entryId,
                );

                if (entryIndex !== -1) {
                  entries[entryIndex] = {
                    ...entries[entryIndex],
                    webEnrichment: result.enrichedData,
                    venueType:
                      result.enrichedData.venueType ||
                      entries[entryIndex].venueType,
                  };
                  break;
                }
              }
            }

            await storage.upsertUserPreferences(userId, {
              preferences: {
                ...freshPrefs?.preferences,
                journalData: freshJournalData,
              },
            });
            console.log(`[JOURNAL SYNC ENRICH] Storage updated`);
          }
        } catch (error) {
          console.error("[JOURNAL SYNC ENRICH] Enrichment error:", error);
          // Continue with unenriched entries on error
        }
      }

      res.json({ entries: enrichedEntries });
    } catch (error) {
      console.error("[JOURNAL] Get journal entries error:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  // NOTE: The /api/journal/:date parameterized route is defined AFTER all specific routes
  // to prevent route matching issues. See end of journal features section.

  app.post("/api/journal", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // SECURITY: Block demo users from creating journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error:
            "Demo users cannot create journal entries. Please sign in to start journaling.",
          requiresAuth: true,
        });
      }

      const entryData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry({
        ...entryData,
        userId,
      });

      // Update streak for journaling activity
      onJournalEntryCreated(storage, entry, userId).catch((err) =>
        console.error("[NOTIFICATION] Journal entry created hook error:", err),
      );

      res.json(entry);
    } catch (error) {
      console.error("Create journal error:", error);
      res.status(400).json({ error: "Invalid journal data" });
    }
  });

  app.put("/api/journal/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // SECURITY: Block demo users from updating journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error:
            "Demo users cannot update journal entries. Please sign in to continue.",
          requiresAuth: true,
        });
      }

      const updates = req.body;
      const entry = await storage.updateJournalEntry(entryId, updates, userId);

      if (!entry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Update journal error:", error);
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  // ============================================
  // JOURNAL FEATURES - 5 New Features
  // ============================================

  // 1. One-Click Journal Prompts - Generate personalized prompts based on user activities
  app.post("/api/journal/generate-prompt", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get user's activities and tasks
      const activities = await storage.getUserActivities(userId);
      const tasks = await storage.getUserTasks(userId);

      // Get completed and uncompleted tasks
      const completedTasks = tasks.filter((t: any) => t.completed);
      const incompleteTasks = tasks.filter(
        (t: any) => !t.completed && !t.archived,
      );

      // Get recent journal entries for context
      const prefs = await storage.getPersonalJournalEntries(userId);
      const journalData = prefs?.preferences?.journalData || {};
      const recentEntries: string[] = [];

      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          entries.slice(-3).forEach((entry: any) => {
            if (typeof entry === "string") {
              recentEntries.push(entry);
            } else if (entry.text) {
              recentEntries.push(entry.text);
            }
          });
        }
      }

      // Build context for AI
      const context = {
        totalActivities: activities.length,
        completedTasksCount: completedTasks.length,
        incompleteTasksCount: incompleteTasks.length,
        recentCompletedTasks: completedTasks.slice(-5).map((t: any) => t.title),
        upcomingTasks: incompleteTasks.slice(0, 5).map((t: any) => t.title),
        activityCategories: [
          ...new Set(activities.map((a: any) => a.category)),
        ],
        recentJournalTopics: recentEntries.slice(-5),
      };

      // Generate personalized prompt using AI
      const systemPrompt = `You are a thoughtful journaling coach. Based on the user's activity data, generate ONE personalized journal prompt that helps them reflect on their progress, challenges, or feelings. The prompt should be:
- Personal and specific to their activities
- Thought-provoking but not overwhelming
- Encouraging self-reflection

User Context:
- Total activities: ${context.totalActivities}
- Tasks completed: ${context.completedTasksCount}
- Tasks pending: ${context.incompleteTasksCount}
- Recently completed: ${context.recentCompletedTasks.join(", ") || "None"}
- Upcoming tasks: ${context.upcomingTasks.join(", ") || "None"}
- Categories they work on: ${context.activityCategories.join(", ") || "Various"}
- Recent journal topics: ${context.recentJournalTopics.join(", ") || "New to journaling"}

Generate a single, thoughtful journal prompt (1-2 sentences). Just the prompt, no explanation.`;

      const { getProvider } = await import("./services/llmProvider");
      const provider = getProvider("openai");

      if (!provider) {
        // Fallback prompts if AI unavailable
        const fallbackPrompts = [
          `You've completed ${context.completedTasksCount} tasks recently. What's one thing you've learned about yourself through this progress?`,
          `Looking at your upcoming tasks, what excites you most? What feels challenging?`,
          `Reflect on your journey with ${context.activityCategories[0] || "your goals"}. How have you grown?`,
          `What's one small win you're proud of this week?`,
          `If you could give advice to yourself from last month, what would it be?`,
        ];
        return res.json({
          prompt:
            fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)],
          context: { type: "fallback" },
        });
      }

      const response = await provider.generateCompletion(
        systemPrompt,
        "Generate a personalized journal prompt.",
        { maxTokens: 150, temperature: 0.8 },
      );

      res.json({
        prompt: response.content.trim(),
        context: {
          completedTasks: context.completedTasksCount,
          pendingTasks: context.incompleteTasksCount,
          categories: context.activityCategories,
        },
      });
    } catch (error) {
      console.error("Generate prompt error:", error);
      res.status(500).json({ error: "Failed to generate prompt" });
    }
  });

  // 2. Themed Journal Packs - Curated prompt collections
  const themedJournalPacks = [
    {
      id: "gratitude",
      name: "Gratitude Practice",
      description:
        "Cultivate appreciation and positivity through daily gratitude reflection",
      icon: "heart",
      color: "from-pink-500 to-rose-500",
      prompts: [
        "What are three things you're grateful for today?",
        "Who made a positive impact on your life recently? How did they help?",
        "What small moment brought you joy this week?",
        "What ability or skill are you thankful to have?",
        "Describe a challenge that taught you something valuable.",
        "What part of your daily routine are you grateful for?",
        "Who is someone you've never thanked properly? What would you say?",
      ],
    },
    {
      id: "self-reflection",
      name: "Self-Reflection",
      description: "Deep dive into self-awareness and personal understanding",
      icon: "sparkles",
      color: "from-purple-500 to-indigo-500",
      prompts: [
        "What emotion did you feel most strongly today? Why?",
        "What would your ideal day look like?",
        "What belief about yourself would you like to change?",
        "When do you feel most like yourself?",
        "What are you avoiding right now? Why?",
        "Describe a moment when you felt truly proud of yourself.",
        "What does success mean to you personally?",
      ],
    },
    {
      id: "goal-setting",
      name: "Goal Setting & Planning",
      description: "Clarify your vision and create actionable steps forward",
      icon: "target",
      color: "from-emerald-500 to-teal-500",
      prompts: [
        "What's one goal you want to achieve in the next 30 days?",
        "What's holding you back from your biggest dream?",
        "If you could master one skill, what would it be and why?",
        "What does your life look like in 5 years?",
        "What small step can you take today toward a big goal?",
        "What goal have you been procrastinating on? What's the first action?",
        "How will you celebrate when you achieve your current goal?",
      ],
    },
    {
      id: "stress-relief",
      name: "Stress Relief & Calm",
      description: "Process difficult emotions and find inner peace",
      icon: "cloud",
      color: "from-sky-500 to-blue-500",
      prompts: [
        "What's weighing on your mind right now? Write it out.",
        "Describe a place where you feel completely at peace.",
        "What would you tell a friend who's feeling the way you are?",
        "What are three things within your control right now?",
        "What can you let go of today?",
        "Describe how your body feels right now. Where do you hold tension?",
        "What activity helps you feel grounded and calm?",
      ],
    },
    {
      id: "creativity",
      name: "Creative Exploration",
      description: "Unlock imagination and explore new ideas",
      icon: "palette",
      color: "from-orange-500 to-amber-500",
      prompts: [
        "If you could create anything without limitations, what would it be?",
        "Describe a dream you had recently in vivid detail.",
        "What inspires you most? Describe why.",
        'Write a short story starting with: "The door opened and..."',
        "If your life was a book, what would this chapter be titled?",
        "What creative project have you been wanting to start?",
        "Describe an ordinary object as if seeing it for the first time.",
      ],
    },
    {
      id: "relationships",
      name: "Relationships & Connection",
      description: "Strengthen bonds and reflect on meaningful connections",
      icon: "users",
      color: "from-violet-500 to-purple-500",
      prompts: [
        "Who do you want to spend more time with? Why?",
        "Describe your ideal friendship. What qualities matter most?",
        "What relationship in your life needs more attention?",
        "Write a thank you note to someone who influenced you.",
        "How do you show love to the people who matter most?",
        "What boundary do you need to set in a relationship?",
        "Describe a meaningful conversation you had recently.",
      ],
    },
  ];

  app.get("/api/journal/packs", async (req, res) => {
    try {
      res.json({ packs: themedJournalPacks });
    } catch (error) {
      console.error("Get journal packs error:", error);
      res.status(500).json({ error: "Failed to fetch journal packs" });
    }
  });

  app.get("/api/journal/packs/:packId", async (req, res) => {
    try {
      const { packId } = req.params;
      const pack = themedJournalPacks.find((p) => p.id === packId);

      if (!pack) {
        return res.status(404).json({ error: "Pack not found" });
      }

      res.json({ pack });
    } catch (error) {
      console.error("Get journal pack error:", error);
      res.status(500).json({ error: "Failed to fetch journal pack" });
    }
  });

  // 3. AI-Powered Journal Summaries - Analyze entries for themes and patterns
  app.post("/api/journal/summary", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all journal entries
      const prefs = await storage.getPersonalJournalEntries(userId);
      const journalData = prefs?.preferences?.journalData || {};

      // Collect all entries with timestamps
      const allEntries: {
        text: string;
        category: string;
        timestamp: string;
      }[] = [];

      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          entries.forEach((entry: any) => {
            const text = typeof entry === "string" ? entry : entry.text;
            const timestamp =
              typeof entry === "string"
                ? new Date().toISOString()
                : entry.timestamp;
            if (text) {
              allEntries.push({ text, category, timestamp });
            }
          });
        }
      }

      if (allEntries.length === 0) {
        return res.json({
          summary: {
            totalEntries: 0,
            themes: [],
            emotions: [],
            insights:
              "Start journaling to see insights about your thoughts and patterns!",
            recommendations: [
              "Try the Gratitude Pack to get started",
              "Use the Generate Prompt feature for inspiration",
            ],
          },
        });
      }

      // Sort by timestamp and get recent entries
      allEntries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const recentEntries = allEntries.slice(0, 20);

      // Build context for AI analysis
      const entriesText = recentEntries
        .map((e) => `[${e.category}]: ${e.text}`)
        .join("\n");

      const systemPrompt = `Analyze these journal entries and provide insights. Return a JSON object with:
- themes: array of 3-5 recurring themes (strings)
- emotions: array of detected emotions with frequency (e.g., [{emotion: "hopeful", count: 3}])
- insights: 2-3 sentence summary of patterns you notice
- recommendations: array of 2-3 actionable suggestions based on the entries

Journal entries:
${entriesText}

Return ONLY valid JSON, no markdown or explanation.`;

      const { getProvider } = await import("./services/llmProvider");
      const provider = getProvider("openai");

      if (!provider) {
        // Fallback analysis
        const categories = [...new Set(allEntries.map((e) => e.category))];
        return res.json({
          summary: {
            totalEntries: allEntries.length,
            themes: categories,
            emotions: [{ emotion: "reflective", count: allEntries.length }],
            insights: `You have ${allEntries.length} journal entries across ${categories.length} categories. Keep up the great journaling habit!`,
            recommendations: [
              "Continue your daily journaling practice",
              "Try exploring new categories",
            ],
          },
        });
      }

      const response = await provider.generateCompletion(
        systemPrompt,
        "Analyze these journal entries",
        { maxTokens: 500, temperature: 0.3 },
      );

      try {
        const analysis = JSON.parse(response.content);
        res.json({
          summary: {
            totalEntries: allEntries.length,
            ...analysis,
          },
        });
      } catch (parseError) {
        // If JSON parsing fails, return a basic analysis
        res.json({
          summary: {
            totalEntries: allEntries.length,
            themes: [...new Set(allEntries.map((e) => e.category))],
            emotions: [{ emotion: "reflective", count: allEntries.length }],
            insights: response.content.slice(0, 200),
            recommendations: [
              "Continue journaling regularly",
              "Explore different themed packs",
            ],
          },
        });
      }
    } catch (error) {
      console.error("Journal summary error:", error);
      res.status(500).json({ error: "Failed to generate journal summary" });
    }
  });

  // 4. Customizable Journal Templates - CRUD operations
  app.get("/api/journal/templates", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get user's custom templates
      const templates = await storage.getUserJournalTemplates(userId);

      // Add default templates
      const defaultTemplates = [
        {
          id: "default-morning",
          userId: null,
          name: "Morning Pages",
          description: "Start your day with intention and clarity",
          prompts: [
            "What are you grateful for this morning?",
            "What's your main intention for today?",
            "What might get in your way? How will you handle it?",
          ],
          isDefault: true,
          category: "morning",
          createdAt: new Date().toISOString(),
        },
        {
          id: "default-evening",
          userId: null,
          name: "Evening Reflection",
          description: "Wind down and reflect on your day",
          prompts: [
            "What went well today?",
            "What did you learn?",
            "What will you do differently tomorrow?",
          ],
          isDefault: true,
          category: "evening",
          createdAt: new Date().toISOString(),
        },
        {
          id: "default-weekly",
          userId: null,
          name: "Weekly Review",
          description: "Reflect on your week and plan ahead",
          prompts: [
            "What were your biggest wins this week?",
            "What challenges did you face? How did you handle them?",
            "What are your top 3 priorities for next week?",
            "What self-care did you practice?",
          ],
          isDefault: true,
          category: "weekly",
          createdAt: new Date().toISOString(),
        },
      ];

      res.json({ templates: [...defaultTemplates, ...templates] });
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/journal/templates", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      if (isDemoUser(userId)) {
        return res
          .status(403)
          .json({ error: "Demo users cannot create templates" });
      }

      const { name, description, prompts, category } = req.body;

      if (!name || !prompts || !Array.isArray(prompts)) {
        return res
          .status(400)
          .json({ error: "Name and prompts array are required" });
      }

      const template = await storage.createJournalTemplate({
        userId,
        name,
        description: description || "",
        prompts,
        category: category || "custom",
        isDefault: false,
      });

      res.json({ template });
    } catch (error) {
      console.error("Create template error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/journal/templates/:templateId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { templateId } = req.params;

      if (isDemoUser(userId)) {
        return res
          .status(403)
          .json({ error: "Demo users cannot update templates" });
      }

      const { name, description, prompts, category } = req.body;

      const template = await storage.updateJournalTemplate(templateId, userId, {
        name,
        description,
        prompts,
        category,
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ template });
    } catch (error) {
      console.error("Update template error:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/journal/templates/:templateId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { templateId } = req.params;

      if (isDemoUser(userId)) {
        return res
          .status(403)
          .json({ error: "Demo users cannot delete templates" });
      }

      await storage.deleteJournalTemplate(templateId, userId);

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Delete template error:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // 5. Journal Stats for Visualizations
  app.get("/api/journal/stats", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get journal entries
      const prefs = await storage.getPersonalJournalEntries(userId);
      const journalData = prefs?.preferences?.journalData || {};

      // Get tasks for completion data
      const tasks = await storage.getUserTasks(userId);
      const activities = await storage.getUserActivities(userId);

      // Calculate journal stats
      const entriesByCategory: Record<string, number> = {};
      const entriesByDate: Record<string, number> = {};
      let totalEntries = 0;

      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          entriesByCategory[category] = entries.length;
          totalEntries += entries.length;

          entries.forEach((entry: any) => {
            const timestamp =
              typeof entry === "string"
                ? new Date().toISOString()
                : entry.timestamp;
            const date = timestamp.split("T")[0];
            entriesByDate[date] = (entriesByDate[date] || 0) + 1;
          });
        }
      }

      // Calculate task completion stats
      const completedTasks = tasks.filter((t: any) => t.completed);
      const completionRate =
        tasks.length > 0
          ? Math.round((completedTasks.length / tasks.length) * 100)
          : 0;

      // Calculate activity progress
      const activityProgress = activities
        .map((a: any) => {
          const activityTasks = tasks.filter(
            (t: any) => t.activityId === a.id || t.goalId === a.id,
          );
          const completed = activityTasks.filter(
            (t: any) => t.completed,
          ).length;
          return {
            name: a.title,
            category: a.category,
            total: activityTasks.length,
            completed,
            progress:
              activityTasks.length > 0
                ? Math.round((completed / activityTasks.length) * 100)
                : 0,
          };
        })
        .filter((a) => a.total > 0);

      // Calculate journaling streak
      const dates = Object.keys(entriesByDate).sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().split("T")[0];

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split("T")[0];

        if (entriesByDate[dateStr]) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      // Prepare chart data (last 7 days)
      const last7Days: { date: string; entries: number; tasks: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayTasks = completedTasks.filter(
          (t: any) =>
            t.completedAt &&
            t.completedAt.toISOString().split("T")[0] === dateStr,
        );

        last7Days.push({
          date: dateStr,
          entries: entriesByDate[dateStr] || 0,
          tasks: dayTasks.length,
        });
      }

      res.json({
        stats: {
          totalEntries,
          totalCategories: Object.keys(entriesByCategory).length,
          journalingStreak: streak,
          completionRate,
          totalActivities: activities.length,
          completedTasks: completedTasks.length,
          pendingTasks: tasks.length - completedTasks.length,
        },
        charts: {
          entriesByCategory: Object.entries(entriesByCategory).map(
            ([name, value]) => ({ name, value }),
          ),
          activityProgress,
          last7Days,
        },
      });
    } catch (error) {
      console.error("Journal stats error:", error);
      res.status(500).json({ error: "Failed to fetch journal stats" });
    }
  });

  // IMPORTANT: This parameterized route MUST come AFTER all specific /api/journal/* routes
  // to prevent route matching issues (e.g., /api/journal/packs would match :date as "packs")
  app.get("/api/journal/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const entry = await storage.getUserJournalEntry(userId, date);
      res.json(entry || null);
    } catch (error) {
      console.error("Get journal error:", error);
      res.status(500).json({ error: "Failed to fetch journal entry" });
    }
  });

  // Chat Import routes
  app.post("/api/chat/import", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const data = insertChatImportSchema.parse(req.body);

      if (
        !data.chatHistory ||
        !Array.isArray(data.chatHistory) ||
        data.chatHistory.length === 0
      ) {
        return res
          .status(400)
          .json({
            error: "Chat history is required and must be a non-empty array",
          });
      }

      // Process the chat history to extract goals and tasks
      const chatProcessingResult = await aiService.processChatHistory(
        {
          source: data.source,
          conversationTitle: data.conversationTitle || "Imported Conversation",
          chatHistory: data.chatHistory as Array<{
            role: "user" | "assistant";
            content: string;
            timestamp?: string;
          }>,
        },
        userId,
      );

      // Create chat import record
      const chatImport = await storage.createChatImport({
        ...data,
        userId,
        extractedGoals: chatProcessingResult.extractedGoals,
      });

      // Create tasks from the chat processing
      const tasks = await Promise.all(
        chatProcessingResult.tasks.map((task) =>
          storage.createTask({
            ...task,
            userId,
          }),
        ),
      );

      res.json({
        chatImport,
        extractedGoals: chatProcessingResult.extractedGoals,
        tasks,
        summary: chatProcessingResult.summary,
        message: `Successfully imported chat and created ${tasks.length} accountability tasks!`,
      });
    } catch (error) {
      console.error("Chat import error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid chat data format", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import chat history" });
    }
  });

  app.get("/api/chat/imports", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const imports = await storage.getUserChatImports(userId);
      res.json(imports);
    } catch (error) {
      console.error("Get chat imports error:", error);
      res.status(500).json({ error: "Failed to fetch chat imports" });
    }
  });

  app.get("/api/chat/imports/:id", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const chatImport = await storage.getChatImport(req.params.id, userId);
      if (!chatImport) {
        return res.status(404).json({ error: "Chat import not found" });
      }
      res.json(chatImport);
    } catch (error) {
      console.error("Get chat import error:", error);
      res.status(500).json({ error: "Failed to fetch chat import" });
    }
  });

  // User Priorities
  app.get("/api/user/priorities", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const priorities = await storage.getUserPriorities(userId);
      res.json(priorities);
    } catch (error) {
      console.error("Get priorities error:", error);
      res.status(500).json({ error: "Failed to fetch priorities" });
    }
  });

  app.post("/api/user/priorities", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const data = insertPrioritySchema.parse(req.body);
      const priority = await storage.createPriority({
        ...data,
        userId: userId,
      });
      res.json(priority);
    } catch (error) {
      console.error("Create priority error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid priority data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create priority" });
    }
  });

  app.delete("/api/user/priorities/:id", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      await storage.deletePriority(req.params.id, userId);
      res.json({ message: "Priority deleted successfully" });
    } catch (error) {
      console.error("Delete priority error:", error);
      res.status(500).json({ error: "Failed to delete priority" });
    }
  });

  // Notification Preferences
  app.get("/api/notifications/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      let preferences = await storage.getUserNotificationPreferences(userId);

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId: userId,
          enableBrowserNotifications: true,
          enableTaskReminders: true,
          enableDeadlineWarnings: true,
          enableDailyPlanning: false,
          reminderLeadTime: 30,
          dailyPlanningTime: "09:00",
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.patch("/api/notifications/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const updates = insertNotificationPreferencesSchema
        .partial()
        .parse(req.body);
      const preferences = await storage.updateNotificationPreferences(
        userId,
        updates,
      );

      if (!preferences) {
        return res.status(404).json({ error: "Preferences not found" });
      }

      res.json({ success: true, preferences });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res
        .status(500)
        .json({ error: "Failed to update notification preferences" });
    }
  });

  // Mobile Preferences (haptics, biometrics, calendar sync, etc.)
  app.get("/api/mobile/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const preferences = await storage.getOrCreateMobilePreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching mobile preferences:", error);
      res.status(500).json({ error: "Failed to fetch mobile preferences" });
    }
  });

  app.patch("/api/mobile/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log(
        "[MOBILE_PREFS] PATCH request for user:",
        userId,
        "body:",
        JSON.stringify(req.body),
      );

      const updates = insertMobilePreferencesSchema.partial().parse(req.body);
      console.log("[MOBILE_PREFS] Parsed updates:", JSON.stringify(updates));

      // Ensure preferences exist first
      const existing = await storage.getOrCreateMobilePreferences(userId);
      console.log("[MOBILE_PREFS] Existing preferences found:", existing?.id);

      const preferences = await storage.updateMobilePreferences(
        userId,
        updates,
      );
      console.log(
        "[MOBILE_PREFS] Update result:",
        preferences ? "success" : "failed",
      );

      if (!preferences) {
        return res.status(404).json({ error: "Mobile preferences not found" });
      }

      res.json({ success: true, preferences });
    } catch (error: any) {
      console.error("[MOBILE_PREFS] Error updating mobile preferences:", error);
      console.error("[MOBILE_PREFS] Error name:", error?.name);
      console.error("[MOBILE_PREFS] Error message:", error?.message);
      console.error("[MOBILE_PREFS] Error stack:", error?.stack);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid preferences data", details: error.errors });
      }
      res
        .status(500)
        .json({
          error: "Failed to update mobile preferences",
          details: error?.message,
        });
    }
  });

  // Device Token Management (for push notifications)
  app.post("/api/notifications/register-device", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { token, platform, deviceInfo } = req.body;

      if (!token || !platform) {
        return res
          .status(400)
          .json({ error: "Token and platform are required" });
      }

      console.log(
        `[PUSH] Registering device token for user ${userId}, platform: ${platform}`,
      );

      const deviceToken = await storage.upsertDeviceToken(userId, {
        token,
        platform,
        deviceInfo,
      });

      res.json({
        success: true,
        message: "Device registered for push notifications",
        deviceId: deviceToken.id,
      });
    } catch (error) {
      console.error("Error registering device token:", error);
      res
        .status(500)
        .json({ error: "Failed to register device for push notifications" });
    }
  });

  app.post("/api/notifications/unregister-device", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      console.log(`[PUSH] Unregistering device token for user ${userId}`);

      await storage.deleteDeviceToken(token, userId);

      res.json({
        success: true,
        message: "Device unregistered from push notifications",
      });
    } catch (error) {
      console.error("Error unregistering device token:", error);
      res
        .status(500)
        .json({ error: "Failed to unregister device from push notifications" });
    }
  });

  app.get("/api/notifications/devices", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const devices = await storage.getUserDeviceTokens(userId);
      res.json({ devices });
    } catch (error) {
      console.error("Error fetching user devices:", error);
      res.status(500).json({ error: "Failed to fetch registered devices" });
    }
  });

  // Test notification endpoint - sends various notification types for testing
  app.post("/api/notifications/test", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { notificationType } = req.body;
      const { sendImmediateNotification } = await import('./services/smartNotificationScheduler');

      // Different notification types for testing with different haptics
      const notificationPresets: Record<string, {
        type: string;
        title: string;
        body: string;
        haptic: string;
        channel: string;
        route: string;
      }> = {
        activity_ready: {
          type: 'activity_ready',
          title: '✨ Top 10 Restaurants in Lagos',
          body: 'We turned your link into 10 actionable steps. Ready when you are!',
          haptic: 'celebration',
          channel: 'journalmate_activities',
          route: '/app?tab=activities',
        },
        streak_warning: {
          type: 'streak_at_risk',
          title: '🔥 7-day streak at risk!',
          body: 'Complete any task before midnight to keep it going',
          haptic: 'heavy',
          channel: 'journalmate_streaks',
          route: '/app?tab=tasks',
        },
        streak_milestone: {
          type: 'streak_milestone',
          title: '🏆 30 Day Streak!',
          body: 'A full month of consistency! You\'re unstoppable.',
          haptic: 'celebration',
          channel: 'journalmate_achievements',
          route: '/app?tab=tasks',
        },
        weekly_checkin: {
          type: 'weekly_checkin',
          title: '📊 Your Week in Review',
          body: 'Impressive! 15 tasks done and a 7-day streak. Keep the momentum going! 🔥',
          haptic: 'light',
          channel: 'journalmate_assistant',
          route: '/app?tab=goals',
        },
        monthly_review: {
          type: 'monthly_review',
          title: '📈 January Wrap-Up',
          body: 'What a month! 45 tasks completed, 8 plans made. You\'re crushing it! 🏆',
          haptic: 'medium',
          channel: 'journalmate_assistant',
          route: '/app?tab=goals',
        },
        task_reminder: {
          type: 'task_due_soon',
          title: '⏰ Task Due in 30 Minutes',
          body: 'Review quarterly report - deadline approaching!',
          haptic: 'medium',
          channel: 'journalmate_tasks',
          route: '/app?tab=tasks',
        },
        badge_unlocked: {
          type: 'badge_unlocked',
          title: '🎖️ Badge Unlocked!',
          body: 'You earned "Centurion" - Complete 100 tasks',
          haptic: 'celebration',
          channel: 'journalmate_achievements',
          route: '/app?tab=profile',
        },
        activity_tomorrow: {
          type: 'activity_one_day',
          title: '🎯 Lagos Food Tour is tomorrow!',
          body: 'Final checks time. Everything ready?',
          haptic: 'heavy',
          channel: 'journalmate_activities',
          route: '/app?tab=activities',
        },
        group_invite: {
          type: 'group_invite',
          title: '👥 Group Invite',
          body: 'Sarah invited you to join "Weekend Adventurers"',
          haptic: 'medium',
          channel: 'journalmate_groups',
          route: '/app?tab=groups',
        },
        default: {
          type: 'test_notification',
          title: '🔔 Push Notifications Working!',
          body: 'If you see this with haptic vibration, notifications are set up correctly!',
          haptic: 'medium',
          channel: 'journalmate_general',
          route: '/app',
        },
      };

      const preset = notificationPresets[notificationType || 'default'] || notificationPresets.default;

      console.log(`[PUSH] Sending ${notificationType || 'default'} test notification to user ${userId}`);

      await sendImmediateNotification(storage, userId.toString(), {
        type: preset.type,
        title: preset.title,
        body: preset.body,
        route: preset.route,
        haptic: preset.haptic,
        channel: preset.channel,
        sourceType: 'test',
        sourceId: `test-${Date.now()}`,
      });

      res.json({
        success: true,
        message: `${notificationType || 'default'} notification sent`,
        notificationType: notificationType || 'default',
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: error.message || "Failed to send test notification" });
    }
  });

  // Get available notification test types
  app.get("/api/notifications/test/types", async (_req: any, res) => {
    res.json({
      types: [
        { id: 'activity_ready', name: 'Activity Ready', haptic: 'celebration' },
        { id: 'streak_warning', name: 'Streak Warning', haptic: 'heavy' },
        { id: 'streak_milestone', name: 'Streak Milestone', haptic: 'celebration' },
        { id: 'weekly_checkin', name: 'Weekly Check-in', haptic: 'light' },
        { id: 'monthly_review', name: 'Monthly Review', haptic: 'medium' },
        { id: 'task_reminder', name: 'Task Reminder', haptic: 'medium' },
        { id: 'badge_unlocked', name: 'Badge Unlocked', haptic: 'celebration' },
        { id: 'activity_tomorrow', name: 'Activity Tomorrow', haptic: 'heavy' },
        { id: 'group_invite', name: 'Group Invite', haptic: 'medium' },
        { id: 'default', name: 'Default Test', haptic: 'medium' },
      ],
    });
  });

  // Firebase/FCM diagnostic endpoint - tests the full push notification pipeline
  app.get("/api/notifications/diagnose", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const diagnostics: {
        firebase: { initialized: boolean; error?: string };
        credentials: { projectId: boolean; clientEmail: boolean; privateKey: boolean };
        deviceTokens: { count: number; tokens: Array<{ platform: string; deviceName: string; isActive: boolean; createdAt: Date }> };
        preferences: { enabled: boolean; details?: any };
        testSend?: { success: boolean; sentCount?: number; failedCount?: number; errors?: string[] };
      } = {
        firebase: { initialized: false },
        credentials: { projectId: false, clientEmail: false, privateKey: false },
        deviceTokens: { count: 0, tokens: [] },
        preferences: { enabled: false },
      };

      // Check Firebase credentials availability
      diagnostics.credentials = {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      };

      // Check if all credentials are present
      const allCredentialsPresent = diagnostics.credentials.projectId &&
                                     diagnostics.credentials.clientEmail &&
                                     diagnostics.credentials.privateKey;

      // Try to initialize Firebase
      if (allCredentialsPresent) {
        try {
          const { initializePushNotifications } = await import('./services/pushNotificationService');
          const fcmApp = await initializePushNotifications();
          diagnostics.firebase.initialized = !!fcmApp;
          if (!fcmApp) {
            diagnostics.firebase.error = 'Firebase initialization returned null - check credentials format';
          }
        } catch (firebaseError: any) {
          diagnostics.firebase.error = firebaseError.message || 'Firebase initialization failed';
        }
      } else {
        diagnostics.firebase.error = 'Missing credentials: ' +
          [
            !diagnostics.credentials.projectId && 'FIREBASE_PROJECT_ID',
            !diagnostics.credentials.clientEmail && 'FIREBASE_CLIENT_EMAIL',
            !diagnostics.credentials.privateKey && 'FIREBASE_PRIVATE_KEY'
          ].filter(Boolean).join(', ');
      }

      // Get user's device tokens
      const devices = await storage.getUserDeviceTokens(userId);
      diagnostics.deviceTokens = {
        count: devices.length,
        tokens: devices.map((d: any) => ({
          platform: d.platform,
          deviceName: d.deviceName,
          isActive: d.isActive,
          createdAt: d.createdAt,
          // Show partial token for debugging (first 20 chars + length)
          tokenPreview: d.token ? `${d.token.substring(0, 20)}... (${d.token.length} chars)` : 'empty',
          // FCM tokens are typically 150+ chars, web push tokens are different
          looksLikeFCM: d.token && d.token.length > 100,
        })),
      };

      // Check notification preferences
      const prefs = await storage.getNotificationPreferences(userId);
      diagnostics.preferences = {
        enabled: prefs?.enableBrowserNotifications ?? false,
        details: prefs ? {
          taskReminders: prefs.enableTaskReminders,
          deadlineWarnings: prefs.enableDeadlineWarnings,
          groupNotifications: prefs.enableGroupNotifications,
          streakReminders: prefs.enableStreakReminders,
          accountabilityReminders: prefs.enableAccountabilityReminders,
          quietHours: `${prefs.quietHoursStart} - ${prefs.quietHoursEnd}`,
        } : null,
      };

      // Attempt a test send if Firebase is initialized and there are tokens
      if (diagnostics.firebase.initialized && devices.length > 0) {
        try {
          const { PushNotificationService } = await import('./services/pushNotificationService');
          const pushService = new PushNotificationService(storage);
          const result = await pushService.sendToUser(userId, {
            title: '🔬 FCM Diagnostic Test',
            body: 'This notification confirms Firebase Cloud Messaging is working!',
            data: { type: 'diagnostic', timestamp: new Date().toISOString() },
          });
          diagnostics.testSend = {
            success: result.success,
            sentCount: result.sentCount,
            failedCount: result.failedCount,
          };
        } catch (sendError: any) {
          diagnostics.testSend = {
            success: false,
            errors: [sendError.message || 'Unknown send error'],
          };
        }
      } else if (!diagnostics.firebase.initialized) {
        diagnostics.testSend = { success: false, errors: ['Firebase not initialized'] };
      } else if (devices.length === 0) {
        diagnostics.testSend = { success: false, errors: ['No device tokens registered for this user'] };
      }

      // Summary and recommendations
      const issues: string[] = [];
      if (!allCredentialsPresent) issues.push('Firebase credentials incomplete');
      if (!diagnostics.firebase.initialized) issues.push('Firebase SDK not initialized');
      if (devices.length === 0) issues.push('No device tokens - user needs to enable notifications in mobile app');
      if (!diagnostics.preferences.enabled) issues.push('User has notifications disabled in preferences');

      const recommendations: string[] = [];
      if (!allCredentialsPresent) recommendations.push('Add missing Firebase credentials to server environment');
      if (devices.length === 0) recommendations.push('Open the mobile app and enable push notifications in Settings');
      if (!diagnostics.preferences.enabled) recommendations.push('Enable notifications in app Settings > Notifications');
      if (diagnostics.testSend?.failedCount) recommendations.push('Some device tokens may be invalid and were cleaned up');

      res.json({
        success: issues.length === 0,
        diagnostics,
        issues,
        recommendations,
        summary: issues.length === 0
          ? 'FCM push notifications are fully operational!'
          : `Found ${issues.length} issue(s) preventing push notifications`,
      });
    } catch (error: any) {
      console.error("Error running notification diagnostics:", error);
      res.status(500).json({ error: error.message || "Diagnostics failed" });
    }
  });

  // Get user notifications
  app.get("/api/user/notifications", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const notifications = await storage.getUserNotifications(userId, limit);
      res.json({ notifications });
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch(
    "/api/user/notifications/:notificationId/read",
    async (req: any, res) => {
      try {
        const userId = getUserId(req) || DEMO_USER_ID;
        const { notificationId } = req.params;

        if (!notificationId) {
          return res.status(400).json({ error: "Notification ID is required" });
        }

        await storage.markNotificationRead(notificationId, userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: "Failed to mark notification as read" });
      }
    },
  );

  // Clear all read notifications
  app.delete("/api/user/notifications/clear-read", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      await storage.clearReadNotifications(userId);
      res.json({ success: true, message: "Read notifications cleared" });
    } catch (error) {
      console.error("Error clearing read notifications:", error);
      res.status(500).json({ error: "Failed to clear read notifications" });
    }
  });

  // NEW: Simple Plan Conversation Handler (replaces complex LangGraph)
  async function handleSimplePlanConversation(
    req: any,
    res: any,
    message: string,
    conversationHistory: any[],
    userId: string,
    mode: "quick" | "smart",
    location?: { latitude: number; longitude: number; city?: string },
  ) {
    try {
      console.log(
        `✨ [SIMPLE PLANNER - ${mode.toUpperCase()} MODE] Processing message for user ${userId}`,
      );
      console.log(
        `📝 [SIMPLE PLANNER] Message: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}}"`,
      );

      // CRITICAL: Always clear search cache at start to prevent stale data leaks
      // This is necessary even for continuing conversations in case frontend history is stale
      const { globalSearchCache } = await import(
        "./services/simpleConversationalPlanner"
      );
      const cacheStatsBefore = globalSearchCache.getStats();
      globalSearchCache.clear();
      if (cacheStatsBefore.size > 0) {
        console.log(
          `[SIMPLE PLAN] ✨ Cleared ${cacheStatsBefore.size} stale cache entries to prevent phantom data`,
        );
      }

      const isNewConversation =
        !conversationHistory || conversationHistory.length === 0;
      let session;

      if (isNewConversation) {
        // NEW CONVERSATION: Always start fresh with zero old data
        // Mark ALL user sessions as complete to prevent any data leakage
        console.log(
          `[SIMPLE PLAN] Marking ALL sessions as complete for clean slate`,
        );
        // Note: In a real scenario, you'd have a method to get all sessions for user
        // For now, we mark the active one
        const oldSession =
          await storage.getActiveLifestylePlannerSession(userId);
        if (oldSession) {
          await storage.updateLifestylePlannerSession(
            oldSession.id,
            {
              isComplete: true,
              sessionState: "completed",
              slots: {}, // CRITICAL: Clear slots
            },
            userId,
          );
          console.log(`[SIMPLE PLAN] Completed old session: ${oldSession.id}`);
        }

        // Create fresh new session with ZERO inherited state
        session = await storage.createLifestylePlannerSession({
          userId,
          sessionState: "gathering",
          slots: {},
          conversationHistory: [],
          externalContext: { currentMode: mode },
        });

        console.log(`[SIMPLE PLAN] Created brand new session: ${session.id}`);
      } else {
        // CONTINUING CONVERSATION: Use existing session or recreate if lost
        session = await storage.getActiveLifestylePlannerSession(userId);
        if (!session) {
          // Session lost - recreate with frontend's conversation history
          session = await storage.createLifestylePlannerSession({
            userId,
            sessionState: "gathering",
            slots: {},
            conversationHistory: conversationHistory,
            externalContext: { currentMode: mode },
          });
        }
      }

      // 🚨 CRITICAL FIX: Check confirmation BEFORE calling planner to avoid loop
      // If user is confirming plan, create activity immediately without calling planner again
      const lowerMsg = message.toLowerCase().trim();
      const hasAffirmative =
        /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good)\b/i.test(lowerMsg);
      const generatedPlan = session.slots?._generatedPlan;

      // DEBUG: Log confirmation check values
      console.log("🔍 [CONFIRMATION CHECK]", {
        awaitingPlanConfirmation:
          session.externalContext?.awaitingPlanConfirmation,
        hasAffirmative,
        hasGeneratedPlan: !!generatedPlan,
        userMessage: lowerMsg,
        sessionState: session.sessionState,
        externalContext: session.externalContext,
      });

      // Helper to safely parse dates from JSON-serialized plan data
      const parseDate = (value: any): Date | undefined => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === "string") {
          const parsed = new Date(value);
          return !isNaN(parsed.getTime()) ? parsed : undefined;
        }
        return undefined;
      };

      if (
        session.externalContext?.awaitingPlanConfirmation &&
        hasAffirmative &&
        generatedPlan
      ) {
        console.log(
          "✅ [CONFIRMATION DETECTED] Creating/updating activity from confirmed plan",
        );

        // Check if we're updating an existing activity (tracked in session)
        const existingActivityId = session.externalContext?.activityId;
        let activity;
        let isUpdate = false;

        // Normalize budget with null safety
        const planBudget = generatedPlan.budget || {
          total: 0,
          breakdown: [],
          buffer: 0,
        };
        const budgetTotal = planBudget.total || planBudget.estimated || 0;
        const budgetBreakdown = planBudget.breakdown || [];
        const budgetBuffer = planBudget.buffer || 0;

        if (existingActivityId) {
          // UPDATE existing activity
          console.log(
            `♻️ [ACTIVITY UPDATE] Updating existing activity: ${existingActivityId}`,
          );
          // Extract and parse dates from either nested activity or flat structure
          const updateStartDate = parseDate(
            generatedPlan.activity?.startDate || generatedPlan.startDate,
          );
          const updateEndDate = parseDate(
            generatedPlan.activity?.endDate || generatedPlan.endDate,
          );

          activity = await storage.updateActivity(
            existingActivityId,
            {
              title: generatedPlan.title || "Untitled Plan",
              description: generatedPlan.description || "",
              category:
                generatedPlan.domain || generatedPlan.category || "personal",
              status: "planning",
              budget: Math.round(budgetTotal * 100),
              budgetBreakdown: budgetBreakdown,
              budgetBuffer: Math.round(budgetBuffer * 100),
              startDate: updateStartDate || undefined,
              endDate: updateEndDate || undefined,
            },
            userId,
          );

          if (!activity) {
            // Activity was deleted or doesn't exist - create new one instead
            console.log(
              `⚠️ [ACTIVITY UPDATE] Activity ${existingActivityId} not found, creating new one`,
            );
            // Extract and parse dates from either nested activity or flat structure
            const activityStartDate = parseDate(
              generatedPlan.activity?.startDate || generatedPlan.startDate,
            );
            const activityEndDate = parseDate(
              generatedPlan.activity?.endDate || generatedPlan.endDate,
            );

            activity = await storage.createActivity({
              title: generatedPlan.title || "Untitled Plan",
              description: generatedPlan.description || "",
              category:
                generatedPlan.domain || generatedPlan.category || "personal",
              status: "planning",
              budget: Math.round(budgetTotal * 100),
              budgetBreakdown: budgetBreakdown,
              budgetBuffer: Math.round(budgetBuffer * 100),
              startDate: activityStartDate || undefined,
              endDate: activityEndDate || undefined,
              userId,
            });
          } else {
            isUpdate = true;
            // Delete old tasks before creating new ones
            const oldTasks = await storage.getActivityTasks(existingActivityId);
            for (const oldTask of oldTasks) {
              await storage.deleteTask(oldTask.id, userId);
            }
          }
        } else {
          // CREATE new activity
          console.log("✨ [ACTIVITY CREATE] Creating new activity");
          // Extract and parse dates from either nested activity or flat structure
          const activityStartDate = parseDate(
            generatedPlan.activity?.startDate || generatedPlan.startDate,
          );
          const activityEndDate = parseDate(
            generatedPlan.activity?.endDate || generatedPlan.endDate,
          );

          activity = await storage.createActivity({
            title: generatedPlan.title || "Untitled Plan",
            description: generatedPlan.description || "",
            category:
              generatedPlan.domain || generatedPlan.category || "personal",
            status: "planning",
            budget: Math.round(budgetTotal * 100),
            budgetBreakdown: budgetBreakdown,
            budgetBuffer: Math.round(budgetBuffer * 100),
            startDate: activityStartDate || undefined,
            endDate: activityEndDate || undefined,
            userId,
          });
        }

        // Create new tasks
        const createdTasks = [];
        if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
          for (let i = 0; i < generatedPlan.tasks.length; i++) {
            const taskData = generatedPlan.tasks[i];

            // Match budget breakdown to task category (with null safety)
            const budgetItem = generatedPlan.budget?.breakdown?.find(
              (item: any) => {
                const itemCategory = (
                  item.category ||
                  item.item ||
                  ""
                ).toLowerCase();
                const taskCategory = (taskData.category || "").toLowerCase();
                const taskName = (
                  taskData.taskName ||
                  taskData.title ||
                  ""
                ).toLowerCase();
                return (
                  itemCategory.includes(taskCategory) ||
                  taskName.includes(itemCategory)
                );
              },
            );

            // Build dueDate from scheduledDate and startTime if available
            // Use intelligent time extraction if startTime is missing
            let taskDueDateStr: string | undefined = undefined;
            if (taskData.scheduledDate) {
              // Get startTime from task data, or extract from description/title
              let effectiveStartTime = taskData.startTime;
              if (!effectiveStartTime) {
                // Try to extract time from task description or title
                const taskDescription = taskData.notes || taskData.description || "";
                const taskTitle = taskData.taskName || taskData.title || "";
                effectiveStartTime =
                  extractTimeFromDescription(taskDescription) ||
                  extractTimeFromDescription(taskTitle) ||
                  getSmartDefaultTime(i, generatedPlan.tasks.length);
              }
              taskDueDateStr = `${taskData.scheduledDate}T${effectiveStartTime}:00`;
            } else if (taskData.startDate) {
              // Fallback to startDate if scheduledDate not available
              taskDueDateStr = taskData.startDate;
            }
            // Convert string to Date object for database
            const taskDueDate = taskDueDateStr
              ? new Date(taskDueDateStr)
              : undefined;

            const task = await storage.createTask({
              title: taskData.taskName || taskData.title,
              description: taskData.notes || taskData.description || "",
              category: taskData.category || generatedPlan.domain || "personal",
              priority: taskData.priority || "medium",
              timeEstimate: `${taskData.duration || 30} min`,
              cost: budgetItem?.amount
                ? Math.round(budgetItem.amount * 100)
                : undefined,
              costNotes: budgetItem?.notes,
              dueDate: taskDueDate,
              userId,
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Schedule reminders if activity has a start date
        if (activity.startDate) {
          try {
            const reminderResult = await scheduleRemindersForActivity(
              storage,
              activity.id,
              userId,
            );
            console.log(
              `[CONFIRMATION] Scheduled ${reminderResult.created} reminders for activity ${activity.id}`,
            );
          } catch (reminderError) {
            console.error(
              "[CONFIRMATION] Failed to schedule reminders:",
              reminderError,
            );
          }
        }

        // Store activityId in session for future updates
        await storage.updateLifestylePlannerSession(
          session.id,
          {
            sessionState: "completed",
            isComplete: true,
            externalContext: {
              ...session.externalContext,
              activityId: activity.id, // Track for future updates
            },
          },
          userId,
        );

        // Use AI-provided emoji from the generated plan, fallback to 📝 if not provided
        const activityEmoji = generatedPlan.emoji || "[TARGET_ICON]";
        const activityUrl = `/app?activity=${activity.id}&tab=activities`;

        return res.json({
          message: formatActivitySuccessMessage(
            activity,
            activityEmoji,
            isUpdate,
          ),
          activityCreated: !isUpdate,
          activityUpdated: isUpdate,
          activity,
          activityId: activity.id,
          activityTitle: activity.title,
          taskCount: createdTasks.length,
          activityUrl,
          createdTasks,
          planComplete: true,
        });
      }

      // Fetch today's theme for user (if set)
      let todaysTheme: { themeId: string; themeName: string } | null = null;
      try {
        const preferences = await storage.getUserPreferences(userId);
        if (preferences?.preferences?.dailyTheme) {
          const today = new Date().toISOString().split("T")[0];
          if (preferences.preferences.dailyTheme.date === today) {
            const themeTitle = preferences.preferences.dailyTheme.activityTitle;
            // Map title to themeId
            const themeMapping: Record<string, string> = {
              "Work Focus": "work",
              Investment: "investment",
              Spiritual: "spiritual",
              Romance: "romance",
              Adventure: "adventure",
              "Health & Wellness": "wellness",
            };
            todaysTheme = {
              themeId: themeMapping[themeTitle] || "other",
              themeName: themeTitle,
            };
            console.log(`[SIMPLE PLAN] 🎯 Today's theme: ${themeTitle}`);
          }
        }
      } catch (err) {
        console.warn("[SIMPLE PLAN] Failed to fetch daily theme:", err);
      }

      // Process message with simple planner (Gemini with grounding by default)
      const plannerResponse = await simpleConversationalPlanner.processMessage(
        userId,
        message,
        session.conversationHistory || conversationHistory,
        storage,
        mode,
        {
          todaysTheme,
          userLocation: location, // Pass GPS for Gemini Maps grounding
        },
      );

      // Log what was extracted
      console.log(
        `🎯 [SIMPLE PLANNER] Extracted info:`,
        plannerResponse.extractedInfo,
      );
      console.log(
        `✅ [SIMPLE PLANNER] Ready to generate: ${plannerResponse.readyToGenerate}`,
      );

      // Update conversation history
      const updatedHistory = [
        ...(session.conversationHistory || []),
        { role: "user", content: message, timestamp: new Date().toISOString() },
        {
          role: "assistant",
          content: plannerResponse.message,
          timestamp: new Date().toISOString(),
        },
      ];

      // Update session
      await storage.updateLifestylePlannerSession(
        session.id,
        {
          conversationHistory: updatedHistory,
          slots: {
            ...session.slots,
            ...plannerResponse.extractedInfo,
            _generatedPlan:
              plannerResponse.plan || session.slots?._generatedPlan,
          },
          sessionState: plannerResponse.readyToGenerate
            ? "confirming"
            : "gathering",
          externalContext: {
            ...session.externalContext,
            currentMode: mode,
            awaitingPlanConfirmation: plannerResponse.readyToGenerate,
          },
        },
        userId,
      );

      // DEBUG: Log session update
      console.log("💾 [SESSION UPDATED]", {
        sessionId: session.id,
        readyToGenerate: plannerResponse.readyToGenerate,
        awaitingPlanConfirmation: plannerResponse.readyToGenerate,
        hasPlan: !!plannerResponse.plan,
        sessionState: plannerResponse.readyToGenerate
          ? "confirming"
          : "gathering",
      });

      // Check if planner just generated a new plan
      if (plannerResponse.readyToGenerate && plannerResponse.plan) {
        // VALIDATION: Check if plan has actual content (title, tasks, etc)
        const plan = plannerResponse.plan || {};
        const hasValidPlan = plan.title && plan.tasks?.length > 0;

        if (!hasValidPlan) {
          console.error("[SIMPLE PLAN] Plan missing required content:", {
            hasTitle: !!plan.title,
            taskCount: plan.tasks?.length || 0,
            plan: JSON.stringify(plan).substring(0, 200),
          });

          // Return error message instead of empty confirmation
          return res.json({
            message:
              "I apologize, but I encountered an issue generating your plan. Let me try again - could you tell me a bit more about what you're planning?",
            planGenerated: false,
            sessionId: session.id,
            conversationHistory: updatedHistory,
            conversationHints: [
              "Start over",
              "Add more details",
              "Try a different approach",
            ],
            error: "plan_generation_failed",
          });
        }

        // Check if AI already asked for confirmation (case-insensitive, flexible matching)
        const messageLower = plannerResponse.message.toLowerCase();
        const alreadyAskedConfirmation =
          messageLower.includes("are you comfortable") ||
          messageLower.includes("does this work") ||
          messageLower.includes("is this okay") ||
          messageLower.includes("sound good") ||
          /ready to (proceed|generate|create)/.test(messageLower);

        // Return plan with confirmation prompt (only if AI didn't already ask)
        return res.json({
          message: alreadyAskedConfirmation
            ? plannerResponse.message
            : `${plannerResponse.message}\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)`,
          planGenerated: true,
          plan: plannerResponse.plan,
          readyToGenerate: true,
          sessionId: session.id,
          conversationHistory: updatedHistory,
          conversationHints: plannerResponse.conversationHints || [
            "Yes, create it!",
            "Make some changes",
            "Start over",
          ],
        });
      }

      // Regular response (still gathering information) - include hints for user guidance
      return res.json({
        message: plannerResponse.message,
        planGenerated: false,
        sessionId: session.id,
        conversationHistory: updatedHistory,
        domain: plannerResponse.domain,
        questionCount: plannerResponse.questionCount,
        conversationHints: plannerResponse.conversationHints || [],
      });
    } catch (error) {
      console.error("[SIMPLE PLAN] Error:", error);
      return res.status(500).json({
        error: "Failed to process planning conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Helper function for Quick Plan structured conversation
  async function handleQuickPlanConversation(
    req: any,
    res: any,
    message: string,
    conversationHistory: any[],
    userId: string,
  ) {
    try {
      // Check if this is a new conversation (frontend has no conversation history)
      const isNewConversation =
        !conversationHistory || conversationHistory.length === 0;

      let session;
      let isFirstMessage;

      if (isNewConversation) {
        // New conversation - create fresh session and FULLY clear old one
        console.log(
          "[QUICK PLAN] NEW conversation detected - creating fresh session with CLEAN STATE",
        );

        const existingSession =
          await storage.getActiveLifestylePlannerSession(userId);
        if (existingSession) {
          console.log(
            "[QUICK PLAN] Completing old session:",
            existingSession.id,
            "with",
            (existingSession.conversationHistory || []).length,
            "messages",
          );
          console.log(
            "[QUICK PLAN] Old session slots being cleared:",
            Object.keys(existingSession.slots || {}),
          );
          await storage.updateLifestylePlannerSession(
            existingSession.id,
            {
              isComplete: true,
              sessionState: "completed",
              slots: {}, // CRITICAL: Clear slots to prevent phantom data inheritance
            },
            userId,
          );
        }

        // Create fresh new session for Quick Plan mode with EMPTY slots
        session = await storage.createLifestylePlannerSession({
          userId,
          sessionState: "intake",
          slots: {}, // Explicitly empty - no inheritance from previous sessions
          conversationHistory: [],
          externalContext: {
            currentMode: "quick",
            questionCount: { smart: 0, quick: 0 },
          },
        });

        console.log("[QUICK PLAN] Created fresh session:", session.id);
        isFirstMessage = true;
      } else {
        // Continuing existing conversation - get active session
        console.log(
          "[QUICK PLAN] CONTINUING conversation with",
          conversationHistory.length,
          "messages",
        );
        session = await storage.getActiveLifestylePlannerSession(userId);

        // VALIDATION: Prevent continuing completed sessions
        if (session && session.isComplete) {
          console.warn(
            "[QUICK PLAN] Cannot continue completed session:",
            session.id,
          );
          return res.status(400).json({
            error:
              "This conversation has already been completed. Please start a new session.",
            sessionCompleted: true,
          });
        }

        if (!session) {
          // CRITICAL FIX: If frontend has conversation history but backend has no active session,
          // it means the session was completed. Don't silently create a new one - tell frontend to reset.
          console.warn(
            "[QUICK PLAN] Frontend has history but backend has no active session - session was likely completed",
          );
          return res.status(400).json({
            error:
              "This conversation session is no longer available. Please start a new chat.",
            sessionCompleted: true,
            requiresReset: true,
          });
        }

        isFirstMessage = false;
      }

      // Get user profile for personalized questions
      const userProfile = await storage.getUserProfile(userId);

      // Check if user wants to generate/create the plan (natural language commands)
      // Accept: "yes", "generate plan", "create plan", "please generate", etc.
      const lowerMsg = message.toLowerCase().trim();
      const planConfirmed = session.externalContext?.planConfirmed;

      // Strip punctuation and normalize contractions
      const msgNormalized = lowerMsg
        .replace(/[!?.,:;]+/g, " ")
        .replace(/let'?s/g, "lets")
        .replace(/that'?s/g, "thats")
        .replace(/it'?s/g, "its")
        .replace(/\s+/g, " ")
        .trim();

      // Check for negations - but exclude positive idioms like "no problem", "no worries"
      const hasNegation =
        /\b(don'?t|not|stop|wait|hold|never|cancel|abort)\b/i.test(
          msgNormalized,
        ) ||
        (/\bno\b/.test(msgNormalized) &&
          !/\bno (problem|worries|issues?|concerns?)\b/i.test(msgNormalized));

      // Common affirmative patterns (flexible matching)
      const hasAffirmative =
        /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good|fine|alright|absolutely|definitely|sounds? good|that works|lets do|go ahead|proceed)\b/i.test(
          msgNormalized,
        );

      // Generate/create command patterns
      const hasGenerateCommand =
        /\b(generate|create|make)\b.*(plan|activity|it)\b/i.test(msgNormalized);

      const isGenerateCommand =
        !hasNegation && (hasAffirmative || hasGenerateCommand);

      if (planConfirmed && isGenerateCommand) {
        // User wants to create the activity - extract the generated plan
        const generatedPlan = session.slots?._generatedPlan;

        if (generatedPlan) {
          // Fetch backdrop image for the activity
          const quickTitle = generatedPlan.title || "Quick Plan Activity";
          const quickCategory = generatedPlan.category || "personal";
          const quickBackdropUrl = await getActivityImage(
            quickTitle,
            quickCategory,
          );

          // Create activity from the structured plan
          const activity = await storage.createActivity({
            title: quickTitle,
            description:
              generatedPlan.summary || "Generated from Quick Plan conversation",
            category: quickCategory,
            status: "planning",
            userId,
            backdrop: quickBackdropUrl,
          });

          // Create tasks and link them to the activity
          const createdTasks = [];
          if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
            for (let i = 0; i < generatedPlan.tasks.length; i++) {
              const taskData = generatedPlan.tasks[i];
              const task = await storage.createTask({
                title: taskData.title,
                description: taskData.description,
                category: taskData.category,
                priority: taskData.priority,
                timeEstimate: taskData.timeEstimate,
                userId,
              });
              await storage.addTaskToActivity(activity.id, task.id, i);
              createdTasks.push(task);
            }
          }

          // Send notification that activity is ready (works even when app is locked)
          onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, 'quick_plan')
            .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

          // Mark session as completed
          await storage.updateLifestylePlannerSession(
            session.id,
            {
              sessionState: "completed",
              isComplete: true,
              generatedPlan: { ...generatedPlan, tasks: createdTasks },
            },
            userId,
          );

          const updatedSession = await storage.getLifestylePlannerSession(
            session.id,
            userId,
          );

          // Get emoji from generated plan or use default
          const activityEmoji = generatedPlan.emoji || "[TARGET_ICON]";

          return res.json({
            message: formatActivitySuccessMessage(activity, activityEmoji),
            activityCreated: true,
            activityId: activity.id,
            activityTitle: activity.title,
            taskCount: createdTasks.length,
            backdropUrl: activity.backdrop,
            activity,
            planComplete: true,
            createdTasks,
            session: updatedSession,
          });
        }
      }

      // Check if we're awaiting plan confirmation (same as Smart Plan)
      const awaitingConfirmation =
        session.externalContext?.awaitingPlanConfirmation;

      if (awaitingConfirmation) {
        // User is responding to "Are you comfortable with this plan?"
        const affirmativePattern =
          /^(yes|yeah|yep|sure|ok|okay|looks good|perfect|great|sounds good|i'm comfortable|that works|let's do it)/i;
        const negativePattern =
          /^(no|nope|not really|not quite|i want to|i'd like to|can we|could we|change|add|modify)/i;

        if (affirmativePattern.test(message.trim())) {
          // User confirmed - create activity immediately!
          const generatedPlan = session.slots?._generatedPlan;

          if (generatedPlan) {
            // Fetch backdrop image for the activity
            const quickTitle2 = generatedPlan.title || "Quick Plan Activity";
            const quickCategory2 = generatedPlan.category || "personal";
            const quickBackdropUrl2 = await getActivityImage(
              quickTitle2,
              quickCategory2,
            );

            // Create activity from the structured plan
            const activity = await storage.createActivity({
              title: quickTitle2,
              description:
                generatedPlan.summary ||
                "Generated from Quick Plan conversation",
              category: quickCategory2,
              status: "planning",
              userId,
              backdrop: quickBackdropUrl2,
            });

            // Create tasks and link them to the activity
            const createdTasks = [];
            if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
              for (let i = 0; i < generatedPlan.tasks.length; i++) {
                const taskData = generatedPlan.tasks[i];
                const task = await storage.createTask({
                  title: taskData.title,
                  description: taskData.description,
                  category:
                    taskData.category ||
                    generatedPlan.domain ||
                    generatedPlan.category ||
                    "personal",
                  priority: taskData.priority,
                  timeEstimate: taskData.timeEstimate,
                  userId,
                });
                await storage.addTaskToActivity(activity.id, task.id, i);
                createdTasks.push(task);
              }
            }

            // Send notification that activity is ready (works even when app is locked)
            onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, 'quick_plan')
              .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

            // Mark session as completed
            await storage.updateLifestylePlannerSession(
              session.id,
              {
                sessionState: "completed",
                isComplete: true,
                generatedPlan: { ...generatedPlan, tasks: createdTasks },
              },
              userId,
            );

            const updatedSession = await storage.getLifestylePlannerSession(
              session.id,
              userId,
            );

            return res.json({
              message: `⚡ **Boom!** Activity "${activity.title}" created instantly!\n\n📋 **Find it on:**\n• **Home screen** - Your recent activities\n• **Activities pane** - Full details\n• **Tasks section** - ${createdTasks.length} tasks ready to go\n\nLet's make it happen! 🚀`,
              activityCreated: true,
              activityId: activity.id,
              activityTitle: activity.title,
              taskCount: createdTasks.length,
              backdropUrl: activity.backdrop,
              activity,
              planComplete: true,
              createdTasks,
              session: updatedSession,
            });
          }

          // Fallback if no plan data
          return res.json({
            message:
              "⚠️ Sorry, I couldn't find the plan data. Let's start over!",
            sessionId: session.id,
            session,
          });
        } else if (
          negativePattern.test(message.trim()) ||
          message.toLowerCase().includes("change") ||
          message.toLowerCase().includes("add")
        ) {
          // User wants to make changes - continue gathering info
          const updatedContext = {
            ...session.externalContext,
            awaitingPlanConfirmation: false,
            planConfirmed: false,
          };

          await storage.updateLifestylePlannerSession(
            session.id,
            {
              externalContext: updatedContext,
            },
            userId,
          );

          // Process their change request with LangGraph (same as Smart Plan)
          const langGraphResponse = await langGraphPlanningAgent.processMessage(
            parseInt(userId),
            message,
            userProfile,
            session.conversationHistory,
            storage,
            "quick",
          );

          // Update conversation history
          const updatedHistory = [
            ...session.conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: langGraphResponse.message },
          ];

          await storage.updateLifestylePlannerSession(
            session.id,
            {
              conversationHistory: updatedHistory,
              slots: {
                ...session.slots,
                _generatedPlan:
                  langGraphResponse.finalPlan || session.slots?._generatedPlan,
              },
            },
            userId,
          );

          return res.json({
            message: langGraphResponse.message,
            sessionId: session.id,
            planReady: langGraphResponse.readyToGenerate || false,
            session,
          });
        }
        // If unclear response, treat as wanting to make changes/continue conversation
      }

      // Check for help intent - same as Smart Plan
      const helpIntentPattern =
        /what.*do(es)?.*it.*do|how.*work|difference.*(quick|smart)|what.*is.*smart.*plan|what.*is.*quick.*plan|explain.*mode|help.*understand/i;
      if (helpIntentPattern.test(message)) {
        return res.json({
          message: `🤖 **Here's how I can help you plan:**

**🧠 Smart Plan Mode:**
• Conversational & thorough planning
• Asks detailed clarifying questions (max 5, often just 3)
• Tracks context with visual chips
• Perfect for complex activities (trips, events, work projects)
• Requires confirmation before creating your plan

**⚡ Quick Plan Mode:**
• Fast & direct suggestions
• Minimal questions (max 3 follow-ups)
• Great when you already know the details
• Immediate action for simple activities

**When to use each:**
• **Smart Plan**: When you want comprehensive planning with detailed conversation
• **Quick Plan**: When you need fast suggestions without extensive back-and-forth

Try saying "help me plan dinner" in either mode to see the difference! 😊`,
          sessionId: session.id,
          contextChips: [],
          planReady: false,
          helpProvided: true,
          session,
        });
      }

      // Check if user is confirming to create the plan
      const confirmationKeywords = [
        "yes",
        "create the plan",
        "sounds good",
        "perfect",
        "great",
        "that works",
        "confirm",
        "proceed",
      ];
      const userWantsToCreatePlan = confirmationKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword.toLowerCase()),
      );

      // If user is ready to create plan and confirms
      if (userWantsToCreatePlan && session.sessionState === "confirming") {
        // Create a basic plan structure for Quick Plan
        const planData = {
          title: `Quick Plan: ${session.slots?.activityType || "Activity"}`,
          summary: `Fast plan generated from Quick Plan mode`,
          category: "personal",
          tasks: [
            {
              title: `Start ${session.slots?.activityType || "activity"}`,
              description: "Quick action to get started",
              category: "action",
              priority: "high",
              timeEstimate: "15 min",
            },
            {
              title: `Complete ${session.slots?.activityType || "activity"}`,
              description: "Follow through and finish",
              category: "completion",
              priority: "high",
              timeEstimate: "30-60 min",
            },
          ],
        };

        // Fetch backdrop image for the activity
        const quickBackdropUrl3 = await getActivityImage(
          planData.title,
          planData.category,
        );

        // Create activity from the structured plan
        const activity = await storage.createActivity({
          title: planData.title,
          description: planData.summary,
          category: planData.category,
          status: "planning",
          userId,
          backdrop: quickBackdropUrl3,
        });

        // Create tasks and link them to the activity
        const createdTasks = [];
        for (let i = 0; i < planData.tasks.length; i++) {
          const taskData = planData.tasks[i];
          const task = await storage.createTask({
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            priority: taskData.priority as "low" | "medium" | "high",
            timeEstimate: taskData.timeEstimate,
            userId,
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
          createdTasks.push(task);
        }

        // Mark session as completed
        await storage.updateLifestylePlannerSession(
          session.id,
          {
            sessionState: "completed",
            isComplete: true,
            generatedPlan: { ...planData, tasks: createdTasks },
          },
          userId,
        );

        // Get updated session for consistent response shape
        const updatedSession = await storage.getLifestylePlannerSession(
          session.id,
          userId,
        );

        return res.json({
          message: `⚡ **Quick Plan Created!** Activity "${activity.title}" is ready!\n\n📋 **Find it in:**\n• **Home screen** - Your recent activities\n• **Activities section** - Full details and tasks\n\nAll set for immediate action! 🚀`,
          activityCreated: true,
          activityId: activity.id,
          activityTitle: activity.title,
          taskCount: createdTasks.length,
          backdropUrl: activity.backdrop,
          activity,
          planComplete: true,
          createdTasks,
          session: updatedSession,
        });
      }

      // Detect "show overview" type requests when plan is already ready
      const quickAwaitingConfirmationPre =
        session.externalContext?.awaitingPlanConfirmation;
      const showOverviewKeywords = [
        "show.*overview",
        "see.*overview",
        "display.*plan",
        "view.*plan",
        "show.*plan",
        "what.*plan",
        "plan details",
      ];
      const isShowOverviewRequest =
        quickAwaitingConfirmationPre &&
        showOverviewKeywords.some((pattern) =>
          new RegExp(pattern, "i").test(message),
        );

      let response;

      if (isShowOverviewRequest && session.slots?._generatedPlan) {
        // User wants to see the overview - return existing plan WITHOUT re-processing
        console.log(
          "[QUICK PLAN] Show overview request detected - returning existing plan without state reset",
        );

        const existingPlan = session.slots._generatedPlan;

        // Format the plan overview message (extract from existing plan data)
        const overviewMessage =
          existingPlan.message || `Here's your ${existingPlan.title || "plan"}`;

        response = {
          message: overviewMessage,
          readyToGenerate: true, // KEEP state as ready
          planReady: true,
          updatedSlots: session.slots,
          updatedConversationHistory: [
            ...session.conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: overviewMessage },
          ],
          updatedExternalContext: {
            ...session.externalContext,
            awaitingPlanConfirmation: true, // MAINTAIN confirmation state
          },
          sessionState: "confirming" as const, // KEEP in confirming state
          generatedPlan: existingPlan,
          createActivity: false,
          progress: 100,
          phase: "confirming",
          domain: existingPlan.domain || "general",
          skipConfirmationAppend: true, // Don't append redundant confirmation prompt
        };
      } else {
        // Normal flow - process with LangGraph planning agent
        const langGraphResponse = await langGraphPlanningAgent.processMessage(
          parseInt(userId),
          message,
          userProfile,
          session.conversationHistory,
          storage,
          "quick", // Quick mode for faster planning
        );

        // Map LangGraph response to ConversationResponse format
        response = {
          message: langGraphResponse.message,
          readyToGenerate: langGraphResponse.readyToGenerate || false,
          planReady: langGraphResponse.readyToGenerate || false,
          updatedSlots: session.slots,
          updatedConversationHistory: [
            ...session.conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: langGraphResponse.message },
          ],
          updatedExternalContext: session.externalContext,
          sessionState: langGraphResponse.phase as
            | "gathering"
            | "processing"
            | "confirming"
            | "completed",
          generatedPlan: langGraphResponse.finalPlan,
          createActivity: false,
          progress: langGraphResponse.progress,
          phase: langGraphResponse.phase,
          domain: langGraphResponse.domain,
        };
      }

      // SERVER-SIDE ACTIVITY TYPE DETECTION OVERRIDE (same as Smart Plan)
      const interviewKeywords = [
        "interview",
        "job interview",
        "interview prep",
        "prepare for.*interview",
        "interviewing",
      ];
      const learningKeywords = [
        "study",
        "learn",
        "course",
        "education",
        "prep for exam",
        "test prep",
      ];
      const workoutKeywords = [
        "workout",
        "exercise",
        "gym",
        "fitness",
        "training session",
      ];
      const wellnessKeywords = [
        "meditation",
        "yoga",
        "mindfulness",
        "breathing exercise",
      ];

      const messageLower = message.toLowerCase();
      const hasInterviewKeyword = interviewKeywords.some((kw) =>
        new RegExp(kw, "i").test(messageLower),
      );
      const hasLearningKeyword = learningKeywords.some((kw) =>
        new RegExp(kw, "i").test(messageLower),
      );
      const hasWorkoutKeyword = workoutKeywords.some((kw) =>
        new RegExp(kw, "i").test(messageLower),
      );
      const hasWellnessKeyword = wellnessKeywords.some((kw) =>
        new RegExp(kw, "i").test(messageLower),
      );

      const goalPhraseMatch = messageLower.match(
        /(?:the )?goal (?:is|was) to (?:pass|prepare for|get ready for|ace|nail|do well in|succeed in).*?(?:interview|study|learn|workout|meditate)/i,
      );

      if (response.updatedSlots) {
        const currentActivityType =
          response.updatedSlots.activityType?.toLowerCase() || "";

        if (
          hasInterviewKeyword ||
          (goalPhraseMatch && goalPhraseMatch[0].includes("interview"))
        ) {
          if (
            currentActivityType !== "interview_prep" &&
            currentActivityType !== "interview"
          ) {
            console.log(
              `[QUICK PLAN OVERRIDE] Detected interview keywords. Overriding to "interview_prep".`,
            );
            response.updatedSlots.activityType = "interview_prep";
          }
        } else if (hasLearningKeyword && currentActivityType !== "learning") {
          console.log(
            `[QUICK PLAN OVERRIDE] Detected learning keywords. Overriding to "learning".`,
          );
          response.updatedSlots.activityType = "learning";
        } else if (hasWorkoutKeyword && currentActivityType !== "workout") {
          console.log(
            `[QUICK PLAN OVERRIDE] Detected workout keywords. Overriding to "workout".`,
          );
          response.updatedSlots.activityType = "workout";
        } else if (hasWellnessKeyword && currentActivityType !== "wellness") {
          console.log(
            `[QUICK PLAN OVERRIDE] Detected wellness keywords. Overriding to "wellness".`,
          );
          response.updatedSlots.activityType = "wellness";
        }
      }

      // Backend guardrail: NEVER generate plan on first interaction
      if (isFirstMessage && (response.readyToGenerate || response.planReady)) {
        console.warn(
          "Attempted to generate plan on first message - blocking and forcing question",
        );
        response.readyToGenerate = false;
        response.planReady = false;
      }

      // Check if plan is ready for confirmation
      const quickPlanConfirmed = session.externalContext?.planConfirmed;
      const quickAwaitingConfirmation =
        session.externalContext?.awaitingPlanConfirmation;
      const isFirstPlanReady =
        (response.readyToGenerate || response.planReady) &&
        !quickAwaitingConfirmation;

      // Persist updated session data from agent (includes full conversation history and generated plan)
      await storage.updateLifestylePlannerSession(
        session.id,
        {
          conversationHistory:
            response.updatedConversationHistory || session.conversationHistory,
          slots: {
            ...(response.updatedSlots || session.slots),
            _generatedPlan:
              response.generatedPlan || session.slots?._generatedPlan,
          },
          externalContext: {
            ...(response.updatedExternalContext || session.externalContext),
            isFirstInteraction: false,
            // Set confirmation flags if plan is ready for first time
            ...(isFirstPlanReady
              ? { awaitingPlanConfirmation: true, planConfirmed: false }
              : {}),
          },
          sessionState: isFirstPlanReady ? "confirming" : response.sessionState,
        },
        userId,
      );

      // Handle plan confirmation flow
      if (response.readyToGenerate || response.planReady) {
        if (quickPlanConfirmed) {
          // Plan already confirmed - show Generate Plan button immediately
          return res.json({
            message: response.message,
            planReady: true,
            sessionId: session.id,
            showCreatePlanButton: true,
            session,
          });
        } else if (!quickAwaitingConfirmation) {
          // Check if AI already asked for confirmation (case-insensitive, flexible matching)
          const messageLower = response.message.toLowerCase();
          const alreadyAskedConfirmation =
            messageLower.includes("are you comfortable") ||
            messageLower.includes("does this work") ||
            messageLower.includes("is this okay") ||
            messageLower.includes("sound good") ||
            /ready to (proceed|generate|create)/.test(messageLower);

          // Skip confirmation append if this is a "show overview" replay
          const shouldSkipAppend =
            (response as any).skipConfirmationAppend === true;

          // First time plan is ready - ask for confirmation (only if AI didn't already ask and not a replay)
          return res.json({
            message:
              alreadyAskedConfirmation || shouldSkipAppend
                ? response.message
                : response.message +
                  "\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)",
            planReady: false, // Don't show button yet
            sessionId: session.id,
            showCreatePlanButton: false, // Don't show button until confirmed
            session,
          });
        }
        // If awaitingConfirmation is true but not confirmed yet, fall through to normal response
      }

      // Return conversational response
      return res.json({
        message: response.message,
        sessionId: session.id,
        contextChips: response.contextChips || [],
        planReady: response.planReady || false,
        createdActivity: response.createdActivity
          ? {
              id: response.createdActivity.id,
              title: response.createdActivity.title,
            }
          : undefined,
        progress: response.progress || 0,
        phase: response.phase || "gathering",
        domain: response.domain || "general",
        session,
      });
    } catch (error) {
      console.error("Quick Plan conversation error:", error);
      return res.status(500).json({
        error: "Failed to process Quick Plan conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // STREAMING endpoint for real-time progress updates
  app.post("/api/chat/conversation/stream", async (req, res) => {
    try {
      const { message, conversationHistory = [], mode, sessionId } = req.body;

      if (!message || typeof message !== "string") {
        return res
          .status(400)
          .json({ error: "Message is required and must be a string" });
      }

      const userId = (req.user as any)?.id || DEMO_USER_ID;

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        // Send initial progress
        sendEvent("progress", {
          phase: "starting",
          message: "Analyzing your request...",
        });

        if (mode === "smart" || mode === "quick") {
          // Get the session by ID if provided, otherwise get the latest session
          let session = sessionId
            ? await storage.getLifestylePlannerSession(sessionId, userId)
            : (await storage.getLifestylePlannerSessions(userId, 1))[0];

          // Check BOTH locations for stored plan (slots._generatedPlan OR externalContext.generatedPlan)
          const storedPlan =
            session?.slots?._generatedPlan ||
            session?.externalContext?.generatedPlan;
          const awaitingConfirmation =
            session?.externalContext?.awaitingPlanConfirmation;

          // Store the plan preview content from the last assistant message for confirmation display
          const lastAssistantMessage =
            session?.conversationHistory
              ?.slice()
              .reverse()
              .find((msg: any) => msg.role === "assistant")?.content || "";

          console.log(
            `[STREAM] Session lookup: sessionId=${sessionId}, found=${!!session}, storedPlan=${!!storedPlan}, awaitingConfirmation=${awaitingConfirmation}`,
          );

          // Stream tokens as they arrive
          const response = await simplePlanner.processMessageStream(
            userId,
            message,
            conversationHistory,
            storage,
            mode === "smart" ? "smart" : "quick",
            (token) => {
              // Stream each token to client
              sendEvent("token", { token });
            },
            (phase, msg) => {
              // Stream progress updates during research
              sendEvent("progress", { phase, message: msg });
            },
          );

          // Check if user confirmed the plan (same logic as non-streaming)
          const confirmationKeywords = [
            "yes",
            "create the plan",
            "sounds good",
            "perfect",
            "great",
            "that works",
            "confirm",
            "proceed",
            "go ahead",
            "yes go ahead",
            "ok",
            "okay",
          ];
          const userConfirmed = confirmationKeywords.some((keyword) =>
            message.toLowerCase().includes(keyword.toLowerCase()),
          );

          let activityData: any = null;

          // Use stored plan from session if available, otherwise use current response plan
          const planToUse = response.plan || storedPlan;
          const shouldCreateActivity =
            (response.readyToGenerate && planToUse && userConfirmed) ||
            (awaitingConfirmation && storedPlan && userConfirmed);

          // If plan is ready and user confirmed, create activity/tasks
          if (shouldCreateActivity && planToUse) {
            try {
              sendEvent("progress", {
                phase: "creating",
                message: "Creating your activity and tasks...",
              });

              // Check plan usage limits
              const usageCheck = await checkAndIncrementPlanUsage(userId);
              if (!usageCheck.allowed) {
                sendEvent("complete", {
                  message: `⚠️ **Plan Limit Reached**\n\nYou've used all ${usageCheck.planLimit} AI plans for this month on the free tier.\n\n**Upgrade to Pro ($6.99/month) for:**\n✅ **Unlimited AI plans**\n✅ Advanced favorites organization\n✅ Journal insights & analytics\n✅ Export all your data\n\nWould you like to upgrade now?`,
                  planLimitReached: true,
                  planCount: usageCheck.planCount,
                  planLimit: usageCheck.planLimit,
                });
                res.end();
                return;
              }

              // Fetch backdrop image for the activity
              const streamTitle =
                planToUse.title ||
                `${mode === "quick" ? "Quick" : "Smart"} Plan Activity`;
              const streamCategory =
                planToUse.category || planToUse.domain || "personal";
              const streamBackdropUrl = await getActivityImage(
                streamTitle,
                streamCategory,
              );

              // Extract dates from plan (could be nested or flat structure)
              const streamStartDate =
                planToUse.activity?.startDate || planToUse.startDate;
              const streamEndDate =
                planToUse.activity?.endDate || planToUse.endDate;

              // Create activity from the structured plan (use planToUse which may be from session)
              const activity = await storage.createActivity({
                title: streamTitle,
                description:
                  planToUse.summary ||
                  planToUse.description ||
                  "Generated plan",
                category: streamCategory,
                status: "planning",
                userId,
                backdrop: streamBackdropUrl,
                startDate: streamStartDate || undefined,
                endDate: streamEndDate || undefined,
              });

              // Create tasks and link them to the activity
              const createdTasks = [];
              if (planToUse.tasks && Array.isArray(planToUse.tasks)) {
                for (let i = 0; i < planToUse.tasks.length; i++) {
                  const taskData = planToUse.tasks[i];

                  // Build dueDate from scheduledDate and startTime if available
                  // Use intelligent time extraction if startTime is missing
                  let streamTaskDueDateStr: string | undefined = undefined;
                  if (taskData.scheduledDate) {
                    // Get startTime from task data, or extract from description/title
                    let effectiveStartTime = taskData.startTime;
                    if (!effectiveStartTime) {
                      const taskDescription = taskData.description || taskData.notes || "";
                      const taskTitle = taskData.title || taskData.taskName || "";
                      effectiveStartTime =
                        extractTimeFromDescription(taskDescription) ||
                        extractTimeFromDescription(taskTitle) ||
                        getSmartDefaultTime(i, planToUse.tasks.length);
                    }
                    streamTaskDueDateStr = `${taskData.scheduledDate}T${effectiveStartTime}:00`;
                  } else if (taskData.startDate) {
                    streamTaskDueDateStr = taskData.startDate;
                  }
                  // Convert string to Date object for database
                  const streamTaskDueDate = streamTaskDueDateStr
                    ? new Date(streamTaskDueDateStr)
                    : undefined;

                  const task = await storage.createTask({
                    title: taskData.title || taskData.taskName,
                    description: taskData.description || taskData.notes || "",
                    category:
                      taskData.category || planToUse.domain || "personal",
                    priority: taskData.priority || "medium",
                    timeEstimate:
                      taskData.timeEstimate || `${taskData.duration || 30} min`,
                    dueDate: streamTaskDueDate,
                    userId,
                  });
                  await storage.addTaskToActivity(activity.id, task.id, i);
                  createdTasks.push(task);
                }
              }

              // Schedule reminders if activity has a start date
              if (activity.startDate) {
                try {
                  const reminderResult = await scheduleRemindersForActivity(
                    storage,
                    activity.id,
                    userId,
                  );
                  console.log(
                    `[STREAM] Scheduled ${reminderResult.created} reminders for activity ${activity.id}`,
                  );
                } catch (reminderError) {
                  console.error(
                    "[STREAM] Failed to schedule reminders:",
                    reminderError,
                  );
                }
              }

              // Send notification that activity is ready (works even when app is locked)
              onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, mode === 'quick' ? 'quick_plan' : 'smart_plan')
                .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

              // Mark session as complete
              if (session?.id) {
                await storage.updateLifestylePlannerSession(
                  session.id,
                  {
                    sessionState: "completed",
                    isComplete: true,
                    externalContext: {
                      ...session.externalContext,
                      awaitingPlanConfirmation: false,
                      activityId: activity.id,
                    },
                  },
                  userId,
                );
              }

              activityData = {
                activityCreated: true,
                activityId: activity.id,
                activityTitle: activity.title,
                taskCount: createdTasks.length,
                backdropUrl: activity.backdrop,
                activity: {
                  id: activity.id,
                  title: activity.title,
                  backdrop: activity.backdrop,
                },
                createdTasks,
              };

              console.log(
                `[STREAM] Activity created: ${activity.id} with ${createdTasks.length} tasks`,
              );
            } catch (error) {
              console.error("[STREAM] Error creating activity:", error);
            }
          }

          // Send final complete message with structured data
          // Get updated session if activity was created
          const updatedSession = activityData
            ? await storage.getLifestylePlannerSession(
                session?.id || "",
                userId,
              )
            : session;

          // Build the final message
          // - If activity was created, show success message with clickable link
          // - If response.message is empty/generic but we have stored plan content, use that
          // - Otherwise use response.message
          let finalMessage = response.message;
          if (activityData && activityData.activity) {
            const activityEmoji =
              response.plan?.emoji || planToUse?.emoji || "[TARGET_ICON]";
            finalMessage = formatActivitySuccessMessage(
              activityData.activity,
              activityEmoji,
            );
          } else if (
            (!finalMessage || finalMessage.length < 100) &&
            lastAssistantMessage &&
            lastAssistantMessage.length > 200
          ) {
            // If current response is too short but we have the previous plan preview, use it
            finalMessage = lastAssistantMessage;
          }

          sendEvent("complete", {
            message: finalMessage,
            extractedInfo: response.extractedInfo,
            readyToGenerate: response.readyToGenerate || !!activityData,
            plan: response.plan || planToUse,
            domain: response.domain,
            contextChips: response.contextChips,
            session: updatedSession,
            conversationHints: activityData ? [] : response.conversationHints, // No hints after activity created
            ...activityData, // Include activity data if created
          });
          res.end();
        } else {
          sendEvent("error", { message: "Invalid mode" });
          res.end();
        }
      } catch (error) {
        sendEvent("error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        res.end();
      }
    } catch (error) {
      res.status(500).json({ error: "Streaming failed" });
    }
  });

  // Real-time chat conversation endpoint with task creation
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const { message, conversationHistory = [], mode } = req.body;

      if (!message || typeof message !== "string") {
        return res
          .status(400)
          .json({ error: "Message is required and must be a string" });
      }

      // Get user ID (demo for now, will use real auth later)
      const userId = (req.user as any)?.id || DEMO_USER_ID;

      // Handle Smart Plan mode with simple planner
      if (mode === "smart") {
        return await handleSimplePlanConversation(
          req,
          res,
          message,
          conversationHistory,
          userId,
          "smart",
        );
      }

      // Handle Quick Plan mode with simple planner
      if (mode === "quick") {
        return await handleSimplePlanConversation(
          req,
          res,
          message,
          conversationHistory,
          userId,
          "quick",
        );
      }

      // Create a conversation with the AI (pass userId for personalization)
      const aiResponse = await aiService.chatConversation(
        message,
        conversationHistory,
        userId,
      );

      // Check if the message contains goals that we should turn into actionable tasks
      const containsGoals = aiService.detectGoalsInMessage(message);

      let createdTasks = [];
      let createdGoal = null;
      let taskCreationMessage = "";

      if (containsGoals) {
        try {
          // Process the message as a goal and create actual tasks
          const goalResult = await aiService.processGoalIntoTasks(
            message,
            "openai",
            userId,
          );

          // Create a goal record for this chat-based goal
          createdGoal = await storage.createGoal({
            userId: userId,
            title: message.substring(0, 100), // Truncate if too long
            description: `Chat-generated goal: ${message}`,
            category: goalResult.goalCategory,
            priority: goalResult.goalPriority,
          });

          // Trigger goal notification hook if goal has a deadline
          if (createdGoal.deadline) {
            onGoalCreated(storage, createdGoal, userId).catch((err) =>
              console.error("[NOTIFICATION] Goal created hook error:", err),
            );
          }

          // Create the tasks in the database
          createdTasks = await Promise.all(
            goalResult.tasks.map((task) =>
              storage.createTask({
                ...task,
                userId: userId,
                goalId: createdGoal.id,
              }),
            ),
          );

          taskCreationMessage = `\n\n✅ **Great news!** I've created ${createdTasks.length} actionable tasks from our conversation:

${createdTasks.map((task, idx) => `${idx + 1}. **${task.title}** (${task.category} - ${task.priority} priority)`).join("\n")}

You can find these tasks in your task list and start working on them right away!`;
        } catch (error) {
          console.error("Failed to create tasks from chat:", error);
          taskCreationMessage =
            "\n\n💡 I detected some goals in your message, but had trouble creating tasks automatically. You can always use the main input to create structured action plans!";
        }
      }

      res.json({
        message: aiResponse.message + taskCreationMessage,
        actionPlan: aiResponse.actionPlan,
        extractedGoals: aiResponse.extractedGoals,
        tasks: aiResponse.tasks,
        createdTasks: createdTasks,
        createdGoal: createdGoal,
        tasksGenerated: createdTasks.length > 0,
      });
    } catch (error) {
      console.error("Chat conversation error:", error);
      res.status(500).json({
        error: "Failed to process chat message",
        message:
          "Sorry, I encountered an issue processing your message. Please try again.",
      });
    }
  });

  // Get pending reminders
  app.get("/api/notifications/reminders/pending", async (req, res) => {
    try {
      const pendingReminders = await storage.getPendingReminders();
      res.json(pendingReminders);
    } catch (error) {
      console.error("Error fetching pending reminders:", error);
      res.status(500).json({ error: "Failed to fetch pending reminders" });
    }
  });

  // Mark reminder as sent
  app.patch("/api/notifications/reminders/:id/sent", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markReminderSent(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking reminder as sent:", error);
      res.status(500).json({ error: "Failed to mark reminder as sent" });
    }
  });

  // Batch re-enrich journal entries for a user
  app.post("/api/user/journal/batch-enrich", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).send("User not found");

      const journalData = (user.preferences as any)?.journalData || {};
      const entriesToEnrich: any[] = [];

      // DEDUPLICATION: Track seen entries by normalized title + date to prevent duplicates
      const seenTitles = new Set<string>();

      // Flatten journal entries for batch processing
      Object.entries(journalData).forEach(
        ([category, entries]: [string, any]) => {
          entries.forEach((entry: any) => {
            // If it's a rich entry and doesn't have webEnrichment, or we want to force refresh
            if (
              typeof entry !== "string" &&
              (!entry.webEnrichment || req.body.force)
            ) {
              // Create deduplication key from normalized title + date
              const title = (entry.webEnrichment?.venueName || entry.text || "")
                .toLowerCase()
                .trim();
              const date = entry.date || "";
              const dedupKey = `${title}|${date}`;

              // Skip if we've already seen this title+date combination
              if (seenTitles.has(dedupKey)) {
                console.log(
                  `[JOURNAL] Skipping duplicate entry: "${title.substring(0, 40)}" on ${date}`,
                );
                return;
              }
              seenTitles.add(dedupKey);

              entriesToEnrich.push({
                id: entry.id,
                text: entry.text,
                category: category,
                venueName: entry.venueName,
                location: entry.location,
              });
            }
          });
        },
      );

      if (entriesToEnrich.length === 0) {
        return res.json({
          message: "No entries need enrichment",
          updatedCount: 0,
        });
      }

      console.log(
        `[JOURNAL] Starting batch enrichment for user ${userId}, entries: ${entriesToEnrich.length}`,
      );

      // Perform batch enrichment using the service
      const results = await journalWebEnrichmentService.enrichBatch(
        entriesToEnrich,
        req.body.force || false,
      );

      // Create a map for quick lookup
      const enrichmentMap = new Map();
      results.forEach((r) => {
        if (r.success && r.enrichedData) {
          enrichmentMap.set(r.entryId, r.enrichedData);
        }
      });

      // Update the user's journal data with results
      const updatedJournalData = { ...journalData };
      let updatedCount = 0;

      Object.entries(updatedJournalData).forEach(
        ([category, entries]: [string, any]) => {
          updatedJournalData[category] = entries.map((entry: any) => {
            if (typeof entry !== "string" && enrichmentMap.has(entry.id)) {
              updatedCount++;
              return {
                ...entry,
                webEnrichment: enrichmentMap.get(entry.id),
              };
            }
            return entry;
          });
        },
      );

      // Save back to storage
      await storage.updateUserPreferences(userId, {
        ...(user.preferences as any),
        journalData: updatedJournalData,
      });

      res.json({
        message: `Successfully enriched ${updatedCount} entries`,
        updatedCount,
      });
    } catch (error) {
      console.error("[JOURNAL] Batch enrichment error:", error);
      res.status(500).json({ error: "Failed to perform batch enrichment" });
    }
  });

  // Get user preferences (with automatic journal data normalization)
  app.get("/api/user-preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log("[PREFERENCES] Fetching preferences for user:", userId);

      const preferences = await storage.getUserPreferences(userId);

      if (!preferences || !preferences.preferences) {
        console.log("[PREFERENCES] No preferences found, returning empty");
        return res.json({ preferences: {} });
      }

      let responsePrefs = { ...preferences.preferences };

      // Normalize journal data if it exists
      if (responsePrefs.journalData) {
        const { normalizeJournalData } = await import(
          "./config/journalTags.js"
        );
        const { normalized, hasChanges } = normalizeJournalData(
          responsePrefs.journalData,
        );

        if (hasChanges) {
          console.log(
            "[PREFERENCES] Migrating legacy journal category names to slug IDs",
          );
          // Persist normalized data back to storage
          await storage.upsertUserPreferences(userId, {
            preferences: {
              ...responsePrefs,
              journalData: normalized,
            },
          });
        }

        responsePrefs.journalData = normalized;
      }

      console.log("[PREFERENCES] Returning normalized preferences");
      res.json({ preferences: responsePrefs });
    } catch (error) {
      console.error("[PREFERENCES] Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  // Get today's daily theme
  app.get("/api/user/daily-theme", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const preferences = await storage.getUserPreferences(userId);

      if (!preferences?.preferences?.dailyTheme) {
        return res.json({ dailyTheme: null });
      }

      const dailyTheme = preferences.preferences.dailyTheme;
      const today = new Date().toISOString().split("T")[0];

      // Only return theme if it's from today
      if (dailyTheme.date === today) {
        return res.json({ dailyTheme });
      }

      return res.json({ dailyTheme: null });
    } catch (error) {
      console.error("[DAILY THEME] Error fetching daily theme:", error);
      res.status(500).json({ error: "Failed to fetch daily theme" });
    }
  });

  // Set daily theme
  app.post("/api/user/daily-theme", async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { activityId, activityTitle, tasks, date } = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "activityId is required" });
      }

      // If activityTitle is empty, it means we're clearing the theme
      const isClearing = !activityTitle || activityId.startsWith("cleared-");
      const themeDate = date || new Date().toISOString().split("T")[0];

      const dailyTheme = isClearing
        ? null
        : {
            activityId,
            activityTitle,
            date: themeDate,
            tasks: tasks || [],
          };

      // Get current preferences and update with new daily theme
      const currentPrefs = await storage.getUserPreferences(userId);
      const updatedPrefs = {
        ...(currentPrefs?.preferences || {}),
        dailyTheme: dailyTheme,
      };

      await storage.upsertUserPreferences(userId, {
        preferences: updatedPrefs,
      });

      console.log(
        "[DAILY THEME]",
        isClearing ? "Cleared" : "Set",
        "daily theme for user:",
        userId,
      );
      res.json({ success: true, dailyTheme });
    } catch (error) {
      console.error("[DAILY THEME] Error setting daily theme:", error);
      res.status(500).json({ error: "Failed to set daily theme" });
    }
  });

  // User Profile Management
  app.get("/api/user/profile", async (req: any, res) => {
    try {
      // Get authenticated user ID using the helper function
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log("Fetching profile for user:", userId);

      // Get user data for OAuth profile image and basic info
      const user = await storage.getUser(userId);

      // Try to get existing profile
      let profile = await storage.getUserProfile(userId);
      console.log("Existing profile:", profile);

      // If no profile exists for authenticated user, create one
      if (!profile && userId !== DEMO_USER_ID && user) {
        console.log("User data for profile creation:", user);
        // Note: We don't set profileImageUrlOverride here - that's only for user uploads
        // The OAuth profile image is stored on the users table (profileImageUrl)
        profile = await storage.upsertUserProfile(userId, {});
        console.log("Created new profile:", profile);
      }

      // Also fetch user preferences for journal data
      const preferences = await storage.getUserPreferences(userId);

      // Calculate actual task stats (same logic as /api/progress endpoint)
      const tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.userId, userId),
            or(eq(tasksTable.archived, false), isNull(tasksTable.archived)),
          ),
        );

      const completedTasks = tasks.filter((task) => task.completed === true);
      const totalTasksCompleted = completedTasks.length;
      const weeklyStreak = Math.min(completedTasks.length, 7); // Simple streak calculation

      // Compute the effective profileImageUrl:
      // - Use profileImageUrlOverride if user uploaded a custom image
      // - Otherwise fall back to user's OAuth profile image
      const profileImageUrl =
        profile?.profileImageUrlOverride || user?.profileImageUrl || null;

      console.log("Returning profile with computed image:", {
        hasOverride: !!profile?.profileImageUrlOverride,
        hasUserImage: !!user?.profileImageUrl,
        imageLength: profileImageUrl?.length || 0,
      });

      // Merge user table fields with profile table fields for unified response
      res.json({
        ...profile,
        // User table fields (firstName, lastName, email, location, occupation)
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        email: user?.email || null,
        location: user?.location || null,
        occupation: user?.occupation || null,
        username: user?.username || null,
        // Computed fields
        profileImageUrl, // Add computed field for frontend compatibility
        preferences: preferences?.preferences,
        // Gamification fields - calculated from actual task data
        smartScore: user?.creatorPoints || 0,
        totalTasksCompleted: totalTasksCompleted,
        streakDays: weeklyStreak,
        interests: user?.interests || [],
        lifeGoals: user?.currentChallenges || [],
        createdAt: user?.createdAt || null,
        lastActiveDate: user?.updatedAt || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/user/profile", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const body = req.body;

      // Fields that belong to the users table
      const userFields = [
        "firstName",
        "lastName",
        "email",
        "location",
        "occupation",
      ];
      // Fields that belong to the user_profiles table
      const profileFields = [
        "nickname",
        "publicBio",
        "privateBio",
        "height",
        "weight",
        "birthDate",
        "sex",
        "ethnicity",
        "profileVisibility",
      ];

      // Split the incoming data
      const userUpdate: any = {};
      const profileUpdate: any = {};

      for (const key of Object.keys(body)) {
        if (userFields.includes(key) && body[key] !== undefined) {
          userUpdate[key] = body[key];
        } else if (profileFields.includes(key) && body[key] !== undefined) {
          profileUpdate[key] = body[key];
        }
      }

      console.log("[PROFILE UPDATE] User fields:", userUpdate);
      console.log("[PROFILE UPDATE] Profile fields:", profileUpdate);

      // Update users table if there are user fields to update
      if (Object.keys(userUpdate).length > 0) {
        await storage.updateUser(userId, userUpdate);
        console.log("[PROFILE UPDATE] Updated user table");
      }

      // Update user_profiles table
      const profile = await storage.upsertUserProfile(userId, profileUpdate);
      console.log("[PROFILE UPDATE] Updated profile table");

      // Return the merged profile data
      const user = await storage.getUser(userId);
      res.json({
        ...profile,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        location: user?.location,
        occupation: user?.occupation,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  // Upload profile image
  app.put("/api/user/profile/image", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { imageData } = req.body;

      console.log(
        `[PROFILE IMAGE] Upload request for user: ${userId}, data length: ${imageData?.length || 0}`,
      );

      if (!imageData || typeof imageData !== "string") {
        console.log("[PROFILE IMAGE] Error: Invalid image data - not a string");
        return res.status(400).json({ error: "Invalid image data" });
      }

      // Validate it's a data URL
      if (!imageData.startsWith("data:image/")) {
        console.log(
          "[PROFILE IMAGE] Error: Invalid image format - not a data URL",
        );
        return res.status(400).json({ error: "Invalid image format" });
      }

      // Update user_profiles table with the override image
      // Note: profileImageUrlOverride is used to override OAuth profile images
      console.log(
        "[PROFILE IMAGE] Saving to userProfiles.profileImageUrlOverride...",
      );
      const profile = await storage.upsertUserProfile(userId, {
        profileImageUrlOverride: imageData,
      });
      console.log(
        `[PROFILE IMAGE] Saved successfully, profile ID: ${profile?.id}`,
      );

      res.json({ success: true, profileImageUrl: imageData });
    } catch (error) {
      console.error("[PROFILE IMAGE] Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  });

  // Personal Journal - Save journal entry
  app.put("/api/user/journal", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, items } = req.body;

      if (!category || !Array.isArray(items)) {
        return res
          .status(400)
          .json({ error: "Category and items array required" });
      }

      // Get existing preferences
      let prefs = await storage.getUserPreferences(userId);

      // Initialize journal data if it doesn't exist
      const currentPrefs = prefs?.preferences || {};
      const journalData = currentPrefs.journalData || {};

      // Enrich journal entries with AI insights (async, in parallel)
      console.log(
        `[JOURNAL SAVE] Enriching ${items.length} entries for category: ${category}`,
      );
      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          // Only enrich items with text content
          if (
            !item.text ||
            typeof item.text !== "string" ||
            item.text.trim().length < 10
          ) {
            return item; // Skip enrichment for empty or very short entries
          }

          try {
            // Check if already enriched (has keywords and aiConfidence)
            if (item.keywords && item.aiConfidence !== undefined) {
              console.log(`[JOURNAL SAVE] Entry already enriched, skipping`);
              return item;
            }

            const enrichedData = await enrichJournalEntry(
              item.text,
              category,
              item.keywords,
            );

            return {
              ...item,
              keywords: enrichedData.keywords,
              extractedData: enrichedData.extractedData,
              aiConfidence: enrichedData.aiConfidence,
              suggestions: enrichedData.suggestions,
            };
          } catch (enrichError) {
            console.error(
              "[JOURNAL SAVE] Enrichment failed for item, saving without enrichment:",
              enrichError,
            );
            return item; // Save the original item if enrichment fails
          }
        }),
      );

      // Web enrichment (async, non-blocking) for venue-type entries
      // Run in background to not slow down the save
      // Extended list: includes hobbies, style/fashion, self-care, and custom categories
      const webEnrichableCategories = [
        "restaurants",
        "travel",
        "activities",
        "music",
        "movies",
        "shopping",
        "fitness",
        "books",
        "hobbies",
        "style",
        "self-care",
        // Custom categories (common user-created ones)
        "entertainment",
        "Entertainment",
        "custom-entertainment",
        "notes",
        "favorites",
        "work",
        "personal",
      ];
      // Normalize category check to be case-insensitive
      const normalizedCategory = category
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const isEnrichable = webEnrichableCategories.some(
        (c) => c.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedCategory,
      );
      if (isEnrichable) {
        // Don't await - run in background
        (async () => {
          try {
            const entriesToEnrich = enrichedItems
              .filter(
                (item: any) => item.text && !item.webEnrichment?.venueVerified,
              )
              .map((item: any) => ({
                id:
                  item.id ||
                  `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: item.text,
                category,
                venueName: item.venueName,
                location: item.location,
                existingEnrichment: item.webEnrichment,
              }));

            if (entriesToEnrich.length > 0) {
              console.log(
                `[JOURNAL SAVE] Starting web enrichment for ${entriesToEnrich.length} entries`,
              );
              const webResults =
                await journalWebEnrichmentService.enrichBatch(entriesToEnrich);

              // Update entries with web enrichment data
              const enrichedCount = webResults.filter((r) => r.success).length;
              if (enrichedCount > 0) {
                console.log(
                  `[JOURNAL SAVE] Web enriched ${enrichedCount} entries, updating...`,
                );

                // Get fresh prefs and update with web enrichment
                const freshPrefs = await storage.getUserPreferences(userId);
                const freshJournalData =
                  freshPrefs?.preferences?.journalData || {};
                const categoryEntries = freshJournalData[category] || [];

                const updatedEntries = categoryEntries.map((entry: any) => {
                  const webResult = webResults.find(
                    (r) =>
                      r.success &&
                      r.entryId &&
                      (entry.id === r.entryId ||
                        entry.text ===
                          entriesToEnrich.find((e) => e.id === r.entryId)
                            ?.text),
                  );
                  if (webResult?.enrichedData) {
                    return { ...entry, webEnrichment: webResult.enrichedData };
                  }
                  return entry;
                });

                freshJournalData[category] = updatedEntries;
                await storage.upsertUserPreferences(userId, {
                  preferences: {
                    ...freshPrefs?.preferences,
                    journalData: freshJournalData,
                  },
                });
                console.log(
                  `[JOURNAL SAVE] Web enrichment saved for category: ${category}`,
                );
              }
            }
          } catch (webError) {
            console.error(
              "[JOURNAL SAVE] Background web enrichment failed:",
              webError,
            );
          }
        })();
      }

      // Update the specific category with enriched items
      journalData[category] = enrichedItems;

      // Save back to preferences
      const updatedPrefs = await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalData,
        },
      });

      // Invalidate user context cache to refresh personalization
      aiService.invalidateUserContext(userId);
      console.log(`[JOURNAL SAVE] Cache invalidated for user ${userId}`);

      res.json({ success: true, journalData });
    } catch (error) {
      console.error("Error saving journal entry:", error);
      res.status(500).json({ error: "Failed to save journal entry" });
    }
  });

  // Personal Journal - Update a single entry (manual overrides)
  app.patch("/api/user/journal/entry/:entryId", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { entryId } = req.params;
      const {
        manualBackdrop,
        manualDescription,
        manualCategory,
        manualSubcategory,
        text,
      } = req.body;

      console.log(
        `[JOURNAL EDIT] Updating entry ${entryId} for user ${userId}`,
      );

      // Get existing preferences
      const prefs = await storage.getUserPreferences(userId);
      const currentPrefs = prefs?.preferences || {};
      const journalData = { ...currentPrefs.journalData } || {};

      // Find the entry across all categories
      let foundCategory: string | null = null;
      let foundIndex: number = -1;
      let foundEntry: any = null;

      for (const [category, entries] of Object.entries(journalData)) {
        if (!Array.isArray(entries)) continue;
        const idx = entries.findIndex(
          (e: any) => typeof e === "object" && e.id === entryId,
        );
        if (idx !== -1) {
          foundCategory = category;
          foundIndex = idx;
          foundEntry = entries[idx];
          break;
        }
      }

      if (!foundCategory || foundIndex === -1 || !foundEntry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      // Update the entry with manual overrides
      // null means explicitly clear, undefined means don't change
      const updatedEntry = {
        ...foundEntry,
        ...(text !== undefined && { text }),
      };

      // Handle nullable fields - null clears, undefined skips, value sets
      if (manualBackdrop !== undefined) {
        if (manualBackdrop === null || manualBackdrop === "") {
          delete updatedEntry.manualBackdrop;
        } else {
          updatedEntry.manualBackdrop = manualBackdrop;
        }
      }
      if (manualDescription !== undefined) {
        if (manualDescription === null || manualDescription === "") {
          delete updatedEntry.manualDescription;
        } else {
          updatedEntry.manualDescription = manualDescription;
        }
      }
      if (manualSubcategory !== undefined) {
        if (manualSubcategory === null || manualSubcategory === "") {
          delete updatedEntry.manualSubcategory;
        } else {
          updatedEntry.manualSubcategory = manualSubcategory;
        }
      }

      // If moving to a different category
      if (manualCategory && manualCategory !== foundCategory) {
        // Remove from old category
        journalData[foundCategory] = journalData[foundCategory].filter(
          (_: any, i: number) => i !== foundIndex,
        );

        // Add to new category
        if (!journalData[manualCategory]) {
          journalData[manualCategory] = [];
        }
        journalData[manualCategory].push(updatedEntry);

        console.log(
          `[JOURNAL EDIT] Moved entry from ${foundCategory} to ${manualCategory}`,
        );
      } else {
        // Update in place
        journalData[foundCategory][foundIndex] = updatedEntry;
      }

      // Save back to preferences
      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalData,
        },
      });

      console.log(`[JOURNAL EDIT] Entry ${entryId} updated successfully`);
      res.json({ success: true, entry: updatedEntry });
    } catch (error) {
      console.error("Error updating journal entry:", error);
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  // Personal Journal - Save custom categories
  app.put("/api/user/journal/custom-categories", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { customJournalCategories } = req.body;

      if (!Array.isArray(customJournalCategories)) {
        return res
          .status(400)
          .json({ error: "customJournalCategories array required" });
      }

      // Get existing preferences
      let prefs = await storage.getUserPreferences(userId);

      // Update custom categories
      const currentPrefs = prefs?.preferences || {};
      const updatedPrefs = await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          customJournalCategories,
        },
      });

      res.json({ success: true, customJournalCategories });
    } catch (error) {
      console.error("Error saving custom categories:", error);
      res.status(500).json({ error: "Failed to save custom categories" });
    }
  });

  // Personal Journal - Save settings
  app.put("/api/user/journal/settings", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { journalSettings } = req.body;

      // Validate settings schema
      const settingsSchema = z.object({
        showDeleteCategory: z.boolean().optional(),
        showRenameCategory: z.boolean().optional(),
        showMergeCategories: z.boolean().optional(),
        showEditCategoryIcon: z.boolean().optional(),
        showEntryCount: z.boolean().optional(),
        showFilters: z.boolean().optional(),
        showSubcategories: z.boolean().optional(),
      });

      const parsed = settingsSchema.safeParse(journalSettings);
      if (!parsed.success) {
        return res
          .status(400)
          .json({
            error: "Invalid journalSettings format",
            details: parsed.error,
          });
      }

      // Get existing preferences
      let prefs = await storage.getUserPreferences(userId);

      // Update journal settings with validated data only
      const currentPrefs = prefs?.preferences || {};
      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalSettings: parsed.data,
        },
      });

      res.json({ success: true, journalSettings: parsed.data });
    } catch (error) {
      console.error("Error saving journal settings:", error);
      res.status(500).json({ error: "Failed to save journal settings" });
    }
  });

  // Personal Journal - Batch save entries from AI plans
  app.post("/api/user/journal/batch", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { entries, subcategory } = req.body;

      const batchEntrySchema = z.object({
        category: z.string(),
        entry: z.union([
          z.string(),
          z.object({
            id: z.string(),
            text: z.string(),
            timestamp: z.string(),
            location: z
              .object({
                city: z.string().optional(),
                country: z.string().optional(),
                neighborhood: z.string().optional(),
              })
              .optional(),
            budgetTier: z
              .enum(["budget", "moderate", "luxury", "ultra_luxury"])
              .optional(),
            estimatedCost: z.number().optional(),
            sourceUrl: z.string().optional(),
            venueName: z.string().optional(),
            venueType: z.string().optional(),
            subcategory: z.string().optional(),
          }),
        ]),
      });

      const batchSchema = z.array(batchEntrySchema);

      const parsed = batchSchema.safeParse(entries);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid entries format", details: parsed.error });
      }

      let prefs = await storage.getUserPreferences(userId);
      const currentPrefs = prefs?.preferences || {};
      const journalData: Record<string, any[]> = {
        ...(currentPrefs.journalData || {}),
      };

      // Track custom categories for smart categorization
      let existingCustomCategories: Record<string, DynamicCategoryInfo> = {};
      if (Array.isArray(currentPrefs.customJournalCategories)) {
        for (const cat of currentPrefs.customJournalCategories) {
          existingCustomCategories[cat.id] = {
            id: cat.id,
            label: cat.name || cat.label || cat.id,
            emoji: cat.emoji || "",
            color: cat.color || "from-teal-500 to-cyan-500",
          };
        }
      } else if (currentPrefs.customJournalCategories) {
        existingCustomCategories = currentPrefs.customJournalCategories;
      }
      const newDynamicCategories: Record<string, DynamicCategoryInfo> = {};

      for (const { category, entry } of parsed.data) {
        let finalCategory = category;

        // Apply smart categorization when venueType is provided and category is generic
        if (typeof entry === "object" && entry.venueType) {
          const venueType = entry.venueType;
          const entrySubcategory = subcategory || venueType;

          console.log(
            `[JOURNAL BATCH] Smart categorizing: venueType="${venueType}", subcategory="${entrySubcategory}", original category="${category}"`,
          );

          // Only apply smart categorization for generic categories
          if (category === "notes" || category === "hobbies") {
            const { category: smartCategory, dynamicInfo } =
              getBestJournalCategory(
                venueType,
                entrySubcategory,
                "other" as any,
              );

            if (dynamicInfo && !existingCustomCategories[dynamicInfo.id]) {
              newDynamicCategories[dynamicInfo.id] = dynamicInfo;
              console.log(
                `[JOURNAL BATCH] Created dynamic category: ${dynamicInfo.emoji} ${dynamicInfo.label}`,
              );
            }

            finalCategory = smartCategory;
            console.log(
              `[JOURNAL BATCH] Smart category result: "${finalCategory}"`,
            );
          }
        }

        if (!journalData[finalCategory]) {
          journalData[finalCategory] = [];
        }

        // Ensure subcategory is stored in the entry for filtering
        let entryToStore = entry;
        if (typeof entry === "object") {
          const entrySubcat =
            entry.subcategory || subcategory || entry.venueType;
          if (entrySubcat) {
            entryToStore = { ...entry, subcategory: entrySubcat };
          }
        }

        // Deduplication check - skip if similar entry already exists
        const entryText =
          typeof entryToStore === "string"
            ? entryToStore
            : entryToStore.text || "";
        const entrySourceUrl =
          typeof entryToStore === "object" ? entryToStore.sourceUrl : undefined;
        const normalizedText = entryText
          .toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ");

        const isDuplicate = journalData[finalCategory].some((existing: any) => {
          const existingText =
            typeof existing === "string" ? existing : existing.text || "";
          const existingSourceUrl =
            typeof existing === "object" ? existing.sourceUrl : undefined;
          const normalizedExisting = existingText
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ");

          // Check for text similarity (exact match after normalization)
          if (
            normalizedText === normalizedExisting &&
            normalizedText.length > 0
          ) {
            console.log(
              `[JOURNAL DEDUP] Skipping duplicate text: "${normalizedText.substring(0, 50)}..."`,
            );
            return true;
          }

          // Check for same source URL
          if (
            entrySourceUrl &&
            existingSourceUrl &&
            entrySourceUrl === existingSourceUrl
          ) {
            console.log(
              `[JOURNAL DEDUP] Skipping duplicate sourceUrl: ${entrySourceUrl}`,
            );
            return true;
          }

          return false;
        });

        if (!isDuplicate) {
          journalData[finalCategory].push(entryToStore);
        }
      }

      // Merge new dynamic categories
      const updatedCustomCategories = {
        ...existingCustomCategories,
        ...newDynamicCategories,
      };

      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalData,
          customJournalCategories: updatedCustomCategories,
        },
      });

      if (Object.keys(newDynamicCategories).length > 0) {
        console.log(
          `[JOURNAL BATCH] Created ${Object.keys(newDynamicCategories).length} new custom categories`,
        );
      }

      // Invalidate user context cache
      aiService.invalidateUserContext(userId);

      res.json({ success: true, count: parsed.data.length });
    } catch (error) {
      console.error("Journal batch save error:", error);
      res.status(500).json({ error: "Failed to save journal entries" });
    }
  });

  // Web enrich journal entries (manual trigger or scheduled job)
  app.post("/api/user/journal/web-enrich", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { categories, forceRefresh } = req.body;

      console.log(
        `[JOURNAL WEB ENRICH] Starting for user ${userId}, categories: ${categories?.join(", ") || "all"}`,
      );

      // Get existing preferences
      const prefs = await storage.getUserPreferences(userId);
      const originalJournalData = prefs?.preferences?.journalData || {};

      // STEP 1: Deduplicate entries BEFORE enrichment
      // This removes duplicate entries (same normalized name) within each category
      // Uses normalized comparison to catch "The Dark Knight" vs "Dark Knight, The"
      let totalDuplicatesRemoved = 0;
      const duplicateNames: string[] = []; // Track names of removed duplicates for user feedback
      const journalData: Record<string, any[]> = {};

      // Title normalization function for better duplicate detection
      const normalizeTitle = (title: string): string => {
        return title
          .toLowerCase()
          .replace(/^(the|a|an)\s+/i, '')        // Remove leading articles
          .replace(/,\s*(the|a|an)$/i, '')       // Remove trailing ", The" etc.
          .replace(/[^\w\s]/g, '')               // Remove punctuation
          .replace(/\s+/g, ' ')                  // Normalize whitespace
          .trim();
      };

      for (const [category, entries] of Object.entries(originalJournalData)) {
        if (!Array.isArray(entries)) {
          journalData[category] = entries as any;
          continue;
        }

        const seenNormalizedNames = new Set<string>();
        const uniqueEntries: any[] = [];

        for (const entry of entries) {
          const entryName = (
            entry.venueName ||
            entry.text ||
            entry.title ||
            entry.name ||
            ""
          );
          const normalizedName = normalizeTitle(entryName);

          if (!normalizedName || !seenNormalizedNames.has(normalizedName)) {
            if (normalizedName) seenNormalizedNames.add(normalizedName);
            uniqueEntries.push(entry);
          } else {
            totalDuplicatesRemoved++;
            duplicateNames.push(entryName.substring(0, 50));
            console.log(
              `[JOURNAL WEB ENRICH] Removing duplicate: "${entryName}" (normalized: "${normalizedName}") in ${category}`,
            );
          }
        }
        journalData[category] = uniqueEntries;
      }

      if (totalDuplicatesRemoved > 0) {
        console.log(
          `[JOURNAL WEB ENRICH] Removed ${totalDuplicatesRemoved} duplicates before enrichment`,
        );
        // Save deduplicated data immediately
        await storage.upsertUserPreferences(userId, {
          preferences: {
            ...prefs?.preferences,
            journalData,
          },
        });
      }

      // Determine which categories to enrich (extended list with custom categories)
      const webEnrichableCategories = [
        "restaurants",
        "travel",
        "activities",
        "music",
        "movies",
        "shopping",
        "fitness",
        "books",
        "hobbies",
        "style",
        "self-care",
        // Standard category names with proper casing
        "Movies & TV Shows",
        "Books & Reading",
        "Music & Artists",
        "Restaurants & Food",
        "Travel & Places",
        "Health & Fitness",
        // Custom categories (common user-created ones)
        "entertainment",
        "Entertainment",
        "custom-entertainment",
        "notes",
        "favorites",
        "work",
        "personal",
      ];

      // Normalize function for case-insensitive matching
      const normalizeCategory = (c: string) =>
        c.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Get all existing journal categories that match our enrichable list
      const allJournalCategories = Object.keys(journalData);

      const categoriesToEnrich =
        categories?.length > 0
          ? categories.filter((c: string) =>
              webEnrichableCategories.some(
                (wc) => normalizeCategory(wc) === normalizeCategory(c),
              ),
            )
          : allJournalCategories.filter(
              (c) =>
                webEnrichableCategories.some(
                  (wc) => normalizeCategory(wc) === normalizeCategory(c),
                ) && journalData[c]?.length > 0,
            );

      let totalEnriched = 0;
      let totalFailed = 0;

      for (const category of categoriesToEnrich) {
        const entries = journalData[category] || [];
        if (entries.length === 0) continue;

        // DEDUPLICATION: Track seen entries by normalized title + date to prevent duplicates
        // This fixes the issue where the same show (e.g., "Westworld") appears multiple times
        const seenTitles = new Set<string>();

        // Filter entries needing enrichment and track their original indices
        // CRITICAL: We must use positional mapping because entries may have duplicate IDs
        const entriesWithIndices: { entry: any; originalIndex: number }[] = [];
        entries.forEach((item: any, index: number) => {
          if (!item.text) return;

          // Create deduplication key from normalized title + date
          const title = (item.webEnrichment?.venueName || item.text || "")
            .toLowerCase()
            .trim();
          const date = item.date || "";
          const dedupKey = `${title}|${date}`;

          // Skip if we've already seen this title+date combination in this batch
          if (seenTitles.has(dedupKey)) {
            console.log(
              `[JOURNAL] Skipping duplicate entry: "${title.substring(0, 40)}" on ${date}`,
            );
            return;
          }
          seenTitles.add(dedupKey);

          if (!forceRefresh && item.webEnrichment?.venueVerified) return;
          entriesWithIndices.push({ entry: item, originalIndex: index });
        });

        if (entriesWithIndices.length === 0) continue;

        // Build enrichment requests (order matches entriesWithIndices)
        const entriesToEnrich = entriesWithIndices.map(({ entry: item }) => ({
          id:
            item.id ||
            `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: item.text,
          category,
          // On force refresh, clear venueName so enrichment service re-extracts it from text
          // This prevents stale/wrong venue names from being used
          venueName: forceRefresh ? undefined : item.venueName,
          location: item.location,
          existingEnrichment: forceRefresh ? undefined : item.webEnrichment,
        }));

        console.log(
          `[JOURNAL WEB ENRICH] Processing ${entriesToEnrich.length} entries in ${category}${forceRefresh ? " (FORCE REFRESH)" : ""}`,
        );

        const results = await journalWebEnrichmentService.enrichBatch(
          entriesToEnrich,
          forceRefresh,
        );

        // Track entries to move to different categories
        const entriesToMove: { entry: any; suggestedCategory: string }[] = [];

        // Build a map from original entry index to enrichment result
        // CRITICAL FIX: Use positional mapping - results[i] corresponds to entriesWithIndices[i]
        // This avoids the bug where .find() returns wrong entry when IDs are duplicated
        const enrichmentByIndex = new Map<number, any>();
        results.forEach((result, i) => {
          if (result.success && result.enrichedData) {
            const originalIndex = entriesWithIndices[i].originalIndex;
            enrichmentByIndex.set(originalIndex, result.enrichedData);
          }
        });

        // Update entries with enrichment data using positional mapping
        const updatedEntries = entries
          .map((entry: any, index: number) => {
            const enrichedData = enrichmentByIndex.get(index);
            if (enrichedData) {
              totalEnriched++;
              const updatedEntry = { ...entry, webEnrichment: enrichedData };

              // Check if category should change (e.g., movie in Entertainment should move to Movies & TV Shows)
              const suggestedCat = enrichedData.suggestedCategory;
              if (
                suggestedCat &&
                suggestedCat !== category &&
                enrichedData.categoryConfidence > 0.7
              ) {
                // Mark for moving to correct category
                entriesToMove.push({
                  entry: updatedEntry,
                  suggestedCategory: suggestedCat,
                });
                console.log(
                  `[JOURNAL WEB ENRICH] Entry "${entry.text?.substring(0, 50)}" will be moved from ${category} to ${suggestedCat}`,
                );
                return null; // Remove from current category
              }

              return updatedEntry;
            }
            return entry;
          })
          .filter(Boolean); // Remove null entries (moved to other categories)

        totalFailed += results.filter((r) => !r.success).length;
        journalData[category] = updatedEntries;

        // Move entries to their suggested categories
        for (const { entry, suggestedCategory } of entriesToMove) {
          // Initialize target category if needed
          if (!journalData[suggestedCategory]) {
            journalData[suggestedCategory] = [];
          }
          // Add entry with updated category info
          journalData[suggestedCategory].push({
            ...entry,
            category: suggestedCategory,
            venueType: entry.webEnrichment?.venueType || entry.venueType,
          });
        }
      }

      // Save updated journal data
      if (totalEnriched > 0) {
        // Debug: Log entries with primaryImageUrl before saving
        for (const cat of categoriesToEnrich) {
          const entries = journalData[cat] || [];
          const withImages = entries.filter(
            (e: any) => e.webEnrichment?.primaryImageUrl,
          );
          if (withImages.length > 0) {
            console.log(
              `[JOURNAL WEB ENRICH] Category "${cat}" has ${withImages.length} entries with images before save:`,
              withImages.map((e: any) => ({
                text: e.text?.substring(0, 30),
                imageUrl: e.webEnrichment?.primaryImageUrl?.substring(0, 60),
              })),
            );
          }
        }

        await storage.upsertUserPreferences(userId, {
          preferences: { ...prefs?.preferences, journalData },
        });
        aiService.invalidateUserContext(userId);

        // Debug: Verify data was saved correctly
        const savedPrefs = await storage.getUserPreferences(userId);
        const savedJournalData = savedPrefs?.preferences?.journalData as Record<
          string,
          any[]
        >;
        for (const cat of categoriesToEnrich) {
          const entries = savedJournalData?.[cat] || [];
          const withImages = entries.filter(
            (e: any) => e.webEnrichment?.primaryImageUrl,
          );
          console.log(
            `[JOURNAL WEB ENRICH] After save - Category "${cat}" has ${withImages.length}/${entries.length} entries with images`,
          );
        }
      }

      console.log(
        `[JOURNAL WEB ENRICH] Complete: ${totalEnriched} enriched, ${totalFailed} failed, ${totalDuplicatesRemoved} duplicates removed`,
      );

      res.json({
        success: true,
        enriched: totalEnriched,
        failed: totalFailed,
        duplicatesRemoved: totalDuplicatesRemoved,
        duplicateNames: duplicateNames.slice(0, 10), // Show up to 10 duplicate names
        categories: categoriesToEnrich,
      });
    } catch (error) {
      console.error("Journal web enrichment error:", error);
      res.status(500).json({ error: "Failed to enrich journal entries" });
    }
  });

  // ==========================================================================
  // MOVIE/TV VERIFICATION - Get multiple candidates for user to pick from
  // Used when TMDB match is uncertain and we want user confirmation
  // ==========================================================================
  app.post("/api/journal/verify-media", async (req: any, res) => {
    try {
      const { query, category, entryId } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      console.log(`[VERIFY MEDIA] Searching candidates for: "${query}"`);

      const { bestMatch, candidates, needsUserConfirmation } =
        await tmdbService.searchWithCandidates(query, 5);

      res.json({
        success: true,
        query,
        bestMatch,
        candidates: candidates.map(c => ({
          ...c.result,
          confidence: Math.round(c.confidence * 100),
          confidenceLevel: c.confidenceLevel,
          matchReasons: c.matchReasons,
        })),
        needsUserConfirmation,
        entryId,
        category,
      });
    } catch (error) {
      console.error("[VERIFY MEDIA] Error:", error);
      res.status(500).json({ error: "Failed to search for media" });
    }
  });

  // ==========================================================================
  // CONFIRM MEDIA SELECTION - User picks the correct movie/show from candidates
  // ==========================================================================
  app.post("/api/journal/confirm-media", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, entryId, selectedTmdbId, mediaType } = req.body;

      if (!category || !entryId || !selectedTmdbId) {
        return res.status(400).json({ error: "category, entryId, and selectedTmdbId are required" });
      }

      console.log(`[CONFIRM MEDIA] User selected TMDB ID ${selectedTmdbId} for entry ${entryId}`);

      // Fetch full details for the selected movie/TV show
      const result = mediaType === 'tv'
        ? await tmdbService.searchTV(selectedTmdbId.toString())
        : await tmdbService.searchMovie(selectedTmdbId.toString());

      if (!result) {
        return res.status(404).json({ error: "Could not fetch details for selected media" });
      }

      // Update the journal entry with verified enrichment
      const prefs = await storage.getUserPreferences(userId);
      const journalData = prefs?.preferences?.journalData || {};
      const entries = journalData[category] || [];

      const entryIndex = entries.findIndex((e: any) => e.id === entryId);
      if (entryIndex === -1) {
        return res.status(404).json({ error: "Journal entry not found" });
      }

      // Create enrichment data
      const enrichment = {
        venueVerified: true,
        userConfirmed: true, // Mark as user-confirmed
        venueType: mediaType === 'tv' ? 'tv_show' : 'movie',
        venueName: result.title,
        venueDescription: result.overview,
        primaryImageUrl: result.posterUrl || result.backdropUrl,
        mediaUrls: result.posterUrl ? [{ url: result.posterUrl, type: 'image', source: 'tmdb' }] : [],
        rating: result.rating,
        releaseYear: result.releaseYear,
        director: result.director,
        cast: result.cast,
        genre: result.genres?.join(', '),
        runtime: result.runtime,
        enrichmentSource: 'tmdb',
        tmdbId: result.tmdbId,
        confirmedAt: new Date().toISOString(),
        streamingLinks: [
          { platform: 'TMDB', url: `https://www.themoviedb.org/${mediaType}/${result.tmdbId}` },
          { platform: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(result.title)}` },
          { platform: 'IMDB', url: `https://www.imdb.com/find?q=${encodeURIComponent(result.title)}` },
        ],
      };

      // Update entry
      entries[entryIndex] = {
        ...entries[entryIndex],
        webEnrichment: enrichment,
      };

      journalData[category] = entries;

      await storage.upsertUserPreferences(userId, {
        preferences: { ...prefs?.preferences, journalData },
      });

      console.log(`[CONFIRM MEDIA] Updated entry ${entryId} with user-confirmed TMDB data`);

      res.json({
        success: true,
        entry: entries[entryIndex],
        enrichment,
      });
    } catch (error) {
      console.error("[CONFIRM MEDIA] Error:", error);
      res.status(500).json({ error: "Failed to confirm media selection" });
    }
  });

  // ==========================================================================
  // PER-ELEMENT REFRESH - Refresh a single journal entry, not the whole category
  // This is used when the user clicks refresh on a specific item (e.g., one movie)
  // ==========================================================================
  app.post("/api/user/journal/web-enrich/single", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, entryIndex, entryId, entryText } = req.body;

      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      if (entryIndex === undefined && !entryId && !entryText) {
        return res
          .status(400)
          .json({
            error:
              "Either entryIndex, entryId, or entryText is required to identify the entry",
          });
      }

      console.log(
        `[JOURNAL SINGLE ENRICH] User ${userId} refreshing single entry in ${category}`,
      );

      // Get user's journal data from preferences (where it's actually stored)
      const prefs = await storage.getUserPreferences(userId);
      if (!prefs || !prefs.preferences?.journalData) {
        console.log(
          `[JOURNAL SINGLE ENRICH] No journal data found for user ${userId}`,
        );
        return res.json({
          success: false,
          error: "No journal entries found. Please add some entries first.",
        });
      }

      const journalData = prefs.preferences.journalData as Record<
        string,
        any[]
      >;
      const entries = journalData[category];

      if (!entries || !Array.isArray(entries)) {
        return res
          .status(404)
          .json({ error: `Category "${category}" not found` });
      }

      // Find the target entry by index, ID, or text
      let targetIndex = entryIndex !== undefined ? entryIndex : -1;

      if (targetIndex === -1 && entryId) {
        targetIndex = entries.findIndex((e: any) => e.id === entryId);
      }

      if (targetIndex === -1 && entryText) {
        targetIndex = entries.findIndex(
          (e: any) =>
            e.text === entryText ||
            e.text?.includes(entryText) ||
            entryText?.includes(e.text),
        );
      }

      if (targetIndex === -1 || targetIndex >= entries.length) {
        return res.status(404).json({ error: "Entry not found" });
      }

      const targetEntry = entries[targetIndex];
      console.log(
        `[JOURNAL SINGLE ENRICH] Found entry at index ${targetIndex}: "${targetEntry.text?.substring(0, 50)}..."`,
      );

      // For single entry refresh, try to infer year context from entry text
      // This enables year-aware TMDB searching even for individual refreshes
      const targetEntryText = targetEntry.text || "";
      const yearMatch = targetEntryText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const yearHint = parseInt(yearMatch[0]);
        console.log(
          `[JOURNAL SINGLE ENRICH] Extracted year hint: ${yearHint} from entry text`,
        );
        journalWebEnrichmentService.setBatchContext({
          contentType: category.toLowerCase().includes("movie")
            ? "movie"
            : category.toLowerCase().includes("tv")
              ? "tv_show"
              : "unknown",
          collectionDescription: targetEntryText,
          yearRange: { min: yearHint, max: yearHint },
        });
      }

      // Prepare entry for enrichment
      const entryForEnrichment = {
        id: targetEntry.id || `${category}-${targetIndex}`,
        text: targetEntry.text || "",
        category: category,
        venueName:
          targetEntry.venueName || targetEntry.title || targetEntry.name,
        location: targetEntry.location,
        existingEnrichment: undefined, // Force refresh by not passing existing enrichment
      };

      // Enrich this single entry (forceRefresh = true)
      const result = await journalWebEnrichmentService.enrichJournalEntry(
        entryForEnrichment,
        true,
      );

      // Clear batch context after single entry refresh
      journalWebEnrichmentService.clearBatchContext();

      if (result.success && result.enrichedData) {
        // Update the entry with new enrichment data
        entries[targetIndex] = {
          ...targetEntry,
          webEnrichment: result.enrichedData,
          primaryImageUrl:
            result.enrichedData.primaryImageUrl || targetEntry.primaryImageUrl,
          // Keep other existing fields
        };

        // Handle category change if suggested and different
        let categoryChanged = false;
        let newCategory = category;

        if (
          result.enrichedData.suggestedCategory &&
          result.enrichedData.suggestedCategory !== category &&
          result.enrichedData.categoryConfidence &&
          result.enrichedData.categoryConfidence > 0.7
        ) {
          newCategory = result.enrichedData.suggestedCategory;
          categoryChanged = true;

          console.log(
            `[JOURNAL SINGLE ENRICH] Category change suggested: ${category} -> ${newCategory}`,
          );

          // Move entry to the new category
          const updatedEntry = entries.splice(targetIndex, 1)[0];

          if (!journalData[newCategory]) {
            journalData[newCategory] = [];
          }
          journalData[newCategory].push(updatedEntry);
        }

        // Save the updated journal data to user preferences
        await storage.upsertUserPreferences(userId, {
          preferences: {
            ...prefs.preferences,
            journalData,
          },
        });

        console.log(
          `[JOURNAL SINGLE ENRICH] Successfully refreshed entry${categoryChanged ? ` (moved to ${newCategory})` : ""}`,
        );

        res.json({
          success: true,
          entryId: targetEntry.id,
          enrichedData: result.enrichedData,
          categoryChanged,
          oldCategory: category,
          newCategory,
          message: categoryChanged
            ? `Entry refreshed and moved to ${newCategory}`
            : "Entry refreshed successfully",
        });
      } else {
        console.log(
          `[JOURNAL SINGLE ENRICH] Enrichment failed: ${result.error}`,
        );
        // Return 200 with success: false so frontend can display specific error message
        res.json({
          success: false,
          error:
            result.error ||
            "Could not find matching information for this entry",
          entryId: targetEntry.id,
          entryText: targetEntry.text?.substring(0, 100),
        });
      }
    } catch (error) {
      console.error("[JOURNAL SINGLE ENRICH] Error:", error);
      // Return 200 with success: false for consistent error handling
      res.json({
        success: false,
        error: "Failed to refresh journal entry. Please try again.",
      });
    }
  });

  // Upload media for journal entries
  app.post(
    "/api/journal/upload",
    upload.array("media", 5),
    async (req: any, res) => {
      try {
        const userId = getUserId(req) || DEMO_USER_ID;

        // SECURITY: Block demo users from uploading media
        if (isDemoUser(userId)) {
          return res.status(403).json({
            error:
              "Demo users cannot upload media. Please sign in to continue.",
            requiresAuth: true,
          });
        }

        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        const mediaUrls = files.map((file) => ({
          url: `/attached_assets/journal_media/${file.filename}`,
          type: file.mimetype.startsWith("video/")
            ? ("video" as const)
            : ("image" as const),
          filename: file.filename,
        }));

        res.json({ success: true, media: mediaUrls });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to upload media" });
      }
    },
  );

  // AI-powered journal entry creation with keyword detection
  app.post("/api/journal/smart-entry", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // SECURITY: Block demo users from creating smart journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error:
            "Demo users cannot create journal entries. Please sign in to start journaling.",
          requiresAuth: true,
        });
      }

      const { text, media, keywords, activityId, linkedActivityTitle, mood } =
        req.body;

      if (!text) {
        return res.status(400).json({ error: "Text content required" });
      }

      // Import tag detection utilities
      const { detectCategoriesFromTags, normalizeCategoryName } = await import(
        "./config/journalTags.js"
      );

      // First, try tag-based detection (@vacation, @restaurants, etc.)
      const tagDetection = detectCategoriesFromTags(text);

      let detectedCategories: string[] = [];
      let detectedKeywords: string[] = tagDetection.detectedTags;
      let aiConfidence = 0.5;
      let isGroupedExperience = tagDetection.isGroupedExperience;

      // If tags found, use them with high confidence
      if (tagDetection.suggestedCategories.length > 0) {
        detectedCategories = tagDetection.suggestedCategories;
        aiConfidence = 0.95; // High confidence for explicit @tags
      } else if (tagDetection.detectedTags.length > 0) {
        // Tags detected but not recognized - route to Personal Notes
        detectedCategories = ["notes"];
        aiConfidence = 0.6; // Medium confidence for unrecognized tags
        console.log(
          `Unrecognized tags ${tagDetection.detectedTags.join(", ")} routed to notes category`,
        );
      } else {
        // No tags found at all, use AI to detect category
        const baseCategories = [
          "Restaurants & Food",
          "Movies & TV Shows",
          "Music & Artists",
          "Travel & Places",
          "Books & Reading",
          "Hobbies & Interests",
          "Personal Style",
          "Favorite Things",
          "Personal Notes",
        ];

        try {
          // Call OpenAI directly for category detection with JSON response
          const { openai } = await import("./services/aiService.js");
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a journal categorizer. Analyze the user's journal entry and suggest the best category. You can use one of these base categories: ${baseCategories.join(", ")}. Or create a NEW category if the content doesn't fit any base category well. 
                
Examples of new categories you might create:
- "Fitness & Workouts" for gym/exercise content
- "Cooking & Recipes" for food preparation
- "Photography" for photo-related content
- "Gaming" for video game content
- "Pets & Animals" for pet-related content
- "Career & Work" for professional content
- "Language Learning" for language study
- Any other category that fits the content

Respond with JSON: { "category": "Category Name", "confidence": 0.0-1.0, "keywords": ["detected", "keywords"] }`,
              },
              {
                role: "user",
                content: text,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
          });

          const categoryData = JSON.parse(
            response.choices[0]?.message?.content || "{}",
          );
          detectedCategories = [categoryData.category || "notes"];
          detectedKeywords = categoryData.keywords || [];
          aiConfidence = categoryData.confidence || 0.7;
        } catch (aiError) {
          console.error("AI category detection failed:", aiError);
          // Fall back to simple text analysis if AI fails
          detectedCategories = ["notes"];
          aiConfidence = 0.3;
        }
      }

      // Normalize all category names to IDs (convert "Personal Notes" -> "notes", etc.)
      const normalizedCategories = detectedCategories.map((cat) =>
        normalizeCategoryName(cat),
      );

      // Enrich entry with AI insights before saving
      let enrichedData: any = {};
      if (text && text.trim().length >= 10) {
        try {
          const primaryCategory = normalizedCategories[0] || "notes";
          enrichedData = await enrichJournalEntry(
            text,
            primaryCategory,
            detectedKeywords,
          );
          console.log(
            `[SMART ENTRY] Enriched with ${enrichedData.keywords.length} keywords, confidence: ${enrichedData.aiConfidence}`,
          );
        } catch (enrichError) {
          console.error(
            "[SMART ENTRY] Enrichment failed, continuing without enrichment:",
            enrichError,
          );
        }
      }

      // Add journal entries for each detected category (grouped experiences create multiple entries)
      for (const category of normalizedCategories) {
        await storage.addPersonalJournalEntry(userId, category, {
          text,
          media,
          keywords:
            enrichedData.keywords ||
            (detectedKeywords.length > 0 ? detectedKeywords : keywords),
          aiConfidence: enrichedData.aiConfidence || aiConfidence,
          activityId,
          linkedActivityTitle,
          mood,
          // Add enriched data
          ...(enrichedData.extractedData
            ? { extractedData: enrichedData.extractedData }
            : {}),
          ...(enrichedData.suggestions
            ? { suggestions: enrichedData.suggestions }
            : {}),
        });
      }

      // Invalidate user context cache to refresh personalization
      aiService.invalidateUserContext(userId);
      console.log(`[SMART ENTRY] Cache invalidated for user ${userId}`);

      res.json({
        success: true,
        categories: normalizedCategories,
        keywords: detectedKeywords,
        aiConfidence,
        isGroupedExperience,
      });
    } catch (error) {
      console.error("Smart entry error:", error);
      res.status(500).json({ error: "Failed to create journal entry" });
    }
  });

  // Update journal entry (link to activity, etc.)
  app.patch("/api/journal/entries/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // SECURITY: Block demo users from updating journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error:
            "Demo users cannot update journal entries. Please sign in to continue.",
          requiresAuth: true,
        });
      }

      const { activityId, linkedActivityTitle } = req.body;

      // Get current preferences
      const prefs = await storage.getPersonalJournalEntries(userId);
      if (!prefs || !prefs.preferences?.journalData) {
        return res.status(404).json({ error: "No journal entries found" });
      }

      // Find and update the entry across all categories
      let found = false;
      const journalData = prefs.preferences.journalData;

      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          const entryIndex = entries.findIndex((e: any) => e.id === entryId);
          if (entryIndex !== -1) {
            // Update the entry
            entries[entryIndex] = {
              ...entries[entryIndex],
              activityId,
              linkedActivityTitle,
            };

            // Save back to storage using updatePersonalJournalEntry
            await storage.updatePersonalJournalEntry(
              userId,
              category,
              entryId,
              {
                activityId,
                linkedActivityTitle,
              },
            );
            found = true;
            break;
          }
        }
      }

      if (!found) {
        return res.status(404).json({ error: "Journal entry not found" });
      }

      res.json({
        success: true,
        message: "Journal entry updated successfully",
      });
    } catch (error) {
      console.error("[JOURNAL] Update entry error:", error);
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  // Create activity with AI-generated tasks from a journal entry
  app.post(
    "/api/journal/entries/:entryId/create-activity",
    async (req, res) => {
      try {
        const { entryId } = req.params;
        const userId = getUserId(req) || DEMO_USER_ID;

        console.log(
          `[JOURNAL-TO-ACTIVITY] Creating activity from journal entry ${entryId} for user ${userId}`,
        );

        // Get the journal entry
        const prefs = await storage.getPersonalJournalEntries(userId);
        if (!prefs || !prefs.preferences?.journalData) {
          return res.status(404).json({ error: "No journal entries found" });
        }

        // Find the entry across all categories
        let foundEntry: any = null;
        let foundCategory: string = "";
        const journalData = prefs.preferences.journalData;

        for (const [category, entries] of Object.entries(journalData)) {
          if (Array.isArray(entries)) {
            const entry = entries.find((e: any) => e.id === entryId);
            if (entry) {
              foundEntry = entry;
              foundCategory = category;
              break;
            }
          }
        }

        if (!foundEntry) {
          return res.status(404).json({ error: "Journal entry not found" });
        }

        // Check if already linked to an activity
        if (foundEntry.activityId) {
          return res
            .status(400)
            .json({
              error: "This journal entry is already linked to an activity",
            });
        }

        const entryText = foundEntry.text || "";
        const entryNotes = foundEntry.notes || "";
        const fullContent = entryText + (entryNotes ? `\n\n${entryNotes}` : "");

        console.log(
          `[JOURNAL-TO-ACTIVITY] Processing text with AI: "${fullContent.substring(0, 100)}..."`,
        );

        // Use AI to break down the journal content into actionable tasks
        const goalResult = await aiService.processGoalIntoTasks(
          fullContent,
          "openai",
          userId,
        );

        // Generate a smart title from the AI result or entry text
        const title =
          goalResult.planTitle ||
          (entryText.length > 60
            ? entryText.substring(0, 57) + "..."
            : entryText.split("\n")[0] || "Untitled Activity");

        // Create the activity
        const activity = await storage.createActivity({
          userId,
          title,
          description: goalResult.summary || entryText,
          category: foundCategory,
          status: "planning",
          planSummary: goalResult.summary,
          estimatedTimeframe: goalResult.estimatedTimeframe,
          motivationalNote: goalResult.motivationalNote,
        });

        console.log(
          `[JOURNAL-TO-ACTIVITY] Created activity ${activity.id} with title: ${title}`,
        );

        // Create tasks from AI-generated breakdown
        const createdTasks = [];
        if (goalResult.tasks && goalResult.tasks.length > 0) {
          for (let i = 0; i < goalResult.tasks.length; i++) {
            const taskData = goalResult.tasks[i];
            // First create the task
            const task = await storage.createTask({
              title: taskData.title,
              description: taskData.description || "",
              category: foundCategory,
              priority: "medium",
              userId,
            });
            // Then link it to the activity
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
          console.log(
            `[JOURNAL-TO-ACTIVITY] Created ${createdTasks.length} tasks for activity ${activity.id}`,
          );
        } else {
          // If AI couldn't generate tasks, create a default task
          const defaultTask = await storage.createTask({
            title: "Complete: " + title,
            description: "Work on this item from your journal",
            category: foundCategory,
            priority: "medium",
            userId,
          });
          await storage.addTaskToActivity(activity.id, defaultTask.id, 0);
          createdTasks.push(defaultTask);
          console.log(
            `[JOURNAL-TO-ACTIVITY] Created default task for activity ${activity.id}`,
          );
        }

        // Link the journal entry to the activity
        await storage.updatePersonalJournalEntry(
          userId,
          foundCategory,
          entryId,
          {
            activityId: activity.id,
            linkedActivityTitle: title,
          },
        );

        console.log(
          `[JOURNAL-TO-ACTIVITY] Linked journal entry ${entryId} to activity ${activity.id}`,
        );

        res.json({
          success: true,
          activity: {
            ...activity,
            tasks: createdTasks,
          },
          tasksCreated: createdTasks.length,
        });
      } catch (error) {
        console.error("[JOURNAL-TO-ACTIVITY] Error:", error);
        res
          .status(500)
          .json({ error: "Failed to create activity from journal entry" });
      }
    },
  );

  // Create demo journal data (for testing enrichment)
  app.post("/api/journal/demo-data", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      console.log("[JOURNAL DEMO] Creating demo data for user:", userId);

      // Rich demo entries across all categories
      const demoEntries = {
        restaurants: [
          {
            id: `demo-${Date.now()}-1`,
            text: "Had an amazing dinner at Nobu Malibu tonight. The sunset views over the Pacific were breathtaking! We started with their signature black cod miso - absolutely melts in your mouth. The yellowtail jalapeño was perfectly balanced, and the rock shrimp tempura was crispy perfection. Total splurge at $$$$ but worth it for a special celebration. The ambiance was elegant yet relaxed, perfect for our anniversary.",
            timestamp: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 2 days ago
            mood: "great" as const,
          },
          {
            id: `demo-${Date.now()}-2`,
            text: "Quick lunch at Sweetgreen near the office. Got the harvest bowl with chicken - fresh, healthy, and under $15. Love how fast and convenient it is. Perfect for those busy workdays when you want something nutritious without the wait.",
            timestamp: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 5 days ago
            mood: "good" as const,
          },
        ],
        travel: [
          {
            id: `demo-${Date.now()}-3`,
            text: "Just got back from an incredible week in Tokyo! Stayed at a boutique hotel in Shibuya - loved the blend of modern design and traditional Japanese touches. Highlights: exploring Senso-ji Temple in Asakusa, getting lost in the backstreets of Shimokitazawa, and the mind-blowing sushi at Sukiyabashi Jiro (bucket list achieved!). Used the subway everywhere - so efficient. Already planning my next trip back to explore Kyoto and Osaka. This was the perfect mix of cultural immersion and urban adventure.",
            timestamp: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 10 days ago
            mood: "great" as const,
          },
        ],
        books: [
          {
            id: `demo-${Date.now()}-4`,
            text: "Finally finished 'Project Hail Mary' by Andy Weir. What a ride! The hard sci-fi mixed with humor reminded me why I love this genre. The friendship between Ryland and Rocky was unexpectedly touching. Perfect for my late-night reading sessions - couldn't put it down. 5/5 stars, would recommend to any sci-fi fan.",
            timestamp: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 7 days ago
            mood: "great" as const,
          },
        ],
        movies: [
          {
            id: `demo-${Date.now()}-5`,
            text: "Movie night with friends - we watched Everything Everywhere All at Once. Absolutely blown away by the creativity and emotional depth. Michelle Yeoh was phenomenal. The multiverse concept was executed perfectly, balancing comedy, action, and heartfelt family drama. We stayed up until 2am discussing the themes. Definitely one of the best films I've seen this year.",
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 3 days ago
            mood: "great" as const,
          },
        ],
        shopping: [
          {
            id: `demo-${Date.now()}-6`,
            text: "Treated myself to a new pair of Allbirds wool runners. I've been wanting minimalist, sustainable sneakers for a while. They're incredibly comfortable and go with everything in my wardrobe. Love the eco-friendly materials - feels good to support brands with values. Perfect for my casual, everyday style.",
            timestamp: new Date(
              Date.now() - 4 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 4 days ago
            mood: "good" as const,
          },
        ],
        notes: [
          {
            id: `demo-${Date.now()}-7`,
            text: "Reflecting on my goals for Q2. Want to focus more on health (commit to 3x week workouts), deepen relationships (plan monthly friend dinners), and make progress on learning Spanish. Feeling motivated but also need to be realistic about time. Work-life balance is the key.",
            timestamp: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 1 day ago
            mood: "good" as const,
          },
        ],
        "self-care": [
          {
            id: `demo-${Date.now()}-8`,
            text: "Started my Sunday with a 60-minute hot yoga class at CorePower. Felt amazing to stretch out all the tension from this week. Followed it up with a matcha latte and a face mask at home. Taking time for myself really resets my energy. Made me realize I need to prioritize these self-care rituals more often.",
            timestamp: new Date(
              Date.now() - 6 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 6 days ago
            mood: "great" as const,
          },
        ],
        work: [
          {
            id: `demo-${Date.now()}-9`,
            text: "Wrapped up the Q1 product launch presentation today. Spent weeks preparing the pitch deck, analyzing user data, and coordinating with engineering and design teams. The stakeholder meeting went really well - they loved the roadmap. Proud of how the team collaborated. Skills leveled up: public speaking, data visualization, cross-functional leadership.",
            timestamp: new Date(
              Date.now() - 8 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 8 days ago
            mood: "great" as const,
          },
        ],
        activities: [
          {
            id: `demo-${Date.now()}-10`,
            text: "Went on a challenging 10-mile hike up Runyon Canyon with my partner this morning. The views of LA from the top were worth every step! We brought snacks and just enjoyed the outdoors for 3 hours. Perfect moderate difficulty level - got our hearts pumping but still had energy to grab brunch after. Love these weekend adventures together.",
            timestamp: new Date(
              Date.now() - 9 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 9 days ago
            mood: "great" as const,
          },
          {
            id: `demo-${Date.now()}-11`,
            text: "Game night with the crew! Hosted at my place - we played Codenames and Catan until midnight. Everyone brought snacks and drinks. Such a fun, low-key way to spend Friday evening. Easy activity that brings people together. Already looking forward to next month's game night.",
            timestamp: new Date(
              Date.now() - 12 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 12 days ago
            mood: "great" as const,
          },
        ],
      };

      // Enrich each entry and save
      for (const [category, entries] of Object.entries(demoEntries)) {
        console.log(
          `[JOURNAL DEMO] Processing ${entries.length} entries for category: ${category}`,
        );

        for (const entry of entries) {
          try {
            // Enrich the entry with AI
            const enrichedData =
              await journalEnrichmentService.enrichJournalEntry(
                entry.text,
                category,
              );

            console.log(`[JOURNAL DEMO] Enriched entry for ${category}:`, {
              keywords: enrichedData.keywords,
              confidence: enrichedData.aiConfidence,
            });

            // Save the enriched entry
            await storage.addPersonalJournalEntry(userId, category, {
              ...entry,
              keywords: enrichedData.keywords,
              aiConfidence: enrichedData.aiConfidence,
            });
          } catch (error) {
            console.error(
              `[JOURNAL DEMO] Failed to enrich entry for ${category}:`,
              error,
            );
            // Save without enrichment if AI fails
            await storage.addPersonalJournalEntry(userId, category, entry);
          }
        }
      }

      // Invalidate cache to regenerate user context with new demo data
      aiService.invalidateUserContext(userId);
      console.log(
        "[JOURNAL DEMO] Cache invalidated, demo data created successfully",
      );

      res.json({
        success: true,
        message: "Demo journal data created with AI enrichment",
        entriesCreated: Object.values(demoEntries).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        categories: Object.keys(demoEntries),
      });
    } catch (error) {
      console.error("[JOURNAL DEMO] Error creating demo data:", error);
      res.status(500).json({ error: "Failed to create demo data" });
    }
  });

  // ===== EXPORT ENDPOINTS (PRO FEATURE) =====

  // CSV Export (Pro tier required)
  app.post("/api/export/csv", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { dataTypes, startDate, endDate } = req.body;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message: tierCheck.message,
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: "dataTypes array required" });
      }

      const csvRows: string[] = [];

      // Export Journal Entries
      if (dataTypes.includes("journal")) {
        const prefs = await storage.getPersonalJournalEntries(userId);
        if (prefs?.preferences?.journalData) {
          csvRows.push(
            "Type,Category,Text,Keywords,Timestamp,Activity ID,Activity Title,Mood",
          );

          const journalData = prefs.preferences.journalData;
          for (const [category, entries] of Object.entries(journalData)) {
            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                const timestamp = entry.timestamp || "";
                const text = (entry.text || "").replace(/"/g, '""');
                const keywords = Array.isArray(entry.keywords)
                  ? entry.keywords.join("; ")
                  : "";
                const activityId = entry.activityId || "";
                const activityTitle = entry.linkedActivityTitle || "";
                const mood = entry.mood || "";

                // Filter by date range if specified
                if (startDate || endDate) {
                  const entryDate = new Date(timestamp);
                  if (startDate && entryDate < new Date(startDate)) return;
                  if (endDate && entryDate > new Date(endDate)) return;
                }

                csvRows.push(
                  `"Journal","${category}","${text}","${keywords}","${timestamp}","${activityId}","${activityTitle}","${mood}"`,
                );
              });
            }
          }
        }
      }

      // Export Activities
      if (dataTypes.includes("activities")) {
        const activities = await storage.getUserActivities(userId);

        if (csvRows.length === 0) {
          csvRows.push(
            "Type,Title,Description,Category,Created At,Completed,Total Tasks,Completed Tasks",
          );
        }

        activities.forEach((activity: any) => {
          const createdAt = activity.createdAt || "";

          // Filter by date range
          if (startDate || endDate) {
            const activityDate = new Date(createdAt);
            if (startDate && activityDate < new Date(startDate)) return;
            if (endDate && activityDate > new Date(endDate)) return;
          }

          const title = (activity.title || "").replace(/"/g, '""');
          const description = (activity.description || "").replace(/"/g, '""');
          const category = activity.category || "";
          const completed = activity.completed ? "Yes" : "No";
          const totalTasks = activity.totalTasks || 0;
          const completedTasks = activity.completedTasks || 0;

          csvRows.push(
            `"Activity","${title}","${description}","${category}","${createdAt}","${completed}","${totalTasks}","${completedTasks}"`,
          );
        });
      }

      // Export Tasks
      if (dataTypes.includes("tasks")) {
        const tasks = await storage.getUserTasks(userId);

        if (csvRows.length === 0) {
          csvRows.push(
            "Type,Title,Description,Activity,Created At,Completed,Completed At,Priority",
          );
        }

        tasks.forEach((task: any) => {
          const createdAt = task.createdAt || "";

          // Filter by date range
          if (startDate || endDate) {
            const taskDate = task.completedAt
              ? new Date(task.completedAt)
              : new Date(createdAt);
            if (startDate && taskDate < new Date(startDate)) return;
            if (endDate && taskDate > new Date(endDate)) return;
          }

          const title = (task.title || "").replace(/"/g, '""');
          const description = (task.description || "").replace(/"/g, '""');
          const activityTitle = task.activityTitle || "";
          const completed = task.completed ? "Yes" : "No";
          const completedAt = task.completedAt || "";
          const priority = task.priority || "";

          csvRows.push(
            `"Task","${title}","${description}","${activityTitle}","${createdAt}","${completed}","${completedAt}","${priority}"`,
          );
        });
      }

      // Generate CSV string
      const csv = csvRows.join("\n");

      // Send CSV file
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="journalmate-export.csv"',
      );
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Excel Export (Pro tier required) - simplified using CSV format
  app.post("/api/export/excel", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { dataTypes, startDate, endDate } = req.body;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message: tierCheck.message,
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      // For now, Excel export uses the same CSV logic
      // TODO: Implement proper XLSX export with xlsx library
      if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: "dataTypes array required" });
      }

      const csvRows: string[] = [];

      // Export Journal Entries
      if (dataTypes.includes("journal")) {
        const prefs = await storage.getPersonalJournalEntries(userId);
        if (prefs?.preferences?.journalData) {
          csvRows.push(
            "Type,Category,Text,Keywords,Timestamp,Activity ID,Activity Title,Mood",
          );

          const journalData = prefs.preferences.journalData;
          for (const [category, entries] of Object.entries(journalData)) {
            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                const timestamp = entry.timestamp || "";
                const text = (entry.text || "").replace(/"/g, '""');
                const keywords = Array.isArray(entry.keywords)
                  ? entry.keywords.join("; ")
                  : "";
                const activityId = entry.activityId || "";
                const activityTitle = entry.linkedActivityTitle || "";
                const mood = entry.mood || "";

                if (startDate || endDate) {
                  const entryDate = new Date(timestamp);
                  if (startDate && entryDate < new Date(startDate)) return;
                  if (endDate && entryDate > new Date(endDate)) return;
                }

                csvRows.push(
                  `"Journal","${category}","${text}","${keywords}","${timestamp}","${activityId}","${activityTitle}","${mood}"`,
                );
              });
            }
          }
        }
      }

      // Export Activities
      if (dataTypes.includes("activities")) {
        const activities = await storage.getUserActivities(userId);

        if (csvRows.length === 0) {
          csvRows.push(
            "Type,Title,Description,Category,Created At,Completed,Total Tasks,Completed Tasks",
          );
        }

        activities.forEach((activity: any) => {
          const createdAt = activity.createdAt || "";

          if (startDate || endDate) {
            const activityDate = new Date(createdAt);
            if (startDate && activityDate < new Date(startDate)) return;
            if (endDate && activityDate > new Date(endDate)) return;
          }

          const title = (activity.title || "").replace(/"/g, '""');
          const description = (activity.description || "").replace(/"/g, '""');
          const category = activity.category || "";
          const completed = activity.completed ? "Yes" : "No";
          const totalTasks = activity.totalTasks || 0;
          const completedTasks = activity.completedTasks || 0;

          csvRows.push(
            `"Activity","${title}","${description}","${category}","${createdAt}","${completed}","${totalTasks}","${completedTasks}"`,
          );
        });
      }

      // Export Tasks
      if (dataTypes.includes("tasks")) {
        const tasks = await storage.getUserTasks(userId);

        if (csvRows.length === 0) {
          csvRows.push(
            "Type,Title,Description,Activity,Created At,Completed,Completed At,Priority",
          );
        }

        tasks.forEach((task: any) => {
          const createdAt = task.createdAt || "";

          if (startDate || endDate) {
            const taskDate = task.completedAt
              ? new Date(task.completedAt)
              : new Date(createdAt);
            if (startDate && taskDate < new Date(startDate)) return;
            if (endDate && taskDate > new Date(endDate)) return;
          }

          const title = (task.title || "").replace(/"/g, '""');
          const description = (task.description || "").replace(/"/g, '""');
          const activityTitle = task.activityTitle || "";
          const completed = task.completed ? "Yes" : "No";
          const completedAt = task.completedAt || "";
          const priority = task.priority || "";

          csvRows.push(
            `"Task","${title}","${description}","${activityTitle}","${createdAt}","${completed}","${completedAt}","${priority}"`,
          );
        });
      }

      // Generate CSV (will be read as Excel by most programs)
      const csv = csvRows.join("\n");

      // Send as CSV file with xlsx extension
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="journalmate-export.xlsx"',
      );
      res.send(csv);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // ===== INSIGHTS ANALYTICS ENDPOINT (PRO FEATURE) =====

  app.get("/api/insights", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message: tierCheck.message,
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      // Fetch user's data
      const tasks = await storage.getUserTasks(userId);
      const activities = await storage.getUserActivities(userId);
      const prefs = await storage.getUserPreferences(userId);

      // Get task reactions data
      const taskReactions = prefs?.preferences?.taskReactions || {};
      const allReactions: any[] = [];
      Object.values(taskReactions).forEach((dayReactions: any) => {
        if (Array.isArray(dayReactions)) {
          allReactions.push(...dayReactions);
        }
      });

      // Calculate completion rate
      const completedTasks = tasks.filter((t) => t.completed).length;
      const completionRate =
        tasks.length > 0
          ? Math.round((completedTasks / tasks.length) * 100)
          : 0;

      // Analyze mood trend from journal entries
      const journalData = prefs?.preferences?.journalData || {};
      let totalEntries = 0;
      let positiveEntries = 0;
      let negativeEntries = 0;

      Object.values(journalData).forEach((entries: any) => {
        if (Array.isArray(entries)) {
          entries.forEach((entry: any) => {
            totalEntries++;
            if (entry.mood === "great" || entry.mood === "good")
              positiveEntries++;
            if (entry.mood === "poor") negativeEntries++;
          });
        }
      });

      const moodTrend =
        positiveEntries > negativeEntries
          ? "improving"
          : positiveEntries === negativeEntries
            ? "stable"
            : "declining";

      // Find most loved categories (from reactions)
      const categoryLoves: { [key: string]: number } = {};
      allReactions.forEach((reaction: any) => {
        if (reaction.type === "superlike") {
          const task = tasks.find((t) => t.id === reaction.taskId);
          if (task && task.activityTitle) {
            categoryLoves[task.activityTitle] =
              (categoryLoves[task.activityTitle] || 0) + 1;
          }
        }
      });

      const mostLovedCategories = Object.entries(categoryLoves)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate weekly streak
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const recentTasks = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekStart;
      });

      const daysActive = new Set(
        recentTasks.map((t) => new Date(t.completedAt!).toDateString()),
      ).size;

      // Productivity pattern analysis
      const tasksByHour: { [hour: number]: number } = {};
      tasks.forEach((task) => {
        if (task.completedAt) {
          const hour = new Date(task.completedAt).getHours();
          tasksByHour[hour] = (tasksByHour[hour] || 0) + 1;
        }
      });

      const mostProductiveHour = Object.entries(tasksByHour).sort(
        (a, b) => b[1] - a[1],
      )[0];

      const productivityPattern = mostProductiveHour
        ? `You're most productive around ${mostProductiveHour[0]}:00 (${mostProductiveHour[1]} tasks completed).`
        : "Complete more tasks to discover your productivity pattern!";

      // Generate AI summary (simplified for now - can be enhanced with actual AI later)
      const aiSummary = `This week you completed ${recentTasks.length} tasks across ${activities.length} activities. Your completion rate is ${completionRate}%, which is ${completionRate >= 70 ? "excellent" : completionRate >= 50 ? "good" : "developing"}. ${
        mostLovedCategories[0]
          ? `You showed the most enthusiasm for "${mostLovedCategories[0].category}" with ${mostLovedCategories[0].count} superliked tasks.`
          : ""
      } ${
        moodTrend === "improving"
          ? "Your mood has been trending positively - keep up the great work!"
          : moodTrend === "declining"
            ? "Take some time for self-care and activities that bring you joy."
            : "Your mood has been steady. Consider trying new experiences for variety."
      }`;

      res.json({
        moodTrend,
        completionRate,
        mostLovedCategories,
        productivityPattern,
        weeklyStreak: daysActive,
        aiSummary,
        totalEntries,
        totalActivities: activities.length,
        totalTasksCompleted: completedTasks,
      });
    } catch (error) {
      console.error("Insights error:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // ===== SMART FAVORITES API (PRO FEATURE) =====

  // Get user's favorite activities with advanced filtering
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, search, sortBy } = req.query;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message: tierCheck.message,
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      // Get user preferences to find favorited activities
      const prefs = await storage.getUserPreferences(userId);
      const favorites = prefs?.preferences?.favorites || [];

      if (favorites.length === 0) {
        return res.json({ favorites: [] });
      }

      // Fetch all favorited activities
      const activities = await Promise.all(
        favorites.map(async (activityId: string) => {
          try {
            const activity = await storage.getActivity(activityId, userId);
            return activity;
          } catch {
            return null;
          }
        }),
      );

      let filteredActivities = activities.filter(Boolean);

      // Apply filters
      if (category && category !== "all") {
        filteredActivities = filteredActivities.filter(
          (a) => a.category === category,
        );
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredActivities = filteredActivities.filter(
          (a) =>
            a.title?.toLowerCase().includes(searchLower) ||
            a.description?.toLowerCase().includes(searchLower),
        );
      }

      // Apply sorting
      if (sortBy === "recent") {
        filteredActivities.sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
        );
      } else if (sortBy === "alpha") {
        filteredActivities.sort((a, b) => a.title!.localeCompare(b.title!));
      }

      res.json({ favorites: filteredActivities });
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // Add activity to favorites
  app.post("/api/favorites/:activityId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { activityId } = req.params;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, "pro");
      if (!tierCheck.allowed) {
        return res.status(403).json({
          error: "Subscription required",
          message: tierCheck.message,
          requiredTier: "pro",
          currentTier: tierCheck.tier,
        });
      }

      // Get current favorites
      const prefs = await storage.getUserPreferences(userId);
      const currentPrefs = prefs?.preferences || {};
      const favorites = currentPrefs.favorites || [];

      if (!favorites.includes(activityId)) {
        favorites.push(activityId);
        await storage.upsertUserPreferences(userId, {
          preferences: {
            ...currentPrefs,
            favorites,
          },
        });
      }

      res.json({ success: true, favorites });
    } catch (error) {
      console.error("Add favorite error:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // Remove activity from favorites
  app.delete("/api/favorites/:activityId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { activityId } = req.params;

      // Get current favorites
      const prefs = await storage.getUserPreferences(userId);
      const currentPrefs = prefs?.preferences || {};
      const favorites = (currentPrefs.favorites || []).filter(
        (id: string) => id !== activityId,
      );

      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          favorites,
        },
      });

      res.json({ success: true, favorites });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // ===== CONVERSATIONAL LIFESTYLE PLANNER API ENDPOINTS =====

  // Start a new lifestyle planning session
  app.post("/api/planner/session", async (req, res) => {
    try {
      const userId = getDemoUserId(req);

      // FIXED: Always complete old sessions and create fresh one
      // Mark ALL existing sessions as completed before creating new one
      const activeSession =
        await storage.getActiveLifestylePlannerSession(userId);
      if (activeSession) {
        console.log("[SESSION] Completing old session:", activeSession.id);
        await storage.updateLifestylePlannerSession(
          activeSession.id,
          {
            isComplete: true,
            sessionState: "completed",
          },
          userId,
        );
      }

      // Create fresh new session
      const session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: "intake",
        slots: {},
        externalContext: {},
        conversationHistory: [],
        isComplete: false,
      });

      console.log("[SESSION] Created fresh session:", session.id);

      res.json({
        session,
        message:
          "Hi! I'm here to help you plan something amazing. What would you like to do today?",
        isNewSession: true,
      });
    } catch (error) {
      console.error("Error creating planner session:", error);
      res.status(500).json({ error: "Failed to create planner session" });
    }
  });

  // Process a message in the conversation
  app.post("/api/planner/message", async (req, res) => {
    try {
      const userId = getDemoUserId(req);
      const { sessionId, message, mode, location } = req.body;
      // location: { latitude: number, longitude: number, city?: string } - optional GPS from device

      if (!sessionId || !message) {
        return res
          .status(400)
          .json({ error: "Session ID and message are required" });
      }

      // Get the session
      const session = await storage.getLifestylePlannerSession(
        sessionId,
        userId,
      );
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get user profile for context
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // ⚡ REDIRECT Quick Plan and Smart Plan to Simple Planner (no LangGraph!)
      if (mode === "quick" || mode === "smart") {
        console.log(
          `🔄 [REDIRECTING] ${mode.toUpperCase()} mode -> Simple Planner (bypassing LangGraph)`,
        );
        return await handleSimplePlanConversation(
          req,
          res,
          message,
          session.conversationHistory || [],
          userId,
          mode,
          location, // Pass GPS location for Gemini Maps grounding
        );
      }

      // HARDEN CONFIRMATION DETECTION for task generation
      const positiveConfirmationWords = [
        "\\byes\\b",
        "\\byep\\b",
        "\\byeah\\b",
        "\\bsounds good\\b",
        "\\bagree(d|s)?\\b",
        "\\bconfirm(ed)?\\b",
        "\\bi confirm\\b",
        "\\blooks good\\b",
        "\\bperfect\\b",
        "\\bgreat\\b",
        "\\bthat works\\b",
      ];
      const negativeWords = [
        "\\bno\\b",
        "\\bdon't\\b",
        "\\bwon't\\b",
        "\\bcancel\\b",
        "\\bstop\\b",
        "\\bnot now\\b",
        "\\bnot yet\\b",
      ];

      const userMessage = message.toLowerCase().trim();

      // Check for positive confirmation first when in confirming state
      const hasPositiveConfirmation = positiveConfirmationWords.some((word) =>
        new RegExp(word, "i").test(userMessage),
      );

      // Check for explicit negative responses
      const hasNegativeResponse = negativeWords.some((word) =>
        new RegExp(word, "i").test(userMessage),
      );

      // Set/clear confirmation flag based on user response in confirmation state
      if (session.sessionState === "confirming") {
        if (hasPositiveConfirmation) {
          session.userConfirmedAdd = true;
          console.log("User confirmed task generation:", userMessage);
        } else if (hasNegativeResponse) {
          session.userConfirmedAdd = false;
          console.log("User declined task generation:", userMessage);
        }
      }

      // Reset confirmation flag if starting new planning cycle
      if (
        session.sessionState === "intake" ||
        session.sessionState === "gathering"
      ) {
        session.userConfirmedAdd = false;
      }

      // Process the message with the lifestyle planner agent
      const response = await lifestylePlannerAgent.processMessage(
        message,
        session,
        user,
        mode,
        storage,
      );

      // Update conversation history
      const updatedHistory = [
        ...(session.conversationHistory || []),
        {
          role: "user" as const,
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant" as const,
          content: response.message,
          timestamp: new Date().toISOString(),
        },
      ];

      // Update the session with new state, conversation, and most importantly - the updated slots
      const updatedSession = await storage.updateLifestylePlannerSession(
        sessionId,
        {
          sessionState: response.sessionState,
          conversationHistory: updatedHistory,
          slots: response.updatedSlots || session.slots, // Persist extracted context!
          userConfirmedAdd: session.userConfirmedAdd, // Persist confirmation flag
          isComplete: response.sessionState === "completed",
          generatedPlan: response.generatedPlan,
        },
        userId,
      );

      res.json({
        ...response,
        session: updatedSession,
      });
    } catch (error) {
      console.error("Error processing planner message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Preview plan before generation
  app.post("/api/planner/preview", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const session = await storage.getLifestylePlannerSession(
        sessionId,
        userId,
      );
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate plan preview
      const slots = session.slots || {};
      const activityType = slots.activityType || "Lifestyle Activity";
      const location =
        slots.location?.destination ||
        slots.location?.current ||
        "Your location";
      const timing = slots.timing?.departureTime || slots.timing?.date || "TBD";
      const budget = slots.budget || "moderate";

      // Determine category for image search
      const category = slots.activityType?.toLowerCase().includes("date")
        ? "romance"
        : slots.activityType?.toLowerCase().includes("work")
          ? "work"
          : slots.activityType?.toLowerCase().includes("fitness")
            ? "wellness"
            : "adventure";

      // Fetch backdrop image based on activity and location (runs in parallel conceptually)
      const backdropUrl = await getActivityImage(
        `${activityType} ${location}`,
        category,
      );

      // Create preview structure
      const planPreview = {
        activity: {
          title: `${activityType} Plan`,
          description: `A personalized ${activityType.toLowerCase()} experience at ${location}`,
          category,
        },
        tasks: [
          {
            title: `Prepare for ${activityType}`,
            description: `Get ready with ${slots.outfit?.style || "appropriate attire"}, check weather and traffic`,
            priority: "high",
          },
          {
            title: `Travel to ${location}`,
            description: `Use ${slots.transportation || "preferred transportation"}, depart at ${timing}`,
            priority: "high",
          },
          {
            title: `Enjoy ${activityType}`,
            description: `Make the most of your experience, ${slots.mood ? `embrace the ${slots.mood} vibe` : "have fun"}`,
            priority: "medium",
          },
        ],
        backdropUrl,
        summary: `This plan includes preparation, travel, and the main activity. Estimated budget: ${budget}.`,
        estimatedTimeframe: slots.timing?.duration || "2-4 hours",
        motivationalNote:
          slots.mood === "romantic"
            ? "Create unforgettable memories together! ❤️"
            : slots.mood === "adventurous"
              ? "Get ready for an amazing adventure! 🚀"
              : "Enjoy every moment of this experience! ✨",
      };

      res.json({ planPreview });
    } catch (error) {
      console.error("Error previewing plan:", error);
      res.status(500).json({ error: "Failed to preview plan" });
    }
  });

  // Generate final plan
  app.post(
    "/api/planner/generate",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
        const { sessionId } = req.body;

        if (!sessionId) {
          return res.status(400).json({ error: "Session ID is required" });
        }

        const session = await storage.getLifestylePlannerSession(
          sessionId,
          userId,
        );
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        // STRICT SERVER-SIDE ENFORCEMENT: Check slot completeness and user confirmation
        const slots = session.slots || {};
        const missingRequiredSlots = [];

        // Check for essential slots
        if (!slots.activityType) missingRequiredSlots.push("activity type");
        if (!slots.location?.destination && !slots.location?.current)
          missingRequiredSlots.push("location");
        if (
          !slots.timing?.departureTime &&
          !slots.timing?.arrivalTime &&
          !slots.timing?.date
        )
          missingRequiredSlots.push("timing");
        if (!slots.budget) missingRequiredSlots.push("budget");

        // Return error if missing required context
        if (missingRequiredSlots.length > 0) {
          return res.status(400).json({
            error: "Incomplete context",
            message: `Missing required information: ${missingRequiredSlots.join(", ")}. Please provide these details before generating tasks.`,
            missingSlots: missingRequiredSlots,
          });
        }

        // Require user confirmation before generating tasks
        if (!session.userConfirmedAdd) {
          return res.status(400).json({
            error: "User confirmation required",
            message:
              "Please confirm that you want to add these tasks to your activity before generation can proceed.",
          });
        }

        // Generate activity and tasks from the session slots
        const activityType = slots.activityType || "Lifestyle Activity";
        const location =
          slots.location?.destination ||
          slots.location?.current ||
          "Your location";
        const timing =
          slots.timing?.departureTime ||
          slots.timing?.date ||
          new Date().toISOString();
        const budget = slots.budget || "moderate";

        // Determine category
        const category = slots.activityType?.toLowerCase().includes("date")
          ? "romance"
          : slots.activityType?.toLowerCase().includes("work")
            ? "work"
            : slots.activityType?.toLowerCase().includes("fitness")
              ? "wellness"
              : "adventure";

        // Create the Activity (this becomes the header on landing page)
        const activity = await storage.createActivity({
          userId,
          title: `${activityType} Plan`,
          description: `A personalized ${activityType.toLowerCase()} experience at ${location}. Budget: ${budget}`,
          category,
          status: "planning",
          startDate: timing,
          tags: [activityType, location, budget].filter(Boolean),
        });

        // Create the Tasks (these become the task details under the activity)
        const createdTasks = [];

        // Task 1: Preparation
        const prepTask = await storage.createTask({
          userId,
          title: `Prepare for ${activityType}`,
          description: `Get ready with ${slots.outfit?.style || "appropriate attire"}, check weather and traffic conditions`,
          category: "Preparation",
          priority: "high",
          timeEstimate: "30-45 min",
          activityId: activity.id,
        });
        createdTasks.push(prepTask);

        // Task 2: Travel
        const travelTask = await storage.createTask({
          userId,
          title: `Travel to ${location}`,
          description: `Use ${slots.transportation || "preferred transportation"}, depart at ${slots.timing?.departureTime || "planned time"}. Check traffic before leaving.`,
          category: "Travel",
          priority: "high",
          timeEstimate: slots.timing?.travelDuration || "30 min",
          activityId: activity.id,
        });
        createdTasks.push(travelTask);

        // Task 3: Main Activity
        const mainTask = await storage.createTask({
          userId,
          title: `Enjoy ${activityType}`,
          description: `Make the most of your experience${slots.mood ? `, embrace the ${slots.mood} vibe` : ""}. ${slots.companions ? `With ${slots.companions}` : ""}`,
          category: "Experience",
          priority: "medium",
          timeEstimate: slots.timing?.duration || "2-3 hours",
          activityId: activity.id,
        });
        createdTasks.push(mainTask);

        // Task 4: Post-activity (optional but nice)
        const followUpTask = await storage.createTask({
          userId,
          title: "Reflect and Share",
          description:
            "Take photos, share memories, and reflect on the experience",
          category: "Follow-up",
          priority: "low",
          timeEstimate: "15 min",
          activityId: activity.id,
        });
        createdTasks.push(followUpTask);

        // Link tasks to activity
        for (const task of createdTasks) {
          await storage.addTaskToActivity(
            activity.id,
            task.id,
            createdTasks.indexOf(task),
          );
        }

        // Prepare plan summary for session
        const generatedPlan = {
          activity: {
            id: activity.id,
            title: activity.title,
            description: activity.description,
            category: activity.category,
          },
          tasks: createdTasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
          })),
          summary: `Created activity "${activity.title}" with ${createdTasks.length} tasks`,
          estimatedTimeframe: slots.timing?.duration || "2-4 hours",
          motivationalNote:
            slots.mood === "romantic"
              ? "Create unforgettable memories together! ❤️"
              : slots.mood === "adventurous"
                ? "Get ready for an amazing adventure! 🚀"
                : "Enjoy every moment of this experience! ✨",
        };

        // Update session as completed
        const updatedSession = await storage.updateLifestylePlannerSession(
          sessionId,
          {
            sessionState: "completed",
            isComplete: true,
            generatedPlan,
          },
          userId,
        );

        res.json({
          activity,
          tasks: createdTasks,
          session: updatedSession,
          generatedPlan,
          message: formatActivitySuccessMessage(activity, "[TARGET_ICON]"),
        });
      } catch (error) {
        console.error("Error generating plan:", error);
        res.status(500).json({ error: "Failed to generate plan" });
      }
    },
  );

  // Get user's planner sessions
  app.get("/api/planner/sessions", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const sessions = await storage.getUserLifestylePlannerSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching planner sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // SIMPLIFIED: Direct plan generation - no questions, just generate!
  app.post(
    "/api/planner/direct-plan",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
        const { userInput, contentType, sessionId, isModification } = req.body;

        if (!userInput || typeof userInput !== "string") {
          return res.status(400).json({ error: "User input is required" });
        }

        // SECURITY: Block demo users from creating activities/tasks
        if (isDemoUser(userId)) {
          return res.status(403).json({
            error:
              "Demo users cannot create activities. Please sign in to save your plan.",
            requiresAuth: true,
            message: "Sign in to save your plan and track your progress!",
          });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Import direct plan generator
        const { directPlanGenerator } = await import(
          "./services/directPlanGenerator"
        );

        let existingPlan = null;

        // If this is a modification, get the existing plan from session
        if (isModification && sessionId) {
          const session = await storage.getLifestylePlannerSession(
            sessionId,
            userId,
          );
          if (session?.generatedPlan) {
            existingPlan = {
              activity: session.generatedPlan.activity,
              tasks: session.generatedPlan.tasks,
            };
          }
        }

        // Try to extract location from user input to query preferences
        let userPreferences = undefined;
        const locationPatterns = [
          /(?:trip to|visit(?:ing)?|going to|plan(?:ning)? for|in)\s+([A-Z][a-zA-Z\s,]+)/i,
          /\b(lagos|paris|london|dubai|new york|tokyo|marrakech|barcelona|rome|amsterdam|bali|la|los angeles|miami|nyc|sf|san francisco)\b/i,
        ];

        for (const pattern of locationPatterns) {
          const match = userInput.match(pattern);
          if (match) {
            const detectedCity = match[1].trim().replace(/,.*$/, "").trim();
            console.log(
              `[DIRECT PLAN] Detected destination: ${detectedCity}, checking for saved preferences...`,
            );

            try {
              const savedContent = await storage.getUserSavedContent(userId, {
                city: detectedCity,
                limit: 20,
              });

              if (savedContent.length > 0) {
                userPreferences = {
                  location: detectedCity,
                  savedItems: savedContent.length,
                  venues: savedContent.flatMap((item: any) =>
                    (item.venues || []).map((v: any) => ({
                      name: v.name,
                      type: v.type,
                      priceRange: v.priceRange,
                    })),
                  ),
                  categories: [
                    ...new Set(savedContent.map((item: any) => item.category)),
                  ] as string[],
                  budgetTiers: [
                    ...new Set(
                      savedContent
                        .filter((item: any) => item.budgetTier)
                        .map((item: any) => item.budgetTier),
                    ),
                  ] as string[],
                };
                console.log(
                  `[DIRECT PLAN] Found ${userPreferences.savedItems} saved items for ${detectedCity} with ${userPreferences.venues.length} venues`,
                );
              }
            } catch (prefsError) {
              console.warn(
                "[DIRECT PLAN] Error fetching preferences:",
                prefsError,
              );
            }
            break;
          }
        }

        // Generate plan directly - no questions!
        const plan = await directPlanGenerator.generatePlan(
          userInput,
          contentType || "text",
          user,
          existingPlan,
          userPreferences,
        );

        // Create or update session
        let session;
        if (sessionId) {
          // Update existing session
          session = await storage.updateLifestylePlannerSession(
            sessionId,
            {
              generatedPlan: plan,
              sessionState: "completed",
              conversationHistory: [
                ...((
                  await storage.getLifestylePlannerSession(sessionId, userId)
                )?.conversationHistory || []),
                {
                  role: "user",
                  content: userInput,
                  timestamp: new Date().toISOString(),
                },
                {
                  role: "assistant",
                  content: `Generated plan: ${plan.activity.title}`,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
            userId,
          );
        } else {
          // Create new session
          session = await storage.createLifestylePlannerSession({
            userId,
            sessionState: "completed",
            slots: {},
            conversationHistory: [
              {
                role: "user",
                content: userInput,
                timestamp: new Date().toISOString(),
              },
              {
                role: "assistant",
                content: `Generated plan: ${plan.activity.title}`,
                timestamp: new Date().toISOString(),
              },
            ],
            generatedPlan: plan,
          });
        }

        res.json({
          success: true,
          plan,
          session,
          message: isModification
            ? `Updated plan: ${plan.activity.title}`
            : `Generated plan: ${plan.activity.title} with ${plan.tasks.length} tasks`,
        });
      } catch (error) {
        console.error("Error generating direct plan:", error);

        // Handle guardrail rejection
        if (
          error instanceof Error &&
          error.message.startsWith("INPUT_NOT_PLAN_RELATED")
        ) {
          return res.status(400).json({
            error: "Not Plan-Related",
            message: error.message.replace("INPUT_NOT_PLAN_RELATED: ", ""),
            suggestion:
              'Try describing what you want to plan, organize, or accomplish. For example: "plan my weekend", "organize home office", or paste a list of tasks.',
          });
        }

        res.status(500).json({ error: "Failed to generate plan" });
      }
    },
  );

  // Upload and parse document content (for curated questions flow)
  // Supports PDF, Word, images, and text files
  app.post(
    "/api/upload/document",
    documentUpload.single("document"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const { documentParser } = await import("./services/documentParser");

        console.log(
          `[UPLOAD] Processing ${req.file.mimetype}: ${req.file.originalname}`,
        );

        // Parse the document using the document parser
        const result = await documentParser.parseFile(
          req.file.path,
          req.file.mimetype,
        );

        // Clean up the temp file after parsing
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("[UPLOAD] Failed to cleanup temp file:", cleanupError);
        }

        if (!result.success) {
          return res.status(400).json({
            error: result.error || "Failed to parse document",
          });
        }

        // Check if content is valid
        if (!result.content || result.content.length < 10) {
          return res.status(400).json({
            error:
              "The document appears to be empty or contains very little extractable text.",
          });
        }

        // Limit content length for AI processing
        const content = result.content.substring(0, 15000);

        res.json({
          success: true,
          content,
          filename: req.file.originalname,
          type: result.type,
          charCount: content.length,
          metadata: result.metadata,
        });
      } catch (error: any) {
        console.error("Document upload error:", error);
        res
          .status(500)
          .json({ error: `Failed to process document: ${error.message}` });
      }
    },
  );

  // Parse pasted LLM content into actionable tasks (OLD - keeping for backwards compatibility)
  // Parse URL and extract content - uses Tavily Extract API for JavaScript-rendered pages
  app.post("/api/parse-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(`[PARSE-URL] Extracting content from: ${url}`);
      let extractedContent = "";
      let resolvedUrl = url;

      // Detect video-based social media platforms
      const isVideoSocialMedia = (
        urlString: string,
      ): { isVideo: boolean; platform: string } => {
        const videoPatterns = [
          { pattern: /tiktok\.com/i, platform: "TikTok" },
          { pattern: /youtube\.com\/watch|youtu\.be\//i, platform: "YouTube" },
          { pattern: /instagram\.com\/(reel|p)\//i, platform: "Instagram" },
          {
            pattern: /twitter\.com\/.*\/status|x\.com\/.*\/status/i,
            platform: "X/Twitter",
          },
          { pattern: /facebook\.com\/.*\/videos/i, platform: "Facebook" },
          { pattern: /vimeo\.com/i, platform: "Vimeo" },
        ];

        for (const { pattern, platform } of videoPatterns) {
          if (pattern.test(urlString)) {
            return { isVideo: true, platform };
          }
        }
        return { isVideo: false, platform: "" };
      };

      // Resolve shortened URLs (like TikTok's t/ format)
      const resolveShortUrl = async (shortUrl: string): Promise<string> => {
        try {
          // Check if it's a shortened URL pattern
          const shortenedPatterns = [
            /tiktok\.com\/t\//i,
            /bit\.ly\//i,
            /t\.co\//i,
            /goo\.gl\//i,
            /ow\.ly\//i,
            /tiny\.cc\//i,
          ];

          const isShortened = shortenedPatterns.some((p) => p.test(shortUrl));
          if (!isShortened) return shortUrl;

          console.log(`[PARSE-URL] Resolving shortened URL: ${shortUrl}`);

          // Try HEAD first, fallback to GET (some servers block HEAD)
          let finalUrl = shortUrl;
          try {
            const headResponse = await fetch(shortUrl, {
              method: "HEAD",
              redirect: "follow",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            });
            finalUrl = headResponse.url || shortUrl;
          } catch (headError) {
            console.log(`[PARSE-URL] HEAD request failed, trying GET...`);
            // Fallback to GET request which follows redirects
            const getResponse = await fetch(shortUrl, {
              method: "GET",
              redirect: "follow",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            });
            finalUrl = getResponse.url || shortUrl;
          }

          console.log(`[PARSE-URL] Resolved to: ${finalUrl}`);
          return finalUrl;
        } catch (error) {
          console.log(
            `[PARSE-URL] Could not resolve shortened URL, using original`,
          );
          return shortUrl;
        }
      };

      // Resolve shortened URLs first
      resolvedUrl = await resolveShortUrl(url);

      // URL normalization helper for consistent cache keys
      const normalizeUrlForCache = (urlString: string): string => {
        try {
          const parsed = new URL(urlString);

          if (parsed.hostname.includes("instagram.com")) {
            const pathMatch = parsed.pathname.match(
              /\/(reel|p|stories)\/([^\/]+)/,
            );
            if (pathMatch) {
              return `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
            }
          }

          if (parsed.hostname.includes("tiktok.com")) {
            const pathMatch = parsed.pathname.match(/\/@[^\/]+\/video\/(\d+)/);
            if (pathMatch) {
              const username = parsed.pathname.split("/")[1];
              return `https://www.tiktok.com/${username}/video/${pathMatch[1]}`;
            }
          }

          if (
            parsed.hostname.includes("youtube.com") ||
            parsed.hostname.includes("youtu.be")
          ) {
            let videoId: string | null = null;
            if (parsed.hostname.includes("youtu.be")) {
              videoId = parsed.pathname.slice(1);
            } else if (parsed.pathname.includes("/shorts/")) {
              videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
            } else {
              videoId = parsed.searchParams.get("v");
            }
            if (videoId) {
              return `https://www.youtube.com/watch?v=${videoId}`;
            }
          }

          const paramsToRemove = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "fbclid",
            "gclid",
            "ref",
            "source",
            "igsh",
          ];
          paramsToRemove.forEach((param) => parsed.searchParams.delete(param));

          return parsed.toString();
        } catch {
          return urlString;
        }
      };

      // Check if it's a video-based social media platform
      const videoCheck = isVideoSocialMedia(resolvedUrl);
      if (videoCheck.isVideo) {
        console.log(
          `[PARSE-URL] Detected ${videoCheck.platform} video content`,
        );

        // For Instagram Reels and TikTok, use our full extraction pipeline (Apify → Whisper → OCR)
        const platform = socialMediaVideoService.detectPlatform(resolvedUrl);
        if (platform === "instagram" || platform === "tiktok") {
          const normalizedUrl = normalizeUrlForCache(resolvedUrl);
          console.log(`[PARSE-URL] Normalized URL for cache: ${normalizedUrl}`);

          // Step 1: CHECK CACHE FIRST - this is FREE and instant!
          try {
            const cached = await storage.getUrlContentCache(normalizedUrl);
            if (cached) {
              console.log(
                `[PARSE-URL] 💾 CACHE HIT! Returning ${cached.wordCount} words (source: ${cached.extractionSource})`,
              );
              return res.json({
                content: cached.extractedContent,
                isVideoContent: true,
                platform: videoCheck.platform,
                resolvedUrl: resolvedUrl,
                fromCache: true,
                firstImageUrl: cached.metadata?.firstImageUrl,
                metadata: cached.metadata || {},
              });
            }
            console.log(
              `[PARSE-URL] Cache MISS for ${normalizedUrl} - will extract fresh`,
            );
          } catch (cacheError) {
            console.warn("[PARSE-URL] Cache lookup failed:", cacheError);
          }

          // Step 2: Extract fresh content via Apify/Whisper/OCR
          console.log(
            `[PARSE-URL] Using socialMediaVideoService for ${platform} (Apify → Whisper → OCR)`,
          );

          // Strip query parameters from Instagram URLs (e.g., ?igsh=) before extraction
          let cleanUrl = resolvedUrl;
          if (resolvedUrl.includes("instagram.com")) {
            try {
              const urlObj = new URL(resolvedUrl);
              urlObj.search = ""; // Remove all query parameters like ?igsh=
              cleanUrl = urlObj.toString();
              if (cleanUrl !== resolvedUrl) {
                console.log(
                  `[PARSE-URL] Stripped Instagram query params: ${resolvedUrl} → ${cleanUrl}`,
                );
              }
            } catch (e) {
              // Keep original URL if parsing fails
            }
          }

          try {
            const socialResult =
              await socialMediaVideoService.extractContent(cleanUrl);

            if (socialResult.success) {
              const combinedContent =
                socialMediaVideoService.combineExtractedContent(socialResult);
              console.log(
                `[PARSE-URL] Full extraction complete: ${combinedContent.length} chars`,
              );

              // Step 3: CACHE the successful extraction for future use (including firstImageUrl)
              try {
                const wordCount = combinedContent.split(/\s+/).length;
                const firstImgUrl =
                  socialResult.firstImageUrl ||
                  socialResult.metadata?.firstImageUrl;
                await storage.createUrlContentCache({
                  normalizedUrl,
                  originalUrl: resolvedUrl,
                  platform: platform,
                  extractedContent: combinedContent,
                  extractionSource: "social_media_service",
                  wordCount,
                  metadata: {
                    hasAudioTranscript: !!socialResult.audioTranscript,
                    hasOcrText: !!socialResult.ocrText,
                    hasCaption: !!socialResult.caption,
                    author: socialResult.metadata?.author,
                    firstImageUrl: firstImgUrl,
                  },
                });
                console.log(
                  `[PARSE-URL] ✅ Cached content for future use: ${normalizedUrl} (${wordCount} words)`,
                );
              } catch (cacheError) {
                console.warn(
                  "[PARSE-URL] Failed to cache extraction:",
                  cacheError,
                );
              }

              return res.json({
                content: combinedContent,
                isVideoContent: true,
                platform: videoCheck.platform,
                resolvedUrl: resolvedUrl,
                fromCache: false,
                firstImageUrl:
                  socialResult.firstImageUrl ||
                  socialResult.metadata?.firstImageUrl,
                metadata: {
                  hasAudioTranscript: !!socialResult.audioTranscript,
                  hasOcrText: !!socialResult.ocrText,
                  hasCaption: !!socialResult.caption,
                  author: socialResult.metadata?.author,
                  firstImageUrl: socialResult.firstImageUrl,
                },
              });
            } else {
              console.log(
                `[PARSE-URL] Social media extraction failed: ${socialResult.error}`,
              );
            }
          } catch (e: any) {
            console.log(
              `[PARSE-URL] Social media extraction error: ${e.message}`,
            );
          }
        }

        // Fallback to Tavily for other video platforms or if social media extraction failed
        if (isTavilyConfigured()) {
          try {
            console.log(
              `[PARSE-URL] Attempting to extract ${videoCheck.platform} metadata with Tavily...`,
            );
            const tavilyResponse = await tavilyExtract([resolvedUrl], {
              extractDepth: "advanced",
            });

            if (
              tavilyResponse.results &&
              tavilyResponse.results.length > 0 &&
              tavilyResponse.results[0].rawContent
            ) {
              extractedContent = tavilyResponse.results[0].rawContent;
              console.log(
                `[PARSE-URL] Extracted ${extractedContent.length} chars from ${videoCheck.platform}`,
              );
            }
          } catch (e) {
            console.log(
              `[PARSE-URL] Tavily extraction failed for ${videoCheck.platform}`,
            );
          }
        }

        // If we couldn't extract meaningful content, provide helpful guidance
        if (!extractedContent || extractedContent.length < 50) {
          const guidance = `[${videoCheck.platform} Video Content]\n\nThis appears to be a ${videoCheck.platform} video. Video content cannot be directly extracted.\n\nTo create a plan from this video, please:\n1. Describe what the video is about\n2. Share the key points or ideas from the video\n3. Tell us what aspect you want to turn into an actionable plan\n\nFor example: "The video shows a 5-day Marrakech travel itinerary with visits to the Medina, Jardin Majorelle, and local food tours. I want to recreate this trip."`;

          return res.json({
            content: guidance,
            isVideoContent: true,
            platform: videoCheck.platform,
            resolvedUrl: resolvedUrl,
            guidance: guidance,
          });
        }
      }

      // Try Tavily Extract first (handles JavaScript-rendered pages like Copilot, SPAs, etc.)
      if (!extractedContent && isTavilyConfigured()) {
        try {
          console.log(
            `[PARSE-URL] Using Tavily Extract with advanced depth...`,
          );
          const tavilyResponse = await tavilyExtract([resolvedUrl], {
            extractDepth: "advanced", // Execute JavaScript, handle anti-bot measures
          });

          if (
            tavilyResponse.results &&
            tavilyResponse.results.length > 0 &&
            tavilyResponse.results[0].rawContent
          ) {
            extractedContent = tavilyResponse.results[0].rawContent;
            console.log(
              `[PARSE-URL] Tavily extracted ${extractedContent.length} chars successfully`,
            );
          } else if (
            tavilyResponse.failedResults &&
            tavilyResponse.failedResults.length > 0
          ) {
            console.log(
              `[PARSE-URL] Tavily failed: ${tavilyResponse.failedResults[0]}, falling back to basic fetch`,
            );
          }
        } catch (tavilyError: any) {
          console.log(
            `[PARSE-URL] Tavily error: ${tavilyError.message}, falling back to basic fetch`,
          );
        }
      }

      // Fallback to basic fetch if Tavily didn't work
      if (!extractedContent) {
        console.log(`[PARSE-URL] Using basic fetch fallback...`);
        const response = await fetch(resolvedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!response.ok) {
          return res
            .status(400)
            .json({ error: `Failed to fetch URL: ${response.statusText}` });
        }

        const html = await response.text();

        // Extract text content: remove scripts, styles, and HTML tags
        extractedContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        console.log(
          `[PARSE-URL] Basic fetch extracted ${extractedContent.length} chars`,
        );
      }

      // Limit content to 15000 characters (increased for better context)
      extractedContent = extractedContent.substring(0, 15000);

      res.json({ content: extractedContent, resolvedUrl });
    } catch (error: any) {
      console.error(`[PARSE-URL] Error: ${error.message}`);
      res.status(500).json({ error: `Failed to parse URL: ${error.message}` });
    }
  });

  // Helper functions for URL prefetching (shared with /api/parse-url)
  const normalizeUrlForCachePrefetch = (urlString: string): string => {
    try {
      const parsed = new URL(urlString);

      if (parsed.hostname.includes("instagram.com")) {
        const pathMatch = parsed.pathname.match(/\/(reel|p|stories)\/([^\/]+)/);
        if (pathMatch) {
          return `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
        }
      }

      if (parsed.hostname.includes("tiktok.com")) {
        const pathMatch = parsed.pathname.match(/\/@[^\/]+\/video\/(\d+)/);
        if (pathMatch) {
          const username = parsed.pathname.split("/")[1];
          return `https://www.tiktok.com/${username}/video/${pathMatch[1]}`;
        }
      }

      if (
        parsed.hostname.includes("youtube.com") ||
        parsed.hostname.includes("youtu.be")
      ) {
        let videoId: string | null = null;
        if (parsed.hostname.includes("youtu.be")) {
          videoId = parsed.pathname.slice(1);
        } else if (parsed.pathname.includes("/shorts/")) {
          videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        } else {
          videoId = parsed.searchParams.get("v");
        }
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }

      const paramsToRemove = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "fbclid",
        "gclid",
        "ref",
        "source",
        "igsh",
      ];
      paramsToRemove.forEach((param) => parsed.searchParams.delete(param));

      return parsed.toString();
    } catch {
      return urlString;
    }
  };

  const resolveShortUrlPrefetch = async (shortUrl: string): Promise<string> => {
    try {
      const shortenedPatterns = [
        /tiktok\.com\/t\//i,
        /bit\.ly\//i,
        /t\.co\//i,
        /goo\.gl\//i,
        /ow\.ly\//i,
        /tiny\.cc\//i,
      ];

      const isShortened = shortenedPatterns.some((p) => p.test(shortUrl));
      if (!isShortened) return shortUrl;

      let finalUrl = shortUrl;
      try {
        const headResponse = await fetch(shortUrl, {
          method: "HEAD",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        finalUrl = headResponse.url || shortUrl;
      } catch {
        const getResponse = await fetch(shortUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        finalUrl = getResponse.url || shortUrl;
      }

      return finalUrl;
    } catch {
      return shortUrl;
    }
  };

  const isSocialMediaUrl = (urlString: string): boolean => {
    const patterns = [
      /tiktok\.com/i,
      /instagram\.com\/(reel|p)\//i,
      /youtube\.com\/watch|youtu\.be\//i,
      /youtube\.com\/shorts\//i,
    ];
    return patterns.some((p) => p.test(urlString));
  };

  // In-memory prefetch status tracking
  const prefetchStatus = new Map<
    string,
    {
      status: "pending" | "processing" | "complete" | "error";
      progress: number;
      startedAt: number;
      error?: string;
    }
  >();

  // Cleanup old prefetch status entries every 10 minutes
  setInterval(
    () => {
      const now = Date.now();
      const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
      prefetchStatus.forEach((value, key) => {
        if (now - value.startedAt > MAX_AGE_MS) {
          prefetchStatus.delete(key);
        }
      });
    },
    10 * 60 * 1000,
  );

  /**
   * Fire-and-forget prefetch endpoint
   * Native apps call this immediately when a URL is shared (before WebView loads)
   * Returns immediately, processes in background
   */
  app.post("/api/parse-url/prefetch", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check if it's a social media URL worth prefetching
    if (!isSocialMediaUrl(url)) {
      return res.json({ status: "skipped", reason: "not_social_media", url });
    }

    console.log(`[PREFETCH] Received prefetch request for: ${url}`);

    // Return immediately - don't wait for extraction
    res.json({ status: "prefetching", url });

    // Process in background (non-blocking)
    setImmediate(async () => {
      try {
        // Resolve shortened URLs
        const resolvedUrl = await resolveShortUrlPrefetch(url);
        const normalizedUrl = normalizeUrlForCachePrefetch(resolvedUrl);

        // Update status
        prefetchStatus.set(normalizedUrl, {
          status: "processing",
          progress: 10,
          startedAt: Date.now(),
        });

        // Check cache first
        const cached = await storage.getUrlContentCache(normalizedUrl);
        if (cached) {
          console.log(`[PREFETCH] Cache hit for ${url}, no extraction needed`);
          prefetchStatus.set(normalizedUrl, {
            status: "complete",
            progress: 100,
            startedAt: Date.now(),
          });
          return;
        }

        console.log(
          `[PREFETCH] Starting background extraction for: ${resolvedUrl}`,
        );
        prefetchStatus.set(normalizedUrl, {
          status: "processing",
          progress: 20,
          startedAt: Date.now(),
        });

        // Run full extraction
        const platform = socialMediaVideoService.detectPlatform(resolvedUrl);
        if (!platform) {
          prefetchStatus.set(normalizedUrl, {
            status: "error",
            progress: 0,
            startedAt: Date.now(),
            error: "unsupported_platform",
          });
          return;
        }

        prefetchStatus.set(normalizedUrl, {
          status: "processing",
          progress: 30,
          startedAt: Date.now(),
        });

        const socialResult =
          await socialMediaVideoService.extractContent(resolvedUrl);

        if (socialResult.success) {
          const combinedContent =
            socialMediaVideoService.combineExtractedContent(socialResult);

          // Cache the result
          const wordCount = combinedContent.split(/\s+/).length;

          await storage.createUrlContentCache({
            normalizedUrl,
            originalUrl: resolvedUrl,
            platform: platform,
            extractedContent: combinedContent,
            extractionSource: "prefetch",
            wordCount,
            metadata: {
              hasAudioTranscript: !!socialResult.audioTranscript,
              hasOcrText: !!socialResult.ocrText,
              caption: socialResult.caption || undefined,
              author: socialResult.metadata?.author,
              carouselItemCount: socialResult.carouselItems?.length,
            },
          });

          prefetchStatus.set(normalizedUrl, {
            status: "complete",
            progress: 100,
            startedAt: Date.now(),
          });

          console.log(
            `[PREFETCH] ✅ Prefetch complete for ${url} (${wordCount} words cached)`,
          );
        } else {
          prefetchStatus.set(normalizedUrl, {
            status: "error",
            progress: 0,
            startedAt: Date.now(),
            error: socialResult.error || "extraction_failed",
          });
          console.log(
            `[PREFETCH] ❌ Prefetch failed for ${url}: ${socialResult.error}`,
          );
        }
      } catch (err: any) {
        console.error("[PREFETCH] Background extraction error:", err.message);
        try {
          const resolvedUrl = await resolveShortUrlPrefetch(url);
          const normalizedUrl = normalizeUrlForCachePrefetch(resolvedUrl);
          prefetchStatus.set(normalizedUrl, {
            status: "error",
            progress: 0,
            startedAt: Date.now(),
            error: err.message,
          });
        } catch {}
      }
    });
  });

  /**
   * SSE streaming endpoint for prefetch progress
   * Frontend uses this to show progress bar while URL is being extracted
   */
  app.get("/api/parse-url/prefetch-stream", async (req, res) => {
    const { url } = req.query as { url: string };

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    const sendProgress = (
      progress: number,
      status?: string,
      error?: string,
    ) => {
      res.write(`data: ${JSON.stringify({ progress, status, error })}\n\n`);
    };

    try {
      // Resolve and normalize URL
      const resolvedUrl = await resolveShortUrlPrefetch(url);
      const normalizedUrl = normalizeUrlForCachePrefetch(resolvedUrl);

      // Check if already cached (instant completion)
      const cached = await storage.getUrlContentCache(normalizedUrl);
      if (cached) {
        sendProgress(100, "complete");
        return res.end();
      }

      // Check current prefetch status
      const currentStatus = prefetchStatus.get(normalizedUrl);
      if (currentStatus) {
        if (currentStatus.status === "complete") {
          sendProgress(100, "complete");
          return res.end();
        }
        if (currentStatus.status === "error") {
          sendProgress(0, "error", currentStatus.error);
          return res.end();
        }
        // Already processing - send current progress
        sendProgress(currentStatus.progress, "processing");
      } else {
        // Not started - trigger prefetch
        sendProgress(5, "starting");

        // Fire prefetch in background
        fetch(`${req.protocol}://${req.get("host")}/api/parse-url/prefetch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }).catch(() => {});
      }

      // Poll for updates every 500ms (max 2 minutes)
      let pollCount = 0;
      const maxPolls = 240; // 2 minutes at 500ms intervals

      const pollInterval = setInterval(async () => {
        pollCount++;

        // Check cache (extraction may have completed)
        const nowCached = await storage.getUrlContentCache(normalizedUrl);
        if (nowCached) {
          sendProgress(100, "complete");
          clearInterval(pollInterval);
          return res.end();
        }

        // Check status
        const status = prefetchStatus.get(normalizedUrl);
        if (status) {
          sendProgress(status.progress, status.status, status.error);

          if (status.status === "complete" || status.status === "error") {
            clearInterval(pollInterval);
            return res.end();
          }
        }

        // Timeout after max polls
        if (pollCount >= maxPolls) {
          sendProgress(0, "timeout");
          clearInterval(pollInterval);
          return res.end();
        }
      }, 500);

      // Handle client disconnect
      req.on("close", () => {
        clearInterval(pollInterval);
      });
    } catch (err: any) {
      sendProgress(0, "error", err.message);
      res.end();
    }
  });

  /**
   * Check prefetch status (simple polling alternative to SSE)
   */
  app.get("/api/parse-url/prefetch-status", async (req, res) => {
    const { url } = req.query as { url: string };

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const resolvedUrl = await resolveShortUrlPrefetch(url);
      const normalizedUrl = normalizeUrlForCachePrefetch(resolvedUrl);

      // Check cache first
      const cached = await storage.getUrlContentCache(normalizedUrl);
      if (cached) {
        return res.json({
          status: "complete",
          progress: 100,
          cached: true,
          wordCount: cached.wordCount,
        });
      }

      // Check prefetch status
      const status = prefetchStatus.get(normalizedUrl);
      if (status) {
        return res.json({
          status: status.status,
          progress: status.progress,
          error: status.error,
        });
      }

      // Not started
      return res.json({ status: "not_started", progress: 0 });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post(
    "/api/planner/orchestrate-sources",
    documentUpload.array("files", 10),
    async (req: any, res) => {
      const cleanupFiles = () => {
        if (req.files) {
          req.files.forEach((file: any) => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (e) {}
          });
        }
      };

      try {
        const userId = getUserId(req) || DEMO_USER_ID;
        const { urls, textContent, userGoal } = req.body;

        console.log(
          `[ORCHESTRATE] User ${userId} submitted multi-source request`,
        );

        const { contentOrchestrator } = await import(
          "./services/contentOrchestrator"
        );

        const sources: Array<{
          id: string;
          type: "url" | "file" | "text";
          source: string;
          mimeType?: string;
          filePath?: string;
          originalName?: string;
        }> = [];

        if (urls) {
          let urlList: string[] = [];
          if (Array.isArray(urls)) {
            urlList = urls;
          } else if (typeof urls === "string") {
            try {
              urlList = JSON.parse(urls);
            } catch {
              urlList = [urls];
            }
          }
          urlList.forEach((url: string, i: number) => {
            if (typeof url === "string" && url.trim()) {
              sources.push({
                id: `url-${i}`,
                type: "url",
                source: url.trim(),
              });
            }
          });
        }

        if (req.files && req.files.length > 0) {
          req.files.forEach((file: any, i: number) => {
            sources.push({
              id: `file-${i}`,
              type: "file",
              source: file.originalname,
              mimeType: file.mimetype,
              filePath: file.path,
              originalName: file.originalname,
            });
          });
        }

        if (
          textContent &&
          typeof textContent === "string" &&
          textContent.trim()
        ) {
          sources.push({
            id: "text-0",
            type: "text",
            source: textContent.trim(),
          });
        }

        if (sources.length === 0) {
          cleanupFiles();
          return res
            .status(400)
            .json({
              error:
                "At least one content source is required (URL, file, or text)",
            });
        }

        console.log(`[ORCHESTRATE] Processing ${sources.length} sources`);

        let orchestratorResult;
        try {
          orchestratorResult =
            await contentOrchestrator.parseMultipleSources(sources);
        } finally {
          cleanupFiles();
        }

        if (!orchestratorResult.success) {
          return res.status(400).json({
            error:
              orchestratorResult.error || "Failed to process content sources",
            sources: orchestratorResult.sources,
          });
        }

        let plan = null;
        if (userGoal) {
          try {
            plan = await contentOrchestrator.generateUnifiedPlan(
              orchestratorResult,
              userGoal,
            );
          } catch (planError: any) {
            console.error(
              "[ORCHESTRATE] Plan generation failed:",
              planError.message,
            );
          }
        }

        res.json({
          success: true,
          sources: orchestratorResult.sources,
          unifiedContent: orchestratorResult.unifiedContent,
          extractedVenues: orchestratorResult.extractedVenues,
          extractedLocations: orchestratorResult.extractedLocations,
          suggestedCategory: orchestratorResult.suggestedCategory,
          plan,
        });
      } catch (error: any) {
        console.error("[ORCHESTRATE] Error:", error);
        res
          .status(500)
          .json({
            error: error.message || "Failed to orchestrate content sources",
          });
      }
    },
  );

  app.post("/api/planner/parse-llm-content", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const { pastedContent, precedingContext, contentType } = req.body;

      if (!pastedContent || typeof pastedContent !== "string") {
        return res.status(400).json({ error: "Pasted content is required" });
      }

      // Validate contentType
      const validContentType = contentType === "image" ? "image" : "text";

      // Parse the LLM content into an activity with tasks (supports both text and images)
      const parsed = await aiService.parsePastedLLMContent(
        pastedContent,
        precedingContext || "",
        userId,
        validContentType,
      );

      res.json({
        success: true,
        parsed,
      });
    } catch (error) {
      console.error("Error parsing LLM content:", error);
      res.status(500).json({ error: "Failed to parse LLM content" });
    }
  });

  // Generate curated questions from external content (URL/document) for Smart/Quick Plan
  app.post("/api/planner/generate-curated-questions", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const { externalContent, mode } = req.body;

      if (!externalContent || typeof externalContent !== "string") {
        return res.status(400).json({ error: "External content is required" });
      }

      const validMode = mode === "quick" ? "quick" : "smart";

      // Generate curated questions based on content + user profile
      const result = await aiService.generateCuratedQuestions(
        externalContent,
        userId,
        validMode,
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error generating curated questions:", error);
      res.status(500).json({ error: "Failed to generate curated questions" });
    }
  });

  // Generate personalized plan from external content + user answers
  app.post("/api/planner/generate-plan-from-content", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const { externalContent, userAnswers, mode, sourceUrl } = req.body;

      if (!externalContent || typeof externalContent !== "string") {
        return res.status(400).json({ error: "External content is required" });
      }

      if (!userAnswers || typeof userAnswers !== "object") {
        return res.status(400).json({ error: "User answers are required" });
      }

      // SECURITY: Block demo users from creating activities/tasks
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error:
            "Demo users cannot create activities. Please sign in to save your plan.",
          requiresAuth: true,
          message: "Sign in to save your plan and track your progress!",
        });
      }

      const validMode = mode === "quick" ? "quick" : "smart";

      // Generate personalized plan from content + answers
      const planResult = await aiService.generatePlanFromExternalContent(
        externalContent,
        userAnswers,
        userId,
        validMode,
      );

      // Check if source is a social media URL
      const isSocialMedia =
        sourceUrl &&
        typeof sourceUrl === "string" &&
        /instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(sourceUrl);

      // Build activity description including source URL if from social media
      let activityDescription = planResult.summary || "Generated plan";
      if (isSocialMedia) {
        const platform = sourceUrl.includes("instagram")
          ? "Instagram"
          : sourceUrl.includes("tiktok")
            ? "TikTok"
            : sourceUrl.includes("youtube") || sourceUrl.includes("youtu.be")
              ? "YouTube"
              : "Social Media";
        activityDescription = `${activityDescription}\n\nSource: ${platform} - ${sourceUrl}`;
      }

      // Normalize category to standard JournalCategoryId (restaurants, movies, music, books, hobbies, travel, style, favorites, notes)
      const rawCategory = planResult.goalCategory || "personal";
      const normalizedCategory =
        mapToStandardCategoryId(rawCategory) || rawCategory;

      // Create activity and tasks
      const activity = await storage.createActivity({
        title: planResult.planTitle || "Plan from External Content",
        description: activityDescription,
        category: normalizedCategory,
        status: "planning",
        userId,
        planSummary: planResult.summary || undefined,
      });

      // Create tasks with normalized categories
      const createdTasks = [];
      if (planResult.tasks && Array.isArray(planResult.tasks)) {
        for (let i = 0; i < planResult.tasks.length; i++) {
          const taskData = planResult.tasks[i];
          // Normalize task category
          const taskRawCategory = taskData.category || normalizedCategory;
          const taskNormalizedCategory =
            mapToStandardCategoryId(taskRawCategory) || taskRawCategory;

          const task = await storage.createTask({
            title: taskData.title,
            description: taskData.description,
            category: taskNormalizedCategory,
            priority: taskData.priority,
            timeEstimate: taskData.timeEstimate,
            userId,
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
          createdTasks.push(task);
        }
      }

      // Auto-journal if source is a social media URL
      let journalEntryId = null;
      let savedVenuesCount = 0;

      // Generate unique import ID for this batch of venues
      const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (isSocialMedia) {
        try {
          const platform = sourceUrl.includes("instagram")
            ? "Instagram"
            : sourceUrl.includes("tiktok")
              ? "TikTok"
              : sourceUrl.includes("youtube") || sourceUrl.includes("youtu.be")
                ? "YouTube"
                : "Social Media";

          // Create journal entry with the FULL extracted content (caption, audio transcript, OCR, venues)
          // plus the generated plan summary and tasks
          const tasksList = createdTasks.map((t: any) => t.title).join("\n- ");

          // Build comprehensive journal content that includes:
          // 1. The full raw extracted content (caption, audio transcript, OCR text)
          // 2. The AI-generated summary
          // 3. The task breakdown
          const extractedContentPreview =
            externalContent.length > 2000
              ? externalContent.substring(0, 2000) + "..."
              : externalContent;

          const journalContent =
            `## Saved from ${platform}: ${activity.title}\n\n` +
            `**Source:** ${sourceUrl}\n\n` +
            `### Plan Summary\n${planResult.summary || "No summary available"}\n\n` +
            `### Tasks\n- ${tasksList}\n\n` +
            `### Extracted Content\n${extractedContentPreview}`;

          const journalEntry = await storage.createJournalEntry({
            userId,
            date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
            content: journalContent,
            category: "travel_adventure",
            tags: [
              platform.toLowerCase(),
              planResult.goalCategory || "planning",
            ],
            mood: "excited",
          });
          journalEntryId = journalEntry.id;

          console.log(
            `[AUTO-JOURNAL] Created journal entry ${journalEntryId} from ${platform} URL for activity ${activity.id}`,
          );

          // CRITICAL: Save ALL extracted venues as structured journal entries for swap alternatives
          const allExtractedVenues =
            (planResult as any).allExtractedVenues || [];
          if (allExtractedVenues.length > 0) {
            try {
              // Get user preferences to update journalData
              const preferences = await storage.getUserPreferences(userId);
              const currentJournalData =
                preferences?.preferences?.journalData || {};

              // Track which venue names are used in tasks
              const taskVenueNames = new Set(
                planResult.tasks
                  .filter((t: any) => t.venueName)
                  .map((t: any) => t.venueName),
              );

              // Group venues by category and create structured journal entries
              const venuesByCategory: Record<string, any[]> = {};
              const timestamp = new Date().toISOString();

              // Get planContext for enrichment context
              const planContext = (planResult as any).planContext;

              for (const venue of allExtractedVenues) {
                const category = venue.category || "restaurants";
                if (!venuesByCategory[category]) {
                  venuesByCategory[category] = [];
                }

                // Create structured journal entry with all venue data
                // IMPORTANT: text is ONLY venue name (clean) for journal display
                venuesByCategory[category].push({
                  id: `venue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  text: venue.venueName, // CLEAN: Just the venue name, no description
                  timestamp,
                  venueName: venue.venueName,
                  venueType: venue.venueType,
                  location:
                    venue.location || (planResult as any).planLocation || {},
                  priceRange: venue.priceRange,
                  budgetTier: venue.budgetTier,
                  estimatedCost: venue.estimatedCost,
                  sourceUrl: sourceUrl,
                  importId: importId,
                  selectedForPlan: taskVenueNames.has(venue.venueName),
                  activityId: activity.id,
                  linkedActivityTitle: activity.title,
                  aiConfidence: 0.9,
                  creator: venue.creator, // Author/director/artist for enrichment
                  // Store planContext for smarter journal enrichment
                  enrichmentContext: planContext
                    ? {
                        theme: planContext.theme,
                        contentType: planContext.contentType,
                        sourceDescription: planContext.sourceDescription,
                      }
                    : undefined,
                });
              }

              // Merge with existing journal data
              for (const [category, venues] of Object.entries(
                venuesByCategory,
              )) {
                const existingEntries = currentJournalData[category] || [];
                currentJournalData[category] = [...existingEntries, ...venues];
              }

              // Update user preferences with new journal data
              await storage.upsertUserPreferences(userId, {
                preferences: {
                  ...preferences?.preferences,
                  journalData: currentJournalData,
                },
              });

              savedVenuesCount = allExtractedVenues.length;
              console.log(
                `[AUTO-JOURNAL] Saved ${savedVenuesCount} venues to journalData from ${platform} URL for activity ${activity.id}`,
              );
            } catch (venueError) {
              console.error(
                "[AUTO-JOURNAL] Error saving venues to journalData:",
                venueError,
              );
            }
          }
        } catch (journalError) {
          console.error(
            "[AUTO-JOURNAL] Error creating journal entry:",
            journalError,
          );
          // Don't fail the whole request if journaling fails
        }
      }

      // Send notification that activity is ready (works even when app is locked)
      const sourceType = isSocialMedia ? 'url' : 'paste';
      onActivityProcessingComplete(storage, activity, parseInt(userId), createdTasks.length, sourceType)
        .catch(err => console.error("[NOTIFICATION] Activity ready hook error:", err));

      res.json({
        success: true,
        plan: planResult,
        activity: {
          id: activity.id,
          title: activity.title,
          sourceUrl: sourceUrl,
        },
        createdTasks,
        journalEntryId,
        savedVenuesCount,
        importId,
        message: `Created "${activity.title}" with ${createdTasks.length} tasks${journalEntryId ? " and added to journal" : ""}${savedVenuesCount ? ` (${savedVenuesCount} venues saved for alternatives)` : ""}`,
      });
    } catch (error) {
      console.error("Error generating plan from content:", error);
      res.status(500).json({ error: "Failed to generate plan from content" });
    }
  });

  // Get specific session
  app.get(
    "/api/planner/session/:sessionId",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
        const { sessionId } = req.params;

        const session = await storage.getLifestylePlannerSession(
          sessionId,
          userId,
        );
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        res.json(session);
      } catch (error) {
        console.error("Error fetching planner session:", error);
        res.status(500).json({ error: "Failed to fetch session" });
      }
    },
  );

  app.delete("/api/user/profile", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserProfile(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user profile:", error);
      res.status(500).json({ error: "Failed to delete user profile" });
    }
  });

  // User Preferences Management
  app.get("/api/user/preferences", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user/preferences", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const preferencesData = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.upsertUserPreferences(
        userId,
        preferencesData,
      );
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  app.delete("/api/user/preferences", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserPreferences(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user preferences:", error);
      res.status(500).json({ error: "Failed to delete user preferences" });
    }
  });

  // Device Location Permission Management
  app.get("/api/user/location", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      if (!userId || userId === DEMO_USER_ID) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const preferences = await storage.getUserPreferences(userId);
      res.json({
        locationEnabled: preferences?.locationEnabled ?? false,
        latitude: preferences?.deviceLatitude ?? null,
        longitude: preferences?.deviceLongitude ?? null,
        city: preferences?.deviceCity ?? null,
        updatedAt: preferences?.locationUpdatedAt ?? null,
      });
    } catch (error) {
      console.error("Error fetching user location:", error);
      res.status(500).json({ error: "Failed to fetch user location" });
    }
  });

  // Zod schema for location update validation - prevents empty strings and null being coerced to 0
  const strictNumber = z.preprocess((val) => {
    // Reject null, undefined, and empty strings explicitly - don't coerce to 0
    if (val === null || val === undefined || val === "") return undefined;
    // Ensure it's a valid number type before parsing
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    // Return undefined for invalid inputs - will fail validation
    return undefined;
  }, z.number());

  const locationUpdateSchema = z
    .object({
      enabled: z.boolean(),
      latitude: strictNumber
        .refine((n) => n >= -90 && n <= 90, {
          message: "Latitude must be between -90 and 90",
        })
        .optional(),
      longitude: strictNumber
        .refine((n) => n >= -180 && n <= 180, {
          message: "Longitude must be between -180 and 180",
        })
        .optional(),
      city: z.string().max(200).optional().nullable(),
    })
    .refine(
      (data) => {
        // If enabling location, latitude and longitude must be valid numbers (not null/undefined)
        if (data.enabled) {
          return (
            typeof data.latitude === "number" &&
            typeof data.longitude === "number" &&
            !isNaN(data.latitude) &&
            !isNaN(data.longitude)
          );
        }
        return true;
      },
      {
        message:
          "Valid latitude and longitude are required when enabling location",
      },
    );

  app.put("/api/user/location", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      if (!userId || userId === DEMO_USER_ID) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate request body with Zod
      const validationResult = locationUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid location data",
          details: validationResult.error.flatten().fieldErrors,
        });
      }

      const { enabled, latitude, longitude, city } = validationResult.data;

      // Update preferences with validated location data
      const preferences = await storage.upsertUserPreferences(userId, {
        locationEnabled: enabled,
        deviceLatitude: enabled ? latitude : null,
        deviceLongitude: enabled ? longitude : null,
        deviceCity: enabled ? city : null,
        locationUpdatedAt: enabled ? new Date() : null,
      });

      console.log("[Location] Updated location for user:", userId, {
        enabled,
        city,
      });

      res.json({
        locationEnabled: preferences.locationEnabled ?? false,
        latitude: preferences.deviceLatitude ?? null,
        longitude: preferences.deviceLongitude ?? null,
        city: preferences.deviceCity ?? null,
        updatedAt: preferences.locationUpdatedAt ?? null,
      });
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ error: "Failed to update user location" });
    }
  });

  // User Context Management (for personalized AI planning)
  app.get("/api/user/context", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const forceRefresh = req.query.forceRefresh === "true";
      const context = await aiService.getUserContext(userId, forceRefresh);
      res.json({ context, enabled: context !== null });
    } catch (error) {
      console.error("Error fetching user context:", error);
      res.status(500).json({ error: "Failed to fetch user context" });
    }
  });

  app.post("/api/user/context/generate", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;

      // Invalidate cache to force fresh generation
      aiService.invalidateUserContext(userId);

      // Generate new context summary
      const context = await aiService.generateUserContextSummary(userId);

      res.json({
        success: true,
        context,
        message: "User context summary generated successfully",
      });
    } catch (error) {
      console.error("Error generating user context:", error);
      res.status(500).json({ error: "Failed to generate user context" });
    }
  });

  // User Consent Management
  app.get("/api/user/consent", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const consent = await storage.getUserConsent(userId);
      res.json(consent);
    } catch (error) {
      console.error("Error fetching user consent:", error);
      res.status(500).json({ error: "Failed to fetch user consent" });
    }
  });

  app.put("/api/user/consent", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const consentData = insertUserConsentSchema.parse(req.body);
      const consent = await storage.upsertUserConsent(userId, consentData);
      res.json(consent);
    } catch (error) {
      console.error("Error updating user consent:", error);
      res.status(500).json({ error: "Failed to update user consent" });
    }
  });

  app.delete("/api/user/consent", async (req, res) => {
    try {
      const userId =
        (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserConsent(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user consent:", error);
      res.status(500).json({ error: "Failed to delete user consent" });
    }
  });

  // Scheduling Suggestions
  app.get("/api/scheduling/suggestions", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const date = req.query.date as string;
      const suggestions = await storage.getUserSchedulingSuggestions(
        userId,
        date,
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching scheduling suggestions:", error);
      res.status(500).json({ error: "Failed to fetch scheduling suggestions" });
    }
  });

  app.post("/api/scheduling/generate", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { targetDate } = z
        .object({ targetDate: z.string() })
        .parse(req.body);

      if (!targetDate) {
        return res.status(400).json({ error: "Target date is required" });
      }

      // Generate smart scheduling suggestions
      const suggestions = await generateSchedulingSuggestions(
        userId,
        targetDate,
      );

      res.json({
        success: true,
        suggestions,
        message: `Generated ${suggestions.length} scheduling suggestions`,
      });
    } catch (error) {
      console.error("Error generating scheduling suggestions:", error);
      res
        .status(500)
        .json({ error: "Failed to generate scheduling suggestions" });
    }
  });

  app.post(
    "/api/scheduling/suggestions/:suggestionId/accept",
    async (req, res) => {
      try {
        const userId = getUserId(req) || DEMO_USER_ID;
        const { suggestionId } = req.params;

        const suggestion = await storage.acceptSchedulingSuggestion(
          suggestionId,
          userId,
        );

        if (!suggestion) {
          return res
            .status(404)
            .json({ error: "Scheduling suggestion not found" });
        }

        // Update task dueDates based on the accepted schedule
        if (
          suggestion.suggestedTasks &&
          Array.isArray(suggestion.suggestedTasks)
        ) {
          for (const taskSuggestion of suggestion.suggestedTasks) {
            if (taskSuggestion.taskId && taskSuggestion.suggestedStartTime) {
              // Construct the full datetime from targetDate + suggestedStartTime
              const taskDateTime = new Date(
                `${suggestion.targetDate}T${taskSuggestion.suggestedStartTime}:00`,
              );

              // Update the task's dueDate
              await storage.updateTask(
                taskSuggestion.taskId,
                { dueDate: taskDateTime },
                userId,
              );
              console.log(
                `[SCHEDULER] Updated task ${taskSuggestion.taskId} dueDate to ${taskDateTime.toISOString()}`,
              );
            }
          }
        }

        // Create reminders for each task in the accepted schedule
        await createRemindersFromSchedule(suggestion, userId);

        res.json({
          success: true,
          suggestion,
          message:
            "Schedule accepted, task dates updated, and reminders created!",
        });
      } catch (error) {
        console.error("Error accepting scheduling suggestion:", error);
        res
          .status(500)
          .json({ error: "Failed to accept scheduling suggestion" });
      }
    },
  );

  // Contact Syncing and Sharing Routes

  // Sync phone contacts (demo user & authenticated)
  app.post("/api/contacts/sync", async (req, res) => {
    try {
      // Support both authenticated users and demo users using proper helper
      const userId = getUserId(req) || getDemoUserId(req);
      console.log(
        "[CONTACTS SYNC] User ID:",
        userId,
        "getUserId:",
        getUserId(req),
        "isAuthenticated:",
        req.isAuthenticated?.(),
      );
      if (!userId) {
        return res.status(401).json({ error: "Unable to identify user" });
      }

      // Validate request body using Zod
      const validationResult = syncContactsSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log(
          "[CONTACTS SYNC] Validation failed:",
          validationResult.error.errors,
        );
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors,
        });
      }

      const { contacts: phoneContacts } = validationResult.data;
      console.log(
        "[CONTACTS SYNC] Syncing",
        phoneContacts.length,
        "contacts for user",
        userId,
      );
      const result = await contactSyncService.syncPhoneContacts(
        userId,
        phoneContacts,
      );
      console.log(
        "[CONTACTS SYNC] Sync complete:",
        result.syncedCount,
        "contacts synced",
      );

      res.json({
        success: true,
        syncedCount: result.syncedCount,
        contacts: result.contacts,
        message: `Successfully synced ${result.syncedCount} contacts!`,
      });
    } catch (error) {
      console.error(
        "[CONTACTS SYNC] Error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Failed to sync contacts" });
    }
  });

  // Add manual contact (demo user & authenticated)
  app.post("/api/contacts", async (req, res) => {
    try {
      // Support both authenticated users and demo users using proper helper
      const userId = getUserId(req) || getDemoUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unable to identify user" });
      }

      // Validate request body using Zod
      const validationResult = addContactSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationResult.error.errors,
        });
      }

      const contactData = validationResult.data;
      const contact = await contactSyncService.addManualContact(
        userId,
        contactData,
      );

      res.json({
        success: true,
        contact,
        message: "Contact added successfully!",
      });
    } catch (error) {
      console.error(
        "Add contact error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (
        error instanceof Error &&
        error.message === "Contact already exists"
      ) {
        return res.status(409).json({ error: "Contact already exists" });
      }
      res.status(500).json({ error: "Failed to add contact" });
    }
  });

  // Get user's contacts with JournalMate status (demo user & authenticated)
  app.get("/api/contacts", async (req, res) => {
    try {
      // Support both authenticated users and demo users using proper helper
      const userId = getUserId(req) || getDemoUserId(req);
      console.log(
        "[CONTACTS GET] User ID:",
        userId,
        "getUserId:",
        getUserId(req),
        "isAuthenticated:",
        req.isAuthenticated?.(),
      );
      if (!userId) {
        return res.status(401).json({ error: "Unable to identify user" });
      }

      const contacts =
        await contactSyncService.getUserContactsWithStatus(userId);
      console.log(
        "[CONTACTS GET] Returning",
        contacts.length,
        "contacts for user",
        userId,
      );
      res.json(contacts);
    } catch (error) {
      console.error(
        "[CONTACTS GET] Error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  // Get contacts who are also JournalMate users
  app.get("/api/contacts/on-journalmate", async (req, res) => {
    try {
      const userId = getUserId(req) || getDemoUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unable to identify user" });
      }

      // Get all user contacts with their JournalMate status
      const allContacts = await contactSyncService.getUserContactsWithStatus(userId);

      // Filter to only contacts who are JournalMate users
      const journalmateContacts = allContacts.filter(
        (contact: any) => contact.isOnJournalmate === true
      );

      console.log(
        `[CONTACTS ON-JOURNALMATE] Found ${journalmateContacts.length} JournalMate contacts out of ${allContacts.length} total for user ${userId}`
      );

      res.json(journalmateContacts);
    } catch (error) {
      console.error(
        "[CONTACTS ON-JOURNALMATE] Error:",
        error instanceof Error ? error.message : "Unknown error"
      );
      res.status(500).json({ error: "Failed to fetch JournalMate contacts" });
    }
  });

  // Generate invite message for sharing
  app.post("/api/sharing/generate-invite", async (req, res) => {
    try {
      const { planTitle, inviteLink } = req.body;

      if (!planTitle || !inviteLink) {
        return res
          .status(400)
          .json({ error: "Plan title and invite link are required" });
      }

      // Get user info for personalization
      const user = await storage.getUser(DEMO_USER_ID);
      const inviterName = user
        ? `${user.firstName || "Someone"} ${user.lastName || ""}`.trim()
        : "Someone";

      const inviteMessage = contactSyncService.generateInviteMessage(
        inviterName,
        planTitle,
        inviteLink,
      );

      res.json({
        success: true,
        inviteMessage,
        sharingOptions: {
          sms: `sms:?body=${encodeURIComponent(inviteMessage)}`,
          email: `mailto:?subject=${encodeURIComponent(`Join me on "${planTitle}"`)}&body=${encodeURIComponent(inviteMessage)}`,
          copy: inviteMessage,
        },
      });
    } catch (error) {
      console.error("Generate invite error:", error);
      res.status(500).json({ error: "Failed to generate invite" });
    }
  });

  // Facebook App Compliance Routes - Required for accessing user profile data

  // Privacy Policy - Required by Facebook for app approval
  app.get("/privacy-policy", (req, res) => {
    const privacyPolicyHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - JournalMate</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6; 
            color: #333; 
        }
        h1, h2 { color: #6C5CE7; }
        .effective-date { color: #666; font-style: italic; }
        .section { margin-bottom: 2rem; }
        .contact-info { background: #f8f9fa; padding: 1rem; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for JournalMate</h1>
    <p class="effective-date">Effective Date: ${new Date().toLocaleDateString()}</p>
    
    <div class="section">
        <h2>1. Information We Collect</h2>
        <p>JournalMate is an AI-powered personal planning and productivity application. We collect and process the following types of information to provide personalized planning services:</p>
        
        <h3>1.1 Facebook Profile Information</h3>
        <ul>
            <li><strong>Basic Profile Data:</strong> Name, email address, profile picture</li>
            <li><strong>Demographic Information:</strong> Age, birthday, location (if shared)</li>
            <li><strong>Social Connections:</strong> Friends list (used for social goal recommendations)</li>
            <li><strong>Activity Data:</strong> Posts you've liked or saved (used for interest analysis)</li>
            <li><strong>Personal Interests:</strong> Pages you follow, groups you're in (for personalized recommendations)</li>
        </ul>
        
        <h3>1.2 Spotify Music Data</h3>
        <ul>
            <li>Currently playing tracks and recently played music</li>
            <li>Top artists and tracks (for personality insights)</li>
            <li>Playlists and music preferences (for mood and energy analysis)</li>
        </ul>
        
        <h3>1.3 Application Usage Data</h3>
        <ul>
            <li>Goals and tasks you create</li>
            <li>Planning conversations with our AI assistant</li>
            <li>Progress tracking and achievement data</li>
            <li>Notification preferences and settings</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>2. How We Use Your Information</h2>
        <p>We use your information solely to provide personalized planning and productivity services:</p>
        <ul>
            <li><strong>Personalized AI Planning:</strong> Your demographic and interest data helps our AI create more relevant and achievable action plans</li>
            <li><strong>Social Context:</strong> Friends and social activity data helps suggest collaborative goals and social accountability</li>
            <li><strong>Music-Based Insights:</strong> Your music preferences help us understand your personality, energy levels, and optimal timing for different activities</li>
            <li><strong>Contextual Recommendations:</strong> We combine your data with environmental factors (time, weather, location) for better planning</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>3. Information Sharing and Disclosure</h2>
        <p>We do NOT sell, rent, or share your personal information with third parties for marketing purposes. We only share information in these limited circumstances:</p>
        <ul>
            <li><strong>AI Processing:</strong> Anonymized data is sent to OpenAI and Anthropic for AI-powered planning (no identifying information)</li>
            <li><strong>Legal Requirements:</strong> If required by law or to protect our rights and users</li>
            <li><strong>Service Providers:</strong> Trusted partners who help operate our service (under strict confidentiality agreements)</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>4. Data Security</h2>
        <p>We implement industry-standard security measures to protect your data:</p>
        <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security audits and updates</li>
            <li>Limited data retention periods</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>5. Your Rights and Choices</h2>
        <ul>
            <li><strong>Data Access:</strong> You can view all data we have about you in your profile settings</li>
            <li><strong>Data Correction:</strong> You can update or correct your information at any time</li>
            <li><strong>Data Deletion:</strong> You can request deletion of your account and all associated data</li>
            <li><strong>Data Portability:</strong> You can export your data in a machine-readable format</li>
            <li><strong>Consent Withdrawal:</strong> You can disconnect Facebook/Spotify integrations at any time</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>6. Data Retention</h2>
        <p>We retain your data only as long as necessary to provide our services:</p>
        <ul>
            <li>Active accounts: Data is retained while your account is active</li>
            <li>Inactive accounts: Data is automatically deleted after 2 years of inactivity</li>
            <li>Deleted accounts: All data is permanently removed within 30 days of deletion request</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>7. Children's Privacy</h2>
        <p>JournalMate is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we discover we have collected such information, we will delete it immediately.</p>
    </div>
    
    <div class="section">
        <h2>8. Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of any material changes by email or through the application. Your continued use of JournalMate after such changes constitutes acceptance of the updated policy.</p>
    </div>
    
    <div class="section contact-info">
        <h2>9. Contact Us</h2>
        <p>If you have any questions about this privacy policy or how we handle your data, please contact us:</p>
        <ul>
            <li><strong>Email:</strong> support@journalmate.ai</li>
            <li><strong>Data Protection Officer:</strong> support@journalmate.ai</li>
            <li><strong>Address:</strong> [Your Business Address]</li>
        </ul>

        <p><strong>Data Deletion Requests:</strong> You can request deletion of your data by:</p>
        <ul>
            <li>Using the "Delete Account" option in your profile settings</li>
            <li>Visiting: <a href="${req.protocol}://${req.get("host")}/data-deletion">Data Deletion Request Form</a></li>
            <li>Emailing us at: support@journalmate.ai</li>
        </ul>
    </div>
    
    <p style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #eee; color: #666; text-align: center;">
        © ${new Date().getFullYear()} JournalMate. All rights reserved.
    </p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(privacyPolicyHTML);
  });

  // Data Deletion Request Form - Required by Facebook
  app.get("/data-deletion", (req, res) => {
    const dataDeletionHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Deletion Request - JournalMate</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 2rem; 
            line-height: 1.6; 
            color: #333; 
        }
        h1 { color: #6C5CE7; text-align: center; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
        input, textarea, select { 
            width: 100%; 
            padding: 0.75rem; 
            border: 2px solid #e1e8ed; 
            border-radius: 8px; 
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        input:focus, textarea:focus, select:focus { 
            outline: none; 
            border-color: #6C5CE7; 
        }
        button { 
            background: #6C5CE7; 
            color: white; 
            padding: 1rem 2rem; 
            border: none; 
            border-radius: 8px; 
            font-size: 1rem; 
            font-weight: 600;
            cursor: pointer; 
            width: 100%;
            transition: background 0.2s;
        }
        button:hover { background: #5a52d5; }
        .info-box { 
            background: #f8f9fa; 
            padding: 1.5rem; 
            border-radius: 8px; 
            margin-bottom: 2rem; 
            border-left: 4px solid #6C5CE7;
        }
        .success-message { 
            background: #d4edda; 
            color: #155724; 
            padding: 1rem; 
            border-radius: 8px; 
            margin-bottom: 1rem; 
            display: none;
        }
    </style>
</head>
<body>
    <h1>Data Deletion Request</h1>
    
    <div class="info-box">
        <h3>What happens when you delete your data?</h3>
        <ul>
            <li>Your account and all associated data will be permanently deleted</li>
            <li>This includes your profile, goals, tasks, conversation history, and preferences</li>
            <li>Connected social media integrations (Facebook, Spotify) will be disconnected</li>
            <li>This action cannot be undone</li>
            <li>Deletion will be completed within 30 days of your request</li>
        </ul>
    </div>
    
    <div class="success-message" id="successMessage">
        Your data deletion request has been submitted successfully. You will receive a confirmation email shortly.
    </div>
    
    <form id="deletionForm" onsubmit="handleDeletionRequest(event)">
        <div class="form-group">
            <label for="email">Email Address (associated with your JournalMate account):</label>
            <input type="email" id="email" name="email" required>
        </div>
        
        <div class="form-group">
            <label for="facebook_id">Facebook User ID (if you connected via Facebook):</label>
            <input type="text" id="facebook_id" name="facebook_id" placeholder="Optional - helps us locate your account">
        </div>
        
        <div class="form-group">
            <label for="reason">Reason for deletion (optional):</label>
            <select id="reason" name="reason">
                <option value="">Select a reason...</option>
                <option value="no_longer_needed">No longer need the service</option>
                <option value="privacy_concerns">Privacy concerns</option>
                <option value="switching_services">Switching to another service</option>
                <option value="account_security">Account security concerns</option>
                <option value="other">Other</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="additional_info">Additional Information (optional):</label>
            <textarea id="additional_info" name="additional_info" rows="4" placeholder="Any additional details about your deletion request..."></textarea>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" required style="width: auto; margin-right: 0.5rem;">
                I understand that this action is permanent and cannot be undone
            </label>
        </div>
        
        <button type="submit">Submit Deletion Request</button>
    </form>
    
    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #eee; text-align: center; color: #666;">
        <p>Need help? Contact us at <a href="mailto:support@journalmate.ai">support@journalmate.ai</a></p>
        <p><a href="/privacy-policy">Privacy Policy</a> | <a href="/">Back to JournalMate</a></p>
    </div>
    
    <script>
        async function handleDeletionRequest(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/data-deletion/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    document.getElementById('successMessage').style.display = 'block';
                    document.getElementById('deletionForm').style.display = 'none';
                } else {
                    alert('There was an error processing your request. Please try again or contact support.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('There was an error processing your request. Please try again or contact support.');
            }
        }
    </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(dataDeletionHTML);
  });

  // Data Deletion Request API - Processes deletion requests
  app.post("/api/data-deletion/request", async (req, res) => {
    try {
      const { email, facebook_id, reason, additional_info } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Log the deletion request for processing
      console.log("Data deletion request received:", {
        email,
        facebook_id,
        reason,
        additional_info,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      // In a real application, you would:
      // 1. Verify the user's identity
      // 2. Queue the deletion for processing
      // 3. Send confirmation email
      // 4. Actually delete the data within 30 days

      // For now, we'll simulate this process
      const deletionRequestId =
        Math.random().toString(36).substring(2) + Date.now().toString(36);

      // TODO: Implement actual data deletion logic
      // TODO: Send confirmation email
      // TODO: Queue background job for data deletion

      res.json({
        success: true,
        requestId: deletionRequestId,
        message:
          "Your data deletion request has been received and will be processed within 30 days.",
        confirmationEmail:
          "A confirmation email will be sent to your registered email address.",
      });
    } catch (error) {
      console.error("Data deletion request error:", error);
      res.status(500).json({
        error: "Failed to process deletion request",
        message:
          "Please try again or contact support at support@journalmate.ai",
      });
    }
  });

  // Facebook Webhook for Data Deletion Callback (alternative method)
  app.post("/api/facebook/data-deletion", async (req, res) => {
    try {
      const { signed_request } = req.body;

      if (!signed_request) {
        return res.status(400).json({ error: "Missing signed_request" });
      }

      // Verify Facebook's signed request signature
      const crypto = require("crypto");
      const [encodedSig, payload] = signed_request.split(".");

      // Get Facebook app secret from environment
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appSecret) {
        console.error("FACEBOOK_APP_SECRET not configured");
        return res.status(500).json({ error: "Server configuration error" });
      }

      // Verify signature
      const expectedSig = crypto
        .createHmac("sha256", appSecret)
        .update(payload)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const providedSig = encodedSig
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      if (expectedSig !== providedSig) {
        console.error("Invalid Facebook signature verification");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Parse verified payload
      const data = JSON.parse(Buffer.from(payload, "base64").toString());

      console.log("Verified Facebook data deletion callback received:", {
        user_id: data.user_id,
        algorithm: data.algorithm,
        issued_at: data.issued_at,
        timestamp: new Date().toISOString(),
      });

      // Process the deletion for the Facebook user
      try {
        // Find user by Facebook ID and delete their data
        const users = await storage.getAllUsers();
        const userToDelete = users.find(
          (user) => user.facebookId === data.user_id,
        );

        if (userToDelete) {
          // Export user data before deletion (GDPR requirement)
          const userData = {
            profile: userToDelete,
            goals: await storage.getGoalsByUserId(userToDelete.id),
            tasks: await storage.getTasksByUserId(userToDelete.id),
            progress: await storage.getProgressByUserId(userToDelete.id),
            exportedAt: new Date().toISOString(),
          };

          // In production, send this data to the user or store for retrieval
          console.log("User data exported for deletion:", userData);

          // Delete all user data
          await storage.deleteUserData(userToDelete.id);

          console.log(
            "Successfully deleted user data for Facebook ID:",
            data.user_id,
          );
        } else {
          console.log("No user found with Facebook ID:", data.user_id);
        }

        const confirmationCode = crypto.randomBytes(16).toString("hex");

        res.json({
          url: `${req.protocol}://${req.get("host")}/data-deletion?confirmation=${confirmationCode}`,
          confirmation_code: confirmationCode,
        });
      } catch (deletionError) {
        console.error("Error during user data deletion:", deletionError);
        res.status(500).json({ error: "Failed to delete user data" });
      }
    } catch (error) {
      console.error("Facebook data deletion callback error:", error);
      res
        .status(500)
        .json({ error: "Failed to process Facebook data deletion request" });
    }
  });

  // ========== ADMIN: SEED COMMUNITY PLANS ==========
  // Protected endpoint to seed community plans in production
  // Requires ADMIN_SECRET environment variable for authorization
  // Call this once after deployment to populate the Discover Plans section
  app.post("/api/admin/seed-community-plans", async (req, res) => {
    try {
      const { adminSecret, force } = req.body;

      // Verify admin authorization using secret
      const requiredSecret = process.env.ADMIN_SECRET;
      const isDevelopment = process.env.NODE_ENV === "development";

      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({
          error:
            "Admin functionality not configured. Set ADMIN_SECRET environment variable.",
        });
      }

      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn("[ADMIN] Unauthorized seed attempt");
        return res.status(403).json({
          error: "Unauthorized. Admin secret required.",
        });
      }

      console.log("[ADMIN] Authorized admin seeding community plans...");
      console.log("[ADMIN] Force reseed:", force || false);

      await storage.seedCommunityPlans(force || false);

      res.json({
        success: true,
        message:
          "Community plans seeded successfully! Check the Discover Plans section.",
        plansSeeded: 56,
      });
    } catch (error) {
      console.error("[ADMIN] Failed to seed community plans:", error);
      res.status(500).json({
        error: "Failed to seed community plans",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== ADMIN: UPDATE OFFICIAL PLANS WITH VERIFICATION ==========
  // Protected endpoint to add Instagram verification to all official seeded plans
  app.post("/api/admin/update-official-verification", async (req, res) => {
    try {
      const { adminSecret, instagramHandle } = req.body;

      // Verify admin authorization using secret
      const requiredSecret = process.env.ADMIN_SECRET;
      const isDevelopment = process.env.NODE_ENV === "development";

      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({
          error:
            "Admin functionality not configured. Set ADMIN_SECRET environment variable.",
        });
      }

      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn("[ADMIN] Unauthorized verification update attempt");
        return res.status(403).json({
          error: "Unauthorized. Admin secret required.",
        });
      }

      console.log(
        "[ADMIN] Authorized admin updating official plan verification...",
      );
      console.log(
        "[ADMIN] Instagram handle:",
        instagramHandle || "https://www.instagram.com/cartertano/",
      );

      // Use provided Instagram handle or default to cartertano
      const adminInstagramHandle =
        instagramHandle || "https://www.instagram.com/cartertano/";

      // Get or create admin user (demo-user is typically the admin for seeded content)
      const adminUserId = DEMO_USER_ID;

      // Create or update planner profile for admin with Instagram verification
      const [plannerProfile] = await db
        .insert(plannerProfiles)
        .values({
          userId: adminUserId,
          instagramHandle: adminInstagramHandle,
          verificationStatus: "official",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: plannerProfiles.userId,
          set: {
            instagramHandle: adminInstagramHandle,
            verificationStatus: "official",
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();

      console.log(
        "[ADMIN] Created/updated planner profile:",
        plannerProfile.id,
      );

      // Update all activities with sourceType='official_seed' to include verification
      const updateResult = await db
        .update(activities)
        .set({
          plannerProfileId: plannerProfile.id,
          verificationBadge: "instagram",
          updatedAt: new Date(),
        })
        .where(eq(activities.sourceType, "official_seed"))
        .returning({ id: activities.id });

      console.log("[ADMIN] Updated official plans count:", updateResult.length);

      res.json({
        success: true,
        message: `Successfully updated ${updateResult.length} official plans with Instagram verification`,
        plansUpdated: updateResult.length,
        instagramHandle: adminInstagramHandle,
        plannerProfileId: plannerProfile.id,
      });
    } catch (error) {
      console.error(
        "[ADMIN] Failed to update official plan verification:",
        error,
      );
      res.status(500).json({
        error: "Failed to update official plan verification",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== ADMIN: BACKFILL CONTENT HASHES ==========
  // Protected endpoint to generate and backfill content hashes for existing activities
  // This enables fast duplicate detection for all published community plans
  app.post("/api/admin/backfill-content-hashes", async (req, res) => {
    try {
      const { adminSecret } = req.body;

      // Verify admin authorization using secret
      const requiredSecret = process.env.ADMIN_SECRET;
      const isDevelopment = process.env.NODE_ENV === "development";

      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({
          error:
            "Admin functionality not configured. Set ADMIN_SECRET environment variable.",
        });
      }

      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn("[ADMIN] Unauthorized content hash backfill attempt");
        return res.status(403).json({
          error: "Unauthorized. Admin secret required.",
        });
      }

      console.log(
        "[ADMIN] Starting content hash backfill for all activities...",
      );

      // Get all activities that need content hashes
      const allActivities = await db
        .select({ id: activities.id, userId: activities.userId })
        .from(activities)
        .where(isNull(activities.contentHash));

      console.log(
        `[ADMIN] Found ${allActivities.length} activities without content hashes`,
      );

      let updatedCount = 0;
      let errorCount = 0;

      // Process each activity
      for (const activity of allActivities) {
        try {
          // Get tasks for this activity
          const tasks = await storage.getTasksByActivity(
            activity.id,
            activity.userId,
          );

          if (tasks.length === 0) {
            console.log(`[ADMIN] Skipping activity ${activity.id} - no tasks`);
            continue;
          }

          // Generate content hash
          const hash = generateContentHash(tasks);

          // Update activity with content hash
          await db
            .update(activities)
            .set({ contentHash: hash })
            .where(eq(activities.id, activity.id));

          updatedCount++;

          if (updatedCount % 10 === 0) {
            console.log(
              `[ADMIN] Processed ${updatedCount}/${allActivities.length} activities...`,
            );
          }
        } catch (error) {
          console.error(
            `[ADMIN] Error processing activity ${activity.id}:`,
            error,
          );
          errorCount++;
        }
      }

      console.log(
        `[ADMIN] Content hash backfill complete: ${updatedCount} updated, ${errorCount} errors`,
      );

      res.json({
        success: true,
        message: "Content hash backfill completed successfully",
        activitiesProcessed: allActivities.length,
        activitiesUpdated: updatedCount,
        errors: errorCount,
      });
    } catch (error) {
      console.error("[ADMIN] Failed to backfill content hashes:", error);
      res.status(500).json({
        error: "Failed to backfill content hashes",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== AI PLAN IMPORT ROUTES (Extension/Mobile) ==========
  // These routes handle importing AI-generated plans from ChatGPT, Claude, etc.

  // Helper function to get import limit based on subscription tier
  // Returns null for unlimited, or the numeric limit
  function getImportLimit(user: User): number | null {
    const tier = user.subscriptionTier || "free";
    const interval = user.subscriptionInterval;

    if (tier === "free") {
      // Base 3 + discoveryBonusImports (earned by publishing to Discovery, +2 each time)
      const bonusImports = user.discoveryBonusImports || 0;
      return 3 + bonusImports;
    } else if (tier === "pro") {
      if (interval === "yearly") return null; // Pro Yearly = Unlimited
      return 10; // Pro Monthly = 10 imports/month
    } else if (tier === "family") {
      return null; // Family = Unlimited for all members
    }
    return 3; // Default fallback
  }

  // Parse and import AI plan text
  app.post("/api/extensions/import-plan", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { text, source, sourceDevice } = req.body;

      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return res
          .status(400)
          .json({ error: "Plan text is required (minimum 10 characters)" });
      }

      // Check subscription tier for import limits
      const monthlyImports = await storage.getUserMonthlyImportCount(user.id);
      const importLimit = getImportLimit(user);

      if (importLimit !== null && monthlyImports >= importLimit) {
        return res.status(403).json({
          error: "Monthly import limit reached",
          limit: importLimit,
          used: monthlyImports,
          upgrade: true,
          tier: user.subscriptionTier || "free",
          subscriptionInterval: user.subscriptionInterval || null,
          discoveryBonusImports: user.discoveryBonusImports || 0,
        });
      }

      // Import the AI plan parser
      const { parseAIPlan, validateParsedPlan } = await import(
        "./services/aiPlanParser"
      );

      // Parse the AI plan text
      const parsedPlan = await parseAIPlan(text.trim());

      // Validate parsed plan
      const validation = validateParsedPlan(parsedPlan);
      if (!validation.valid) {
        return res.status(400).json({
          error: "Failed to parse plan",
          details: validation.errors,
        });
      }

      // Create the import record
      const planImport = await storage.createAiPlanImport({
        userId: user.id,
        source: source || parsedPlan.source || "other",
        sourceDevice: sourceDevice || "web",
        rawText: text.trim(),
        parsedTitle: parsedPlan.title,
        parsedDescription: parsedPlan.description || null,
        parsedTasks: parsedPlan.tasks,
        confidence: parsedPlan.confidence,
        status: "pending",
      });

      res.json({
        success: true,
        import: planImport,
        parsed: {
          title: parsedPlan.title,
          description: parsedPlan.description,
          tasks: parsedPlan.tasks,
          confidence: parsedPlan.confidence,
        },
        limits: {
          used: monthlyImports + 1,
          limit: importLimit,
        },
      });
    } catch (error) {
      console.error("[EXTENSION] Error importing plan:", error);
      res.status(500).json({
        error: "Failed to import plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get user's pending plan imports
  app.get("/api/extensions/imports", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const status = req.query.status as string | undefined;
      const imports = await storage.getUserAiPlanImports(user.id, status);

      res.json({ imports });
    } catch (error) {
      console.error("[EXTENSION] Error fetching imports:", error);
      res.status(500).json({ error: "Failed to fetch imports" });
    }
  });

  // Confirm a plan import and create an activity
  app.post("/api/extensions/imports/:importId/confirm", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { importId } = req.params;
      const { tasks, title, description } = req.body;

      // Get the import
      const planImport = await storage.getAiPlanImport(importId, user.id);
      if (!planImport) {
        return res.status(404).json({ error: "Import not found" });
      }

      if (planImport.status !== "pending") {
        return res.status(400).json({ error: "Import already processed" });
      }

      // Use provided tasks or fall back to parsed tasks
      const finalTasks = tasks || planImport.parsedTasks;
      const finalTitle = title || planImport.parsedTitle;
      const finalDescription = description || planImport.parsedDescription;

      // Create the activity
      const activity = await storage.createActivity({
        userId: user.id,
        title: finalTitle,
        description: finalDescription || undefined,
        category: "personal",
        status: "planning",
        planSummary: `Imported from ${planImport.source}`,
        tags: ["imported", planImport.source],
      });

      // Create tasks for the activity
      let order = 0;
      for (const task of finalTasks) {
        order++;
        await storage.createActivityTask({
          activityId: activity.id,
          title: task.title,
          description: task.description || undefined,
          category: task.category || "personal",
          priority: task.priority || "medium",
          completed: false,
          order,
        });
      }

      // Confirm the import
      await storage.confirmAiPlanImport(importId, user.id, activity.id);

      res.json({
        success: true,
        activity,
        tasksCreated: finalTasks.length,
      });
    } catch (error) {
      console.error("[EXTENSION] Error confirming import:", error);
      res.status(500).json({
        error: "Failed to confirm import",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Discard a plan import
  app.delete("/api/extensions/imports/:importId", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { importId } = req.params;
      await storage.discardAiPlanImport(importId, user.id);

      res.json({ success: true });
    } catch (error) {
      console.error("[EXTENSION] Error discarding import:", error);
      res.status(500).json({ error: "Failed to discard import" });
    }
  });

  // Generate extension token for browser extension authentication
  app.post("/api/extensions/tokens", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { platform, name } = req.body;

      if (
        !platform ||
        !["chrome", "firefox", "edge", "safari"].includes(platform)
      ) {
        return res
          .status(400)
          .json({
            error: "Valid platform required (chrome, firefox, edge, safari)",
          });
      }

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString("hex");

      // Set expiry to 1 year from now
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const extensionToken = await storage.createExtensionToken({
        userId: user.id,
        token,
        name:
          name ||
          `${platform.charAt(0).toUpperCase() + platform.slice(1)} Extension`,
        platform,
        isActive: true,
        expiresAt,
      });

      res.json({
        success: true,
        token: extensionToken.token,
        expiresAt: extensionToken.expiresAt,
      });
    } catch (error) {
      console.error("[EXTENSION] Error creating token:", error);
      res.status(500).json({ error: "Failed to create extension token" });
    }
  });

  // List user's extension tokens
  app.get("/api/extensions/tokens", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const tokens = await storage.getUserExtensionTokens(user.id);

      // Don't expose the actual token values
      const safeTokens = tokens.map((t) => ({
        id: t.id,
        name: t.name,
        platform: t.platform,
        isActive: t.isActive,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      }));

      res.json({ tokens: safeTokens });
    } catch (error) {
      console.error("[EXTENSION] Error fetching tokens:", error);
      res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  // Revoke an extension token
  app.delete("/api/extensions/tokens/:tokenId", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tokenId } = req.params;
      await storage.revokeExtensionToken(tokenId, user.id);

      res.json({ success: true });
    } catch (error) {
      console.error("[EXTENSION] Error revoking token:", error);
      res.status(500).json({ error: "Failed to revoke token" });
    }
  });

  // Extension authentication endpoint (using token instead of session)
  app.post("/api/extensions/auth", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token required" });
      }

      const extensionToken = await storage.getExtensionToken(token);

      if (!extensionToken) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Check if token is expired
      if (
        extensionToken.expiresAt &&
        new Date(extensionToken.expiresAt) < new Date()
      ) {
        return res.status(401).json({ error: "Token expired" });
      }

      // Update last used time
      await storage.updateExtensionTokenActivity(token);

      // Get user info
      const user = await storage.getUser(extensionToken.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
        },
      });
    } catch (error) {
      console.error("[EXTENSION] Error authenticating:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Extension-authenticated import endpoint (using token instead of session)
  app.post("/api/extensions/import-with-token", async (req, res) => {
    try {
      const { token, text, source, sourceDevice } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token required" });
      }

      const extensionToken = await storage.getExtensionToken(token);

      if (!extensionToken) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (
        extensionToken.expiresAt &&
        new Date(extensionToken.expiresAt) < new Date()
      ) {
        return res.status(401).json({ error: "Token expired" });
      }

      const user = await storage.getUser(extensionToken.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return res
          .status(400)
          .json({ error: "Plan text is required (minimum 10 characters)" });
      }

      // Check subscription tier for import limits
      const monthlyImports = await storage.getUserMonthlyImportCount(user.id);
      const importLimit = getImportLimit(user);

      if (importLimit !== null && monthlyImports >= importLimit) {
        return res.status(403).json({
          error: "Monthly import limit reached",
          limit: importLimit,
          used: monthlyImports,
          upgrade: true,
          tier: user.subscriptionTier || "free",
          subscriptionInterval: user.subscriptionInterval || null,
          discoveryBonusImports: user.discoveryBonusImports || 0,
        });
      }

      // Update token activity
      await storage.updateExtensionTokenActivity(token);

      // Import the AI plan parser
      const { parseAIPlan, validateParsedPlan } = await import(
        "./services/aiPlanParser"
      );

      // Parse the AI plan text
      const parsedPlan = await parseAIPlan(text.trim());

      // Validate parsed plan
      const validation = validateParsedPlan(parsedPlan);
      if (!validation.valid) {
        return res.status(400).json({
          error: "Failed to parse plan",
          details: validation.errors,
        });
      }

      // Create the import record
      const planImport = await storage.createAiPlanImport({
        userId: user.id,
        source: source || parsedPlan.source || "extension",
        sourceDevice: sourceDevice || "web_extension",
        rawText: text.trim(),
        parsedTitle: parsedPlan.title,
        parsedDescription: parsedPlan.description || null,
        parsedTasks: parsedPlan.tasks,
        confidence: parsedPlan.confidence,
        status: "pending",
      });

      res.json({
        success: true,
        import: planImport,
        parsed: {
          title: parsedPlan.title,
          description: parsedPlan.description,
          tasks: parsedPlan.tasks,
          confidence: parsedPlan.confidence,
        },
        limits: {
          used: monthlyImports + 1,
          limit: importLimit,
        },
      });
    } catch (error) {
      console.error("[EXTENSION] Error importing plan with token:", error);
      res.status(500).json({
        error: "Failed to import plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get import usage stats
  app.get("/api/extensions/usage", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const monthlyImports = await storage.getUserMonthlyImportCount(user.id);
      const importLimit = getImportLimit(user);

      res.json({
        tier: user.subscriptionTier || "free",
        subscriptionInterval: user.subscriptionInterval || null,
        discoveryBonusImports: user.discoveryBonusImports || 0,
        monthlyImports,
        limit: importLimit,
        remaining:
          importLimit !== null
            ? Math.max(0, importLimit - monthlyImports)
            : null,
      });
    } catch (error) {
      console.error("[EXTENSION] Error fetching usage:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  // Extension Authentication Flow
  // Step 1: User opens this page from extension popup to authenticate
  app.get("/extension-auth", async (req, res) => {
    try {
      const state = req.query.state as string;

      if (!state || state.length < 32) {
        return res.status(400).send("Invalid state parameter");
      }

      // Store state in session for verification
      if (req.session) {
        (req.session as any).extensionAuthState = state;
      }

      // Render a page that asks user to login if not authenticated
      // or proceed to create token if authenticated
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Connect JournalMate Extension</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 400px;
                width: 100%;
                text-align: center;
                box-shadow: 0 10px 40px rgba(124, 58, 237, 0.15);
              }
              .logo {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                border-radius: 16px;
                margin: 0 auto 24px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .logo svg { width: 32px; height: 32px; }
              h1 { color: #1e293b; font-size: 24px; margin-bottom: 12px; }
              p { color: #64748b; font-size: 16px; margin-bottom: 32px; line-height: 1.5; }
              .btn {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                color: white;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
              }
              .status { margin-top: 24px; color: #94a3b8; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M6 8h12M6 12h12M6 16h8" stroke-linecap="round"/>
                </svg>
              </div>
              <h1>Connect Browser Extension</h1>
              <p>Link your JournalMate account to the browser extension for one-click AI plan imports.</p>
              <a href="/extension-auth/connect?state=${encodeURIComponent(state)}" class="btn">
                Connect Account
              </a>
              <p class="status">You may be asked to log in first.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("[EXTENSION AUTH] Error:", error);
      res.status(500).send("An error occurred");
    }
  });

  // Step 2: Verify user is authenticated and create extension token
  app.get(
    "/extension-auth/connect",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const state = req.query.state as string;
        const user = req.user as User;

        if (!state || !user) {
          return res.redirect("/extension-auth?error=invalid_state");
        }

        // Generate a secure token for the extension
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

        // Store the token in database
        await storage.createExtensionToken({
          userId: user.id,
          token,
          name: "Browser Extension",
          platform: "chrome",
          expiresAt,
        });

        // Calculate expires_in in seconds
        const expiresInSeconds = Math.floor(
          (expiresAt.getTime() - Date.now()) / 1000,
        );

        // Redirect to callback page that extension is listening for
        res.redirect(
          `/extension-auth/callback?token=${token}&state=${state}&expires_in=${expiresInSeconds}`,
        );
      } catch (error) {
        console.error("[EXTENSION AUTH] Error creating token:", error);
        res.status(500).send("Failed to create extension token");
      }
    },
  );

  // Step 3: Callback page that the extension popup intercepts
  app.get("/extension-auth/callback", async (req, res) => {
    const token = req.query.token as string;
    const state = req.query.state as string;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Extension Connected!</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              text-align: center;
              box-shadow: 0 10px 40px rgba(16, 185, 129, 0.15);
            }
            .success-icon {
              width: 80px;
              height: 80px;
              background: #10b981;
              border-radius: 50%;
              margin: 0 auto 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .success-icon svg { width: 40px; height: 40px; }
            h1 { color: #166534; font-size: 24px; margin-bottom: 12px; }
            p { color: #4b5563; font-size: 16px; line-height: 1.5; }
            .note { margin-top: 24px; color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h1>Extension Connected!</h1>
            <p>Your JournalMate account is now linked to the browser extension.</p>
            <p class="note">You can close this tab and start importing AI plans.</p>
          </div>
          <script>
            // Notify extension if in popup context
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'JOURNALMATE_AUTH_SUCCESS',
                  token: '${token}',
                  state: '${state}'
                }, '*');
              }
            } catch (e) {}
          </script>
        </body>
      </html>
    `);
  });

  // Revoke extension token
  app.post("/api/extensions/revoke-token", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.substring(7);
      const tokenRecord = await storage.getExtensionTokenByToken(token);

      if (!tokenRecord) {
        return res.status(404).json({ error: "Token not found" });
      }

      await storage.deactivateExtensionToken(token);

      res.json({ success: true, message: "Token revoked" });
    } catch (error) {
      console.error("[EXTENSION] Error revoking token:", error);
      res.status(500).json({ error: "Failed to revoke token" });
    }
  });

  // List user's active extension tokens
  app.get(
    "/api/extensions/tokens",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const user = req.user as User;
        if (!user) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const tokens = await storage.getUserExtensionTokens(user.id);

        res.json({
          tokens: tokens.map((t) => ({
            id: t.id,
            name: t.name,
            platform: t.platform,
            createdAt: t.createdAt,
            lastUsedAt: t.lastUsedAt,
            expiresAt: t.expiresAt,
            isActive: t.isActive,
          })),
        });
      } catch (error) {
        console.error("[EXTENSION] Error listing tokens:", error);
        res.status(500).json({ error: "Failed to list tokens" });
      }
    },
  );

  // Delete/deactivate an extension token
  app.delete(
    "/api/extensions/tokens/:tokenId",
    isAuthenticatedGeneric,
    async (req, res) => {
      try {
        const user = req.user as User;
        if (!user) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const tokenId = req.params.tokenId;
        const tokens = await storage.getUserExtensionTokens(user.id);
        const token = tokens.find((t) => t.id === tokenId);

        if (!token) {
          return res.status(404).json({ error: "Token not found" });
        }

        await storage.deactivateExtensionToken(token.token);

        res.json({ success: true, message: "Token deleted" });
      } catch (error) {
        console.error("[EXTENSION] Error deleting token:", error);
        res.status(500).json({ error: "Failed to delete token" });
      }
    },
  );

  // ========== MEDIA IMPORT ROUTES (Social Media Content) ==========
  // These routes handle importing plans from images and videos (Instagram, TikTok, etc.)

  // Process media import (image OCR or video transcription)
  app.post("/api/extensions/import-media", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { mediaType, caption, source, sourceDevice, imageBase64 } =
        req.body;

      if (!mediaType || !["image", "video"].includes(mediaType)) {
        return res
          .status(400)
          .json({ error: "Valid media type required (image or video)" });
      }

      // Check subscription tier for import limits
      const monthlyImports = await storage.getUserMonthlyImportCount(user.id);
      const importLimit = getImportLimit(user);

      if (importLimit !== null && monthlyImports >= importLimit) {
        return res.status(403).json({
          error: "Monthly import limit reached",
          limit: importLimit,
          used: monthlyImports,
          upgrade: true,
          tier: user.subscriptionTier || "free",
          subscriptionInterval: user.subscriptionInterval || null,
          discoveryBonusImports: user.discoveryBonusImports || 0,
        });
      }

      // Import services
      const { extractTextFromImage, mergeMediaContent, detectMediaSource } =
        await import("./services/mediaInterpretationService");
      const { parseAIPlan, validateParsedPlan } = await import(
        "./services/aiPlanParser"
      );

      let extractedText = "";
      let ocrConfidence = 0;
      let imageDescription = "";

      if (mediaType === "image" && imageBase64) {
        const ocrResult = await extractTextFromImage(imageBase64, "image/jpeg");
        extractedText = ocrResult.extractedText;
        ocrConfidence = ocrResult.confidence;
        imageDescription = ocrResult.imageDescription || "";
      }

      // Merge caption with extracted text
      const mergedContent = mergeMediaContent(
        caption,
        extractedText,
        imageDescription,
      );

      if (mergedContent.length < 20) {
        return res.status(400).json({
          error: "Not enough content to create a plan",
          details:
            "Please share content that includes tasks, goals, or actionable items",
        });
      }

      // Parse the merged content as a plan
      const parsedPlan = await parseAIPlan(mergedContent);

      const validation = validateParsedPlan(parsedPlan);
      if (!validation.valid) {
        return res.status(400).json({
          error: "Failed to extract actionable plan",
          details: validation.errors,
        });
      }

      // Create the import record
      const planImport = await storage.createAiPlanImport({
        userId: user.id,
        source: source || detectMediaSource("", caption || ""),
        sourceDevice: sourceDevice || "android",
        rawText: mergedContent,
        parsedTitle: parsedPlan.title,
        parsedDescription: parsedPlan.description || null,
        parsedTasks: parsedPlan.tasks,
        confidence: parsedPlan.confidence,
        status: "pending",
      });

      res.json({
        success: true,
        import: planImport,
        parsed: {
          title: parsedPlan.title,
          description: parsedPlan.description,
          tasks: parsedPlan.tasks,
          confidence: parsedPlan.confidence,
          mediaProcessing: {
            extractedText,
            ocrConfidence,
            imageDescription,
          },
        },
        limits: {
          used: monthlyImports + 1,
          limit: importLimit,
        },
      });
    } catch (error) {
      console.error("[MEDIA IMPORT] Error processing media:", error);
      res.status(500).json({
        error: "Failed to process media",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== PLAN REMIX ROUTES (Combine Multiple Plans) ==========
  // These routes handle combining multiple community plans into one

  // Preview a remix of selected plans
  app.post("/api/community-plans/remix/preview", async (req, res) => {
    try {
      const { activityIds } = req.body;

      if (
        !activityIds ||
        !Array.isArray(activityIds) ||
        activityIds.length < 2
      ) {
        return res
          .status(400)
          .json({ error: "At least 2 activities required for remix" });
      }

      if (activityIds.length > 10) {
        return res
          .status(400)
          .json({ error: "Maximum 10 activities can be remixed at once" });
      }

      const { createRemix } = await import("./services/planRemixService");
      const remixResult = await createRemix(activityIds);

      res.json({
        success: true,
        preview: remixResult,
      });
    } catch (error) {
      console.error("[PLAN REMIX] Error creating preview:", error);
      res.status(500).json({
        error: "Failed to create remix preview",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Confirm and save a plan remix
  app.post("/api/community-plans/remix/confirm", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;

      // Allow demo users or authenticated users
      const userId = user?.id || "demo-user";

      const {
        activityIds,
        mergedTitle,
        mergedDescription,
        mergedTasks,
        attributions,
      } = req.body;

      if (!activityIds || !mergedTitle || !mergedTasks) {
        return res.status(400).json({ error: "Missing required remix data" });
      }

      // Create the new activity from the remix
      const activity = await storage.createActivity({
        userId: userId,
        title: mergedTitle,
        description:
          mergedDescription ||
          `Remixed from ${activityIds.length} community plans`,
        category: mergedTasks[0]?.category || "personal",
        status: "planning",
        planSummary: `Remixed plan combining ${activityIds.length} community plans`,
        tags: ["remix", "community"],
      });

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < mergedTasks.length; i++) {
        const taskData = mergedTasks[i];

        // First create the actual task in the tasks table
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description || undefined,
          category: taskData.category || "personal",
          priority: taskData.priority || "medium",
          userId: userId,
        });

        // Then link it to the activity with proper ordering
        await storage.addTaskToActivity(activity.id, task.id, i);
        createdTasks.push(task);
      }

      console.log(
        `[PLAN REMIX] Created ${createdTasks.length} tasks for remixed activity ${activity.id}`,
      );

      res.json({
        success: true,
        activity,
        tasksCreated: createdTasks.length,
        stats: {
          sourcePlans: activityIds.length,
          attributions,
        },
      });
    } catch (error) {
      console.error("[PLAN REMIX] Error confirming remix:", error);
      res.status(500).json({
        error: "Failed to save remixed plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== VERIFYMATE: CONTENT VERIFICATION ROUTES ==========
  // AI-powered fact-checking and content verification endpoints

  // Verify content (URL or direct text)
  app.post("/api/verify", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;

      // Require authentication
      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { url, content, platform, mediaUrls, author } = req.body;

      if (!url && !content) {
        return res.status(400).json({ error: "Either URL or content is required" });
      }

      // Check monthly verification limit (5 free per month)
      const userVerifications = await storage.getUserVerificationsThisMonth(user.id);
      const userRecord = await storage.getUser(user.id);
      const isPro = userRecord?.subscriptionTier === 'pro' || userRecord?.subscriptionTier === 'family';

      if (!isPro && userVerifications >= 5) {
        return res.status(403).json({
          error: "Monthly verification limit reached",
          limit: 5,
          used: userVerifications,
          upgradeUrl: "/pricing"
        });
      }

      // Import the verification service dynamically
      const { geminiVerificationService } = await import('./services/geminiVerificationService');

      if (!geminiVerificationService.isConfigured()) {
        return res.status(503).json({ error: "Verification service not configured" });
      }

      let extractedContent = content;
      let detectedPlatform = platform;

      // If URL provided, extract content first
      if (url) {
        // Detect platform from URL
        detectedPlatform = detectPlatform(url) || platform;

        // Try to extract content from URL
        if (isSocialMediaUrl(url)) {
          // Use Apify for social media extraction
          if (detectedPlatform === 'instagram' && apifyService.isAvailable()) {
            const igResult = await apifyService.extractInstagramReel(url);
            if (igResult.success) {
              extractedContent = igResult.caption || content;
            }
          } else if (detectedPlatform === 'tiktok' && apifyService.isAvailable()) {
            const ttResult = await apifyService.extractTikTokVideo(url);
            if (ttResult.success) {
              extractedContent = ttResult.caption || content;
            }
          }
        }

        // Fallback to Tavily for other URLs
        if (!extractedContent && isTavilyConfigured()) {
          try {
            const tavilyResult = await tavilyExtract(url);
            if (tavilyResult && tavilyResult.rawContent) {
              extractedContent = tavilyResult.rawContent;
            }
          } catch (e) {
            console.error('[VERIFY] Tavily extraction failed:', e);
          }
        }

        if (!extractedContent) {
          extractedContent = content || `Content from: ${url}`;
        }
      }

      // Perform verification
      const verificationResult = await geminiVerificationService.verifyContent({
        url,
        platform: detectedPlatform,
        content: extractedContent,
        mediaUrls,
        author,
      });

      // Generate share token
      const shareToken = crypto.randomBytes(16).toString('hex');

      // Save verification to database
      const { verifications } = await import('@shared/schema');
      const verification = await db.insert(verifications).values({
        userId: user.id,
        sourceUrl: url,
        sourcePlatform: detectedPlatform,
        sourceContent: extractedContent?.substring(0, 10000), // Limit content size
        sourceMediaUrls: mediaUrls || [],
        sourceAuthor: author,
        trustScore: verificationResult.trustScore,
        verdict: verificationResult.verdict,
        verdictSummary: verificationResult.verdictSummary,
        claims: verificationResult.claims,
        aiDetection: verificationResult.aiDetection,
        accountAnalysis: verificationResult.accountAnalysis,
        businessVerification: verificationResult.businessVerification,
        biasAnalysis: verificationResult.biasAnalysis,
        processingTimeMs: verificationResult.processingTimeMs,
        geminiModel: verificationResult.geminiModel,
        webGroundingUsed: verificationResult.webGroundingUsed,
        shareToken,
      }).returning();

      console.log(`[VERIFY] Verification completed for user ${user.id}: trust score ${verificationResult.trustScore}`);

      res.json({
        success: true,
        verification: {
          id: verification[0].id,
          ...verificationResult,
          shareToken,
          shareUrl: `/verify/result/${shareToken}`,
        },
      });
    } catch (error) {
      console.error('[VERIFY] Error during verification:', error);
      res.status(500).json({
        error: "Verification failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user's verification history
  app.get("/api/verify/history", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;

      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const verifications = await storage.getUserVerifications(user.id);

      res.json({
        success: true,
        verifications,
        count: verifications.length,
      });
    } catch (error) {
      console.error('[VERIFY] Error fetching history:', error);
      res.status(500).json({ error: "Failed to fetch verification history" });
    }
  });

  // Get a specific verification by ID
  app.get("/api/verify/:id", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;
      const { id } = req.params;

      const verification = await storage.getVerification(id);

      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      // Check if user owns this verification or it's public
      if (verification.userId !== user?.id && !verification.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({
        success: true,
        verification,
      });
    } catch (error) {
      console.error('[VERIFY] Error fetching verification:', error);
      res.status(500).json({ error: "Failed to fetch verification" });
    }
  });

  // Get verification by share token (public access)
  app.get("/api/verify/shared/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;

      const verification = await storage.getVerificationByShareToken(shareToken);

      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      res.json({
        success: true,
        verification,
      });
    } catch (error) {
      console.error('[VERIFY] Error fetching shared verification:', error);
      res.status(500).json({ error: "Failed to fetch verification" });
    }
  });

  // Get user's monthly verification count
  app.get("/api/verify/quota", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;

      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRecord = await storage.getUser(user.id);
      const usedThisMonth = await storage.getUserVerificationsThisMonth(user.id);
      const isPro = userRecord?.subscriptionTier === 'pro' || userRecord?.subscriptionTier === 'family';

      res.json({
        success: true,
        quota: {
          used: usedThisMonth,
          limit: isPro ? 'unlimited' : 5,
          remaining: isPro ? 'unlimited' : Math.max(0, 5 - usedThisMonth),
          isPro,
        },
      });
    } catch (error) {
      console.error('[VERIFY] Error fetching quota:', error);
      res.status(500).json({ error: "Failed to fetch quota" });
    }
  });

  // Make a verification public/private
  app.patch("/api/verify/:id/visibility", async (req, res) => {
    try {
      const user = req.user || (req as any).user || null;

      if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;
      const { isPublic } = req.body;

      const verification = await storage.getVerification(id);

      if (!verification) {
        return res.status(404).json({ error: "Verification not found" });
      }

      if (verification.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.updateVerificationVisibility(id, isPublic);

      res.json({
        success: true,
        isPublic,
      });
    } catch (error) {
      console.error('[VERIFY] Error updating visibility:', error);
      res.status(500).json({ error: "Failed to update visibility" });
    }
  });

  // Get verification service status
  app.get("/api/verify/status", async (_req, res) => {
    try {
      const { geminiVerificationService } = await import('./services/geminiVerificationService');
      const tavilyStatus = getTavilyStatus();
      const apifyStatus = apifyService.getStatus();

      res.json({
        success: true,
        services: {
          gemini: geminiVerificationService.getStatus(),
          tavily: tavilyStatus,
          apify: apifyStatus,
        },
      });
    } catch (error) {
      console.error('[VERIFY] Error checking status:', error);
      res.status(500).json({ error: "Failed to check service status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for scheduling
async function generateSchedulingSuggestions(
  userId: string,
  targetDate: string,
): Promise<any[]> {
  // Get user's pending tasks
  const tasks = await storage.getUserTasks(userId);
  const pendingTasks = tasks.filter((task) => !task.completed);

  if (pendingTasks.length === 0) {
    return [];
  }

  // Get user's notification preferences for optimal timing
  const preferences = await storage.getUserNotificationPreferences(userId);

  // Smart scheduling algorithm
  const suggestions = [];

  // Priority-based scheduling
  const prioritySchedule = createPriorityBasedSchedule(
    pendingTasks,
    targetDate,
    preferences,
  );
  if (prioritySchedule.suggestedTasks.length > 0) {
    const suggestion = await storage.createSchedulingSuggestion({
      userId,
      suggestionType: "priority_based",
      targetDate,
      suggestedTasks: prioritySchedule.suggestedTasks,
      score: prioritySchedule.score,
    });
    suggestions.push(suggestion);
  }

  // Time-optimized scheduling
  const timeOptimizedSchedule = createTimeOptimizedSchedule(
    pendingTasks,
    targetDate,
    preferences,
  );
  if (timeOptimizedSchedule.suggestedTasks.length > 0) {
    const suggestion = await storage.createSchedulingSuggestion({
      userId,
      suggestionType: "daily",
      targetDate,
      suggestedTasks: timeOptimizedSchedule.suggestedTasks,
      score: timeOptimizedSchedule.score,
    });
    suggestions.push(suggestion);
  }

  return suggestions;
}

function createPriorityBasedSchedule(
  tasks: Task[],
  targetDate: string,
  preferences?: NotificationPreferences,
) {
  // Sort by priority and time estimate
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const aPriority =
      priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority =
      priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    return bPriority - aPriority;
  });

  let currentTime = "09:00"; // Start at 9 AM
  const suggestedTasks = [];

  for (const task of sortedTasks.slice(0, 6)) {
    // Limit to 6 tasks per day
    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || "30 min");

    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || "30 min",
      suggestedStartTime: currentTime,
      reason: `${task.priority} priority task - tackle important work early`,
    });

    // Add task duration + 15 min buffer
    currentTime = addMinutesToTime(currentTime, timeInMinutes + 15);

    // Don't schedule past 6 PM
    if (timeToMinutes(currentTime) > timeToMinutes("18:00")) {
      break;
    }
  }

  return {
    suggestedTasks,
    score: Math.min(95, 70 + suggestedTasks.length * 5), // Higher score for more tasks scheduled
  };
}

function createTimeOptimizedSchedule(
  tasks: Task[],
  targetDate: string,
  preferences?: NotificationPreferences,
) {
  // Optimize for total time and natural flow
  const shortTasks = tasks.filter(
    (task) => getTimeEstimateMinutes(task.timeEstimate || "30 min") <= 30,
  );
  const longTasks = tasks.filter(
    (task) => getTimeEstimateMinutes(task.timeEstimate || "30 min") > 30,
  );

  let currentTime = "10:00"; // Start at 10 AM for time-optimized
  const suggestedTasks = [];

  // Start with short tasks for momentum
  for (const task of shortTasks.slice(0, 3)) {
    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || "30 min");

    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || "30 min",
      suggestedStartTime: currentTime,
      reason: "Quick wins to build momentum",
    });

    currentTime = addMinutesToTime(currentTime, timeInMinutes + 10);
  }

  // Add lunch break
  if (timeToMinutes(currentTime) < timeToMinutes("12:00")) {
    currentTime = "13:00";
  }

  // Add longer tasks after lunch
  for (const task of longTasks.slice(0, 2)) {
    if (timeToMinutes(currentTime) > timeToMinutes("17:00")) break;

    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || "30 min");

    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || "30 min",
      suggestedStartTime: currentTime,
      reason: "Focus time for complex tasks",
    });

    currentTime = addMinutesToTime(currentTime, timeInMinutes + 20);
  }

  return {
    suggestedTasks,
    score: Math.min(90, 60 + suggestedTasks.length * 8),
  };
}

async function createRemindersFromSchedule(suggestion: any, userId: string) {
  const preferences = await storage.getUserNotificationPreferences(userId);
  const leadTime = preferences?.reminderLeadTime || 30;

  for (const taskSuggestion of suggestion.suggestedTasks) {
    // Calculate reminder time
    const taskDateTime = new Date(
      `${suggestion.targetDate}T${taskSuggestion.suggestedStartTime}`,
    );
    const reminderTime = new Date(
      taskDateTime.getTime() - leadTime * 60 * 1000,
    );

    // Only create reminder if it's in the future
    if (reminderTime > new Date()) {
      await storage.createTaskReminder({
        userId,
        taskId: taskSuggestion.taskId,
        reminderType: "custom",
        scheduledAt: reminderTime,
        title: `Upcoming: ${taskSuggestion.title}`,
        message: `Your task "${taskSuggestion.title}" is scheduled to start in ${leadTime} minutes.`,
      });
    }
  }
}

// Utility functions
function getTimeEstimateMinutes(timeEstimate: string): number {
  if (timeEstimate.includes("hour")) {
    const hours = parseFloat(timeEstimate);
    return hours * 60;
  } else {
    return parseInt(timeEstimate) || 30;
  }
}

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutesToTime(timeString: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(timeString) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
