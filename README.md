# MediCerca

Comparador de precios de medicamentos para Chile. Muestra ofertas de farmacias online, permite anotar precios de farmacias de barrio y ubica las farmacias cercanas en un mapa.

- 38 medicamentos de uso frecuente y 13 categorías, más un buscador libre de cualquier medicamento.
- Precios en vivo de 6 cadenas: Ahumada, Dr. Simi, Salcobrand, EcoFarmacias, Araucomed y Farmacia Knop.
- Buscador online (`#/online?q=…`): si el medicamento no está en el catálogo, busca el nombre en las 6 cadenas sin entrar a sus sitios.
- Comparación por **precio por unidad** (comprimido, cápsula, gramo, ml o dosis), no solo por caja.
- Precios de barrio guardados solo en tu teléfono.
- GPS + mapa con **2706 farmacias de todo Chile** (OpenStreetMap), no solo Huechuraba.
- Instalable como aplicación (PWA) y funciona sin conexión con el último respaldo.

## Cómo usarla

1. Entra con el navegador de tu teléfono (Chrome en Android, Safari en iPhone).
2. Busca el remedio por nombre o marca, por ejemplo `paracetamol`, `tapsin` u `omeprazol`.
3. Si no aparece en el catálogo, pulsa **Buscar … en farmacias online** (o Enter) para consultar las 6 cadenas en vivo.
4. Abre el medicamento y revisa la oferta recomendada y el precio por unidad.
5. Toca **Anotar precio** si compraste o viste un precio en una farmacia de barrio.
6. Toca **Mapa** para ver farmacias cerca y activa el GPS con **Usar mi ubicación**. Funciona en cualquier comuna de Chile.
7. Para instalarla: en Android abre el menú ⋮ y elige **Instalar aplicación** o **Agregar a pantalla principal**; en iPhone toca **Compartir** y luego **Añadir a pantalla de inicio**.

## Publicarla en Cloudflare (sin programar)

Necesitas una cuenta de GitHub y una cuenta de Cloudflare. El proyecto ya incluye la configuración de Cloudflare Workers y el archivo `package-lock.json`.

### Paso 1: subir el proyecto a GitHub

**Opción recomendada: GitHub Desktop**

1. Instala GitHub Desktop desde <https://desktop.github.com/> e inicia sesión.
2. En el menú superior elige **File → Add local repository** (Archivo → Agregar repositorio local).
3. Selecciona esta carpeta: `C:\Users\lenovo\Documents\Qoder\2026-11-21\d3723892`.
4. Si avisa que no es un repositorio, pulsa **create a repository** (crear un repositorio).
5. Deja el nombre `medicerca`, marca **Private** (Privado) si quieres, y pulsa **Create repository**.
6. Pulsa **Publish repository** (Publicar repositorio). Deja marcado **Keep this code private** si quieres que el código sea privado (recomendado).
7. Verifica que arriba diga **No local changes** y que el repositorio aparezca en tu cuenta de GitHub.

**Alternativa: desde la web de GitHub**

1. Entra a <https://github.com/new>.
2. Escribe `medicerca`, elige **Private** o **Public** y pulsa **Create repository**.
3. Pulsa **uploading an existing file** (subir un archivo existente).
4. Arrastra **el contenido** de la carpeta del proyecto, no la carpeta completa.
5. Pulsa **Commit changes**.
6. Crea aparte el archivo `.assetsignore`: **Add file → Create new file**, escribe `.assetsignore` como nombre y pega el contenido del archivo `.assetsignore` del proyecto. Pulsa **Commit changes**.

### Paso 2: conectar Cloudflare con GitHub

1. Entra a <https://dash.cloudflare.com/> e inicia sesión.
2. En el menú lateral abre **Workers & Pages** (también aparece como **Compute (Workers)** o **Workers**).
3. Pulsa **Create** (Crear) y elige la pestaña **Workers**.
4. Pulsa **Connect to Git** / **Import a repository** (Conectar con Git / Importar un repositorio).
5. Autoriza a GitHub si lo pide y elige el repositorio `medicerca`.
6. En la configuración del proyecto:
   - **Project name** (Nombre del proyecto): `medicerca`. Si ya está ocupado, usa `medicerca-cl` y cambia también `"name"` en `wrangler.jsonc`.
   - **Production branch** (Rama de producción): `main`.
   - **Build command** (Comando de compilación): `npm ci`.
   - **Deploy command** (Comando de despliegue): `npx wrangler deploy`.
   - **Root directory** (Directorio raíz): déjalo vacío o en `/`.
   - Framework preset: **None** (Ninguno).
7. Pulsa **Deploy** (Desplegar) y espera a que termine la primera compilación.
8. Cloudflare te dará una dirección parecida a `https://medicerca.TU-SUBDOMINIO.workers.dev`. Ábrela en el teléfono.

### Paso 3: probar antes de usar un dominio propio

1. Abre la dirección `workers.dev` en el teléfono.
2. Busca `paracetamol` y revisa que aparezcan ofertas; prueba también un nombre que no esté en el catálogo (por ejemplo `ambroxol`) y usa **Buscar … en farmacias online**.
3. Activa el GPS en una comuna fuera de Santiago y confirma que aparecen farmacias cercanas.
4. Anota un precio de prueba en **Anotar precio** y luego bórralo.
5. Instala la app y ábrela de nuevo desde el ícono.

Si la compilación falla con **"The entry-point file at ... was not found"**, revisa que en la raíz del repositorio de GitHub estén `wrangler.jsonc`, `package.json`, `package-lock.json` y `cloudflare-worker.js`. La carpeta `worker/` no es necesaria para publicar, porque `cloudflare-worker.js` ya contiene el Worker completo.

Solo después de probar la dirección `workers.dev` conviene conectar un dominio propio. Si quieres, ese paso lo revisamos juntos antes de tocar el DNS.

### Actualizaciones y vuelta atrás

- Cada cambio que se suba a la rama `main` se publica automáticamente. Por eso no subimos nada sin tu aprobación; primero lo pruebas en local o en la dirección de vista previa.
- Para volver a una versión anterior: abre el Worker → **Deployments** (Despliegues) → elige una versión anterior → **Rollback** (Revertir).
- No publiques cambios de precios o de diseño sin probarlos primero en local o en una vista previa.

## Probar y mantener el proyecto

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abre <http://localhost:8790>. Para probar el service worker en local, usa <http://localhost:8790/?sw=1> y luego recarga.

```bash
npm test            # pruebas del buscador y del emparejamiento de precios
npm run snapshot    # actualiza data/live-prices.json con precios reales
npm run build:worker # regenera cloudflare-worker.js desde worker/index.js
npm run deploy      # publica con Wrangler (requiere npx wrangler login)
```

`cloudflare-worker.js` es el archivo de entrada que Cloudflare usa al publicar. Se genera desde `worker/index.js` y sus dependencias; después de cambiar el motor del servidor hay que ejecutar `npm run build:worker`.

El respaldo `data/live-prices.json` permite mostrar el último precio conocido si una farmacia no responde. No reemplaza la consulta en vivo.

## Privacidad y datos

- No hay cuentas, registro ni analítica de terceros.
- La ubicación se guarda en el navegador. Al abrir el mapa se envían solo las coordenadas al endpoint `/api/nearby`; el listado nacional de farmacias viene incluido en la app.
- Al usar **Buscar … en farmacias online** se envía solo el nombre del medicamento a `/api/search` para consultar las cadenas.
- Los precios de barrio se guardan en `localStorage` y no se suben a ningún servidor.
- Los precios de farmacias online se consultan en el servidor y se almacenan en caché por unos minutos.
- Borrar los datos del sitio en el navegador elimina la ubicación y los precios anotados.

## Alcance y limitaciones

- Los precios son referenciales y pueden cambiar sin aviso. Confirma siempre en la farmacia o en su sitio antes de comprar.
- El precio online puede no coincidir con el precio de la sucursal física.
- Cruz Verde muestra precios solo después de elegir comuna e iniciar sesión en su sitio; por eso queda como enlace directo y no como precio en vivo.
- El buscador online devuelve el nombre y la presentación tal como los publica cada cadena; si el nombre no indica el tamaño de la caja, la app no inventa el precio por unidad.
- Las farmacias del mapa vienen de OpenStreetMap (registro comunitario): puede haber locales sin registrar, direcciones incompletas o cerrados.
- La app no reemplaza la receta ni la indicación de un profesional de la salud.

## Estructura

```text
index.html                 interfaz principal
styles.css                 diseño mobile-first
src/                       navegación, vistas, mapa y hojas modales
shared/                    catálogo, comparador, buscador online y adaptadores de farmacias
functions/api/             endpoints de Cloudflare Workers: /api/compare, /api/search, /api/nearby
worker/index.js            código fuente de la entrada de Cloudflare Workers
cloudflare-worker.js       entrada empaquetada que usa Cloudflare al publicar
data/                      respaldo de precios y pharmacies-chile.json (2706 farmacias OSM)
scripts/dev.mjs            servidor local con las mismas rutas /api
scripts/build-pharmacies.mjs  genera data/pharmacies-chile.json desde el GeoJSON de OSM/HDX
scripts/snapshot.mjs       generador del respaldo de precios
test/                      pruebas con Node.js
```

## Fuentes y referencias

- Precios y fiscalización de medicamentos, ISP: <https://www.ispch.gob.cl/>
- CENABAST: <https://www.cenabast.cl/>
- Lista de precios de Salcobrand (Decreto 466): <https://salcobrand.cl/legal_bases/lista-precios>
- EcoFarmacias: <https://ecofarmacias.cl/>
- OpenStreetMap, licencia y atribución: <https://www.openstreetmap.org/copyright>
- Farmacias de Chile (HOT Health Facilities, HDX): <https://data.humdata.org/dataset/hotosm_chl_health_facilities>
- Overpass API: <https://wiki.openstreetmap.org/wiki/Overpass_API>
- Farmacia Knop: <https://www.farmaciasknop.com/>
- Salcobrand: <https://salcobrand.cl/>
- Cloudflare Workers con assets estáticos: <https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare Workers Builds: <https://developers.cloudflare.com/workers/ci-cd/builds/>
- Geolocalización en la web (MDN): <https://developer.mozilla.org/es/docs/Web/API/Geolocation_API>
- Instalación de PWA (web.dev): <https://web.dev/learn/pwa/installation>
- Leaflet: <https://leafletjs.com/>
