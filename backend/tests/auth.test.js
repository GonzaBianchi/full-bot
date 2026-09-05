import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { isAuthenticated, isGuildMember, hasGuildPermission, canManageGuild } from '../src/api/middleware/auth.js';

const ADMIN = '8';
const MANAGE_GUILD = '32';
const NONE = '0';
// Bitfield real de Discord: excede 32 bits, que es justo lo que parseInt rompía.
const BIG_ADMIN = '140737488355327';

function buildApp({ user, botGuilds = ['g1'] }) {
  const app = express();

  app.use((req, res, next) => {
    req.user = user;
    req.isAuthenticated = () => Boolean(user);
    req.discordClient = { guilds: { cache: new Map(botGuilds.map(id => [id, { id }])) } };
    next();
  });

  app.get('/member/:guildId', isAuthenticated, isGuildMember, (req, res) => res.json({ ok: true }));
  app.get('/admin/:guildId', isAuthenticated, hasGuildPermission, (req, res) => res.json({ ok: true }));

  return app;
}

const memberOf = (id, permissions) => ({ id: 'u1', guilds: [{ id, permissions }] });

describe('canManageGuild', () => {
  it('acepta ADMINISTRATOR y MANAGE_GUILD', () => {
    expect(canManageGuild({ permissions: ADMIN })).toBe(true);
    expect(canManageGuild({ permissions: MANAGE_GUILD })).toBe(true);
  });

  it('rechaza permisos vacíos o inválidos', () => {
    expect(canManageGuild({ permissions: NONE })).toBe(false);
    expect(canManageGuild({})).toBe(false);
    expect(canManageGuild({ permissions: 'no-es-un-numero' })).toBe(false);
  });

  it('lee bitfields de más de 32 bits', () => {
    expect(canManageGuild({ permissions: BIG_ADMIN })).toBe(true);
  });
});

describe('isGuildMember', () => {
  it('401 sin sesión', async () => {
    await request(buildApp({ user: null })).get('/member/g1').expect(401);
  });

  it('403 si el usuario no pertenece al servidor', async () => {
    const app = buildApp({ user: memberOf('otro', NONE) });
    await request(app).get('/member/g1').expect(403);
  });

  it('200 para un miembro sin permisos de admin', async () => {
    const app = buildApp({ user: memberOf('g1', NONE) });
    await request(app).get('/member/g1').expect(200);
  });

  it('404 si el bot no está en el servidor', async () => {
    const app = buildApp({ user: memberOf('g1', NONE), botGuilds: [] });
    await request(app).get('/member/g1').expect(404);
  });
});

describe('hasGuildPermission', () => {
  it('403 para un miembro sin permisos de gestión', async () => {
    const app = buildApp({ user: memberOf('g1', NONE) });
    await request(app).get('/admin/g1').expect(403);
  });

  it('200 con ADMINISTRATOR', async () => {
    const app = buildApp({ user: memberOf('g1', ADMIN) });
    await request(app).get('/admin/g1').expect(200);
  });

  it('200 con MANAGE_GUILD', async () => {
    const app = buildApp({ user: memberOf('g1', MANAGE_GUILD) });
    await request(app).get('/admin/g1').expect(200);
  });

  it('403 sobre un servidor ajeno aunque sea admin en el suyo', async () => {
    const app = buildApp({ user: memberOf('g1', ADMIN), botGuilds: ['g1', 'g2'] });
    await request(app).get('/admin/g2').expect(403);
  });
});
