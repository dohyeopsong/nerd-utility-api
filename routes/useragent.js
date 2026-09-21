// User-Agent string parser: browser, engine, OS, device, bot detection
const RE_BROWSERS = [
  ['Edg', 'Edge'], ['OPR', 'Opera'], ['Opera', 'Opera'], ['SamsungBrowser', 'Samsung Internet'],
  ['Firefox', 'Firefox'], ['Chrome', 'Chrome'], ['CriOS', 'Chrome'], ['FxiOS', 'Firefox'],
  ['Safari', 'Safari'], ['MSIE', 'Internet Explorer'], ['Trident', 'Internet Explorer'],
];
const RE_ENGINES = [
  ['Gecko/', 'Gecko'], ['AppleWebKit/', 'WebKit'], ['Trident/', 'Trident'], ['Presto/', 'Presto'],
];
const RE_OS = [
  [/Windows NT 10.0/, 'Windows 10/11'], [/Windows NT ([\d.]+)/, 'Windows'], [/iPhone OS ([\d_]+)/, 'iOS'],
  [/CPU OS ([\d_]+)/, 'iPadOS'], [/Android ([\d.]+)/, 'Android'], [/Mac OS X ([\d_.]+)/, 'macOS'],
  [/CrOS/, 'ChromeOS'], [/Linux/, 'Linux'],
];

function parse(ua) {
  if (!ua) return { error: 'missing ?ua= parameter' };
  const out = { userAgent: ua, bot: /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|lighthouse|curl|wget|python-requests|node/i.test(ua) };
  // Browser
  // Safari: real version is in Version/ token (not the trailing Safari/x token)
  const vTok = ua.match(/Version\/([\d.]+)/);
  const isChrome = /Chrome\//.test(ua) || /CriOS\//.test(ua);
  for (const [tok, name] of RE_BROWSERS) {
    const m = ua.match(new RegExp(tok + '/([\\d.]+)'));
    if (!m) continue;
    if (name === 'Safari' && !isChrome) {
      out.browser = { name: 'Safari', version: vTok ? vTok[1] : (m[1] || null) };
      break;
    }
    out.browser = { name, version: m[1] };
    break;
  }
  if (!out.browser) out.browser = { name: 'Unknown', version: null };
  // Engine
  for (const [tok, name] of RE_ENGINES) {
    const m = ua.match(new RegExp(tok + '([\\d.]+)?'));
    if (m) { out.engine = { name, version: m[1] || null }; break; }
  }
  // OS
  let osMatched = false;
  for (const [re, label] of RE_OS) {
    const m = ua.match(re);
    if (m) {
      out.os = { name: label.replace('%s', m[1] || ''), version: m[1] ? m[1].replace(/_/g, '.') : null };
      osMatched = true; break;
    }
  }
  if (!osMatched) out.os = { name: 'Unknown', version: null };
  // Device type
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) out.device = 'tablet';
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) out.device = 'mobile';
  else out.device = 'desktop';
  return out;
}

function routeUseragent(u, res, json) {
  const ua = u.searchParams.get('ua') || (u.headers && u.headers['user-agent']);
  return json(res, 200, parse(ua));
}
module.exports = { routeUseragent, parse };
