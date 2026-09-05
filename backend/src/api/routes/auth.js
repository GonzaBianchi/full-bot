import express from 'express';
import passport from 'passport';

const router = express.Router();

// Ruta de login con Discord (acepta ?redirect=/guild/123)
router.get('/login', (req, res, next) => {
  const redirect = req.query.redirect;
  if (redirect && typeof redirect === 'string') {
    // Use state to carry the redirect path (Discord will return it)
    return passport.authenticate('discord', { state: redirect })(req, res, next);
  }
  return passport.authenticate('discord')(req, res, next);
});

const ALLOWED_REDIRECT_PREFIXES = ['/dashboard', '/leaderboard', '/role-menus', '/guild/'];

// Callback de Discord OAuth
router.get('/callback',
  passport.authenticate('discord', {
    failureRedirect: process.env.FRONTEND_URL
  }),
  (req, res) => {
    const state = req.query && req.query.state;
    let redirectTo = `${process.env.FRONTEND_URL}/dashboard`;
    if (state && typeof state === 'string' && state.startsWith('/')) {
      const path = state.split('?')[0];
      if (ALLOWED_REDIRECT_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix))) {
        redirectTo = `${process.env.FRONTEND_URL.replace(/\/$/, '')}${state}`;
      }
    }
    res.redirect(redirectTo);
  }
);

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

    // req.logout solo desasocia al usuario: sin destroy la sesión seguía viva
    // en Mongo y la cookie seguía siendo válida.
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.clearCookie('connect.sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      });
      res.json({ message: 'Sesión cerrada exitosamente' });
    });
  });
});

export default router;
