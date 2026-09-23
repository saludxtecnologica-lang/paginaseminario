/**
 * Reconocimiento Hospitalario - Lógica de Frontend Principal
 * Autenticación por Padrón (ID/PIN), Control 1 Funcionario = 1 Voto y Feed Dinámico.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado Global del Cliente
  let currentUser = null;
  let totalRecognitions = 5;

  // Elementos de la Cabecera
  const header = document.getElementById('header');
  const loginTriggerBtn = document.getElementById('loginTriggerBtn');
  const userMenuWrapper = document.getElementById('userMenuWrapper');
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userAvatarLetter = document.getElementById('userAvatarLetter');
  const dropdownAvatarLetter = document.getElementById('dropdownAvatarLetter');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserRole = document.getElementById('dropdownUserRole');
  const adminPanelLink = document.getElementById('adminPanelLink');
  const logoutBtn = document.getElementById('logoutBtn');

  // Elementos del Formulario y Control de Voto
  const formGuestCard = document.getElementById('formGuestCard');
  const formAuthContainer = document.getElementById('formAuthContainer');
  const guestLoginActionBtn = document.getElementById('guestLoginActionBtn');

  const voterStatusBanner = document.getElementById('voterStatusBanner');
  const voterStatusIcon = document.getElementById('voterStatusIcon');
  const voterStatusTitle = document.getElementById('voterStatusTitle');
  const voterStatusDesc = document.getElementById('voterStatusDesc');
  const bannerLoginBtn = document.getElementById('bannerLoginBtn');

  const formCardContainer = document.querySelector('.form-auth-container') || document.querySelector('.form-card-container');
  const recognitionForm = document.getElementById('recognitionForm');
  
  // Elementos del Selector / Buscador de Funcionarios (Padrón Oficial)
  const colleagueCombobox = document.getElementById('colleagueCombobox');
  const colleagueSearchInput = document.getElementById('colleagueSearchInput');
  const colleagueDropdownList = document.getElementById('colleagueDropdownList');
  const clearColleagueBtn = document.getElementById('clearColleagueBtn');
  const toggleColleagueDropdownBtn = document.getElementById('toggleColleagueDropdownBtn');
  const selectedColleagueChip = document.getElementById('selectedColleagueChip');
  const chipAvatar = document.getElementById('chipAvatar');
  const chipName = document.getElementById('chipName');
  const chipService = document.getElementById('chipService');
  const colleagueNameInput = document.getElementById('colleagueName');
  const colleagueServiceInput = document.getElementById('colleagueService');
  const colleagueIdInput = document.getElementById('colleagueId');

  let funcionariosRoster = [];
  let selectedColleague = null;

  const nameError = document.getElementById('nameError');
  const reasonsError = document.getElementById('reasonsError');
  const checkboxItems = document.querySelectorAll('.custom-checkbox-item');
  const optionalMessageInput = document.getElementById('optionalMessage');
  const isAnonymousCheckbox = document.getElementById('isAnonymous');
  const submitBtn = document.getElementById('submitBtn');

  // Muro y Hero
  const gratitudeFeed = document.getElementById('gratitudeFeed');
  const wallCountBadge = document.getElementById('wallCountBadge');
  const cycleResetBadge = document.getElementById('cycleResetBadge');
  const heroCtaBtn = document.getElementById('heroCtaBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Modal de Detalle de Menciones
  const mentionsModal = document.getElementById('mentionsModal');
  const closeMentionsModalBtn = document.getElementById('closeMentionsModalBtn');
  const dismissMentionsBtn = document.getElementById('dismissMentionsBtn');
  const mentionsProfileAvatar = document.getElementById('mentionsProfileAvatar');
  const mentionsProfileName = document.getElementById('mentionsProfileName');
  const mentionsProfileService = document.getElementById('mentionsProfileService');
  const mentionsHeartNumber = document.getElementById('mentionsHeartNumber');
  const mentionsItemsList = document.getElementById('mentionsItemsList');


  // Modal de Autenticación
  const authModal = document.getElementById('authModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const loginForm = document.getElementById('loginForm');
  const loginIdEmpleado = document.getElementById('loginIdEmpleado');
  const loginPin = document.getElementById('loginPin');
  const authErrorAlert = document.getElementById('authErrorAlert');

  // =========================================================================
  // 1. API Client Helper (Token Bearer & Cookies)
  // =========================================================================
  function getAuthHeaders() {
    const token = localStorage.getItem('rh_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // =========================================================================
  // 2. Comprobar Sesión Activa (`/api/auth/me` + Caché en localStorage)
  // =========================================================================
  // Cargar de inmediato desde localStorage para activación instantánea
  const cachedUserStr = localStorage.getItem('rh_user');
  if (cachedUserStr) {
    try {
      currentUser = JSON.parse(cachedUserStr);
      renderAuthenticatedState();
    } catch (e) {
      localStorage.removeItem('rh_user');
    }
  }

  async function checkSession() {
    const token = localStorage.getItem('rh_token');
    if (!token) {
      currentUser = null;
      renderGuestState();
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.authenticated && data.user) {
        currentUser = data.user;
        localStorage.setItem('rh_user', JSON.stringify(data.user));
        renderAuthenticatedState();
      } else {
        localStorage.removeItem('rh_token');
        localStorage.removeItem('rh_user');
        currentUser = null;
        renderGuestState();
      }
    } catch (err) {
      console.warn('Verificación de sesión en segundo plano diferida:', err.message);
      if (currentUser) {
        renderAuthenticatedState();
      } else {
        renderGuestState();
      }
    }
  }

  function renderAuthenticatedState() {
    if (!currentUser) return;

    // 1. Actualizar Cabecera (Navbar)
    if (loginTriggerBtn) loginTriggerBtn.style.display = 'none';
    if (userMenuWrapper) userMenuWrapper.style.display = 'inline-flex';

    const initials = (currentUser.nombre_completo || 'Usuario')
      .split(' ')
      .filter(w => w.length > 0)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'U';

    if (userAvatarLetter) userAvatarLetter.textContent = initials;
    if (dropdownAvatarLetter) dropdownAvatarLetter.textContent = initials;
    if (dropdownUserName) dropdownUserName.textContent = currentUser.nombre_completo || 'Funcionario';
    if (dropdownUserRole) dropdownUserRole.textContent = `${currentUser.servicio || 'Servicio Hospitalario'} • ID: ${currentUser.id_empleado}`;

    const userNavName = document.getElementById('userNavName');
    if (userNavName) userNavName.textContent = currentUser.nombre_completo || 'Funcionario';

    // 2. Actualizar Tarjeta de Sesión Activa en el Hero (Inicio)
    const heroAuthCard = document.getElementById('heroAuthCard');
    const heroAuthAvatar = document.getElementById('heroAuthAvatar');
    const heroAuthName = document.getElementById('heroAuthName');
    const heroAuthRole = document.getElementById('heroAuthRole');
    if (heroAuthCard) {
      heroAuthCard.style.display = 'flex';
      if (heroAuthAvatar) heroAuthAvatar.textContent = initials;
      if (heroAuthName) heroAuthName.textContent = currentUser.nombre_completo || 'Funcionario';
      if (heroAuthRole) {
        heroAuthRole.textContent = `${currentUser.servicio || 'Servicio Hospitalario'} • ${currentUser.ya_voto ? '✓ Ya participaste en este ciclo' : '1 voto disponible'}`;
      }
    }

    if (heroCtaBtn) {
      heroCtaBtn.innerHTML = `
        <span>Ir a mi Formulario de Reconocimiento</span>
        <svg class="btn-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    // 3. Mostrar enlace a Panel Admin si tiene privilegios
    if (adminPanelLink) {
      adminPanelLink.style.display = currentUser.es_admin ? 'flex' : 'none';
    }

    // 4. Ocultar tarjeta de invitado y mostrar formulario de felicitación
    if (formGuestCard) formGuestCard.style.display = 'none';
    if (formAuthContainer) formAuthContainer.style.display = 'block';

    // 5. Actualizar Banner de Votación (Control 1 Funcionario = 1 Voto)
    if (voterStatusBanner) {
      if (currentUser.ya_voto) {
        // YA VOTÓ: Bloquear formulario y mostrar aviso
        voterStatusBanner.className = 'voter-status-banner voted';
        if (voterStatusIcon) {
          voterStatusIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
        }
        if (voterStatusTitle) voterStatusTitle.textContent = `✓ Reconocimiento ya emitido en este ciclo`;
        if (voterStatusDesc) voterStatusDesc.textContent = `Hola ${currentUser.nombre_completo}. Ya has participado en este periodo. La plataforma hospitalaria aplica la regla estricta de 1 voto por funcionario.`;
        if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';

        // Bloquear campos visualmente
        bloquearFormulario(true, 'Ya has participado en este ciclo');
      } else {
        // HABILITADO PARA VOTAR
        voterStatusBanner.className = 'voter-status-banner ready';
        if (voterStatusIcon) {
          voterStatusIcon.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          `;
        }
        if (voterStatusTitle) voterStatusTitle.textContent = `Habilitado para Reconocimiento Oficial`;
        if (voterStatusDesc) voterStatusDesc.textContent = `Identificado como: ${currentUser.nombre_completo} (${currentUser.servicio || 'Servicio Hospitalario'}) • Tienes 1 reconocimiento disponible.`;
        if (bannerLoginBtn) bannerLoginBtn.style.display = 'none';

        bloquearFormulario(false);
      }
    }
  }

  function renderGuestState() {
    currentUser = null;
    if (loginTriggerBtn) loginTriggerBtn.style.display = 'inline-flex';
    if (userMenuWrapper) userMenuWrapper.style.display = 'none';
    if (adminPanelLink) adminPanelLink.style.display = 'none';

    // Ocultar tarjeta de usuario en Hero y restaurar botón CTA
    const heroAuthCard = document.getElementById('heroAuthCard');
    if (heroAuthCard) heroAuthCard.style.display = 'none';

    if (heroCtaBtn) {
      heroCtaBtn.innerHTML = `
        <span>Enviar Reconocimiento</span>
        <svg class="btn-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    // Para Invitados: Ocultar formulario de felicitación y mostrar tarjeta de acceso exclusivo
    if (formAuthContainer) formAuthContainer.style.display = 'none';
    if (formGuestCard) formGuestCard.style.display = 'flex';

    bloquearFormulario(false);
  }

  function bloquearFormulario(bloquear, textoBoton = '[Enviar]') {
    if (!formCardContainer) return;
    if (bloquear) {
      formCardContainer.classList.add('locked');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>🔒 ${textoBoton}</span>`;
      }
    } else {
      formCardContainer.classList.remove('locked');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>[Enviar]</span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
    }
  }

  // =========================================================================
  // 3. Modal de Autenticación (Login con ID y PIN)
  // =========================================================================
  function abrirModalAuth() {
    if (!authModal) return;
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    authErrorAlert.style.display = 'none';
    authErrorAlert.textContent = '';
    loginForm.reset();
    if (loginPin) loginPin.type = 'password';
    setTimeout(() => {
      if (loginIdEmpleado) loginIdEmpleado.focus();
    }, 100);
  }

  function cerrarModalAuth() {
    if (!authModal) return;
    authModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (loginTriggerBtn) loginTriggerBtn.addEventListener('click', abrirModalAuth);
  if (guestLoginActionBtn) guestLoginActionBtn.addEventListener('click', abrirModalAuth);
  if (bannerLoginBtn) bannerLoginBtn.addEventListener('click', abrirModalAuth);
  if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', cerrarModalAuth);

  // Alternar visibilidad de contraseña / PIN
  if (togglePasswordBtn && loginPin) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPass = loginPin.type === 'password';
      loginPin.type = isPass ? 'text' : 'password';
      togglePasswordBtn.innerHTML = isPass
        ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
             <line x1="1" y1="1" x2="23" y2="23"></line>
           </svg>`
        : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
             <circle cx="12" cy="12" r="3"></circle>
           </svg>`;
    });
  }

  // Cerrar al presionar fuera o Escape
  window.addEventListener('click', (e) => {
    if (e.target === authModal) cerrarModalAuth();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (authModal && authModal.style.display === 'flex') {
        cerrarModalAuth();
      }
      if (mentionsModal && mentionsModal.style.display === 'flex') {
        cerrarModalMenciones();
      }
    }
  });


  // Botones de demostración rápida
  document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loginIdEmpleado.value = btn.getAttribute('data-id');
      loginPin.value = btn.getAttribute('data-pin');
      loginForm.dispatchEvent(new Event('submit'));
    });
  });

  // Procesar Formulario de Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id_empleado = loginIdEmpleado.value.trim();
      const pin = loginPin.value.trim();

      if (!id_empleado || !pin) {
        mostrarErrorAuth('Por favor completa ambos campos.');
        return;
      }

      const submitBtnModal = document.getElementById('loginSubmitBtn');
      submitBtnModal.disabled = true;
      submitBtnModal.textContent = 'Verificando credenciales...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_empleado, pin })
        });

        let data = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          data = { error: `Error del servidor (${res.status}: ${res.statusText || 'Respuesta inesperada'})` };
        }

        if (!res.ok) {
          mostrarErrorAuth(data.error || 'Credenciales incorrectas.');
          submitBtnModal.disabled = false;
          submitBtnModal.textContent = 'Ingresar a la Plataforma';
          return;
        }

        // Guardar token y usuario en localStorage
        localStorage.setItem('rh_token', data.token);
        localStorage.setItem('rh_user', JSON.stringify(data.user));
        currentUser = data.user;

        cerrarModalAuth();
        renderAuthenticatedState();

        // Desplazar automáticamente hacia el formulario/panel del usuario
        setTimeout(() => {
          const formularioSec = document.getElementById('formulario-seccion');
          if (formularioSec) {
            formularioSec.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);

        mostrarToast(
          `¡Bienvenido(a), ${currentUser.nombre_completo}!`,
          currentUser.es_admin
            ? 'Acceso concedido con privilegios de Administrador.'
            : (currentUser.ya_voto ? 'Ya has participado en este ciclo.' : 'Estás habilitado para emitir tu reconocimiento.')
        );

      } catch (err) {
        console.error('Error durante el login:', err);
        mostrarErrorAuth('Error conectando con el servidor.');
      } finally {
        submitBtnModal.disabled = false;
        submitBtnModal.textContent = 'Ingresar a la Plataforma';
      }
    });
  }

  function mostrarErrorAuth(msg) {
    authErrorAlert.textContent = msg;
    authErrorAlert.style.display = 'block';
  }

  // =========================================================================
  // 4. Cierre de Sesión
  // =========================================================================
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        console.warn('Logout offline:', e.message);
      }
      localStorage.removeItem('rh_token');
      localStorage.removeItem('rh_user');
      currentUser = null;
      renderGuestState();
      if (userDropdown) userDropdown.classList.remove('show');
      mostrarToast('Sesión finalizada', 'Has cerrado tu sesión institucional.');
    });
  }

  // =========================================================================
  // 5. Menú de Usuario (Avatar Dropdown)
  // =========================================================================
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && e.target !== userMenuBtn) {
        userDropdown.classList.remove('show');
      }
    });
  }

  // =========================================================================
  // 6. Selección de Checkboxes
  // =========================================================================
  checkboxItems.forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (checkbox.checked) item.classList.add('checked');

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        item.classList.add('checked');
        reasonsError.classList.remove('visible');
      } else {
        item.classList.remove('checked');
      }
    });
  });

  // =========================================================================
  // 6b. Lógica del Buscador / Selector de Funcionarios (Padrón Oficial)
  // =========================================================================
  async function cargarFuncionariosRoster() {
    try {
      const res = await fetch('/api/funcionarios');
      if (res.ok) {
        const data = await res.json();
        funcionariosRoster = data.funcionarios || [];
      }
    } catch (e) {
      console.warn('No se pudo cargar el padrón de funcionarios:', e.message);
    }
  }

  function getEligibleFuncionarios(query = '') {
    const cleanQuery = query.trim().toLowerCase();
    return funcionariosRoster.filter(f => {
      // Excluir al usuario actualmente autenticado (no permitirse auto-felicitarse)
      if (currentUser && f.id_empleado && f.id_empleado.toLowerCase() === String(currentUser.id_empleado).toLowerCase()) {
        return false;
      }
      if (!cleanQuery) return true;
      return (
        (f.nombre_completo && f.nombre_completo.toLowerCase().includes(cleanQuery)) ||
        (f.servicio && f.servicio.toLowerCase().includes(cleanQuery)) ||
        (f.cargo && f.cargo.toLowerCase().includes(cleanQuery))
      );
    });
  }

  function renderColleagueDropdown(query = '') {
    if (!colleagueDropdownList) return;
    const matches = getEligibleFuncionarios(query);

    if (matches.length === 0) {
      colleagueDropdownList.innerHTML = `
        <div class="colleague-dropdown-empty">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>No figura ningún funcionario con "${escapeHtml(query)}" en la plantilla registrada.</span>
        </div>
      `;
      colleagueDropdownList.style.display = 'block';
      return;
    }

    colleagueDropdownList.innerHTML = matches.map(f => {
      const initials = (f.nombre_completo || 'U')
        .split(' ')
        .filter(w => w.length > 0)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('') || 'U';

      const isSelected = selectedColleague && selectedColleague.id_empleado === f.id_empleado;

      return `
        <div class="colleague-dropdown-item ${isSelected ? 'selected' : ''}" 
             data-id="${escapeHtml(f.id_empleado)}"
             data-nombre="${escapeHtml(f.nombre_completo)}"
             data-servicio="${escapeHtml(f.servicio || '')}">
          <div class="item-avatar">${initials}</div>
          <div class="item-info">
            <strong class="item-name">${escapeHtml(f.nombre_completo)}</strong>
            <span class="item-service">${escapeHtml(f.servicio || 'Servicio Hospitalario')}</span>
          </div>
          <span class="item-badge">${escapeHtml(f.cargo || 'Funcionario')}</span>
        </div>
      `;
    }).join('');

    colleagueDropdownList.style.display = 'block';

    // Manejador de selección de cada item
    colleagueDropdownList.querySelectorAll('.colleague-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const fId = item.getAttribute('data-id');
        const found = funcionariosRoster.find(f => f.id_empleado === fId);
        seleccionarFuncionario(found || {
          id_empleado: fId,
          nombre_completo: item.getAttribute('data-nombre'),
          servicio: item.getAttribute('data-servicio')
        });
      });
    });
  }

  function seleccionarFuncionario(func) {
    if (!func) return;
    selectedColleague = func;

    if (colleagueNameInput) colleagueNameInput.value = func.nombre_completo;
    if (colleagueServiceInput) colleagueServiceInput.value = func.servicio || '';
    if (colleagueIdInput) colleagueIdInput.value = func.id_empleado;
    if (colleagueSearchInput) colleagueSearchInput.value = func.nombre_completo;

    if (selectedColleagueChip) {
      const initials = (func.nombre_completo || 'U')
        .split(' ')
        .filter(w => w.length > 0)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('') || 'U';

      if (chipAvatar) chipAvatar.textContent = initials;
      if (chipName) chipName.textContent = func.nombre_completo;
      if (chipService) chipService.textContent = `${func.servicio || 'Servicio Hospitalario'} • ${func.cargo || 'Personal Hospitalario'}`;
      selectedColleagueChip.style.display = 'flex';
    }

    if (clearColleagueBtn) clearColleagueBtn.style.display = 'flex';
    if (nameError) nameError.classList.remove('visible');
    cerrarDropdownColleague();
  }

  function limpiarSeleccionFuncionario() {
    selectedColleague = null;
    if (colleagueNameInput) colleagueNameInput.value = '';
    if (colleagueServiceInput) colleagueServiceInput.value = '';
    if (colleagueIdInput) colleagueIdInput.value = '';
    if (colleagueSearchInput) {
      colleagueSearchInput.value = '';
      colleagueSearchInput.focus();
    }
    if (selectedColleagueChip) selectedColleagueChip.style.display = 'none';
    if (clearColleagueBtn) clearColleagueBtn.style.display = 'none';
    renderColleagueDropdown('');
  }

  function cerrarDropdownColleague() {
    if (colleagueDropdownList) colleagueDropdownList.style.display = 'none';
    if (toggleColleagueDropdownBtn) toggleColleagueDropdownBtn.classList.remove('open');
  }

  // Eventos del combobox de búsqueda
  if (colleagueSearchInput) {
    colleagueSearchInput.addEventListener('focus', () => {
      renderColleagueDropdown(colleagueSearchInput.value);
      if (toggleColleagueDropdownBtn) toggleColleagueDropdownBtn.classList.add('open');
    });

    colleagueSearchInput.addEventListener('input', () => {
      if (selectedColleague && colleagueSearchInput.value.trim() !== selectedColleague.nombre_completo) {
        selectedColleague = null;
        if (colleagueNameInput) colleagueNameInput.value = '';
        if (colleagueServiceInput) colleagueServiceInput.value = '';
        if (colleagueIdInput) colleagueIdInput.value = '';
        if (selectedColleagueChip) selectedColleagueChip.style.display = 'none';
        if (clearColleagueBtn) clearColleagueBtn.style.display = 'none';
      }
      renderColleagueDropdown(colleagueSearchInput.value);
    });
  }

  if (toggleColleagueDropdownBtn) {
    toggleColleagueDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = colleagueDropdownList && colleagueDropdownList.style.display === 'block';
      if (isOpen) {
        cerrarDropdownColleague();
      } else {
        if (colleagueSearchInput) colleagueSearchInput.focus();
        renderColleagueDropdown(colleagueSearchInput ? colleagueSearchInput.value : '');
        toggleColleagueDropdownBtn.classList.add('open');
      }
    });
  }

  if (clearColleagueBtn) {
    clearColleagueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      limpiarSeleccionFuncionario();
    });
  }

  // Cerrar lista al hacer clic fuera del combobox
  document.addEventListener('click', (e) => {
    if (colleagueCombobox && !colleagueCombobox.contains(e.target)) {
      cerrarDropdownColleague();
    }
  });

  // =========================================================================
  // 7. Envío de Reconocimiento Protegido (1 Funcionario = 1 Voto)
  // =========================================================================
  if (recognitionForm) {
    recognitionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Exigir autenticación antes de votar
      if (!currentUser) {
        mostrarToast('Autenticación Requerida', 'Debes ingresar con tu ID y PIN para que tu voto sea válido.');
        abrirModalAuth();
        return;
      }

      // Validar si ya votó en este ciclo
      if (currentUser.ya_voto) {
        mostrarToast('Acción Bloqueada', 'Ya has emitido tu reconocimiento para este ciclo (1 funcionario = 1 voto).');
        return;
      }

      // Validar que se haya seleccionado un funcionario registrado
      const nameVal = colleagueNameInput ? colleagueNameInput.value.trim() : '';
      const selectedCheckboxes = document.querySelectorAll('input[name="reasons"]:checked');
      let isValid = true;

      if (!selectedColleague || !nameVal) {
        nameError.textContent = 'Por favor, selecciona a un funcionario registrado en la plantilla del hospital.';
        nameError.classList.add('visible');
        isValid = false;
      } else {
        nameError.classList.remove('visible');
      }

      if (selectedCheckboxes.length === 0) {
        reasonsError.classList.add('visible');
        isValid = false;
      } else {
        reasonsError.classList.remove('visible');
      }

      if (!isValid) return;

      const reasons = Array.from(selectedCheckboxes).map(cb => cb.value);
      const optionalMessage = optionalMessageInput ? optionalMessageInput.value.trim() : '';
      const esAnonimo = isAnonymousCheckbox ? isAnonymousCheckbox.checked : false;

      // Estado de envío
      submitBtn.disabled = true;
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span>Procesando reconocimiento...</span>`;

      try {
        const res = await fetch('/api/reconocimientos', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            destinatario_nombre: selectedColleague.nombre_completo,
            destinatario_servicio: selectedColleague.servicio || '',
            motivos: reasons,
            mensaje: optionalMessage,
            es_anonimo: esAnonimo
          })
        });

        const data = await res.json();

        if (!res.ok) {
          mostrarToast('Error al enviar', data.error || 'No se pudo procesar el voto.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHTML;
          return;
        }

        // Éxito: Marcar que el funcionario ya votó
        currentUser.ya_voto = true;
        renderAuthenticatedState();

        // Actualizar el feed del Muro con el Top 5 recalculado
        await cargarReconocimientosPublicos();

        mostrarToast(
          '¡Reconocimiento Registrado con Éxito!',
          `Tu felicitación hacia ${selectedColleague.nombre_completo} ha sido registrada oficialmente.`
        );

        // Resetear formulario y selector
        recognitionForm.reset();
        limpiarSeleccionFuncionario();
        checkboxItems.forEach(i => i.classList.remove('checked'));

      } catch (err) {
        console.error('Error al enviar reconocimiento:', err);
        mostrarToast('Error', 'Fallo de conexión con el servidor.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // =========================================================================
  // 8. Detalle de Menciones (Modal Interactivo)
  // =========================================================================
  function abrirModalMenciones(persona) {
    if (!persona || !mentionsModal) return;

    const initials = (persona.destinatario_nombre || 'RH')
      .split(' ')
      .filter(w => w.length > 0)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'RH';

    if (mentionsProfileAvatar) mentionsProfileAvatar.textContent = initials;
    if (mentionsProfileName) mentionsProfileName.textContent = persona.destinatario_nombre;
    if (mentionsProfileService) mentionsProfileService.textContent = persona.destinatario_servicio || 'Servicio Hospitalario';
    
    const totalHearts = persona.total_felicitaciones || (persona.menciones ? persona.menciones.length : 1);
    if (mentionsHeartNumber) mentionsHeartNumber.textContent = totalHearts;

    if (mentionsItemsList) {
      const menciones = persona.menciones || [];
      if (menciones.length === 0) {
        mentionsItemsList.innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-muted);">
            No hay menciones detalladas para este ciclo.
          </div>
        `;
      } else {
        mentionsItemsList.innerHTML = menciones.map((m) => {
          const motivosArray = Array.isArray(m.motivos) ? m.motivos : [m.motivos || 'Compromiso'];
          const motivosHtml = motivosArray
            .map(mot => `<span class="mention-reason-pill">🌟 ${escapeHtml(mot)}</span>`)
            .join('');

          let mensajeHtml = '';
          if (m.mensaje && m.mensaje.trim()) {
            mensajeHtml = `<p class="mention-quote">"${escapeHtml(m.mensaje)}"</p>`;
          }

          let fechaStr = 'Ciclo actual';
          if (m.creado_en) {
            try {
              fechaStr = new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }).format(new Date(m.creado_en));
            } catch (err) {}
          }

          const autor = m.votante_nombre || 'Colega del Hospital';

          return `
            <div class="mention-item-card">
              <div class="mention-reasons-wrap">
                ${motivosHtml}
              </div>
              ${mensajeHtml}
              <div class="mention-footer">
                <span class="mention-author">Felicitado por: <strong>${escapeHtml(autor)}</strong></span>
                <span class="mention-date">${fechaStr}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    mentionsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function cerrarModalMenciones() {
    if (mentionsModal) {
      mentionsModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  if (closeMentionsModalBtn) closeMentionsModalBtn.addEventListener('click', cerrarModalMenciones);
  if (dismissMentionsBtn) dismissMentionsBtn.addEventListener('click', cerrarModalMenciones);
  if (mentionsModal) {
    mentionsModal.addEventListener('click', (e) => {
      if (e.target === mentionsModal) cerrarModalMenciones();
    });
  }

  // =========================================================================
  // 9. Cargar y Renderizar Reconocimientos en el Muro (Top 5 con Corazones)
  // =========================================================================
  async function cargarReconocimientosPublicos() {
    if (!gratitudeFeed) return;
    try {
      const res = await fetch('/api/reconocimientos');
      if (!res.ok) return;

      const data = await res.json();
      const top5 = data.top_reconocidos || [];
      const totalReconocimientos = (data.reconocimientos && data.reconocimientos.length) || 0;

      if (wallCountBadge) {
        wallCountBadge.textContent = `${totalReconocimientos} reconocimiento${totalReconocimientos === 1 ? '' : 's'}`;
      }

      if (data.ciclo && data.ciclo.proximo_reinicio && cycleResetBadge) {
        try {
          const fechaProx = new Date(data.ciclo.proximo_reinicio);
          const strProx = new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          }).format(fechaProx);
          cycleResetBadge.setAttribute('title', `Próximo reinicio semanal: ${strProx}. Se restablecerá el voto para todo el personal.`);
        } catch (e) {}
      }

      if (top5.length === 0) {
        gratitudeFeed.innerHTML = `
          <div class="wall-empty-state">
            <div class="wall-empty-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h3 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--color-text-main);">Comienza el Ciclo de Reconocimiento</h3>
            <p style="font-size: 0.9rem; max-width: 360px; margin: 0 auto 1.2rem auto;">
              Aún no hay votos registrados en este ciclo semanal. ¡Sé el primero en felicitar a un compañero de equipo!
            </p>
          </div>
        `;
        return;
      }

      // Renderizar el Top 5 con diseño jerárquico
      let htmlCards = '';
      top5.forEach((p, index) => {
        const initials = (p.destinatario_nombre || 'RH')
          .split(' ')
          .filter(w => w.length > 0)
          .slice(0, 2)
          .map(w => w[0].toUpperCase())
          .join('') || 'RH';

        const felicitacionesCount = p.total_felicitaciones || 1;
        const labelFelicitaciones = felicitacionesCount === 1 ? '1 felicitación' : `${felicitacionesCount} felicitaciones`;

        // Extraer los motivos únicos recibidos
        const todosLosMotivos = [];
        if (p.menciones) {
          p.menciones.forEach(m => {
            const arr = Array.isArray(m.motivos) ? m.motivos : [m.motivos];
            arr.forEach(mot => {
              if (mot && !todosLosMotivos.includes(mot)) todosLosMotivos.push(mot);
            });
          });
        }
        const motivosPreview = todosLosMotivos.slice(0, 3);
        const motivosHtml = motivosPreview
          .map(m => `<span class="reason-tag">🌟 ${escapeHtml(m)}</span>`)
          .join('');

        // Último mensaje con texto para previsualizar
        const ultimaMencionConTexto = p.menciones ? p.menciones.find(m => m.mensaje && m.mensaje.trim()) : null;
        const mensajePreview = ultimaMencionConTexto ? ultimaMencionConTexto.mensaje : '';

        if (index === 0) {
          // Tarjeta Destacada (#1 del Top)
          htmlCards += `
            <article class="gratitude-card card-featured card-clickable" data-person-index="${index}" tabindex="0" role="button" aria-label="Ver todas las menciones recibidas por ${escapeHtml(p.destinatario_nombre)}">
              <div class="card-body">
                <div class="rank-ribbon">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>🏆 Top 1 Más Reconocido/a de la Semana</span>
                </div>

                <div class="featured-profile">
                  <div class="avatar avatar-featured">${escapeHtml(initials)}</div>
                  <div>
                    <h3 class="featured-name">${escapeHtml(p.destinatario_nombre)}</h3>
                    <p class="featured-role">${escapeHtml(p.destinatario_servicio || 'Servicio Hospitalario')}</p>
                  </div>
                </div>

                <div class="featured-motives-row" style="margin-top: 0.65rem; display: flex; flex-wrap: wrap; gap: 0.4rem;">
                  ${motivosHtml}
                </div>

                ${mensajePreview ? `
                  <blockquote class="featured-quote" style="margin-top: 0.85rem;">
                    "${escapeHtml(mensajePreview)}"
                  </blockquote>
                ` : ''}

                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.1rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border-subtle);">
                  <div class="heart-counter-badge" title="Total de felicitaciones acumuladas">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>${labelFelicitaciones}</span>
                  </div>

                  <span class="card-action-hint">
                    <span>Ver todas las menciones (${p.menciones?.length || 1})</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
              </div>
            </article>
          `;
        } else {
          // Tarjetas Compactas (#2 a #5)
          const rankClass = index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : '');
          htmlCards += `
            <article class="gratitude-card card-compact card-clickable" data-person-index="${index}" tabindex="0" role="button" aria-label="Ver todas las menciones recibidas por ${escapeHtml(p.destinatario_nombre)}">
              <div class="card-body">
                <div class="compact-header" style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="rank-pill ${rankClass}">#${index + 1}</div>
                    <div class="avatar-sm">${escapeHtml(initials)}</div>
                    <div>
                      <h4 class="compact-name">${escapeHtml(p.destinatario_nombre)}</h4>
                      <span style="font-size: 0.78rem; color: var(--color-text-muted);">${escapeHtml(p.destinatario_servicio || 'Servicio Hospitalario')}</span>
                    </div>
                  </div>

                  <div class="heart-counter-badge" title="Total de felicitaciones acumuladas">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>${felicitacionesCount}</span>
                  </div>
                </div>

                <div class="compact-reason" style="margin-top: 0.55rem;">
                  ${motivosHtml}
                </div>

                ${mensajePreview ? `
                  <p class="recognition-text" style="margin-top: 0.5rem; margin-bottom: 0.4rem; font-size: 0.88rem; font-style: italic; color: #475569;">
                    "${escapeHtml(mensajePreview)}"
                  </p>
                ` : ''}

                <div class="compact-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.65rem; padding-top: 0.45rem; border-top: 1px dashed #F1F5F9;">
                  <span style="font-size: 0.76rem; color: var(--color-text-light);">
                    ${p.menciones?.length || 1} menci${(p.menciones?.length || 1) === 1 ? 'ón' : 'ones'}
                  </span>
                  <span class="card-action-hint">
                    <span>Ver detalles</span>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
              </div>
            </article>
          `;
        }
      });

      gratitudeFeed.innerHTML = htmlCards;

      // Eventos para abrir el modal al clickear en la tarjeta de cualquier persona
      gratitudeFeed.querySelectorAll('.card-clickable').forEach(card => {
        const personIdx = parseInt(card.getAttribute('data-person-index'), 10);
        const persona = top5[personIdx];

        card.addEventListener('click', () => {
          abrirModalMenciones(persona);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirModalMenciones(persona);
          }
        });
      });

    } catch (e) {
      console.warn('Error cargando el Top 5 de reconocimientos:', e);
    }
  }


  // =========================================================================
  // 9. Reacciones y Micro-interacciones
  // =========================================================================
  document.querySelectorAll('.heart-reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let count = parseInt(btn.getAttribute('data-reactions') || '24', 10);
      const isLiked = btn.classList.contains('liked');

      if (!isLiked) {
        count++;
        btn.classList.add('liked');
        mostrarToast('¡Apoyo enviado!', 'Has sumado tu aprecio a este reconocimiento.');
      } else {
        count--;
        btn.classList.remove('liked');
      }

      btn.setAttribute('data-reactions', count);
      const countEl = btn.querySelector('.reaction-count');
      if (countEl) countEl.textContent = count;
    });
  });

  if (heroCtaBtn) {
    heroCtaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const formSection = document.getElementById('formulario-seccion');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          if (!currentUser) {
            abrirModalAuth();
          } else {
            colleagueNameInput.focus();
          }
        }, 500);
      }
    });
  }

  // Notificaciones Toast
  function mostrarToast(titulo, mensaje) {
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
        <strong>${escapeHtml(titulo)}</strong>
        <span>${escapeHtml(mensaje)}</span>
      </div>
    `;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // =========================================================================
  // 10. Inicialización
  // =========================================================================
  await checkSession();
  await cargarFuncionariosRoster();
  await cargarReconocimientosPublicos();
});
