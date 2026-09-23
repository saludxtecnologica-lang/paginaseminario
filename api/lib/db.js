const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno locales desde .env si existe y no están definidas
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

let pgPool = null;

// Detectar cadena de conexión de Supabase bajo cualquier nombre común en Vercel
const rawDbUrl = process.env.DATABASE_URL || 
                 process.env.POSTGRES_URL || 
                 process.env.SUPABASE_DATABASE_URL || 
                 process.env.POSTGRES_PRISMA_URL ||
                 process.env.POSTGRES_URL_NON_POOLING;

if (rawDbUrl) {
  try {
    const { Pool } = require('pg');
    // Limpiar parámetros sslmode en la URL que pudieran entrar en conflicto con la configuración explícita
    const cleanUrl = rawDbUrl.replace(/[?&]sslmode=[^&]+/g, '');
    pgPool = new Pool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Conexión a PostgreSQL (Supabase) configurada con éxito.');
  } catch (err) {
    console.warn('⚠️ Error inicializando Pool PG, utilizando almacén local en memoria:', err.message);
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
  ],
  auditoria_eliminaciones: []
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

/**
 * Calcula el timestamp del último viernes a las 22:00 hrs
 */
function getLastFriday2200(now = new Date()) {
  const date = new Date(now);
  const day = date.getDay();
  const hour = date.getHours();
  let diffDays = 0;
  if (day === 5) {
    diffDays = (hour >= 22) ? 0 : 7;
  } else if (day === 6) {
    diffDays = 1;
  } else {
    diffDays = day + 2;
  }
  const lastFriday = new Date(date);
  lastFriday.setDate(date.getDate() - diffDays);
  lastFriday.setHours(22, 0, 0, 0);
  return lastFriday;
}

/**
 * Calcula el timestamp del próximo viernes a las 22:00 hrs
 */
function getNextFriday2200(now = new Date()) {
  const last = getLastFriday2200(now);
  const next = new Date(last);
  next.setDate(last.getDate() + 7);
  return next;
}

/**
 * Verifica y ejecuta el reinicio semanal automático de los viernes a las 22:00 hrs
 */
async function checkAndApplyWeeklyReset() {
  const lastFriday = getLastFriday2200();

  if (pgPool) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS configuracion_sistema (
          clave VARCHAR(60) PRIMARY KEY,
          valor TEXT,
          actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      const res = await pgPool.query("SELECT valor FROM configuracion_sistema WHERE clave = 'ultimo_reinicio_semanal'");
      let ultimoReinicio = null;
      if (res.rows.length > 0 && res.rows[0].valor) {
        ultimoReinicio = new Date(res.rows[0].valor);
      }

      if (!ultimoReinicio || ultimoReinicio < lastFriday) {
        console.log('🔄 [Reset Semanal] Reiniciando padrón electoral para nuevo ciclo (Viernes 22:00 hrs)...');
        await resetAllVotos();
        await pgPool.query(`
          INSERT INTO configuracion_sistema (clave, valor, actualizado_en)
          VALUES ('ultimo_reinicio_semanal', $1, NOW())
          ON CONFLICT (clave) DO UPDATE SET valor = $1, actualizado_en = NOW()
        `, [new Date().toISOString()]);
        return { resetApplied: true, fecha: new Date(), proximoReinicio: getNextFriday2200() };
      }
      return { resetApplied: false, ultimoReinicio, proximoReinicio: getNextFriday2200() };
    } catch (err) {
      console.warn('⚠️ Error al verificar ciclo semanal en PG:', err.message);
    }
  }

  // Modo memoria local
  if (!localState.ultimoReinicioSemanal || localState.ultimoReinicioSemanal < lastFriday) {
    console.log('🔄 [Reset Semanal Memoria] Reiniciando padrón electoral para nuevo ciclo...');
    await resetAllVotos();
    localState.ultimoReinicioSemanal = new Date();
    return { resetApplied: true, fecha: new Date(), proximoReinicio: getNextFriday2200() };
  }
  return { resetApplied: false, ultimoReinicio: localState.ultimoReinicioSemanal, proximoReinicio: getNextFriday2200() };
}

/**
 * Obtiene el Top 5 de funcionarios con más felicitaciones y todas sus menciones detalladas
 */
async function getTopReconocidos(limit = 5) {
  const all = await getAllReconocimientos();
  
  const map = new Map();
  for (const r of all) {
    const key = (r.destinatario_nombre || '').trim();
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        destinatario_nombre: key,
        destinatario_servicio: r.destinatario_servicio || '',
        total_felicitaciones: 0,
        menciones: []
      });
    }

    const item = map.get(key);
    item.total_felicitaciones++;
    if (!item.destinatario_servicio && r.destinatario_servicio) {
      item.destinatario_servicio = r.destinatario_servicio;
    }

    item.menciones.push({
      id: r.id,
      motivos: Array.isArray(r.motivos) ? r.motivos : [r.motivos],
      mensaje: r.mensaje || '',
      es_anonimo: Boolean(r.es_anonimo),
      votante_nombre: r.votante_nombre || (r.es_anonimo ? 'Anónimo' : 'Colega del Hospital'),
      creado_en: r.creado_en
    });
  }

  // Ordenar de mayor a menor por total de felicitaciones (corazones) y limitar a 5 personas
  const sorted = Array.from(map.values())
    .sort((a, b) => b.total_felicitaciones - a.total_felicitaciones)
    .slice(0, limit);

  return sorted;
}

/**
 * Consulta de Auditoría Completa de Reconocimientos (Solo para Administrador)
 * Muestra quién felicitó a quién revelando al votante real aunque se haya marcado "anónimo"
 */
async function getAuditoriaReconocimientos() {
  if (pgPool) {
    const res = await pgPool.query(`
      SELECT r.id, r.destinatario_nombre, r.destinatario_servicio, r.motivos, r.mensaje, r.es_anonimo, r.creado_en, r.id_votante,
             f.nombre_completo as votante_nombre_real,
             f.servicio as votante_servicio_real,
             f.cargo as votante_cargo_real
      FROM reconocimientos r
      LEFT JOIN funcionarios f ON r.id_votante = f.id_empleado
      ORDER BY r.creado_en DESC
    `);
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
      id_votante: r.id_votante,
      votante_nombre_real: votante ? votante.nombre_completo : 'Colega no encontrado',
      votante_servicio_real: votante ? votante.servicio : '',
      votante_cargo_real: votante ? votante.cargo : ''
    };
  });
}

/**
 * Elimina una felicitación registrando su bitácora inmutable de auditoría
 * Opcionalmente restituye el derecho a voto del funcionario emisor
 */
async function deleteReconocimientoConAuditoria({ id_reconocimiento, admin_id, admin_nombre, motivo_eliminacion = 'Eliminación administrativa', restituir_voto = true }) {
  const recId = parseInt(id_reconocimiento, 10);
  if (isNaN(recId)) {
    throw new Error('ID de reconocimiento no válido.');
  }

  if (pgPool) {
    // Asegurar tabla de auditoría en PostgreSQL
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
        id SERIAL PRIMARY KEY,
        id_reconocimiento_original INT,
        destinatario_nombre VARCHAR(150),
        destinatario_servicio VARCHAR(100),
        motivos TEXT,
        mensaje TEXT,
        es_anonimo BOOLEAN,
        id_votante_real VARCHAR(50),
        nombre_votante_real VARCHAR(150),
        eliminado_por_id VARCHAR(50),
        eliminado_por_nombre VARCHAR(150),
        motivo_eliminacion TEXT,
        fecha_eliminacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        creado_en_original TIMESTAMP WITH TIME ZONE
      )
    `);

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener la felicitación y datos del emisor
      const selRes = await client.query(`
        SELECT r.*, f.nombre_completo as votante_nombre_real
        FROM reconocimientos r
        LEFT JOIN funcionarios f ON r.id_votante = f.id_empleado
        WHERE r.id = $1
      `, [recId]);

      if (selRes.rows.length === 0) {
        throw new Error('El reconocimiento no existe o ya fue eliminado.');
      }

      const rec = selRes.rows[0];
      const motivosStr = Array.isArray(rec.motivos) ? rec.motivos.join(', ') : String(rec.motivos || '');

      // 2. Registrar en la bitácora inmutable de auditoría
      const auditRes = await client.query(`
        INSERT INTO auditoria_eliminaciones (
          id_reconocimiento_original, destinatario_nombre, destinatario_servicio,
          motivos, mensaje, es_anonimo, id_votante_real, nombre_votante_real,
          eliminado_por_id, eliminado_por_nombre, motivo_eliminacion, creado_en_original
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        rec.id,
        rec.destinatario_nombre,
        rec.destinatario_servicio,
        motivosStr,
        rec.mensaje || '',
        Boolean(rec.es_anonimo),
        rec.id_votante,
        rec.votante_nombre_real || 'Desconocido',
        admin_id || 'admin',
        admin_nombre || 'Administrador',
        motivo_eliminacion || 'Sin motivo especificado',
        rec.creado_en
      ]);

      // 3. Eliminar de la tabla pública de reconocimientos
      await client.query('DELETE FROM reconocimientos WHERE id = $1', [recId]);

      // 4. Si se solicita restituir el voto, permitir volver a votar al emisor
      if (restituir_voto && rec.id_votante) {
        await client.query('UPDATE funcionarios SET ya_voto = FALSE, actualizado_en = NOW() WHERE id_empleado = $1', [rec.id_votante]);
      }

      await client.query('COMMIT');
      return auditRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Fallback local en memoria
  const idx = localState.reconocimientos.findIndex(r => r.id === recId);
  if (idx === -1) {
    throw new Error('El reconocimiento no existe o ya fue eliminado.');
  }

  const rec = localState.reconocimientos[idx];
  const votante = localState.funcionarios.find(f => f.id_empleado === rec.id_votante);

  const registroAudit = {
    id: localState.auditoria_eliminaciones.length + 1,
    id_reconocimiento_original: rec.id,
    destinatario_nombre: rec.destinatario_nombre,
    destinatario_servicio: rec.destinatario_servicio,
    motivos: Array.isArray(rec.motivos) ? rec.motivos.join(', ') : rec.motivos,
    mensaje: rec.mensaje,
    es_anonimo: rec.es_anonimo,
    id_votante_real: rec.id_votante,
    nombre_votante_real: votante ? votante.nombre_completo : 'Desconocido',
    eliminado_por_id: admin_id || 'admin',
    eliminado_por_nombre: admin_nombre || 'Administrador',
    motivo_eliminacion: motivo_eliminacion || 'Sin motivo especificado',
    fecha_eliminacion: new Date(),
    creado_en_original: rec.creado_en
  };

  localState.auditoria_eliminaciones.unshift(registroAudit);
  localState.reconocimientos.splice(idx, 1);

  if (restituir_voto && votante) {
    votante.ya_voto = false;
  }

  return registroAudit;
}

/**
 * Consulta la bitácora inmutable de eliminaciones para el Administrador
 */
async function getHistorialEliminaciones() {
  if (pgPool) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS auditoria_eliminaciones (
        id SERIAL PRIMARY KEY,
        id_reconocimiento_original INT,
        destinatario_nombre VARCHAR(150),
        destinatario_servicio VARCHAR(100),
        motivos TEXT,
        mensaje TEXT,
        es_anonimo BOOLEAN,
        id_votante_real VARCHAR(50),
        nombre_votante_real VARCHAR(150),
        eliminado_por_id VARCHAR(50),
        eliminado_por_nombre VARCHAR(150),
        motivo_eliminacion TEXT,
        fecha_eliminacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        creado_en_original TIMESTAMP WITH TIME ZONE
      )
    `);

    const res = await pgPool.query('SELECT * FROM auditoria_eliminaciones ORDER BY fecha_eliminacion DESC');
    return res.rows;
  }

  return localState.auditoria_eliminaciones;
}

module.exports = {
  getFuncionarioById,
  getAllFuncionarios,
  createFuncionario,
  deleteFuncionario,
  registrarVotoReconocimiento,
  getAllReconocimientos,
  getTopReconocidos,
  resetAllVotos,
  checkAndApplyWeeklyReset,
  getLastFriday2200,
  getNextFriday2200,
  getStats,
  getAuditoriaReconocimientos,
  deleteReconocimientoConAuditoria,
  getHistorialEliminaciones
};

