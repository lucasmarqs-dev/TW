// Pequenos auxiliares de HTML para a interface.
import { UNITS, type UnitId, type Units } from '../data/units';
import type { Res } from '../engine/types';
import { fmtDuration, fmtNum } from '../engine/util';

export function esc(s: string | number | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const ICONS: Record<string, string> = {
  wood: '<svg class="icon" viewBox="0 0 16 16"><rect x="1" y="5" width="13" height="7" rx="2" fill="#8b5a2b" stroke="#3b2a14"/><ellipse cx="14" cy="8.5" rx="2" ry="3.5" fill="#e0b57a" stroke="#3b2a14"/><circle cx="14" cy="8.5" r="1" fill="#8b5a2b"/></svg>',
  stone: '<svg class="icon" viewBox="0 0 16 16"><rect x="1" y="3" width="7" height="4" fill="#c0612f" stroke="#5a2a10"/><rect x="8" y="3" width="7" height="4" fill="#b5532c" stroke="#5a2a10"/><rect x="4" y="7" width="7" height="4" fill="#c86b35" stroke="#5a2a10"/><rect x="1" y="11" width="7" height="4" fill="#b5532c" stroke="#5a2a10"/><rect x="8" y="11" width="7" height="4" fill="#c0612f" stroke="#5a2a10"/></svg>',
  iron: '<svg class="icon" viewBox="0 0 16 16"><polygon points="2,11 5,5 14,5 11,11" fill="#9aa3ab" stroke="#3d454c"/><polygon points="2,11 11,11 11,13 2,13" fill="#6f7980" stroke="#3d454c"/><polygon points="11,11 14,5 14,7 11,13" fill="#59636a" stroke="#3d454c"/></svg>',
  pop: '<svg class="icon" viewBox="0 0 16 16"><circle cx="8" cy="4.5" r="3" fill="#e0b48a" stroke="#5a3a1a"/><path d="M2.5 15 Q3 8.5 8 8.5 Q13 8.5 13.5 15Z" fill="#6b8e23" stroke="#3b5a10"/></svg>',
  storage: '<svg class="icon" viewBox="0 0 16 16"><rect x="2" y="6" width="12" height="9" fill="#c9a978" stroke="#3b2a14"/><polygon points="1,6 8,1 15,6" fill="#b5532c" stroke="#3b2a14"/></svg>',
  time: '<svg class="icon" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#fffaf0" stroke="#3b2a14"/><path d="M8 4 V8 L11 10" stroke="#3b2a14" stroke-width="1.5" fill="none"/></svg>',
  loyalty: '<svg class="icon" viewBox="0 0 16 16"><path d="M8 14 L2 8 A3.5 3.5 0 0 1 8 3.5 A3.5 3.5 0 0 1 14 8Z" fill="#c0392b" stroke="#5a1a10"/></svg>',
};
export function icon(name: string): string { return ICONS[name] ?? ''; }

export const UNIT_ICON: Record<UnitId | 'militia', string> = {
  spear: '🔱', sword: '⚔️', axe: '🪓', archer: '🏹', spy: '👁️', light: '🐎', marcher: '🏇', heavy: '🛡️',
  ram: '🐏', catapult: '☄️', knight: '🤴', snob: '👑', militia: '🧑‍🌾',
};
export function uicon(u: UnitId | 'militia'): string {
  const name = u === 'militia' ? 'Milícia' : UNITS[u].name;
  return `<span class="uicon" title="${esc(name)}">${UNIT_ICON[u]}</span>`;
}

export function num(n: number): string { return fmtNum(n); }
export function dur(ms: number): string { return fmtDuration(ms); }

export function costHtml(c: Res & { pop?: number }, have?: Res): string {
  const part = (k: keyof Res) => `<span class="res ${have && have[k] < c[k] ? 'lack' : ''}">${icon(k)}${num(c[k])}</span>`;
  return `<span class="cost">${part('wood')}${part('stone')}${part('iron')}${c.pop !== undefined ? `<span class="res">${icon('pop')}${num(c.pop)}</span>` : ''}</span>`;
}

export function unitsInline(u: Units, empty = '—'): string {
  const parts: string[] = [];
  for (const k of Object.keys(UNITS) as UnitId[]) if ((u[k] ?? 0) > 0) parts.push(`${uicon(k)}${num(u[k]!)}`);
  return parts.length ? parts.join(' ') : empty;
}

/** Contador regressivo atualizado a cada quadro pelo app. */
export function cd(end: number): string {
  return `<span data-cd="${end}">--:--:--</span>`;
}
export function coords(v: { x: number; y: number }): string { return `${v.x}|${v.y}`; }
