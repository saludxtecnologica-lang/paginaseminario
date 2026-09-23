const { sendJson } = require('../lib/middleware');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Eliminar cookie HTTP-only
  res.setHeader('Set-Cookie', 'rh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  return sendJson(res, 200, { ok: true, mensaje: 'Sesión cerrada exitosamente.' });
};
