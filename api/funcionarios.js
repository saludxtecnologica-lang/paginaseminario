const { getAllFuncionarios } = require('./lib/db');
const { sendJson, sendError } = require('./lib/middleware');

module.exports = async function handler(req, res) {
  // Cabeceras CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Método no permitido. Utilice GET.');
  }

  try {
    const list = await getAllFuncionarios();

    // Devolver lista pública/institucional para el selector (sin hashes ni datos sensibles)
    const sanitized = list.map(f => ({
      id_empleado: f.id_empleado,
      nombre_completo: f.nombre_completo,
      servicio: f.servicio || 'Servicio Hospitalario',
      cargo: f.cargo || 'Funcionario de Salud'
    }));

    return sendJson(res, 200, {
      funcionarios: sanitized
    });
  } catch (err) {
    console.error('Error al listar funcionarios para selector:', err);
    return sendError(res, 500, 'Error al obtener la lista de funcionarios registrados.');
  }
};
