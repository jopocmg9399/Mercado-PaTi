import { useState, useEffect } from 'react';
import { pb } from './lib/pocketbase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Shops } from './pages/Shops';
import { Products } from './pages/Products';
import { Affiliates, Sales } from './pages/Placeholders';

// Componente simple de Login
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Intentar autenticación contra la colección de superusuarios (Admins)
      try {
        await pb.collection('_superusers').authWithPassword(email, password);
      } catch (adminErr) {
        console.log("No es admin, intentando usuario normal...");
        // Si falla, intentar como usuario normal
        await pb.collection('users').authWithPassword(email, password);
      }
      window.location.reload(); // Recargar para actualizar estado de auth
    } catch (err: any) {
      console.error("Error login:", err);
      const msg = err?.data?.message || err?.message || JSON.stringify(err);
      setError(`Error: ${msg}`);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-beige)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo.jpeg" alt="Logo" style={{ maxHeight: '80px', marginBottom: '10px', borderRadius: '4px' }} onError={(e) => e.currentTarget.style.display='none'} />
          <h2 style={{ color: 'var(--color-marron)' }}>Mercado PaTi</h2>
        </div>
        
        {error && <div style={{ color: 'white', background: '#ff4444', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '16px' }}>Entrar</button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [isValid, setIsValid] = useState(pb.authStore.isValid);

  return (
    <BrowserRouter>
      <Routes>
        {!isValid ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/products" element={<Products />} />
            <Route path="/affiliates" element={<Affiliates />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
