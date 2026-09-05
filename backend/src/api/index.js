import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import { mongoClientPromise } from '../database/connection.js';

import logger from '../utils/logger.js';
import { sanitizeMongoInput } from './middleware/sanitize.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import guildRoutes from './routes/guilds.js';
import levelRoutes from './routes/levels.js';
import leaderboardRoutes from './routes/leaderboard.js';
import messageRoutes from './routes/messages.js';
import birthdaysRoutes from './routes/birthdays.js';

class ApiServer {
  constructor(discordClient) {
    this.app = express();
    this.discordClient = discordClient;
    this.setupMiddleware();
    this.setupPassport();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Trust proxy when behind a proxy (Render, etc.)
    if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1') {
      this.app.set('trust proxy', 1);
    }

    // CORS. Sin origin explícito, `cors` responde `*`, que con credentials:true
    // el navegador rechaza: el login fallaría en silencio.
    if (!process.env.FRONTEND_URL) {
      throw new Error('FRONTEND_URL no configurado: CORS con credenciales necesita un origen explícito');
    }
    this.app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true
    }));

    // Helmet - cabeceras de seguridad
    this.app.use(helmet());

    // Body parser
    this.app.use(express.json({ limit: '100kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100kb' }));
    this.app.use(sanitizeMongoInput);

    // Simple request logger
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      next();
    });
    // Session
    const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

    const sessionCookie = {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: SESSION_MAX_AGE_MS
    };

    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET no configurado o demasiado corto (mínimo 32 caracteres)');
    }

    // Sin store persistente express-session cae en MemoryStore, que pierde
    // las sesiones en cada reinicio y crece sin límite. Es un fallo de
    // configuración, no un modo de funcionamiento válido.
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no configurado: la sesión necesita un store persistente');
    }

    const sessionOptions = {
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: sessionCookie,
      store: MongoStore.create({
        // Reutiliza el pool de Mongoose en vez de abrir una segunda conexión.
        // La promesa se resuelve cuando BotApp completa connect().
        clientPromise: mongoClientPromise(),
        collectionName: 'sessions',
        // Alineado con la cookie: con 14 días quedaban documentos huérfanos
        // 13 días después de que la sesión dejara de ser utilizable.
        ttl: SESSION_MAX_AGE_MS / 1000
      })
    };

    this.app.use(session(sessionOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    this.app.use('/api/', limiter);

    // Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }
  setupPassport() {
    // La sesión guarda solo lo que la API necesita. Antes se serializaba el
    // profile completo de Discord: eso dejaba el access token en claro en la
    // colección `sessions` y hacía documentos de decenas de KB en cada request.
    passport.serializeUser((user, done) => {
      done(null, {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        guilds: (user.guilds || []).map(g => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          permissions: String(g.permissions ?? '0')
        }))
      });
    });

    passport.deserializeUser((obj, done) => {
      done(null, obj);
    });

    passport.use(new DiscordStrategy({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.OAUTH_REDIRECT_URI,
      scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
      // El access token no se conserva: ninguna ruta lo usa.
      return done(null, profile);
    }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: this.discordClient && this.discordClient.user ? 'connected' : 'disconnected'
      });
    });

    // Readiness endpoint
    this.app.get('/ready', async (req, res) => {
      try {
        const dbState = mongoose.connection.readyState;
        const dbConnected = dbState === 1;
        const discordReady = this.discordClient && typeof this.discordClient.isReady === 'function' ? 
          this.discordClient.isReady() : 
          (this.discordClient && this.discordClient.user ? true : false);

        const ready = dbConnected && discordReady;
        const statusCode = ready ? 200 : 503;

        return res.status(statusCode).json({
          ready,
          db: {
            readyState: dbState,
            connected: dbConnected
          },
          discord: {
            ready: Boolean(discordReady),
            user: this.discordClient && this.discordClient.user ? this.discordClient.user.tag : null
          },
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        logger.error('Error checking readiness:', e);
        return res.status(500).json({ ready: false, error: String(e) });
      }
    });

    // Pasar el cliente de Discord a las rutas
    this.app.use((req, res, next) => {
      req.discordClient = this.discordClient;
      next();
    });

    // ========== Rutas de la API ==========
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/guilds', guildRoutes);
    this.app.use('/api/guilds', messageRoutes);
    this.app.use('/api/guilds', birthdaysRoutes); // ← RUTA DE CUMPLEAÑOS (debe ir bajo /api/guilds)
    this.app.use('/api/levels', levelRoutes);
    this.app.use('/api/leaderboard', leaderboardRoutes);
    // ====================================

    // Ruta 404
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Ruta no encontrada' });
    });

    // Error handler. Antes respondía 500 a todo: un JSON malformado (400 de
    // body-parser) o un ObjectId inválido en la ruta (CastError) salían como
    // error interno, ocultando que el fallo era del cliente.
    // eslint-disable-next-line no-unused-vars
    this.app.use((err, req, res, next) => {
      let status = Number(err?.status || err?.statusCode) || 500;
      let error = 'Error interno del servidor';

      if (err?.name === 'CastError') {
        status = 400;
        error = 'Identificador inválido';
      } else if (err?.name === 'ValidationError') {
        status = 400;
        error = 'Datos inválidos';
      } else if (err?.code === 11000) {
        status = 409;
        error = 'El recurso ya existe';
      } else if (status >= 400 && status < 500) {
        error = 'Petición inválida';
      }

      try {
        if (status >= 500) {
          logger.error('Error en API:', err?.stack || err);
        } else {
          logger.warn(`Petición rechazada (${status}): ${err?.message || err}`);
        }
      } catch (e) {
        console.error('Error logger fallback:', e);
        console.error(err);
      }

      res.status(status).json({
        error,
        message: process.env.NODE_ENV === 'development' ? err?.message : undefined
      });
    });
  }

  /**
   * Cierra solo el servidor HTTP y espera a que drene. El ciclo de vida del
   * cliente de Discord, de las señales y de Mongoose lo lleva BotApp: tenerlo
   * también aquí provocaba dos apagados simultáneos.
   */
  shutdown() {
    return new Promise((resolve) => {
      if (!this.server) return resolve();

      this.server.close(() => {
        logger.info('Servidor HTTP cerrado');
        resolve();
      });

      // Si alguna conexión no cierra (SSE, keep-alive), no bloqueamos el
      // apagado indefinidamente.
      setTimeout(resolve, 5000).unref();
    });
  }

  start(port) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`API ejecutándose en puerto ${port}`);
        resolve(this.server);
      });
    });
  }
}

export default ApiServer;
