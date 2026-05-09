// ─── PRODUCTS ────────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-img-area" style="background:${p.color || '#F5F5F5'}">${p.emoji || '📦'}</div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc || ''}</div>
        ${p.duration ? `<div style="font-size:11px;color:var(--text3);margin-bottom:4px">⏱ ${p.duration}</div>` : ''}
        ${p.commission ? `<div style="font-size:11px;color:#A78BFA;margin-bottom:4px">💰 Commissione: ${p.commission}%</div>` : ''}
        ${p.timeslots ? `<div style="font-size:11px;color:var(--cyan);margin-bottom:8px">🕐 ${p.timeslots.split('\n').filter(Boolean).length} fasce orarie</div>` : ''}
        <div class="product-footer">
          <div class="product-price">Da €${p.price || 0} / pers.</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')">Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">×</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddProduct() {
  editingProductId = null;
  document.getElementById('modal-product-title').textContent = 'Nuovo Prodotto';
  ['p-name','p-desc','p-price','p-emoji','p-duration','p-notes','p-timeslots','p-commission'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-color').value = '#1A1A1A';
  document.getElementById('p-emoji').value = '📦';
  document.getElementById('modal-product').classList.add('open');
}

function editProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('modal-product-title').textContent = 'Modifica Prodotto';
  document.getElementById('p-name').value = p.name || '';
  document.getElementById('p-desc').value = p.desc || '';
  document.getElementById('p-price').value = p.price || '';
  document.getElementById('p-emoji').value = p.emoji || '';
  document.getElementById('p-color').value = p.color || '#1A1A1A';
  document.getElementById('p-duration').value = p.duration || '';
  document.getElementById('p-notes').value = p.notes || '';
  document.getElementById('p-timeslots').value = p.timeslots || '';
  document.getElementById('p-commission').value = p.commission || '';
  document.getElementById('modal-product').classList.add('open');
}

function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  if (!name) { showToast('Inserisci il nome del prodotto', 'error'); return; }
  const product = {
    id: editingProductId || 'p' + Date.now(),
    name,
    desc: document.getElementById('p-desc').value,
    price: parseFloat(document.getElementById('p-price').value) || 0,
    emoji: document.getElementById('p-emoji').value || '📦',
    color: document.getElementById('p-color').value,
    duration: document.getElementById('p-duration').value,
    notes: document.getElementById('p-notes').value,
    timeslots: document.getElementById('p-timeslots').value.trim(),
    commission: parseFloat(document.getElementById('p-commission').value) || 0,
  };
  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx > -1) products[idx] = product;
  } else {
    products.push(product);
  }
  save('cilex_products', products);
  closeModal('modal-product');
  renderProducts();
  showToast(editingProductId ? 'Prodotto aggiornato ✓' : 'Prodotto aggiunto ✓', 'success');
}

function deleteProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  document.getElementById('confirm-msg').textContent = `Eliminare il prodotto "${p.name}"?`;
  document.getElementById('confirm-action-btn').onclick = () => {
    products = products.filter(p => p.id !== id);
    save('cilex_products', products);
    closeModal('modal-confirm');
    renderProducts();
    showToast('Prodotto eliminato');
  };
  document.getElementById('modal-confirm').classList.add('open');
}
