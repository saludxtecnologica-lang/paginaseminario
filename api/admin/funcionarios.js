const { getAllFuncionarios, createFuncionario, deleteFuncionario } = require('../lib/db');
const { hashPin } = require('../lib/auth');
const { requireAdmin, parseBody, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // GET: Listar todo el padrón de funcionarios
  if (req.method === 'GET') {
    try {
      const funcionarios = await getAllFuncionarios();
      return sendJson(res, 200, { funcionarios });
    } catch (err) {
      console.error('Error listando funcionarios:', err);
      return sendError(res, 500, 'Error al consultar el padrón de funcionarios.');
    }
  }

  // POST: Crear nuevo funcionario en el padrón
  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { id_empleado, pin, nombre_completo, servicio, cargo, es_admin } = body;

      if (!id_empleado || !String(id_empleado).trim()) {
        return sendError(res, 400, 'El ID de empleado (RUT/Ficha) es obligatorio.');
      }
      if (!pin || String(pin).trim().length < 4) {
        return sendError(res, 400, 'El PIN debe tener al menos 4 dígitos o caracteres.');
      }
      if (!nombre_completo || !String(nombre_completo).trim()) {
        return sendError(res, 400, 'El nombre completo es obligatorio.');
      }
      if (!servicio || !String(servicio).trim()) {
        return sendError(res, 400, 'El servicio o unidad clínica es obligatorio.');
      }

      // Cifrar el PIN con bcrypt
      const pin_hash = await hashPin(pin);

      const nuevo = await createFuncionario({
        id_empleado: String(id_empleado).trim(),
        pin_hash,
        nombre_completo: String(nombre_completo).trim(),
        servicio: String(servicio).trim(),
        cargo: String(cargo || 'Funcionario de Salud').trim(),
        es_admin: Boolean(es_admin)
      });

      return sendJson(res, 201, {
        mensaje: 'Funcionario agregado exitosamente al padrón.',
        funcionario: nuevo
      });

    } catch (err) {
      console.error('Error creando funcionario:', err);
      return sendError(res, 400, err.message || 'Error al agregar funcionario.');
    }
  }

  // DELETE: Dar de baja funcionario por ID
  if (req.method === 'DELETE') {
    try {
      const body = await parseBody(req);
      const id = body.id_empleado || req.query?.id;

      if (!id) {
        return sendError(res, 400, 'Debe especificar el id_empleado a eliminar.');
      }

      if (id.toLowerCase() === admin.id_empleado.toLowerCase()) {
        return sendError(res, 400, 'No puedes eliminar tu propia cuenta de administrador activa.');
      }

      const ok = await deleteFuncionario(id);
      if (!ok) {
        return sendError(res, 404, 'Funcionario no encontrado en el padrón.');
      }

      return sendJson(res, 200, { mensaje: `Funcionario ${id} eliminado del padrón.` });
    } catch (err) {
      console.error('Error eliminando funcionario:', err);
      return sendError(res, 500, 'Error al eliminar el funcionario.');
    }
  }

  return sendError(res, 405, 'Método no permitido.');
};
