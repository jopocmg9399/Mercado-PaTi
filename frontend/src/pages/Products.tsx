import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

interface GroupPrice {
  name: string;      // Envase (Caja, Saco, Pallet)
  units: number;     // Unidades por envase (24)
  unit_price: number;// Precio unitario (260)
  min_qty: number;   // Cantidad mínima de envases (1, 5, 100)
}

interface Product {
  id: string;
  name: string;
  price: number; // Precio base (referencial o por unidad suelta)
  group_prices: GroupPrice[]; // JSON field array
  image: string; // Filename
  shop: string;
  collectionId: string;
  collectionName: string;
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
  const [groupPrices, setGroupPrices] = useState<GroupPrice[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    setGroupPrices([...groupPrices, { name: 'Caja', units: 1, unit_price: 0, min_qty: 1 }]);
  };

  const handleGroupPriceChange = (index: number, field: keyof GroupPrice, value: string | number) => {
    const newGroups = [...groupPrices];
    // @ts-ignore
    newGroups[index][field] = value;
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

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', basePrice.toString());
    formData.append('shop', selectedShopId);
    formData.append('group_prices', JSON.stringify(groupPrices));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      await pb.collection('products').create(formData);
      
      // Reset form
      setName('');
      setBasePrice(0);
      setGroupPrices([]);
      setImageFile(null);
      
      // Reload list
      loadProducts(selectedShopId);
      alert("Producto creado exitosamente");
    } catch (err: any) {
      console.error(err);
      alert("Error creando producto: " + (err.data?.message || err.message));
    }
  };

  const calculateTotal = (g: GroupPrice) => {
    return (g.units * g.unit_price * g.min_qty).toFixed(2);
  };

  const getImageUrl = (product: Product) => {
    if (!product.image) return 'https://via.placeholder.com/150?text=No+Image';
    return pb.files.getUrl(product, product.image);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestión de Productos</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Seleccionar Tienda: </label>
        <select 
          value={selectedShopId} 
          onChange={(e) => setSelectedShopId(e.target.value)}
          style={{ padding: '8px', marginLeft: '10px' }}
        >
          {shops.map(shop => (
            <option key={shop.id} value={shop.id}>{shop.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Formulario de Creación */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', height: 'fit-content' }}>
          <h3>Nuevo Producto</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Nombre del Producto</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Precio Base (Unitario/Referencia)</label>
              <input 
                type="number" 
                value={basePrice} 
                onChange={e => setBasePrice(Number(e.target.value))} 
                style={{ width: '100%', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Imagen del Producto</label>
              <input 
                type="file" 
                onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
                accept="image/*"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Agrupaciones de Precios</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {groupPrices.map((group, index) => (
                  <div key={index} style={{ background: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '10px', border: '1px solid #ddd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>Opción #{index + 1}</strong>
                      <button type="button" onClick={() => handleRemoveGroupPrice(index)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none' }}>X</button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                      <div>
                        <label style={{ fontSize: '12px' }}>Envase (Nombre)</label>
                        <input 
                          type="text" 
                          value={group.name} 
                          onChange={e => handleGroupPriceChange(index, 'name', e.target.value)}
                          placeholder="Ej: Caja, Pallet"
                          style={{ width: '100%', padding: '5px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px' }}>Unidades/Envase</label>
                        <input 
                          type="number" 
                          value={group.units} 
                          onChange={e => handleGroupPriceChange(index, 'units', Number(e.target.value))}
                          style={{ width: '100%', padding: '5px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <div>
                        <label style={{ fontSize: '12px' }}>Precio Unitario</label>
                        <input 
                          type="number" 
                          value={group.unit_price} 
                          onChange={e => handleGroupPriceChange(index, 'unit_price', Number(e.target.value))}
                          style={{ width: '100%', padding: '5px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px' }}>Min. Envases</label>
                        <input 
                          type="number" 
                          value={group.min_qty} 
                          onChange={e => handleGroupPriceChange(index, 'min_qty', Number(e.target.value))}
                          style={{ width: '100%', padding: '5px' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                      Total: {group.min_qty} {group.name}(s) = ${calculateTotal(group)}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                onClick={handleAddGroupPrice}
                style={{ width: '100%', padding: '8px', background: '#e9ecef', border: '1px dashed #ced4da', cursor: 'pointer' }}
              >
                + Añadir Agrupación
              </button>
            </div>

            <button 
              type="submit" 
              style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Crear Producto
            </button>
          </form>
        </div>

        {/* Lista de Productos */}
        <div>
          <h3>Inventario</h3>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {products.map(product => (
                <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                  <img 
                    src={getImageUrl(product)} 
                    alt={product.name} 
                    style={{ width: '100%', height: '150px', objectFit: 'cover', background: '#eee' }}
                  />
                  <div style={{ padding: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>{product.name}</h4>
                    <p style={{ margin: '0 0 10px 0', color: '#666' }}>Precio Base: ${product.price}</p>
                    
                    {product.group_prices && product.group_prices.length > 0 && (
                      <div style={{ fontSize: '12px' }}>
                        <strong>Precios por Volumen:</strong>
                        <table style={{ width: '100%', marginTop: '5px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
                              <th style={{ padding: '3px' }}>Envase</th>
                              <th style={{ padding: '3px' }}>Min</th>
                              <th style={{ padding: '3px' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.group_prices.map((g, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '3px' }}>{g.name} ({g.units}u)</td>
                                <td style={{ padding: '3px' }}>{g.min_qty}</td>
                                <td style={{ padding: '3px' }}>${calculateTotal(g)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
