// routes/regex.js — regex test endpoint
// GET/POST /regex?pattern=<re>&flags=<gi>&text=<text>
// Returns matches with groups, indices, named groups; explain errors cleanly.

function routeRegex(u, res, json, reqBody) {
  const q = u.searchParams;
  let pattern = q.get('pattern'), flags = q.get('flags') || '', text = q.get('text');
  if (reqBody) { // POST JSON body support
    try { const b = JSON.parse(reqBody); pattern = pattern ?? b.pattern; flags = flags ?? b.flags ?? ''; text = text ?? b.text; } catch (e) {}
  }
  if (!pattern) return json(res, 400, { error: 'pattern required, e.g. ?pattern=\\d+&text=abc123' });
  flags = String(flags).replace(/[^dgimsuy]/g, '');
  if (/g/.test(flags) && /y/.test(flags)) flags = flags.replace('g', ''); // sticky + global invalid
  let re;
  try { re = new RegExp(pattern, flags); } catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }
  if (text == null || text === '') return json(res, 200, { pattern, flags, valid: true, matches: [], note: 'no text provided — pattern validated only' });
  const global = re.global || re.sticky;
  const matches = [];
  let m, count = 0;
  if (global) {
    while ((m = re.exec(text)) !== null) {
      matches.push({ match: m[0], index: m.index, end: m.index + m[0].length, groups: m.slice(1), namedGroups: m.groups || undefined });
      if (m[0] === '') re.lastIndex++; // avoid infinite loop on zero-length matches
      if (++count >= 1000) break;
    }
  } else {
    m = re.exec(text);
    if (m) matches.push({ match: m[0], index: m.index, end: m.index + m[0].length, groups: m.slice(1), namedGroups: m.groups || undefined });
  }
  return json(res, 200, {
    pattern, flags, valid: true,
    count: matches.length,
    matches,
    // convenience: replace/extract helpers
    extract: matches.map(x => x.match)
  });
}
module.exports = { routeRegex };
