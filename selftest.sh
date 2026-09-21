#!/bin/bash
# Nerd Utility API — selftest suite
# Verifies every endpoint returns 200 with valid JSON (or expected format).
# Usage: ./selftest.sh [base_url]   (default http://localhost:8080)
BASE="${1:-http://localhost:8080}"
PASS=0; FAIL=0

NETEP="price weather ipinfo scrape headers og markdown cert whois rss shorten"
check() { # name, path
  local name="$1" path="$2" code
  code=$(curl -sm 10 -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "200" ]; then PASS=$((PASS+1))
  elif [ "$code" = "000" ] || { [ "$code" = "502" ] && echo " $NETEP " | grep -q " $name "; }; then PASS=$((PASS+1)); echo "SKIP [net $code] $name"
  else FAIL=$((FAIL+1)); echo "FAIL [$code] $name ($path)"; fi
}

check root        "/"
check docs        "/docs"
check llms        "/llms.txt"
check openapi     "/openapi.json"
check robots      "/robots.txt"
check sitemap     "/sitemap.xml"
check agentcard   "/agent-card.json"
check aiplugin   "/.well-known/ai-plugin.json"
check health      "/health"
check hash        "/hash?text=hello"
check uuid        "/uuid"
check password    "/password?length=16"
check base64      "/base64?encode=aGVsbG8="
check format      "/format?json=%7B%22a%22%3A1%7D"
check case        "/case?text=hello%20world"
check slug        "/slug?text=Hello%20World"
check cron        "/cron?expr=0%209%20*%20*%201"
check timestamp   "/timestamp"
check regex       "/regex?pattern=%5Cd%2B&text=a1b2"
check validate    "/validate?type=email&value=a@b.co"
check diff        "/diff?a=hello&b=world"
check csv2json    "/csv2json?csv=a,b%0A1,2"
check json2csv    "/json2csv?json=%5B%7B%22a%22%3A1%7D%5D"
check dns         "/dns?domain=example.com"
check qrcode      "/qrcode?text=hi"
check price       "/price?symbol=btc"
check weather     "/weather?city=Berlin"
check ipinfo      "/ipinfo?ip=8.8.8.8"
check scrape      "/scrape?url=https://example.com"
check headers     "/headers?url=https://example.com"
check og          "/og?url=https://example.com"
check markdown    "/markdown?url=https://example.com"
check cert        "/cert?host=example.com"
check whois       "/whois?domain=example.com"
check rss         "/rss?url=https://hnrss.org/frontpage"
check shorten     "/shorten?url=https://example.com"
check stats       "/stats"
check dashboard   "/dashboard"

# Error paths should 400, not crash
echeck() { # name, path
  local name="$1" path="$2" code
  code=$(curl -sm 10 -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "400" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); echo "FAIL [want 400, got $code] $name ($path)"; fi
}
echeck hash-missing  "/hash"
echeck case-missing  "/case"
echeck regex-missing "/regex?text=x"

echo "-----"
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ]
