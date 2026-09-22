// docs.js — auto-generate /docs from app.js routes + route-file JSDoc headers
const fs = require('fs');
const path = require('path');
const SERVICE_DIR = __dirname;

function render() {
  let app;
  try { app = fs.readFileSync(path.join(SERVICE_DIR, 'app.js'), 'utf8'); } catch { app = ''; }
  const routes = [...app.matchAll(/u\.pathname === '(\/[a-z0-9-]+)'/g)].map(m => m[1]);
  const uniq = [...new Set(routes)].sort();

  // descriptions: first-line JSDoc from routes/<name>.js, or inline handler comment in app.js
  const desc = {};
  const files = fs.readdirSync(path.join(SERVICE_DIR, 'routes')).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const first = fs.readFileSync(path.join(SERVICE_DIR, 'routes', f), 'utf8').split('\n')[0];
    const m = first.match(/^\/\/\s*(?:\/([a-z0-9-]+)\s*—\s*)?(.+)$/);
    if (m) desc['/' + (m[1] || f.replace(/\.js$/, ''))] = m[2].trim();
  }
  // app.js inline routes: look for a comment line just above each `if (u.pathname === '/x')`
  for (const p of uniq) {
    if (desc[p]) continue;
    const re = new RegExp(`\\/\\/\\s*${p.replace('/', '\\/')}\\s*[—-]\\s*(.+)\\n\\s*if \\(u\\.pathname === '${p.replace('/', '\\/')}'\\)`);
    const m = app.match(re);
    if (m) desc[p] = m[1].trim();
  }

  const rows = uniq.filter(p => p !== '/docs' && p !== '/dashboard').map(p =>
    `| \`${p}\` | ${desc[p] || '—'} |`).join('\n');

  return `# Nerd Utility API

Free, no-auth micro-service API. GET with query params unless noted (POST bodies accepted where a text payload is needed). Public URL: see landing page.

## Endpoints (${uniq.length})
| Endpoint | Description |
|---|---|
${rows}

## Extra
- \`/docs\` — this page (auto-generated)
- \`/stats\` — usage analytics
- \`/dashboard\` — HTML usage dashboard
`;
}
module.exports = { render };
