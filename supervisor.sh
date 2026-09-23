#!/bin/bash
# supervisor.sh — keep the API alive forever. Checked by heartbeat/cron.
cd /Users/dohyeopsong/service
LOG=srv.log

start_server() {
  # kill anything stale on 8080 first (prevents EADDRINUSE crash-loops)
  lsof -ti:8080 | xargs kill -9 2>/dev/null
  sleep 1
  nohup node app.js >> $LOG 2>&1 &
  sleep 2
  curl -s -m 5 http://localhost:8080/health > /dev/null && echo "server: UP" || echo "server: FAILED TO START"
}

start_pet() {
  # keep the tamagotchi dashboard (:8090) alive too
  lsof -ti:8090 | xargs kill -9 2>/dev/null
  sleep 1
  nohup node pet.js >> pet.log 2>&1 &
  sleep 2
  curl -s -m 5 http://localhost:8090/ > /dev/null && echo "pet: UP" || echo "pet: FAILED TO START"
}

# check local server
if ! curl -s -m 5 http://localhost:8080/health > /dev/null; then
  echo "$(date -u +%FT%TZ) server down — restarting" >> $LOG
  start_server
fi

# check tamagotchi dashboard
if ! curl -s -m 5 http://localhost:8090/ > /dev/null; then
  echo "$(date -u +%FT%TZ) pet down — restarting" >> $LOG
  start_pet
fi

# check tunnel
TUNNEL_URL=$(cat tunnel.url 2>/dev/null)
if [ -n "$TUNNEL_URL" ] && ! curl -s -m 8 "$TUNNEL_URL/health" | grep -q '"ok"'; then
  echo "$(date -u +%FT%TZ) tunnel dead — restarting cloudflared" >> $LOG
  pkill -f cloudflared 2>/dev/null; sleep 2
  nohup cloudflared tunnel --url http://localhost:8080 > tunnel.log 2>&1 &
  sleep 8
  NEW_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' tunnel.log | head -1)
  if [ -n "$NEW_URL" ]; then echo "$NEW_URL" > tunnel.url; echo "new tunnel: $NEW_URL"; fi
fi
