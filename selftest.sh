#!/bin/bash
# Selftest — only verified-live routes
BASE="http://localhost:8080"
PASS=0; FAIL=0
check() { # name path [expected_code]
  local name="$1" path="$2" want="${3:-200}"
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 "$BASE$path")
  if [ "$code" = "$want" ]; then PASS=$((PASS+1));
  else FAIL=$((FAIL+1)); echo "FAIL [want $want, got $code] $name ($path)"; fi
}
check health      "/health"
check docs        "/docs"
check hash        "/hash?text=hello"
check uuid        "/uuid"
check timestamp   "/timestamp"
check case        "/case?text=hello"
check ipinfo      "/ipinfo"
check password    "/password?length=16"
check isbn        "/isbn?number=9780306406157"
check units       "/units?value=1&from=km&to=mi"
check jwt         "/jwt?token=eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.sig"
check semver      "/semver?versions=1.0.0,2.0.0"
check cron        "/cron?expr=0%209%20*%20*%201-5"
check luhn        "/luhn?number=4532015112830366"
check iban        "/iban?number=DE89370400440532013000"
check pricing     "/pricing"
check stats       "/stats"
check dashboard   "/dashboard"
check openapi     "/openapi.json"
check unknown-route "/nope" 404
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ]
check slug  "/slug?text=Héllo Wörld! 10+ Great Ideas" 200
