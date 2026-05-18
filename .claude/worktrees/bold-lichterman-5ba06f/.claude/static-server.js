const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2]);
// Prefer PORT env var (set by Claude Preview when autoPort=true),
// fall back to argv[3] or 5173.
const PORT = parseInt(process.env.PORT || process.argv[3] || '5173', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.resolve(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden: ' + filePath + ' outside ' + ROOT); return; }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Listen on all interfaces (both IPv4 0.0.0.0 and IPv6 ::) so Chrome can reach
// "localhost" whether it resolves to 127.0.0.1 or ::1 on Windows.
server.listen(PORT, () => {
  console.log('static server up on http://localhost:' + PORT + ' serving ' + ROOT);
});
