import { describe, it, expect } from 'vitest';
import { getApiError, loginUrl } from '../src/services/api';

describe('getApiError', () => {
  it('usa el campo error de la API', () => {
    const error = { response: { data: { error: 'Multiplicador inválido' } } };
    expect(getApiError(error)).toBe('Multiplicador inválido');
  });

  it('arma el mensaje con los errores de express-validator', () => {
    const error = {
      response: {
        data: {
          errors: [
            { path: 'message', msg: 'longitud inválida' },
            { path: 'channelId', msg: 'requerido' }
          ]
        }
      }
    };
    expect(getApiError(error)).toBe('message: longitud inválida · channelId: requerido');
  });

  it('distingue un fallo de red', () => {
    expect(getApiError({ code: 'ERR_NETWORK' })).toBe('No se pudo conectar con el servidor');
  });

  it('cae al mensaje por defecto', () => {
    expect(getApiError({}, 'Error al guardar')).toBe('Error al guardar');
  });
});

describe('loginUrl', () => {
  it('codifica la ruta de retorno', () => {
    expect(loginUrl('/guild/123?page=2')).toContain('redirect=%2Fguild%2F123%3Fpage%3D2');
  });
});
