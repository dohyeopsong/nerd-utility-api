// Semver utility: /semver?version=1.2.3&compare=1.10.0
// Parses, validates, compares semantic versions (semver.org spec, no build metadata in compare).
const RE=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function parse(v){
  const m=String(v).trim().match(RE);
  if(!m)return null;
  return {major:+m[1],minor:+m[2],patch:+m[3],prerelease:m[4]?m[4].split('.'):null,build:m[5]||null,raw:v};
}
function cmpIdent(a,b){
  const an=/^\d+$/.test(a),bn=/^\d+$/.test(b);
  if(an&&bn)return (a.length>b.length?(+a>(+b?+b:0)?1:0):0)||((+a)-(+b)||String(a).length-String(b).length); // numeric compare
  if(an)return -1; // numeric < alphanumeric
  if(bn)return 1;
  return a<b?-1:a>b?1:0;
}
function compare(a,b){
  if(a.major!==b.major)return a.major-b.major;
  if(a.minor!==b.minor)return a.minor-b.minor;
  if(a.patch!==b.patch)return a.patch-b.patch;
  const pa=a.prerelease||[],pb=b.prerelease||[];
  if(pa.length===0&&pb.length===0)return 0;
  if(pa.length===0)return 1;      // release > prerelease
  if(pb.length===0)return -1;
  for(let k=0;k<Math.max(pa.length,pb.length);k++){
    if(k>=pa.length)return -1;
    if(k>=pb.length)return 1;
    const c=cmpIdent(pa[k],pb[k]);
    if(c!==0)return c;
  }
  return 0;
}
function routeSemver(u,res,json,body){
  try{
    const v=u.searchParams.get('version')||(body&&body.version);
    if(!v)return json(res,400,{error:'provide ?version=1.2.3 (optionally &compare=2.0.0)'});
    const a=parse(v);
    if(!a)return json(res,400,{error:'invalid semantic version',got:v,see:'https://semver.org'});
    const out={version:v,major:a.major,minor:a.minor,patch:a.patch,
      prerelease:a.prerelease?a.prerelease.join('.'):null,
      build:a.build,isPrerelease:!!a.prerelease};
    const c=u.searchParams.get('compare')||(body&&body.compare);
    if(c){
      const b=parse(c);
      if(!b)return json(res,400,{error:'invalid compare version',got:c});
      const r=compare(a,b);
      out.compare={other:c,result:r===0?'equal':r>0?'greater':'less',satisfiesGte:r>=0};
    }
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'semver failure: '+e.message});}
}
module.exports={routeSemver,parse:parse,compare};
