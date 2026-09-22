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
  return cur;
}

function handle(body, res, json) {
  let doc, path;
  try {
    if (typeof body === 'string' && body.trim()) {
      const parsed = JSON.parse(body);
      doc = parsed.json !== undefined ? parsed.json : parsed;
      path = parsed.path;
    }
  } catch (e) { return json(res, 400, { error: 'invalid JSON body: ' + e.message }); }
  if (!doc) return json(res, 400, { error: 'provide {"json": <value>, "path": "a.b[0]"}' });
  try {
    const result = query(doc, path || '');
    return json(res, 200, { path: path || '', result });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}

function routeJsonpath(u, res, json, body, req) {
  if (req.method === 'POST') return handle(body, res, json);
  const q = u.searchParams;
  const raw = q.get('json');
  const path = q.get('path') || '';
  if (raw === null) return json(res, 400, { error: 'provide json= and path=' });
  let doc;
  try { doc = JSON.parse(raw); }
  catch (e) { return json(res, 400, { error: 'invalid json param: ' + e.message }); }
  try {
    const result = query(doc, path);
    return json(res, 200, { path, result });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeJsonpath, parsePath, query };
