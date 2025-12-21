import { db } from './storage';
import { groups, groupMemberships, groupActivities, groupActivityFeed, activities, activityTasks, tasks } from '@shared/schema';
import { eq } from 'drizzle-orm';

const DEMO_USER_ID = 'demo-user';

// Generate a random invite code (e.g., "ABC-DEF-GHI")
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = [3, 3, 3].map(len =>
    Array.from({length: len}, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  );
  return parts.join('-');
}

interface SampleGroup {
  name: string;
  description: string;
  memberCount: number;
  activityTitle: string;
  activityDescription: string;
  category: string;
  tasks: Array<{ title: string; description: string; completed: boolean; completedAt?: Date }>;
  activityEvents: Array<{
    memberName: string;
    actionType: 'task_completed' | 'task_added' | 'activity_shared';
    taskTitle?: string;
    hoursAgo: number;
  }>;
}

const sampleGroups: SampleGroup[] = [
  {
    name: 'Girls Trip to Miami',
    description: 'Planning the perfect weekend getaway with the squad',
    memberCount: 5,
    activityTitle: 'Miami Weekend Getaway',
    activityDescription: 'Beach vibes, rooftop bars, and unforgettable memories',
    category: 'travel',
    tasks: [
      { title: 'Book beachfront Airbnb', description: 'Look for places in South Beach with pool access', completed: true, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { title: 'Make dinner reservations at Carbone', description: 'Need table for 5 on Saturday night', completed: true, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { title: 'Book spa day at Faena Hotel', description: 'Group spa package with massages and facials', completed: false },
      { title: 'Rent car for weekend', description: 'Convertible or SUV for beach cruising', completed: true, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { title: 'Plan rooftop bar crawl route', description: 'Sugar, Juvia, and E11EVEN', completed: false },
      { title: 'Book boat day trip', description: 'Private yacht charter for Sunday afternoon', completed: false },
      { title: 'Create group playlist', description: 'Summer vibes and dance hits', completed: true, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { title: 'Check weather forecast', description: 'Pack accordingly for Miami heat', completed: true, completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    ],
    activityEvents: [
      { memberName: 'Emma', actionType: 'task_completed', taskTitle: '30-minute morning workout', hoursAgo: 1 },
      { memberName: 'You', actionType: 'task_completed', taskTitle: 'Prep healthy lunch for tomorrow', hoursAgo: 2 },
      { memberName: 'Jessica', actionType: 'task_added', taskTitle: 'Book spa day at resort', hoursAgo: 3 },
      { memberName: 'Sarah', actionType: 'task_completed', taskTitle: 'Book hotel reservations', hoursAgo: 4 },
    ]
  },
  {
    name: 'Family Trip to New Jersey',
    description: 'Planning our November family vacation together',
    memberCount: 4,
    activityTitle: 'Thanksgiving Family Reunion',
    activityDescription: 'Quality time with family, exploring Jersey Shore, and making memories',
    category: 'travel',
    tasks: [
      { title: 'Book family-friendly hotel', description: 'Near Jersey Shore with kitchen facilities', completed: true, completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { title: 'Plan Thanksgiving dinner menu', description: 'Traditional turkey dinner with family favorites', completed: true, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { title: 'Book boardwalk activities', description: 'Arcade games and pier rides for the kids', completed: false },
      { title: 'Research local restaurants', description: 'Family-friendly spots with good reviews', completed: true, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { title: 'Pack winter clothes', description: 'November can be chilly at the shore', completed: false },
      { title: 'Plan day trip to Atlantic City', description: 'Family fun at Steel Pier and Tropicana', completed: false },
      { title: 'Create family photo album', description: 'Bring camera and portable printer', completed: true, completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
    ],
    activityEvents: [
      { memberName: 'Sarah', actionType: 'task_completed', taskTitle: 'Book hotel reservations', hoursAgo: 4 },
      { memberName: 'Dad', actionType: 'task_added', taskTitle: 'Check car maintenance before trip', hoursAgo: 6 },
      { memberName: 'Mom', actionType: 'task_completed', taskTitle: 'Plan Thanksgiving menu', hoursAgo: 8 },
      { memberName: 'Sister', actionType: 'task_completed', taskTitle: 'Research boardwalk hours', hoursAgo: 12 },
    ]
  },
  {
    name: 'Eat Healthier & Workout',
    description: 'AI-curated daily health plan with accountability partners',
    memberCount: 3,
    activityTitle: '30-Day Health Challenge',
    activityDescription: 'Transform our lifestyle with daily workouts and nutritious meals',
    category: 'health',
    tasks: [
      { title: '30-minute morning workout', description: 'Cardio and strength training mix', completed: true, completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      { title: 'Prep healthy lunch for tomorrow', description: 'Grilled chicken salad with quinoa', completed: true, completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { title: 'Track daily water intake', description: 'Aim for 8 glasses throughout the day', completed: false },
      { title: 'Evening yoga session', description: '20 minutes of stretching and meditation', completed: false },
      { title: 'Meal prep for the week', description: 'Sunday batch cooking session', completed: true, completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { title: 'Log food in MyFitnessPal', description: 'Track macros and calories', completed: true, completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { title: 'Join group fitness class', description: 'Tuesday evening spin class', completed: false },
      { title: 'Weekly weigh-in and measurements', description: 'Track progress every Sunday morning', completed: false },
      { title: 'Grocery shopping for healthy snacks', description: 'Stock up on fruits, nuts, and protein bars', completed: true, completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      { title: 'Rest day - active recovery', description: 'Light walk or swimming', completed: false },
    ],
    activityEvents: [
      { memberName: 'Emma', actionType: 'task_completed', taskTitle: '30-minute morning workout', hoursAgo: 1 },
      { memberName: 'You', actionType: 'task_completed', taskTitle: 'Prep healthy lunch for tomorrow', hoursAgo: 2 },
      { memberName: 'Marcus', actionType: 'task_completed', taskTitle: 'Evening yoga session', hoursAgo: 5 },
      { memberName: 'Emma', actionType: 'task_added', taskTitle: 'Try new protein smoothie recipe', hoursAgo: 8 },
    ]
  }
];

export async function seedSampleGroups() {
  console.log('[SEED] Starting sample groups creation...');
  
  try {
    // Check if sample groups already exist
    const existingGroups = await db.select().from(groups)
      .where(eq(groups.createdBy, DEMO_USER_ID));
    
    if (existingGroups.length >= 3) {
      console.log('[SEED] Sample groups already exist, skipping...');
      return;
    }

    // Delete existing sample groups to start fresh
    for (const group of existingGroups) {
      await db.delete(groupActivityFeed).where(eq(groupActivityFeed.groupId, group.id));
      await db.delete(groupActivities).where(eq(groupActivities.groupId, group.id));
      await db.delete(groupMemberships).where(eq(groupMemberships.groupId, group.id));
      await db.delete(groups).where(eq(groups.id, group.id));
    }

    for (const sampleGroup of sampleGroups) {
      console.log(`[SEED] Creating group: ${sampleGroup.name}`);
      
      // Create the group
      const [newGroup] = await db.insert(groups).values({
        name: sampleGroup.name,
        description: sampleGroup.description,
        isPrivate: false,
        inviteCode: generateInviteCode(),
        createdBy: DEMO_USER_ID,
      }).returning();

      // Add demo user as admin
      await db.insert(groupMemberships).values({
        groupId: newGroup.id,
        userId: DEMO_USER_ID,
        role: 'admin',
      });

      // Create linked activity
      const [activity] = await db.insert(activities).values({
        userId: DEMO_USER_ID,
        title: sampleGroup.activityTitle,
        description: sampleGroup.activityDescription,
        category: sampleGroup.category,
        status: 'active',
        isPublic: false,
      }).returning();

      // Create tasks for the activity
      let completedCount = 0;
      const taskIds: string[] = [];
      
      for (const task of sampleGroup.tasks) {
        // First create the task in the tasks table
        const [newTask] = await db.insert(tasks).values({
          userId: DEMO_USER_ID,
          title: task.title,
          description: task.description,
          category: sampleGroup.category,
          priority: 'medium',
          completed: task.completed,
          completedAt: task.completedAt,
        }).returning();
        
        taskIds.push(newTask.id);
        
        // Then link it to the activity
        await db.insert(activityTasks).values({
          activityId: activity.id,
          taskId: newTask.id,
          order: taskIds.length - 1,
        });
        
        if (task.completed) completedCount++;
      }

      // Create group activity with canonical version
      await db.insert(groupActivities).values({
        groupId: newGroup.id,
        activityId: activity.id,
        canonicalVersion: {
          title: sampleGroup.activityTitle,
          description: sampleGroup.activityDescription,
          tasks: sampleGroup.tasks.map((task, index) => ({
            id: `task-${index}`,
            title: task.title,
            description: task.description,
            category: sampleGroup.category,
            priority: 'medium',
            order: index,
          })),
        },
      });

      // Create activity feed events
      for (const event of sampleGroup.activityEvents) {
        const eventTime = new Date(Date.now() - event.hoursAgo * 60 * 60 * 1000);
        
        await db.insert(groupActivityFeed).values({
          groupId: newGroup.id,
          userId: DEMO_USER_ID,
          userName: event.memberName,
          activityType: event.actionType,
          taskTitle: event.taskTitle,
          activityTitle: sampleGroup.activityTitle,
          timestamp: eventTime,
        });
      }

      console.log(`[SEED] ✓ Created group "${sampleGroup.name}" with ${sampleGroup.tasks.length} tasks (${completedCount} completed)`);
    }

    console.log('[SEED] Sample groups created successfully!');
  } catch (error) {
    console.error('[SEED] Error creating sample groups:', error);
    throw error;
  }
}
