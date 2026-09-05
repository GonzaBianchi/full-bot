import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// El ApiServer se construye sin tocar Discord ni Mongo: sirve para comprobar
// el montaje de middlewares y el traductor de errores.
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DISCORD_CLIENT_ID = '123';
process.env.DISCORD_CLIENT_SECRET = 'secret';
process.env.OAUTH_REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

let app;

beforeAll(async () => {
  const ApiServer = (await import('../src/api/index.js')).default;
  const fakeClient = { user: null, guilds: { cache: new Map() }, isReady: () => false };
  app = new ApiServer(fakeClient).app;
});

describe('ApiServer', () => {
  it('responde /health aunque el bot no esté conectado', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.bot).toBe('disconnected');
  });

  it('devuelve 503 en /ready si no hay bot ni base de datos', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.ready).toBe(false);
  });

  it('404 en rutas desconocidas', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
  });

  it('401 (no 500) en un endpoint autenticado sin sesión', async () => {
    const res = await request(app).get('/api/leaderboard/123');
    expect(res.status).toBe(401);
  });

  it('400 (no 500) cuando el JSON del cuerpo está malformado', async () => {
    const res = await request(app)
      .post('/api/guilds/123/config/xp-multiplier')
      .set('Content-Type', 'application/json')
      .send('{"multiplier":');
    expect(res.status).toBe(400);
  });
});
