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

// Callback de Discord OAuth
router.get('/callback', 
  passport.authenticate('discord', { 
    failureRedirect: process.env.FRONTEND_URL 
  }),
  (req, res) => {
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
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
});

export default router;