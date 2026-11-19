// Creates tables and loads demo data. Safe to run multiple times.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const { seed } = require('./seed');

async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log('Waiting for database...'); await new Promise(r => setTimeout(r, 2000)); }
  }
  throw new Error('Database not reachable');
}

(async () => {
  await waitForDb();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(424242)');   // only one initializer at a time
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    await seed(client);
  } finally {
    await client.query('SELECT pg_advisory_unlock(424242)').catch(() => {});
    client.release();
    await pool.end();
  }
  console.log('Database ready.');
})().catch(err => { console.error(err); process.exit(1); });
