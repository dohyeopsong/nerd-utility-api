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
  // POSIX cksum: CRC-32 (non-reflected, poly 0x04C11DB7, init 0, xorout 0xFFFFFFFF), then length bytes appended
  function crc32_msb(data) {
    let crc = 0;
    for (const byte of data) {
      crc ^= byte << 24;
      for (let i = 0; i < 8; i++) crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04C11DB7) >>> 0 : (crc << 1) >>> 0;
    }
    return crc >>> 0;
  }
  // length encoded MSB-first WITHOUT leading zeros
  const lenBytes = [];
  let len = buf.length;
  if (len === 0) lenBytes.push(0);
  else { const stack = []; while (len > 0) { stack.push(len & 0xFF); len >>>= 8; } for (let i = stack.length - 1; i >= 0; i--) lenBytes.push(stack[i]); }
  const payload = Buffer.concat([buf, Buffer.from(lenBytes)]);
  const cksum = crc32_msb(payload);
  return json(res, 200, { input_length: buf.length, cksum, adler32 });
}
module.exports = { routeChecksum };
