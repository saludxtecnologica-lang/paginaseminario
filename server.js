const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8085;

// Enrutador de funciones API serverless
const apiRoutes = {
  '/api/auth/login': require('./api/auth/login'),
  '/api/auth/logout': require('./api/auth/logout'),
  '/api/auth/me': require('./api/auth/me'),
  '/api/reconocimientos': require('./api/reconocimientos/index'),
  '/api/admin/stats': require('./api/admin/stats'),
  '/api/admin/funcionarios': require('./api/admin/funcionarios'),
  '/api/admin/reset-votos': require('./api/admin/reset-votos')
};

// Mime types comunes para archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';

  // 1. Manejo de APIs Serverless
  if (pathname.startsWith('/api/')) {
    const handler = apiRoutes[pathname];
    if (handler) {
      req.query = parsedUrl.query;
      return handler(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Ruta API no encontrada: ${pathname}` }));
    }
  }

  // 2. Manejo de Archivos Estáticos
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Si no tiene extensión y existe con .html
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<h1>404 - Archivo no encontrado</h1><p><a href="/">Volver al inicio</a></p>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(` Servidor Hospitalario Full Stack corriendo en:`);
    console.log(` http://localhost:${portToTry}`);
    console.log(` - Inicio y Votación: http://localhost:${portToTry}/`);
    console.log(` - Panel de Administración: http://localhost:${portToTry}/admin.html`);
    console.log(`=======================================================`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Puerto ${portToTry} ocupado, intentando con ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Error en el servidor:', err);
    }
  });
}

startServer(PORT);
