// Subnet calculator: /subnet?cidr=192.168.1.0/24 — network, broadcast, first/last host, mask, wildcard, class, total/usable hosts
function ipToInt(ip){
  const p=ip.split('.');
  if(p.length!==4)throw new Error('IPv4 must have 4 octets');
  let n=0;
  for(const o of p){
    if(!/^\d{1,3}$/.test(o)||+o>255)throw new Error('invalid octet "'+o+'"');
    n=(n<<8)+ +o;
  }
  return n>>>0;
}
function intToIp(n){
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}
function routeSubnet(u,res,json,body){
  try{
    let cidr=u.searchParams.get('cidr')||u.searchParams.get('ip');
    if(!cidr&&body&&typeof body==='object'&&(body.cidr||body.ip))cidr=body.cidr||body.ip;
    if(!cidr)return json(res,400,{error:'provide ?cidr=<ip>/<prefix> e.g. 192.168.1.0/24'});
    const m=cidr.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/);
    if(!m)throw new Error('invalid CIDR format');
    const ip=m[1];
    let prefix=m[2]!==undefined?parseInt(m[2],10):null;
    const ipInt=ipToInt(ip);
    let mask,ipClass;
    const first=ipInt>>>24;
    if(first<128)ipClass='A';
    else if(first<192)ipClass='B';
    else if(first<224)ipClass='C';
    else if(first<240)ipClass='D (multicast)';
    else ipClass='E (reserved)';
    const result={ip,cidr:prefix!==null?cidr:ip+'/?',class:ipClass};
    if(prefix!==null){
      if(prefix<0||prefix>32)throw new Error('prefix must be 0-32');
      mask=prefix===0?0:(0xFFFFFFFF<<(32-prefix))>>>0;
      const network=(ipInt&mask)>>>0;
      const broadcast=(network|(~mask>>>0))>>>0;
      const total=prefix===32?1:Math.pow(2,32-prefix);
      const usable=prefix>=31?(prefix===31?2:1):total-2;
      const firstHost=prefix>=31?network:network+1;
      const lastHost=prefix>=31?broadcast:broadcast-1;
      Object.assign(result,{
        prefix,mask:intToIp(mask),wildcard:intToIp(~mask>>>0),
        network:intToIp(network),broadcast:intToIp(broadcast),
        firstHost:prefix>=31?null:intToIp(firstHost),
        lastHost:prefix>=31?null:intToIp(lastHost),
        totalHosts:total,usableHosts:usable,
        isPrivate:(first===10)||(first===172&&(ipInt>>>16&255)>=16&&(ipInt>>>16&255)<=31)||(first===192&&(ipInt>>>16&255)===168),
        binaryMask:mask.toString(2).padStart(32,'0'),
      });
    }
    return json(res,200,result);
  }catch(e){return json(res,400,{error:'subnet failure: '+e.message});}
}
module.exports={routeSubnet};
