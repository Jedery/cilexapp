// ─── LOGIN CONSTANTS ──────────────────────────────────────────────
const ADMIN_PASSWORD = 'Cilexsecret00';
const ADMIN_USERNAME = 'Ignazio Lanza';
let adminAuthenticated = false;
let adminHighlightIdx  = -1;

// ─── PANEL SWITCHING ─────────────────────────────────────────────
function showPromoterLogin() {
  adminAuthenticated = false;
  _setLoginPanel('promoter');
  document.getElementById('lp-username').value = '';
  document.getElementById('lp-password').value = '';
  document.getElementById('lp-error').textContent = '';
}

function showSuperadminLogin() {
  _setLoginPanel('admin');
  document.getElementById('la-password').value = '';
  document.getElementById('la-error').textContent = '';
  setTimeout(() => document.getElementById('la-password').focus(), 100);
}

function _setLoginPanel(which) {
  document.getElementById('login-promoter-panel').style.display = which === 'promoter' ? 'flex' : 'none';
  document.getElementById('login-admin-panel').style.display   = which === 'admin'    ? 'flex' : 'none';
  document.getElementById('login-admin-select').style.display  = which === 'select'   ? 'flex' : 'none';
}

// ─── PROMOTER LOGIN ───────────────────────────────────────────────
function doPromoterLogin() {
  const username = document.getElementById('lp-username').value.trim();
  const password = document.getElementById('lp-password').value;
  const errEl = document.getElementById('lp-error');
  if (!username || !password) { errEl.textContent = 'Inserisci nome utente e password.'; return; }

  const member = team.find(m => {
    const fullName = (m.firstname + ' ' + m.lastname).trim().toLowerCase();
    return fullName === username.toLowerCase() && !SUPERADMIN_ROLES.includes(m.role);
  });

  if (!member) { errEl.textContent = 'Nome utente non trovato.'; return; }

  const memberPwd = member.pin || 'Cilex2026';
  if (memberPwd !== password) { errEl.textContent = 'Password errata. Riprova.'; return; }

  errEl.textContent = '';
  doLogin(member);
}

function togglePwdVisibility() {
  const inp = document.getElementById('lp-password');
  const icon = document.getElementById('lp-eye-icon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

// ─── SUPERADMIN AUTH ──────────────────────────────────────────────
function doAdminAuth() {
  const pwd = document.getElementById('la-password').value;
  const errEl = document.getElementById('la-error');
  if (pwd !== ADMIN_PASSWORD) { errEl.textContent = 'Password errata.'; return; }
  errEl.textContent = '';
  adminAuthenticated = true;
  _setLoginPanel('select');
  document.getElementById('la-profile').value = '';
  document.getElementById('la-select-error').textContent = '';
  adminHighlightIdx = -1;
  setTimeout(() => {
    document.getElementById('la-profile').focus();
    showAdminProfileList();
  }, 100);
}

function toggleAdminPwdVisibility() {
  const inp = document.getElementById('la-password');
  const icon = document.getElementById('la-eye-icon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

// ─── ADMIN PROFILE SELECTOR ───────────────────────────────────────
function filterAdminProfiles(q) {
  const sug = document.getElementById('la-suggestions');
  adminHighlightIdx = -1;
  const query = (q || '').trim().toLowerCase();
  const matches = query
    ? team.filter(m => (m.firstname + ' ' + m.lastname).toLowerCase().includes(query))
    : team.slice();
  if (!matches.length) {
    sug.style.display = 'block';
    sug.innerHTML = `<div style="padding:14px;font-size:12px;color:var(--text3);text-align:center">Nessun profilo trovato</div>`;
    return;
  }
  const isSAR = r => SUPERADMIN_ROLES.includes(r);
  sug.innerHTML = matches.map((m, i) => {
    const roleLabel = isSAR(m.role) ? 'SuperAdmin' : (ROLE_LABELS[m.role] || 'Utente');
    const roleColor = isSAR(m.role) ? 'color:var(--cyan)' : 'color:var(--text3)';
    return `<div class="la-suggestion-item" data-id="${m.id}" onclick="pickAdminProfile('${m.id}')">
      <div>${m.firstname} ${m.lastname}</div>
      <div class="la-sug-role" style="${roleColor}">${roleLabel}</div>
    </div>`;
  }).join('');
  sug.style.display = 'block';
}

function showAdminProfileList() {
  filterAdminProfiles(document.getElementById('la-profile').value || '');
}

function handleAdminProfileKey(e) {
  const sug = document.getElementById('la-suggestions');
  const items = sug.querySelectorAll('.la-suggestion-item');
  if (!items.length) { if (e.key === 'Enter') doAdminSelectLogin(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    adminHighlightIdx = Math.min(adminHighlightIdx + 1, items.length - 1);
    _updateAdminHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    adminHighlightIdx = Math.max(adminHighlightIdx - 1, 0);
    _updateAdminHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (adminHighlightIdx >= 0 && items[adminHighlightIdx]) {
      pickAdminProfile(items[adminHighlightIdx].dataset.id);
    } else {
      doAdminSelectLogin();
    }
  }
}

function _updateAdminHighlight(items) {
  items.forEach((el, i) => el.classList.toggle('highlighted', i === adminHighlightIdx));
}

function pickAdminProfile(id) {
  const m = team.find(t => t.id === id);
  if (!m) return;
  document.getElementById('la-profile').value = m.firstname + ' ' + m.lastname;
  document.getElementById('la-suggestions').style.display = 'none';
  document.getElementById('la-select-error').textContent = '';
  adminHighlightIdx = -1;
  if (adminAuthenticated) doLogin(m);
}

function doAdminSelectLogin() {
  if (!adminAuthenticated) { showPromoterLogin(); return; }
  const val = document.getElementById('la-profile').value.trim();
  const errEl = document.getElementById('la-select-error');
  if (!val) { errEl.textContent = 'Inserisci un nome profilo.'; return; }
  const member = team.find(m =>
    (m.firstname + ' ' + m.lastname).toLowerCase() === val.toLowerCase()
  );
  if (!member) { errEl.textContent = 'Profilo non trovato. Controlla il nome.'; return; }
  errEl.textContent = '';
  doLogin(member);
}

// ─── LEGACY HELPERS ───────────────────────────────────────────────
function buildLoginUsers() {
  if (!adminAuthenticated) showPromoterLogin();
}

function showUserList() {
  showPromoterLogin();
}

// ─── LOGIN ────────────────────────────────────────────────────────
function doLogin(member) {
  currentUser = member;
  save('cilex_current_user', currentUser);
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
}

function skipLogin() {
  currentUser = { id: 'guest', firstname: 'Ospite', lastname: '', role: 'manager' };
  save('cilex_current_user', currentUser);
  document.getElementById('login-screen').style.display = 'none';
  buildNav();
  updateUserPill();
  renderDashboard();
  showToast('Accesso ospite — aggiungi i membri del team per uscire dalla modalità ospite', 'success');
}

// ─── USER DROPDOWN ────────────────────────────────────────────────
function toggleUserDropdown() {
  dropdownOpen = !dropdownOpen;
  const dd = document.getElementById('user-dropdown');
  dd.style.display = dropdownOpen ? 'block' : 'none';
  if (dropdownOpen) {
    const isSA = isSuperAdmin();
    const roleColor = isSA ? 'var(--cyan)' : 'var(--text3)';
    document.getElementById('dd-name').textContent = currentUser ? currentUser.firstname + ' ' + (currentUser.lastname || '') : '—';
    document.getElementById('dd-role').innerHTML = `<span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:4px;letter-spacing:0.8px;color:${roleColor};background:${isSA?'rgba(62,198,212,0.12)':'var(--surface3)'};border:1px solid ${isSA?'rgba(62,198,212,0.25)':'var(--border)'};">${isSA?'SuperAdmin':'Utente'}</span> <span style="color:var(--text3)">${ROLE_LABELS[currentUser?.role]||''}</span>`;
    setTimeout(() => document.addEventListener('click', closeDropdownOutside, { once: true }), 10);
  }
}

function closeDropdownOutside(e) {
  if (!document.getElementById('user-dropdown')?.contains(e.target) &&
      !document.getElementById('topbar-user-pill')?.contains(e.target)) {
    closeUserDropdown();
  }
}

function closeUserDropdown() {
  dropdownOpen = false;
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.style.display = 'none';
}

function logout() {
  closeUserDropdown();
  if (!currentUser) return;
  const initials = ((currentUser.firstname?.[0]||'')+(currentUser.lastname?.[0]||'')).toUpperCase() || '?';
  const idx = team.findIndex(m => m.id === currentUser.id);
  const avCls = AV_CLASSES[Math.max(idx, 0) % 6];
  const av = document.getElementById('logout-av');
  av.textContent = initials;
  av.className = 'team-avatar ' + avCls;
  av.style.cssText = 'width:36px;height:36px;font-size:13px;font-weight:800;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0';
  document.getElementById('logout-name').textContent = currentUser.firstname + ' ' + (currentUser.lastname || '');
  document.getElementById('logout-role').textContent = ROLE_LABELS[currentUser.role] || currentUser.role || '';
  document.getElementById('modal-logout').classList.add('open');
}

function confirmLogout() {
  currentUser = null;
  save('cilex_current_user', null);
  adminAuthenticated = false;
  closeModal('modal-logout');
  showPromoterLogin();
  document.getElementById('login-screen').style.display = 'flex';
}

function switchUser() {
  closeUserDropdown();
  if (!currentUser) return;
  const initials = ((currentUser.firstname?.[0]||'')+(currentUser.lastname?.[0]||'')).toUpperCase() || '?';
  const idx = team.findIndex(m => m.id === currentUser.id);
  const avCls = AV_CLASSES[Math.max(idx, 0) % 6];
  const av = document.getElementById('logout-av');
  av.textContent = initials;
  av.className = 'team-avatar ' + avCls;
  av.style.cssText = 'width:36px;height:36px;font-size:13px;font-weight:800;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0';
  document.getElementById('logout-name').textContent = currentUser.firstname + ' ' + (currentUser.lastname || '');
  document.getElementById('logout-role').textContent = ROLE_LABELS[currentUser.role] || currentUser.role || '';
  document.getElementById('modal-logout').classList.add('open');
}

function updateUserPill() {
  if (!currentUser) return;
  const initials = ((currentUser.firstname?.[0]||'')+(currentUser.lastname?.[0]||'')).toUpperCase() || '?';
  const idx = team.findIndex(m => m.id === currentUser.id);
  const avCls = AV_CLASSES[Math.max(idx, 0) % 6];
  const av = document.getElementById('topbar-av');

  const photoKey = 'cilex_profile_img_' + currentUser.id;
  let savedImg = null;
  try { savedImg = localStorage.getItem(photoKey); } catch(e) {}
  if (savedImg) {
    av.textContent = '';
    av.style.backgroundImage = 'url(' + savedImg + ')';
    av.style.backgroundSize = 'cover';
    av.style.backgroundPosition = 'center';
    av.className = 'user-pill-av';
  } else {
    av.textContent = initials;
    av.style.backgroundImage = '';
    av.className = 'user-pill-av ' + avCls;
  }
  const shortName = currentUser.firstname + (currentUser.lastname ? ' ' + currentUser.lastname[0] + '.' : '');
  document.getElementById('topbar-user-name').textContent = shortName;
}
