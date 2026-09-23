// /bip39 — validate BIP-39 mnemonic (wordlist membership + entropy checksum)
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const WORDS = fs.readFileSync(path.join(__dirname, 'bip39-english.txt'), 'utf8').trim().split('\n');
const WORDSET = new Set(WORDS);
function routeBip39(u, res, json) {
  const p = u.searchParams;
  const m = p.get('mnemonic') || p.get('words') || p.get('m');
  if (!m) return json(res, 200, { usage: '?m=<12 or 24 word mnemonic> — validate BIP-39 English mnemonic' });
  const words = m.trim().toLowerCase().split(/\s+/);
  const count = words.length;
  const out = { word_count: count, valid_word_count: [12,15,18,21,24].includes(count) };
  const bad = words.filter(w => !WORDSET.has(w));
  if (bad.length) {
    out.valid = false;
    out.unknown_words = [...new Set(bad)].slice(0, 10);
    return json(res, 422, out);
  }
  if (!out.valid_word_count) {
    out.valid = false;
    out.error = 'word count must be 12, 15, 18, 21, or 24';
    return json(res, 422, out);
  }
  // checksum: entropy bits + checksum bits; checksum = first ENT/32 bits of SHA256(entropy)
  const bits = words.map(w => WORDS.indexOf(w).toString(2).padStart(11, '0')).join('');
  const entBits = (count * 11) / 33 * 32; // ENT = total*32/33
  const entBitsInt = Math.floor(count * 11 * 32 / 33);
  const entBytes = Buffer.from(
    bits.slice(0, entBitsInt).match(/.{8}/g).map(b => parseInt(b, 2))
  );
  const hash = createHash('sha256').update(entBytes).digest('hex');
  const csBits = bits.slice(entBitsInt);
  const needCsLen = count * 11 - entBitsInt;
  const expectBits = hash.split('').map(c => (parseInt(c, 16) >>> 3).toString(2).padStart(4, '0').slice(0, 1)).join(''); // first needCsLen bits
  // simpler: build expected checksum bits from hash hex
  const hashBits = hash.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
  const expectedCs = hashBits.slice(0, needCsLen);
  out.checksum_valid = csBits === expectedCs;
  out.entropy_bits = entBitsInt;
  out.checksum_bits = needCsLen;
  out.valid = out.checksum_valid;
  return json(res, 200, out);
}
module.exports = { routeBip39 };
