/**
 * Migration Script: Add Budget Breakdown and Cost Tracking
 *
 * This script adds new fields to support detailed budget tracking:
 * - activities.budget_breakdown (JSONB) - Detailed budget items from AI planner
 * - activities.budget_buffer (INTEGER) - Recommended buffer for unexpected costs
 * - tasks.cost (INTEGER) - Cost associated with specific task
 * - tasks.cost_notes (TEXT) - Details about the task cost
 *
 * Run with: npx tsx scripts/migrate-budget-fields.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔌 Connecting to database...');
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    console.log('📊 Adding budget_breakdown column to activities table...');
    await client`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS budget_breakdown JSONB DEFAULT '[]'
    `;

    console.log('📊 Adding budget_buffer column to activities table...');
    await client`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS budget_buffer INTEGER
    `;

    console.log('💰 Adding cost column to tasks table...');
    await client`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS cost INTEGER
    `;

    console.log('📝 Adding cost_notes column to tasks table...');
    await client`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS cost_notes TEXT
    `;

    console.log('📚 Adding column comments...');
    await client`
      COMMENT ON COLUMN activities.budget_breakdown IS 'Detailed budget breakdown from AI planner with category, amount, and notes'
    `;
    await client`
      COMMENT ON COLUMN activities.budget_buffer IS 'Recommended buffer for unexpected costs (in cents)'
    `;
    await client`
      COMMENT ON COLUMN tasks.cost IS 'Optional cost associated with this task (in cents)'
    `;
    await client`
      COMMENT ON COLUMN tasks.cost_notes IS 'Details about the cost (e.g., "Round-trip flight LAX-NYC")'
    `;

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('New fields added:');
    console.log('  - activities.budget_breakdown (JSONB, default [])');
    console.log('  - activities.budget_buffer (INTEGER, nullable)');
    console.log('  - tasks.cost (INTEGER, nullable)');
    console.log('  - tasks.cost_notes (TEXT, nullable)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    console.log('🔌 Closing database connection...');
    await client.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
