// /useragent — User-Agent string parsing: browser, engine, OS, device type, bot detection
function routeUseragent(u, res, json) {
  const q = u.searchParams;
  const ua = q.get('ua') || q.get('check') || '';

  if (!ua) {
    return json(res, 400, {
      error: 'provide ?ua=<user-agent string>',
      example: '/useragent?ua=' + encodeURIComponent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    });
  }

  const out = { input_length: ua.length };

  // --- Bot detection ---
  const botRe = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|curl|wget|python-requests|httpclient|okhttp|axios|node-fetch|go-http-client|java\/|apache-httpclient|postmanruntime|headlesschrome)/i;
  out.is_bot = botRe.test(ua);
  if (/headlesschrome/i.test(ua)) out.bot_name = 'Headless Chrome';

  // --- Browser ---
  let browser = null, version = null;
  const m = ua.match(/(Edg|OPR|Opera|Chrome|Safari|Firefox|FxiOS|CriOS|SamsungBrowser|YaBrowser|Vivaldi|DuckDuckGo)\/([\d.]+)/);
  if (m) {
    const name = m[1];
    const map = { Edg: 'Edge', OPR: 'Opera', CriOS: 'Chrome iOS', FxiOS: 'Firefox iOS', YaBrowser: 'Yandex', SamsungBrowser: 'Samsung Internet' };
    browser = map[name] || name;
    version = m[2];
  } else if (/MSIE (\d[\d.]*)/.test(ua)) {
    browser = 'Internet Explorer'; version = ua.match(/MSIE (\d[\d.]*)/)[1];
  } else if (/Trident\/.*rv:(\d[\d.]*)/.test(ua)) {
    browser = 'Internet Explorer'; version = ua.match(/rv:(\d[\d.]*)/)[1];
  }
  // Safari version lives in Version/ not Safari/
  if (browser === 'Safari') {
    const vm = ua.match(/Version\/([\d.]+)/);
    version = vm ? vm[1] : version;
  }
  out.browser = browser || 'Unknown';
  out.browser_version = version;

  // --- Engine ---
  let engine = null;
  if (/Gecko\/|rv:/.test(ua) && !/like Gecko/.test(ua)) engine = 'Gecko';
  if (/like Gecko/.test(ua) && /AppleWebKit/.test(ua)) engine = /Chrome|Edg|OPR/.test(ua) ? 'Blink' : 'WebKit';
  else if (/AppleWebKit/.test(ua) && !/Chrome|Edg|OPR/.test(ua)) engine = 'WebKit';
  else if (/Firefox/.test(ua)) engine = 'Gecko';
  else if (/Trident/.test(ua)) engine = 'Trident';
  out.engine = engine || 'Unknown';

  // --- OS ---
  let os = 'Unknown';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
  else if (/(iPhone|iPad|iPod)/.test(ua)) os = 'iOS ' + (ua.match(/OS (\d+_\d+)/) ? ua.match(/OS (\d+_\d+)/)[1].replace(/_/g, '.') : '');
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  out.os = os;

  // --- Device type ---
  let device = 'desktop';
  if (/iPad|Tablet/.test(ua)) device = 'tablet';
  else if (/Mobi|iPhone|Android.*Mobile/.test(ua)) device = 'mobile';
  else if (/TV|SmartTV|AppleTV/.test(ua)) device = 'tv';
  out.device = device;

  return json(res, 200, out);
}

module.exports = { routeUseragent };
