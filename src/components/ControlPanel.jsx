import { useState } from 'react';
import useAppStore from '../state/useAppStore';
import ExcelUploader from './ExcelUploader';
import { COLOR_PALETTES } from '../utils/colorScales';
import { toPng } from 'html-to-image';

const PALETTE_LABELS = {
  'azul-celeste': 'Azul → Celeste claro',
  'celeste-azul': 'Celeste claro → Azul',
  'morado-amarillo': 'Morado → Amarillo',
  heatmap: 'Heatmap',
};

const METHOD_LABELS = {
  linear: 'Lineal',
  log: 'Logarítmico',
  quantile: 'Quintiles',
};

export default function ControlPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const method = useAppStore((s) => s.method);
  const palette = useAppStore((s) => s.palette);
  const numRanges = useAppStore((s) => s.numRanges);
  const normalizeEnabled = useAppStore((s) => s.normalizeEnabled);
  const showLabels = useAppStore((s) => s.showLabels);
  const showRanking = useAppStore((s) => s.showRanking);
  const isDataReady = useAppStore((s) => s.isDataReady);

  const setMethod = useAppStore((s) => s.setMethod);
  const setPalette = useAppStore((s) => s.setPalette);
  const setNumRanges = useAppStore((s) => s.setNumRanges);
  const setNormalizeEnabled = useAppStore((s) => s.setNormalizeEnabled);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  const setShowRanking = useAppStore((s) => s.setShowRanking);
  const resetScale = useAppStore((s) => s.resetScale);

  const waitForMapTiles = (container, timeoutMs = 5000) =>
    new Promise((resolve) => {
      const start = Date.now();

      const checkLoaded = () => {
        const tiles = [...container.querySelectorAll('.leaflet-tile')];
        const allLoaded = tiles.length > 0 && tiles.every((img) => img.complete && img.naturalWidth > 0);
        const timedOut = Date.now() - start > timeoutMs;

        if (allLoaded || timedOut) {
          resolve();
          return;
        }
        requestAnimationFrame(checkLoaded);
      };

      checkLoaded();
    });

  const handleExportImage = async () => {
    const node = document.getElementById('map-export-target');
    if (!node || isExporting) return;

    try {
      setIsExporting(true);

      // Espera a que los tiles terminen de renderizar para evitar exportaciones borrosas/incompletas.
      await waitForMapTiles(node);

      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = 'mapa-argentina.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exportando imagen:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="control-panel">
      <h2 className="panel-title">Panel de Control</h2>

      {/* --- Carga de datos --- */}
      <section className="panel-section">
        <ExcelUploader />
      </section>

      {/* --- Escala de colores --- */}
      <section className="panel-section">
        <h3>Escala de colores</h3>
        <div className="palette-selector">
          {Object.entries(PALETTE_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`palette-btn ${palette === key ? 'active' : ''}`}
              onClick={() => setPalette(key)}
            >
              <span className="palette-preview">
                {(COLOR_PALETTES[key] || []).slice(0, 4).map((c, i) => (
                  <span key={i} style={{ backgroundColor: c }} />
                ))}
              </span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* --- Método de distribución --- */}
      <section className="panel-section">
        <h3>Distribución</h3>
        <div className="method-selector">
          {Object.entries(METHOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`method-btn ${method === key ? 'active' : ''}`}
              onClick={() => setMethod(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="help-text">
          {method === 'quantile'
            ? 'Divide las provincias en grupos iguales para evitar distorsión por outliers.'
            : method === 'log'
              ? 'Comprime valores grandes, útil con datos con alta dispersión.'
              : 'Distribución proporcional entre mínimo y máximo.'}
        </p>
      </section>

      {/* --- Número de rangos --- */}
      <section className="panel-section">
        <h3>Rangos</h3>
        <div className="range-selector">
          {[3, 5, 7].map((n) => (
            <button
              key={n}
              className={`range-btn ${numRanges === n ? 'active' : ''}`}
              onClick={() => setNumRanges(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* --- Toggles --- */}
      <section className="panel-section">
        <h3>Opciones</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={normalizeEnabled}
            onChange={(e) => setNormalizeEnabled(e.target.checked)}
          />
          Normalizar datos
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Mostrar nombres en mapa
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showRanking}
            onChange={(e) => setShowRanking(e.target.checked)}
          />
          Mostrar ranking
        </label>
      </section>

      {/* --- Acciones extra --- */}
      <section className="panel-section panel-actions">
        <button
          className="btn-action"
          onClick={handleExportImage}
          disabled={!isDataReady || isExporting}
        >
          {isExporting ? 'Exportando...' : '📸 Exportar imagen'}
        </button>
        <button className="btn-action btn-reset" onClick={resetScale}>
          🔄 Resetear escala
        </button>
      </section>
    </div>
  );
}
