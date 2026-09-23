/**
 * Reconocimiento Hospitalario - Servidor Backend Express (Node.js / CommonJS)
 * Optimizado para despliegues Serverless en Vercel y ejecución local.
 * 
 * Configuración de Express para servir archivos estáticos desde 'public'
 * y directorio raíz con tipos MIME correctos (CSS, JS, imágenes).
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
app.all(['/api/auth/login', '/api/login'], require('./api/auth/login'));
app.all(['/api/auth/logout', '/api/logout'], require('./api/auth/logout'));
app.all(['/api/auth/me', '/api/me'], require('./api/auth/me'));
app.all('/api/reconocimientos', require('./api/reconocimientos/index'));
app.all('/api/admin/stats', require('./api/admin/stats'));
app.all('/api/admin/funcionarios', require('./api/admin/funcionarios'));
app.all('/api/admin/reset-votos', require('./api/admin/reset-votos'));

// Endpoint de diagnóstico rápido de Supabase
app.get('/api/health', async (req, res) => {
  const { getStats } = require('./api/lib/db');
  try {
    const stats = await getStats();
    res.json({ status: 'ok', database: 'connected', stats });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==============================================================================
// 2. SERVICIO DE ARCHIVOS ESTÁTICOS (PUBLIC & ROOT)
// ==============================================================================

// Opciones de Express Static con cabeceras MIME explícitas
const staticOptions = {
  dotfiles: 'ignore',
  etag: true,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
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

// 1. Servir prioritariamente desde la carpeta 'public'
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, staticOptions));
}

// 2. Servir también desde la raíz del proyecto (__dirname) como respaldo
app.use(express.static(__dirname, staticOptions));

// 3. Servir explícitamente la carpeta 'assets'
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));
if (fs.existsSync(path.join(publicDir, 'assets'))) {
  app.use('/assets', express.static(path.join(publicDir, 'assets'), staticOptions));
}

// ==============================================================================
// 3. RUTAS HTML Y CONTROL DE 404 (PROTECCIÓN CONTRA TEXT/HTML EN CSS)
// ==============================================================================

// Ruta amigable /admin -> admin.html
app.get('/admin', (req, res) => {
  const adminPath = fs.existsSync(path.join(publicDir, 'admin.html'))
    ? path.join(publicDir, 'admin.html')
    : path.join(__dirname, 'admin.html');
  res.sendFile(adminPath);
});

// Ruta principal / -> index.html
app.get('/', (req, res) => {
  const indexPath = fs.existsSync(path.join(publicDir, 'index.html'))
    ? path.join(publicDir, 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

// Manejador 404 final
app.use((req, res) => {
  // A. Si es un endpoint de API que no existe -> responder JSON 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Ruta API no encontrada: ${req.path}` });
  }

  // B. REGLA DE ORO: Si se pide un recurso estático (CSS, JS, imagen) que no existe,
  // NUNCA responder con HTML para evitar que el navegador rompa los estilos.
  if (/\.(css|js|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|map)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send(`Archivo estático no encontrado: ${req.path}`);
  }

  // C. Para navegación cliente SPA -> index.html
  const indexPath = fs.existsSync(path.join(publicDir, 'index.html'))
    ? path.join(publicDir, 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
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
