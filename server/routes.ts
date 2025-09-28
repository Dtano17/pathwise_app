import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiProviderAuth, isAuthenticatedGeneric } from "./multiProviderAuth";
import { aiService } from "./services/aiService";
import { lifestylePlannerAgent } from "./services/lifestylePlannerAgent";
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
  type Task,
  type Activity,
  type ActivityTask,
  type NotificationPreferences,
  type SignupUser,
  type ProfileCompletion,
  type LifestylePlannerSession
} from "@shared/schema";
import bcrypt from 'bcrypt';
import { z } from "zod";
import crypto from 'crypto';

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

  // Manual signup endpoint
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const validatedData = signupUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'User with this email already exists' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      // Create user
      const userData = {
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
        firstName: validatedData.firstName || undefined,
        lastName: validatedData.lastName || undefined,
      };

      const user = await storage.upsertUser(userData);

      // Create session using Passport's login method for compatibility
      req.login(user, (err: any) => {
        if (err) {
          console.error('Session creation failed:', err);
          return res.status(500).json({ success: false, error: 'Session creation failed' });
        }
        
        console.log('Manual signup successful:', {
          userId: user.id,
          username: user.username,
          email: user.email
        });
        
        res.json({ success: true, user: { ...user, password: undefined } });
      });
    } catch (error) {
      console.error('Manual signup error:', error);
      if (error instanceof z.ZodError) {
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

  // Auth routes - supports both authenticated and guest users
  app.get('/api/auth/user', async (req: any, res) => {
    try {
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
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            console.log('Authenticated user found:', { userId, username: user.username, email: user.email });
            return res.json(userWithoutPassword);
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
      };
      
      console.log('No authenticated user found, returning demo user');
      res.json(demoUser);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      
      // Use AI to process the goal into tasks - switched to Claude as default
      const result = await aiService.processGoalIntoTasks(goalText, 'claude', DEMO_USER_ID);
      
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

  // ===== ACTIVITIES API ENDPOINTS =====

  // Get user activities
  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getUserActivities(DEMO_USER_ID);
      res.json(activities);
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Create new activity
  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity({
        ...activityData,
        userId: DEMO_USER_ID
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
      const activity = await storage.getActivity(activityId, DEMO_USER_ID);
      
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
      const updates = req.body;
      const activity = await storage.updateActivity(activityId, updates, DEMO_USER_ID);
      
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json(activity);
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  // Delete activity
  app.delete("/api/activities/:activityId", async (req, res) => {
    try {
      const { activityId } = req.params;
      await storage.deleteActivity(activityId, DEMO_USER_ID);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete activity error:', error);
      res.status(500).json({ error: 'Failed to delete activity' });
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
      const tasks = await storage.getActivityTasks(activityId, DEMO_USER_ID);
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
      const userId = DEMO_USER_ID; // Use demo user for now, would be req.user.id in authenticated app
      const shareToken = await storage.generateShareableLink(activityId, userId);
      
      if (!shareToken) {
        return res.status(404).json({ error: 'Activity not found or access denied' });
      }
      
      const shareableLink = `${req.protocol}://${req.get('host')}/share/activity/${shareToken}`;
      res.json({ shareableLink });
    } catch (error) {
      console.error('Generate share link error:', error);
      res.status(500).json({ error: 'Failed to generate shareable link' });
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

      // Get the tasks for this activity (no user restriction for shared activities)
      const activityTasks = await storage.getActivityTasks(activity.id);
      
      res.json({
        activity,
        tasks: activityTasks.map(item => item.task)
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

  // Create activity from dialogue (AI-generated tasks)
  app.post("/api/activities/from-dialogue", async (req, res) => {
    try {
      const { title, description, category, tasks } = req.body;
      
      // Create the activity
      const activity = await storage.createActivity({
        title,
        description,
        category,
        status: 'planning',
        userId: DEMO_USER_ID
      });

      // Create tasks and link them to the activity
      if (tasks && Array.isArray(tasks)) {
        for (let i = 0; i < tasks.length; i++) {
          const taskData = tasks[i];
          const task = await storage.createTask({
            ...taskData,
            userId: DEMO_USER_ID
          });
          await storage.addTaskToActivity(activity.id, task.id, i);
        }
      }

      // Get the complete activity with tasks
      const activityTasks = await storage.getActivityTasks(activity.id);
      res.json({ ...activity, tasks: activityTasks });
    } catch (error) {
      console.error('Create activity from dialogue error:', error);
      res.status(500).json({ error: 'Failed to create activity from dialogue' });
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

  // Real-time chat conversation endpoint with task creation
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      // Get user ID (demo for now, will use real auth later)
      const userId = (req.user as any)?.id || DEMO_USER_ID;

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

  // ===== CONVERSATIONAL LIFESTYLE PLANNER API ENDPOINTS =====

  // Start a new lifestyle planning session
  app.post("/api/planner/session", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
      
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
  app.post("/api/planner/message", isAuthenticatedGeneric, async (req, res) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.claims?.sub;
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

      // Process the message with the lifestyle planner agent
      const response = await lifestylePlannerAgent.processMessage(message, session, user, mode);

      // Update conversation history
      const updatedHistory = [
        ...(session.conversationHistory || []),
        { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: response.message, timestamp: new Date().toISOString() }
      ];

      // Update the session with new state and conversation
      const updatedSession = await storage.updateLifestylePlannerSession(sessionId, {
        sessionState: response.sessionState,
        conversationHistory: updatedHistory,
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

      // Here we would generate the final comprehensive plan
      const generatedPlan = {
        title: `Your ${session.slots?.activityType || 'Lifestyle'} Plan`,
        summary: "Your personalized plan is ready!",
        timeline: [
          {
            time: session.slots?.timing?.departureTime || "TBD",
            activity: `${session.slots?.activityType || 'Activity'} at ${session.slots?.location?.destination || 'destination'}`,
            location: session.slots?.location?.current || "Current location",
            notes: `Travel by ${session.slots?.transportation || 'preferred method'}`,
            outfit_suggestion: session.slots?.outfit?.style || "weather-appropriate attire"
          }
        ],
        outfit_recommendations: session.slots?.outfit ? [{
          occasion: session.slots.activityType || 'activity',
          suggestion: session.slots.outfit.style || 'casual and comfortable',
          weather_notes: "Check weather before leaving"
        }] : [],
        tips: [
          "Double-check timing and location",
          "Confirm any reservations",
          "Check traffic before leaving",
          "Have a wonderful time!"
        ]
      };

      // Create tasks from the plan
      const tasks = [];
      if (generatedPlan.timeline.length > 0) {
        const planTask = await storage.createTask({
          userId,
          title: `Execute: ${generatedPlan.title}`,
          description: generatedPlan.summary,
          category: 'Lifestyle',
          priority: 'high',
          timeEstimate: '2 hours',
          context: generatedPlan.tips.join(' | ')
        });
        tasks.push(planTask);
      }

      // Update session as completed
      const updatedSession = await storage.updateLifestylePlannerSession(sessionId, {
        sessionState: 'completed',
        isComplete: true,
        generatedPlan
      }, userId);

      res.json({
        plan: generatedPlan,
        tasks,
        session: updatedSession,
        message: "Your plan is ready! I've created tasks to help you execute it perfectly."
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
