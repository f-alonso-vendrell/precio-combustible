let datosPrecios = null;
let posicionUsuario = null;
let combustibleSeleccionado = null;   // nombre visible
let combustibleKey = null;            // clave real del JSON
let ubicacionUsada = "No seleccionada";
let centrosCP = null;

const combustibleMapping = {
  "Gasolina 95": "Precio Gasolina 95 E5",
  "Gasolina 95 Premium": "Precio Gasolina 95 E5 Premium",
  "Diésel": "Precio Gasoleo A",
  "Diésel Premium": "Precio Gasoleo Premium"
};

// ==================== DISTANCIA ====================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== CARGAR DATOS ====================
async function cargarCentrosCP() {
  try {
    const res = await fetch('codigos-postales-centros.json');
    centrosCP = await res.json();
  } catch (e) { console.error(e); }
}

async function cargarDatos() {
  try {
    const res = await fetch('precios-carburantes.json');
    datosPrecios = await res.json();

    document.getElementById('fecha-actualizacion').textContent = 
      datosPrecios.ultimaActualizacion || datosPrecios.Fecha || 'Sin fecha';

    renderizarTabla();
  } catch (e) {
    console.error(e);
  }
}

// ==================== ACTUALIZAR BARRA ====================
function actualizarInfoBar() {
  document.getElementById('combustible-actual').textContent = combustibleSeleccionado || "Ninguno seleccionado";
  document.getElementById('ubicacion-actual').textContent = ubicacionUsada;
}

// ==================== RENDERIZAR TABLA ====================
function renderizarTabla() {
  actualizarInfoBar();
  const tbody = document.querySelector('#tabla-precios tbody');
  tbody.innerHTML = '';

  if (!datosPrecios || !combustibleKey) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:50px;">Selecciona un combustible</td></tr>`;
    return;
  }

  let estaciones = datosPrecios.ListaEESSPrecio.filter(est => {
    return est[combustibleKey] && parseFloat(est[combustibleKey].replace(',', '.')) > 0;
  });

  if (posicionUsuario) {
    const delta = 0.0225;
    estaciones = estaciones.filter(est => {
      if (!est.Latitud || !est.Longitud) return false;
      const latEst = parseFloat(est.Latitud.replace(',', '.'));
      const lonEst = parseFloat(est.Longitud.replace(',', '.'));
      return Math.abs(latEst - posicionUsuario.lat) <= delta && 
             Math.abs(lonEst - posicionUsuario.lon) <= delta;
    });

    estaciones.forEach(est => {
      const latEst = parseFloat(est.Latitud.replace(',', '.'));
      const lonEst = parseFloat(est.Longitud.replace(',', '.'));
      est.distancia = calcularDistancia(posicionUsuario.lat, posicionUsuario.lon, latEst, lonEst);
    });

    estaciones.sort((a, b) => a.distancia - b.distancia);
  } else {
    estaciones.sort((a, b) => {
      const pA = parseFloat(a[combustibleKey].replace(',', '.') || 999);
      const pB = parseFloat(b[combustibleKey].replace(',', '.') || 999);
      return pA - pB;
    });
  }

  const limite = posicionUsuario ? 50 : 30;

  estaciones.slice(0, limite).forEach(est => {
    let distTexto = "—";
    if (est.distancia !== undefined) {
      distTexto = est.distancia < 1 ? `${(est.distancia*1000).toFixed(0)} m` : `${est.distancia.toFixed(1)} km`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rotulo || 'Sin nombre'}</strong><br><small>${est.Direccion}, ${est.Municipio}</small></td>
      <td class="distancia">${distTexto}</td>
      <td class="precio">${est[combustibleKey] || "—"} €</td>
      <td><a href="#" target="_blank">Verificar</a></td>
      <td><a href="https://www.google.com/maps?q=${est.Latitud || ''},${est.Longitud || ''}" target="_blank">🗺️</a></td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCentrosCP();
  await cargarDatos();

  // Abrir modal combustible
  document.getElementById('btn-cambiar-combustible').addEventListener('click', () => {
    document.getElementById('modal-combustible').classList.add('show');
  });

  // Seleccionar combustible
  document.querySelectorAll('#modal-combustible .modal-option').forEach(btn => {
    btn.addEventListener('click', () => {
      combustibleSeleccionado = btn.dataset.combustible;
      combustibleKey = combustibleMapping[combustibleSeleccionado];
      document.getElementById('modal-combustible').classList.remove('show');
      renderizarTabla();
    });
  });

  document.getElementById('cancelar-combustible').addEventListener('click', () => {
    document.getElementById('modal-combustible').classList.remove('show');
  });

  // Abrir modal ubicación
  document.getElementById('btn-cambiar-ubicacion').addEventListener('click', () => {
    document.getElementById('modal-ubicacion').classList.add('show');
  });

  // Geolocalización
  document.getElementById('modal-geoloc').addEventListener('click', async () => {
    try {
      await obtenerUbicacionActual();   // (usa la función que ya tenías)
      document.getElementById('modal-ubicacion').classList.remove('show');
      renderizarTabla();
    } catch (err) {
      alert(err);
    }
  });

  // Código postal desde modal
  document.getElementById('modal-buscar-cp').addEventListener('click', () => {
    const cp = document.getElementById('modal-codigo-postal').value.trim();
    if (cp.length !== 5) {
      alert("Introduce un código postal de 5 dígitos");
      return;
    }
    if (centrosCP && centrosCP[cp]) {
      posicionUsuario = centrosCP[cp];
      ubicacionUsada = `CP ${cp}`;
      document.getElementById('modal-ubicacion').classList.remove('show');
      renderizarTabla();
    } else {
      alert("Código postal no encontrado");
    }
  });

  document.getElementById('cancelar-ubicacion').addEventListener('click', () => {
    document.getElementById('modal-ubicacion').classList.remove('show');
  });
});

// Función de geolocalización (la misma que antes)
async function obtenerUbicacionActual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocalización no soportada");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posicionUsuario = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        ubicacionUsada = "Ubicación actual";
        alert(`✅ Ubicación actual:\nLat: ${posicionUsuario.lat.toFixed(5)}\nLon: ${posicionUsuario.lon.toFixed(5)}`);
        resolve();
      },
      () => reject("No se pudo obtener la ubicación")
    );
  });
}