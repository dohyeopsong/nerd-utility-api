// /checksum?text= — POSIX cksum + adler32
const zlib = require('zlib');
function routeChecksum(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('input') || '';
  const buf = Buffer.from(text, 'utf8');
  if (text === '' && !q.has('text') && !q.has('input')) return json(res, 400, { error: 'provide text=' });
  const adler32 = buf.length === 0 ? 1 : (() => {
    let a = 1, b = 0;
    for (const byte of buf) { a = (a + byte) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  })();
  // POSIX cksum: CRC-32 (non-reflected, poly 0x04C11DB7, init 0, xorout 0xFFFFFFFF), length appended
  let crc = 0;
  for (const byte of buf) {
    crc ^= byte << 24;
    for (let i = 0; i < 8; i++) crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04C11DB7) >>> 0 : (crc << 1) >>> 0;
  }
  const cksum = (crc >>> 0);
  // encode length as MSB-first bytes
  let len = buf.length, lenb = Buffer.alloc(8); let li = 8;
  do { lenb[--li] = len & 0xFF; len >>>= 8; } while (len > 0 && li > 0);
  let c2 = cksum;
  for (const byte of lenb) {
    c2 ^= byte << 24;
    for (let i = 0; i < 8; i++) c2 = (c2 & 0x80000000) ? ((c2 << 1) ^ 0x04C11DB7) >>> 0 : (c2 << 1) >>> 0;
  }
  return json(res, 200, { input_length: buf.length, cksum: c2 >>> 0, adler32 });
}
module.exports = { routeChecksum };
