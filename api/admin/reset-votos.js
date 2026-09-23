const { resetAllVotos } = require('../lib/db');
const { requireAdmin, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Método no permitido. Use POST.');
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await resetAllVotos();
    return sendJson(res, 200, {
      mensaje: 'Ciclo de votación reiniciado exitosamente. Todos los funcionarios pueden volver a emitir su reconocimiento.'
    });
  } catch (err) {
    console.error('Error reiniciando votos:', err);
    return sendError(res, 500, 'Error al reiniciar el ciclo de votación.');
  }
};
