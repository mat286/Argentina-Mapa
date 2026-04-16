import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import useAppStore from '../state/useAppStore';
import useMapData from '../hooks/useMapData';
import useColorScale from '../hooks/useColorScale';
import geojsonRaw from '../data/argentina-provincias.json';
import 'leaflet/dist/leaflet.css';

const ARGENMAP_BASE_URL =
  'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png';
// Atribución requerida por Argenmap/IGN (ver https://www.ign.gob.ar/AreaServicios/Argenmap/Introduccion)
const ARGENMAP_ATTRIBUTION =
  'Leaflet | <a href="https://www.ign.gob.ar/AreaServicios/Argenmap/Introduccion" target="_blank" rel="noopener noreferrer">Instituto Geogr\u00e1fico Nacional</a> + <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

const ARGENTINA_CENTER = [-40, -64];
const ARGENTINA_ZOOM = 4;
const GLOBAL_LABEL_SHIFT = { lat: 0, lon: -0.22 };
const CABA_COORDS = [-34.6144, -58.4459];
const WORLD_OUTER_RING = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];

function ringToLatLngs(ring) {
  return ring.map(([lng, lat]) => [lat, lng]);
}

function extractArgentinaOuterRings(geojson) {
  const rings = [];

  geojson.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry?.coordinates) return;

    if (geometry.type === 'Polygon') {
      if (geometry.coordinates[0]) {
        rings.push(ringToLatLngs(geometry.coordinates[0]));
      }
      return;
    }

    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((polygon) => {
        if (polygon?.[0]) {
          rings.push(ringToLatLngs(polygon[0]));
        }
      });
    }
  });

  return rings;
}

const ARGENTINA_HOLE_RINGS = extractArgentinaOuterRings(geojsonRaw);

const CUSTOM_LABEL_COORDS = {
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur': { lat: -54.55, lon: -67.65 },
  'Islas Malvinas': { lat: -50.75, lon: -58.08 },
};

// Ajustes finos por provincia para mejorar legibilidad.
// Regla: lat+ sube, lat- baja; lon+ derecha, lon- izquierda.
const LABEL_NUDGES = {
  'Ciudad Autónoma de Buenos Aires': { lat: -0.1, lon: 0.34 },
  'Buenos Aires': { lat: 0.05, lon: -0.05 },
  Catamarca: { lat: -0.12, lon: -0.18 },
  'Tucumán': { lat: 0.16, lon: 0.2 },
  Salta: { lat: -0.99, lon: 0 },
  'Entre Ríos': { lat: -0.02, lon: 0.14 },
  'Santa Fe': { lat: 0.04, lon: -0.06 },
  'La Rioja': { lat: 0.02, lon: -0.12 },
  'San Juan': { lat: -0.06, lon: -0.08 },
  Mendoza: { lat: 0.02, lon: -0.1 },
  Neuquén: { lat: 0.04, lon: -0.07 },
  Misiones: { lat: 0.02, lon: 0.08 },
  Corrientes: { lat: 0.02, lon: 0.06 },
  'Río Negro': { lat: 0.04, lon: -0.08 },
  Chubut: { lat: 0.03, lon: -0.05 },
  'Santa Cruz': { lat: 0.06, lon: -0.07 },
};

// Overrides de texto (acepta <br/> para multilinea).
const LABEL_TEXT_OVERRIDES = {
  'Santiago del Estero': 'Santiago<br/>del<br/>Estero',
  'Islas Malvinas': 'Islas Malvinas<br/>(Arg.)',
};

const ZERO_NUDGE = { lat: 0, lon: 0 };

// Polígonos simplificados de las dos islas principales de Malvinas.
// Coordenadas: [lon, lat] (formato GeoJSON estándar).
const MALVINAS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { nombre: 'Islas Malvinas' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Isla Soledad (East Falkland)
          [[
            [-59.47, -51.25], [-59.15, -51.23], [-58.75, -51.22],
            [-58.30, -51.35], [-57.92, -51.55], [-57.73, -51.85],
            [-57.72, -52.20], [-58.15, -52.68], [-58.58, -52.73],
            [-58.95, -52.57], [-59.43, -52.23], [-59.47, -51.75],
            [-59.47, -51.25],
          ]],
          // Isla Gran Malvina (West Falkland)
          [[
            [-61.45, -51.72], [-61.32, -51.25], [-60.82, -51.17],
            [-60.30, -51.20], [-59.70, -51.37], [-59.37, -51.62],
            [-59.30, -51.95], [-59.55, -52.37], [-60.22, -52.43],
            [-60.87, -52.28], [-61.30, -52.05], [-61.45, -51.95],
            [-61.45, -51.72],
          ]],
        ],
      },
    },
  ],
};

// Feature virtual de Malvinas para que ProvinceLabels genere su etiqueta.
// La geometría es un punto en el centro; CUSTOM_LABEL_COORDS la reubicará al lugar correcto.
const MALVINAS_LABEL_FEATURE = {
  type: 'Feature',
  properties: { nombre: 'Islas Malvinas' },
  geometry: { type: 'Point', coordinates: [-59.05, -51.75] },
};

const geojsonWithMalvinas = {
  ...geojsonRaw,
  features: [...geojsonRaw.features, MALVINAS_LABEL_FEATURE],
};

function getZoomLabelSize(zoom) {
  if (zoom < 5) return 10;
  if (zoom <= 6) return 12;
  return 14;
}

function MapUpdater() {
  const map = useMap();
  const setMapBounds = useAppStore((s) => s.setMapBounds);

  useEffect(() => {
    // Guardar la instancia del mapa globalmente para acceso desde ControlPanel (exportación)
    window.currentMapInstance = map;

    const emit = () => {
      const b = map.getBounds();
      setMapBounds([
        [b.getSouth(), b.getWest()],
        [b.getNorth(), b.getEast()],
      ]);
    };
    emit();
    map.on('moveend', emit);
    map.on('zoomend', emit);
    map.invalidateSize();
    return () => {
      map.off('moveend', emit);
      map.off('zoomend', emit);
      window.currentMapInstance = null;
    };
  }, [map, setMapBounds]);

  return null;
}

function ExportCabaAnchorUpdater() {
  const map = useMap();
  const isExportingImage = useAppStore((s) => s.isExportingImage);
  const setExportCabaAnchorPoint = useAppStore((s) => s.setExportCabaAnchorPoint);

  useEffect(() => {
    if (!isExportingImage) {
      setExportCabaAnchorPoint(null);
      return undefined;
    }

    const emitAnchor = () => {
      const point = map.latLngToContainerPoint(CABA_COORDS);
      setExportCabaAnchorPoint({ x: point.x, y: point.y });
    };

    emitAnchor();
    map.on('moveend', emitAnchor);
    map.on('zoomend', emitAnchor);
    map.on('resize', emitAnchor);

    return () => {
      map.off('moveend', emitAnchor);
      map.off('zoomend', emitAnchor);
      map.off('resize', emitAnchor);
      setExportCabaAnchorPoint(null);
    };
  }, [isExportingImage, map, setExportCabaAnchorPoint]);

  return null;
}

function ExportNeighborMask() {
  const map = useMap();
  const isExportingImage = useAppStore((s) => s.isExportingImage);

  useEffect(() => {
    if (!isExportingImage) return undefined;

    // Pane propio entre tilePane (z=200) y overlayPane (z=400) para que la máscara
    // tape los tiles de países limítrofes pero quede DEBAJO de los polígonos provinciales.
    if (!map.getPane('neighborMaskPane')) {
      const pane = map.createPane('neighborMaskPane');
      pane.style.zIndex = '250';
      pane.style.pointerEvents = 'none';
    }

    const mask = L.polygon([WORLD_OUTER_RING, ...ARGENTINA_HOLE_RINGS], {
      stroke: false,
      fillColor: '#ffffff',
      fillOpacity: 1,
      interactive: false,
      fillRule: 'evenodd',
      pane: 'neighborMaskPane',
    });

    mask.addTo(map);

    return () => {
      map.removeLayer(mask);
    };
  }, [isExportingImage, map]);

  return null;
}

function MalvinasLayer({ provinceValues, scale, isDataReady }) {
  const setHoveredProvince = useAppStore((s) => s.setHoveredProvince);
  const hoveredProvince = useAppStore((s) => s.hoveredProvince);

  const value = provinceValues.get('Islas Malvinas');
  const isHovered = hoveredProvince === 'Islas Malvinas';

  const styleFunc = useCallback(() => ({
    fillColor: value != null && isDataReady ? scale(value) : '#e0e0e0',
    weight: isHovered ? 3.5 : 1.8,
    opacity: 1,
    color: isHovered ? '#222' : '#555',
    fillOpacity: isHovered ? 0.9 : 0.75,
  }), [value, isDataReady, scale, isHovered]);

  const onEachFeature = useCallback((_feature, layer) => {
    layer.on({
      mouseover: () => setHoveredProvince('Islas Malvinas'),
      mouseout: () => setHoveredProvince(null),
    });
  }, [setHoveredProvince]);

  return (
    <GeoJSON
      key={`malvinas-${value}-${isHovered}`}
      data={MALVINAS_GEOJSON}
      style={styleFunc}
      onEachFeature={onEachFeature}
    />
  );
}

function ProvinceLabels({ geojson }) {
  const map = useMap();
  const showLabels = useAppStore((s) => s.showLabels);

  const addLabelMarker = useCallback((lat, lon, htmlText, markersList) => {
    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'province-label-marker',
        html: `<span class="province-label">${htmlText}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
      interactive: false,
    });
    marker.addTo(map);
    markersList.push({ marker, name: htmlText.replace(/<br\s*\/?\>/g, ' ') });
  }, [map]);

  useEffect(() => {
    if (!showLabels || !map) return;

    const markerEntries = [];

    geojson.features.forEach((feature) => {
      const name = feature.properties.nombre;
      const center = L.geoJSON(feature).getBounds().getCenter();
      const nudge = LABEL_NUDGES[name] || ZERO_NUDGE;
      const labelHtml = LABEL_TEXT_OVERRIDES[name] || name;

      const customCoords = CUSTOM_LABEL_COORDS[name];
      const lat = customCoords
        ? customCoords.lat
        : center.lat + GLOBAL_LABEL_SHIFT.lat + nudge.lat;
      const lon = customCoords
        ? customCoords.lon
        : center.lng + GLOBAL_LABEL_SHIFT.lon + nudge.lon;

      addLabelMarker(lat, lon, labelHtml, markerEntries);
    });

    const applyZoomLabelStyle = () => {
      const zoom = map.getZoom();
      const fontSize = getZoomLabelSize(zoom);
      const occupied = [];

      markerEntries.forEach(({ marker }) => {
        const labelEl = marker.getElement()?.querySelector('.province-label');
        if (!labelEl) return;

        labelEl.style.fontSize = `${fontSize}px`;
        labelEl.style.display = 'inline-block';

        // Logica simple de anti-superposicion: desplaza levemente labels cercanos en pantalla.
        const point = map.latLngToLayerPoint(marker.getLatLng());
        let dx = 0;
        let dy = 0;

        occupied.forEach((p) => {
          const nearX = Math.abs(point.x + dx - p.x) < 55;
          const nearY = Math.abs(point.y + dy - p.y) < 18;
          if (nearX && nearY) {
            dy += 14;
            dx += p.shiftDir;
          }
        });

        const shiftDir = occupied.length % 2 === 0 ? 8 : -8;
        occupied.push({ x: point.x + dx, y: point.y + dy, shiftDir });

        labelEl.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
      });
    };

    applyZoomLabelStyle();
    map.on('zoomend', applyZoomLabelStyle);

    return () => {
      map.off('zoomend', applyZoomLabelStyle);
      markerEntries.forEach(({ marker }) => map.removeLayer(marker));
    };
  }, [showLabels, map, geojson, addLabelMarker]);

  return null;
}

/**
 * Componente que actualiza estilos imperativamente sin recrear la capa GeoJSON.
 */
function StyleUpdater({ layerRef, provinceValues, scale, isDataReady, hoveredProvince }) {
  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;

    group.eachLayer((layer) => {
      const name = layer.feature?.properties?.nombre;
      if (!name) return;
      const value = provinceValues.get(name);
      const isHovered = name === hoveredProvince;

      layer.setStyle({
        fillColor: value != null && isDataReady ? scale(value) : '#e0e0e0',
        weight: isHovered ? 3.5 : 1.8,
        opacity: 1,
        color: isHovered ? '#222' : '#555',
        fillOpacity: isHovered ? 0.9 : 0.75,
      });

      if (isHovered) {
        layer.bringToFront();
      }
    });
  }, [layerRef, provinceValues, scale, isDataReady, hoveredProvince]);

  return null;
}

const MapArgentina = memo(function MapArgentina() {
  const { provinceValues, values, isDataReady } = useMapData();
  const { scale } = useColorScale(values);
  const setHoveredProvince = useAppStore((s) => s.setHoveredProvince);
  const hoveredProvince = useAppStore((s) => s.hoveredProvince);
  const geoJsonRef = useRef(null);
  const [layerReady, setLayerReady] = useState(false);

  const defaultStyle = useCallback(() => ({
    fillColor: '#e0e0e0',
    weight: 1.8,
    opacity: 1,
    color: '#555',
    fillOpacity: 0.75,
  }), []);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const name = feature.properties.nombre;
      layer.on({
        mouseover: () => setHoveredProvince(name),
        mouseout: () => setHoveredProvince(null),
      });
    },
    [setHoveredProvince]
  );

  const handleRef = useCallback((ref) => {
    geoJsonRef.current = ref;
    if (ref) setLayerReady(true);
  }, []);

  return (
    <div className="map-container">
      <MapContainer
        center={ARGENTINA_CENTER}
        zoom={ARGENTINA_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={140}
        wheelDebounceTime={60}
        zoomAnimation={true}
      >
        <TileLayer
          attribution={ARGENMAP_ATTRIBUTION}
          url={ARGENMAP_BASE_URL}
          minZoom={3}
          maxZoom={18}
          maxNativeZoom={18}
          crossOrigin="anonymous"
        />
        <GeoJSON
          ref={handleRef}
          data={geojsonRaw}
          style={defaultStyle}
          onEachFeature={onEachFeature}
        />
        {layerReady && (
          <StyleUpdater
            layerRef={geoJsonRef}
            provinceValues={provinceValues}
            scale={scale}
            isDataReady={isDataReady}
            hoveredProvince={hoveredProvince}
          />
        )}
        <ProvinceLabels geojson={geojsonWithMalvinas} />
        <ExportNeighborMask />
        <MapUpdater />
        <ExportCabaAnchorUpdater />
      </MapContainer>
    </div>
  );
});

export default MapArgentina;
