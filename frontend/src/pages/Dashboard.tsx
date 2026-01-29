import { useState } from 'react';
import { pb } from '../lib/pocketbase';

export function Dashboard() {
  const [status, setStatus] = useState('');

  const checkSystem = async () => {
    setStatus('Verificando sistema...');
    try {
      // Intentar listar colecciones críticas
      await pb.collection('shops').getList(1, 1);
      setStatus('✅ Sistema operativo. Colecciones correctas.');
    } catch (err: any) {
      console.error(err);
      if (err.status === 404) {
        setStatus('⚠️ Error: Colecciones no encontradas. Intentando reparar...');
        // Intentar llamar al endpoint de reparación
        try {
            const res = await fetch(pb.baseUrl + '/api/fix-schema');
            const text = await res.text();
            setStatus(`🛠️ Resultado reparación: ${text}`);
        } catch (fixErr) {
            setStatus('❌ Error intentando reparar. Contacta soporte.');
        }
      } else {
        setStatus(`❌ Error: ${err.message}`);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--color-marron)' }}>Bienvenido al Panel de Control</h1>
        <button onClick={checkSystem} className="btn btn-secondary" style={{ fontSize: '0.9em' }}>
          🔍 Verificar Sistema
        </button>
      </div>
      
      {status && (
        <div style={{ 
          padding: '15px', 
          margin: '20px 0', 
          borderRadius: '4px', 
          backgroundColor: status.includes('✅') ? '#d4edda' : '#f8d7da',
          color: status.includes('✅') ? '#155724' : '#721c24',
          border: '1px solid currentColor'
        }}>
          {status}
        </div>
      )}

      <p>Selecciona una opción del menú para comenzar a gestionar tu plataforma.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tiendas Activas</h3>
          <p style={{ fontSize: '2em', margin: '10px 0', color: 'var(--color-dorado)' }}>--</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Ventas del Mes</h3>
          <p style={{ fontSize: '2em', margin: '10px 0', color: 'var(--color-dorado)' }}>$0.00</p>
        </div>
      </div>
    </div>
  );
}
