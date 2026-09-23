-- ==============================================================================
-- RECONOCIMIENTO HOSPITALARIO - DATOS SEMILLA (SEED DATA)
-- PIN por defecto para todos los usuarios de prueba: 1234
-- Hash bcrypt de "1234": $2a$10$4n9x5s9R0y.U7q5O7X7f3eXJz1Yd0zD1vF2kZ3a4b5c6d7e8f9g0h (o generado dinámicamente)
-- ==============================================================================

-- Insertar ciclo inicial
INSERT INTO ciclos_reconocimiento (nombre_ciclo, activo) 
VALUES ('Campaña Reconocimiento Hospitalario 2026', TRUE)
ON CONFLICT DO NOTHING;

-- Insertar Administrador y Funcionarios de Ejemplo
-- Nota: La contraseña para todos es: 1234
INSERT INTO funcionarios (id_empleado, pin_hash, nombre_completo, servicio, cargo, es_admin, ya_voto)
VALUES 
  -- Administrador del sistema
  ('admin', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR546t5P1tC8wE4zL6qYh2kP.s2aW', 'Dra. Natalia Morales', 'Dirección Médica & Bienestar', 'Médico / Médica', TRUE, FALSE),
  
  -- Funcionarios regulares que aún NO han votado
  ('11111111-1', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR546t5P1tC8wE4zL6qYh2kP.s2aW', 'Dr. Andrés Gómez', 'Servicio de Urgencias', 'Médico / Médica', FALSE, FALSE),
  ('22222222-2', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR546t5P1tC8wE4zL6qYh2kP.s2aW', 'Enf. Lucía Méndez', 'Unidad de Cuidados Intensivos (UCI)', 'Enfermero/a', FALSE, FALSE),
  ('33333333-3', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR546t5P1tC8wE4zL6qYh2kP.s2aW', 'Tec. Rodrigo Tapia', 'Pabellón Quirúrgico', 'TENS', FALSE, FALSE),
  
  -- Funcionario que YA votó en este ciclo (para validar bloqueo de doble voto)
  ('44444444-4', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR546t5P1tC8wE4zL6qYh2kP.s2aW', 'Matr. Camila Soto', 'Maternidad y Neonatología', 'Matrón / Matrona', FALSE, TRUE)
ON CONFLICT (id_empleado) DO NOTHING;

-- Reconocimiento inicial
INSERT INTO reconocimientos (destinatario_nombre, destinatario_servicio, motivos, mensaje, es_anonimo, id_votante)
VALUES 
  ('María González', 'Unidad de Cuidados Intensivos', ARRAY['Liderazgo', 'Trabajo en quipo'], 'Queremos destacar su serenidad y apoyo constante durante el turno nocturno.', FALSE, '44444444-4');
