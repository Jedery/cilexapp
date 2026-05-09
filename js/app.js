// ─── INIT ─────────────────────────────────────────────────────────
async function initApp() {
  initModalOverlays();

  // Pull latest data from Supabase (overwrites localStorage + globals).
  // Falls back to localStorage silently if Supabase is unreachable.
  await dbLoadAll();

  // Guarantee the admin member exists after any data load.
  ensureAdminInTeam();

  // If DB is empty (first connection), push all local data so FK
  // dependencies exist before any write operations.
  await dbInitialSync();

  if (currentUser) {
    document.getElementById('login-screen').style.display = 'none';
    buildNav();
    updateUserPill();
    renderDashboard();
    runSystemNotifChecks();
    updateBellBadge();
    const dash = document.getElementById('nav-dashboard');
    if (dash) dash.classList.add('active');
    const tabDash = document.getElementById('tab-dashboard');
    if (tabDash) tabDash.classList.add('active');
  } else {
    showPromoterLogin();
  }
}

// iOS: prevent pinch-zoom
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

// iOS: prevent double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
