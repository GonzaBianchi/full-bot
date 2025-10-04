# 🤖 Discord Bot con Sistema de Niveles

Bot de Discord completo con sistema de niveles tipo MEE6 y panel de control web.

## ✨ Características

- 🎮 Sistema de niveles y XP por mensajes
- 📊 Dashboard web interactivo con React
- 🏆 Leaderboard en tiempo real
- ⚙️ Panel de configuración completo
- 🎭 Roles automáticos por nivel
- 📈 Multiplicadores de XP personalizables
- 🌐 Multi-servidor
- 💾 Base de datos MongoDB
- 🔐 Autenticación OAuth2 con Discord
- 🚀 Optimizado para Render (sin sleep)

## 📋 Requisitos

- Node.js 18+
- MongoDB Atlas (cuenta gratuita)
- Cuenta de Discord Developer
- Cuenta de Render (para deploy)

## 🛠️ Instalación

### 1. Crear aplicación en Discord

1. Ve a https://discord.com/developers/applications
2. Crea una nueva aplicación
3. En "Bot", crea un bot y copia el token
4. En "OAuth2", añade estas redirect URIs:
   - `http://localhost:3000/api/auth/callback` (desarrollo)
   - `https://tu-backend.onrender.com/api/auth/callback` (producción)
5. Copia el Client ID y Client Secret

### 2. Configurar MongoDB Atlas

1. Crea una cuenta en https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuito
3. Configura un usuario de base de datos
4. Obtén la URI de conexión

### 3. Configurar Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con tus credenciales
npm run dev
```

### 4. Configurar Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con tu API URL
npm run dev
```

## 🚀 Deploy en Render

### Backend (Web Service)

1. Crea un nuevo Web Service en Render
2. Conecta tu repositorio
3. Configuración:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
4. Añade las variables de entorno desde `.env`
5. ¡Deploy!

### Frontend (Static Site)

1. Crea un nuevo Static Site en Render
2. Configuración:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
3. Añade las variables de entorno
4. ¡Deploy!

## 📝 Variables de Entorno

### Backend (.env)

```env
DISCORD_TOKEN=tu_token_de_bot
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
MONGODB_URI=tu_mongodb_uri
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://tu-frontend.onrender.com
SESSION_SECRET=un_secreto_muy_seguro
OAUTH_REDIRECT_URI=https://tu-backend.onrender.com/api/auth/callback
```

### Frontend (.env)

```env
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_DISCORD_CLIENT_ID=tu_client_id
```

## 📚 Comandos del Bot

- `!rank` - Ver tu nivel y XP
- `!rank @usuario` - Ver el nivel de otro usuario

## 🎨 Características del Dashboard

### Página Principal
- Vista de todos tus servidores
- Estadísticas rápidas
- Acceso directo a configuración

### Dashboard del Servidor
- Estadísticas generales
- Gráficos de actividad
- Configuración rápida

### Leaderboard
- Top usuarios del servidor
- Búsqueda de usuarios
- Paginación
- Progreso visual de niveles

### Configuración
- Sistema de niveles on/off
- Multiplicador de XP (0.1x - 10x)
- Rango de XP por mensaje
- Cooldown personalizable
- Mensaje de subida de nivel
- Roles automáticos por nivel
- Canales ignorados

## 🔧 Estructura del Proyecto

```
discord-bot-leveling/
├── backend/
│   ├── src/
│   │   ├── bot/           # Bot de Discord
│   │   ├── api/           # Servidor Express
│   │   ├── models/        # Modelos de MongoDB
│   │   ├── database/      # Conexión a DB
│   │   └── server.js      # Punto de entrada
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/    # Componentes React
    │   ├── pages/         # Páginas
    │   ├── services/      # API calls
    │   └── App.jsx
    └── package.json
```

## 🐛 Solución de Problemas

### El bot no se conecta
- Verifica que el token sea correcto
- Asegúrate de que el bot tenga los intents necesarios

### Error de OAuth
- Verifica las redirect URIs en Discord Developer Portal
- Comprueba que CLIENT_ID y CLIENT_SECRET sean correctos

### El bot se duerme en Render
- El código incluye un sistema de keepalive automático
- Se hace ping cada 14 minutos al endpoint `/health`

### Error de conexión a MongoDB
- Verifica que la IP de Render esté whitelisteada en MongoDB Atlas
- O configura acceso desde cualquier IP (0.0.0.0/0)

## 📖 Próximas Características

- [ ] Comandos de slash (/)
- [ ] Sistema de economía
- [ ] Insignias y logros
- [ ] Tarjetas de rango personalizables
- [ ] Exportar datos
- [ ] Modo mantenimiento
- [ ] Logs de moderación
- [ ] Notificaciones en tiempo real

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👨‍💻 Autor

Desarrollado con ❤️ para la comunidad de Discord

## 🙏 Agradecimientos

- Discord.js
- Express.js
- React
- MongoDB
- Render