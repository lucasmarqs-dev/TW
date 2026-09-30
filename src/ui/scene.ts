// Visão ilustrada da aldeia (SVG procedural), inspirada nas imagens de referência:
// praça central com poço/estátua, caminhos de terra, muralha que evolui de paliçada para pedra,
// mina nas rochas, poço de argila, serraria, campos da fazenda e edifícios com selo de nível.
import { BUILDINGS, type BuildingId } from '../data/buildings';
import type { Player, Village } from '../engine/types';
import { buildingSpriteUrl, spriteTier } from './buildingSprites';

const W = 1000, H = 640;
let NIGHT = false;
const win = () => (NIGHT ? '#ffd35a' : '#2d2415');
const CX = 490, CY = 330;

type Style = { wall: string; roof: string; roof2: string; timber: boolean };

function tier(level: number, max: number): number {
  if (level <= 0) return 0;
  const f = level / max;
  return f < 0.3 ? 1 : f < 0.7 ? 2 : 3;
}
function styleFor(t: number): Style {
  if (t <= 1) return { wall: '#d9c49a', roof: '#c9a44e', roof2: '#a7832f', timber: true };
  if (t === 2) return { wall: '#e6dcc6', roof: '#b5532c', roof2: '#8e3c1d', timber: true };
  return { wall: '#b9b6ad', roof: '#a8432a', roof2: '#7e2f1b', timber: false };
}

/** Casa 2.5D: parede frontal, lateral, empena e telhado de duas águas. */
function house(x: number, y: number, w: number, h: number, st: Style, opts: { d?: number; rh?: number; door?: boolean; windows?: number } = {}): string {
  const d = opts.d ?? w * 0.55;
  const rh = opts.rh ?? h * 0.9;
  const L = x - w / 2, R = x + w / 2, T = y - h;
  const ridgeY = T - d / 4 - rh;
  let s = `<ellipse cx="${x + d / 3}" cy="${y + 2}" rx="${w / 2 + d / 2 + 6}" ry="${d / 3 + 5}" fill="rgba(0,0,0,.22)"/>`;
  // lateral
  s += `<polygon points="${R},${y} ${R + d},${y - d / 2} ${R + d},${T - d / 2} ${R},${T}" fill="${shade(st.wall, -28)}" stroke="#3b2a14" stroke-width=".8"/>`;
  // empena lateral
  s += `<polygon points="${R},${T} ${R + d},${T - d / 2} ${R + d / 2},${ridgeY}" fill="${shade(st.wall, -18)}" stroke="#3b2a14" stroke-width=".8"/>`;
  // frente
  s += `<rect x="${L}" y="${T}" width="${w}" height="${h}" fill="${st.wall}" stroke="#3b2a14" stroke-width=".8"/>`;
  if (!st.timber) s += `<rect x="${L}" y="${T}" width="${w}" height="${h}" fill="url(#p-stone)"/>`;
  s += `<rect x="${L}" y="${T}" width="${w}" height="${h}" fill="url(#g-wall)"/>`;
  s += `<polygon points="${R},${y} ${R + d},${y - d / 2} ${R + d},${T - d / 2} ${R},${T}" fill="url(#${st.timber ? 'p-plank' : 'p-stone'})" opacity=".7"/>`;
  if (st.timber) {
    s += `<path d="M${L} ${T + h * 0.45} H${R} M${L + w * 0.33} ${T} V${y} M${L + w * 0.66} ${T} V${y} M${L} ${T} L${L + w * 0.33} ${T + h * 0.45} M${R} ${T} L${L + w * 0.66} ${T + h * 0.45}" stroke="#5a3a1a" stroke-width="1.6" fill="none"/>`;
  } else {
    for (let i = 1; i < 4; i++) s += `<line x1="${L}" y1="${T + (h * i) / 4}" x2="${R}" y2="${T + (h * i) / 4}" stroke="rgba(0,0,0,.12)"/>`;
  }
  const nw = opts.windows ?? 2;
  for (let i = 0; i < nw; i++) {
    const wx = L + (w * (i + 1)) / (nw + 1) - 3;
    s += `<rect x="${wx}" y="${T + h * 0.15}" width="6" height="7" fill="${win()}" stroke="#e8d7a8" stroke-width=".6"/><path d="M${wx + 3} ${T + h * 0.15} v7 M${wx} ${T + h * 0.15 + 3.5} h6" stroke="#5a3a1a" stroke-width=".6"/>`;
    if (NIGHT) s += `<circle cx="${wx + 3}" cy="${T + h * 0.15 + 3}" r="9" fill="url(#g-glow)"/>`;
  }
  if (opts.door !== false) s += `<rect x="${x - 5}" y="${y - h * 0.5}" width="10" height="${h * 0.5}" fill="#4a2e14" rx="2"/>`;
  // telhado (água frontal)
  const roofPts = `${L - 4},${T + 1} ${R + 4},${T + 1} ${R + 4 + d / 2},${ridgeY} ${L - 4 + d / 2},${ridgeY}`;
  s += `<polygon points="${roofPts}" fill="${st.roof}" stroke="#3b2a14" stroke-width=".8"/>`;
  s += `<polygon points="${roofPts}" fill="url(#${st.roof === '#c9a44e' ? 'p-thatch' : 'p-tile'})"/><polygon points="${roofPts}" fill="url(#g-roof)"/>`;
  s += `<path d="M${L - 4 + d / 2} ${ridgeY} H${R + 4 + d / 2}" stroke="${shade(st.roof2, -20)}" stroke-width="2.2" stroke-linecap="round"/>`;
  // água traseira visível
  s += `<polygon points="${R + 4 + d / 2},${ridgeY} ${R + d + 4},${T - d / 2 + 1} ${R + d / 2 + 4},${T - d / 2 - 2} " fill="${st.roof2}" stroke="#3b2a14" stroke-width=".5"/>`;
  for (let i = 1; i < 4; i++) {
    const f = i / 4;
    s += `<line x1="${L - 4 + (d / 2) * f}" y1="${T + 1 + (ridgeY - T - 1) * f}" x2="${R + 4 + (d / 2) * f}" y2="${T + 1 + (ridgeY - T - 1) * f}" stroke="${st.roof2}" stroke-width="1"/>`;
  }
  return s;
}

function tower(x: number, y: number, r: number, h: number, color = '#9d9a92', roof?: string): string {
  let s = `<ellipse cx="${x + 4}" cy="${y + 2}" rx="${r + 5}" ry="${r * 0.45 + 3}" fill="rgba(0,0,0,.22)"/>`;
  s += `<path d="M${x - r} ${y} V${y - h} A${r} ${r * 0.4} 0 0 0 ${x + r} ${y - h} V${y} A${r} ${r * 0.4} 0 0 1 ${x - r} ${y}Z" fill="${color}" stroke="#3b2a14" stroke-width=".8"/>`;
  s += `<rect x="${x - r}" y="${y - h}" width="${2 * r}" height="${h}" fill="url(#p-stone)" opacity=".8"/><rect x="${x - r}" y="${y - h}" width="${2 * r}" height="${h}" fill="url(#g-tower)"/>`;
  if (h > 40) s += `<rect x="${x - 2.5}" y="${y - h * 0.7}" width="5" height="9" rx="2.5" fill="${win()}" stroke="#3b2a14" stroke-width=".6"/>`;
  s += `<ellipse cx="${x}" cy="${y - h}" rx="${r}" ry="${r * 0.4}" fill="${shade(color, 12)}" stroke="#3b2a14" stroke-width=".8"/>`;
  if (roof) {
    s += `<polygon points="${x - r - 2},${y - h} ${x + r + 2},${y - h} ${x},${y - h - r * 2.2}" fill="${roof}" stroke="#3b2a14" stroke-width=".8"/>`;
  } else {
    for (let i = -2; i <= 2; i++) s += `<rect x="${x + i * r * 0.4 - 2}" y="${y - h - 5}" width="4" height="5" fill="${color}" stroke="#3b2a14" stroke-width=".5"/>`;
  }
  return s;
}

function tree(x: number, y: number, s: number, kind: number): string {
  const shadow = `<ellipse cx="${x + s * 0.4}" cy="${y + 2}" rx="${s * 1.1}" ry="${s * 0.35}" fill="rgba(0,0,0,.25)"/>`;
  if (kind < 0.55) {
    // pinheiro em camadas
    const c = kind < 0.28 ? ['#2c5a22', '#356b28', '#3f7a2e'] : ['#244a1c', '#2d5a22', '#376a29'];
    let p = shadow + `<rect x="${x - 1.5}" y="${y - s * 0.7}" width="3" height="${s * 0.7}" fill="#5a3a1a"/>`;
    for (let i = 0; i < 3; i++) {
      const top = y - s * (1.3 + i * 0.55), base = y - s * (0.45 + i * 0.5), hw = s * (0.95 - i * 0.22);
      p += `<polygon points="${x},${top - s * 0.25} ${x - hw},${base} ${x + hw},${base}" fill="${c[i]}" stroke="#1d3a14" stroke-width=".6"/>`;
      p += `<polygon points="${x},${top - s * 0.25} ${x - hw * 0.15},${base} ${x - hw},${base}" fill="rgba(255,255,255,.08)"/>`;
    }
    return p;
  }
  // árvore frondosa
  const c = kind < 0.8 ? '#4f8a30' : '#5e9636';
  let p = shadow + `<path d="M${x - 1.8} ${y} L${x - 1} ${y - s * 0.9} L${x + 1} ${y - s * 0.9} L${x + 1.8} ${y}Z" fill="#5a3a1a"/>`;
  const blobs: [number, number, number][] = [[0, -1.35, 0.8], [-0.55, -1.0, 0.6], [0.55, -1.05, 0.62], [0.1, -1.8, 0.55]];
  for (const [dx, dy, r] of blobs) p += `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${c}" stroke="#2d5a1c" stroke-width=".6"/>`;
  p += `<circle cx="${x}" cy="${y - 1.35 * s}" r="${1.15 * s}" fill="url(#g-crown)"/>`;
  return p;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return '#' + ((1 << 24) + (c(n >> 16) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1);
}

function badge(x: number, y: number, level: number, building: boolean): string {
  const txt = String(level);
  const w = 12 + txt.length * 7;
  return `<g transform="translate(${x},${y})"><rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="5" fill="#4e8a2e" stroke="#e8f5d0" stroke-width="1.5"/>` +
    `<text y="4.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff" font-family="Verdana">${txt}</text>` +
    (building ? `<circle cx="${w / 2}" cy="-9" r="6" fill="#f1c40f" stroke="#3b2a14"/><text x="${w / 2}" y="-5.5" text-anchor="middle" font-size="9">⚒</text>` : '') + `</g>`;
}

// Posições dos edifícios na cena (x, y = base da construção; bx, by = selo)
const POS: Record<BuildingId, { x: number; y: number }> = {
  main: { x: 560, y: 225 },
  barracks: { x: 265, y: 305 },
  stable: { x: 295, y: 445 },
  garage: { x: 615, y: 505 },
  smith: { x: 450, y: 505 },
  church: { x: 770, y: 305 },
  church_f: { x: 770, y: 305 },
  watchtower: { x: 200, y: 395 },
  snob: { x: 735, y: 450 },
  place: { x: 600, y: 385 },
  statue: { x: 470, y: 420 },
  market: { x: 480, y: 318 },
  storage: { x: 385, y: 240 },
  hide: { x: 285, y: 170 },
  farm: { x: 880, y: 150 },
  wood: { x: 880, y: 600 },
  stone: { x: 130, y: 610 },
  iron: { x: 120, y: 120 },
  wall: { x: 170, y: 330 },
};

/** Largura (unidades da cena) de cada sprite ilustrado; a base da imagem fica em POS.y. */
const SPRITE_W: Partial<Record<BuildingId, number>> = {
  main: 215, barracks: 165, stable: 185, garage: 150, smith: 140, church: 110, church_f: 110, watchtower: 82,
  snob: 150, place: 130, statue: 62, market: 165, storage: 150, hide: 125, farm: 200, wood: 175, stone: 190, iron: 200,
};
const SPRITE_RATIO: Record<string, number> = {};
function spriteImage(id: BuildingId, lvl: number, v: Village, owner: { knight: { status: string } } | null): { svg: string; h: number } | null {
  const url = buildingSpriteUrl(id, lvl, BUILDINGS[id].max, id === 'statue' && owner?.knight.status === 'alive' ? 'ativo' : undefined);
  const w = SPRITE_W[id];
  if (!url || !w) return null;
  const ratio = SPRITE_RATIO[url] ?? spriteRatio(url);
  const h = w * ratio;
  const p = POS[id];
  void v;
  return {
    h,
    svg: `<ellipse cx="${p.x + w * 0.05}" cy="${p.y - h * 0.08}" rx="${w * 0.42}" ry="${h * 0.12}" fill="rgba(0,0,0,.18)"/>` +
      `<image href="${url}" x="${p.x - w / 2}" y="${p.y - h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`,
  };
}
/** Proporções dos sprites processados (altura/largura); padrão 0,68. */
function spriteRatio(url: string): number {
  for (const [k, r] of Object.entries(RATIOS)) if (url.includes(k)) return (SPRITE_RATIO[url] = r);
  return (SPRITE_RATIO[url] = 0.68);
}
const RATIOS: Record<string, number> = {
  'academia': 314 / 380, 'armazem': 248 / 380, 'esconderijo': 277 / 380, 'estabulo': 249 / 380, 'estatua': 305 / 380,
  'fazenda': 270 / 380, 'ferreiro': 262 / 380, 'igreja': 331 / 380, 'mercado': 255 / 380, 'mina-de-ferro': 248 / 380,
  'oficina': 253 / 380, 'poco-de-argila': 251 / 380, 'ponto-de-encontro': 270 / 380, 'quartel-general': 267 / 380,
  'quartel-tier': 254 / 380, 'serraria': 253 / 380, 'torre-de-vigia': 377 / 380, 'muralha': 742 / 1100,
};

function drawBuilding(id: BuildingId, lvl: number, v: Village): string {
  const p = POS[id];
  const max = BUILDINGS[id].max;
  const t = tier(lvl, max);
  const st = styleFor(t);
  const { x, y } = p;
  switch (id) {
    case 'main': {
      const w = 70 + t * 12, h = 38 + t * 6;
      let s = house(x, y, w, h, t >= 2 ? { ...st, wall: '#bdb8ab', timber: false } : st, { windows: 3 });
      if (t >= 2) s += tower(x + w / 2 + 30, y - 6, 16, 70 + t * 8, '#a19d93');
      if (t >= 3) s += tower(x - w / 2 - 6, y + 4, 13, 55, '#a19d93');
      s += `<line x1="${x + w / 2 + 30}" y1="${y - 80 - t * 8}" x2="${x + w / 2 + 30}" y2="${y - 100 - t * 8}" stroke="#3b2a14" stroke-width="1.5"/><polygon points="${x + w / 2 + 30},${y - 100 - t * 8} ${x + w / 2 + 48},${y - 95 - t * 8} ${x + w / 2 + 30},${y - 90 - t * 8}" fill="#2f5f9e"/>`;
      return s;
    }
    case 'barracks': return house(x, y, 60 + t * 10, 30 + t * 4, st, { windows: 3 }) + (t >= 2 ? `<rect x="${x + 36}" y="${y - 8}" width="30" height="12" fill="#6b4b1b" stroke="#3b2a14"/>` : '');
    case 'stable': {
      const s = house(x, y, 74 + t * 10, 28 + t * 3, { ...st, wall: '#c9a978' }, { windows: 0, door: true });
      return s + `<rect x="${x + 50}" y="${y + 4}" width="36" height="14" fill="none" stroke="#6b4b1b" stroke-width="2"/><ellipse cx="${x + 64}" cy="${y + 8}" rx="7" ry="4" fill="#fff" stroke="#555"/>`;
    }
    case 'garage': {
      let s = house(x, y, 56 + t * 8, 26 + t * 3, st, { windows: 1 });
      s += `<g transform="translate(${x - 70},${y + 10})"><rect x="0" y="-8" width="30" height="6" fill="#7a5226"/><circle cx="4" cy="0" r="5" fill="#4a2e14"/><circle cx="26" cy="0" r="5" fill="#4a2e14"/><line x1="8" y1="-8" x2="30" y2="-26" stroke="#7a5226" stroke-width="3"/></g>`;
      return s;
    }
    case 'smith': {
      let s = house(x, y, 50 + t * 8, 28 + t * 4, st, { windows: 1 });
      s += `<rect x="${x + 16}" y="${y - 50 - t * 4}" width="8" height="18" fill="#6b6259" stroke="#3b2a14"/><circle cx="${x + 20}" cy="${y - 58 - t * 4}" r="5" fill="rgba(200,200,200,.6)"/>`;
      s += `<rect x="${x - 50}" y="${y - 4}" width="16" height="8" fill="#555" stroke="#222"/>`;
      return s;
    }
    case 'church':
    case 'church_f': {
      const lvlC = Math.max(v.buildings.church, v.buildings.church_f);
      const tt = Math.max(1, lvlC);
      let s = house(x + 10, y, 48 + tt * 8, 36 + tt * 4, { wall: '#bdb8ab', roof: '#b5532c', roof2: '#8e3c1d', timber: false }, { windows: 2 });
      s += tower(x - 30, y + 4, 14, 60 + tt * 10, '#bdb8ab', '#b5532c');
      s += `<line x1="${x - 30}" y1="${y - 95 - tt * 10}" x2="${x - 30}" y2="${y - 108 - tt * 10}" stroke="#3b2a14" stroke-width="2"/><line x1="${x - 35}" y1="${y - 103 - tt * 10}" x2="${x - 25}" y2="${y - 103 - tt * 10}" stroke="#3b2a14" stroke-width="2"/>`;
      return s;
    }
    case 'watchtower': return tower(x, y, 12, 60 + lvl * 3, '#8f7a5a', '#6e5231');
    case 'snob': {
      let s = house(x, y, 62, 36, { wall: '#bdb8ab', roof: '#a8432a', roof2: '#7e2f1b', timber: false }, { windows: 3 });
      s += tower(x - 40, y + 4, 12, 58, '#a19d93') + tower(x + 58, y - 10, 12, 58, '#a19d93');
      s += `<g transform="translate(${x + 30},${y + 26})"><path d="M-18 0 Q0 -30 18 0Z" fill="#1f5fa8" stroke="#fff" stroke-width="1.2"/><path d="M-6 0 Q0 -26 6 0" fill="#fff"/></g>`;
      s += `<g transform="translate(${x + 72},${y + 26})"><path d="M-18 0 Q0 -30 18 0Z" fill="#c0392b" stroke="#fff" stroke-width="1.2"/><path d="M-6 0 Q0 -26 6 0" fill="#fff"/></g>`;
      return s;
    }
    case 'place': {
      let s = '';
      for (let i = 0; i < 3; i++) s += `<g transform="translate(${x - 30 + i * 22},${y - 10 - (i % 2) * 8})"><circle r="9" fill="#e8d7a8" stroke="#8e3c1d" stroke-width="3"/><circle r="4" fill="#c0392b"/><line x1="0" y1="9" x2="0" y2="20" stroke="#5a3a1a" stroke-width="2"/></g>`;
      s += `<line x1="${x - 55}" y1="${y + 20}" x2="${x - 35}" y2="${y - 50}" stroke="#2f5f9e" stroke-width="5"/><line x1="${x - 55}" y1="${y + 20}" x2="${x - 38}" y2="${y - 42}" stroke="#f1c40f" stroke-width="2"/>`;
      for (let i = 0; i < 5; i++) s += `<g transform="translate(${x - 20 + i * 12},${y + 18 + (i % 2) * 6})"><circle r="3" cy="-12" fill="#e0b48a"/><rect x="-2.5" y="-9" width="5" height="9" fill="${['#2f5f9e', '#8e3c1d', '#555', '#2f5f9e', '#7a5226'][i]}"/></g>`;
      return s;
    }
    case 'statue':
      return `<ellipse cx="${x}" cy="${y}" rx="30" ry="12" fill="#8d8a84" stroke="#3b2a14"/><ellipse cx="${x}" cy="${y - 4}" rx="22" ry="8" fill="#a8a59e" stroke="#3b2a14"/>` +
        `<rect x="${x - 5}" y="${y - 40}" width="10" height="36" fill="#b08d57" stroke="#3b2a14"/><circle cx="${x}" cy="${y - 45}" r="7" fill="#b08d57" stroke="#3b2a14"/><line x1="${x + 6}" y1="${y - 38}" x2="${x + 16}" y2="${y - 60}" stroke="#777" stroke-width="3"/>`;
    case 'market': {
      let s = '';
      const cols = ['#c0392b', '#2f5f9e', '#27ae60', '#f39c12'];
      const n = Math.min(4, 1 + Math.floor(lvl / 6));
      for (let i = 0; i < n; i++) {
        const sx = x - 30 + (i % 2) * 44, sy = y + Math.floor(i / 2) * 32;
        s += `<rect x="${sx}" y="${sy - 10}" width="30" height="10" fill="#7a5226" stroke="#3b2a14"/>`;
        s += `<path d="M${sx - 3} ${sy - 10} L${sx + 4} ${sy - 24} H${sx + 30} L${sx + 34} ${sy - 10}Z" fill="${cols[i]}" stroke="#3b2a14"/>`;
        s += `<path d="M${sx + 6} ${sy - 23} L${sx + 1} ${sy - 11} M${sx + 16} ${sy - 23} L${sx + 13} ${sy - 11} M${sx + 26} ${sy - 23} L${sx + 25} ${sy - 11}" stroke="#fff" stroke-width="3"/>`;
      }
      return s;
    }
    case 'storage': return house(x, y, 58 + t * 10, 30 + t * 4, { ...st, wall: '#c9a978' }, { windows: 0 }) + `<rect x="${x - 45}" y="${y - 6}" width="12" height="10" fill="#8b5a2b" stroke="#3b2a14"/><rect x="${x - 58}" y="${y - 2}" width="12" height="10" fill="#8b5a2b" stroke="#3b2a14"/>`;
    case 'hide': return `<path d="M${x - 30} ${y} Q${x - 28} ${y - 30} ${x} ${y - 32} Q${x + 30} ${y - 28} ${x + 32} ${y}Z" fill="#8d8a84" stroke="#3b2a14"/><path d="M${x - 10} ${y} Q${x} ${y - 18} ${x + 10} ${y}Z" fill="#2d2415"/><path d="M${x + 10} ${y - 5} Q${x + 30} ${y - 25} ${x + 44} ${y}Z" fill="#9f9c94" stroke="#3b2a14"/>`;
    case 'farm': {
      let s = '';
      const fields = Math.min(4, 1 + Math.floor(lvl / 7));
      const fc = ['#e3c05a', '#d9b44a', '#a0692e', '#e8c96a'];
      for (let i = 0; i < fields; i++) s += `<polygon points="${x - 90 + i * 28},${y + 60 + i * 14} ${x + 40 + i * 28},${y - 10 + i * 14} ${x + 110 + i * 28},${y + 20 + i * 14} ${x - 20 + i * 28},${y + 90 + i * 14}" fill="${fc[i]}" stroke="#8a6a24" stroke-width=".6" opacity=".95"/>`;
      s += house(x - 50, y + 10, 46 + t * 6, 24 + t * 3, st, { windows: 1 });
      if (lvl >= 5) s += windmill(x - 120, y - 10);
      return s;
    }
    case 'wood': {
      let s = house(x, y, 44 + t * 6, 22 + t * 3, { ...st, wall: '#9b6b3a' }, { windows: 0 });
      for (let i = 0; i < 3 + t; i++) s += `<g transform="translate(${x - 70 + (i % 3) * 12},${y + 8 - Math.floor(i / 3) * 8})"><rect x="0" y="-4" width="26" height="8" fill="#8b5a2b" stroke="#3b2a14"/><ellipse cx="26" cy="0" rx="3" ry="4" fill="#d9b27a" stroke="#3b2a14"/></g>`;
      return s;
    }
    case 'stone': {
      let s = `<ellipse cx="${x + 10}" cy="${y}" rx="${60 + t * 8}" ry="${26 + t * 4}" fill="#a0602e" stroke="#6b3d18"/><ellipse cx="${x + 14}" cy="${y + 2}" rx="${40 + t * 6}" ry="${16 + t * 3}" fill="#8b4f22"/>`;
      s += `<rect x="${x + 50}" y="${y - 40}" width="10" height="7" fill="#b5532c"/><rect x="${x + 62}" y="${y - 40}" width="10" height="7" fill="#b5532c"/>`;
      s += house(x + 20, y - 36, 38, 18, st, { windows: 0, door: false });
      s += `<circle cx="${x - 10}" cy="${y - 8}" r="3" fill="#e0b48a"/><rect x="${x - 12}" y="${y - 5}" width="4" height="8" fill="#555"/>`;
      return s;
    }
    case 'iron': {
      let s = `<path d="M${x - 90} ${y + 40} Q${x - 80} ${y - 50} ${x - 10} ${y - 60} Q${x + 60} ${y - 55} ${x + 80} ${y + 30}Z" fill="#8d8a84" stroke="#3b2a14"/>`;
      s += `<path d="M${x - 60} ${y + 30} Q${x - 50} ${y - 20} ${x - 10} ${y - 30} Q${x + 30} ${y - 20} ${x + 40} ${y + 20}Z" fill="#a19e97"/>`;
      s += `<rect x="${x - 14}" y="${y - 8}" width="30" height="26" fill="#2d2415" stroke="#5a3a1a" stroke-width="3"/>`;
      s += `<line x1="${x + 30}" y1="${y + 20}" x2="${x + 50}" y2="${y - 10}" stroke="#7a5226" stroke-width="3"/><line x1="${x + 38}" y1="${y + 20}" x2="${x + 58}" y2="${y - 10}" stroke="#7a5226" stroke-width="3"/>`;
      s += `<rect x="${x - 50}" y="${y + 16}" width="18" height="10" fill="#555" stroke="#222"/>`;
      if (t >= 2) s += house(x - 50, y + 8, 30, 18, st, { windows: 0 });
      return s;
    }
    case 'wall': return '';
  }
}

function windmill(x: number, y: number): string {
  return `<rect x="${x - 8}" y="${y - 40}" width="16" height="40" fill="#8b5a2b" stroke="#3b2a14"/><polygon points="${x - 10},${y - 40} ${x + 10},${y - 40} ${x},${y - 55}" fill="#6e4a22"/>` +
    `<g transform="translate(${x},${y - 42})">${[0, 90, 180, 270].map((a) => `<rect x="-3" y="-38" width="6" height="36" fill="#e8d7a8" stroke="#6b4b1b" transform="rotate(${a + 20})"/>`).join('')}</g>`;
}

function wallRing(level: number): string {
  if (level <= 0) return '';
  const rx = 360, ry = 250;
  const stone = level >= 10;
  const color = stone ? '#8f8b82' : '#7a5226';
  const width = stone ? 12 + (level - 10) * 0.6 : 7;
  let s = `<ellipse cx="${CX}" cy="${CY + 10}" rx="${rx}" ry="${ry}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="${width + 6}" transform="translate(4,6)"/>`;
  s += `<ellipse cx="${CX}" cy="${CY + 10}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  s += `<ellipse cx="${CX}" cy="${CY + 10}" rx="${rx}" ry="${ry}" fill="none" stroke="${stone ? '#b3afa6' : '#9b6b3a'}" stroke-width="${width * 0.35}" stroke-dasharray="${stone ? '6 4' : '3 3'}" transform="translate(0,-${width * 0.4})"/>`;
  const towers = Math.min(18, 4 + Math.floor(level * 0.7));
  for (let i = 0; i < towers; i++) {
    const a = (i / towers) * Math.PI * 2 + 0.2;
    const tx = CX + Math.cos(a) * rx, ty = CY + 10 + Math.sin(a) * ry;
    if (stone) s += tower(tx, ty + 8, 13, 30, '#9d9a92');
    else s += `<rect x="${tx - 7}" y="${ty - 26}" width="14" height="28" fill="#8b5a2b" stroke="#3b2a14"/><rect x="${tx - 9}" y="${ty - 30}" width="18" height="6" fill="#6e4a22" stroke="#3b2a14"/>`;
  }
  return s;
}

const PATHS: [number, number, number, number][] = [
  [CX, CY, 575, 225], [CX, CY, 300, 280], [CX, CY, 285, 410], [CX, CY, 610, 495], [CX, CY, 440, 495],
  [CX, CY, 740, 290], [CX, CY, 700, 410], [CX, CY, 140, 110], [CX, CY, 860, 140], [CX, CY, 860, 565], [CX, CY, 130, 560],
];

export function villageScene(v: Village, underConstruction: Set<string>, night = false, motion = true, owner: Player | null = null): string {
  NIGHT = night;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Verdana">`;
  s += `<defs><radialGradient id="grass" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#7fae48"/><stop offset="1" stop-color="#557f2c"/></radialGradient>` +
    `<radialGradient id="sand" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#e7cf98"/><stop offset="1" stop-color="#cfb176"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#grass)"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#f-patches)" opacity=".55"/><rect width="${W}" height="${H}" filter="url(#f-grass)"/>`;
  const rnd = mulberry(hash(v.id));
  // flores e tufos
  for (let i = 0; i < 70; i++) {
    const fx = rnd() * W, fy = rnd() * H;
    const col = ['#f4e37a', '#ffffff', '#e98bb0', '#b9d86a'][Math.floor(rnd() * 4)];
    s += `<circle cx="${fx}" cy="${fy}" r="${1 + rnd() * 1.3}" fill="${col}" opacity=".8"/>`;
  }
  // lago
  s += `<ellipse cx="930" cy="330" rx="70" ry="34" fill="#3d6e8f" stroke="#6b8a4a" stroke-width="5"/><ellipse cx="925" cy="324" rx="52" ry="20" fill="#5b8fb0"/><path d="M890 322 q10 -4 20 0 M935 316 q10 -4 20 0" stroke="#cfe6f2" stroke-width="1.2" fill="none" opacity=".7"/>`;
  // rochas da montanha (topo)
  s += `<path d="M0 0 H330 Q300 40 250 50 Q200 80 150 70 Q90 100 40 90 Q10 110 0 130Z" fill="#9f9c94" opacity=".9"/>`;
  s += `<path d="M560 0 H760 Q740 30 690 28 Q640 40 600 25Z" fill="#a7a49c" opacity=".7"/>`;
  // caminhos
  for (const [x1, y1, x2, y2] of PATHS) {
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.08;
    s += `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#a88a52" stroke-width="21" fill="none" stroke-linecap="round" opacity=".5"/><path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#cdb077" stroke-width="17" fill="none" stroke-linecap="round"/>`;
  }
  s += `<path d="M${W} 0 Q900 20 860 90" stroke="#c9ab6f" stroke-width="14" fill="none"/><path d="M${W} ${H - 40} Q940 600 860 565" stroke="#c9ab6f" stroke-width="14" fill="none"/><path d="M0 ${H - 20} Q60 620 130 560" stroke="#c9ab6f" stroke-width="14" fill="none"/>`;
  // praça
  s += `<ellipse cx="${CX}" cy="${CY + 22}" rx="190" ry="119" fill="#b39564" opacity=".6"/><ellipse cx="${CX}" cy="${CY + 20}" rx="185" ry="115" fill="url(#sand)"/><ellipse cx="${CX}" cy="${CY + 20}" rx="185" ry="115" filter="url(#f-dirt)" opacity=".6"/>`;
  // poço se não houver estátua
  if (!v.buildings.statue) s += `<ellipse cx="470" cy="410" rx="18" ry="8" fill="#6b6259" stroke="#3b2a14"/><ellipse cx="470" cy="408" rx="12" ry="5" fill="#2a3b4f"/>`;
  // árvores externas
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 1.08 + rnd() * 0.35;
    const x = CX + Math.cos(a) * 380 * r, y = CY + Math.sin(a) * 270 * r;
    if (x < 10 || x > W - 10 || y < 20 || y > H - 5) continue;
    if (Math.hypot((x - 930) / 80, (y - 330) / 44) < 1) continue; // lago
    trees.push([x, y, 9 + rnd() * 8]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  // Desenho ordenado por profundidade
  const layers: { y: number; svg: string }[] = trees.map(([x, y, sz]) => ({ y, svg: tree(x, y, sz, rnd()) }));
  const wallUrl = v.buildings.wall > 0 ? buildingSpriteUrl('wall', v.buildings.wall, 20) : null;
  if (wallUrl) {
    const ww = 800, wh = ww * RATIOS.muralha;
    // Metade de trás atrás de tudo; metade da frente por cima dos edifícios internos.
    const img = `<image href="${wallUrl}" x="${CX - ww / 2}" y="${CY + 25 - wh / 2}" width="${ww}" height="${wh}"/>`;
    const cut = CY + 25;
    layers.push({ y: 1, svg: `<clipPath id="wall-back"><rect x="0" y="0" width="${W}" height="${cut}"/></clipPath><g clip-path="url(#wall-back)">${img}</g>` });
    layers.push({ y: 565, svg: `<clipPath id="wall-front"><rect x="0" y="${cut}" width="${W}" height="${H}"/></clipPath><g clip-path="url(#wall-front)" pointer-events="none">${img}</g>` });
  } else layers.push({ y: 1, svg: wallRing(v.buildings.wall) });
  void spriteTier;
  const ids = Object.keys(POS) as BuildingId[];
  const badges: string[] = [];
  for (const id of ids) {
    if (id === 'wall' || id === 'church_f') continue;
    let lvl = v.buildings[id];
    let label = BUILDINGS[id].name;
    let target: BuildingId = id;
    if (id === 'church') {
      if (!v.buildings.church && v.buildings.church_f) { lvl = v.buildings.church_f; label = BUILDINGS.church_f.name; target = 'church_f'; }
    }
    const p = POS[id];
    const sprite = lvl > 0 ? spriteImage(target, lvl, v, owner) : null;
    const inner = lvl <= 0 ? `<ellipse cx="${p.x}" cy="${p.y - 8}" rx="30" ry="12" fill="rgba(90,60,20,.25)" stroke="rgba(60,40,10,.5)" stroke-dasharray="4 3"/>` : sprite ? sprite.svg : drawBuilding(id, lvl, v);
    const building = underConstruction.has(id);
    const lblY = p.y - (sprite ? sprite.h + 6 : id === 'main' ? 110 : 70);
    if (lvl > 0 || building) badges.push(`<g class="bld" data-act="open-building" data-b="${target}">${badge(p.x, p.y + 4, lvl, building)}</g>`);
    layers.push({
      y: p.y,
      svg: `<g class="bld" data-act="open-building" data-b="${target}"><g class="shape">${inner}</g>` +
        `<g class="lbl"><rect x="${p.x - label.length * 3.8 - 6}" y="${lblY - 13}" width="${label.length * 7.6 + 12}" height="19" rx="4" fill="rgba(30,20,8,.85)"/><text x="${p.x}" y="${lblY + 1}" text-anchor="middle" font-size="12" fill="#ffe6a8">${label}${lvl ? ' (' + lvl + ')' : ''}</text></g>` +
        `<rect x="${p.x - (SPRITE_W[id] ?? 110) * 0.4}" y="${p.y - (sprite ? sprite.h * 0.85 : 70)}" width="${(SPRITE_W[id] ?? 110) * 0.8}" height="${sprite ? sprite.h * 0.85 : 90}" fill="transparent"/></g>`,
    });
  }
  // Selo da muralha
  if (v.buildings.wall > 0 || underConstruction.has('wall')) {
    layers.push({ y: 999, svg: `<g class="bld" data-act="open-building" data-b="wall">${badge(118, 360, v.buildings.wall, underConstruction.has('wall'))}<g class="lbl"><text x="118" y="338" text-anchor="middle" font-size="12" fill="#ffe6a8" stroke="#1e1408" stroke-width="3" paint-order="stroke">Muralha</text></g><rect x="88" y="330" width="60" height="50" fill="transparent"/></g>` });
  } else {
    layers.push({ y: 999, svg: `<g class="bld" data-act="open-building" data-b="wall"><text x="140" y="335" text-anchor="middle" font-size="11" fill="#fff" opacity=".7">+ Muralha</text><rect x="100" y="315" width="80" height="30" fill="transparent"/></g>` });
  }
  layers.sort((a, b) => a.y - b.y);
  for (const l of layers) s += l.svg;
  s += ambient(v, motion);
  if (night) s += `<rect width="${W}" height="${H}" fill="#0b1a3a" opacity=".42" style="mix-blend-mode:multiply" pointer-events="none"/>` + nightLights(v);
  // Selos de nível sempre por cima de árvores e telhados
  s += badges.join('');
  s += `</svg>`;
  return s;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fumaça das chaminés, bandeiras e aldeões andando pelos caminhos. */
function ambient(v: Village, motion: boolean): string {
  let s = '';
  const smoke = (x: number, y: number, delay: number) => motion
    ? [0, 1, 2].map((i) => `<circle cx="${x}" cy="${y}" r="3" fill="#dcdcdc" opacity="0"><animate attributeName="cy" from="${y}" to="${y - 40}" dur="4s" begin="${delay + i * 1.3}s" repeatCount="indefinite"/><animate attributeName="r" from="2.5" to="9" dur="4s" begin="${delay + i * 1.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.55;0" dur="4s" begin="${delay + i * 1.3}s" repeatCount="indefinite"/></circle>`).join('')
    : '';
  if (v.buildings.smith > 0) s += smoke(460 + Math.min(12, v.buildings.smith) * 0, 438 - 4 * Math.min(3, Math.ceil(v.buildings.smith / 7)), 0);
  if (v.buildings.main > 0) s += smoke(560, 150, 1.1);
  if (v.buildings.farm > 0) s += smoke(820, 60, 2.2);
  if (!motion) return s;
  // Aldeões: quantidade cresce com a população
  const n = Math.min(10, 2 + Math.floor(v.points / 250));
  const colors = ['#2f5f9e', '#8e3c1d', '#556b2f', '#7a5226', '#6c3483', '#b0301d'];
  for (let i = 0; i < n; i++) {
    const [x1, y1, x2, y2] = PATHS[i % PATHS.length];
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.08;
    const path = `M${x1} ${y1 + 10} Q${mx} ${my + 10} ${x2} ${y2 + 10}`;
    const dur = 18 + ((i * 7) % 14);
    s += `<g><circle r="2.8" cy="-11" fill="#e0b48a"/><rect x="-2.6" y="-8.5" width="5.2" height="8.5" rx="1.5" fill="${colors[i % colors.length]}"/>` +
      `<animateMotion dur="${dur}s" begin="-${i * 3}s" repeatCount="indefinite" path="${path}" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"/></g>`;
  }
  return s;
}

function nightLights(v: Village): string {
  // Tochas na praça e no portão
  let s = '';
  const torches: [number, number][] = [[400, 300], [590, 300], [420, 420], [570, 420]];
  if (v.buildings.wall > 0) torches.push([CX - 350, CY + 60], [CX + 352, CY + 60]);
  for (const [x, y] of torches) s += `<circle cx="${x}" cy="${y}" r="26" fill="url(#g-glow)"/><rect x="${x - 1}" y="${y}" width="2" height="12" fill="#3b2a14"/><circle cx="${x}" cy="${y - 1}" r="2.5" fill="#ffd35a"/>`;
  return s;
}
