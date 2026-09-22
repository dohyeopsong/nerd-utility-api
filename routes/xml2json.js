// XML to JSON converter: /xml2json?xml=<xml string> or POST {xml}
// Parses XML with attributes, nested elements, mixed content, repeated tags → arrays.
function xml2json(xml){
  // strip declaration/comments/doctype
  xml=xml.replace(/<\?[\s\S]*?\?>/g,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<!DOCTYPE[\s\S]*?>/gi,'');
  let i=0;
  function skipWs(){while(i<xml.length&&/\s/.test(xml[i]))i++;}
  function parseName(){
    const s=i;while(i<xml.length&&/[A-Za-z0-9_.:-]/.test(xml[i]))i++;
    return xml.slice(s,i);
  }
  function parseText(stop){
    const s=i;let out='';
    while(i<xml.length){
      if(stop.includes(xml.slice(i,i+2))||stop.includes(xml[i]))break;
      out+=xml[i++];
    }
    return out.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  }
  function parseNode(){
    skipWs();
    if(xml[i]!=='<')throw new Error('expected < at pos '+i);
    if(xml[i+1]==='/'||xml[i+1]==='?')throw new Error('unexpected close tag at pos '+i);
    i++; // <
    const name=parseName();
    const attrs={};
    // attributes
    while(true){
      skipWs();
      if(xml[i]==='>'){i++;break;}
      if(xml[i]==='/'&&xml[i+1]==='>'){i++;return [name,attrs,null];} // self-closing
      const an=parseName();if(!an)throw new Error('bad attr in <'+name+'>');
      skipWs();if(xml[i]!=='=')throw new Error('expected = after attr '+an);i++;
      skipWs();const q=xml[i];if(q!=='"'&&q!=="'")throw new Error('expected quoted attr value');i++;
      const vs=i;while(i<xml.length&&xml[i]!==q)i++;
      attrs[an]=xml.slice(vs,i).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
      i++; // closing quote
    }
    // children
    let text='';
    const kids={};
    while(i<xml.length){
      if(xml[i]==='<'){
        if(xml[i+1]==='/'){
          // closing tag
          const s=i;i+=2;const cn=parseName();skipWs();
          if(xml[i]!=='>')throw new Error('malformed close for </'+cn+'>');i++;
          if(cn!==name)throw new Error('mismatched close tag: <'+name+'> vs </'+cn+'>');
          const result={};
          Object.assign(result,attrs);
          if(Object.keys(kids).length===0){
            return [name,result,text.trim()?text.trim():null];
          }else{
            for(const k in kids)result[k]=kids[k][0];
            if(text.trim())result['#text']=text.trim();
            return [name,result,null];
          }
        } else {
          // child node
          const [cn,cv,ct]=parseNode();
          if(!kids[cn])kids[cn]=[];
          // merge attr object with value
          let val;
          if(ct!==null&&ct!==undefined){val=ct;}
          else{val=cv;}
          if(cv&&typeof cv==='object'){Object.assign(val===cv?val:{},{});}
          // simple model: value is child object, or text if scalar
          if(ct!==null){ /* text-only child */ }
          if(Object.keys(cv||{}).length>0||Array.isArray(kids[cn])){
            val=cv;
            if(ct!==null&&ct!==undefined&&!Array.isArray(ct))val.__text=ct; // rare mixed
          }else{
            val=ct;
          }
          kids[cn].push(val);
          continue;
        }
      }
      text+=xml[i++];
    }
    throw new Error('unexpected EOF in <'+name+'>');
  }
  // top-level: parse single root
  skipWs();
  const [rn,rv,rt]=parseNode();
  const root={};
  if(rt!==null&&rt!==undefined)root[rn]=rt;
  else root[rn]=rv;
  skipWs();
  if(i<xml.length)throw new Error('trailing content after root element');
  return root;
}
function routeXml2json(u,res,json,body){
  try{
    const xml=u.searchParams.get('xml')||(body&&body.xml);
    if(!xml)return json(res,400,{error:'provide ?xml=<xml string> or POST {"xml": "..."}'});
    const out=xml2json(String(xml));
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'xml2json failure: '+e.message});}
}
module.exports={routeXml2json};
