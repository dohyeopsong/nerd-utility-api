// Nerd Utility API — clean rewrite. Single file, zero deps.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const WALLET = '0x85fe24c7668577ae04106Be4fb806915a77384e0';

const json = (res, code, obj) => { res.writeHead(code, {'Content-Type':'application/json; Access-Control-Allow-Origin:*'}); res.end(JSON.stringify(obj, null, 2)); };
const q0 = (u) => { const o = {}; u.searchParams.forEach((v,k)=>o[k]=v); return o; };

// ---------- handlers ----------
const H = {
  health: () => ({ ok: true, service: 'nerd-utility-api', time: new Date().toISOString(), wallet: WALLET }),
  hash: (q) => { const t = q.text || '', a = q.algo || 'sha256';
    const ok = ['md5','sha1','sha256','sha512'];
    if (!ok.includes(a)) { const e = new Error('algo must be one of ' + ok.join(',')); e.status = 400; throw e; }
    return { algo: a, input: t, hash: crypto.createHash(a).update(t).digest('hex') }; },
  base64: (q) => { const t = q.text || '', m = q.mode || 'encode';
    if (m === 'encode') return { mode: m, result: Buffer.from(t).toString('base64') };
    if (m === 'decode') return { mode: m, result: Buffer.from(t, 'base64').toString('utf8') };
    const e = new Error('mode must be encode|decode'); e.status = 400; throw e; },
  uuid: () => ({ uuid: crypto.randomUUID(), v4: true }),
  timestamp: (q) => { const now = Date.now();
    if (q.epoch) { const d = new Date(Number(q.epoch)); return { epoch: Number(q.epoch), iso: d.toISOString(), unix: Math.floor(d.getTime()/1000) }; }
    return { unix: Math.floor(now/1000), ms: now, iso: new Date(now).toISOString() }; },
  json: (q) => { const t = q.text || q.json || '';
    try { const p = JSON.parse(t); return { valid: true, type: Array.isArray(p) ? 'array' : typeof p, keys: p && typeof p === 'object' ? Object.keys(p).length : null, parsed: p }; }
    catch (e) { return { valid: false, error: e.message }; } },
  csv: (q) => { const t = q.text || q.csv || '';
    const lines = t.trim().split(/\r?\n/); if (!lines[0]) { const e = new Error('empty input'); e.status = 400; throw e; }
    const delim = (q.delim || ',')[0];
    const head = lines[0].split(delim).map(s => s.trim());
    const rows = lines.slice(1).map(l => { const cells = l.split(delim); const o = {}; head.forEach((h,i)=>o[h]=cells[i] !== undefined ? cells[i].trim() : null); return o; });
    return { headers: head, rowCount: rows.length, rows }; },
  textstats: (q) => { const t = q.text || '';
    const words = t.trim() ? t.trim().split(/\s+/) : [];
    return { chars: t.length, charsNoSpaces: t.replace(/\s/g,'').length, words: words.length, lines: t.split('\n').length, sentences: (t.match(/[.!?]+/g)||[]).length }; },
  morse: (q) => { const t = (q.text || '').toUpperCase(); const map = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
    if (q.mode === 'decode') { const rev = {}; Object.entries(map).forEach(([k,v])=>rev[v]=k);
      return { mode: 'decode', text: t.split(/\s+/).filter(Boolean).map(c => rev[c] || '?').join('') }; }
    return { mode: 'encode', morse: t.split('').map(c => c === ' ' ? '/' : (map[c] || '')).filter(x=>x!=='').join(' ') }; },
  roman: (q) => { const t = (q.text || '').trim();
    if (/^[0-9]+$/.test(t)) { const n = parseInt(t); if (n < 1 || n > 3999) { const e = new Error('1-3999 only'); e.status=400; throw e; }
      const v = [1000,900,500,400,100,90,50,40,10,9,5,4,1], s = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
      let r = '', x = n; v.forEach((val,i)=>{ while (x >= val) { r += s[i]; x -= val; } });
      return { input: n, roman: r }; }
    if (/^[MDCLXVI]+$/i.test(t)) { const v = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
      let n = 0; const u = t.toUpperCase();
      for (let i = 0; i < u.length; i++) { const cur = v[u[i]], nxt = v[u[i+1]]; n += nxt > cur ? -cur : cur; }
      return { input: t, number: n }; }
    const e = new Error('provide number or roman numeral via ?text='); e.status = 400; throw e; },
  case: (q) => { const t = q.text || '';
    const m = q.mode || 'camel';
    if (m === 'upper') return { result: t.toUpperCase() };
    if (m === 'lower') return { result: t.toLowerCase() };
    if (m === 'title') return { result: t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) };
    if (m === 'camel') return { result: t.replace(/[-_\s]+(.)?/g, (_,c)=>c?c.toUpperCase():'').replace(/^(.)/, c=>c.toLowerCase()) };
    if (m === 'snake') return { result: t.replace(/[-\s]+/g,'_').replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase() };
    if (m === 'kebab') return { result: t.replace(/[_\s]+/g,'-').replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase() };
    const e = new Error('mode must be upper|lower|title|camel|snake|kebab'); e.status = 400; throw e; },
  ipinfo: (q) => ({ note: 'client ip detection', yourHeaders: { 'user-agent': q._ua || null } }),
  password: (q) => { const n = Math.min(Math.max(parseInt(q.length || '16'), 8), 64);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = ''; const rnd = crypto.randomBytes(n);
    for (let i = 0; i < n; i++) pw += chars[rnd[i] % chars.length];
    return { password: pw, length: n, strengthBits: Math.round(n * Math.log2(chars.length)) }; },
  isbn: (q) => { const t = (q.text || '').replace(/[-\s]/g,'');
    if (t.length === 13) { let s = 0; for (let i = 0; i < 12; i++) s += Number(t[i]) * (i % 2 ? 3 : 1);
      const cd = (10 - (s % 10)) % 10; return { isbn13: t, valid: Number(t[12]) === cd, checkDigit: cd }; }
    if (t.length === 10) { let s = 0; for (let i = 0; i < 9; i++) s += Number(t[i]) * (10 - i);
      const last = t[9].toUpperCase() === 'X' ? 10 : Number(t[9]);
      return { isbn10: t, valid: (s + last) % 11 === 0 }; }
    const e = new Error('provide ISBN-10 or ISBN-13 via ?text='); e.status = 400; throw e; },
  units: (q) => { const v = parseFloat(q.value), f = (q.from||'').toLowerCase(), t = (q.to||'').toLowerCase();
    const tbl = { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, ft:0.3048, in:0.0254, yd:0.9144,
      kg:1, g:0.001, mg:0.000001, lb:0.45359237, oz:0.028349523125,
      b:1, kb:1024, mb:1048576, gb:1073741824, tb:1099511627776,
      l:1, ml:0.001, gal:3.785411784, qt:0.946352946, pt:0.473176473, cup:0.2365882365, floz:0.0295735295625 };
    if (isNaN(v)) { const e = new Error('?value= required'); e.status = 400; throw e; }
    if (f === 'c' && t === 'f') return { value: v, from: f, to: t, result: v * 9/5 + 32 };
    if (f === 'f' && t === 'c') return { value: v, from: f, to: t, result: (v - 32) * 5/9 };
    if (f === 'c' && t === 'k') return { value: v, from: f, to: t, result: v + 273.15 };
    if (f === 'k' && t === 'c') return { value: v, from: f, to: t, result: v - 273.15 };
    if (tbl[f] && tbl[t]) return { value: v, from: f, to: t, result: v * tbl[f] / tbl[t] };
    const e = new Error('unsupported units (length/mass/data/volume/temp)'); e.status = 400; throw e; },
  jwt: (q) => { const t = (q.text || q.token || '').trim();
    const parts = t.split('.');
    if (parts.length !== 3) { const e = new Error('provide JWT via ?token=a.b.c'); e.status = 400; throw e; }
    const dec = (s) => { const b = Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
      try { return JSON.parse(b); } catch { return b; } };
    const header = dec(parts[0]), payload = dec(parts[1]);
    const now = Math.floor(Date.now()/1000);
    const ts = (v) => v && typeof v === 'number' ? new Date(v*1000).toISOString() : null;
    return { header, payload,
      claims: {
        exp: payload.exp, expIso: ts(payload.exp), expired: payload.exp ? now > payload.exp : null,
        nbf: payload.nbf, nbfIso: ts(payload.nbf), notYetValid: payload.nbf ? now < payload.nbf : null,
        iat: payload.iat, iatIso: ts(payload.iat) },
      signature: parts[2].slice(0,12) + '...', alg: header.alg, note: 'signature NOT verified (decode only)' }; },
  semver: (q) => { const parse = (v) => { const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
      if (!m) { const e = new Error('invalid semver: ' + v); e.status = 400; throw e; }
      return { major:+m[1], minor:+m[2], patch:+m[3], pre: m[4] ? m[4].split('.') : null, build: m[5] || null, raw: v.trim() }; };
    const cmpPre = (a, b) => { if (!a && !b) return 0; if (!a) return 1; if (!b) return -1;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i], y = b[i];
        if (x === undefined) return -1; if (y === undefined) return 1;
        const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
        if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
        else if (xn) return -1; else if (yn) return 1;
        else if (x !== y) return x < y ? -1 : 1; }
      return 0; };
    const cmp = (a, b) => a.major !== b.major ? a.major - b.major : a.minor !== b.minor ? a.minor - b.minor : a.patch !== b.patch ? a.patch - b.patch : cmpPre(a.pre, b.pre);
    if (q.list) { const vs = q.list.split(',').map(parse); return { sorted: [...vs].sort(cmp).map(v=>v.raw), newest: [...vs].sort(cmp).pop().raw, oldest: [...vs].sort(cmp)[0].raw, count: vs.length }; }
    const a = parse(q.a || ''), b = parse(q.b || '');
    const d = cmp(a, b);
    return { a: a.raw, b: b.raw, result: d === 0 ? 'equal' : d < 0 ? 'a < b' : 'a > b', semverSpec: 'build metadata ignored in precedence' }; },
  pricing: () => ({ model: 'free — all endpoints free in local mode (x402 paid tier planned)', wallet: WALLET,
    freeEndpoints: Object.keys(H), note: 'Core utilities free forever.' }),
  docs: () => ({ service: 'Nerd Utility API', wallet: WALLET, usage: 'GET /<route>?text=...&other=params',
    routes: Object.keys(H) }),
};

// ---------- server ----------
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const route = u.pathname.replace(/^\//, '').replace(/\/$/, '');
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (route === '' || route === 'docs' || route === 'llms.txt') return json(res, 200, H.docs());
  if (!H[route]) return json(res, 404, { error: `unknown route /${route}`, available: Object.keys(H) });
  try {
    const q = q0(u); q._ua = req.headers['user-agent'];
    const out = H[route](q);
    return json(res, 200, out);
  } catch (e) { return json(res, e.status || 422, { error: String(e.message || e) }); }
}).listen(8080, () => console.log('Nerd Utility API (clean rewrite) listening on :8080'));
