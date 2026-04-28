import { MapContainer, GeoJSON } from 'react-leaflet';
import useMapData from '../hooks/useMapData';
import useColorScale from '../hooks/useColorScale';
import geojsonRaw from '../data/argentina-provincias.json';
import 'leaflet/dist/leaflet.css';

const CABA_NAME = 'Ciudad Autónoma de Buenos Aires';
const BUENOS_AIRES_NAME = 'Buenos Aires';

// GeoJSON solo con el feature de CABA
const cabaGeoJSON = {
  ...geojsonRaw,
  features: geojsonRaw.features.filter(
    (f) => f.properties.nombre === CABA_NAME
  ),
};

// GeoJSON con Buenos Aires provincia como contexto visual
const contextGeoJSON = {
  ...geojsonRaw,
  features: geojsonRaw.features.filter(
    (f) => f.properties.nombre === BUENOS_AIRES_NAME
  ),
};

const contextStyle = {
  fillColor: '#dde5ef',
  weight: 0.5,
  opacity: 1,
  color: '#8a9ab0',
  fillOpacity: 0.6,
};

/**
 * Inset de CABA — muestra el polígono de la Ciudad Autónoma de Buenos Aires
 * con el mismo color de datos que el mapa principal.
 * No es interactivo.
 */
export default function CabaInset({ variant = 'default', className = '' }) {
  const { provinceValues, values, isDataReady } = useMapData();
  const { scale } = useColorScale(values);
  /* const insetZoom = variant === 'export' ? 10 : 8; */
  const insetZoom = variant === 'export' ? 7.5 : 8;

  const rootClassName = ['caba-inset', `caba-inset--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  const cabaValue = provinceValues.get(CABA_NAME);
  const cabaColor =
    cabaValue != null && isDataReady ? scale(cabaValue) : '#cce8f4';

  const cabaStyle = {
    fillColor: cabaColor,
    weight: 1,
    opacity: 1,
    color: '#4a90a4',
    fillOpacity: 0.9,
  };

  return (
    <div className={rootClassName}>
      <div className="inset-label">
        Ciudad<br />Autónoma de<br />Buenos Aires
      </div>
      <div className="inset-map-wrapper">
        <MapContainer
          center={[-34.6144, -58.4459]}
          zoom={insetZoom}
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
          <GeoJSON data={contextGeoJSON} style={contextStyle} />
          <GeoJSON
            key={isDataReady ? 'data' : 'nodata'}
            data={cabaGeoJSON}
            style={cabaStyle}
          />
        </MapContainer>
      </div>
    </div>
  );
}
