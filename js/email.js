// ─── EMAIL ───────────────────────────────────────────────────────
// Calls the local server's /api/send-email endpoint (POST).
// The Resend API key lives on the server — never exposed to the browser.

async function sendBookingConfirmation(booking) {
  try {
    const res = await fetch('/api/send-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ booking }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    console.log('[Email] Sent ✓', json.id);
    showToast('Email di conferma inviata ✓', 'success');
  } catch (e) {
    // Email is best-effort — booking was already saved, don't surface the error in UI
    console.warn('[Email] Failed (booking still saved):', e.message);
  }
}
