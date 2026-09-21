// Regex tester: /regex?pattern=...&text=...&flags=... (GET) or POST {pattern,text,flags}
// Returns matches with indices/groups, named groups, and replace preview via &replace=...
async function routeRegex(u, res, json, body, method) {
  let pattern, text, flags = '', replacement = null;
  if (method === 'POST') {
    try { const b = JSON.parse(body || '{}'); pattern = b.pattern; text = b.text; flags = b.flags || ''; replacement = b.replace ?? null; }
    catch { return json(res, 400, { error: 'invalid JSON body' }); }
  } else {
    pattern = u.searchParams.get('pattern');
    text = u.searchParams.get('text');
    flags = u.searchParams.get('flags') || '';
    replacement = u.searchParams.get('replace');
  }
  if (!pattern || text == null) return json(res, 400, { error: 'provide ?pattern=...&text=... (and optional &flags=, &replace=)' });
  let re;
  try {
    if (/[^gimsuyd]/.test(flags)) return json(res, 400, { error: 'invalid flags (allowed: g i m s u y d)' });
    re = new RegExp(pattern, flags);
  } catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }
  const global = /g/.test(re.flags) || replacement !== null;
  const matches = [];
  const gr = new RegExp(pattern, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m, count = 0;
  while ((m = gr.exec(text)) !== null) {
    matches.push({ match: m[0], index: m.index, end: m.index + m[0].length, groups: m.slice(1), namedGroups: m.groups || undefined });
    if (m[0] === '') gr.lastIndex++;
    if (++count >= 1000) break;
  }
  const out = { pattern, flags: gr.flags, matchCount: matches.length, matches };
  if (!/g/.test(re.flags)) out.matches = matches.slice(0, 1), out.matchCount = matches.length ? 1 : 0;
  if (replacement !== null) {
    try { out.replaced = text.replace(new RegExp(pattern, gr.flags.includes('g') ? gr.flags : gr.flags + 'g'), replacement); }
    catch (e) { out.replaceError = e.message; }
  }
  return json(res, 200, out);
}
module.exports = { routeRegex };
