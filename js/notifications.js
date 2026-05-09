// ─── NOTIFICATIONS ───────────────────────────────────────────────
function pushNotif(notif) {
  const n = {
    id: 'n' + Date.now() + Math.random().toString(36).slice(2,6),
    createdAt: new Date().toISOString(),
    type: 'system-info',
    title: '',
    text: '',
    audience: 'all',
    fromId: 'system',
    fromName: 'Sistema',
    ...notif
  };
  notifications.unshift(n);
  if (notifications.length > 200) notifications = notifications.slice(0, 200);
  save('cilex_notifications', notifications);
  return n;
}

function notifVisibleToUser(n, user) {
  if (!user) return false;
  const isSA = SUPERADMIN_ROLES.includes(user.role);
  if (n.audience === 'all') return !isSA;
  if (n.audience === 'superadmin') return isSA;
  if (n.audience === 'everyone') return true;
  if (Array.isArray(n.audience)) return n.audience.includes(user.id);
  return false;
}

function getUserNotifs() {
  if (!currentUser) return [];
  return notifications.filter(n => notifVisibleToUser(n, currentUser));
}

function isNotifRead(notifId) {
  if (!currentUser) return false;
  const list = notifReadMap[currentUser.id] || [];
  return list.includes(notifId);
}

function markNotifRead(notifId) {
  if (!currentUser) return;
  if (!notifReadMap[currentUser.id]) notifReadMap[currentUser.id] = [];
  if (!notifReadMap[currentUser.id].includes(notifId)) {
    notifReadMap[currentUser.id].push(notifId);
    save('cilex_notif_read', notifReadMap);
  }
}

function markAllRead() {
  const userNotifs = getUserNotifs();
  userNotifs.forEach(n => markNotifRead(n.id));
  renderNotifPanel();
  updateBellBadge();
  showToast('Tutte segnate come lette', 'success');
}

function unreadCount() {
  return getUserNotifs().filter(n => !isNotifRead(n.id)).length;
}

function updateBellBadge() {
  const badge = document.getElementById('bell-badge');
  const bell = document.getElementById('bell-btn');
  const tabBadge = document.getElementById('tab-notif-badge');
  if (!badge || !bell) {
    if (tabBadge) {
      const n = unreadCount();
      tabBadge.textContent = n;
      tabBadge.style.display = n > 0 ? 'flex' : 'none';
    }
    return;
  }
  const count = unreadCount();
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = '';
    bell.classList.add('has-unread');
  } else {
    badge.style.display = 'none';
    bell.classList.remove('has-unread');
  }
  if (tabBadge) {
    tabBadge.textContent = count > 99 ? '99+' : count;
    tabBadge.style.display = count > 0 ? 'flex' : 'none';
  }
  const bcBtn = document.getElementById('notif-broadcast-btn');
  if (bcBtn) bcBtn.style.display = isSuperAdmin() ? '' : 'none';
}

function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('open', notifPanelOpen);
  if (notifPanelOpen) {
    closeUserDropdown();
    runSystemNotifChecks();
    renderNotifPanel();
    setTimeout(() => document.addEventListener('click', closeNotifOutside, { once: true }), 10);
  }
}

function closeNotifOutside(e) {
  const panel = document.getElementById('notif-panel');
  const bell = document.getElementById('bell-btn');
  if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
    closeNotifPanel();
  }
}

function closeNotifPanel() {
  notifPanelOpen = false;
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('open');
}

function setNotifFilter(f) {
  notifFilter = f;
  document.querySelectorAll('.notif-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === f);
  });
  renderNotifPanel();
}

function setNotifSearch(q) {
  notifSearch = q.toLowerCase();
  renderNotifPanel();
}

function notifIconHtml(type) {
  const map = {
    'system-urgent':  { cls:'urgent',  svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
    'system-warning': { cls:'warning', svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
    'system-info':    { cls:'info',    svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' },
    'message':        { cls:'message', svg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  };
  const t = map[type] || map['system-info'];
  return `<div class="notif-icon ${t.cls}">${t.svg}</div>`;
}

function relativeTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'Ora';
  if (diff < 3600) return Math.floor(diff/60) + ' min fa';
  if (diff < 86400) return Math.floor(diff/3600) + ' ore fa';
  if (diff < 172800) return 'Ieri';
  return d.toLocaleDateString('it-IT');
}

function dateGroupLabel(iso) {
  const d = new Date(iso); d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = (today - d) / 86400000;
  if (diff <= 0) return 'OGGI';
  if (diff === 1) return 'IERI';
  if (diff <= 7) return 'QUESTA SETTIMANA';
  if (diff <= 30) return 'QUESTO MESE';
  return 'PIÙ VECCHIE';
}

function renderNotifPanel() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  let items = getUserNotifs();

  if (notifFilter === 'unread') items = items.filter(n => !isNotifRead(n.id));
  else if (notifFilter === 'system') items = items.filter(n => n.type.startsWith('system'));
  else if (notifFilter === 'message') items = items.filter(n => n.type === 'message');

  if (notifSearch) items = items.filter(n =>
    (n.title||'').toLowerCase().includes(notifSearch) ||
    (n.text||'').toLowerCase().includes(notifSearch) ||
    (n.fromName||'').toLowerCase().includes(notifSearch)
  );

  if (!items.length) {
    list.innerHTML = `<div class="notif-empty">Nessuna notifica${notifSearch ? ' trovata' : ''}</div>`;
    return;
  }

  let html = '';
  let lastGroup = null;
  for (const n of items) {
    const grp = dateGroupLabel(n.createdAt);
    if (grp !== lastGroup) {
      html += `<div class="notif-date-group">${grp}</div>`;
      lastGroup = grp;
    }
    const unread = !isNotifRead(n.id);
    const fromLabel = n.type === 'message' && n.fromName ? `<span style="color:var(--cyan);font-weight:600">${n.fromName}</span> · ` : '';
    html += `
      <div class="notif-item ${unread ? 'unread' : ''}" onclick="onNotifClick('${n.id}')">
        ${notifIconHtml(n.type)}
        <div class="notif-body">
          <div class="notif-title">${n.title}</div>
          <div class="notif-text">${fromLabel}${n.text}</div>
          <div class="notif-time">${relativeTime(n.createdAt)}</div>
        </div>
      </div>`;
  }
  list.innerHTML = html;
}

function onNotifClick(notifId) {
  const n = notifications.find(x => x.id === notifId);
  if (!n) return;
  markNotifRead(notifId);
  if (n.bookingId) {
    closeNotifPanel();
    openDetail(n.bookingId);
  } else {
    renderNotifPanel();
  }
  updateBellBadge();
}

// ─── AUTO SYSTEM CHECKS ──────────────────────────────────────────
function runSystemNotifChecks() {
  if (!currentUser) return;
  const today = new Date(); today.setHours(0,0,0,0);

  team.forEach(member => {
    const isSA = SUPERADMIN_ROLES.includes(member.role);
    if (isSA) return;
    const myBookings = bookings.filter(b => b.agentId === member.id && b.paymentStatus === 'pending' && b.date);
    myBookings.forEach(b => {
      const eventDate = new Date(b.date); eventDate.setHours(0,0,0,0);
      const days = Math.round((eventDate - today) / 86400000);
      if (days < 0 || days > 3) return;
      const todayKey = today.toISOString().slice(0,10);
      const existing = notifications.find(n =>
        n.bookingId === b.id &&
        n.type === 'system-urgent' &&
        (n.createdAt || '').slice(0,10) === todayKey
      );
      if (existing) return;
      const dayLabel = days === 0 ? 'OGGI' : days === 1 ? 'DOMANI' : `tra ${days} giorni`;
      pushNotif({
        type: 'system-urgent',
        title: `Pagamento urgente — ${b.name}`,
        text: `Evento ${dayLabel} (${b.product}). Saldo da incassare prima dell'inizio.`,
        audience: [member.id],
        bookingId: b.id,
      });
    });
  });
}

// ─── BROADCAST ───────────────────────────────────────────────────
function openBroadcastModal() {
  if (!isSuperAdmin()) return;
  document.getElementById('bc-title').value = '';
  document.getElementById('bc-body').value = '';
  document.getElementById('bc-target').value = 'all';
  document.getElementById('bc-specific-toggle').checked = false;
  document.getElementById('bc-target-users-wrap').style.display = 'none';
  const promoters = team.filter(m => !SUPERADMIN_ROLES.includes(m.role));
  document.getElementById('bc-target-users').innerHTML = promoters.length
    ? promoters.map(m => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:13px">
          <input type="checkbox" class="bc-user-check" value="${m.id}" style="width:auto">
          <span>${m.firstname} ${m.lastname}</span>
          <span style="font-size:10px;color:var(--text3);margin-left:auto">${ROLE_LABELS[m.role]||''}</span>
        </label>`).join('')
    : `<div style="color:var(--text3);font-size:12px;text-align:center;padding:8px">Nessun promoter nel team</div>`;
  document.getElementById('modal-broadcast').classList.add('open');
}

function toggleBcSpecific() {
  const checked = document.getElementById('bc-specific-toggle').checked;
  document.getElementById('bc-target-users-wrap').style.display = checked ? '' : 'none';
  document.getElementById('bc-target').disabled = checked;
}

function sendBroadcast() {
  const title = document.getElementById('bc-title').value.trim();
  const text = document.getElementById('bc-body').value.trim();
  if (!title || !text) { showToast('Compila titolo e messaggio', 'error'); return; }
  let audience;
  if (document.getElementById('bc-specific-toggle').checked) {
    const ids = Array.from(document.querySelectorAll('.bc-user-check:checked')).map(c => c.value);
    if (!ids.length) { showToast('Seleziona almeno un destinatario', 'error'); return; }
    audience = ids;
  } else {
    audience = document.getElementById('bc-target').value;
  }
  pushNotif({
    type: 'message',
    title,
    text,
    audience,
    fromId: currentUser.id,
    fromName: (currentUser.firstname || '') + ' ' + (currentUser.lastname || ''),
  });
  closeModal('modal-broadcast');
  showToast('Notifica inviata ✓', 'success');
  updateBellBadge();
}
