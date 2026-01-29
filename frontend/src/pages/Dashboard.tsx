export function Dashboard() {
  return (
    <div>
      <h1>Bienvenido al Panel de Control</h1>
      <p>Selecciona una opción del menú para comenzar a gestionar tu plataforma.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div style={cardStyle}>
          <h3>Tiendas Activas</h3>
          <p style={{ fontSize: '2em', margin: '10px 0' }}>--</p>
        </div>
        <div style={cardStyle}>
          <h3>Ventas del Mes</h3>
          <p style={{ fontSize: '2em', margin: '10px 0' }}>$0.00</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  border: '1px solid #ddd',
  padding: '20px',
  borderRadius: '8px',
  backgroundColor: '#f9f9f9'
};
