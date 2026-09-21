#!/bin/bash
# supervisor.sh — keeps app.js and watchdog.js running forever (PID-file based)
NODE=/usr/local/bin/node
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

start_app() {
  nohup "$NODE" "$DIR/app.js" >> service.log 2>&1 &
  echo $! > app.pid
  echo "[$(date -u +%FT%TZ)] supervisor: started app.js pid $!" >> supervisor.log
}
start_watchdog() {
  nohup "$NODE" "$DIR/watchdog.js" >> watchdog.log 2>&1 &
  echo $! > watchdog.pid
  echo "[$(date -u +%FT%TZ)] supervisor: started watchdog.js pid $!" >> supervisor.log
}
alive() { # alive <pidfile>
  [ -f "$1" ] || return 1
  local p; p=$(cat "$1")
  [ -n "$p" ] && kill -0 "$p" 2>/dev/null
}

while true; do
  alive app.pid || start_app
  alive watchdog.pid || start_watchdog
  sleep 30
done

# tunnel watchdog loop: every 60s, restart tunnel if unhealthy
# ngrok replaces cloudflared quick tunnel (stable URL, no watchdog churn)
# ( while true; do ./tunnel-watchdog.sh; sleep 60; done ) &
echo $! > tunnel-watchdog.pid
