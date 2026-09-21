#!/bin/bash
# tunnel-watch.sh — detects trycloudflare URL rotation and keeps published files current.
# Runs under supervisor.sh (add to cron or as a loop). Logs to tunnel-watch.log.
cd "$(dirname "$0")"
LOG=tunnel-watch.log
URL_FILE=PUBLIC_URL.md
CARD=agent-card.json

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; tail -n 200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"; }

CURRENT=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$URL_FILE" 2>/dev/null | head -1)
HEALTH=$(curl -sm 15 "$CURRENT/health" 2>/dev/null)

if echo "$HEALTH" | grep -q '"status":"ok"'; then
  log "OK tunnel healthy: $CURRENT"
  exit 0
fi

log "WARN tunnel unhealthy or rotated: $CURRENT -> probing cloudflared process"

# Tunnel process alive but URL stale: extract fresh URL from cloudflared log/stderr
NEWURL=""
CFLOG=$(ls -t cloudflared*.log tunnel*.log nohup*.out 2>/dev/null | head -1)
if [ -n "$CFLOG" ]; then
  NEWURL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$CFLOG" | tail -1)
fi

if [ -z "$NEWURL" ]; then
  log "INFO restarting cloudflared"
  pkill -f "cloudflared.*8080" 2>/dev/null
  pkill -f "cloudflared.*http://localhost:8080" 2>/dev/null
  sleep 2
  nohup cloudflared tunnel --url http://localhost:8080 > cloudflared.log 2>&1 & disown
  for i in $(seq 1 12); do
    sleep 5
    NEWURL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' cloudflared.log 2>/dev/null | tail -1)
    [ -n "$NEWURL" ] && break
  done
fi

if [ -z "$NEWURL" ]; then
  log "ERROR could not establish tunnel URL"
  exit 1
fi

log "INFO new tunnel: $NEWURL"

# Update published URL files
sed -i '' "s|https://[a-z0-9-]*\.trycloudflare\.com|$NEWURL|g" "$URL_FILE"
[ -f llms.txt ] && sed -i '' "s|https://[a-z0-9-]*\.trycloudflare\.com|$NEWURL|g" llms.txt
[ -f PROMO/README.md ] && sed -i '' "s|https://[a-z0-9-]*\.trycloudflare\.com|$NEWURL|g" PROMO/README.md

# Update agent card URL
if [ -f "$CARD" ]; then
  python3 - "$CARD" "$NEWURL" <<'PYEOF'
import json, sys
card, newurl = sys.argv[1], sys.argv[2]
d = json.load(open(card))
d['url'] = newurl
json.dump(d, open(card, 'w'), indent=2)
PYEOF
  log "INFO agent-card.json url updated"
fi

# Verify externally
sleep 5
if curl -sm 15 "$NEWURL/health" 2>/dev/null | grep -q '"status":"ok"'; then
  log "OK new tunnel verified live"
  git add -A 2>/dev/null && git commit -qm "tunnel-watch: rotated to $NEWURL" 2>/dev/null
  exit 0
else
  log "WARN new tunnel not yet verified (may need a moment)"
  exit 1
fi
