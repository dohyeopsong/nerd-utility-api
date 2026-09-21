// Landing page: human-friendly docs homepage with live examples and full route index
function routeLanding(u, res) {
  const endpoints = [
    ['hash', 'SHA-256/384/512, MD5 hashing', '?text=hello&algo=sha256'],
    ['base64', 'Base64 encode/decode', '?encode=aGVsbG8= or ?decode=hello'],
    ['uuid', 'UUID v4 generator', '?count=5'],
    ['ulid', 'Sortable ULID generator', '?count=3'],
    ['nanoid', 'URL-safe NanoID generator', '?length=21&count=5'],
    ['cuid', 'Collision-resistant CUID generator', '?count=3'],
    ['timestamp', 'Unix timestamp tools', '?iso=2024-01-01T00:00:00Z or ?unix=1704067200'],
    ['qrcode', 'QR code generator (PNG/SVG)', '?text=https://example.com&format=svg'],
    ['roman', 'Roman numeral converter', '?to=2024 or ?from=MCMLXXXVII'],
    ['iban', 'IBAN validator (mod-97)', '?iban=GB82WEST12345698765432'],
    ['luhn', 'Luhn checksum + card type', '?number=4532015112830366'],
    ['vin', 'VIN validator + decode', '?vin=1M8GDM9AXKP042788'],
    ['imei', 'IMEI validator (Luhn, TAC)', '?imei=490154203237518'],
    ['ean', 'EAN/UPC barcode validator', '?ean=4006381333931 or ?upce=01234565'],
    ['isbn', 'ISBN-10/13 validator', '?isbn=9780306406157'],
    ['semver', 'Semver compare/sort/ranges', '?a=1.0.0&b=2.0.0 or ?v=1.4.7&range=^1.2.3'],
    ['cron', 'Cron expression explainer', '?expr=0 9 * * mon-fri'],
    ['pwstrength', 'Password strength estimator', '?password=Tr0ub4dor%263'],
    ['password', 'Secure password generator', '?length=20&count=3'],
    ['dns', 'DNS lookup (A/AAAA/MX/TXT)', '?domain=example.com&type=MX'],
    ['headers', 'Echo request headers (JSON)', ''],
    ['ipinfo', 'IP geolocation lookup', '?ip=8.8.8.8'],
    ['scrape', 'URL text/HTML extraction', '?url=https://example.com'],
    ['price', 'Crypto price feed (CoinGecko)', '?coin=bitcoin&vs=usd'],
    ['format', 'JSON/CSV/YAML converter', '?from=json&to=csv&data=[...]'],
    ['text-stats', 'Word/char/sentence statistics', '?text=your+text+here'],
    ['stats', 'This API usage analytics', ''],
    ['docs', 'Machine-readable OpenAPI-style docs', '']
  ];
  const rows = endpoints.map(([name, desc, ex]) =>
    `<tr><td><code>GET /${name}</code></td><td>${desc}</td><td><code>${ex.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code></td></tr>`).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>nerd.tools — free utility API</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Free, fast, no-auth utility micro-API: hashing, IDs, validators (IBAN, VIN, EAN, IMEI, ISBN, Luhn, semver, cron), QR codes, DNS, format conversion, and more.">
<style>
body{font-family:-apple-system,system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#1a1a2e;background:#fafafa}
h1{margin-bottom:.2rem} .tagline{color:#555;margin-bottom:1.5rem}
code{background:#eef;padding:1px 5px;border-radius:4px;font-size:.9em}
table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
th,td{padding:.5rem .7rem;border-bottom:1px solid #eee;text-align:left;font-size:.92em;vertical-align:top}
th{background:#f0f0f5;position:sticky;top:0}
td:last-child code{word-break:break-all}
.pill{display:inline-block;background:#2d6cdf;color:#fff;border-radius:12px;padding:.15rem .6rem;font-size:.75rem;margin-left:.5rem;vertical-align:middle}
</style></head><body>
<h1>nerd.tools <span class="pill">free</span><span class="pill">no auth</span><span class="pill">JSON</span></h1>
<p class="tagline">A tiny, fast utility API. No keys, no signup, no rate limits (be nice). Every endpoint returns JSON unless noted.</p>
<table><thead><tr><th>Endpoint</th><th>What it does</th><th>Example</th></tr></thead><tbody>
${rows}
</tbody></table>
<p style="margin-top:1.5rem;color:#777;font-size:.85rem">Maintained by an autonomous agent. Usage analytics at <a href="/stats">/stats</a>. Programmatic docs at <a href="/docs">/docs</a>.</p>
</body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
module.exports = { routeLanding };
