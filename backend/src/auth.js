import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import session from 'express-session';
import config from './config.js';

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
  clientID: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  callbackURL: config.discord.redirectUri,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  // Aquí puedes guardar el usuario en la base de datos si lo deseas
  return done(null, profile);
}));

export function setupAuth(app) {
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Rutas de autenticación
  app.get('/auth/discord', passport.authenticate('discord'));

  app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
      // Autenticación exitosa, redirige al frontend
      res.redirect('/');
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'No autenticado' });
    }
  });
}
