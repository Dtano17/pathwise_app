import { db } from "../storage";
import { activities, tasks, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

interface RemixTask {
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  timeEstimate?: string;
  order: number;
  sourceActivityId?: string;
  isDuplicate?: boolean;
}

interface Attribution {
  activityId: string;
  activityTitle: string;
  creatorId: string;
  creatorName: string;
  tasksUsed: number;
}

export interface RemixResult {
  mergedTitle: string;
  mergedDescription: string;
  mergedTasks: RemixTask[];
  attributions: Attribution[];
  stats: {
    originalTaskCount: number;
    finalTaskCount: number;
    duplicatesRemoved: number;
    sourcePlansCount: number;
  };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSimilarTasks(task1: RemixTask, task2: RemixTask): boolean {
  const title1 = normalizeTitle(task1.title);
  const title2 = normalizeTitle(task2.title);
  
  if (title1 === title2) return true;
  
  if (title1.length < 5 || title2.length < 5) return false;
  
  const words1 = new Set(title1.split(' '));
  const words2 = new Set(title2.split(' '));
  
  const intersection = Array.from(words1).filter(w => words2.has(w));
  const union = new Set(Array.from(words1).concat(Array.from(words2)));
  
  const jaccardSimilarity = intersection.length / union.size;
  
  if (jaccardSimilarity > 0.6) return true;
  
  if (title1.includes(title2) || title2.includes(title1)) return true;
  
  return false;
}

function chooseBestTask(task1: RemixTask, task2: RemixTask): RemixTask {
  const desc1Length = (task1.description || '').length;
  const desc2Length = (task2.description || '').length;
  
  if (desc1Length !== desc2Length) {
    return desc1Length > desc2Length ? task1 : task2;
  }
  
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const p1 = priorityOrder[task1.priority] || 0;
  const p2 = priorityOrder[task2.priority] || 0;
  
  if (p1 !== p2) {
    return p1 > p2 ? task1 : task2;
  }
  
  if (task1.timeEstimate && !task2.timeEstimate) return task1;
  if (task2.timeEstimate && !task1.timeEstimate) return task2;
  
  return task1;
}

export async function createRemix(activityIds: string[]): Promise<RemixResult> {
  if (activityIds.length === 0) {
    throw new Error('No activities selected for remix');
  }
  
  if (activityIds.length > 10) {
    throw new Error('Cannot remix more than 10 plans at once');
  }

  const selectedActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      description: activities.description,
      category: activities.category,
      userId: activities.userId,
    })
    .from(activities)
    .where(inArray(activities.id, activityIds));

  if (selectedActivities.length === 0) {
    throw new Error('No valid activities found');
  }

  const userIds = Array.from(new Set(selectedActivities.map(a => a.userId).filter(Boolean))) as string[];
  const userMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    const userRecords = await db
      .select({ id: users.id, username: users.username, firstName: users.firstName })
      .from(users)
      .where(inArray(users.id, userIds));
    
    for (const u of userRecords) {
      userMap.set(u.id, u.firstName || u.username || 'Anonymous');
    }
  }

  const activityTasks = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.goalId, activityIds));

  const allTasks: RemixTask[] = [];
  const attributions: Attribution[] = [];

  for (const activity of selectedActivities) {
    const activityTaskList = activityTasks.filter(t => t.goalId === activity.id);
    
    attributions.push({
      activityId: activity.id,
      activityTitle: activity.title,
      creatorId: activity.userId || '',
      creatorName: userMap.get(activity.userId || '') || 'Anonymous',
      tasksUsed: activityTaskList.length,
    });

    for (let i = 0; i < activityTaskList.length; i++) {
      const t = activityTaskList[i];
      allTasks.push({
        title: t.title,
        description: t.description || undefined,
        category: t.category,
        priority: t.priority as 'low' | 'medium' | 'high',
        dueDate: t.dueDate?.toISOString(),
        timeEstimate: t.timeEstimate || undefined,
        order: allTasks.length,
        sourceActivityId: activity.id,
        isDuplicate: false,
      });
    }
  }

  const originalTaskCount = allTasks.length;
  const deduplicatedTasks: RemixTask[] = [];
  const seenTaskIndices = new Set<number>();

  for (let i = 0; i < allTasks.length; i++) {
    if (seenTaskIndices.has(i)) continue;

    const task = allTasks[i];
    const duplicates: number[] = [i];

    for (let j = i + 1; j < allTasks.length; j++) {
      if (seenTaskIndices.has(j)) continue;
      
      if (areSimilarTasks(task, allTasks[j])) {
        duplicates.push(j);
        seenTaskIndices.add(j);
      }
    }

    if (duplicates.length > 1) {
      let bestTask = task;
      for (const idx of duplicates) {
        bestTask = chooseBestTask(bestTask, allTasks[idx]);
      }
      bestTask.isDuplicate = true;
      deduplicatedTasks.push(bestTask);
    } else {
      deduplicatedTasks.push(task);
    }
    
    seenTaskIndices.add(i);
  }

  for (let i = 0; i < deduplicatedTasks.length; i++) {
    deduplicatedTasks[i].order = i;
  }

  const categoryCounts: Record<string, number> = {};
  for (const t of deduplicatedTasks) {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  }
  const dominantCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'personal';

  const creatorNames = attributions.map(a => a.creatorName).filter(Boolean);
  const uniqueCreators = Array.from(new Set(creatorNames)).slice(0, 3);
  
  let mergedTitle = '';
  if (selectedActivities.length === 2) {
    mergedTitle = `${selectedActivities[0].title} + ${selectedActivities[1].title}`;
  } else {
    mergedTitle = `Remixed Plan: ${dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1)} Goals`;
  }

  const mergedDescription = `A custom plan combining the best from ${selectedActivities.length} community plans.\n\nContributors: ${uniqueCreators.join(', ')}\n\nOriginal tasks: ${originalTaskCount} | After deduplication: ${deduplicatedTasks.length}`;

  return {
    mergedTitle,
    mergedDescription,
    mergedTasks: deduplicatedTasks,
    attributions,
    stats: {
      originalTaskCount,
      finalTaskCount: deduplicatedTasks.length,
      duplicatesRemoved: originalTaskCount - deduplicatedTasks.length,
      sourcePlansCount: selectedActivities.length,
    },
  };
}

export async function reorderRemixTasks(
  tasks: RemixTask[],
  fromIndex: number,
  toIndex: number
): Promise<RemixTask[]> {
  const reordered = [...tasks];
  const [removed] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, removed);
  
  for (let i = 0; i < reordered.length; i++) {
    reordered[i].order = i;
  }
  
  return reordered;
}

export async function removeTaskFromRemix(
  tasks: RemixTask[],
  index: number
): Promise<RemixTask[]> {
  const filtered = tasks.filter((_, i) => i !== index);
  
  for (let i = 0; i < filtered.length; i++) {
    filtered[i].order = i;
  }
  
  return filtered;
}
