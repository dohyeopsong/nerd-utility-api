// Subnet calculator: /subnet?cidr=192.168.1.0/24 — range, mask, broadcast, host count
function ipToInt(ip){
  const p=ip.split('.').map(Number);
  if(p.length!==4||p.some(n=>isNaN(n)||n<0||n>255))return null;
  return ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
}
function intToIp(n){
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
}
function routeSubnet(u,res,json){
  try{
    const cidr=(u.searchParams.get('cidr')||'').trim();
    if(!cidr)return json(res,400,{error:'provide ?cidr=<ip>/<bits> e.g. 192.168.1.0/24'});
    const m=cidr.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if(!m)return json(res,400,{error:'invalid CIDR format'});
    const ip=m[1],bits=+m[2];
    if(bits<0||bits>32)return json(res,400,{error:'prefix must be 0-32'});
    const base=ipToInt(ip);
    if(base===null)return json(res,400,{error:'invalid IP address'});
    const mask=bits===0?0:(0xFFFFFFFF<<(32-bits))>>>0;
    const network=(base&mask)>>>0;
    const broadcast=(network|(~mask>>>0))>>>0;
    const hosts=bits>=31?(bits===32?1:2):Math.pow(2,32-bits)-2;
    return json(res,200,{
      cidr,ip,prefixBits:bits,
      subnetMask:intToIp(mask),
      wildcardMask:intToIp(~mask>>>0),
      network:intToIp(network),
      broadcast:intToIp(broadcast),
      firstHost:bits>=31?intToIp(network):intToIp(network+1),
      lastHost:bits>=31?intToIp(broadcast):intToIp(broadcast-1),
      hostCount:hosts,
      totalAddresses:Math.pow(2,32-bits),
      ipClass:base<ipToInt('128.0.0.0')?'A':base<ipToInt('192.0.0.0')?'B':base<ipToInt('224.0.0.0')?'C':'D/E',
      isPrivate:/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(ip)
    });
  }catch(e){return json(res,500,{error:'subnet failure: '+e.message});}
}
module.exports={routeSubnet,ipToInt,intToIp};
