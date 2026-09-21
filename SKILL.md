# Nerd's Utility API — Client Skill

A free utility API on :8080 with 40+ endpoints. Base URL: `http://localhost:8080`
(public tunnel URL rotates — check `/health` and `/llms.txt` for current catalog).

## Data format conversion
- `/format?json=<string>` — validate & pretty-print JSON
- `/csv2json?csv=<url-encoded csv>` — CSV → JSON
- `/json2csv?json=<url-encoded json>` — JSON → CSV
- `/markdown?url=<http...>` — HTML → Markdown
- `/diff?a=<text>&b=<text>` — unified line diff
- `/base64?op=encode|decode&data=<string>`

## Validators
- `/validate?type=email|url|ipv4|ipv6|json|uuid|luhn&value=<string>`
- `/vin?v=<17-char VIN>` — VIN decode + check digit
- `/isbn?v=<string>` — ISBN-10/13 checksum + convert
- `/iban?v=<string>` — IBAN country + mod-97
- `/ean?v=<string>` — EAN-8/13, UPC-A barcode
- `/jwt?token=<jwt>` — JWT header/payload decode + expiry
- `/ua-parse?ua=<user agent>`

## Network / lookup
- `/dns?host=<domain>` — A/AAAA/MX/TXT records
- `/whois?domain=<domain>` — RDAP domain lookup
- `/headers?url=<http...>` — fetch and dump response headers
- `/cert?host=<domain>` — TLS certificate lookup
- `/og?url=<http...>` — OpenGraph/Twitter meta extraction
- `/ipinfo` — caller IP geolocation
- `/rss?url=<feed>` — RSS/Atom feed → clean JSON
- `/price?ids=bitcoin,ethereum&currencies=usd` — crypto prices
- `/price/history?ids=...&days=...` — price history
- `/weather?city=<name>` or `?lat=&lon=` — current + forecast

## Tools
- `/hash?algo=sha256&data=<string>`
- `/uuid` — v4 UUID
- `/timestamp?[unix=|iso=]` — unix ↔ ISO conversions
- `/qrcode?data=<string>&scale=6` — QR PNG
- `/password?[length=20]` — secure random + entropy
- `/case?to=camel|snake|kebab|title...&text=<string>` — 10 conversions
- `/text-stats?text=<string>` — chars, words, lines, reading time
- `/cron?expr=<cron>` — cron expression explainer
- `/semver?action=compare|sort&versions=a,b` — semver tools
- `/shorten?url=<http...>` + `/s/:code` — URL shortener
- `/paste` (POST body) + `/p/:id` — pastebin
- `/hook` (POST) — webhook tester
- `/mon/new?url=<http...>` — uptime monitor
- `/alerts` — price alert rules (GET/POST/DELETE)

## Paid (x402, USDC on Base)
- `/scrape?url=<http...>` — full page scrape (text, links, images, meta)
  402 + EIP-3009 challenge; pay via `x402-client.js` (`payAndScrape(pk, url)`)

## Meta
- `/docs`, `/llms.txt`, `/openapi.json`, `/agent-card.json`, `/stats`, `/payments`, `/health`
- POST `/mcp` — MCP-over-HTTP JSON-RPC (list_routes, call_route)
