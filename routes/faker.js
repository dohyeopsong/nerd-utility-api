// /faker — generate realistic mock data for testing (names, emails, addresses, etc.)
const crypto = require('crypto');
const ri = (n) => crypto.randomInt(0, n);
const pick = (arr) => arr[ri(arr.length)];

const FIRST = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Emma','Liam','Olivia','Noah','Ava','Ethan','Sophia','Mason','Isabella','Lucas','Mia','Oliver','Amelia','Elijah','Harper','Mateo','Camila','Santiago','Valentina','Yuki','Hana','Kenji','Aiko','Wei','Mei','Arjun','Priya','Fatima','Omar'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts'];
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','hotmail.com','example.com','proton.me','icloud.com','mail.com','fastmail.com','company.io'];
const STREETS = ['Main St','Oak Ave','Maple Rd','Cedar Ln','Elm Dr','Washington Blvd','Park Ave','Lake View Dr','Hillcrest Rd','Sunset Blvd','River Rd','Pine St','Willow Ave','Birch Ln','Harbor Dr'];
const CITIES = [['New York','NY'],['Los Angeles','CA'],['Chicago','IL'],['Houston','TX'],['Phoenix','AZ'],['Philadelphia','PA'],['San Antonio','TX'],['San Diego','CA'],['Dallas','TX'],['Austin','TX'],['Seattle','WA'],['Denver','CO'],['Boston','MA'],['Portland','OR'],['Nashville','TN'],['Atlanta','GA'],['Miami','FL']];
const COMPANIES = ['Acme','Globex','Initech','Umbrella','Stark Industries','Wayne Enterprises','Hooli','Pied Piper','Massive Dynamic','Soylent','Wonka','Duff','Cyberdyne','Tyrell','Aperture','Virtucon'];
const JOBS = ['Engineer','Designer','Manager','Analyst','Developer','Consultant','Architect','Coordinator','Specialist','Director','Technician','Planner','Scientist','Administrator','Researcher'];
const WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua'];

const digits = (n) => { let s = ''; for (let i = 0; i < n; i++) s += ri(10); return s; };

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ''); }

const G = {
  person: () => { const f = pick(FIRST), l = pick(LAST); return { first: f, last: l, full: `${f} ${l}`, email: `${slug(f)}.${slug(l)}${ri(99)}@${pick(DOMAINS)}`, phone: `+1-${digits(3)}-${digits(3)}-${digits(4)}` }; },
  name: () => { const f = pick(FIRST), l = pick(LAST); return `${f} ${l}`; },
  email: () => `${slug(pick(FIRST))}.${slug(pick(LAST))}${ri(999)}@${pick(DOMAINS)}`,
  phone: () => `+1-${digits(3)}-${digits(3)}-${digits(4)}`,
  address: () => { const [city, st] = pick(CITIES); return { street: `${ri(9000) + 1} ${pick(STREETS)}`, city, state: st, zip: digits(5), country: 'USA' }; },
  company: () => `${pick(COMPANIES)} ${pick(['Inc','LLC','Corp','Co','Ltd','Group','Labs'])}`,
  job: () => `${pick(['Senior','Junior','Lead','Staff','Principal',''])} ${pick(JOBS)}`.trim(),
  uuid: () => crypto.randomUUID(),
  int: (min = 0, max = 1000) => crypto.randomInt(min, max + 1),
  float: (min = 0, max = 100, dp = 2) => (min + crypto.randomFloat ? min : (Math.random() * (max - min) + min)).toFixed(dp) * 1,
  bool: () => ri(2) === 1,
  date: () => new Date(Date.now() - ri(365 * 24 * 3600 * 1000)).toISOString().slice(0, 10),
  timestamp: () => new Date(Date.now() - ri(365 * 24 * 3600 * 1000)).toISOString(),
  lorem: (n = 3) => Array.from({ length: n }, () => pick(WORDS)).join(' '),
  hex: (n = 8) => crypto.randomBytes(n).toString('hex'),
  ip: () => `${ri(223) + 1}.${ri(256)}.${ri(256)}.${ri(254) + 1}`,
  ipv6: () => Array.from({ length: 8 }, () => ri(65536).toString(16).padStart(4, '0')).join(':'),
  useragent: () => pick(['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/17.4', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36', 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0']),
};

function routeFaker(u, res, json) {
  const p = u.searchParams;
  const type = (p.get('type') || p.get('field') || '').toLowerCase();
  const count = Math.max(1, Math.min(100, parseInt(p.get('count') || '1', 10) || 1));
  if (!type) {
    return json(res, 200, { types: Object.keys(G).sort(), usage: '?type=person&count=5 — or ?fields=name,email&count=10 for mixed objects' });
  }
  if (!G[type]) return json(res, 404, { error: `unknown type '${type}'. Use ?type= with no value to list types.` });
  const min = p.get('min') ? parseInt(p.get('min'), 10) : undefined;
  const max = p.get('max') ? parseInt(p.get('max'), 10) : undefined;
  const n = p.get('n') ? parseInt(p.get('n'), 10) : undefined;
  const one = () => {
    if (type === 'int' && (min !== undefined || max !== undefined)) return G.int(min || 0, max || (min !== undefined ? min + 100 : 1000));
    if (type === 'float' && (min !== undefined || max !== undefined)) return G.float(min || 0, max || (min !== undefined ? min + 100 : 100));
    if ((type === 'lorem' || type === 'hex') && n !== undefined) return G[type](n);
    return G[type]();
  };
  const out = Array.from({ length: count }, one);
  return json(res, 200, { type, count, data: count === 1 ? out[0] : out });
}
module.exports = { routeFaker };
