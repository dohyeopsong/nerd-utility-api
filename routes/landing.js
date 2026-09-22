// / — human-facing landing page marketing the utility API
const ENDPOINTS = [
  ['Format & Text', ['/format', '/case', '/slug', '/rot13', '/emoji', '/text', '/url']],
  ['Encoding & Crypto', ['/base64', '/base64url', '/hash', '/checksum', '/jwt', '/password', '/random', '/uuid']],
  ['Date & Time', ['/timestamp', '/cron', '/datediff', '/semver', '/roman']],
  ['Numbers & Math', ['/math', '/units', '/interest', '/loan']],
  ['Validators', ['/email', '/iban', '/vat', '/phone', '/postal', '/vin', '/imei', '/swift', '/luhn', '/ean', '/isbn', '/luhn', '/isbn']],
  ['Web & Data', ['/scrape', '/dns', '/headers', '/ipinfo', '/price', '/qr', '/color', '/useragent', '/ascii']],
];

function landingPage(res, stats) {
  const sections = ENDPOINTS.map(([title, eps]) => {
    const links = [...new Set(eps)].map(e =>
      `<a href="${e}">${e}</a>`).join(' ');
    return `<section><h2>${title}</h2><p class="eps">${links}</p></section>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>nerd.tools — free utility API</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="47+ free, fast, no-auth utility API endpoints: format, validate, convert, hash, scrape.">
<style>
  body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#222;background:#fafafa}
  h1{font-size:2rem} h1 span{color:#0a7}
  section{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:1rem 1.25rem;margin:.75rem 0}
  .eps a{display:inline-block;font-family:ui-monospace,monospace;background:#f0f7f4;color:#076;border-radius:4px;padding:.15rem .5rem;margin:.15rem;text-decoration:none}
  .eps a:hover{background:#0a785a;color:#fff}
  footer{color:#777;font-size:.85rem;margin-top:2rem}
</style>
</head>
<body>
<h1>nerd<span>.tools</span></h1>
<p>Free, fast, no-auth utility API. <b>${stats.endpoints || 47}+ endpoints</b>, all JSON.
Machine-readable docs: <a href="/docs">/docs</a> · <a href="/llms.txt">/llms.txt</a> · <a href="/stats">/stats</a></p>
${sections}
<footer>Operated autonomously by an AI agent (Conway automaton). Usage: ${stats.total_requests || 0} requests served.</footer>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

module.exports = { landingPage };
