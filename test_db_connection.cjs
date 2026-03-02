/**
 * Database Connection Tester
 * Uses DB_ENV flag from .env to toggle between dev and production
 *
 * Usage:
 *   node test_db_connection.js            -- uses DB_ENV flag from .env
 *   node test_db_connection.js dev        -- force test dev database
 *   node test_db_connection.js production -- force test production database
 *   node test_db_connection.js both       -- test both databases
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

function getDbConfig(env) {
  if (env === 'dev') {
    return {
      label: 'DEVELOPMENT',
      url: process.env.DEV_DATABASE_URL,
      host: process.env.DEV_PGHOST,
      database: process.env.DEV_PGDATABASE,
      port: process.env.DEV_PGPORT,
      user: process.env.DEV_PGUSER,
      password: process.env.DEV_PGPASSWORD,
    };
  } else {
    return {
      label: 'PRODUCTION',
      url: process.env.PROD_DATABASE_URL,
      host: process.env.PROD_PGHOST,
      database: process.env.PROD_PGDATABASE,
      port: process.env.PROD_PGPORT,
      user: process.env.PROD_PGUSER,
      password: process.env.PROD_PGPASSWORD,
    };
  }
}

function maskPassword(url) {
  if (!url) return 'NOT SET';
  return url.replace(/:[^:@]+@/, ':****@');
}

async function testConnection(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${config.label} DATABASE`);
  console.log(`${'='.repeat(60)}`);
  console.log('Host:     ', config.host || 'NOT SET');
  console.log('Database: ', config.database || 'NOT SET');
  console.log('Port:     ', config.port || 'NOT SET');
  console.log('User:     ', config.user || 'NOT SET');
  console.log('Password: ', config.password ? '****' + config.password.slice(-4) : 'NOT SET');
  console.log('URL:      ', maskPassword(config.url));
  console.log('');

  if (!config.url) {
    console.log('STATUS: SKIPPED - no connection URL set');
    return;
  }

  const pool = new Pool({ connectionString: config.url });
  try {
    const r = await pool.query('SELECT current_database(), current_user, version()');
    console.log('STATUS:   CONNECTED');
    console.log('DB Name: ', r.rows[0].current_database);
    console.log('DB User: ', r.rows[0].current_user);
    console.log('Version: ', r.rows[0].version);

    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log(`Tables:   ${tables.rows.length} found`);
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
  } catch (e) {
    console.log('STATUS:   FAILED');
    console.log('Error:   ', e.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check password in .env (watch for 0 vs O, l vs 1)');
    console.log('  2. Check host endpoint is correct');
    console.log('  3. Verify project is not suspended in Neon console');
    console.log('  4. Try resetting password in Neon console');
  } finally {
    await pool.end();
  }
}

async function main() {
  const arg = process.argv[2]?.toLowerCase();
  const flag = process.env.DB_ENV?.toLowerCase() || 'dev';

  console.log('Database Connection Tester');
  console.log('DB_ENV flag in .env:', flag);

  if (arg === 'both') {
    await testConnection(getDbConfig('dev'));
    await testConnection(getDbConfig('production'));
  } else if (arg === 'dev' || arg === 'production' || arg === 'prod') {
    const env = arg === 'prod' ? 'production' : arg;
    await testConnection(getDbConfig(env));
  } else {
    // Use the DB_ENV flag from .env
    console.log(`Using DB_ENV="${flag}" from .env`);
    await testConnection(getDbConfig(flag));
  }

  console.log('\nDone.');
}

main();
