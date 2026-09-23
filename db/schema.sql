-- ==============================================================================
-- RECONOCIMIENTO HOSPITALARIO - ESQUEMA DE BASE DE DATOS (PostgreSQL / Supabase / Neon)
-- ==============================================================================

-- 1. Tabla de Funcionarios (Padrón electoral hospitalario)
CREATE TABLE IF NOT EXISTS funcionarios (
  id_empleado VARCHAR(30) PRIMARY KEY, -- RUT o número de ficha del hospital (ej: 12345678-9 o F-1042)
  pin_hash VARCHAR(255) NOT NULL,      -- Hash bcrypt del PIN numérico de acceso
  nombre_completo VARCHAR(120) NOT NULL,
  servicio VARCHAR(100) NOT NULL,      -- Servicio clínico (ej: "Urgencias", "UCI", "Cirugía", "Farmacia")
  cargo VARCHAR(100) DEFAULT 'Funcionario de Salud', -- Rol clínico: TENS, Kinesiólogo/a, Médico/a, Enfermero/a, etc.
  es_admin BOOLEAN DEFAULT FALSE,      -- Permisos para el panel administrativo
  ya_voto BOOLEAN DEFAULT FALSE,       -- Control estricto: 1 funcionario = 1 voto por ciclo
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Reconocimientos (Votos / Agradecimientos emitidos)
CREATE TABLE IF NOT EXISTS reconocimientos (
  id SERIAL PRIMARY KEY,
  destinatario_nombre VARCHAR(120) NOT NULL,
  destinatario_servicio VARCHAR(100),
  motivos TEXT[] NOT NULL,             -- Lista de motivos seleccionados (ej: '{"Liderazgo", "Empatía con el equipo"}')
  mensaje TEXT,                        -- Dedicatoria o palabras de agradecimiento
  es_anonimo BOOLEAN DEFAULT FALSE,    -- Si el votante opta por no mostrar su nombre públicamente
  id_votante VARCHAR(30) REFERENCES funcionarios(id_empleado) ON DELETE SET NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Ciclos de Reconocimiento (Campañas o periodos)
CREATE TABLE IF NOT EXISTS ciclos_reconocimiento (
  id SERIAL PRIMARY KEY,
  nombre_ciclo VARCHAR(120) NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE,
  activo BOOLEAN DEFAULT TRUE
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_funcionarios_ya_voto ON funcionarios(ya_voto);
CREATE INDEX IF NOT EXISTS idx_reconocimientos_creado ON reconocimientos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_reconocimientos_votante ON reconocimientos(id_votante);
