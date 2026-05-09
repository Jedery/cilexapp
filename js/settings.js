// ─── SETTINGS ────────────────────────────────────────────────────
function renderSettings() {
  if (!isSuperAdmin()) return;
  const perms = loadPerms();
  const permRows = Object.entries(perms).map(([key, val]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--text)">${val.label}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Tutti i Promoter</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${val.promoter ? 'checked' : ''} onchange="togglePerm('${key}', this.checked)">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>`).join('');

  document.getElementById('settings-wrap').innerHTML = `
    <div style="max-width:600px">
      <div class="card" style="padding:0 20px 8px;margin-bottom:20px">
        <div style="padding:16px 0 14px;border-bottom:1px solid var(--border);margin-bottom:4px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--cyan)">Permessi Promoter</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">Abilita o disabilita funzionalità per i Promoter</div>
        </div>
        ${permRows}
      </div>

      <div class="card" style="padding:20px;margin-bottom:20px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--cyan);margin-bottom:4px">Posizioni Vendita</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Spiagge e location dove operano i promoter. Appaiono nel form prenotazione.</div>
        <div id="locations-list" style="margin-bottom:12px"></div>
        <div style="display:flex;gap:8px">
          <input type="text" id="new-location-input" placeholder="Es. Cala Comte" style="flex:1;padding:8px 11px;font-size:13px;border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-family:'Barlow',sans-serif;outline:none" onkeydown="if(event.key==='Enter')addLocation()">
          <button class="btn btn-gold btn-sm" onclick="addLocation()">+ Aggiungi</button>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-bottom:20px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--cyan);margin-bottom:14px">Ruoli Superadmin</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7">
          Il seguente ruolo ha sempre accesso completo (SuperAdmin) e non è soggetto ai permessi sopra:<br>
          <span style="color:var(--cyan);font-weight:600;font-size:13px">Manager</span><br>
          <span style="color:var(--text3);margin-top:4px;display:inline-block">Tutti gli altri ruoli (Founder, Promoter LG, Promoter Spiaggia, Altro) sono Promoter.</span>
        </div>
      </div>

      <div class="card" style="padding:20px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--cyan);margin-bottom:14px">Gestione Dati</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="exportCSV()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Esporta CSV Booking
          </button>
          <button class="btn btn-danger btn-sm" onclick="resetAllData()">Cancella tutti i dati</button>
        </div>
      </div>
    </div>`;

  renderLocationsList();
}

function renderLocationsList() {
  const el = document.getElementById('locations-list');
  if (!el) return;
  if (!locations.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:8px 0">Nessuna posizione ancora.</div>`;
    return;
  }
  el.innerHTML = locations.map((l, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface2);border-radius:var(--radius);margin-bottom:6px;border:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text);display:flex;align-items:center;gap:8px">
        <span style="color:var(--text3)">📍</span> ${l}
      </span>
      <button class="btn-icon danger" onclick="deleteLocation(${i})" title="Rimuovi">🗑</button>
    </div>`).join('');
}

function addLocation() {
  const input = document.getElementById('new-location-input');
  const val = input?.value.trim();
  if (!val) { showToast('Inserisci il nome della posizione', 'error'); return; }
  if (locations.includes(val)) { showToast('Posizione già presente', 'error'); return; }
  locations.push(val);
  save('cilex_locations', locations);
  input.value = '';
  renderLocationsList();
  showToast('Posizione aggiunta ✓', 'success');
}

function deleteLocation(idx) {
  const name = locations[idx];
  document.getElementById('confirm-msg').textContent = `Rimuovere la posizione "${name}"?`;
  document.getElementById('confirm-action-btn').textContent = 'Rimuovi';
  document.getElementById('confirm-action-btn').onclick = () => {
    locations.splice(idx, 1);
    save('cilex_locations', locations);
    closeModal('modal-confirm');
    renderLocationsList();
    showToast('Posizione rimossa');
  };
  document.getElementById('modal-confirm').classList.add('open');
}

function togglePerm(key, value) {
  const perms = loadPerms();
  if (perms[key]) perms[key].promoter = value;
  save('cilex_perms', perms);
  showToast('Permesso aggiornato ✓', 'success');
  buildNav();
}

function resetAllData() {
  document.getElementById('confirm-msg').textContent = 'Eliminare TUTTI i booking? Questa azione è irreversibile.';
  document.getElementById('confirm-action-btn').textContent = 'Elimina tutto';
  document.getElementById('confirm-action-btn').onclick = () => {
    bookings = [];
    save('cilex_bookings', []);
    closeModal('modal-confirm');
    showToast('Dati eliminati', 'error');
    renderSettings();
  };
  document.getElementById('modal-confirm').classList.add('open');
}
