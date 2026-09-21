// Additional utility endpoints for nerd-service
const crypto = require('crypto');

module.exports = {
  formatJSON: (body) => { const obj = JSON.parse(body); return { result: JSON.stringify(obj, null, 2) }; },
  csv2json: (body) => { const [head, ...rows] = body.trim().split(/?
/); const keys = head.split(","); return { result: rows.map(r => { const vals = r.split(","); const o = {}; keys.forEach((k,i) => o[k.trim()] = vals[i] !== undefined ? vals[i].trim() : ""); return o; }) }; },
  base64: (body, query) => {
    const decode = query.mode === 'decode';
    const out = decode ? Buffer.from(body, 'base64').toString('utf8') : Buffer.from(body).toString('base64');
    return { result: out };
  },
  hash: (body, query) => {
    const algo = query.algo || 'sha256';
    if (!['md5','sha1','sha256','sha512'].includes(algo)) throw new Error('unsupported algo');
    return { algo, result: crypto.createHash(algo).update(body).digest('hex') };
  },
  uuid: () => ({ result: crypto.randomUUID() }),
  timestamp: (body, query) => {
    if (query.date) return { result: Math.floor(new Date(query.date).getTime() / 1000) };
    if (query.ts) return { result: new Date(Number(query.ts) * 1000).toISOString() };
    return { result: Math.floor(Date.now() / 1000), iso: new Date().toISOString() };
  },
  hmac: (body, query) => {
    if (!query.key || !query.algo) throw new Error('key and algo required');
    return { result: crypto.createHmac(query.algo, query.key).update(body).digest('hex') };
  }
};
