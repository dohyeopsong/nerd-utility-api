// /swift — SWIFT/BIC code validator (ISO 9362)
function routeSwift(u, res, json) {
  const p = u.searchParams;
  const code = (p.get('swift') || p.get('bic') || p.get('code') || '').trim().toUpperCase();
  if (!code) return json(res, 200, { usage: '?swift=<BIC> — e.g. DEUTDEFF500' });
  const m = code.match(/^([A-Z]{4})([A-Z]{2})([A-Z0-9]{2})([A-Z0-9]{3})?$/);
  if (!m) {
    return json(res, 422, { error: 'invalid SWIFT/BIC: expected 8 or 11 chars — 4 letters bank, 2 letters country, 2 alnum location, optional 3 alnum branch', input: code });
  }
  const [_, bank, country, location, branch] = m;
  const iso2 = ['AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'];
  return json(res, 200, {
    input: code,
    valid: iso2.includes(country),
    bank_code: bank,
    country: country,
    country_name_valid: iso2.includes(country),
    location_code: location,
    branch_code: branch || null,
    length: code.length,
    type: code.length === 8 ? 'primary office (BIC8)' : 'branch office (BIC11)',
    passive_participant: location[1] === '0',
    reverse_test_pending: location[1] === '1'
  });
}
module.exports = { routeSwift };
