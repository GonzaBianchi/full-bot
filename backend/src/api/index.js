import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';

import logger from '../utils/logger.js';

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

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true
    }));

    // Helmet - cabeceras de seguridad
    this.app.use(helmet());

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

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
    const sessionCookie = {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    };

    const sessionOptions = {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: sessionCookie
    };

    if (process.env.MONGODB_URI) {
      sessionOptions.store = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60
      });
    }

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
    passport.serializeUser((user, done) => {
      done(null, user);
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
      profile.accessToken = accessToken;
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

    // Error handler
    this.app.use((err, req, res, next) => {
      try {
        logger.error('❌ Error en API:', err && err.stack ? err.stack : err);
      } catch (e) {
        console.error('Error logger fallback:', e);
        console.error(err);
      }

      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? (err && err.message) : undefined
      });
    });
  }

  async shutdown() {
    logger.info('Iniciando shutdown...');
    try {
      if (this.server) {
        this.server.close(() => {
          logger.info('Servidor HTTP cerrado');
        });
      }

      if (this.discordClient && typeof this.discordClient.destroy === 'function') {
        try {
          await this.discordClient.destroy();
          logger.info('Cliente de Discord desconectado');
        } catch (e) {
          logger.warn('Error cerrando cliente de Discord:', e);
        }
      }
    } catch (e) {
      logger.error('Error durante shutdown:', e);
    } finally {
      setTimeout(() => process.exit(0), 500);
    }
  }

  start(port) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`🚀 API ejecutándose en puerto ${port}`);
        
        process.on('SIGINT', () => {
          logger.info('SIGINT recibido, cerrando...');
          this.shutdown();
        });
        
        process.on('SIGTERM', () => {
          logger.info('SIGTERM recibido, cerrando...');
          this.shutdown();
        });

        resolve(this.server);
      });
    });
  }
}

export default ApiServer;