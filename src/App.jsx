import ControlPanel from './components/ControlPanel';
import MapArgentina from './components/MapArgentina';
import MapTooltip from './components/Tooltip';
import Legend from './components/Legend';
import RankingTable from './components/RankingTable';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <ControlPanel />
        <RankingTable />
      </aside>
      <main className="main-area" id="map-export-target">
        <MapArgentina />
        <Legend />
        <MapTooltip />
      </main>
    </div>
  );
}
