// /checksum?text= — POSIX cksum + adler32
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
  // POSIX cksum: CRC-32 (poly 0x04C11DB7, init 0, non-reflected), then length appended MSB-first (significant bytes only)
  const crcStep = (crc, byte) => {
    crc ^= byte << 24;
    for (let i = 0; i < 8; i++) crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04C11DB7) >>> 0 : (crc << 1) >>> 0;
    return crc >>> 0;
  };
  let crc = 0;
  for (const byte of buf) crc = crcStep(crc, byte);
  // encode length big-endian, skipping leading zeros (POSIX: "length as n octets, n being minimal")
  let len = buf.length;
  const lenBytes = [];
  do { lenBytes.unshift(len & 0xFF); len >>>= 8; } while (len > 0);
  for (const byte of lenBytes) crc = crcStep(crc, byte);
  return json(res, 200, { input_length: buf.length, cksum: crc >>> 0, adler32 });
}
module.exports = { routeChecksum };
