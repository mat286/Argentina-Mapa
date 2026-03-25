import ControlPanel from './components/ControlPanel';
import MapArgentina from './components/MapArgentina';
import MapTooltip from './components/Tooltip';
import Legend from './components/Legend';
import RankingTable from './components/RankingTable';
import BicontinentalInset from './components/BicontinentalInset';
import CabaInset from './components/CabaInset';
import ExportCabaOverlay from './components/ExportCabaOverlay';
import useAppStore from './state/useAppStore';
import './App.css';

export default function App() {
  const isExportingImage = useAppStore((s) => s.isExportingImage);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ControlPanel />
        <RankingTable />
      </aside>
      <main
        className={`main-area ${isExportingImage ? 'export-mode' : ''}`}
        id="map-export-target"
      >
        <MapArgentina />
        <Legend />
        <MapTooltip />
        <div className="map-insets">
          {!isExportingImage && <CabaInset />}
          <BicontinentalInset />
        </div>
        <ExportCabaOverlay />
      </main>
    </div>
  );
}
