// CoinGecko free API proxy with 60s in-memory cache
const https = require('https');
const cache = new Map();
const get = (path, ttl = 60000) => new Promise((resolve, reject) => {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < ttl) return resolve(hit.v);
  https.get({ host: 'api.coingecko.com', path, headers: { 'accept': 'application/json', 'User-Agent': 'nerd-utility-api/2.0' } }, r => {
    let d = ''; r.on('data', c => d += c);
    r.on('end', () => {
      try { const v = JSON.parse(d); cache.set(path, { v, t: Date.now() }); resolve(v); }
      catch (e) { reject(new Error('upstream error: ' + d.slice(0, 200))); }
    });
  }).on('error', reject);
});

module.exports = {
  price: async (q) => {
    const ids = (q.ids || 'bitcoin,ethereum').split(',').map(s => s.trim()).join(',');
    const vs = (q.vs || 'usd').toLowerCase();
    const d = await get(`/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${vs}`);
    return d;
  },
  history: async (q) => {
    if (!q.coin || !q.days) throw new Error('coin and days required');
    const d = await get(`/api/v3/coins/${q.coin}/market_chart?vs_currency=usd&days=${q.days}`, 300000);
    return { coin: q.coin, days: q.days, prices: d.prices };
  }
};
