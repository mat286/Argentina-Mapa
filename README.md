# Mapa Economico por Provincia - Argentina

Aplicacion web en React + Vite para visualizar datos economicos por provincia en un mapa coropletico de Argentina.

## 1. Stack y librerias

- `React` + `Vite`
- `React-Leaflet` + `Leaflet` para mapa
- `XLSX` para leer Excel
- `d3-scale` para escalas de color
- `Zustand` para estado global
- `html-to-image` para exportar imagen

## 2. Como ejecutar

```bash
npm install
npm run dev
```

Para build de produccion:

```bash
npm run build
```

## 3. Estructura del proyecto

```text
src/
  components/
    ControlPanel.jsx
    ExcelUploader.jsx
    Legend.jsx
    MapArgentina.jsx
    RankingTable.jsx
    Tooltip.jsx
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

## 4. Flujo de datos (de Excel a mapa)

1. Usuario sube archivo en `ExcelUploader.jsx`.
2. `parseExcel.js` parsea hoja 1 y normaliza numeros.
3. `provinceMatching.js` mapea nombres del Excel contra GeoJSON.
4. Estado global guarda datos en `useAppStore.js`.
5. `useMapData.js` arma ranking, valores por provincia y estadisticas.
6. `useColorScale.js` usa `colorScales.js` para calcular colores y leyenda.
7. `MapArgentina.jsx` pinta provincias y labels.
8. `Legend.jsx` muestra rangos y colores.

## 5. Guia rapida: donde cambiar cada cosa

### 5.1 Colores y paletas

Archivo: `src/utils/colorScales.js`

- Objeto `COLOR_PALETTES`: agrega/edita paletas.
- Defaults de escala: en `buildColorScale()`.

Archivo: `src/components/ControlPanel.jsx`

- `PALETTE_LABELS`: etiqueta visible en panel para cada paleta.

Archivo: `src/state/useAppStore.js`

- `palette`: paleta default al iniciar.
- `resetScale()`: paleta al resetear.

### 5.2 Metodos de distribucion (lineal, log, quintiles)

Archivo: `src/utils/colorScales.js`

- `buildColorScale()`: logica principal segun `method`.
- `generateLinearBreaks`, `generateLogBreaks`, `buildQuantileBreaks`: leyenda y cortes.

Archivo: `src/components/ControlPanel.jsx`

- `METHOD_LABELS`: nombres visibles del selector.

### 5.3 Labels de provincias (texto sobre mapa)

Archivo: `src/components/MapArgentina.jsx`

- `LABEL_OFFSETS`: microajustes por provincia.
- `CUSTOM_LABEL_COORDS`: posiciones manuales (ej. Malvinas).
- `GLOBAL_LABEL_SHIFT`: corrimiento global.
- `applyZoomLabelStyle()`: visibilidad y tamano segun zoom.

Archivo: `src/App.css`

- `.province-label`: tipografia de labels.
- `.province-label-marker`: contenedor de label.

### 5.4 Tooltip y ranking

Archivo: `src/components/Tooltip.jsx`

- Contenido del tooltip por hover.

Archivo: `src/components/RankingTable.jsx`

- Columnas y formato del ranking lateral.

### 5.5 Leyenda

Archivo: `src/components/Legend.jsx`

- Titulo y estructura del recuadro de leyenda.

Archivo: `src/App.css`

- `.legend`: posicion (izquierda/derecha), colores, tamano.

### 5.6 Carga y parsing de Excel

Archivo: `src/components/ExcelUploader.jsx`

- Flujo de carga y manejo de errores UI.

Archivo: `src/utils/parseExcel.js`

- Deteccion de columnas.
- Conversion de formato argentino (`1.234,56`).
- Reglas para ignorar fila `Total`.

### 5.7 Matching de provincias

Archivo: `src/utils/provinceMatching.js`

- Diccionario de alias.
- Reglas de normalizacion.
- Fuzzy matching (Levenshtein).

### 5.8 Exportacion de imagen

Archivo: `src/components/ControlPanel.jsx`

- `handleExportImage()`: parametros de export (pixelRatio, fondo, etc.).
- `waitForMapTiles()`: espera a tiles listos para mejor calidad.

Archivo: `src/App.jsx`

- `id="map-export-target"`: define que zona exacta se exporta.

Archivo: `src/components/MapArgentina.jsx`

- `TileLayer crossOrigin="anonymous"`: mejora compatibilidad de exportacion.

## 6. Configuracion de mapa

Archivo: `src/components/MapArgentina.jsx`

Parametros importantes de `MapContainer`:

- `zoomSnap`, `zoomDelta`: suavidad de zoom.
- `wheelPxPerZoomLevel`, `wheelDebounceTime`: sensibilidad de rueda.
- `center`, `zoom`: encuadre inicial.

## 7. Estado global (Zustand)

Archivo: `src/state/useAppStore.js`

### Datos

- `rawData`, `matchedData`, `unmatchedData`, `parseErrors`, `isDataReady`

### UI

- `method`, `palette`, `numRanges`, `normalizeEnabled`
- `showLabels`, `showRanking`
- `hoveredProvince`

### Acciones

- `setFileData`, `setMatchingResults`
- `setMethod`, `setPalette`, `setNumRanges`
- `setNormalizeEnabled`, `setShowLabels`, `setShowRanking`
- `resetScale`, `resetAll`

## 8. Limpieza de codigo realizada

En esta iteracion se limpiaron estos puntos sin alterar comportamiento:

- Se elimino import no usado (`useMemo`) en `MapArgentina.jsx`.
- Se removio helper redundante de nombres en `MapArgentina.jsx`.
- Se quitaron variables no usadas (`nameCol`, `valueCol`) en `ExcelUploader.jsx`.

## 9. Problemas comunes y solucion

### No abre desde otra PC

- Verificar `vite.config.js` con `server.host = '0.0.0.0'`.
- Revisar firewall y puerto.

### Exportacion sale mala o incompleta

- Asegurar `waitForMapTiles()`.
- Revisar `crossOrigin` en `TileLayer`.
- Aumentar `pixelRatio` en `toPng`.

### Labels se pisan

- Ajustar umbrales en `applyZoomLabelStyle()`.
- Ajustar `LABEL_OFFSETS` y `GLOBAL_LABEL_SHIFT`.

## 10. Recomendaciones para futuros cambios

- Mantener nombres de claves de paleta sincronizados entre:
  - `COLOR_PALETTES` (utils)
  - `PALETTE_LABELS` (panel)
  - default de `useAppStore`
- Antes de tocar matching, probar con un Excel chico de ejemplo.
- Si agregas nuevas reglas de visualizacion, centralizar en hooks (`useMapData`, `useColorScale`) para no recargar componentes UI.
