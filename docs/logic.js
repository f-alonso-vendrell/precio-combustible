let datosPrecios = null;
let posicionUsuario = null;
let combustibleSeleccionado = null;
let combustibleKey = null;
let ubicacionUsada = "No seleccionada";
let centrosCP = null;
let estaObteniendoUbicacion = false;   // ← Nueva variable

let errmsgubicacion = "";
let errmsgnetwork = "";

const combustibleMapping = {
  "Gasolina 95": "Precio Gasolina 95 E5",
  "Gasolina 95 Premium": "Precio Gasolina 95 E5 Premium",
  "Diésel": "Precio Gasoleo A",
  "Diésel Premium": "Precio Gasoleo Premium"
};

// ==================== FUNCIONES DE COOKIES ====================
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

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

// ==================== Cargar centros de códigos postales ====================
async function cargarCentrosCP(provincia) {
  try {
    const url = `cp/${provincia}/codigos-postales-centros.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    centrosCP = await res.json();
    centrosCP._provincia = provincia;
    errmsgnetwork=""
    return true;
  } catch (e) {
    errmsgnetwork = `No se pudo cargar cp/${provincia}/...`;
    console.error(`No se pudo cargar cp/${provincia}/...`);
    return false;
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

// ==================== OBTENER UBICACIÓN ACTUAL ====================
async function obtenerUbicacionActual() {
  estaObteniendoUbicacion = true;
  ubicacionUsada = "Ubicación actual";
  actualizarInfoBar();                    // ← Muestra "refrescando..." inmediatamente

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      estaObteniendoUbicacion = false;
      errmsgubicacion = "Geolocalización no soportada";
      actualizarInfoBar();
      return reject("Geolocalización no soportada");
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        posicionUsuario = { 
          lat: pos.coords.latitude, 
          lon: pos.coords.longitude 
        };
        
        estaObteniendoUbicacion = false;

        // alert(`✅ Ubicación actual obtenida:\n\nLat: ${posicionUsuario.lat.toFixed(5)}\nLon: ${posicionUsuario.lon.toFixed(5)}`);
        
        actualizarInfoBar();   // Actualiza a "Ubicación actual"
        errmsgubicacion="";
        resolve(posicionUsuario);
      },
      (err) => {
        estaObteniendoUbicacion = false;
        
        errmsgubicacion = "No se pudo obtener la ubicación";
        if (err.code === 1) errmsgubicacion = "Permiso de ubicación denegado";
        if (err.code === 2) errmsgubicacion = "Ubicación no disponible";
        if (err.code === 3) errmsgubicacion = "Tiempo de espera agotado";
        renderizarTabla();
        reject(errmsgubicacion);
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
    errmsgnetwork="";
    document.getElementById('fecha-actualizacion').textContent = 
      datosPrecios.ultimaActualizacion || datosPrecios.Fecha || 'Sin fecha';
    renderizarTabla();
  } catch (e) {
    errmsgnetwork=e;
    console.error(e);
    renderizarTabla();
  }
}

// ==================== ACTUALIZAR BARRA ====================
function actualizarInfoBar() {
  document.getElementById('combustible-actual').textContent = combustibleSeleccionado || "Ninguno seleccionado";
  let textoUbicacion = ubicacionUsada;

  if (ubicacionUsada === "Ubicación actual") {
    if (estaObteniendoUbicacion) {
      textoUbicacion = "Ubicación actual (refrescando...)";
    } else if (!posicionUsuario) {
      textoUbicacion = "Ubicación actual (refrescando...)";
    }
  }
  
  document.getElementById('ubicacion-actual').textContent = textoUbicacion;

}

// ==================== RENDERIZAR TABLA ====================
function renderizarTabla() {
  actualizarInfoBar();
  const tbody = document.querySelector('#tabla-precios tbody');
  tbody.innerHTML = '';

  if (!posicionUsuario || !combustibleKey || errmsgubicacion != "" || errmsgnetwork != "") {
    let msg = ''
    if (!combustibleKey) {
      msg = msg + '<tr colspan="5" style="text-align:center;padding:50px;">Selecciona un tipo de combustible</tr>\n';
    }
    if (!posicionUsuario || ubicacionUsada == "No seleccionada" ){
      msg = msg + '<tr colspan="5" style="text-align:center;padding:50px;">Selecciona una ubicación</tr>\n';
    }
    if (errmsgubicacion != ""){
      msg = msg + '<tr colspan="5" style="text-align:center;padding:50px;">'+errmsgubicacion+'</tr>\n';
    }
    if (errmsgnetwork != ""){
      msg = msg + '<tr colspan="5" style="text-align:center;padding:50px;">'+errmsgnetwork+'</tr>\n';
    }
    tbody.innerHTML = msg;
    return;
  }

  

  let estaciones = datosPrecios.ListaEESSPrecio.filter(est => {
    return est[combustibleKey] && parseFloat(est[combustibleKey].replace(',', '.')) > 0;
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
    const pA = parseFloat(a[combustibleKey].replace(',', '.') || 999);
    const pB = parseFloat(b[combustibleKey].replace(',', '.') || 999);
    return pA - pB;
  });

  const limite = posicionUsuario ? 50 : 30;

  estaciones.slice(0, limite).forEach(est => {
    let distanciaTexto = "—";
    if (est.distancia !== undefined) {
      distanciaTexto = est.distancia < 1 ? `${(est.distancia*1000).toFixed(0)} m` : `${est.distancia.toFixed(1)} km`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${est.Rótulo || 'Sin nombre'}</strong><br>
          <small>${est.Dirección || ''}, ${est.Municipio || ''}</small></td>
      <td class="distancia">${distanciaTexto}</td>
      <td class="precio">${est[combustibleKey] || "—"} €
      (<a href="https://www.google.com/search?q=%22${est.Rótulo || 'Sin nombre'} ${est.Dirección || ''}, ${est.Municipio || ''}%22" target="_blank">Verificar</a>)</td>
      <td  class="maps"><a href="https://www.google.com/maps?q=${est.Latitud?.replace(',', '.') || ''},${est["Longitud (WGS84)"]?.replace(',', '.') || ''}" target="_blank">🗺️</a></td>
    `;
    tbody.appendChild(row);
  });
}

// ==================== GESTIÓN DE COOKIES Y CARGA INICIAL ====================
async function initCookies() {
  const cookiesAceptadas = getCookie("cookies_aceptadas");

  // Mostrar banner si no ha aceptado
  if (!cookiesAceptadas || cookiesAceptadas === "no") {
    document.getElementById('cookie-banner').classList.add('show');
    return; // No cargamos preferencias hasta que acepte
  }

  // Usuario ya aceptó cookies → cargar preferencias guardadas
  const savedCombustible = getCookie("combustible");
  const savedUbicacion = getCookie("ubicacion");

  if (savedCombustible && combustibleMapping[savedCombustible]) {
    combustibleSeleccionado = savedCombustible;
    combustibleKey = combustibleMapping[savedCombustible];
  }

  if (savedUbicacion) {
    if (savedUbicacion === "Ubicación actual") {
      ubicacionUsada = "Ubicación actual";
      // Intentar recuperar ubicación actual
      try {
        await obtenerUbicacionActual();
      } catch (e) {
        console.log("No se pudo recuperar ubicación GPS automáticamente");
        actualizarInfoBar(e);
        console.log(e);
        posicionUsuario=null;

        return;

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

  renderizarTabla();
}

// ==================== EVENTOS ====================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();

  const menu = document.getElementById('menu');
  const menuBtn = document.getElementById('menu-btn');

  menuBtn.addEventListener('click', () => menu.classList.toggle('show'));

  // Cookies Banner
  document.getElementById('cookie-aceptar').addEventListener('click', () => {
    setCookie("cookies_aceptadas", "si", 365);
    document.getElementById('cookie-banner').classList.remove('show');
    initCookies();   // Cargar preferencias guardadas
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
      combustibleSeleccionado = btn.dataset.combustible;
      combustibleKey = combustibleMapping[combustibleSeleccionado];
      setCookie("combustible", combustibleSeleccionado);
      document.getElementById('modal-combustible').classList.remove('show');
      renderizarTabla();
    });
  });

  document.getElementById('cancelar-combustible').addEventListener('click', () => {
    document.getElementById('modal-combustible').classList.remove('show');
  });

  // Geolocalización
  document.getElementById('modal-geoloc').addEventListener('click', async () => {
    
    try {
      document.getElementById('modal-ubicacion').classList.remove('show');
      errmsgubicacion='';
      await obtenerUbicacionActual();
      setCookie("ubicacion", "Ubicación actual");
      renderizarTabla();
    } catch (err) {
      errmsgubicacion=err;
      renderizarTabla();
      document.getElementById('modal-ubicacion').classList.remove('show');
      //alert(err);
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
      document.getElementById('modal-ubicacion').classList.remove('show');
      errmsgubicacion="";
      renderizarTabla();
    } else {
      errmsgubicacion=`Código postal ${cp} no encontrado`;
      renderizarTabla();
      // alert(`Código postal ${cp} no encontrado`);
    }
  });

  document.getElementById('cancelar-ubicacion').addEventListener('click', () => {
    document.getElementById('modal-ubicacion').classList.remove('show');
  });

  // Iniciar gestión de cookies
  initCookies();
});