let datosPrecios = null;
let posicionUsuario = null;
let combustibleSeleccionado = "Gasolina 95";

// ==================== FUNCIONES DE DISTANCIA ====================

// Fórmula de Haversine para calcular distancia en km
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // distancia en kilómetros
}

// ==================== OBTENER UBICACIÓN ACTUAL ====================

async function obtenerUbicacionActual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Tu navegador no soporta geolocalización");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        posicionUsuario = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        resolve(posicionUsuario);
      },
      (error) => {
        let mensaje = "Error al obtener ubicación";
        if (error.code === 1) mensaje = "Permiso denegado";
        if (error.code === 2) mensaje = "Posición no disponible";
        if (error.code === 3) mensaje = "Tiempo de espera agotado";
        reject(mensaje);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  });
}

// ==================== CARGAR DATOS ====================

async function cargarDatos() {
  try {
    const response = await fetch('precios-carburantes.json');
    if (!response.ok) throw new Error('Error al cargar el JSON');

    datosPrecios = await response.json();

    document.getElementById('fecha-actualizacion').innerHTML = 
      `Datos actualizados: <strong>${datosPrecios.ultimaActualizacion || 'Sin fecha'}</strong>`;

    renderizarTabla();
  } catch (err) {
    console.error(err);
    document.getElementById('fecha-actualizacion').textContent = "Error al cargar los datos";
  }
}

// ==================== RENDERIZAR TABLA ====================

function renderizarTabla() {
  const tbody = document.querySelector('#tabla-precios tbody');
  tbody.innerHTML = '';

  if (!datosPrecios || !datosPrecios.ListaEESSPrecio) return;

  let estaciones = datosPrecios.ListaEESSPrecio;

  // Filtrar solo las estaciones que tienen el combustible seleccionado
  estaciones = estaciones.filter(est => {
    const precio = est[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 
                   est[`Precio ${combustibleSeleccionado}`];
    return precio && parseFloat(precio) > 0;
  });

  // Ordenar por precio (más barato primero)
  estaciones.sort((a, b) => {
    const precioA = parseFloat(a[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 999);
    const precioB = parseFloat(b[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 999);
    return precioA - precioB;
  });

  // Mostrar las 30 más baratas (puedes cambiar este número)
  estaciones.slice(0, 30).forEach(est => {
    let distanciaTexto = "—";
    let distanciaKm = null;

    if (posicionUsuario && est.Latitud && est.Longitud) {
      const latEst = parseFloat(est.Latitud.replace(',', '.'));
      const lonEst = parseFloat(est.Longitud.replace(',', '.'));
      distanciaKm = calcularDistancia(
        posicionUsuario.lat, 
        posicionUsuario.lon, 
        latEst, 
        lonEst
      );
      distanciaTexto = distanciaKm < 1 
        ? `${(distanciaKm*1000).toFixed(0)} m` 
        : `${distanciaKm.toFixed(1)} km`;
    }

    const precio = est[`Precio${combustibleSeleccionado.replace(/\s+/g, '')}`] || 
                   est[`Precio ${combustibleSeleccionado}`] || "—";

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rotulo || 'Estación sin nombre'}</strong><br>
          <small>${est.Direccion}, ${est.Municipio}</small></td>
      <td class="distancia">${distanciaTexto}</td>
      <td class="precio">${precio} €</td>
      <td><a href="#" target="_blank">Verificar</a></td>
      <td><a href="https://www.google.com/maps?q=${est.Latitud},${est.Longitud}" target="_blank">🗺️</a></td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('info-estaciones').textContent = 
    `Mostrando las 30 estaciones más baratas de ${combustibleSeleccionado}`;
}

// ==================== EVENTOS ====================

document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();

  // Menú hamburguesa
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');
  
  menuBtn.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

  // Selección de combustible
  document.querySelectorAll('.combustible-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.combustible-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      combustibleSeleccionado = btn.dataset.combustible;
      renderizarTabla();
      menu.classList.remove('show');
    });
  });

  // Botón geolocalización
  document.getElementById('btn-geoloc').addEventListener('click', async () => {
    try {
      await obtenerUbicacionActual();
      alert('Ubicación obtenida correctamente');
      renderizarTabla();
    } catch (err) {
      alert(err);
    }
  });

  // Botón código postal (por ahora solo placeholder)
  document.getElementById('btn-cp').addEventListener('click', () => {
    const cp = document.getElementById('codigo-postal').value.trim();
    if (cp.length === 5) {
      alert(`Buscando estaciones cerca del CP ${cp} (función pendiente)`);
      // Aquí más adelante implementaremos búsqueda por código postal
    } else {
      alert("Introduce un código postal válido de 5 dígitos");
    }
  });
});
