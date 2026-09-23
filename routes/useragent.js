// /useragent — parse a User-Agent string: browser, engine, OS, device, bot detection
function routeUseragent(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const ua = q.ua || q.useragent || q.u;
  if (!ua) throw new Error('missing ?ua=<User-Agent string>');
  const out = { userAgent: ua };
  // browser (order matters — check specific first)
  const browsers = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/], ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/], ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/],
    ['MSIE', /MSIE ([\d.]+)/], ['IE', /Trident\/.*rv:([\d.]+)/],
  ];
  for (const [name, re] of browsers) {
    const m = ua.match(re);
    if (m) { out.browser = name; out.browserVersion = m[1]; break; }
  }
  // engine
  if (/Gecko\/|rv:/.test(ua) && !/like Gecko/.test(ua)) out.engine = 'Gecko';
  else if (/AppleWebKit/.test(ua)) out.engine = /Chrome|Edg|OPR/.test(ua) ? 'Blink' : 'WebKit';
  else if (/Trident/.test(ua)) out.engine = 'Trident';
  // OS
  const oses = [
    ['Windows', /Windows NT ([\d.]+)/, v => ({ '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }[v] || v)],
    ['macOS', /Mac OS X ([\d_]+)/, v => v.replace(/_/g, '.')],
    ['Android', /Android ([\d.]+)/], ['iOS', /(?:iPhone|iPad).*OS ([\d_]+)/, v => v.replace(/_/g, '.')],
    ['Linux', /(?:X11; )?Linux/], ['CrOS', /CrOS/],
  ];
  for (const [name, re, xf] of oses) {
    const m = ua.match(re);
    if (m) { out.os = name; if (m[1]) out.osVersion = xf ? xf(m[1]) : m[1]; break; }
  }
  // device
  if (/iPad/.test(ua)) out.device = { type: 'tablet', model: 'iPad' };
  else if (/iPhone/.test(ua)) out.device = { type: 'mobile', model: 'iPhone' };
  else if (/Android.*Mobile/.test(ua)) out.device = { type: 'mobile', model: 'Android phone' };
  else if (/Android/.test(ua)) out.device = { type: 'tablet', model: 'Android tablet' };
  else if (/Mobi|Windows Phone/.test(ua)) out.device = { type: 'mobile' };
  else out.device = { type: 'desktop' };
  // bot detection
  const botRe = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|lighthouse|headless|curl|wget|python-requests|axios|node-fetch|postman|insomnia|httpclient|okhttp|java\/|go-http)/i;
  out.isBot = botRe.test(ua) || /HeadlessChrome/.test(ua);
  if (out.isBot) {
    const bm = ua.match(/([a-z-]+bot|crawler|spider|curl|wget|python-requests|HeadlessChrome|lighthouse)/i);
    out.botName = bm ? bm[1] : 'unknown';
  }
  return json(res, 200, out);
}
module.exports = { routeUseragent };
