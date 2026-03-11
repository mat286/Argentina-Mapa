/**
 * Normalización de datos para mejorar la visualización.
 * Útil cuando hay mucha diferencia entre provincias.
 */

/**
 * Normalización min-max: escala valores a [0, 1].
 */
export function normalizeMinMax(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => (v - min) / range);
}

/**
 * Normalización log10: comprime valores grandes.
 * Agrega 1 para evitar log(0).
 */
export function normalizeLog(values) {
  return values.map((v) => Math.log10(Math.max(v, 0) + 1));
}

/**
 * Normalización Z-score: centra en media 0, desviación estándar 1.
 */
export function normalizeZScore(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 1;
  return values.map((v) => (v - mean) / std);
}

/**
 * Calcula estadísticas de un array de valores.
 */
export function computeStats(values) {
  if (!values || values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const median =
    count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[count - 1],
    mean,
    median,
    stdDev,
    count,
  };
}
