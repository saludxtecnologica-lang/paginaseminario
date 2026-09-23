const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'reconocimiento-hospitalario-secret-key-2026-secure';

/**
 * Cifra un PIN numérico o alfanumérico usando bcrypt
 */
async function hashPin(pin) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(pin).trim(), salt);
}

/**
 * Compara un PIN ingresado contra el hash almacenado
 */
async function verifyPin(pin, hash) {
  if (!pin || !hash) return false;
  return bcrypt.compare(String(pin).trim(), hash);
}

/**
 * Genera un token JWT firmado para la sesión del funcionario
 */
function signToken(payload) {
  return jwt.sign(
    {
      id_empleado: payload.id_empleado,
      nombre_completo: payload.nombre_completo,
      servicio: payload.servicio,
      es_admin: Boolean(payload.es_admin)
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Sesión válida por 7 días
  );
}

/**
 * Verifica y decodifica un token JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPin,
  verifyPin,
  signToken,
  verifyToken
};
