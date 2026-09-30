// Curvas de economia do Tribal Wars 1 (ver docs/referencia-tecnica.md, seção 1).

/** Produção base por hora de serraria/poço/mina (seção 1.1). Nível 0 = 5/h (valor comunitário). */
export function baseProduction(level: number): number {
  if (level <= 0) return 5;
  return Math.round(30 * Math.pow(80, (level - 1) / 29));
}

/** Capacidade do armazém por recurso (seção 1.2). */
export function storageCapacity(level: number): number {
  if (level <= 0) return 500;
  return Math.round(1000 * Math.pow(400, (level - 1) / 29));
}

/** Capacidade populacional da fazenda (seção 1.3) — usa floor, que reproduz os 30 valores. */
export function farmCapacity(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(240 * Math.pow(100, (level - 1) / 29));
}

/** Proteção do esconderijo por recurso (seção 1.6). */
export const HIDE_TABLE = [0, 150, 200, 267, 356, 474, 632, 843, 1125, 1500, 2000];
export function hideCapacity(level: number): number {
  return HIDE_TABLE[Math.max(0, Math.min(10, level))];
}

/** Mercadores por nível do mercado (seção 1.5). */
export const MERCHANT_TABLE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 19, 26, 35, 46, 59, 74, 91, 110, 131, 154, 179, 206, 235];
export function merchantCount(level: number): number {
  return MERCHANT_TABLE[Math.max(0, Math.min(25, level))];
}
export const MERCHANT_CAPACITY = 1000;
/** Minutos por campo dos mercadores em velocidade 1 (escolha de design: não confirmado na referência). */
export const MERCHANT_MIN_PER_FIELD = 6;

/** Muralha: B1 multiplica a defesa das tropas, B2 é defesa básica (seção 4.5). */
export const WALL_B1 = [1, 1.04, 1.08, 1.12, 1.16, 1.2, 1.24, 1.29, 1.34, 1.39, 1.44, 1.49, 1.55, 1.6, 1.66, 1.72, 1.79, 1.85, 1.92, 1.99, 2.07];
export function wallBonus(level: number): number {
  return WALL_B1[Math.max(0, Math.min(20, level))];
}
export function wallBasicDefense(level: number): number {
  return 20 + 50 * Math.max(0, level);
}

/** Raio (campos) da torre de vigia — interpolação entre 1,1 (nível 1) e ~15 (nível 20). */
export function watchtowerRadius(level: number): number {
  if (level <= 0) return 0;
  return Math.round(1.1 * Math.pow(1.1477, level - 1) * 10) / 10;
}

/** Raio da igreja por nível (seção 2.2). Primeira igreja = raio 4. */
export const CHURCH_RADIUS = [0, 4, 6, 8];

/** Pontos totais de um edifício no nível L (seção 1.4). */
export function buildingPoints(base: number, level: number): number {
  if (level <= 0) return 0;
  return Math.round(base * Math.pow(1.2, level - 1));
}

/** Fator de tempo do QG: cada nível reduz 5% (seção 2.1). */
export function hqFactor(hqLevel: number): number {
  return Math.pow(1.05, -hqLevel);
}

/** Expoente comunitário de tempo de construção (seção 2.1). */
export function buildTimeExponent(level: number): number {
  if (level <= 1) return -13;
  return Math.max(-13, level - 1 - 14 / (level - 1));
}

/** Pontos de adversários derrotados (seção 8.1). */
export const OD_POINTS: Record<string, [number, number]> = {
  spear: [4, 1], sword: [5, 2], axe: [1, 4], archer: [5, 2], spy: [1, 2], light: [5, 13],
  marcher: [6, 12], heavy: [23, 15], ram: [4, 8], catapult: [12, 10], knight: [40, 20], snob: [200, 200], militia: [4, 0],
};
