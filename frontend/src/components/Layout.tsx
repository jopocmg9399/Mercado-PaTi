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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#f0f2f5', padding: '20px', borderRight: '1px solid #ddd' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img 
            src="/logo.jpeg" 
            alt="Mercado PaTi" 
            style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.removeAttribute('style'); // Mostrar texto si falla imagen
            }}
          />
          <h2 style={{ display: 'none', margin: '10px 0', color: '#333' }}>Mercado PaTi</h2>
        </div>

        <div style={{ marginBottom: '20px', fontSize: '0.9em', color: '#666' }}>
          Hola, {user?.email} <br />
          <span style={{ fontSize: '0.8em', background: '#ddd', padding: '2px 5px', borderRadius: '4px' }}>
            {user?.collectionName === '_superusers' ? 'ADMIN' : 'USUARIO'}
          </span>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link to="/" style={linkStyle}>📊 Dashboard</Link>
          <Link to="/shops" style={linkStyle}>🏪 Tiendas</Link>
          <Link to="/products" style={linkStyle}>📦 Productos</Link>
          <Link to="/affiliates" style={linkStyle}>🤝 Afiliados</Link>
          <Link to="/sales" style={linkStyle}>💰 Ventas</Link>
        </nav>

        <button 
          onClick={handleLogout}
          style={{ marginTop: 'auto', width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px', backgroundColor: '#fff' }}>
        <Outlet />
      </main>
    </div>
  );
}

const linkStyle = {
  textDecoration: 'none',
  color: '#444',
  padding: '10px',
  borderRadius: '4px',
  display: 'block',
  transition: 'background 0.2s'
};
