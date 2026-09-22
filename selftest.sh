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
check password    "/password?pw=abc"
check isbn        "/isbn?check=9780306406157"
check units       "/units?value=1&from=km&to=mi"
check jwt         "/jwt?token=eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.sig"
check semver      "/semver?check=1.0.0,2.0.0"
check cron        "/cron?expr=0%209%20*%20*%201-5"
check luhn        "/luhn?check=4532015112830366"
check iban        "/iban?check=DE89370400440532013000"
check pricing     "/pricing"
check stats       "/stats"
check dashboard   "/dashboard"
check openapi     "/openapi.json"
check unknown-route "/nope" 404
echo "PASS: $PASS  FAIL: $FAIL"
[ "$FAIL" = "0" ]
check slug  "/slug?text=H%C3%A9llo+W%C3%B6rld!+10%2B+Great+Ideas" 200
check pwstrength  "/pwstrength?pw=Tr0ub4dor%263" 200
check cron       "/cron?expr=0%209%20*%20*%201-5" 200
check chmod      "/chmod?mode=755" 200
check diff       "/diff?a=hello%0Aworld&b=hello%0Athere" 200
check diff       "/diff?a=hello%0Aworld&b=hello%0Athere" 200
check case       "/case?text=hello%20world%20example" 200
check case       "/case?text=hello%20world%20example&to=camel" 200
check jwt        "/jwt?token=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.sig" 200
check html       "/html?text=hello%20%3Cworld%3E" 200
check html       "/html?text=%3Cb%3Ehi%3C%2Fb%3E&mode=decode" 200
check html       "/html?text=%3Cscript%3Ealert(1)%3C/script%3E" 200
check uuid7      "/uuid7?count=3" 200
check uuid7      "/uuid7?n=3" 200
check subnet    "/subnet?cidr=192.168.1.0/24"
# checksum
A=$(curl -s --get --data-urlencode "text=hello" http://localhost:8080/checksum | python3 -c "import sys,json;print(json.load(sys.stdin)['cksum'])")
[ "$A" = "3287646509" ] && echo PASS checksum || echo FAIL checksum
# hash match
B=$(curl -s --get --data-urlencode "text=hello" --data-urlencode "algo=sha256" --data-urlencode "expected=2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" http://localhost:8080/hash | python3 -c "import sys,json;print(json.load(sys.stdin)['match'])")
[ "$B" = "True" ] && echo PASS hash || echo FAIL hash
# case
C=$(curl -s --get --data-urlencode "text=helloWorldAgain" --data-urlencode "to=constant" http://localhost:8080/case | python3 -c "import sys,json;print(json.load(sys.stdin)['result'])")
[ "$C" = "HELLO_WORLD_AGAIN" ] && echo PASS case || echo FAIL case
