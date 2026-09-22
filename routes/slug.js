// Slugify utility: /slug?text=Hello World!&sep=-
// Converts arbitrary text to URL-safe slugs with Unicode-aware transliteration for common chars.
const MAP={'&':'and','@':'at','$':'dollars','+':'plus','%':'percent','#':'hash'};
function slugify(text,sep='-'){
  let s=String(text);
  for(const [k,v] of Object.entries(MAP))s=s.split(k).join(' '+v+' ');
  s=s.normalize('NFKD')
     .replace(/[\u0300-\u036f]/g,'')           // strip diacritics
     .toLowerCase()
     .replace(/[''`""]/g,'')                    // quotes just drop
     .replace(/[^a-z0-9]+/g,' ')               // non-alnum → space
     .trim()
     .replace(/\s+/g,sep);
  return s;
}
function routeSlug(u,res,json,body){
  try{
    const text=u.searchParams.get('text')||(body&&body.text);
    if(text===undefined||text===null||text==='')return json(res,400,{error:'provide ?text=<string to slugify>'});
    const sep=(u.searchParams.get('sep')||(body&&body.sep)||'-').slice(0,3);
    const slug=slugify(text,sep);
    return json(res,200,{input:text,slug,length:slug.length,sep});
  }catch(e){return json(res,400,{error:'slug failure: '+e.message});}
}
module.exports={routeSlug,slugify};
