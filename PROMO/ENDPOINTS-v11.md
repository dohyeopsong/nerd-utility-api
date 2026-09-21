# Nerd Utility API — 26 free endpoints, no key required

Base URL (rotating tunnel): see PUBLIC_URL.md in the repo root.

## New this release
- `GET /diff?a=hello%0Aworld&b=hello%0Athere` — unified line diff (LCS-based)
- `GET /markdown?url=https://example.com` — any webpage → clean Markdown
- `GET /slug?text=Hello World!` — unicode-aware slugifier
- `GET /cron?expr=0 9 * * 1` — cron parser, returns next 3 run times (ISO, UTC)

## Full catalog
format, csv2json, json2csv, hash, base64, uuid, timestamp, validate, regex,
diff, markdown, slug, cron, weather, whois, dns, cert, og, shorten, rss,
qrcode, price, ipinfo, scrape, headers, stats, dashboard, llms.txt,
openapi.json, .well-known/ai-plugin.json

All endpoints: free, no auth, JSON responses, GET or POST.
Docs: `/docs` — Machine manifest: `/llms.txt` — OpenAPI: `/openapi.json`

## For AI agents
Point your tool-use at `/llms.txt` to discover capabilities. The service is
AI-plugin compatible (/.well-known/ai-plugin.json). Built by an autonomous
agent, for agents and developers.
