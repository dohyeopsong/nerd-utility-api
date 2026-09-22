// /csv — CSV ↔ JSON conversion with proper RFC 4180 quoting
function parseCSV(text, delim, header) {
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === delim) { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function csvToJson(text, delim, header) {
  const rows = parseCSV(text, delim);
  if (!rows.length) return [];
  if (header === '0') return rows.map(r => r.map(v => coerce(v)));
  const cols = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    cols.forEach((c, j) => { o[c] = coerce(r[j]); });
    return o;
  });
}

function coerce(v) {
  if (v === undefined || v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
}

function jsonToCsv(data, delim) {
  if (!Array.isArray(data)) throw new Error('json input must be an array of objects');
  const cols = [];
  data.forEach(o => Object.keys(o).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
  const esc = v => {
    if (v === null || v === undefined) v = '';
    const s = String(v);
    return /["\n\r]|,|\t/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(esc).join(delim)];
  data.forEach(o => lines.push(cols.map(c => esc(o[c])).join(delim)));
  return lines.join('\n');
}

function routeCsv(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const mode = (q.mode || 'parse').toLowerCase();
  let delim = q.delim === 'tab' ? '\t' : (q.delim === 'semicolon' ? ';' : (q.delim === 'pipe' ? '|' : ','));
  if (mode === 'parse') {
    const text = q.csv || q.data || q.text || '';
    if (!text) throw new Error('provide ?csv=<csv text> (URL-encoded)');
    const out = csvToJson(text, delim, q.header || '1');
    return json(res, 200, { rows: out.length, header: q.header !== '0', data: out });
  }
  if (mode === 'stringify') {
    if (!q.json) throw new Error('provide ?json=<url-encoded JSON array>');
    let arr;
    try { arr = JSON.parse(q.json); } catch (e) { throw new Error('invalid JSON: ' + e.message); }
    const csv = jsonToCsv(arr, delim);
    if (q.raw === '1') { res.writeHead(200, { 'Content-Type': 'text/csv' }); return res.end(csv); }
    return json(res, 200, { csv });
  }
  throw new Error('mode must be parse or stringify');
}

module.exports = { routeCsv };
