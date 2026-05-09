// ─── TEAM ─────────────────────────────────────────────────────────
const ROLES = {
  'founder':            { label: 'Founder',           cls: 'role-founder' },
  'manager':            { label: 'Manager',            cls: 'role-manager' },
  'promoter-lg':        { label: 'Promoter LG',        cls: 'role-promoter-lg' },
  'promoter-spiaggia':  { label: 'Promoter Spiaggia',  cls: 'role-promoter-spiaggia' },
  'altro':              { label: 'Altro',               cls: 'role-altro' },
};
const ROLE_ORDER = ['founder','manager','promoter-lg','promoter-spiaggia','altro'];

function renderTeam() {
  const container = document.getElementById('team-sections');
  const grouped = {};
  ROLE_ORDER.forEach(r => grouped[r] = []);
  team.forEach(m => { if (grouped[m.role] !== undefined) grouped[m.role].push(m); else grouped['altro'].push(m); });

  container.innerHTML = ROLE_ORDER.map(role => {
    const members = grouped[role];
    if (!members.length) return '';
    const { label } = ROLES[role];
    const cards = members.map((m) => {
      const initials = ((m.firstname?.[0] || '') + (m.lastname?.[0] || '')).toUpperCase() || '?';
      const avClass = 'av-' + (team.indexOf(m) % 6);
      const roleDef = ROLES[m.role] || ROLES['altro'];
      return `
        <div class="team-card">
          <div class="team-avatar ${avClass}">${initials}</div>
          <div class="team-info">
            <div class="team-name">${m.firstname} ${m.lastname}</div>
            <span class="team-role-badge ${roleDef.cls}">${roleDef.label}</span>
            <div class="team-contact">
              ${m.phone ? `<div>📞 <a href="tel:${m.phone}">${m.phone}</a></div>` : ''}
              ${m.email ? `<div>✉️ <a href="mailto:${m.email}">${m.email}</a></div>` : ''}
              ${m.notes ? `<div style="color:var(--text3);font-style:italic">${m.notes}</div>` : ''}
            </div>
          </div>
          <div class="team-actions">
            <button class="btn-icon" onclick="editMember('${m.id}')" title="Modifica">✏️</button>
            <button class="btn-icon danger" onclick="deleteMember('${m.id}')" title="Elimina">🗑</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div>
        <div class="role-section-title">
          ${label}
          <span class="role-count">${members.length}</span>
        </div>
        <div class="team-grid">${cards}</div>
      </div>`;
  }).join('');

  if (!team.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Nessun membro nel team.<br>Aggiungi la prima persona!</p></div>`;
  }
}

function openAddMember() {
  editingMemberId = null;
  document.getElementById('modal-member-title').textContent = 'Nuovo Membro';
  ['m-firstname','m-lastname','m-phone','m-email','m-notes','m-pin'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-role').value = '';
  document.getElementById('modal-member').classList.add('open');
}

function editMember(id) {
  const m = team.find(m => m.id === id);
  if (!m) return;
  editingMemberId = id;
  document.getElementById('modal-member-title').textContent = 'Modifica Membro';
  document.getElementById('m-firstname').value = m.firstname || '';
  document.getElementById('m-lastname').value = m.lastname || '';
  document.getElementById('m-phone').value = m.phone || '';
  document.getElementById('m-email').value = m.email || '';
  document.getElementById('m-role').value = m.role || '';
  document.getElementById('m-notes').value = m.notes || '';
  document.getElementById('m-pin').value = '';
  document.getElementById('modal-member').classList.add('open');
}

function saveMember() {
  const firstname = document.getElementById('m-firstname').value.trim();
  const lastname = document.getElementById('m-lastname').value.trim();
  const role = document.getElementById('m-role').value;
  if (!firstname || !lastname || !role) { showToast('Compila nome, cognome e ruolo', 'error'); return; }
  const pinVal = document.getElementById('m-pin').value.trim();
  if (pinVal && !/^\d{4}$/.test(pinVal)) { showToast('Il PIN deve essere di 4 cifre', 'error'); return; }
  const member = {
    id: editingMemberId || 't' + Date.now(),
    firstname, lastname, role,
    phone: document.getElementById('m-phone').value.trim(),
    email: document.getElementById('m-email').value.trim(),
    notes: document.getElementById('m-notes').value.trim(),
    pin: pinVal || (editingMemberId ? (team.find(m => m.id === editingMemberId)?.pin || '') : ''),
  };
  if (editingMemberId) {
    const idx = team.findIndex(m => m.id === editingMemberId);
    if (idx > -1) team[idx] = member;
    if (currentUser?.id === editingMemberId) { currentUser = member; save('cilex_current_user', currentUser); updateUserPill(); }
  } else {
    team.push(member);
  }
  save('cilex_team', team);
  closeModal('modal-member');
  renderTeam();
  showToast(editingMemberId ? 'Membro aggiornato ✓' : 'Membro aggiunto ✓', 'success');
}

function deleteMember(id) {
  const m = team.find(m => m.id === id);
  if (!m) return;
  document.getElementById('confirm-msg').textContent = `Rimuovere ${m.firstname} ${m.lastname} dal team?`;
  document.getElementById('confirm-action-btn').onclick = () => {
    team = team.filter(m => m.id !== id);
    save('cilex_team', team);
    closeModal('modal-confirm');
    renderTeam();
    showToast('Membro eliminato');
  };
  document.getElementById('modal-confirm').classList.add('open');
}
