// /nanoid — URL-safe random IDs with customizable alphabet/length
const crypto = require('crypto');

function routeNanoid(u, res, json) {
  const p = u.searchParams;
  const alphabet = p.get('alphabet') || 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  if (alphabet.length < 2 || alphabet.length > 256) return json(res, 400, { error: 'alphabet must be 2-256 unique chars' });
  if (new Set(alphabet).size !== alphabet.length) return json(res, 400, { error: 'alphabet contains duplicate characters' });
  const size = Math.max(1, Math.min(256, parseInt(p.get('size') || '21', 10) || 21));
  const count = Math.max(1, Math.min(100, parseInt(p.get('count') || '1', 10) || 1));

  const gen = () => {
    // rejection sampling for unbiased chars
    const limit = 256 - (256 % alphabet.length);
    let id = '';
    while (id.length < size) {
      const buf = crypto.randomBytes(size);
      for (const b of buf) {
        if (b >= limit) continue;
        id += alphabet[b % alphabet.length];
        if (id.length === size) break;
      }
    }
    return id;
  };
  const ids = Array.from({ length: count }, gen);
  const bits = Math.round(size * Math.log2(alphabet.length));
  return json(res, 200, {
    count, size, alphabet_size: alphabet.length,
    entropy_bits: bits,
    collision_odds_note: `~${bits} bits of entropy; ~${Math.pow(2, bits / 2).toExponential(2)} IDs for 50% collision chance`,
    id: count === 1 ? ids[0] : undefined,
    ids: count > 1 ? ids : undefined,
  });
}
module.exports = { routeNanoid };
