import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

interface Product {
  id: string;
  name: string;
  price: number;
  group_prices: Record<string, number>; // JSON field
  shop: string;
}

interface Shop {
  id: string;
  name: string;
}

export function Products() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [groupPrices, setGroupPrices] = useState<{name: string, price: number}[]>([]);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadProducts(selectedShopId);
    } else {
      setProducts([]);
    }
  }, [selectedShopId]);

  const loadShops = async () => {
    try {
      const result = await pb.collection('shops').getList(1, 50);
      setShops(result.items.map((i: any) => ({ id: i.id, name: i.name })));
      if (result.items.length > 0) {
        setSelectedShopId(result.items[0].id);
      }
    } catch (err) {
      console.error("Error cargando tiendas:", err);
    }
  };

  const loadProducts = async (shopId: string) => {
    setLoading(true);
    try {
      const result = await pb.collection('products').getList(1, 50, {
        filter: `shop="${shopId}"`,
        sort: '-created'
      });
      setProducts(result.items as unknown as Product[]);
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroupPrice = () => {
    setGroupPrices([...groupPrices, { name: '', price: 0 }]);
  };

  const handleGroupPriceChange = (index: number, field: 'name' | 'price', value: string | number) => {
    const newGroups = [...groupPrices];
    if (field === 'name') newGroups[index].name = value as string;
    else newGroups[index].price = Number(value);
    setGroupPrices(newGroups);
  };

  const handleRemoveGroupPrice = (index: number) => {
    const newGroups = [...groupPrices];
    newGroups.splice(index, 1);
    setGroupPrices(newGroups);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) return alert("Selecciona una tienda primero");

    // Convert array to object for JSON storage
    const groupPricesObj: Record<string, number> = {};
    groupPrices.forEach(g => {
      if (g.name) groupPricesObj[g.name] = g.price;
    });

    try {
      await pb.collection('products').create({
        name,
        price: basePrice,
        group_prices: groupPricesObj,
        shop: selectedShopId
      });

      setName('');
      setBasePrice(0);
      setGroupPrices([]);
      loadProducts(selectedShopId);
      alert("Producto creado exitosamente");
    } catch (err: any) {
      console.error(err);
      alert("Error creando producto: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este producto?")) return;
    try {
      await pb.collection('products').delete(id);
      loadProducts(selectedShopId);
    } catch (err) {
      alert("Error borrando");
    }
  };

  return (
    <div>
      <h1 style={{ color: 'var(--color-marron)', borderBottom: '2px solid var(--color-dorado)', paddingBottom: '10px' }}>📦 Gestión de Productos</h1>

      {/* Selector de Tienda */}
      <div style={{ margin: '20px 0' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Seleccionar Tienda:</label>
        <select 
          value={selectedShopId} 
          onChange={(e) => setSelectedShopId(e.target.value)}
          style={{ padding: '10px', minWidth: '200px' }}
        >
          {shops.map(shop => (
            <option key={shop.id} value={shop.id}>{shop.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        
        {/* Formulario de Creación */}
        <div className="card">
          <h3 style={{ color: 'var(--color-carmelita)', marginTop: 0 }}>Nuevo Producto</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nombre del Producto</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                style={{ width: '100%' }}
                placeholder="Ej. Camiseta Premium"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Precio Base ($)</label>
              <input 
                type="number" 
                value={basePrice} 
                onChange={e => setBasePrice(Number(e.target.value))} 
                required 
                min="0"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Precios por Agrupaciones (Opcional)</label>
              
              {groupPrices.map((group, index) => (
                <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                  <input 
                    type="text" 
                    placeholder="Nombre Grupo (ej. VIP)" 
                    value={group.name}
                    onChange={(e) => handleGroupPriceChange(index, 'name', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="number" 
                    placeholder="Precio" 
                    value={group.price}
                    onChange={(e) => handleGroupPriceChange(index, 'price', e.target.value)}
                    style={{ width: '80px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveGroupPrice(index)}
                    style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    X
                  </button>
                </div>
              ))}

              <button 
                type="button" 
                onClick={handleAddGroupPrice}
                style={{ 
                  background: 'none', 
                  border: '1px dashed var(--color-carmelita)', 
                  color: 'var(--color-carmelita)', 
                  width: '100%', 
                  padding: '5px',
                  marginTop: '5px',
                  cursor: 'pointer'
                }}
              >
                + Añadir Grupo de Precio
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Crear Producto
            </button>
          </form>
        </div>

        {/* Lista de Productos */}
        <div>
          {loading ? (
            <p>Cargando productos...</p>
          ) : products.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#666' }}>
              No hay productos en esta tienda. ¡Crea el primero!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {products.map(product => (
                <div key={product.id} className="card" style={{ position: 'relative' }}>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px', 
                      background: 'none', 
                      border: 'none', 
                      color: '#999', 
                      cursor: 'pointer',
                      fontSize: '1.2em'
                    }}
                    title="Eliminar"
                  >
                    &times;
                  </button>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-marron)' }}>{product.name}</h4>
                  <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--color-dorado)', marginBottom: '10px' }}>
                    ${product.price}
                  </div>
                  
                  {product.group_prices && Object.keys(product.group_prices).length > 0 && (
                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '0.9em' }}>
                      <strong style={{ display: 'block', marginBottom: '5px', color: '#666' }}>Precios Especiales:</strong>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
                        {Object.entries(product.group_prices).map(([group, price]) => (
                          <li key={group}>
                            {group}: <strong>${price}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}