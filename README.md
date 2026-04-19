# Precios de Combustible España

Aplicación web que muestra los precios actualizados de carburantes en las estaciones de servicio de España, con opción de filtrado por ubicación (geolocalización o código postal).

## ¿Qué hace?

- Muestra los precios oficiales de **Gasolina 95, Gasolina 95 Premium, Diésel y Diésel Premium**.
- Permite ordenar siempre por **precio más bajo**.
- Filtra las estaciones cercanas usando tu ubicación actual o un código postal.
- Guarda tus preferencias (combustible y ubicación) usando **cookies** en tu navegador.
- Los datos se actualizan automáticamente todos los días.

## ¿Cómo funciona?

- Los datos provienen directamente del **Ministerio para la Transición Ecológica y el Reto Demográfico** (API oficial).
- Se actualizan **una vez al día** mediante GitHub Actions.
- Todo el procesamiento se realiza en el **navegador del usuario** (no se envía ninguna información personal a servidores externos).
- Las preferencias del usuario (combustible seleccionado y ubicación) se guardan exclusivamente mediante cookies locales.

**Importante**: Ningún dato personal (ubicación o preferencias) sale de tu navegador.

## Cómo reportar incidencias

Si encuentras algún error o quieres proponer una mejora, puedes abrir un issue aquí:

→ [Reportar un error o sugerencia](https://github.com/f-alonso-vendrell/precio-combustible/issues)

## Tecnologías y librerías utilizadas

- **HTML5**, **CSS3** y **Vanilla JavaScript** (sin frameworks)
- Geolocalización del navegador (`navigator.geolocation`)
- Cookies para persistencia de preferencias
- GitHub Actions para actualización automática diaria
- [GeoPandas](https://geopandas.org) + datos de códigos postales

## Agradecimientos

- Al **Ministerio para la Transición Ecológica y el Reto Demográfico** por publicar los datos de forma abierta.
- A **[Iñigo Flores](https://github.com/inigoflores)** por su excelente trabajo procesando y compartiendo los datos geográficos de códigos postales españoles:
  - Repositorio: [ds-codigos-postales-ine-es](https://github.com/inigoflores/ds-codigos-postales-ine-es)

---

Hecho con ❤️ por Fernando Alonso Vendrell para facilitar la comparación de precios de combustible en España.
