import { describe, it, expect } from 'vitest';
import { safeImageFetch } from '../src/utils/safeImageFetch.js';

// Estos casos se rechazan antes de abrir ninguna conexión, así que el test no
// depende de la red.
describe('safeImageFetch', () => {
  it('rechaza esquemas distintos de https', async () => {
    await expect(safeImageFetch('http://example.com/a.png')).rejects.toThrow(/https/);
    await expect(safeImageFetch('file:///etc/passwd')).rejects.toThrow(/https/);
  });

  it('rechaza URLs inválidas', async () => {
    await expect(safeImageFetch('no-es-una-url')).rejects.toThrow(/URL inválida/);
    await expect(safeImageFetch('')).rejects.toThrow(/URL inválida/);
  });

  it('rechaza direcciones internas y de metadata de nube', async () => {
    for (const host of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '[::1]']) {
      await expect(safeImageFetch(`https://${host}/a.png`)).rejects.toThrow(/no permitido/);
    }
  });
});
