// ==================== CONFIG.JS ====================

// Variables de configuración
let config = {
  ocultarLimitados: true,
  ocultarCerrados: true
};

// ==================== PERSISTENCIA ====================

function isPersistenciaAceptada() {
  return localStorage.getItem('persistencia_aceptada') === 'true';
}

// Cargar configuración desde localStorage
function cargarConfiguracion() {
  if (!isPersistenciaAceptada()) return;

  const savedLimitados = localStorage.getItem('ocultar-limitados');
  const savedCerrados = localStorage.getItem('ocultar-cerrados');

  if (savedLimitados !== null) {
    config.ocultarLimitados = savedLimitados === 'true';
  }
  if (savedCerrados !== null) {
    config.ocultarCerrados = savedCerrados === 'true';
  }

  // Actualizar checkboxes
  document.getElementById('ocultar-limitados').checked = config.ocultarLimitados;
  document.getElementById('ocultar-cerrados').checked = config.ocultarCerrados;
}

// Guardar configuración
function guardarConfiguracion() {
  if (!isPersistenciaAceptada()) return;

  localStorage.setItem('ocultar-limitados', config.ocultarLimitados);
  localStorage.setItem('ocultar-cerrados', config.ocultarCerrados);
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
  // Volver a index al hacer clic en el título
  document.querySelector('h1').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  // Cargar configuración actual
  cargarConfiguracion();

  // Event listeners para los toggles
  const chkLimitados = document.getElementById('ocultar-limitados');
  const chkCerrados = document.getElementById('ocultar-cerrados');

  chkLimitados.addEventListener('change', () => {
    config.ocultarLimitados = chkLimitados.checked;
    guardarConfiguracion();
  });

  chkCerrados.addEventListener('change', () => {
    config.ocultarCerrados = chkCerrados.checked;
    guardarConfiguracion();
  });
});