// Regex tester: /regex?pattern=\\d+&text=abc123def&flags=g — test a pattern, return matches/groups
async function routeRegex(u, res, json, body, method) {
  try {
    let pattern = u.searchParams.get('pattern'), text = u.searchParams.get('text'),
        flags = u.searchParams.get('flags') || 'g';
    if (method === 'POST') {
      try { const b = JSON.parse(body || '{}');
        if (typeof b.pattern === 'string') pattern = b.pattern;
        if (typeof b.text === 'string') text = b.text;
        if (typeof b.flags === 'string') flags = b.flags;
      } catch {}
    }
    if (!pattern) return json(res, 400, { error: 'provide ?pattern=<regex>&text=<subject>[&flags=]' });
    if (text === null || text === undefined) return json(res, 400, { error: 'provide ?text=<subject>' });
    // sanitize flags: drop y and invalid chars
    const cleanFlags = (flags.match(/[gimsu]/g) || []).join('');
    let re;
    try { re = new RegExp(pattern, cleanFlags); }
    catch (e) { return json(res, 400, { error: 'invalid pattern: ' + e.message }); }
    const matches = [];
    let m, guard = 0;
    if (cleanFlags.includes('g')) {
      while ((m = re.exec(text)) !== null && guard++ < 1000) {
        matches.push({ match: m[0], index: m.index, groups: m.length > 1 ? m.slice(1) : undefined });
        if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length infinite loop
      }
    } else {
      m = re.exec(text);
      if (m) matches.push({ match: m[0], index: m.index, groups: m.length > 1 ? m.slice(1) : undefined });
    }
    return json(res, 200, {
      pattern, flags: cleanFlags,
      matched: matches.length > 0,
      matchCount: matches.length,
      matches: matches.length ? matches : undefined,
      namedGroups: matches[0] && matches[0].groups ? matches[0].groups : undefined
    });
  } catch (e) { return json(res, 500, { error: 'regex failure: ' + e.message }); }
}
module.exports = { routeRegex };
