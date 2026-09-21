// PEM inspection/analysis endpoint: /pem?text=... (urlencoded) or POST {text}
// Detects and analyzes: RSA keys, EC keys, X.509 certificates, CSRs, PKCS#8,
// public keys. Reports key sizes, curves, subject/issuer, validity, SANs, fingerprints.
const crypto = require('crypto');

function fingerprint(der) {
  return { sha256: crypto.createHash('sha256').update(der).digest('hex'), sha1: crypto.createHash('sha1').update(der).digest('hex'), md5: crypto.createHash('md5').update(der).digest('hex') };
}

function parsePem(text) {
  const blocks = text.match(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g) || [];
  const results = [];
  for (const block of blocks) {
    const label = (block.match(/-----BEGIN ([^-]+)-----/) || [])[1];
    const b64 = block.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    let der;
    try { der = Buffer.from(b64, 'base64'); } catch { results.push({ label, error: 'invalid base64' }); continue; }
    const out = { label, sizeBytes: der.length, fingerprints: fingerprint(der) };
    try {
      if (/PRIVATE KEY|RSA/.test(label)) {
        try {
          const keyObj = crypto.createPrivateKey({ key: block, format: 'pem' });
          const jwk = keyObj.export({ format: 'jwk' });
          out.type = jwk.kty === 'EC' ? 'EC private key' : jwk.kty === 'RSA' ? 'RSA private key' : (jwk.kty + ' private key');
          if (jwk.kty === 'RSA') out.keySize = crypto.createPublicKey(keyObj).asymmetricKeySize;
          if (jwk.kty === 'EC') out.curve = jwk.crv;
          out.hasPublicMaterial = true;
          const pub = crypto.createPublicKey(keyObj);
          out.publicFingerprint = fingerprint(pub.export({ type: 'spki', format: 'der' }));
        } catch (e) { out.error = 'private key parse failed: ' + e.message; }
      } else if (/CERTIFICATE/.test(label) && !/REQUEST/.test(label)) {
        const x509 = new crypto.X509Certificate(block);
        out.type = 'X.509 certificate';
        out.subject = x509.subject;
        out.issuer = x509.issuer;
        out.validFrom = x509.validFrom;
        out.validTo = x509.validTo;
        out.validToTimestamp = new Date(x509.validTo).getTime();
        out.daysRemaining = Math.floor((new Date(x509.validTo) - Date.now()) / 86400000);
        out.expired = out.daysRemaining < 0;
        out.serialNumber = x509.serialNumber;
        out.keyUsage = x509.keyUsage;
        out.subjectAltName = x509.subjectAltName;
        out.fingerprint = x509.fingerprint;
        out.fingerprint256 = x509.fingerprint256;
        out.publicKey = {};
        try {
          const pk = x509.publicKey;
          out.publicKey.type = pk.asymmetricKeyType;
          if (pk.asymmetricKeyType === 'rsa') out.publicKey.keySize = pk.asymmetricKeySize;
          if (pk.asymmetricKeyType === 'ec') { const jwk = pk.export({ format: 'jwk' }); out.publicKey.curve = jwk.crv; }
        } catch (e) { out.publicKey.error = e.message; }
        out.ca = /CA:TRUE/.test(x509.toString() || '');
      } else if (/REQUEST/.test(label)) {
        // CSR: extract raw info we can from DER (subject is visible as printable strings)
        const printable = (der.toString('latin1').match(/[A-Za-z0-9 ='@,./_-]{8,}/g) || []).filter(s => !/^\s*$/.test(s));
        out.type = 'Certificate Signing Request';
        out.likelySubject = printable[0] || null;
      } else if (/PUBLIC KEY/.test(label)) {
        const keyObj = crypto.createPublicKey({ key: block, format: 'pem' });
        out.type = 'public key';
        out.keyType = keyObj.asymmetricKeyType;
        if (keyObj.asymmetricKeyType === 'rsa') out.keySize = keyObj.asymmetricKeySize;
        if (keyObj.asymmetricKeyType === 'ec') { const jwk = keyObj.export({ format: 'jwk' }); out.curve = jwk.crv; }
      } else {
        out.type = 'unknown block type';
      }
    } catch (e) { out.error = e.message; }
    results.push(out);
  }
  return results;
}

async function routePem(u, res, json, body, method) {
  let text = null;
  if (method === 'POST') {
    try { const b = JSON.parse(body || '{}'); text = b.text ?? b.pem; } catch { return json(res, 400, { error: 'invalid JSON body' }); }
  } else {
    text = u.searchParams.get('text') ?? u.searchParams.get('pem');
  }
  if (!text) return json(res, 400, { error: 'provide ?text=... (urlencoded PEM) or POST {text}' });
  const blocks = parsePem(text);
  if (!blocks.length) return json(res, 400, { error: 'no PEM blocks found (-----BEGIN...END-----)' });
  return json(res, 200, { count: blocks.length, blocks });
}
module.exports = { routePem, parsePem };
