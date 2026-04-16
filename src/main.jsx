import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

function LandingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0b1020',
        color: '#f3f4f6',
        fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <section>
        <h1 style={{ marginBottom: '8px', fontSize: '2rem' }}>Mapa movido a /mapa</h1>
        <p style={{ opacity: 0.85 }}>
          Abri <a href="/mapa" style={{ color: '#7dd3fc' }}>/mapa</a> para ver el visor.
        </p>
      </section>
    </main>
  );
}

function RootRouter() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/mapa') {
    return <App />;
  }

  return <LandingPage />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>
);
