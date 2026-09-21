#!/bin/bash
BASE=http://localhost:8080
EPS="/format /csv2json /json2csv /base64 /hash /uuid /timestamp /text-stats /qrcode /dns /headers /price /price/history /ipinfo /scrape /alerts /stats /openapi.json /docs /pricing /buy /verify"
PAYLOADS=('{bad json' '' "$(python3 -c 'print("A"*100000)')" 'null' '[]' '{"u":{"v":1}}' '%00%ff\xfe' '{"url":"file:///etc/passwd"}' '{"url":"http://169.254.169.254/latest"}')
FAIL=0
for ep in $EPS; do
  for p in "${PAYLOADS[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST "$BASE$ep" -H 'Content-Type: application/json' --data-raw "$p" 2>/dev/null)
    case "$code" in 2*|4*) ;; *) echo "CRASH-RISK $ep -> $code"; FAIL=1;; esac
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$BASE$ep")
  case "$code" in 2*|4*) ;; *) echo "GET-FAIL $ep -> $code"; FAIL=1;; esac
done
echo "FUZZ DONE fail=$FAIL"; PID=$(cat app.pid); kill -0 $PID && echo "SERVER ALIVE"
