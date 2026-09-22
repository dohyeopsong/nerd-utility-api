// routes/yamljson.js — YAML <-> JSON converter
// GET /yamljson?yaml=...  -> parse YAML to JSON
// GET /yamljson?json=...  -> JSON to YAML
// Minimal YAML subset parser: nested maps, lists, scalars, inline flow [..] {..}, quoted strings.
function parseScalar(s) {
  s = s.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitTop(inner).map(parseScalar);
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return {};
    const o = {};
    for (const part of splitTop(inner)) {
      const i = indexOfTop(part, ':');
      o[parseScalar(part.slice(0, i))] = parseScalar(part.slice(i + 1));
    }
    return o;
  }
  return s;
}
function splitTop(s) { // split on top-level commas
  const out = []; let d = 0, q = null, cur = '';
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if ('[{('.includes(c)) d++;
    if (']})'.includes(c)) d--;
    if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function indexOfTop(s, ch) {
  let d = 0, q = null;
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if ('[{('.includes(c)) d++;
    if (']})'.includes(c)) d--;
    if (c === ch && d === 0) return i; }
  return -1;
}
function parseYAML(text) {
  const lines = text.replace(/\t/g, '  ').split('\n')
    .filter(l => !/^\s*(#|$)/.test(l)); // drop blanks & comments
  let i = 0;
  function parseBlock(indent) {
    // list or map based on first line
    if (i >= lines.length) return null;
    const line = lines[i];
    const curIndent = line.length - line.trimStart().length;
    if (curIndent < indent) return null;
    if (/^\s*-\s/.test(line) || line.trim() === '-') {
      const list = [];
      while (i < lines.length) {
        const l = lines[i];
        const ci = l.length - l.trimStart().length;
        if (ci !== curIndent || !/^\s*-\s?/.test(l)) break;
        const rest = l.replace(/^\s*-\s?/, '');
        i++;
        if (rest === '') { list.push(parseBlock(curIndent + 1)); }
        else if (/^[^:\s]+:(\s|$)/.test(rest) || /^-\s/.test(rest)) {
          // nested map/list starting inline: rewind as child block
          i--;
          const saved = lines[i]; lines[i] = ' '.repeat(curIndent + 2) + saved.replace(/^\s*-\s?/, '');
          const v = parseBlock(curIndent + 2);
          lines[i] = saved;
          i++; // skip consumed
          list.push(v);
        } else list.push(parseScalar(rest));
      }
      return list;
    }
    // map
    const map = {};
    while (i < lines.length) {
      const l = lines[i];
      const ci = l.length - l.trimStart().length;
      if (ci < indent) break;
      if (ci > indent) throw new Error('bad indentation near: ' + l.trim());
      const t = l.trim();
      const ci2 = indexOfTop(t, ':');
      if (ci2 === -1) throw new Error('expected key: value near: ' + t);
      const key = parseScalar(t.slice(0, ci2));
      const rest = t.slice(ci2 + 1).trim();
      i++;
      if (rest === '') {
        const v = parseBlock(indent + 1);
        map[key] = v === null ? null : v;
      } else map[key] = parseScalar(rest);
    }
    return map;
  }
  const v = parseBlock(0);
  return v;
}
function toYAML(v, indent = 0) {
  const pad = ' '.repeat(indent);
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return v.map(x => {
      const s = toYAML(x, indent + 2);
      return pad + '- ' + (typeof x === 'object' && x !== null ? s.trimStart().replace(/^/, '') : s);
    }).join('\n');
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (!keys.length) return '{}';
    return keys.map(k => {
      let key = /^[A-Za-z0-9_]+$/.test(k) ? k : JSON.stringify(k);
      if (v[k] !== null && typeof v[k] === 'object') return pad + key + ':\n' + toYAML(v[k], indent + 2);
      return pad + key + ': ' + scalarToYAML(v[k]);
    }).join('\n');
  }
  return scalarToYAML(v);
}
function scalarToYAML(s) {
  if (s === null) return 'null';
  if (typeof s === 'string') {
    if (/^[-?:,\[\]{}#&*!|>'"%@`]|^\s|\s$|^$|^true$|^false$|^null$|^~$/.test(s) || /^-?\d/.test(s)) return JSON.stringify(s);
    return s;
  }
  return String(s);
}
function routeYamljson(u, res, json) {
  const q = u.searchParams;
  try {
    const y = q.get('yaml'), js = q.get('json');
    if (y) return json(res, 200, { json: parseYAML(y) });
    if (js) {
      const data = JSON.parse(js);
      return json(res, 200, { yaml: toYAML(data) });
    }
    return json(res, 400, { error: 'provide yaml= or json=' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeYamljson };
