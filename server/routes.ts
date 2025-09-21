import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/aiService";
import { insertGoalSchema, insertTaskSchema, insertJournalEntrySchema, insertChatImportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - Replit Auth integration
  await setupAuth(app);

  // Auth routes - from blueprint:javascript_log_in_with_replit
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
        email: "demo@pathwise.ai",
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
      const result = await aiService.processGoalIntoTasks(goalText);
      
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
        chatHistory: data.chatHistory
      });

      // Create chat import record
      const chatImport = await storage.createChatImport({
        ...data,
        userId: DEMO_USER_ID,
        extractedGoals: chatProcessingResult.extractedGoals,
        processedAt: new Date()
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

  const httpServer = createServer(app);
  return httpServer;
}
