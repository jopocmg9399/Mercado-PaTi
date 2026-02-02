import { useState, useEffect } from 'react';
import { pb } from './lib/pocketbase';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Componente simple de Login
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pb.collection('users').authWithPassword(email, password);
      window.location.reload(); // Recargar para actualizar estado de auth
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Iniciar Sesión</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

// Dashboard de Tienda (Ejemplo)
function ShopDashboard() {
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    pb.collection('shops').getList(1, 50, {
      filter: `owner = "${pb.authStore.model?.id}"`
    }).then(res => setShops(res.items));
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Mis Tiendas</h1>
      <ul>
        {shops.map(shop => (
          <li key={shop.id}>
            {shop.name} - Comisión Plataforma: {shop.commission_rate}%
          </li>
        ))}
      </ul>
      <button onClick={() => { pb.authStore.clear(); window.location.reload(); }}>Cerrar Sesión</button>
    </div>
  );
}

function App() {
  const [isValid] = useState(pb.authStore.isValid);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isValid ? <ShopDashboard /> : <Login />} />
        {/* Aquí irían más rutas como /affiliates, /products, etc. */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
