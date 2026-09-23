/**
 * Reconocimiento Hospitalario - Servidor Backend Express (Node.js / CommonJS)
 * Compatible con despliegues en Vercel Serverless Functions y ejecución local con Node.js.
 * 
 * ENTORNO: Servidor puro Node.js.
 * NO contiene llamadas al DOM del navegador (document, window, etc.).
 * La lógica cliente reside en app.js y se ejecuta en el navegador.
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

// 1. Enrutador de APIs Backend
app.all('/api/auth/login', require('./api/auth/login'));
app.all('/api/auth/logout', require('./api/auth/logout'));
app.all('/api/auth/me', require('./api/auth/me'));
app.all('/api/reconocimientos', require('./api/reconocimientos/index'));
app.all('/api/admin/stats', require('./api/admin/stats'));
app.all('/api/admin/funcionarios', require('./api/admin/funcionarios'));
app.all('/api/admin/reset-votos', require('./api/admin/reset-votos'));

// 2. Ruta directa /admin -> /admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. Archivos Estáticos del Frontend (HTML, CSS, JS cliente, imágenes)
app.use(express.static(__dirname));

// 4. Manejador 404 para rutas no encontradas
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Ruta API no encontrada: ${req.path}` });
  }
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
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
