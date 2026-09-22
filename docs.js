// docs.js — auto-generate /docs from app.js route registrations
const fs = require('fs');
const path = require('path');
const SERVICE_DIR = __dirname;

function render() {
  let app;
  try { app = fs.readFileSync(path.join(SERVICE_DIR, 'app.js'), 'utf8'); } catch { app = ''; }
  const routes = [...app.matchAll(/u\.pathname === '(\/[a-z0-9-]+)'/g)].map(m => m[1]);
  const uniq = [...new Set(routes)].sort();

  // pull descriptions from llms.txt lines like: - `/endpoint?x` — desc
  let llms = '';
  try { llms = fs.readFileSync(path.join(SERVICE_DIR, 'llms.txt'), 'utf8'); } catch {}
  const desc = {};
  for (const line of llms.split('\n')) {
    const m = line.match(/^-\s+`([a-z0-9/_?=&|-]+)`\s+—?\s*(.+)$/);
    if (m) {
      const ep = '/' + m[1].split(/[?/]/)[0].replace(/^\//, '');
      if (!desc[ep]) desc[ep] = m[2].replace(/\*\*/g, '');
    }
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
