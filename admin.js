/**
 * Reconocimiento Hospitalario - Lógica del Panel de Administración
 * Supervisión del padrón, métricas de participación y control de ciclos electorales.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let allStaff = [];

  // Elementos del DOM
  const adminAvatar = document.getElementById('adminAvatar');
  const adminName = document.getElementById('adminName');
  const adminRole = document.getElementById('adminRole');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  const statTotalUsers = document.getElementById('statTotalUsers');
  const statVoted = document.getElementById('statVoted');
  const statPending = document.getElementById('statPending');
  const statParticipation = document.getElementById('statParticipation');
  const participationBar = document.getElementById('participationBar');

  const filterInput = document.getElementById('filterInput');
  const filteredCount = document.getElementById('filteredCount');
  const tableBody = document.getElementById('tableBody');

  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const addStaffModal = document.getElementById('addStaffModal');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
  const addStaffForm = document.getElementById('addStaffForm');

  const btnResetCycle = document.getElementById('btnResetCycle');
  const toastContainer = document.getElementById('adminToastContainer');

  // =========================================================================
  // 1. Verificación de Autenticación y Rol Admin
  // =========================================================================
  async function checkAdminAuth() {
    try {
      const token = localStorage.getItem('rh_token');
      const res = await fetch('/api/auth/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();

      if (!data.authenticated || !data.user || !data.user.es_admin) {
        // Acceso denegado: Redireccionar o mostrar pantalla de bloqueo
        bloquearAccesoNoAutorizado();
        return false;
      }

      currentUser = data.user;
      adminName.textContent = currentUser.nombre_completo;
      adminRole.textContent = currentUser.servicio;
      adminAvatar.textContent = currentUser.nombre_completo.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return true;
    } catch (err) {
      console.error('Error verificando sesión admin:', err);
      bloquearAccesoNoAutorizado();
      return false;
    }
  }

  function bloquearAccesoNoAutorizado() {
    document.body.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #F8FAFC; padding: 2rem; font-family: 'Plus Jakarta Sans', sans-serif;">
        <div style="background: #FFFFFF; border-radius: 16px; padding: 2.5rem; max-width: 460px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #FEE2E2; color: #EF4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem;">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.4rem; font-weight: 700; color: #0F172A; margin-bottom: 0.6rem;">Acceso Restringido</h2>
          <p style="color: #64748B; font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.8rem;">
            Esta zona está reservada exclusivamente para personal con credenciales de <strong>Administrador</strong>. Por favor, inicia sesión con un ID autorizado (Ej: <code>admin</code> con PIN <code>1234</code>).
          </p>
          <a href="/" style="display: inline-block; background-color: #FF6B4A; color: #FFFFFF; font-weight: 600; padding: 0.85rem 1.8rem; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 12px rgba(255, 107, 74, 0.3);">
            Ir al Inicio de Sesión
          </a>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 2. Cargar Métricas y Padrón de Funcionarios
  // =========================================================================
  async function loadDashboardData() {
    const token = localStorage.getItem('rh_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      // Cargar Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) {
        const { stats } = await statsRes.json();
        statTotalUsers.textContent = stats.total;
        statVoted.textContent = stats.votados;
        statPending.textContent = `${stats.pendientes} pendientes`;
        statParticipation.textContent = `${stats.participacion}%`;
        participationBar.style.width = `${stats.participacion}%`;
      }

      // Cargar Funcionarios
      const staffRes = await fetch('/api/admin/funcionarios', { headers });
      if (staffRes.ok) {
        const data = await staffRes.json();
        allStaff = data.funcionarios || [];
        renderTable(allStaff);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      showAdminToast('Error de conexión', 'No se pudieron cargar los datos del padrón.');
    }
  }

  // =========================================================================
  // 3. Renderizar Tabla y Filtro
  // =========================================================================
  function renderTable(list) {
    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #94A3B8;">
            No se encontraron funcionarios con el criterio de búsqueda.
          </td>
        </tr>
      `;
      filteredCount.textContent = `0 funcionarios`;
      return;
    }

    filteredCount.textContent = `Mostrando ${list.length} de ${allStaff.length} funcionarios`;

    tableBody.innerHTML = list.map(f => {
      const isVoted = Boolean(f.ya_voto);
      const isSelf = currentUser && f.id_empleado.toLowerCase() === currentUser.id_empleado.toLowerCase();

      // Determinar clase visual de cargo
      let cargoClass = '';
      const cLower = String(f.cargo || '').toLowerCase();
      if (cLower.includes('tens')) cargoClass = 'cargo-tens';
      else if (cLower.includes('kine')) cargoClass = 'cargo-kine';
      else if (cLower.includes('médic') || cLower.includes('medic')) cargoClass = 'cargo-medico';
      else if (cLower.includes('enferm')) cargoClass = 'cargo-enfermero';
      else if (cLower.includes('auxil')) cargoClass = 'cargo-auxiliar';

      return `
        <tr>
          <td><strong style="font-family: monospace; font-size: 0.95rem;">${escapeHtml(f.id_empleado)}</strong></td>
          <td>
            <div style="font-weight: 600; color: #0F172A;">${escapeHtml(f.nombre_completo)}</div>
          </td>
          <td><span style="color: #475569;">${escapeHtml(f.servicio)}</span></td>
          <td>
            <span class="cargo-badge ${cargoClass}">
              ${escapeHtml(f.cargo || 'Funcionario')}
            </span>
          </td>
          <td>
            <span class="role-badge ${f.es_admin ? 'role-admin' : 'role-staff'}">
              ${f.es_admin ? '👑 Administrador' : 'Funcionario'}
            </span>
          </td>
          <td>
            <span class="status-badge ${isVoted ? 'status-voted' : 'status-pending'}">
              ${isVoted ? '✓ Ya Votó' : '○ Pendiente'}
            </span>
          </td>
          <td class="text-right">
            ${isSelf ? '<span style="font-size: 0.75rem; color: #94A3B8;">Sesión Activa</span>' : `
              <button class="btn-delete-row" data-id="${escapeHtml(f.id_empleado)}" title="Dar de baja">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Baja</span>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Conectar botones de baja/eliminación
    document.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToDelete = btn.getAttribute('data-id');
        confirmarBajaFuncionario(idToDelete);
      });
    });
  }

  // Filtro de búsqueda en vivo
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase().trim();
      if (!q) {
        renderTable(allStaff);
        return;
      }
      const filtered = allStaff.filter(f => 
        f.nombre_completo.toLowerCase().includes(q) ||
        f.id_empleado.toLowerCase().includes(q) ||
        f.servicio.toLowerCase().includes(q) ||
        (f.cargo && f.cargo.toLowerCase().includes(q))
      );
      renderTable(filtered);
    });
  }

  // =========================================================================
  // 4. Agregar Funcionario al Padrón
  // =========================================================================
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      addStaffModal.style.display = 'flex';
      document.getElementById('newIdEmpleado').focus();
    });
  }

  function cerrarModalAlta() {
    addStaffModal.style.display = 'none';
    addStaffForm.reset();
  }

  if (closeAddModalBtn) closeAddModalBtn.addEventListener('click', cerrarModalAlta);
  if (cancelAddModalBtn) cancelAddModalBtn.addEventListener('click', cerrarModalAlta);

  if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id_empleado = document.getElementById('newIdEmpleado').value.trim();
      const nombre_completo = document.getElementById('newNombre').value.trim();
      const servicio = document.getElementById('newServicio').value.trim();
      const cargo = document.getElementById('newCargo').value.trim();
      const pin = document.getElementById('newPin').value.trim();
      const es_admin = document.getElementById('newIsAdmin').checked;

      const token = localStorage.getItem('rh_token');
      try {
        const res = await fetch('/api/admin/funcionarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ id_empleado, nombre_completo, servicio, cargo, pin, es_admin })
        });

        const data = await res.json();
        if (!res.ok) {
          showAdminToast('Error', data.error || 'No se pudo agregar al funcionario.');
          return;
        }

        showAdminToast('¡Registrado!', `Funcionario ${nombre_completo} agregado con éxito.`);
        cerrarModalAlta();
        await loadDashboardData();
      } catch (err) {
        console.error('Error agregando funcionario:', err);
        showAdminToast('Error', 'Fallo en la comunicación con el servidor.');
      }
    });
  }

  // =========================================================================
  // 5. Dar de Baja a un Funcionario
  // =========================================================================
  async function confirmarBajaFuncionario(idEmpleado) {
    if (!confirm(`¿Estás seguro de que deseas dar de baja al funcionario con ID ${idEmpleado}? Esta acción lo retirará del padrón.`)) {
      return;
    }

    const token = localStorage.getItem('rh_token');
    try {
      const res = await fetch('/api/admin/funcionarios', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id_empleado: idEmpleado })
      });

      const data = await res.json();
      if (!res.ok) {
        showAdminToast('Error', data.error || 'No se pudo dar de baja.');
        return;
      }

      showAdminToast('Baja Exitosa', `Funcionario ${idEmpleado} retirado del padrón.`);
      await loadDashboardData();
    } catch (err) {
      console.error('Error al dar de baja:', err);
      showAdminToast('Error', 'Error al procesar la baja.');
    }
  }

  // =========================================================================
  // 6. Reiniciar Ciclo de Votación (1 Funcionario = 1 Voto para un nuevo ciclo)
  // =========================================================================
  if (btnResetCycle) {
    btnResetCycle.addEventListener('click', async () => {
      const confirmMsg = 
        "⚠️ ATENCIÓN: Esta acción reiniciará el estado de voto de TODOS los funcionarios (ya_voto = false) para comenzar un nuevo ciclo de reconocimientos.\n\n¿Deseas continuar?";
      
      if (!confirm(confirmMsg)) return;

      const token = localStorage.getItem('rh_token');
      try {
        const res = await fetch('/api/admin/reset-votos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        const data = await res.json();
        if (!res.ok) {
          showAdminToast('Error', data.error || 'No se pudo reiniciar el ciclo.');
          return;
        }

        showAdminToast('Ciclo Reiniciado', 'Todos los funcionarios pueden emitir un nuevo voto.');
        await loadDashboardData();
      } catch (err) {
        console.error('Error reiniciando ciclo:', err);
        showAdminToast('Error', 'Error en la petición de reinicio.');
      }
    });
  }

  // =========================================================================
  // 7. Cierre de Sesión
  // =========================================================================
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('rh_token');
      localStorage.removeItem('rh_user');
      window.location.href = '/';
    });
  }

  // =========================================================================
  // 8. Utilidades: Toast & Escape
  // =========================================================================
  function showAdminToast(title, msg) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon-check">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="toast-text">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(msg)}</span>
      </div>
    `;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Inicializar
  const isAuthorized = await checkAdminAuth();
  if (isAuthorized) {
    await loadDashboardData();
  }
});
