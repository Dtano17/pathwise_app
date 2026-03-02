import 'dotenv/config';
import { db } from './server/db.ts';
import { smartNotifications, userNotifications } from './shared/schema.ts';
import { desc } from 'drizzle-orm';

async function main() {
    const sn = await db.select().from(smartNotifications).orderBy(desc(smartNotifications.createdAt)).limit(10);
    console.log('recent smart_notifications:', JSON.stringify(sn, null, 2));

    const un = await db.select().from(userNotifications).orderBy(desc(userNotifications.createdAt)).limit(10);
    console.log('recent user_notifications:', JSON.stringify(un, null, 2));

    process.exit(0);
}

main().catch(console.error);
