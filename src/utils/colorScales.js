import { scaleLinear, scaleLog, scaleQuantile } from 'd3-scale';

/**
 * Paletas de colores disponibles.
 * Cada paleta define un array de colores para interpolar.
 */
export const COLOR_PALETTES = {
  'azul-celeste': ['#0b3c8c', '#1d5fbf', '#3b82d6', '#60a5fa', '#93c5fd', '#dbeafe'],
  'celeste-azul': ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82d6', '#1d5fbf', '#0b3c8c'],
  'verde-rojo': ['#1a9850', '#91cf60', '#d9ef8b', '#fee08b', '#fc8d59', '#d73027'],
  'morado-amarillo': ['#542788', '#8073ac', '#b2abd2', '#d8daeb', '#fee0b6', '#f1a340'],
  heatmap: ['#440154', '#31688e', '#35b779', '#fde725', '#fd8d3c', '#bd0026'],
};

/**
 * Construye una escala de color según el método y opciones.
 *
 * @param {number[]} values - Array de valores numéricos
 * @param {Object} options
 * @param {'linear'|'log'|'quantile'} options.method
 * @param {string} options.palette - Clave de COLOR_PALETTES
 * @param {number} options.numRanges - Número de rangos (3, 5 o 7)
 * @param {boolean} options.normalize - Si normalizar los datos
 * @returns {{ scale: Function, breaks: Array, colors: string[] }}
 */
export function buildColorScale(values, options) {
  const { method = 'linear', palette = 'azul-celeste', numRanges = 5, normalize = false } = options;

  if (!values || values.length === 0) {
    return { scale: () => '#ccc', breaks: [], colors: [] };
  }

  let processedValues = [...values];

  // Normalización min-max a [0, 1]
  if (normalize) {
    const min = Math.min(...processedValues);
    const max = Math.max(...processedValues);
    const range = max - min || 1;
    processedValues = processedValues.map((v) => (v - min) / range);
  }

  const paletteColors = COLOR_PALETTES[palette] || COLOR_PALETTES['azul-celeste'];
  // Seleccionar colores según numRanges
  const colors = selectColors(paletteColors, numRanges);

  let scale;
  let breaks = [];

  switch (method) {
    case 'log': {
      const min = Math.max(Math.min(...processedValues), 0.001);
      const max = Math.max(...processedValues);
      scale = scaleLog().domain([min, max]).range([0, 1]).clamp(true);
      breaks = generateLogBreaks(min, max, numRanges);
      break;
    }
    case 'quantile': {
      scale = scaleQuantile().domain(processedValues).range(colors);
      const quantiles = scale.quantiles();
      const min = Math.min(...processedValues);
      const max = Math.max(...processedValues);
      breaks = buildQuantileBreaks(quantiles, min, max, colors);
      return { scale, breaks, colors };
    }
    case 'linear':
    default: {
      const min = Math.min(...processedValues);
      const max = Math.max(...processedValues);
      scale = scaleLinear().domain([min, max]).range([0, 1]).clamp(true);
      breaks = generateLinearBreaks(min, max, numRanges);
      break;
    }
  }

  // Para linear y log, crear función que mapea valor -> color
  const colorInterp = scaleLinear()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors);

  const colorScale = (value) => {
    const t = scale(value);
    return colorInterp(t);
  };

  breaks = breaks.map((b, i) => ({
    ...b,
    color: colors[Math.min(i, colors.length - 1)],
  }));

  return { scale: colorScale, breaks, colors };
}

/**
 * Selecciona N colores equidistantes de una paleta.
 */
function selectColors(paletteColors, n) {
  if (n >= paletteColors.length) return [...paletteColors];
  if (n <= 1) return [paletteColors[0]];

  const colors = [];
  for (let i = 0; i < n; i++) {
    const idx = (i / (n - 1)) * (paletteColors.length - 1);
    colors.push(paletteColors[Math.round(idx)]);
  }
  return colors;
}

function generateLinearBreaks(min, max, n) {
  const step = (max - min) / n;
  const breaks = [];
  for (let i = 0; i < n; i++) {
    breaks.push({
      min: min + step * i,
      max: min + step * (i + 1),
      label: `${formatNumber(min + step * i)} — ${formatNumber(min + step * (i + 1))}`,
    });
  }
  return breaks;
}

function generateLogBreaks(min, max, n) {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const step = (logMax - logMin) / n;
  const breaks = [];
  for (let i = 0; i < n; i++) {
    const bMin = Math.pow(10, logMin + step * i);
    const bMax = Math.pow(10, logMin + step * (i + 1));
    breaks.push({
      min: bMin,
      max: bMax,
      label: `${formatNumber(bMin)} — ${formatNumber(bMax)}`,
    });
  }
  return breaks;
}

function buildQuantileBreaks(quantiles, min, max, colors) {
  const breaks = [];
  const boundaries = [min, ...quantiles, max];
  for (let i = 0; i < boundaries.length - 1; i++) {
    breaks.push({
      min: boundaries[i],
      max: boundaries[i + 1],
      label: `${formatNumber(boundaries[i])} — ${formatNumber(boundaries[i + 1])}`,
      color: colors[Math.min(i, colors.length - 1)],
    });
  }
  return breaks;
}

/**
 * Formatea un número con separador de miles.
 */
export function formatNumber(nu) {
  if (nu == null || isNaN(nu)) return '—';
  const num = (Number(nu)/1000000).toFixed(1); // Convertir a millones

  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
