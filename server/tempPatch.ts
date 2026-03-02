import { db } from './db';
import { smartNotifications, userNotifications, notificationHistory } from '../db/schema';
import { eq, like, desc } from 'drizzle-orm';

async function main() {
    console.log('Querying Database for monthly review notifications...');
    try {
        // 1. Get smart notifications for monthly review
        const smartLogs = await db.select().from(smartNotifications)
            .where(like(smartNotifications.notificationType, 'monthly_review%'))
            .orderBy(desc(smartNotifications.createdAt))
            .limit(10);

        console.log(`\nFound ${smartLogs.length} Smart Notifications (sample):`);
        for (const log of smartLogs) {
            console.log(`- ID: ${log.id}, Status: ${log.status}, ScheduledAt: ${log.scheduledAt}`);
        }

        // 2. Get user notifications
        const userLogs = await db.select().from(userNotifications)
            .where(like(userNotifications.type, 'monthly_review%'))
            .orderBy(desc(userNotifications.createdAt))
            .limit(10);

        console.log(`\nFound ${userLogs.length} User Notifications (sample):`);
        for (const log of userLogs) {
            console.log(`- ID: ${log.id}, Title: ${log.title}, CreatedAt: ${log.createdAt}`);
        }

        // 3. Clear the backlog if requested
        console.log('\nDeleting corrupted test notifications from backlog...');

        const countQuery = await db.delete(smartNotifications)
            .where(like(smartNotifications.notificationType, 'monthly_review%'))
            .returning({ id: smartNotifications.id });

        console.log(`Deleted ${countQuery.length} smart notifications related to monthly_review.`);

    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}

main();
