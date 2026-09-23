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
  const compactFeedList = document.getElementById('compactFeedList');
  const wallCountBadge = document.getElementById('wallCountBadge');
  const heroCtaBtn = document.getElementById('heroCtaBtn');
  const toastContainer = document.getElementById('toastContainer');

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
    if (e.key === 'Escape' && authModal && authModal.style.display === 'flex') {
      cerrarModalAuth();
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

        // Agregar tarjeta al feed en vivo
        agregarReconocimientoAlMuro(
          selectedColleague.nombre_completo,
          reasons,
          optionalMessage,
          esAnonimo ? 'Anónimo' : currentUser.nombre_completo
        );

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
  // 8. Cargar y Renderizar Reconocimientos en el Muro
  // =========================================================================
  async function cargarReconocimientosPublicos() {
    try {
      const res = await fetch('/api/reconocimientos');
      if (res.ok) {
        const data = await res.json();
        const lista = data.reconocimientos || [];
        if (lista.length > 0) {
          totalRecognitions = 5 + lista.length;
          if (wallCountBadge) {
            wallCountBadge.textContent = `${totalRecognitions} reconocimientos`;
          }
          // Renderizar los nuevos provenientes de la base de datos
          lista.forEach(r => {
            agregarReconocimientoAlMuro(
              r.destinatario_nombre,
              r.motivos,
              r.mensaje,
              r.votante_nombre,
              new Date(r.creado_en)
            );
          });
        }
      }
    } catch (e) {
      console.log('Utilizando feed inicial.');
    }
  }

  function agregarReconocimientoAlMuro(nombre, motivos, mensaje, autor = 'Colega del Hospital', fechaObj = new Date()) {
    const initials = nombre
      .split(' ')
      .filter(w => w.length > 0)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'RH';

    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(fechaObj);

    const card = document.createElement('article');
    card.className = 'gratitude-card card-compact card-newly-added';

    let extraMessageHtml = '';
    if (mensaje) {
      extraMessageHtml = `<p class="recognition-text" style="margin-top: 0.6rem; margin-bottom: 0.5rem; font-size: 0.92rem;">"${escapeHtml(mensaje)}"</p>`;
    }

    const motivosHtml = (Array.isArray(motivos) ? motivos : [motivos])
      .map(m => `<span class="reason-tag">🌟 ${escapeHtml(m)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="card-body">
        <div class="compact-header">
          <div class="avatar-sm avatar-new">${escapeHtml(initials)}</div>
          <div>
            <h4 class="compact-name">${escapeHtml(nombre)}</h4>
            <div class="compact-reason">
              ${motivosHtml}
            </div>
          </div>
        </div>
        ${extraMessageHtml}
        <div class="compact-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.76rem; color: #64748B;">Reconocido por: <strong>${escapeHtml(autor)}</strong></span>
          <span class="compact-date">${fechaFormateada}</span>
        </div>
      </div>
    `;

    if (compactFeedList) {
      compactFeedList.insertBefore(card, compactFeedList.firstChild);
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
