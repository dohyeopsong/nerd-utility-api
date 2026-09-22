// IPv4 subnet calculator: /subnet?cidr=192.168.1.0/24
// Returns network, broadcast, first/last host, mask, wildcard, host count, class, private/public.
function ip2int(ip){
  const p=ip.split('.').map(Number);
  if(p.length!==4||p.some(x=>isNaN(x)||x<0||x>255))return null;
  return ((p[0]<<24)>>>0)+(p[1]<<16)+(p[2]<<8)+p[3];
}
function int2ip(n){
  return [n>>>24&255,n>>>16&255,n>>>8&255,n&255].join('.');
}
function routeSubnet(u,res,json,body){
  try{
    const cidr=u.searchParams.get('cidr')||(body&&body.cidr);
    if(!cidr)return json(res,400,{error:'provide ?cidr=<ip>/<prefix> e.g. 192.168.1.0/24'});
    const m=String(cidr).match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if(!m)return json(res,400,{error:'invalid CIDR format, expected a.b.c.d/prefix'});
    const prefix=parseInt(m[2]);
    if(prefix<0||prefix>32)return json(res,400,{error:'prefix must be 0-32'});
    const ipInt=ip2int(m[1]);
    if(ipInt===null)return json(res,400,{error:'invalid IP address'});
    const maskInt=prefix===0?0:(0xFFFFFFFF<<(32-prefix))>>>0;
    const netInt=(ipInt&maskInt)>>>0;
    const bcastInt=(netInt|(~maskInt>>>0))>>>0;
    const hosts=prefix>=31?(prefix===32?1:2):(bcastInt-netInt-1);
    const first=prefix>=31?int2ip(netInt):int2ip(netInt+1);
    const last=prefix>=31?int2ip(bcastInt):int2ip(bcastInt-1);
    const o1=m[1].split('.')[0];
    const cls=o1<128?'A':o1<192?'B':o1<224?'C':o1<240?'D':'E';
    const priv=/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(m[1])||prefix===32&&o1==='127';
    return json(res,200,{
      cidr:m[0],
      network:prefix===0?'0.0.0.0':int2ip(netInt),
      broadcast:prefix<=30?int2ip(bcastInt):null,
      netmask:int2ip(maskInt),
      wildcard:int2ip((~maskInt)>>>0),
      prefix,
      hostBits:32-prefix,
      totalAddresses:Math.pow(2,32-prefix),
      usableHosts:hosts,
      firstHost:first,
      lastHost:last,
      ipClass:cls,
      isPrivate:priv,
    });
  }catch(e){return json(res,400,{error:'subnet failure: '+e.message});}
}
module.exports={routeSubnet};
