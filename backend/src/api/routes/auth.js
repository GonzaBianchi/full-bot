import express from 'express';
import passport from 'passport';
import logger from '../../utils/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Simple rate limiter for auth endpoints to avoid hitting Discord token endpoint too often
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6, // max 6 requests per minute per IP (adjust as needed)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes de autenticación. Intenta de nuevo en un minuto.'
});

// Ruta de login con Discord (acepta ?redirect=/guild/123)
router.get('/login', authLimiter, (req, res, next) => {
  const redirect = req.query.redirect;
  if (redirect && typeof redirect === 'string') {
    // Use state to carry the redirect path (Discord will return it)
    return passport.authenticate('discord', { state: redirect })(req, res, next);
  }
  return passport.authenticate('discord')(req, res, next);
});

// Callback de Discord OAuth
router.get('/callback', authLimiter, (req, res, next) => {
  // Log incoming query for debugging (avoid logging sensitive tokens)
  try {
    logger.info('OAuth callback query:', { ...req.query });
  } catch (e) { /* ignore */ }

  // Custom callback so we can log detailed errors from the OAuth exchange
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      // Passport wraps OAuth failures in InternalOAuthError; log the original error if present
      logger.error('OAuth callback error (stack):', err && err.stack ? err.stack : err);
      if (err.oauthError) {
        try {
          logger.error('OAuth oauthError.statusCode:', err.oauthError.statusCode);
          logger.error('OAuth oauthError.data:', String(err.oauthError.data));
          if (err.oauthError.headers) {
            try { logger.error('OAuth oauthError.headers:', err.oauthError.headers); } catch (h) { logger.error('Error logging oauthError.headers', h); }
          }
        } catch (inner) {
          logger.error('Error logging oauthError details:', inner);
        }
      }

      // Try to include some helpful query flags when redirecting back to frontend
      const frontend = (process.env.FRONTEND_URL || '/').replace(/\/$/, '');
      const redirectUrl = `${frontend}/?oauth_error=1`;
      return res.redirect(redirectUrl);
    }

    if (!user) {
      logger.warn('OAuth callback: no user returned from passport (info):', info);
      const frontend = (process.env.FRONTEND_URL || '/').replace(/\/$/, '');
      const redirectUrl = `${frontend}/?oauth_failed=1`;
      return res.redirect(redirectUrl);
    }

    // Log the successful user for debugging (avoid sensitive tokens in logs)
    logger.info(`OAuth login success: ${user.username}#${user.discriminator} (id: ${user.id})`);

    // Perform login
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Error logging in user after OAuth:', loginErr);
        const frontend = (process.env.FRONTEND_URL || '/').replace(/\/$/, '');
        return res.redirect(`${frontend}/?oauth_login_error=1`);
      }

      // Si Discord devolvió state con redirect relativo, redireccionar allí
      const state = req.query && req.query.state;
      let redirectTo = `${process.env.FRONTEND_URL}/dashboard`;
      try {
        if (state && typeof state === 'string' && state.startsWith('/')) {
          redirectTo = `${process.env.FRONTEND_URL.replace(/\/$/, '')}${state}`;
        }
      } catch (e) {
        // ignore and use default
      }

      return res.redirect(redirectTo);
    });
  })(req, res, next);
});

// Obtener usuario actual
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
});

export default router;