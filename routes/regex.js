// Regex tester: /regex?pattern=\d+&text=abc123 — match all, groups, named groups, with timeout guard
function routeRegex(u,res,json,body){
  try{
    let pattern=u.searchParams.get('pattern')||u.searchParams.get('p')||u.searchParams.get('regex');
    let text=u.searchParams.get('text')||u.searchParams.get('t');
    let flags=u.searchParams.get('flags')||u.searchParams.get('f')||'g';
    if(!pattern&&body&&typeof body==='object'){pattern=body.pattern||body.p;text=body.text||body.t;flags=body.flags||'g';}
    if(pattern===undefined||pattern===null||pattern==='')return json(res,400,{error:'provide ?pattern=<regex>&text=<input> (&flags= e.g. "gi")'});
    if(text===undefined||text===null||text==='')text='';
    let re;
    try{re=new RegExp(pattern,flags.includes('g')?flags:flags);}
    catch(e){return json(res,400,{error:'invalid regex: '+e.message});}
    const matches=[];
    const global=re.global;
    const deadline=Date.now()+500; // 500ms guard
    if(global){
      let m,guard=0;
      while((m=re.exec(text))!==null){
        if(m[0]===''&&m.index===re.lastIndex)re.lastIndex++;
        matches.push({match:m[0],index:m.index,groups:m.slice(1),named:m.groups||null});
        if(++guard>1000||Date.now()>deadline)break;
      }
    }else{
      const m=re.exec(text);
      if(m)matches.push({match:m[0],index:m.index,groups:m.slice(1),named:m.groups||null});
    }
    return json(res,200,{pattern,flags,test:matches.length>0,matchCount:matches.length,matches:matches.slice(0,100),inputPreview:text.slice(0,500)});
  }catch(e){return json(res,400,{error:'regex failure: '+e.message});}
}
module.exports={routeRegex};
