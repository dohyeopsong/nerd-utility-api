// HTML entity encode/decode
const NAMED = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos', '\u00a0': 'nbsp' };
const REVERSE = Object.fromEntries(Object.entries(NAMED).map(([c, n]) => [n, c]));
function routeHtml(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.t || '';
  const mode = (q.mode || q.m || 'encode').toLowerCase();
  if (!text) return json(res, 400, { error: 'provide ?text=<string>&mode=encode|decode' });
  try {
    if (mode === 'encode' || mode === 'e') {
      const escaped = text.replace(/[&<>"'\u00a0]/g, c => `&${NAMED[c]};`);
      return json(res, 200, { input: text, mode: 'encode', result: escaped });
    }
    if (mode === 'decode' || mode === 'd') {
      const decoded = text
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
        .replace(/&([a-z]+);/gi, (m, n) => REVERSE[n.toLowerCase()] ?? m);
      return json(res, 200, { input: text, mode: 'decode', result: decoded });
    }
    return json(res, 400, { error: `unknown mode '${mode}'`, available: ['encode', 'decode'] });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeHtml };
