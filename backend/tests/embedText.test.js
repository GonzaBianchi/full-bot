import { describe, it, expect } from 'vitest';
import { chunkForField } from '../src/utils/embedText.js';

describe('chunkForField', () => {
  it('deja un solo trozo cuando cabe', () => {
    expect(chunkForField(['a\n', 'b\n'])).toEqual(['a\nb']);
  });

  it('nunca supera el límite de un field de embed', () => {
    const blocks = Array.from({ length: 50 }, (_, i) => `${'x'.repeat(80)} ${i}\n`);
    const chunks = chunkForField(blocks);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(1024);
  });

  it('trunca un bloque que por sí solo excede el límite', () => {
    const [chunk] = chunkForField(['y'.repeat(2000)]);
    expect(chunk.length).toBeLessThanOrEqual(1024);
    expect(chunk.endsWith('...')).toBe(true);
  });

  it('devuelve vacío si no hay bloques', () => {
    expect(chunkForField([])).toEqual([]);
  });
});
