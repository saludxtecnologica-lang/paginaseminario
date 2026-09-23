const { getStats } = require('../lib/db');
const { requireAdmin, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const stats = await getStats();
    return sendJson(res, 200, { stats });
  } catch (err) {
    console.error('Error obteniendo stats admin:', err);
    return sendError(res, 500, 'Error al calcular estadísticas.');
  }
};
