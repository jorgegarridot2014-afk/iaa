const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const ROOT = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function proxyChat(prompt, res) {
  const data = JSON.stringify({ messages: [{ role: 'user', content: prompt }] });
  const req = https.request(
    {
      hostname: 'text.pollinations.ai',
      path: '/',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    },
    (upstream) => {
      let body = '';
      upstream.setEncoding('utf8');
      upstream.on('data', (c) => { body += c; });
      upstream.on('end', () => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ text: body }));
      });
    }
  );
  req.on('error', () => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ text: 'Error al contactar el servicio.' }));
  });
  req.write(data);
  req.end();
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && url === '/api/chat') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let prompt = '';
      try { prompt = (JSON.parse(body || '{}')).prompt || ''; } catch (e) {}
      proxyChat(prompt, res);
    });
    return;
  }

  const pathname = decodeURIComponent(url);
  const filePath = path.join(ROOT, pathname === '/' ? 'iag.html' : pathname);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

