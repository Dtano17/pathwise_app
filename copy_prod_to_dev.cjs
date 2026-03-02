/**
 * Copy production data to dev database
 * Reads from PROD_DATABASE_URL, writes to DEV_DATABASE_URL
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

const prodPool = new Pool({ connectionString: process.env.PROD_DATABASE_URL });
const devPool = new Pool({ connectionString: process.env.DEV_DATABASE_URL });

async function copyTable(table) {
  try {
    const countResult = await prodPool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
    const count = parseInt(countResult.rows[0].cnt);

    if (count === 0) {
      console.log(`  ${table}: empty, skipping`);
      return { table, rows: 0, status: 'skipped' };
    }

    // Fetch all rows
    const data = await prodPool.query(`SELECT * FROM "${table}"`);
    const columns = Object.keys(data.rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');

    // Insert in batches of 25
    const batchSize = 25;
    let inserted = 0;

    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];

      batch.forEach((row, batchIdx) => {
        const rowPlaceholders = columns.map((col, colIdx) => {
          values.push(row[col]);
          return `$${batchIdx * columns.length + colIdx + 1}`;
        });
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      });

      await devPool.query(
        `INSERT INTO "${table}" (${colList}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
        values
      );
      inserted += batch.length;
    }

    console.log(`  ${table}: ${inserted} rows copied`);
    return { table, rows: inserted, status: 'copied' };
  } catch (e) {
    console.error(`  ${table}: FAILED - ${e.message.split('\n')[0]}`);
    return { table, rows: 0, status: 'failed', error: e.message.split('\n')[0] };
  }
}

async function main() {
  console.log('=== Copying Production Data to Dev ===\n');
  console.log('Source (PROD):', process.env.PROD_DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('Target (DEV):', process.env.DEV_DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('');

  // Get all tables
  const tablesResult = await prodPool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  const allTables = tablesResult.rows.map(r => r.tablename);
  console.log(`Found ${allTables.length} tables\n`);

  // Step 1: Drop FK constraints on dev
  console.log('Step 1: Dropping foreign key constraints on dev...');
  const fks = await devPool.query(`
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

  const fkDefs = [];
  for (const fk of fks.rows) {
    try {
      const def = await devPool.query(`
        SELECT pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = $1 AND n.nspname = 'public'
      `, [fk.constraint_name]);

      if (def.rows.length > 0) {
        fkDefs.push({
          table: fk.table_name,
          name: fk.constraint_name,
          definition: def.rows[0].def
        });
        await devPool.query(`ALTER TABLE "${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}"`);
      }
    } catch (e) {
      // constraint might already be gone
    }
  }
  console.log(`  Dropped ${fkDefs.length} constraints\n`);

  // Step 2: Truncate all dev tables
  console.log('Step 2: Clearing dev tables...');
  for (const table of allTables) {
    try {
      await devPool.query(`TRUNCATE "${table}" CASCADE`);
    } catch (e) {
      // table might not exist in dev
    }
  }
  console.log('  Done\n');

  // Step 3: Copy data
  console.log('Step 3: Copying data...');
  const results = [];
  for (const table of allTables) {
    const result = await copyTable(table);
    results.push(result);
  }

  // Step 4: Reset sequences
  console.log('\nStep 4: Resetting sequences...');
  for (const table of allTables) {
    try {
      const seqResult = await devPool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        AND column_default LIKE 'nextval%'
      `, [table]);

      for (const seq of seqResult.rows) {
        const col = seq.column_name;
        await devPool.query(`
          SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'),
            COALESCE((SELECT MAX("${col}") FROM "${table}"), 1))
        `);
      }
    } catch (e) { /* no sequences */ }
  }
  console.log('  Done');

  // Step 5: Restore FK constraints
  console.log('\nStep 5: Restoring foreign key constraints...');
  let restored = 0;
  const failedFks = [];
  for (const fk of fkDefs) {
    try {
      await devPool.query(`ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" ${fk.definition}`);
      restored++;
    } catch (e) {
      failedFks.push({ ...fk, error: e.message.split('\n')[0] });
    }
  }
  console.log(`  Restored ${restored}/${fkDefs.length} constraints`);
  if (failedFks.length > 0) {
    failedFks.forEach(f => console.log(`  WARNING: ${f.name}: ${f.error}`));
  }

  // Summary
  console.log('\n=== Summary ===');
  const copied = results.filter(r => r.status === 'copied');
  const skipped = results.filter(r => r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`Copied:  ${copied.length} tables (${copied.reduce((a, r) => a + r.rows, 0)} total rows)`);
  console.log(`Skipped: ${skipped.length} tables (empty)`);
  if (failed.length > 0) {
    console.log(`Failed:  ${failed.length} tables:`);
    failed.forEach(f => console.log(`  - ${f.table}: ${f.error}`));
  }

  await prodPool.end();
  await devPool.end();
  console.log('\nDone.');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
