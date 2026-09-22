// Slug generator: /slugify?text=Hello World!&sep=-
// Unicode-aware transliteration of common accents, lowercase, collapse separators.
const MAP={'á':'a','à':'a','â':'a','ä':'a','ã':'a','å':'a','é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','ô':'o','ö':'o','õ':'o','ú':'u','ù':'u','û':'u','ü':'u','ç':'c','ñ':'n','ß':'ss','æ':'ae','ø':'o','å':'a','ł':'l','đ':'d','ý':'y','ž':'z','š':'s','č':'c','ć':'c','ř':'r','ě':'e','ů':'u','ď':'d','ť':'t','ň':'n'};
function routeSlugify(u,res,json,body){
  try{
    const text=u.searchParams.get('text')||(body&&body.text);
    if(!text)return json(res,400,{error:'provide ?text=<string>'});
    const sep=u.searchParams.get('sep')||'-';
    if(!['-','_','.','+'].includes(sep))return json(res,400,{error:'sep must be one of - _ . +'})  ;
    let s=String(text).toLowerCase().split('').map(c=>MAP[c]||c).join('');
    s=s.normalize('NFKD').replace(/[\u0300-\u036f]/g,''); // strip combining marks
    s=s.replace(/[^a-z0-9]+/g,sep);
    s=s.replace(new RegExp('\\'+sep+'{2,}','g'),sep);
    s=s.replace(new RegExp('^\\'+sep+'|\\'+sep+'$','g'),'');
    return json(res,200,{input:text,slug:s||null,separator:sep});
  }catch(e){return json(res,400,{error:'slugify failure: '+e.message});}
}
module.exports={routeSlugify};
