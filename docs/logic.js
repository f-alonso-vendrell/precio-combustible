let datosPrecios = null;
let posicionUsuario = null;
let combustibleSeleccionado = null;     // nombre amigable (el que ve el usuario)
let combustibleKey = null;              // clave real del JSON
let ubicacionUsada = "No seleccionada";
let centrosCP = null;

// Mapeo de opción visible → clave real en el JSON
const combustibleMapping = {
  "Gasolina 95": "Precio Gasolina 95 E5",
  "Gasolina 95 Premium": "Precio Gasolina 95 E5 Premium",
  "Diésel": "Precio Gasoleo A",
  "Diésel Premium": "Precio Gasoleo Premium"
};

// ==================== Cargar centros de códigos postales ====================
async function cargarCentrosCP() {
  try {
    const res = await fetch('codigos-postales-centros.json');
    centrosCP = await res.json();
    console.log(`✅ ${Object.keys(centrosCP).length} códigos postales cargados`);
  } catch (e) {
    console.error("Error cargando codigos-postales-centros.json", e);
  }
}

// ==================== DISTANCIA ====================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== OBTENER UBICACIÓN ACTUAL ====================
async function obtenerUbicacionActual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocalización no soportada");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posicionUsuario = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        ubicacionUsada = "Ubicación actual";
        alert(`✅ Ubicación actual:\nLat: ${posicionUsuario.lat.toFixed(5)}\nLon: ${posicionUsuario.lon.toFixed(5)}`);
        resolve(posicionUsuario);
      },
      (err) => {
        let msg = "Error al obtener ubicación";
        if (err.code === 1) msg = "Permiso denegado";
        if (err.code === 2) msg = "Ubicación no disponible";
        if (err.code === 3) msg = "Tiempo agotado";
        reject(msg);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  try {
    const res = await fetch('precios-carburantes.json');
    datosPrecios = await res.json();

    document.getElementById('info-fecha').innerHTML = 
      `Actualizado: <strong>${datosPrecios.ultimaActualizacion || datosPrecios.Fecha || 'Sin fecha'}</strong>`;

    if (!combustibleSeleccionado) {
      document.getElementById('menu').classList.add('show');
    }

    renderizarTabla();
  } catch (e) {
    console.error("Error cargando precios-carburantes.json", e);
  }
}

// ==================== INFO BAR ====================
function actualizarInfoBar() {
  document.getElementById('info-combustible').innerHTML = 
    `Combustible: <strong>${combustibleSeleccionado || 'Ninguno seleccionado'}</strong>`;

  document.getElementById('info-ubicacion').innerHTML = 
    `Ubicación: <strong>${ubicacionUsada}</strong>`;
}

// ==================== RENDERIZAR TABLA ====================
function renderizarTabla() {
  actualizarInfoBar();

  const tbody = document.querySelector('#tabla-precios tbody');
  tbody.innerHTML = '';

  if (!datosPrecios || !datosPrecios.ListaEESSPrecio || !combustibleKey) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;">Selecciona un tipo de combustible</td></tr>`;
    return;
  }

  let estaciones = datosPrecios.ListaEESSPrecio.filter(est => {
    return est[combustibleKey] && parseFloat(est[combustibleKey].replace(',', '.')) > 0;
  });

  if (posicionUsuario) {
    const delta = 0.0225; // ≈ 5 km

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
    // Ordenar por precio si no hay ubicación
    estaciones.sort((a, b) => {
      const pA = parseFloat(a[combustibleKey].replace(',', '.') || 999);
      const pB = parseFloat(b[combustibleKey].replace(',', '.') || 999);
      return pA - pB;
    });
  }

  const limite = posicionUsuario ? 50 : 30;

  estaciones.slice(0, limite).forEach(est => {
    let distanciaTexto = "—";
    if (est.distancia !== undefined) {
      distanciaTexto = est.distancia < 1 
        ? `${(est.distancia * 1000).toFixed(0)} m` 
        : `${est.distancia.toFixed(1)} km`;
    }

    const precio = est[combustibleKey] || "—";

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rótulo || 'Sin nombre'}</strong><br>
          <small>${est.Dirección || ''}, ${est.Municipio || ''}</small></td>
      <td class="distancia">${distanciaTexto}</td>
      <td class="precio">${precio} €</td>
      <td><a href="#" target="_blank">Verificar</a></td>
      <td><a href="https://www.google.com/maps?q=${est.Latitud || ''},${est["Longitud (WGS84)"]|| ''}" target="_blank">🗺️</a></td>
    `;
    tbody.appendChild(row);
  });

  if (estaciones.length === 0 && posicionUsuario) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;">No se encontraron estaciones cercanas</td></tr>`;
  }
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCentrosCP();
  await cargarDatos();

  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menu-btn');

  menuBtn.addEventListener('click', () => menu.classList.toggle('show'));

  // Selección de combustible
  document.querySelectorAll('.combustible-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.combustible-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      combustibleSeleccionado = btn.dataset.combustible;
      combustibleKey = combustibleMapping[combustibleSeleccionado];

      menu.classList.remove('show');
      renderizarTabla();
    });
  });

  // Geolocalización
  document.getElementById('btn-geoloc-menu').addEventListener('click', async () => {
    try {
      await obtenerUbicacionActual();
      menu.classList.remove('show');
      renderizarTabla();
    } catch (err) {
      alert(err);
    }
  });

  // Código Postal
  document.getElementById('btn-cp-menu').addEventListener('click', () => {
    const cp = document.getElementById('codigo-postal').value.trim();
    
    if (cp.length !== 5) {
      alert("Introduce un código postal válido de 5 dígitos");
      return;
    }

    if (centrosCP && centrosCP[cp]) {
      posicionUsuario = centrosCP[cp];
      ubicacionUsada = `CP ${cp}`;

      alert(`✅ CP ${cp} seleccionado:\nLat: ${posicionUsuario.lat.toFixed(5)}\nLon: ${posicionUsuario.lon.toFixed(5)}`);

      menu.classList.remove('show');
      renderizarTabla();
    } else {
      alert(`Código postal ${cp} no encontrado`);
    }
  });
});