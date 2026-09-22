// PEM inspector: /pem?inspect=<pem> (GET url-encoded) or POST {"pem": "..."}
// Parses X.509 certs, RSA/EC private keys, CSR, and generic PEM blocks.
const crypto = require('crypto');
function analyzeBlock(type, label, der) {
  const info = { type: label, derLength: der.length };
  try {
    if (/CERTIFICATE/.test(label) && !label.includes('REQUEST')) {
      const cert = new crypto.X509Certificate(der);
      info.kind = 'certificate';
      info.subject = cert.subject.replace(/\n/g, ', ');
      info.issuer = cert.issuer.replace(/\n/g, ', ');
      info.serialNumber = cert.serialNumber;
      info.validFrom = cert.validFrom, info.validTo = cert.validTo;
      info.keyUsage = cert.keyUsage || null;
      info.fingerprint256 = cert.fingerprint256;
      info.fingerprint512 = cert.fingerprint512;
      info.publicKey = {};
      try { const pk = cert.publicKey; info.publicKey.type = pk.type; info.publicKey.asymmetricKeyType = pk.asymmetricKeyType; if (pk.asymmetricKeyType === 'rsa') info.publicKey.modulusBits = pk.asymmetricKeyDetails?.modulusLength; } catch {}
      const now = new Date();
      info.expired = cert.validToDate < now;
      return info;
    }
    if (/PRIVATE KEY/.test(label) && !label.includes('ENCRYPTED')) {
      info.kind = 'private-key';
      const types = [/RSA/.test(label) ? 'pkcs1' : null, /EC/.test(label) && !/RSA/.test(label) ? 'sec1' : null, 'pkcs8', 'pkcs1', 'sec1'].filter(Boolean);
      for (const t of types) {
        try {
          const key = crypto.createPrivateKey({ key: der, format: 'der', type: t });
          info.keyType = key.asymmetricKeyType;
          info.keyDetails = key.asymmetricKeyDetails || null;
          return info;
        } catch {}
      }
      info.parseError = 'could not parse as any key type (maybe encrypted)';
      return info;
    }
  } catch (e) { info.parseError = e.message; }
  info.kind = /REQUEST/.test(label) ? 'csr' : /ENCRYPTED/.test(label) ? 'encrypted' : 'other';
  return info;
}
async function routePem(u, res, json, body, method) {
  try {
    let pem = u.searchParams.get('pem') ?? u.searchParams.get('inspect');
    if (method === 'POST') { try { const b = JSON.parse(body || '{}'); if (typeof b.pem === 'string') pem = b.pem; } catch {} }
    if (!pem) return json(res, 400, { error: 'provide ?pem=<PEM string> or POST {"pem": "..."}' });
    const blocks = [];
    const re = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;
    let m, found = false;
    while ((m = re.exec(pem)) !== null) {
      found = true;
      try {
        const der = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
        blocks.push(analyzeBlock(m[0], m[1], der));
      } catch (e) { blocks.push({ type: m[1], error: 'invalid base64' }); }
    }
    if (!found) return json(res, 400, { error: 'no PEM blocks found (expected -----BEGIN/END-----)' });
    return json(res, 200, { blockCount: blocks.length, blocks });
  } catch (e) { return json(res, 500, { error: 'parse failure: ' + e.message }); }
}
module.exports = { routePem };
