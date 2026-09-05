import { describe, it, expect } from 'vitest';
import { formatTarget } from '../src/utils/achievementFormat.js';

describe('formatTarget', () => {
  it('formatea cada tipo de logro', () => {
    // toLocaleString depende del locale del sistema, así que se compara con él.
    expect(formatTarget('messages', 1500)).toBe(`${(1500).toLocaleString()} mensajes`);
    expect(formatTarget('reactions', 10)).toBe('10 reacciones recibidas');
    expect(formatTarget('reactions_given', 10)).toBe('10 reacciones dadas');
    expect(formatTarget('boost', 1)).toBe('Boostear el servidor');
  });

  it('convierte segundos a horas y minutos', () => {
    expect(formatTarget('voice_time', 3600)).toBe('1h 0m en voz');
    expect(formatTarget('voice_time', 5400)).toBe('1h 30m en voz');
    expect(formatTarget('voice_time', 600)).toBe('10m en voz');
  });

  it('cae en un formato genérico para tipos desconocidos', () => {
    expect(formatTarget('otro', 42)).toBe((42).toLocaleString());
  });
});
