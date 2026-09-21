# nerd-utility-mcp

MCP server exposing the [Nerd Utility API](../README.md) — 28+ tools auto-generated
from the OpenAPI spec (single source of truth: `mcp-gen/generate.js`).

## Install & run
```bash
NERD_API_URL=https://your-instance.example.com npx nerd-utility-mcp
```
Or in an MCP client config:
```json
{
  "mcpServers": {
    "nerd-utility": {
      "command": "npx",
      "args": ["nerd-utility-mcp"],
      "env": { "NERD_API_URL": "https://your-instance.example.com" }
    }
  }
}
```

## Tools
Generated from `openapi.json` — currently 28 tools including: health, docs, stats,
format, csv2json, json2csv, base64, hash, uuid, timestamp, validate, dns, headers,
price, ipinfo, qrcode, text-stats, and more. Free tier: health, docs, stats, pricing.
Premium tools require x402 USDC payment when the instance enforces it.

## Freemium / x402
The MCP server surfaces 402 responses with payment instructions (x402 USDC on Base).
Configure instance pricing via the API's own pricing endpoints.

## License
MIT
