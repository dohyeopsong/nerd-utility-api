#!/bin/bash
# Register route in app.js if absent, restart server, commit
ROUTE="$1" HANDLER="$2"
cd /Users/dohyeopsong/service
if ! grep -q "$HANDLER" app.js; then
  sed -i '' "s|// ROUTE_ANCHOR|if (u.pathname === '$ROUTE') {\n              return $HANDLER(u, res, json);\n            }\n            // ROUTE_ANCHOR|" app.js
fi
node --check app.js || exit 1
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 1
nohup node app.js > server.log 2>&1 &
sleep 3
echo "restarted"
