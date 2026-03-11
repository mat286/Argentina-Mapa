import { create } from 'zustand';

const useAppStore = create((set) => ({
  // --- Datos cargados ---
  fileName: null,
  rawData: [], // [{ name, value, row }]
  parseErrors: [], // [{ row, name, rawValue, reason }]

  // --- Matching ---
  matchedData: [], // [{ provinceName, originalName, value, row, matchScore, matchReason }]
  unmatchedData: [], // [{ name, value, row, reason }]
  isDataReady: false, // true solo si no hay unmatched ni errores

  // --- Opciones de visualización ---
  method: 'linear', // 'linear' | 'log' | 'quantile'
  palette: 'azul-celeste', // clave de COLOR_PALETTES
  numRanges: 5, // 3, 5 o 7
  normalizeEnabled: false,
  showLabels: true,
  showRanking: false,

  // --- Interacción del mapa ---
  hoveredProvince: null, // nombre de la provincia

  // --- Acciones ---
  setFileData: (fileName, rawData, parseErrors) =>
    set({ fileName, rawData, parseErrors }),

  setMatchingResults: (matchedData, unmatchedData) =>
    set({
      matchedData,
      unmatchedData,
      isDataReady: unmatchedData.length === 0,
    }),

  setMethod: (method) => set({ method }),
  setPalette: (palette) => set({ palette }),
  setNumRanges: (numRanges) => set({ numRanges }),
  setNormalizeEnabled: (normalizeEnabled) => set({ normalizeEnabled }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setShowRanking: (showRanking) => set({ showRanking }),
  setHoveredProvince: (hoveredProvince) => set({ hoveredProvince }),

  resetScale: () =>
    set({
      method: 'linear',
      palette: 'azul-celeste',
      numRanges: 5,
      normalizeEnabled: false,
    }),

  resetAll: () =>
    set({
      fileName: null,
      rawData: [],
      parseErrors: [],
      matchedData: [],
      unmatchedData: [],
      isDataReady: false,
      method: 'linear',
      palette: 'azul-celeste',
      numRanges: 5,
      normalizeEnabled: false,
      showLabels: true,
      showRanking: false,
      hoveredProvince: null,
    }),
}));

export default useAppStore;
