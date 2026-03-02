/**
 * Fix the 3 tables that failed due to JSON type mismatch
 * READ-ONLY on production, writes only to dev
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

const prodPool = new Pool({ connectionString: process.env.PROD_DATABASE_URL });
const devPool = new Pool({ connectionString: process.env.DEV_DATABASE_URL });

const TABLES = ['activities', 'lifestyle_planner_sessions', 'scheduling_suggestions'];

async function copyWithJsonFix(table) {
  try {
    const data = await prodPool.query(`SELECT * FROM "${table}"`);
    if (data.rows.length === 0) {
      console.log(`  ${table}: empty, skipping`);
      return;
    }

    // Get column types from dev to identify JSON columns
    const typesResult = await devPool.query(
      `SELECT column_name, udt_name FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'`,
      [table]
    );
    const jsonCols = new Set(
      typesResult.rows
        .filter(r => r.udt_name === 'jsonb' || r.udt_name === 'json')
        .map(r => r.column_name)
    );

    // Clear dev table
    await devPool.query(`TRUNCATE "${table}" CASCADE`);

    const columns = Object.keys(data.rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    // Insert row by row with JSON casting
    let inserted = 0;
    let failed = 0;
    for (const row of data.rows) {
      const values = columns.map(col => {
        const val = row[col];
        if (val !== null && jsonCols.has(col) && typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });

      const placeholders = columns.map((col, i) => {
        if (jsonCols.has(col)) return `$${i + 1}::jsonb`;
        return `$${i + 1}`;
      }).join(', ');

      try {
        await devPool.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (e) {
        failed++;
        if (failed <= 3) {
          console.error(`    Row error: ${e.message.split('\n')[0]}`);
        }
      }
    }
    console.log(`  ${table}: ${inserted}/${data.rows.length} rows copied${failed > 0 ? ` (${failed} failed)` : ''}`);
  } catch (e) {
    console.error(`  ${table}: FAILED - ${e.message.split('\n')[0]}`);
  }
}

async function main() {
  console.log('=== Fixing 3 JSON tables (READ-ONLY on production) ===\n');

  console.log('Copying tables with JSON fix...');
  for (const t of TABLES) {
    await copyWithJsonFix(t);
  }

  // Restore the 6 FK constraints that failed because activities wasn't loaded
  console.log('\nRestoring activity FK constraints...');
  const fks = [
    { table: 'activity_bookmarks', name: 'activity_bookmarks_activity_id_activities_id_fk' },
    { table: 'activity_feedback', name: 'activity_feedback_activity_id_activities_id_fk' },
    { table: 'activity_tasks', name: 'activity_tasks_activity_id_activities_id_fk' },
    { table: 'group_activities', name: 'group_activities_activity_id_activities_id_fk' },
    { table: 'plan_engagement', name: 'plan_engagement_activity_id_activities_id_fk' },
    { table: 'share_links', name: 'share_links_activity_id_activities_id_fk' },
  ];

  for (const fk of fks) {
    try {
      await devPool.query(
        `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY (activity_id) REFERENCES activities(id)`
      );
      console.log(`  ${fk.name}: OK`);
    } catch (e) {
      console.log(`  ${fk.name}: ${e.message.split('\n')[0]}`);
    }
  }

  await prodPool.end();
  await devPool.end();
  console.log('\nDone.');
}

main();
