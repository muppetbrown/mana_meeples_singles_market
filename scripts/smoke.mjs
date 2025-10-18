#!/usr/bin/env node
// scripts/smoke.mjs
// Usage: node scripts/smoke.mjs https://<WEB_URL> https://<API_URL>
import { setTimeout as delay } from 'node:timers/promises';

const [,, WEB, API] = process.argv;
if (!WEB || !API) {
  console.error('Usage: node scripts/smoke.mjs <WEB_URL> <API_URL>');
  process.exit(2);
}

async function checkJSON(url, expectKey) {
  const r = await fetch(url, { headers: { 'accept': 'application/json' }});
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  const j = await r.json();
  if (expectKey && !(expectKey in j)) {
    throw new Error(`${url} -> JSON missing key "${expectKey}"`);
  }
  return j;
}

async function checkHTML(url) {
  const r = await fetch(url, { headers: { 'accept': 'text/html' }});
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html')) throw new Error(`${url} -> unexpected content-type: ${ct}`);
  return true;
}

(async () => {
  const results = [];

  // API health
  results.push(['API /api/health', await checkJSON(`${API}/api/health`, 'ok')]);

  // DB health (optional but recommended)
  try {
    results.push(['API /api/health/db', await checkJSON(`${API}/api/health/db` , 'db')]);
  } catch (e) {
    console.warn('WARN: /api/health/db failed:', e.message);
  }

  // Small pause in case DB warmed up
  await delay(200);

  // Sample data
  const cards = await checkJSON(`${API}/api/cards?limit=1`);
  if (!Array.isArray(cards.items)) throw new Error('/api/cards did not return items array');
  results.push([`API /api/cards (got ${cards.items.length})`, cards.items]);

  // WEB root
  await checkHTML(WEB);
  results.push(['WEB /', 'OK']);

  // WEB deep link (SPA fallback)
  try {
    await checkHTML(`${WEB}/cards/test`);
    results.push(['WEB /cards/test', 'OK']);
  } catch (e) {
    console.warn('WARN: Deep link not yet rewired to index.html:', e.message);
  }

  // Print summary
  console.log('✔ smoke passed');
  for (const [label, val] of results) {
    console.log('-', label, typeof val === 'string' ? val : '');
  }
  process.exit(0);
})().catch((e) => {
  console.error('✖ smoke failed:', e.stack || e.message);
  process.exit(1);
});
