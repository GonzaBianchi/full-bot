import { describe, it, expect } from 'vitest';
import { xpForLevel, levelFromXp, xpNeededForLevel, xpToNextLevel } from '../src/bot/utils/levelSystem.js';

// Implementación original, a base de bucles. La forma cerrada debe coincidir
// con ella exactamente: cualquier diferencia cambiaría el nivel de usuarios
// que ya tienen XP acumulada.
function oldXpNeededForLevel(level) {
  if (level <= 0) return 0;
  return Math.floor(5 * Math.pow(level, 2) + 50 * level + 100);
}

function oldXpForLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 1; l <= level; l++) total += oldXpNeededForLevel(l);
  return total;
}

function oldLevelFromXp(totalXp) {
  if (totalXp <= 0) return 0;
  let level = 0;
  let accumulated = 0;
  while (level < 10000) {
    const next = oldXpNeededForLevel(level + 1);
    if (accumulated + next <= totalXp) {
      accumulated += next;
      level++;
    } else break;
  }
  return level;
}

describe('levelSystem', () => {
  it('xpNeededForLevel coincide con la implementación original', () => {
    for (let l = 0; l <= 2000; l++) {
      expect(xpNeededForLevel(l)).toBe(oldXpNeededForLevel(l));
    }
  });

  it('xpForLevel coincide con la sumatoria por bucle', () => {
    for (let l = 0; l <= 2000; l++) {
      expect(xpForLevel(l)).toBe(oldXpForLevel(l));
    }
  });

  it('levelFromXp coincide en los bordes exactos de cada nivel', () => {
    for (let l = 0; l <= 500; l++) {
      for (const xp of [oldXpForLevel(l) - 1, oldXpForLevel(l), oldXpForLevel(l) + 1]) {
        if (xp < 0) continue;
        expect(levelFromXp(xp)).toBe(oldLevelFromXp(xp));
      }
    }
  });

  it('levelFromXp coincide en valores arbitrarios', () => {
    for (let i = 0; i < 5000; i++) {
      const xp = Math.floor(Math.random() * 50_000_000);
      expect(levelFromXp(xp)).toBe(oldLevelFromXp(xp));
    }
  });

  it('trata como nivel 0 los valores nulos o negativos', () => {
    expect(levelFromXp(0)).toBe(0);
    expect(levelFromXp(-1)).toBe(0);
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-5)).toBe(0);
  });

  it('xpToNextLevel es la diferencia hasta el total del siguiente nivel', () => {
    for (const xp of [0, 100, 155, 156, 1000, 123456]) {
      const lvl = levelFromXp(xp);
      expect(xpToNextLevel(xp)).toBe(xpForLevel(lvl + 1) - xp);
    }
  });
});
