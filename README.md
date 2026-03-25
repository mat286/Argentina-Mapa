# Mapa Economico por Provincia - Argentina

Aplicacion web en React + Vite para visualizar datos economicos por provincia en un mapa coropletico de Argentina.

## 1. Stack y librerias

- `React` + `Vite`
- `React-Leaflet` + `Leaflet` para mapa
- `XLSX` para leer Excel
- `d3-scale` para escalas de color
- `Zustand` para estado global
- `html-to-image` para exportar imagen

## 2. Fuentes de datos geograficos

El mapa combina dos fuentes independientes:

### 2.1 Limites provinciales (poligonos coloreados)

- **Fuente**: Instituto Geografico Nacional (IGN) de Argentina
- **URL de descarga**: `https://infra.datos.gob.ar/georef/provincias.geojson`
- **Archivo local**: `src/data/argentina-provincias.json`
- Cada feature del GeoJSON contiene `"fuente":"IGN"` embebido en sus propiedades, confirmando la trazabilidad al dato oficial.
- La geometria describe los limites de las 24 jurisdicciones (23 provincias + CABA).

### 2.2 Fondo del mapa (paises vecinos, oceano, rios, topografia)

- **Tiles servidos por**: CARTO (`basemaps.cartocdn.com`)
- **Datos subyacentes**: OpenStreetMap (OSM), proyecto colaborativo de geodatos globales licenciado bajo ODbL (Open Database License).
- **Estilo usado**: `light_nolabels` — fondo gris/blanco sin etiquetas externas, para no interferir con las etiquetas propias de la app.
- La atribucion legal ya figura en el mapa: `© OpenStreetMap © CARTO`.

> **Nota para cumplimiento**: Leaflet renderiza ambas capas en proyeccion Web Mercator (EPSG:3857), que es estandar para mapas web interactivos pero no es una proyeccion cartometrica certificada. Si se requiere "escala real" en sentido estricto (medicion de areas o distancias), se deberia usar proyeccion Gauss-Kruger (POSGAR) y exportar desde un SIG como QGIS.

## 3. Como ejecutar

```bash
npm install
npm run dev
```

Para build de produccion:

```bash
npm run build
```

## 4. Estructura del proyecto

```text
src/
  components/
    ControlPanel.jsx
    ExcelUploader.jsx
    Legend.jsx
    MapArgentina.jsx
    RankingTable.jsx
    Tooltip.jsx
    BicontinentalInset.jsx
    CabaInset.jsx
    ExportCabaOverlay.jsx
  hooks/
    useColorScale.js
    useMapData.js
  state/
    useAppStore.js
  utils/
    colorScales.js
    normalizeData.js
    parseExcel.js
    provinceMatching.js
  data/
    argentina-provincias.json
  App.jsx
  App.css
  main.jsx
```

## 5. Flujo de datos (de Excel a mapa)

1. Usuario sube archivo en `ExcelUploader.jsx`.
2. `parseExcel.js` parsea hoja 1 y normaliza numeros.
3. `provinceMatching.js` mapea nombres del Excel contra GeoJSON.
4. Estado global guarda datos en `useAppStore.js`.
5. `useMapData.js` arma ranking, valores por provincia y estadisticas.
6. `useColorScale.js` usa `colorScales.js` para calcular colores y leyenda.
7. `MapArgentina.jsx` pinta provincias y labels.
8. `Legend.jsx` muestra rangos y colores.

## 6. Guia rapida: donde cambiar cada cosa

### 6.1 Colores y paletas

Archivo: `src/utils/colorScales.js`

- Objeto `COLOR_PALETTES`: agrega/edita paletas.
- Defaults de escala: en `buildColorScale()`.

Archivo: `src/components/ControlPanel.jsx`

- `PALETTE_LABELS`: etiqueta visible en panel para cada paleta.

Archivo: `src/state/useAppStore.js`

- `palette`: paleta default al iniciar.
- `resetScale()`: paleta al resetear.

### 6.2 Metodos de distribucion (lineal, log, quintiles)

Archivo: `src/utils/colorScales.js`

- `buildColorScale()`: logica principal segun `method`.
- `generateLinearBreaks`, `generateLogBreaks`, `buildQuantileBreaks`: leyenda y cortes.

Archivo: `src/components/ControlPanel.jsx`

- `METHOD_LABELS`: nombres visibles del selector.

### 6.3 Labels de provincias (texto sobre mapa)

Archivo: `src/components/MapArgentina.jsx`

- `LABEL_NUDGES`: diccionario con microajustes por provincia. Regla: `lat+` sube, `lat-` baja, `lon+` derecha, `lon-` izquierda.
- `LABEL_TEXT_OVERRIDES`: texto alternativo por provincia (soporta `<br/>` para multilínea).
- `CUSTOM_LABEL_COORDS`: coordenadas manuales para provincias con geometria problematica (actualmente solo Tierra del Fuego).
- `getZoomLabelSize(zoom)`: tamano de fuente segun nivel de zoom (3 niveles).
- Los centros de cada label se calculan con `L.geoJSON(feature).getBounds().getCenter()` para mayor precision geometrica.

Archivo: `src/App.css`

- `.province-label`: tipografia de labels.
- `.province-label-marker`: contenedor de label.

### 6.4 Tooltip y ranking

Archivo: `src/components/Tooltip.jsx`

- Contenido del tooltip por hover.

Archivo: `src/components/RankingTable.jsx`

- Columnas y formato del ranking lateral.

### 6.5 Leyenda

Archivo: `src/components/Legend.jsx`

- Titulo y estructura del recuadro de leyenda.

Archivo: `src/App.css`

- `.legend`: posicion (izquierda/derecha), colores, tamano.

### 6.6 Carga y parsing de Excel

Archivo: `src/components/ExcelUploader.jsx`

- Flujo de carga y manejo de errores UI.

Archivo: `src/utils/parseExcel.js`

- Deteccion de columnas.
- Conversion de formato argentino (`1.234,56`).
- Reglas para ignorar fila `Total`.

### 6.7 Matching de provincias

Archivo: `src/utils/provinceMatching.js`

- Diccionario de alias.
- Reglas de normalizacion.
- Fuzzy matching (Levenshtein).

### 6.8 Exportacion de imagen

Archivo: `src/components/ControlPanel.jsx`

- `handleExportImage()`: parametros de export (pixelRatio, fondo, etc.).
- `waitForMapTiles()`: espera a tiles listos para mejor calidad.

Archivo: `src/App.jsx`

- `id="map-export-target"`: define que zona exacta se exporta.

Archivo: `src/components/MapArgentina.jsx`

- `TileLayer crossOrigin="anonymous"`: mejora compatibilidad de exportacion.

### 6.9 Insets (bicontinental y CABA)

Archivo: `src/components/BicontinentalInset.jsx`

- Renderiza el cuarteron bicontinental (incluyendo Antartida) en un mapa no interactivo.
- `BICONTINENTAL_BOUNDS`: define el encuadre del inset.
- `ViewportRectangle`: dibuja un rectangulo con el viewport actual del mapa principal usando `mapBounds`.

Archivo: `src/components/CabaInset.jsx`

- Renderiza un inset dedicado a CABA con contexto de la provincia de Buenos Aires.
- Soporta `variant="default"` y `variant="export"` para distintos niveles de zoom/estilo.

Archivo: `src/App.jsx`

- `.map-insets`: contenedor visual de insets.
- En modo normal muestra CABA + bicontinental; en exportacion A4 se oculta el inset normal de CABA.

### 6.10 Overlay de exportacion CABA (callout)

Archivo: `src/components/ExportCabaOverlay.jsx`

- Muestra un recuadro de CABA y una linea conectora durante exportacion.
- Usa `exportCabaAnchorPoint` para conectar la posicion real de CABA en el mapa principal con el recuadro ampliado.

Archivo: `src/components/MapArgentina.jsx`

- `ExportCabaAnchorUpdater`: actualiza el punto ancla de CABA al mover/zoomear/redimensionar.

Archivo: `src/App.css`

- `.export-caba-overlay`, `.export-caba-path`, `.caba-inset--export-callout`: estilos del callout para exportacion.

### 6.11 Formato de valores

Archivo: `src/utils/colorScales.js`

- `formatNumber()`: actualmente convierte los valores a millones antes de formatear (`valor / 1000000`).
- Si se necesita mostrar valor absoluto, quitar esa conversion.

## 7. Configuracion de mapa

Archivo: `src/components/MapArgentina.jsx`

Parametros importantes de `MapContainer`:

- `zoomSnap`, `zoomDelta`: suavidad de zoom.
- `wheelPxPerZoomLevel`, `wheelDebounceTime`: sensibilidad de rueda.
- `center`, `zoom`: encuadre inicial.

## 8. Estado global (Zustand)

Archivo: `src/state/useAppStore.js`

### Datos

- `rawData`, `matchedData`, `unmatchedData`, `parseErrors`, `isDataReady`

### UI

- `method`, `palette`, `numRanges`, `normalizeEnabled`
- `showLabels`, `showRanking`
- `hoveredProvince`
- `isExportingImage`
- `mapBounds`
- `exportCabaAnchorPoint`

### Acciones

- `setFileData`, `setMatchingResults`
- `setMethod`, `setPalette`, `setNumRanges`
- `setNormalizeEnabled`, `setShowLabels`, `setShowRanking`
- `setHoveredProvince`, `setMapBounds`, `setIsExportingImage`, `setExportCabaAnchorPoint`
- `resetScale`, `resetAll`

## 9. Limpieza de codigo realizada

En esta iteracion se limpiaron estos puntos sin alterar comportamiento:

- Se elimino import no usado (`useMemo`) en `MapArgentina.jsx`.
- Se removio helper redundante de nombres en `MapArgentina.jsx`.
- Se quitaron variables no usadas (`nameCol`, `valueCol`) en `ExcelUploader.jsx`.

## 10. Problemas comunes y solucion

### No abre desde otra PC

- Verificar `vite.config.js` con `server.host = '0.0.0.0'`.
- Revisar firewall y puerto.

### Exportacion sale mala o incompleta

- Asegurar `waitForMapTiles()`.
- Revisar `crossOrigin` en `TileLayer`.
- Aumentar `pixelRatio` en `toPng`.
- Revisar que `window.currentMapInstance` exista (se setea desde `MapUpdater` en `MapArgentina.jsx`).

### Exportacion no sale en formato vertical A4

- Verificar en `ControlPanel.jsx` el seteo temporal a `793x1123`.
- Revisar `paddingTopLeft` y `paddingBottomRight` del `fitBounds` de exportacion.

### Labels se pisan

- Ajustar `LABEL_NUDGES` en `MapArgentina.jsx` para mover individualmente cada label.
- Para texto muy largo, agregar la provincia a `LABEL_TEXT_OVERRIDES` con `<br/>` para partir en líneas.

## 11. Recomendaciones para futuros cambios

- Mantener nombres de claves de paleta sincronizados entre:
  - `COLOR_PALETTES` (utils)
  - `PALETTE_LABELS` (panel)
  - default de `useAppStore`
- Antes de tocar matching, probar con un Excel chico de ejemplo.
- Si agregas nuevas reglas de visualizacion, centralizar en hooks (`useMapData`, `useColorScale`) para no recargar componentes UI.
