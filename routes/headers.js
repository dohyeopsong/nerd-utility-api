// /headers — echo back the client's request headers as JSON (debugging tool)
function routeHeaders(u, res, json, req) {
  const out = { method: req.method, url: req.url, headers: req.headers };
  if (u.searchParams.get('lower') !== '0') {
    // headers already lowercase in node; keep as-is
  }
  const filter = u.searchParams.get('filter');
  if (filter) {
    const keys = filter.split(',').map(k => k.trim().toLowerCase());
    out.headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => keys.includes(k)));
  }
  return json(res, 200, out);
}
module.exports = { routeHeaders };
