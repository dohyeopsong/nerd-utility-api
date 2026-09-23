// /useragent — parse user-agent strings: browser, engine, OS, device type, bot detection
const BROWSERS = [
  { re: /Edg(?:e|A|iOS)?\/([\d.]+)/, name: 'Edge', group: 'edge' },
  { re: /OPR\/([\d.]+)/, name: 'Opera', group: 'opera' },
  { re: /YaBrowser\/([\d.]+)/, name: 'Yandex Browser', group: 'opera' },
  { re: /SamsungBrowser\/([\d.]+)/, name: 'Samsung Internet', group: 'webkit' },
  { re: /Chrome\/([\d.]+)/, name: 'Chrome', group: 'blink' },
  { re: /CriOS\/([\d.]+)/, name: 'Chrome iOS', group: 'webkit' },
  { re: /FxiOS\/([\d.]+)/, name: 'Firefox iOS', group: 'webkit' },
  { re: /Firefox\/([\d.]+)/, name: 'Firefox', group: 'gecko' },
  { re: /Version\/([\d.]+).*Safari/, name: 'Safari', group: 'webkit' },
  { re: /MSIE ([\d.]+)/, name: 'Internet Explorer', group: 'trident' },
  { re: /Trident\/([\d.]+)/, name: 'Internet Explorer', group: 'trident' }
];

const BOTS = [
  { re: /Googlebot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou/i, name: 'search engine crawler' },
  { re: /facebookexternalhit|Twitterbot|LinkedInBot|Pinterest/i, name: 'social media crawler' },
  { re: /GPTBot|ClaudeBot|anthropic-ai|ChatGPT-User|PerplexityBot|Google-Extended|CCBot/i, name: 'AI crawler' },
  { re: /curl|Wget|python-requests|axios|node-fetch|Go-http-client|PostmanRuntime|insomnia/i, name: 'HTTP library / tool' },
  { re: /bot|crawler|spider|scrape/i, name: 'generic bot' }
];

function parseUA(ua) {
  if (!ua) return { error: 'missing user-agent string' };
  const out = { userAgent: ua };

  // bot check first
  for (const b of BOTS) {
    if (b.re.test(ua)) { out.isBot = true; out.botType = b.name; break; }
  }
  if (!out.isBot) out.isBot = false;

  // browser
  let browser = null;
  for (const b of BROWSERS) {
    const m = ua.match(b.re);
    if (m) { browser = { name: b.name, version: m[1], engine: b.group === 'blink' ? 'Blink' : b.group === 'gecko' ? 'Gecko' : b.group === 'webkit' ? 'WebKit' : b.group === 'trident' ? 'Trident' : 'Blink' }; break; }
  }
  out.browser = browser || { name: 'unknown', version: null, engine: null };

  // OS
  let os = 'unknown';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Windows Phone/.test(ua)) os = 'Windows Phone';
  else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
  else if (/(?:iPhone|iPad|iPod)/.test(ua)) {
    const v = ua.match(/OS (\d+_\d+)/);
    os = 'iOS' + (v ? ' ' + v[1].replace('_', '.') : '');
  } else if (/Mac OS X ([\d_.]+)/.test(ua)) os = 'macOS ' + ua.match(/Mac OS X ([\d_.]+)/)[1].replace(/_/g, '.');
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  out.os = os;

  // device type
  let device = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) device = 'tablet';
  else if (/Mobi|iPhone|iPod|Windows Phone|IEMobile/.test(ua)) device = 'mobile';
  else if (/TV|SmartTV|AppleTV|GoogleTV|HbbTV|NetCast|Roku/.test(ua)) device = 'tv';
  out.device = device;

  return out;
}

function routeUseragent(u, res, json) {
  const p = u.searchParams;
  let ua = p.get('ua') || p.get('user_agent') || p.get('agent');
  if (!ua) {
    // fall back to the request's own UA header? not available here; try common
    const headers = p.get('raw');
    if (headers) {
      const m = decodeURIComponent(headers).match(/User-Agent:\s*([^\n\r]+)/i);
      if (m) ua = m[1];
    }
  }
  if (!ua) return json(res, 400, { error: 'provide ?ua=<user-agent string>' });
  return json(res, 200, parseUA(ua));
}

module.exports = { routeUseragent, parseUA };
