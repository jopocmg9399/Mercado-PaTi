import PocketBase from 'pocketbase';

// En desarrollo usamos localhost, en producción la URL de Render
export const pb = new PocketBase(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8090');
