// XML to JSON: /xml2json?xml=<xml string> or POST {"xml":...} — lightweight parser, no deps
function esc(s){return String(s);}
function parseXml(xml){
  xml=xml.trim();
  // strip comments and processing instructions/xml decl
  xml=xml.replace(/<\?[\s\S]*?\?>/g,'').replace(/<!--[\s\S]*?-->/g,'');
  if(!/^<[\w:.-]+[\s\S]*<\/[\w:.-]+>$/.test(xml)&&!/^<[\w:.-]+\s*\/>$/.test(xml))throw new Error('no root element found');
  let i=0;
  function parseNode(){
    if(xml[i]==='<'){
      const tagEnd=xml.indexOf('>',i);
      if(tagEnd<0)throw new Error('unclosed tag');
      let tag=xml.slice(i+1,tagEnd);
      let selfClose=false;
      if(tag.endsWith('/')){tag=tag.slice(0,-1);selfClose=true;}
      const nameMatch=tag.match(/^[\w:.-]+/);
      if(!nameMatch)throw new Error('malformed tag');
      const name=nameMatch[0];
      const attrsRaw=tag.slice(name.length);
      const attributes={};
      const attrRe=/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let m;
      while((m=attrRe.exec(attrsRaw))!==null)attributes[m[1]]=m[3]!==undefined?m[3]:m[4];
      i=tagEnd+1;
      if(selfClose)return {[name]:{...attributes,'#text':''}};
      // parse children until closing tag
      const result={...attributes};
      let text='';
      const children=[];
      while(i<xml.length){
        if(xml[i]==='<'){
          if(xml[i+1]==='/'){
            const close=xml.indexOf('>',i);
            const closeName=xml.slice(i+2,close).trim();
            if(closeName!==name)throw new Error(`mismatched closing tag </${closeName}>, expected </${name}>`);
            i=close+1;
            // build
            const node={};
            const childNames=children.map(c=>Object.keys(c)[0]);
            for(const c of children){
              const[k,v]=Object.entries(c)[0];
              if(node[k]===undefined)node[k]=v;
              else if(Array.isArray(node[k]))node[k].push(v);
              else node[k]=[node[k],v];
            }
            const out={};
            if(Object.keys(attributes).length)out['@'+Object.keys(attributes).join(',@')]=undefined;
            const full={};
            for(const[ak,av]of Object.entries(attributes))full['@'+ak]=av;
            for(const[ck,cv]of Object.entries(node))full[ck]=cv;
            if(text.trim())full['#text']=text.trim();
            if(children.length===0&&text.trim()===''&&Object.keys(attributes).length===0&&Object.keys(node).length===0)return {[name]:text.trim()};
            if(children.length===0&&text.trim()!=='')return {[name]:text.trim()};
            return {[name]:full};
          }else{
            if(text.trim())children.push({'#text':text.trim()}),text='';
            children.push(parseNode());
          }
        }else{text+=xml[i];i++;}
      }
      throw new Error('unclosed element <'+name+'>');
    }
    throw new Error('unexpected content at position '+i);
  }
  const doc=parseNode();
  return doc;
}
function routeXml2json(u,res,json,body){
  try{
    let xml=u.searchParams.get('xml')||u.searchParams.get('x');
    if(!xml&&body&&typeof body==='object'&&(body.xml||body.input))xml=body.xml||body.input;
    if(!xml)return json(res,400,{error:'provide ?xml=<XML string> or POST {"xml":"..."}'});
    const result=parseXml(xml);
    return json(res,200,{xml:xml.slice(0,200),json:result});
  }catch(e){return json(res,400,{error:'xml2json failure: '+e.message});}
}
module.exports={routeXml2json,parseXml};
