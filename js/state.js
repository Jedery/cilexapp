// ─── STORAGE HELPERS ─────────────────────────────────────────────
function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  // Fire-and-forget sync to Supabase (defined in db.js, safe to call before it loads)
  if (typeof dbSyncKey === 'function') dbSyncKey(key, val);
}

// ─── DEFAULT DATA ─────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Open Bar', desc: 'Accesso illimitato al bar con drink inclusi per tutta la serata.', price: 35, emoji: '🍹', color: '#FFF8ED', duration: 'Serata', notes: '' },
  { id: 'p2', name: 'Escursione Formentera', desc: 'Gita in barca verso Formentera con snorkeling e pranzo incluso.', price: 65, emoji: '⛵', color: '#EDF5FF', duration: 'Tutto il giorno', notes: '' },
  { id: 'p3', name: 'Cena Spettacolo', desc: 'Cena di gala con show di intrattenimento live incluso.', price: 90, emoji: '🎭', color: '#F0EDFF', duration: '3 ore', notes: '' },
  { id: 'p4', name: 'Pranzo Cala Bassa', desc: 'Pranzo esclusivo con vista panoramica sulla baia di Cala Bassa.', price: 55, emoji: '🏖️', color: '#EDFAF0', duration: '2 ore', notes: '' },
  { id: 'p5', name: 'Boat Party', desc: 'Festa in barca con DJ set, open bar e tramonto sull\'isola.', price: 75, emoji: '🚢', color: '#FFF0F0', duration: '4 ore', notes: '' },
];

// ─── APP STATE ────────────────────────────────────────────────────
let bookings    = load('cilex_bookings', []);
let products    = load('cilex_products', DEFAULT_PRODUCTS);
let team        = load('cilex_team', []);

// Called by initApp() after dbLoadAll() so the admin always exists in the loaded dataset
function ensureAdminInTeam() {
  const adminExists = team.find(m =>
    ((m.firstname || '') + ' ' + (m.lastname || '')).trim().toLowerCase() === 'ignazio lanza'
  );
  if (!adminExists) {
    team.unshift({
      id: 'admin-ignazio',
      firstname: 'Ignazio',
      lastname: 'Lanza',
      role: 'manager',
      phone: '',
      email: '',
      notes: 'Amministratore',
      pin: ''
    });
    save('cilex_team', team);
  }
}

let currentUser   = load('cilex_current_user', null);
let locations     = load('cilex_locations', ['Cala Comte', 'Playa d\'en Bossa', 'Ibiza Town', 'San Antonio', 'Talamanca']);
let notifications = load('cilex_notifications', []);
let notifReadMap  = load('cilex_notif_read', {});

// UI state
let notifFilter     = 'all';
let notifSearch     = '';
let notifPanelOpen  = false;
let editingProductId = null;
let editingMemberId  = null;
let pinTarget        = null;
let pinBuffer        = '';
let dropdownOpen     = false;

// ─── PERMISSIONS ─────────────────────────────────────────────────
const SUPERADMIN_ROLES = ['manager'];

const DEFAULT_PERMS = {
  canViewAllBookings:  { label: 'Vedi tutti i booking',       promoter: false },
  canDeleteBooking:    { label: 'Elimina booking',            promoter: false },
  canEditBooking:      { label: 'Modifica booking altrui',    promoter: false },
  canViewTeam:         { label: 'Vedi sezione Team',          promoter: false },
  canViewProducts:     { label: 'Vedi sezione Prodotti',      promoter: true  },
  canViewStats:        { label: 'Vedi statistiche dashboard', promoter: false },
  canExportCSV:        { label: 'Esporta CSV',                promoter: false },
};

function loadPerms() {
  const saved = load('cilex_perms', null);
  if (!saved) return DEFAULT_PERMS;
  const migrated = {};
  for (const [key, def] of Object.entries(DEFAULT_PERMS)) {
    if (saved[key] !== undefined) {
      const val = saved[key];
      migrated[key] = {
        label: def.label,
        promoter: val.promoter !== undefined ? val.promoter : (val.staff !== undefined ? val.staff : def.promoter)
      };
    } else {
      migrated[key] = { ...def };
    }
  }
  return migrated;
}

function isSuperAdmin() {
  return currentUser && SUPERADMIN_ROLES.includes(currentUser.role);
}

function can(key) {
  if (isSuperAdmin()) return true;
  const perms = loadPerms();
  return perms[key]?.promoter === true;
}

// ─── CONSTANTS ────────────────────────────────────────────────────
const ROLE_LABELS = {
  'founder': 'Founder', 'manager': 'Manager',
  'promoter-lg': 'Team LG', 'promoter-spiaggia': 'Team Spiaggia', 'altro': 'Altro'
};
const AV_CLASSES = ['av-0','av-1','av-2','av-3','av-4','av-5'];
