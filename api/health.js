const { getStats } = require('./lib/db');
const { sendJson, sendError } = require('./lib/middleware');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    const stats = await getStats();
    return sendJson(res, 200, {
      status: 'ok',
      database: 'connected',
      stats
    });
  } catch (err) {
    console.error('Error en /api/health:', err);
    return sendError(res, 500, `Error de base de datos: ${err.message}`);
  }
};
