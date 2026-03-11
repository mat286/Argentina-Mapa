import { useMemo } from 'react';
import useAppStore from '../state/useAppStore';
import { buildColorScale } from '../utils/colorScales';

/**
 * Hook que construye la escala de color basada en las opciones del store.
 * Retorna una función scale(valor) -> color y los breaks para la leyenda.
 */
export default function useColorScale(values) {
  const method = useAppStore((s) => s.method);
  const palette = useAppStore((s) => s.palette);
  const numRanges = useAppStore((s) => s.numRanges);
  const normalizeEnabled = useAppStore((s) => s.normalizeEnabled);

  const { scale, breaks, colors } = useMemo(
    () =>
      buildColorScale(values, {
        method,
        palette,
        numRanges,
        normalize: normalizeEnabled,
      }),
    [values, method, palette, numRanges, normalizeEnabled]
  );

  return { scale, breaks, colors };
}
