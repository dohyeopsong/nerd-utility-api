// /mime — file extension → MIME type lookup (full IANA common set)
const TYPES = {
  txt:'text/plain', md:'text/markdown', html:'text/html', htm:'text/html', css:'text/css', csv:'text/csv',
  js:'text/javascript', mjs:'text/javascript', json:'application/json', xml:'application/xml', yaml:'text/yaml', yml:'text/yaml',
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml',
  ico:'image/vnd.microsoft.icon', bmp:'image/bmp', tiff:'image/tiff', avif:'image/avif', heic:'image/heic',
  mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', flac:'audio/flac', m4a:'audio/mp4', aac:'audio/aac',
  mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', avi:'video/x-msvideo', mkv:'video/x-matroska',
  pdf:'application/pdf', zip:'application/zip', gz:'application/gzip', tar:'application/x-tar', '7z':'application/x-7z-compressed',
  bz2:'application/x-bzip2', xz:'application/x-xz', rar:'application/vnd.rar',
  doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:'application/vnd.ms-powerpoint', pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt:'application/vnd.oasis.opendocument.text', ods:'application/vnd.oasis.opendocument.spreadsheet',
  epub:'application/epub+zip', woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf', otf:'font/otf', eot:'application/vnd.ms-fontobject',
  wasm:'application/wasm', ics:'text/calendar', ts:'text/typescript', jsx:'text/javascript', tsx:'text/javascript',
  sh:'text/x-shellscript', py:'text/x-python', rb:'text/ruby', go:'text/x-go', rs:'text/rust', java:'text/x-java-source',
  c:'text/x-c', cpp:'text/x-c++', h:'text/x-c', sql:'application/sql', rtf:'application/rtf', apk:'application/vnd.android.package-archive',
  bin:'application/octet-stream', dmg:'application/x-apple-diskimage', iso:'application/x-iso9660-image', deb:'application/vnd.debian.binary-package',
  eml:'message/rfc822', mid:'audio/midi', midi:'audio/midi', psd:'image/vnd.adobe.photoshop', ai:'application/postscript',
  ttf:'font/ttf', tex:'application/x-tex', torrent:'application/x-bittorrent', wmv:'video/x-ms-wmv', flv:'video/x-flv',
};
const EXT = {}; for (const [e, t] of Object.entries(TYPES)) { (EXT[t] = EXT[t] || []).push(e); }
function routeMime(u, res, json) {
  const raw = (u.searchParams.get('ext') || u.searchParams.get('file') || '').trim().toLowerCase().replace(/^\./, '');
  const list = u.searchParams.get('list');
  if (list) {
    const t = TYPES[list.replace(/^\./, '')];
    return json(res, t ? 200 : 404, t ? { ext: list, mime: t } : { error: 'unknown extension', ext: list });
  }
  if (!raw) {
    if (u.searchParams.get('reverse')) {
      const q = u.searchParams.get('reverse');
      const exts = EXT[q];
      return json(res, exts ? 200 : 404, exts ? { mime: q, extensions: exts } : { error: 'unknown mime type', mime: q });
    }
    return json(res, 200, { usage: '?ext=png or ?file=report.pdf — MIME lookup; ?reverse=image/png — reverse lookup', types_known: Object.keys(TYPES).length });
  }
  const mime = TYPES[raw];
  if (!mime) return json(res, 404, { ext: raw, error: 'unknown extension', fallback: 'application/octet-stream' });
  return json(res, 200, { ext: raw, mime, category: mime.split('/')[0], other_extensions: EXT[mime].filter(e => e !== raw) });
}
module.exports = { routeMime };
