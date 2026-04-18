let datosPrecios = null;
let posicionUsuario = null;
let combustibleSeleccionado = null;        // Ahora empieza como null
let ubicacionUsada = "No seleccionada";


// ==================== Codigos postales ====================
let centrosCP = null;

async function cargarCentrosCP() {
  const res = await fetch('codigos-postales-centros.json');
  centrosCP = await res.json();
}

// Ejemplo de uso cuando el usuario introduce un CP:
function buscarPorCodigoPostal(cp) {
  if (centrosCP && centrosCP[cp]) {
    posicionUsuario = centrosCP[cp];
    ubicacionUsada = `CP ${cp}`;
    renderizarTabla();
  } else {
    alert("Código postal no encontrado o sin coordenadas");
  }
}

// ==================== DISTANCIA ====================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== OBTENER UBICACIÓN ====================
async function obtenerUbicacionActual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocalización no soportada");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posicionUsuario = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        ubicacionUsada = "Ubicación actual";
        resolve(posicionUsuario);
      },
      (err) => reject("No se pudo obtener la ubicación"),
      { enableHighAccuracy: true }
    );
  });
}

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  try {
    const res = await fetch('precios-carburantes.json');
    datosPrecios = await res.json();

    document.getElementById('info-fecha').innerHTML = 
      `Actualizado: <strong>${datosPrecios.Fecha || 'Sin fecha'}</strong>`;

    // Mostrar menú por defecto la primera vez
    if (!combustibleSeleccionado) {
      document.getElementById('menu').classList.add('show');
    }

    renderizarTabla();
  } catch (e) {
    console.error(e);
  }
}

// ==================== RENDERIZAR INFO BAR ====================
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

  if (!datosPrecios || !datosPrecios.ListaEESSPrecio || !combustibleSeleccionado) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5" style="text-align:center; padding:40px;">Selecciona un tipo de combustible</td>`;
    tbody.appendChild(row);
    return;
  }

  let estaciones = datosPrecios.ListaEESSPrecio.filter(est => {
    const precioKey = `Precio${combustibleSeleccionado.replace(/\s+/g, '')}`;
    return est[precioKey] && parseFloat(est[precioKey]) > 0;
  });

  // Ordenar por precio
  estaciones.sort((a, b) => {
    const pA = parseFloat(a[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 999);
    const pB = parseFloat(b[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 999);
    return pA - pB;
  });

  estaciones.slice(0, 30).forEach(est => {
    let distanciaTexto = "—";
    if (posicionUsuario && est.Latitud && est.Longitud) {
      const dist = calcularDistancia(
        posicionUsuario.lat, posicionUsuario.lon,
        parseFloat(est.Latitud.replace(',', '.')),
        parseFloat(est.Longitud.replace(',', '.'))
      );
      distanciaTexto = dist < 1 ? `${(dist*1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;
    }

    const precio = est[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || "—";

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rotulo || 'Sin nombre'}</strong><br><small>${est.Direccion}, ${est.Municipio}</small></td>
      <td class="distancia">${distanciaTexto}</td>
      <td class="precio">${precio} €</td>
      <td><a href="#" target="_blank">Verificar</a></td>
      <td><a href="https://www.google.com/maps?q=${est.Latitud},${est.Longitud}" target="_blank">🗺️</a></td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();

  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menu-btn');

  menuBtn.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

  // Selección de combustible
  document.querySelectorAll('.combustible-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.combustible-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      combustibleSeleccionado = btn.dataset.combustible;
      menu.classList.remove('show');   // Contraer menú al seleccionar
      renderizarTabla();
    });
  });

  // Geolocalización desde menú
  document.getElementById('btn-geoloc-menu').addEventListener('click', async () => {
    try {
      await obtenerUbicacionActual();
      menu.classList.remove('show');
      renderizarTabla();
    } catch (err) {
      alert(err);
    }
  });

  // Código postal (placeholder por ahora)
  document.getElementById('btn-cp-menu').addEventListener('click', () => {
    const cp = document.getElementById('codigo-postal').value.trim();
    if (cp.length === 5) {
      ubicacionUsada = `CP ${cp}`;
      menu.classList.remove('show');
      renderizarTabla();
      alert(`Buscando cerca del CP ${cp} (pendiente de implementar)`);
    } else {
      alert("Introduce un código postal de 5 dígitos");
    }
  });
});
