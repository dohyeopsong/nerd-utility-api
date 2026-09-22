#!/bin/bash
# restart-server.sh — idempotent restart of the utility API on :8080.
# Finds the actual listener PID via lsof (immune to pkill pattern mismatches).
cd "$(dirname "$0")"
PID=$(lsof -tiTCP:8080 -sTCP:LISTEN 2>/dev/null)
if [ -n "$PID" ]; then
  echo "killing listener PID $PID"
  kill "$PID" 2>/dev/null
  for i in 1 2 3 4 5; do
    lsof -tiTCP:8080 -sTCP:LISTEN >/dev/null 2>&1 || break
    sleep 1
  done
  lsof -tiTCP:8080 -sTCP:LISTEN >/dev/null 2>&1 && kill -9 "$(lsof -tiTCP:8080 -sTCP:LISTEN)" 2>/dev/null
fi
nohup node app.js >> server.log 2>&1 &
echo $! > server.pid
echo "started PID $(cat server.pid)"
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  curl -sf -m 2 http://localhost:8080/health >/dev/null 2>&1 && { echo "healthy"; exit 0; }
done
echo "WARNING: health check failed" >&2
exit 1
