#!/bin/bash
# tunnel-watchdog.sh — keeps the cloudflared quick tunnel alive and
# auto-updates PUBLIC_URL.md when the URL rotates.
# Intended to run every minute via cron / supervisor.
cd "$(dirname "$0")"
LOG=tunnel.log

is_healthy() {
  URL=$(cat PUBLIC_URL.md 2>/dev/null | tr -d '[:space:]')
  [ -n "$URL" ] || return 1
  code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/price?symbol=BTC")
  [ "$code" = "200" ]
}

if is_healthy; then exit 0; fi

# Unhealthy: restart tunnel (kill any existing, relaunch)
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 2
nohup cloudflared tunnel --url http://localhost:8080 > "$LOG" 2>&1 &

# Wait up to 30s for URL to appear in log
for i in $(seq 1 15); do
  sleep 2
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1)
  [ -n "$URL" ] && break
done
if [ -z "$URL" ]; then echo "$(date -u) tunnel-watchdog: FAILED to get URL" >> tunnel-watchdog.log; exit 1; fi

echo "$URL" > PUBLIC_URL.md
# Wait up to 30s more for edge registration
for i in $(seq 1 6); do
  sleep 5
  code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/price?symbol=BTC")
  [ "$code" = "200" ] && { echo "$(date -u) tunnel-watchdog: healthy at $URL" >> tunnel-watchdog.log; exit 0; }
done
echo "$(date -u) tunnel-watchdog: URL $URL registered but not yet serving (may need more time)" >> tunnel-watchdog.log
exit 0
