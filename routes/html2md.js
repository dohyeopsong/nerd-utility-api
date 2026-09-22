// HTML → Markdown: /html2md?html=<urlencoded html> — headings, bold/italic, links, lists, code, blockquotes (no deps)
function decodeEntities(s){
  return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
}
function escMd(s){return s.replace(/([\\`*_{}[\]()#+!~|>~-])/g,'\\$1');}
function html2md(html){
  let out=html;
  // remove script/style/comments
  out=out.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  // pre/code blocks
  out=out.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,(m,c)=>'\n```\n'+decodeEntities(c).trim()+'\n```\n\n');
  // headings
  out=out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,(m,l,c)=>'\n'+'#'.repeat(+l)+' '+c.trim()+'\n\n');
  // hr, br
  out=out.replace(/<hr[^>]*>/gi,'\n---\n\n').replace(/<br\s*\/?>/gi,'\n');
  // blockquote
  out=out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,(m,c)=>'\n'+c.trim().split('\n').map(l=>'> '+l.trim()).join('\n')+'\n\n');
  // inline styles
  out=out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi,(m,t,c)=>'**'+c.trim()+'**');
  out=out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi,(m,t,c)=>'*'+c.trim()+'*');
  out=out.replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/\1>/gi,(m,t,c)=>'~~'+c.trim()+'~~');
  out=out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi,(m,c)=>'`'+decodeEntities(c.trim())+'`');
  // links & images
  out=out.replace(/<a[^>]*href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,(m,h,t)=>'['+t.trim()+']('+h+')');
  out=out.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,(m,s,a)=>'!['+a+']('+s+')');
  // lists (ul/ol)
  out=out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,(m,c)=>{c=c.replace(/\n+/g,' ').trim();return '\n- '+c;});
  out=out.replace(/<\/?[uo]l[^>]*>/gi,'\n');
  // tables -> keep cell text pipe-separated
  out=out.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi,(m,c)=>'| '+c.replace(/\s+/g,' ').trim()+' ');
  out=out.replace(/<\/tr>/gi,'|\n');
  // paragraphs
  out=out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,(m,c)=>'\n'+c.trim()+'\n\n');
  // strip remaining tags
  out=out.replace(/<[^>]+>/g,'');
  out=decodeEntities(out);
  // collapse whitespace
  out=out.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  return out;
}
function routeHtml2md(u,res,json,body){
  try{
    let html=u.searchParams.get('html')||u.searchParams.get('h');
    if(!html&&body&&typeof body==='object'&&(body.html||body.markdown))html=body.html;
    if(!html)return json(res,400,{error:'provide ?html=<urlencoded html>'});
    if(html.length>100000)return json(res,413,{error:'html too large (100KB max)'});
    return json(res,200,{inputPreview:html.slice(0,200),markdown:html2md(html)});
  }catch(e){return json(res,400,{error:'html2md failure: '+e.message});}
}
module.exports={routeHtml2md};
