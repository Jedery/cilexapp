// ─── SUPABASE CLIENT ─────────────────────────────────────────────
// Initializes the global Supabase client using the CDN-provided createClient.
// window._supabase is used throughout db.js.

(function initSupabase() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[Supabase] SDK not loaded. Check the CDN script tag in index.html.');
    return;
  }
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[Supabase] Client ready.');
})();
