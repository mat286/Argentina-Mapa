import { useState } from 'react';
import L from 'leaflet';
import useAppStore from '../state/useAppStore';
import ExcelUploader from './ExcelUploader';
import { COLOR_PALETTES } from '../utils/colorScales';
import { toPng } from 'html-to-image';

// Espera a que los tiles del mapa estén completamente cargados o al timeout.
function waitForMapTiles(container, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();

    const checkLoaded = () => {
      const tiles = [...container.querySelectorAll('.leaflet-tile')];
      const allLoaded =
        tiles.length > 0 && tiles.every((img) => img.complete && img.naturalWidth > 0);
      const timedOut = Date.now() - start > timeoutMs;

      if (allLoaded || timedOut) {
        resolve();
        return;
      }
      requestAnimationFrame(checkLoaded);
    };

    checkLoaded();
  });
}

const PALETTE_LABELS = {
  'celeste-azul': 'Celeste claro → Azul',
  'azul-celeste': 'Azul → Celeste claro',
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
  const setHoveredProvince = useAppStore((s) => s.setHoveredProvince);
  const setIsExportingImage = useAppStore((s) => s.setIsExportingImage);
  const setExportCabaAnchorPoint = useAppStore((s) => s.setExportCabaAnchorPoint);
  const resetScale = useAppStore((s) => s.resetScale);

  const handleExportImage = async () => {
    const node = document.getElementById('map-export-target');
    if (!node || isExporting) return;

    const map = window.currentMapInstance;
    const originalCenter = map?.getCenter();
    const originalZoom = map?.getZoom();
    const originalSize = {
      width: node.style.width,
      height: node.style.height,
      maxWidth: node.style.maxWidth,
      maxHeight: node.style.maxHeight,
    };

    try {
      setIsExporting(true);
      setHoveredProvince(null);
      setExportCabaAnchorPoint(null);
      setIsExportingImage(true);

      // Espera breve para que se monte el overlay exclusivo de exportación.
      await new Promise((r) => setTimeout(r, 100));

      // A4 vertical: 793px × 1123px (a 96 DPI)
      node.style.width = '793px';
      node.style.height = '1123px';
      node.style.maxWidth = '793px';
      node.style.maxHeight = '1123px';

      if (map) {
        map.invalidateSize({ pan: false });

        // Encadre fijo para exportación: Argentina continental en A4 vertical,
        // dejando espacio para el callout de CABA a la derecha.
        const exportBounds = L.latLngBounds([
          [-54.9, -73.4],
          [-21.5, -53.8],
        ]);

        map.fitBounds(exportBounds, {
          paddingTopLeft: [32, 42],
          paddingBottomRight: [220, 210],
          animate: false,
        });

        await new Promise((r) => setTimeout(r, 240));
        map.invalidateSize({ pan: false });
      }

      // Espera a que los tiles terminen de renderizar
      await new Promise((r) => setTimeout(r, 360));
      await waitForMapTiles(node, 7000);

      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = 'mapa-argentina-a4.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exportando imagen:', err);
    } finally {
      // Restaurar tamaño original
      node.style.width = originalSize.width;
      node.style.height = originalSize.height;
      node.style.maxWidth = originalSize.maxWidth;
      node.style.maxHeight = originalSize.maxHeight;

      setIsExportingImage(false);
      setExportCabaAnchorPoint(null);

      // Restaurar vista original del mapa.
      if (map && originalCenter && originalZoom != null) {
        map.setView(originalCenter, originalZoom, { animate: false });
        map.invalidateSize({ pan: false });
      }

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
