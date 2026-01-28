# Plataforma de Tiendas y Afiliados

Esta es una plataforma completa de alojamiento de tiendas con sistema de afiliados, construida con PocketBase (Backend) y React (Frontend).

## Estructura del Proyecto

- `/backend`: Código del servidor en Go (PocketBase). Incluye lógica de comisiones.
- `/frontend`: Aplicación web en React + TypeScript.
- `pb_schema_full.json`: Esquema de base de datos para importar en PocketBase.

## 🚀 Cómo Desplegar

### 1. Subir a GitHub
1. Crea un nuevo repositorio en [GitHub](https://github.com/new).
2. Ejecuta estos comandos en tu terminal (reemplaza `TU_USUARIO` y `TU_REPO`):
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git branch -M main
   git push -u origin main
   ```

### 2. Desplegar Backend (Render)
1. Ve a [Render Dashboard](https://dashboard.render.com/).
2. Crea un nuevo **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Render detectará el `Dockerfile` en la carpeta `backend`.
   - **Root Directory**: `backend` (Importante: configura esto en los ajustes).
   - **Environment**: Docker.
5. Añade un **Disk** (Disco) para persistir la base de datos:
   - Mount Path: `/pb_data`
   - Size: 1GB (o lo que necesites).

### 3. Configurar Base de Datos
1. Una vez desplegado el backend, abre la URL de tu servicio (ej: `https://tu-app.onrender.com/_/`).
2. Crea tu cuenta de administrador.
3. Ve a **Settings > Import collections**.
4. Copia el contenido del archivo `pb_schema_full.json` de este proyecto y pégalo allí.
5. ¡Listo! Tus tablas (shops, products, affiliates, etc.) están creadas.

### 4. Desplegar Frontend (Render)
1. Crea un nuevo **Static Site** en Render.
2. Conecta el mismo repositorio.
3. Configuración:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Root Directory**: `frontend`
4. **Variables de Entorno**:
   - Añade una variable llamada `VITE_API_URL` con el valor de la URL de tu backend (ej: `https://tu-backend.onrender.com`).

## Desarrollo Local

Si logras configurar Go y Node.js en tu máquina:

1. **Backend**:
   ```bash
   cd backend
   go run main.go serve
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
