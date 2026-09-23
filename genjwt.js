const c = require('crypto');
const b = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const h = b({alg: 'HS256', typ: 'JWT'});
const p = b({sub: '1234', name: 'Nerd', iat: 1690000000, exp: 4102444800});
const s = c.createHmac('sha256', 'topsecret').update(h + '.' + p).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log(h + '.' + p + '.' + s);
