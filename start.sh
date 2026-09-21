#!/bin/bash
# start.sh — one-shot launcher, returns immediately (no blocking)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
pkill -f "supervisor.sh" 2>/dev/null
pkill -f "$DIR/app.js" 2>/dev/null
pkill -f "$DIR/watchdog.js" 2>/dev/null
setsid nohup "$DIR/supervisor.sh" > /dev/null 2>&1 < /dev/null &
disown
echo "supervisor launched (detached)"
