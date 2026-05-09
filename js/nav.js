// ─── NAVIGATION ──────────────────────────────────────────────────
function buildNav() {
  const sa = isSuperAdmin();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { id: 'bookings', label: sa ? 'Booking' : 'I Miei Booking', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    { id: 'new-booking', label: 'Nuova Prenotazione', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' },
    can('canViewProducts') ? { id: 'products', label: 'Prodotti', icon: '<path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8l-2 4h12l-2-4z"/>' } : null,
    can('canViewTeam') ? { id: 'team', label: 'Team', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' } : null,
    sa ? { id: 'settings', label: 'Impostazioni', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' } : null,
  ].filter(Boolean);

  // Sidebar
  const sideNav = document.getElementById('sidebar-nav');
  if (sideNav) {
    sideNav.innerHTML = navItems.map(item => `
      <button class="nav-item" id="nav-${item.id}" onclick="showPage('${item.id}', this)">
        <svg viewBox="0 0 24 24">${item.icon}</svg>
        ${item.label}
      </button>`).join('');
  }

  // Tab bar (mobile)
  const tabBar = document.getElementById('tab-bar');
  if (tabBar) {
    const commonTabs = [
      { id: 'dashboard', label: 'Home', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
      { id: 'bookings', label: 'Booking', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
      { id: 'new-booking', label: 'Nuovo', icon: '' },
    ];
    if (can('canViewProducts')) commonTabs.push({ id: 'products', label: 'Prodotti', icon: '<path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8l-2 4h12l-2-4z"/>' });

    if (sa) {
      commonTabs.push({ id: 'team', label: 'Team', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' });
    } else {
      commonTabs.push({ id: 'notifications-tab', label: 'Notifiche', icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', isNotif: true });
    }

    tabBar.innerHTML = commonTabs.map((item) => {
      if (item.id === 'new-booking') return `
        <button class="tab-item tab-add" id="tab-new-booking" onclick="showPage('new-booking', this)">
          <div class="tab-add-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></div>
          <span>Nuovo</span>
        </button>`;
      if (item.isNotif) return `
        <button class="tab-item" id="tab-notifications-tab" onclick="toggleNotifPanel()" style="position:relative">
          <svg viewBox="0 0 24 24">${item.icon}</svg>
          <span class="tab-notif-badge" id="tab-notif-badge" style="display:none;position:absolute;top:6px;right:calc(50% - 14px);background:#EF4444;color:#fff;font-size:8px;font-weight:800;min-width:14px;height:14px;border-radius:7px;align-items:center;justify-content:center;padding:0 3px;line-height:1">0</span>
          ${item.label}
        </button>`;
      return `
        <button class="tab-item" id="tab-${item.id}" onclick="showPage('${item.id}', this)">
          <svg viewBox="0 0 24 24">${item.icon}</svg>
          ${item.label}
        </button>`;
    }).join('');
  }

  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) exportBtn.style.display = can('canExportCSV') ? '' : 'none';

  const bellBtn = document.getElementById('bell-btn');
  if (bellBtn) bellBtn.classList.toggle('mobile-bell-hidden', !sa);
}

function showPage(id, navEl) {
  if (id === 'team' && !can('canViewTeam')) { showToast('Accesso non autorizzato', 'error'); return; }
  if (id === 'products' && !can('canViewProducts')) { showToast('Accesso non autorizzato', 'error'); return; }
  if (id === 'settings' && !isSuperAdmin()) { showToast('Accesso non autorizzato', 'error'); return; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (!page) return;
  page.classList.add('active');
  if (navEl) navEl.classList.add('active');

  const tabEl = document.getElementById('tab-' + id);
  if (tabEl) tabEl.classList.add('active');
  const sideEl = document.getElementById('nav-' + id);
  if (sideEl) sideEl.classList.add('active');

  const titles = {
    'dashboard': 'Dashboard',
    'bookings': isSuperAdmin() ? 'Tutti i Booking' : 'I Miei Booking',
    'new-booking': 'Nuova Prenotazione',
    'products': 'Prodotti',
    'team': 'Team',
    'settings': 'Impostazioni'
  };
  document.getElementById('topbar-title').textContent = titles[id] || '';

  if (id === 'dashboard') renderDashboard();
  if (id === 'bookings') { renderBookingsTable(); populateProductFilter(); }
  if (id === 'new-booking') { populateProductSelect(); populateLocationSelect(); clearForm(); }
  if (id === 'products') renderProducts();
  if (id === 'team') renderTeam();
  if (id === 'settings') renderSettings();
}
