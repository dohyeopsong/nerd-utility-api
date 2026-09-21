// dashboard.js — renders a live usage dashboard page from usage.json
const fs = require('fs');
const path = require('path');

function render(req, analyticsPath) {
  let u;
  try { u = JSON.parse(fs.readFileSync(analyticsPath, 'utf8')); }
  catch { u = { totalRequests: 0, uniqueCallers: [], endpoints: {}, daily: {} }; }

  const eps = Object.entries(u.endpoints || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('');

  const days = Object.entries(u.daily || {})
    .sort()
    .map(([d, n]) => `<div class="bar"><span>${d}</span><div class="fill" style="width:${Math.min(100, n / Math.max(1, Math.max(...Object.values(u.daily || {a:1}))) * 100)}%"></div><b>${n}</b></div>`).join('');

  const callers = (u.uniqueCallers || []).length;
  const recent = (u.recent || []).slice(-20).reverse()
    .map(r => `<tr><td>${esc(r.t || '')}</td><td>${esc(r.ip || '')}</td><td>${esc(r.path || '')}</td><td>${r.status ?? ''}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Nerd Utility API — Dashboard</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1117;color:#e6e6e6;margin:0;padding:2rem;max-width:900px;margin:auto}
h1{font-size:1.6rem} .cards{display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0}
.card{background:#1a1d29;border-radius:12px;padding:1rem 1.5rem;min-width:150px}
.card b{display:block;font-size:2rem;color:#7aa2ff}
table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.9rem}
td,th{padding:.4rem .6rem;border-bottom:1px solid #262a3a;text-align:left}
.bar{display:flex;align-items:center;gap:.5rem;margin:.3rem 0;font-size:.85rem}
.bar span{width:90px;color:#8a8fa3}
.fill{background:linear-gradient(90deg,#7aa2ff,#9d7aff);height:12px;border-radius:6px}
code{background:#1a1d29;padding:2px 6px;border-radius:4px}
</style></head><body>
<h1>⚡ Nerd Utility API — Live Dashboard</h1>
<p>Free micro-service for agents &amp; developers. Docs: <code>/docs</code> · OpenAPI: <code>/openapi.json</code> · <code>/llms.txt</code></p>
<div class="cards">
  <div class="card"><b>${u.totalRequests ?? 0}</b>Total requests</div>
  <div class="card"><b>${callers}</b>Unique callers</div>
  <div class="card"><b>${Object.keys(u.endpoints || {}).length}</b>Distinct endpoints used</div>
  <div class="card"><b>${uptimeDays()}</b>Days live</div>
</div>
<h2>Top endpoints</h2>
<table><tr><th>Endpoint</th><th>Hits</th></tr>${eps || '<tr><td colspan="2">No traffic yet</td></tr>'}</table>
<h2>Daily traffic</h2>${days || '<p>No data yet</p>'}
<h2>Recent requests</h2>
<table><tr><th>Time</th><th>IP</th><th>Path</th><th>Status</th></tr>${recent}</table>
<p style="color:#8a8fa3;font-size:.8rem">Auto-refreshes every 30s · generated ${new Date().toISOString()}</p>
<script>setTimeout(()=>location.reload(),30000)</script>
</body></html>`;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uptimeDays() { const start = new Date('2026-09-20'); return Math.max(1, (Date.now() - start) / 86400000).toFixed(0); }

module.exports = { render };
