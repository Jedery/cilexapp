// ─── BOOKINGS TABLE ───────────────────────────────────────────────
function renderBookingsTable() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const st = document.getElementById('filter-status')?.value || '';
  const pr = document.getElementById('filter-product')?.value || '';

  const source = can('canViewAllBookings') ? bookings : bookings.filter(b => b.agentId === currentUser?.id);

  let filtered = [...source].reverse().filter(b => {
    const matchQ = !q || [b.name, b.email, b.phone, b.product].some(f => f?.toLowerCase().includes(q));
    const matchSt = !st || b.paymentStatus === st;
    const matchPr = !pr || b.product === pr;
    return matchQ && matchSt && matchPr;
  });

  document.getElementById('bookings-table-wrap').innerHTML = filtered.length
    ? renderTable(filtered, true)
    : `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nessun risultato trovato.</p></div>`;
}

function badgeHtml(status) {
  const map = { confirmed: ['badge-confirmed','Confermato'], pending: ['badge-pending','In attesa'], cancelled: ['badge-cancelled','Cancellato'] };
  const [cls, label] = map[status] || ['badge-pending', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderTable(list, showAll = false) {
  const rows = list.map(b => `
    <tr onclick="openDetail('${b.id}')">
      <td><div class="td-name">${b.name}</div><div class="td-sub">${b.phone || ''}</div></td>
      ${showAll ? `<td class="td-sub">${b.email || '—'}</td>` : ''}
      <td>${b.product || '—'}</td>
      <td>${b.pax || 1}</td>
      ${showAll ? `<td>${b.date ? formatDate(b.date) : '—'}</td>` : ''}
      <td>${b.total ? '€' + parseFloat(b.total).toFixed(0) : '—'}</td>
      <td>${b.paymentMethod || '—'}</td>
      <td>${badgeHtml(b.paymentStatus)}</td>
    </tr>
  `).join('');

  const extraTh = showAll
    ? `<th>Email</th><th>Prodotto</th><th>Pax</th><th>Data</th><th>Totale</th><th>Pagamento</th><th>Stato</th>`
    : `<th>Prodotto</th><th>Pax</th><th>Totale</th><th>Pagamento</th><th>Stato</th>`;

  return `<table><thead><tr><th>Cliente</th>${extraTh}</tr></thead><tbody>${rows}</tbody></table>`;
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ─── BOOKING SAVE/EDIT ────────────────────────────────────────────
function saveBooking() {
  const name = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const phoneNum = document.getElementById('f-phone').value.trim();
  const prefix = document.getElementById('f-phone-prefix')?.value || '';
  const phone = phoneNum ? (prefix + ' ' + phoneNum).trim() : '';
  const product = document.getElementById('f-product').value;
  const pax = document.getElementById('f-pax').value;

  if (!name || !email || !phoneNum || !product || !pax) {
    showToast('Compila i campi obbligatori (*)', 'error'); return;
  }

  recalcStatus();
  const paymentStatus = document.getElementById('f-payment-status').value;
  const id = document.getElementById('edit-id').value;
  const agentName = currentUser ? (currentUser.firstname + (currentUser.lastname ? ' ' + currentUser.lastname : '')) : '';

  const booking = {
    id: id || 'b' + Date.now(),
    name, email, phone, product, pax,
    date: document.getElementById('f-date').value,
    time: document.getElementById('f-time').value,
    agent: agentName,
    agentId: currentUser?.id || '',
    location: document.getElementById('f-location').value,
    language: document.getElementById('f-language').value,
    paymentMethod: document.getElementById('f-payment-method').value,
    paymentStatus,
    total: document.getElementById('f-total').value,
    deposit: document.getElementById('f-deposit').value,
    notes: document.getElementById('f-notes').value,
    createdAt: id ? (bookings.find(b => b.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
  };

  const isNew = !id;

  if (id) {
    const idx = bookings.findIndex(b => b.id === id);
    if (idx > -1) bookings[idx] = booking;
  } else {
    bookings.push(booking);
    pushNotif({
      type: 'system-info',
      title: 'Nuovo booking creato',
      text: `${agentName || 'Un promoter'} ha creato una prenotazione: ${booking.name} · ${booking.product} (${booking.pax} pax)`,
      audience: 'superadmin',
      bookingId: booking.id,
    });
  }
  save('cilex_bookings', bookings);
  updateBellBadge();
  showToast(id ? 'Prenotazione aggiornata ✓' : 'Prenotazione salvata ✓', 'success');

  // Send confirmation email only for new bookings (not edits)
  if (isNew) sendBookingConfirmation(booking);

  clearForm();
  showPage('bookings', null);
}

let _skipClearFormOnce = false;

function clearForm() {
  if (_skipClearFormOnce) { _skipClearFormOnce = false; return; }
  ['f-name','f-email','f-phone','f-deposit','f-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('f-pax').value = 1;
  document.getElementById('f-total').value = '';
  document.getElementById('f-date').value = '';
  document.getElementById('f-product').value = '';
  document.getElementById('f-payment-method').value = '';
  document.getElementById('f-language').value = '';
  document.getElementById('f-payment-status').value = 'pending';
  document.getElementById('f-payment-status-display').innerHTML = `<span class="badge badge-pending">In attesa</span><span style="font-size:11px;color:var(--text3)">Calcolato automaticamente</span>`;
  document.getElementById('edit-id').value = '';
  const prefixEl = document.getElementById('f-phone-prefix');
  if (prefixEl) prefixEl.value = '+39';
  const locEl = document.getElementById('f-location');
  if (locEl) locEl.value = '';
  document.getElementById('f-time').innerHTML = '<option value="">— Seleziona prima il prodotto —</option>';
  const agentEl = document.getElementById('f-agent');
  if (currentUser) agentEl.value = currentUser.firstname + (currentUser.lastname ? ' ' + currentUser.lastname : '');
}

function editBooking(id) {
  const b = bookings.find(b => b.id === id);
  if (!b) return;
  closeModal('modal-detail');
  populateProductSelect();
  populateLocationSelect();
  _skipClearFormOnce = true;
  showPage('new-booking', null);
  setTimeout(() => {
    document.getElementById('edit-id').value = b.id;
    document.getElementById('f-name').value = b.name || '';
    document.getElementById('f-email').value = b.email || '';
    const phoneStr = b.phone || '';
    const prefixMatch = phoneStr.match(/^(\+\d{1,4})\s?(.*)$/);
    const prefixEl = document.getElementById('f-phone-prefix');
    if (prefixMatch && prefixEl) {
      const opts = Array.from(prefixEl.options).map(o => o.value);
      if (opts.includes(prefixMatch[1])) {
        prefixEl.value = prefixMatch[1];
        document.getElementById('f-phone').value = prefixMatch[2];
      } else {
        document.getElementById('f-phone').value = phoneStr;
      }
    } else {
      document.getElementById('f-phone').value = phoneStr;
    }
    document.getElementById('f-product').value = b.product || '';
    document.getElementById('f-pax').value = b.pax || 1;
    document.getElementById('f-date').value = b.date || '';
    document.getElementById('f-agent').value = b.agent || '';
    document.getElementById('f-location').value = b.location || '';
    document.getElementById('f-language').value = b.language || '';
    document.getElementById('f-payment-method').value = b.paymentMethod || '';
    document.getElementById('f-total').value = b.total || '';
    recalcTotal();
    if (b.total) document.getElementById('f-total').value = b.total;
    document.getElementById('f-deposit').value = b.deposit || '';
    document.getElementById('f-notes').value = b.notes || '';
    document.getElementById('f-payment-status').value = b.paymentStatus || 'pending';
    updateTimeSlots();
    setTimeout(() => { document.getElementById('f-time').value = b.time || ''; }, 10);
    recalcStatus();
  }, 50);
}

function deleteBooking(id) {
  closeModal('modal-detail');
  const b = bookings.find(b => b.id === id);
  if (!b) return;
  document.getElementById('confirm-msg').textContent = `Eliminare la prenotazione di ${b.name}?`;
  document.getElementById('confirm-action-btn').onclick = () => {
    bookings = bookings.filter(b => b.id !== id);
    save('cilex_bookings', bookings);
    closeModal('modal-confirm');
    showToast('Prenotazione eliminata', 'error');
    renderBookingsTable();
    renderDashboard();
  };
  document.getElementById('modal-confirm').classList.add('open');
}

// ─── DETAIL MODAL ────────────────────────────────────────────────
function openDetail(id) {
  const b = bookings.find(b => b.id === id);
  if (!b) return;
  document.getElementById('modal-title').textContent = b.name;
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">${b.email || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Telefono</div><div class="detail-value">${b.phone || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Prodotto</div><div class="detail-value">${b.product || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Persone</div><div class="detail-value">${b.pax || 1}</div></div>
      <div class="detail-row"><div class="detail-label">Data</div><div class="detail-value">${b.date ? formatDate(b.date) : '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Orario</div><div class="detail-value">${b.time || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Lingua</div><div class="detail-value">${b.language || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Posizione vendita</div><div class="detail-value">${b.location || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Agente</div><div class="detail-value">${b.agent || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Pagamento</div><div class="detail-value">${b.paymentMethod || '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Stato</div><div class="detail-value">${badgeHtml(b.paymentStatus)}</div></div>
      <div class="detail-row"><div class="detail-label">Totale</div><div class="detail-value" style="color:var(--cyan)">${b.total ? '€' + parseFloat(b.total).toFixed(2) : '—'}</div></div>
      <div class="detail-row"><div class="detail-label">Acconto</div><div class="detail-value">${b.deposit ? '€' + parseFloat(b.deposit).toFixed(2) : '—'}</div></div>
      ${b.notes ? `<div class="detail-row detail-full"><div class="detail-label">Note</div><div class="detail-value" style="font-weight:400;color:var(--text2)">${b.notes}</div></div>` : ''}
    </div>
  `;
  document.getElementById('modal-edit-btn').onclick = () => editBooking(id);
  document.getElementById('modal-delete-btn').onclick = () => deleteBooking(id);
  const isOwn = b.agentId === currentUser?.id;
  document.getElementById('modal-edit-btn').style.display = (isSuperAdmin() || (can('canEditBooking') || isOwn)) ? '' : 'none';
  document.getElementById('modal-delete-btn').style.display = can('canDeleteBooking') ? '' : 'none';
  document.getElementById('modal-detail').classList.add('open');
}

// ─── SELECT POPULATION ────────────────────────────────────────────
function populateProductSelect() {
  const sel = document.getElementById('f-product');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleziona prodotto...</option>' +
    products.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

function populateProductFilter() {
  const sel = document.getElementById('filter-product');
  if (!sel) return;
  const names = [...new Set(products.map(p => p.name))];
  sel.innerHTML = '<option value="">Tutti i prodotti</option>' +
    names.map(n => `<option value="${n}">${n}</option>`).join('');
}

function populateLocationSelect() {
  const sel = document.getElementById('f-location');
  if (!sel) return;
  sel.innerHTML = '<option value="">—</option>' +
    locations.map(l => `<option value="${l}">${l}</option>`).join('');
}

// ─── PRICE & STATUS AUTO-CALC ─────────────────────────────────────
function onProductChange() {
  recalcTotal();
  updateTimeSlots();
}

function updateTimeSlots() {
  const productName = document.getElementById('f-product').value;
  const sel = document.getElementById('f-time');
  if (!productName) {
    sel.innerHTML = '<option value="">— Seleziona prima il prodotto —</option>';
    return;
  }
  const prod = products.find(p => p.name === productName);
  const slots = prod?.timeslots ? prod.timeslots.split('\n').map(s => s.trim()).filter(Boolean) : [];
  if (!slots.length) {
    sel.innerHTML = '<option value="">— Nessun orario configurato —</option>';
    return;
  }
  sel.innerHTML = '<option value="">Seleziona orario...</option>' +
    slots.map(s => `<option value="${s}">${s}</option>`).join('');
}

function recalcTotal() {
  const productName = document.getElementById('f-product').value;
  const pax = parseInt(document.getElementById('f-pax').value) || 1;
  const payMethod = document.getElementById('f-payment-method').value;
  const prod = products.find(p => p.name === productName);
  const price = prod ? (parseFloat(prod.price) || 0) : 0;
  const baseTotal = price * pax;

  const isCash = payMethod === 'Contanti' || payMethod === '' || !payMethod;
  const surcharge = isCash ? 0 : Math.ceil(baseTotal * 0.10);
  const total = baseTotal + surcharge;

  document.getElementById('f-total').value = total > 0 ? total.toFixed(2) : '';

  const noteEl = document.getElementById('f-surcharge-note');
  const textEl = document.getElementById('f-surcharge-text');
  if (noteEl && textEl) {
    if (!isCash && baseTotal > 0) {
      textEl.textContent = '+10% pagamento elettronico: +€' + surcharge + ' (base €' + baseTotal.toFixed(0) + ')';
      noteEl.style.display = 'flex';
    } else {
      noteEl.style.display = 'none';
    }
  }

  recalcStatus();
}

function recalcStatus() {
  const total = parseFloat(document.getElementById('f-total').value) || 0;
  const deposit = parseFloat(document.getElementById('f-deposit').value) || 0;
  const status = (total > 0 && deposit >= total) ? 'confirmed' : 'pending';
  document.getElementById('f-payment-status').value = status;
  const display = document.getElementById('f-payment-status-display');
  const badgeMap = {
    confirmed: `<span class="badge badge-confirmed">Confermato</span><span style="font-size:11px;color:var(--text3);margin-left:4px">Pagamento completo</span>`,
    pending:   `<span class="badge badge-pending">In attesa</span><span style="font-size:11px;color:var(--text3);margin-left:4px">Calcolato automaticamente</span>`,
    cancelled: `<span class="badge badge-cancelled">Cancellato</span>`,
  };
  display.innerHTML = badgeMap[status];
}
