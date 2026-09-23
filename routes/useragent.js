// /useragent — parse a User-Agent string: browser, engine, OS, device type, bot detection
function parseUA(ua) {
  const out = { browser: null, engine: null, os: null, device: 'desktop', bot: false };
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|monitor|lighthouse|headless/i.test(ua)) out.bot = true;
  const b = [
    [/Edg\/([\d.]+)/, 'Edge'], [/OPR\/([\d.]+)/, 'Opera'], [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
    [/Firefox\/([\d.]+)/, 'Firefox'], [/CriOS\/([\d.]+)/, 'Chrome iOS'],
    [/FxiOS\/([\d.]+)/, 'Firefox iOS'], [/Chrome\/([\d.]+)/, 'Chrome'], [/Version\/([\d.]+).*Safari/, 'Safari'],
  ];
  for (const [re, name] of b) {
    const m = ua.match(re);
    if (m) { out.browser = { name, version: m[1] }; break; }
  }
  out.engine = /Gecko\/|Firefox/.test(ua) && !/like Gecko/.test(ua) ? 'Gecko'
    : /AppleWebKit/.test(ua) && /Chrome|Chromium|Edg|OPR/.test(ua) ? 'Blink'
    : /AppleWebKit/.test(ua) ? 'WebKit' : /Trident/.test(ua) ? 'Trident' : null;
  const os = [
    [/Windows NT ([\d.]+)/, m => `Windows ${({10:'10/11',6.3:'8.1',6.2:'8',6.1:'7'})[m[1]] || m[1]}`],
    [/iPhone OS ([\d_]+)/, m => `iOS ${m[1].replace(/_/g,'.')}`],
    [/CPU OS ([\d_]+)/, m => `iPadOS ${m[1].replace(/_/g,'.')}`],
    [/Android ([\d.]+)/, m => `Android ${m[1]}`],
    [/Mac OS X ([\d_.]+)/, m => `macOS ${m[1].replace(/_/g,'.')}`],
    [/CrOS/, () => 'ChromeOS'], [/Linux/, () => 'Linux'],
  ];
  for (const [re, fn] of os) { const m = ua.match(re); if (m) { out.os = fn(m); break; } }
  if (/iPhone|iPod/.test(ua)) out.device = 'mobile';
  else if (/Android.*Mobile/.test(ua)) out.device = 'mobile';
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) out.device = 'tablet';
  return out;
}

function routeUseragent(u, res, json, body, isPost) {
  const q = u.searchParams.get('ua') || u.searchParams.get('q');
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'useragent',
      description: 'Parse a User-Agent string: browser, engine, OS, device type, bot detection.',
      usage: '/useragent?ua=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?ua=' });
  const parsed = parseUA(String(q));
  return json(res, 200, { userAgent: q, ...parsed });
}

module.exports = { routeUseragent, parseUA };
