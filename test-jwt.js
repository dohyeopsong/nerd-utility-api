const { routeJwt } = require('./routes/jwt.js');
const t = (u) => { const res={writeHead(){},end(){}}; let out; routeJwt(new URL(u,'http://x'), res, (r,c,o)=>out=o); return out; };
const mk = (h,p) => [h,p].map(o => Buffer.from(JSON.stringify(o)).toString('base64url')).join('.') + '.sig';
const now = Math.floor(Date.now()/1000);
const a = t('/jwt?jwt=' + mk({alg:'HS256',typ:'JWT'}, {sub:'123',name:'Test'}));
console.log(a.header.alg === 'HS256' && a.payload.sub === '123' ? 'PASS' : 'FAIL', 'decode header/payload');
const b = t('/jwt?jwt=' + mk({alg:'HS256'}, {exp: now - 100}));
console.log(b.expired === true ? 'PASS' : 'FAIL', 'expired detected');
const c = t('/jwt?jwt=' + mk({alg:'HS256'}, {exp: now + 1000}));
console.log(c.expired === false && c.expiresAt ? 'PASS' : 'FAIL', 'future expiry');
const d = t('/jwt?jwt=notajwt');
console.log(d.error ? 'PASS' : 'FAIL', 'rejects malformed');
console.log(a.signaturePresent === true ? 'PASS' : 'FAIL', 'signature presence');

// register route in app.js
const fs = require('fs');
let s = fs.readFileSync('app.js','utf8');
if (!s.includes('routeJwt')) {
  s = "const { routeJwt } = require('./routes/jwt.js'); // jwt\n" + s;
  const anchor = "            if (u.pathname === '/ean') {";
  if (!s.includes(anchor)) { console.error('ANCHOR NOT FOUND'); process.exit(1); }
  s = s.replace(anchor, "            if (u.pathname === '/jwt') {\n              return routeJwt(u, res, json);\n            }\n" + anchor);
  fs.writeFileSync('app.js', s);
  console.log('registered');
} else console.log('already registered');
