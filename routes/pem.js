// PEM inspector: /pem?pem=<urlencoded PEM> — parse X.509 cert: subject, issuer, validity, key info
// Uses openssl via child_process (sandbox has it); falls back to error if missing.
const {execFile}=require('child_process');
function routePem(u,res,json,body){
  try{
    let pem=u.searchParams.get('pem')||u.searchParams.get('cert');
    if(!pem&&body&&typeof body==='object'&&(body.pem||body.cert))pem=body.pem||body.cert;
    if(!pem)return json(res,400,{error:'provide ?pem=<urlencoded PEM CERTIFICATE block>'});
    if(!pem.includes('-----BEGIN'))pem='-----BEGIN CERTIFICATE-----\n'+pem+'\n-----END CERTIFICATE-----';
    execFile('/usr/bin/openssl',['x509','-noout','-subject','-issuer','-dates','-serial','-fingerprint','-sha256','-fingerprint','-sha1'],{input:pem,timeout:8000},(err,stdout,stderr)=>{
      if(err)return json(res,400,{error:'openssl failed: '+(stderr||err.message).toString().slice(0,300)});
      const out={raw:stdout.trim().split('\n').reduce((acc,line)=>{
        const idx=line.indexOf('=');
        if(idx>0)acc[line.slice(0,idx).trim()]=line.slice(idx+1).trim();
        return acc;},{})};
      const m=pem.match(/-----BEGIN ([A-Z ]+)-----/);
      out.blockType=m?m[1]:'UNKNOWN';
      return json(res,200,out);
    });
  }catch(e){return json(res,400,{error:'pem failure: '+e.message});}
}
module.exports={routePem};
