# CILEX IBIZA — Booking Manager
## Documentazione Tecnica Completa v21
> Ultima versione: `cilex_ibiza_21.html`  
> Aggiornato: Maggio 2026

---

## INDICE

1. [Panoramica Progetto](#1-panoramica-progetto)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Struttura File](#3-struttura-file)
4. [Architettura App](#4-architettura-app)
5. [Sistema di Login e Ruoli](#5-sistema-di-login-e-ruoli)
6. [Credenziali e Configurazione](#6-credenziali-e-configurazione)
7. [Struttura Dati (localStorage)](#7-struttura-dati-localstorage)
8. [Permessi Granulari](#8-permessi-granulari)
9. [Sezioni dell'App](#9-sezioni-dellapp)
10. [Componenti UI Chiave](#10-componenti-ui-chiave)
11. [Design System](#11-design-system)
12. [Responsive / Mobile](#12-responsive--mobile)
13. [Bug Risolti (v21)](#13-bug-risolti-v21)
14. [To-Do / Miglioramenti Consigliati](#14-to-do--miglioramenti-consigliati)
15. [Deploy su Netlify](#15-deploy-su-netlify)

---

## 1. Panoramica Progetto

**Cilex Ibiza Booking Manager** è una **Single Page Application (SPA)** completamente client-side per la gestione delle prenotazioni di un'azienda di eventi a Ibiza.

### Funzionalità principali:
- Login multi-utente con 2 livelli di accesso (Manager / Promoter)
- Creazione, modifica, eliminazione prenotazioni
- Gestione prodotti/pacchetti con fasce orarie e commissioni
- Gestione team con ruoli e PIN di accesso
- Sistema notifiche interno con urgenze automatiche
- Dashboard con statistiche per periodo
- Export CSV dei booking
- Foto profilo con crop automatico
- Calcolo automatico commissioni (+10% per pagamenti elettronici)
- Impostazioni permessi granulari per promoter

### Limiti attuali:
- **Nessun backend**: tutti i dati in `localStorage` del browser
- **No sync**: ogni dispositivo ha i propri dati separati
- **No email reali**: il campo email è solo dati, nessun invio automatico

---

## 2. Stack Tecnologico

| Componente | Tecnologia |
|---|---|
| Linguaggio | HTML5 + CSS3 + JavaScript ES6+ (Vanilla) |
| Framework | Nessuno — zero dipendenze runtime |
| Font | Google Fonts: `Barlow Condensed` (titoli) + `Barlow` (corpo) |
| Storage | `localStorage` del browser |
| Deploy | Netlify (static hosting) |
| Dimensione file | ~155 KB (tutto in 1 file) |

---

## 3. Struttura File

L'intera applicazione è **un singolo file HTML**:

```
cilex_ibiza_21.html
├── <head>
│   ├── meta viewport (mobile-optimized)
│   ├── Google Fonts link
│   └── <style> — tutto il CSS (~800 righe)
├── <body>
│   ├── #login-screen — schermata di login (position:fixed overlay)
│   ├── .layout
│   │   ├── <aside.sidebar> — navigazione desktop
│   │   └── <div.main>
│   │       ├── .topbar — barra superiore
│   │       ├── #page-dashboard
│   │       ├── #page-bookings
│   │       ├── #page-new-booking
│   │       ├── #page-products
│   │       ├── #page-team
│   │       └── #page-settings
│   ├── Modali (overlay): detail, product, member, broadcast, confirm, logout
│   ├── #toast — notifica temporanea
│   ├── <nav.tab-bar> — navigazione mobile (built dinamicamente)
│   └── <script> — tutto il JavaScript (~1400 righe)
```

---

## 4. Architettura App

### Pattern SPA (Single Page Application)

L'app usa un sistema di "pagine virtuali" basato su classi CSS:

```javascript
// Mostrare una pagina:
showPage('dashboard', navElement);

// Ogni pagina è un div con id="page-{nome}"
// La pagina attiva ha classe .active → display:block
// Le altre → display:none
```

### Flusso di inizializzazione:

```
DOMContentLoaded
    └── initApp()
            ├── SE currentUser in localStorage
            │       ├── Nascondi login screen
            │       ├── buildNav() — costruisce sidebar + tab bar
            │       ├── updateUserPill() — aggiorna avatar topbar
            │       ├── renderDashboard()
            │       └── runSystemNotifChecks()
            └── ALTRIMENTI
                    └── showPromoterLogin()
```

### Stato globale (variabili JS principali):

```javascript
let bookings    = []   // Array di prenotazioni
let products    = []   // Array di prodotti/pacchetti
let team        = []   // Array di membri del team
let currentUser = null // Utente loggato correntemente
let locations   = []   // Posizioni di vendita
let notifications = [] // Sistema notifiche
let notifReadMap  = {} // { userId: [notifId, ...] }
```

---

## 5. Sistema di Login e Ruoli

### Due livelli di accesso:

#### 🔐 MANAGER (SuperAdmin)
- Accesso tramite: **"Accesso manager"** → password segreta → selezione profilo
- Accesso completo a tutto: booking di tutti, team, impostazioni, export CSV
- Può inviare notifiche broadcast a tutti i promoter
- Vede statistiche globali

#### 👤 PROMOTER (Utente base)
- Accesso tramite: nome completo + password (PIN o default)
- Vede solo i propri booking
- Permessi configurabili dall'admin (vedi sezione Permessi)

### Flusso login MANAGER:
```
1. Tappa "Accesso manager →"
2. Inserisce ADMIN_PASSWORD ('Cilexsecret00')
3. Lista profili si apre automaticamente
4. Tocca il profilo desiderato → login immediato
```

### Flusso login PROMOTER:
```
1. Inserisce Nome Cognome (es. "Marco Rossi")
2. Inserisce password:
   - SE ha un PIN a 4 cifre impostato → usa quello
   - ALTRIMENTI → password default 'Cilex2026'
3. Accede
```

### Ruoli disponibili:

| Ruolo (chiave) | Etichetta UI | Livello |
|---|---|---|
| `manager` | Manager | SuperAdmin |
| `founder` | Founder | Promoter |
| `promoter-lg` | Team LG | Promoter |
| `promoter-spiaggia` | Team Spiaggia | Promoter |
| `altro` | Altro | Promoter |

> **Nota**: Solo `manager` ha accesso SuperAdmin. Gli altri ruoli, incluso `founder`, sono trattati come Promoter.  
> Per aggiungere ruoli SuperAdmin, modificare l'array:
> ```javascript
> const SUPERADMIN_ROLES = ['manager']; // aggiungere altri ruoli qui
> ```

---

## 6. Credenziali e Configurazione

### ⚠️ VALORI DA CAMBIARE PRIMA DEL DEPLOY IN PRODUZIONE

Tutte le costanti di configurazione si trovano nella sezione `LOGIN` dello script (`// ─── LOGIN ───`):

```javascript
// Riga ~2828 del file
const ADMIN_PASSWORD = 'Cilexsecret00';  // ← CAMBIARE
const ADMIN_USERNAME = 'Ignazio Lanza';  // ← Nome dell'admin principale
```

### Password default promoter:
```javascript
// Riga ~2872
const memberPwd = member.pin || 'Cilex2026';  // ← CAMBIARE la default
```

### Admin auto-creato all'avvio:
```javascript
// Riga ~1427 — questo blocco crea Ignazio Lanza se non esiste nel team
(function ensureAdminInTeam() {
  // Se si vuole cambiare l'admin di default, modificare qui:
  firstname: 'Ignazio',
  lastname: 'Lanza',
  role: 'manager',
  // ...
})();
```

### Stagione (etichetta in sidebar):
```html
<!-- Riga ~888 -->
<div class="season-pill">☀️ Stagione 2026</div>
```

---

## 7. Struttura Dati (localStorage)

### Chiavi localStorage:

| Chiave | Tipo | Descrizione |
|---|---|---|
| `cilex_bookings` | Array | Tutte le prenotazioni |
| `cilex_products` | Array | Prodotti/pacchetti |
| `cilex_team` | Array | Membri del team |
| `cilex_current_user` | Object\|null | Sessione attiva |
| `cilex_locations` | Array | Posizioni di vendita |
| `cilex_notifications` | Array | Notifiche (max 200) |
| `cilex_notif_read` | Object | `{ userId: [notifId...] }` |
| `cilex_perms` | Object | Permessi promoter |
| `cilex_money_hidden` | Boolean | Nascondi importi dashboard |
| `cilex_profile_img_{id}` | String | Foto profilo base64 (per utente) |

### Schema Booking:
```javascript
{
  id: 'b1716123456789',          // 'b' + Date.now()
  name: 'Mario Rossi',           // Nome cliente (obbligatorio)
  email: 'mario@email.com',      // Email cliente (obbligatorio)
  phone: '+39 333 1234567',       // Prefisso + numero
  product: 'Open Bar',           // Nome prodotto (obbligatorio)
  pax: 2,                        // Numero persone (obbligatorio)
  date: '2026-07-15',            // Data evento (YYYY-MM-DD)
  time: '21:00 - 00:00',         // Fascia oraria
  agent: 'Marco La Fata',        // Nome promoter
  agentId: 't1716000000000',     // ID promoter
  location: 'Cala Comte',        // Posizione di vendita
  language: 'Italiano',          // Lingua cliente
  paymentMethod: 'Contanti',     // Metodo pagamento
  paymentStatus: 'pending',      // 'confirmed' | 'pending' | 'cancelled'
  total: '35.00',                // Totale (calcolato auto)
  deposit: '20.00',              // Acconto ricevuto
  notes: 'Note interne...',      // Note
  createdAt: '2026-05-08T...'    // ISO timestamp creazione
}
```

### Schema Prodotto:
```javascript
{
  id: 'p1',                      // Univoco
  name: 'Open Bar',              // Nome (obbligatorio)
  desc: 'Descrizione...',        // Testo descrittivo
  price: 35,                     // Prezzo base €/persona
  emoji: '🍹',                   // Icona card
  color: '#FFF8ED',              // Colore sfondo card
  duration: 'Serata',            // Durata (testo libero)
  notes: 'Info per email...',    // Note (per futura email di conferma)
  timeslots: '21:00 - 00:00\n22:00 - 01:00', // Fasce orarie (una per riga)
  commission: 10                 // % commissione promoter
}
```

### Schema Membro Team:
```javascript
{
  id: 't1716000000000',          // 't' + Date.now() (o 'admin-ignazio')
  firstname: 'Marco',
  lastname: 'La Fata',
  role: 'promoter-lg',           // Vedi tabella ruoli
  phone: '+39 333 1234567',
  email: 'marco@cilex.com',
  notes: 'Zona: San Antonio',
  pin: '1234'                    // 4 cifre, o '' per password default
}
```

### Schema Notifica:
```javascript
{
  id: 'n1716000000000xyz',
  createdAt: '2026-05-08T13:33:00.000Z',
  type: 'system-urgent',         // 'system-urgent' | 'system-warning' | 'system-info' | 'message'
  title: 'Titolo notifica',
  text: 'Testo...',
  audience: 'all',               // 'all' (→ promoter) | 'superadmin' | 'everyone' | [userId, ...]
  fromId: 'system',              // ID mittente o 'system'
  fromName: 'Sistema',
  bookingId: 'b123...'           // Opzionale: link a booking
}
```

---

## 8. Permessi Granulari

Il Manager può abilitare/disabilitare funzionalità per tutti i Promoter dalla sezione **Impostazioni**.

### Permessi configurabili:

| Chiave | Default Promoter | Descrizione |
|---|---|---|
| `canViewAllBookings` | ❌ | Vede booking di tutti (non solo i propri) |
| `canDeleteBooking` | ❌ | Può eliminare prenotazioni |
| `canEditBooking` | ❌ | Può modificare booking altrui |
| `canViewTeam` | ❌ | Accesso alla sezione Team |
| `canViewProducts` | ✅ | Accesso alla sezione Prodotti |
| `canViewStats` | ❌ | Statistiche avanzate dashboard |
| `canExportCSV` | ❌ | Export CSV booking |

> **Nota**: I permessi si applicano a TUTTI i promoter (non individualmente per utente). Per permessi per-utente servirebbe un'estensione del sistema.

### Come aggiungere un nuovo permesso:
```javascript
// 1. Aggiungere in DEFAULT_PERMS (riga ~1462):
const DEFAULT_PERMS = {
  // ...esistenti...
  canNuovoPermesso: { label: 'Descrizione visibile', promoter: false },
};

// 2. Usarlo nel codice:
if (can('canNuovoPermesso')) {
  // permesso concesso
}
```

---

## 9. Sezioni dell'App

### Dashboard
- **Admin**: totale booking, confermati, in attesa, incasso totale (nascondibile)
- **Promoter**: statistiche personali filtrabili per periodo (Oggi / 3 Giorni / Settimana / Mese), commissioni, banner urgenze pagamento per eventi imminenti (≤7 giorni)
- Foto profilo cliccabile con crop automatico (salva in base64 nel localStorage)

### Booking
- Tabella con filtri: ricerca testo libero, stato pagamento, prodotto
- Admin vede tutti i booking; Promoter vede solo i propri (salvo permesso `canViewAllBookings`)
- Click su riga apre modal dettaglio con azioni Modifica/Elimina

### Nuova Prenotazione / Edit
- Form completo: dati cliente (nome, email, telefono con prefisso internazionale, lingua), prodotto + fascia oraria, data, posizione di vendita
- **Calcolo automatico totale**: prezzo × pax + 10% (arrotondato per eccesso) se pagamento non è Contanti
- **Stato pagamento automatico**: "Confermato" se acconto ≥ totale, altrimenti "In attesa"
- In modalità Edit, i dati vengono pre-popolati senza resettare il form

### Prodotti
- Griglia di card con emoji, colore, prezzo, commissione, fasce orarie
- Modal per creare/modificare prodotto
- Visibile ai promoter solo se `canViewProducts = true`

### Team
- Card organizzate per ruolo con contatti cliccabili (tel/email)
- Modal per aggiungere/modificare membro con impostazione PIN
- Solo Manager può modificare il team (a meno che `canViewTeam` non sia abilitato per promoter)

### Impostazioni (solo Manager)
- Toggle permessi promoter
- Gestione posizioni di vendita (add/remove)
- Info ruoli SuperAdmin
- Export CSV + Reset dati

### Notifiche
- **Desktop**: pannello dropdown dal button campanella (topbar)
- **Mobile promoter**: tab "Notifiche" nella tab bar
- **Mobile manager**: campanella in topbar
- Filtri: Tutte / Non lette / Sistema / Messaggi
- Ricerca testo nelle notifiche
- Auto-generazione notifiche urgenti per booking pendenti con evento entro 3 giorni
- Manager può inviare broadcast a tutti i promoter o a utenti specifici

---

## 10. Componenti UI Chiave

### Toast (notifica temporanea)
```javascript
showToast('Messaggio', 'success'); // tipo: '' | 'success' | 'error'
// Scompare dopo 2.8 secondi
```

### Modal generica
```javascript
// Aprire:
document.getElementById('modal-confirm').classList.add('open');
// Chiudere:
closeModal('modal-confirm');
// Click fuori chiude automaticamente
```

### Conferma eliminazione
```javascript
document.getElementById('confirm-msg').textContent = 'Testo di conferma?';
document.getElementById('confirm-action-btn').onclick = () => { /* azione */ };
document.getElementById('modal-confirm').classList.add('open');
```

### Calcolo prezzo
```javascript
// Chiamato automaticamente su cambio prodotto o metodo pagamento
recalcTotal(); // → aggiorna f-total
recalcStatus(); // → aggiorna f-payment-status
```

---

## 11. Design System

### Variabili CSS (`:root`):

```css
--cyan: #3EC6D4           /* Colore principale brand */
--cyan-dark: #25A0AD      /* Hover cyan */
--cyan-dim: rgba(62,198,212,0.12)    /* Sfondo highlight */
--cyan-border: rgba(62,198,212,0.25) /* Bordo highlight */

--bg: #0A0A0A             /* Sfondo pagina */
--surface: #111111         /* Sfondo card/sidebar */
--surface2: #1A1A1A        /* Sfondo hover/input */
--surface3: #222222        /* Sfondo terziario */

--border: rgba(255,255,255,0.07)     /* Bordo sottile */
--border-strong: rgba(255,255,255,0.14) /* Bordo visibile */

--text: #F0F0F0            /* Testo principale */
--text2: #888888           /* Testo secondario */
--text3: #555555           /* Testo placeholder/label */

--radius: 8px              /* Border radius standard */
--radius-lg: 12px          /* Border radius card/modal */
```

### Font:
- **Titoli / UI condensed**: `Barlow Condensed` (weight 700–800)
- **Corpo / Label**: `Barlow` (weight 300–600)

### Classi bottoni:
```css
.btn           /* Base */
.btn-gold      /* Azione primaria (cyan sfondo) */
.btn-primary   /* Alias btn-gold (usato nel login) */
.btn-outline   /* Azione secondaria (bordo) */
.btn-danger    /* Azione distruttiva (rosso) */
.btn-ghost     /* Trasparente */
.btn-sm        /* Variante piccola */
.btn-icon      /* Icona quadrata 28×28 */
```

### Badge stato pagamento:
```css
.badge-confirmed  /* Verde: pagamento completo */
.badge-pending    /* Giallo: in attesa */
.badge-cancelled  /* Rosso: cancellato */
```

### Colori avatar:
```css
.av-0  /* Cyan */
.av-1  /* Verde */
.av-2  /* Viola */
.av-3  /* Giallo */
.av-4  /* Rosso */
.av-5  /* Arancio */
/* Assegnati per indice: team.indexOf(member) % 6 */
```

---

## 12. Responsive / Mobile

### Breakpoint: `max-width: 768px`

Su mobile:
- **Sidebar nascosta** → sostituita da **tab bar fissa** in basso
- **Modali** aprono dal basso (bottom sheet)
- **Form** a colonna singola
- **Tabelle** scrollabili orizzontalmente
- **Font size input ≥ 16px** per evitare zoom automatico iOS
- **Export CSV nascosto** (non utile su mobile)
- **Pannello notifiche** fullscreen
- **Prevenzione zoom**: `touch-action: manipulation` + blocco gesture events (per Safari)

### Tab bar mobile (costruita dinamicamente in `buildNav()`):

```
Manager:  [Home] [Booking] [+] [Prodotti] [Team]
Promoter: [Home] [Booking] [+] [Prodotti] [Notifiche🔔]
```

> Il bottone `+` centrale è sempre visibile ed evidenziato (cyan) per creare nuove prenotazioni velocemente.

### Safe Area (iPhone con notch):
```css
padding-bottom: env(safe-area-inset-bottom);
```

---

## 13. Bug Risolti (v21)

| # | Bug | Fix applicata |
|---|---|---|
| 1 | `btn-primary` non definita → bottoni login senza stile | Aggiunta classe CSS |
| 2 | `f-surcharge-note` aveva `display:none` e `display:flex` inline contemporaneamente | Rimosso conflitto |
| 3 | Sidebar HTML hardcoded → non rispettava permessi | Sidebar ora costruita solo da `buildNav()` |
| 4 | Tab bar HTML hardcoded → 5 tab fisse per tutti | Tab bar ora costruita solo da `buildNav()` |
| 5 | `editBooking()` → form si svuotava dopo fill | Flag `_skipClearFormOnce` aggiunto |
| 6 | `editBooking()` → select location vuota in edit | Aggiunta chiamata `populateLocationSelect()` |
| 7 | `switchUser()` chiamava `logout()` → loop modal | `switchUser()` ora gestisce direttamente il modal |
| 8 | Dropdown utente fuori viewport su mobile | `position:fixed` invece di `absolute` |
| 9 | Pannello notifiche `position:absolute` topbar | `position:fixed` con z-index corretto |
| 10 | Tab badge notifiche con doppio `display:none` | Rimosso duplicato inline style |
| 11 | `showPage(id, null)` non aggiornava tab/sidebar | Logica active state resa robusta |
| 12 | Admin "Ignazio Lanza" non nel team → login falliva | Auto-creato all'avvio se assente |
| 13 | Lista profili admin vuota se campo empty | Lista mostra tutti i profili all'apertura e al focus |
| 14 | Doppio tap per login admin (fill + click Accedi) | `pickAdminProfile()` ora fa login direttamente |

---

## 14. To-Do / Miglioramenti Consigliati

### 🔴 Priorità alta (impattano usabilità reale)

1. **Backend + sync dati reali**
   - Attualmente ogni browser/dispositivo ha dati separati
   - Soluzione consigliata: Supabase (PostgreSQL + REST) o Firebase Firestore
   - Alternativa leggera: PocketBase (self-hosted)

2. **Email di conferma automatica**
   - Aggiungere invio email al cliente al salvataggio booking
   - Tool: Resend, Mailgun, o EmailJS (per client-side)

3. **Autenticazione sicura**
   - La password admin è in chiaro nel JS (visibile nel source)
   - Soluzione: spostare auth su backend con JWT

### 🟡 Priorità media

4. **PIN per-utente più sicuro**
   - Attualmente il PIN viene salvato in chiaro nel localStorage
   - Hasharle con bcrypt lato server, o almeno SHA-256 client-side

5. **Permessi per-utente** (non solo per tutti i promoter)
   - Aggiungere array `permissions[]` per ogni membro del team

6. **Ricerca booking migliorata**
   - Aggiungere filtro per data range
   - Aggiungere filtro per agente (solo admin)

7. **Statistiche avanzate per admin**
   - Grafico booking per settimana/mese
   - Top promoter per performance
   - Revenue breakdown per prodotto

8. **Esportazione PDF prenotazione**
   - Generare voucher PDF per il cliente

### 🟢 Priorità bassa / Nice-to-have

9. **PWA (Progressive Web App)**
   - Aggiungere `manifest.json` e Service Worker
   - Permettere installazione su homescreen iOS/Android
   - Già quasi pronta: viewport, mobile UI, no framework

10. **Gestione multi-stagione**
    - Attualmente "Stagione 2026" è hardcoded
    - Aggiungere selector di stagione con archivio

11. **Undo eliminazione**
    - Tenere un "cestino" temporaneo (5 minuti) per booking eliminati

12. **Import CSV / Excel**
    - Per caricare booking esistenti da spreadsheet

---

## 15. Deploy su Netlify

### Deploy manuale (drag & drop):
1. Vai su [netlify.com](https://netlify.com) → Log in
2. Dashboard → "Add new site" → "Deploy manually"
3. Trascina il file `cilex_ibiza_21.html` nella zona di upload
4. **IMPORTANTE**: rinomina il file in `index.html` prima del drag & drop

### Deploy via Git:
```bash
# Struttura repo minima:
/
├── index.html     ← cilex_ibiza_21.html rinominato
├── _redirects     ← opzionale (per SPA routing)
└── netlify.toml   ← opzionale (headers sicurezza)
```

### File `_redirects` (opzionale ma consigliato):
```
/*    /index.html   200
```

### File `netlify.toml` (consigliato per sicurezza):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Variabili d'ambiente:
Non applicabili — app client-side pura. Le credenziali sono nel sorgente JS.  
⚠️ **Prima del deploy**, cambiare almeno `ADMIN_PASSWORD` (riga ~2828).

---

## APPENDICE A — Funzioni JS Principali

| Funzione | Descrizione |
|---|---|
| `initApp()` | Entry point, decide login o app |
| `buildNav()` | Costruisce sidebar + tab bar in base a ruolo/permessi |
| `showPage(id, el)` | Cambia pagina virtuale attiva |
| `renderDashboard()` | Renderizza dashboard (delega ad admin/promoter) |
| `renderBookingsTable()` | Renderizza tabella booking con filtri |
| `saveBooking()` | Valida e salva/aggiorna prenotazione |
| `editBooking(id)` | Apre form in modalità modifica |
| `openDetail(id)` | Apre modal dettaglio booking |
| `saveProduct()` | Salva/aggiorna prodotto |
| `saveMember()` | Salva/aggiorna membro team |
| `doPromoterLogin()` | Autenticazione promoter |
| `doAdminAuth()` | Verifica password admin |
| `doLogin(member)` | Completa login per qualsiasi utente |
| `confirmLogout()` | Esegue logout e torna a login |
| `recalcTotal()` | Ricalcola totale (prezzo × pax ± 10%) |
| `recalcStatus()` | Aggiorna stato pagamento (confirmed/pending) |
| `pushNotif(notif)` | Crea nuova notifica |
| `runSystemNotifChecks()` | Genera notifiche automatiche urgenze |
| `exportCSV()` | Genera e scarica file CSV |
| `renderSettings()` | Renderizza pagina impostazioni |
| `togglePerm(key, val)` | Modifica permesso promoter |
| `showToast(msg, type)` | Mostra notifica temporanea |

---

## APPENDICE B — Struttura URL Live

```
https://[tuo-sito].netlify.app/
```

Non ci sono sottopagine o rotte URL — è tutto su `/`.  
Per condividere un link diretto a una sezione specifica, si dovrebbe implementare hash routing (es. `/#booking`) — attualmente non presente.

---

*Documento generato da Claude (Anthropic) — Maggio 2026*
*File sorgente: `cilex_ibiza_21.html`*
