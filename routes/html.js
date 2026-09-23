// /html — extract structured data from raw HTML (title, meta, links, text)
function routeHtml(body, u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const html = body || q.html || '';
  if (!html) throw new Error('POST raw HTML body (or ?html=)');
  const get = re => { const m = html.match(re); return m ? m[1].trim() : null; };
  const out = { };
  if (q.title !== '0') out.title = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metas = [];
  const metaRe = /<meta\s+[^>]*>/gi; let m;
  while ((m = metaRe.exec(html))) {
    const tag = m[0];
    const name = (tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const content = (tag.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (name && content !== undefined) metas.push({ name, content });
  }
  if (metas.length) out.meta = metas;
  if (q.description !== '0') {
    const d = metas.find(x => /description/i.test(x.name));
    if (d) out.description = d.content;
  }
  if (q.links !== '0') {
    const links = []; const linkRe = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = linkRe.exec(html))) {
      links.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 200) });
    }
    if (links.length) out.links = links.slice(0, parseInt(q.maxLinks || '100', 10));
  }
  if (q.text !== '0') {
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();
    out.text = text.slice(0, parseInt(q.maxText || '5000', 10));
    out.textLength = text.length;
  }
  if (q.images !== '0') {
    const images = []; const imgRe = /<img\s[^>]*src\s*=\s*["']([^"']+)["']/gi;
    while ((m = imgRe.exec(html))) images.push(m[1]);
    if (images.length) out.images = images.slice(0, 50);
  }
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(x => x[1].replace(/<[^>]+>/g, '').trim());
  if (h1.length) out.h1 = h1;
  return json(res, 200, out);
}
module.exports = { routeHtml };
