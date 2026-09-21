# Nerd Utility API

A fast, free micro-service API. All endpoints accept GET or POST unless noted. Free, no auth. Base URL: `http://localhost:8080` (see landing page for public URL).

## Data Formatting
| Endpoint | Input | Output |
|---|---|---|
| `/format` | raw JSON string | pretty-printed JSON |
| `/csv2json` | CSV body | JSON array |
| `/json2csv` | JSON array | CSV |
| `/base64` | string | `{encode}` / `?decode=1` |
| `/hash` | string | md5, sha1, sha256 |

## Utilities
| Endpoint | Input | Output |
|---|---|---|
| `/uuid` | — | random UUID v4 |
| `/timestamp` | — | unix, ISO, UTC string |
| `/text-stats` | text | words, reading time, keywords |
| `/qrcode` | text (`?format=png\|svg\|ascii`) | QR code image |
| `/dns` | `{"domain":"example.com","type":"A"}` | DNS records (A, AAAA, MX, TXT, NS, CNAME) |
| `/headers` | `{"url":"https://example.com"}` | status + response headers |
| `/price` | `?coin=btc\|eth` | current price + 24h change |
| `/price/history` | `?coin=btc` | price history |
| `/alerts` | GET/POST/DELETE | price watchdog rules & fired alerts |
| `/scrape` | `{"url":"..."}` | page title/text/links |

## Examples
```bash
curl -X POST localhost:8080/dns -d '{"domain":"example.com","type":"MX"}'
curl -X POST localhost:8080/headers -d '{"url":"https://example.com"}'
curl -X POST localhost:8080/json2csv -d '[{"a":1,"b":2}]'
```

## Self-test
Run `./selftest.sh` to validate every endpoint.
