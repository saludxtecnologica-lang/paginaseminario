/**
 * Reconocimiento Hospitalario - Servidor Backend Express (Node.js / CommonJS)
 * Optimizado para despliegues Serverless en Vercel y ejecución local.
 * 
 * Gestiona correctamente archivos estáticos (CSS, JS cliente, imágenes),
 * cabeceras MIME y rutas de API sin dependencias del DOM en el servidor.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

// Cargar variables de entorno locales desde .env si existe
const envFile = path.resolve(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const app = express();

// Middlewares estándar de Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================================================
// 1. RUTAS DE API DEL BACKEND (Serverless)
// ==============================================================================
app.all('/api/auth/login', require('./api/auth/login'));
app.all('/api/auth/logout', require('./api/auth/logout'));
app.all('/api/auth/me', require('./api/auth/me'));
app.all('/api/reconocimientos', require('./api/reconocimientos/index'));
app.all('/api/admin/stats', require('./api/admin/stats'));
app.all('/api/admin/funcionarios', require('./api/admin/funcionarios'));
app.all('/api/admin/reset-votos', require('./api/admin/reset-votos'));

// ==============================================================================
// 2. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS (CSS, JS Cliente, Imágenes)
// ==============================================================================

// Directorios base para resolución en Local y en Vercel (/var/task)
const ROOT_DIR = __dirname;
const CWD_DIR = process.cwd();

const staticOptions = {
  dotfiles: 'ignore',
  etag: true,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Forzar el Content-Type correcto para evitar bloqueos del navegador en Vercel
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
};

// Rutas explícitas para archivos clave del frontend (styles.css, app.js, admin.css, admin.js)
app.get(['/styles.css', '/admin.css', '/app.js', '/admin.js'], (req, res, next) => {
  const fileName = path.basename(req.path);
  const candidates = [
    path.join(ROOT_DIR, fileName),
    path.join(CWD_DIR, fileName),
    path.join(ROOT_DIR, 'public', fileName),
    path.join(CWD_DIR, 'public', fileName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const mime = fileName.endsWith('.css') 
        ? 'text/css; charset=utf-8' 
        : 'application/javascript; charset=utf-8';
      res.setHeader('Content-Type', mime);
      return res.sendFile(candidate);
    }
  }
  next();
});

// Servir carpetas de recursos estáticos
app.use(express.static(ROOT_DIR, staticOptions));
if (CWD_DIR !== ROOT_DIR) {
  app.use(express.static(CWD_DIR, staticOptions));
}
app.use(express.static(path.join(ROOT_DIR, 'public'), staticOptions));
app.use(express.static(path.join(CWD_DIR, 'public'), staticOptions));

// Servir directorio de imágenes /assets
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets'), staticOptions));
app.use('/assets', express.static(path.join(CWD_DIR, 'assets'), staticOptions));

// ==============================================================================
// 3. RUTAS HTML Y MANEJO DE 404
// ==============================================================================

// Ruta amigable /admin -> admin.html
app.get('/admin', (req, res) => {
  const adminPath = fs.existsSync(path.join(ROOT_DIR, 'admin.html'))
    ? path.join(ROOT_DIR, 'admin.html')
    : path.join(CWD_DIR, 'admin.html');
  res.sendFile(adminPath);
});

// Ruta principal / -> index.html
app.get('/', (req, res) => {
  const indexPath = fs.existsSync(path.join(ROOT_DIR, 'index.html'))
    ? path.join(ROOT_DIR, 'index.html')
    : path.join(CWD_DIR, 'index.html');
  res.sendFile(indexPath);
});

// Manejador final
app.use((req, res) => {
  // A. Rutas API no encontradas -> JSON 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Ruta API no encontrada: ${req.path}` });
  }

  // B. RECURSOS ESTÁTICOS NO ENCONTRADOS -> NUNCA responder con index.html (evita CSS roto)
  if (/\.(css|js|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|map)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send(`Archivo estático no encontrado: ${req.path}`);
  }

  // C. Cualquier otra ruta web -> index.html
  const indexPath = fs.existsSync(path.join(ROOT_DIR, 'index.html'))
    ? path.join(ROOT_DIR, 'index.html')
    : path.join(CWD_DIR, 'index.html');

  if (fs.existsSync(indexPath)) {
    return res.status(200).sendFile(indexPath);
  }
  res.status(404).send('Página no encontrada');
});

// Exportación para Vercel Serverless Functions
module.exports = app;

// Si se ejecuta directamente en local (node app.cjs):
if (require.main === module) {
  const PORT = process.env.PORT || 8086;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Servidor Express Hospitalario corriendo en:`);
    console.log(` http://localhost:${PORT}`);
    console.log(` - Inicio y Votación: http://localhost:${PORT}/`);
    console.log(` - Panel de Administración: http://localhost:${PORT}/admin`);
    console.log(`=======================================================`);
  });
}
