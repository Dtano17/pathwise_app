import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiProviderAuth, isAuthenticatedGeneric } from "./multiProviderAuth";
import { aiService } from "./services/aiService";
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
  type Task,
  type NotificationPreferences
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Replit Auth integration
  await setupAuth(app);

  // Multi-provider OAuth setup (Google, Facebook)
  await setupMultiProviderAuth(app);

  // Auth routes - supports both Replit auth and multi-provider OAuth
  app.get('/api/auth/user', isAuthenticatedGeneric, async (req: any, res) => {
    try {
      let userId;
      if (req.user?.claims?.sub) {
        // Replit auth user
        userId = req.user.claims.sub;
      } else if (req.user?.id) {
        // Multi-provider OAuth user
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "No valid user session" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // AI-powered goal processing
  app.post("/api/goals/process", async (req, res) => {
    try {
      const { goalText } = req.body;
      
      if (!goalText || typeof goalText !== 'string') {
        return res.status(400).json({ error: 'Goal text is required' });
      }

      console.log('Processing goal:', goalText);
      
      // Use AI to process the goal into tasks
      const result = await aiService.processGoalIntoTasks(goalText, 'openai', DEMO_USER_ID);
      
      // Create the goal record
      const goal = await storage.createGoal({
        userId: DEMO_USER_ID,
        title: goalText,
        description: `Generated ${result.tasks.length} tasks from: ${goalText}`,
        category: result.goalCategory,
        priority: result.goalPriority
      });

      // Create the tasks
      const tasks = await Promise.all(
        result.tasks.map(task => 
          storage.createTask({
            ...task,
            userId: DEMO_USER_ID,
            goalId: goal.id
          })
        )
      );

      res.json({
        goal,
        tasks,
        planTitle: result.planTitle,
        summary: result.summary,
        estimatedTimeframe: result.estimatedTimeframe,
        motivationalNote: result.motivationalNote,
        message: `Created ${tasks.length} actionable tasks from your goal!`
      });
    } catch (error) {
      console.error('Goal processing error:', error);
      res.status(500).json({ error: 'Failed to process goal' });
    }
  });

  // Get user tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getUserTasks(DEMO_USER_ID);
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
      const task = await storage.completeTask(taskId, DEMO_USER_ID);
      
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
      const { reason } = req.body;
      
      // For now, just mark it as skipped by updating with a note
      const task = await storage.updateTask(taskId, {
        description: `${req.body.description || ''} [Skipped: ${reason || 'No reason provided'}]`
      }, DEMO_USER_ID);

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
      const snoozeSchema = z.object({
        hours: z.number().int().positive().max(168) // Max 1 week
      });
      
      const { hours } = snoozeSchema.parse(req.body);
      
      // Calculate new due date (current time + hours)
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);
      
      const task = await storage.updateTask(taskId, {
        dueDate: snoozeUntil
      }, DEMO_USER_ID);

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
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...taskData,
        userId: DEMO_USER_ID
      });
      
      res.json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(400).json({ error: 'Invalid task data' });
    }
  });

  // Get progress dashboard data
  app.get("/api/progress", async (req, res) => {
    try {
      const tasks = await storage.getUserTasks(DEMO_USER_ID);
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate today's progress
      const todayTasks = tasks.filter(task => {
        const taskDate = task.createdAt?.toISOString().split('T')[0];
        return taskDate === today;
      });
      
      const completedToday = todayTasks.filter(task => task.completed).length;
      const totalToday = todayTasks.length;
      
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
      const completedTasks = tasks.filter(task => task.completed);
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
      const entry = await storage.getUserJournalEntry(DEMO_USER_ID, date);
      res.json(entry || null);
    } catch (error) {
      console.error('Get journal error:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });

  app.post("/api/journal", async (req, res) => {
    try {
      const entryData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry({
        ...entryData,
        userId: DEMO_USER_ID
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
      const updates = req.body;
      const entry = await storage.updateJournalEntry(entryId, updates, DEMO_USER_ID);
      
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
      const data = insertChatImportSchema.parse(req.body);
      
      if (!data.chatHistory || !Array.isArray(data.chatHistory) || data.chatHistory.length === 0) {
        return res.status(400).json({ error: 'Chat history is required and must be a non-empty array' });
      }

      // Process the chat history to extract goals and tasks
      const chatProcessingResult = await aiService.processChatHistory({
        source: data.source,
        conversationTitle: data.conversationTitle || 'Imported Conversation',
        chatHistory: data.chatHistory as Array<{role: 'user' | 'assistant', content: string, timestamp?: string}>
      }, DEMO_USER_ID);

      // Create chat import record
      const chatImport = await storage.createChatImport({
        ...data,
        userId: DEMO_USER_ID,
        extractedGoals: chatProcessingResult.extractedGoals
      });

      // Create tasks from the chat processing
      const tasks = await Promise.all(
        chatProcessingResult.tasks.map(task =>
          storage.createTask({
            ...task,
            userId: DEMO_USER_ID,
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
      const imports = await storage.getUserChatImports(DEMO_USER_ID);
      res.json(imports);
    } catch (error) {
      console.error('Get chat imports error:', error);
      res.status(500).json({ error: 'Failed to fetch chat imports' });
    }
  });

  app.get("/api/chat/imports/:id", async (req, res) => {
    try {
      const chatImport = await storage.getChatImport(req.params.id, DEMO_USER_ID);
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
  app.get("/api/user/priorities", async (req, res) => {
    try {
      const priorities = await storage.getUserPriorities(DEMO_USER_ID);
      res.json(priorities);
    } catch (error) {
      console.error('Get priorities error:', error);
      res.status(500).json({ error: 'Failed to fetch priorities' });
    }
  });

  app.post("/api/user/priorities", async (req, res) => {
    try {
      const data = insertPrioritySchema.parse(req.body);
      const priority = await storage.createPriority({
        ...data,
        userId: DEMO_USER_ID,
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

  app.delete("/api/user/priorities/:id", async (req, res) => {
    try {
      await storage.deletePriority(req.params.id, DEMO_USER_ID);
      res.json({ message: 'Priority deleted successfully' });
    } catch (error) {
      console.error('Delete priority error:', error);
      res.status(500).json({ error: 'Failed to delete priority' });
    }
  });

  // Notification Preferences
  app.get("/api/notifications/preferences", async (req, res) => {
    try {
      let preferences = await storage.getUserNotificationPreferences(DEMO_USER_ID);
      
      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId: DEMO_USER_ID,
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

  app.patch("/api/notifications/preferences", async (req, res) => {
    try {
      const updates = insertNotificationPreferencesSchema.partial().parse(req.body);
      const preferences = await storage.updateNotificationPreferences(DEMO_USER_ID, updates);
      
      if (!preferences) {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      res.json({ success: true, preferences });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Real-time chat conversation endpoint
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      // Get user ID (demo for now, will use real auth later)
      const userId = req.user?.id || DEMO_USER_ID;

      // Create a conversation with the AI
      const aiResponse = await aiService.chatConversation(message, conversationHistory);
      
      res.json({
        message: aiResponse.message,
        actionPlan: aiResponse.actionPlan,
        extractedGoals: aiResponse.extractedGoals,
        tasks: aiResponse.tasks
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
  app.get("/api/user/profile", async (req, res) => {
    try {
      // Get authenticated user ID, fallback to demo user for backward compatibility
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub || DEMO_USER_ID;
      const profileData = insertUserProfileSchema.parse(req.body);
      const profile = await storage.upsertUserProfile(userId, profileData);
      res.json(profile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
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
      const date = req.query.date as string;
      const suggestions = await storage.getUserSchedulingSuggestions(DEMO_USER_ID, date);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching scheduling suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch scheduling suggestions' });
    }
  });

  app.post("/api/scheduling/generate", async (req, res) => {
    try {
      const { targetDate } = z.object({ targetDate: z.string() }).parse(req.body);
      
      if (!targetDate) {
        return res.status(400).json({ error: 'Target date is required' });
      }
      
      // Generate smart scheduling suggestions
      const suggestions = await generateSchedulingSuggestions(DEMO_USER_ID, targetDate);
      
      res.json({ success: true, suggestions, message: `Generated ${suggestions.length} scheduling suggestions` });
    } catch (error) {
      console.error('Error generating scheduling suggestions:', error);
      res.status(500).json({ error: 'Failed to generate scheduling suggestions' });
    }
  });

  app.post("/api/scheduling/suggestions/:suggestionId/accept", async (req, res) => {
    try {
      const { suggestionId } = req.params;
      
      const suggestion = await storage.acceptSchedulingSuggestion(suggestionId, DEMO_USER_ID);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Scheduling suggestion not found' });
      }
      
      // Create reminders for each task in the accepted schedule
      await createRemindersFromSchedule(suggestion, DEMO_USER_ID);
      
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
      const userId = req.user?.id || req.user?.claims?.sub;
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
      const userId = req.user?.id || req.user?.claims?.sub;
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
      const userId = req.user?.id || req.user?.claims?.sub;
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
