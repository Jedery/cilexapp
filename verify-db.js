// Run after applying schema.sql in the Supabase dashboard:
//   node verify-db.js
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://upxozncqcmxofdpbkvyl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S2ER78SSPMxXXR_FbtpQlQ_LJdagV9r';

// Pass ws for Node.js < 22 which lacks native WebSocket
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
});

const TABLES = ['bookings', 'products', 'team', 'locations', 'notifications', 'notif_read', 'app_settings'];

async function verify() {
  console.log('Verifying Supabase tables...\n');
  let allOk = true;

  for (const table of TABLES) {
    const { data, error } = await sb.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ✗ ${table.padEnd(16)} — ${error.message}`);
      allOk = false;
    } else {
      console.log(`  ✓ ${table}`);
    }
  }

  console.log(allOk ? '\nAll tables ready. Supabase is connected ✓' : '\nSome tables missing — run schema.sql first.');
  process.exit(allOk ? 0 : 1);
}

verify().catch(e => { console.error('Error:', e.message); process.exit(1); });
