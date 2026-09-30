import type { Res } from './types';
import { UNITS, type UnitId, type Units } from '../data/units';

export const HOUR = 3600_000;
export const MIN = 60_000;
export const SEC = 1000;
export const DAY = 24 * HOUR;

/** PRNG determinístico (mulberry32); o estado vive no GameState para saves reprodutíveis. */
export function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randInt(state: { rng: number }, min: number, max: number): number {
  return min + Math.floor(nextRandom(state) * (max - min + 1));
}
export function pick<T>(state: { rng: number }, arr: T[]): T {
  return arr[Math.floor(nextRandom(state) * arr.length)];
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function resSum(r: Res): number { return r.wood + r.stone + r.iron; }
export function hasRes(have: Res, need: Res): boolean {
  return have.wood >= need.wood && have.stone >= need.stone && have.iron >= need.iron;
}
export function subRes(have: Res, need: Res): void {
  have.wood -= need.wood; have.stone -= need.stone; have.iron -= need.iron;
}
export function addRes(have: Res, add: Res): void {
  have.wood += add.wood; have.stone += add.stone; have.iron += add.iron;
}
export function mulRes(r: Res, k: number): Res {
  return { wood: Math.round(r.wood * k), stone: Math.round(r.stone * k), iron: Math.round(r.iron * k) };
}

export function unitCount(u: Units): number {
  let n = 0;
  for (const k in u) n += u[k as UnitId] ?? 0;
  return n;
}
export function addUnits(a: Units, b: Units, sign = 1): void {
  for (const k in b) {
    const id = k as UnitId;
    const v = (a[id] ?? 0) + sign * (b[id] ?? 0);
    if (v > 0) a[id] = v; else delete a[id];
  }
}
export function cloneUnits(u: Units): Units { return { ...u }; }
export function unitsPop(u: Units): number {
  let n = 0;
  for (const k in u) n += (u[k as UnitId] ?? 0) * UNITS[k as UnitId].pop;
  return n;
}
export function unitsCarry(u: Units): number {
  let n = 0;
  for (const k in u) n += (u[k as UnitId] ?? 0) * UNITS[k as UnitId].carry;
  return n;
}
/** Unidade mais lenta (maior min/campo) do grupo. */
export function slowestUnit(u: Units): UnitId | null {
  let best: UnitId | null = null;
  for (const k in u) {
    const id = k as UnitId;
    if ((u[id] ?? 0) <= 0) continue;
    if (!best || UNITS[id].speed > UNITS[best].speed) best = id;
  }
  return best;
}

export function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString('pt-BR');
}
export function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
export function fmtGameTime(t: number): string {
  const day = Math.floor(t / DAY) + 1;
  const h = Math.floor((t % DAY) / HOUR);
  const m = Math.floor((t % HOUR) / MIN);
  const s = Math.floor((t % MIN) / SEC);
  return `Dia ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function continentOf(x: number, y: number): string {
  return 'K' + Math.floor(y / 100) + Math.floor(x / 100);
}

/** Heap binário mínimo por (t, seq) sobre um array simples (serializável). */
export function heapPush<T extends { t: number; seq: number }>(h: T[], e: T): void {
  h.push(e);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (less(h[i], h[p])) { [h[i], h[p]] = [h[p], h[i]]; i = p; } else break;
  }
}
export function heapPop<T extends { t: number; seq: number }>(h: T[]): T | undefined {
  if (!h.length) return undefined;
  const top = h[0];
  const last = h.pop()!;
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < h.length && less(h[l], h[m])) m = l;
      if (r < h.length && less(h[r], h[m])) m = r;
      if (m === i) break;
      [h[i], h[m]] = [h[m], h[i]];
      i = m;
    }
  }
  return top;
}
function less(a: { t: number; seq: number }, b: { t: number; seq: number }): boolean {
  return a.t < b.t || (a.t === b.t && a.seq < b.seq);
}
