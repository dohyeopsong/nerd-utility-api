// /useragent — parse User-Agent strings: browser, engine, OS, device type, bot detection
function parseUA(ua) {
  const out = { input: ua, browser: null, engine: null, os: null, device: 'desktop', bot: false };
  if (!ua) return out;

  // bot detection
  const bots = /(bot|crawler|spider|slurp|curl|wget|python-requests|httpclient|facebookexternalhit|preview|monitor|fetcher|scrap|headless|phantom|puppeteer|playwright|lighthouse|bingpreview|discordbot|telegrambot|whatsapp|twitterbot|linkedinbot|googlebit|uptimerobot|node-fetch|axios|go-http-client|java\/|okhttp|apache-httpclient)/i;
  if (bots.test(ua) || /^$/.test(ua)) out.bot = true;

  // browser
  let m;
  if ((m = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/))) out.browser = { name: 'Edge', version: m[1] };
  else if ((m = ua.match(/OPR\/([\d.]+)/))) out.browser = { name: 'Opera', version: m[1] };
  else if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) out.browser = { name: 'Samsung Internet', version: m[1] };
  else if ((m = ua.match(/Firefox\/([\d.]+)/))) out.browser = { name: 'Firefox', version: m[1] };
  else if ((m = ua.match(/Chrome\/([\d.]+)/))) out.browser = { name: 'Chrome', version: m[1] };
  else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) out.browser = { name: 'Safari', version: m[1] };
  else if (/Safari/.test(ua)) out.browser = { name: 'Safari', version: null };
  else if ((m = ua.match(/MSIE ([\d.]+)/))) out.browser = { name: 'Internet Explorer', version: m[1] };

  // engine
  if (/Gecko\/|Firefox\//.test(ua) && !/like Gecko/.test(ua)) out.engine = 'Gecko';
  else if (/Trident/.test(ua)) out.engine = 'Trident';
  else if (/AppleWebKit/.test(ua)) out.engine = 'Blink (WebKit)';
  else if (/like Gecko/.test(ua)) out.engine = 'Gecko';

  // OS
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    const map = { '10.0':'10/11', '6.3':'8.1', '6.2':'8', '6.1':'7', '6.0':'Vista', '5.1':'XP' };
    out.os = { name: 'Windows', version: map[m[1]] || m[1] };
  } else if ((m = ua.match(/iPhone OS ([\d_]+)/))) out.os = { name: 'iOS', version: m[1].replace(/_/g, '.') };
  else if ((m = ua.match(/CPU OS ([\d_]+)/))) out.os = { name: 'iPadOS', version: m[1].replace(/_/g, '.') };
  else if (/Android/.test(ua)) {
    m = ua.match(/Android ([\d.]+)/);
    out.os = { name: 'Android', version: m ? m[1] : null };
  } else if ((m = ua.match(/Mac OS X ([\d_.]+)/))) out.os = { name: 'macOS', version: m[1].replace(/_/g, '.') };
  else if (/CrOS/.test(ua)) out.os = { name: 'ChromeOS', version: null };
  else if (/Linux/.test(ua)) out.os = { name: 'Linux', version: null };

  // device
  if (/iPhone/.test(ua)) out.device = 'smartphone';
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) out.device = 'tablet';
  else if (/Mobi|Windows Phone/.test(ua)) out.device = 'smartphone';
  else if (/TV|AppleTV|GoogleTV|SmartTV|Android TV/.test(ua)) out.device = 'tv';
  else if (/Watch/.test(ua)) out.device = 'watch';

  return out;
}

function routeUseragent(u, res, json) {
  const ua = u.searchParams.get('ua');
  if (ua === null) return json(res, 400, { error: 'missing ?ua=<user-agent string>' });
  return json(res, 200, parseUA(ua));
}

module.exports = { routeUseragent, parseUA };
