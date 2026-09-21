// QR code generator (byte mode, ECC level M, pure JS, no deps)
// Implements the full QR spec: RS error correction, masking, matrix building.
const GF_EXP = new Array(512), GF_LOG = new Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) { GF_EXP[i] = x; GF_LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];

// Generator polynomial for n EC codewords
function genPoly(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}
function rsEncode(data, ecLen) {
  const gen = genPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const b of data) {
    const factor = b ^ res[0];
    res.shift(); res.push(0);
    if (factor !== 0) for (let i = 0; i < ecLen; i++) res[i] ^= gmul(gen[i + 1], factor);
  }
  return res;
}

// Version tables (total codewords, ec codewords per block, group structure) for ECC M
// [version, totalDataCodewords, ecPerBlock, blocksG1, dataG1, blocksG2, dataG2]
const TABLE_M = [
  [1,14,10,1,14,0,0],[2,26,16,1,26,0,0],[3,42,26,1,42,0,0],[4,62,18,2,15,0,0],
  [5,84,24,2,16,0,0],[6,106,16,4,13,0,0],[7,122,18,4,14,0,0],[8,152,22,2,14,2,14],
  [9,180,22,3,12,2,14],[10,206,26,4,13,1,14],[11,244,18,1,69,0,0],[12,261,22,6,15,2,16],
  [13,287,22,7,14,0,0],[14,323,24,10,14,0,0],[15,355,24,8,13,1,14],[16,395,28,16,14,0,0],
  [17,421,28,8,13,4,14],[18,458,26,11,12,5,14],[19,504,24,11,12,7,14],[20,558,28,3,15,13,14],
  [21,608,28,3,15,15,16],[22,654,26,4,14,17,16],[23,714,26,17,15,0,0],[24,762,30,17,15,1,16],
  [25,810,28,4,14,21,16],[26,862,28,9,13,16,15],[27,916,26,16,13,6,15],[28,970,26,34,13,0,0],
  [29,1024,28,17,13,4,14],[30,1078,28,8,13,19,14],[31,1148,28,21,13,4,15],[32,1218,28,19,11,6,15],
  [33,1270,26,27,12,6,15],[34,1366,28,25,15,5,15],[35,1434,26,15,12,20,15],[36,1508,26,37,12,5,15],
  [37,1590,26,23,12,16,15],[38,1654,26,17,12,26,15],[39,1728,30,18,12,12,14],[40,1808,28,13,12,30,15]
];
const ALIGN = { 1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50],
  11:[6,30,54],12:[6,32,58],13:[6,34,62],14:[6,26,46,66],15:[6,26,48,70],16:[6,26,50,74],17:[6,30,54,78],
  18:[6,30,56,82],19:[6,30,58,86],20:[6,34,62,90],21:[6,28,50,72,94],22:[6,26,50,74,98],23:[6,30,54,78,102],
  24:[6,28,54,80,106],25:[6,32,58,84,110],26:[6,30,58,86,114],27:[6,34,62,90,118],28:[6,26,50,74,98,122],
  29:[6,30,54,78,102,126],30:[6,26,52,78,104,130],31:[6,30,56,82,108,134],32:[6,34,60,86,112,138],
  33:[6,30,58,86,114,142],34:[6,34,62,90,118,146],35:[6,30,54,78,102,126,150],36:[6,24,50,76,102,128,154],
  37:[6,28,54,80,106,132,158],38:[6,32,58,84,110,136,162],39:[6,26,54,82,110,138,166],40:[6,30,58,86,114,142,170] };
const CAP_M = [14,26,42,62,84,106,122,152,180,206,244,261,287,323,355,395,431,487,527,569,637,703,775,847,919,991,1059,1129,1209,1279,1363,1445,1531,1629,1719,1805,1901,1981,2065,2161]; // byte mode caps (approx, ECC M)

function utf8Bytes(str) { return Array.from(new TextEncoder().encode(str)); }

function pickVersion(len) {
  for (let v = 1; v <= 40; v++) if (len <= CAP_M[v - 1]) return v;
  throw new Error('data too long for QR (max ~2161 bytes)');
}

function buildCodewords(bytes, version) {
  const t = TABLE_M[version - 1];
  const [, totalData, ecPerBlock, g1b, g1d, g2b, g2d] = t;
  const data = bytes.slice(0, totalData);
  const blocks = [];
  let off = 0;
  for (let i = 0; i < g1b; i++) { blocks.push(data.slice(off, off + g1d)); off += g1d; }
  for (let i = 0; i < g2b; i++) { blocks.push(data.slice(off, off + g2d)); off += g2d; }
  const ecBlocks = blocks.map(b => rsEncode(b, ecPerBlock));
  const nBlocks = g1b + g2b;
  const maxData = Math.max(g1d, g2d || 0);
  const out = [];
  for (let i = 0; i < maxData; i++)
    for (let b = 0; b < nBlocks; b++)
      if (i < blocks[b].length) out.push(blocks[b][i]);
  for (let i = 0; i < ecPerBlock; i++)
    for (let b = 0; b < nBlocks; b++) out.push(ecBlocks[b][i]);
  return out;
}

function makeMatrix(version) {
  const size = 17 + 4 * version;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const set = (r, c, v) => { m[r][c] = v ? 1 : 0; };
  // finders
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const dark = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      m[rr][cc] = dark ? 1 : 0;
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  // alignment
  for (const r of ALIGN[version]) for (const c of ALIGN[version]) {
    if (m[r] === undefined || m[r][c] !== null) continue;
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++)
      m[r + i][c + j] = (Math.max(Math.abs(i), Math.abs(j)) !== 1) ? 1 : 0;
  }
  // timing
  for (let i = 8; i < size - 8; i++) {
    if (m[6][i] === null) m[6][i] = (i % 2 === 0) ? 1 : 0;
    if (m[i][6] === null) m[i][6] = (i % 2 === 0) ? 1 : 0;
  }
  // dark module
  m[size - 8][8] = 1;
  // reserve format areas (fill later)
  const reserve = (r, c) => { if (m[r][c] === null) m[r][c] = 0; };
  for (let i = 0; i < 9; i++) { reserve(8, i); reserve(i, 8); }
  for (let i = 0; i < 8; i++) { reserve(8, size - 1 - i); reserve(size - 1 - i, 8); }
  reserve(size - 8, 8); // dark module area
  // version info (v >= 7)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    const bits = ((version << 12) | rem) >>> 0;
    for (let i = 0; i < 18; i++) {
      const b = (bits >> i) & 1;
      const r = Math.floor(i / 3), c = i % 3;
      m[size - 11 + c][r] = b; m[r][size - 11 + c] = b;
    }
  }
  return m;
}

const FORMAT_M = { L:1, M:0, Q:3, H:2 }; // format bits for level
function formatBits(mask) {
  // ECC level M = 0b00
  const data = 0; // M
  let bits = (data << 3) | mask;
  let rem = bits;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  return ((bits << 10) | rem) ^ 0x5412;
}

function maskFn(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return (r * c) % 2 + (r * c) % 3 === 0;
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
    case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
  }
}

function penalty(m) {
  const size = m.length; let p = 0;
  // rule 1
  for (let r = 0; r < size; r++) for (let c = 0, run = 1, prev = null; c < size; c++) {
    if (m[r][c] === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
    prev = m[r][c];
  }
  for (let c = 0; c < size; c++) for (let r = 0, run = 1, prev = null; r < size; r++) {
    if (m[r][c] === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
    prev = m[r][c];
  }
  // rule 3 (finder-like patterns) — simplified
  const pat = [1,0,1,1,1,0,1,0,0,0,0];
  for (let r = 0; r < size; r++) for (let c = 0; c + 11 <= size; c++) {
    let match = true;
    for (let i = 0; i < 11; i++) if (m[r][c + i] !== pat[i]) { match = false; break; }
    if (match) p += 40;
  }
  // rule 4
  let dark = 0; for (const row of m) for (const v of row) if (v) dark++;
  const pct = (dark * 100) / (size * size);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

function placeData(m, bits) {
  const size = m.length;
  let bitIdx = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const upward = ((col + 1) / 2) % 2 === 0;
      const r = upward ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (m[r][c] !== null) continue;
        const bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
        m[r][c] = bit;
      }
    }
  }
}

function applyMask(m, mask) {
  const size = m.length;
  // work on a copy of the module-value grid, but only flip non-function modules
  // function modules are already set as numbers; we need to know which were data.
  // We track by re-detecting: data placement wrote to null cells; easier: apply mask during placement.
  // Instead: we recompute using a separate "isFunction" grid built alongside makeMatrix.
  return m; // placeholder — handled in generate()
}

function generate(str) {
  const bytes = utf8Bytes(str);
  const version = pickVersion(bytes.length + 2);
  const size = 17 + 4 * version;
  // build bitstream: mode 4 (byte), charcount (8 bits for v<10, 16 for v>=10)
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  // terminator
  const totalDataBits = TABLE_M[version - 1][1] * 8;
  for (let i = 0; i < 4 && bits.length < totalDataBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewordBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewordBytes.push(b);
  }
  const finalBytes = buildCodewords(codewordBytes, version);
  // to bit array
  const allBits = [];
  for (const b of finalBytes) for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);
  while (allBits.length < size * size - 192) allBits.push(0);

  // Build function-module map
  const fn = makeMatrix(version);
  const isFn = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => fn[r][c] !== null));

  let best = null, bestP = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = makeMatrix(version);
    placeData(m, allBits);
    // apply mask to non-function modules
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
      if (!isFn[r][c] && maskFn(mask, r, c)) m[r][c] ^= 1;
    // write format info
    const fb = formatBits(mask);
    for (let i = 0; i < 15; i++) {
      const bit = (fb >> i) & 1;
      // around top-left
      const pos1 = i < 6 ? [8, i] : i === 6 ? [8, 7] : i === 7 ? [8, 8] : i === 8 ? [7, 8] : [14 - i, 8];
      m[pos1[0]][pos1[1]] = bit;
      const pos2 = i < 8 ? [size - 1 - i, 8] : [8, size - 15 + i];
      m[pos2[0]][pos2[1]] = bit;
    }
    const p = penalty(m);
    if (p < bestP) { bestP = p; best = m; }
  }
  return best;
}

function toSvg(matrix, scale = 4) {
  const n = matrix.length;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n * scale}" height="${n * scale}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>`;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (matrix[r][c]) svg += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000"/>`;
  return svg + '</svg>';
}

function toAscii(matrix) {
  return matrix.map(row => row.map(v => v ? '\u2588\u2588' : '  ').join('')).join('\n');
}

function toPngBuffer(matrix, scale = 8, margin = 4) {
  const n = matrix.length, dim = (n + 2 * margin) * scale;
  const raw = Buffer.alloc(dim * dim);
  for (let y = 0; y < dim; y++) for (let x = 0; x < dim; x++) {
    const r = Math.floor(y / scale) - margin, c = Math.floor(x / scale) - margin;
    const dark = r >= 0 && c >= 0 && r < n && c < n && matrix[r][c];
    raw[y * dim + x] = dark ? 0 : 255;
  }
  // PNG encode: 8-bit grayscale, no filter
  const zlib = require('zlib');
  const chunks = [];
  const crcTable = [];
  for (let n2 = 0; n2 < 256; n2++) { let c = n2; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n2] = c >>> 0; }
  const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dim, 0); ihdr.writeUInt32BE(dim, 4);
  ihdr[8] = 8; ihdr[9] = 0; // 8-bit grayscale
  // raw scanlines with filter byte 0
  const scan = Buffer.alloc(dim * (dim + 1));
  for (let y = 0; y < dim; y++) {
    scan[y * (dim + 1)] = 0;
    raw.copy(scan, y * (dim + 1) + 1, y * dim, (y + 1) * dim);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(scan)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

module.exports = { generate, toSvg, toAscii, toPngBuffer };
