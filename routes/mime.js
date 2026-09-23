// /mime — MIME type lookup by extension, or reverse lookup (extension by MIME type)
const MIME = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', jsonld: 'application/ld+json', xml: 'application/xml', txt: 'text/plain',
  csv: 'text/csv', tsv: 'text/tab-separated-values', md: 'text/markdown', ics: 'text/calendar',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', ico: 'image/vnd.microsoft.icon', bmp: 'image/bmp', tiff: 'image/tiff',
  avif: 'image/avif', heic: 'image/heic',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  pdf: 'application/pdf', zip: 'application/zip', gz: 'application/gzip', tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar', bz2: 'application/x-bzip2',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm', epub: 'application/epub+zip', torrent: 'application/x-bittorrent',
};
function routeMime(u, res, json) {
  const p = u.searchParams;
  const ext = (p.get('ext') || '').toLowerCase().replace(/^\./, '');
  const type = (p.get('type') || '').toLowerCase().trim();
  if (!ext && !type) return json(res, 200, { usage: '?ext=png or ?type=image/png — MIME lookup by extension, or reverse lookup' });
  if (ext) {
    const m = MIME[ext];
    return m ? json(res, 200, { ext, mime: m }) : json(res, 404, { ext, error: 'unknown extension' });
  }
  // reverse
  const hits = Object.entries(MIME).filter(([e, m]) => m === type).map(([e]) => e);
  return hits.length ? json(res, 200, { type, extensions: hits, primary: hits[0] }) : json(res, 404, { type, error: 'unknown MIME type' });
}
module.exports = { routeMime };
