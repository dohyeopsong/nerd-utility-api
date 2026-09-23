// /useragent — parse User-Agent strings: browser, engine, OS, device type, bot detection
function routeUseragent(u, res, json) {
  const p = u.searchParams;
  const ua = p.get('ua') || '';
  if (!ua) return json(res, 200, { usage: '?ua=<user-agent string> — parse browser, engine, OS, device type, bot detection' });
  const out = { input: ua };
  // bots
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|phantom|puppeteer|playwright|curl|wget|python-requests|axios|node-fetch|go-http-client|java\/|apache-httpclient|postman/i.test(ua)) {
    out.bot = true;
    const b = ua.match(/([a-z0-9_\-]+)(?:\/|\s+|$)/i);
    out.bot_name = (ua.match(/(?:^|[\s;(\[])([A-Za-z0-9_.-]*(?:bot|crawler|spider|slurp|preview|fetch|scraper|monitor|analyz)[A-Za-z0-9_.-]*)/i) || [])[1];
    if (/headless|phantom|puppeteer|playwright/i.test(ua)) out.headless = true;
    return json(res, 200, out);
  }
  out.bot = false;
  // browser
  let browser = 'unknown', version = null;
  const bt = [
    [/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
    [/MSIE ([\d.]+)/, 'IE'],
    [/Trident\/.*rv:([\d.]+)/, 'IE'],
  ];
  for (const [re, name] of bt) { const m = ua.match(re); if (m) { browser = name; version = m[1]; break; } }
  out.browser = browser; if (version) out.browser_version = version;
  // engine
  if (/Gecko\//.test(ua) && !/like Gecko/.test(ua)) out.engine = 'Gecko';
  else if (/like Gecko/.test(ua)) out.engine = 'Gecko-like';
  if (/AppleWebKit/.test(ua)) out.engine = /Blink|Chrome|Chromium|Edg/.test(ua) ? 'Blink' : 'WebKit';
  // OS
  if (/Windows NT ([\d.]+)/.test(ua)) { out.os = 'Windows'; out.os_version = ua.match(/Windows NT ([\d.]+)/)[1]; }
  else if (/iPhone/.test(ua)) { out.os = 'iOS'; out.device = 'iPhone'; }
  else if (/iPad/.test(ua)) { out.os = 'iOS'; out.device = 'iPad'; }
  else if (/Android ([\d.]+)/.test(ua)) { out.os = 'Android'; out.os_version = ua.match(/Android ([\d.]+)/)[1]; }
  else if (/Mac OS X ([\d_.]+)/.test(ua)) { out.os = 'macOS'; out.os_version = ua.match(/Mac OS X ([\d_.]+)/)[1].replace(/_/g, '.'); }
  else if (/CrOS/.test(ua)) out.os = 'ChromeOS';
  else if (/Linux/.test(ua)) out.os = 'Linux';
  // device type
  if (/Mobi/.test(ua)) out.device_type = 'mobile';
  else if (/iPad|Tablet/.test(ua)) out.device_type = 'tablet';
  else if (out.os) out.device_type = 'desktop';
  return json(res, 200, out);
}
module.exports = { routeUseragent };
