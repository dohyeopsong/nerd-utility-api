// PEM inspector: /pem?input=<pem block> or POST — parse cert/key type, validity, subject/issuer if parseable
function routePem(u,res,json,body){
  try{
    let pem=u.searchParams.get('input')||u.searchParams.get('pem')||u.searchParams.get('p');
    if(!pem&&body&&typeof body==='object'&&(body.input||body.pem))pem=body.input||body.pem;
    if(!pem)return json(res,400,{error:'provide ?input=<PEM block>'});
    pem=pem.replace(/\\n/g,'\n').trim();
    const label=(pem.match(/-----BEGIN ([A-Z0-9 ]+)-----/)||[])[1];
    const end=(pem.match(/-----END ([A-Z0-9 ]+)-----/)||[])[1];
    if(!label)return json(res,400,{error:'no PEM header found (-----BEGIN ...-----)'});
    const b64=pem.replace(/-----[A-Z]+ [A-Z0-9 ]+-----/g,'').replace(/\s+/g,'');
    if(!/^[A-Za-z0-9+/=]+$/.test(b64))return json(res,400,{error:'invalid base64 body'});
    const buf=Buffer.from(b64,'base64');
    // DER header peek
    let derInfo={};
    if(buf.length>2&&buf[0]===0x30){
      derInfo={derFirstByte:'0x'+buf[0].toString(16),lengthByte:buf[1]&0x7f};
    }
    return json(res,200,{
      type:label,
      matchedEnd:end===label,
      base64Length:b64.length,
      derBytes:buf.length,
      ...derInfo,
      isCertificate:/CERTIFICATE/.test(label),
      isPrivateKey:/PRIVATE KEY/.test(label),
      isCSR:/CERTIFICATE REQUEST/.test(label),
      fingerprint:{
        sha256:require('crypto').createHash('sha256').update(buf).digest('hex'),
        md5:require('crypto').createHash('md5').update(buf).digest('hex')
      }
    });
  }catch(e){return json(res,500,{error:'pem failure: '+e.message});}
}
module.exports={routePem};
