// PEM inspector: /pem?pem=<pem string> or POST — parse cert/key type, validity, subject/issuer if parseable
function parsePemBlocks(pem) {
  const text = pem.replace(/\\n/g, '\n');
  const blocks = [];
  const re = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const label = m[1];
    const b64 = m[2].replace(/\s+/g, '');
    let buf;
    try { buf = Buffer.from(b64, 'base64'); } catch { buf = Buffer.alloc(0); }
    let kind = 'unknown';
    if (/CERTIFICATE/.test(label) && !/REQUEST/.test(label)) kind = 'certificate';
    else if (/CERTIFICATE REQUEST/.test(label)) kind = 'csr';
    else if (/PRIVATE KEY/.test(label)) kind = 'privateKey';
    else if (/PUBLIC KEY/.test(label)) kind = 'publicKey';
    const block = { type: label, derLength: buf.length, kind };
    // certificate details via openssl if available
    if (kind === 'certificate') {
      try {
        const fs = require('fs'), cp = require('child_process');
        const f = '/tmp/pem-inspect-' + Date.now() + '.pem';
        fs.writeFileSync(f, '-----BEGIN ' + label + '-----\n' + b64.replace(/(.{64})/g, '$1\n') + '\n-----END ' + label + '-----\n');
        const subj = cp.execSync('openssl x509 -in ' + f + ' -noout -subject -issuer -serial -dates -fingerprint -sha256 -fingerprint -sha512 2>/dev/null || true', { timeout: 5000 }).toString();
        fs.unlinkSync(f);
        for (const line of subj.split('\n')) {
          const mm = line.match(/^(subject|issuer|serialNumber|notBefore|notAfter)=\s*(.*)/);
          if (mm) block[mm[1] === 'notBefore' ? 'validFrom' : mm[1] === 'notAfter' ? 'validTo' : mm[1]] = mm[2].trim();
          const fp = line.match(/Fingerprint[^(]*=\s*(.*)/);
          if (fp) block[line.includes('SHA512') ? 'fingerprint512' : 'fingerprint256'] = fp[1].trim();
        }
        const usage = cp.execSync('openssl x509 -in /dev/null -noout 2>/dev/null', { timeout: 2000 }).toString();
        block.keyUsage = usage || null;
      } catch (e) { /* openssl optional */ }
    }
    if (kind === 'privateKey') {
      block.warning = 'private key detected — handle with care';
      block.type = label;
      // never reveal key material
    }
    if (kind === 'publicKey') {
      try {
        const fs = require('fs'), cp = require('child_process');
        const f = '/tmp/pem-inspect-' + Date.now() + '.pem';
        fs.writeFileSync(f, '-----BEGIN ' + label + '-----\n' + b64.replace(/(.{64})/g, '$1\n') + '\n-----END ' + label + '-----\n');
        const pub = cp.execSync('openssl pkey -pubin -in ' + f + ' -text -noout 2>/dev/null | head -2 || true', { timeout: 5000 }).toString();
        fs.unlinkSync(f);
        const bits = pub.match(/(\d+) bit/);
        if (bits) block.keyBits = +bits[1];
        const keyType = pub.match(/Public-Key: \((\d+) bit\)/);
        if (keyType) block.keyType = 'RSA';
        if (/NIST CURVE|curve/i.test(pub)) block.keyType = 'EC';
      } catch (e) { /* optional */ }
    }
    blocks.push(block);
  }
  return blocks;
}
function routePem(u, res, json, body) {
  try {
    let pem = u.searchParams.get('pem') || u.searchParams.get('input') || u.searchParams.get('p');
    if (!pem && body && typeof body === 'object' && (body.pem || body.input)) pem = body.pem || body.input;
    if (!pem) return json(res, 400, { error: 'provide ?pem=<PEM string> or POST {"pem": "..."}' });
    const blocks = parsePemBlocks(pem);
    if (blocks.length === 0) return json(res, 400, { error: 'no valid PEM blocks found' });
    return json(res, 200, { blockCount: blocks.length, blocks });
  } catch (e) {
    return json(res, 500, { error: 'pem failure: ' + e.message });
  }
}
module.exports = { routePem, parsePemBlocks };
