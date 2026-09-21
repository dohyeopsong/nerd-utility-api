#!/bin/bash
# Build/test/deploy helper for /jwt
set -e
cd /Users/dohyeopsong/service
node /tmp/jwt.test.js
node -e "
const fs=require('fs'); let s=fs.readFileSync('app.js','utf8');
if (!s.includes('routeJwt')) {
  s = \"const { routeJwt } = require('./routes/jwt.js'); // jwt\n\" + s;
  const anchor = \"            if (u.pathname === '/ean') {\";
  s = s.replace(anchor, \"            if (u.pathname === '/jwt') {\n              return routeJwt(u, res, json);\n            }\n\" + anchor);
  fs.writeFileSync('app.js', s); console.log('registered');
}
"
node --check app.js
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1
nohup node app.js > server.log 2>&1 &
sleep 3
TOKEN=$(node -e "console.log(Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'abc'})).toString('base64url')+'.sig')")
curl -s "http://localhost:8080/jwt?jwt=$TOKEN"
echo
git add -A && git commit -q -m "Add /jwt: JWT decoder with expiry check" && git log --oneline -1
