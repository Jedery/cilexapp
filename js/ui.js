// ─── MODALS ──────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function initModalOverlays() {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
}

// ─── TOAST ───────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── EXPORT CSV ──────────────────────────────────────────────────
function exportCSV() {
  if (!bookings.length) { showToast('Nessun booking da esportare', 'error'); return; }
  const headers = ['ID','Nome','Email','Telefono','Prodotto','Persone','Data','Orario','Posizione','Agente','Lingua','Metodo Pagamento','Stato Pagamento','Totale','Acconto','Note','Creato il'];
  const rows = bookings.map(b => [
    b.id, b.name, b.email, b.phone, b.product, b.pax, b.date, b.time,
    b.location, b.agent, b.language, b.paymentMethod, b.paymentStatus,
    b.total, b.deposit, (b.notes || '').replace(/\n/g,' '),
    b.createdAt ? new Date(b.createdAt).toLocaleDateString('it-IT') : ''
  ].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cilex_booking_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('CSV esportato ✓', 'success');
}
