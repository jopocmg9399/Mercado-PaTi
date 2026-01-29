import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export function Shops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState('');
  const [commission, setCommission] = useState(10);
  const [ownerEmail, setOwnerEmail] = useState(''); // Solo para admins

  const isAdmin = pb.authStore.model?.collectionName === '_superusers';

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const result = await pb.collection('shops').getList(1, 50, {
        expand: 'owner',
        sort: '-created'
      });
      setShops(result.items);
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let ownerId = pb.authStore.model?.id;

      // Si es admin, es OBLIGATORIO asignar un dueño (usuario normal)
      if (isAdmin) {
        if (!ownerEmail) {
          alert("Como Administrador, no puedes ser dueño directo. Debes especificar el email de un usuario registrado.");
          return;
        }

        try {
          // Buscar si el usuario ya existe (sin auto-cancelación)
          const user = await pb.collection('users').getFirstListItem(`email="${ownerEmail}"`, { requestKey: null });
          ownerId = user.id;
        } catch (err) {
          // Si no existe, crearlo automáticamente
          if(confirm(`El usuario ${ownerEmail} no existe. ¿Quieres crearlo automáticamente con contraseña '12345678'?`)) {
            const newUser = await pb.collection('users').create({
              email: ownerEmail,
              password: '12345678',
              passwordConfirm: '12345678',
              emailVisibility: true
            }, { requestKey: null }); // Sin auto-cancelación
            ownerId = newUser.id;
            alert(`Usuario creado: ${ownerEmail} / 12345678`);
          } else {
            return;
          }
        }
      }

      // INTENTO DE DEBUG: Imprimir qué estamos enviando
      console.log("Enviando a PocketBase:", {
        name,
        commission_rate: commission,
        owner: ownerId
      });

      await pb.collection('shops').create({
        name,
        commission_rate: commission,
        owner: ownerId
      }, { requestKey: null });
      
      setName('');
      setOwnerEmail('');
      loadShops(); // Recargar lista
      alert("Tienda creada exitosamente");
    } catch (err: any) {
      console.error(err);
      alert("Error creando tienda: " + (err.data?.message || err.message));
    }
  };

  if (loading) return <p>Cargando tiendas...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Gestión de Tiendas</h1>
      </div>

      {/* Formulario de Creación */}
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Nueva Tienda</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Nombre de la Tienda</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              style={{ padding: '8px', width: '200px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Comisión (%)</label>
            <input 
              type="number" 
              value={commission} 
              onChange={e => setCommission(Number(e.target.value))} 
              required 
              min="0" max="100"
              style={{ padding: '8px', width: '100px' }}
            />
          </div>

          {isAdmin && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Email del Dueño (Opcional)</label>
              <input 
                type="email" 
                value={ownerEmail} 
                onChange={e => setOwnerEmail(e.target.value)} 
                placeholder="Dejar vacío si eres tú"
                style={{ padding: '8px', width: '200px' }}
              />
            </div>
          )}

          <button type="submit" style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Crear Tienda
          </button>
        </form>
      </div>

      {/* Listado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {shops.map(shop => (
          <div key={shop.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>{shop.name}</h3>
            <p><strong>Comisión:</strong> {shop.commission_rate}%</p>
            <p><strong>Dueño:</strong> {shop.expand?.owner?.email || 'N/A'}</p>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button style={{ flex: 1, padding: '5px', cursor: 'pointer' }}>Ver Productos</button>
              <button 
                onClick={async () => {
                  if(confirm('¿Borrar tienda?')) {
                    await pb.collection('shops').delete(shop.id);
                    loadShops();
                  }
                }}
                style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {shops.length === 0 && <p>No hay tiendas registradas.</p>}
      </div>
    </div>
  );
}
