// ==================== VARIABLES GLOBALES ====================
let datosPrecios = null;
let posicionUsuario = null;
let centrosCP = null;
let estaObteniendoUbicacion = false;

let errmsgubicacion = "";
let errmsgnetwork = "";

// ==================== GESTIÓN DEL COMBUSTIBLE ====================

let currentCar = {
  combustible: null,
  key: null
};

const combustibleMapping = {
  "Gasolina 95": "Precio Gasolina 95 E5",
  "Gasolina 95 Premium": "Precio Gasolina 95 E5 Premium",
  "Diésel": "Precio Gasoleo A",
  "Diésel Premium": "Precio Gasoleo Premium"
};

function getCar() {
  if (currentCar.combustible && currentCar.key) {
    return { ...currentCar };
  }

  const saved = localStorage.getItem('combustible');
  if (saved && combustibleMapping[saved]) {
    currentCar.combustible = saved;
    currentCar.key = combustibleMapping[saved];
  } else {
    currentCar.combustible = null;
    currentCar.key = null;
  }

  return { ...currentCar };
}

function setCar(nuevoCombustible) {
  if (!combustibleMapping[nuevoCombustible]) {
    console.error("Combustible no válido:", nuevoCombustible);
    return;
  }

  currentCar.combustible = nuevoCombustible;
  currentCar.key = combustibleMapping[nuevoCombustible];

  localStorage.setItem('combustible', nuevoCombustible);

  actualizarInfoBar();
  actualizarTabla();
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
  estaObteniendoUbicacion = true;
  ubicacionUsada = "Ubicación actual";
  actualizarInfoBar();

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      estaObteniendoUbicacion = false;
      errmsgubicacion = "Geolocalización no soportada";
      actualizarInfoBar();
      return reject("Geolocalización no soportada");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posicionUsuario = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        estaObteniendoUbicacion = false;
        errmsgubicacion = "";
        actualizarInfoBar();
        resolve(posicionUsuario);
      },
      (err) => {
        estaObteniendoUbicacion = false;
        errmsgubicacion = "No se pudo obtener la ubicación";
        if (err.code === 1) errmsgubicacion = "Permiso de ubicación denegado";
        if (err.code === 2) errmsgubicacion = "Ubicación no disponible";
        if (err.code === 3) errmsgubicacion = "Tiempo de espera agotado";
        actualizarInfoBar();
        reject(errmsgubicacion);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// ==================== CARGAR CENTROS CP ====================
async function cargarCentrosCP(provincia) {
  try {
    const url = `cp/${provincia}/codigos-postales-centros.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    centrosCP = await res.json();
    centrosCP._provincia = provincia;
    errmsgnetwork = "";
    return true;
  } catch (e) {
    errmsgnetwork = `No se pudo cargar los datos de códigos postales de la provincia ${provincia}`;
    console.error(e);
    return false;
  }
}

// ==================== CARGAR DATOS ====================
async function cargarDatos() {
  try {
    const res = await fetch('precios-carburantes.json');
    datosPrecios = await res.json();
    errmsgnetwork = "";
    document.getElementById('fecha-actualizacion').textContent = 
      datosPrecios.ultimaActualizacion || datosPrecios.Fecha || 'Sin fecha';
    actualizarTabla();
  } catch (e) {
    errmsgnetwork = "No se pudieron cargar los precios. Inténtalo más tarde.";
    console.error(e);
    actualizarTabla();
  }
}

// ==================== ACTUALIZAR INFO BAR ====================
function actualizarInfoBar() {
  const car = getCar();

  document.getElementById('combustible-actual').textContent = 
    car.combustible || "Ninguno seleccionado";

  let textoUbicacion = ubicacionUsada || "No seleccionada";

  if (ubicacionUsada === "Ubicación actual") {
    if (estaObteniendoUbicacion || !posicionUsuario) {
      textoUbicacion = "Ubicación actual (refrescando...)";
    }
  }

  document.getElementById('ubicacion-actual').textContent = textoUbicacion;
}

// ==================== ACTUALIZAR TABLA ====================
function actualizarTabla() {
  actualizarInfoBar();
  const tbody = document.querySelector('#tabla-precios tbody');
  tbody.innerHTML = '';

  const car = getCar();

  if (errmsgnetwork) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:50px;">${errmsgnetwork}</td></tr>`;
    return;
  }
  if (errmsgubicacion) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:50px;">${errmsgubicacion}</td></tr>`;
    return;
  }
  if (!car.key) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:50px;">Selecciona un tipo de combustible</td></tr>`;
    return;
  }
  if (!posicionUsuario && ubicacionUsada !== "No seleccionada") {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:50px;">Selecciona una ubicación</td></tr>`;
    return;
  }

  let estaciones = datosPrecios.ListaEESSPrecio.filter(est => {
    return est[car.key] && parseFloat(est[car.key].replace(',', '.')) > 0;
  });

  if (posicionUsuario) {
    const delta = 0.0225;
    estaciones = estaciones.filter(est => {
      if (!est.Latitud || !est["Longitud (WGS84)"]) return false;
      const latEst = parseFloat(est.Latitud.replace(',', '.'));
      const lonEst = parseFloat(est["Longitud (WGS84)"].replace(',', '.'));
      return Math.abs(latEst - posicionUsuario.lat) <= delta &&
             Math.abs(lonEst - posicionUsuario.lon) <= delta;
    });

    estaciones.forEach(est => {
      const latEst = parseFloat(est.Latitud.replace(',', '.'));
      const lonEst = parseFloat(est["Longitud (WGS84)"].replace(',', '.'));
      est.distancia = calcularDistancia(posicionUsuario.lat, posicionUsuario.lon, latEst, lonEst);
    });
  }

  estaciones.sort((a, b) => {
    const pA = parseFloat(a[car.key].replace(',', '.') || 999);
    const pB = parseFloat(b[car.key].replace(',', '.') || 999);
    return pA - pB;
  });

  const limite = posicionUsuario ? 50 : 30;

  estaciones.slice(0, limite).forEach(est => {
    let distanciaTexto = "—";
    if (est.distancia !== undefined) {
      distanciaTexto = est.distancia < 1 
        ? `${(est.distancia * 1000).toFixed(0)} m` 
        : `${est.distancia.toFixed(1)} km`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rótulo || 'Sin nombre'}</strong><br>
          <small>${est.Dirección || ''}, ${est.Municipio || ''}</small></td>
      <td class="distancia">${distanciaTexto}</td>
      <td class="precio">${est[car.key] || "—"} € 
        (<a href="https://www.google.com/search?q=%22${est.Rótulo || ''} ${est.Dirección || ''}, ${est.Municipio || ''}%22" target="_blank">verificar</a>)</td>
      <td class="maps">
        <a href="https://www.google.com/maps?q=${est.Latitud?.replace(',', '.') || ''},${est["Longitud (WGS84)"]?.replace(',', '.') || ''}" target="_blank">🗺️</a>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== COOKIES (solo para ubicación y banner por ahora) ====================
function setCookie(name, value, days = 30) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

// ==================== INICIALIZACIÓN (renombrada) ====================
async function initPersistence() {
  const cookiesAceptadas = getCookie("cookies_aceptadas");

  if (!cookiesAceptadas || cookiesAceptadas === "no") {
    document.getElementById('cookie-banner').classList.add('show');
    return;
  }

  // Cargar combustible desde localStorage
  getCar();                    // ← Solo llamamos a getCar(), sin cookies

  // Cargar ubicación (todavía desde cookies)
  const savedUbicacion = getCookie("ubicacion");

  if (savedUbicacion) {
    if (savedUbicacion === "Ubicación actual") {
      ubicacionUsada = "Ubicación actual";
      try {
        await obtenerUbicacionActual();
      } catch (e) {
        console.log("No se pudo recuperar ubicación GPS automáticamente");
      }
    } 
    else if (savedUbicacion.startsWith("CP ")) {
      const cp = savedUbicacion.substring(3);
      const provincia = cp.substring(0, 2);
      const cargado = await cargarCentrosCP(provincia);
      if (cargado && centrosCP && centrosCP[cp]) {
        posicionUsuario = centrosCP[cp];
        ubicacionUsada = `CP ${cp}`;
      }
    }
  }

  actualizarTabla();
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();

  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menu-btn');
  menuBtn.addEventListener('click', () => menu.classList.toggle('show'));

  // Cookie banner
  document.getElementById('cookie-aceptar').addEventListener('click', () => {
    setCookie("cookies_aceptadas", "si", 365);
    document.getElementById('cookie-banner').classList.remove('show');
    initPersistence();
  });

  document.getElementById('cookie-rechazar').addEventListener('click', () => {
    setCookie("cookies_aceptadas", "no", 30);
    document.getElementById('cookie-banner').classList.remove('show');
  });

  // Botones Cambiar
  document.getElementById('btn-cambiar-combustible').addEventListener('click', () => {
    document.getElementById('modal-combustible').classList.add('show');
    menu.classList.remove('show');
  });

  document.getElementById('btn-cambiar-ubicacion').addEventListener('click', () => {
    document.getElementById('modal-ubicacion').classList.add('show');
    menu.classList.remove('show');
  });

  // Selección de combustible
  document.querySelectorAll('#modal-combustible .modal-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setCar(btn.dataset.combustible);
      document.getElementById('modal-combustible').classList.remove('show');
    });
  });

  document.getElementById('cancelar-combustible').addEventListener('click', () => {
    document.getElementById('modal-combustible').classList.remove('show');
  });

  // Geolocalización
  document.getElementById('modal-geoloc').addEventListener('click', async () => {
    document.getElementById('modal-ubicacion').classList.remove('show');
    errmsgubicacion = '';
    try {
      await obtenerUbicacionActual();
      setCookie("ubicacion", "Ubicación actual");
      actualizarTabla();
    } catch (err) {
      errmsgubicacion = err;
      actualizarTabla();
    }
  });

  // Código Postal
  document.getElementById('modal-buscar-cp').addEventListener('click', async () => {
    const cp = document.getElementById('modal-codigo-postal').value.trim();
    if (cp.length !== 5) {
      alert("Introduce un código postal válido de 5 dígitos");
      return;
    }

    const provincia = cp.substring(0, 2);
    const cargado = await cargarCentrosCP(provincia);

    if (cargado && centrosCP && centrosCP[cp]) {
      posicionUsuario = centrosCP[cp];
      ubicacionUsada = `CP ${cp}`;
      setCookie("ubicacion", ubicacionUsada);
      errmsgubicacion = "";
      document.getElementById('modal-ubicacion').classList.remove('show');
      actualizarTabla();
    } else {
      errmsgubicacion = `Código postal ${cp} no encontrado`;
      actualizarTabla();
    }
  });

  document.getElementById('cancelar-ubicacion').addEventListener('click', () => {
    document.getElementById('modal-ubicacion').classList.remove('show');
  });

  // Iniciar persistencia
  initPersistence();
});