const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

const CONNECTION = 'postgresql://postgres:jjDjQad5vuWbV3A0dNZj@db.upxozncqcmxofdpbkvyl.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString: CONNECTION,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    process.stdout.write('Connecting to Supabase... ');
    await client.connect();
    console.log('✓');

    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Split on semicolons so we can run statements individually
    // and skip blank/comment-only blocks
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        // Print first line of each statement as progress indicator
        const preview = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--')) || stmt;
        console.log(' ✓', preview.trim().slice(0, 80));
      } catch (e) {
        // already exists errors are fine
        if (e.code === '42P07' || e.code === '42710' || e.message.includes('already exists')) {
          console.log(' · skipped (already exists):', stmt.trim().slice(0, 60));
        } else {
          console.error(' ✗', e.message, '\n   SQL:', stmt.trim().slice(0, 80));
        }
      }
    }

    console.log('\nMigration complete ✓');
  } catch (err) {
    console.error('\nConnection failed:', err.message);
    console.log('\nAlternative: paste schema.sql into Supabase Dashboard → SQL Editor → Run');
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

migrate();
