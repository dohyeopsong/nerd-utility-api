// XML to JSON converter: /xml2json?xml=<xml string> or POST {xml}
// Conventions: attributes prefixed with @, text content as #text, repeated tags → arrays.
function xml2json(xml){
  xml=xml.replace(/<\?[\s\S]*?\?>/g,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<!DOCTYPE[\s\S]*?>/gi,'').trim();
  if(!xml)throw new Error('empty document after stripping declarations');
  let i=0;
  const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  function skipWs(){while(i<xml.length&&/\s/.test(xml[i]))i++;}
  function parseName(){
    const s=i;while(i<xml.length&&/[A-Za-z0-9_.:-]/.test(xml[i]))i++;
    if(s===i)throw new Error('bad name at pos '+i);
    return xml.slice(s,i);
  }
  function parseNode(){
    skipWs();
    if(xml[i]!=='<')throw new Error('expected < at pos '+i);
    if(xml[i+1]==='?'||xml[i+1]==='!')throw new Error('unexpected token at pos '+i);
    i++;
    const name=parseName();
    const node={};
    while(true){
      skipWs();
      if(xml[i]==='/'&&xml[i+1]==='>'){i++;return {name,node,selfClose:true};}
      if(xml[i]==='>'){i++;break;}
      const an=parseName();
      skipWs();
      if(xml[i]!=='=')throw new Error('expected = after attr '+an+' in <'+name+'>');
      i++;skipWs();
      const q=xml[i];if(q!=='"'&&q!=="'")throw new Error('attr value must be quoted in <'+name+'>');
      i++;const vs=i;while(i<xml.length&&xml[i]!==q)i++;
      if(i>=xml.length)throw new Error('unterminated attr value in <'+name+'>');
      node['@'+an]=unesc(xml.slice(vs,i));i++;
    }
    // content
    let text='';const kids=[];
    while(i<xml.length){
      if(xml[i]==='<'){
        if(xml[i+1]==='/'){
          const s=i;i+=2;const cn=parseName();skipWs();
          if(xml[i]!=='>')throw new Error('malformed closing tag </'+cn+'>');i++;
          if(cn!==name)throw new Error('mismatched close: <'+name+'> vs </'+cn+'>');
          if(kids.length===0){
            if(!node['#text']&&text.trim())node['#text']=unesc(text.trim());
            return {name,node};
          }
          // group kids by name
          const grouped={};const order=[];
          for(const k of kids){
            if(!(k.name in grouped)){grouped[k.name]=[];order.push(k.name);}
            grouped[k.name].push(k.node);
          }
          for(const n of order){
            node[n]=grouped[n].length===1?grouped[n][0]:grouped[n];
          }
          if(text.trim())node['#text']=unesc(text.trim());
          return {name,node};
        }
        kids.push(parseNode());
      } else text+=xml[i++];
    }
    throw new Error('unexpected EOF inside <'+name+'>');
  }
  const root=parseNode();
  skipWs();
  if(i<xml.length)throw new Error('trailing content after root element');
  return {[root.name]:root.node};
}
function routeXml2json(u,res,json,body){
  try{
    const xml=u.searchParams.get('xml')||(body&&body.xml);
    if(!xml)return json(res,400,{error:'provide ?xml=<xml string> or POST {"xml": "..."}'});
    return json(res,200,xml2json(String(xml)));
  }catch(e){return json(res,400,{error:'xml2json failure: '+e.message});}
}
module.exports={routeXml2json,xml2json};
