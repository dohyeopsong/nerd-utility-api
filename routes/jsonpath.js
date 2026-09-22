// routes/jsonpath.js — /jsonpath — query JSON with simple paths
// POST /jsonpath  body: {"json": {...}, "path": "a.b[0].c"}
// GET  /jsonpath?json=<urlencoded json>&path=a.b[0]
const PATH_RE = /^(?:^|\.)((?:[^.\[\]"']+)|\[(?:\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\])/;

function parsePath(path) {
  if (!path || typeof path !== 'string') return [];
  const tokens = [];
  let rest = path.trim().replace(/^\$\.?/, ''); // allow leading $
  while (rest.length) {
    const m = rest.match(PATH_RE);
    if (!m) throw new Error(`invalid path near: '${rest.slice(0, 20)}'`);
    let tok = m[1];
    if (tok.startsWith('[')) {
      const inner = tok.slice(1, -1);
      if (/^\d+$/.test(inner)) tokens.push(parseInt(inner, 10));
      else tokens.push(inner.slice(1, -1)); // quoted string key
    } else {
      tokens.push(tok);
    }
    rest = rest.slice(m[0].length);
  }
  return tokens;
}

function query(data, path) {
  const tokens = parsePath(path);
  let cur = data;
  for (const t of tokens) {
    if (cur === null || cur === undefined)
      throw new Error(`cannot descend into null/undefined at token '${t}'`);
    if (typeof t === 'number') {
      if (!Array.isArray(cur)) throw new Error(`index ${t} on non-array`);
      cur = cur[t];
    } else {
      if (typeof cur !== 'object') throw new Error(`key '${t}' on non-object`);
      cur = cur[t];
    }
  }
  return cur === undefined ? null : cur;
}

function readBody(req) {
  return new Promise(r => { let d = ''; req.on('data', c => { if (d.length < 1e6) d += c; }); req.on('end', () => r(d)); req.on('error', () => r('')); });
}

async function routeJsonpath(u, res, json, body, method) {
  if (method === 'POST' && body) {
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (e) { return json(res, 400, { error: 'invalid JSON body: ' + e.message }); }
    const doc = parsed.json !== undefined ? parsed.json : parsed;
    const path = parsed.path || '';
    try { return json(res, 200, { path, result: query(doc, path) }); }
    catch (e) { return json(res, 400, { error: e.message }); }
  }
  const q = u.searchParams;
  const raw = q.get('json');
  const path = q.get('path') || '';
  if (raw === null) return json(res, 400, { error: 'provide json= and path=' });
  let doc;
  try { doc = JSON.parse(raw); }
  catch (e) { return json(res, 400, { error: 'invalid json param: ' + e.message }); }
  try {
    return json(res, 200, { path, result: query(doc, path) });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeJsonpath, parsePath, query };
