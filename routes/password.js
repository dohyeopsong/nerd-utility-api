// Password generator: /password?length=20&count=5&symbols=true&passphrase=true
// Uses crypto.randomBytes — CSPRNG, not Math.random.
const crypto=require('crypto');
const LOWER='abcdefghijkmnopqrstuvwxyz',UPPER='ABCDEFGHJKLMNPQRSTUVWXYZ',
  DIGITS='23456789',SYMBOLS='!@#$%^&*()-_=+[]{};:,.<>?';
const WORDS=('able acid aged also area army away baby back ball band bank base bath bean bear beat been beef bell belt bend bike bill bird bite blue boat body bomb bond bone book boom boot born boss both bowl bulk burn bush busy calm camp card care case cash cast cell chef chin chip city clan clay clip club coal coat code coin cold comb cook cool cope copy cord core cork corn cost crew crop cube cure cute damp dark dart dash data date dawn dead deal dear debt deck deep deer dent desk dial dice diet dirt disc dish dock does dome done dose dove down draw drew drip drop drum dual duck dull dust duty each earn ease east easy echo edge exam exit face fact fade fail fair fall fame farm fast fate fear feed feel feet fell felt file fill film find fine fire fish fist five flag flat flew flip flow foam fold folk fond food fool foot fork form fort four free frog from fuel full fund gain game gate gave gear gene gift girl give glad glow goal goat goes gold golf gone good grab gray grew grid grim grin grip grow gulf hail hair half hall halt hand hang hard harm hate hawk head heal heap hear heat heed heel heir held hell helm help herb herd here hero hers hide high hike hill hint hire hold hole holy home hone hood hook hop hope horn hose host huge hunt hurt icon idea inch into iron item jade jail jazz join joke july jump jury just keen keep kept key kick kind king kite knee knew knot know lack lady laid lake land lane last late lawn lazy lead leaf lean left lend lens less lift like limp link list live load loan lock logo lone long look loop lord lose loss loud love luck lung made mail main make mall many mask mass mast mate math meal mean meat meet melt memo mend menu mere mesh mild mile milk mill mind mine mist mode mood more most moth move much must myth nail name navy near neat neck need nest news next nice nine node none noon norm nose note noun oath obey odds okay omit once only onto open oral oven over pace pack page paid pain pair pale palm pane park part pass past path peak pear peer pile pine pink pipe plan play plea plot plow plus poem poet pole poll pond pool poor pope port pose post pour pray prey prim prod prop pull pump pure push quit quiz race rack raft rage raid rail rain rake ramp rank rare rate rave read real reef reel rely rent rest rice rich ride rift ring riot rise risk road roam roar robe rock rode role roll roof room root rope rose ruby rude ruin rule rush rust safe sage said sail sale salt same sand save scan seal seam seat seed seek seem seen self sell send sent shed ship shoe shop shot show shut side sigh sign silk sing sink site size skin skip slab slam slap sled slid slim slip slot slow snap snow soak soap sock soft soil sold sole solo some song soon sort soul soup spot spun spur star stay stem step stir stop stow stub such suit sung sunk sure swap swim tail take tale talk tall tank tape task taxi team tear tech teen tell tend tent term test text than that thaw them then they thin this thou thud thus tick tide tidy tied tile till tilt time tint tiny tip toad told toll tomb tone tool torn tour town trap tray tree trim trio trip true tube tuna tune turf turn twin type ugly undo unit upon urge used user vain vane vast veil vein verb very vest veto vibe view vine visa void volt vote wade wage wait wake walk wall wand want ward warm warn wash wasp wave weak wear weed week weep well went were west what when whim whip whom wick wide wife wild will wind wine wing wipe wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn yawn year yell yoga young zeal zero zone zoom').split(' ');
function genPassword(length,useUpper,useDigits,useSymbols,excludeSimilar){
  let pool=LOWER;
  if(useUpper)pool+=UPPER;
  if(useDigits)pool+=DIGITS;
  if(useSymbols)pool+=SYMBOLS;
  if(!excludeSimilar){pool+=('il1Lo0O'.slice(0,0));} // similar chars already excluded from base sets
  let out='';
  const rb=crypto.randomBytes(length*2);
  let ri=0;
  while(out.length<length){
    if(ri>=rb.length){ri=0;/*re-get*/}
    const c=pool[rb[ri++]%pool.length];
    out+=c;
  }
  // guarantee at least one of each requested class
  const ensure=[['lower',LOWER]];
  if(useUpper)ensure.push(['upper',UPPER]);
  if(useDigits)ensure.push(['digit',DIGITS]);
  if(useSymbols)ensure.push(['symbol',SYMBOLS]);
  let i=0;
  for(const [,set] of ensure){
    if(!['lower','upper','digit','symbol'].some(()=>false)){ /* placeholder */ }
    if(!set.split('').some(ch=>out.includes(ch))){
      out=out.slice(0,i)+set[rb[i]%set.length]+out.slice(i+1);
    }
    i=(i+3)%Math.max(1,length-1);
  }
  return out;
}
function entropyBits(length,useUpper,useDigits,useSymbols){
  let pool=LOWER.length;
  if(useUpper)pool+=UPPER.length;
  if(useDigits)pool+=DIGITS.length;
  if(useSymbols)pool+=SYMBOLS.length;
  return +(length*Math.log2(pool)).toFixed(1);
}
function genPassphrase(wordsN,sep,capitalize){
  const picks=[];
  for(let i=0;i<wordsN;i++){
    let w=WORDS[crypto.randomInt(WORDS.length)];
    if(capitalize)w=w[0].toUpperCase()+w.slice(1);
    picks.push(w);
  }
  const num=crypto.randomInt(100,999);
  return picks.join(sep)+'-'+num;
}
function routePassword(u,res,json,body){
  try{
    const q=k=>u.searchParams.get(k)!==null?u.searchParams.get(k):(body&&body[k]);
    const length=Math.min(128,Math.max(4,parseInt(q('length'))||20));
    const count=Math.min(20,Math.max(1,parseInt(q('count'))||5));
    const upper=q('upper')!=='false',digits=q('digits')!=='false',symbols=q('symbols')!=='false';
    const passphrase=q('passphrase')==='true';
    if(passphrase){
      const wordsN=Math.min(12,Math.max(3,parseInt(q('words'))||4));
      const sep=q('sep')||'-';
      const list=Array.from({length:count},()=>genPassphrase(wordsN,sep,q('capitalize')!=='false'));
      return json(res,200,{mode:'passphrase',sep,wordsN,passwords:list,
        entropyBits:+(wordsN*Math.log2(WORDS.length)+Math.log2(900)).toFixed(1),
        advice:'Diceware-style passphrase; strength scales with word count'});
    }
    const list=Array.from({length:count},()=>genPassword(length,upper,digits,symbols));
    return json(res,200,{mode:'random',length,count,passwords:list,
      classes:{upper,digits,symbols},entropyBits:entropyBits(length,upper,digits,symbols),
      advice:'Generated with crypto.randomBytes (CSPRNG). Use HTTPS in transit.'});
  }catch(e){return json(res,400,{error:'password failure: '+e.message});}
}
module.exports={routePassword,genPassword,genPassphrase};
