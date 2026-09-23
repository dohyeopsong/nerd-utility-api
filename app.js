// Nerd utility API — dynamic route dispatcher
const http = require('http');
const fs = require('fs');
const path = require('path');

// --- core helpers ---
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', () => resolve(''));
  });
}

// --- load every route module dynamically ---
const routes = {}; // pathname -> { handler, needsBody, methods }
for (const f of fs.readdirSync(path.join(__dirname, 'routes'))) {
  if (!f.endsWith('.js')) continue;
  const name = f.replace(/\.js$/, '');
  let mod;
  try { mod = require('./routes/' + f); } catch (e) { console.error('skip', f, e.message); continue; }
  const exported = mod.route || mod[name] || Object.values(mod)[0];
  if (typeof exported !== 'function') { console.error('no handler in', f); continue; }
  routes['/' + name] = { handler: exported, mod };
}

// --- extras (docs, stats, stats-persist) ---
let stats = { started: Date.now(), calls: 0, byRoute: {}, errors: 0 };
try { stats = JSON.parse(fs.readFileSync(__dirname + '/stats.json', 'utf8')); } catch {}
const statsTimer = setInterval(() => { try { fs.writeFileSync(__dirname + '/stats.json', JSON.stringify(stats)); } catch {} }, 30000);
statsTimer.unref();

const docs = {};
for (const [p, r] of Object.entries(routes)) {
  docs[p] = (r.mod && r.mod.usage) || (r.mod && r.mod.desc) || 'module: ' + path.basename(require.resolve('./routes' + p + '.js'));
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  stats.calls++;
  try {
    if (u.pathname === '/stats') return json(res, 200, stats);
    if (u.pathname === '/docs') {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      return res.end('# Nerd Utility API\n\n' + Object.keys(routes).sort().map(p => '- `' + p + '`').join('\n') + '\n');
    }
    const r = routes[u.pathname];
    if (!r) return json(res, 404, { error: 'not found', hint: 'GET /docs for endpoints' });
    const body = req.method === 'POST' ? await readBody(req) : null;
    const result = await r.handler(u, res, json, body, req.method);
    if (result === undefined && !res.writableEnded) json(res, 200, { ok: true });
    return;
  } catch (e) {
    stats.errors++;
    json(res, 500, { error: String(e && e.message || e) });
  }
}).listen(8080, () => console.log('Nerd utility API listening on :8080 with ' + Object.keys(routes).length + ' routes'));
