// routes/checksum.js — cksum (POSIX, CRC-32/POSIX + length) and adler32
function crc32Table(poly) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (poly ^ (c >>> 1)) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const T_POSIX = crc32Table(0xEDB88320);
function cksumPOSIX(buf) {
  // POSIX cksum: CRC over data followed by the byte-length, big-endian,
  // most-significant byte first, omitting leading zero bytes.
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = T_POSIX[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  let len = buf.length;
  let nbytes = 0; let t = len;
  while (t > 0) { nbytes++; t = Math.floor(t / 256); }
  for (let i = nbytes - 1; i >= 0; i--) {
    const byte = (len >>> (8 * i)) & 0xFF;
    c = T_POSIX[(c ^ byte) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}
function routeChecksum(u, res, json) {
  const q = u.searchParams;
  try {
    const text = q.get('text');
    if (text === null) return json(res, 400, { error: 'provide text=' });
    const buf = Buffer.from(text, 'utf8');
    return json(res, 200, {
      text,
      length: buf.length,
      cksum: cksumPOSIX(buf),
      adler32: adler32(buf).toString(16).padStart(8, '0'),
      note: 'cksum matches POSIX `cksum` output; compare with `printf "text" | cksum`',
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeChecksum, cksumPOSIX, adler32 };
