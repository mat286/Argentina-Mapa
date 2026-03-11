import { useMemo } from 'react';
import useAppStore from '../state/useAppStore';
import { computeStats } from '../utils/normalizeData';

/**
 * Hook que deriva datos listos para el mapa a partir del store.
 * Retorna el mapa provincia->valor y estadísticas.
 */
export default function useMapData() {
  const matchedData = useAppStore((s) => s.matchedData);
  const isDataReady = useAppStore((s) => s.isDataReady);

  const provinceValues = useMemo(() => {
    if (!isDataReady || matchedData.length === 0) return new Map();
    const map = new Map();
    for (const item of matchedData) {
      map.set(item.provinceName, item.value);
    }
    return map;
  }, [matchedData, isDataReady]);

  const values = useMemo(
    () => matchedData.map((d) => d.value),
    [matchedData]
  );

  const stats = useMemo(() => computeStats(values), [values]);

  const ranking = useMemo(() => {
    if (!isDataReady || matchedData.length === 0) return [];
    return [...matchedData]
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        rank: idx + 1,
        provinceName: item.provinceName,
        value: item.value,
      }));
  }, [matchedData, isDataReady]);

  return { provinceValues, values, stats, ranking, isDataReady };
}
