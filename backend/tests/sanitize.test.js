import { describe, it, expect } from 'vitest';
import { sanitizeMongoInput } from '../src/api/middleware/sanitize.js';

function run(req) {
  let called = false;
  sanitizeMongoInput(req, {}, () => { called = true; });
  expect(called).toBe(true);
  return req;
}

describe('sanitizeMongoInput', () => {
  it('elimina claves que empiezan por $', () => {
    const req = run({ body: { title: 'ok', $unset: { guildId: 1 } }, query: {}, params: {} });
    expect(req.body).toEqual({ title: 'ok' });
  });

  it('elimina claves con punto', () => {
    const req = run({ body: { 'autoRoles.enabled': true, name: 'x' }, query: {}, params: {} });
    expect(req.body).toEqual({ name: 'x' });
  });

  it('limpia en profundidad y dentro de arrays', () => {
    const req = run({
      body: { options: [{ roleId: '1', $rename: 'x' }], nested: { $set: 1, keep: 2 } },
      query: {},
      params: {}
    });
    expect(req.body.options[0]).toEqual({ roleId: '1' });
    expect(req.body.nested).toEqual({ keep: 2 });
  });

  it('también limpia query y params', () => {
    const req = run({ body: {}, query: { $where: '1', page: '2' }, params: { $ne: 'x', guildId: 'g' } });
    expect(req.query).toEqual({ page: '2' });
    expect(req.params).toEqual({ guildId: 'g' });
  });

  it('no rompe con cuerpos ausentes', () => {
    expect(() => run({ body: undefined, query: null, params: {} })).not.toThrow();
  });
});
