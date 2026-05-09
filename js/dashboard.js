// ─── DASHBOARD STATE ─────────────────────────────────────────────
let dashPeriod = 'today';

// ─── MONEY VISIBILITY ────────────────────────────────────────────
function getMoneyHidden() {
  return load('cilex_money_hidden', false) === true;
}

function toggleMoneyVisibility() {
  save('cilex_money_hidden', !getMoneyHidden());
  renderDashboard();
}

// ─── PROFILE IMAGE ────────────────────────────────────────────────
function triggerProfileImageUpload() {
  const inp = document.getElementById('profile-img-input');
  if (inp) inp.click();
}

function onProfileImageSelected(e) {
  const file = e.target.files[0];
  if (!file || !currentUser) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > max) { h = h * max / w; w = max; } }
      else       { if (h > max) { w = w * max / h; h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const resized = canvas.toDataURL('image/jpeg', 0.85);
      const photoKey = 'cilex_profile_img_' + currentUser.id;
      try { localStorage.setItem(photoKey, resized); } catch(e) {}
      updateUserPill();
      _updateDashProfile();
      showToast('Foto profilo aggiornata', 'success');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// ─── DASHBOARD RENDER ─────────────────────────────────────────────
function renderDashboard() {
  _updateDashProfile();
  if (isSuperAdmin()) {
    renderAdminDashboard();
  } else {
    renderPromoterDashboard();
  }
}

function _updateDashProfile() {
  if (!currentUser) return;
  const sa = isSuperAdmin();
  const initials = ((currentUser.firstname?.[0]||'')+(currentUser.lastname?.[0]||'')).toUpperCase();
  const idx = team.findIndex(m => m.id === currentUser.id);
  const avCls = AV_CLASSES[Math.max(idx, 0) % 6];

  const avEl = document.getElementById('dash-avatar-initials');
  const avImg = document.getElementById('dash-avatar-img');
  if (avEl) { avEl.textContent = initials; avEl.className = 'dash-avatar ' + avCls; }

  const photoKey = 'cilex_profile_img_' + currentUser.id;
  let savedImg = null;
  try { savedImg = localStorage.getItem(photoKey); } catch(e) {}
  if (avImg) {
    if (savedImg) {
      avImg.src = savedImg; avImg.style.display = 'block';
      if (avEl) avEl.style.display = 'none';
    } else {
      avImg.style.display = 'none';
      if (avEl) avEl.style.display = 'flex';
    }
  }

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = greeting;

  const nameEl = document.getElementById('dash-name');
  if (nameEl) nameEl.textContent = (currentUser.firstname || '') + ' ' + (currentUser.lastname || '');

  const badgeEl = document.getElementById('dash-role-badge');
  if (badgeEl) {
    const roleLabel = sa ? 'SuperAdmin' : 'Utente';
    const roleColor = sa
      ? 'color:var(--cyan);background:rgba(62,198,212,0.12);border:1px solid rgba(62,198,212,0.25);'
      : 'color:var(--text3);background:var(--surface3);border:1px solid var(--border);';
    const orgLabel = ROLE_LABELS[currentUser.role] || '';
    badgeEl.innerHTML = '<span style="' + roleColor + '">' + roleLabel + '</span>' +
      (orgLabel ? '<span style="margin-left:6px;font-size:10px;color:var(--text3);font-family:Barlow,sans-serif">' + orgLabel + '</span>' : '');
  }
}

function renderAdminDashboard() {
  document.getElementById('urgent-banners').innerHTML = '';
  document.getElementById('period-filter-wrap').innerHTML = '';
  document.getElementById('dashboard-table-title').textContent = 'Booking recenti';

  const total = bookings.length;
  const confirmed = bookings.filter(b => b.paymentStatus === 'confirmed').length;
  const pending = bookings.filter(b => b.paymentStatus === 'pending').length;
  const revenue = bookings.filter(b => b.paymentStatus === 'confirmed').reduce((s, b) => s + (parseFloat(b.total) || 0), 0);

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Booking totali</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confermati</div>
      <div class="stat-value" style="color:#4ADE80">${confirmed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In attesa</div>
      <div class="stat-value" style="color:#FCD34D">${pending}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" style="display:flex;align-items:center;justify-content:space-between">
        <span>Incasso</span>
        <button onclick="toggleMoneyVisibility()" class="money-toggle" title="${getMoneyHidden() ? 'Mostra' : 'Nascondi'}" aria-label="Mostra/Nascondi importo">
          ${getMoneyHidden()
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}
        </button>
      </div>
      <div class="stat-value gold">${getMoneyHidden() ? '€••••' : '€'+revenue.toFixed(0)}</div>
    </div>`;

  const todayA = new Date(); todayA.setHours(0,0,0,0);
  const alertBookings = bookings
    .filter(b => b.paymentStatus === 'pending' && b.date)
    .map(b => {
      const eventDate = new Date(b.date); eventDate.setHours(0,0,0,0);
      const daysUntil = Math.round((eventDate - todayA) / 86400000);
      return { ...b, daysUntil };
    })
    .filter(b => b.daysUntil >= 0 && b.daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (alertBookings.length) {
    const alertItems = alertBookings.map(b => {
      const isCritical = b.daysUntil <= 1;
      const dayLabel = b.daysUntil === 0 ? '🔴 OGGI' : b.daysUntil === 1 ? '🟠 DOMANI' : `🟡 tra ${b.daysUntil} giorni`;
      const dateStr = formatDate(b.date);
      const remaining = b.total ? (parseFloat(b.total) - (parseFloat(b.deposit)||0)).toFixed(2) : null;
      return `
        <div class="urgent-banner ${isCritical ? 'critical' : 'warning'}" onclick="openDetail('${b.id}')">
          <div class="urgent-banner-icon">${isCritical ? '🚨' : '⚠️'}</div>
          <div class="urgent-banner-body">
            <div class="urgent-banner-title">${b.name} — Pagamento in attesa</div>
            <div class="urgent-banner-sub">${b.product}${b.time ? ' · ' + b.time : ''} · ${dateStr} · <em>${b.agent || ''}</em></div>
            <div class="urgent-banner-meta">
              <span class="urgent-banner-badge">${dayLabel}</span>
              ${remaining ? `<span class="urgent-banner-badge">💳 Da saldare: €${remaining}</span>` : ''}
              ${b.phone ? `<span class="urgent-banner-badge">📞 ${b.phone}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('urgent-banners').innerHTML = `
      <div class="urgent-section">
        <div class="urgent-banners-header">
          🔔 Booking in attesa — ultimi 3 giorni all'evento
          <span class="urgent-count-pill">${alertBookings.length}</span>
        </div>
        <div class="urgent-banners-hint">Contatta i clienti prima della data evento per confermare il pagamento.</div>
        ${alertItems}
      </div>`;
  } else {
    document.getElementById('urgent-banners').innerHTML = '';
  }

  const recent = [...bookings].reverse().slice(0, 5);
  document.getElementById('dashboard-table-wrap').innerHTML = recent.length
    ? renderTable(recent)
    : `<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun booking ancora.</p></div>`;
}

function renderPromoterDashboard() {
  document.getElementById('period-filter-wrap').innerHTML = `
    <div class="period-tabs">
      <button class="period-tab ${dashPeriod==='today'?'active':''}" onclick="setDashPeriod('today')">Oggi</button>
      <button class="period-tab ${dashPeriod==='3days'?'active':''}" onclick="setDashPeriod('3days')">3 Giorni</button>
      <button class="period-tab ${dashPeriod==='week'?'active':''}" onclick="setDashPeriod('week')">Settimana</button>
      <button class="period-tab ${dashPeriod==='month'?'active':''}" onclick="setDashPeriod('month')">Mese</button>
    </div>`;

  const myBookings = bookings.filter(b => b.agentId === currentUser?.id);
  const now = new Date(); now.setHours(0,0,0,0);
  const periodEnd = new Date(now); periodEnd.setHours(23,59,59,999);
  let periodStart = new Date(now);
  if (dashPeriod === '3days') periodStart.setDate(now.getDate() - 2);
  else if (dashPeriod === 'week') periodStart.setDate(now.getDate() - 6);
  else if (dashPeriod === 'month') periodStart.setDate(now.getDate() - 29);

  const inPeriod = myBookings.filter(b => {
    if (!b.createdAt) return false;
    const d = new Date(b.createdAt); d.setHours(0,0,0,0);
    return d >= periodStart && d <= periodEnd;
  });

  const total = inPeriod.length;
  const confirmed = inPeriod.filter(b => b.paymentStatus === 'confirmed').length;
  const pending = inPeriod.filter(b => b.paymentStatus === 'pending').length;

  const commissions = inPeriod
    .filter(b => b.paymentStatus === 'confirmed')
    .reduce((s, b) => {
      const prod = products.find(p => p.name === b.product);
      const pct = prod?.commission || 0;
      return s + ((parseFloat(b.total) || 0) * pct / 100);
    }, 0);

  const periodLabel = { today:'Oggi', '3days':'Ultimi 3 giorni', week:'Questa settimana', month:'Questo mese' }[dashPeriod];

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Numero Ticket</div>
      <div class="stat-value">${total}</div>
      <div class="stat-chip">${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Confermati</div>
      <div class="stat-value" style="color:#4ADE80">${confirmed}</div>
      <div class="stat-chip">${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In attesa</div>
      <div class="stat-value" style="color:#FCD34D">${pending}</div>
      <div class="stat-chip">${periodLabel}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" style="display:flex;align-items:center;justify-content:space-between">
        <span>Commissioni</span>
        <button onclick="toggleMoneyVisibility()" class="money-toggle" title="${getMoneyHidden() ? 'Mostra' : 'Nascondi'}" aria-label="Mostra/Nascondi importo">
          ${getMoneyHidden()
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}
        </button>
      </div>
      <div class="stat-value gold">${getMoneyHidden() ? '€••••' : '€'+commissions.toFixed(0)}</div>
      <div class="stat-chip">${periodLabel}</div>
    </div>`;

  const today = new Date(); today.setHours(0,0,0,0);
  const urgentBookings = myBookings
    .filter(b => b.paymentStatus === 'pending' && b.date)
    .map(b => {
      const eventDate = new Date(b.date); eventDate.setHours(0,0,0,0);
      const daysUntil = Math.round((eventDate - today) / 86400000);
      return { ...b, daysUntil };
    })
    .filter(b => b.daysUntil >= 0 && b.daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (urgentBookings.length) {
    const banners = urgentBookings.map(b => {
      const isCritical = b.daysUntil <= 2;
      const dayLabel = b.daysUntil === 0 ? '🔴 OGGI' : b.daysUntil === 1 ? '🟠 DOMANI' : `🟡 tra ${b.daysUntil} giorni`;
      const dateStr = formatDate(b.date);
      const remaining = b.total ? (parseFloat(b.total) - (parseFloat(b.deposit)||0)).toFixed(2) : null;
      return `
        <div class="urgent-banner ${isCritical ? 'critical' : 'warning'}" onclick="openDetail('${b.id}')">
          <div class="urgent-banner-icon">${isCritical ? '🚨' : '⚠️'}</div>
          <div class="urgent-banner-body">
            <div class="urgent-banner-title">${b.name} — Pagamento pendente</div>
            <div class="urgent-banner-sub">${b.product}${b.time ? ' · ' + b.time : ''} · ${dateStr}</div>
            <div class="urgent-banner-meta">
              <span class="urgent-banner-badge">${dayLabel}</span>
              ${remaining ? `<span class="urgent-banner-badge">💳 Da saldare: €${remaining}</span>` : ''}
              ${b.phone ? `<span class="urgent-banner-badge">📞 ${b.phone}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('urgent-banners').innerHTML = `
      <div class="urgent-section">
        <div class="urgent-banners-header">
          🔔 Booking in attesa — ultimi 3 giorni all'evento
          <span class="urgent-count-pill">${urgentBookings.length}</span>
        </div>
        <div class="urgent-banners-hint">Contatta i clienti prima della data evento per confermare il pagamento.</div>
        ${banners}
      </div>`;
  } else {
    document.getElementById('urgent-banners').innerHTML = '';
  }

  document.getElementById('dashboard-table-title').textContent = 'I miei booking recenti';
  const recent = [...myBookings].reverse().slice(0, 5);
  document.getElementById('dashboard-table-wrap').innerHTML = recent.length
    ? renderTable(recent)
    : `<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun booking ancora.<br>Crea la prima prenotazione!</p></div>`;
}

function setDashPeriod(p) {
  dashPeriod = p;
  renderPromoterDashboard();
}
