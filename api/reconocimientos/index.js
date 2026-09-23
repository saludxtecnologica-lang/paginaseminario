const {
  getAllFuncionarios,
  getAllReconocimientos,
  getTopReconocidos,
  registrarVotoReconocimiento,
  checkAndApplyWeeklyReset,
  getNextFriday2200
} = require('../lib/db');
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

  // GET: Obtener reconocimientos y Top 5 de personas más reconocidas
  if (req.method === 'GET') {
    try {
      await checkAndApplyWeeklyReset();
      const lista = await getAllReconocimientos();
      const topReconocidos = await getTopReconocidos(5);
      const proximoReinicio = getNextFriday2200();

      return sendJson(res, 200, {
        reconocimientos: lista,
        top_reconocidos: topReconocidos,
        ciclo: {
          regla: 'Se reinicia todos los viernes a las 22:00 hrs',
          proximo_reinicio: proximoReinicio
        }
      });
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
        return sendError(res, 400, 'Debe indicar el nombre del compañero a reconocer.');
      }

      // Validar que el destinatario esté registrado en la plantilla del hospital
      const funcionarios = await getAllFuncionarios();
      const cleanDestinatario = String(destinatario_nombre).trim().toLowerCase();
      const funcionarioValido = funcionarios.find(f => 
        f.nombre_completo.toLowerCase() === cleanDestinatario ||
        f.id_empleado.toLowerCase() === cleanDestinatario
      );

      if (!funcionarioValido) {
        return sendError(res, 400, 'El compañero seleccionado no figura en la plantilla oficial de funcionarios.');
      }

      // Evitar auto-reconocimiento
      if (funcionarioValido.id_empleado.toLowerCase() === String(user.id_empleado).toLowerCase()) {
        return sendError(res, 400, 'No es posible emitir un auto-reconocimiento a uno mismo. Por favor elija a un colega.');
      }

      if (!motivos || !Array.isArray(motivos) || motivos.length === 0) {
        return sendError(res, 400, 'Debe seleccionar al menos un motivo de reconocimiento.');
      }

      // Registrar voto y actualizar ya_voto de manera atómica
      const nuevoReconocimiento = await registrarVotoReconocimiento({
        id_votante: user.id_empleado,
        destinatario_nombre: funcionarioValido.nombre_completo,
        destinatario_servicio: funcionarioValido.servicio || String(destinatario_servicio || '').trim(),
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
