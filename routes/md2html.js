// Markdown to HTML: /md2html?text=<md> or POST body {"text":...} — headings, bold, italic, code, lists, links, blockquotes
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function mdToHtml(md){
  const lines=md.replace(/\r\n/g,'\n').split('\n');
  const out=[];let inCode=false,inList=null;let para=[];
  const flushPara=()=>{if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}};
  const inline=(t)=>{
    t=esc(t);
    t=t.replace(/`([^`]+)`/g,'<code>$1</code>');
    t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    t=t.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
    return t;
  };
  for(const line of lines){
    if(/^```/.test(line)){flushPara();out.push(inCode?'`</pre>`'.replace(/`/g,'')+'</code></pre>':'<pre><code>');inCode=!inCode;continue;}
    if(inCode){out.push(esc(line));continue;}
    const h=line.match(/^(#{1,6})\s+(.*)/);
    if(h){flushPara();out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);continue;}
    if(/^>\s?/.test(line)){flushPara();out.push('<blockquote>'+inline(line.replace(/^>\s?/,''))+'</blockquote>');continue;}
    const ul=line.match(/^[-*]\s+(.*)/);
    const ol=line.match(/^\d+\.\s+(.*)/);
    if(ul||ol){
      flushPara();
      const type=ul?'ul':'ol';
      if(inList!==type){if(inList)out.push(`</${inList}>`);out.push(`<${type}>`);inList=type;}
      out.push('<li>'+inline((ul||ol)[1])+'</li>');
      continue;
    }
    if(/^\s*$/.test(line)){flushPara();if(inList){out.push(`</${inList}>`);inList=null;}continue;}
    if(/^(-{3,}|\*{3,})$/.test(line.trim())){flushPara();out.push('<hr>');continue;}
    para.push(line.trim());
  }
  flushPara();if(inList)out.push(`</${inList}>`);
  return out.join('\n');
}
function routeMd2html(u,res,json,body){
  try{
    let md=u.searchParams.get('text')||u.searchParams.get('md')||u.searchParams.get('t');
    if(!md&&body&&typeof body==='object'&&body.text)md=body.text;
    if(!md)return json(res,400,{error:'provide ?text=<markdown> or POST {"text":...}'});
    return json(res,200,{markdown:md,html:mdToHtml(md)});
  }catch(e){return json(res,500,{error:'md2html failure: '+e.message});}
}
module.exports={routeMd2html,mdToHtml};
