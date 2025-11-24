import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiProviderAuth, isAuthenticatedGeneric } from "./multiProviderAuth";
import { aiService } from "./services/aiService";
import { lifestylePlannerAgent } from "./services/lifestylePlannerAgent";
import { langGraphPlanningAgent } from "./services/langgraphPlanningAgent";
import { simpleConversationalPlanner } from "./services/simpleConversationalPlanner";
import { enrichJournalEntry } from "./services/journalEnrichmentService";
import { contactSyncService } from "./contactSync";
import { getProvider } from "./services/llmProvider";
import {
  insertGoalSchema,
  syncContactsSchema,
  addContactSchema,
  insertTaskSchema,
  insertJournalEntrySchema,
  insertChatImportSchema,
  insertPrioritySchema,
  insertNotificationPreferencesSchema,
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
  type Task,
  type Activity,
  type ActivityTask,
  type NotificationPreferences,
  type SignupUser,
  type ProfileCompletion,
  type LifestylePlannerSession
} from "@shared/schema";
import { eq, and, or, isNull, isNotNull, ne, sql } from "drizzle-orm";
import bcrypt from 'bcrypt';
import { z } from "zod";
import crypto from 'crypto';
import { sendWelcomeEmail } from "./emailService";
import { generateContentHash } from "./utils/contentHash";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';
import { sendGroupNotification } from './services/notificationService';

// Helper function to format plan preview for Smart mode
function formatPlanPreview(plan: any): string {
  if (!plan) return '';
  
  let preview = `\n\n## 📋 ${plan.title || 'Your Plan'}\n\n`;
  
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
      preview += '\n';
    });
    preview += '\n';
  }
  
  if (plan.budget && plan.budget.total) {
    preview += `**💰 Budget Breakdown (Total: $${plan.budget.total}):**\n\n`;
    if (plan.budget.breakdown && plan.budget.breakdown.length > 0) {
      plan.budget.breakdown.forEach((item: any) => {
        preview += `• **${item.category}:** $${item.amount}`;
        if (item.notes) {
          preview += ` - ${item.notes}`;
        }
        preview += '\n';
      });
    }
    if (plan.budget.buffer) {
      preview += `• **Buffer:** $${plan.budget.buffer} (for unexpected costs)\n`;
    }
    preview += '\n';
  }
  
  if (plan.weather) {
    preview += `**🌤️ Weather:**\n${plan.weather.forecast}\n\n`;
    if (plan.weather.recommendations && plan.weather.recommendations.length > 0) {
      preview += `**Recommendations:**\n`;
      plan.weather.recommendations.forEach((rec: string) => {
        preview += `• ${rec}\n`;
      });
      preview += '\n';
    }
  }
  
  if (plan.tips && plan.tips.length > 0) {
    preview += `**💡 Tips:**\n`;
    plan.tips.forEach((tip: string) => {
      preview += `• ${tip}\n`;
    });
    preview += '\n';
  }
  
  return preview;
}

// Configure multer for media uploads
const uploadDir = path.join(process.cwd(), 'attached_assets', 'journal_media');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'journal_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and videos (MP4, MOV, AVI) are allowed'));
    }
  }
});

// Helper function to extract authenticated user ID from request
function getUserId(req: any): string | null {
  // Priority 1: Passport authentication (OAuth providers - Google, Facebook)
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user?.id) {
      console.log('[Auth] Passport user authenticated:', req.user.id);
      return req.user.id;
    }
    // Check if user ID is stored directly in session by Passport
    if (req.session?.passport?.user) {
      const userId = typeof req.session.passport.user === 'string' 
        ? req.session.passport.user 
        : req.session.passport.user.id;
      console.log('[Auth] Passport session user:', userId);
      return userId;
    }
  }
  
  // Priority 2: Direct session-based authentication (email/password)
  if (req.session?.userId) {
    console.log('[Auth] Direct session user:', req.session.userId);
    return req.session.userId;
  }
  
  // Priority 3: Replit auth user
  if (req.user?.claims?.sub) {
    console.log('[Auth] Replit auth user:', req.user.claims.sub);
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

// Helper function for Smart Plan structured conversation
async function handleSmartPlanConversation(req: any, res: any, message: string, conversationHistory: any[], userId: string) {
  try {
    // Check if this is a new conversation (frontend has no conversation history)
    const isNewConversation = !conversationHistory || conversationHistory.length === 0;
    
    let session;
    let isFirstMessage;
    
    if (isNewConversation) {
      // New conversation - create fresh session and clear old one
      console.log('[SMART PLAN] NEW conversation detected - creating fresh session');
      
      const existingSession = await storage.getActiveLifestylePlannerSession(userId);
      if (existingSession) {
        console.log('[SMART PLAN] Completing old session:', existingSession.id, 'with', (existingSession.conversationHistory || []).length, 'messages');
        await storage.updateLifestylePlannerSession(existingSession.id, {
          isComplete: true,
          sessionState: 'completed'
        }, userId);
      }
      
      // Create fresh new session for Smart Plan mode
      session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: 'intake',
        slots: {},
        conversationHistory: [],
        externalContext: {
          currentMode: 'smart',
          questionCount: { smart: 0, quick: 0 },
          isFirstInteraction: true
        }
      });
      
      console.log('[SMART PLAN] Created fresh session:', session.id);
      isFirstMessage = true;
    } else {
      // Continuing existing conversation - get active session
      console.log('[SMART PLAN] CONTINUING conversation with', conversationHistory.length, 'messages');
      session = await storage.getActiveLifestylePlannerSession(userId);
      
      // VALIDATION: Prevent continuing completed sessions
      if (session && session.isComplete) {
        console.warn('[SMART PLAN] Cannot continue completed session:', session.id);
        return res.status(400).json({
          error: 'This conversation has already been completed. Please start a new session.',
          sessionCompleted: true
        });
      }
      
      if (!session) {
        // CRITICAL FIX: If frontend has conversation history but backend has no active session,
        // it means the session was completed. Don't silently create a new one - tell frontend to reset.
        console.warn('[SMART PLAN] Frontend has history but backend has no active session - session was likely completed');
        return res.status(400).json({
          error: 'This conversation session is no longer available. Please start a new chat.',
          sessionCompleted: true,
          requiresReset: true
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
      .replace(/[!?.,:;]+/g, ' ')
      .replace(/let'?s/g, 'lets')
      .replace(/that'?s/g, 'thats')
      .replace(/it'?s/g, 'its')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check for negations - but exclude positive idioms like "no problem", "no worries"
    const hasNegation = /\b(don'?t|not|stop|wait|hold|never|cancel|abort)\b/i.test(msgNormalized) ||
                       (/\bno\b/.test(msgNormalized) && !/\bno (problem|worries|issues?|concerns?)\b/i.test(msgNormalized));
    
    // Common affirmative patterns (flexible matching)
    const hasAffirmative = /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good|fine|alright|absolutely|definitely|sounds? good|that works|lets do|go ahead|proceed)\b/i.test(msgNormalized);
    
    // Generate/create command patterns
    const hasGenerateCommand = /\b(generate|create|make)\b.*(plan|activity|it)\b/i.test(msgNormalized);
    
    const isGenerateCommand = !hasNegation && (hasAffirmative || hasGenerateCommand);
    
    if (planConfirmed && isGenerateCommand) {
      // User wants to create the activity - extract the generated plan
      const generatedPlan = session.slots?._generatedPlan;
      
      if (generatedPlan) {
        // SECURITY: Block demo users from creating activities/tasks
        if (isDemoUser(userId)) {
          return res.status(403).json({
            error: 'Demo users cannot create activities. Please sign in to save your plan.',
            requiresAuth: true,
            message: '🔒 **Sign In Required**\n\nDemo users can chat with the AI and see plan previews, but you need to sign in to save plans and create tasks.\n\nSign in to unlock:\n✅ Save plans and tasks\n✅ Track your progress\n✅ Collaborate with others',
            session
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
            session
          });
        }

        // Create activity from the structured plan
        const activity = await storage.createActivity({
          title: generatedPlan.title || 'Smart Plan Activity',
          description: generatedPlan.summary || 'Generated from Smart Plan conversation',
          category: generatedPlan.category || 'personal',
          status: 'planning',
          userId
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
              userId
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Mark session as completed  
        await storage.updateLifestylePlannerSession(session.id, {
          sessionState: 'completed',
          isComplete: true,
          generatedPlan: { ...generatedPlan, tasks: createdTasks }
        }, userId);

        const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
        
        // Construct full URL for activity link
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const host = req.get('host') || 'journalmate.replit.app';
        const activityUrl = `${protocol}://${host}/activities/${activity.id}`;
        
        return res.json({
          message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](${activityUrl})`,
          activityCreated: true,
          activity,
          planComplete: true,
          createdTasks,
          session: updatedSession
        });
      }
    }
    
    // Check if we're awaiting plan confirmation
    const awaitingConfirmation = session.externalContext?.awaitingPlanConfirmation;
    
    if (awaitingConfirmation) {
      // User is responding to "Are you comfortable with this plan?"
      // FIXED: Remove ^ anchor to match anywhere in message, handle punctuation
      const msgClean = message.trim().toLowerCase().replace(/[!?.,:;]+/g, '');
      const affirmativePattern = /\b(yes|yeah|yep|sure|ok|okay|looks good|perfect|great|sounds good|i'?m comfortable|that works|let'?s do it)\b/i;
      const negativePattern = /\b(no|nope|not really|not quite|i want to|i'?d like to|can we|could we|change|add|modify)\b/i;
      
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
              session
            });
          }

          // Create activity from the structured plan
          const activity = await storage.createActivity({
            title: generatedPlan.title || 'Smart Plan Activity',
            description: generatedPlan.summary || 'Generated from Smart Plan conversation',
            category: generatedPlan.category || 'personal',
            status: 'planning',
            userId
          });

          // Create tasks and link them to the activity
          const createdTasks = [];
          if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
            for (let i = 0; i < generatedPlan.tasks.length; i++) {
              const taskData = generatedPlan.tasks[i];
              const task = await storage.createTask({
                title: taskData.title,
                description: taskData.description,
                category: taskData.category || generatedPlan.domain || generatedPlan.category || 'personal',
                priority: taskData.priority,
                timeEstimate: taskData.timeEstimate,
                userId
              });
              await storage.addTaskToActivity(activity.id, task.id, i);
              createdTasks.push(task);
            }
          }

          // Mark session as completed  
          await storage.updateLifestylePlannerSession(session.id, {
            sessionState: 'completed',
            isComplete: true,
            generatedPlan: { ...generatedPlan, tasks: createdTasks },
            externalContext: {
              ...session.externalContext,
              awaitingPlanConfirmation: false,
              planConfirmed: true
            }
          }, userId);

          const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
          
          return res.json({
            message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](/activities/${activity.id})`,
            activityCreated: true,
            activity,
            planComplete: true,
            createdTasks,
            session: updatedSession
          });
        }
      } else if (negativePattern.test(message.trim()) || message.toLowerCase().includes('change') || message.toLowerCase().includes('add')) {
        // User wants to make changes - continue gathering info
        const updatedContext = {
          ...session.externalContext,
          awaitingPlanConfirmation: false,
          planConfirmed: false
        };
        
        await storage.updateLifestylePlannerSession(session.id, {
          externalContext: updatedContext
        }, userId);

        // Process their change request with LangGraph
        const langGraphResponse = await langGraphPlanningAgent.processMessage(
          parseInt(userId),
          message,
          userProfile,
          session.conversationHistory,
          storage,
          'smart'
        );

        // Update conversation history
        const updatedHistory = [
          ...session.conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: langGraphResponse.message }
        ];

        await storage.updateLifestylePlannerSession(session.id, {
          conversationHistory: updatedHistory,
          slots: {
            ...session.slots,
            _generatedPlan: langGraphResponse.finalPlan || session.slots?._generatedPlan
          }
        }, userId);

        return res.json({
          message: langGraphResponse.message,
          sessionId: session.id,
          contextChips: [],  // LangGraph doesn't use context chips
          planReady: langGraphResponse.readyToGenerate || false,
          session
        });
      }
      // If unclear response, treat as wanting to make changes/continue conversation
    }

    // Check for help intent - if user asks about what the modes do
    const helpIntentPattern = /what.*do(es)?.*it.*do|how.*work|difference.*(quick|smart)|what.*is.*smart.*plan|what.*is.*quick.*plan|explain.*mode|help.*understand/i;
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
        session
      });
    }

    // Check if user is confirming to create the plan
    const confirmationKeywords = ['yes', 'create the plan', 'sounds good', 'perfect', 'great', 'that works', 'confirm', 'proceed'];
    const userWantsToCreatePlan = confirmationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    // If user is ready to create plan and confirms
    if (userWantsToCreatePlan && session.sessionState === 'confirming') {
      // Create a basic plan structure
      const planData = {
        title: `Smart Plan: ${session.slots?.activityType || 'Activity'}`,
        summary: `Personalized plan based on your conversation`,
        category: 'personal',
        tasks: [
          {
            title: `Prepare for ${session.slots?.activityType || 'activity'}`,
            description: 'Get ready and gather what you need',
            category: 'preparation',
            priority: 'medium',
            timeEstimate: '30 min'
          },
          {
            title: `Execute ${session.slots?.activityType || 'activity'}`,
            description: 'Follow through with the planned activity',
            category: 'action',
            priority: 'high', 
            timeEstimate: '1-2 hours'
          }
        ]
      };

      // Create activity from the structured plan
      const activity = await storage.createActivity({
        title: planData.title,
        description: planData.summary,
        category: planData.category,
        status: 'planning',
        userId
      });

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < planData.tasks.length; i++) {
        const taskData = planData.tasks[i];
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority as 'low' | 'medium' | 'high',
          timeEstimate: taskData.timeEstimate,
          userId
        });
        await storage.addTaskToActivity(activity.id, task.id, i);
        createdTasks.push(task);
      }

      // Mark session as completed
      await storage.updateLifestylePlannerSession(session.id, {
        sessionState: 'completed',
        isComplete: true,
        generatedPlan: { ...planData, tasks: createdTasks }
      }, userId);

      // Get updated session for consistent response shape
      const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
      
      return res.json({
        message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](/activities/${activity.id})`,
        activityCreated: true,
        activity,
        planComplete: true,
        createdTasks,
        session: updatedSession
      });
    }

    // Process with LangGraph planning agent for Smart Plan mode
    const langGraphResponse = await langGraphPlanningAgent.processMessage(
      parseInt(userId),
      message,
      userProfile,
      session.conversationHistory,
      storage,
      'smart'
    );

    // Map LangGraph response to ConversationResponse format
    const response = {
      message: langGraphResponse.message,
      readyToGenerate: langGraphResponse.readyToGenerate || false,
      planReady: langGraphResponse.readyToGenerate || false,
      updatedSlots: session.slots,
      updatedConversationHistory: [...session.conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: langGraphResponse.message }],
      updatedExternalContext: session.externalContext,
      sessionState: langGraphResponse.phase as 'gathering' | 'processing' | 'confirming' | 'completed',
      generatedPlan: langGraphResponse.finalPlan,
      createActivity: false,
      progress: langGraphResponse.progress,
      phase: langGraphResponse.phase,
      domain: langGraphResponse.domain
    };

    // SERVER-SIDE ACTIVITY TYPE DETECTION OVERRIDE
    // If the message contains interview keywords but AI extracted wrong activity type, override it
    const interviewKeywords = ['interview', 'job interview', 'interview prep', 'prepare for.*interview', 'interviewing'];
    const learningKeywords = ['study', 'learn', 'course', 'education', 'prep for exam', 'test prep'];
    const workoutKeywords = ['workout', 'exercise', 'gym', 'fitness', 'training session'];
    const wellnessKeywords = ['meditation', 'yoga', 'mindfulness', 'breathing exercise'];
    
    const messageLower = message.toLowerCase();
    const hasInterviewKeyword = interviewKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasLearningKeyword = learningKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasWorkoutKeyword = workoutKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasWellnessKeyword = wellnessKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    
    // Priority detection: "the goal is to..." phrase indicates primary activity
    const goalPhraseMatch = messageLower.match(/(?:the )?goal (?:is|was) to (?:pass|prepare for|get ready for|ace|nail|do well in|succeed in).*?(?:interview|study|learn|workout|meditate)/i);
    
    if (response.updatedSlots) {
      const currentActivityType = response.updatedSlots.activityType?.toLowerCase() || '';
      
      // Override if interview detected but not properly classified
      if (hasInterviewKeyword || (goalPhraseMatch && goalPhraseMatch[0].includes('interview'))) {
        if (currentActivityType !== 'interview_prep' && currentActivityType !== 'interview') {
          console.log(`[OVERRIDE] Detected interview keywords but AI extracted activityType="${currentActivityType}". Overriding to "interview_prep".`);
          response.updatedSlots.activityType = 'interview_prep';
        }
      } else if (hasLearningKeyword && currentActivityType !== 'learning') {
        console.log(`[OVERRIDE] Detected learning keywords but AI extracted activityType="${currentActivityType}". Overriding to "learning".`);
        response.updatedSlots.activityType = 'learning';
      } else if (hasWorkoutKeyword && currentActivityType !== 'workout') {
        console.log(`[OVERRIDE] Detected workout keywords but AI extracted activityType="${currentActivityType}". Overriding to "workout".`);
        response.updatedSlots.activityType = 'workout';
      } else if (hasWellnessKeyword && currentActivityType !== 'wellness') {
        console.log(`[OVERRIDE] Detected wellness keywords but AI extracted activityType="${currentActivityType}". Overriding to "wellness".`);
        response.updatedSlots.activityType = 'wellness';
      }
    }

    // Backend guardrail: NEVER generate plan on first interaction
    if (isFirstMessage && (response.readyToGenerate || response.planReady)) {
      console.warn('Attempted to generate plan on first message - blocking and forcing question');
      response.readyToGenerate = false;
      response.planReady = false;
    }

    // Check if plan is ready for confirmation
    const smartPlanConfirmed = session.externalContext?.planConfirmed;
    const smartAwaitingConfirmation = session.externalContext?.awaitingPlanConfirmation;
    const isFirstPlanReady = (response.readyToGenerate || response.planReady || response.showGenerateButton) && !smartAwaitingConfirmation;

    // Persist updated session data from agent (includes full conversation history and generated plan)
    await storage.updateLifestylePlannerSession(session.id, {
      conversationHistory: response.updatedConversationHistory || session.conversationHistory,
      slots: {
        ...(response.updatedSlots || session.slots),
        _generatedPlan: response.generatedPlan || session.slots?._generatedPlan
      },
      externalContext: {
        ...(response.updatedExternalContext || session.externalContext),
        isFirstInteraction: false,
        // Set confirmation flags if plan is ready for first time
        ...(isFirstPlanReady ? { awaitingPlanConfirmation: true, planConfirmed: false } : {})
      },
      sessionState: isFirstPlanReady ? 'confirming' : response.sessionState
    }, userId);

    // Handle plan confirmation flow
    console.log('[SMART PLAN] Confirmation flow check:', {
      readyToGenerate: response.readyToGenerate,
      planReady: response.planReady,
      smartPlanConfirmed,
      smartAwaitingConfirmation,
      isFirstPlanReady
    });

    if (response.readyToGenerate || response.planReady || response.showGenerateButton) {
      if (smartPlanConfirmed) {
        console.log('[SMART PLAN] Plan already confirmed - showing generate button');
        // Plan already confirmed - show Generate Plan button immediately
        return res.json({
          message: response.message,
          planReady: true,
          sessionId: session.id,
          showCreatePlanButton: true,
          showGenerateButton: true,
          session
        });
      } else if (!smartAwaitingConfirmation) {
        console.log('[SMART PLAN] First time plan ready - checking if confirmation prompt already included');
        // Check if AI already asked for confirmation (case-insensitive, flexible matching)
        const messageLower = response.message.toLowerCase();
        const alreadyAskedConfirmation = messageLower.includes("are you comfortable") || 
                                         messageLower.includes("does this work") ||
                                         messageLower.includes("is this okay") ||
                                         messageLower.includes("sound good") ||
                                         /ready to (proceed|generate|create)/.test(messageLower);
        
        // Get the plan from response (could be in plan, generatedPlan, or extractedInfo.plan)
        const planData = response.plan || response.generatedPlan || response.extractedInfo?.plan;
        const planPreview = formatPlanPreview(planData);
        
        // First time plan is ready - show plan preview and ask for confirmation
        const confirmationMessage = alreadyAskedConfirmation 
          ? response.message 
          : response.message + "\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)";
        
        return res.json({
          message: planPreview + confirmationMessage,
          planReady: false, // Don't show button yet
          sessionId: session.id,
          showCreatePlanButton: false, // Don't show button until confirmed
          session
        });
      } else {
        console.log('[SMART PLAN] Awaiting user response to confirmation');
      }
      // If awaitingConfirmation is true but not confirmed yet, fall through to normal response
    }

    // If user confirmed, create the activity
    if (response.createActivity) {
      const planData = response.generatedPlan;
      
      // Create activity from the structured plan
      const activity = await storage.createActivity({
        title: planData.title || 'Smart Plan Activity',
        description: planData.summary || 'Generated from Smart Plan conversation',
        category: planData.category || 'personal',
        status: 'planning',
        userId
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
            userId
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
          createdTasks.push(task); // Collect real task with database ID
        }
      }
      
      // Update the generated plan with real tasks
      response.generatedPlan = {
        ...planData,
        tasks: createdTasks
      };

      // Mark session as completed  
      await storage.updateLifestylePlannerSession(session.id, {
        sessionState: 'completed',
        isComplete: true,
        generatedPlan: response.generatedPlan // Use updated plan with real tasks
      }, userId);

      // Get updated session for consistent response shape
      const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
      
      return res.json({
        message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](/activities/${activity.id})`,
        activityCreated: true,
        activity,
        planComplete: true,
        createdTasks,
        session: updatedSession
      });
    }

    // Regular conversation response (session already updated above with conversation history, slots, and externalContext)
    return res.json({
      message: response.message,
      sessionId: session?.id,
      contextChips: response.contextChips || [],
      planReady: response.planReady || false,
      createdActivity: response.createdActivity ? { id: response.createdActivity.id, title: response.createdActivity.title } : undefined,
      progress: response.progress || 0,
      phase: response.phase || 'gathering',
      domain: response.domain || 'general',
      session
    });

  } catch (error) {
    console.error('Smart Plan conversation error:', error);
    return res.status(500).json({
      error: 'Failed to process Smart Plan conversation',
      message: 'Sorry, I encountered an issue. Please try again.'
    });
  }
}

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

// Helper function to check and increment plan usage
async function checkAndIncrementPlanUsage(userId: string): Promise<{ allowed: boolean; planCount: number; planLimit: number | null }> {
  const user = await storage.getUserById(userId);
  
  if (!user) {
    return { allowed: false, planCount: 0, planLimit: null };
  }

  // Check if plan count needs to be reset (monthly)
  const now = new Date();
  if (user.planCountResetDate && new Date(user.planCountResetDate) < now) {
    await storage.updateUserField(userId, 'planCount', 0);
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);
    await storage.updateUserField(userId, 'planCountResetDate', nextReset);
    user.planCount = 0;
  }

  const tier = user.subscriptionTier || 'free';
  const planCount = user.planCount || 0;
  
  // Free tier: 5 plans per month, Pro/Family: unlimited
  const planLimit = tier === 'free' ? 5 : null;
  
  if (planLimit && planCount >= planLimit) {
    return { allowed: false, planCount, planLimit };
  }

  // Increment plan count
  await storage.updateUserField(userId, 'planCount', planCount + 1);
  
  return { allowed: true, planCount: planCount + 1, planLimit };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Replit Auth integration
  await setupAuth(app);

  // Multi-provider OAuth setup (Google, Facebook)
  await setupMultiProviderAuth(app);
  
  // ========== DYNAMIC OPEN GRAPH IMAGE GENERATOR ==========
  // Serve dynamically generated OG images for share previews
  app.get("/api/og-image/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { generateOGImage } = await import('./services/ogImageGenerator');
      
      // Get activity data (try via share token or activity ID)
      const activity = await storage.getActivityByShareToken(activityId) || 
                      await storage.getActivity(activityId, DEMO_USER_ID);
      
      if (!activity || !activity.isPublic) {
        return res.status(404).send('Activity not found or not public');
      }
      
      const tasks = await storage.getActivityTasks(activity.id, activity.userId);
      
      // Construct base URL for absolute image paths (with host validation)
      let baseUrl = process.env.PUBLIC_BASE_URL;
      if (!baseUrl) {
        const requestHost = (req.get('host') || '').toLowerCase();
        
        // Strip port to get clean hostname for validation
        const hostname = requestHost.split(':')[0];
        
        // Validate host to prevent header spoofing - exact match or trusted domain suffix
        const trustedDomains = ['replit.app', 'repl.co'];
        const trustedExactHosts = ['localhost'];
        
        const isTrusted = 
          trustedExactHosts.includes(hostname) ||
          trustedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
        
        if (isTrusted) {
          baseUrl = `${req.protocol}://${requestHost}`;
        } else {
          console.warn('[OG IMAGE] Suspicious host header, using localhost fallback:', requestHost);
          baseUrl = 'http://localhost:5000';
        }
      }
      
      // Generate image
      const imageBuffer = await generateOGImage({
        activity,
        tasks,
        baseUrl
      });
      
      // Set caching headers (cache for 1 hour)
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(imageBuffer);
    } catch (error) {
      console.error('[OG IMAGE] Error generating image:', error);
      res.status(500).send('Error generating image');
    }
  });
  
  // ========== SERVER-SIDE RENDERED SHARE PAGE FOR SOCIAL CRAWLERS ==========
  // This route must come BEFORE Vite middleware to serve pre-rendered HTML with OG tags
  // Social media crawlers (WhatsApp, Facebook, Twitter) don't execute JavaScript,
  // so we need to inject Open Graph meta tags server-side for rich previews
  app.get("/share/:token", async (req, res, next) => {
    const { token } = req.params;
    const userAgent = req.get('user-agent') || '';
    
    // Detect social media crawlers and bots
    const isCrawler = /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Slackbot|instagram|pinterest|reddit/i.test(userAgent);
    
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
      
      const tasks = await storage.getActivityTasks(activity.id, activity.userId);
      
      // Category emoji mapping
      const categoryEmojis: Record<string, string> = {
        fitness: '💪',
        health: '🏥',
        career: '💼',
        learning: '📚',
        finance: '💰',
        relationships: '❤️',
        creativity: '🎨',
        travel: '✈️',
        home: '🏠',
        personal: '⭐',
        other: '📋'
      };
      const emoji = categoryEmojis[activity.category?.toLowerCase()] || '✨';
      
      // Calculate progress
      const completedTasks = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const progressText = totalTasks > 0 ? ` - ${progressPercent}% complete!` : '';
      
      // Create rich, emoji-enhanced title and description
      const baseTitle = activity.shareTitle || activity.planSummary || activity.title || 'Shared Activity';
      const pageTitle = `${emoji} ${baseTitle}${progressText}`;
      const taskInfo = totalTasks > 0 ? ` • ${totalTasks} tasks • ${completedTasks} completed` : '';
      const pageDescription = activity.description 
        ? `${activity.description}${taskInfo}` 
        : `Join this ${activity.category} plan on JournalMate${taskInfo}`;
      
      // Use dynamically generated OG image with activity details
      const baseUrl = req.protocol + '://' + req.get('host');
      const shareImage = `${baseUrl}/api/share/${token}/og-image`;
      const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // Read client template (works in both dev and production)
      const pathModule = await import('path');
      const fsPromises = await import('fs/promises');
      const clientTemplate = pathModule.resolve(process.cwd(), "client", "index.html");
      
      let template = await fsPromises.readFile(clientTemplate, "utf-8");
      
      // Escape HTML to prevent XSS (for attributes and content)
      const escapeHtml = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      const safePageTitle = escapeHtml(pageTitle);
      const safePageDescription = escapeHtml(pageDescription);
      const safeCurrentUrl = escapeHtml(currentUrl);
      const safeShareImage = escapeHtml(shareImage);
      
      // Remove all existing OG/Twitter meta tags from default template
      // This ensures crawlers see our share-specific tags first
      template = template.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '');
      template = template.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');
      template = template.replace(/<meta\s+name="description"[^>]*>/gi, '');
      
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
      
      template = template.replace('</head>', ogTags);
      
      // Send HTML with injected OG tags
      res.status(200).set({ "Content-Type": "text/html" }).send(template);
    } catch (e) {
      console.error('[SHARE SSR] Error serving share page:', e);
      // Fall through to normal SPA handling
      next();
    }
  });

  // ========== STRIPE SUBSCRIPTION ROUTES ==========
  
  // Create checkout session for subscription
  app.post('/api/subscription/checkout', isAuthenticatedGeneric, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const { priceId, tier } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.username,
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUserField(userId, 'stripeCustomerId', customerId);
      }

      // Use production domain (journalmate.ai) for production, or dev domain for development
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
      const baseUrl = isProduction 
        ? 'https://journalmate.ai'
        : (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');
      
      // Logo URL - use journalmate.ai for production (deployed static assets)
      const logoUrl = isProduction
        ? 'https://journalmate.ai/icons/email/email-logo-512.png'
        : `${baseUrl}/icons/email/email-logo-512.png`;
      
      // Try to create checkout session, but if customer doesn't exist (old test mode customer in live mode),
      // create a new customer and try again
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/subscription/canceled`,
          metadata: { userId, tier },
          subscription_data: {
            trial_period_days: 7,
            metadata: { userId, tier }
          },
          // Add JournalMate branding with HD logo
          custom_text: {
            submit: {
              message: 'Start your 7-day free trial and unlock unlimited AI-powered planning!'
            }
          }
        });
      } catch (checkoutError: any) {
        // If customer doesn't exist (likely from test mode → live mode migration), create new customer
        if (checkoutError.code === 'resource_missing' && checkoutError.param === 'customer') {
          console.log('[CHECKOUT] Customer not found in live mode, creating new customer');
          const newCustomer = await stripe.customers.create({
            email: user.email || undefined,
            name: user.username,
            metadata: { userId }
          });
          customerId = newCustomer.id;
          await storage.updateUserField(userId, 'stripeCustomerId', customerId);
          
          // Retry with new customer
          session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/subscription/canceled`,
            metadata: { userId, tier },
            subscription_data: {
              trial_period_days: 7,
              metadata: { userId, tier }
            },
            custom_text: {
              submit: {
                message: 'Start your 7-day free trial and unlock unlimited AI-powered planning!'
              }
            }
          });
        } else {
          throw checkoutError;
        }
      }

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Checkout session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Customer Portal session
  app.post('/api/subscription/portal', isAuthenticatedGeneric, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const userId = req.user?.id;
      const user = await storage.getUserById(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      // Use production domain (journalmate.ai) for production, or dev domain for development
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
      const baseUrl = isProduction 
        ? 'https://journalmate.ai'
        : (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');
      
      let session;
      try {
        session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${baseUrl}/settings`
        });
      } catch (portalError: any) {
        // If customer doesn't exist (old test mode customer), return error
        if (portalError.code === 'resource_missing') {
          return res.status(400).json({ error: 'Please create a subscription first' });
        }
        throw portalError;
      }

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get subscription status
  app.get('/api/subscription/status', isAuthenticatedGeneric, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        tier: user.subscriptionTier || 'free',
        status: user.subscriptionStatus || 'active',
        planCount: user.planCount || 0,
        planLimit: user.subscriptionTier === 'free' ? 5 : null,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt
      });
    } catch (error: any) {
      console.error('Status check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhooks
  app.post('/api/webhook/stripe', async (req, res) => {
    if (!stripe) {
      return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;
          
          if (userId && tier) {
            await storage.updateUserField(userId, 'subscriptionTier', tier);
            await storage.updateUserField(userId, 'subscriptionStatus', 'trialing');
            await storage.updateUserField(userId, 'stripeSubscriptionId', session.subscription);
            
            // Set trial end date (7 days from now)
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 7);
            await storage.updateUserField(userId, 'trialEndsAt', trialEnd);
            
            // Reset plan count
            await storage.updateUserField(userId, 'planCount', 0);
            const resetDate = new Date();
            resetDate.setMonth(resetDate.getMonth() + 1);
            await storage.updateUserField(userId, 'planCountResetDate', resetDate);
          }
          break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            const previousStatus = event.type === 'customer.subscription.updated' 
              ? (event.data as any).previous_attributes?.status 
              : null;
            
            await storage.updateUserField(userId, 'subscriptionStatus', subscription.status);
            
            if (subscription.status === 'active') {
              await storage.updateUserField(userId, 'trialEndsAt', null);
              
              // Send Pro welcome email when subscription FIRST becomes active
              // This handles both new subscriptions and trial-to-active transitions
              const isNewlyActive = event.type === 'customer.subscription.created' || 
                                  (event.type === 'customer.subscription.updated' && previousStatus !== 'active');
              
              if (isNewlyActive) {
                try {
                  const user = await storage.getUser(userId);
                  if (user && user.email && (user.subscriptionTier === 'pro' || user.subscriptionTier === 'family')) {
                    const { sendProWelcomeEmail } = await import('./emailService.js');
                    await sendProWelcomeEmail(
                      user.email,
                      user.firstName || user.username || 'there'
                    );
                    console.log('[WEBHOOK] Pro welcome email sent to:', user.email);
                  }
                } catch (emailError) {
                  console.error('[WEBHOOK] Failed to send Pro welcome email:', emailError);
                  // Don't fail the webhook - email is non-critical
                }
              }
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            await storage.updateUserField(userId, 'subscriptionTier', 'free');
            await storage.updateUserField(userId, 'subscriptionStatus', 'canceled');
            await storage.updateUserField(userId, 'subscriptionEndsAt', new Date());
            await storage.updateUserField(userId, 'planCount', 0);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription;
          const billingReason = invoice.billing_reason; // 'subscription_create' or 'subscription_cycle'
          
          console.log('[WEBHOOK] invoice.payment_succeeded:', {
            subscriptionId,
            billingReason,
            amount: invoice.amount_paid,
            currency: invoice.currency
          });
          
          if (subscriptionId) {
            try {
              // Find user by subscription ID
              const users = await (storage as any).getAllUsers?.() || [];
              const user = users.find((u: any) => u.stripeSubscriptionId === subscriptionId);
              
              if (user) {
                // Update subscription status to active
                await storage.updateUserField(user.id, 'subscriptionStatus', 'active');
                
                // If this is a renewal (subscription_cycle), reset monthly plan count
                if (billingReason === 'subscription_cycle') {
                  console.log('[WEBHOOK] Resetting plan count for renewal user:', user.id);
                  await storage.updateUserField(user.id, 'planCount', 0);
                  
                  // Set next reset date to one month from now
                  const nextResetDate = new Date();
                  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
                  await storage.updateUserField(user.id, 'planCountResetDate', nextResetDate);
                }
                
                // Clear trial end date on first payment
                if (billingReason === 'subscription_create') {
                  await storage.updateUserField(user.id, 'trialEndsAt', null);
                }
                
                console.log('[WEBHOOK] Successfully processed payment for user:', user.id);
              } else {
                console.warn('[WEBHOOK] No user found for subscription:', subscriptionId);
              }
            } catch (err) {
              console.error('[WEBHOOK] Error processing invoice.payment_succeeded:', err);
              // Don't throw - continue processing other events
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription;
          const reason = invoice.last_payment_error?.message || 'Unknown payment failure';
          
          console.log('[WEBHOOK] invoice.payment_failed:', {
            subscriptionId,
            reason,
            attemptsRemaining: invoice.attempt_count
          });
          
          if (subscriptionId) {
            try {
              // Find user by subscription ID
              const users = await (storage as any).getAllUsers?.() || [];
              const user = users.find((u: any) => u.stripeSubscriptionId === subscriptionId);
              
              if (user) {
                // Update subscription status to past_due
                await storage.updateUserField(user.id, 'subscriptionStatus', 'past_due');
                
                console.log('[WEBHOOK] Payment failed for user:', user.id, 'Reason:', reason);
                
                // In a full implementation, you would:
                // 1. Send email notification to user
                // 2. Store failure details for admin review
                // 3. Implement grace period logic (allow limited access while resolving)
                // 4. Trigger retries via Stripe's built-in retry logic
              } else {
                console.warn('[WEBHOOK] No user found for failed payment subscription:', subscriptionId);
              }
            } catch (err) {
              console.error('[WEBHOOK] Error processing invoice.payment_failed:', err);
              // Don't throw - continue processing other events
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== END STRIPE ROUTES ==========

  // Facebook verification endpoint for popup-based login
  app.post('/api/auth/facebook/verify', async (req: any, res) => {
    try {
      const { accessToken, userInfo } = req.body;
      
      if (!accessToken || !userInfo) {
        return res.status(400).json({ success: false, error: 'Missing access token or user info' });
      }

      // Generate appsecret_proof for Facebook API security
      const appsecret_proof = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
        .update(accessToken)
        .digest('hex');

      // Verify the access token with Facebook and get comprehensive profile data
      const fields = 'id,name,email,first_name,last_name,picture.type(large),birthday,age_range,location,gender,timezone,locale';
      const fbResponse = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&appsecret_proof=${appsecret_proof}&fields=${fields}`
      );
      const fbUserData = await fbResponse.json();
      
      if (fbUserData.error) {
        console.error('Facebook token verification failed:', fbUserData.error);
        return res.status(401).json({ success: false, error: 'Invalid Facebook token' });
      }

      // Check if user already exists by email
      let user;
      if (fbUserData.email) {
        user = await storage.getUserByEmail(fbUserData.email);
      }
      
      if (!user) {
        // Generate username from email or Facebook name
        let username = fbUserData.name?.replace(/[^a-zA-Z0-9_]/g, '_') || `fb_user_${fbUserData.id}`;
        if (fbUserData.email) {
          username = fbUserData.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        }
        
        // Calculate age from birthday if available
        let calculatedAge;
        if (fbUserData.birthday) {
          const birthDate = new Date(fbUserData.birthday);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
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
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedRandomPassword = await bcrypt.hash(randomPassword, 12);

        // Create new user with comprehensive profile data
        user = await storage.upsertUser({
          username: username,
          password: hashedRandomPassword, // Secure random password for OAuth users
          email: fbUserData.email || undefined,
          firstName: fbUserData.first_name || fbUserData.name?.split(' ')[0] || undefined,
          lastName: fbUserData.last_name || fbUserData.name?.split(' ').slice(1).join(' ') || undefined,
          profileImageUrl: fbUserData.picture?.data?.url || `https://graph.facebook.com/${fbUserData.id}/picture?type=large`,
          age: calculatedAge || undefined,
          location: location || undefined,
          timezone: fbUserData.timezone || 'UTC',
        });
      }

      // Create auth identity link
      try {
        await storage.createAuthIdentity({
          userId: user.id,
          provider: 'facebook',
          providerUserId: fbUserData.id,
          email: fbUserData.email || undefined,
        });
      } catch (error) {
        // Auth identity might already exist, that's okay
        console.log('Auth identity already exists for Facebook user:', fbUserData.id);
      }

      // Store OAuth token
      try {
        await storage.upsertOAuthToken({
          userId: user.id,
          provider: 'facebook',
          accessToken,
          refreshToken: undefined,
          expiresAt: null,
          scope: 'email public_profile',
        });
      } catch (error) {
        console.log('OAuth token storage failed (non-critical):', error);
      }

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error('Session creation failed:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        console.log('Facebook user authenticated successfully:', {
          userId: user.id,
          username: user.username,
          email: user.email
        });
        
        res.json({ success: true, user });
      });
    } catch (error) {
      console.error('Facebook verification error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Check username availability endpoint
  app.get('/api/auth/username-availability', async (req: any, res) => {
    try {
      const username = req.query.username as string;
      
      if (!username || username.length < 3) {
        return res.json({ available: false, reason: 'too_short' });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ available: false, reason: 'invalid_format' });
      }

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.json({ available: false, reason: 'taken' });
      }

      res.json({ available: true });
    } catch (error) {
      console.error('[USERNAME CHECK] Error:', error);
      res.status(500).json({ available: false, reason: 'error' });
    }
  });

  // Manual signup endpoint
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      console.log('[SIGNUP] Received signup request:', {
        username: req.body.username,
        email: req.body.email,
        hasPassword: !!req.body.password,
        hasFirstName: !!req.body.firstName,
        hasLastName: !!req.body.lastName
      });
      
      const validatedData = signupUserSchema.parse(req.body);
      console.log('[SIGNUP] Data validated successfully');
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        console.log('[SIGNUP] User already exists:', validatedData.email);
        return res.status(400).json({ 
          success: false, 
          error: 'Welcome back! Looks like you already have an account with us. Try logging in instead.' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      console.log('[SIGNUP] Password hashed successfully');

      // Create user
      const userData = {
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
        firstName: validatedData.firstName || undefined,
        lastName: validatedData.lastName || undefined,
      };

      const user = await storage.upsertUser(userData);
      console.log('[SIGNUP] User created successfully:', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      // Send welcome email (don't wait for it)
      sendWelcomeEmail(user.email, user.firstName || 'there').then(result => {
        if (result.success) {
          console.log('[SIGNUP] Welcome email sent to:', user.email);
        } else {
          console.error('[SIGNUP] Failed to send welcome email:', result.error);
        }
      }).catch(err => {
        console.error('[SIGNUP] Welcome email error:', err);
      });

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error('[SIGNUP] Session creation failed:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        console.log('[SIGNUP] Session created successfully for user:', user.id);
        console.log('[SIGNUP] Session ID:', req.sessionID);
        console.log('[SIGNUP] Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : false);
        
        res.json({ success: true, user: { ...user, password: undefined } });
      });
    } catch (error) {
      console.error('[SIGNUP] Signup error:', error);
      if (error instanceof z.ZodError) {
        console.error('[SIGNUP] Validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid data',
          details: error.errors 
        });
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Manual login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required')
      });
      
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      // Check if this is an OAuth-only user
      if (user.authenticationType === 'oauth') {
        return res.status(400).json({ 
          success: false, 
          error: 'This account uses social login. Please sign in with Facebook or Google.' 
        });
      }

      // Verify password with error handling
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ 
            success: false, 
            error: 'Invalid email or password' 
          });
        }
      } catch (error) {
        console.error('Password comparison error:', error);
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error('Session creation failed:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        console.log('Manual login successful:', {
          userId: user.id,
          username: user.username,
          email: user.email
        });
        
        res.json({ success: true, user: { ...user, password: undefined } });
      });
    } catch (error) {
      console.error('Manual login error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Helper function to get user from request (supports both authenticated and guest users)
  const getUserFromRequest = async (req: any) => {
    let userId: string | null = null;
    
    // Check multiple authentication methods for session persistence
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.id) {
      // Passport authentication (OAuth and manual login)
      userId = req.user.id;
    } else if (req.session?.userId) {
      // Direct session-based authentication
      userId = req.session.userId;
    } else if (req.session?.passport?.user?.id) {
      // Passport session serialization
      userId = req.session.passport.user.id;
    } else if (req.user?.claims?.sub) {
      // Replit auth user
      userId = req.user.claims.sub;
    }
    
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          // Remove password from response and add authenticated flag
          const { password, ...userWithoutPassword } = user;
          console.log('Authenticated user found:', { userId, username: user.username, email: user.email });
          return { ...userWithoutPassword, authenticated: true, isGuest: false };
        }
      } catch (error) {
        console.error('Error fetching authenticated user:', error);
      }
    }
    
    // Return demo user for guest access
    const demoUser = {
      id: 'demo-user',
      username: 'guest',
      authenticationType: 'guest' as const,
      email: 'guest@example.com',
      firstName: 'Guest',
      lastName: 'User',
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
      difficultyPreference: 'medium' as const,
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
    
    console.log('No authenticated user found, returning demo user');
    return demoUser;
  };

  // Auth routes - supports both authenticated and guest users
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const user = await getUserFromRequest(req);
      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Main user endpoint (alias for /api/auth/user for backward compatibility)
  app.get('/api/user', async (req: any, res) => {
    try {
      const user = await getUserFromRequest(req);
      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Supabase auth sync - for Facebook OAuth via Supabase
  app.post('/api/auth/supabase-sync', async (req: any, res) => {
    try {
      const { userId, email, fullName, avatarUrl, provider } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log('Syncing Supabase user:', { userId, email, provider });
      
      // Check if user already exists by userId
      let user = await storage.getUser(userId);
      
      if (!user) {
        // Also check if user exists by email (might have logged in via different provider)
        const existingUserByEmail = await storage.getUserByEmail(email);
        
        if (existingUserByEmail) {
          // User exists with this email but different ID - just use the existing account
          console.log('Found existing user by email:', existingUserByEmail.id);
          user = existingUserByEmail;
        } else {
          // Create new user from Supabase data
          const nameParts = fullName ? fullName.split(' ') : [];
          const firstName = nameParts[0] || email.split('@')[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          user = await storage.upsertUser({
            id: userId,
            username: email.split('@')[0],
            email: email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: avatarUrl || null,
            authenticationType: 'supabase' as const,
          });
          
          console.log('Created new Supabase user:', userId);
        }
      } else {
        console.log('Supabase user already exists:', userId);
      }
      
      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error('Session creation failed for Supabase user:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        console.log('Supabase user session created:', {
          userId: user.id,
          email: user.email
        });
        
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
      });
    } catch (error) {
      console.error('Supabase sync error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Profile completion route - update user profile with personalization data
  app.put('/api/users/:userId/profile', async (req, res) => {
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
        user: safeUser
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Mark tutorial as completed
  app.post('/api/users/:userId/complete-tutorial', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Update user with tutorial completion
      const updatedUser = await storage.updateUser(userId, { 
        hasCompletedTutorial: true 
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`[TUTORIAL] User ${userId} completed tutorial`);

      res.json({
        success: true,
        message: "Tutorial marked as completed"
      });
    } catch (error) {
      console.error("Tutorial completion error:", error);
      res.status(500).json({ error: "Failed to mark tutorial as completed" });
    }
  });

  // Temporary user ID for demo - in real app this would come from authentication
  const DEMO_USER_ID = "demo-user";
  
  // Helper function to check if a user is a demo user
  const isDemoUser = (userId: string | undefined): boolean => {
    return userId === DEMO_USER_ID || userId === 'demo-user';
  };

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
        lastName: "User"
      });
      console.log('Demo user created with ID:', DEMO_USER_ID);
    } catch (error: any) {
      // User already exists, that's fine
      if (!error.message?.includes('duplicate key')) {
        console.error('Failed to create demo user:', error);
      }
    }
  }

  // AI-powered goal processing - Returns plan data WITHOUT creating tasks/goals
  // Tasks are only created when user clicks "Create Activity" button
  app.post("/api/goals/process", async (req, res) => {
    try {
      const { goalText, sessionId, activityId } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      if (!goalText || typeof goalText !== 'string') {
        return res.status(400).json({ error: 'Goal text is required' });
      }

      console.log('Processing goal:', goalText);
      
      // If activityId is provided, load existing activity for context
      let existingActivity: { title: string; tasks: Array<{ title: string; description?: string }> } | undefined;
      if (activityId) {
        try {
          const activity = await storage.getActivity(activityId, userId);
          if (activity) {
            const tasks = await storage.getActivityTasks(activityId, userId);
            existingActivity = {
              title: activity.title,
              tasks: tasks.map(t => ({
                title: t.title,
                description: t.description || undefined
              }))
            };
            console.log('Loaded existing activity for refinement:', existingActivity.title);
          }
        } catch (error) {
          console.error('Failed to load existing activity:', error);
          // Continue without existing activity context
        }
      }
      
      // Use AI to process the goal into tasks - switched to Claude as default
      const result = await aiService.processGoalIntoTasks(goalText, 'claude', userId, existingActivity);
      
      // Save or update conversation session for history
      if (sessionId) {
        await storage.updateLifestylePlannerSession(sessionId, {
          conversationHistory: req.body.conversationHistory || [],
          generatedPlan: {
            title: result.planTitle,
            summary: result.summary,
            tasks: result.tasks,
            estimatedTimeframe: result.estimatedTimeframe,
            motivationalNote: result.motivationalNote
          },
          sessionState: 'completed'
        }, userId);
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
        message: `Generated ${result.tasks.length} task previews! Click "Create Activity" to save them.`
      });
    } catch (error) {
      console.error('Goal processing error:', error);
      res.status(500).json({ error: 'Failed to process goal' });
    }
  });

  // Load existing activity for editing - returns activity data as plan format
  app.post("/api/goals/load-for-edit", async (req, res) => {
    try {
      const { activityId } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      if (!activityId) {
        return res.status(400).json({ error: 'Activity ID is required' });
      }

      // Get current activity and tasks
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const tasks = await storage.getActivityTasks(activityId, userId);
      
      // Return activity in the same format as processGoalIntoTasks
      res.json({
        planTitle: activity.title,
        summary: activity.planSummary || activity.description || '',
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          completed: t.completed || false
        })),
        estimatedTimeframe: '',
        motivationalNote: '',
        activityId: activity.id // Include activityId so we know to update instead of create
      });
    } catch (error) {
      console.error('Load activity error:', error);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  // Save conversation session
  app.post("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { conversationHistory, generatedPlan } = req.body;
      
      const session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: 'completed',
        conversationHistory: conversationHistory || [],
        generatedPlan: generatedPlan || {},
        slots: {},
        externalContext: {}
      });
      
      res.json(session);
    } catch (error) {
      console.error('Save conversation error:', error);
      res.status(500).json({ error: 'Failed to save conversation' });
    }
  });

  // Get all conversation sessions for history
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      const sessions = await storage.getUserLifestylePlannerSessions(userId);
      
      res.json(sessions);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get specific conversation session
  app.get("/api/conversations/:sessionId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { sessionId } = req.params;
      
      const session = await storage.getLifestylePlannerSession(sessionId, userId);
      
      if (!session) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
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
        includeArchived: false
      });

      res.json(activities);
    } catch (error) {
      console.error('Get recent activities error:', error);
      res.status(500).json({ error: 'Failed to fetch recent activities' });
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
      console.error('Get progress stats error:', error);
      res.status(500).json({ error: 'Failed to fetch progress statistics' });
    }
  });

  // Get activities created from a specific chat import
  app.get("/api/chat-imports/:importId/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { importId } = req.params;

      const activities = await storage.getActivitiesByChatImportId(importId, userId);

      res.json(activities);
    } catch (error) {
      console.error('Get chat import activities error:', error);
      res.status(500).json({ error: 'Failed to fetch chat import activities' });
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
        shareType: shareType || 'app_invitation',
        activityId,
        groupId,
        invitationMessage,
        status: 'pending'
      });

      res.json(share);
    } catch (error) {
      console.error('Share with contact error:', error);
      res.status(500).json({ error: 'Failed to share with contact' });
    }
  });

  // Get contacts with sharing status
  app.get("/api/contacts/shared", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      const contactsWithShares = await storage.getContactsWithShareStatus(userId);

      res.json(contactsWithShares);
    } catch (error) {
      console.error('Get shared contacts error:', error);
      res.status(500).json({ error: 'Failed to fetch shared contacts' });
    }
  });

  // Get user tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const tasks = await storage.getUserTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Widget API: Get compact task data for home screen widgets
  app.get("/api/tasks/widget", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const allTasks = await storage.getUserTasks(userId);
      
      // Filter incomplete tasks and take first 3
      const upcomingTasks = allTasks
        .filter((task: any) => !task.completed && !task.skipped)
        .slice(0, 3)
        .map((task: any) => ({
          id: task.id,
          title: task.title,
          completed: task.completed || false
        }));
      
      // Calculate streak count from progress
      let streakCount = 0;
      try {
        const progress = await storage.calculateProgress(userId);
        if (progress && progress.dailyStreaks) {
          streakCount = progress.dailyStreaks.current || 0;
        }
      } catch (error) {
        console.error('Failed to calculate streak for widget:', error);
        streakCount = 0;
      }
      
      res.json({
        tasks: upcomingTasks,
        streakCount,
        totalTasksToday: allTasks.filter((t: any) => !t.completed && !t.skipped).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Widget data error:', error);
      res.status(500).json({ error: 'Failed to fetch widget data' });
    }
  });

  // Complete a task (swipe right)
  app.post("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const task = await storage.completeTask(taskId, userId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if this task belongs to a group activity and log completion + notify
      try {
        const groupActivity = await storage.getGroupActivityByTaskId(taskId);
        if (groupActivity) {
          await storage.logActivityChange({
            groupActivityId: groupActivity.id,
            userId,
            changeType: 'task_completed',
            changeDescription: `completed "${task.title}"`,
          });
          
          // Send notification to group members
          const completingUser = await storage.getUser(userId);
          const activity = await storage.getActivity(groupActivity.activityId, userId);
          
          await sendGroupNotification(storage, {
            groupId: groupActivity.groupId,
            actorUserId: userId,
            excludeUserIds: [userId], // Don't notify the person who completed the task
            notificationType: 'task_completed',
            payload: {
              title: `Task completed in ${activity?.title || 'group activity'}`,
              body: `${completingUser?.username || 'Someone'} completed "${task.title}"`,
              data: { groupId: groupActivity.groupId, groupActivityId: groupActivity.id, taskId },
              route: `/groups/${groupActivity.groupId}`,
            },
          });
        }
      } catch (logError) {
        console.error('Failed to log group activity:', logError);
        // Don't fail the request if logging fails
      }

      res.json({ 
        task, 
        message: 'Task completed! 🎉',
        achievement: {
          title: 'Task Master!',
          description: `You completed "${task.title}"! Keep up the amazing work!`,
          type: 'task',
          points: 10
        }
      });
    } catch (error) {
      console.error('Complete task error:', error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  // Skip a task (swipe left) 
  app.post("/api/tasks/:taskId/skip", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Mark task as skipped
      const task = await storage.updateTask(taskId, {
        skipped: true
      }, userId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ 
        task, 
        message: 'Task skipped. You can always come back to it later!' 
      });
    } catch (error) {
      console.error('Skip task error:', error);
      res.status(500).json({ error: 'Failed to skip task' });
    }
  });

  // Snooze a task (swipe up)
  app.post("/api/tasks/:taskId/snooze", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const snoozeSchema = z.object({
        hours: z.number().int().positive().max(168) // Max 1 week
      });
      
      const { hours } = snoozeSchema.parse(req.body);
      
      // Calculate snooze time (current time + hours)
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);
      
      const task = await storage.updateTask(taskId, {
        snoozeUntil: snoozeUntil
      }, userId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ 
        task, 
        message: `Task snoozed for ${hours} hour${hours !== 1 ? 's' : ''}! It will reappear in your list later.`,
        snoozeUntil: snoozeUntil.toISOString()
      });
    } catch (error) {
      console.error('Snooze task error:', error);
      res.status(500).json({ error: 'Failed to snooze task' });
    }
  });

  // Create a new task manually
  app.post("/api/tasks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...taskData,
        userId
      });
      
      res.json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(400).json({ error: 'Invalid task data' });
    }
  });

  // Task feedback endpoints
  app.post("/api/tasks/:taskId/feedback", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { feedbackType } = req.body;

      if (feedbackType !== 'like' && feedbackType !== 'dislike') {
        return res.status(400).json({ error: 'Invalid feedback type. Must be "like" or "dislike"' });
      }

      // Check if removing feedback (same type clicked twice)
      const existingFeedback = await storage.getUserTaskFeedback(taskId, userId);
      
      if (existingFeedback && existingFeedback.feedbackType === feedbackType) {
        // Remove feedback
        await storage.deleteTaskFeedback(taskId, userId);
        const stats = await storage.getTaskFeedbackStats(taskId);
        return res.json({ feedback: null, stats });
      }

      // Upsert feedback
      const feedback = await storage.upsertTaskFeedback(taskId, userId, feedbackType);
      const stats = await storage.getTaskFeedbackStats(taskId);
      
      res.json({ feedback, stats });
    } catch (error) {
      console.error('Task feedback error:', error);
      res.status(500).json({ error: 'Failed to save task feedback' });
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
        stats
      });
    } catch (error) {
      console.error('Get task feedback error:', error);
      res.status(500).json({ error: 'Failed to fetch task feedback' });
    }
  });

  // End-of-Day Review: Get today's completed tasks
  app.get("/api/tasks/completed-today", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Get all tasks for the user
      const allTasks = await storage.getUserTasks(userId);

      // Filter tasks completed today
      const today = new Date().toISOString().split('T')[0];
      const completedToday = allTasks.filter(task => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
        return completedDate === today;
      });

      res.json({ tasks: completedToday });
    } catch (error) {
      console.error('Get completed tasks error:', error);
      res.status(500).json({ error: 'Failed to fetch completed tasks' });
    }
  });

  // End-of-Day Review: Save task reactions
  app.post("/api/tasks/reactions", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { date, reactions } = req.body;

      if (!date || !Array.isArray(reactions)) {
        return res.status(400).json({ error: 'Date and reactions array required' });
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
          taskReactions
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Save reactions error:', error);
      res.status(500).json({ error: 'Failed to save reactions' });
    }
  });

  // ===== SUBSCRIPTION TIER ENFORCEMENT =====
  
  // Helper function to check if user has required subscription tier
  async function checkSubscriptionTier(userId: string, requiredTier: 'pro' | 'family'): Promise<{ allowed: boolean; tier: string; message?: string }> {
    // Check if demo premium mode is enabled (for development/testing)
    const enableDemoPremium = process.env.ENABLE_DEMO_PREMIUM === 'true';
    
    const user = await storage.getUserById(userId);
    
    // Treat missing users (including demo user) as free tier
    const tier = user?.subscriptionTier || 'free';
    
    // If demo premium mode is enabled, treat demo users as having family tier
    if (enableDemoPremium && (userId === DEMO_USER_ID || !user)) {
      console.log('[DEMO PREMIUM] Bypassing tier check for demo user - granting access');
      return { allowed: true, tier: 'family' };
    }
    
    // Check tier hierarchy: free < pro < family
    if (requiredTier === 'family') {
      if (tier === 'family') {
        return { allowed: true, tier };
      }
      return { 
        allowed: false, 
        tier,
        message: 'This feature requires a Family & Friends subscription ($14.99/month). Upgrade to collaborate with up to 5 users!'
      };
    }
    
    if (requiredTier === 'pro') {
      if (tier === 'pro' || tier === 'family') {
        return { allowed: true, tier };
      }
      return { 
        allowed: false, 
        tier,
        message: 'This feature requires a Pro subscription ($6.99/month). Upgrade for unlimited AI plans, insights, and more!'
      };
    }
    
    return { allowed: true, tier };
  }

  // ===== GROUPS & COLLABORATIVE PLANNING API =====

  // Helper function to generate invite codes
  function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const parts = [3, 3, 3].map(len =>
      Array.from({length: len}, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('')
    );
    return parts.join('-');
  }

  // Helper function to inherit/copy an activity to a group
  async function inheritActivityToGroup(activityId: string, groupId: string, userId: string): Promise<Activity> {
    try {
      // Get the source activity
      const sourceActivity = await storage.getActivity(activityId, userId);
      if (!sourceActivity) {
        throw new Error('Source activity not found');
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
        userId
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
          userId
        });
        
        // Link task to the new activity
        await storage.addTaskToActivity(newActivity.id, newTask.id, i);
        copiedTasks.push(newTask);
      }

      // Create the canonical version for group activity
      const canonicalVersion = {
        title: newActivity.title,
        description: newActivity.description || '',
        tasks: copiedTasks.map((task, idx) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          category: task.category,
          priority: task.priority,
          order: idx
        }))
      };

      // Create groupActivity link
      const groupActivity = await storage.createGroupActivity({
        groupId,
        activityId: newActivity.id,
        canonicalVersion,
        isPublic: false,
        trackingEnabled: true
      });

      // Get user info for feed entry
      const user = await storage.getUser(userId);
      const userName = user?.username || user?.email || 'Unknown User';

      // Create activity feed entry
      await storage.logGroupActivity({
        groupId,
        userId,
        userName,
        activityType: 'activity_shared',
        activityTitle: newActivity.title,
        groupActivityId: groupActivity.id
      });

      return newActivity;
    } catch (error) {
      console.error('Error inheriting activity to group:', error);
      throw error;
    }
  }

  // Create a new group (Family tier required)
  app.post("/api/groups", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Check subscription tier - Pro or Family required for Groups
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: 'This feature requires a Pro subscription ($6.99/month) or higher. Upgrade for Groups, unlimited AI plans, and more!',
          requiredTier: 'pro',
          currentTier: tierCheck.tier
        });
      }

      const { name, description, isPrivate, activityId } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      // Generate unique invite code
      const inviteCode = generateInviteCode();

      const group = await storage.createGroup({
        name: name.trim(),
        description: description?.trim() || null,
        isPrivate: isPrivate !== false, // Default to private
        inviteCode,
        createdBy: userId
      });

      // Add the creator as an admin member
      await storage.createGroupMembership({
        groupId: group.id,
        userId: userId,
        role: 'admin',
        joinedAt: new Date()
      });

      // If an activityId is provided, inherit the activity to the group
      let inheritedActivity = null;
      if (activityId) {
        try {
          inheritedActivity = await inheritActivityToGroup(activityId, group.id, userId);
        } catch (error) {
          console.error('Error inheriting activity to group:', error);
          // Don't fail group creation if activity inheritance fails
          // Just log the error and continue
        }
      }

      res.json({
        group,
        activity: inheritedActivity,
        message: `Group "${name}" created successfully!${inheritedActivity ? ' Activity has been shared to the group.' : ''}`
      });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  // Get user's groups
  app.get("/api/groups", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const groups = await storage.getUserGroups(userId);
      res.json({ groups });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
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
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Return top 20 most recent activities
      res.json(allActivities.slice(0, 20));
    } catch (error) {
      console.error('Get group activity feed error:', error);
      res.status(500).json({ error: 'Failed to fetch group activity feed' });
    }
  });

  // Get group details with members
  app.get("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const group = await storage.getGroupById(groupId, userId);

      if (!group) {
        return res.status(404).json({ error: 'Group not found or access denied' });
      }

      res.json({ group });
    } catch (error) {
      console.error('Get group details error:', error);
      res.status(500).json({ error: 'Failed to fetch group details' });
    }
  });

  // Join group via invite code
  app.post("/api/groups/join", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { inviteCode } = req.body;

      if (!inviteCode || inviteCode.trim().length === 0) {
        return res.status(400).json({ error: 'Invite code is required' });
      }

      const result = await storage.joinGroupByInviteCode(inviteCode.trim().toUpperCase(), userId);

      if (!result) {
        return res.status(404).json({ error: 'Invalid invite code or group not found' });
      }

      const joiningUser = await storage.getUser(userId);

      // Check if user was invited via email/phone and mark invite as accepted
      let inviterUserId: string | null = null;
      try {
        if (joiningUser?.email) {
          const pendingInvite = await storage.findPendingInvite(joiningUser.email);
          if (pendingInvite && pendingInvite.groupId === result.group.id) {
            // Mark invite as accepted
            await db.update(contactShares)
              .set({
                status: 'accepted',
                respondedAt: new Date()
              })
              .where(eq(contactShares.id, pendingInvite.id));
            
            inviterUserId = pendingInvite.invitedBy;
          }
        }
      } catch (inviteError) {
        console.error('Error checking pending invites:', inviteError);
        // Continue even if this fails
      }

      // Send notification to admin and existing members
      try {
        await sendGroupNotification(storage, {
          groupId: result.group.id,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the person who joined
          notificationType: 'member_joined',
          payload: {
            title: 'New member joined',
            body: `${joiningUser?.username || 'Someone'} joined "${result.group.name}" via invite code`,
            data: { groupId: result.group.id, newMemberId: userId },
            route: `/groups/${result.group.id}`,
          },
        });

        // If this user was invited via email/phone, send special notification to inviter
        if (inviterUserId) {
          await storage.createNotification({
            userId: inviterUserId,
            type: 'group_invite_accepted',
            title: 'Invite accepted!',
            body: `${joiningUser?.username || 'Someone'} accepted your invite and joined "${result.group.name}"`,
            data: { groupId: result.group.id, newMemberId: userId },
            route: `/groups/${result.group.id}`
          });
        }
      } catch (notifError) {
        console.error('Failed to send join notification:', notifError);
        // Don't fail the operation if notification fails
      }

      res.json({
        group: result.group,
        membership: result.membership,
        message: `Successfully joined "${result.group.name}"!`
      });
    } catch (error: any) {
      if (error.message?.includes('already a member')) {
        return res.status(400).json({ error: 'You are already a member of this group' });
      }
      console.error('Join group error:', error);
      res.status(500).json({ error: 'Failed to join group' });
    }
  });

  // Add member to group (by admin)
  app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { memberId, role } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      // Check if requester is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can add members' });
      }

      const newMembership = await storage.addGroupMember(groupId, memberId, role || 'member');

      // Send notification to new member and existing members
      try {
        const group = await storage.getGroupById(groupId, userId);
        const addedUser = await storage.getUser(memberId);
        
        // Notify the new member
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the admin who added
          notificationType: 'member_added',
          payload: {
            title: `Welcome to ${group?.name || 'the group'}!`,
            body: `You've been added to ${group?.name || 'a group'}`,
            data: { groupId, groupName: group?.name },
            route: `/groups/${groupId}`,
          },
        });
        
        // Notify existing members
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId, memberId], // Don't notify admin or new member
          notificationType: 'member_added',
          payload: {
            title: `New member joined`,
            body: `${addedUser?.username || 'Someone'} joined ${group?.name || 'your group'}`,
            data: { groupId, groupName: group?.name, newMemberId: memberId },
            route: `/groups/${groupId}`,
          },
        });
      } catch (notifError) {
        console.error('Failed to send member added notification:', notifError);
      }

      res.json({
        membership: newMembership,
        message: 'Member added successfully'
      });
    } catch (error: any) {
      if (error.message?.includes('already a member')) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      }
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Failed to add member' });
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
        return res.status(403).json({ error: 'Access denied' });
      }

      const canRemove = membership.role === 'admin' || userId === memberId;
      if (!canRemove) {
        return res.status(403).json({ error: 'Only admins can remove other members' });
      }

      await storage.removeGroupMember(groupId, memberId);

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
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
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update group details' });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim() || null;
      if (isPrivate !== undefined) updates.isPrivate = isPrivate;

      const updatedGroup = await storage.updateGroup(groupId, updates);

      res.json({
        group: updatedGroup,
        message: 'Group updated successfully'
      });
    } catch (error) {
      console.error('Update group error:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  // Delete group (admin only)
  app.delete("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if requester is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete groups' });
      }

      await storage.deleteGroup(groupId);

      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      console.error('Delete group error:', error);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  });

  // Share activity to group
  app.post("/api/groups/:groupId/activities", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { activityId } = req.body;

      if (!activityId) {
        return res.status(400).json({ error: 'Activity ID is required' });
      }

      // Check if user is member of group
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: 'You must be a member to share activities' });
      }

      const groupActivity = await storage.shareActivityToGroup(activityId, groupId, userId);

      // Send notification to group members
      try {
        const activity = await storage.getActivity(activityId, userId);
        const group = await storage.getGroupById(groupId, userId);
        const sharingUser = await storage.getUser(userId);
        
        await sendGroupNotification(storage, {
          groupId,
          actorUserId: userId,
          excludeUserIds: [userId], // Don't notify the person who shared
          notificationType: 'activity_shared',
          payload: {
            title: `New activity shared`,
            body: `${sharingUser?.username || 'Someone'} shared "${activity?.title}" in ${group?.name || 'your group'}`,
            data: { groupId, activityId, groupActivityId: groupActivity.id },
            route: `/groups/${groupId}`,
          },
        });
      } catch (notifError) {
        console.error('Failed to send activity shared notification:', notifError);
      }

      res.json({
        groupActivity,
        message: 'Activity shared to group successfully'
      });
    } catch (error: any) {
      if (error.message?.includes('already shared')) {
        return res.status(400).json({ error: 'Activity is already shared to this group' });
      }
      console.error('Share activity error:', error);
      res.status(500).json({ error: 'Failed to share activity' });
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
        return res.status(403).json({ error: 'Access denied' });
      }

      const activities = await storage.getGroupActivities(groupId);

      res.json({ activities });
    } catch (error) {
      console.error('Get group activities error:', error);
      res.status(500).json({ error: 'Failed to fetch group activities' });
    }
  });

  // Get group progress - task completion stats
  app.get("/api/groups/:groupId/progress", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if user is member
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const progress = await storage.getGroupProgress(groupId);

      res.json({ progress });
    } catch (error) {
      console.error('Get group progress error:', error);
      res.status(500).json({ error: 'Failed to fetch group progress' });
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
        return res.status(403).json({ error: 'Access denied' });
      }

      const feed = await storage.getGroupActivityFeed(groupId, limit);

      res.json({ feed });
    } catch (error) {
      console.error('Get group activity feed error:', error);
      res.status(500).json({ error: 'Failed to fetch activity feed' });
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
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get user name
      const user = await storage.getUser(userId);
      const userName = user ? (user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'Someone';

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
      console.error('Log group activity error:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  });

  // Remove activity from group
  app.delete("/api/groups/:groupId/activities/:groupActivityId", async (req, res) => {
    try {
      const { groupId, groupActivityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check if user is admin
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can remove activities' });
      }

      await storage.removeActivityFromGroup(groupActivityId);

      res.json({ message: 'Activity removed from group' });
    } catch (error) {
      console.error('Remove activity error:', error);
      res.status(500).json({ error: 'Failed to remove activity' });
    }
  });

  // Copy group activity to personal library ("Copy to My Plans")
  app.post("/api/groups/:groupId/activities/:groupActivityId/copy", async (req, res) => {
    try {
      const { groupId, groupActivityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { joinGroup } = req.body;

      // Get group details first
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user is already a member
      const existingMembership = await storage.getGroupMembership(groupId, userId);
      
      // SECURITY: Non-members must either join the group or use share links
      // This endpoint is only for members and users opting to join
      if (!existingMembership && !joinGroup) {
        return res.status(403).json({ 
          error: 'You must be a member of this group to copy activities. Use the share link to copy publicly shared activities.',
          requiresMembership: true
        });
      }
      
      // If joinGroup is true and user is not a member, add them
      let newMembership = null;
      if (joinGroup && !existingMembership) {
        newMembership = await storage.addGroupMember({
          groupId,
          userId,
          role: 'member'
        });

        // Get user info for notification
        const joiningUser = await storage.getUser(userId);
        
        // Send notification to admin and existing members
        try {
          await sendGroupNotification(storage, {
            groupId,
            actorUserId: userId,
            excludeUserIds: [userId], // Don't notify the person who joined
            notificationType: 'member_joined',
            payload: {
              title: 'New member joined',
              body: `${joiningUser?.username || 'Someone'} joined "${group.name}" by copying an activity`,
              data: { groupId, newMemberId: userId },
              route: `/groups/${groupId}`,
            },
          });
        } catch (notifError) {
          console.error('Failed to send join notification:', notifError);
          // Don't fail the operation if notification fails
        }
      }

      // Get the group activity
      const groupActivity = await storage.getGroupActivityById(groupActivityId);
      if (!groupActivity || groupActivity.groupId !== groupId) {
        return res.status(404).json({ error: 'Group activity not found' });
      }

      // Get the original activity and its tasks (use getActivityById to allow access regardless of ownership)
      const originalActivity = await storage.getActivityById(groupActivity.activityId);
      if (!originalActivity) {
        return res.status(404).json({ error: 'Activity not found' });
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
        message: joinGroup && newMembership 
          ? `Joined "${group.name}" and copied activity successfully!`
          : 'Activity copied to your personal library successfully'
      });
    } catch (error) {
      console.error('Copy activity error:', error);
      res.status(500).json({ error: 'Failed to copy activity' });
    }
  });

  // === Phone/Email Invite Endpoints ===

  // Send invites via phone/email
  app.post("/api/groups/:groupId/invite", async (req, res) => {
    try {
      const { groupId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { contacts, message } = req.body;

      // Verify user is admin of the group
      const membership = await storage.getGroupMembership(groupId, userId);
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only group admins can send invites' });
      }

      // Get group details
      const group = await storage.getGroupById(groupId, userId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get user info for personalized messages
      const user = await storage.getUser(userId);
      const inviterName = user?.username || 'A friend';

      const { InviteService } = await import('./services/inviteService');
      const results = [];

      for (const contact of contacts) {
        const { type, value } = contact;

        // Create contact share record
        const contactShare = await storage.createContactShare({
          groupId,
          invitedBy: userId,
          contactType: type,
          contactValue: value,
          inviteMessage: message
        });

        if (type === 'phone') {
          // Send SMS
          const formattedPhone = InviteService.formatPhoneNumber(value);
          const smsMessage = InviteService.generateSMSMessage(inviterName, group.name, group.inviteCode);
          const result = await InviteService.sendSMS({
            to: formattedPhone,
            message: smsMessage
          });

          results.push({
            contact: value,
            type: 'phone',
            success: result.success,
            error: result.error
          });
        } else if (type === 'email') {
          // Send Email
          if (!InviteService.isValidEmail(value)) {
            results.push({
              contact: value,
              type: 'email',
              success: false,
              error: 'Invalid email format'
            });
            continue;
          }

          const emailHTML = InviteService.generateEmailHTML(inviterName, group.name, group.inviteCode, message);
          const emailText = InviteService.generateEmailText(inviterName, group.name, group.inviteCode, message);

          const result = await InviteService.sendEmail({
            to: value,
            subject: `You're invited to join "${group.name}" on JournalMate`,
            html: emailHTML,
            text: emailText
          });

          results.push({
            contact: value,
            type: 'email',
            success: result.success,
            error: result.error
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        message: `Sent ${successCount} invites successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        results,
        successCount,
        failureCount
      });
    } catch (error) {
      console.error('Send invites error:', error);
      res.status(500).json({ error: 'Failed to send invites' });
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
        return res.status(403).json({ error: 'Not authorized to view group invites' });
      }

      const invites = await storage.getGroupInvites(groupId);

      res.json({ invites });
    } catch (error) {
      console.error('Get invites error:', error);
      res.status(500).json({ error: 'Failed to get invites' });
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
        likeCount: result.likeCount
      });
    } catch (error) {
      console.error('Like activity error:', error);
      res.status(500).json({ error: 'Failed to like activity' });
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
        likeCount: result.likeCount
      });
    } catch (error) {
      console.error('Unlike activity error:', error);
      res.status(500).json({ error: 'Failed to unlike activity' });
    }
  });

  // Activity feedback endpoints (legacy - kept for backward compatibility)
  app.post("/api/activities/:activityId/feedback", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { feedbackType } = req.body;

      if (feedbackType !== 'like' && feedbackType !== 'dislike') {
        return res.status(400).json({ error: 'Invalid feedback type. Must be "like" or "dislike"' });
      }

      // Redirect "like" to new engagement tracking endpoint
      if (feedbackType === 'like') {
        const result = await storage.toggleActivityLike(activityId, userId);
        return res.json({ 
          feedback: result.liked ? { feedbackType: 'like' } : null,
          stats: { likes: result.likeCount, dislikes: 0 }
        });
      }

      // Legacy dislike handling (kept for backward compatibility)
      const existingFeedback = await storage.getUserActivityFeedback(activityId, userId);
      
      if (existingFeedback && existingFeedback.feedbackType === feedbackType) {
        await storage.deleteActivityFeedback(activityId, userId);
        const stats = await storage.getActivityFeedbackStats(activityId);
        return res.json({ feedback: null, stats });
      }

      const feedback = await storage.upsertActivityFeedback(activityId, userId, feedbackType);
      const stats = await storage.getActivityFeedbackStats(activityId);
      
      res.json({ feedback, stats });
    } catch (error) {
      console.error('Activity feedback error:', error);
      res.status(500).json({ error: 'Failed to save activity feedback' });
    }
  });

  app.get("/api/activities/:activityId/feedback", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      const userFeedback = await storage.getUserActivityFeedback(activityId, userId);
      const stats = await storage.getActivityFeedbackStats(activityId);
      
      res.json({ 
        userFeedback: userFeedback || null, 
        stats 
      });
    } catch (error) {
      console.error('Get activity feedback error:', error);
      res.status(500).json({ error: 'Failed to fetch activity feedback' });
    }
  });

  // Bookmark an activity (idempotent - adds bookmark if not already bookmarked)
  app.post("/api/activities/:activityId/bookmark", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityBookmark(activityId, userId, true);
      return res.json({ 
        bookmarked: result.bookmarked,
        bookmarkCount: result.bookmarkCount
      });
    } catch (error) {
      console.error('Bookmark activity error:', error);
      res.status(500).json({ error: 'Failed to bookmark activity' });
    }
  });

  // Unbookmark an activity (idempotent - removes bookmark if exists)
  app.delete("/api/activities/:activityId/unbookmark", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.setActivityBookmark(activityId, userId, false);
      return res.json({ 
        bookmarked: result.bookmarked,
        bookmarkCount: result.bookmarkCount
      });
    } catch (error) {
      console.error('Unbookmark activity error:', error);
      res.status(500).json({ error: 'Failed to unbookmark activity' });
    }
  });

  // Pin an activity (toggle user-specific pin)
  app.post("/api/activities/:activityId/pin", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;

      const result = await storage.toggleUserPin(activityId, userId);
      return res.json({ 
        isPinned: result.isPinned
      });
    } catch (error) {
      console.error('Pin activity error:', error);
      res.status(500).json({ error: 'Failed to pin activity' });
    }
  });

  // Get user's bookmarked activities
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const bookmarkedActivities = await storage.getUserBookmarks(userId);
      res.json(bookmarkedActivities);
    } catch (error) {
      console.error('Get bookmarks error:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  });

  // Archive task
  app.patch("/api/tasks/:taskId/archive", async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const task = await storage.archiveTask(taskId, userId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      console.error('Archive task error:', error);
      res.status(500).json({ error: 'Failed to archive task' });
    }
  });

  // ===== ACTIVITIES API ENDPOINTS =====

  // Get user activities
  app.get("/api/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const activities = await storage.getUserActivities(userId);
      
      const activityIds = activities.map(a => a.id);
      const feedbackMap = await storage.getBulkActivityFeedback(activityIds, userId);
      
      const activitiesWithFeedback = activities.map(activity => ({
        ...activity,
        userLiked: feedbackMap.get(activity.id)?.userHasLiked || false
      }));
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(activitiesWithFeedback);
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Get user archived activities (history)
  app.get("/api/activities/history", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const archivedActivities = await storage.getUserArchivedActivities(userId);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(archivedActivities);
    } catch (error) {
      console.error('Get archived activities error:', error);
      res.status(500).json({ error: 'Failed to fetch archived activities' });
    }
  });

  // Create new activity
  app.post("/api/activities", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...activityData,
        userId
      });
      res.json(activity);
    } catch (error) {
      console.error('Create activity error:', error);
      res.status(400).json({ error: 'Invalid activity data' });
    }
  });

  // Get specific activity with tasks
  app.get("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const activity = await storage.getActivity(activityId, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const activityTasks = await storage.getActivityTasks(activityId);
      res.json({ ...activity, tasks: activityTasks });
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // Update activity
  app.put("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const updates = req.body;
      const activity = await storage.updateActivity(activityId, updates, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json(activity);
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  // Patch activity (partial update)
  app.patch("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const updates = req.body;
      console.log('[PRIVACY TOGGLE DEBUG] PATCH request received:', { activityId, userId, updates });
      
      const activity = await storage.updateActivity(activityId, updates, userId);
      console.log('[PRIVACY TOGGLE DEBUG] Activity after update:', { id: activity?.id, isPublic: activity?.isPublic });
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json(activity);
    } catch (error) {
      console.error('Patch activity error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  // Delete activity
  app.delete("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      await storage.deleteActivity(activityId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete activity error:', error);
      res.status(500).json({ error: 'Failed to delete activity' });
    }
  });

  // Archive activity
  app.patch("/api/activities/:activityId/archive", async (req: any, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const activity = await storage.archiveActivity(activityId, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json(activity);
    } catch (error) {
      console.error('Archive activity error:', error);
      res.status(500).json({ error: 'Failed to archive activity' });
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
        return res.status(404).json({ error: 'Activity not found' });
      }

      const tasks = await storage.getTasksByActivity(activityId, userId);

      // If privacy shield is off or public mode, return as-is
      if (!privacySettings || Object.values(privacySettings).every(v => !v)) {
        return res.json({
          activity,
          tasks,
          redacted: false
        });
      }

      // Build AI prompt for redaction
      const redactionInstructions: string[] = [];
      if (privacySettings.redactNames) {
        redactionInstructions.push("Replace exact names with generic terms like 'Someone', 'Friend', 'A person'");
      }
      if (privacySettings.redactLocations) {
        redactionInstructions.push("Replace exact addresses with city only or generic 'A location in [city]', 'A restaurant', 'A venue'");
      }
      if (privacySettings.redactContact) {
        redactionInstructions.push("Remove or replace phone numbers and email addresses with [Contact Info]");
      }
      if (privacySettings.redactDates) {
        redactionInstructions.push("Generalize specific dates/times to 'morning', 'afternoon', 'evening', 'this week', etc.");
      }
      if (privacySettings.redactContext) {
        redactionInstructions.push("Remove or generalize personal context like family member names, medical information, personal relationships");
      }

      const prompt = `You are a privacy protection assistant. Review the following activity and tasks, and redact sensitive information according to these rules:

${redactionInstructions.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

Activity Title: ${activity.title}
Activity Description: ${activity.description || 'None'}
Plan Summary: ${activity.planSummary || 'None'}

Tasks:
${tasks.map((task, i) => `${i + 1}. ${task.title}${task.description ? ` - ${task.description}` : ''}`).join('\n')}

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
      const llmProvider = getProvider('openai-mini');
      if (!llmProvider) {
        return res.status(503).json({ error: 'AI service unavailable - OpenAI provider not configured' });
      }

      const messages = [
        { role: 'system' as const, content: 'You are a privacy protection assistant that redacts PII/PHI from content while preserving usefulness.' },
        { role: 'user' as const, content: prompt }
      ];

      const response = await llmProvider.generateChatCompletion(messages, {
        temperature: 0.3,
        max_tokens: 2000
      });

      // Validate JSON response
      let redactedData;
      try {
        redactedData = JSON.parse(response);
        
        // Validate structure
        if (!redactedData.title || !Array.isArray(redactedData.tasks)) {
          throw new Error('Invalid response structure from AI');
        }
      } catch (parseError) {
        console.error('Privacy scan JSON parse error:', parseError);
        return res.status(502).json({ 
          error: 'AI service returned malformed response',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
      }

      // Build redacted activity and tasks
      const redactedActivity = {
        ...activity,
        title: redactedData.title,
        description: redactedData.description,
        planSummary: redactedData.planSummary
      };

      const redactedTasks = tasks.map((task, i) => ({
        ...task,
        title: redactedData.tasks[i]?.title || task.title,
        description: redactedData.tasks[i]?.description || task.description
      }));

      res.json({
        activity: redactedActivity,
        tasks: redactedTasks,
        redacted: true,
        redactionSummary: redactionInstructions
      });
    } catch (error) {
      console.error('Privacy scan error:', error);
      res.status(500).json({ error: 'Failed to scan for privacy' });
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
    const hasValidLink = [twitterHandle, instagramHandle, threadsHandle, websiteUrl].some(link => link && link.length > 0);
    if (!hasValidLink) {
      return { valid: false, error: 'At least one social media link is required' };
    }
    
    // Domain whitelist
    const allowedDomains = ['twitter.com', 'x.com', 'instagram.com', 'threads.net'];
    
    // Validate each provided handle
    if (twitterHandle) {
      try {
        const url = new URL(twitterHandle.startsWith('http') ? twitterHandle : `https://${twitterHandle}`);
        const domain = url.hostname.replace(/^www\./, '');
        if (!['twitter.com', 'x.com'].includes(domain)) {
          return { valid: false, error: 'Twitter/X handle must be from twitter.com or x.com' };
        }
      } catch {
        return { valid: false, error: 'Invalid Twitter/X URL format' };
      }
    }
    
    if (instagramHandle) {
      try {
        const url = new URL(instagramHandle.startsWith('http') ? instagramHandle : `https://${instagramHandle}`);
        const domain = url.hostname.replace(/^www\./, '');
        if (domain !== 'instagram.com') {
          return { valid: false, error: 'Instagram handle must be from instagram.com' };
        }
      } catch {
        return { valid: false, error: 'Invalid Instagram URL format' };
      }
    }
    
    if (threadsHandle) {
      try {
        const url = new URL(threadsHandle.startsWith('http') ? threadsHandle : `https://${threadsHandle}`);
        const domain = url.hostname.replace(/^www\./, '');
        if (domain !== 'threads.net') {
          return { valid: false, error: 'Threads handle must be from threads.net' };
        }
      } catch {
        return { valid: false, error: 'Invalid Threads URL format' };
      }
    }
    
    if (websiteUrl) {
      try {
        new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      } catch {
        return { valid: false, error: 'Invalid website URL format' };
      }
    }
    
    return { valid: true };
  }

  // Publish activity to Community Discovery
  app.post("/api/activities/:activityId/publish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { privacySettings, privacyPreset, twitterHandle, instagramHandle, threadsHandle, websiteUrl, forceDuplicate } = req.body;

      // Get activity and its tasks
      const activity = await storage.getActivityById(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Get canonical tasks from storage first (needed for hash generation)
      const canonicalTasks = await storage.getTasksByActivity(activityId, userId);
      
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
          if (error.code === '23505') {
            return res.status(409).json({
              error: 'Duplicate plan detected',
              message: 'You have already published an identical plan. Please update your existing plan instead.',
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
              sql`${activities.id} != ${activityId}` // Exclude current activity
            )
          )
          .limit(1);
        
        if (existingPlan) {
          return res.status(409).json({ 
            error: 'Duplicate plan detected',
            message: `You've already published an identical plan: "${existingPlan.shareTitle || existingPlan.title}". Please update your existing plan instead of creating a duplicate.`,
            duplicatePlanId: existingPlan.id,
            duplicatePlanTitle: existingPlan.shareTitle || existingPlan.title
          });
        }
      }

      // Get user info for creator display
      const user = await storage.getUser(userId);
      const creatorName = user?.username || 'Anonymous';
      const creatorAvatar = user?.profileImage || null;

      // Apply privacy redaction if needed (for Community Discovery ONLY)
      let publicTitle = activity.title;
      let publicDescription = activity.description;
      let publicPlanSummary = activity.planSummary;
      let publicTasks = [...canonicalTasks]; // Start with canonical data

      if (privacyPreset && privacyPreset !== 'off' && privacySettings) {
        // Build AI prompt for redaction (including tasks)
        const redactionInstructions: string[] = [];
        if (privacySettings.redactNames) {
          redactionInstructions.push("Replace exact names with generic terms like 'Someone', 'Friend', 'A person'");
        }
        if (privacySettings.redactLocations) {
          redactionInstructions.push("Replace exact addresses with city only or generic 'A location in [city]', 'A restaurant', 'A venue'");
        }
        if (privacySettings.redactContact) {
          redactionInstructions.push("Remove or replace phone numbers and email addresses with [Contact Info]");
        }
        if (privacySettings.redactDates) {
          redactionInstructions.push("Generalize specific dates/times to 'morning', 'afternoon', 'evening', 'this week', etc.");
        }
        if (privacySettings.redactContext) {
          redactionInstructions.push("Remove or generalize personal context like family member names, medical information, personal relationships");
        }

        const prompt = `You are a privacy protection assistant. Review the following activity and tasks, and redact sensitive information according to these rules:

${redactionInstructions.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

Activity Title: ${activity.title}
Activity Description: ${activity.description || 'None'}
Plan Summary: ${activity.planSummary || 'None'}

Tasks:
${canonicalTasks.map((task, i) => `${i + 1}. ${task.title}${task.description ? ` - ${task.description}` : ''}`).join('\n')}

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
        const llmProvider = getProvider('openai-mini');
        if (!llmProvider) {
          return res.status(503).json({ error: 'AI service unavailable - OpenAI provider not configured' });
        }

        const messages = [
          { role: 'system' as const, content: 'You are a privacy protection assistant that redacts PII/PHI from content while preserving usefulness.' },
          { role: 'user' as const, content: prompt }
        ];

        const response = await llmProvider.generateChatCompletion(messages, {
          temperature: 0.3,
          max_tokens: 3000
        });

        // Validate JSON response
        try {
          const redactedData = JSON.parse(response);
          // Use redacted values or safe fallbacks (NOT originals, to prevent PII leaks)
          publicTitle = redactedData.title || '[Private Plan]';
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
                description: redactedTask?.description || null
              };
            });
          } else {
            // If LLM didn't return tasks, use generic placeholders
            publicTasks = publicTasks.map((task, index) => ({
              ...task,
              title: `Task ${index + 1}`,
              description: null
            }));
          }
        } catch (parseError) {
          console.error('Publish redaction JSON parse error:', parseError);
          // On error, use safe generic fallbacks to prevent PII exposure
          publicTitle = '[Private Plan]';
          publicDescription = null;
          publicPlanSummary = null;
          publicTasks = publicTasks.map((task, index) => ({
            ...task,
            title: `Task ${index + 1}`,
            description: null
          }));
        }
      }

      // REQUIRED: Social media verification for community publishing
      // At least one social media link must be provided for community verification
      if (!twitterHandle && !instagramHandle && !threadsHandle) {
        return res.status(400).json({ 
          error: 'Social media verification required',
          message: 'Please provide at least one social media link (Twitter/X, Instagram, or Threads) to verify your plan. This helps other users verify the authenticity of community plans.'
        });
      }

      // Validate social media handles
      const validation = validateSocialMediaHandles({ twitterHandle, instagramHandle, threadsHandle, websiteUrl });
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      // Upsert planner profile with social POST URLs (not handles)
      // Note: Despite variable names, these are actually POST URLs from the request body
      const profile = await storage.upsertPlannerProfile(userId, { 
        twitterPostUrl: twitterHandle || null, 
        instagramPostUrl: instagramHandle || null, 
        threadsPostUrl: threadsHandle || null, 
        websiteUrl: websiteUrl || null 
      });
      const plannerProfileId = profile.id;
      
      // Determine badge: 'twitter'|'instagram'|'threads'|'linkedin'|'multi'
      const provided = [twitterHandle, instagramHandle, threadsHandle].filter(Boolean);
      const verificationBadge = provided.length > 1 ? 'multi' : (twitterHandle ? 'twitter' : instagramHandle ? 'instagram' : 'threads');

      // Generate unique share token if not already present
      const crypto = await import('crypto');
      const existingActivity = await storage.getActivityById(activityId, userId);
      const shareToken = existingActivity?.shareToken || crypto.randomBytes(16).toString('hex');
      
      // Determine base URL for share links
      let baseUrl = 'http://localhost:5000';
      if (process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production') {
        baseUrl = 'https://journalmate.ai';
      } else if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',').map(d => d.trim());
        baseUrl = `https://${domains[0]}`;
      }
      const shareableLink = `${baseUrl}/share/${shareToken}`;

      // Store community snapshot with FULL task data for reconciliation
      // This preserves ALL user data (timeline, highlights, etc.)
      const communitySnapshot = {
        title: publicTitle,
        description: publicDescription,
        planSummary: publicPlanSummary,
        tasks: publicTasks.map(t => ({
          id: t.id, // CRITICAL: Include ID for reconciliation
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          completed: t.completed, // Include completion state
          order: t.order || 0
        })),
        privacyPreset: privacyPreset || 'off',
        publishedAt: new Date().toISOString()
      };

      // Update activity to publish to community using dedicated communitySnapshot field
      // Only set contentHash if NOT forcing duplicate (to allow intentional duplicates)
      const updateData: any = {
        isPublic: true, // CRITICAL: Must be true for Discovery to show the plan
        featuredInCommunity: true,
        communityStatus: 'live', // CRITICAL: Required for Community Discovery query
        creatorName,
        creatorAvatar,
        shareTitle: publicTitle, // Display redacted title in Discovery
        communitySnapshot, // Dedicated field - no data loss
        sourceType: 'community_reviewed', // User provided social media verification
        plannerProfileId,
        verificationBadge,
        shareToken,
        shareableLink
      };
      
      // Only include contentHash if not forcing duplicate (allows intentional duplicates to bypass unique constraint)
      if (!forceDuplicate) {
        updateData.contentHash = contentHash;
      }
      
      const updatedActivity = await storage.updateActivity(activityId, updateData, userId);

      if (!updatedActivity) {
        return res.status(500).json({ error: 'Failed to publish activity' });
      }

      res.json({
        success: true,
        publishedToCommunity: true,
        shareableLink,
        activity: updatedActivity
      });
    } catch (error) {
      console.error('Publish activity error:', error);
      res.status(500).json({ error: 'Failed to publish activity to community' });
    }
  });
  
  // Unpublish an activity from community discovery
  app.patch("/api/activities/:activityId/unpublish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const activity = await storage.unpublishActivity(activityId, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found or you do not have permission to unpublish it' });
      }
      
      res.json({
        success: true,
        message: 'Activity unpublished from community',
        activity
      });
    } catch (error) {
      console.error('Unpublish activity error:', error);
      res.status(500).json({ error: 'Failed to unpublish activity' });
    }
  });
  
  // Republish an activity to community discovery
  app.patch("/api/activities/:activityId/republish", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const activity = await storage.republishActivity(activityId, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found or you do not have permission to republish it' });
      }
      
      res.json({
        success: true,
        message: 'Activity republished to community',
        activity
      });
    } catch (error) {
      console.error('Republish activity error:', error);
      res.status(500).json({ error: 'Failed to republish activity' });
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
        // Create the group
        const group = await storage.createGroup({
          name: groupName.trim(),
          description: groupDescription?.trim() || null,
          isPrivate: false,
          inviteCode: null,
          createdBy: userId
        });

        groupId = group.id;

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
      
      const activity = await storage.updateActivity(activityId, {
        isPublic: false,
        shareToken: null,
        shareableLink: null
      }, userId);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Revoke share link error:', error);
      res.status(500).json({ error: 'Failed to revoke share link' });
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
        return res.status(404).json({ error: 'Shared activity not found or has been deleted' });
      }

      // Get tasks for this activity
      const tasks = await storage.getActivityTasks(activity.id, activity.userId);
      
      // Get owner info (without sensitive data)
      const owner = await storage.getUser(activity.userId);
      
      // If activity is part of a group, include group info for join prompt
      let groupInfo = null;
      if (activity.targetGroupId) {
        try {
          const group = await storage.getGroup(activity.targetGroupId);
          if (group) {
            const members = await storage.getGroupMembers(activity.targetGroupId);
            groupInfo = {
              id: group.id,
              name: group.name,
              description: group.description,
              memberCount: members.length
            };
          }
        } catch (error) {
          console.error('[SHARE] Error fetching group info:', error);
          // Don't fail the request if group fetch fails
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
        tasks: tasks.map(task => ({
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
          name: owner?.firstName || owner?.username || 'Anonymous'
        },
        groupInfo
      });
    } catch (error) {
      console.error('Get shared activity error:', error);
      res.status(500).json({ error: 'Failed to fetch shared activity' });
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
        return res.status(404).json({ error: 'Shared activity not found or has been deleted' });
      }

      // Get tasks for this activity
      const tasks = await storage.getActivityTasks(activity.id, activity.userId);

      // Import the OG image generator (dynamic import to avoid circular deps)
      const { generateOGImage } = await import('./services/ogImageGenerator');

      // Construct base URL for absolute image paths (with host validation)
      let baseUrl = process.env.PUBLIC_BASE_URL;
      if (!baseUrl) {
        const requestHost = (req.get('host') || '').toLowerCase();
        
        // Strip port to get clean hostname for validation
        const hostname = requestHost.split(':')[0];
        
        // Validate host to prevent header spoofing - exact match or trusted domain suffix
        const trustedDomains = ['replit.app', 'repl.co'];
        const trustedExactHosts = ['localhost'];
        
        const isTrusted = 
          trustedExactHosts.includes(hostname) ||
          trustedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
        
        if (isTrusted) {
          baseUrl = `${req.protocol}://${requestHost}`;
        } else {
          console.warn('[OG IMAGE] Suspicious host header, using localhost fallback:', requestHost);
          baseUrl = 'http://localhost:5000';
        }
      }

      // Generate the OG image
      const imageBuffer = await generateOGImage({
        activity,
        tasks,
        baseUrl
      });

      // Set appropriate cache headers (24 hours)
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.setHeader('Content-Length', imageBuffer.length);

      res.send(imageBuffer);
    } catch (error) {
      console.error('Generate OG image error:', error);
      res.status(500).json({ error: 'Failed to generate preview image' });
    }
  });

  // Add task to activity
  app.post("/api/activities/:activityId/tasks", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { taskId, order } = req.body;
      const activityTask = await storage.addTaskToActivity(activityId, taskId, order);
      res.json(activityTask);
    } catch (error) {
      console.error('Add task to activity error:', error);
      res.status(500).json({ error: 'Failed to add task to activity' });
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
      console.error('Get activity tasks error:', error);
      res.status(500).json({ error: 'Failed to fetch activity tasks' });
    }
  });

  // Remove task from activity
  app.delete("/api/activities/:activityId/tasks/:taskId", async (req, res) => {
    try {
      const { activityId, taskId } = req.params;
      await storage.removeTaskFromActivity(activityId, taskId);
      res.json({ success: true });
    } catch (error) {
      console.error('Remove task from activity error:', error);
      res.status(500).json({ error: 'Failed to remove task from activity' });
    }
  });

  // Generate shareable link for activity OR share to existing group
  app.post("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId } = req.params;
      const { groupId, targetGroupId, createGroup, groupName, groupDescription } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Check subscription tier if creating group - Pro or Family required
      if (createGroup) {
        const tierCheck = await checkSubscriptionTier(userId, 'pro');
        if (!tierCheck.allowed) {
          return res.status(403).json({ 
            error: 'Subscription required',
            message: 'This feature requires a Pro subscription ($6.99/month) or higher. Upgrade for Groups, unlimited AI plans, and more!',
            requiredTier: 'pro',
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
      
      // Check if activity exists
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // If groupId is provided, share to the group (add activity directly to group)
      if (groupId) {
        // Verify user is a member of the group
        const userGroups = await storage.getGroupsForUser(userId);
        const isMember = userGroups.some(g => g.id === groupId);
        
        if (!isMember) {
          return res.status(403).json({ error: 'You must be a member of the group to share activities to it' });
        }

        try {
          // Inherit the activity to the group
          const inheritedActivity = await inheritActivityToGroup(activityId, groupId, userId);
          
          return res.json({
            success: true,
            activity: inheritedActivity,
            message: 'Activity has been successfully shared to the group'
          });
        } catch (error) {
          console.error('Error sharing activity to group:', error);
          return res.status(500).json({ error: 'Failed to share activity to group' });
        }
      }
      
      // Handle new group creation if requested
      let newGroupId;
      let newGroupShareToken;
      if (createGroup && groupName) {
        // Create the group
        const group = await storage.createGroup({
          name: groupName.trim(),
          description: groupDescription?.trim() || null,
          isPrivate: false,
          inviteCode: null,
          createdBy: userId
        });

        newGroupId = group.id;

        // Add creator as admin
        await storage.createGroupMembership({
          groupId: group.id,
          role: 'admin',
          userId
        });

        // Get CANONICAL (original) tasks for group activity - NOT redacted ones
        const canonicalTasks = await storage.getActivityTasks(activityId, userId);
        
        // Generate share token for group activity
        const crypto = await import('crypto');
        newGroupShareToken = crypto.randomBytes(16).toString('hex');
        
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
              order: index
            }))
          },
          isPublic: true,
          shareToken: newGroupShareToken
        });
      }
      
      // Otherwise, generate shareable link
      // If targetGroupId is provided, verify user is a member and store it
      if (targetGroupId) {
        const userGroups = await storage.getGroupsForUser(userId);
        const isMember = userGroups.some(g => g.id === targetGroupId);
        
        if (!isMember) {
          return res.status(403).json({ error: 'You must be a member of the group to share from it' });
        }
      }
      
      // Generate share token and make activity public
      const shareToken = await storage.generateShareableLink(activityId, userId);
      
      // Update activity with isPublic, targetGroupId if provided
      const updateData: any = { isPublic: true };
      if (targetGroupId) {
        updateData.targetGroupId = targetGroupId;
      }
      await storage.updateActivity(activityId, updateData, userId);
      
      if (!shareToken) {
        return res.status(404).json({ error: 'Failed to generate share token' });
      }
      
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
      
      // Generate compelling social text with emoji
      const categoryEmojis: Record<string, string> = {
        fitness: '💪',
        health: '🏥',
        career: '💼',
        learning: '📚',
        finance: '💰',
        relationships: '❤️',
        creativity: '🎨',
        travel: '✈️',
        home: '🏠',
        personal: '⭐',
        other: '📋'
      };
      const emoji = categoryEmojis[activity.category?.toLowerCase()] || '✨';
      
      // Get tasks to calculate progress
      let tasks: any[] = [];
      try {
        tasks = await storage.getActivityTasks(activityId, userId);
      } catch (err) {
        console.error('Error fetching tasks for social text:', err);
      }
      
      const completedTasks = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const shareTitle = activity.shareTitle || activity.planSummary || activity.title;
      const shareDescription = activity.description || `Join me in planning this amazing ${activity.category} experience`;
      
      // Generate conversational social text with engaging copy
      const progressLine = totalTasks > 0 ? `${progressPercent}% complete with ${totalTasks} tasks!` : 'Just getting started!';
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
        groupId: newGroupId || undefined
      });
    } catch (error) {
      console.error('Generate share link error:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
    }
  });

  // Copy shared activity to user's account
  app.post("/api/activities/copy/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      const { forceUpdate, joinGroup } = req.body; // Client can request an update and opt into joining group
      const currentUserId = getUserId(req);
      
      console.log('[COPY ACTIVITY] Copy request received:', {
        shareToken,
        currentUserId,
        forceUpdate,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.user
      });
      
      // SECURITY: Block demo users from copying activities
      // If no user ID, use demo-user for viewing but block copying
      const userId = currentUserId || 'demo-user';
      console.log('[COPY ACTIVITY] Using userId:', userId, currentUserId ? '(authenticated)' : '(demo user)');
      
      // Demo users cannot copy/save activities
      if (isDemoUser(userId)) {
        console.log('[COPY ACTIVITY] Blocked - demo user cannot copy activities');
        return res.status(403).json({ 
          error: 'Demo users cannot copy activities. Please sign in to save this plan.',
          requiresAuth: true,
          message: 'Sign in to save and track this plan!'
        });
      }
      
      // Get the activity by share token
      const sharedActivity = await storage.getActivityByShareToken(shareToken);
      
      if (!sharedActivity) {
        console.log('[COPY ACTIVITY] Activity not found for token:', shareToken);
        return res.status(404).json({ error: 'Shared activity not found or link has expired' });
      }
      
      console.log('[COPY ACTIVITY] Found shared activity:', {
        activityId: sharedActivity.id,
        title: sharedActivity.title,
        ownerId: sharedActivity.userId,
        isPublic: sharedActivity.isPublic
      });
      
      // Check if activity is public
      if (!sharedActivity.isPublic) {
        console.log('[COPY ACTIVITY] Activity is not public');
        return res.status(403).json({ error: 'This activity is not public and cannot be copied' });
      }
      
      // Don't allow copying your own activity
      if (sharedActivity.userId === userId) {
        console.log('[COPY ACTIVITY] User trying to copy their own activity');
        return res.status(400).json({ error: 'You cannot copy your own activity' });
      }
      
      // Check if user already has a copy of this activity
      const existingCopy = await storage.getExistingCopyByShareToken(userId, shareToken);
      
      if (existingCopy && !forceUpdate) {
        console.log('[COPY ACTIVITY] User already has a copy - prompting for update');
        return res.status(409).json({
          error: 'You already have this activity',
          requiresConfirmation: true,
          existingActivity: existingCopy,
          message: 'You already have this plan. Would you like to update it with the latest version?'
        });
      }
      
      // Get the tasks for the shared activity
      const originalTasks = await storage.getActivityTasks(sharedActivity.id, sharedActivity.userId);
      console.log('[COPY ACTIVITY] Found tasks:', originalTasks.length);
      
      // If updating existing copy, archive the old one and preserve progress
      let oldTasks: Task[] = [];
      if (existingCopy && forceUpdate) {
        console.log('[COPY ACTIVITY] Archiving old copy and preserving progress');
        oldTasks = await storage.getActivityTasks(existingCopy.id, userId);
        await storage.updateActivity(existingCopy.id, { isArchived: true }, userId);
      }
      
      // Create a copy of the activity for the current user
      const copiedActivity = await storage.createActivity({
        userId: userId,
        title: sharedActivity.title,
        description: sharedActivity.description,
        category: sharedActivity.category,
        planSummary: sharedActivity.planSummary,
        status: 'planning', // Reset status to planning
        isPublic: false, // Make private by default
        startDate: sharedActivity.startDate,
        endDate: sharedActivity.endDate,
        copiedFromShareToken: shareToken, // Track where it came from
        backdrop: sharedActivity.backdrop, // Preserve the stock image/backdrop
      });
      console.log('[COPY ACTIVITY] Activity copied successfully:', {
        newActivityId: copiedActivity.id,
        userId: userId
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
          matchingOldTask = oldTasks.find(t => 
            t.originalTaskId === searchId || t.id === searchId
          );
        }
        
        // Fallback: match by title if no ID match found
        if (!matchingOldTask) {
          matchingOldTask = oldTasks.find(t => 
            t.title.trim().toLowerCase() === task.title.trim().toLowerCase()
          );
        }
        
        const newTask = await storage.createTask({
          userId: userId,
          activityId: copiedActivity.id,
          title: task.title,
          description: task.description,
          category: task.category || 'general',
          priority: task.priority || 'medium',
          completed: matchingOldTask?.completed || false, // Preserve completion status
          completedAt: matchingOldTask?.completedAt || null,
          dueDate: task.dueDate,
          originalTaskId: task.originalTaskId || task.id, // Track original source task
        });
        
        // Add task to activity via join table
        await storage.addTaskToActivity(copiedActivity.id, newTask.id, taskOrder++);
        copiedTasks.push(newTask);
      }
      console.log('[COPY ACTIVITY] Tasks copied successfully:', copiedTasks.length);
      
      // Count preserved progress
      const preservedCompletions = copiedTasks.filter(t => t.completed).length;
      
      // Join group if activity has targetGroupId and user opted in (joinGroup=true)
      let joinedGroup = null;
      if (sharedActivity.targetGroupId && currentUserId && joinGroup) {
        try {
          // Check if user is already a member
          const userGroups = await storage.getGroupsForUser(currentUserId);
          const alreadyMember = userGroups.some(g => g.id === sharedActivity.targetGroupId);
          
          if (!alreadyMember) {
            // Add user to the group
            await storage.addGroupMember(
              sharedActivity.targetGroupId,
              currentUserId,
              'member'
            );
            
            // Get user and group info
            const user = await storage.getUser(currentUserId);
            const group = await storage.getGroup(sharedActivity.targetGroupId);
            joinedGroup = group;
            
            // Send notification to admin and members using proper notification service
            try {
              await sendGroupNotification(storage, {
                groupId: sharedActivity.targetGroupId,
                actorUserId: currentUserId,
                excludeUserIds: [currentUserId], // Don't notify the person who joined
                notificationType: 'member_joined',
                payload: {
                  title: 'New member joined',
                  body: `${user?.username || 'Someone'} joined "${group?.name || 'your group'}" via shared activity`,
                  data: { 
                    groupId: sharedActivity.targetGroupId, 
                    newMemberId: currentUserId,
                    activityTitle: sharedActivity.title,
                    viaShareLink: true
                  },
                  route: `/groups/${sharedActivity.targetGroupId}`,
                },
              });
              console.log('[COPY ACTIVITY] Sent group join notifications');
            } catch (notifError) {
              console.error('[COPY ACTIVITY] Error sending group notifications:', notifError);
              // Don't fail the operation if notification fails
            }
            
            console.log('[COPY ACTIVITY] User joined group:', sharedActivity.targetGroupId);
          } else {
            console.log('[COPY ACTIVITY] User already member of group:', sharedActivity.targetGroupId);
          }
        } catch (error) {
          console.error('[COPY ACTIVITY] Error joining group:', error);
          // Don't fail the whole copy operation if group join fails
        }
      }
      
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
            : 'Activity copied successfully!'
      });
    } catch (error) {
      console.error('[COPY ACTIVITY] Error copying activity:', error);
      res.status(500).json({ error: 'Failed to copy activity' });
    }
  });

  // View shared activity by token
  app.get("/api/share/activity/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const activity = await storage.getActivityByShareToken(token);
      
      if (!activity) {
        return res.status(404).json({ error: 'Shared activity not found or link has expired' });
      }

      // Check if activity requires authentication (not public)
      const requiresAuth = !activity.isPublic;
      const currentUserId = getUserId(req);
      
      // If activity requires auth and user is not authenticated, return 401
      if (requiresAuth && !currentUserId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          requiresAuth: true 
        });
      }

      // Get the tasks for this activity (using the owner's userId)
      let activityTasks: any[] = [];
      try {
        activityTasks = await storage.getActivityTasks(activity.id, activity.userId);
      } catch (taskError) {
        console.error('Error fetching activity tasks:', taskError);
        // Continue with empty tasks array if there's an error
        activityTasks = [];
      }
      
      // Get owner information for "sharedBy"
      let sharedBy = undefined;
      try {
        const owner = await storage.getUser(activity.userId);
        if (owner) {
          const ownerName = owner.firstName && owner.lastName 
            ? `${owner.firstName} ${owner.lastName}`
            : owner.firstName || owner.lastName || owner.email || 'Anonymous';
          sharedBy = {
            name: ownerName,
            email: owner.email || undefined
          };
        }
      } catch (err) {
        console.error('Failed to get owner info:', err);
      }

      // Generate plan summary if not present
      const planSummary = activity.socialText || 
        `${activity.title} - A ${activity.category} plan with ${activityTasks.length} tasks`;
      
      res.json({
        activity: {
          ...activity,
          planSummary
        },
        tasks: activityTasks,
        requiresAuth,
        sharedBy
      });
    } catch (error) {
      console.error('Get shared activity error:', error);
      res.status(500).json({ error: 'Failed to fetch shared activity' });
    }
  });

  // Get public activities (for social feed)
  app.get("/api/activities/public", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = await storage.getPublicActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error('Get public activities error:', error);
      res.status(500).json({ error: 'Failed to fetch public activities' });
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
      let locationFilter: { lat: number; lon: number; radiusKm?: number } | undefined;
      if (req.query.lat && req.query.lon) {
        const lat = parseFloat(req.query.lat as string);
        const lon = parseFloat(req.query.lon as string);
        const radiusKm = req.query.radius ? parseFloat(req.query.radius as string) : 50;
        
        // Validate coordinates
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          // Clamp radius to 5-500 km
          const clampedRadius = Math.max(5, Math.min(500, radiusKm));
          locationFilter = { lat, lon, radiusKm: clampedRadius };
        }
      }
      
      const plans = await storage.getCommunityPlans(userId, category, search, limit, budgetRange, locationFilter);
      
      // Get all feedback in bulk (single query)
      const activityIds = plans.map(p => p.id);
      const feedbackMap = await storage.getBulkActivityFeedback(activityIds, userId);
      
      // Add user's like status and updated like count to each plan
      const plansWithLikeStatus = plans.map(plan => {
        const feedback = feedbackMap.get(plan.id) || { userHasLiked: false, likeCount: 0 };
        return {
          ...plan,
          userHasLiked: feedback.userHasLiked,
          likeCount: feedback.likeCount
        };
      });
      
      res.json(plansWithLikeStatus);
    } catch (error) {
      console.error('Get community plans error:', error);
      res.status(500).json({ error: 'Failed to fetch community plans' });
    }
  });

  // Send retroactive welcome emails to existing OAuth users
  app.post("/api/admin/send-oauth-welcome-emails", async (req, res) => {
    try {
      const { adminSecret } = req.body;
      
      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret' });
      }

      console.log('[ADMIN] Starting retroactive welcome email send for OAuth users...');
      
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
        .where(
          and(
            isNotNull(users.email),
            ne(users.email, '')
          )
        )
        .execute();

      console.log(`[ADMIN] Found ${oauthUsers.length} OAuth users with emails`);

      let successCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      // Send emails in batches to avoid rate limiting
      for (const user of oauthUsers) {
        try {
          const result = await sendWelcomeEmail(user.email!, user.firstName || 'there');
          if (result.success) {
            successCount++;
            console.log(`[ADMIN] Welcome email sent to ${user.email} (${user.provider})`);
          } else {
            failedCount++;
            errors.push({ email: user.email, error: result.error });
            console.error(`[ADMIN] Failed to send to ${user.email}:`, result.error);
          }
          
          // Delay between emails to respect rate limit (2 emails/second = 500ms minimum)
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (error: any) {
          failedCount++;
          errors.push({ email: user.email, error: error.message });
          console.error(`[ADMIN] Error sending to ${user.email}:`, error);
        }
      }

      console.log(`[ADMIN] Retroactive welcome emails complete: ${successCount} sent, ${failedCount} failed`);
      
      res.json({
        success: true,
        message: 'Retroactive welcome emails sent',
        stats: {
          total: oauthUsers.length,
          sent: successCount,
          failed: failedCount,
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Only return first 10 errors
      });
    } catch (error: any) {
      console.error('[ADMIN] Retroactive email error:', error);
      res.status(500).json({ error: 'Failed to send retroactive welcome emails', details: error.message });
    }
  });

  // Delete complete user account (for testing purposes)
  app.delete("/api/admin/delete-user", async (req, res) => {
    try {
      const { adminSecret, email, userId } = req.body;
      
      // Verify admin secret
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret' });
      }

      if (!email && !userId) {
        return res.status(400).json({ error: 'Either email or userId must be provided' });
      }

      console.log('[ADMIN] Deleting user account:', email || userId);
      
      if (email) {
        await storage.deleteCompleteUserByEmail(email);
        console.log('[ADMIN] User deleted successfully by email:', email);
        res.json({
          success: true,
          message: `User account with email ${email} has been completely deleted`,
        });
      } else {
        await storage.deleteCompleteUser(userId);
        console.log('[ADMIN] User deleted successfully by ID:', userId);
        res.json({
          success: true,
          message: `User account with ID ${userId} has been completely deleted`,
        });
      }
    } catch (error: any) {
      console.error('[ADMIN] Delete user error:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete user account', details: error.message });
    }
  });

  // Test welcome email endpoint (temporary - for development only)
  app.post("/api/admin/test-welcome-email", async (req, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'This endpoint is only available in development mode' });
    }
    
    try {
      const { email, firstName } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      console.log('[TEST EMAIL] Sending test welcome email to:', email);
      const result = await sendWelcomeEmail(email, firstName || 'there');
      
      if (result.success) {
        res.json({ success: true, message: 'Test welcome email sent successfully', emailId: result.emailId });
      } else {
        res.status(500).json({ success: false, error: 'Failed to send email', details: result.error });
      }
    } catch (error) {
      console.error('Test welcome email error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

  // Test email endpoint - requires authentication
  app.post("/api/test-email", async (req, res) => {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'You must be signed in to send test emails'
      });
    }
    
    try {
      const { email, firstName } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }
      
      console.log('[TEST EMAIL] Sending test welcome email to:', email, 'for user:', userId);
      const result = await sendWelcomeEmail(email, firstName || 'there');
      
      if (result.success) {
        res.json({ success: true, message: 'Test welcome email sent successfully!', emailId: result.emailId });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error('[TEST EMAIL] Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to send test email' });
    }
  });

  // Increment activity views
  app.post("/api/activities/:activityId/increment-views", async (req, res) => {
    try {
      const { activityId } = req.params;
      await storage.incrementActivityViews(activityId);
      res.json({ success: true });
    } catch (error) {
      console.error('Increment views error:', error);
      res.status(500).json({ error: 'Failed to increment views' });
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
      const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
      if (activity) {
        const newShareCount = (activity.shareCount || 0) + count;

        // Check for milestones (100, 500, 1000)
        if ([100, 500, 1000].includes(newShareCount)) {
          const { CreditService } = await import('./services/creditService.js');
          await CreditService.awardShareMilestoneCredits(activity.userId, activityId, newShareCount);
        }
      }

      res.json({ success: true, platform });
    } catch (error) {
      console.error('[track-share] Error:', error);
      res.status(500).json({ error: 'Failed to track share' });
    }
  });

  // Save social media post URLs for activity verification
  app.post("/api/activities/:activityId/social-links", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify user owns the activity
      const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
      if (!activity || activity.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { twitterPostUrl, instagramPostUrl, threadsPostUrl, linkedinPostUrl } = req.body;

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
      if (plannerProfile && (!activity.plannerProfileId || activity.plannerProfileId !== plannerProfile.id)) {
        await db
          .update(activities)
          .set({ plannerProfileId: plannerProfile.id })
          .where(eq(activities.id, activityId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[social-links] Error:', error);
      res.status(500).json({ error: 'Failed to save social links' });
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
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('[planner-profile-social-links] Error:', error);
      res.status(500).json({ error: 'Failed to fetch social links' });
    }
  });

  // Report an activity for spam/fraud (with rate limiting)
  const reportRateLimiter = new Map<string, { count: number; resetAt: number }>();
  
  app.post("/api/activities/:activityId/report", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Rate limiting: 5 reports per hour per user
      const now = Date.now();
      const rateLimitKey = `report:${userId}`;
      const rateLimitData = reportRateLimiter.get(rateLimitKey);
      
      if (rateLimitData) {
        if (now < rateLimitData.resetAt) {
          if (rateLimitData.count >= 5) {
            const minutesRemaining = Math.ceil((rateLimitData.resetAt - now) / 60000);
            return res.status(429).json({ 
              error: 'Rate limit exceeded',
              message: `You can submit up to 5 reports per hour. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`
            });
          }
          rateLimitData.count++;
        } else {
          // Reset window expired
          reportRateLimiter.set(rateLimitKey, { count: 1, resetAt: now + 3600000 });
        }
      } else {
        // First report
        reportRateLimiter.set(rateLimitKey, { count: 1, resetAt: now + 3600000 });
      }

      const { reason, details } = req.body;

      // Validate reason
      const validReasons = ['spam', 'fraud', 'inappropriate', 'copyright', 'other'];
      if (!reason || !validReasons.includes(reason)) {
        return res.status(400).json({ error: 'Invalid report reason' });
      }

      // Check if activity exists (use public access - users can report any public activity)
      const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Only allow reporting public/featured activities
      if (!activity.isPublic && !activity.featuredInCommunity) {
        return res.status(403).json({ error: 'You can only report public community plans' });
      }

      // Check if user already reported this activity (prevents duplicate reports)
      const existingReport = await storage.checkDuplicateReport(activityId, userId);
      if (existingReport && existingReport.status !== 'dismissed') {
        return res.status(400).json({ error: 'You have already reported this activity' });
      }

      // Create report using storage interface
      await storage.createActivityReport({
        activityId,
        reportedBy: userId,
        reason,
        details: details || null,
        reviewedBy: null,
        reviewedAt: null,
        resolution: null
      });

      res.json({ success: true, message: 'Report submitted successfully. Thank you for helping keep our community safe.' });
    } catch (error) {
      console.error('[report-activity] Error:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  // Request edit permission for a shared activity - copies the activity to user's account
  app.post("/api/activities/:activityId/request-permission", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Sign in required',
          message: 'You must be signed in to request permission to edit this activity.',
          requiresAuth: true
        });
      }
      
      // Get the original activity
      const [originalActivity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
      if (!originalActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Check if user is already the owner
      if (originalActivity.userId === userId) {
        return res.status(400).json({ error: 'You already own this activity' });
      }

      // Check if user already has a copy of this activity
      const existingCopy = await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.userId, userId),
            eq(activities.title, `${originalActivity.title} (Copy)`)
          )
        )
        .limit(1);
      
      if (existingCopy.length > 0) {
        return res.json({ 
          success: true, 
          message: 'You already have a copy of this activity',
          activity: existingCopy[0]
        });
      }

      // Get all tasks associated with the original activity
      const originalTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.activityId, activityId));

      // Create a copy of the activity for the user
      const [copiedActivity] = await db.insert(activities).values({
        userId,
        title: `${originalActivity.title} (Copy)`,
        description: originalActivity.description,
        category: originalActivity.category,
        status: 'active',
        priority: originalActivity.priority,
        startDate: originalActivity.startDate,
        endDate: originalActivity.endDate,
        planSummary: originalActivity.planSummary,
        isPublic: false, // Don't automatically share the copy
        shareToken: null,
        shareableLink: null
      }).returning();

      // Copy all tasks associated with the activity
      const copiedTasks = [];
      for (const task of originalTasks) {
        const [newTask] = await db.insert(tasks).values({
          userId,
          activityId: copiedActivity.id,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: 'pending',
          completed: false,
          dueDate: task.dueDate,
          timeEstimate: task.timeEstimate
        }).returning();
        copiedTasks.push(newTask);
      }

      res.json({ 
        success: true, 
        message: `Activity "${originalActivity.title}" has been copied to your account with ${copiedTasks.length} tasks`,
        activity: copiedActivity,
        tasks: copiedTasks
      });
    } catch (error) {
      console.error('Request permission error:', error);
      res.status(500).json({ error: 'Failed to copy activity' });
    }
  });

  // Get permission requests for an activity (owner only)
  app.get("/api/activities/:activityId/permission-requests", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Verify the user owns this activity
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found or unauthorized' });
      }

      const requests = await storage.getActivityPermissionRequests(activityId);
      res.json(requests);
    } catch (error) {
      console.error('Get permission requests error:', error);
      res.status(500).json({ error: 'Failed to fetch permission requests' });
    }
  });

  // Get all permission requests for the current user (as requester)
  app.get("/api/permission-requests", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const requests = await storage.getUserPermissionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('Get user permission requests error:', error);
      res.status(500).json({ error: 'Failed to fetch permission requests' });
    }
  });

  // Get all permission requests for the current user (as owner)
  app.get("/api/permission-requests/owner", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const requests = await storage.getOwnerPermissionRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('Get owner permission requests error:', error);
      res.status(500).json({ error: 'Failed to fetch permission requests' });
    }
  });

  // Approve or deny a permission request (owner only)
  app.patch("/api/permission-requests/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body; // 'approved' or 'denied'
      const userId = getUserId(req) || DEMO_USER_ID;

      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be approved or denied' });
      }

      const request = await storage.updatePermissionRequest(requestId, status, userId);
      
      if (!request) {
        return res.status(404).json({ error: 'Permission request not found or unauthorized' });
      }

      res.json({ success: true, request });
    } catch (error) {
      console.error('Update permission request error:', error);
      res.status(500).json({ error: 'Failed to update permission request' });
    }
  });

  // Create activity from dialogue (AI-generated tasks)
  // Update existing activity with new plan (replaces all tasks)
  app.post("/api/activities/:activityId/update-from-dialogue", async (req: any, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const { title, description, category, tasks } = req.body;
      
      // Verify ownership
      const existingActivity = await storage.getActivity(activityId, userId);
      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      // Update activity metadata
      const updatedActivity = await storage.updateActivity(activityId, {
        title,
        description,
        category
      }, userId);
      
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
              category: taskData.category || category || 'general'
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
        console.error('Failed during task replacement, rolling back:', linkError);
        
        // ROLLBACK: Restore original task links
        try {
          // Remove any partially-linked new tasks
          for (const newTask of newTasks) {
            await storage.removeTaskFromActivity(activityId, newTask.id).catch(() => {});
            await storage.deleteTask(newTask.id, userId).catch(() => {});
          }
          
          // Restore original task links (tasks still exist because we haven't deleted them yet)
          for (let i = 0; i < existingTasks.length; i++) {
            await storage.addTaskToActivity(activityId, existingTasks[i].id, i);
          }
          
          console.log('Successfully rolled back to original tasks');
        } catch (rollbackError) {
          console.error('CRITICAL: Rollback failed:', rollbackError);
        }
        
        throw new Error('Failed to update tasks, changes rolled back');
      }
      
      // Step 5: ONLY delete old tasks AFTER successful linking
      // At this point, new tasks are safely linked and we can cleanup
      for (const task of existingTasks) {
        await storage.deleteTask(task.id, userId).catch(err => {
          console.error('Failed to delete old task (non-critical):', err);
          // Non-critical: new tasks are already linked, old tasks just orphaned
        });
      }
      
      // Get the complete updated activity with new tasks
      const activityTasks = await storage.getActivityTasks(activityId, userId);
      res.json({ ...updatedActivity, tasks: activityTasks });
    } catch (error) {
      console.error('Update activity from dialogue error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

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
            error: 'Sign in required',
            message: 'You\'ve created your free activity! Sign in to create unlimited activities and unlock premium features like sharing, progress tracking, and AI-powered insights.',
            requiresAuth: true
          });
        }
      }
      
      // Create the activity
      const activity = await storage.createActivity({
        title,
        description,
        category,
        status: 'planning',
        userId
      });

      // Create tasks and link them to the activity
      // This ensures ALL tasks belong to an activity (no orphan tasks)
      if (tasks && Array.isArray(tasks)) {
        for (let i = 0; i < tasks.length; i++) {
          const taskData = tasks[i];
          const task = await storage.createTask({
            ...taskData,
            userId,
            category: taskData.category || category || 'general'
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
        }
      }

      // Increment counter AFTER successful creation (for demo users only)
      if (!isAuthenticated) {
        req.session.demoActivityCount += 1;
      }

      // Get the complete activity with tasks
      const activityTasks = await storage.getActivityTasks(activity.id, userId);
      res.json({ ...activity, tasks: activityTasks });
    } catch (error) {
      console.error('Create activity from dialogue error:', error);
      res.status(500).json({ error: 'Failed to create activity from dialogue' });
    }
  });

  // Get progress dashboard data
  app.get("/api/progress", async (req, res) => {
    try {
      // Disable caching and ETags for this endpoint to always get fresh data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', ''); // Disable ETag
      res.removeHeader('ETag'); // Ensure no ETag
      
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Get ALL tasks (including completed) for progress calculation
      // Note: getUserTasks() filters out completed tasks, so we query directly
      const tasks = await db.select().from(tasksTable)
        .where(and(
          eq(tasksTable.userId, userId),
          or(eq(tasksTable.archived, false), isNull(tasksTable.archived))
        ));
      
      // Get today's date in YYYY-MM-DD format (local timezone)
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      console.log('[PROGRESS] Today\'s date:', today);
      
      // Calculate today's progress based on completion date
      console.log('[PROGRESS] Sample task data:', tasks.slice(0, 3).map(t => ({ 
        title: t.title, 
        completed: t.completed, 
        completedType: typeof t.completed,
        completedAt: t.completedAt 
      })));
      
      const completedTasks = tasks.filter(task => task.completed === true);
      console.log('[PROGRESS] Total completed tasks:', completedTasks.length);
      
      const completedToday = completedTasks.filter(task => {
        if (!task.completedAt) return false;
        const completionDate = task.completedAt instanceof Date 
          ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, '0')}-${String(task.completedAt.getDate()).padStart(2, '0')}`
          : task.completedAt.toString().split('T')[0];
        
        console.log('[PROGRESS] Task:', task.title, '| Completed at:', task.completedAt, '| Completion date:', completionDate, '| Matches today?', completionDate === today);
        return completionDate === today;
      }).length;
      
      console.log('[PROGRESS] Completed today:', completedToday);
      
      // Count all active tasks (not completed or completed today)
      const activeTasks = tasks.filter(task => {
        if (!task.completed) return true;
        if (!task.completedAt) return false;
        const completionDate = task.completedAt instanceof Date 
          ? `${task.completedAt.getFullYear()}-${String(task.completedAt.getMonth() + 1).padStart(2, '0')}-${String(task.completedAt.getDate()).padStart(2, '0')}`
          : task.completedAt.toString().split('T')[0];
        return completionDate === today;
      });
      const totalToday = activeTasks.length;
      
      // Calculate categories
      const categoryMap = new Map<string, { completed: number; total: number }>();
      tasks.forEach(task => {
        const existing = categoryMap.get(task.category) || { completed: 0, total: 0 };
        existing.total++;
        if (task.completed) existing.completed++;
        categoryMap.set(task.category, existing);
      });
      
      const categories = Array.from(categoryMap.entries()).map(([name, stats]) => ({
        name,
        ...stats
      }));

      // Calculate streak (simplified - just based on recent activity)
      const weeklyStreak = Math.min(completedTasks.length, 7); // Simple streak calculation
      
      const totalCompleted = completedTasks.length;
      const completionRate = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

      // Generate lifestyle suggestions
      const recentCompletedTasks = completedTasks
        .slice(0, 10)
        .map(task => task.title);
        
      const suggestions = await aiService.generateLifestyleSuggestions(
        recentCompletedTasks,
        categories,
        weeklyStreak
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
          'Consistency building',
          'Goal crusher'
        ],
        lifestyleSuggestions: suggestions
      });
    } catch (error) {
      console.error('Progress data error:', error);
      res.status(500).json({ error: 'Failed to fetch progress data' });
    }
  });

  // Journal entry endpoints
  // NOTE: More specific routes MUST come before parameterized routes
  // This prevents /api/journal/:date from matching /api/journal/entries
  
  // Get all journal entries for the current user
  app.get("/api/journal/entries", async (req, res) => {
    try {
      // Disable caching to ensure fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log('[JOURNAL] Fetching entries for user:', userId);
      
      let prefs = await storage.getPersonalJournalEntries(userId);
      console.log('[JOURNAL] Retrieved preferences:', prefs ? 'exists' : 'null');
      console.log('[JOURNAL] JournalData exists:', prefs?.preferences?.journalData ? 'yes' : 'no');
      
      if (!prefs || !prefs.preferences?.journalData) {
        console.log('[JOURNAL] No journal data found, returning empty array');
        return res.json({ entries: [] });
      }

      // Flatten all entries from all categories into a single array
      const journalData = prefs.preferences.journalData;
      const allEntries: any[] = [];
      
      console.log('[JOURNAL] Processing categories:', Object.keys(journalData));
      
      for (const [category, entries] of Object.entries(journalData)) {
        if (Array.isArray(entries)) {
          console.log(`[JOURNAL] Category "${category}" has ${entries.length} entries`);
          entries.forEach((entry: any) => {
            allEntries.push({
              ...entry,
              category
            });
          });
        }
      }

      // Sort by timestamp descending (newest first)
      allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('[JOURNAL] Returning', allEntries.length, 'total entries');
      console.log('[JOURNAL] First entry sample:', allEntries[0] ? JSON.stringify(allEntries[0]).substring(0, 100) : 'none');

      res.json({ entries: allEntries });
    } catch (error) {
      console.error('[JOURNAL] Get journal entries error:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });
  
  app.get("/api/journal/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const entry = await storage.getUserJournalEntry(userId, date);
      res.json(entry || null);
    } catch (error) {
      console.error('Get journal error:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });

  app.post("/api/journal", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // SECURITY: Block demo users from creating journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error: 'Demo users cannot create journal entries. Please sign in to start journaling.',
          requiresAuth: true
        });
      }
      
      const entryData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry({
        ...entryData,
        userId
      });
      res.json(entry);
    } catch (error) {
      console.error('Create journal error:', error);
      res.status(400).json({ error: 'Invalid journal data' });
    }
  });

  app.put("/api/journal/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // SECURITY: Block demo users from updating journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error: 'Demo users cannot update journal entries. Please sign in to continue.',
          requiresAuth: true
        });
      }
      
      const updates = req.body;
      const entry = await storage.updateJournalEntry(entryId, updates, userId);
      
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      res.json(entry);
    } catch (error) {
      console.error('Update journal error:', error);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  // Chat Import routes
  app.post("/api/chat/import", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const data = insertChatImportSchema.parse(req.body);
      
      if (!data.chatHistory || !Array.isArray(data.chatHistory) || data.chatHistory.length === 0) {
        return res.status(400).json({ error: 'Chat history is required and must be a non-empty array' });
      }

      // Process the chat history to extract goals and tasks
      const chatProcessingResult = await aiService.processChatHistory({
        source: data.source,
        conversationTitle: data.conversationTitle || 'Imported Conversation',
        chatHistory: data.chatHistory as Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
      }, userId);

      // Create chat import record
      const chatImport = await storage.createChatImport({
        ...data,
        userId,
        extractedGoals: chatProcessingResult.extractedGoals
      });

      // Create tasks from the chat processing
      const tasks = await Promise.all(
        chatProcessingResult.tasks.map(task =>
          storage.createTask({
            ...task,
            userId,
          })
        )
      );

      res.json({
        chatImport,
        extractedGoals: chatProcessingResult.extractedGoals,
        tasks,
        summary: chatProcessingResult.summary,
        message: `Successfully imported chat and created ${tasks.length} accountability tasks!`
      });
    } catch (error) {
      console.error('Chat import error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid chat data format', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to import chat history' });
    }
  });

  app.get("/api/chat/imports", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const imports = await storage.getUserChatImports(userId);
      res.json(imports);
    } catch (error) {
      console.error('Get chat imports error:', error);
      res.status(500).json({ error: 'Failed to fetch chat imports' });
    }
  });

  app.get("/api/chat/imports/:id", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const chatImport = await storage.getChatImport(req.params.id, userId);
      if (!chatImport) {
        return res.status(404).json({ error: 'Chat import not found' });
      }
      res.json(chatImport);
    } catch (error) {
      console.error('Get chat import error:', error);
      res.status(500).json({ error: 'Failed to fetch chat import' });
    }
  });

  // User Priorities
  app.get("/api/user/priorities", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const priorities = await storage.getUserPriorities(userId);
      res.json(priorities);
    } catch (error) {
      console.error('Get priorities error:', error);
      res.status(500).json({ error: 'Failed to fetch priorities' });
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
      console.error('Create priority error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid priority data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create priority' });
    }
  });

  app.delete("/api/user/priorities/:id", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      await storage.deletePriority(req.params.id, userId);
      res.json({ message: 'Priority deleted successfully' });
    } catch (error) {
      console.error('Delete priority error:', error);
      res.status(500).json({ error: 'Failed to delete priority' });
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
          quietHoursEnd: "08:00"
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  app.patch("/api/notifications/preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const updates = insertNotificationPreferencesSchema.partial().parse(req.body);
      const preferences = await storage.updateNotificationPreferences(userId, updates);
      
      if (!preferences) {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Device Token Management (for push notifications)
  app.post("/api/notifications/register-device", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { token, platform, deviceInfo } = req.body;
      
      if (!token || !platform) {
        return res.status(400).json({ error: 'Token and platform are required' });
      }

      console.log(`[PUSH] Registering device token for user ${userId}, platform: ${platform}`);
      
      const deviceToken = await storage.upsertDeviceToken(userId, {
        token,
        platform,
        deviceInfo,
      });
      
      res.json({ 
        success: true, 
        message: 'Device registered for push notifications',
        deviceId: deviceToken.id 
      });
    } catch (error) {
      console.error('Error registering device token:', error);
      res.status(500).json({ error: 'Failed to register device for push notifications' });
    }
  });

  app.post("/api/notifications/unregister-device", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      console.log(`[PUSH] Unregistering device token for user ${userId}`);
      
      await storage.deleteDeviceToken(token, userId);
      
      res.json({ 
        success: true, 
        message: 'Device unregistered from push notifications' 
      });
    } catch (error) {
      console.error('Error unregistering device token:', error);
      res.status(500).json({ error: 'Failed to unregister device from push notifications' });
    }
  });

  app.get("/api/notifications/devices", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const devices = await storage.getUserDeviceTokens(userId);
      res.json({ devices });
    } catch (error) {
      console.error('Error fetching user devices:', error);
      res.status(500).json({ error: 'Failed to fetch registered devices' });
    }
  });

  // NEW: Simple Plan Conversation Handler (replaces complex LangGraph)
  async function handleSimplePlanConversation(req: any, res: any, message: string, conversationHistory: any[], userId: string, mode: 'quick' | 'smart') {
    try {
      console.log(`✨ [SIMPLE PLANNER - ${mode.toUpperCase()} MODE] Processing message for user ${userId}`);
      console.log(`📝 [SIMPLE PLANNER] Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}}"`);

      // Get or create session
      let session = await storage.getActiveLifestylePlannerSession(userId);

      const isNewConversation = !conversationHistory || conversationHistory.length === 0;

      if (isNewConversation) {
        // New conversation - create fresh session
        if (session) {
          await storage.updateLifestylePlannerSession(session.id, {
            isComplete: true,
            sessionState: 'completed'
          }, userId);
        }

        session = await storage.createLifestylePlannerSession({
          userId,
          sessionState: 'gathering',
          slots: {},
          conversationHistory: [],
          externalContext: { currentMode: mode }
        });

        console.log(`[SIMPLE PLAN] Created new session: ${session.id}`);
      } else if (!session) {
        // Session lost - recreate
        session = await storage.createLifestylePlannerSession({
          userId,
          sessionState: 'gathering',
          slots: {},
          conversationHistory: conversationHistory,
          externalContext: { currentMode: mode }
        });
      }

      // 🚨 CRITICAL FIX: Check confirmation BEFORE calling planner to avoid loop
      // If user is confirming plan, create activity immediately without calling planner again
      const lowerMsg = message.toLowerCase().trim();
      const hasAffirmative = /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good)\b/i.test(lowerMsg);
      const generatedPlan = session.slots?._generatedPlan;

      // DEBUG: Log confirmation check values
      console.log('🔍 [CONFIRMATION CHECK]', {
        awaitingPlanConfirmation: session.externalContext?.awaitingPlanConfirmation,
        hasAffirmative,
        hasGeneratedPlan: !!generatedPlan,
        userMessage: lowerMsg,
        sessionState: session.sessionState,
        externalContext: session.externalContext
      });

      if (session.externalContext?.awaitingPlanConfirmation && hasAffirmative && generatedPlan) {
        console.log('✅ [CONFIRMATION DETECTED] Creating/updating activity from confirmed plan');

        // Check if we're updating an existing activity (tracked in session)
        const existingActivityId = session.externalContext?.activityId;
        let activity;
        let isUpdate = false;

        if (existingActivityId) {
          // UPDATE existing activity
          console.log(`♻️ [ACTIVITY UPDATE] Updating existing activity: ${existingActivityId}`);
          activity = await storage.updateActivity(existingActivityId, {
            title: generatedPlan.title,
            description: generatedPlan.description,
            category: generatedPlan.domain || generatedPlan.category || 'personal',
            status: 'planning',
            budget: Math.round(generatedPlan.budget.total * 100),
            budgetBreakdown: generatedPlan.budget.breakdown,
            budgetBuffer: generatedPlan.budget.buffer ? Math.round(generatedPlan.budget.buffer * 100) : 0
          }, userId);
          
          if (!activity) {
            // Activity was deleted or doesn't exist - create new one instead
            console.log(`⚠️ [ACTIVITY UPDATE] Activity ${existingActivityId} not found, creating new one`);
            activity = await storage.createActivity({
              title: generatedPlan.title,
              description: generatedPlan.description,
              category: generatedPlan.domain || generatedPlan.category || 'personal',
              status: 'planning',
              budget: Math.round(generatedPlan.budget.total * 100),
              budgetBreakdown: generatedPlan.budget.breakdown,
              budgetBuffer: generatedPlan.budget.buffer ? Math.round(generatedPlan.budget.buffer * 100) : 0,
              userId
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
          console.log('✨ [ACTIVITY CREATE] Creating new activity');
          activity = await storage.createActivity({
            title: generatedPlan.title,
            description: generatedPlan.description,
            category: generatedPlan.domain || generatedPlan.category || 'personal',
            status: 'planning',
            budget: Math.round(generatedPlan.budget.total * 100),
            budgetBreakdown: generatedPlan.budget.breakdown,
            budgetBuffer: generatedPlan.budget.buffer ? Math.round(generatedPlan.budget.buffer * 100) : 0,
            userId
          });
        }

        // Create new tasks
        const createdTasks = [];
        if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
          for (let i = 0; i < generatedPlan.tasks.length; i++) {
            const taskData = generatedPlan.tasks[i];

            // Match budget breakdown to task category
            const budgetItem = generatedPlan.budget.breakdown.find(
              (item: any) => item.category.toLowerCase().includes(taskData.category?.toLowerCase() || '') ||
                             (taskData.taskName || taskData.title)?.toLowerCase().includes(item.category.toLowerCase())
            );

            const task = await storage.createTask({
              title: taskData.taskName || taskData.title,
              description: taskData.notes || taskData.description || '',
              category: taskData.category || generatedPlan.domain || 'personal',
              priority: taskData.priority || 'medium',
              timeEstimate: `${taskData.duration || 30} min`,
              cost: budgetItem?.amount ? Math.round(budgetItem.amount * 100) : undefined,
              costNotes: budgetItem?.notes,
              userId
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Store activityId in session for future updates
        await storage.updateLifestylePlannerSession(session.id, {
          sessionState: 'completed',
          isComplete: true,
          externalContext: {
            ...session.externalContext,
            activityId: activity.id  // Track for future updates
          }
        }, userId);

        // Construct full URL for activity link
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const host = req.get('host') || 'journalmate.replit.app';
        const activityUrl = `${protocol}://${host}/activities/${activity.id}`;

        return res.json({
          message: isUpdate 
            ? `♻️ **Activity "${activity.title}" updated!**\n\n📋 I've updated the plan with ${createdTasks.length} new tasks!\n\n→ [View Your Plan](${activityUrl})`
            : `✨ **Activity "${activity.title}" created!**\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](${activityUrl})`,
          activityCreated: !isUpdate,
          activityUpdated: isUpdate,
          activity,
          createdTasks,
          planComplete: true
        });
      }

      // Process message with simple planner
      const plannerResponse = await simpleConversationalPlanner.processMessage(
        userId,
        message,
        session.conversationHistory || conversationHistory,
        storage,
        mode
      );

      // Log what was extracted
      console.log(`🎯 [SIMPLE PLANNER] Extracted info:`, plannerResponse.extractedInfo);
      console.log(`✅ [SIMPLE PLANNER] Ready to generate: ${plannerResponse.readyToGenerate}`);

      // Update conversation history
      const updatedHistory = [
        ...(session.conversationHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: plannerResponse.message, timestamp: new Date().toISOString() }
      ];

      // Update session
      await storage.updateLifestylePlannerSession(session.id, {
        conversationHistory: updatedHistory,
        slots: {
          ...session.slots,
          ...plannerResponse.extractedInfo,
          _generatedPlan: plannerResponse.plan || session.slots?._generatedPlan
        },
        sessionState: plannerResponse.readyToGenerate ? 'confirming' : 'gathering',
        externalContext: {
          ...session.externalContext,
          currentMode: mode,
          awaitingPlanConfirmation: plannerResponse.readyToGenerate
        }
      }, userId);

      // DEBUG: Log session update
      console.log('💾 [SESSION UPDATED]', {
        sessionId: session.id,
        readyToGenerate: plannerResponse.readyToGenerate,
        awaitingPlanConfirmation: plannerResponse.readyToGenerate,
        hasPlan: !!plannerResponse.plan,
        sessionState: plannerResponse.readyToGenerate ? 'confirming' : 'gathering'
      });

      // Check if planner just generated a new plan
      if (plannerResponse.readyToGenerate && plannerResponse.plan) {
        // Check if AI already asked for confirmation (case-insensitive, flexible matching)
        const messageLower = plannerResponse.message.toLowerCase();
        const alreadyAskedConfirmation = messageLower.includes("are you comfortable") || 
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
          conversationHistory: updatedHistory
        });
      }

      // Regular response (still gathering information)
      return res.json({
        message: plannerResponse.message,
        planGenerated: false,
        sessionId: session.id,
        conversationHistory: updatedHistory,
        domain: plannerResponse.domain,
        questionCount: plannerResponse.questionCount
      });

    } catch (error) {
      console.error('[SIMPLE PLAN] Error:', error);
      return res.status(500).json({
        error: 'Failed to process planning conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper function for Quick Plan structured conversation
async function handleQuickPlanConversation(req: any, res: any, message: string, conversationHistory: any[], userId: string) {
  try {
    // Check if this is a new conversation (frontend has no conversation history)
    const isNewConversation = !conversationHistory || conversationHistory.length === 0;
    
    let session;
    let isFirstMessage;
    
    if (isNewConversation) {
      // New conversation - create fresh session and clear old one
      console.log('[QUICK PLAN] NEW conversation detected - creating fresh session');
      
      const existingSession = await storage.getActiveLifestylePlannerSession(userId);
      if (existingSession) {
        console.log('[QUICK PLAN] Completing old session:', existingSession.id, 'with', (existingSession.conversationHistory || []).length, 'messages');
        await storage.updateLifestylePlannerSession(existingSession.id, {
          isComplete: true,
          sessionState: 'completed'
        }, userId);
      }
      
      // Create fresh new session for Quick Plan mode
      session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: 'intake',
        slots: {},
        conversationHistory: [],
        externalContext: {
          currentMode: 'quick',
          questionCount: { smart: 0, quick: 0 }
        }
      });
      
      console.log('[QUICK PLAN] Created fresh session:', session.id);
      isFirstMessage = true;
    } else {
      // Continuing existing conversation - get active session
      console.log('[QUICK PLAN] CONTINUING conversation with', conversationHistory.length, 'messages');
      session = await storage.getActiveLifestylePlannerSession(userId);
      
      // VALIDATION: Prevent continuing completed sessions
      if (session && session.isComplete) {
        console.warn('[QUICK PLAN] Cannot continue completed session:', session.id);
        return res.status(400).json({
          error: 'This conversation has already been completed. Please start a new session.',
          sessionCompleted: true
        });
      }
      
      if (!session) {
        // CRITICAL FIX: If frontend has conversation history but backend has no active session,
        // it means the session was completed. Don't silently create a new one - tell frontend to reset.
        console.warn('[QUICK PLAN] Frontend has history but backend has no active session - session was likely completed');
        return res.status(400).json({
          error: 'This conversation session is no longer available. Please start a new chat.',
          sessionCompleted: true,
          requiresReset: true
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
      .replace(/[!?.,:;]+/g, ' ')
      .replace(/let'?s/g, 'lets')
      .replace(/that'?s/g, 'thats')
      .replace(/it'?s/g, 'its')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check for negations - but exclude positive idioms like "no problem", "no worries"
    const hasNegation = /\b(don'?t|not|stop|wait|hold|never|cancel|abort)\b/i.test(msgNormalized) ||
                       (/\bno\b/.test(msgNormalized) && !/\bno (problem|worries|issues?|concerns?)\b/i.test(msgNormalized));
    
    // Common affirmative patterns (flexible matching)
    const hasAffirmative = /\b(yes|yeah|yep|sure|ok|okay|perfect|great|good|fine|alright|absolutely|definitely|sounds? good|that works|lets do|go ahead|proceed)\b/i.test(msgNormalized);
    
    // Generate/create command patterns
    const hasGenerateCommand = /\b(generate|create|make)\b.*(plan|activity|it)\b/i.test(msgNormalized);
    
    const isGenerateCommand = !hasNegation && (hasAffirmative || hasGenerateCommand);
    
    if (planConfirmed && isGenerateCommand) {
      // User wants to create the activity - extract the generated plan
      const generatedPlan = session.slots?._generatedPlan;
      
      if (generatedPlan) {
        // Create activity from the structured plan
        const activity = await storage.createActivity({
          title: generatedPlan.title || 'Quick Plan Activity',
          description: generatedPlan.summary || 'Generated from Quick Plan conversation',
          category: generatedPlan.category || 'personal',
          status: 'planning',
          userId
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
              userId
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Mark session as completed  
        await storage.updateLifestylePlannerSession(session.id, {
          sessionState: 'completed',
          isComplete: true,
          generatedPlan: { ...generatedPlan, tasks: createdTasks }
        }, userId);

        const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
        
        // Construct full URL for activity link
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const host = req.get('host') || 'journalmate.replit.app';
        const activityUrl = `${protocol}://${host}/activities/${activity.id}`;
        
        return res.json({
          message: `⚡ **Boom!** Activity "${activity.title}" created instantly!\n\n📋 I've created ${createdTasks.length} tasks for you.\n\n→ [View Your Plan](${activityUrl})`,
          activityCreated: true,
          activity,
          planComplete: true,
          createdTasks,
          session: updatedSession
        });
      }
    }

    // Check if we're awaiting plan confirmation (same as Smart Plan)
    const awaitingConfirmation = session.externalContext?.awaitingPlanConfirmation;
    
    if (awaitingConfirmation) {
      // User is responding to "Are you comfortable with this plan?"
      const affirmativePattern = /^(yes|yeah|yep|sure|ok|okay|looks good|perfect|great|sounds good|i'm comfortable|that works|let's do it)/i;
      const negativePattern = /^(no|nope|not really|not quite|i want to|i'd like to|can we|could we|change|add|modify)/i;
      
      if (affirmativePattern.test(message.trim())) {
        // User confirmed - create activity immediately!
        const generatedPlan = session.slots?._generatedPlan;
        
        if (generatedPlan) {
          // Create activity from the structured plan
          const activity = await storage.createActivity({
            title: generatedPlan.title || 'Quick Plan Activity',
            description: generatedPlan.summary || 'Generated from Quick Plan conversation',
            category: generatedPlan.category || 'personal',
            status: 'planning',
            userId
          });

          // Create tasks and link them to the activity
          const createdTasks = [];
          if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
            for (let i = 0; i < generatedPlan.tasks.length; i++) {
              const taskData = generatedPlan.tasks[i];
              const task = await storage.createTask({
                title: taskData.title,
                description: taskData.description,
                category: taskData.category || generatedPlan.domain || generatedPlan.category || 'personal',
                priority: taskData.priority,
                timeEstimate: taskData.timeEstimate,
                userId
              });
              await storage.addTaskToActivity(activity.id, task.id, i);
              createdTasks.push(task);
            }
          }

          // Mark session as completed  
          await storage.updateLifestylePlannerSession(session.id, {
            sessionState: 'completed',
            isComplete: true,
            generatedPlan: { ...generatedPlan, tasks: createdTasks }
          }, userId);

          const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
          
          return res.json({
            message: `⚡ **Boom!** Activity "${activity.title}" created instantly!\n\n📋 **Find it on:**\n• **Home screen** - Your recent activities\n• **Activities pane** - Full details\n• **Tasks section** - ${createdTasks.length} tasks ready to go\n\nLet's make it happen! 🚀`,
            activityCreated: true,
            activity,
            planComplete: true,
            createdTasks,
            session: updatedSession
          });
        }
        
        // Fallback if no plan data
        return res.json({
          message: "⚠️ Sorry, I couldn't find the plan data. Let's start over!",
          sessionId: session.id,
          session
        });
      } else if (negativePattern.test(message.trim()) || message.toLowerCase().includes('change') || message.toLowerCase().includes('add')) {
        // User wants to make changes - continue gathering info
        const updatedContext = {
          ...session.externalContext,
          awaitingPlanConfirmation: false,
          planConfirmed: false
        };
        
        await storage.updateLifestylePlannerSession(session.id, {
          externalContext: updatedContext
        }, userId);

        // Process their change request with LangGraph (same as Smart Plan)
        const langGraphResponse = await langGraphPlanningAgent.processMessage(
          parseInt(userId),
          message,
          userProfile,
          session.conversationHistory,
          storage,
          'quick'
        );

        // Update conversation history
        const updatedHistory = [
          ...session.conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: langGraphResponse.message }
        ];

        await storage.updateLifestylePlannerSession(session.id, {
          conversationHistory: updatedHistory,
          slots: {
            ...session.slots,
            _generatedPlan: langGraphResponse.finalPlan || session.slots?._generatedPlan
          }
        }, userId);

        return res.json({
          message: langGraphResponse.message,
          sessionId: session.id,
          planReady: langGraphResponse.readyToGenerate || false,
          session
        });
      }
      // If unclear response, treat as wanting to make changes/continue conversation
    }

    // Check for help intent - same as Smart Plan
    const helpIntentPattern = /what.*do(es)?.*it.*do|how.*work|difference.*(quick|smart)|what.*is.*smart.*plan|what.*is.*quick.*plan|explain.*mode|help.*understand/i;
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
        session
      });
    }

    // Check if user is confirming to create the plan
    const confirmationKeywords = ['yes', 'create the plan', 'sounds good', 'perfect', 'great', 'that works', 'confirm', 'proceed'];
    const userWantsToCreatePlan = confirmationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    // If user is ready to create plan and confirms
    if (userWantsToCreatePlan && session.sessionState === 'confirming') {
      // Create a basic plan structure for Quick Plan
      const planData = {
        title: `Quick Plan: ${session.slots?.activityType || 'Activity'}`,
        summary: `Fast plan generated from Quick Plan mode`,
        category: 'personal',
        tasks: [
          {
            title: `Start ${session.slots?.activityType || 'activity'}`,
            description: 'Quick action to get started',
            category: 'action',
            priority: 'high',
            timeEstimate: '15 min'
          },
          {
            title: `Complete ${session.slots?.activityType || 'activity'}`,
            description: 'Follow through and finish',
            category: 'completion',
            priority: 'high', 
            timeEstimate: '30-60 min'
          }
        ]
      };

      // Create activity from the structured plan
      const activity = await storage.createActivity({
        title: planData.title,
        description: planData.summary,
        category: planData.category,
        status: 'planning',
        userId
      });

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < planData.tasks.length; i++) {
        const taskData = planData.tasks[i];
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority as 'low' | 'medium' | 'high',
          timeEstimate: taskData.timeEstimate,
          userId
        });
        await storage.addTaskToActivity(activity.id, task.id, i);
        createdTasks.push(task);
      }

      // Mark session as completed
      await storage.updateLifestylePlannerSession(session.id, {
        sessionState: 'completed',
        isComplete: true,
        generatedPlan: { ...planData, tasks: createdTasks }
      }, userId);

      // Get updated session for consistent response shape
      const updatedSession = await storage.getLifestylePlannerSession(session.id, userId);
      
      return res.json({
        message: `⚡ **Quick Plan Created!** Activity "${activity.title}" is ready!\n\n📋 **Find it in:**\n• **Home screen** - Your recent activities\n• **Activities section** - Full details and tasks\n\nAll set for immediate action! 🚀`,
        activityCreated: true,
        activity,
        planComplete: true,
        createdTasks,
        session: updatedSession
      });
    }

    // Detect "show overview" type requests when plan is already ready
    const quickAwaitingConfirmationPre = session.externalContext?.awaitingPlanConfirmation;
    const showOverviewKeywords = ['show.*overview', 'see.*overview', 'display.*plan', 'view.*plan', 'show.*plan', 'what.*plan', 'plan details'];
    const isShowOverviewRequest = quickAwaitingConfirmationPre && showOverviewKeywords.some(pattern => new RegExp(pattern, 'i').test(message));
    
    let response;
    
    if (isShowOverviewRequest && session.slots?._generatedPlan) {
      // User wants to see the overview - return existing plan WITHOUT re-processing
      console.log('[QUICK PLAN] Show overview request detected - returning existing plan without state reset');
      
      const existingPlan = session.slots._generatedPlan;
      
      // Format the plan overview message (extract from existing plan data)
      const overviewMessage = existingPlan.message || `Here's your ${existingPlan.title || 'plan'}`;
      
      response = {
        message: overviewMessage,
        readyToGenerate: true, // KEEP state as ready
        planReady: true,
        updatedSlots: session.slots,
        updatedConversationHistory: [
          ...session.conversationHistory, 
          { role: 'user', content: message }, 
          { role: 'assistant', content: overviewMessage }
        ],
        updatedExternalContext: {
          ...session.externalContext,
          awaitingPlanConfirmation: true // MAINTAIN confirmation state
        },
        sessionState: 'confirming' as const, // KEEP in confirming state
        generatedPlan: existingPlan,
        createActivity: false,
        progress: 100,
        phase: 'confirming',
        domain: existingPlan.domain || 'general',
        skipConfirmationAppend: true // Don't append redundant confirmation prompt
      };
    } else {
      // Normal flow - process with LangGraph planning agent
      const langGraphResponse = await langGraphPlanningAgent.processMessage(
        parseInt(userId),
        message,
        userProfile,
        session.conversationHistory,
        storage,
        'quick' // Quick mode for faster planning
      );

      // Map LangGraph response to ConversationResponse format
      response = {
        message: langGraphResponse.message,
        readyToGenerate: langGraphResponse.readyToGenerate || false,
        planReady: langGraphResponse.readyToGenerate || false,
        updatedSlots: session.slots,
        updatedConversationHistory: [...session.conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: langGraphResponse.message }],
        updatedExternalContext: session.externalContext,
        sessionState: langGraphResponse.phase as 'gathering' | 'processing' | 'confirming' | 'completed',
        generatedPlan: langGraphResponse.finalPlan,
        createActivity: false,
        progress: langGraphResponse.progress,
        phase: langGraphResponse.phase,
        domain: langGraphResponse.domain
      };
    }

    // SERVER-SIDE ACTIVITY TYPE DETECTION OVERRIDE (same as Smart Plan)
    const interviewKeywords = ['interview', 'job interview', 'interview prep', 'prepare for.*interview', 'interviewing'];
    const learningKeywords = ['study', 'learn', 'course', 'education', 'prep for exam', 'test prep'];
    const workoutKeywords = ['workout', 'exercise', 'gym', 'fitness', 'training session'];
    const wellnessKeywords = ['meditation', 'yoga', 'mindfulness', 'breathing exercise'];

    const messageLower = message.toLowerCase();
    const hasInterviewKeyword = interviewKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasLearningKeyword = learningKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasWorkoutKeyword = workoutKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));
    const hasWellnessKeyword = wellnessKeywords.some(kw => new RegExp(kw, 'i').test(messageLower));

    const goalPhraseMatch = messageLower.match(/(?:the )?goal (?:is|was) to (?:pass|prepare for|get ready for|ace|nail|do well in|succeed in).*?(?:interview|study|learn|workout|meditate)/i);

    if (response.updatedSlots) {
      const currentActivityType = response.updatedSlots.activityType?.toLowerCase() || '';

      if (hasInterviewKeyword || (goalPhraseMatch && goalPhraseMatch[0].includes('interview'))) {
        if (currentActivityType !== 'interview_prep' && currentActivityType !== 'interview') {
          console.log(`[QUICK PLAN OVERRIDE] Detected interview keywords. Overriding to "interview_prep".`);
          response.updatedSlots.activityType = 'interview_prep';
        }
      } else if (hasLearningKeyword && currentActivityType !== 'learning') {
        console.log(`[QUICK PLAN OVERRIDE] Detected learning keywords. Overriding to "learning".`);
        response.updatedSlots.activityType = 'learning';
      } else if (hasWorkoutKeyword && currentActivityType !== 'workout') {
        console.log(`[QUICK PLAN OVERRIDE] Detected workout keywords. Overriding to "workout".`);
        response.updatedSlots.activityType = 'workout';
      } else if (hasWellnessKeyword && currentActivityType !== 'wellness') {
        console.log(`[QUICK PLAN OVERRIDE] Detected wellness keywords. Overriding to "wellness".`);
        response.updatedSlots.activityType = 'wellness';
      }
    }

    // Backend guardrail: NEVER generate plan on first interaction
    if (isFirstMessage && (response.readyToGenerate || response.planReady)) {
      console.warn('Attempted to generate plan on first message - blocking and forcing question');
      response.readyToGenerate = false;
      response.planReady = false;
    }

    // Check if plan is ready for confirmation
    const quickPlanConfirmed = session.externalContext?.planConfirmed;
    const quickAwaitingConfirmation = session.externalContext?.awaitingPlanConfirmation;
    const isFirstPlanReady = (response.readyToGenerate || response.planReady) && !quickAwaitingConfirmation;

    // Persist updated session data from agent (includes full conversation history and generated plan)
    await storage.updateLifestylePlannerSession(session.id, {
      conversationHistory: response.updatedConversationHistory || session.conversationHistory,
      slots: {
        ...(response.updatedSlots || session.slots),
        _generatedPlan: response.generatedPlan || session.slots?._generatedPlan
      },
      externalContext: {
        ...(response.updatedExternalContext || session.externalContext),
        isFirstInteraction: false,
        // Set confirmation flags if plan is ready for first time
        ...(isFirstPlanReady ? { awaitingPlanConfirmation: true, planConfirmed: false } : {})
      },
      sessionState: isFirstPlanReady ? 'confirming' : response.sessionState
    }, userId);

    // Handle plan confirmation flow
    if (response.readyToGenerate || response.planReady) {
      if (quickPlanConfirmed) {
        // Plan already confirmed - show Generate Plan button immediately
        return res.json({
          message: response.message,
          planReady: true,
          sessionId: session.id,
          showCreatePlanButton: true,
          session
        });
      } else if (!quickAwaitingConfirmation) {
        // Check if AI already asked for confirmation (case-insensitive, flexible matching)
        const messageLower = response.message.toLowerCase();
        const alreadyAskedConfirmation = messageLower.includes("are you comfortable") || 
                                         messageLower.includes("does this work") ||
                                         messageLower.includes("is this okay") ||
                                         messageLower.includes("sound good") ||
                                         /ready to (proceed|generate|create)/.test(messageLower);
        
        // Skip confirmation append if this is a "show overview" replay
        const shouldSkipAppend = (response as any).skipConfirmationAppend === true;
        
        // First time plan is ready - ask for confirmation (only if AI didn't already ask and not a replay)
        return res.json({
          message: (alreadyAskedConfirmation || shouldSkipAppend)
            ? response.message 
            : response.message + "\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)",
          planReady: false, // Don't show button yet
          sessionId: session.id,
          showCreatePlanButton: false, // Don't show button until confirmed
          session
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
      createdActivity: response.createdActivity ? { id: response.createdActivity.id, title: response.createdActivity.title } : undefined,
      progress: response.progress || 0,
      phase: response.phase || 'gathering',
      domain: response.domain || 'general',
      session
    });

  } catch (error) {
    console.error('Quick Plan conversation error:', error);
    return res.status(500).json({ 
      error: 'Failed to process Quick Plan conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

  // STREAMING endpoint for real-time progress updates
  app.post("/api/chat/conversation/stream", async (req, res) => {
    try {
      const { message, conversationHistory = [], mode } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      const userId = (req.user as any)?.id || DEMO_USER_ID;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        // Send initial progress
        sendEvent('progress', { phase: 'starting', message: 'Analyzing your request...' });

        if (mode === 'smart' || mode === 'quick') {
          // Stream tokens as they arrive
          const response = await simplePlanner.processMessageStream(
            userId,
            message,
            conversationHistory,
            storage,
            mode === 'smart' ? 'smart' : 'quick',
            (token) => {
              // Stream each token to client
              sendEvent('token', { token });
            },
            (phase, msg) => {
              // Stream progress updates during research
              sendEvent('progress', { phase, message: msg });
            }
          );

          // Check if user confirmed the plan (same logic as non-streaming)
          const confirmationKeywords = ['yes', 'create the plan', 'sounds good', 'perfect', 'great', 'that works', 'confirm', 'proceed', 'go ahead', 'yes go ahead'];
          const userConfirmed = confirmationKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
          );

          let activityData: any = null;

          // If plan is ready and user confirmed, create activity/tasks
          if (response.readyToGenerate && response.plan && userConfirmed) {
            try {
              sendEvent('progress', { phase: 'creating', message: 'Creating your activity and tasks...' });

              // Check plan usage limits
              const usageCheck = await checkAndIncrementPlanUsage(userId);
              if (!usageCheck.allowed) {
                sendEvent('complete', {
                  message: `⚠️ **Plan Limit Reached**\n\nYou've used all ${usageCheck.planLimit} AI plans for this month on the free tier.\n\n**Upgrade to Pro ($6.99/month) for:**\n✅ **Unlimited AI plans**\n✅ Advanced favorites organization\n✅ Journal insights & analytics\n✅ Export all your data\n\nWould you like to upgrade now?`,
                  planLimitReached: true,
                  planCount: usageCheck.planCount,
                  planLimit: usageCheck.planLimit
                });
                res.end();
                return;
              }

              // Create activity from the structured plan
              const activity = await storage.createActivity({
                title: response.plan.title || `${mode === 'quick' ? 'Quick' : 'Smart'} Plan Activity`,
                description: response.plan.summary || 'Generated plan',
                category: response.plan.category || 'personal',
                status: 'planning',
                userId
              });

              // Create tasks and link them to the activity
              const createdTasks = [];
              if (response.plan.tasks && Array.isArray(response.plan.tasks)) {
                for (let i = 0; i < response.plan.tasks.length; i++) {
                  const taskData = response.plan.tasks[i];
                  const task = await storage.createTask({
                    title: taskData.title,
                    description: taskData.description,
                    category: taskData.category,
                    priority: taskData.priority,
                    timeEstimate: taskData.timeEstimate,
                    userId
                  });
                  await storage.addTaskToActivity(activity.id, task.id, i);
                  createdTasks.push(task);
                }
              }

              activityData = {
                activityCreated: true,
                activity: {
                  id: activity.id,
                  title: activity.title
                },
                createdTasks
              };

              console.log(`[STREAM] Activity created: ${activity.id} with ${createdTasks.length} tasks`);
            } catch (error) {
              console.error('[STREAM] Error creating activity:', error);
            }
          }

          // Send final complete message with structured data
          sendEvent('complete', {
            message: response.message,
            extractedInfo: response.extractedInfo,
            readyToGenerate: response.readyToGenerate,
            plan: response.plan,
            domain: response.domain,
            contextChips: response.contextChips,
            ...activityData // Include activity data if created
          });
          res.end();
        } else {
          sendEvent('error', { message: 'Invalid mode' });
          res.end();
        }
      } catch (error) {
        sendEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
        res.end();
      }
    } catch (error) {
      res.status(500).json({ error: 'Streaming failed' });
    }
  });

  // Real-time chat conversation endpoint with task creation
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const { message, conversationHistory = [], mode } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      // Get user ID (demo for now, will use real auth later)
      const userId = (req.user as any)?.id || DEMO_USER_ID;

      // Handle Smart Plan mode with simple planner
      if (mode === 'smart') {
        return await handleSimplePlanConversation(req, res, message, conversationHistory, userId, 'smart');
      }

      // Handle Quick Plan mode with simple planner
      if (mode === 'quick') {
        return await handleSimplePlanConversation(req, res, message, conversationHistory, userId, 'quick');
      }

      // Create a conversation with the AI
      const aiResponse = await aiService.chatConversation(message, conversationHistory);
      
      // Check if the message contains goals that we should turn into actionable tasks
      const containsGoals = aiService.detectGoalsInMessage(message);
      
      let createdTasks = [];
      let createdGoal = null;
      let taskCreationMessage = '';

      if (containsGoals) {
        try {
          // Process the message as a goal and create actual tasks
          const goalResult = await aiService.processGoalIntoTasks(message, 'openai', userId);
          
          // Create a goal record for this chat-based goal
          createdGoal = await storage.createGoal({
            userId: userId,
            title: message.substring(0, 100), // Truncate if too long
            description: `Chat-generated goal: ${message}`,
            category: goalResult.goalCategory,
            priority: goalResult.goalPriority
          });

          // Create the tasks in the database
          createdTasks = await Promise.all(
            goalResult.tasks.map(task => 
              storage.createTask({
                ...task,
                userId: userId,
                goalId: createdGoal.id
              })
            )
          );

          taskCreationMessage = `\n\n✅ **Great news!** I've created ${createdTasks.length} actionable tasks from our conversation:

${createdTasks.map((task, idx) => `${idx + 1}. **${task.title}** (${task.category} - ${task.priority} priority)`).join('\n')}

You can find these tasks in your task list and start working on them right away!`;

        } catch (error) {
          console.error('Failed to create tasks from chat:', error);
          taskCreationMessage = '\n\n💡 I detected some goals in your message, but had trouble creating tasks automatically. You can always use the main input to create structured action plans!';
        }
      }
      
      res.json({
        message: aiResponse.message + taskCreationMessage,
        actionPlan: aiResponse.actionPlan,
        extractedGoals: aiResponse.extractedGoals,
        tasks: aiResponse.tasks,
        createdTasks: createdTasks,
        createdGoal: createdGoal,
        tasksGenerated: createdTasks.length > 0
      });
    } catch (error) {
      console.error('Chat conversation error:', error);
      res.status(500).json({ 
        error: 'Failed to process chat message',
        message: 'Sorry, I encountered an issue processing your message. Please try again.'
      });
    }
  });

  // Get pending reminders
  app.get("/api/notifications/reminders/pending", async (req, res) => {
    try {
      const pendingReminders = await storage.getPendingReminders();
      res.json(pendingReminders);
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
      res.status(500).json({ error: 'Failed to fetch pending reminders' });
    }
  });

  // Mark reminder as sent
  app.patch("/api/notifications/reminders/:id/sent", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markReminderSent(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      res.status(500).json({ error: 'Failed to mark reminder as sent' });
    }
  });

  // Get user preferences (with automatic journal data normalization)
  app.get("/api/user-preferences", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log('[PREFERENCES] Fetching preferences for user:', userId);
      
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences || !preferences.preferences) {
        console.log('[PREFERENCES] No preferences found, returning empty');
        return res.json({ preferences: {} });
      }

      let responsePrefs = { ...preferences.preferences };
      
      // Normalize journal data if it exists
      if (responsePrefs.journalData) {
        const { normalizeJournalData } = await import('./config/journalTags.js');
        const { normalized, hasChanges } = normalizeJournalData(responsePrefs.journalData);
        
        if (hasChanges) {
          console.log('[PREFERENCES] Migrating legacy journal category names to slug IDs');
          // Persist normalized data back to storage
          await storage.upsertUserPreferences(userId, {
            preferences: {
              ...responsePrefs,
              journalData: normalized
            }
          });
        }
        
        responsePrefs.journalData = normalized;
      }
      
      console.log('[PREFERENCES] Returning normalized preferences');
      res.json({ preferences: responsePrefs });
    } catch (error) {
      console.error('[PREFERENCES] Error fetching user preferences:', error);
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  });

  // User Profile Management
  app.get("/api/user/profile", async (req: any, res) => {
    try {
      // Get authenticated user ID using the helper function
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log('Fetching profile for user:', userId);
      
      // Try to get existing profile
      let profile = await storage.getUserProfile(userId);
      console.log('Existing profile:', profile);
      
      // If no profile exists for authenticated user, create one from user data
      if (!profile && userId !== DEMO_USER_ID) {
        const user = await storage.getUser(userId);
        console.log('User data for profile creation:', user);
        if (user) {
          profile = await storage.upsertUserProfile(userId, {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            profileImageUrl: user.profileImageUrl || undefined
          });
          console.log('Created new profile:', profile);
        }
      }
      
      // Also fetch user preferences for journal data
      const preferences = await storage.getUserPreferences(userId);
      
      console.log('Returning profile with preferences:', { profile, preferences });
      res.json({ ...profile, preferences: preferences?.preferences });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.put("/api/user/profile", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const profileData = insertUserProfileSchema.parse(req.body);
      const profile = await storage.upsertUserProfile(userId, profileData);
      res.json(profile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Upload profile image
  app.put("/api/user/profile/image", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: 'Invalid image data' });
      }

      // Validate it's a data URL
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      // Update profile with the new image
      const profile = await storage.upsertUserProfile(userId, {
        profileImageUrl: imageData
      });

      res.json({ success: true, profileImageUrl: imageData });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ error: 'Failed to upload profile image' });
    }
  });

  // Personal Journal - Save journal entry
  app.put("/api/user/journal", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, items } = req.body;
      
      if (!category || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Category and items array required' });
      }

      // Get existing preferences
      let prefs = await storage.getUserPreferences(userId);
      
      // Initialize journal data if it doesn't exist
      const currentPrefs = prefs?.preferences || {};
      const journalData = currentPrefs.journalData || {};
      
      // Enrich journal entries with AI insights (async, in parallel)
      console.log(`[JOURNAL SAVE] Enriching ${items.length} entries for category: ${category}`);
      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          // Only enrich items with text content
          if (!item.text || typeof item.text !== 'string' || item.text.trim().length < 10) {
            return item; // Skip enrichment for empty or very short entries
          }
          
          try {
            // Check if already enriched (has keywords and aiConfidence)
            if (item.keywords && item.aiConfidence !== undefined) {
              console.log(`[JOURNAL SAVE] Entry already enriched, skipping`);
              return item;
            }
            
            const enrichedData = await enrichJournalEntry(item.text, category, item.keywords);
            
            return {
              ...item,
              keywords: enrichedData.keywords,
              extractedData: enrichedData.extractedData,
              aiConfidence: enrichedData.aiConfidence,
              suggestions: enrichedData.suggestions
            };
          } catch (enrichError) {
            console.error('[JOURNAL SAVE] Enrichment failed for item, saving without enrichment:', enrichError);
            return item; // Save the original item if enrichment fails
          }
        })
      );
      
      // Update the specific category with enriched items
      journalData[category] = enrichedItems;
      
      // Save back to preferences
      const updatedPrefs = await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalData
        }
      });
      
      // Invalidate user context cache to refresh personalization
      aiService.invalidateUserContext(userId);
      console.log(`[JOURNAL SAVE] Cache invalidated for user ${userId}`);

      res.json({ success: true, journalData });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      res.status(500).json({ error: 'Failed to save journal entry' });
    }
  });

  // Personal Journal - Save custom categories
  app.put("/api/user/journal/custom-categories", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { customJournalCategories } = req.body;
      
      if (!Array.isArray(customJournalCategories)) {
        return res.status(400).json({ error: 'customJournalCategories array required' });
      }

      // Get existing preferences
      let prefs = await storage.getUserPreferences(userId);
      
      // Update custom categories
      const currentPrefs = prefs?.preferences || {};
      const updatedPrefs = await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          customJournalCategories
        }
      });

      res.json({ success: true, customJournalCategories });
    } catch (error) {
      console.error('Error saving custom categories:', error);
      res.status(500).json({ error: 'Failed to save custom categories' });
    }
  });

  // Upload media for journal entries
  app.post("/api/journal/upload", upload.array('media', 5), async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // SECURITY: Block demo users from uploading media
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error: 'Demo users cannot upload media. Please sign in to continue.',
          requiresAuth: true
        });
      }
      
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const mediaUrls = files.map(file => ({
        url: `/attached_assets/journal_media/${file.filename}`,
        type: file.mimetype.startsWith('video/') ? 'video' as const : 'image' as const,
        filename: file.filename
      }));

      res.json({ success: true, media: mediaUrls });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });

  // AI-powered journal entry creation with keyword detection
  app.post("/api/journal/smart-entry", async (req: any, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // SECURITY: Block demo users from creating smart journal entries
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error: 'Demo users cannot create journal entries. Please sign in to start journaling.',
          requiresAuth: true
        });
      }
      
      const { text, media, keywords, activityId, linkedActivityTitle, mood } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text content required' });
      }

      // Import tag detection utilities
      const { detectCategoriesFromTags, normalizeCategoryName } = await import('./config/journalTags.js');
      
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
        detectedCategories = ['notes'];
        aiConfidence = 0.6; // Medium confidence for unrecognized tags
        console.log(`Unrecognized tags ${tagDetection.detectedTags.join(', ')} routed to notes category`);
      } else {
        // No tags found at all, use AI to detect category
        const baseCategories = [
          'Restaurants & Food',
          'Movies & TV Shows',
          'Music & Artists',
          'Travel & Places',
          'Books & Reading',
          'Hobbies & Interests',
          'Personal Style',
          'Favorite Things',
          'Personal Notes'
        ];

        try {
          // Call OpenAI directly for category detection with JSON response
          const { openai } = await import('./services/aiService.js');
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a journal categorizer. Analyze the user's journal entry and suggest the best category. You can use one of these base categories: ${baseCategories.join(', ')}. Or create a NEW category if the content doesn't fit any base category well. 
                
Examples of new categories you might create:
- "Fitness & Workouts" for gym/exercise content
- "Cooking & Recipes" for food preparation
- "Photography" for photo-related content
- "Gaming" for video game content
- "Pets & Animals" for pet-related content
- "Career & Work" for professional content
- "Language Learning" for language study
- Any other category that fits the content

Respond with JSON: { "category": "Category Name", "confidence": 0.0-1.0, "keywords": ["detected", "keywords"] }`
              },
              {
                role: 'user',
                content: text
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
          });

          const categoryData = JSON.parse(response.choices[0]?.message?.content || '{}');
          detectedCategories = [categoryData.category || 'notes'];
          detectedKeywords = categoryData.keywords || [];
          aiConfidence = categoryData.confidence || 0.7;
        } catch (aiError) {
          console.error('AI category detection failed:', aiError);
          // Fall back to simple text analysis if AI fails
          detectedCategories = ['notes'];
          aiConfidence = 0.3;
        }
      }

      // Normalize all category names to IDs (convert "Personal Notes" -> "notes", etc.)
      const normalizedCategories = detectedCategories.map(cat => normalizeCategoryName(cat));

      // Enrich entry with AI insights before saving
      let enrichedData: any = {};
      if (text && text.trim().length >= 10) {
        try {
          const primaryCategory = normalizedCategories[0] || 'notes';
          enrichedData = await enrichJournalEntry(text, primaryCategory, detectedKeywords);
          console.log(`[SMART ENTRY] Enriched with ${enrichedData.keywords.length} keywords, confidence: ${enrichedData.aiConfidence}`);
        } catch (enrichError) {
          console.error('[SMART ENTRY] Enrichment failed, continuing without enrichment:', enrichError);
        }
      }

      // Add journal entries for each detected category (grouped experiences create multiple entries)
      for (const category of normalizedCategories) {
        await storage.addPersonalJournalEntry(userId, category, {
          text,
          media,
          keywords: enrichedData.keywords || (detectedKeywords.length > 0 ? detectedKeywords : keywords),
          aiConfidence: enrichedData.aiConfidence || aiConfidence,
          activityId,
          linkedActivityTitle,
          mood,
          // Add enriched data
          ...(enrichedData.extractedData ? { extractedData: enrichedData.extractedData } : {}),
          ...(enrichedData.suggestions ? { suggestions: enrichedData.suggestions } : {})
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
        isGroupedExperience
      });
    } catch (error) {
      console.error('Smart entry error:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
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
          error: 'Demo users cannot update journal entries. Please sign in to continue.',
          requiresAuth: true
        });
      }
      
      const { activityId, linkedActivityTitle } = req.body;
      
      // Get current preferences
      const prefs = await storage.getPersonalJournalEntries(userId);
      if (!prefs || !prefs.preferences?.journalData) {
        return res.status(404).json({ error: 'No journal entries found' });
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
              linkedActivityTitle
            };
            
            // Save back to storage
            await storage.savePersonalJournalEntry(userId, category, entries[entryIndex]);
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      res.json({ success: true, message: 'Journal entry updated successfully' });
    } catch (error) {
      console.error('[JOURNAL] Update entry error:', error);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  // Create demo journal data (for testing enrichment)
  app.post("/api/journal/demo-data", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      
      console.log('[JOURNAL DEMO] Creating demo data for user:', userId);

      // Rich demo entries across all categories
      const demoEntries = {
        restaurants: [
          {
            id: `demo-${Date.now()}-1`,
            text: "Had an amazing dinner at Nobu Malibu tonight. The sunset views over the Pacific were breathtaking! We started with their signature black cod miso - absolutely melts in your mouth. The yellowtail jalapeño was perfectly balanced, and the rock shrimp tempura was crispy perfection. Total splurge at $$$$ but worth it for a special celebration. The ambiance was elegant yet relaxed, perfect for our anniversary.",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            mood: 'great' as const
          },
          {
            id: `demo-${Date.now()}-2`,
            text: "Quick lunch at Sweetgreen near the office. Got the harvest bowl with chicken - fresh, healthy, and under $15. Love how fast and convenient it is. Perfect for those busy workdays when you want something nutritious without the wait.",
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
            mood: 'good' as const
          }
        ],
        travel: [
          {
            id: `demo-${Date.now()}-3`,
            text: "Just got back from an incredible week in Tokyo! Stayed at a boutique hotel in Shibuya - loved the blend of modern design and traditional Japanese touches. Highlights: exploring Senso-ji Temple in Asakusa, getting lost in the backstreets of Shimokitazawa, and the mind-blowing sushi at Sukiyabashi Jiro (bucket list achieved!). Used the subway everywhere - so efficient. Already planning my next trip back to explore Kyoto and Osaka. This was the perfect mix of cultural immersion and urban adventure.",
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
            mood: 'great' as const
          }
        ],
        books: [
          {
            id: `demo-${Date.now()}-4`,
            text: "Finally finished 'Project Hail Mary' by Andy Weir. What a ride! The hard sci-fi mixed with humor reminded me why I love this genre. The friendship between Ryland and Rocky was unexpectedly touching. Perfect for my late-night reading sessions - couldn't put it down. 5/5 stars, would recommend to any sci-fi fan.",
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
            mood: 'great' as const
          }
        ],
        movies: [
          {
            id: `demo-${Date.now()}-5`,
            text: "Movie night with friends - we watched Everything Everywhere All at Once. Absolutely blown away by the creativity and emotional depth. Michelle Yeoh was phenomenal. The multiverse concept was executed perfectly, balancing comedy, action, and heartfelt family drama. We stayed up until 2am discussing the themes. Definitely one of the best films I've seen this year.",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            mood: 'great' as const
          }
        ],
        shopping: [
          {
            id: `demo-${Date.now()}-6`,
            text: "Treated myself to a new pair of Allbirds wool runners. I've been wanting minimalist, sustainable sneakers for a while. They're incredibly comfortable and go with everything in my wardrobe. Love the eco-friendly materials - feels good to support brands with values. Perfect for my casual, everyday style.",
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
            mood: 'good' as const
          }
        ],
        notes: [
          {
            id: `demo-${Date.now()}-7`,
            text: "Reflecting on my goals for Q2. Want to focus more on health (commit to 3x week workouts), deepen relationships (plan monthly friend dinners), and make progress on learning Spanish. Feeling motivated but also need to be realistic about time. Work-life balance is the key.",
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            mood: 'good' as const
          }
        ],
        'self-care': [
          {
            id: `demo-${Date.now()}-8`,
            text: "Started my Sunday with a 60-minute hot yoga class at CorePower. Felt amazing to stretch out all the tension from this week. Followed it up with a matcha latte and a face mask at home. Taking time for myself really resets my energy. Made me realize I need to prioritize these self-care rituals more often.",
            timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
            mood: 'great' as const
          }
        ],
        work: [
          {
            id: `demo-${Date.now()}-9`,
            text: "Wrapped up the Q1 product launch presentation today. Spent weeks preparing the pitch deck, analyzing user data, and coordinating with engineering and design teams. The stakeholder meeting went really well - they loved the roadmap. Proud of how the team collaborated. Skills leveled up: public speaking, data visualization, cross-functional leadership.",
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
            mood: 'great' as const
          }
        ],
        activities: [
          {
            id: `demo-${Date.now()}-10`,
            text: "Went on a challenging 10-mile hike up Runyon Canyon with my partner this morning. The views of LA from the top were worth every step! We brought snacks and just enjoyed the outdoors for 3 hours. Perfect moderate difficulty level - got our hearts pumping but still had energy to grab brunch after. Love these weekend adventures together.",
            timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago
            mood: 'great' as const
          },
          {
            id: `demo-${Date.now()}-11`,
            text: "Game night with the crew! Hosted at my place - we played Codenames and Catan until midnight. Everyone brought snacks and drinks. Such a fun, low-key way to spend Friday evening. Easy activity that brings people together. Already looking forward to next month's game night.",
            timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
            mood: 'great' as const
          }
        ]
      };

      // Enrich each entry and save
      for (const [category, entries] of Object.entries(demoEntries)) {
        console.log(`[JOURNAL DEMO] Processing ${entries.length} entries for category: ${category}`);
        
        for (const entry of entries) {
          try {
            // Enrich the entry with AI
            const enrichedData = await journalEnrichmentService.enrichJournalEntry(
              entry.text,
              category
            );

            console.log(`[JOURNAL DEMO] Enriched entry for ${category}:`, {
              keywords: enrichedData.keywords,
              confidence: enrichedData.aiConfidence
            });

            // Save the enriched entry
            await storage.savePersonalJournalEntry(userId, category, {
              ...entry,
              keywords: enrichedData.keywords,
              aiConfidence: enrichedData.aiConfidence,
              extractedData: enrichedData.extractedData,
              suggestions: enrichedData.suggestions
            });
          } catch (error) {
            console.error(`[JOURNAL DEMO] Failed to enrich entry for ${category}:`, error);
            // Save without enrichment if AI fails
            await storage.savePersonalJournalEntry(userId, category, entry);
          }
        }
      }

      // Invalidate cache to regenerate user context with new demo data
      aiService.invalidateUserContext(userId);
      console.log('[JOURNAL DEMO] Cache invalidated, demo data created successfully');

      res.json({
        success: true,
        message: 'Demo journal data created with AI enrichment',
        entriesCreated: Object.values(demoEntries).reduce((sum, arr) => sum + arr.length, 0),
        categories: Object.keys(demoEntries)
      });
    } catch (error) {
      console.error('[JOURNAL DEMO] Error creating demo data:', error);
      res.status(500).json({ error: 'Failed to create demo data' });
    }
  });

  // ===== EXPORT ENDPOINTS (PRO FEATURE) =====

  // CSV Export (Pro tier required)
  app.post("/api/export/csv", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { dataTypes, startDate, endDate } = req.body;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: tierCheck.message,
          requiredTier: 'pro',
          currentTier: tierCheck.tier
        });
      }

      if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: 'dataTypes array required' });
      }

      const csvRows: string[] = [];

      // Export Journal Entries
      if (dataTypes.includes('journal')) {
        const prefs = await storage.getPersonalJournalEntries(userId);
        if (prefs?.preferences?.journalData) {
          csvRows.push('Type,Category,Text,Keywords,Timestamp,Activity ID,Activity Title,Mood');

          const journalData = prefs.preferences.journalData;
          for (const [category, entries] of Object.entries(journalData)) {
            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                const timestamp = entry.timestamp || '';
                const text = (entry.text || '').replace(/"/g, '""');
                const keywords = Array.isArray(entry.keywords) ? entry.keywords.join('; ') : '';
                const activityId = entry.activityId || '';
                const activityTitle = entry.linkedActivityTitle || '';
                const mood = entry.mood || '';

                // Filter by date range if specified
                if (startDate || endDate) {
                  const entryDate = new Date(timestamp);
                  if (startDate && entryDate < new Date(startDate)) return;
                  if (endDate && entryDate > new Date(endDate)) return;
                }

                csvRows.push(`"Journal","${category}","${text}","${keywords}","${timestamp}","${activityId}","${activityTitle}","${mood}"`);
              });
            }
          }
        }
      }

      // Export Activities
      if (dataTypes.includes('activities')) {
        const activities = await storage.getUserActivities(userId);

        if (csvRows.length === 0) {
          csvRows.push('Type,Title,Description,Category,Created At,Completed,Total Tasks,Completed Tasks');
        }

        activities.forEach((activity: any) => {
          const createdAt = activity.createdAt || '';

          // Filter by date range
          if (startDate || endDate) {
            const activityDate = new Date(createdAt);
            if (startDate && activityDate < new Date(startDate)) return;
            if (endDate && activityDate > new Date(endDate)) return;
          }

          const title = (activity.title || '').replace(/"/g, '""');
          const description = (activity.description || '').replace(/"/g, '""');
          const category = activity.category || '';
          const completed = activity.completed ? 'Yes' : 'No';
          const totalTasks = activity.totalTasks || 0;
          const completedTasks = activity.completedTasks || 0;

          csvRows.push(`"Activity","${title}","${description}","${category}","${createdAt}","${completed}","${totalTasks}","${completedTasks}"`);
        });
      }

      // Export Tasks
      if (dataTypes.includes('tasks')) {
        const tasks = await storage.getUserTasks(userId);

        if (csvRows.length === 0) {
          csvRows.push('Type,Title,Description,Activity,Created At,Completed,Completed At,Priority');
        }

        tasks.forEach((task: any) => {
          const createdAt = task.createdAt || '';

          // Filter by date range
          if (startDate || endDate) {
            const taskDate = task.completedAt ? new Date(task.completedAt) : new Date(createdAt);
            if (startDate && taskDate < new Date(startDate)) return;
            if (endDate && taskDate > new Date(endDate)) return;
          }

          const title = (task.title || '').replace(/"/g, '""');
          const description = (task.description || '').replace(/"/g, '""');
          const activityTitle = task.activityTitle || '';
          const completed = task.completed ? 'Yes' : 'No';
          const completedAt = task.completedAt || '';
          const priority = task.priority || '';

          csvRows.push(`"Task","${title}","${description}","${activityTitle}","${createdAt}","${completed}","${completedAt}","${priority}"`);
        });
      }

      // Generate CSV string
      const csv = csvRows.join('\n');

      // Send CSV file
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="journalmate-export.csv"');
      res.send(csv);

    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // Excel Export (Pro tier required) - simplified using CSV format
  app.post("/api/export/excel", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { dataTypes, startDate, endDate } = req.body;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: tierCheck.message,
          requiredTier: 'pro',
          currentTier: tierCheck.tier
        });
      }

      // For now, Excel export uses the same CSV logic
      // TODO: Implement proper XLSX export with xlsx library
      if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ error: 'dataTypes array required' });
      }

      const csvRows: string[] = [];

      // Export Journal Entries
      if (dataTypes.includes('journal')) {
        const prefs = await storage.getPersonalJournalEntries(userId);
        if (prefs?.preferences?.journalData) {
          csvRows.push('Type,Category,Text,Keywords,Timestamp,Activity ID,Activity Title,Mood');

          const journalData = prefs.preferences.journalData;
          for (const [category, entries] of Object.entries(journalData)) {
            if (Array.isArray(entries)) {
              entries.forEach((entry: any) => {
                const timestamp = entry.timestamp || '';
                const text = (entry.text || '').replace(/"/g, '""');
                const keywords = Array.isArray(entry.keywords) ? entry.keywords.join('; ') : '';
                const activityId = entry.activityId || '';
                const activityTitle = entry.linkedActivityTitle || '';
                const mood = entry.mood || '';

                if (startDate || endDate) {
                  const entryDate = new Date(timestamp);
                  if (startDate && entryDate < new Date(startDate)) return;
                  if (endDate && entryDate > new Date(endDate)) return;
                }

                csvRows.push(`"Journal","${category}","${text}","${keywords}","${timestamp}","${activityId}","${activityTitle}","${mood}"`);
              });
            }
          }
        }
      }

      // Export Activities
      if (dataTypes.includes('activities')) {
        const activities = await storage.getUserActivities(userId);

        if (csvRows.length === 0) {
          csvRows.push('Type,Title,Description,Category,Created At,Completed,Total Tasks,Completed Tasks');
        }

        activities.forEach((activity: any) => {
          const createdAt = activity.createdAt || '';

          if (startDate || endDate) {
            const activityDate = new Date(createdAt);
            if (startDate && activityDate < new Date(startDate)) return;
            if (endDate && activityDate > new Date(endDate)) return;
          }

          const title = (activity.title || '').replace(/"/g, '""');
          const description = (activity.description || '').replace(/"/g, '""');
          const category = activity.category || '';
          const completed = activity.completed ? 'Yes' : 'No';
          const totalTasks = activity.totalTasks || 0;
          const completedTasks = activity.completedTasks || 0;

          csvRows.push(`"Activity","${title}","${description}","${category}","${createdAt}","${completed}","${totalTasks}","${completedTasks}"`);
        });
      }

      // Export Tasks
      if (dataTypes.includes('tasks')) {
        const tasks = await storage.getUserTasks(userId);

        if (csvRows.length === 0) {
          csvRows.push('Type,Title,Description,Activity,Created At,Completed,Completed At,Priority');
        }

        tasks.forEach((task: any) => {
          const createdAt = task.createdAt || '';

          if (startDate || endDate) {
            const taskDate = task.completedAt ? new Date(task.completedAt) : new Date(createdAt);
            if (startDate && taskDate < new Date(startDate)) return;
            if (endDate && taskDate > new Date(endDate)) return;
          }

          const title = (task.title || '').replace(/"/g, '""');
          const description = (task.description || '').replace(/"/g, '""');
          const activityTitle = task.activityTitle || '';
          const completed = task.completed ? 'Yes' : 'No';
          const completedAt = task.completedAt || '';
          const priority = task.priority || '';

          csvRows.push(`"Task","${title}","${description}","${activityTitle}","${createdAt}","${completed}","${completedAt}","${priority}"`);
        });
      }

      // Generate CSV (will be read as Excel by most programs)
      const csv = csvRows.join('\n');

      // Send as CSV file with xlsx extension
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="journalmate-export.xlsx"');
      res.send(csv);

    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });

  // ===== INSIGHTS ANALYTICS ENDPOINT (PRO FEATURE) =====

  app.get("/api/insights", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: tierCheck.message,
          requiredTier: 'pro',
          currentTier: tierCheck.tier
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
      const completedTasks = tasks.filter(t => t.completed).length;
      const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

      // Analyze mood trend from journal entries
      const journalData = prefs?.preferences?.journalData || {};
      let totalEntries = 0;
      let positiveEntries = 0;
      let negativeEntries = 0;

      Object.values(journalData).forEach((entries: any) => {
        if (Array.isArray(entries)) {
          entries.forEach((entry: any) => {
            totalEntries++;
            if (entry.mood === 'great' || entry.mood === 'good') positiveEntries++;
            if (entry.mood === 'poor') negativeEntries++;
          });
        }
      });

      const moodTrend = positiveEntries > negativeEntries ? 'improving' :
                        positiveEntries === negativeEntries ? 'stable' : 'declining';

      // Find most loved categories (from reactions)
      const categoryLoves: { [key: string]: number } = {};
      allReactions.forEach((reaction: any) => {
        if (reaction.type === 'superlike') {
          const task = tasks.find(t => t.id === reaction.taskId);
          if (task && task.activityTitle) {
            categoryLoves[task.activityTitle] = (categoryLoves[task.activityTitle] || 0) + 1;
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

      const recentTasks = tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        return completedDate >= weekStart;
      });

      const daysActive = new Set(recentTasks.map(t => new Date(t.completedAt!).toDateString())).size;

      // Productivity pattern analysis
      const tasksByHour: { [hour: number]: number } = {};
      tasks.forEach(task => {
        if (task.completedAt) {
          const hour = new Date(task.completedAt).getHours();
          tasksByHour[hour] = (tasksByHour[hour] || 0) + 1;
        }
      });

      const mostProductiveHour = Object.entries(tasksByHour)
        .sort((a, b) => b[1] - a[1])[0];

      const productivityPattern = mostProductiveHour
        ? `You're most productive around ${mostProductiveHour[0]}:00 (${mostProductiveHour[1]} tasks completed).`
        : "Complete more tasks to discover your productivity pattern!";

      // Generate AI summary (simplified for now - can be enhanced with actual AI later)
      const aiSummary = `This week you completed ${recentTasks.length} tasks across ${activities.length} activities. Your completion rate is ${completionRate}%, which is ${completionRate >= 70 ? 'excellent' : completionRate >= 50 ? 'good' : 'developing'}. ${
        mostLovedCategories[0]
          ? `You showed the most enthusiasm for "${mostLovedCategories[0].category}" with ${mostLovedCategories[0].count} superliked tasks.`
          : ''
      } ${
        moodTrend === 'improving'
          ? 'Your mood has been trending positively - keep up the great work!'
          : moodTrend === 'declining'
          ? 'Take some time for self-care and activities that bring you joy.'
          : 'Your mood has been steady. Consider trying new experiences for variety.'
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
        totalTasksCompleted: completedTasks
      });

    } catch (error) {
      console.error('Insights error:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  // ===== SMART FAVORITES API (PRO FEATURE) =====
  
  // Get user's favorite activities with advanced filtering
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { category, search, sortBy } = req.query;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: tierCheck.message,
          requiredTier: 'pro',
          currentTier: tierCheck.tier
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
        })
      );

      let filteredActivities = activities.filter(Boolean);

      // Apply filters
      if (category && category !== 'all') {
        filteredActivities = filteredActivities.filter(a => a.category === category);
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredActivities = filteredActivities.filter(a =>
          a.title?.toLowerCase().includes(searchLower) ||
          a.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      if (sortBy === 'recent') {
        filteredActivities.sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );
      } else if (sortBy === 'alpha') {
        filteredActivities.sort((a, b) => a.title!.localeCompare(b.title!));
      }

      res.json({ favorites: filteredActivities });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  // Add activity to favorites
  app.post("/api/favorites/:activityId", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { activityId } = req.params;

      // Check subscription tier (Pro required)
      const tierCheck = await checkSubscriptionTier(userId, 'pro');
      if (!tierCheck.allowed) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: tierCheck.message,
          requiredTier: 'pro',
          currentTier: tierCheck.tier
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
            favorites
          }
        });
      }

      res.json({ success: true, favorites });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
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
      const favorites = (currentPrefs.favorites || []).filter((id: string) => id !== activityId);

      await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          favorites
        }
      });

      res.json({ success: true, favorites });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  });

  // ===== CONVERSATIONAL LIFESTYLE PLANNER API ENDPOINTS =====

  // Start a new lifestyle planning session
  app.post("/api/planner/session", async (req, res) => {
    try {
      const userId = getDemoUserId(req);
      
      // FIXED: Always complete old sessions and create fresh one
      // Mark ALL existing sessions as completed before creating new one
      const activeSession = await storage.getActiveLifestylePlannerSession(userId);
      if (activeSession) {
        console.log('[SESSION] Completing old session:', activeSession.id);
        await storage.updateLifestylePlannerSession(activeSession.id, {
          isComplete: true,
          sessionState: 'completed'
        }, userId);
      }

      // Create fresh new session
      const session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: 'intake',
        slots: {},
        externalContext: {},
        conversationHistory: [],
        isComplete: false
      });

      console.log('[SESSION] Created fresh session:', session.id);

      res.json({ 
        session,
        message: "Hi! I'm here to help you plan something amazing. What would you like to do today?",
        isNewSession: true
      });
    } catch (error) {
      console.error('Error creating planner session:', error);
      res.status(500).json({ error: 'Failed to create planner session' });
    }
  });

  // Process a message in the conversation
  app.post("/api/planner/message", async (req, res) => {
    try {
      const userId = getDemoUserId(req);
      const { sessionId, message, mode } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Session ID and message are required' });
      }

      // Get the session
      const session = await storage.getLifestylePlannerSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get user profile for context
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // ⚡ REDIRECT Quick Plan and Smart Plan to Simple Planner (no LangGraph!)
      if (mode === 'quick' || mode === 'smart') {
        console.log(`🔄 [REDIRECTING] ${mode.toUpperCase()} mode -> Simple Planner (bypassing LangGraph)`);
        return await handleSimplePlanConversation(
          req,
          res,
          message,
          session.conversationHistory || [],
          userId,
          mode
        );
      }

      // HARDEN CONFIRMATION DETECTION for task generation
      const positiveConfirmationWords = ['\\byes\\b', '\\byep\\b', '\\byeah\\b', '\\bsounds good\\b', '\\bagree(d|s)?\\b', '\\bconfirm(ed)?\\b', '\\bi confirm\\b', '\\blooks good\\b', '\\bperfect\\b', '\\bgreat\\b', '\\bthat works\\b'];
      const negativeWords = ['\\bno\\b', '\\bdon\'t\\b', '\\bwon\'t\\b', '\\bcancel\\b', '\\bstop\\b', '\\bnot now\\b', '\\bnot yet\\b'];
      
      const userMessage = message.toLowerCase().trim();
      
      // Check for positive confirmation first when in confirming state
      const hasPositiveConfirmation = positiveConfirmationWords.some(word => new RegExp(word, 'i').test(userMessage));
      
      // Check for explicit negative responses
      const hasNegativeResponse = negativeWords.some(word => new RegExp(word, 'i').test(userMessage));
      
      // Set/clear confirmation flag based on user response in confirmation state
      if (session.sessionState === 'confirming') {
        if (hasPositiveConfirmation) {
          session.userConfirmedAdd = true;
          console.log('User confirmed task generation:', userMessage);
        } else if (hasNegativeResponse) {
          session.userConfirmedAdd = false;
          console.log('User declined task generation:', userMessage);
        }
      }
      
      // Reset confirmation flag if starting new planning cycle
      if (session.sessionState === 'intake' || session.sessionState === 'gathering') {
        session.userConfirmedAdd = false;
      }

      // Process the message with the lifestyle planner agent
      const response = await lifestylePlannerAgent.processMessage(message, session, user, mode, storage);

      // Update conversation history
      const updatedHistory = [
        ...(session.conversationHistory || []),
        { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: response.message, timestamp: new Date().toISOString() }
      ];

      // Update the session with new state, conversation, and most importantly - the updated slots
      const updatedSession = await storage.updateLifestylePlannerSession(sessionId, {
        sessionState: response.sessionState,
        conversationHistory: updatedHistory,
        slots: response.updatedSlots || session.slots, // Persist extracted context!
        userConfirmedAdd: session.userConfirmedAdd, // Persist confirmation flag
        isComplete: response.sessionState === 'completed',
        generatedPlan: response.generatedPlan
      }, userId);

      res.json({
        ...response,
        session: updatedSession
      });
    } catch (error) {
      console.error('Error processing planner message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Preview plan before generation
  app.post("/api/planner/preview", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const session = await storage.getLifestylePlannerSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate plan preview
      const slots = session.slots || {};
      const activityType = slots.activityType || 'Lifestyle Activity';
      const location = slots.location?.destination || slots.location?.current || 'Your location';
      const timing = slots.timing?.departureTime || slots.timing?.date || 'TBD';
      const budget = slots.budget || 'moderate';

      // Create preview structure
      const planPreview = {
        activity: {
          title: `${activityType} Plan`,
          description: `A personalized ${activityType.toLowerCase()} experience at ${location}`,
          category: slots.activityType?.toLowerCase().includes('date') ? 'romance' :
                    slots.activityType?.toLowerCase().includes('work') ? 'work' :
                    slots.activityType?.toLowerCase().includes('fitness') ? 'wellness' : 'adventure'
        },
        tasks: [
          {
            title: `Prepare for ${activityType}`,
            description: `Get ready with ${slots.outfit?.style || 'appropriate attire'}, check weather and traffic`,
            priority: 'high'
          },
          {
            title: `Travel to ${location}`,
            description: `Use ${slots.transportation || 'preferred transportation'}, depart at ${timing}`,
            priority: 'high'
          },
          {
            title: `Enjoy ${activityType}`,
            description: `Make the most of your experience, ${slots.mood ? `embrace the ${slots.mood} vibe` : 'have fun'}`,
            priority: 'medium'
          }
        ],
        summary: `This plan includes preparation, travel, and the main activity. Estimated budget: ${budget}.`,
        estimatedTimeframe: slots.timing?.duration || '2-4 hours',
        motivationalNote: slots.mood === 'romantic'
          ? 'Create unforgettable memories together! ❤️'
          : slots.mood === 'adventurous'
          ? 'Get ready for an amazing adventure! 🚀'
          : 'Enjoy every moment of this experience! ✨'
      };

      res.json({ planPreview });
    } catch (error) {
      console.error('Error previewing plan:', error);
      res.status(500).json({ error: 'Failed to preview plan' });
    }
  });

  // Generate final plan
  app.post("/api/planner/generate", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const session = await storage.getLifestylePlannerSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // STRICT SERVER-SIDE ENFORCEMENT: Check slot completeness and user confirmation
      const slots = session.slots || {};
      const missingRequiredSlots = [];
      
      // Check for essential slots
      if (!slots.activityType) missingRequiredSlots.push('activity type');
      if (!slots.location?.destination && !slots.location?.current) missingRequiredSlots.push('location');
      if (!slots.timing?.departureTime && !slots.timing?.arrivalTime && !slots.timing?.date) missingRequiredSlots.push('timing');
      if (!slots.budget) missingRequiredSlots.push('budget');
      
      // Return error if missing required context
      if (missingRequiredSlots.length > 0) {
        return res.status(400).json({ 
          error: 'Incomplete context',
          message: `Missing required information: ${missingRequiredSlots.join(', ')}. Please provide these details before generating tasks.`,
          missingSlots: missingRequiredSlots
        });
      }
      
      // Require user confirmation before generating tasks
      if (!session.userConfirmedAdd) {
        return res.status(400).json({ 
          error: 'User confirmation required',
          message: 'Please confirm that you want to add these tasks to your activity before generation can proceed.'
        });
      }

      // Generate activity and tasks from the session slots
      const activityType = slots.activityType || 'Lifestyle Activity';
      const location = slots.location?.destination || slots.location?.current || 'Your location';
      const timing = slots.timing?.departureTime || slots.timing?.date || new Date().toISOString();
      const budget = slots.budget || 'moderate';

      // Determine category
      const category = slots.activityType?.toLowerCase().includes('date') ? 'romance' :
                      slots.activityType?.toLowerCase().includes('work') ? 'work' :
                      slots.activityType?.toLowerCase().includes('fitness') ? 'wellness' : 'adventure';

      // Create the Activity (this becomes the header on landing page)
      const activity = await storage.createActivity({
        userId,
        title: `${activityType} Plan`,
        description: `A personalized ${activityType.toLowerCase()} experience at ${location}. Budget: ${budget}`,
        category,
        status: 'planning',
        startDate: timing,
        tags: [activityType, location, budget].filter(Boolean)
      });

      // Create the Tasks (these become the task details under the activity)
      const createdTasks = [];

      // Task 1: Preparation
      const prepTask = await storage.createTask({
        userId,
        title: `Prepare for ${activityType}`,
        description: `Get ready with ${slots.outfit?.style || 'appropriate attire'}, check weather and traffic conditions`,
        category: 'Preparation',
        priority: 'high',
        timeEstimate: '30-45 min',
        activityId: activity.id
      });
      createdTasks.push(prepTask);

      // Task 2: Travel
      const travelTask = await storage.createTask({
        userId,
        title: `Travel to ${location}`,
        description: `Use ${slots.transportation || 'preferred transportation'}, depart at ${slots.timing?.departureTime || 'planned time'}. Check traffic before leaving.`,
        category: 'Travel',
        priority: 'high',
        timeEstimate: slots.timing?.travelDuration || '30 min',
        activityId: activity.id
      });
      createdTasks.push(travelTask);

      // Task 3: Main Activity
      const mainTask = await storage.createTask({
        userId,
        title: `Enjoy ${activityType}`,
        description: `Make the most of your experience${slots.mood ? `, embrace the ${slots.mood} vibe` : ''}. ${slots.companions ? `With ${slots.companions}` : ''}`,
        category: 'Experience',
        priority: 'medium',
        timeEstimate: slots.timing?.duration || '2-3 hours',
        activityId: activity.id
      });
      createdTasks.push(mainTask);

      // Task 4: Post-activity (optional but nice)
      const followUpTask = await storage.createTask({
        userId,
        title: 'Reflect and Share',
        description: 'Take photos, share memories, and reflect on the experience',
        category: 'Follow-up',
        priority: 'low',
        timeEstimate: '15 min',
        activityId: activity.id
      });
      createdTasks.push(followUpTask);

      // Link tasks to activity
      for (const task of createdTasks) {
        await storage.addTaskToActivity(activity.id, task.id, createdTasks.indexOf(task));
      }

      // Prepare plan summary for session
      const generatedPlan = {
        activity: {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          category: activity.category
        },
        tasks: createdTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority
        })),
        summary: `Created activity "${activity.title}" with ${createdTasks.length} tasks`,
        estimatedTimeframe: slots.timing?.duration || '2-4 hours',
        motivationalNote: slots.mood === 'romantic'
          ? 'Create unforgettable memories together! ❤️'
          : slots.mood === 'adventurous'
          ? 'Get ready for an amazing adventure! 🚀'
          : 'Enjoy every moment of this experience! ✨'
      };

      // Update session as completed
      const updatedSession = await storage.updateLifestylePlannerSession(sessionId, {
        sessionState: 'completed',
        isComplete: true,
        generatedPlan
      }, userId);

      res.json({
        activity,
        tasks: createdTasks,
        session: updatedSession,
        generatedPlan,
        message: "Your plan is ready! Activity and tasks have been added to your dashboard."
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      res.status(500).json({ error: 'Failed to generate plan' });
    }
  });

  // Get user's planner sessions
  app.get("/api/planner/sessions", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const sessions = await storage.getUserLifestylePlannerSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching planner sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // SIMPLIFIED: Direct plan generation - no questions, just generate!
  app.post("/api/planner/direct-plan", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const { userInput, contentType, sessionId, isModification } = req.body;

      if (!userInput || typeof userInput !== 'string') {
        return res.status(400).json({ error: 'User input is required' });
      }
      
      // SECURITY: Block demo users from creating activities/tasks
      if (isDemoUser(userId)) {
        return res.status(403).json({
          error: 'Demo users cannot create activities. Please sign in to save your plan.',
          requiresAuth: true,
          message: 'Sign in to save your plan and track your progress!'
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Import direct plan generator
      const { directPlanGenerator } = await import('./services/directPlanGenerator');

      let existingPlan = null;

      // If this is a modification, get the existing plan from session
      if (isModification && sessionId) {
        const session = await storage.getLifestylePlannerSession(sessionId, userId);
        if (session?.generatedPlan) {
          existingPlan = {
            activity: session.generatedPlan.activity,
            tasks: session.generatedPlan.tasks
          };
        }
      }

      // Generate plan directly - no questions!
      const plan = await directPlanGenerator.generatePlan(
        userInput,
        contentType || 'text',
        user,
        existingPlan
      );

      // Create or update session
      let session;
      if (sessionId) {
        // Update existing session
        session = await storage.updateLifestylePlannerSession(sessionId, {
          generatedPlan: plan,
          sessionState: 'completed',
          conversationHistory: [
            ...(await storage.getLifestylePlannerSession(sessionId, userId))?.conversationHistory || [],
            { role: 'user', content: userInput, timestamp: new Date().toISOString() },
            { role: 'assistant', content: `Generated plan: ${plan.activity.title}`, timestamp: new Date().toISOString() }
          ]
        }, userId);
      } else {
        // Create new session
        session = await storage.createLifestylePlannerSession({
          userId,
          sessionState: 'completed',
          slots: {},
          conversationHistory: [
            { role: 'user', content: userInput, timestamp: new Date().toISOString() },
            { role: 'assistant', content: `Generated plan: ${plan.activity.title}`, timestamp: new Date().toISOString() }
          ],
          generatedPlan: plan
        });
      }

      res.json({
        success: true,
        plan,
        session,
        message: isModification
          ? `Updated plan: ${plan.activity.title}`
          : `Generated plan: ${plan.activity.title} with ${plan.tasks.length} tasks`
      });

    } catch (error) {
      console.error('Error generating direct plan:', error);

      // Handle guardrail rejection
      if (error instanceof Error && error.message.startsWith('INPUT_NOT_PLAN_RELATED')) {
        return res.status(400).json({
          error: 'Not Plan-Related',
          message: error.message.replace('INPUT_NOT_PLAN_RELATED: ', ''),
          suggestion: 'Try describing what you want to plan, organize, or accomplish. For example: "plan my weekend", "organize home office", or paste a list of tasks.'
        });
      }

      res.status(500).json({ error: 'Failed to generate plan' });
    }
  });

  // Parse pasted LLM content into actionable tasks (OLD - keeping for backwards compatibility)
  app.post("/api/planner/parse-llm-content", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const { pastedContent, precedingContext, contentType } = req.body;

      if (!pastedContent || typeof pastedContent !== 'string') {
        return res.status(400).json({ error: 'Pasted content is required' });
      }

      // Validate contentType
      const validContentType = contentType === 'image' ? 'image' : 'text';

      // Parse the LLM content into an activity with tasks (supports both text and images)
      const parsed = await aiService.parsePastedLLMContent(
        pastedContent,
        precedingContext || '',
        userId,
        validContentType
      );

      res.json({
        success: true,
        parsed
      });
    } catch (error) {
      console.error('Error parsing LLM content:', error);
      res.status(500).json({ error: 'Failed to parse LLM content' });
    }
  });

  // Get specific session
  app.get("/api/planner/session/:sessionId", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      const { sessionId } = req.params;
      
      const session = await storage.getLifestylePlannerSession(sessionId, userId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session);
    } catch (error) {
      console.error('Error fetching planner session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  app.delete("/api/user/profile", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserProfile(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user profile:', error);
      res.status(500).json({ error: 'Failed to delete user profile' });
    }
  });

  // User Preferences Management
  app.get("/api/user/preferences", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  });

  app.put("/api/user/preferences", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const preferencesData = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.upsertUserPreferences(userId, preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  });

  app.delete("/api/user/preferences", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserPreferences(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user preferences:', error);
      res.status(500).json({ error: 'Failed to delete user preferences' });
    }
  });

  // User Context Management (for personalized AI planning)
  app.get("/api/user/context", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const forceRefresh = req.query.forceRefresh === 'true';
      const context = await aiService.getUserContext(userId, forceRefresh);
      res.json({ context, enabled: context !== null });
    } catch (error) {
      console.error('Error fetching user context:', error);
      res.status(500).json({ error: 'Failed to fetch user context' });
    }
  });

  app.post("/api/user/context/generate", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      
      // Invalidate cache to force fresh generation
      aiService.invalidateUserContext(userId);
      
      // Generate new context summary
      const context = await aiService.generateUserContextSummary(userId);
      
      res.json({ 
        success: true, 
        context,
        message: 'User context summary generated successfully' 
      });
    } catch (error) {
      console.error('Error generating user context:', error);
      res.status(500).json({ error: 'Failed to generate user context' });
    }
  });

  // User Consent Management
  app.get("/api/user/consent", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const consent = await storage.getUserConsent(userId);
      res.json(consent);
    } catch (error) {
      console.error('Error fetching user consent:', error);
      res.status(500).json({ error: 'Failed to fetch user consent' });
    }
  });

  app.put("/api/user/consent", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const consentData = insertUserConsentSchema.parse(req.body);
      const consent = await storage.upsertUserConsent(userId, consentData);
      res.json(consent);
    } catch (error) {
      console.error('Error updating user consent:', error);
      res.status(500).json({ error: 'Failed to update user consent' });
    }
  });

  app.delete("/api/user/consent", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      await storage.deleteUserConsent(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user consent:', error);
      res.status(500).json({ error: 'Failed to delete user consent' });
    }
  });

  // Scheduling Suggestions
  app.get("/api/scheduling/suggestions", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const date = req.query.date as string;
      const suggestions = await storage.getUserSchedulingSuggestions(userId, date);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching scheduling suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch scheduling suggestions' });
    }
  });

  app.post("/api/scheduling/generate", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { targetDate } = z.object({ targetDate: z.string() }).parse(req.body);
      
      if (!targetDate) {
        return res.status(400).json({ error: 'Target date is required' });
      }
      
      // Generate smart scheduling suggestions
      const suggestions = await generateSchedulingSuggestions(userId, targetDate);
      
      res.json({ success: true, suggestions, message: `Generated ${suggestions.length} scheduling suggestions` });
    } catch (error) {
      console.error('Error generating scheduling suggestions:', error);
      res.status(500).json({ error: 'Failed to generate scheduling suggestions' });
    }
  });

  app.post("/api/scheduling/suggestions/:suggestionId/accept", async (req, res) => {
    try {
      const userId = getUserId(req) || DEMO_USER_ID;
      const { suggestionId } = req.params;
      
      const suggestion = await storage.acceptSchedulingSuggestion(suggestionId, userId);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Scheduling suggestion not found' });
      }
      
      // Create reminders for each task in the accepted schedule
      await createRemindersFromSchedule(suggestion, userId);
      
      res.json({ 
        success: true, 
        suggestion,
        message: 'Schedule accepted and reminders created!' 
      });
    } catch (error) {
      console.error('Error accepting scheduling suggestion:', error);
      res.status(500).json({ error: 'Failed to accept scheduling suggestion' });
    }
  });

  // Contact Syncing and Sharing Routes
  
  // Sync phone contacts (demo user & authenticated)
  app.post("/api/contacts/sync", async (req, res) => {
    try {
      // Support both authenticated users and demo users
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub || getDemoUserId();
      if (!userId) {
        return res.status(401).json({ error: 'Unable to identify user' });
      }
      
      // Validate request body using Zod
      const validationResult = syncContactsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }
      
      const { contacts: phoneContacts } = validationResult.data;
      const result = await contactSyncService.syncPhoneContacts(userId, phoneContacts);
      
      res.json({
        success: true,
        syncedCount: result.syncedCount,
        contacts: result.contacts,
        message: `Successfully synced ${result.syncedCount} contacts!`
      });
    } catch (error) {
      console.error('Contact sync error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to sync contacts' });
    }
  });

  // Add manual contact (demo user & authenticated)
  app.post("/api/contacts", async (req, res) => {
    try {
      // Support both authenticated users and demo users
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub || getDemoUserId();
      if (!userId) {
        return res.status(401).json({ error: 'Unable to identify user' });
      }
      
      // Validate request body using Zod
      const validationResult = addContactSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }
      
      const contactData = validationResult.data;
      const contact = await contactSyncService.addManualContact(userId, contactData);
      
      res.json({
        success: true,
        contact,
        message: 'Contact added successfully!'
      });
    } catch (error) {
      console.error('Add contact error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.message === 'Contact already exists') {
        return res.status(409).json({ error: 'Contact already exists' });
      }
      res.status(500).json({ error: 'Failed to add contact' });
    }
  });

  // Get user's contacts with JournalMate status (demo user & authenticated)
  app.get("/api/contacts", async (req, res) => {
    try {
      // Support both authenticated users and demo users
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub || getDemoUserId();
      if (!userId) {
        return res.status(401).json({ error: 'Unable to identify user' });
      }
      
      const contacts = await contactSyncService.getUserContactsWithStatus(userId);
      res.json(contacts);
    } catch (error) {
      console.error('Get contacts error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Generate invite message for sharing
  app.post("/api/sharing/generate-invite", async (req, res) => {
    try {
      const { planTitle, inviteLink } = req.body;
      
      if (!planTitle || !inviteLink) {
        return res.status(400).json({ error: 'Plan title and invite link are required' });
      }
      
      // Get user info for personalization
      const user = await storage.getUser(DEMO_USER_ID);
      const inviterName = user ? `${user.firstName || 'Someone'} ${user.lastName || ''}`.trim() : 'Someone';
      
      const inviteMessage = contactSyncService.generateInviteMessage(inviterName, planTitle, inviteLink);
      
      res.json({
        success: true,
        inviteMessage,
        sharingOptions: {
          sms: `sms:?body=${encodeURIComponent(inviteMessage)}`,
          email: `mailto:?subject=${encodeURIComponent(`Join me on "${planTitle}"`)}&body=${encodeURIComponent(inviteMessage)}`,
          copy: inviteMessage
        }
      });
    } catch (error) {
      console.error('Generate invite error:', error);
      res.status(500).json({ error: 'Failed to generate invite' });
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
            <li>Visiting: <a href="${req.protocol}://${req.get('host')}/data-deletion">Data Deletion Request Form</a></li>
            <li>Emailing us at: support@journalmate.ai</li>
        </ul>
    </div>
    
    <p style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #eee; color: #666; text-align: center;">
        © ${new Date().getFullYear()} JournalMate. All rights reserved.
    </p>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
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
    
    res.setHeader('Content-Type', 'text/html');
    res.send(dataDeletionHTML);
  });

  // Data Deletion Request API - Processes deletion requests
  app.post("/api/data-deletion/request", async (req, res) => {
    try {
      const { email, facebook_id, reason, additional_info } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Log the deletion request for processing
      console.log('Data deletion request received:', {
        email,
        facebook_id,
        reason,
        additional_info,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      // In a real application, you would:
      // 1. Verify the user's identity
      // 2. Queue the deletion for processing
      // 3. Send confirmation email
      // 4. Actually delete the data within 30 days
      
      // For now, we'll simulate this process
      const deletionRequestId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // TODO: Implement actual data deletion logic
      // TODO: Send confirmation email
      // TODO: Queue background job for data deletion
      
      res.json({
        success: true,
        requestId: deletionRequestId,
        message: 'Your data deletion request has been received and will be processed within 30 days.',
        confirmationEmail: 'A confirmation email will be sent to your registered email address.'
      });
      
    } catch (error) {
      console.error('Data deletion request error:', error);
      res.status(500).json({ 
        error: 'Failed to process deletion request',
        message: 'Please try again or contact support at support@journalmate.ai'
      });
    }
  });

  // Facebook Webhook for Data Deletion Callback (alternative method)
  app.post("/api/facebook/data-deletion", async (req, res) => {
    try {
      const { signed_request } = req.body;
      
      if (!signed_request) {
        return res.status(400).json({ error: 'Missing signed_request' });
      }
      
      // Verify Facebook's signed request signature
      const crypto = require('crypto');
      const [encodedSig, payload] = signed_request.split('.');
      
      // Get Facebook app secret from environment
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appSecret) {
        console.error('FACEBOOK_APP_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      // Verify signature
      const expectedSig = crypto.createHmac('sha256', appSecret)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
        
      const providedSig = encodedSig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      if (expectedSig !== providedSig) {
        console.error('Invalid Facebook signature verification');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      // Parse verified payload
      const data = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      console.log('Verified Facebook data deletion callback received:', {
        user_id: data.user_id,
        algorithm: data.algorithm,
        issued_at: data.issued_at,
        timestamp: new Date().toISOString()
      });
      
      // Process the deletion for the Facebook user
      try {
        // Find user by Facebook ID and delete their data
        const users = await storage.getAllUsers();
        const userToDelete = users.find(user => user.facebookId === data.user_id);
        
        if (userToDelete) {
          // Export user data before deletion (GDPR requirement)
          const userData = {
            profile: userToDelete,
            goals: await storage.getGoalsByUserId(userToDelete.id),
            tasks: await storage.getTasksByUserId(userToDelete.id),
            progress: await storage.getProgressByUserId(userToDelete.id),
            exportedAt: new Date().toISOString()
          };
          
          // In production, send this data to the user or store for retrieval
          console.log('User data exported for deletion:', userData);
          
          // Delete all user data
          await storage.deleteUserData(userToDelete.id);
          
          console.log('Successfully deleted user data for Facebook ID:', data.user_id);
        } else {
          console.log('No user found with Facebook ID:', data.user_id);
        }
        
        const confirmationCode = crypto.randomBytes(16).toString('hex');
        
        res.json({
          url: `${req.protocol}://${req.get('host')}/data-deletion?confirmation=${confirmationCode}`,
          confirmation_code: confirmationCode
        });
        
      } catch (deletionError) {
        console.error('Error during user data deletion:', deletionError);
        res.status(500).json({ error: 'Failed to delete user data' });
      }
      
    } catch (error) {
      console.error('Facebook data deletion callback error:', error);
      res.status(500).json({ error: 'Failed to process Facebook data deletion request' });
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
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({ 
          error: 'Admin functionality not configured. Set ADMIN_SECRET environment variable.' 
        });
      }
      
      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn('[ADMIN] Unauthorized seed attempt');
        return res.status(403).json({ 
          error: 'Unauthorized. Admin secret required.' 
        });
      }
      
      console.log('[ADMIN] Authorized admin seeding community plans...');
      console.log('[ADMIN] Force reseed:', force || false);
      
      await storage.seedCommunityPlans(force || false);
      
      res.json({ 
        success: true, 
        message: 'Community plans seeded successfully! Check the Discover Plans section.',
        plansSeeded: 56
      });
    } catch (error) {
      console.error('[ADMIN] Failed to seed community plans:', error);
      res.status(500).json({ 
        error: 'Failed to seed community plans',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({ 
          error: 'Admin functionality not configured. Set ADMIN_SECRET environment variable.' 
        });
      }
      
      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn('[ADMIN] Unauthorized verification update attempt');
        return res.status(403).json({ 
          error: 'Unauthorized. Admin secret required.' 
        });
      }
      
      console.log('[ADMIN] Authorized admin updating official plan verification...');
      console.log('[ADMIN] Instagram handle:', instagramHandle || 'https://www.instagram.com/cartertano/');
      
      // Use provided Instagram handle or default to cartertano
      const adminInstagramHandle = instagramHandle || 'https://www.instagram.com/cartertano/';
      
      // Get or create admin user (demo-user is typically the admin for seeded content)
      const adminUserId = DEMO_USER_ID;
      
      // Create or update planner profile for admin with Instagram verification
      const [plannerProfile] = await db
        .insert(plannerProfiles)
        .values({
          userId: adminUserId,
          instagramHandle: adminInstagramHandle,
          verificationStatus: 'official',
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: plannerProfiles.userId,
          set: {
            instagramHandle: adminInstagramHandle,
            verificationStatus: 'official',
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();
      
      console.log('[ADMIN] Created/updated planner profile:', plannerProfile.id);
      
      // Update all activities with sourceType='official_seed' to include verification
      const updateResult = await db
        .update(activities)
        .set({
          plannerProfileId: plannerProfile.id,
          verificationBadge: 'instagram',
          updatedAt: new Date(),
        })
        .where(eq(activities.sourceType, 'official_seed'))
        .returning({ id: activities.id });
      
      console.log('[ADMIN] Updated official plans count:', updateResult.length);
      
      res.json({ 
        success: true, 
        message: `Successfully updated ${updateResult.length} official plans with Instagram verification`,
        plansUpdated: updateResult.length,
        instagramHandle: adminInstagramHandle,
        plannerProfileId: plannerProfile.id
      });
    } catch (error) {
      console.error('[ADMIN] Failed to update official plan verification:', error);
      res.status(500).json({ 
        error: 'Failed to update official plan verification',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!requiredSecret && !isDevelopment) {
        return res.status(500).json({ 
          error: 'Admin functionality not configured. Set ADMIN_SECRET environment variable.' 
        });
      }
      
      if (!isDevelopment && (!adminSecret || adminSecret !== requiredSecret)) {
        console.warn('[ADMIN] Unauthorized content hash backfill attempt');
        return res.status(403).json({ 
          error: 'Unauthorized. Admin secret required.' 
        });
      }
      
      console.log('[ADMIN] Starting content hash backfill for all activities...');
      
      // Get all activities that need content hashes
      const allActivities = await db
        .select({ id: activities.id, userId: activities.userId })
        .from(activities)
        .where(isNull(activities.contentHash));
      
      console.log(`[ADMIN] Found ${allActivities.length} activities without content hashes`);
      
      let updatedCount = 0;
      let errorCount = 0;
      
      // Process each activity
      for (const activity of allActivities) {
        try {
          // Get tasks for this activity
          const tasks = await storage.getTasksByActivity(activity.id, activity.userId);
          
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
            console.log(`[ADMIN] Processed ${updatedCount}/${allActivities.length} activities...`);
          }
        } catch (error) {
          console.error(`[ADMIN] Error processing activity ${activity.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`[ADMIN] Content hash backfill complete: ${updatedCount} updated, ${errorCount} errors`);
      
      res.json({ 
        success: true, 
        message: 'Content hash backfill completed successfully',
        activitiesProcessed: allActivities.length,
        activitiesUpdated: updatedCount,
        errors: errorCount
      });
    } catch (error) {
      console.error('[ADMIN] Failed to backfill content hashes:', error);
      res.status(500).json({ 
        error: 'Failed to backfill content hashes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for scheduling
async function generateSchedulingSuggestions(userId: string, targetDate: string): Promise<any[]> {
  // Get user's pending tasks
  const tasks = await storage.getUserTasks(userId);
  const pendingTasks = tasks.filter(task => !task.completed);
  
  if (pendingTasks.length === 0) {
    return [];
  }

  // Get user's notification preferences for optimal timing
  const preferences = await storage.getUserNotificationPreferences(userId);
  
  // Smart scheduling algorithm
  const suggestions = [];
  
  // Priority-based scheduling
  const prioritySchedule = createPriorityBasedSchedule(pendingTasks, targetDate, preferences);
  if (prioritySchedule.suggestedTasks.length > 0) {
    const suggestion = await storage.createSchedulingSuggestion({
      userId,
      suggestionType: 'priority_based',
      targetDate,
      suggestedTasks: prioritySchedule.suggestedTasks,
      score: prioritySchedule.score
    });
    suggestions.push(suggestion);
  }
  
  // Time-optimized scheduling
  const timeOptimizedSchedule = createTimeOptimizedSchedule(pendingTasks, targetDate, preferences);
  if (timeOptimizedSchedule.suggestedTasks.length > 0) {
    const suggestion = await storage.createSchedulingSuggestion({
      userId,
      suggestionType: 'daily',
      targetDate,
      suggestedTasks: timeOptimizedSchedule.suggestedTasks,
      score: timeOptimizedSchedule.score
    });
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

function createPriorityBasedSchedule(tasks: Task[], targetDate: string, preferences?: NotificationPreferences) {
  // Sort by priority and time estimate
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    return bPriority - aPriority;
  });

  let currentTime = "09:00"; // Start at 9 AM
  const suggestedTasks = [];
  
  for (const task of sortedTasks.slice(0, 6)) { // Limit to 6 tasks per day
    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || '30 min');
    
    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || '30 min',
      suggestedStartTime: currentTime,
      reason: `${task.priority} priority task - tackle important work early`
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
    score: Math.min(95, 70 + (suggestedTasks.length * 5)) // Higher score for more tasks scheduled
  };
}

function createTimeOptimizedSchedule(tasks: Task[], targetDate: string, preferences?: NotificationPreferences) {
  // Optimize for total time and natural flow
  const shortTasks = tasks.filter(task => getTimeEstimateMinutes(task.timeEstimate || '30 min') <= 30);
  const longTasks = tasks.filter(task => getTimeEstimateMinutes(task.timeEstimate || '30 min') > 30);
  
  let currentTime = "10:00"; // Start at 10 AM for time-optimized
  const suggestedTasks = [];
  
  // Start with short tasks for momentum
  for (const task of shortTasks.slice(0, 3)) {
    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || '30 min');
    
    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || '30 min',
      suggestedStartTime: currentTime,
      reason: "Quick wins to build momentum"
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
    
    const timeInMinutes = getTimeEstimateMinutes(task.timeEstimate || '30 min');
    
    suggestedTasks.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      estimatedTime: task.timeEstimate || '30 min',
      suggestedStartTime: currentTime,
      reason: "Focus time for complex tasks"
    });
    
    currentTime = addMinutesToTime(currentTime, timeInMinutes + 20);
  }
  
  return {
    suggestedTasks,
    score: Math.min(90, 60 + (suggestedTasks.length * 8))
  };
}

async function createRemindersFromSchedule(suggestion: any, userId: string) {
  const preferences = await storage.getUserNotificationPreferences(userId);
  const leadTime = preferences?.reminderLeadTime || 30;
  
  for (const taskSuggestion of suggestion.suggestedTasks) {
    // Calculate reminder time
    const taskDateTime = new Date(`${suggestion.targetDate}T${taskSuggestion.suggestedStartTime}`);
    const reminderTime = new Date(taskDateTime.getTime() - (leadTime * 60 * 1000));
    
    // Only create reminder if it's in the future
    if (reminderTime > new Date()) {
      await storage.createTaskReminder({
        userId,
        taskId: taskSuggestion.taskId,
        reminderType: 'custom',
        scheduledAt: reminderTime,
        title: `Upcoming: ${taskSuggestion.title}`,
        message: `Your task "${taskSuggestion.title}" is scheduled to start in ${leadTime} minutes.`
      });
    }
  }
}

// Utility functions
function getTimeEstimateMinutes(timeEstimate: string): number {
  if (timeEstimate.includes('hour')) {
    const hours = parseFloat(timeEstimate);
    return hours * 60;
  } else {
    return parseInt(timeEstimate) || 30;
  }
}

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function addMinutesToTime(timeString: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(timeString) + minutesToAdd;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
