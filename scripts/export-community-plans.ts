import { db } from '../server/storage.js';
import { activities, activityTasks } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Export community plans from dev database to SQL file for production import
 * Usage: npx tsx scripts/export-community-plans.ts
 */

// SQL escape helper
function escapeSql(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    // JSON columns
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // String - escape single quotes
  return `'${value.toString().replace(/'/g, "''")}'`;
}

// Safe boolean escape - preserves NULL semantics
function escapeBool(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return value ? 'true' : 'false';
}

// Format timestamp for PostgreSQL
function formatTimestamp(date: Date | null | undefined): string {
  if (!date) return 'NULL';
  return `'${date.toISOString()}'`;
}

async function exportCommunityPlans() {
  console.log('[EXPORT] Starting community plans export...\n');

  try {
    // 1. Fetch all community plans (activities with featuredInCommunity = true)
    const communityActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.featuredInCommunity, true));

    console.log(`[EXPORT] Found ${communityActivities.length} community plans\n`);

    if (communityActivities.length === 0) {
      console.log('[EXPORT] No community plans found. Exiting.');
      return;
    }

    // 2. Fetch all tasks for these activities
    const activityIds = communityActivities.map(a => a.id);
    const allTasks = await db
      .select()
      .from(activityTasks)
      .where(eq(activityTasks.activityId, activityIds[0])); // We'll do this properly below

    // Fetch tasks for each activity
    const tasksByActivity = new Map<string, any[]>();
    for (const activity of communityActivities) {
      const tasks = await db
        .select()
        .from(activityTasks)
        .where(eq(activityTasks.activityId, activity.id));
      tasksByActivity.set(activity.id, tasks);
    }

    // 3. Generate SQL INSERT statements
    let sql = `-- Community Plans Export
-- Generated: ${new Date().toISOString()}
-- Total Plans: ${communityActivities.length}
--
-- Instructions:
-- 1. Open your Production Database in Replit
-- 2. Copy this entire file
-- 3. Paste and execute in the SQL query panel
-- 4. Refresh your Discover Plans page
--

-- Start transaction
BEGIN;

-- Create community user if not exists
INSERT INTO users (id, username, email, source, first_name, last_name)
VALUES (
  'community-plans-user',
  'community',
  'community@journalmate.demo',
  'manual',
  'Community',
  'Creator'
)
ON CONFLICT (id) DO NOTHING;

`;

    // Generate INSERT for each activity
    for (const activity of communityActivities) {
      const tasks = tasksByActivity.get(activity.id) || [];
      
      sql += `\n-- Activity: ${activity.title}\n`;
      sql += `-- Category: ${activity.category} | Tasks: ${tasks.length}\n`;
      
      // Activity INSERT
      sql += `INSERT INTO activities (
  id, user_id, title, description, category,
  start_date, end_date, timeline,
  plan_summary, is_public, share_token, shareable_link, social_text,
  tags, share_title, backdrop, target_group_id,
  view_count, like_count, trending_score, featured_in_community,
  creator_name, creator_avatar,
  rating, feedback, highlights,
  status, completed_at, archived,
  copied_from_share_token, is_archived,
  created_at, updated_at
) VALUES (
  ${escapeSql(activity.id)},
  'community-plans-user',
  ${escapeSql(activity.title)},
  ${escapeSql(activity.description)},
  ${escapeSql(activity.category)},
  ${formatTimestamp(activity.startDate)},
  ${formatTimestamp(activity.endDate)},
  ${escapeSql(activity.timeline)},
  ${escapeSql(activity.planSummary)},
  ${activity.isPublic},
  ${escapeSql(activity.shareToken)},
  ${escapeSql(activity.shareableLink)},
  ${escapeSql(activity.socialText)},
  ${escapeSql(activity.tags)},
  ${escapeSql(activity.shareTitle)},
  ${escapeSql(activity.backdrop)},
  ${escapeSql(activity.targetGroupId)},
  ${activity.viewCount || 0},
  ${activity.likeCount || 0},
  ${activity.trendingScore || 0},
  ${activity.featuredInCommunity},
  ${escapeSql(activity.creatorName)},
  ${escapeSql(activity.creatorAvatar)},
  ${escapeSql(activity.rating)},
  ${escapeSql(activity.feedback)},
  ${escapeSql(activity.highlights)},
  ${escapeSql(activity.status)},
  ${formatTimestamp(activity.completedAt)},
  ${activity.archived},
  ${escapeSql(activity.copiedFromShareToken)},
  ${activity.isArchived},
  ${formatTimestamp(activity.createdAt)},
  ${formatTimestamp(activity.updatedAt)}
)
ON CONFLICT (id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  like_count = EXCLUDED.like_count,
  trending_score = EXCLUDED.trending_score,
  updated_at = EXCLUDED.updated_at;

`;

      // Tasks INSERT
      if (tasks.length > 0) {
        sql += `-- Tasks for: ${activity.title}\n`;
        for (const task of tasks) {
          sql += `INSERT INTO activity_tasks (
  id, activity_id, user_id, title, description, category,
  priority, time_estimate, scheduled_at,
  completed, completed_type, completed_at, completed_value,
  created_at, updated_at
) VALUES (
  ${escapeSql(task.id)},
  ${escapeSql(task.activityId)},
  'community-plans-user',
  ${escapeSql(task.title)},
  ${escapeSql(task.description)},
  ${escapeSql(task.category)},
  ${escapeSql(task.priority)},
  ${escapeSql(task.timeEstimate)},
  ${formatTimestamp(task.scheduledAt)},
  ${escapeBool(task.completed)},
  ${escapeSql(task.completedType)},
  ${formatTimestamp(task.completedAt)},
  ${escapeSql(task.completedValue)},
  ${formatTimestamp(task.createdAt)},
  ${formatTimestamp(task.updatedAt)}
)
ON CONFLICT (id) DO NOTHING;

`;
        }
      }
    }

    sql += `\n-- Commit transaction
COMMIT;

-- Verify import
SELECT 
  COUNT(*) as total_plans,
  COUNT(DISTINCT category) as categories
FROM activities
WHERE featured_in_community = true;

-- Done! Your community plans are now in production 🎉
`;

    // 4. Write to file
    const outputPath = path.join(process.cwd(), 'scripts', 'export-community-plans.sql');
    fs.writeFileSync(outputPath, sql, 'utf-8');

    console.log(`[EXPORT] ✅ Export complete!`);
    console.log(`[EXPORT] File: ${outputPath}`);
    console.log(`[EXPORT] Plans exported: ${communityActivities.length}`);
    console.log(`\n[EXPORT] Next steps:`);
    console.log(`  1. Open your Production Database in Replit`);
    console.log(`  2. Copy the contents of: scripts/export-community-plans.sql`);
    console.log(`  3. Paste and execute in production SQL panel`);
    console.log(`  4. Refresh Discover Plans page - you should see all ${communityActivities.length} plans!\n`);

  } catch (error) {
    console.error('[EXPORT] Error:', error);
    process.exit(1);
  }
}

// Run export
exportCommunityPlans()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
