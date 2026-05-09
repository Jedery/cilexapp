// ─── DB LAYER ────────────────────────────────────────────────────
// Bridges between the in-memory global arrays (state.js) and Supabase.
//
// Strategy:
//   • On startup  → dbLoadAll() pulls Supabase → updates globals + localStorage.
//   • On every write → save() calls dbSyncKey() (fire-and-forget).
//   • localStorage remains an instant offline fallback.

// ─── JS ↔ DB FIELD MAPPING ───────────────────────────────────────

function _bookingToRow(b) {
  // Resolve product_id from the in-memory products array (no extra network call)
  const prod = (typeof products !== 'undefined')
    ? products.find(p => p.name === b.product)
    : null;

  return {
    id:             b.id,
    name:           b.name            || '',
    email:          b.email           || '',
    phone:          b.phone           || null,
    language:       b.language        || null,
    product_name:   b.product         || null,
    product_id:     prod?.id          || null,
    pax:            parseInt(b.pax)   || 1,
    date:           b.date            || null,
    time_slot:      b.time            || null,
    agent_name:     b.agent           || null,
    agent_id:       b.agentId         || null,
    location:       b.location        || null,
    payment_method: b.paymentMethod   || null,
    payment_status: b.paymentStatus   || 'pending',
    total:          parseFloat(b.total)   || null,
    deposit:        parseFloat(b.deposit) || 0,
    notes:          b.notes           || null,
    // created_at: let DB default handle on insert; preserve on update
    created_at:     b.createdAt       || new Date().toISOString(),
  };
}

function _rowToBooking(r) {
  return {
    id:            r.id,
    name:          r.name,
    email:         r.email,
    phone:         r.phone,
    language:      r.language,
    product:       r.product_name,
    pax:           r.pax,
    date:          r.date,            // DATE → 'YYYY-MM-DD' string from Supabase
    time:          r.time_slot,
    agent:         r.agent_name,
    agentId:       r.agent_id,
    location:      r.location,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    total:         r.total   != null ? String(parseFloat(r.total).toFixed(2))   : '',
    deposit:       r.deposit != null ? String(parseFloat(r.deposit).toFixed(2)) : '',
    notes:         r.notes,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

function _productToRow(p) {
  return {
    id:          p.id,
    name:        p.name,
    description: p.desc       || null,
    price:       parseFloat(p.price) || 0,
    emoji:       p.emoji      || '📦',
    color:       p.color      || '#1A1A1A',
    duration:    p.duration   || null,
    notes:       p.notes      || null,
    timeslots:   p.timeslots  || null,
    commission:  parseFloat(p.commission) || 0,
  };
}

function _rowToProduct(r) {
  return {
    id:         r.id,
    name:       r.name,
    desc:       r.description,
    price:      parseFloat(r.price)      || 0,
    emoji:      r.emoji,
    color:      r.color,
    duration:   r.duration,
    notes:      r.notes,
    timeslots:  r.timeslots,
    commission: parseFloat(r.commission) || 0,
    createdAt:  r.created_at,
    updatedAt:  r.updated_at,
  };
}

function _notifToRow(n) {
  return {
    id:         n.id,
    type:       n.type,
    title:      n.title      || '',
    body:       n.text       || null,
    audience:   n.audience,
    from_id:    (n.fromId && n.fromId !== 'system') ? n.fromId : null,
    from_name:  n.fromName   || null,
    booking_id: n.bookingId  || null,
    created_at: n.createdAt  || new Date().toISOString(),
  };
}

function _rowToNotif(r) {
  return {
    id:        r.id,
    createdAt: r.created_at,
    type:      r.type,
    title:     r.title,
    text:      r.body,
    audience:  r.audience,
    fromId:    r.from_id || 'system',
    fromName:  r.from_name || 'Sistema',
    bookingId: r.booking_id,
  };
}

function _buildNotifReadMap(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.user_id]) map[r.user_id] = [];
    map[r.user_id].push(r.notif_id);
  }
  return map;
}

// ─── INITIAL LOAD FROM SUPABASE ──────────────────────────────────
async function dbLoadAll() {
  const sb = window._supabase;
  if (!sb) return;

  try {
    const [bRes, pRes, tRes, lRes, nRes, nrRes, permRes, moneyRes] =
      await Promise.all([
        sb.from('bookings')
          .select('*')
          .order('created_at', { ascending: true }),

        sb.from('products')
          .select('*')
          .order('created_at', { ascending: true }),

        sb.from('team')
          .select('*')
          .order('created_at', { ascending: true }),

        sb.from('locations')
          .select('name')
          .order('sort_order', { ascending: true }),

        sb.from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),

        sb.from('notif_read')
          .select('user_id, notif_id'),

        sb.from('app_settings')
          .select('value')
          .eq('key', 'permissions')
          .maybeSingle(),

        sb.from('app_settings')
          .select('value')
          .eq('key', 'money_hidden')
          .maybeSingle(),
      ]);

    if (bRes.data) {
      bookings = bRes.data.map(_rowToBooking);
      localStorage.setItem('cilex_bookings', JSON.stringify(bookings));
    }
    if (pRes.data && pRes.data.length) {
      products = pRes.data.map(_rowToProduct);
      localStorage.setItem('cilex_products', JSON.stringify(products));
    }
    if (tRes.data) {
      team = tRes.data; // team rows match JS shape directly
      localStorage.setItem('cilex_team', JSON.stringify(team));
    }
    if (lRes.data && lRes.data.length) {
      locations = lRes.data.map(r => r.name);
      localStorage.setItem('cilex_locations', JSON.stringify(locations));
    }
    if (nRes.data) {
      notifications = nRes.data.map(_rowToNotif);
      localStorage.setItem('cilex_notifications', JSON.stringify(notifications));
    }
    if (nrRes.data) {
      notifReadMap = _buildNotifReadMap(nrRes.data);
      localStorage.setItem('cilex_notif_read', JSON.stringify(notifReadMap));
    }
    if (permRes.data?.value) {
      localStorage.setItem('cilex_perms', JSON.stringify(permRes.data.value));
    }
    if (moneyRes.data?.value !== undefined && moneyRes.data?.value !== null) {
      localStorage.setItem('cilex_money_hidden', JSON.stringify(moneyRes.data.value));
    }

    console.log('[DB] Loaded from Supabase ✓',
      `${bookings.length} bookings, ${products.length} products, ${team.length} team`);
  } catch (e) {
    console.warn('[DB] Load failed — using localStorage fallback:', e.message);
  }
}

// ─── FIRST-RUN SYNC ──────────────────────────────────────────────
// Called from app.js after dbLoadAll().
// If the DB tables are empty (fresh Supabase project), push all local
// data so FK dependencies exist before bookings are ever written.
async function dbInitialSync() {
  const sb = window._supabase;
  if (!sb) return;
  try {
    const { data: teamCheck } = await sb.from('team').select('id').limit(1);
    if (teamCheck && teamCheck.length === 0) {
      console.log('[DB] Fresh database — performing initial data push...');
      if (team.length)      await _syncTeam(sb, team);
      if (products.length)  await _syncProducts(sb, products);
      if (locations.length) await _syncLocations(sb, locations);
      if (bookings.length)  await _syncBookings(sb, bookings);
      console.log('[DB] Initial sync complete ✓');
    }
  } catch (e) {
    console.warn('[DB] Initial sync failed:', e.message);
  }
}

// ─── DEP GUARD ────────────────────────────────────────────────────
// Ensures team + products are in DB before any booking upsert,
// preventing FK violations when only bookings are modified.
let _depsReady = false;

async function _ensureDeps(sb) {
  if (_depsReady) return;
  const { data } = await sb.from('products').select('id').limit(1);
  if (!data || data.length === 0) {
    if (team.length)     await _syncTeam(sb, team);
    if (products.length) await _syncProducts(sb, products);
  }
  _depsReady = true;
}

// ─── SYNC ROUTING ─────────────────────────────────────────────────
// Called fire-and-forget by save() in state.js
function dbSyncKey(key, val) {
  const sb = window._supabase;
  if (!sb || val === undefined) return;

  let p;
  if      (key === 'cilex_bookings')       p = _syncBookings(sb, val);
  else if (key === 'cilex_products')       p = _syncProducts(sb, val);
  else if (key === 'cilex_team')           p = _syncTeam(sb, val);
  else if (key === 'cilex_locations')      p = _syncLocations(sb, val);
  else if (key === 'cilex_notifications')  p = _syncNotifications(sb, val);
  else if (key === 'cilex_notif_read')     p = _syncNotifRead(sb, val);
  else if (key === 'cilex_perms')          p = _syncSetting(sb, 'permissions', val);
  else if (key === 'cilex_money_hidden')   p = _syncSetting(sb, 'money_hidden', val);
  // cilex_current_user + cilex_profile_img_* → localStorage only

  if (p) p.catch(e => console.warn('[DB] Sync failed for', key, ':', e.message));
}

// ─── SYNC HELPERS ────────────────────────────────────────────────

async function _syncBookings(sb, arr) {
  // Guarantee FK dependencies (team, products) exist before upserting bookings
  await _ensureDeps(sb);

  const { data: existing } = await sb.from('bookings').select('id');
  const existingIds = new Set((existing || []).map(r => r.id));
  const newIds      = new Set(arr.map(b => b.id));

  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length) {
    await sb.from('bookings').delete().in('id', toDelete);
  }
  if (arr.length) {
    await sb.from('bookings').upsert(arr.map(_bookingToRow), { onConflict: 'id' });
  }
}

async function _syncProducts(sb, arr) {
  const { data: existing } = await sb.from('products').select('id');
  const existingIds = new Set((existing || []).map(r => r.id));
  const newIds      = new Set(arr.map(p => p.id));

  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length) {
    await sb.from('products').delete().in('id', toDelete);
  }
  if (arr.length) {
    await sb.from('products').upsert(arr.map(_productToRow), { onConflict: 'id' });
  }
}

async function _syncTeam(sb, arr) {
  const { data: existing } = await sb.from('team').select('id');
  const existingIds = new Set((existing || []).map(r => r.id));
  const newIds      = new Set(arr.map(m => m.id));

  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length) {
    await sb.from('team').delete().in('id', toDelete);
  }
  if (arr.length) {
    // Team rows use the same field names as JS (firstname, lastname, etc.)
    await sb.from('team').upsert(arr, { onConflict: 'id' });
  }
}

async function _syncLocations(sb, arr) {
  // Replace all locations (small table, simple approach)
  await sb.from('locations').delete().gte('id', 0);
  if (arr.length) {
    const rows = arr.map((name, i) => ({ name, sort_order: i }));
    await sb.from('locations').insert(rows);
  }
}

async function _syncNotifications(sb, arr) {
  if (!arr.length) return;
  // Upsert only — notifications are never deleted, just capped in memory
  await sb.from('notifications').upsert(
    arr.map(_notifToRow),
    { onConflict: 'id', ignoreDuplicates: true }
  );
}

async function _syncNotifRead(sb, map) {
  const rows = [];
  for (const [userId, notifIds] of Object.entries(map)) {
    for (const notifId of notifIds) {
      rows.push({ user_id: userId, notif_id: notifId });
    }
  }
  if (rows.length) {
    await sb.from('notif_read').upsert(rows, {
      onConflict: 'user_id,notif_id',
      ignoreDuplicates: true,
    });
  }
}

async function _syncSetting(sb, key, val) {
  await sb.from('app_settings').upsert(
    { key, value: val },
    { onConflict: 'key' }
  );
}
