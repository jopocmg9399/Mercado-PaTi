import { Link, Outlet, useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

export function Layout() {
  const navigate = useNavigate();
  const user = pb.authStore.model;

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: '250px',
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-on-dark)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img 
            src="/logo.jpeg" 
            alt="Mercado PaTi" 
            style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', borderRadius: '4px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.removeAttribute('style');
            }}
          />
          <h2 style={{ display: 'none', color: 'var(--color-dorado)', margin: 0 }}>Mercado PaTi</h2>
          </div>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
          <li style={{ marginBottom: '15px' }}>
            <Link to="/" style={{ color: 'var(--color-dorado)', textDecoration: 'none', fontSize: '1.1em', fontWeight: 'bold' }}>Dashboard</Link>
          </li>
          <li style={{ marginBottom: '15px' }}>
            <Link to="/shops" style={{ color: 'white', textDecoration: 'none' }}>🏪 Tiendas</Link>
          </li>
          <li style={{ marginBottom: '15px' }}>
            <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>📦 Productos y Precios</Link>
          </li>
          <li style={{ marginBottom: '15px' }}>
            <Link to="/affiliates" style={{ color: 'white', textDecoration: 'none' }}>🤝 Afiliados</Link>
          </li>
          <li style={{ marginBottom: '15px' }}>
            <Link to="/sales" style={{ color: 'white', textDecoration: 'none' }}>💰 Ventas</Link>
          </li>
        </ul>

        <button 
          onClick={handleLogout}
          className="btn"
          style={{
            backgroundColor: 'var(--color-dorado)',
            color: 'var(--color-marron-oscuro)',
            marginTop: 'auto'
          }}
        >
          Cerrar Sesión
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', backgroundColor: 'var(--bg-main)' }}>
        <Outlet />
      </main>
    </div>
  );
}
