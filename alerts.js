// Alerts management API — bridges the watchdog's watchdog.json to HTTP.
// Mounted by app.js: GET/POST/DELETE /alerts
const fs = require('fs');
const PATH = __dirname + '/watchdog.json';

function read() { return JSON.parse(fs.readFileSync(PATH, 'utf8')); }
function write(c) { fs.writeFileSync(PATH, JSON.stringify(c, null, 2)); }

function handle(req, res, u, json, readBody) {
  return (async () => {
    const cfg = read();
    if (req.method === 'GET') {
      return json(res, 200, { watch: cfg.watch, intervalSec: cfg.intervalSec, cooldownSec: cfg.cooldownSec, webhook: !!cfg.webhook });
    }
    if (req.method === 'POST') {
      const raw = await readBody(req);
      let b; try { b = JSON.parse(raw); } catch (e) { return json(res, 400, { error: 'invalid JSON' }); }
      const symbol = String(b.symbol || '').toUpperCase();
      const above = b.above == null ? null : Number(b.above);
      const below = b.below == null ? null : Number(b.below);
      if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return json(res, 400, { error: 'symbol required (e.g. BTC)' });
      if (above == null && below == null) return json(res, 400, { error: 'need above and/or below threshold' });
      if (above != null && (isNaN(above) || above <= 0)) return json(res, 400, { error: 'above must be positive number' });
      if (below != null && (isNaN(below) || below <= 0)) return json(res, 400, { error: 'below must be positive number' });
      // reload config fresh (watchdog re-reads nothing, so we tell user rules apply after watchdog restart... actually watchdog caches cfg)
      // Simplest robust approach: watchdog re-reads file each tick — we patch watchdog to do that too.
      const rule = { symbol, above, below, note: String(b.note || '').slice(0, 200) || null };
      if (b.webhook) rule.webhook = String(b.webhook).slice(0, 500);
      cfg.watch.push(rule);
      write(cfg);
      return json(res, 201, { added: rule, totalRules: cfg.watch.length });
    }
    if (req.method === 'DELETE') {
      const idx = Number(u.searchParams.get('index'));
      if (!Number.isInteger(idx) || idx < 0 || idx >= cfg.watch.length) return json(res, 400, { error: 'valid ?index= required' });
      const removed = cfg.watch.splice(idx, 1)[0];
      write(cfg);
      return json(res, 200, { removed });
    }
    return json(res, 405, { error: 'method not allowed' });
  })();
}
module.exports = { handle };
