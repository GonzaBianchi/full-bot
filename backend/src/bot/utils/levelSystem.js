// Calculadora de niveles

/**
 * Implementación de fórmula tipo MEE6
 * - XP por mensaje: aleatorio entre 15 y 25
 * - XP necesaria por nivel (no acumulada): 5*lvl^2 + 50*lvl + 100  (lvl comienza en 1)
 * - xpForLevel(level): XP total acumulada necesaria para alcanzar `level` (sumatoria desde lvl=1..level)
 */

export function xpPerMessage(min = 15, max = 25) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function xpNeededForLevel(level) {
  // level es entero >= 1
  if (level <= 0) return 0;
  return Math.floor(5 * Math.pow(level, 2) + 50 * level + 100);
}

export function xpForLevel(level) {
  // XP total necesaria para alcanzar el nivel `level`.
  // level = 0 -> 0
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += xpNeededForLevel(l);
  }
  return total;
}

export function levelFromXp(totalXp) {
  if (totalXp <= 0) return 0;
  let level = 0;
  let accumulated = 0;
  while (level < 10000) {
    const next = xpNeededForLevel(level + 1);
    if (accumulated + next <= totalXp) {
      accumulated += next;
      level++;
    } else {
      break;
    }
  }
  return level;
}

export function xpToNextLevel(totalXp) {
  const lvl = levelFromXp(totalXp);
  const nextTotal = xpForLevel(lvl + 1);
  return Math.max(0, nextTotal - totalXp);
}