/**
 * Reconocimiento Hospitalario - Lógica del Panel de Administración
 * Supervisión del padrón, métricas de participación, filtro por cargo,
 * auditoría con trazabilidad de emisor real y bitácora de eliminaciones.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = null;
  let allStaff = [];
  let allAudits = [];
  let allLogs = [];
  let selectedRecToDelete = null;

  // Header y Perfil
  const adminAvatar = document.getElementById('adminAvatar');
  const adminName = document.getElementById('adminName');
  const adminRole = document.getElementById('adminRole');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  // Métricas
  const statTotalUsers = document.getElementById('statTotalUsers');
  const statVoted = document.getElementById('statVoted');
  const statPending = document.getElementById('statPending');
  const statParticipation = document.getElementById('statParticipation');
  const participationBar = document.getElementById('participationBar');

  // Pestañas (Tabs)
  const tabStaffBtn = document.getElementById('tabStaffBtn');
  const tabAuditBtn = document.getElementById('tabAuditBtn');
  const tabLogBtn = document.getElementById('tabLogBtn');
  const sectionStaff = document.getElementById('sectionStaff');
  const sectionAudit = document.getElementById('sectionAudit');
  const sectionLog = document.getElementById('sectionLog');

  const tabStaffBadge = document.getElementById('tabStaffBadge');
  const tabAuditBadge = document.getElementById('tabAuditBadge');
  const tabLogBadge = document.getElementById('tabLogBadge');

  // Filtros del Padrón
  const filterInput = document.getElementById('filterInput');
  const filterCargo = document.getElementById('filterCargo');
  const filteredCount = document.getElementById('filteredCount');
  const tableBody = document.getElementById('tableBody');

  // Filtros y Tabla de Auditoría
  const filterAuditInput = document.getElementById('filterAuditInput');
  const auditFilteredCount = document.getElementById('auditFilteredCount');
  const auditTableBody = document.getElementById('auditTableBody');

  // Tabla de Bitácora de Eliminaciones
  const logFilteredCount = document.getElementById('logFilteredCount');
  const logTableBody = document.getElementById('logTableBody');

  // Modal Alta Funcionario
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const addStaffModal = document.getElementById('addStaffModal');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
  const addStaffForm = document.getElementById('addStaffForm');

  // Modal Eliminar Felicitación (Auditoría)
  const deleteRecModal = document.getElementById('deleteRecModal');
  const closeDeleteRecModalBtn = document.getElementById('closeDeleteRecModalBtn');
  const cancelDeleteRecBtn = document.getElementById('cancelDeleteRecBtn');
  const deleteRecForm = document.getElementById('deleteRecForm');
  const deleteRecId = document.getElementById('deleteRecId');
  const deleteRecSummary = document.getElementById('deleteRecSummary');
  const deleteRecReasonSelect = document.getElementById('deleteRecReasonSelect');
  const deleteRecReasonDetail = document.getElementById('deleteRecReasonDetail');
  const deleteRecRestoreVote = document.getElementById('deleteRecRestoreVote');
  const confirmDeleteRecBtn = document.getElementById('confirmDeleteRecBtn');

  // Acciones Globales
  const btnResetCycle = document.getElementById('btnResetCycle');
  const toastContainer = document.getElementById('adminToastContainer');

  function getAuthHeaders() {
    const token = localStorage.getItem('rh_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // =========================================================================
  // 1. Verificación de Autenticación y Rol Admin
  // =========================================================================
  async function checkAdminAuth() {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      const data = await res.json();

      if (!data.authenticated || !data.user || !data.user.es_admin) {
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
            Esta zona está reservada exclusivamente para personal con credenciales de <strong>Administrador</strong>. Inicia sesión con una cuenta autorizada (Ej: <code>admin</code> con PIN <code>1234</code>).
          </p>
          <a href="/" style="display: inline-block; background-color: #FF6B4A; color: #FFFFFF; font-weight: 600; padding: 0.85rem 1.8rem; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 12px rgba(255, 107, 74, 0.3);">
            Ir al Inicio de Sesión
          </a>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 2. Control de Pestañas (Tabs)
  // =========================================================================
  function switchTab(tab) {
    // Resetear estados visuales
    [tabStaffBtn, tabAuditBtn, tabLogBtn].forEach(btn => {
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });
    [sectionStaff, sectionAudit, sectionLog].forEach(sec => {
      if (sec) sec.style.display = 'none';
    });

    if (tab === 'staff') {
      if (tabStaffBtn) {
        tabStaffBtn.classList.add('active');
        tabStaffBtn.setAttribute('aria-selected', 'true');
      }
      if (sectionStaff) sectionStaff.style.display = 'block';
    } else if (tab === 'audit') {
      if (tabAuditBtn) {
        tabAuditBtn.classList.add('active');
        tabAuditBtn.setAttribute('aria-selected', 'true');
      }
      if (sectionAudit) sectionAudit.style.display = 'block';
    } else if (tab === 'log') {
      if (tabLogBtn) {
        tabLogBtn.classList.add('active');
        tabLogBtn.setAttribute('aria-selected', 'true');
      }
      if (sectionLog) sectionLog.style.display = 'block';
    }
  }

  if (tabStaffBtn) tabStaffBtn.addEventListener('click', () => switchTab('staff'));
  if (tabAuditBtn) tabAuditBtn.addEventListener('click', () => switchTab('audit'));
  if (tabLogBtn) tabLogBtn.addEventListener('click', () => switchTab('log'));

  // =========================================================================
  // 3. Cargar Datos Globales del Dashboard
  // =========================================================================
  async function loadDashboardData() {
    try {
      // 1. Estadísticas
      const statsRes = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
      if (statsRes.ok) {
        const { stats } = await statsRes.json();
        if (statTotalUsers) statTotalUsers.textContent = stats.total;
        if (statVoted) statVoted.textContent = stats.votados;
        if (statPending) statPending.textContent = `${stats.pendientes} pendientes`;
        if (statParticipation) statParticipation.textContent = `${stats.participacion}%`;
        if (participationBar) participationBar.style.width = `${stats.participacion}%`;
      }

      // 2. Padrón de Funcionarios
      const staffRes = await fetch('/api/admin/funcionarios', { headers: getAuthHeaders() });
      if (staffRes.ok) {
        const data = await staffRes.json();
        allStaff = data.funcionarios || [];
        if (tabStaffBadge) tabStaffBadge.textContent = allStaff.length;
        applyStaffFilters();
      }

      // 3. Auditoría de Felicitaciones
      await loadAuditData();

      // 4. Bitácora de Eliminaciones
      await loadLogsData();

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      showAdminToast('Error de conexión', 'No se pudieron cargar los datos completos.');
    }
  }

  // =========================================================================
  // 4. Padrón de Funcionarios: Filtro por Texto y por Cargo
  // =========================================================================
  function applyStaffFilters() {
    const q = (filterInput ? filterInput.value : '').toLowerCase().trim();
    const selectedCargo = (filterCargo ? filterCargo.value : '').trim().toLowerCase();

    const filtered = allStaff.filter(f => {
      const cargoMatch = !selectedCargo || (f.cargo && f.cargo.toLowerCase() === selectedCargo);
      const textMatch = !q || (
        (f.nombre_completo && f.nombre_completo.toLowerCase().includes(q)) ||
        (f.id_empleado && f.id_empleado.toLowerCase().includes(q)) ||
        (f.servicio && f.servicio.toLowerCase().includes(q)) ||
        (f.cargo && f.cargo.toLowerCase().includes(q))
      );
      return cargoMatch && textMatch;
    });

    renderTable(filtered);
  }

  if (filterInput) filterInput.addEventListener('input', applyStaffFilters);
  if (filterCargo) filterCargo.addEventListener('change', applyStaffFilters);

  function renderTable(list) {
    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #94A3B8;">
            No se encontraron funcionarios con el criterio de búsqueda o cargo seleccionado.
          </td>
        </tr>
      `;
      if (filteredCount) filteredCount.textContent = `0 funcionarios`;
      return;
    }

    if (filteredCount) {
      filteredCount.textContent = `Mostrando ${list.length} de ${allStaff.length} funcionarios`;
    }

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
          <td><strong style="font-family: monospace; font-size: 0.92rem; color: #1E293B;">${escapeHtml(f.id_empleado)}</strong></td>
          <td>
            <div style="font-weight: 600; color: #0F172A;">${escapeHtml(f.nombre_completo)}</div>
          </td>
          <td><span style="color: #475569; font-size: 0.88rem;">${escapeHtml(f.servicio)}</span></td>
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
              <button class="btn-delete-row" data-id="${escapeHtml(f.id_empleado)}" title="Dar de baja funcionario">
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

    // Manejador para baja de funcionario
    document.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idToDelete = btn.getAttribute('data-id');
        confirmarBajaFuncionario(idToDelete);
      });
    });
  }

  // =========================================================================
  // 5. Auditoría de Felicitaciones & Trazabilidad de Emisor Real
  // =========================================================================
  async function loadAuditData() {
    try {
      const res = await fetch('/api/admin/reconocimientos', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        allAudits = data.reconocimientos || [];
        if (tabAuditBadge) tabAuditBadge.textContent = allAudits.length;
        applyAuditFilters();
      }
    } catch (e) {
      console.warn('Error cargando auditoría de reconocimientos:', e);
    }
  }

  function applyAuditFilters() {
    const q = (filterAuditInput ? filterAuditInput.value : '').toLowerCase().trim();
    if (!q) {
      renderAuditTable(allAudits);
      return;
    }

    const filtered = allAudits.filter(r => {
      const dest = String(r.destinatario_nombre || '').toLowerCase();
      const emisor = String(r.votante_nombre_real || '').toLowerCase();
      const idEmisor = String(r.id_votante || '').toLowerCase();
      const msg = String(r.mensaje || '').toLowerCase();
      const serv = String(r.destinatario_servicio || '').toLowerCase();
      const motivosStr = Array.isArray(r.motivos) ? r.motivos.join(' ').toLowerCase() : String(r.motivos || '').toLowerCase();

      return dest.includes(q) || emisor.includes(q) || idEmisor.includes(q) || msg.includes(q) || serv.includes(q) || motivosStr.includes(q);
    });

    renderAuditTable(filtered);
  }

  if (filterAuditInput) filterAuditInput.addEventListener('input', applyAuditFilters);

  function renderAuditTable(list) {
    if (!auditTableBody) return;

    if (list.length === 0) {
      auditTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4" style="color: #94A3B8;">
            No hay felicitaciones registradas que coincidan con la búsqueda.
          </td>
        </tr>
      `;
      if (auditFilteredCount) auditFilteredCount.textContent = `0 felicitaciones`;
      return;
    }

    if (auditFilteredCount) {
      auditFilteredCount.textContent = `Mostrando ${list.length} de ${allAudits.length} felicitaciones`;
    }

    auditTableBody.innerHTML = list.map(r => {
      let fechaStr = 'Reciente';
      if (r.creado_en) {
        try {
          fechaStr = new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(r.creado_en));
        } catch (e) {}
      }

      // Motivos
      const motivosArray = Array.isArray(r.motivos) ? r.motivos : [r.motivos || 'Compromiso'];
      const motivosHtml = motivosArray
        .map(m => `<span class="audit-motive-pill">🌟 ${escapeHtml(m)}</span>`)
        .join('');

      // Emisor real con trazabilidad institucional
      const isAnon = Boolean(r.es_anonimo);
      const anonBadge = isAnon 
        ? `<div style="margin-bottom: 0.25rem;"><span class="badge-anon-audit">🕶️ Anónimo en público</span></div>`
        : `<div style="margin-bottom: 0.25rem;"><span class="badge-real-audit">Público</span></div>`;

      return `
        <tr>
          <td>
            <strong style="font-size: 0.8rem; color: #64748B;">#${r.id}</strong>
            <div style="font-size: 0.78rem; color: #94A3B8; margin-top: 0.15rem;">${fechaStr}</div>
          </td>
          <td>
            ${anonBadge}
            <div style="font-weight: 700; color: #0F172A; font-size: 0.92rem;">${escapeHtml(r.votante_nombre_real || 'Funcionario')}</div>
            <div style="font-size: 0.78rem; color: #475569; font-family: monospace;">ID/RUT: ${escapeHtml(r.id_votante || 'N/A')}</div>
            <div style="font-size: 0.74rem; color: #64748B;">${escapeHtml(r.votante_cargo_real || '')} ${r.votante_servicio_real ? '• ' + escapeHtml(r.votante_servicio_real) : ''}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: #0F172A; font-size: 0.92rem;">${escapeHtml(r.destinatario_nombre)}</div>
            <div style="font-size: 0.78rem; color: #64748B;">${escapeHtml(r.destinatario_servicio || 'Servicio Hospitalario')}</div>
          </td>
          <td style="max-width: 220px;">
            <div style="display: flex; flex-wrap: wrap;">
              ${motivosHtml}
            </div>
          </td>
          <td style="max-width: 260px;">
            ${r.mensaje ? `
              <p style="font-size: 0.86rem; color: #334155; font-style: italic; line-height: 1.35; margin: 0;">
                "${escapeHtml(r.mensaje)}"
              </p>
            ` : '<span style="font-size: 0.78rem; color: #94A3B8;">(Sin mensaje personal)</span>'}
          </td>
          <td class="text-right">
            <button class="btn-delete-rec" data-rec-id="${r.id}" title="Eliminar felicitación con auditoría">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Eliminar</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Listener para eliminar felicitación
    auditTableBody.querySelectorAll('.btn-delete-rec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-rec-id'), 10);
        const rec = allAudits.find(item => item.id === id);
        if (rec) abrirModalEliminarRec(rec);
      });
    });
  }

  // =========================================================================
  // 6. Modal y Flujo de Eliminación de Felicitaciones con Bitácora
  // =========================================================================
  function abrirModalEliminarRec(rec) {
    selectedRecToDelete = rec;
    deleteRecId.value = rec.id;

    const motivosText = Array.isArray(rec.motivos) ? rec.motivos.join(', ') : (rec.motivos || '');
    deleteRecSummary.innerHTML = `
      <div style="margin-bottom: 0.4rem;">
        <strong>Destinatario:</strong> ${escapeHtml(rec.destinatario_nombre)} (${escapeHtml(rec.destinatario_servicio || 'Servicio Hospitalario')})
      </div>
      <div style="margin-bottom: 0.4rem;">
        <strong>Emisor Real:</strong> ${escapeHtml(rec.votante_nombre_real)} (${escapeHtml(rec.id_votante)}) ${rec.es_anonimo ? '<span class="badge-anon-audit" style="margin-left: 0.3rem;">Anónimo</span>' : ''}
      </div>
      <div style="margin-bottom: 0.4rem;">
        <strong>Motivos:</strong> ${escapeHtml(motivosText)}
      </div>
      ${rec.mensaje ? `<div><strong>Mensaje:</strong> "${escapeHtml(rec.mensaje)}"</div>` : ''}
    `;

    deleteRecReasonSelect.selectedIndex = 0;
    deleteRecReasonDetail.value = '';
    deleteRecRestoreVote.checked = true;

    deleteRecModal.style.display = 'flex';
  }

  function cerrarModalEliminarRec() {
    deleteRecModal.style.display = 'none';
    selectedRecToDelete = null;
  }

  if (closeDeleteRecModalBtn) closeDeleteRecModalBtn.addEventListener('click', cerrarModalEliminarRec);
  if (cancelDeleteRecBtn) cancelDeleteRecBtn.addEventListener('click', cerrarModalEliminarRec);

  if (deleteRecForm) {
    deleteRecForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedRecToDelete) return;

      const id = selectedRecToDelete.id;
      const motivoPrincipal = deleteRecReasonSelect.value;
      const detalle = deleteRecReasonDetail.value.trim();
      const motivoFinal = detalle ? `${motivoPrincipal}: ${detalle}` : motivoPrincipal;
      const restituirVoto = deleteRecRestoreVote.checked;

      confirmDeleteRecBtn.disabled = true;
      confirmDeleteRecBtn.innerHTML = `<span>Procesando eliminación...</span>`;

      try {
        const res = await fetch('/api/admin/reconocimientos', {
          method: 'DELETE',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id,
            motivo_eliminacion: motivoFinal,
            restituir_voto: restituirVoto
          })
        });

        const data = await res.json();

        if (!res.ok) {
          showAdminToast('Error', data.error || 'No se pudo eliminar la felicitación.');
          confirmDeleteRecBtn.disabled = false;
          confirmDeleteRecBtn.innerHTML = `<span>Confirmar Eliminación y Registrar Auditoría</span>`;
          return;
        }

        cerrarModalEliminarRec();
        showAdminToast('Felicitación Eliminada', 'Se retiró del muro público y se registró la acción en la bitácora de auditoría.');

        // Recargar todo el estado del panel
        await loadDashboardData();

      } catch (err) {
        console.error('Error al eliminar reconocimiento:', err);
        showAdminToast('Error', 'Fallo de conexión al eliminar felicitación.');
      } finally {
        confirmDeleteRecBtn.disabled = false;
        confirmDeleteRecBtn.innerHTML = `<span>Confirmar Eliminación y Registrar Auditoría</span>`;
      }
    });
  }

  // =========================================================================
  // 7. Bitácora de Eliminaciones (Historial de Auditoría)
  // =========================================================================
  async function loadLogsData() {
    try {
      const res = await fetch('/api/admin/eliminaciones', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        allLogs = data.historial || [];
        if (tabLogBadge) tabLogBadge.textContent = allLogs.length;
        renderLogsTable(allLogs);
      }
    } catch (e) {
      console.warn('Error cargando historial de eliminaciones:', e);
    }
  }

  function renderLogsTable(logs) {
    if (!logTableBody) return;

    if (logs.length === 0) {
      logTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4" style="color: #94A3B8;">
            No se han registrado eliminaciones de felicitaciones.
          </td>
        </tr>
      `;
      if (logFilteredCount) logFilteredCount.textContent = `0 registros`;
      return;
    }

    if (logFilteredCount) {
      logFilteredCount.textContent = `${logs.length} registro${logs.length === 1 ? '' : 's'} en bitácora`;
    }

    logTableBody.innerHTML = logs.map(l => {
      let fechaStr = 'Reciente';
      if (l.fecha_eliminacion) {
        try {
          fechaStr = new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(l.fecha_eliminacion));
        } catch (e) {}
      }

      return `
        <tr>
          <td style="white-space: nowrap;">
            <div style="font-weight: 600; font-size: 0.84rem; color: #0F172A;">${fechaStr}</div>
            <span style="font-size: 0.72rem; color: #94A3B8;">ID Orig: #${l.id_reconocimiento_original || l.id}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.9rem;">${escapeHtml(l.destinatario_nombre)}</div>
            <div style="font-size: 0.78rem; color: #64748B;">${escapeHtml(l.destinatario_servicio || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: #1E293B; font-size: 0.88rem;">${escapeHtml(l.nombre_votante_real)}</div>
            <div style="font-size: 0.76rem; color: #64748B; font-family: monospace;">${escapeHtml(l.id_votante_real)}</div>
            ${l.es_anonimo ? '<span class="badge-anon-audit" style="margin-top: 0.2rem;">Era Anónimo</span>' : ''}
          </td>
          <td style="max-width: 240px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: #C2410C; margin-bottom: 0.2rem;">${escapeHtml(l.motivos || '')}</div>
            ${l.mensaje ? `<p style="font-size: 0.82rem; color: #475569; font-style: italic; margin: 0;">"${escapeHtml(l.mensaje)}"</p>` : '<span style="font-size: 0.76rem; color: #94A3B8;">(Sin mensaje)</span>'}
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.85rem; color: #0F172A;">${escapeHtml(l.eliminado_por_nombre || 'Admin')}</div>
            <div style="font-size: 0.74rem; color: #64748B; font-family: monospace;">ID: ${escapeHtml(l.eliminado_por_id || 'admin')}</div>
          </td>
          <td style="max-width: 220px;">
            <span style="display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; background: #FEE2E2; color: #991B1B; font-size: 0.8rem; font-weight: 600;">
              ${escapeHtml(l.motivo_eliminacion)}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 8. Agregar y Dar de Baja Funcionario
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

      try {
        const res = await fetch('/api/admin/funcionarios', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id_empleado, nombre_completo, servicio, cargo, pin, es_admin })
        });

        const data = await res.json();
        if (!res.ok) {
          showAdminToast('Error al guardar', data.error || 'No se pudo agregar al funcionario.');
          return;
        }

        cerrarModalAlta();
        showAdminToast('Funcionario Registrado', `${nombre_completo} ha sido incorporado/a al padrón oficial.`);
        await loadDashboardData();

      } catch (err) {
        console.error('Error agregando funcionario:', err);
        showAdminToast('Error', 'Fallo de conexión al guardar funcionario.');
      }
    });
  }

  async function confirmarBajaFuncionario(idEmpleado) {
    const funcionario = allStaff.find(f => f.id_empleado.toLowerCase() === idEmpleado.toLowerCase());
    const nombre = funcionario ? funcionario.nombre_completo : idEmpleado;

    if (!confirm(`¿Estás seguro de que deseas dar de baja del padrón a:\n\n${nombre} (${idEmpleado})?\n\nEsta acción revocará su acceso a la plataforma.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/funcionarios', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_empleado: idEmpleado })
      });

      const data = await res.json();
      if (!res.ok) {
        showAdminToast('Error al dar de baja', data.error || 'No se pudo completar la baja.');
        return;
      }

      showAdminToast('Baja Exitosa', `${nombre} fue retirado/a del padrón hospitalario.`);
      await loadDashboardData();

    } catch (err) {
      console.error('Error dando de baja:', err);
      showAdminToast('Error', 'Error de conexión con el servidor.');
    }
  }

  // =========================================================================
  // 9. Reinicio Manual del Ciclo
  // =========================================================================
  if (btnResetCycle) {
    btnResetCycle.addEventListener('click', async () => {
      const confirmMsg = 
        "⚠️ ATENCIÓN: Esta acción reiniciará el estado de voto de TODOS los funcionarios (ya_voto = false) para comenzar un nuevo ciclo de reconocimientos.\n\n¿Deseas continuar?";
      
      if (!confirm(confirmMsg)) return;

      try {
        const res = await fetch('/api/admin/reset-votos', {
          method: 'POST',
          headers: getAuthHeaders()
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
  // 10. Cierre de Sesión y Manejador de Escape
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

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (addStaffModal && addStaffModal.style.display === 'flex') cerrarModalAlta();
      if (deleteRecModal && deleteRecModal.style.display === 'flex') cerrarModalEliminarRec();
    }
  });

  // =========================================================================
  // 11. Utilidades: Toast & Escape
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
