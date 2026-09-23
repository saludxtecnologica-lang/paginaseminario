const { getAuditoriaReconocimientos, deleteReconocimientoConAuditoria } = require('../lib/db');
const { requireAdmin, parseBody, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // GET: Consultar auditoría completa con emisor real aunque sea anónimo
  if (req.method === 'GET') {
    try {
      const auditoria = await getAuditoriaReconocimientos();
      return sendJson(res, 200, { reconocimientos: auditoria });
    } catch (err) {
      console.error('Error obteniendo auditoría de reconocimientos:', err);
      return sendError(res, 500, 'Error al consultar la auditoría de reconocimientos.');
    }
  }

  // DELETE: Eliminar una felicitación registrando su bitácora inmutable
  if (req.method === 'DELETE') {
    try {
      const body = await parseBody(req);
      const id = body.id || req.query?.id;
      const motivo_eliminacion = body.motivo_eliminacion || 'Eliminación administrativa';
      const restituir_voto = body.restituir_voto !== false;

      if (!id) {
        return sendError(res, 400, 'Debe especificar el id del reconocimiento a eliminar.');
      }

      const registro = await deleteReconocimientoConAuditoria({
        id_reconocimiento: id,
        admin_id: admin.id_empleado,
        admin_nombre: admin.nombre_completo,
        motivo_eliminacion,
        restituir_voto
      });

      return sendJson(res, 200, {
        mensaje: 'Felicitación eliminada y registrada en la bitácora de auditoría.',
        registro
      });
    } catch (err) {
      console.error('Error al eliminar reconocimiento:', err);
      return sendError(res, 400, err.message || 'Error al eliminar el reconocimiento.');
    }
  }

  return sendError(res, 405, 'Método no permitido.');
};
