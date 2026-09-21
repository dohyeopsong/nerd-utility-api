const { routeVin } = require('./routes/vin.js'); // vin decode
const { routeCard } = require('./routes/card.js'); // card luhn
const { routeIban } = require('./routes/iban.js'); // iban validate
const { routeSubnet } = require('./routes/subnet.js'); // subnet calc

restoreCrons();
// Nerd utility API
const { routeColor } = require('./routes/color.js'); // color conversion route

// --- usage analytics (SQLite via node:sqlite fallback to JSON file) ---
const path = require('path');
const USAGE_FILE = path.join(__dirname, 'usage.json');
function loadUsage() {
  try { return JSON.parse(require('fs').readFileSync(USAGE_FILE, 'utf8')); }
  catch { return { total: 0, byEndpoint: {}, byDay: {}, byIP: {} }; }
}
function saveUsage(u) {
  try { require('fs').writeFileSync(USAGE_FILE, JSON.stringify(u)); } catch {}
}
const usage = loadUsage();
function trackUsage(pathname, ip) {
  const day = new Date().toISOString().slice(0, 10);
  usage.total++;
  usage.byEndpoint[pathname] = (usage.byEndpoint[pathname] || 0) + 1;
  usage.byDay[day] = (usage.byDay[day] || 0) + 1;
  usage.byIP[ip] = (usage.byIP[ip] || 0) + 1;
  if (usage.total % 20 === 0) saveUsage(usage);
}
setInterval(() => saveUsage(usage), 60000).unref();

const http = require('http');
const https = require('https');
const crypto = require('crypto');
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const qr = require('./qr');
const md = require('./md');
const alerts = require('./alerts');
const textstats = require('./textstats');
const price = require('./price');
const { challenge, verifyPayment, PRICE_CENTS } = require('./x402.js');
const ledger = require('./payments.js');


const prices = require('./price.js');

const json = (res, code, obj) => { if (res.headersSent) return; res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d)); });

// DNS lookup: {"domain":"example.com","type":"A|AAAA|MX|TXT|NS|CNAME"}
async function dnsLookup(body) {
  const { domain, type = 'A' } = JSON.parse(body || '{}');
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) throw new Error('valid "domain" required');
  const dns = require('dns').promises;
  const fn = { A: 'resolve4', AAAA: 'resolve6', MX: 'resolveMx', TXT: 'resolveTxt', NS: 'resolveNs', CNAME: 'resolveCname' }[type.toUpperCase()];
  if (!fn) throw new Error('type must be one of A, AAAA, MX, TXT, NS, CNAME');
  const records = await dns[fn](domain);
  return { domain, type: type.toUpperCase(), records };
}

// Fetch a URL and return status + response headers (no body)
async function inspectHeaders(body) {
  const { url } = JSON.parse(body || '{}');
  if (!/^https?:\/\//i.test(url || '')) throw new Error('"url" must start with http(s)://');
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
  const headers = {};
  r.headers.forEach((v, k) => { headers[k] = v; });
  return { url: r.url, status: r.status, ok: r.ok, headers };
}

const ENDPOINTS = {
  dns: dnsLookup,
  headers: inspectHeaders,
  format: (body) => ({ result: JSON.stringify(JSON.parse(body), null, 2) }),
  csv2json: (body) => {
    const [head, ...rows] = body.trim().split(/\r?\n/);
    const keys = head.split(',');
    return { result: rows.map(r => { const vals = r.split(','); const o = {}; keys.forEach((k,i) => o[k.trim()] = (vals[i]||'').trim()); return o; }) };
  },
  base64: (body, q) => q.mode === 'decode' ? { result: Buffer.from(body, 'base64').toString('utf8') } : { result: Buffer.from(body).toString('base64') },
  hash: (body, q) => { const algo = q.algo || 'sha256'; if (!['md5','sha1','sha256','sha512'].includes(algo)) throw new Error('unsupported algo'); if (!body) throw new HttpError(400, 'text required'); return { algo, result: crypto.createHash(algo).update(body).digest('hex') }; },
  uuid: () => ({ result: crypto.randomUUID() }),
  timestamp: (body, q) => {
    if (q.date) return { result: Math.floor(new Date(q.date).getTime() / 1000) };
    if (q.ts) return { result: new Date(Number(q.ts) * 1000).toISOString() };
    return { result: Math.floor(Date.now() / 1000), iso: new Date().toISOString() };
  },
  hmac: (body, q) => { if (!q.key || !q.algo) throw new Error('key and algo required'); return { result: crypto.createHmac(q.algo, q.key).update(body).digest('hex') }; }
};

function hookRoutes(req, res, u) {
  if (u.pathname === '/hook/new') {
    const id = newHookId();
    HOOKS[id] = { createdAt: Date.now(), hits: [] };
    return json(res, 200, {
      id,
      url: '/hook/' + id,
      method: 'POST/GET/PUT/DELETE (any)',
      inspect: 'GET /hook/' + id + '  (optionally ?json=1)',
      expires: 'on process restart',
      note: 'Send any request to the url; inspect captured requests at the inspect URL.'
    });
  }
  const m = u.pathname.match(/^\/hook\/([a-f0-9]{12})$/);
  if (m) {
    const hook = HOOKS[m[1]];
    if (!hook) return json(res, 404, { error: 'unknown hook id — create one at /hook/new' });
    return hook; // truthy -> caller continues
  }
  return null; // not a hook route
}

let __persistDebounce;
function persistCrons() {
  clearTimeout(__persistDebounce);
  __persistDebounce = setTimeout(() => {
    try {
      const CRONS = global.__CRONS || new Map();
      const data = [...CRONS.entries()].map(([id, j]) => ({ id, url: j.url, every: j.every, ok: j.ok, fail: j.fail }));
      require('fs').writeFileSync(__dirname + '/cron-jobs.json', JSON.stringify(data));
    } catch (e) { console.error('persistCrons:', e.message); }
  }, 500);
}
function restoreCrons() {
  try {
    const raw = require('fs').readFileSync(__dirname + '/cron-jobs.json', 'utf8');
    const CRONS = (global.__CRONS = global.__CRONS || new Map());
    let n = 0;
    for (const j of JSON.parse(raw)) {
      const job = { url: j.url, every: j.every, created: Date.now(), runs: [], ok: j.ok || 0, fail: j.fail || 0 };
      CRONS.set(j.id, job);
      job.timer = setInterval(async () => {
        try {
          const r = await fetch(j.url, { signal: AbortSignal.timeout(10000) });
          (r.status >= 200 && r.status < 400) ? job.ok++ : job.fail++;
          job.runs.push({ at: new Date().toISOString(), status: r.status });
        } catch (e) { job.fail++; job.runs.push({ at: new Date().toISOString(), error: String(e.cause && e.cause.code || e.message).slice(0, 120) }); }
        if (job.runs.length > 30) job.runs.shift();
      }, job.every * 1000);
      job.timer.unref();
      n++;
    }
    if (n) console.log('restored', n, 'cron jobs');
  } catch (e) { /* no file yet */ }
}

function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => {
        const title = (d.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || null;
        const text = d.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
        const links = [...d.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]).slice(0, 100);
        resolve({ url, status: r.statusCode, title, text, links });
      });
    }).on('error', e => reject(e));
  });
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');

  // --- POST /mcp : MCP-over-HTTP (JSON-RPC 2.0 subset) ---
  if (req.method === 'POST' && u.pathname === '/mcp') {
    let body = ''; for await (const c of req) body += c;
    try {
      const { id, method, params } = JSON.parse(body || '{}');
      const ok = (result) => { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ jsonrpc: '2.0', id, result })); };
      if (method === 'initialize') return ok({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'nerd-utility-api', version: '1.0.0' } });
      if (method === 'tools/list') return ok({ tools: [
        { name: 'list_routes', description: 'List all utility API routes', inputSchema: { type: 'object', properties: {} } },
        { name: 'call_route', description: 'Call any utility route, e.g. route=/base64?decode=aGk=', inputSchema: { type: 'object', properties: { route: { type: 'string' } }, required: ['route'] } } ] });
      if (method === 'tools/call') {
        const name = params && params.name, args = (params && params.arguments) || {};
        if (name === 'list_routes') return ok({ content: [{ type: 'text', text: 'format csv2json json2csv base64 hash uuid timestamp validate weather whois shorten rss qrcode dns headers price ipinfo scrape semver regex jwt roman morse units isbn iban ean upc vin password case diff markdown — see /docs' }] });
        if (name === 'call_route') {
          const r = await fetch('http://localhost:8080' + (args.route || ''));
          const t = await r.text();
          return ok({ content: [{ type: 'text', text: t }] });
        }
        return ok({ error: 'unknown tool: ' + name });
      }
      res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found' } }));
    } catch (e) {
      res.writeHead(400, {'content-type':'application/json'}); res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: e.message } }));
    }
    return;
  }

    try { const _ip = (req.socket.remoteAddress||'').replace('::ffff:',''); if (!_ip.startsWith('127.') && !_ip.startsWith('::1')) trackUsage(u.pathname, _ip); } catch {}
  const route = u.pathname.slice(1);
  try {
        if (u.pathname === '/robots.txt') {
      res.writeHead(200, {'Content-Type':'text/plain'});
      return res.end(require('fs').readFileSync(__dirname + '/public/robots.txt'));
    }
    if (u.pathname === '/sitemap.xml') {
      res.writeHead(200, {'Content-Type':'application/xml'});
      return res.end(require('fs').readFileSync(__dirname + '/public/sitemap.xml'));
    }
if (u.pathname === '/') {
      res.writeHead(200, {'Content-Type':'text/html'});
      return res.end(require('fs').readFileSync(__dirname + '/public/index.html'));
    }
    if (u.pathname === '/health') return json(res, 200, { status: 'ok', time: new Date().toISOString() });
            if (u.pathname === '/jwt-decode') {
              const q = Object.fromEntries(u.searchParams); const t = String(q.token || q.jwt || '').trim();
              if (!t || t.split('.').length < 2) return json(res, 400, {error: 'provide ?token=<jwt>'});
              try {
                const dec = s => JSON.parse(Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
                const parts = t.split('.');
                const out = { header: dec(parts[0]), payload: dec(parts[1]) };
                if (out.payload.exp) out.expired = (Date.now()/1000) > out.payload.exp;
                return json(res, 200, out);
              } catch (e) { return json(res, 400, {error: 'invalid JWT: ' + e.message}); }
            }
            if (u.pathname === '/ua-parse') {
              const q = Object.fromEntries(u.searchParams);
              const ua = String(q.ua || req.headers['user-agent'] || '');
              if (!ua) return json(res, 400, {error: 'provide ?ua=<user-agent string> or send a User-Agent header'});
              const browser = (() => {
                const m = [[/Edg\//,'Edge'],[/OPR\//,'Opera'],[/Chrome\//,'Chrome'],[/Firefox\//,'Firefox'],[/Safari\//,'Safari'],[/curl\//,'curl'],[/node/i,'Node.js']];
                for (const [re, name] of m) { const x = ua.match(re); if (x) return {name, version: (ua.match(new RegExp(re.source + '([\\d.]+)')) || [])[1] || null}; }
                return {name: null, version: null};
              })();
              const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /(iPhone|iPad)/.test(ua) ? ua.includes('iPad') ? 'iPadOS' : 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null;
              const device = /Mobile|Android|iPhone/.test(ua) ? 'mobile' : /iPad|Tablet/.test(ua) ? 'tablet' : /bot|crawl|spider/i.test(ua) ? 'bot' : 'desktop';
              return json(res, 200, {userAgent: ua, browser, os, device, isBot: /bot|crawl|spider|headless/i.test(ua)});
            }
            if (u.pathname === '/validate') {
              const q = Object.fromEntries(u.searchParams);
              const type = String(q.type || '').toLowerCase();
              const value = String(q.value || '');
              if (!value) return json(res, 400, {error: 'provide ?type=email|url|ipv4|ipv6|json|uuid|luhn&value=<x>'});
              let valid = false, detail = null;
              switch (type) {
                case 'email': valid = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(value); detail = valid ? 'RFC 5322 basic' : 'malformed'; break;
                case 'url': { try { const x = new URL(value); valid = ['http:','https:'].includes(x.protocol); detail = valid ? x.protocol + '//' + x.host : 'protocol must be http/https'; } catch { detail = 'unparseable'; } break; }
                case 'ipv4': { const p = value.split('.'); valid = p.length === 4 && p.every(o => o !== '' && !isNaN(o) && +o >= 0 && +o <= 255); detail = p.join('.'); break; }
                case 'ipv6': { try { const net = require('net'); valid = net.isIPv6(value); detail = valid ? 'IPv6' : 'malformed'; } catch { detail = 'err'; } break; }
                case 'json': { try { JSON.parse(value); valid = true; detail = 'parsed ok'; } catch (e) { detail = e.message; } break; }
                case 'uuid': valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); detail = valid ? 'v' + value[14] : 'not a valid UUID v1-v5'; break;
                case 'luhn': { const d = value.replace(/[\s-]/g, ''); if (!/^\d+$/.test(d)) { detail = 'digits only'; break; } let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } valid = s % 10 === 0; detail = 'Luhn check ' + (valid ? 'passed' : 'failed'); break; }
                default: return json(res, 400, {error: 'unknown type. Use email|url|ipv4|ipv6|json|uuid|luhn'});
              }
              return json(res, 200, {type, value, valid, detail});
            }
            if (u.pathname === '/weather') {
              const q = Object.fromEntries(u.searchParams);
              let lat = parseFloat(q.lat), lon = parseFloat(q.lon);
              if (isNaN(lat) || isNaN(lon)) {
                const city = String(q.city || '').trim();
                if (!city) return json(res, 400, {error: 'provide ?lat=&lon= or ?city=<name>'});
                try {
                  const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(city)).then(r => r.json());
                  if (!geo.results || !geo.results.length) return json(res, 404, {error: 'city not found', city});
                  lat = geo.results[0].latitude; lon = geo.results[0].longitude;
                } catch (e) { return json(res, 502, {error: 'geocoding failed: ' + e.message}); }
              }
              try {
                const w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=' + Math.min(parseInt(q.days)||3,7) + '&timezone=auto').then(r => r.json());
                return json(res, 200, {latitude: lat, longitude: lon, timezone: w.timezone, current: w.current, daily: w.daily});
              } catch (e) { return json(res, 502, {error: 'weather lookup failed: ' + e.message}); }
            }
            if (u.pathname === '/shorten') {
              const q = Object.fromEntries(u.searchParams);
              const url = String(q.url || '').trim();
              try { const x = new URL(url); if (!['http:','https:'].includes(x.protocol)) throw new Error('bad protocol'); } catch { return json(res, 400, {error: 'provide valid http(s) ?url='}); }
              let links = {}; try { links = JSON.parse(require('fs').readFileSync(__dirname + '/links.json', 'utf8')); } catch {}
              let code = Object.entries(links).find(([c, v]) => v.url === url);
              if (code) code = code[0]; else {
                do { code = Math.random().toString(36).slice(2, 8); } while (links[code]);
                links[code] = { url, created: new Date().toISOString(), hits: 0 };
                require('fs').writeFileSync(__dirname + '/links.json', JSON.stringify(links));
              }
              const host = req.headers.host || 'localhost:8080';
              return json(res, 200, {short: 'http://' + host + '/s/' + code, code, url});
            }
            if (u.pathname.startsWith('/s/')) {
              const code = u.pathname.slice(3);
              let links = {}; try { links = JSON.parse(require('fs').readFileSync(__dirname + '/links.json', 'utf8')); } catch {}
              const entry = links[code];
              if (!entry) return json(res, 404, {error: 'unknown code'});
              entry.hits = (entry.hits || 0) + 1; require('fs').writeFileSync(__dirname + '/links.json', JSON.stringify(links));
              res.writeHead(301, {Location: entry.url}); return res.end();
            }
            if (u.pathname === '/rss') {
              const q = Object.fromEntries(u.searchParams);
              const feedUrl = String(q.url || '').trim();
              if (!/^https?:\/\//.test(feedUrl)) return json(res, 400, {error: 'provide ?url=<feed url>'});
              try {
                const xml = await (await fetch(feedUrl, {headers: {'user-agent': 'NerdUtilityBot/1.0'}, signal: AbortSignal.timeout(10000)})).text();
                const decode = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                const items = [];
                const itemRe = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g;
                let m, limit = Math.min(parseInt(q.limit) || 10, 50);
                while ((m = itemRe.exec(xml)) && items.length < limit) {
                  const it = m[0];
                  const g = tag => { const mm = it.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>')); return mm ? decode(mm[1]) : ''; };
                  const linkM = it.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/>/) || it.match(/<link[^>]*>([\s\S]*?)<\/link>/);
                  items.push({ title: g('title'), link: linkM ? decode(linkM[1]) : '', pubDate: g('pubDate') || g('updated') || g('published'), description: (g('description') || g('summary') || g('content')).slice(0, 500) });
                }
                const t = (xml.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
                return json(res, 200, { feed: feedUrl, title: decode(t), itemCount: items.length, items });
              } catch (e) { return json(res, 502, {error: 'feed fetch/parse failed: ' + e.message}); }
            }
            if (u.pathname === '/whois') {
              const q = Object.fromEntries(u.searchParams);
              const domain = String(q.domain || '').trim().toLowerCase();
              if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) return json(res, 400, {error: 'provide ?domain=example.com'});
              try {
                const tld = domain.split('.').pop(); let rdapBase = (tld === 'com' || tld === 'net') ? 'https://rdap.verisign.com/' + tld + '/v1/domain/' : null; if (!rdapBase) { try { const boot = await (await fetch('https://data.iana.org/rdap/dns.json', {signal: AbortSignal.timeout(8000)})).json(); const svc = (boot.services || []).find(([tlds]) => tlds.includes(tld)); if (svc && svc[1] && svc[1].length) { rdapBase = svc[1][0].replace(/\/$/, '') + '/domain/'; } } catch {} } if (!rdapBase) return json(res, 501, {error: 'no RDAP server known for TLD .' + tld}); const r = await fetch(rdapBase + encodeURIComponent(domain), {headers: {'accept': 'application/rdap+json'}, redirect: 'follow', signal: AbortSignal.timeout(10000)}); if (!r.ok && r.status !== 404) return json(res, r.status === 404 ? 404 : 502, {error: r.status === 404 ? 'domain not found' : 'RDAP HTTP ' + r.status}); const ct = r.headers.get('content-type') || ''; const body = await r.text(); if (!ct.includes('json') && !body.trim().startsWith('{')) return json(res, 502, {error: 'RDAP returned non-JSON (content-type: ' + ct + ')'}); const rd = JSON.parse(body);
                const ev = (rd.events || []).map(e => ({event: e.eventAction, date: e.eventDate}));
                const ent = (rd.entities || []).map(e => ({role: (e.roles || []).join(','), handle: e.handle}));
                const getVCard = (name) => { const e = (rd.vcardArray && rd.vcardArray[1] || []).find(v => v[0] === name); return e ? e[3] : undefined; };
                const status = rd.status || [];
                const nameservers = (rd.nameservers || []).map(n => n.ldhName);
                return json(res, 200, {domain: rd.ldhName || domain, handle: rd.handle, status, events: ev, entities: ent, registrar: getVCard('fn'), emails: getVCard('email') ? [getVCard('email')] : undefined, nameservers, secureDNS: rd.secureDNS && rd.secureDNS.delegationSigned});
              } catch (e) { return json(res, 502, {error: 'RDAP lookup failed: ' + e.message}); }
            }
            if (u.pathname === '/og') {
              const q = Object.fromEntries(u.searchParams);
              const target = String(q.url || '').trim();
              if (!/^https?:\/\//.test(target)) return json(res, 400, {error: 'provide ?url=<http(s) page>'});
              try {
                const html = await (await fetch(target, {headers: {'user-agent': 'Mozilla/5.0 (compatible; NerdUtilityBot/1.0)', 'accept': 'text/html'}, redirect: 'follow', signal: AbortSignal.timeout(10000)})).text();
                const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                const og = {}, tw = {};
                let m; const metaRe = /<meta\s+(?:property|name)=(["'])([^"']+)\1\s+content=(["'])([\s\S]*?)\3\s*\/?>/g;
                while ((m = metaRe.exec(html))) { const k = m[2].toLowerCase(), v = dec(m[4]); if (k.startsWith('og:')) og[k] = v; if (k.startsWith('twitter:')) tw[k] = v; }
                const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
                const favicon = (html.match(/<link[^>]+rel=["'][^"']*icon[^"']*[^>]*href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*/i) || [])[1];
                let u2; try { u2 = new URL(target); } catch {}
                const abs = p => { if (!p) return p; try { return new URL(p, u2).href; } catch { return p; } };
                return json(res, 200, {url: target, title: dec((title || '')).trim(), og: Object.fromEntries(Object.entries(og).map(([k, v]) => [k, /^(og:image|og:url|og:audio|og:video)$/.test(k) ? abs(v) : v])), twitter: tw, favicon: abs(favicon) || (u2 ? u2.origin + '/favicon.ico' : undefined)});
              } catch (e) { return json(res, 502, {error: 'fetch/parse failed: ' + e.message}); }
            }
            if (u.pathname === '/cert') {
              const tls = require('tls');
              const q = Object.fromEntries(u.searchParams);
              const host = String(q.host || '').trim();
              const port = parseInt(q.port) || 443;
              if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(host)) return json(res, 400, {error: 'provide ?host=example.com'});
              try {
                const info = await new Promise((ok, err) => { const s = tls.connect({host, port, servername: host, rejectUnauthorized: false, timeout: 8000}, () => { const c = s.getPeerCertificate(); s.destroy(); ok(c); }); s.on('error', err); s.on('timeout', () => { s.destroy(); err(new Error('timeout')); }); });
                if (!info || !info.valid_to) return json(res, 502, {error: 'no certificate retrieved'});
                const exp = new Date(info.valid_to), now = new Date();
                return json(res, 200, {host, subject: info.subject, issuer: info.issuer, validFrom: info.valid_from, validTo: info.valid_to, daysRemaining: Math.floor((exp - now) / 86400000), serialNumber: info.serialNumber, fingerprint: info.fingerprint, san: (info.subjectaltname || '').split(',').map(s => s.trim()).filter(Boolean)});
              } catch (e) { return json(res, 502, {error: 'TLS connect failed: ' + e.message}); }
            }
            const HOOKS = (global.__HOOKS = global.__HOOKS || new Map());
            if (u.pathname === '/hook') return json(res, 200, {hookUrl: 'http://' + (req.headers.host || 'localhost:8080') + '/hook/' + require('crypto').randomBytes(8).toString('hex'), note: 'send any HTTP request to hookUrl; inspect via GET /hook/<id> (returns captured requests)'});
            if (u.pathname.startsWith('/hook/')) {
              const parts = u.pathname.slice(6).split('/');
              const id = parts[0];
              if (!/^[a-f0-9]{16}$/.test(id)) return json(res, 400, {error: 'invalid hook id'});
              if (parts[1] === 'list' || req.method === 'GET') {
                const cap = HOOKS.get(id) || [];
                return json(res, 200, {hookId: id, count: cap.length, requests: cap});
              }
              let body = ''; for await (const c of req) body += c;
              let parsed; try { parsed = JSON.parse(body); } catch { parsed = body.slice(0, 2000); }
              const entry = {at: new Date().toISOString(), method: req.method, query: Object.fromEntries(u.searchParams), headers: req.headers, body: parsed};
              if (!HOOKS.has(id)) HOOKS.set(id, []);
              const cap = HOOKS.get(id); cap.push(entry); if (cap.length > 20) cap.shift();
              return json(res, 200, {received: true, hookId: id});
            }
            if (u.pathname === '/paste') {
              let body = ''; for await (const c of req) body += c;
              if (!body.trim()) return json(res, 400, {error: 'body required (plain text)'});
              const id = crypto.randomBytes(5).toString('hex');
              const P = (global.__PASTES = global.__PASTES || new Map());
              P.set(id, {content: body.slice(0, 64000), at: Date.now(), views: 0});
              if (P.size > 500) P.delete(P.keys().next().value);
              return json(res, 200, {id, url: '/p/' + id, content: body.slice(0, 64000), expires: 'on restart', note: 'GET /p/<id> (or /p/<id>?raw=1) to retrieve'});
            }
            if (u.pathname.startsWith('/p/')) {
              const id = u.pathname.slice(3);
              if (!/^[a-f0-9]{10}$/.test(id)) return json(res, 400, {error: 'invalid paste id'});
              const P = (global.__PASTES = global.__PASTES || new Map());
              const p = P.get(id);
              if (!p) return json(res, 404, {error: 'no such paste'});
              p.views++;
              if (u.searchParams.get('raw')) { res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'}); return res.end(p.content); }
              return json(res, 200, {id, at: new Date(p.at).toISOString(), views: p.views, content: p.content});
            }
            if (u.pathname === '/mon/new') {
              const target = u.searchParams.get('url') || (await readJson(req).catch(() => ({}))).url;
              if (!/^https?:\/\//i.test(target || '')) return json(res, 400, {error: 'url?=<http...> required'});
              const id = crypto.randomBytes(4).toString('hex');
              const MONS = (global.__MONS = global.__MONS || new Map());
              const mon = { url: target, created: Date.now(), checks: [] };
              MONS.set(id, mon);
              mon.timer = setInterval(async () => {
                const t0 = Date.now();
                let status = 0, err = null;
                try { const r = await fetch(target, { signal: AbortSignal.timeout(8000) }); status = r.status; }
                catch (e) { err = String(e.cause && e.cause.code || e.message); }
                mon.checks.push({ at: new Date().toISOString(), status, ms: Date.now() - t0, err });
                if (mon.checks.length > 60) mon.checks.shift();
              }, 60000);
              mon.timer.unref();
              return json(res, 200, { id, url: target, checkUrl: '/mon/' + id, interval: '60s', history: 'last 60 checks, on-restart ephemeral', note: 'GET /mon/<id> for uptime summary' });
            }
            if (u.pathname.startsWith('/mon/')) {
              const id = u.pathname.slice(5);
              const MONS = global.__MONS;
              if (!MONS || !MONS.get(id)) return json(res, 404, {error: 'no such monitor — create at /mon/new?url='});
              const mon = MONS.get(id);
              const ok = mon.checks.filter(c => c.status >= 200 && c.status < 400).length;
              const avg = mon.checks.length ? Math.round(mon.checks.reduce((s, c) => s + c.ms, 0) / mon.checks.length) : null;
              return json(res, 200, { id, url: mon.url, checks: mon.checks.length, up: ok, down: mon.checks.length - ok, uptimePct: mon.checks.length ? Math.round(ok * 1000 / mon.checks.length) / 10 : null, avgLatencyMs: avg, recent: mon.checks.slice(-10) });
            }
            if (u.pathname === '/cron/new') {
              const q = u.searchParams;
              const target = q.get('url'), every = parseInt(q.get('every') || '300', 10);
              if (!/^https?:\/\//i.test(target || '')) return json(res, 400, {error: 'url?=<http...> required'});
              if (!(every >= 60 && every <= 86400)) return json(res, 400, {error: 'every (seconds) must be 60-86400'});
              const id = crypto.randomBytes(4).toString('hex');
              const CRONS = (global.__CRONS = global.__CRONS || new Map());
              const job = { url: target, every, created: Date.now(), runs: [], ok: 0, fail: 0 };
              CRONS.set(id, job);
              job.timer = setInterval(async () => {
                try {
                  const t0 = Date.now();
                  const r = await fetch(target, { signal: AbortSignal.timeout(10000) });
                  const ok = r.status >= 200 && r.status < 400;
                  ok ? job.ok++ : job.fail++;
                  job.runs.push({ at: new Date().toISOString(), status: r.status, ms: Date.now() - t0 });
                } catch (e) { job.fail++; job.runs.push({ at: new Date().toISOString(), error: String(e.cause && e.cause.code || e.message).slice(0, 120) }); }
                if (job.runs.length > 30) job.runs.shift();
              }, every * 1000);
              job.timer.unref();
              return json(res, 200, { id, url: target, everySeconds: every, statusUrl: '/cron/' + id, note: 'GET /cron/<id> for run history; POST /cron/<id>/stop (or DELETE /cron/<id>) to stop' });
              persistCrons();
            }
            {
              const m = u.pathname.match(/^\/cron\/([a-f0-9]{8})(\/stop)?$/);
              if (m) {
                const CRONS = global.__CRONS;
                const job = CRONS && CRONS.get(m[1]);
                if (!job) return json(res, 404, {error: 'no such job — create at /cron/new?url=&every='});
                if (m[2] === '/stop' || req.method === 'DELETE') {
                  clearInterval(job.timer); CRONS.delete(m[1]); persistCrons();
                  return json(res, 200, { stopped: m[1] });
                }
                return json(res, 200, { id: m[1], url: job.url, everySeconds: job.every, ok: job.ok, fail: job.fail, recent: job.runs.slice(-10) });
              }
            }
            if (u.pathname === '/faker') {
              const q = u.searchParams;
              const type = (q.get('type') || 'user').toLowerCase();
              let count = Math.min(parseInt(q.get('count') || '1', 10) || 1, 100);
              const first = ['Ada','Linus','Grace','Alan','Edsger','Barbara','Ken','Margaret','Dennis','Radia','Tim','Jean','Katherine','Vint','Hedy','Niklaus'];
              const last = ['Lovelace','Torvalds','Hopper','Turing','Dijkstra','Liskov','Thompson','Hamilton','Ritchie','Perlman','Berners-Lee','Bartik','Johnson','Cerf','Lamarr','Wirth'];
              const streets = ['Main St','Oak Ave','Pine Rd','Cedar Ln','Elm Dr','Maple Way','Birch Blvd','Willow Ct'];
              const cities = [['Springfield','IL'],['Rivertown','OH'],['Fairview','CA'],['Lakeside','MN'],['Hillcrest','TX'],['Greenwood','WA']];
              const pick = a => a[Math.floor(Math.random() * a.length)];
              const n = r => Math.floor(Math.random() * r);
              const gen = {
                user: () => { const f = pick(first), l = pick(last); return { firstName: f, lastName: l, username: (f + l[0]).toLowerCase() + n(100), email: (f + '.' + l).toLowerCase().replace(/'/g,'') + '@example.com', phone: '+1-555-' + String(100 + n(900)) + '-' + String(1000 + n(9000)) }; },
                address: () => { const [city, st] = pick(cities); return { street: (100 + n(9900)) + ' ' + pick(streets), city, state: st, zip: String(10000 + n(89999)) }; },
                company: () => ({ name: pick(['Apex','Nimbus','Quantum','Vertex','Zephyr','Orbit','Flux','Prism']) + ' ' + pick(['Systems','Labs','Works','Digital','Industries','Dynamics']), employees: 10 + n(5000), founded: 1970 + n(55) }),
                creditcard: () => ({ type: pick(['visa','mastercard','amex']), number: '4' + String(1000000000000 + n(8999999999999)).slice(0, 15).replace(/\d(?=\d{4})/g, '$&'), expires: String(1 + n(12)).padStart(2, '0') + '/' + String(new Date().getFullYear() % 100 + 1 + n(4)), note: 'randomly generated — NOT a real card' }),
                paragraph: () => { const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua']; const s = () => Array.from({length: 3 + n(8)}, () => pick(words)).join(' ').replace(/^\w/, c => c.toUpperCase()) + '.'; return Array.from({length: 3 + n(3)}, s).join(' '); }
              };
              if (!gen[type]) return json(res, 400, {error: 'type must be one of: ' + Object.keys(gen).join(', ')});
              const out = Array.from({length: count}, gen[type]);
              return json(res, 200, count === 1 ? out[0] : { count, data: out });
            }
            if (u.pathname === '/ts') {
              let input = u.searchParams.get('json');
              if (!input && req.method === 'POST') { const b = await readJson(req).catch(() => null); if (b && typeof b.json === 'string') input = b.json; else if (b) input = JSON.stringify(b); }
              if (!input) return json(res, 400, {error: 'json?=<object> or POST body required'});
              let data; try { data = JSON.parse(input); } catch (e) { return json(res, 400, {error: 'invalid JSON: ' + e.message}); }
              const lines = [];
              function tName(v) { return v === null ? 'null' : Array.isArray(v) ? 'unknown[]' : typeof v; }
              function emit(obj, name) {
                lines.push('export interface ' + name + ' {');
                for (const [k, v] of Object.entries(obj)) {
                  if (v !== null && typeof v === 'object' && !Array.isArray(v)) { emit(v, cap(k) + 'Type'); lines.push('  ' + safe(k) + ': ' + cap(k) + 'Type;'); }
                  else if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object' && !Array.isArray(x))) { emit(v[0], cap(k) + 'Item'); lines.push('  ' + safe(k) + ': ' + cap(k) + 'Item[];'); }
                  else if (Array.isArray(v) && v.length) { const ts = [...new Set(v.map(tName))]; lines.push('  ' + safe(k) + ': (' + ts.join(' | ') + ')[];'); }
                  else lines.push('  ' + safe(k) + (k in obj ? '' : '?') + ': ' + tName(v) + ';');
                }
                lines.push('}');
              }
              const cap = s => s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase()) || 'X';
              const safe = k => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
              emit(data, 'Root');
              const types = lines.join('\n');
              return json(res, 200, { types }, { 'content-type': 'application/json' });
            }
            if (u.pathname === '/diff') {
              const q = u.searchParams;
              const a = q.get('a') || '', b = q.get('b') || '';
              if (a === '' && b === '') return json(res, 400, {error: 'provide ?a=<text>&b=<text>'});
              const A = a.split('\n'), B = b.split('\n');
              const n = A.length, m = B.length;
              const dp = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
              for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
              const out = [];
              let i = 0, j = 0;
              while (i < n && j < m) {
                if (A[i] === B[j]) { out.push({op: ' ', line: A[i]}); i++; j++; }
                else if (dp[i+1][j] >= dp[i][j+1]) { out.push({op: '-', line: A[i]}); i++; }
                else { out.push({op: '+', line: B[j]}); j++; }
              }
              while (i < n) out.push({op: '-', line: A[i++]});
              while (j < m) out.push({op: '+', line: B[j++]});
              const patch = out.map(l => l.op + l.line).join('\n');
              return json(res, 200, { added: out.filter(l => l.op === '+').length, removed: out.filter(l => l.op === '-').length, unchanged: out.filter(l => l.op === ' ').length, patch, diff: out });
            }
            if (u.pathname === '/csv') {
              const q = u.searchParams;
              const delimiter = (q.get('delimiter') || ',')[0] || ',';
              const esc = s => { s = String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
              if (q.get('json')) {
                let data; try { data = JSON.parse(q.get('json')); } catch (e) { return json(res, 400, {error: 'invalid JSON: ' + e.message}); }
                const rows = Array.isArray(data) ? data : [data];
                if (!rows.length || typeof rows[0] !== 'object') return json(res, 400, {error: 'JSON must be an array of objects'});
                const cols = [...rows.reduce((s, r) => { Object.keys(r || {}).forEach(k => s.add(k)); return s; }, new Set())];
                const csv = [cols.map(esc).join(delimiter), ...rows.map(r => cols.map(c => esc(r && r[c] !== undefined ? r[c] : '')).join(delimiter))].join('\n');
                return json(res, 200, { csv }, { 'content-type': 'application/json' });
              }
              const csvText = q.get('csv');
              if (!csvText) return json(res, 400, {error: 'provide ?json=<array> (to CSV) or ?csv=<text> (to JSON)'});
              const parseRow = line => {
                const out = []; let cur = '', inQ = false;
                for (let i = 0; i < line.length; i++) {
                  const ch = line[i];
                  if (inQ) { if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
                  else if (ch === '"') inQ = true;
                  else if (ch === delimiter) { out.push(cur); cur = ''; }
                  else cur += ch;
                }
                out.push(cur);
                return out;
              };
              const lines = csvText.split(/\r?\n/).filter(l => l !== '');
              if (!lines.length) return json(res, 400, {error: 'empty csv'});
              const header = parseRow(lines[0]);
              const data = lines.slice(1).map(l => { const cells = parseRow(l); const o = {}; header.forEach((h, i) => o[h] = cells[i] !== undefined ? cells[i] : ''); return o; });
              return json(res, 200, { rows: data.length, header, data });
            }
            if (u.pathname === '/md') {
              let text = u.searchParams.get('text') || '';
              if (!text && req.method === 'POST') { const b = await readJson(req).catch(() => null); if (b) text = b.text || JSON.stringify(b); }
              if (!text) return json(res, 400, {error: 'text?=<markdown> or POST {text}'});
              const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
              const inline = s => esc(s)
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
              const lines = text.split('\n');
              const out = [];
              let inList = false, inCode = false, para = [];
              const flush = () => { if (para.length) { out.push('<p>' + para.map(inline).join(' ') + '</p>'); para = []; } };
              const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
              for (const line of lines) {
                if (line.startsWith('\`\`\`')) { flush(); closeList(); if (inCode) { out.push('</code></pre>'); inCode = false; } else { out.push('<pre><code>'); inCode = true; } continue; }
                if (inCode) { out.push(esc(line)); continue; }
                const h = line.match(/^(#{1,6})\s+(.*)/);
                if (h) { flush(); closeList(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); continue; }
                const li = line.match(/^\s*[-*+]\s+(.*)/);
                if (li) { flush(); if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(li[1]) + '</li>'); continue; }
                if (line.trim() === '') { flush(); closeList(); continue; }
                para.push(line.trim());
              }
              flush(); closeList(); if (inCode) out.push('</code></pre>');
              const html = out.join('\n');
              const fmt = u.searchParams.get('format');
              if (fmt === 'html') { res.writeHead(200, {'content-type':'text/html'}); return res.end(html); }
              return json(res, 200, { html });
            }
            if (u.pathname === '/otp') {
              const q = u.searchParams;
              const secret = (q.get('secret') || '').toUpperCase().replace(/\s/g, '').replace(/=+$/, '');
              if (!secret) return json(res, 400, {error: 'secret?=<base32> [&digits=6|8] [&period=30]'});
              if (!/^[A-Z2-7]+$/.test(secret)) return json(res, 400, {error: 'invalid base32 secret (A-Z, 2-7 only)'});
              const crypto = require('crypto');
              let bin = Buffer.alloc(0);
              const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
              let bits = 0, value = 0;
              for (const c of secret) {
                value = (value << 5) | B32.indexOf(c);
                bits += 5;
                if (bits >= 8) { bin = Buffer.concat([bin, Buffer.from([(value >>> (bits - 8)) & 0xFF])]); bits -= 8; }
              }
              const digits = [6, 8].includes(parseInt(q.get('digits'), 10)) ? parseInt(q.get('digits'), 10) : 6;
              const period = parseInt(q.get('period'), 10) || 30;
              const counter = Math.floor(Date.now() / 1000 / period);
              const buf = Buffer.alloc(8);
              buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
              buf.writeUInt32BE(counter >>> 0, 4);
              const hmac = crypto.createHmac('sha1', bin).update(buf).digest();
              const offset = hmac[hmac.length - 1] & 0x0F;
              const code = ((hmac[offset] & 0x7F) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 10 ** digits;
              const remaining = period - (Math.floor(Date.now() / 1000) % period);
              return json(res, 200, { code: String(code).padStart(digits, '0'), digits, period, secondsRemaining: remaining, otpauth: `otpauth://totp/Nerd:${secret}?secret=${secret}&digits=${digits}&period=${period}` });
            }
            if (u.pathname === '/lorem') {
              const q = u.searchParams;
              const unit = (q.get('unit') || 'paragraphs').toLowerCase();
              const n = Math.max(1, Math.min(parseInt(q.get('n') || '3', 10) || 3, 20));
              const WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];
              const rnd = (a) => a[Math.floor(Math.random() * a.length)];
              const sentence = () => {
                const len = 6 + Math.floor(Math.random() * 10);
                const w = Array.from({length: len}, () => rnd(WORDS));
                const s = w.join(' ');
                return s.charAt(0).toUpperCase() + s.slice(1) + '.';
              };
              let out;
              if (unit === 'words') out = Array.from({length: n}, () => rnd(WORDS)).join(' ');
              else if (unit === 'sentences') out = Array.from({length: n}, sentence).join(' ');
              else if (unit === 'paragraphs') out = Array.from({length: n}, () => Array.from({length: 3 + Math.floor(Math.random() * 4)}, sentence).join(' ')).join('\n\n');
              else return json(res, 400, {error: 'unit?=[paragraphs|sentences|words] [&n=3]'});
              return json(res, 200, { unit, count: n, text: out });
            }
                        if (u.pathname === '/units') {
              const q = u.searchParams;
              const value = parseFloat(q.get('value'));
              const from = (q.get('from') || '').toLowerCase();
              const to = (q.get('to') || '').toLowerCase();
              if (isNaN(value) || !from || !to) return json(res, 400, {error: 'value=<number>&from=<unit>&to=<unit> — categories: length, mass, temperature, data, volume'});
              const factors = {
                length: {mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344, nmi:1852},
                mass: {mg:1e-6, g:0.001, kg:1, t:1000, oz:0.028349523125, lb:0.45359237, st:6.35029318},
                data: {b:1, kb:1024, mb:1024**2, gb:1024**3, tb:1024**4, pb:1024**5},
                volume: {ml:0.001, l:1, m3:1000, tsp:0.00492892159375, tbsp:0.01478676478125, cup:0.2365882365, pint:0.473176473, qt:0.946352946, gal:3.785411784}
              };
              const temps = ['c','f','k','celsius','fahrenheit','kelvin'];
              const tnorm = (u) => u === 'celsius' ? 'c' : u === 'fahrenheit' ? 'f' : u === 'kelvin' ? 'k' : u;
              if (temps.includes(from) && temps.includes(to)) {
                const f = tnorm(from), t = tnorm(to);
                let celsius;
                if (f === 'c') celsius = value;
                else if (f === 'f') celsius = (value - 32) * 5 / 9;
                else celsius = value - 273.15;
                let result;
                if (t === 'c') result = celsius;
                else if (t === 'f') result = celsius * 9 / 5 + 32;
                else result = celsius + 273.15;
                return json(res, 200, {value, from, to, result: +result.toFixed(6), category: 'temperature'});
              }
              for (const [cat, units] of Object.entries(factors)) {
                if (units[from] !== undefined && units[to] !== undefined) {
                  const result = value * units[from] / units[to];
                  return json(res, 200, {value, from, to, result: +result.toFixed(10), category: cat});
                }
              }
              return json(res, 400, {error: `incompatible or unknown units: ${from} -> ${to}`, categories: {length: Object.keys(factors.length), mass: Object.keys(factors.mass), temperature: ['c','f','k'], data: Object.keys(factors.data), volume: Object.keys(factors.volume)}});
            }
            if (u.pathname === '/card') {
              try { return routeCard(u, res, json); }
              catch (e) { return json(res, 500, { error: e.message }); }
            }
            if (u.pathname === '/iban') {
              try { return routeIban(u, res, json); }
              catch (e) { return json(res, 500, { error: e.message }); }
            }

            if (u.pathname === '/isbn') {
              const q = u.searchParams;
              const raw = q.get('isbn');
              if (!raw) return json(res, 400, {error: 'isbn?=<ISBN-10 or ISBN-13 with or without hyphens>'});
              const s = raw.replace(/[-\s]/g, '').toUpperCase();
              if (s.length === 10) {
                if (!/^[0-9]{9}[0-9X]$/.test(s)) return json(res, 400, {valid: false, error: 'ISBN-10 must be 9 digits + check digit (0-9 or X)'});
                let sum = 0;
                for (let i = 0; i < 10; i++) {
                  const v = s[i] === 'X' ? 10 : +s[i];
                  sum += v * (10 - i);
                }
                const valid = sum % 11 === 0;
                // convert to ISBN-13
                const core = '978' + s.slice(0, 9);
                let sum13 = 0;
                for (let i = 0; i < 12; i++) sum13 += +core[i] * (i % 2 === 0 ? 1 : 3);
                const check13 = (10 - sum13 % 10) % 10;
                return json(res, 200, {input: raw, format: 'ISBN-10', valid, checkDigit: s[9], asIsbn13: core + check13});
              }
              if (s.length === 13) {
                if (!/^[0-9]{13}$/.test(s)) return json(res, 400, {valid: false, error: 'ISBN-13 must be 13 digits'});
                let sum = 0;
                for (let i = 0; i < 13; i++) sum += +s[i] * (i % 2 === 0 ? 1 : 3);
                const valid = sum % 10 === 0;
                const eanPrefix = s.slice(0, 3);
                let asIsbn10 = null;
                if (eanPrefix === '978') {
                  const core = s.slice(3, 12);
                  let sum10 = 0;
                  for (let i = 0; i < 9; i++) sum10 += +core[i] * (10 - i);
                  let check = (11 - sum10 % 11) % 11;
                  asIsbn10 = core + (check === 10 ? 'X' : check);
                }
                return json(res, 200, {input: raw, format: 'ISBN-13', valid, checkDigit: s[12], eanPrefix, asIsbn10});
              }
              return json(res, 400, {valid: false, error: `expected 10 or 13 digits, got ${s.length}`});
            }
            if (u.pathname === '/barcode') {
              const q = u.searchParams;
              const raw = q.get('code');
              if (!raw) return json(res, 400, {error: 'code?=<EAN-8, EAN-13, or UPC-A digits>'});
              const s = raw.replace(/[-\s]/g, '');
              if (!/^[0-9]+$/.test(s)) return json(res, 400, {valid: false, error: 'digits only'});
              let type, weights;
              if (s.length === 13) { type = 'EAN-13'; weights = [1, 3]; }
              else if (s.length === 12) { type = 'UPC-A'; weights = [3, 1]; }
              else if (s.length === 8) { type = 'EAN-8'; weights = [3, 1]; }
              else return json(res, 400, {valid: false, error: `expected 8, 12, or 13 digits, got ${s.length}`});
              const digits = s.slice(0, -1).split('').map(Number);
              const check = +s.slice(-1);
              let sum = 0;
              for (let i = 0; i < digits.length; i++) sum += digits[i] * weights[i % 2];
              const valid = (10 - sum % 10) % 10 === check;
              let gs1Prefix = null, country = null;
              if (s.length === 13 || s.length === 12) {
                gs1Prefix = s.slice(0, 3);
                const p = +gs1Prefix;
                if (p >= 977 && p <= 979) country = p === 977 ? 'ISSN (periodicals)' : 'ISBN/ISMN (books/sheet music)';
                else                 if (p >= 0 && p <= 19) country = 'US/Canada (UPC)';
                else if (p >= 30 && p <= 39) country = 'US (drugs/NDC)';
                else if (p >= 40 && p <= 49) country = 'distribution (internal)';
                else if (p >= 50 && p <= 59) country = 'coupons';
                else if (p >= 60 && p <= 139) country = 'US/Canada';
                else if (p >= 300 && p <= 379) country = 'France & Monaco';
                else if (p >= 400 && p <= 440) country = 'Germany';
                else if (p === 380) country = 'Bulgaria';
                else if (p >= 500 && p <= 509) country = 'UK';
                else if (p >= 590) country = 'Poland';
                else if (p >= 600 && p <= 601) country = 'South Africa';
                else if (p >= 640 && p <= 649) country = 'Finland';
                else if (p >= 690 && p <= 699) country = 'China';
                else if (p >= 700 && p <= 709) country = 'Norway';
                else if (p >= 730 && p <= 739) country = 'Sweden';
                else if (p >= 750) country = 'Mexico';
                else if (p >= 754 && p <= 755) country = 'Canada';
                else if (p >= 870 && p <= 879) country = 'Netherlands';
                else if (p >= 900 && p <= 919) country = 'Austria';
                else if (p >= 930 && p <= 939) country = 'Australia';
                else if (p >= 940 && p <= 949) country = 'New Zealand';
                else if (p >= 980) country = 'refund receipts';
                else if (p >= 990 && p <= 999) country = 'coupons';
                else country = 'other/GS1 member';
              }
              return json(res, 200, {input: raw, type, valid, checkDigit: check, computedCheckDigit: (10 - sum % 10) % 10, gs1Prefix, country});
            }
            if (u.pathname === '/vin') {
              try { return routeVin(u, res, json); }
              catch (e) { return json(res, 500, { error: e.message }); }
            }

            if (u.pathname === '/cron') {
              const q = u.searchParams;
              const expr = q.get('expr');
              if (!expr) return json(res, 400, {error: 'expr?=<cron expression> — 5 fields: minute hour day-of-month month day-of-week'});
              const fields = expr.trim().split(/\s+/);
              if (fields.length !== 5) return json(res, 400, {error: `expected 5 fields (min hour dom month dow), got ${fields.length}`, tip: 'use * * * * * for every minute'});
              const ranges = [[0,59],[0,23],[1,31],[1,12],[0,6]];
              const names = {month: {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}, dow: {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6}};
              // parse field into set of allowed values
              const parseField = (f, idx) => {
                const [lo, hi] = ranges[idx];
                const isDow = idx === 4, isMonth = idx === 3;
                const resolve = (v) => {
                  v = v.toLowerCase();
                  if (isMonth && names.month[v] !== undefined) return names.month[v];
                  if (isDow && names.dow[v] !== undefined) return names.dow[v];
                  if (isDow && v === '7') return 0;
                  const n = +v;
                  if (isNaN(n) || n < lo || n > hi) throw `field ${idx+1}: bad value ${v} (range ${lo}-${hi})`;
                  return n;
                };
                const out = new Set();
                for (const part of f.split(',')) {
                  const stepMatch = part.match(/^(.*)\/(\d+)$/);
                  let base = part, step = 1;
                  if (stepMatch) { base = stepMatch[1]; step = +stepMatch[2]; if (step < 1) throw `field ${idx+1}: bad step ${step}`; }
                  let a = lo, b = hi;
                  if (base !== '*' && base !== '') {
                    if (base.includes('-')) { const [x, y] = base.split('-'); a = resolve(x); b = resolve(y); }
                    else { a = resolve(base); b = stepMatch ? hi : a; }
                  }
                  for (let v = a; v <= b; v += step) out.add(v);
                }
                return out;
              };
              try {
                const sets = fields.map((f, i) => parseField(f, i));
                // special: dom/dow semantics — if both restricted, match either (standard Vixie cron)
                const domRestricted = fields[2] !== '*';
                const dowRestricted = fields[4] !== '*';
                // brute-force next 3 runs within 1 year
                const runs = [];
                let t = new Date();
                t.setSeconds(0, 0);
                t.setMinutes(t.getMinutes() + 1);
                outer: for (let i = 0; i < 527040 && runs.length < 3; i++) { // max 1 year of minutes
                  if (sets[0].has(t.getMinutes()) && sets[1].has(t.getHours()) && sets[3].has(t.getMonth() + 1)) {
                    const domOk = sets[2].has(t.getDate());
                    const dowOk = sets[4].has(t.getDay());
                    const dayOk = domRestricted && dowRestricted ? (domOk || dowOk) : (domOk && dowOk);
                    if (dayOk) runs.push(new Date(t).toISOString());
                  }
                  t.setMinutes(t.getMinutes() + 1);
                }
                const describe = (f, i) => {
                  if (f === '*') return 'every';
                  if (f.startsWith('*/')) return `every ${f.slice(2)}`;
                  return f;
                };
                return json(res, 200, {
                  expression: expr, valid: true,
                  fields: {minute: describe(fields[0]), hour: describe(fields[1]), dayOfMonth: describe(fields[2]), month: describe(fields[3]), dayOfWeek: describe(fields[4])},
                  nextRuns: runs,
                  note: 'day-of-month + day-of-week: if both restricted, either matches (Vixie cron standard)'
                });
              } catch (e) {
                return json(res, 400, {valid: false, error: String(e)});
              }
            }
            if (u.pathname === '/semver') {
              const q = u.searchParams;
              const a = q.get('a'), b = q.get('b'), list = q.get('list');
              const parse = (v) => {
                const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(v.trim());
                if (!m) throw `invalid semver: ${v}`;
                return {major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : null, build: m[5] || null, raw: v.trim()};
              };
              const cmp = (x, y) => {
                if (x.major !== y.major) return x.major - y.major;
                if (x.minor !== y.minor) return x.minor - y.minor;
                if (x.patch !== y.patch) return x.patch - y.patch;
                const pn = x.pre, qn = y.pre;
                if (!pn && !qn) return 0;
                if (!pn) return 1;   // release > prerelease
                if (!qn) return -1;
                for (let i = 0; i < Math.max(pn.length, qn.length); i++) {
                  const p = pn[i], r = qn[i];
                  if (p === undefined) return -1;
                  if (r === undefined) return 1;
                  const pd = /^\d+$/.test(p), rd = /^\d+$/.test(r);
                  if (pd && rd) { if (+p !== +r) return +p - +r; }
                  else if (pd) return -1;    // numeric < alphanumeric
                  else if (rd) return 1;
                  else if (p !== r) return p < r ? -1 : 1;
                }
                return 0;
              };
              try {
                if (list) {
                  const versions = list.split(',').map(parse);
                  const sorted = versions.slice().sort(cmp);
                  return json(res, 200, {input: versions.map(v => v.raw), sorted: sorted.map(v => v.raw), latest: sorted[sorted.length - 1].raw, oldest: sorted[0].raw});
                }
                if (!a || !b) return json(res, 400, {error: 'a=<v>&b=<v> to compare | list=<v1,v2,...> to sort'});
                const x = parse(a), y = parse(b);
                const c = cmp(x, y);
                return json(res, 200, {
                  a: x.raw, b: y.raw,
                  result: c === 0 ? 'equal' : c < 0 ? 'a < b' : 'a > b',
                  difference: c === 0 ? 0 : (c < 0 ? -1 : 1),
                  aParsed: {major: x.major, minor: x.minor, patch: x.patch, prerelease: x.pre ? x.pre.join('.') : null, build: x.build},
                  bParsed: {major: y.major, minor: y.minor, patch: y.patch, prerelease: y.pre ? y.pre.join('.') : null, build: y.build}
                });
              } catch (e) {
                return json(res, 400, {error: String(e)});
              }
            }
            if (u.pathname === '/jwt') {
              const q = u.searchParams;
              const raw = q.get('token') || (q.get('jwt') || '');
              if (!raw) return json(res, 400, {error: 'token?=<JWT> — decodes header+payload, checks exp/nbf/iat (no signature verification)'});
              const parts = raw.trim().split('.');
              if (parts.length !== 3) return json(res, 400, {error: `JWT must have 3 dot-separated parts, got ${parts.length}`});
              const b64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
              let header, payload;
              try { header = JSON.parse(b64u(parts[0])); } catch { return json(res, 400, {error: 'invalid header segment (not base64url JSON)'}); }
              try { payload = JSON.parse(b64u(parts[1])); } catch { return json(res, 400, {error: 'invalid payload segment (not base64url JSON)'}); }
              const now = Math.floor(Date.now() / 1000);
              const status = {};
              if (payload.exp !== undefined) status.expired = now >= payload.exp, status.expiresAt = new Date(payload.exp * 1000).toISOString();
              if (payload.nbf !== undefined) status.notYetValid = now < payload.nbf, status.validFrom = new Date(payload.nbf * 1000).toISOString();
              if (payload.iat !== undefined) status.issuedAt = new Date(payload.iat * 1000).toISOString();
              status.overall = (status.expired || status.notYetValid) ? 'INVALID (time-based)' : 'VALID (time-based)';
              return json(res, 200, {
                header, payload, signaturePresent: parts[2].length > 0, signatureLength: parts[2].length,
                alg: header.alg || null, typ: header.typ || null,
                timeStatus: status,
                note: 'signature NOT verified — decoding only'
              });
            }

            if (u.pathname === '/color') {
              try { return routeColor(u, res, json); }
              catch (e) { return json(res, 500, { error: e.message }); }
            }
            if (u.pathname === '/subnet') {
              try { return routeSubnet(u, res, json); }
              catch (e) { return json(res, 500, { error: e.message }); }
            }
            if (u.pathname === '/regex') {
              const q = Object.fromEntries(u.searchParams);
              const pattern = String(q.pattern || ''), text = String(q.text || '');
              const flags = String(q.flags || 'g').replace(/[^gimsuy]/g, '');
              if (!pattern) return json(res, 400, {error: 'provide ?pattern=...&text=...&flags=g'});
              let re; try { re = new RegExp(pattern, flags); } catch (e) { return json(res, 400, {error: 'invalid regex: ' + e.message, pattern}); }
              const matches = [];
              try {
                if (flags.includes('g')) { let m, guard = 0; while ((m = re.exec(text)) && guard++ < 100) { matches.push({match: m[0], index: m.index, groups: m.slice(1), named: m.groups || null}); if (m[0] === '') re.lastIndex++; } }
                else { const m = text.match(re); if (m) matches.push({match: m[0], index: m.index !== undefined ? m.index : null, groups: m.slice(1), named: m.groups || null}); }
              } catch (e) { return json(res, 500, {error: 'exec failed: ' + e.message}); }
              let highlighted = text;
              if (matches.length && matches[0].index !== null) { for (let i2 = matches.length - 1; i2 >= 0; i2--) { const mm = matches[i2]; highlighted = highlighted.slice(0, mm.index) + '[' + mm.match + ']' + highlighted.slice(mm.index + mm.match.length); } }
              return json(res, 200, {pattern, flags, matchCount: matches.length, matches: matches.slice(0, 50), highlighted});
            }
            
            if (u.pathname === '/markdown') {
              const q = Object.fromEntries(u.searchParams);
              if (!q.url) return json(res, 400, {error: 'provide ?url='});
              try {
                let body = await (await fetch(q.url, {headers: {'user-agent': 'Mozilla/5.0 (compatible; NerdUtilityBot/1.0)'}, redirect: 'follow', signal: AbortSignal.timeout(10000)})).text();
                let h = /[\s\S]*?<body[^>]*>([\s\S]*?)<\/body>[\s\S]*/i.test(body) ? body.replace(/[\s\S]*?<body[^>]*>([\s\S]*?)<\/body>[\s\S]*/i, '$1') : body;
                h = h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '');
                h = h.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, t) => '\n' + '#'.repeat(+n) + ' ' + t.trim() + '\n');
                h = h.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**').replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
                h = h.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`').replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, t) => '\n```\n' + t.replace(/<[^>]+>/g, '') + '\n```\n');
                h = h.replace(/<img[^>]*src=[\"']?([^\"' >]+)[\"']?[^>]*>/gi, (m, s) => '![](' + s + ')');
                h = h.replace(/<a [^>]*href=[\"']?([^\"' >]+)[\"']?[^>]*>([\s\S]*?)<\/a>/gi, (m, href, t) => '[' + t.trim() + '](' + href + ')');
                h = h.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, t) => '- ' + t.trim() + '\n');
                h = h.replace(/<(p|div|section|article|ul|ol|table|tr|blockquote)[^>]*>/gi, '\n').replace(/<br[^>]*>/gi, '\n').replace(/<hr[^>]*>/gi, '\n---\n');
                h = h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '\"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
                h = h.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
                return json(res, 200, {url: q.url, markdown: h});
              } catch (e) { return json(res, 502, {error: e.message}); }
            }
            if (u.pathname === '/slug') {
              const q = Object.fromEntries(u.searchParams);
              if (!q.text) return json(res, 400, {error: 'provide ?text='});
              let s = String(q.text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
              s = s.replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_-]+/g, (q.sep || '-')).replace(new RegExp('^-+|'+ (q.sep || '-') +'+$','g'), '');
              return json(res, 200, {input: q.text, slug: s});
            }
            if (u.pathname === '/cron') {
              const q = u.searchParams;
              const expr = q.get('expr');
              if (!expr) return json(res, 400, {error: 'expr?=<cron e.g. */5 9-17 * * 1-5>'});
              const fields = expr.trim().split(/\s+/);
              if (fields.length !== 5) return json(res, 400, {error: 'expected 5 fields: minute hour dom month dow'});
              const ranges = [[0,59],[0,23],[1,31],[1,12],[0,7]];
              const monthNames = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
              const dowNames = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
              const parsed = [];
              for (let i = 0; i < 5; i++) {
                const [lo, hi] = ranges[i];
                const vals = new Set();
                for (const part of fields[i].split(',')) {
                  let m = part.match(/^\*(?:\/(\d+))?$/);
                  if (m) { const step = m[1] ? +m[1] : 1; for (let v = lo; v <= hi; v += step) vals.add(v === 7 && i === 4 ? 0 : v); continue; }
                  m = part.match(/^(\w+)-(\w+)(?:\/(\d+))?$/);
                  if (m) {
                    let a = m[1], b = m[2];
                    if (i === 3) a = monthNames[a] || a, b = monthNames[b] || b;
                    if (i === 4) a = dowNames[a] !== undefined ? dowNames[a] : a, b = dowNames[b] !== undefined ? dowNames[b] : b;
                    if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return json(res, 400, {error: `field ${i+1}: bad range "${part}"`});
                    const step = m[3] ? +m[3] : 1;
                    for (let v = +a; v <= +b; v += step) vals.add(v === 7 && i === 4 ? 0 : v);
                    continue;
                  }
                  m = part.match(/^(\w+)$/);
                  if (m) {
                    let v = m[1];
                    if (i === 3 && monthNames[v]) v = monthNames[v];
                    if (i === 4 && dowNames[v] !== undefined) v = dowNames[v];
                    if (!/^\d+$/.test(v)) return json(res, 400, {error: `field ${i+1}: bad value "${part}"`});
                    v = +v;
                    if (v < lo || v > (i === 4 ? 7 : hi)) return json(res, 400, {error: `field ${i+1}: value out of range "${part}"`});
                    vals.add(v === 7 && i === 4 ? 0 : v);
                    continue;
                  }
                  return json(res, 400, {error: `field ${i+1}: bad part "${part}"`});
                }
                parsed.push(vals);
              }
              const [mins, hours, doms, months, dows] = parsed;
              const monthsArr = [...months].sort((a,b)=>a-b).map(m => ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m-1]);
              const dowsArr = [...dows].sort((a,b)=>a-b).map(d => ['sun','mon','tue','wed','thu','fri','sat'][d]);
              const fmt = (vals, hi, unit, unitPl) => {
                if (vals.size === hi + 1 || vals.size >= hi) return `every ${unit}`;
                if (vals.size === 1) return `at ${unit} ${[...vals][0]}`;
                const arr = [...vals].sort((a,b)=>a-b);
                if (arr.every((v,i) => i === 0 || v === arr[i-1] + 1)) return `${unitPl} ${arr[0]}-${arr[arr.length-1]}`;
                return `${unitPl} ${arr.join(', ')}`;
              };
              const desc = [
                fmt(mins, 59, 'minute', 'minutes'),
                fmt(hours, 23, 'hour', 'hours'),
                dows.size === 7 ? 'every day' : `on ${dowsArr.join(', ')}`,
                months.size === 12 ? '' : `in ${monthsArr.join(', ')}`
              ].filter(Boolean).join(' ');
              const next = [];
              const t = new Date();
              t.setSeconds(0, 0); t.setMinutes(t.getMinutes() + 1);
              const match = d => mins.has(d.getMinutes()) && hours.has(d.getHours()) && months.has(d.getMonth()+1) && dows.has(d.getDay()) && doms.has(d.getDate());
              for (let i = 0; i < 60 * 24 * 400 && next.length < 5; i++) {
                if (match(t)) next.push(t.toISOString());
                t.setMinutes(t.getMinutes() + 1);
              }
              return json(res, 200, {
                expression: expr, fields,
                minutes: [...mins].sort((a,b)=>a-b), hours: [...hours].sort((a,b)=>a-b),
                daysOfMonth: [...doms].sort((a,b)=>a-b), months: monthsArr, daysOfWeek: dowsArr,
                humanReadable: desc, nextRuns: next
              });
            }
            if (u.pathname === '/diff') {
              const q = Object.fromEntries(u.searchParams);
              if (!q.a || !q.b) return json(res, 400, {error: 'provide ?a=...&b=...'});
              const A = String(q.a).split('\n'), B = String(q.b).split('\n');
              const n = A.length, m = B.length;
              const dp = Array.from({length: n+1}, () => new Array(m+1).fill(0));
              for (let x = n-1; x >= 0; x--) for (let y = m-1; y >= 0; y--) dp[x][y] = A[x] === B[y] ? dp[x+1][y+1] + 1 : Math.max(dp[x+1][y], dp[x][y+1]);
              const lines = []; let x = 0, y = 0;
              while (x < n && y < m) {
                if (A[x] === B[y]) { lines.push('  ' + A[x]); x++; y++; }
                else if (dp[x+1][y] >= dp[x][y+1]) { lines.push('- ' + A[x]); x++; }
                else { lines.push('+ ' + B[y]); y++; }
              }
              while (x < n) { lines.push('- ' + A[x]); x++; }
              while (y < m) { lines.push('+ ' + B[y]); y++; }
              const changed = lines.filter(l2 => l2[0] !== ' ').length;
              return json(res, 200, {changedLines: changed, added: lines.filter(l2 => l2.startsWith('+')).length, removed: lines.filter(l2 => l2.startsWith('-')).length, unified: lines.join('\n')});
            }
        if (u.pathname === '/.well-known/ai-plugin.json' || u.pathname === '/ai-plugin.json') {
          try { res.writeHead(200, {'Content-Type':'application/json'}); return res.end(JSON.stringify(require('./public/ai-plugin.json'))); }
          catch(e) { return json(res, 500, {error: e.message}); }
        }
        if (u.pathname === '/dashboard') { try { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); return res.end(require('./dashboard.js').render(req, __dirname + '/usage.json')); } catch(e) { return json(res, 500, {error: e.message}); } }
    if (u.pathname === '/openapi.json') return json(res, 200, JSON.parse(require('fs').readFileSync(__dirname + '/openapi.json', 'utf8')));
    if (u.pathname === '/agent-card.json' || u.pathname === '/.well-known/agent-card.json') return json(res, 200, require('./agent-card.json'));
    if (u.pathname === '/llms.txt') { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end(require('fs').readFileSync(__dirname + '/PROMO/llms.txt')); }
    if (u.pathname === '/pricing') return json(res, 200, {
      free: Object.keys(ENDPOINTS),
      paid: { scrape: `${PRICE_CENTS} cents (USDC via x402)` }
    });
    if (route === 'scrape') {
      if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'GET/POST only' });
      const target = u.searchParams.get('url') || (req.method === 'POST' ? (JSON.parse(await readBody(req)).url || '') : '');
      if (!target || !/^https:\/\//.test(target)) return json(res, 400, { error: 'provide ?url=https://...' });
      // --- x402 paywall (skip when disabled or localhost test) ---
      if (process.env.X402_DISABLED !== '1') {
        const pay = req.headers['x-payment'];
        if (!pay) {
          res.writeHead(402, { 'Content-Type': 'application/json', 'Www-Authenticate': 'X402 challenge' });
          return res.end(JSON.stringify(challenge(u.pathname)));
        }
        try { const payer = verifyPayment(pay); ledger.record(JSON.parse(pay).authorization, payer, '/scrape'); }
        catch (e) { return json(res, 402, { error: 'payment rejected: ' + e.message }); }
      }
      const result = await scrapeUrl(target);
      return json(res, 200, result);
    }
    if (u.pathname === '/qr') {
      const q = Object.fromEntries(u.searchParams);
      if (!q.data) return json(res, 400, { error: 'missing ?data=' });
      try {
        const m = qr.generate(q.data);
        const fmt = q.format || 'svg';
        if (fmt === 'svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(qr.toSvg(m, +(q.scale || 4))); }
        if (fmt === 'png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(qr.toPngBuffer(m, +(q.scale || 8))); }
        if (fmt === 'ascii') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(qr.toAscii(m)); }
        if (fmt === 'json') return json(res, 200, { size: m.length, modules: m });
        return json(res, 400, { error: 'format must be svg, png, ascii, or json' });
      } catch (e) { return json(res, 400, { error: e.message }); }
    }
    if (u.pathname === '/md') {
      const q = Object.fromEntries(u.searchParams);
      let text = q.text || '';
      if (req.method === 'POST') { const raw = await readBody(req); try { text = JSON.parse(raw).text || ''; } catch (e) { text = raw; } }
      if (!text) return json(res, 400, { error: 'text or POST {text} required' });
      return json(res, 200, { html: md.convert(text) });
    }
    if (u.pathname === '/alerts') return alerts.handle(req, res, u, json, readBody).catch(e => json(res, 500, { error: e.message }));
    if (u.pathname === '/price') {
      const q = Object.fromEntries(u.searchParams);
      try { return json(res, 200, await price.price(q)); }
      catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (u.pathname === '/price/history') {
      const q = Object.fromEntries(u.searchParams);
      try { return json(res, 200, await price.history(q)); }
      catch (e) { return json(res, 502, { error: e.message }); }
    }
    if (u.pathname === '/random') {
      const q = Object.fromEntries(u.searchParams);
      const lo = parseInt(q.min ?? '0'), hi = parseInt(q.max ?? '100');
      if (isNaN(lo) || isNaN(hi) || lo > hi) return json(res, 400, { error: 'min/max must be integers, min<=max' });
      return json(res, 200, { min: lo, max: hi, number: Math.floor(Math.random() * (hi - lo + 1)) + lo });
    }
    if (u.pathname === '/password') {
      const q = Object.fromEntries(u.searchParams);
      const len = Math.min(Math.max(parseInt(q.length || '20'), 8), 128);
      const sets = { lower: 'abcdefghijkmnopqrstuvwxyz', upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', digits: '23456789', symbols: '!@#$%^&*-_=+' };
      const pool = Object.entries(sets).filter(([k]) => q[k] !== 'false' && !(q.exclude||'').includes(k[0])).map(([,v]) => v).join('');
      const bytes = require('crypto').randomBytes(len);
      let pw = ''; for (let i = 0; i < len; i++) pw += pool[bytes[i] % pool.length];
      return json(res, 200, { password: pw, length: len });
    }
    if (u.pathname === '/lorem') {
      const q = Object.fromEntries(u.searchParams);
      const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua'];
      const n = Math.min(Math.max(parseInt(q.words || '30'), 1), 500);
      let out = []; for (let i = 0; i < n; i++) out.push(words[Math.floor(Math.random()*words.length)]);
      let text = out.join(' ');
      if (q.start !== 'false') text = 'Lorem ipsum ' + text;
      return json(res, 200, { words: n, text });
    }
    if (u.pathname === '/slugify') {
      const q = Object.fromEntries(u.searchParams);
      if (!q.text) return json(res, 400, { error: 'text required' });
      const slug = q.text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      return json(res, 200, { slug });
    }
    if (u.pathname === '/case') {
      const q = Object.fromEntries(u.searchParams);
      if (!q.text) return json(res, 400, { error: 'text required' });
      const t = q.text;
      const out = { upper: t.toUpperCase(), lower: t.toLowerCase(),
        title: t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
        camel: t.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()),
        snake: t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g,'') };
      return json(res, 200, q.to ? (out[q.to] !== undefined ? { result: out[q.to] } : json(res,400,{error:'invalid to'}) || { result: out[q.to] }) : out);
    }
    if (u.pathname === '/url-encode') {
      const q = Object.fromEntries(u.searchParams);
      if (!q.text) return json(res, 400, { error: 'text required' });
      return json(res, 200, { encoded: encodeURIComponent(q.text), decoded: decodeURIComponent(q.text.replace(/\+/g,' ')) });
    }
    if (u.pathname === '/qrcode') {
      const q = Object.fromEntries(u.searchParams);
      if (!q.text) return json(res, 400, { error: 'text required' });
      try {
        const m = qr.generate(q.text);
        if (q.format === 'svg') { res.writeHead(200, {'Content-Type':'image/svg+xml'}); return res.end(qr.toSvg(m, +(q.scale||4))); }
        if (q.format === 'ascii' || q.format === 'txt') return json(res, 200, { ascii: qr.toAscii(m) });
        const buf = qr.toPngBuffer(m, +(q.scale||8), 4);
        res.writeHead(200, {'Content-Type':'image/png','Content-Length':buf.length});
        return res.end(buf);
      } catch (e) { return json(res, 400, { error: e.message }); }
    }
    if (u.pathname === '/text-stats') {
      const q = Object.fromEntries(u.searchParams);
      let text = q.text || '';
      const text2 = text;
      return json(res, 200, textstats.stats(text));
    }
    if (u.pathname === '/json2csv') {
      if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'GET/POST' });
      const raw = req.method === 'POST' ? await readBody(req) : (u.searchParams.get('json') || '');
      let arr;
      try { arr = JSON.parse(raw); } catch (e) { return json(res, 400, { error: 'invalid JSON: ' + e.message }); }
      if (!Array.isArray(arr) || !arr.length) return json(res, 400, { error: 'expected non-empty JSON array' });
      const keys = [...new Set(arr.flatMap(o => Object.keys(o || {})))];
      const esc = v => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
      const csv = [keys.join(',')].concat(arr.map(o => keys.map(k => esc(o ? o[k] : '')).join(','))).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      return res.end(csv);
    }
    if (u.pathname === '/ipinfo') {
      const ip = req.socket.remoteAddress || 'unknown';
      return json(res, 200, {
        ip: ip.replace('::ffff:',''),
        userAgent: req.headers['user-agent'] || null,
        language: req.headers['accept-language'] || null,
        timestamp: new Date().toISOString()
      });
    }
    if (u.pathname === '/payments') {
      const all = ledger.load();
      const s = ledger.summary();
      const limit = Math.min(parseInt(u.searchParams.get('limit')) || 50, 200);
      return json(res, 200, { summary: s, payments: all.slice(-limit).reverse() });
    }
    if (u.pathname === '/stats') {
      const top = Object.entries(usage.byEndpoint).sort((a,b)=>b[1]-a[1]).slice(0,20);
      const ips = Object.keys(usage.byIP).length;
      return json(res, 200, {
        totalRequests: usage.total,
        uniqueCallers: ips,
        byEndpoint: Object.fromEntries(top),
        byDay: usage.byDay
      });
    }
    if (u.pathname === '/openapi.json' || u.pathname === '/openapi') {
      return json(res, 200, require('./openapi.json'));
    }
    if (u.pathname === '/docs') {
      const fs = require('fs');
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      return res.end(fs.readFileSync(__dirname + '/DOCS.md', 'utf8'));
    }
    if (route === 'price' || route === 'history') {
      const q = Object.fromEntries(u.searchParams.entries());
      try { return json(res, 200, await prices[route](q)); }
      catch (e) { return json(res, 502, { error: e.message }); }
    }
    const handler = ENDPOINTS[route];
    if (!handler) return json(res, 404, { error: 'not found. See /docs' });
    if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'GET/POST. See /docs' });
    const q = Object.fromEntries(u.searchParams.entries());
    const body = req.method === 'POST' ? await readBody(req)
      : (() => { const v = q.json || q.csv || q.text || q.data || q.input || q.domain || q.url || q.email; return v === undefined || v === '' ? '' : JSON.stringify({ domain: q.domain, url: q.url, email: q.email, json: q.json, csv: q.csv, text: q.text, data: q.data, input: q.input }); })();
    try {
      const out = await handler(body, q);
      return json(res, 200, out);
    } catch (e) { return json(res, (e && e.status) || 422, { error: String(e && e.message || e) }); }
  } catch (e) { json(res, 400, { error: e.message }); }
}).listen(8080, () => console.log('Nerd utility API (with x402 /scrape) listening on :8080'));
