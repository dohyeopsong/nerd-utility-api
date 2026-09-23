// /phone — E.164 phone number validation, formatting, and country/region parsing
const CC = ['1','7','20','27','28','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98','211','212','213','216','218','220','221','222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245','246','248','249','250','251','252','253','254','255','256','257','258','260','261','262','263','264','265','266','267','268','269','290','291','297','298','299','350','351','352','353','354','355','356','357','358','359','370','371','372','373','374','375','376','377','378','380','381','382','383','385','386','387','389','420','421','423','500','501','502','503','504','505','506','507','508','509','590','591','592','593','594','595','596','597','598','599','670','672','673','674','675','676','677','678','679','680','681','682','683','685','686','687','688','689','690','691','692','850','852','853','855','856','870','880','886','960','961','962','963','964','965','966','967','968','970','971','972','973','974','975','976','977','992','993','994','995','996','998'];
const CCSET = new Set(CC);
const NA = { US: 'us', CA: 'ca', AG: 'ag', AI: 'ai', AS: 'as', BB: 'bb', BM: 'bm', BS: 'bs', DO: 'do', dm: 'dm', GD: 'gd', GU: 'gu', JM: 'jm', KN: 'kn', KY: 'ky', LC: 'lc', MP: 'mp', MS: 'ms', PR: 'pr', SX: 'sx', TC: 'tc', TT: 'tt', VC: 'vc', VG: 'vg', VI: 'vi' };
function routePhone(u, res, json) {
  const p = u.searchParams;
  let num = (p.get('phone') || '').trim();
  if (!num) return json(res, 200, { usage: '?phone=+14155552671 or ?phone=14155552671&country=US — validate E.164, parse country code, format international' });
  let country = (p.get('country') || '').toUpperCase() || null;
  // strip formatting
  let plus = num.startsWith('+');
  let digits = num.replace(/\D/g, '');
  if (!digits) return json(res, 400, { error: 'no digits found' });
  const out = { input: num };
  if (!plus && digits.length <= 11 && !digits.startsWith('0')) {
    // ambiguous: treat as full intl number if it matches a country code, else national
  }
  let cc = null, rest = null;
  if (plus || digits.length > 10) {
    // longest-prefix match up to 3 digits
    for (const len of [3, 2, 1]) {
      if (digits.length > len && CCSET.has(digits.slice(0, len))) { cc = digits.slice(0, len); rest = digits.slice(len); break; }
    }
  }
  if (cc) {
    out.e164 = '+' + digits;
    out.country_code = cc;
    out.subscriber = rest;
    out.valid = digits.length >= 8 && digits.length <= 15;
    if (cc === '1' && digits.length === 11) {
      out.region = 'NANP';
      const area = digits.slice(1, 4);
      out.area_code = area;
      if (area[0] === '0' || area[0] === '1') { out.valid = false; out.note = 'invalid NANP area code'; }
    }
    if (cc === '44') out.national = '0' + rest;
    if (cc === '7') out.region = 'RU/KZ';
    return json(res, 200, out);
  }
  // national number given: require country hint
  if (!country) return json(res, 400, { ...out, error: 'no country code detected — pass ?country=US or use + prefix' });
  const map = { US: '1', GB: '44', DE: '49', FR: '33', IN: '91', BR: '55', CN: '86', JP: '81', AU: '61', CA: '1' };
  if (!map[country]) return json(res, 400, { ...out, error: `unsupported country hint: ${country}` });
  if (digits.length > 15) return json(res, 400, { ...out, error: 'too many digits' });
  out.e164 = '+' + map[country] + digits;
  out.country_code = map[country];
  out.subscriber = digits;
  out.valid = digits.length >= 6 && digits.length <= 14;
  return json(res, 200, out);
}
module.exports = { routePhone };
