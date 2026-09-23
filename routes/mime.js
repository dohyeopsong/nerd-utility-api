// /mime — MIME type lookup: ext → mime, mime → ext
const MIME = {
  txt:'text/plain', html:'text/html', htm:'text/html', css:'text/css', csv:'text/csv',
  js:'text/javascript', mjs:'text/javascript', json:'application/json', xml:'application/xml',
  md:'text/markdown', yaml:'text/yaml', yml:'text/yaml',
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', svg:'image/svg+xml',
  webp:'image/webp', ico:'image/x-icon', bmp:'image/bmp', tiff:'image/tiff', avif:'image/avif',
  mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', flac:'audio/flac', m4a:'audio/mp4',
  mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', avi:'video/x-msvideo', mkv:'video/x-matroska',
  pdf:'application/pdf', zip:'application/zip', gz:'application/gzip', tar:'application/x-tar',
  bz2:'application/x-bzip2', '7z':'application/x-7z-compressed', rar:'application/vnd.rar',
  doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:'application/vnd.ms-powerpoint', pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf', otf:'font/otf', eot:'application/vnd.ms-fontobject',
  wasm:'application/wasm', webmanifest:'application/manifest+json',
  py:'text/x-python', rs:'text/x-rust', go:'text/x-go', java:'text/x-java-source', c:'text/x-c', cpp:'text/x-c++',
  sh:'application/x-sh', sql:'application/sql', toml:'application/toml', rtf:'application/rtf',
  epub:'application/epub+zip', jar:'application/java-archive'
};
function routeMime(u, res, json) {
  const p = u.searchParams;
  const ext = (p.get('ext') || '').toLowerCase().replace(/^\./, '');
  const type = p.get('type');
  if (!ext && !type) return json(res, 200, { usage: '?ext=png (ext → mime) or ?type=image/png (mime → ext). Add ?charset=utf-8 style via type param.' });
  if (ext) {
    if (ext.includes('/')) { // allow passing a mime into ext param
      const rev = Object.entries(MIME).filter(([, v]) => v === ext);
      return json(res, 200, { type: ext, extensions: rev.map(([k]) => k) });
    }
    const mime = MIME[ext];
    if (!mime) return json(res, 404, { extension: ext, error: 'unknown extension' });
    return json(res, 200, { extension: ext, mime, charset: mime.startsWith('text/') ? 'utf-8' : undefined });
  }
  // reverse lookup
  const rev = Object.entries(MIME).filter(([, v]) => v.toLowerCase() === type.toLowerCase());
  if (!rev.length) return json(res, 404, { type, error: 'unknown mime type' });
  return json(res, 200, { type: type.toLowerCase(), extensions: rev.map(([k]) => k) });
}
module.exports = { routeMime };
