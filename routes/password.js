// /password — secure password / passphrase generator (crypto.random)
const crypto = require('crypto');
const WORDS = ('able acid aged also area army away baby back ball band bank base bath bear beat been beer bell belt best bird blow blue boat body bomb bond bone book born both bowl bulk burn bush busy call calm came camp card care case cash cast cell chat chip city club coal coat code cold come cook cool cope copy core cost crew crop cure cut dark data date dawn days dead deal dear debt deep deny desk dial dice diet disk does done door dose down draw drew drop drug drum dual duke duty each earn ease east easy echo edge else even ever evil exit face fact fail fair fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish fist five flat flow food foot ford fork form fort four free from fuel full fund gain game gate gave gear gene gift girl give glad glow goal goes gold golf gone good grab gray grew grow gulf hair half hall hand hang hard harm hate have head hear heat held hell help herb here hero hide high hill hint hire hold hole holy home hope horn host hour huge hunt hurt idea inch into iron item join jump jury just keep kept kick kind king kiss kite knee knew know lack lady laid lake land lane last late laugh lawn lay lead leaf leak lean leap left less lift like limb line link lion list live load loan lock logo long look lord lose loss lost loud love luck lung made mail main make male mall many mark mass math meal mean meat meet melt menu mesh mild mile milk mill mind mine miss mode mold mood moon more most move much must myth nail name navy near neat neck need news next nice nine node noise none noon norm nose note noun oath obey odds okay once only open oral ours oval oven over pace pack page paid pain pair pale palm park part pass past path peak pear peer pile ping pink plan play plot plug plus poem poet pole poll pond pool poor pork port pose post pour pray prey pull pump pure push quiz race rack raft rage raid rail rain rank rare rate read real reap rear rely rent rest rice rich ride rise risk road rock role roll roof room root rope rose ruin rule rush safe sage said sail sale salt same sand save scan seal seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut sick side sigh sign silk sing sink site size skin skip slip slow snap snow soap sock soft soil sold sole solo some song soon sort soul soup spin spot star stay step stem stir stop such suit sung sunk sure swap swim take tale talk tall tank tape task team tear tech teen tell tend term test text than that them then they thin this thus tide tile till time tiny tire toll tone tool torn tour town toys tree trim trip true tube tune turn twin type unit upon urge used user vary vast verb very vest view vine void vote wage wait walk wall want ward warm warn wash wave weak wear week well went were west what when whom wide wife wild will wind wine wing wire wise wish with wood wool word wore work worm wrap yard yeah year your zeal zone').split(' ');
function randInt(n) {
  // unbiased modulo
  const lim = Math.floor(0x100000000 / n) * n;
  let x;
  do { x = crypto.randomBytes(4).readUInt32BE(0); } while (x >= lim);
  return x % n;
}
function genPassword(len, sets) {
  let pool = '';
  if (sets.includes('l')) pool += 'abcdefghijklmnopqrstuvwxyz';
  if (sets.includes('u')) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (sets.includes('d')) pool += '0123456789';
  if (sets.includes('s')) pool += '!@#$%^&*()-_=+[]{};:,.<>?';
  if (!pool) pool = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const chars = [];
  for (let i = 0; i < len; i++) chars.push(pool[randInt(pool.length)]);
  return chars.join('');
}
function entropyBits(poolSize, len) { return Math.round(len * Math.log2(poolSize)); }
function routePassword(u, res, json) {
  const q = u.searchParams;
  const type = (q.get('type') || 'password').toLowerCase();
  if (type === 'password') {
    const len = Math.min(Math.max(+(q.get('length') || q.get('len') || 16), 4), 128);
    const sets = (q.get('sets') || 'luds').toLowerCase().replace(/[^luds]/g, '');
    let poolSize = 0;
    if (sets.includes('l')) poolSize += 26;
    if (sets.includes('u')) poolSize += 26;
    if (sets.includes('d')) poolSize += 10;
    if (sets.includes('s')) poolSize += 27;
    if (!poolSize) poolSize = 36;
    return json(res, 200, {
      password: genPassword(len, sets),
      length: len, sets: sets || 'l',
      entropy_bits: entropyBits(poolSize, len)
    });
  }
  if (type === 'passphrase') {
    const words = Math.min(Math.max(+(q.get('words') || 4), 2), 20);
    const sep = q.get('separator') || '-';
    const capitalize = q.get('capitalize') === 'true';
    const w = [];
    for (let i = 0; i < words; i++) {
      let word = WORDS[randInt(WORDS.length)];
      if (capitalize) word = word[0].toUpperCase() + word.slice(1);
      w.push(word);
    }
    return json(res, 200, {
      passphrase: w.join(sep),
      words, wordlist_size: WORDS.length,
      entropy_bits: Math.round(words * Math.log2(WORDS.length)),
      capitalize
    });
  }
  if (type === 'hex' || type === 'bytes') {
    const len = Math.min(Math.max(+(q.get('length') || 32), 2), 512);
    const bytes = Math.ceil(len / 2);
    return json(res, 200, { hex: crypto.randomBytes(bytes).toString('hex').slice(0, len), length: len, entropy_bits: len * 4 });
  }
  if (type === 'uuid') {
    return json(res, 200, { uuid: crypto.randomUUID(), entropy_bits: 122 });
  }
  return json(res, 400, { error: 'type must be password|passphrase|hex|uuid' });
}
module.exports = { routePassword };
