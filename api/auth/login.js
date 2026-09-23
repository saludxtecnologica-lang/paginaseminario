const { getFuncionarioById } = require('../lib/db');
const { verifyPin, signToken } = require('../lib/auth');
const { parseBody, sendJson, sendError } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  // Configurar CORS conforme a la especificación W3C / RFC 6454
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Método no permitido. Use POST.');
  }

  try {
    const { id_empleado, pin } = await parseBody(req);

    if (!id_empleado || !pin) {
      return sendError(res, 400, 'Debe ingresar el ID de empleado (RUT/Ficha) y el PIN de acceso.');
    }

    const cleanId = String(id_empleado).trim();
    const cleanPin = String(pin).trim();

    // 1. Buscar en el padrón
    const funcionario = await getFuncionarioById(cleanId);
    if (!funcionario) {
      return sendError(res, 401, 'Credenciales no válidas. El ID no figura en el padrón hospitalario.');
    }

    // 2. Verificar PIN cifrado
    const pinValido = await verifyPin(cleanPin, funcionario.pin_hash);
    if (!pinValido) {
      return sendError(res, 401, 'PIN incorrecto. Por favor verifique sus datos.');
    }

    // 3. Generar sesión JWT
    const token = signToken(funcionario);

    // 4. Configurar Cookie HTTP-only de sesión
    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `rh_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieHeader);

    // 5. Responder con la información del funcionario (sin exponer el hash)
    return sendJson(res, 200, {
      mensaje: 'Autenticación exitosa',
      token,
      user: {
        id_empleado: funcionario.id_empleado,
        nombre_completo: funcionario.nombre_completo,
        servicio: funcionario.servicio,
        es_admin: Boolean(funcionario.es_admin),
        ya_voto: Boolean(funcionario.ya_voto)
      }
    });

  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    return sendError(res, 500, 'Error interno del servidor durante la autenticación.');
  }
};
