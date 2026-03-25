import useAppStore from '../state/useAppStore';
import CabaInset from './CabaInset';

const EXPORT_WIDTH = 793;
const EXPORT_HEIGHT = 1123;

const BOX = {
  left: 540,
  top: 455,
  width: 225,
  height: 205,
};

export default function ExportCabaOverlay() {
  const isExportingImage = useAppStore((s) => s.isExportingImage);
  const anchor = useAppStore((s) => s.exportCabaAnchorPoint);

  if (!isExportingImage || !anchor) return null;

  const startX = Math.max(0, Math.min(EXPORT_WIDTH, anchor.x));
  const startY = Math.max(0, Math.min(EXPORT_HEIGHT, anchor.y));
  const endX = BOX.left;
  const endY = BOX.top + BOX.height / 2;
  const midX = startX + (endX - startX) * 0.56;
  const midY = startY + (endY - startY) * 0.72;

  return (
    <div className="export-caba-overlay" aria-hidden="true">
      <svg className="export-caba-connector" viewBox={`0 0 ${EXPORT_WIDTH} ${EXPORT_HEIGHT}`}>
        <polyline
          className="export-caba-path"
          points={`${startX},${startY} ${midX},${midY} ${endX},${endY}`}
        />
      </svg>

      <div
        className="export-caba-box"
        style={{
          left: `${BOX.left}px`,
          top: `${BOX.top}px`,
          width: `${BOX.width}px`,
          height: `${BOX.height}px`,
        }}
      >
        <CabaInset variant="export" className="caba-inset--export-callout" />
      </div>
    </div>
  );
}
