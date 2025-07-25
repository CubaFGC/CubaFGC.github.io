// Incluye el cliente de Supabase en tu HTML antes de este script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"></script>

const supabaseUrl = 'https://lvtarqlcwxmfsfdijyzo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dGFycWxjd3htZnNmZGlqeXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTg1OTIsImV4cCI6MjA2NTA3NDU5Mn0.u_A1BTt7xwGO7lIsCa7zHYGmx9XjEgD4L_2LQxM6Pj4';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
const loginToggleBtn = document.getElementById('login-toggle-btn');
const loginDropdown = document.getElementById('login-dropdown');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutHeaderBtn = document.getElementById('logout-header-btn');
const userHeaderInfo = document.getElementById('user-header-info');
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const toggleAuthForm = document.getElementById('toggle-auth-form');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const userMenuContainer = document.getElementById('user-menu-container');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdownMenu = document.getElementById('user-dropdown-menu');

let showingRegister = false;

// Mostrar/ocultar dropdown
if (loginToggleBtn && loginDropdown) {
  loginToggleBtn.onclick = () => {
    // Siempre mostrar login y ocultar registro al abrir
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    showingRegister = false;
    if (toggleAuthForm) toggleAuthForm.textContent = 'Crear cuenta';
    if (loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
    if (registerError) { registerError.style.display = 'none'; registerError.textContent = ''; }
    loginDropdown.style.display = loginDropdown.style.display === 'none' ? 'block' : 'none';
  };
  document.addEventListener('click', function(e) {
    if (!loginDropdown.contains(e.target) && e.target !== loginToggleBtn) {
      loginDropdown.style.display = 'none';
      if (loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
      if (registerError) { registerError.style.display = 'none'; registerError.textContent = ''; }
    }
  });
}

// Cerrar dropdown al presionar Escape
document.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    loginDropdown.style.display = 'none';
  }
});

// Recuperar contraseña con Supabase
function showResetPassword() {
  const email = prompt("Introduce tu correo para recuperar la contraseña:");
  if (!email) return;
  supabase.auth.resetPasswordForEmail(email)
    .then(({ error }) => {
      if (error) {
        let msg = "No se pudo enviar el correo de recuperación.";
        if (error.message && error.message.includes("Invalid email")) {
          msg = "Correo electrónico no válido.";
        }
        alert(msg);
      } else {
        alert("Se ha enviado un correo para restablecer la contraseña.");
      }
    });
}

const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
  forgotPasswordLink.onclick = function(e) {
    e.preventDefault();
    showResetPassword();
  };
}

// Toasts de notificación
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' toast--' + type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.4s forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

// Login con Supabase
if (loginForm) {
  loginForm.onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = true;
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = '<span class="btn-spinner"></span>Entrando...';
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        loginError.textContent = "Correo o contraseña incorrectos.";
        loginError.style.display = 'block';
        showToast('Error de inicio de sesión', 'error');
        setTimeout(() => {
          loginError.style.display = 'none';
          loginError.textContent = '';
        }, 2500);
      } else {
        loginError.style.display = 'none';
        loginError.textContent = '';
        loginDropdown.style.display = 'none';
        limpiarCamposAuth();
        mostrarUsuarioSupabase();
        showToast('¡Bienvenido! Sesión iniciada.');
      }
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalText;
    }
  };
}

// Alternar entre login y registro
if (toggleAuthForm && loginForm && registerForm) {
  toggleAuthForm.onclick = function(e) {
    e.preventDefault();
    showingRegister = !showingRegister;
    if (showingRegister) {
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      toggleAuthForm.textContent = 'Iniciar sesión';
    } else {
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      toggleAuthForm.textContent = 'Crear cuenta';
    }
    // Limpiar errores
    if (loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
    if (registerError) { registerError.style.display = 'none'; registerError.textContent = ''; }
  };
}

// Registro con Supabase
if (registerForm) {
  registerForm.onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const password2 = document.getElementById('register-password2').value;
    const registerBtn = registerForm.querySelector('button[type="submit"]');

    // Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      registerError.textContent = "Correo electrónico no válido.";
      registerError.style.display = 'block';
      setTimeout(() => {
        registerError.style.display = 'none';
        registerError.textContent = '';
      }, 2500);
      return;
    }
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passRegex.test(password)) {
      registerError.textContent = "La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número.";
      registerError.style.display = 'block';
      setTimeout(() => {
        registerError.style.display = 'none';
        registerError.textContent = '';
      }, 3000);
      return;
    }
    if (password !== password2) {
      registerError.textContent = "Las contraseñas no coinciden.";
      registerError.style.display = 'block';
      setTimeout(() => {
        registerError.style.display = 'none';
        registerError.textContent = '';
      }, 2500);
      return;
    }

    if (registerBtn) {
      registerBtn.disabled = true;
      const originalText = registerBtn.innerHTML;
      registerBtn.innerHTML = '<span class="btn-spinner"></span>Creando...';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href }
      });
      if (error) {
        let msg = "No se pudo crear la cuenta. Verifica el correo y la contraseña.";
        if (error.message && error.message.includes("already registered")) msg = "El correo ya está registrado.";
        registerError.style.color = '#ff4d4f';
        registerError.textContent = msg;
        registerError.style.display = 'block';
        setTimeout(() => {
          registerError.style.display = 'none';
          registerError.textContent = '';
          registerError.style.color = '';
        }, 3000);
      } else {
        registerError.style.display = 'block';
        registerError.style.color = '#28a745';
        registerError.textContent = '¡Cuenta creada con éxito! Revisa tu correo para verificar tu cuenta.';
        setTimeout(() => {
          registerError.style.display = 'none';
          registerError.textContent = '';
          registerError.style.color = '';
          loginDropdown.style.display = 'none';
          limpiarCamposAuth();
        }, 3000);
      }
      registerBtn.disabled = false;
      registerBtn.innerHTML = originalText;
    }
  };
}

// Limpiar errores al cambiar de formulario
if (loginError) {
  loginError.style.display = 'none';
  loginError.textContent = '';
}
if (registerError) {
  registerError.style.display = 'none';
  registerError.textContent = '';
}

// Inicializar formularios
loginForm.style.display = 'flex';
registerForm.style.display = 'none';
if (toggleAuthForm) {
  toggleAuthForm.textContent = 'Crear cuenta';
}
if (loginError) {
  loginError.style.display = 'none';
  loginError.textContent = '';
}
if (registerError) {
  registerError.style.display = 'none';
  registerError.textContent = '';
}
if (loginToggleBtn) {
  loginToggleBtn.style.display = 'inline-block';
}
if (loginDropdown) {
  loginDropdown.style.display = 'none'; // Ocultar dropdown al inicio
}

// Logout con Supabase
if (logoutHeaderBtn) {
  logoutHeaderBtn.onclick = async () => {
    await supabase.auth.signOut();
    mostrarUsuarioSupabase();
    showToast('Sesión cerrada.');
  };
}

// Mostrar usuario logueado con Supabase
async function mostrarUsuarioSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (userMenuContainer) userMenuContainer.style.display = 'inline-block';
    if (userMenuBtn) userMenuBtn.style.display = 'inline-flex';
    if (userHeaderInfo) {
      // Mostrar avatar con inicial y solo el nombre de usuario (antes del @)
      let displayName = user.user_metadata?.name || user.email;
      if (user.email && (!user.user_metadata?.name || user.user_metadata?.name === user.email)) {
        displayName = user.email.split('@')[0];
      }
      const inicial = displayName ? displayName[0].toUpperCase() : '?';
      userHeaderInfo.innerHTML = `<span class="user-avatar-initial">${inicial}</span> ${displayName}`;
      userHeaderInfo.style.display = 'inline-flex';
      userHeaderInfo.style.alignItems = 'center';
    }
    if (emailVerifiedIcon) {
      emailVerifiedIcon.style.display = 'inline-block';
      if (user.email_confirmed_at) {
        emailVerifiedIcon.innerHTML = ICON_VERIFIED;
        emailVerifiedIcon.title = "Correo verificado";
      } else {
        emailVerifiedIcon.innerHTML = ICON_NOT_VERIFIED;
        emailVerifiedIcon.title = "Correo no verificado";
      }
    }
    if (logoutHeaderBtn) logoutHeaderBtn.style.display = 'block';
    if (loginToggleBtn) loginToggleBtn.style.display = 'none';
    if (loginDropdown) loginDropdown.style.display = 'none';
    // Mostrar botones solo para logueados
    document.querySelectorAll('.solo-logueado').forEach(btn => {
      btn.style.display = '';
      btn.style.visibility = 'visible';
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
    });
  } else {
    if (userMenuContainer) userMenuContainer.style.display = 'none';
    if (userMenuBtn) userMenuBtn.style.display = 'none';
    if (userHeaderInfo) userHeaderInfo.textContent = '';
    if (emailVerifiedIcon) {
      emailVerifiedIcon.style.display = 'none';
      emailVerifiedIcon.innerHTML = '';
    }
    if (logoutHeaderBtn) logoutHeaderBtn.style.display = 'none';
    if (loginToggleBtn) loginToggleBtn.style.display = 'inline-block';
    // Ocultar botones si no está logueado
    document.querySelectorAll('.solo-logueado').forEach(btn => {
      btn.style.display = '';
      btn.style.visibility = 'hidden';
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    });
  }
}

// Utilidad para limpiar campos
function limpiarCamposAuth() {
  if (loginForm) loginForm.reset();
  if (registerForm) registerForm.reset();
}

const emailVerifiedIcon = document.getElementById('email-verified-icon');
const ICON_VERIFIED = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#28a745"/><path d="M6 10.5l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_NOT_VERIFIED = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#ff4d4f"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;

// Menú de usuario
if (userMenuBtn && userDropdownMenu) {
  userMenuBtn.onclick = function(e) {
    e.stopPropagation();
    const expanded = userDropdownMenu.style.display === 'block';
    userDropdownMenu.style.display = expanded ? 'none' : 'block';
    userMenuBtn.setAttribute('aria-expanded', !expanded);
    if (!expanded) {
      userDropdownMenu.setAttribute('tabindex', '0');
      userDropdownMenu.focus();
    }
  };
  userMenuBtn.onkeydown = function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      userMenuBtn.click();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      userDropdownMenu.focus();
    }
  };
  userDropdownMenu.onkeydown = function(e) {
    if (e.key === 'Escape') {
      userDropdownMenu.style.display = 'none';
      userMenuBtn.setAttribute('aria-expanded', 'false');
      userMenuBtn.focus();
    }
  };
  document.addEventListener('click', function(e) {
    if (!userMenuContainer.contains(e.target)) {
      userDropdownMenu.style.display = 'none';
      userMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

mostrarUsuarioSupabase();