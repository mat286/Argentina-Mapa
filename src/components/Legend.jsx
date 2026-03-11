import useMapData from '../hooks/useMapData';
import useColorScale from '../hooks/useColorScale';

export default function Legend() {
  const { values, isDataReady } = useMapData();
  const { breaks } = useColorScale(values);

  if (!isDataReady || breaks.length === 0) return null;

  return (
    <div className="legend">
      <div className="legend-title">Quintiles - Millones de Pesos</div>
      <div className="legend-items">
        {breaks.map((b, i) => (
          <div key={i} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: b.color }}
            />
            <span className="legend-label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
