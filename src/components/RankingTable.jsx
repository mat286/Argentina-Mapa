import useMapData from '../hooks/useMapData';
import useAppStore from '../state/useAppStore';
import { formatNumber } from '../utils/colorScales';

export default function RankingTable() {
  const showRanking = useAppStore((s) => s.showRanking);
  const { ranking, isDataReady } = useMapData();

  if (!showRanking || !isDataReady || ranking.length === 0) return null;

  return (
    <div className="ranking-table">
      <h3>Ranking</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Provincia</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((item) => (
            <tr key={item.provinceName}>
              <td className="rank-num">{item.rank}</td>
              <td className="rank-name">{item.provinceName}</td>
              <td className="rank-value">{formatNumber(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
