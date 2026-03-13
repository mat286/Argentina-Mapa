import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import useAppStore from '../state/useAppStore';
import useMapData from '../hooks/useMapData';
import useColorScale from '../hooks/useColorScale';
import geojsonRaw from '../data/argentina-provincias.json';
import 'leaflet/dist/leaflet.css';

const ARGENTINA_CENTER = [-40, -64];
const ARGENTINA_ZOOM = 4;
const GLOBAL_LABEL_SHIFT = { lat: 0, lon: -0.22 };

const CUSTOM_LABEL_COORDS = {
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur': { lat: -54.55, lon: -67.65 },
  'Islas Malvinas': { lat: -51.75, lon: -59.05 },
};

// Ajustes finos por provincia para mejorar legibilidad.
// Regla: lat+ sube, lat- baja; lon+ derecha, lon- izquierda.
const LABEL_NUDGES = {
  'Ciudad Autónoma de Buenos Aires': { lat: -0.1, lon: 0.34 },
  'Buenos Aires': { lat: 0.05, lon: -0.05 },
  Catamarca: { lat: -0.12, lon: -0.18 },
  'Tucumán': { lat: 0.16, lon: 0.2 },
  Salta: { lat: -0.28, lon: 0 },
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
};

const ZERO_NUDGE = { lat: 0, lon: 0 };

function getZoomLabelSize(zoom) {
  if (zoom < 5) return 10;
  if (zoom <= 6) return 12;
  return 14;
}

function MapUpdater() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
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
        weight: isHovered ? 3 : 1,
        opacity: 1,
        color: isHovered ? '#333' : '#666',
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
    weight: 1,
    opacity: 1,
    color: '#666',
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
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
        <ProvinceLabels geojson={geojsonRaw} />
        <MapUpdater />
      </MapContainer>
    </div>
  );
});

export default MapArgentina;
