/**
 * Reconocimiento Hospitalario - Backend Server Entrypoint (Node.js / CommonJS)
 * Compatible con despliegues en Vercel Serverless y ejecución local con Node.js.
 * 
 * NOTA: Este archivo corre exclusivamente en el SERVIDOR (Node.js).
 * NO debe contener llamadas al DOM del navegador (document, window, etc.).
 * La lógica del cliente (DOM) reside en app.js y se ejecuta en el navegador.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Enrutador de APIs Serverless del Backend
const apiRoutes = {
  '/api/auth/login': require('./api/auth/login'),
  '/api/auth/logout': require('./api/auth/logout'),
  '/api/auth/me': require('./api/auth/me'),
  '/api/reconocimientos': require('./api/reconocimientos/index'),
  '/api/admin/stats': require('./api/admin/stats'),
  '/api/admin/funcionarios': require('./api/admin/funcionarios'),
  '/api/admin/reset-votos': require('./api/admin/reset-votos')
};

// 2. Diccionario de tipos MIME para contenido estático
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

/**
 * Manejador principal de peticiones HTTP (Request Handler)
 * Compatible con Vercel Serverless Functions: export default / module.exports = (req, res)
 */
async function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';

  // A. Peticiones a la API del Backend (/api/...)
  if (pathname.startsWith('/api/')) {
    const handler = apiRoutes[pathname];
    if (handler) {
      req.query = parsedUrl.query;
      try {
        return await handler(req, res);
      } catch (err) {
        console.error(`[Backend Error] Error en ruta ${pathname}:`, err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Error interno del servidor backend.' }));
      }
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Ruta API no encontrada: ${pathname}` }));
    }
  }

  // B. Peticiones de Archivos Estáticos (Frontend: HTML, CSS, JS cliente, Assets)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Soporte para rutas limpias sin extensión .html (ej: /admin -> /admin.html)
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<h1>404 - Recurso no encontrado</h1><p><a href="/">Volver a Inicio</a></p>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Exportación para Vercel Serverless Functions
module.exports = requestHandler;

// Si se ejecuta directamente con `node app.cjs`, iniciar servidor local
if (require.main === module) {
  const PORT = process.env.PORT || 8086;
  const server = http.createServer(requestHandler);

  server.listen(PORT, () => {
    console.log(`[Backend Server] Servidor iniciado en http://localhost:${PORT}`);
  });
}
