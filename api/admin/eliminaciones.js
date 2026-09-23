const { getHistorialEliminaciones } = require('../lib/db');
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

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const historial = await getHistorialEliminaciones();
      return sendJson(res, 200, { historial });
    } catch (err) {
      console.error('Error obteniendo historial de eliminaciones:', err);
      return sendError(res, 500, 'Error al consultar el historial de auditoría de eliminaciones.');
    }
  }

  return sendError(res, 405, 'Método no permitido.');
};
