// /checksum?text= — POSIX cksum + adler32
function routeChecksum(u, res, json) {
  const q = u.searchParams;
  if (!q.has('text') && !q.has('input')) return json(res, 400, { error: 'provide text=' });
  const text = q.get('text') || q.get('input') || '';
  const buf = Buffer.from(text, 'utf8');
  const adler32 = buf.length === 0 ? 1 : (() => {
    let a = 1, b = 0;
    for (const byte of buf) { a = (a + byte) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  })();
  // POSIX cksum: non-reflected CRC-32 (poly 0x04C11DB7, init 0), length bytes BE (no leading zeros), final complement
  function fold(c, byte) {
    c ^= byte << 24;
    for (let i = 0; i < 8; i++) c = (c & 0x80000000) ? (((c << 1) >>> 0) ^ 0x04C11DB7) >>> 0 : (c << 1) >>> 0;
    return c >>> 0;
  }
  let crc = 0;
  for (const byte of buf) crc = fold(crc, byte);
  let len = buf.length; const lenBytes = [];
  do { lenBytes.unshift(len & 0xFF); len >>>= 8; } while (len > 0);
  for (const byte of lenBytes) crc = fold(crc, byte);
  crc = (~crc) >>> 0;
  return json(res, 200, { input_length: buf.length, cksum: crc, adler32 });
}
module.exports = { routeChecksum };
