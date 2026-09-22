// routes/csv2json.js — CSV <-> JSON converter
// GET /csv2json?csv=a,b,c%0A1,2,3&delimiter=,&header=true
// Also JSON->CSV via ?json=[{...}]
function parseCSV(text, delim, hasHeader) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const clean = rows.filter(r => !(r.length === 1 && r[0] === ''));
  const header = hasHeader ? clean.shift() : null;
  const records = clean.map(r => {
    if (!header) return r;
    const o = {}; header.forEach((h, i) => o[h] = tryNum(r[i])); return o;
  });
  return { header, records };
}
function tryNum(v) {
  if (v === undefined || v === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
  if (v === 'true' || v === 'false') return v === 'true';
  return v;
}
function toCSV(records, delim) {
  const esc = v => { const s = v === null || v === undefined ? '' : String(v);
    return (s.includes(delim) || s.includes('"') || /[\n\r]/.test(s)) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const keys = [...new Set(records.flatMap(r => Object.keys(r)))];
  return [keys.map(esc).join(delim), ...records.map(r => keys.map(k => esc(r[k])).join(delim))].join('\n');
}
function routeCsv2json(u, res, json) {
  const q = u.searchParams;
  try {
    const csv = q.get('csv'), js = q.get('json');
    const delim = q.get('delimiter') || ',';
    if (delim.length !== 1) throw new Error('delimiter must be a single character');
    if (csv) {
      const { header, records } = parseCSV(csv, delim, q.get('header') !== 'false');
      return json(res, 200, { header, count: records.length, records });
    }
    if (js) {
      const data = JSON.parse(js);
      if (!Array.isArray(data) || !data.every(x => x && typeof x === 'object' && !Array.isArray(x)))
        throw new Error('json must be an array of objects');
      return json(res, 200, { count: data.length, csv: toCSV(data, delim) });
    }
    return json(res, 400, { error: 'provide csv= (URL-encoded CSV) or json= (array of objects)' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeCsv2json };
