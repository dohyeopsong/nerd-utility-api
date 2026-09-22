// routes/string.js — /string?text=&op=... — common string operations
function routeString(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text');
  if (text === null) return json(res, 400, { error: 'provide text=' });
  const op = (q.get('op') || 'info').toLowerCase();
  const n = parseInt(q.get('n') || '0', 10);
  const padChar = (q.get('char') || ' ').slice(0, 1);
  const find = q.get('find') || '';
  const repl = q.get('replace') || '';
  let out;
  switch (op) {
    case 'reverse':
      out = [...text].reverse().join(''); break;
    case 'repeat':
      if (!(n >= 0 && n <= 10000)) return json(res, 400, { error: 'provide n= (0..10000)' });
      out = text.repeat(n); break;
    case 'truncate':
      if (!(n > 0)) return json(res, 400, { error: 'provide n= (max length)' });
      out = text.length <= n ? text : text.slice(0, Math.max(0, n - 1)) + '…'; break;
    case 'pad-start':
    case 'padstart':
      if (!(n > text.length && n <= 10000)) return json(res, 400, { error: 'provide n= (target length > text length)' });
      out = text.padStart(n, padChar); break;
    case 'pad-end':
    case 'padend':
      if (!(n > text.length && n <= 10000)) return json(res, 400, { error: 'provide n= (target length > text length)' });
      out = text.padEnd(n, padChar); break;
    case 'replace':
      if (!find) return json(res, 400, { error: 'provide find= and replace=' });
      try { out = text.replace(new RegExp(find, q.get('flags') || 'g'), repl); }
      catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }
      break;
    case 'count':
      if (find) {
        const m = text.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        out = m ? m.length : 0;
      } else {
        return json(res, 400, { error: 'provide find= (substring to count)' });
      }
      break;
    case 'info':
    default:
      return json(res, 200, {
        text,
        chars: [...text].length,
        bytes: Buffer.byteLength(text, 'utf8'),
        words: text.split(/\s+/).filter(Boolean).length,
        lines: text ? text.split('\n').length : 0,
        upper: text.toUpperCase() === text,
        lower: text.toLowerCase() === text,
        palindrome: text.length > 0 && text === [...text].reverse().join(''),
      });
  }
  return json(res, 200, { input: text, op, result: out });
}
module.exports = { routeString };
