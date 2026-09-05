// Calculadora de niveles

/**
 * Implementación de fórmula tipo MEE6
 * - XP por mensaje: aleatorio entre 15 y 25
 * - XP necesaria por nivel (no acumulada): 5*lvl^2 + 50*lvl + 100  (lvl comienza en 1)
 * - xpForLevel(level): XP total acumulada necesaria para alcanzar `level` (sumatoria desde lvl=1..level)
 */

const MAX_LEVEL = 10000;

export function xpPerMessage(min = 15, max = 25) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function xpNeededForLevel(level) {
  // level es entero >= 1
  if (level <= 0) return 0;
  return 5 * level * level + 50 * level + 100;
}

export function xpForLevel(level) {
  // Forma cerrada de la sumatoria Σ(5l² + 50l + 100) para l = 1..level:
  //   5·Σl² + 50·Σl + 100·level
  // El bucle equivalente se ejecutaba en cada mensaje y dos veces por fila del
  // leaderboard. L(L+1)(2L+1) siempre es divisible por 6, así que es exacta.
  if (level <= 0) return 0;
  const L = Math.floor(level);
  return (5 * L * (L + 1) * (2 * L + 1)) / 6 + 25 * L * (L + 1) + 100 * L;
}

export function levelFromXp(totalXp) {
  // xpForLevel es monótona creciente, así que basta una búsqueda binaria en
  // lugar de acumular nivel a nivel hasta 10 000 iteraciones.
  if (!(totalXp > 0)) return 0;

  let low = 0;
  let high = MAX_LEVEL;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (xpForLevel(mid) <= totalXp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

export function xpToNextLevel(totalXp) {
  const lvl = levelFromXp(totalXp);
  const nextTotal = xpForLevel(lvl + 1);
  return Math.max(0, nextTotal - totalXp);
}
