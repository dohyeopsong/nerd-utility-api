// Markdown → HTML: /md?md=<urlencoded markdown> — headings, bold, italic, code, links, lists, quotes (no deps, escape-first)
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function inlineMd(s){
  s=s.replace(/`([^`]+)`/g,(m,c)=>'<code>'+c+'</code>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g,'$1<em>$2</em>');
  s=s.replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g,'$1<em>$2</em>');
  s=s.replace(/~~([^~]+)~~/g,'<del>$1</del>');
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" rel="noopener">$1</a>');
  return s;
}
function mdToHtml(md){
  const lines=md.replace(/\r\n/g,'\n').split('\n');
  const out=[];
  let inCode=false,codeBuf=[],listType=null,paraBuf=[];
  const flushPara=()=>{if(paraBuf.length){out.push('<p>'+inlineMd(paraBuf.join(' '))+'</p>');paraBuf=[];}};
  const closeList=()=>{if(listType){out.push(listType==='ul'?'</ul>':'</ol>');listType=null;}};
  for(const raw of lines){
    if(raw.trim().startsWith('```')){
      if(inCode){out.push('<pre><code>'+escapeHtml(codeBuf.join('\n'))+'</code></pre>');codeBuf=[];inCode=false;}
      else{flushPara();closeList();inCode=true;}
      continue;
    }
    if(inCode){codeBuf.push(raw);continue;}
    const line=raw;
    const h=line.match(/^(#{1,6})\s+(.*)/);
    if(h){flushPara();closeList();out.push(`<h${h[1].length}>`+inlineMd(escapeHtml(h[2]))+`</h${h[1].length}>`);continue;}
    if(/^\s*(-{3,}|\*{3,})\s*$/.test(line)){flushPara();closeList();out.push('<hr>');continue;}
    const q=line.match(/^>\s?(.*)/);
    if(q){flushPara();closeList();out.push('<blockquote>'+inlineMd(escapeHtml(q[1]))+'</blockquote>');continue;}
    const ul=line.match(/^\s*[-*+]\s+(.*)/);
    const ol=line.match(/^\s*\d+[.)]\s+(.*)/);
    if(ul||ol){
      flushPara();
      const t=ul?'ul':'ol';
      if(listType!==t){closeList();out.push(t==='ul'?'<ul>':'<ol>');listType=t;}
      out.push('<li>'+inlineMd(escapeHtml((ul||ol)[1]))+'</li>');
      continue;
    }
    closeList();
    if(line.trim()===''){flushPara();continue;}
    paraBuf.push(escapeHtml(line.trim()));
  }
  if(inCode)out.push('<pre><code>'+escapeHtml(codeBuf.join('\n'))+'</code></pre>');
  flushPara();closeList();
  return out.join('\n');
}
function routeMd(u,res,json,body){
  try{
    let md=u.searchParams.get('md')||u.searchParams.get('markdown')||u.searchParams.get('text');
    if(!md&&body&&typeof body==='object'&&(body.md||body.markdown))md=body.md||body.markdown;
    if(!md)return json(res,400,{error:'provide ?md=<urlencoded markdown>'});
    if(md.length>100000)return json(res,413,{error:'markdown too large (100KB max)'});
    return json(res,200,{markdown:md.slice(0,200),html:mdToHtml(md)});
  }catch(e){return json(res,400,{error:'md failure: '+e.message});}
}
module.exports={routeMd};
