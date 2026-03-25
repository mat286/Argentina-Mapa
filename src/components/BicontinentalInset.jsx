import { useEffect, useRef } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import useAppStore from '../state/useAppStore';
import useMapData from '../hooks/useMapData';
import useColorScale from '../hooks/useColorScale';
import geojsonRaw from '../data/argentina-provincias.json';
import 'leaflet/dist/leaflet.css';

// Bounds completos del territorio argentino incluyendo Antártida,
// calculados manualmente a partir del GeoJSON del IGN para cubrir todo el territorio bicontinental.
// Latitud sur -90 asegura que el sector antártico quede visible en la proyección Mercator.
const BICONTINENTAL_BOUNDS = [
  [-82, -74],  // SW (Antártida)
  [-21, -52],  // NE (Jujuy / Misiones)
];

/**
 * Dibuja un rectángulo rojo sobre el inset bicontinental indicando
 * el área actualmente visible en el mapa principal.
 */
function ViewportRectangle() {
  const map = useMap();
  const mapBounds = useAppStore((s) => s.mapBounds);
  const rectRef = useRef(null);

  useEffect(() => {
    if (!mapBounds) return;

    if (rectRef.current) {
      map.removeLayer(rectRef.current);
    }

    // Clampeamos a los bounds del mapa real de Argentina para no dibujar fuera
    const rect = L.rectangle(mapBounds, {
      color: '#c0392b',
      weight: 1.5,
      fill: true,
      fillColor: '#e74c3c',
      fillOpacity: 0.08,
      interactive: false,
    });
    rect.addTo(map);
    rectRef.current = rect;

    return () => {
      map.removeLayer(rect);
      rectRef.current = null;
    };
  }, [map, mapBounds]);

  return null;
}

/**
 * Cuarterón bicontinental — Ley 26.651.
 * Muestra toda la Argentina (territorio continental + Antártida + Malvinas)
 * con los mismos colores de datos que el mapa principal.
 * No es interactivo.
 */
export default function BicontinentalInset() {
  const { provinceValues, values, isDataReady } = useMapData();
  const { scale } = useColorScale(values);

  const styleFeature = (feature) => {
    const name = feature.properties.nombre;
    const value = provinceValues.get(name);
    return {
      fillColor: value != null && isDataReady ? scale(value) : '#cce8f4',
      weight: 0.5,
      opacity: 1,
      color: '#4a90a4',
      fillOpacity: 0.85,
    };
  };

  return (
    <div className="bicontinental-inset">
      <div className="inset-label">Argentina Bicontinental</div>
      <div className="inset-map-wrapper">
        <MapContainer
          bounds={BICONTINENTAL_BOUNDS}
          boundsOptions={{ padding: [4, 4] }}
          style={{ height: '100%', width: '100%' }}
          dragging={false}
          zoomControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          attributionControl={false}
        >
          <GeoJSON
            key={isDataReady ? 'data' : 'nodata'}
            data={geojsonRaw}
            style={styleFeature}
          />
          <ViewportRectangle />
        </MapContainer>
      </div>
    </div>
  );
}
