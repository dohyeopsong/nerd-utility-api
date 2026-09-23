// /bip39 — BIP-39 mnemonic validation (English wordlist, SHA256 checksum)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let WORDLIST = null;
function getWordlist() {
  if (!WORDLIST) {
    WORDLIST = fs.readFileSync(path.join(__dirname, 'bip39-english.txt'), 'utf8').trim().split('\n');
  }
  return WORDLIST;
}

function routeBip39(u, res, json) {
  const p = u.searchParams;
  const mnemonic = (p.get('mnemonic') || p.get('m') || '').trim().toLowerCase().replace(/\s+/g, ' ');

  if (!mnemonic) {
    return json(res, 200, { usage: '?mnemonic=abandon abandon ... (12/15/18/21/24 words)' });
  }

  const words = mnemonic.split(' ');
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return json(res, 400, { error: `invalid word count: ${words.length} (must be 12, 15, 18, 21, or 24)`, wordCount: words.length });
  }

  const wordlist = getWordlist();
  const indices = [];
  for (const w of words) {
    const i = wordlist.indexOf(w);
    if (i === -1) return json(res, 400, { error: `word '${w}' not in BIP-39 English wordlist`, invalidWord: w, wordCount: words.length });
    indices.push(i);
  }

  // Reconstruct entropy + checksum bits
  let bits = '';
  for (const i of indices) bits += i.toString(2).padStart(11, '0');
  const totalBits = bits.length;
  const checksumBits = totalBits / 33;
  const entropyBits = totalBits - checksumBits;
  const entropy = [];
  for (let i = 0; i < entropyBits; i += 8) entropy.push(parseInt(bits.slice(i, i + 8), 2));
  const providedChecksum = bits.slice(entropyBits);

  const hash = crypto.createHash('sha256').update(Buffer.from(entropy)).digest('hex');
  const expectedChecksum = parseInt(hash.slice(0, 2), 16).toString(2).padStart(8, '0').slice(0, checksumBits);

  return json(res, 200, {
    wordCount: words.length,
    wordsInWordlist: true,
    entropyBits,
    checksumValid: providedChecksum === expectedChecksum
  });
}

module.exports = { routeBip39 };
