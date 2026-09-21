// Cron expression explainer: 5-field (min hour dom month dow) + optional 6th (seconds)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function describeField(field, min, max, names) {
  if (field === '*') return 'every ' + names;
  const parts = [];
  for (const seg of field.split(',')) {
    if (seg.includes('/')) {
      let [range, step] = seg.split('/');
      if (range === '*') parts.push(`every ${step} ${names}`);
      else { const [a,b] = range.split('-'); parts.push(`${names} ${a} to ${b} every ${step}`); }
    } else if (seg.includes('-')) {
      const [a,b] = seg.split('-'); parts.push(`${names} ${a} through ${b}`);
    } else parts.push(`at ${names} ${seg}`);
  }
  return parts.join(', ');
}

function explain(expr) {
  if (!expr) return { error: 'missing ?expr= parameter' };
  const ALIASES = { '@daily':'0 0 * * *','@hourly':'0 * * * *','@weekly':'0 0 * * 0','@monthly':'0 0 1 * *','@yearly':'0 0 1 1 *','@annually':'0 0 1 1 *','@midnight':'0 0 * * *','@reboot':null };
  const key = expr.trim().toLowerCase();
  if (key === '@reboot') return { expression: expr.trim(), humanReadable: 'runs once at system startup (not a schedule)', specialAliases: '@reboot' };
  if (ALIASES[key]) { const expanded = ALIASES[key]; return { expression: expr.trim(), specialAliases: expanded, expanded, humanReadable: explain(expanded).humanReadable }; }
  const fields = expr.trim().split(/\s+/);
  if (fields.length < 5 || fields.length > 6) return { error: `expected 5 or 6 fields, got ${fields.length}` };
  const F = fields.length === 6 ? fields : ['0', ...fields];
  const [sec, min, hour, dom, mon, dow] = F;
  return {
    expression: expr.trim(),
    fields: fields.length === 6 ? { seconds: sec, minute: min, hour: hour, dayOfMonth: dom, month: mon, dayOfWeek: dow } : { minute: min, hour, dayOfMonth: dom, month: mon, dayOfWeek: dow },
    humanReadable: [
      describeField(sec, 0, 59, 'second'), describeField(min, 0, 59, 'minute'),
      describeField(hour, 0, 23, 'hour'), describeField(dom, 1, 31, 'day-of-month'),
      describeField(mon, 1, 12, 'month'), describeField(dow, 0, 6, 'day-of-week')
    ].join(', '),
    specialAliases: { '@daily': '0 0 * * *', '@hourly': '0 * * * *', '@weekly': '0 0 * * 0', '@monthly': '0 0 1 * *', '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *' }[expr.trim().toLowerCase()] || null
  };
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  return json(res, 200, explain(q.expr));
}
module.exports = { routeCron, explain };
