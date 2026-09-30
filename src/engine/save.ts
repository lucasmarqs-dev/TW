import { Game } from './game';
import type { GameState } from './types';
import { SAVE_VERSION } from './world';

const KEY = 'tw-offline-save-v1';

export function saveGame(g: Game): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(g.s));
    return true;
  } catch {
    return false;
  }
}
export function loadGame(): Game | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return fromJSON(raw);
  } catch {
    return null;
  }
}
export function hasSave(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
}
export function fromJSON(raw: string): Game {
  const s = JSON.parse(raw) as GameState;
  if (!s || typeof s !== 'object' || !s.villages || !s.players) throw new Error('Arquivo de jogo inválido');
  if (s.version !== SAVE_VERSION) throw new Error('Versão de save incompatível');
  // Infinity não sobrevive ao JSON: itens de recrutamento em espera voltam como null.
  for (const v of Object.values(s.villages)) {
    for (const q of Object.values(v.recruit)) for (const it of q) if (it.next === null) it.next = Infinity;
  }
  return new Game(s);
}
export function toJSON(g: Game): string { return JSON.stringify(g.s); }
