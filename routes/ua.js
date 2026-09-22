// User-Agent parser: /ua?ua=<string> — browser, engine, os, device, bot detection
const BROWSERS = [
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /(?:OPR|Opera)[\s/]([\d.]+)/],
  ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari/],
  ['IE', /MSIE ([\d.]+)|Trident\/.*rv:([\d.]+)/],
];
const ENGINES = [
  ['Gecko', /Gecko\/([\d.]+)/], ['WebKit', /AppleWebKit\/([\d.]+)/],
  ['Blink', /Chrome\/([\d.]+)/], ['Trident', /Trident\/([\d.]+)/],
];
const OS = [
  ['Windows', /Windows NT ([\d.]+)/, { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }],
  ['macOS', /Mac OS X ([\d_.]+)/],
  ['Android', /Android ([\d.]+)/],
  ['iOS', /(?:iPhone|iPad).*OS ([\d_]+)/],
  ['ChromeOS', /CrOS/], ['Linux', /Linux/],
];
function parseUA(ua) {
  const r = { raw: ua, browser: null, engine: null, os: null, device: 'desktop', bot: false };
  const botRe = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|curl|wget|python-requests|node-fetch|monitor|lighthouse|headlesschrome)/i;
  r.bot = botRe.test(ua);
  for (const [name, re] of BROWSERS) {
    const m = ua.match(re);
    if (m) { r.browser = { name, version: (m[1] || m[2] || '').replace(/_/g, '.') }; break; }
  }
  for (const [name, re] of ENGINES) { const m = ua.match(re); if (m) { r.engine = { name, version: m[1] }; break; } }
  for (const [name, re, map] of OS) {
    const m = ua.match(re);
    if (m) { let v = m[1] ? m[1].replace(/_/g, '.') : null; if (map && v && map[v]) v = map[v]; r.os = { name, version: v }; break; }
  }
  if (/iPhone|Android.*Mobile/.test(ua)) r.device = 'mobile';
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) r.device = 'tablet';
  else if (/TV|SmartTV|AppleTV/.test(ua)) r.device = 'tv';
  return r;
}
async function routeUa(u, res, json, body, method) {
  let ua = u.searchParams.get('ua');
  if (method === 'POST') { try { const b = JSON.parse(body || '{}'); if (typeof b.ua === 'string') ua = b.ua; } catch {} }
  if (!ua && reqHeaders) ua = reqHeaders['user-agent'];
  if (!ua) return json(res, 400, { error: 'provide ?ua=<user-agent string> or POST {"ua": "..."}' });
  return json(res, 200, parseUA(ua));
}
let reqHeaders = null;
function setHeaders(h) { reqHeaders = h; }
module.exports = { routeUa, parseUA, setHeaders };
