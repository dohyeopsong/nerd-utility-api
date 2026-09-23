// /mime — MIME type lookup (ext -> type) and reverse (type -> extensions)
const MIME = {
  '.html': ['text/html'], '.htm': ['text/html'], '.css': ['text/css'],
  '.js': ['text/javascript'], '.mjs': ['text/javascript'], '.json': ['application/json'],
  '.jsonld': ['application/ld+json'], '.xml': ['application/xml'], '.txt': ['text/plain'],
  '.md': ['text/markdown'], '.csv': ['text/csv'], '.tsv': ['text/tab-separated-values'],
  '.pdf': ['application/pdf'], '.zip': ['application/zip'], '.gz': ['application/gzip'],
  '.tar': ['application/x-tar'], '.7z': ['application/x-7z-compressed'],
  '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'], '.webp': ['image/webp'], '.svg': ['image/svg+xml'],
  '.ico': ['image/vnd.microsoft.icon'], '.bmp': ['image/bmp'], '.tiff': ['image/tiff'],
  '.avif': ['image/avif'], '.heic': ['image/heic'],
  '.mp3': ['audio/mpeg'], '.wav': ['audio/wav'], '.ogg': ['audio/ogg'],
  '.flac': ['audio/flac'], '.aac': ['audio/aac'],
  '.mp4': ['video/mp4'], '.webm': ['video/webm'], '.mov': ['video/quicktime'],
  '.avi': ['video/x-msvideo'], '.mkv': ['video/x-matroska'],
  '.woff': ['font/woff'], '.woff2': ['font/woff2'], '.ttf': ['font/ttf'],
  '.otf': ['font/otf'], '.eot': ['application/vnd.ms-fontobject'],
  '.wasm': ['application/wasm'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.odt': ['application/vnd.oasis.opendocument.text'],
  '.rtf': ['application/rtf'],
  '.yml': ['application/yaml'], '.yaml': ['application/yaml'],
  '.toml': ['application/toml'], '.ini': ['text/plain'], '.conf': ['text/plain'],
  '.sql': ['application/sql'], '.sh': ['application/x-sh'], '.bash': ['application/x-sh'],
  '.py': ['text/x-python'], '.rb': ['text/x-ruby'], '.go': ['text/x-go'],
  '.rs': ['text/x-rust'], '.c': ['text/x-c'], '.h': ['text/x-c'],
  '.cpp': ['text/x-c++'], '.java': ['text/x-java-source'], '.php': ['application/x-httpd-php'],
  '.svgz': ['image/svg+xml'],
  '.epub': ['application/epub+zip'],
  '.apk': ['application/vnd.android.package-archive'],
  '.iso': ['application/x-iso9660-image'],
  '.dmg': ['application/x-apple-diskimage'],
  '.exe': ['application/x-msdownload'], '.dll': ['application/x-msdownload'],
  '.deb': ['application/vnd.debian.binary-package'], '.rpm': ['application/x-rpm'],
  '.eml': ['message/rfc822'], '.mjs2': null,
};
delete MIME['.mjs2'];

const REVERSE = {};
for (const [ext, types] of Object.entries(MIME)) {
  for (const t of types) (REVERSE[t] = REVERSE[t] || []).push(ext);
}

function routeMime(u, res, json) {
  const p = u.searchParams;
  const query = (p.get('q') || p.get('ext') || p.get('type') || '').trim();
  if (!query) return json(res, 400, { error: 'provide ?ext=.png (with dot) or ?type=image/png, or ?list=1 for full map' });
  if (p.get('list')) {
    return json(res, 200, { extensions: Object.keys(MIME).length, mimeTypes: Object.keys(REVERSE).length });
  }
  // extension lookup
  const ext = query.startsWith('.') ? query.toLowerCase() : '.' + query.toLowerCase();
  if (MIME[ext]) {
    const types = MIME[ext];
    return json(res, 200, { extension: ext, mime: types[0], aliases: types, charset: types[0].startsWith('text/') ? 'utf-8' : undefined });
  }
  // mime type reverse lookup
  const t = query.toLowerCase();
  if (REVERSE[t]) {
    return json(res, 200, { mime: t, extensions: REVERSE[t] });
  }
  return json(res, 404, { error: 'unknown extension or mime type', query });
}

module.exports = { routeMime };
