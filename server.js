const http  = require('http');
const https = require('https');
const url   = require('url');
const path  = require('path');
const fs    = require('fs');

const PORT = process.env.PORT || 3000;

// ── CORS headers sent on every response ───────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers','*');
}

// ── Fetch a URL server-side and stream it to the client ──────────────────────
function proxyFetch(targetUrl, clientRes, depth) {
  if (depth > 6) { clientRes.writeHead(502); clientRes.end('Too many redirects'); return; }

  const parsed   = url.parse(targetUrl);
  const lib      = parsed.protocol === 'https:' ? https : http;
  const options  = {
    hostname : parsed.hostname,
    port     : parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path     : parsed.path,
    method   : 'GET',
    headers  : {
      'User-Agent'     : 'Mozilla/5.0 (compatible; HilayProxy/1.0)',
      'Accept'         : '*/*',
      'Referer'        : 'https://hilay.tv/',
      'Origin'         : 'https://hilay.tv',
    },
    timeout  : 20000,
  };

  const req = lib.request(options, upRes => {
    const status = upRes.statusCode;

    // Follow redirects
    if ((status === 301 || status === 302 || status === 307 || status === 308)
        && upRes.headers.location) {
      upRes.resume();
      const next = upRes.headers.location.startsWith('http')
        ? upRes.headers.location
        : `${parsed.protocol}//${parsed.hostname}${upRes.headers.location}`;
      proxyFetch(next, clientRes, depth + 1);
      return;
    }

    cors(clientRes);

    // For m3u8 playlists: rewrite segment URLs so they also go through our proxy
    const ct = (upRes.headers['content-type'] || '').toLowerCase();
    const isM3U8 = ct.includes('mpegurl') || ct.includes('m3u') ||
                   targetUrl.includes('.m3u8') || targetUrl.includes('.m3u');

    if (isM3U8) {
      clientRes.writeHead(status, {
        'Content-Type' : 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      });
      let body = '';
      upRes.setEncoding('utf8');
      upRes.on('data', chunk => body += chunk);
      upRes.on('end', () => {
        // Base URL for resolving relative segments
        const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        const rewritten = body.split('\n').map(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return line;
          // Already absolute?
          const abs = line.startsWith('http') ? line : base + line;
          return `/proxy?url=${encodeURIComponent(abs)}`;
        }).join('\n');
        clientRes.end(rewritten);
      });
    } else {
      // Binary passthrough (video segments, keys, etc.)
      clientRes.writeHead(status, {
        'Content-Type' : upRes.headers['content-type'] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      upRes.pipe(clientRes);
    }
  });

  req.on('error', err => {
    if (!clientRes.headersSent) { cors(clientRes); clientRes.writeHead(502); }
    clientRes.end('Proxy error: ' + err.message);
  });
  req.on('timeout', () => { req.destroy(); });
  req.end();
}

// ── Static file server ────────────────────────────────────────────────────────
function serveStatic(filePath, res) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                 '.m3u8':'application/vnd.apple.mpegurl', '.m3u':'audio/x-mpegurl' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}

// ── Main HTTP server ──────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Preflight
  if (req.method === 'OPTIONS') {
    cors(res); res.writeHead(204); res.end(); return;
  }

  // Health check
  if (pathname === '/health') {
    cors(res); res.writeHead(200); res.end('OK'); return;
  }

  // Proxy endpoint: /proxy?url=<encoded_url>
  if (pathname === '/proxy') {
    const target = parsed.query.url;
    if (!target) { cors(res); res.writeHead(400); res.end('Missing url param'); return; }
    proxyFetch(decodeURIComponent(target), res, 0);
    return;
  }

  // M3U playlist endpoint: /playlist  →  proxies hilay.tv/play.m3u
  if (pathname === '/playlist') {
    proxyFetch('https://hilay.tv/play.m3u', res, 0);
    return;
  }

  // Serve static files from /public
  if (pathname === '/' || pathname === '/index.html') {
    serveStatic(path.join(__dirname, 'public', 'index.html'), res);
    return;
  }

  const staticPath = path.join(__dirname, 'public', pathname);
  serveStatic(staticPath, res);
});

server.listen(PORT, () => console.log(`ހިލޭ+ proxy running on port ${PORT}`));
