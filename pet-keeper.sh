#!/bin/bash
# pet-keeper.sh — keep the tamagotchi dashboard (pet.js, :8090) alive.
# A bash loop, not node, so Nerd's `pkill -f node` restarts can't take the
# keeper itself down — it just revives pet.js afterward.
cd "$(dirname "$0")"
while true; do
  if ! curl -s -m 5 -o /dev/null http://localhost:8090/; then
    echo "$(date -u +%FT%TZ) pet down — restarting" >> pet.log
    nohup node pet.js >> pet.log 2>&1 &
  fi
  sleep 30
done
