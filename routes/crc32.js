// CRC-32 (IEEE) + Adler-32 checksums
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(input) {
  const buf = Buffer.from(input, 'utf8');
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return ((c ^ 0xFFFFFFFF) >>> 0);
}
function adler32(input) {
  const buf = Buffer.from(input, 'utf8');
  let a = 1, b = 0;
  for (const byte of buf) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}
function routeCrc32(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.number;
  if (!text) return json(res, 400, { error: 'provide ?text=<string>' });
  return json(res, 200, { input: text, crc32: crc32(text).toString(16).padStart(8, '0'), crc32dec: crc32(text), adler32: adler32(text).toString(16).padStart(8, '0') });
}
module.exports = { routeCrc32, crc32, adler32 };
