// /airport — IATA/ICAO airport code lookup (major world airports)
const AIRPORTS = [
  ['ATL','KATL','Hartsfield–Jackson Atlanta International','Atlanta','US',33.6407,-84.4277],
  ['LAX','KLAX','Los Angeles International','Los Angeles','US',33.9416,-118.4085],
  ['ORD','KORD','O\'Hare International','Chicago','US',41.9742,-87.9073],
  ['DFW','KDFW','Dallas/Fort Worth International','Dallas','US',32.8998,-97.0403],
  ['JFK','KJFK','John F. Kennedy International','New York','US',40.6413,-73.7781],
  ['SFO','KSFO','San Francisco International','San Francisco','US',37.6213,-122.379],
  ['SEA','KSEA','Seattle–Tacoma International','Seattle','US',47.4502,-122.3088],
  ['MIA','KMIA','Miami International','Miami','US',25.7959,-80.287],
  ['YYZ','CYYZ','Toronto Pearson International','Toronto','CA',43.6777,-79.6248],
  ['YVR','CYVR','Vancouver International','Vancouver','CA',49.1967,-123.1815],
  ['MEX','MMMX','Mexico City International','Mexico City','MX',19.4363,-99.0721],
  ['GRU','SBGR','São Paulo/Guarulhos International','São Paulo','BR',-23.4356,-46.4731],
  ['EZE','SAEZ','Ministro Pistarini International','Buenos Aires','AR',-34.8222,-58.5358],
  ['BOG','SKBO','El Dorado International','Bogotá','CO',4.7016,-74.1469],
  ['LHR','EGLL','Heathrow','London','GB',51.4700,-0.4543],
  ['LGW','EGKK','Gatwick','London','GB',51.1537,-0.1821],
  ['CDG','LFPG','Charles de Gaulle','Paris','FR',49.0097,2.5479],
  ['ORY','LFPO','Orly','Paris','FR',48.7233,2.3794],
  ['AMS','EHAM','Schiphol','Amsterdam','NL',52.3105,4.7683],
  ['FRA','EDDF','Frankfurt am Main','Frankfurt','DE',50.0379,8.5622],
  ['MUC','EDDM','Munich','Munich','DE',48.3538,11.7861],
  ['BER','EDDB','Berlin Brandenburg','Berlin','DE',52.3667,13.5033],
  ['MAD','LEMD','Adolfo Suárez Barajas','Madrid','ES',40.4983,-3.5676],
  ['BCN','LEBL','Barcelona El Prat','Barcelona','ES',41.2974,2.0833],
  ['FCO','LIRF','Leonardo da Vinci Fiumicino','Rome','IT',41.8003,12.2389],
  ['MXP','LIMC','Milan Malpensa','Milan','IT',45.6306,8.7281],
  ['ZRH','LSZH','Zurich','Zurich','CH',47.4647,8.5492],
  ['IST','LTFM','Istanbul Airport','Istanbul','TR',41.2753,28.7519],
  ['SVO','UUEE','Sheremetyevo International','Moscow','RU',55.9726,37.4146],
  ['CPH','EKCH','Copenhagen','Copenhagen','DK',55.6180,12.6560],
  ['ARN','ESSA','Stockholm Arlanda','Stockholm','SE',59.6519,17.9186],
  ['OSL','ENGM','Oslo Gardermoen','Oslo','NO',60.1976,11.1004],
  ['HEL','EFHK','Helsinki-Vantaa','Helsinki','FI',60.3172,24.9633],
  ['DXB','OMDB','Dubai International','Dubai','AE',25.2532,55.3657],
  ['DOH','OTHH','Hamad International','Doha','QA',25.2731,51.6081],
  ['TLV','LLBG','Ben Gurion','Tel Aviv','IL',32.0114,34.8867],
  ['JNB','FAOR','O. R. Tambo International','Johannesburg','ZA',-26.1392,28.246],
  ['CPT','FACT','Cape Town International','Cape Town','ZA',-33.9689,18.6017],
  ['CAI','HECA','Cairo International','Cairo','EG',30.1219,31.4056],
  ['LOS','DNMM','Murtala Muhammed','Lagos','NG',6.5774,3.3212],
  ['NBO','HKJK','Jomo Kenyatta International','Nairobi','KE',-1.3192,36.9278],
  ['DEL','VIDP','Indira Gandhi International','Delhi','IN',28.5562,77.1000],
  ['BOM','VABB','Chhatrapati Shivaji Maharaj International','Mumbai','IN',19.0887,72.8679],
  ['BLR','VOBL','Kempegowda International','Bengaluru','IN',13.1986,77.7066],
  ['SIN','WSSS','Singapore Changi','Singapore','SG',1.3644,103.9915],
  ['BKK','VTBS','Suvarnabhumi','Bangkok','TH',13.6900,100.7501],
  ['KUL','WMKK','Kuala Lumpur International','Kuala Lumpur','MY',2.7456,101.7099],
  ['HKG','VHHH','Hong Kong International','Hong Kong','HK',22.3080,113.9185],
  ['PVG','ZSPD','Shanghai Pudong','Shanghai','CN',31.1443,121.8083],
  ['PEK','ZBAA','Beijing Capital','Beijing','CN',40.0799,116.6031],
  ['NRT','RJAA','Narita International','Tokyo','JP',35.7647,140.3863],
  ['HND','RJTT','Haneda','Tokyo','JP',35.5494,139.7798],
  ['ICN','RKSI','Incheon International','Seoul','KR',37.4602,126.4407],
  ['SYD','YSSY','Sydney Kingsford Smith','Sydney','AU',-33.9399,151.1753],
  ['MEL','YMML','Melbourne','Melbourne','AU',-37.6690,144.8410],
  ['AKL','NZAA','Auckland','Auckland','NZ',-37.0082,174.7850],
];

function routeAirport(u, res, json) {
  const p = u.searchParams;
  const q = (p.get('code') || p.get('q') || '').trim().toUpperCase();
  if (!q) return json(res, 200, {
    usage: '?code=LHR or ?code=EGLL — IATA or ICAO lookup. ?country=JP or ?city=London to list.',
    total: AIRPORTS.length,
  });
  const found = AIRPORTS.filter(a => a[0] === q || a[1] === q);
  if (found.length) return json(res, 200, found.map(a => ({ iata: a[0], icao: a[1], name: a[2], city: a[3], country: a[4], latitude: a[5], longitude: a[6] })));
  if (p.get('country')) return json(res, 200, AIRPORTS.filter(a => a[4] === q).map(a => ({ iata: a[0], icao: a[1], name: a[2], city: a[3], country: a[4], latitude: a[5], longitude: a[6] })));
  // partial name/city match
  const partial = AIRPORTS.filter(a => a[2].toUpperCase().includes(q) || a[3].toUpperCase().includes(q));
  if (partial.length) return json(res, 200, partial.map(a => ({ iata: a[0], icao: a[1], name: a[2], city: a[3], country: a[4], latitude: a[5], longitude: a[6] })));
  return json(res, 404, { error: 'no airport found', query: q });
}
module.exports = { routeAirport };
