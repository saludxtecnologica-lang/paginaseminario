const { getAllReconocimientos, registrarVotoReconocimiento } = require('../lib/db');
const { requireAuth, parseBody, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // GET: Obtener feed de reconocimientos
  if (req.method === 'GET') {
    try {
      const lista = await getAllReconocimientos();
      return sendJson(res, 200, { reconocimientos: lista });
    } catch (err) {
      console.error('Error al listar reconocimientos:', err);
      return sendError(res, 500, 'Error al obtener la lista de reconocimientos.');
    }
  }

  // POST: Enviar reconocimiento (Protegido con regla 1 funcionario = 1 voto)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return; // Ya responde 401 si no está autenticado

    // REGLA ESTRICTA DE CONTROL: 1 FUNCIONARIO = 1 VOTO
    if (user.ya_voto) {
      return sendError(
        res,
        403,
        'Ya has emitido tu reconocimiento para este ciclo. El sistema hospitalario aplica la regla estricta de 1 funcionario = 1 voto.'
      );
    }

    try {
      const body = await parseBody(req);
      const { destinatario_nombre, destinatario_servicio, motivos, mensaje, es_anonimo } = body;

      if (!destinatario_nombre || !String(destinatario_nombre).trim()) {
        return sendError(res, 400, 'Debe indicar el nombre y apellido del compañero a reconocer.');
      }

      if (!motivos || !Array.isArray(motivos) || motivos.length === 0) {
        return sendError(res, 400, 'Debe seleccionar al menos un motivo de reconocimiento.');
      }

      // Registrar voto y actualizar ya_voto de manera atómica
      const nuevoReconocimiento = await registrarVotoReconocimiento({
        id_votante: user.id_empleado,
        destinatario_nombre: String(destinatario_nombre).trim(),
        destinatario_servicio: String(destinatario_servicio || '').trim(),
        motivos,
        mensaje: String(mensaje || '').trim(),
        es_anonimo: Boolean(es_anonimo)
      });

      return sendJson(res, 201, {
        mensaje: '¡Reconocimiento registrado exitosamente!',
        reconocimiento: nuevoReconocimiento,
        ya_voto: true
      });

    } catch (err) {
      console.error('Error al registrar reconocimiento:', err);
      if (err.message && err.message.includes('YA_VOTO')) {
        return sendError(res, 403, 'Ya has emitido tu voto en el ciclo actual.');
      }
      return sendError(res, 500, err.message || 'Error al procesar el reconocimiento.');
    }
  }

  return sendError(res, 405, 'Método no permitido.');
};
