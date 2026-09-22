// Semver parser: /semver?v=1.2.3 — parse, compare (/semver?a=...&b=...), satisfies range
function parseSemver(v){
  const m=String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if(!m)return null;
  return {major:+m[1],minor:+m[2],patch:+m[3],prerelease:m[4]||null,build:m[5]||null};
}
function compare(a,b){
  const A=parseSemver(a),B=parseSemver(b);
  if(!A||!B)throw new Error('invalid semver');
  for(const k of ['major','minor','patch']){
    if(A[k]!==B[k])return A[k]<B[k]?-1:1;
  }
  // prerelease rules: version without prerelease > with prerelease
  if(A.prerelease&&!B.prerelease)return -1;
  if(!A.prerelease&&B.prerelease)return 1;
  if(A.prerelease&&B.prerelease){
    const pa=A.prerelease.split('.'),pb=B.prerelease.split('.');
    for(let i=0;i<Math.max(pa.length,pb.length);i++){
      const x=pa[i],y=pb[i];
      if(x===undefined)return -1;
      if(y===undefined)return 1;
      const nx=/^\d+$/.test(x),ny=/^\d+$/.test(y);
      if(nx&&ny){if(+x!==+y)return +x<+y?-1:1;}
      else if(nx)return -1;
      else if(ny)return 1;
      else if(x!==y)return x<y?-1:1;
    }
  }
  return 0;
}
function routeSemver(u,res,json){
  try{
    const v=u.searchParams.get('v');
    const a=u.searchParams.get('a'),b=u.searchParams.get('b');
    if(a&&b){
      let cmp;
      try{cmp=compare(a,b);}catch(e){return json(res,400,{error:e.message});}
      return json(res,200,{a,b,comparison:cmp===0?'equal':cmp<0?'a<b':'a>b'});
    }
    if(!v)return json(res,400,{error:'provide ?v=<semver> or ?a=<v1>&b=<v2>'});
    const p=parseSemver(v);
    if(!p)return json(res,400,{error:'invalid semver. Expected MAJOR.MINOR.PATCH[-prerelease][+build]'});
    return json(res,200,{version:v,parsed:p,valid:true});
  }catch(e){return json(res,500,{error:'semver failure: '+e.message});}
}
module.exports={routeSemver,parseSemver,compare};
