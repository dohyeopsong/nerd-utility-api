// Subnet calculator: /subnet?cidr=192.168.1.0/24 — network, broadcast, range, mask, class
function ipToInt(ip){
  const p=ip.split('.').map(Number);
  if(p.length!==4||p.some(x=>isNaN(x)||x<0||x>255))return null;
  return ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
}
function intToIp(n){
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}
function routeSubnet(u,res,json){
  try{
    const cidr=u.searchParams.get('cidr')||u.searchParams.get('c');
    if(!cidr)return json(res,400,{error:'provide ?cidr=<ip>/<prefix>, e.g. 192.168.1.0/24'});
    const [ip,pre] = cidr.split('/');
    const prefix=pre===undefined?32:+pre;
    if(!ipToInt(ip))return json(res,400,{error:'invalid IPv4 address'});
    if(!Number.isInteger(prefix)||prefix<0||prefix>32)return json(res,400,{error:'invalid prefix (0-32)'});
    const mask=prefix===0?0:(0xFFFFFFFF<<(32-prefix))>>>0;
    const net=(ipToInt(ip)&mask)>>>0;
    const bcast=(net|(~mask>>>0))>>>0;
    const hosts=prefix>=31?(prefix===32?1:2):Math.pow(2,32-prefix)-2;
    const first=prefix>=31?net:net+1;
    const last=prefix>=31?bcast:bcast-1;
    return json(res,200,{
      cidr,
      networkAddress:intToIp(net),
      broadcastAddress:intToIp(bcast),
      subnetMask:intToIp(mask),
      wildcardMask:intToIp(~mask>>>0),
      prefix,
      hostBits:32-prefix,
      totalAddresses:Math.pow(2,32-prefix),
      usableHosts:hosts,
      firstHost:intToIp(first),
      lastHost:intToIp(last),
      ipClass:(ipToInt(ip)>>>24)<128?'A':(ipToInt(ip)>>>24)<192?'B':(ipToInt(ip)>>>24)<224?'C':'D/E',
      isPrivate:/^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip),
      binaryMask:mask.toString(2).padStart(32,'0').replace(/(.{8})(?=.)/g,'$1.')
    });
  }catch(e){return json(res,500,{error:'subnet failure: '+e.message});}
}
module.exports={routeSubnet,ipToInt,intToIp};
