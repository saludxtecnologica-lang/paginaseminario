const { verifyToken } = require('./auth');
const { getFuncionarioById } = require('./db');

/**
 * Parsea el cuerpo de la petición HTTP si es necesario
 */
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }

  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

/**
 * Extrae y valida el usuario autenticado desde el Header Authorization o Cookie
 */
async function getAuthUser(req) {
  let token = null;

  // 1. Cabecera Authorization: Bearer <token>
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Cookie 'rh_token'
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, val] = cookie.trim().split('=');
      if (name === 'rh_token') {
        token = decodeURIComponent(val);
        break;
      }
    }
  }

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id_empleado) return null;

  // Obtener estado fresco desde la base de datos (por si cambió ya_voto)
  const funcionario = await getFuncionarioById(decoded.id_empleado);
  if (!funcionario) return null;

  return {
    id_empleado: funcionario.id_empleado,
    nombre_completo: funcionario.nombre_completo,
    servicio: funcionario.servicio,
    es_admin: Boolean(funcionario.es_admin),
    ya_voto: Boolean(funcionario.ya_voto)
  };
}

/**
 * Middleware para exigir autenticación
 */
async function requireAuth(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'No autenticado. Por favor inicie sesión con su ID y PIN.' }));
    return null;
  }
  return user;
}

/**
 * Middleware para exigir rol de administrador
 */
async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (!user.es_admin) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Acceso denegado. Se requieren privilegios de administrador.' }));
    return null;
  }
  return user;
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

module.exports = {
  parseBody,
  getAuthUser,
  requireAuth,
  requireAdmin,
  sendJson,
  sendError
};
