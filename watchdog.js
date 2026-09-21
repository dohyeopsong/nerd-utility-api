// Price watchdog daemon — monitors prices via the local /price endpoint and
// fires alerts (webhook/file/agent message) when thresholds are crossed.
// Config: /Users/dohyeopsong/service/watchdog.json
const fs = require('fs');
const PATH = __dirname + '/watchdog.json';

const defaultCfg = {
  intervalSec: 60,
  watch: [
    { symbol: 'BTC', above: null, below: 78000, note: 'creator BTC dip alert' },
    { symbol: 'ETH', above: 3000, below: null, note: 'creator ETH breakout alert' }
  ],
  webhook: null,      // optional URL to POST alert JSON
  cooldownSec: 1800   // don't re-alert same rule within 30 min
};
if (!fs.existsSync(PATH)) fs.writeFileSync(PATH, JSON.stringify(defaultCfg, null, 2));
function loadCfg() { try { return { ...defaultCfg, ...JSON.parse(fs.readFileSync(PATH, 'utf8')) }; } catch (e) { return defaultCfg; } }

const state = { lastAlert: {} };
const log = (m) => console.log(`[watchdog ${new Date().toISOString()}] ${m}`);

const SYMBOL_KEYS = { BTC: 'bitcoin', ETH: 'ethereum', BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum' };
async function getPrice(symbol) {
  const r = await fetch('http://localhost:8080/price');
  if (!r.ok) throw new Error(`price api: ${r.status}`);
  const d = await r.json();
  const key = SYMBOL_KEYS[symbol.toUpperCase()] ?? symbol.toLowerCase();
  const p = d[key]?.usd;
  if (p == null) throw new Error(`no price for ${symbol} (key=${key}, have: ${Object.keys(d).join(',')})`);
  return p;
}

async function fire(rule, price, dir) {
  const key = `${rule.symbol}:${dir}:${rule.above ?? ''}${rule.below ?? ''}`;
  const now = Date.now();
  if (state.lastAlert[key] && now - state.lastAlert[key] < cfg.cooldownSec * 1000) return;
  state.lastAlert[key] = now;
  const alert = {
    symbol: rule.symbol, price, direction: dir,
    threshold: dir === 'above' ? rule.above : rule.below,
    note: rule.note, time: new Date().toISOString()
  };
  log(`ALERT ${rule.symbol} ${dir} ${dir === 'above' ? rule.above : rule.below} (now ${price})`);
  fs.appendFileSync(__dirname + '/ALERTS.log', JSON.stringify(alert) + '\n');
  const cfg = loadCfg();
  if (cfg.webhook) {
    try { await fetch(cfg.webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(alert) }); }
    catch (e) { log(`webhook failed: ${e.message}`); }
  }
}

async function tick() {
  const cfg = loadCfg();
  for (const rule of cfg.watch) {
    try {
      const p = await getPrice(rule.symbol);
      if (rule.above != null && p >= rule.above) await fire(rule, p, 'above');
      else if (rule.below != null && p <= rule.below) await fire(rule, p, 'below');
    } catch (e) { log(`error: ${e.message}`); }
  }
}

log('watchdog started');
tick();
setInterval(tick, loadCfg().intervalSec * 1000);
