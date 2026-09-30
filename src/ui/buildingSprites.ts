// Sprites ilustrados dos edifícios (assets-src/sprites → src/assets/sprites via scripts/process_sprites.py).
import type { BuildingId } from '../data/buildings';

const files = import.meta.glob('../assets/sprites/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) URLS[path.split('/').pop()!.replace('.webp', '')] = url;

/** Nome-base e número de estágios de cada edifício. */
const SETS: Partial<Record<BuildingId, { base: string; tiers: number } | { single: string }>> = {
  main: { base: 'quartel-general', tiers: 4 },
  barracks: { base: 'quartel', tiers: 3 },
  stable: { base: 'estabulo', tiers: 3 },
  garage: { base: 'oficina', tiers: 3 },
  smith: { base: 'ferreiro', tiers: 3 },
  market: { base: 'mercado', tiers: 3 },
  storage: { base: 'armazem', tiers: 3 },
  hide: { base: 'esconderijo', tiers: 3 },
  farm: { base: 'fazenda', tiers: 3 },
  wood: { base: 'serraria', tiers: 3 },
  stone: { base: 'poco-de-argila', tiers: 3 },
  iron: { base: 'mina-de-ferro', tiers: 3 },
  wall: { base: 'muralha', tiers: 3 },
  watchtower: { base: 'torre-de-vigia', tiers: 3 },
  church: { single: 'igreja-tier-1' },
  church_f: { single: 'igreja-tier-1' },
  snob: { single: 'academia-unico' },
  place: { single: 'ponto-de-encontro-unico' },
  statue: { single: 'estatua-unico' },
};

/** Estágio do sprite pelo nível: divide o intervalo 1..máximo em faixas iguais. */
export function spriteTier(level: number, max: number, tiers: number): number {
  if (tiers <= 1 || max <= 1) return 1;
  return Math.min(tiers, 1 + Math.floor(((level - 1) / max) * tiers));
}

export function buildingSpriteUrl(id: BuildingId, level: number, max: number, variant?: 'ativo'): string | null {
  const set = SETS[id];
  if (!set) return null;
  if ('single' in set) {
    if (id === 'statue' && variant === 'ativo') return URLS['estatua-ativo'] ?? URLS[set.single] ?? null;
    return URLS[set.single] ?? null;
  }
  const t = spriteTier(Math.max(1, level), max, set.tiers);
  return URLS[`${set.base}-tier-${t}`] ?? null;
}
