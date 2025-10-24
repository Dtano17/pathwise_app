import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiProviderAuth, isAuthenticatedGeneric } from "./multiProviderAuth";
import { aiService } from "./services/aiService";
import { lifestylePlannerAgent } from "./services/lifestylePlannerAgent";
import { langGraphPlanningAgent } from "./services/langgraphPlanningAgent";
import { simpleConversationalPlanner } from "./services/simpleConversationalPlanner";
import { contactSyncService } from "./contactSync";
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
  type Task,
  type Activity,
  type ActivityTask,
  type NotificationPreferences,
  type SignupUser,
  type ProfileCompletion,
  type LifestylePlannerSession
} from "@shared/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import bcrypt from 'bcrypt';
import { z } from "zod";
import crypto from 'crypto';
import { sendWelcomeEmail } from "./emailService";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
      
      if (!session) {
        // Session was lost somehow - create new one
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
        
        return res.json({
          message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 **You can find it in:**\n• **Home screen** - Check your recent activities\n• **Activities pane** - View all details and progress\n• **Tasks section** - See the ${createdTasks.length} individual tasks I created\n\nAll tasks are ready for you to start working on! 🚀`,
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
            message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 **You can find it in:**\n• **Home screen** - Check your recent activities\n• **Activities pane** - View all details and progress\n• **Tasks section** - See the ${createdTasks.length} individual tasks I created\n\nAll tasks are ready for you to start working on! 🚀`,
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
        message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 **You can find it in:**\n• **Home screen** - Check your recent activities\n• **Activities pane** - View all details and progress\n• **Tasks section** - See the ${createdTasks.length} individual tasks I created\n\nAll tasks are ready for you to start working on! 🚀`,
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
        
        // First time plan is ready - ask for confirmation (only if AI didn't already ask)
        return res.json({
          message: alreadyAskedConfirmation 
            ? response.message 
            : response.message + "\n\n**Are you comfortable with this plan?** (Yes to proceed, or tell me what you'd like to add/change)",
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
        message: `🎉 **Perfect!** Activity "${activity.title}" has been created successfully!\n\n📋 **You can find it in:**\n• **Home screen** - Check your recent activities\n• **Activities pane** - View all details and progress\n• **Tasks section** - See the ${createdTasks.length} individual tasks I created\n\nAll tasks are ready for you to start working on! 🚀`,
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Replit Auth integration
  await setupAuth(app);

  // Multi-provider OAuth setup (Google, Facebook)
  await setupMultiProviderAuth(app);

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

  // Create demo user if not exists (for backwards compatibility)
  const existingUser = await storage.getUser(DEMO_USER_ID);
  if (!existingUser) {
    try {
      await storage.upsertUser({ 
        id: DEMO_USER_ID,
        username: "demo_user",
        password: "demo_password",
        email: "demo@journalmate.com",
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

  // Complete a task (swipe right)
  app.post("/api/tasks/:taskId/complete", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      const task = await storage.completeTask(taskId, userId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
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
      // Prevent caching to ensure UI updates immediately after changes
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(activities);
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
      const llmProvider = getLLMProvider('openai-mini');
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

  // Generate shareable link for activity
  app.post("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId} = req.params;
      const { createGroup, groupName, groupDescription } = req.body;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Validate group creation if requested
      if (createGroup) {
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
      // Priority: journalmate.ai (if in REPLIT_DOMAINS) > REPLIT_DOMAINS > REPLIT_DEV_DOMAIN > localhost
      let baseUrl = 'http://localhost:5000';
      
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',').map(d => d.trim());
        // Prefer journalmate.ai if it's in the list, otherwise use first domain
        if (domains.includes('journalmate.ai')) {
          baseUrl = 'https://journalmate.ai';
        } else {
          baseUrl = `https://${domains[0]}`;
        }
      } else if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
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
      
      if (!activity || !activity.isPublic) {
        return res.status(404).json({ error: 'Shared activity not found' });
      }

      // Get tasks for this activity
      const tasks = await storage.getActivityTasks(activity.id, activity.userId);
      
      // Get owner info (without sensitive data)
      const owner = await storage.getUser(activity.userId);
      
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
        }
      });
    } catch (error) {
      console.error('Get shared activity error:', error);
      res.status(500).json({ error: 'Failed to fetch shared activity' });
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

  // Generate shareable link for activity
  app.post("/api/activities/:activityId/share", async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = getUserId(req) || DEMO_USER_ID;
      
      // Check if activity exists and is public
      const activity = await storage.getActivity(activityId, userId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      
      if (!activity.isPublic) {
        return res.status(403).json({ error: 'Activity must be public to share. Change privacy settings first.' });
      }
      
      const shareToken = await storage.generateShareableLink(activityId, userId);
      
      if (!shareToken) {
        return res.status(404).json({ error: 'Failed to generate share token' });
      }
      
      // Use REPLIT_DOMAINS for production, fall back to current host for dev
      const replitDomains = process.env.REPL_SLUG;
      const baseUrl = replitDomains 
        ? `https://${replitDomains}.replit.app`
        : `${req.protocol}://${req.get('host')}`;
      
      const shareableLink = `${baseUrl}/share/${shareToken}`;
      res.json({ shareableLink });
    } catch (error) {
      console.error('Generate share link error:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
    }
  });

  // Copy shared activity to user's account
  app.post("/api/activities/copy/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      const { forceUpdate } = req.body; // Client can request an update
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
      
      // Allow demo users to copy community plans
      // If no user ID, use demo-user for community plan discovery
      const userId = currentUserId || 'demo-user';
      console.log('[COPY ACTIVITY] Using userId:', userId, currentUserId ? '(authenticated)' : '(demo user)');
      
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
      
      res.json({
        activity: copiedActivity,
        tasks: copiedTasks,
        isUpdate: !!forceUpdate,
        preservedProgress: preservedCompletions,
        message: forceUpdate 
          ? `Update complete! ${preservedCompletions} completed tasks preserved. Previous version moved to History.`
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
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const plans = await storage.getCommunityPlans(category, search, limit);
      res.json(plans);
    } catch (error) {
      console.error('Get community plans error:', error);
      res.status(500).json({ error: 'Failed to fetch community plans' });
    }
  });

  // Seed community plans (admin endpoint)
  app.post("/api/admin/seed-community-plans", async (req, res) => {
    try {
      const force = req.body.force === true;
      await storage.seedCommunityPlans(force);
      res.json({ success: true, message: 'Community plans seeded successfully' });
    } catch (error) {
      console.error('Seed community plans error:', error);
      res.status(500).json({ error: 'Failed to seed community plans' });
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
        console.log('✅ [CONFIRMATION DETECTED] Creating activity from confirmed plan');

        // Create activity with budget details
        const activity = await storage.createActivity({
          title: generatedPlan.title,
          description: generatedPlan.description,
          category: generatedPlan.domain || generatedPlan.category || 'personal',
          status: 'planning',
          budget: generatedPlan.budget?.total ? Math.round(generatedPlan.budget.total * 100) : undefined, // Convert to cents
          budgetBreakdown: generatedPlan.budget?.breakdown || [],
          budgetBuffer: generatedPlan.budget?.buffer ? Math.round(generatedPlan.budget.buffer * 100) : undefined, // Convert to cents
          userId
        });

        const createdTasks = [];
        if (generatedPlan.tasks && Array.isArray(generatedPlan.tasks)) {
          for (let i = 0; i < generatedPlan.tasks.length; i++) {
            const taskData = generatedPlan.tasks[i];

            // Match budget breakdown to task category
            const budgetItem = generatedPlan.budget?.breakdown?.find(
              (item: any) => item.category.toLowerCase().includes(taskData.category?.toLowerCase() || '') ||
                             (taskData.taskName || taskData.title)?.toLowerCase().includes(item.category.toLowerCase())
            );

            const task = await storage.createTask({
              title: taskData.taskName || taskData.title,
              description: taskData.notes || taskData.description || '',
              category: taskData.category || generatedPlan.domain || 'personal',
              priority: taskData.priority || 'medium',
              timeEstimate: `${taskData.duration || 30} min`,
              cost: budgetItem?.amount ? Math.round(budgetItem.amount * 100) : undefined, // Convert to cents
              costNotes: budgetItem?.notes,
              userId
            });
            await storage.addTaskToActivity(activity.id, task.id, i);
            createdTasks.push(task);
          }
        }

        // Mark session complete
        await storage.updateLifestylePlannerSession(session.id, {
          sessionState: 'completed',
          isComplete: true
        }, userId);

        return res.json({
          message: `✨ **Activity "${activity.title}" created!**\n\n📋 I've created ${createdTasks.length} tasks for you. Check your activities to get started!`,
          activityCreated: true,
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
      
      if (!session) {
        // Session was lost somehow - create new one
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
        
        return res.json({
          message: `⚡ **Boom!** Activity "${activity.title}" created instantly!\n\n📋 **Find it on:**\n• **Home screen** - Your recent activities\n• **Activities pane** - Full details\n• **Tasks section** - ${createdTasks.length} tasks ready to go\n\nLet's make it happen! 🚀`,
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

    // Process with LangGraph planning agent in Quick mode (same as Smart Plan)
    const langGraphResponse = await langGraphPlanningAgent.processMessage(
      parseInt(userId),
      message,
      userProfile,
      session.conversationHistory,
      storage,
      'quick' // Quick mode for faster planning
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
        
        // First time plan is ready - ask for confirmation (only if AI didn't already ask)
        return res.json({
          message: alreadyAskedConfirmation 
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
            }
          );

          // Send final complete message with structured data
          sendEvent('complete', {
            message: response.message,
            extractedInfo: response.extractedInfo,
            readyToGenerate: response.readyToGenerate,
            plan: response.plan,
            domain: response.domain,
            contextChips: response.contextChips
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
      
      // Update the specific category
      journalData[category] = items;
      
      // Save back to preferences
      const updatedPrefs = await storage.upsertUserPreferences(userId, {
        preferences: {
          ...currentPrefs,
          journalData
        }
      });

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
      const { text, media, keywords } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text content required' });
      }

      // Import tag detection utilities
      const { detectCategoriesFromTags } = await import('./config/journalTags.js');
      
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
        detectedCategories = ['Personal Notes'];
        aiConfidence = 0.6; // Medium confidence for unrecognized tags
        console.log(`Unrecognized tags ${tagDetection.detectedTags.join(', ')} routed to Personal Notes`);
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
          detectedCategories = [categoryData.category || 'Personal Notes'];
          detectedKeywords = categoryData.keywords || [];
          aiConfidence = categoryData.confidence || 0.7;
        } catch (aiError) {
          console.error('AI category detection failed:', aiError);
          // Fall back to simple text analysis if AI fails
          detectedCategories = ['Personal Notes'];
          aiConfidence = 0.3;
        }
      }

      // Add journal entries for each detected category (grouped experiences create multiple entries)
      for (const category of detectedCategories) {
        await storage.addPersonalJournalEntry(userId, category, {
          text,
          media,
          keywords: detectedKeywords.length > 0 ? detectedKeywords : keywords,
          aiConfidence
        });
      }

      res.json({
        success: true,
        categories: detectedCategories,
        keywords: detectedKeywords,
        aiConfidence,
        isGroupedExperience
      });
    } catch (error) {
      console.error('Smart entry error:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // Get all journal entries for the current user
  app.get("/api/journal/entries", async (req, res) => {
    try {
      // Disable caching to ensure fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const userId = getUserId(req) || DEMO_USER_ID;
      console.log('[JOURNAL] Fetching entries for user:', userId);
      
      const prefs = await storage.getPersonalJournalEntries(userId);
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

  // ===== CONVERSATIONAL LIFESTYLE PLANNER API ENDPOINTS =====

  // Start a new lifestyle planning session
  app.post("/api/planner/session", async (req, res) => {
    try {
      const userId = getDemoUserId(req);
      
      // Check if user has an active session
      const activeSession = await storage.getActiveLifestylePlannerSession(userId);
      if (activeSession) {
        return res.json({ 
          session: activeSession,
          message: "Welcome back! Let's continue planning.",
          isNewSession: false
        });
      }

      // Create new session
      const session = await storage.createLifestylePlannerSession({
        userId,
        sessionState: 'intake',
        slots: {},
        externalContext: {},
        conversationHistory: [],
        isComplete: false
      });

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
  
  // Sync phone contacts (secured)
  app.post("/api/contacts/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
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

  // Add manual contact (secured)
  app.post("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
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

  // Get user's contacts with JournalMate status (secured)
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
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
            <li><strong>Email:</strong> privacy@journalmate.app</li>
            <li><strong>Data Protection Officer:</strong> dpo@journalmate.app</li>
            <li><strong>Address:</strong> [Your Business Address]</li>
        </ul>
        
        <p><strong>Data Deletion Requests:</strong> You can request deletion of your data by:</p>
        <ul>
            <li>Using the "Delete Account" option in your profile settings</li>
            <li>Visiting: <a href="${req.protocol}://${req.get('host')}/data-deletion">Data Deletion Request Form</a></li>
            <li>Emailing us at: delete@journalmate.app</li>
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
        <p>Need help? Contact us at <a href="mailto:privacy@journalmate.app">privacy@journalmate.app</a></p>
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
        message: 'Please try again or contact support at privacy@journalmate.app'
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
