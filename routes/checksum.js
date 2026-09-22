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
function cksumPOSIX(buf) {
  // POSIX cksum: non-reflected CRC-32, poly 0x04C11DB7, init 0, xorout 0xFFFFFFFF,
  // with the byte-length appended MSB-first (no leading zero bytes).
  let c = 0;
  const step = (b) => {
    c ^= (b & 0xFF) << 24;
    for (let k = 0; k < 8; k++)
      c = (c & 0x80000000) ? (((c << 1) ^ 0x04C11DB7) >>> 0) : ((c << 1) >>> 0);
  };
  for (let i = 0; i < buf.length; i++) step(buf[i]);
  let n = buf.length, t = n, nbytes = 0;
  while (t > 0) { nbytes++; t = Math.floor(t / 256); }
  for (let i = nbytes - 1; i >= 0; i--) step((n >>> (8 * i)) & 0xFF);
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
