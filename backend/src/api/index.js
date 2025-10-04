import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import logger from '../utils/logger.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import guildRoutes from './routes/guilds.js';
import levelRoutes from './routes/levels.js';
import leaderboardRoutes from './routes/leaderboard.js';

class ApiServer {
  constructor(discordClient) {
    this.app = express();
    this.discordClient = discordClient;
    this.setupMiddleware();
    this.setupPassport();
    this.setupRoutes();
  }

  setupMiddleware() {
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

    // Simple request logger (no deps)
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Security headers (alternativa ligera a helmet)
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      next();
    });

    // Session
    this.app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100 // límite de 100 requests por ventana
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
    // Health check para mantener Render activo
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: this.discordClient && this.discordClient.user ? 'connected' : 'disconnected'
      });
    });

    // Pasar el cliente de Discord a las rutas
    this.app.use((req, res, next) => {
      req.discordClient = this.discordClient;
      next();
    });

    // Rutas de la API
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/guilds', guildRoutes);
    this.app.use('/api/levels', levelRoutes);
    this.app.use('/api/leaderboard', leaderboardRoutes);

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
      // esperar un instante para que se cierren conexiones
      setTimeout(() => process.exit(0), 500);
    }
  }

  start(port) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        logger.info(`🚀 API ejecutándose en puerto ${port}`);
        // Manejo de señales para graceful shutdown
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