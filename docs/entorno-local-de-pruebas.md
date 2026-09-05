# Entorno de pruebas local con una base de datos real

> Escrito el 2026-09-05. Es un documento **para decidir**, no una guía ya aplicada:
> nada de esto está implementado todavía en el repo.

## Contexto

Producción hoy:

| Pieza | Dónde | Plan |
|---|---|---|
| Base de datos | MongoDB Atlas | cluster gratuito (M0, 512 MB) |
| Backend (bot + API) | Render | plan gratuito (se duerme, de ahí `/health` y `/ready`) |
| Frontend | Vercel | plan gratuito |

Probar contra esa base significa ensuciar datos reales, gastar los 512 MB y comerse la
latencia de Atlas en cada iteración. La idea es tener una base **real** (MongoDB de verdad,
no un mock) corriendo local.

## Hallazgos del código que condicionan la decisión

Verificado sobre el estado actual del repo, importa porque descarta trabajo innecesario:

- **No se usan transacciones ni change streams** (no hay `startSession` ni `withTransaction`
  en `backend/src/`). → **No hace falta levantar un replica set**, un `mongod` standalone alcanza.
- **Se necesita MongoDB ≥ 5.0**: `$setWindowFields` en la búsqueda del leaderboard
  (`services/leaderboardService.js`) y updates con pipeline en el toggle de logros.
- `database/connection.js` activa `autoIndex` cuando `NODE_ENV !== 'production'` → los índices
  se crean solos en la base local, no hay que migrar nada a mano.
- `api/index.js` define la cookie de sesión como `secure: NODE_ENV === 'production'` y
  `sameSite: 'none' | 'lax'`. → En local **`NODE_ENV` tiene que ser `development`**, si no el
  login por OAuth falla en silencio sobre `http://localhost`.
- `.env` está gitignoreado en backend y frontend (verificado con `git check-ignore`). ✔
- ⚠️ `backend/.gitignore` ignora `scripts/` entero. Si algún día se escribe un `scripts/seed.js`,
  **no se va a versionar** salvo que se cambie esa regla a algo más fino
  (p. ej. ignorar `scripts/*.local.js` en vez de la carpeta completa).

## Opción A — MongoDB local en Docker (recomendada)

Docker Desktop ya está instalado en la máquina, así que es una línea:

```powershell
docker run -d --name mongo-fullbot -p 27017:27017 -v fullbot-mongo:/data/db mongo:7
```

- `-v fullbot-mongo:/data/db` → volumen nombrado, los datos sobreviven a `docker rm`.
- Sin autenticación: el puerto queda solo en loopback, es una base descartable.
- Manejo diario: `docker start mongo-fullbot` / `docker stop mongo-fullbot`.
- Inspección: `mongosh mongodb://127.0.0.1:27017/discord-bot-leveling` (mongosh ya está instalado).

**A favor:** rápido (sin red), aislado de prod, se puede borrar y recrear a voluntad, permite
probar migraciones destructivas sin miedo.
**En contra:** hay que acordarse de levantar el contenedor; no reproduce límites ni latencia
de Atlas.

## Opción B — Segunda base dentro del mismo cluster de Atlas

Un cluster M0 admite varias *bases de datos*. Alcanza con cambiar el nombre al final de la URI:
`.../discord-bot-dev` en vez de `.../<prod>`.

**A favor:** cero setup, cero mantenimiento, mismo motor y misma versión que producción.
**En contra:** comparte los 512 MB y las conexiones del free tier con prod, latencia de red en
cada consulta, y un `drop` mal apuntado toca el mismo cluster que producción.

Sirve como plan B o para una prueba puntual. Para iterar todos los días, la A gana.

## Opción C — `mongodb-memory-server` (complementaria, no alternativa)

Para **tests automatizados** de integración: levanta un `mongod` efímero en memoria por corrida.
Hoy los tests (`backend/tests/`, vitest) corren sin base ni Discord, y está bien que así sea.
Esto tendría sentido más adelante, si se quieren testear los servicios y las rutas contra Mongo
de verdad. No reemplaza a A/B para desarrollo manual.

## Configuración del backend (`.env`)

El `.env` actual tiene variables de prod mezcladas (`KEEP_ALIVE_URL`, `OLD_MONGODB_URI`).
Regla sana: **las variables de producción viven solo en el dashboard de Render**, y el `.env`
del repo es el de desarrollo. Guardar el actual como `.env.prod.bak` y dejar:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/discord-bot-leveling
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
TRUST_PROXY=
PORT=3000
```

Frontend: `VITE_API_URL=http://localhost:3000` (o vacío, para usar el proxy de `vite.config.js`).

## Bot de Discord de desarrollo (obligatorio en cualquier opción)

**No reutilizar el `DISCORD_TOKEN` de producción.** Dos procesos conectados al gateway con el
mismo token producen respuestas duplicadas y desconexiones cruzadas.

1. Crear una segunda aplicación en el portal de Discord ("Full Bot Dev"), con su propio bot.
2. Invitarla a un servidor de pruebas propio.
3. Agregar `http://localhost:3000/api/auth/callback` a los **Redirects** del OAuth2 de esa app.
4. En el `.env` local:

```ini
DISCORD_TOKEN=<token del bot de dev>
DISCORD_CLIENT_ID=<client id del bot de dev>
DISCORD_CLIENT_SECRET=<secret del bot de dev>
OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
DEV_GUILD_ID=<id del servidor de pruebas>
```

`DEV_GUILD_ID` registra los slash commands por guild: aparecen al instante en lugar de esperar
la propagación global.

## Con qué datos probar

### Opción 1 — Copia de producción

Sirve para reproducir un bug real:

```powershell
docker exec mongo-fullbot mongodump --uri="<URI_DE_ATLAS>" --archive=/tmp/prod.gz --gzip
docker exec mongo-fullbot mongorestore --archive=/tmp/prod.gz --gzip --drop `
  --nsFrom="<db_prod>.*" --nsTo="discord-bot-leveling.*"
```

(Si la imagen no trae `mongodump`, instalar las *MongoDB Database Tools* y correr lo mismo
apuntando a `mongodb://127.0.0.1:27017`.)

Dos advertencias: el dump trae IDs reales de usuarios, y los `guildId` son los del servidor de
producción — con el servidor de pruebas no coinciden, así que el panel muestra datos que el bot
de dev no puede tocar.

### Opción 2 — Seed sintético (lo mejor para el día a día)

Un `scripts/seed.js` con `npm run seed` y flag `--reset` que cree:

- un `Guild` con la config completa (level roles, autoRoles, mediaFilter, cumpleaños);
- ~50 `User` con XP y niveles repartidos, para ejercitar paginación y el `$setWindowFields`
  de la búsqueda del leaderboard;
- un par de `Achievement` + `UserAchievement`;
- un `RoleMenu` publicado y otro sin publicar;

todo con `guildId` = el servidor de pruebas, para que bot y panel operen sobre lo mismo.
Recordar el detalle del `.gitignore` de `scripts/` mencionado arriba.

## Checklist de arranque, una vez decidido

1. `docker start mongo-fullbot`
2. `cd backend && npm run dev`
3. `cd frontend && npm run dev`
4. Entrar a `http://localhost:5173`, loguearse con Discord (app de dev).
5. Mandar mensajes en el servidor de pruebas y ver subir el XP.

## Qué queda por decidir

- [ ] ¿Opción A (Docker) u opción B (segunda base en Atlas)?
- [ ] ¿Copia de producción, seed sintético, o ambos?
- [ ] ¿Se crea el `docker-compose.yml` o alcanza con el `docker run` suelto?
- [ ] ¿Se ajusta `backend/.gitignore` para poder versionar `scripts/seed.js`?
- [ ] ¿Vale la pena `mongodb-memory-server` para tests de integración más adelante?
