import bicontinentalImg from '../data/situación relativa bicontinental.jpg';

export default function BicontinentalInset() {
  return (
    <div className="bicontinental-inset">
      <div className="inset-label">
        Argentina Bicontinental<br />Fuente: IGN
      </div>
      <div className="inset-map-wrapper">
        <img
          src={bicontinentalImg}
          alt="Argentina Bicontinental - Situación Relativa - Fuente: Instituto Geográfico Nacional"
          className="bicontinental-img"
        />
      </div>
    </div>
  );
}
