import useAppStore from '../state/useAppStore';
import useMapData from '../hooks/useMapData';
import { formatNumber } from '../utils/colorScales';

export default function MapTooltip() {
  const hoveredProvince = useAppStore((s) => s.hoveredProvince);
  const { provinceValues, isDataReady } = useMapData();

  if (!hoveredProvince) return null;

  const value = provinceValues.get(hoveredProvince);
  const displayName = hoveredProvince;

  return (
    <div className="map-tooltip">
      <strong>{displayName}</strong>
      {isDataReady && value != null && (
        <div className="tooltip-value">{formatNumber(value)}</div>
      )}
      {isDataReady && value == null && (
        <div className="tooltip-no-data">Sin datos</div>
      )}
    </div>
  );
}
