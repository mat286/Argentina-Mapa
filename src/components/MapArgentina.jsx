import { memo, useCallback, useEffect, useRef, useMemo, useState } from 'react';
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

// Ajustes finos para provincias chicas o con centroides menos legibles.
const LABEL_OFFSETS = {
  'Ciudad Autónoma de Buenos Aires': { lat: -0.2, lon: 0.35 },
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur': { lat: 0.55, lon: 0 },
  'Santa Fe': { lat: 0.15, lon: 0 },
  'Entre Ríos': { lat: -0.1, lon: 0.15 },
};

function getShortProvinceName(name) {
  return name;
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

  const addLabelMarker = useCallback((lat, lon, text, markersList, options = {}) => {
    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'province-label-marker',
        html: `<span class="province-label">${text}</span>`,
        iconSize: [170, 26],
        iconAnchor: [85, 13],
      }),
      interactive: false,
    });
    marker.addTo(map);
    markersList.push({ marker, name: text, ...options });
  }, [map]);

  useEffect(() => {
    if (!showLabels || !map) return;

    const markerEntries = [];

    geojson.features.forEach((feature) => {
      const name = feature.properties.nombre;
      const centroid = feature.properties.centroide;
      if (!centroid) return;

      const offset = LABEL_OFFSETS[name] || { lat: 0, lon: 0 };
      const shortName = getShortProvinceName(name);

      const customCoords = CUSTOM_LABEL_COORDS[name];
      const lat = customCoords
        ? customCoords.lat
        : centroid.lat + offset.lat + GLOBAL_LABEL_SHIFT.lat;
      const lon = customCoords
        ? customCoords.lon
        : centroid.lon + offset.lon + GLOBAL_LABEL_SHIFT.lon;

      addLabelMarker(lat, lon, shortName, markerEntries, {
        isSpecial: shortName === 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
      });
    });

    // El GeoJSON del IGN no trae Malvinas como feature independiente, se agrega etiqueta explícita.
    const malvinas = CUSTOM_LABEL_COORDS['Islas Malvinas'];
    addLabelMarker(malvinas.lat, malvinas.lon, 'Islas Malvinas', markerEntries, {
      isSpecial: true,
    });

    const denseProvinceNames = new Set([
      'Ciudad Autónoma de Buenos Aires',
      'Tucumán',
      'Entre Ríos',
      'Santa Fe',
      'Misiones',
      'Corrientes',
    ]);

    const applyZoomLabelStyle = () => {
      const zoom = map.getZoom();

      markerEntries.forEach(({ marker, name, isSpecial }) => {
        const labelEl = marker.getElement()?.querySelector('.province-label');
        if (!labelEl) return;

        const baseSize = 8 + (zoom - 3) * 1.2;
        const specialBonus = isSpecial ? 0.8 : 0;
        const fontSize = Math.max(9, Math.min(16, baseSize + specialBonus));

        let visible = true;
        if (zoom < 4.6 && denseProvinceNames.has(name)) visible = false;
        if (zoom < 4.2 && name === 'Islas Malvinas') visible = false;

        labelEl.style.fontSize = `${fontSize}px`;
        labelEl.style.display = visible ? 'inline-block' : 'none';
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
