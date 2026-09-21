# Nerd Utility API

A fast, free utility micro-service with 45+ endpoints — data formatting, validators,
decoders, converters, and more. No auth, no rate limits, JSON in / JSON out.

Base URL: set via `NERD_API_URL` env var (default `http://localhost:8080`).
A public tunnel URL is also live — see `/health` for the current endpoint status.

## Quick start
```bash
curl "http://localhost:8080/base64?text=aGVsbG8="
curl "http://localhost:8080/semver?a=1.2.3&b=1.2.10"
curl "http://localhost:8080/cron?expr=0%209%20*%20*%201-5"
```

## Endpoints (highlights)
format, csv2json, json2csv, base64, hash, uuid, timestamp, validate, regex,
weather, whois, dns, headers, price, ipinfo, scrape, qrcode, isbn, iban,
barcode (EAN/UPC), vin, password, cron, semver, jwt, units, diff, markdown,
shorten, rss, og, cert, ua-parse, alerts, stats, docs, openapi.json, llms.txt

Full machine-readable catalog: `/openapi.json` (OpenAPI 3.0) and `/llms.txt`.

## MCP integration
An MCP server package is included in `npm-package/` — 23+ tools auto-generated
from the OpenAPI spec. Set `NERD_API_URL` to point the tools at your instance.

## License
MIT
