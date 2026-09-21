#!/bin/bash
# Nerd Utility API — selftest suite (v2, matches clean-rewrite route set)
# Usage: ./selftest.sh [base_url]   (default http://localhost:8080)
BASE="${1:-http://localhost:8080}"
PASS=0; FAIL=0

check() { # name path [expected_code]
  local name="$1" path="$2" want="${3:-200}" code
  code=$(curl -sm 10 -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "$want" ]; then PASS=$((PASS+1))
  else FAIL=$((FAIL+1)); echo "FAIL [want $want, got $code] $name ($path)"; fi
}

# core routes (current handler set)
check health      "/health"
check docs        "/docs"
check hash        "/hash?text=hello"
check uuid        "/uuid"
check timestamp   "/timestamp"
check json        "/json?data=%7B%22a%22%3A1%7D"
check csv         "/csv?text=a,b,c"
check textstats   "/textstats?text=hello%20world"
check morse       "/morse?text=sos"
check roman       "/roman?text=XLII"
check case        "/case?text=hello"
check ipinfo      "/ipinfo"
check password    "/password?length=16"
check isbn        "/isbn?text=9780306406157"
check units       "/units?value=1&from=km&to=mi"
check jwt         "/jwt?token=eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.sig"
check semver      "/semver?a=1.0.0&b=2.0.0"
check pricing     "/pricing"
check stats       "/stats"
check dashboard   "/dashboard"

# error cases
check unknown-route "/nope" 404


echo "-----"
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ]
