const { resetAllVotos, getNextFriday2200 } = require('../lib/db');
const { sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    console.log('⏰ Invocando reseteo semanal de votos de los viernes a las 22:00 hrs...');
    await resetAllVotos();
    const proximoReinicio = getNextFriday2200();

    return sendJson(res, 200, {
      status: 'ok',
      mensaje: 'Ciclo semanal reiniciado exitosamente a las 22:00 hrs. Todos los funcionarios pueden volver a emitir su voto.',
      fecha_reinicio: new Date().toISOString(),
      proximo_reinicio: proximoReinicio.toISOString()
    });
  } catch (err) {
    console.error('Error al ejecutar cron de reinicio semanal:', err);
    return sendError(res, 500, `Error durante el reseteo: ${err.message}`);
  }
};
