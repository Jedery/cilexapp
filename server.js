const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { Resend } = require('resend');

const PORT   = process.env.PORT || 3000;
const ROOT   = __dirname;

if (!process.env.RESEND_API_KEY) {
  console.error('ERROR: RESEND_API_KEY environment variable is not set.');
  process.exit(1);
}
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── EMAIL CONFIG ─────────────────────────────────────────────────
// SENDER_FROM: change to your verified domain once set up in Resend
//   e.g. 'Cilex Ibiza <bookings@cilexibiza.com>'
// Until then, onboarding@resend.dev only delivers to MANAGER_EMAIL.
const SENDER_FROM  = 'onboarding@resend.dev';
const MANAGER_EMAIL = 'ignaziolan95@gmail.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────
// Shared helpers
function buildEmailHTML(b) {
  const fmt = d => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  const money = v => (v && parseFloat(v) > 0) ? `€${parseFloat(v).toFixed(2)}` : '—';
  const remaining = (b.total && b.deposit)
    ? Math.max(0, parseFloat(b.total) - parseFloat(b.deposit)).toFixed(2)
    : b.total ? parseFloat(b.total).toFixed(2) : null;

  const row = (label, value) => value ? `
    <tr>
      <td style="padding:10px 16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;width:140px">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-weight:500">${value}</td>
    </tr>` : '';

  const statusColors = { confirmed:'#4ADE80', pending:'#FCD34D', cancelled:'#F87171' };
  const statusLabels = { confirmed:'Confermato', pending:'In attesa', cancelled:'Cancellato' };
  const statusColor = statusColors[b.paymentStatus] || '#FCD34D';
  const statusLabel = statusLabels[b.paymentStatus] || b.paymentStatus;

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-top:24px;margin-bottom:24px">

    <!-- Header -->
    <div style="background:#0A0A0A;padding:28px 32px;border-bottom:3px solid #3EC6D4">
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase">
        CILEX <span style="color:#3EC6D4">IBIZA</span>
      </div>
      <div style="font-size:10px;color:#555;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Booking Manager</div>
    </div>

    <!-- Title band -->
    <div style="background:#3EC6D4;padding:14px 32px">
      <div style="font-size:13px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1px">
        ✅ Nuova Prenotazione Ricevuta
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 8px">
      <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6">
        È stata creata una nuova prenotazione. Di seguito trovi tutti i dettagli.
      </p>

      <!-- Customer section -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">
        Cliente
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row('Nome',     b.name)}
        ${row('Email',    b.email)}
        ${row('Telefono', b.phone)}
        ${row('Lingua',   b.language)}
      </table>

      <!-- Booking section -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">
        Prenotazione
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row('Prodotto',    b.product)}
        ${row('Persone',     b.pax)}
        ${row('Data',        fmt(b.date))}
        ${row('Orario',      b.time)}
        ${row('Posizione',   b.location)}
        ${row('Agente',      b.agent)}
      </table>

      <!-- Payment section -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">
        Pagamento
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row('Metodo',    b.paymentMethod)}
        ${row('Totale',    money(b.total))}
        ${row('Acconto',   money(b.deposit))}
        ${row('Rimanente', remaining ? `€${remaining}` : '—')}
        <tr>
          <td style="padding:10px 16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;width:140px">Stato</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0">
            <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">
              ${statusLabel}
            </span>
          </td>
        </tr>
      </table>

      ${b.notes ? `
      <!-- Notes -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">Note</div>
      <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 24px;padding:12px 16px;background:#f9f9f9;border-radius:6px;border-left:3px solid #3EC6D4">${b.notes}</p>
      ` : ''}
    </div>

    <!-- Booking ID footer -->
    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <span style="font-size:11px;color:#aaa;letter-spacing:0.5px">ID Prenotazione: </span>
      <span style="font-size:11px;color:#888;font-family:monospace">${b.id}</span>
      <span style="font-size:11px;color:#aaa;margin-left:16px">
        ${new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
      </span>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#0A0A0A;text-align:center">
      <div style="font-size:10px;color:#444;letter-spacing:1px;text-transform:uppercase">
        Cilex Ibiza — Booking Manager · Stagione 2026
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── CUSTOMER CONFIRMATION TEMPLATE ──────────────────────────────
function buildCustomerEmailHTML(b) {
  const fmt = d => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  const money = v => (v && parseFloat(v) > 0) ? `€${parseFloat(v).toFixed(2)}` : '—';
  const remaining = (b.total && b.deposit)
    ? Math.max(0, parseFloat(b.total) - parseFloat(b.deposit)).toFixed(2)
    : b.total ? parseFloat(b.total).toFixed(2) : null;

  const row = (label, value) => value ? `
    <tr>
      <td style="padding:10px 16px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #f0f0f0;white-space:nowrap;width:140px">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;font-weight:500">${value}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#0A0A0A;padding:28px 32px;border-bottom:3px solid #3EC6D4">
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase">
        CILEX <span style="color:#3EC6D4">IBIZA</span>
      </div>
      <div style="font-size:10px;color:#555;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Ibiza · Stagione 2026</div>
    </div>

    <!-- Hero -->
    <div style="background:#3EC6D4;padding:24px 32px">
      <div style="font-size:22px;font-weight:800;color:#000;letter-spacing:0.5px">Prenotazione confermata! 🎉</div>
      <div style="font-size:13px;color:#005a63;margin-top:6px">Ciao <strong>${b.name?.split(' ')[0] || b.name}</strong>, la tua prenotazione è stata ricevuta con successo.</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 8px">

      <!-- Event details -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">
        Il tuo evento
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row('Esperienza',  b.product)}
        ${row('Data',        fmt(b.date))}
        ${row('Orario',      b.time)}
        ${row('Luogo',       b.location)}
        ${row('Persone',     b.pax ? `${b.pax} ${b.pax == 1 ? 'persona' : 'persone'}` : null)}
      </table>

      <!-- Payment -->
      <div style="font-size:11px;font-weight:700;color:#3EC6D4;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #3EC6D4">
        Pagamento
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${row('Totale',           money(b.total))}
        ${row('Acconto versato',  money(b.deposit))}
        ${remaining && parseFloat(remaining) > 0
          ? row('Saldo rimanente', `<strong style="color:#e05a00">€${remaining}</strong> — da versare il giorno dell'evento`)
          : row('Stato',          '<span style="color:#4ADE80;font-weight:700">✓ Pagamento completo</span>')}
        ${row('Metodo',           b.paymentMethod)}
      </table>

      <!-- Info box -->
      <div style="background:#f0fbfc;border:1px solid #b2e8ed;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <div style="font-size:12px;font-weight:700;color:#00838f;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">📌 Informazioni importanti</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#333;line-height:2">
          <li>Il tuo referente è <strong>${b.agent || 'il nostro team'}</strong></li>
          <li>Presenta questa email il giorno dell'evento</li>
          ${remaining && parseFloat(remaining) > 0 ? '<li>Ricorda di portare il saldo rimanente in contanti o carta</li>' : ''}
        </ul>
      </div>

    </div>

    <!-- Booking reference -->
    <div style="padding:14px 32px;background:#f9f9f9;border-top:1px solid #eee">
      <span style="font-size:11px;color:#aaa">Riferimento prenotazione: </span>
      <span style="font-size:11px;color:#888;font-family:monospace">${b.id}</span>
    </div>

    <!-- Footer -->
    <div style="padding:24px 32px;background:#0A0A0A;text-align:center">
      <div style="font-size:13px;color:#fff;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">
        CILEX <span style="color:#3EC6D4">IBIZA</span>
      </div>
      <div style="font-size:11px;color:#444;letter-spacing:0.5px">
        Hai domande? Contatta il tuo referente direttamente.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── HTTP SERVER ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // ── POST /api/send-email ─────────────────────────────────────────
  if (req.method === 'POST' && urlPath === '/api/send-email') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { booking } = JSON.parse(body);
        if (!booking) throw new Error('Missing booking payload');

        const sent = [];
        const failed = [];

        // 1. Manager notification (always sent)
        const managerRes = await resend.emails.send({
          from:    SENDER_FROM,
          to:      [MANAGER_EMAIL],
          subject: `📋 Nuova prenotazione — ${booking.name} · ${booking.product || ''}`,
          html:    buildEmailHTML(booking),
        });
        if (managerRes.error) {
          failed.push({ to: MANAGER_EMAIL, error: managerRes.error.message });
          console.error(`[Email] Manager email failed:`, managerRes.error.message);
        } else {
          sent.push({ to: MANAGER_EMAIL, id: managerRes.data.id });
          console.log(`[Email] Manager ✓  id=${managerRes.data.id}  booking=${booking.id}`);
        }

        // 2. Customer confirmation (sent if customer has an email)
        if (booking.email) {
          const customerRes = await resend.emails.send({
            from:    SENDER_FROM,
            to:      [booking.email],
            subject: `Conferma prenotazione — ${booking.product || 'Cilex Ibiza'}`,
            html:    buildCustomerEmailHTML(booking),
          });
          if (customerRes.error) {
            failed.push({ to: booking.email, error: customerRes.error.message });
            console.warn(`[Email] Customer email failed (${booking.email}):`, customerRes.error.message);
          } else {
            sent.push({ to: booking.email, id: customerRes.data.id });
            console.log(`[Email] Customer ✓  id=${customerRes.data.id}  to=${booking.email}`);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sent, failed }));
      } catch (e) {
        console.error('[Email] Failed:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── Static file serving ──────────────────────────────────────────
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type':  MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cilex Ibiza running at http://localhost:${PORT}`);
  console.log(`Email API ready at  http://localhost:${PORT}/api/send-email`);
});
