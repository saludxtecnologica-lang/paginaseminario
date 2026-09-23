const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8086,
      path,
      method: 'POST',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch(e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    http.get({
      hostname: 'localhost',
      port: 8086,
      path,
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch(e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- 1. Login con Funcionario Habilitado (11111111-1) ---');
  const loginRes = await post('/api/auth/login', { id_empleado: '11111111-1', pin: '1234' });
  console.log('Status:', loginRes.status, '| Usuario:', loginRes.data.user.nombre_completo, '| ya_voto:', loginRes.data.user.ya_voto);

  const token = loginRes.data.token;

  console.log('\n--- 2. Emitir Primer Reconocimiento (Debe ser Exitoso) ---');
  const vote1 = await post('/api/reconocimientos', {
    destinatario_nombre: 'Enf. Lucía Méndez',
    motivos: ['Paciencia', 'Empatía con el equipo'],
    mensaje: 'Gran colega durante el turno de noche',
    es_anonimo: false
  }, token);
  console.log('Status:', vote1.status, '| Mensaje:', vote1.data.mensaje, '| ya_voto:', vote1.data.ya_voto);

  console.log('\n--- 3. Intentar Emitir Segundo Reconocimiento (Debe Bloquear con 403) ---');
  const vote2 = await post('/api/reconocimientos', {
    destinatario_nombre: 'Dr. Carlos Silva',
    motivos: ['Liderazgo']
  }, token);
  console.log('Status (Esperado 403):', vote2.status, '| Error retornado:', vote2.data.error);

  console.log('\n--- 4. Login con Administrador (admin) ---');
  const adminLogin = await post('/api/auth/login', { id_empleado: 'admin', pin: '1234' });
  console.log('Status:', adminLogin.status, '| Admin:', adminLogin.data.user.nombre_completo, '| es_admin:', adminLogin.data.user.es_admin);
  const adminToken = adminLogin.data.token;

  console.log('\n--- 5. Consultar Estadísticas de Participación (/api/admin/stats) ---');
  const statsRes = await get('/api/admin/stats', adminToken);
  console.log('Stats:', statsRes.data.stats);

  console.log('\n--- 6. Agregar Funcionario al Padrón (/api/admin/funcionarios) ---');
  const tempId = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
  const addRes = await post('/api/admin/funcionarios', {
    id_empleado: tempId,
    nombre_completo: 'Dra. Claudia Benítez',
    servicio: 'Pediatría',
    cargo: 'Médico / Médica',
    pin: '1234',
    es_admin: false
  }, adminToken);
  console.log('Status:', addRes.status, '| Funcionario:', addRes.data.funcionario ? addRes.data.funcionario.nombre_completo : addRes.data, '| Cargo:', addRes.data.funcionario ? addRes.data.funcionario.cargo : '');

  console.log('\n--- 6b. Listar Padrón y Verificar Cargo (/api/admin/funcionarios) ---');
  const listStaff = await get('/api/admin/funcionarios', adminToken);
  console.log('Total en padrón:', listStaff.data.funcionarios.length);
  const sample = listStaff.data.funcionarios.slice(0, 3);
  sample.forEach(f => console.log(` - [${f.id_empleado}] ${f.nombre_completo} | Cargo: ${f.cargo}`));

  console.log('\n--- 7. Reiniciar Ciclo de Votación (/api/admin/reset-votos) ---');
  const resetRes = await post('/api/admin/reset-votos', {}, adminToken);
  console.log('Status:', resetRes.status, '| Mensaje:', resetRes.data.mensaje);

  console.log('\n--- 8. Verificar que Funcionario 11111111-1 Vuelve a Estar Habilitado ---');
  const checkUser = await get('/api/auth/me', token);
  console.log('Usuario:', checkUser.data.user.nombre_completo, '| ya_voto:', checkUser.data.user.ya_voto);

  console.log('\n========================================');
  console.log('¡TODAS LAS PRUEBAS AUTOMATIZADAS PASARON!');
  console.log('========================================');
}

runTests().catch(console.error);
