const bcrypt = require('bcryptjs');

let pgPool = null;

// Si existe DATABASE_URL, configurar cliente PostgreSQL
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    console.log('Conexión a PostgreSQL configurada.');
  } catch (err) {
    console.warn('Error inicializando Pool PG, utilizando almacén local en memoria.', err.message);
  }
}

// ---------------------------------------------------------------------------
// Almacén Local en Memoria (Fallback automático para desarrollo sin base de datos externa)
// ---------------------------------------------------------------------------
const defaultPinHash = bcrypt.hashSync('1234', 10);

const localState = {
  funcionarios: [
    {
      id_empleado: 'admin',
      pin_hash: defaultPinHash,
      nombre_completo: 'Dra. Natalia Morales',
      servicio: 'Dirección Médica & Bienestar',
      cargo: 'Médico / Médica',
      es_admin: true,
      ya_voto: false,
      creado_en: new Date('2026-04-01T08:00:00Z')
    },
    {
      id_empleado: '11111111-1',
      pin_hash: defaultPinHash,
      nombre_completo: 'Dr. Andrés Gómez',
      servicio: 'Servicio de Urgencias',
      cargo: 'Médico / Médica',
      es_admin: false,
      ya_voto: false,
      creado_en: new Date('2026-04-02T09:00:00Z')
    },
    {
      id_empleado: '22222222-2',
      pin_hash: defaultPinHash,
      nombre_completo: 'Enf. Lucía Méndez',
      servicio: 'Unidad de Cuidados Intensivos (UCI)',
      cargo: 'Enfermero/a',
      es_admin: false,
      ya_voto: false,
      creado_en: new Date('2026-04-03T10:00:00Z')
    },
    {
      id_empleado: '33333333-3',
      pin_hash: defaultPinHash,
      nombre_completo: 'Tec. Rodrigo Tapia',
      servicio: 'Pabellón Quirúrgico',
      cargo: 'TENS',
      es_admin: false,
      ya_voto: false,
      creado_en: new Date('2026-04-04T11:00:00Z')
    },
    {
      id_empleado: '44444444-4',
      pin_hash: defaultPinHash,
      nombre_completo: 'Matr. Camila Soto',
      servicio: 'Maternidad y Neonatología',
      cargo: 'Matrón / Matrona',
      es_admin: false,
      ya_voto: true, // Esta usuaria ya votó para probar la validación
      creado_en: new Date('2026-04-05T12:00:00Z')
    }
  ],
  reconocimientos: [
    {
      id: 1,
      destinatario_nombre: 'María González',
      destinatario_servicio: 'Unidad de Cuidados Intensivos',
      motivos: ['Liderazgo', 'Trabajo en quipo'],
      mensaje: 'Queremos destacar su serenidad y apoyo constante durante el turno de noche.',
      es_anonimo: false,
      id_votante: '44444444-4',
      creado_en: new Date('2026-04-15T20:30:00Z')
    }
  ]
};

// ---------------------------------------------------------------------------
// MÉTODOS DE ACCESO A DATOS (ABSTRACCIÓN PG / LOCAL)
// ---------------------------------------------------------------------------

async function getFuncionarioById(idEmpleado) {
  const cleanId = String(idEmpleado || '').trim();
  
  if (pgPool) {
    const res = await pgPool.query('SELECT * FROM funcionarios WHERE id_empleado = $1', [cleanId]);
    return res.rows[0] || null;
  }
  
  return localState.funcionarios.find(f => f.id_empleado.toLowerCase() === cleanId.toLowerCase()) || null;
}

async function getAllFuncionarios() {
  if (pgPool) {
    const res = await pgPool.query(
      'SELECT id_empleado, nombre_completo, servicio, cargo, es_admin, ya_voto, creado_en FROM funcionarios ORDER BY creado_en DESC'
    );
    return res.rows;
  }
  
  return localState.funcionarios.map(f => ({
    id_empleado: f.id_empleado,
    nombre_completo: f.nombre_completo,
    servicio: f.servicio,
    cargo: f.cargo || 'Funcionario de Salud',
    es_admin: f.es_admin,
    ya_voto: f.ya_voto,
    creado_en: f.creado_en
  }));
}

async function createFuncionario({ id_empleado, pin_hash, nombre_completo, servicio, cargo = 'Funcionario de Salud', es_admin = false }) {
  const cleanId = String(id_empleado).trim();
  const cleanCargo = String(cargo || 'Funcionario de Salud').trim();
  
  if (pgPool) {
    const res = await pgPool.query(
      `INSERT INTO funcionarios (id_empleado, pin_hash, nombre_completo, servicio, cargo, es_admin, ya_voto)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING id_empleado, nombre_completo, servicio, cargo, es_admin, ya_voto, creado_en`,
      [cleanId, pin_hash, nombre_completo, servicio, cleanCargo, es_admin]
    );
    return res.rows[0];
  }

  const existing = localState.funcionarios.find(f => f.id_empleado.toLowerCase() === cleanId.toLowerCase());
  if (existing) {
    throw new Error('El ID de empleado ya existe en el padrón.');
  }

  const nuevo = {
    id_empleado: cleanId,
    pin_hash,
    nombre_completo,
    servicio,
    cargo: cleanCargo,
    es_admin: Boolean(es_admin),
    ya_voto: false,
    creado_en: new Date()
  };
  localState.funcionarios.unshift(nuevo);
  return {
    id_empleado: nuevo.id_empleado,
    nombre_completo: nuevo.nombre_completo,
    servicio: nuevo.servicio,
    cargo: nuevo.cargo,
    es_admin: nuevo.es_admin,
    ya_voto: nuevo.ya_voto,
    creado_en: nuevo.creado_en
  };
}

async function deleteFuncionario(idEmpleado) {
  const cleanId = String(idEmpleado).trim();

  if (pgPool) {
    await pgPool.query('DELETE FROM funcionarios WHERE id_empleado = $1', [cleanId]);
    return true;
  }

  const idx = localState.funcionarios.findIndex(f => f.id_empleado.toLowerCase() === cleanId.toLowerCase());
  if (idx !== -1) {
    localState.funcionarios.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Registra un reconocimiento y actualiza 'ya_voto = true' en una transacción atómica
 */
async function registrarVotoReconocimiento({ id_votante, destinatario_nombre, destinatario_servicio, motivos, mensaje, es_anonimo }) {
  const cleanVotanteId = String(id_votante).trim();

  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Bloqueo de fila para verificación atómica
      const checkRes = await client.query(
        'SELECT ya_voto FROM funcionarios WHERE id_empleado = $1 FOR UPDATE',
        [cleanVotanteId]
      );

      if (checkRes.rows.length === 0) {
        throw new Error('Funcionario votante no encontrado en el padrón.');
      }

      if (checkRes.rows[0].ya_voto) {
        throw new Error('YA_VOTO: Este funcionario ya emitió su voto en el ciclo actual.');
      }

      // 2. Insertar reconocimiento
      const recRes = await client.query(
        `INSERT INTO reconocimientos (destinatario_nombre, destinatario_servicio, motivos, mensaje, es_anonimo, id_votante)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [destinatario_nombre, destinatario_servicio || '', motivos, mensaje || '', Boolean(es_anonimo), cleanVotanteId]
      );

      // 3. Marcar ya_voto = true
      await client.query(
        'UPDATE funcionarios SET ya_voto = TRUE, actualizado_en = NOW() WHERE id_empleado = $1',
        [cleanVotanteId]
      );

      await client.query('COMMIT');
      return recRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Lógica atómica en almacén local
  const funcionario = localState.funcionarios.find(f => f.id_empleado.toLowerCase() === cleanVotanteId.toLowerCase());
  if (!funcionario) {
    throw new Error('Funcionario votante no encontrado en el padrón.');
  }

  if (funcionario.ya_voto) {
    throw new Error('YA_VOTO: Este funcionario ya emitió su voto en el ciclo actual.');
  }

  // Registrar voto
  funcionario.ya_voto = true;

  const nuevoRec = {
    id: localState.reconocimientos.length + 1,
    destinatario_nombre,
    destinatario_servicio: destinatario_servicio || '',
    motivos: Array.isArray(motivos) ? motivos : [motivos],
    mensaje: mensaje || '',
    es_anonimo: Boolean(es_anonimo),
    id_votante: cleanVotanteId,
    creado_en: new Date()
  };

  localState.reconocimientos.unshift(nuevoRec);
  return nuevoRec;
}

async function getAllReconocimientos() {
  if (pgPool) {
    const res = await pgPool.query(
      `SELECT r.id, r.destinatario_nombre, r.destinatario_servicio, r.motivos, r.mensaje, r.es_anonimo, r.creado_en,
              CASE WHEN r.es_anonimo THEN 'Anónimo' ELSE f.nombre_completo END as votante_nombre
       FROM reconocimientos r
       LEFT JOIN funcionarios f ON r.id_votante = f.id_empleado
       ORDER BY r.creado_en DESC`
    );
    return res.rows;
  }

  return localState.reconocimientos.map(r => {
    const votante = localState.funcionarios.find(f => f.id_empleado === r.id_votante);
    return {
      id: r.id,
      destinatario_nombre: r.destinatario_nombre,
      destinatario_servicio: r.destinatario_servicio,
      motivos: r.motivos,
      mensaje: r.mensaje,
      es_anonimo: r.es_anonimo,
      creado_en: r.creado_en,
      votante_nombre: r.es_anonimo ? 'Anónimo' : (votante ? votante.nombre_completo : 'Colega del Hospital')
    };
  });
}

/**
 * Reinicia el estado 'ya_voto = false' para todos los funcionarios (nuevo ciclo)
 */
async function resetAllVotos() {
  if (pgPool) {
    await pgPool.query('UPDATE funcionarios SET ya_voto = FALSE, actualizado_en = NOW()');
    return true;
  }

  localState.funcionarios.forEach(f => {
    f.ya_voto = false;
  });
  return true;
}

/**
 * Estadísticas para el panel administrativo
 */
async function getStats() {
  if (pgPool) {
    const totalRes = await pgPool.query('SELECT COUNT(*) as total FROM funcionarios');
    const votosRes = await pgPool.query('SELECT COUNT(*) as votados FROM funcionarios WHERE ya_voto = TRUE');
    const recRes = await pgPool.query('SELECT COUNT(*) as total_rec FROM reconocimientos');
    
    const total = parseInt(totalRes.rows[0].total, 10);
    const votados = parseInt(votosRes.rows[0].votados, 10);
    const total_rec = parseInt(recRes.rows[0].total_rec, 10);
    const participacion = total > 0 ? Math.round((votados / total) * 100) : 0;

    return { total, votados, pendientes: total - votados, participacion, total_rec };
  }

  const total = localState.funcionarios.length;
  const votados = localState.funcionarios.filter(f => f.ya_voto).length;
  const participacion = total > 0 ? Math.round((votados / total) * 100) : 0;

  return {
    total,
    votados,
    pendientes: total - votados,
    participacion,
    total_rec: localState.reconocimientos.length
  };
}

module.exports = {
  getFuncionarioById,
  getAllFuncionarios,
  createFuncionario,
  deleteFuncionario,
  registrarVotoReconocimiento,
  getAllReconocimientos,
  resetAllVotos,
  getStats
};
