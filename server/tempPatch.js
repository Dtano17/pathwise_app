import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const res1 = await client.query(`DELETE FROM user_notifications WHERE type LIKE 'monthly_review%'`);
    console.log('Deleted user notifications:', res1.rowCount);

    const res2 = await client.query(`DELETE FROM smart_notifications WHERE notification_type LIKE 'monthly_review%'`);
    console.log('Deleted smart notifications:', res2.rowCount);

    await client.end();
}

run().catch(console.error);
