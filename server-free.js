// Nerd utility API — all endpoints free (no payment rail available in local mode)
const http = require('http');
const { URL } = require('url');
const utils = require('./utils');

const json = (res, code, obj) => { res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d)); });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const route = u.pathname;
  try {
    if (route === '/health') return json(res, 200, { status: 'ok', time: new Date().toISOString() });
    if (route === '/pricing') return json(res, 200, { note: 'all endpoints currently free; paid tiers via x402 coming when on-chain mode is enabled', endpoints: ['/format','/csv2json','/base64','/hash','/uuid','/timestamp','/hmac'] });
    const handler = utils[route.slice(1)];
    if (typeof handler === 'function') {
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only. See /docs' });
      const body = await readBody(req);
      const params = Object.fromEntries(u.searchParams.entries());
      return json(res, 200, handler(body, params));
    }
    json(res, 404, { error: 'not found. See /docs' });
  } catch (e) { json(res, 400, { error: e.message }); }
});
server.listen(8080, () => console.log('Nerd utility API (free) listening on :8080'));
