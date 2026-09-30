import type { Village } from '../../engine/types';
import { distance, fmtNum } from '../../engine/util';
import { watchtowerRadius } from '../../data/tables';
import { action, registerScreen, type UI } from '../app';
import { buildingSpriteUrl } from '../buildingSprites';
import { esc, num, unitsInline } from '../h';
import { bonusName } from './village';

const REL_COLOR: Record<string, string> = {
  self: '#ffffff', tribe: '#2b7bff', ally: '#00d0ff', nap: '#b36bff', enemy: '#ff2a2a', neutral: '#a0522d', barbarian: '#8c8c8c',
};
const REL_NAME: Record<string, string> = {
  self: 'Suas aldeias', tribe: 'Sua tribo', ally: 'Aliados', nap: 'PNA', enemy: 'Inimigos', neutral: 'Outros jogadores', barbarian: 'Bárbaras',
};

let canvas: HTMLCanvasElement | null = null;
let tip: HTMLDivElement | null = null;
let lastDraw = 0;
let hover: Village | null = null;
let drag: { x: number; y: number; mx: number; my: number; moved: boolean } | null = null;

function relOf(ui: UI, v: Village): string {
  return ui.g.relation(ui.g.s.humanId, v.ownerId);
}

function sidePanel(ui: UI): string {
  const g = ui.g;
  const sel = ui.map.sel ? g.s.villages[ui.map.sel] : null;
  const cur = ui.village();
  let info = '<p class="muted">Clique numa aldeia para ver detalhes.</p>';
  if (sel) {
    const owner = g.player(sel.ownerId);
    const tribe = owner?.tribeId ? g.s.tribes[owner.tribeId] : null;
    const rel = relOf(ui, sel);
    const lastRep = g.s.reports.find((r) => r.defender?.villageId === sel.id && r.attacker?.playerId === g.s.humanId);
    info = `<h3>${esc(sel.name)}</h3>
      <div class="kv"><span>Coordenadas</span><b>${sel.x}|${sel.y} K${Math.floor(sel.y / 100)}${Math.floor(sel.x / 100)}</b>
      <span>Dono</span><b>${owner ? esc(owner.name) : 'Bárbaros'}</b>
      ${tribe ? `<span>Tribo</span><b>[${esc(tribe.tag)}] ${esc(tribe.name)}</b>` : ''}
      <span>Relação</span><b style="color:${rel === 'enemy' ? '#b0301d' : 'inherit'}">${REL_NAME[rel]}</b>
      <span>Pontos</span><b>${fmtNum(sel.points)}</b>
      ${owner ? `<span>Pontos do jogador</span><b>${fmtNum(g.playerPoints(owner.id))}</b>` : ''}
      <span>Distância</span><b>${distance(cur, sel).toFixed(1)} campos</b>
      ${sel.bonus ? `<span>Bônus</span><b class="ok">${bonusName(sel.bonus)}</b>` : ''}
      ${owner && !owner.human ? `<span>Personalidade</span><b>${owner.personality}</b>` : ''}</div>
      ${sel.ownerId === g.s.humanId ? `<p>Tropas: ${unitsInline(sel.units)}</p>` : ''}
      ${lastRep ? `<p class="small">Último relatório: <a data-act="open-report" data-r="${lastRep.id}">${esc(lastRep.title)}</a></p>` : ''}
      <div class="flex" style="margin-top:8px">
        ${sel.ownerId === g.s.humanId ? `<button data-act="map-goto" data-v="${sel.id}">Ir para a aldeia</button>` : ''}
        ${sel.id !== cur.id ? `<button class="red" data-act="map-send" data-v="${sel.id}">Enviar tropas</button>` : ''}
        ${sel.ownerId && sel.id !== cur.id ? `<button data-act="map-trade" data-v="${sel.id}">Enviar recursos</button>` : ''}
      </div>`;
  }
  const legend = Object.entries(REL_COLOR).map(([k, c]) => `<span><i style="background:${c}"></i>${REL_NAME[k]}</span>`).join('');
  return `<div class="box"><div class="head">Mapa</div><div class="body">
    <div class="flex" data-form>Ir para <input class="coord" name="gx" value="${ui.map.x}"> | <input class="coord" name="gy" value="${ui.map.y}"> <button class="small" data-act="map-jump" data-default>OK</button>
    <button class="small" data-act="map-home">Minha aldeia</button></div>
    <div class="flex" style="margin-top:6px">Zoom <button class="small" data-act="map-zoom" data-d="-1">−</button><button class="small" data-act="map-zoom" data-d="1">+</button></div>
    <div class="legend" style="margin-top:8px">${legend}<span>★ aldeia bônus</span></div></div></div>
    <div class="box"><div class="head">Aldeia selecionada</div><div class="body">${info}</div></div>`;
}

registerScreen('map', {
  static: true,
  render(ui) {
    return `<div class="cols"><div class="map-wrap"><canvas id="mapcanvas"></canvas><div class="map-tip" id="maptip" style="display:none"></div></div><div id="mapside">${sidePanel(ui)}</div></div>`;
  },
  mount(ui, root) {
    canvas = root.querySelector('#mapcanvas');
    tip = root.querySelector('#maptip');
    if (!canvas) return;
    const c = canvas;
    const toField = (ev: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const z = ui.map.zoom;
      return { fx: ui.map.x + (ev.clientX - r.left - r.width / 2) / z, fy: ui.map.y + (ev.clientY - r.top - r.height / 2) / z };
    };
    c.onpointerdown = (ev) => { drag = { x: ui.map.x, y: ui.map.y, mx: ev.clientX, my: ev.clientY, moved: false }; c.setPointerCapture(ev.pointerId); c.classList.add('drag'); };
    c.onpointermove = (ev) => {
      if (drag) {
        const dx = ev.clientX - drag.mx, dy = ev.clientY - drag.my;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        ui.map.x = drag.x - dx / ui.map.zoom; ui.map.y = drag.y - dy / ui.map.zoom;
        draw(ui, true);
        return;
      }
      const { fx, fy } = toField(ev);
      const v = findVillage(ui, fx, fy);
      hover = v;
      if (tip) {
        if (v) {
          const owner = ui.g.player(v.ownerId);
          const tribe = owner?.tribeId ? ui.g.s.tribes[owner.tribeId] : null;
          const r = c.getBoundingClientRect();
          tip.style.display = 'block';
          tip.style.left = Math.min(r.width - 250, ev.clientX - r.left + 14) + 'px';
          tip.style.top = ev.clientY - r.top + 14 + 'px';
          tip.innerHTML = `<b>${esc(v.name)}</b> (${v.x}|${v.y})<br>${owner ? esc(owner.name) : 'Bárbaros'}${tribe ? ` [${esc(tribe.tag)}]` : ''}<br>${num(v.points)} pontos · ${distance(ui.village(), v).toFixed(1)} campos${v.bonus ? `<br>★ ${bonusName(v.bonus)}` : ''}`;
        } else tip.style.display = 'none';
      }
      draw(ui, true);
    };
    c.onpointerup = (ev) => {
      c.classList.remove('drag');
      const d = drag;
      drag = null;
      if (d && !d.moved) {
        const { fx, fy } = toField(ev);
        const v = findVillage(ui, fx, fy);
        ui.map.sel = v?.id ?? null;
        refreshSide(ui);
      }
      draw(ui, true);
    };
    c.onpointerleave = () => { hover = null; if (tip) tip.style.display = 'none'; };
    c.onwheel = (ev) => {
      ev.preventDefault();
      zoom(ui, ev.deltaY < 0 ? 1 : -1);
    };
    draw(ui, true);
  },
  refresh(ui) { refreshSide(ui); draw(ui, true); },
  tick(ui) { draw(ui, false); },
});

function refreshSide(ui: UI) {
  const side = document.getElementById('mapside');
  if (!side) return;
  const active = document.activeElement as HTMLElement | null;
  if (active && side.contains(active) && active.tagName === 'INPUT') return;
  side.innerHTML = sidePanel(ui);
}

function zoom(ui: UI, d: number) {
  const steps = [4, 6, 8, 11, 14, 18, 24, 32, 42];
  let i = steps.findIndex((s) => s >= ui.map.zoom);
  if (i < 0) i = steps.length - 1;
  ui.map.zoom = steps[Math.max(0, Math.min(steps.length - 1, i + d))];
  draw(ui, true);
}

function findVillage(ui: UI, fx: number, fy: number): Village | null {
  let best: Village | null = null, bd = 0.75;
  for (const v of Object.values(ui.g.s.villages)) {
    const d = Math.hypot(v.x - fx + 0.0, v.y - fy + 0.0);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function draw(ui: UI, force: boolean) {
  if (!canvas) return;
  const now = performance.now();
  if (!force && now - lastDraw < 90) return;
  lastDraw = now;
  const c = canvas;
  const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const z = ui.map.zoom;
  const g = ui.g;
  const sx = (x: number) => W / 2 + (x - ui.map.x) * z;
  const sy = (y: number) => H / 2 + (y - ui.map.y) * z;
  const x0 = Math.floor(ui.map.x - W / 2 / z) - 1, x1 = Math.ceil(ui.map.x + W / 2 / z) + 1;
  const y0 = Math.floor(ui.map.y - H / 2 / z) - 1, y1 = Math.ceil(ui.map.y + H / 2 / z) + 1;
  drawTerrain(ctx, ui, W, H, dpr);
  // grade
  if (z >= 11) {
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(sx(x) - z / 2, 0); ctx.lineTo(sx(x) - z / 2, H); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(0, sy(y) - z / 2); ctx.lineTo(W, sy(y) - z / 2); }
    ctx.stroke();
  }
  // continentes
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = Math.floor(x0 / 100) * 100; k <= x1; k += 100) { ctx.moveTo(sx(k) - z / 2, 0); ctx.lineTo(sx(k) - z / 2, H); }
  for (let k = Math.floor(y0 / 100) * 100; k <= y1; k += 100) { ctx.moveTo(0, sy(k) - z / 2); ctx.lineTo(W, sy(k) - z / 2); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = 'bold 14px Verdana';
  for (let kx = Math.floor(x0 / 100); kx <= Math.floor(x1 / 100); kx++) for (let ky = Math.floor(y0 / 100); ky <= Math.floor(y1 / 100); ky++) {
    ctx.fillText(`K${ky}${kx}`, sx(kx * 100) - z / 2 + 6, sy(ky * 100) - z / 2 + 18);
  }
  // raio da torre de vigia
  for (const v of g.villagesOf(g.s.humanId)) {
    if (!v.buildings.watchtower) continue;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(sx(v.x), sy(v.y), watchtowerRadius(v.buildings.watchtower) * z, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  // comandos
  for (const cmd of Object.values(g.s.commands)) {
    const mine = cmd.ownerId === g.s.humanId;
    const incoming = !mine && cmd.type === 'attack' && g.s.villages[cmd.toId]?.ownerId === g.s.humanId;
    if (!mine && !incoming) continue;
    const a = g.s.villages[cmd.fromId], b = g.s.villages[cmd.toId];
    if (!a || !b) continue;
    const f = Math.max(0, Math.min(1, (g.now - cmd.start) / Math.max(1, cmd.arrival - cmd.start)));
    const color = incoming ? '#ff2a2a' : cmd.type === 'attack' ? '#ffcf3f' : cmd.type === 'support' ? '#4fa3ff' : cmd.type === 'return' ? '#b6ff8a' : '#ffffff';
    ctx.strokeStyle = color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.setLineDash(cmd.type === 'return' || cmd.type === 'tradeReturn' ? [3, 4] : []);
    ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx(a.x + (b.x - a.x) * f), sy(a.y + (b.y - a.y) * f), Math.max(2.5, z * 0.18), 0, 7); ctx.fill();
  }
  // aldeias
  const cur = ui.village();
  for (const v of Object.values(g.s.villages)) {
    if (v.x < x0 || v.x > x1 || v.y < y0 || v.y > y1) continue;
    const rel = relOf(ui, v);
    const X = sx(v.x), Y = sy(v.y);
    const s = Math.max(4, z * (0.6 + Math.min(0.3, v.points / 10000)));
    if (z >= 11) drawVillageSprite(ctx, X, Y, z, v.points, !!v.ownerId, REL_COLOR[rel]);
    else {
      ctx.fillStyle = REL_COLOR[rel];
      ctx.fillRect(X - s / 2, Y - s / 2, s, s);
      ctx.strokeStyle = '#1b1208'; ctx.lineWidth = 1; ctx.strokeRect(X - s / 2, Y - s / 2, s, s);
    }
    if (v.bonus && !v.ownerId) { ctx.fillStyle = '#ffe14d'; ctx.font = `${Math.max(9, z * 0.6)}px Verdana`; ctx.fillText('★', X + s / 2 - 2, Y - s / 2 + 2); }
    if (v.id === cur.id || v.id === ui.map.sel || v === hover) {
      ctx.strokeStyle = v.id === ui.map.sel ? '#ffe14d' : '#ffffff'; ctx.lineWidth = 2;
      ctx.strokeRect(X - s / 2 - 3, Y - s / 2 - 3, s + 6, s + 6);
    }
    if (z >= 24) {
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.font = '10px Verdana'; ctx.textAlign = 'center';
      ctx.fillText(`${v.points}`, X, Y + s * 0.75 + 10); ctx.textAlign = 'start';
    }
  }
  // coordenadas no canto
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, H - 20, 140, 20);
  ctx.fillStyle = '#fff'; ctx.font = '11px Verdana';
  ctx.fillText(`Centro ${Math.round(ui.map.x)}|${Math.round(ui.map.y)}`, 6, H - 6);
}

action('map-jump', (ui) => {
  const x = Number(document.querySelector<HTMLInputElement>('input[name=gx]')?.value);
  const y = Number(document.querySelector<HTMLInputElement>('input[name=gy]')?.value);
  if (Number.isFinite(x) && Number.isFinite(y)) { ui.map.x = x; ui.map.y = y; draw(ui, true); }
});
action('map-home', (ui) => { const v = ui.village(); ui.map.x = v.x; ui.map.y = v.y; draw(ui, true); refreshSide(ui); });
action('map-zoom', (ui, el) => zoom(ui, Number(el.dataset.d)));
action('map-goto', (ui, el) => { ui.vid = el.dataset.v!; ui.go('village'); });
action('map-send', (ui, el) => {
  const v = ui.g.s.villages[el.dataset.v!];
  ui.target = { x: v.x, y: v.y };
  ui.go('building', { building: 'place' });
});
action('map-trade', (ui, el) => {
  const v = ui.g.s.villages[el.dataset.v!];
  ui.target = { x: v.x, y: v.y };
  ui.go('building', { building: 'market' });
});

// ---------------------------------------------------------------- terreno e sprites do mapa
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t: number) { return t * t * (3 - 2 * t); }
/** Ruído de valor 2D (0..1) com duas oitavas. */
function noise(x: number, y: number, seed: number): number {
  let total = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < 2; o++) {
    const fx = x * freq, fy = y * freq;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = smooth(fx - ix), ty = smooth(fy - iy);
    const a = hash2(ix, iy, seed + o), b = hash2(ix + 1, iy, seed + o), c = hash2(ix, iy + 1, seed + o), d = hash2(ix + 1, iy + 1, seed + o);
    total += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
    norm += amp; amp *= 0.5; freq *= 2.1;
  }
  return total / norm;
}

type Cell = 'grass' | 'forest' | 'water' | 'rock';
let occupied: Set<string> | null = null;
let occupiedCount = -1;
function cellType(ui: UI, x: number, y: number): Cell {
  const seed = ui.g.cfg.seed % 10000;
  if (occupied?.has(x + '|' + y)) return 'grass';
  const w = noise(x / 9, y / 9, seed + 17);
  if (w < 0.2) return 'water';
  const f = noise(x / 7, y / 7, seed + 3);
  if (f > 0.66) return 'forest';
  const r = noise(x / 5, y / 5, seed + 41);
  if (r > 0.78 && hash2(x, y, 5) < 0.55) return 'rock';
  return 'grass';
}

let terrain: { key: string; canvas: HTMLCanvasElement } | null = null;
function drawTerrain(ctx: CanvasRenderingContext2D, ui: UI, W: number, H: number, dpr: number) {
  const z = ui.map.zoom;
  // Cache por posição inteira + zoom: o terreno só é refeito quando a vista muda de campo.
  const cx = Math.round(ui.map.x), cy = Math.round(ui.map.y);
  const villages = Object.values(ui.g.s.villages);
  if (!occupied || occupiedCount !== villages.length) {
    occupied = new Set();
    for (const v of villages) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) occupied.add(v.x + dx + '|' + (v.y + dy));
    occupiedCount = villages.length;
    terrain = null;
  }
  const pad = 2;
  const key = `${cx},${cy},${z},${W},${H},${dpr}`;
  if (!terrain || terrain.key !== key) {
    const cv = terrain?.canvas ?? document.createElement('canvas');
    const TW = W + pad * 2 * z, TH = H + pad * 2 * z;
    cv.width = Math.round(TW * dpr); cv.height = Math.round(TH * dpr);
    const t = cv.getContext('2d')!;
    t.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ox = TW / 2 - cx * z, oy = TH / 2 - cy * z; // campo x -> px = ox + x*z
    const fx0 = Math.floor(cx - TW / 2 / z) - 1, fx1 = Math.ceil(cx + TW / 2 / z) + 1;
    const fy0 = Math.floor(cy - TH / 2 / z) - 1, fy1 = Math.ceil(cy + TH / 2 / z) + 1;
    const seed = ui.g.cfg.seed % 10000;
    for (let x = fx0; x <= fx1; x++) for (let y = fy0; y <= fy1; y++) {
      const px = ox + x * z - z / 2, py = oy + y * z - z / 2;
      const n = noise(x / 14, y / 14, seed + 5);
      const gr = Math.round(88 + n * 40), gg = Math.round(128 + n * 38), gb = Math.round(46 + n * 18);
      t.fillStyle = `rgb(${gr},${gg},${gb})`;
      t.fillRect(px, py, z + 0.6, z + 0.6);
    }
    for (let x = fx0; x <= fx1; x++) for (let y = fy0; y <= fy1; y++) {
      const type = cellType(ui, x, y);
      const px = ox + x * z, py = oy + y * z;
      const h = hash2(x, y, 99);
      if (type === 'water') {
        // Cantos arredondados só onde a água encontra terra, para os lagos terem contorno orgânico
        const wN = cellType(ui, x, y - 1) === 'water', wS = cellType(ui, x, y + 1) === 'water';
        const wW = cellType(ui, x - 1, y) === 'water', wE = cellType(ui, x + 1, y) === 'water';
        const r = z * 0.5;
        t.fillStyle = '#3f7396';
        t.beginPath();
        t.roundRect(px - z / 2, py - z / 2, z + 0.6, z + 0.6, [!wN && !wW ? r : 0, !wN && !wE ? r : 0, !wS && !wE ? r : 0, !wS && !wW ? r : 0]);
        t.fill();
        if (z >= 8 && h < 0.3) { t.strokeStyle = 'rgba(210,235,250,.5)'; t.lineWidth = 1; t.beginPath(); t.moveTo(px - z * 0.25, py); t.quadraticCurveTo(px, py - z * 0.12, px + z * 0.25, py); t.stroke(); }
      } else if (type === 'forest' && z >= 6) {
        const n = z >= 14 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const tx = px + (hash2(x, y, i + 3) - 0.5) * z * 0.5, ty = py + (hash2(x, y, i + 7) - 0.5) * z * 0.4 + z * 0.25;
          const sz = z * (0.3 + hash2(x, y, i + 11) * 0.15);
          t.fillStyle = 'rgba(0,0,0,.25)'; t.beginPath(); t.ellipse(tx + sz * 0.3, ty, sz * 0.8, sz * 0.3, 0, 0, 7); t.fill();
          t.fillStyle = h < 0.5 ? '#2d5a22' : '#356b28';
          t.beginPath(); t.moveTo(tx, ty - sz * 2); t.lineTo(tx - sz * 0.8, ty); t.lineTo(tx + sz * 0.8, ty); t.fill();
          t.fillStyle = 'rgba(255,255,255,.1)';
          t.beginPath(); t.moveTo(tx, ty - sz * 2); t.lineTo(tx - sz * 0.8, ty); t.lineTo(tx - sz * 0.1, ty); t.fill();
        }
      } else if (type === 'rock' && z >= 6) {
        t.fillStyle = '#8f8a80';
        t.beginPath(); t.moveTo(px - z * 0.4, py + z * 0.3); t.lineTo(px - z * 0.1, py - z * 0.35); t.lineTo(px + z * 0.15, py - z * 0.1); t.lineTo(px + z * 0.4, py + z * 0.3); t.fill();
        t.fillStyle = '#b2ada3';
        t.beginPath(); t.moveTo(px - z * 0.1, py - z * 0.35); t.lineTo(px + z * 0.02, py + z * 0.3); t.lineTo(px - z * 0.4, py + z * 0.3); t.fill();
      } else if (z >= 14 && h < 0.08) {
        t.fillStyle = ['#f4e37a', '#ffffff', '#e98bb0'][Math.floor(h * 37) % 3];
        t.beginPath(); t.arc(px + (h - 0.04) * z * 8, py, 1.2, 0, 7); t.fill();
      }
    }
    terrain = { key, canvas: cv };
  }
  // Posiciona o cache com o deslocamento fracionário atual
  const TW = W + pad * 2 * z, TH = H + pad * 2 * z;
  const offX = (cx - ui.map.x) * z - pad * z, offY = (cy - ui.map.y) * z - pad * z;
  ctx.drawImage(terrain.canvas, offX + (W - TW) / 2 + pad * z, offY + (H - TH) / 2 + pad * z, TW, TH);
}

/** Aldeia desenhada conforme os pontos: cabana, casas, aldeia murada, fortaleza. */
const hqImages: HTMLImageElement[] = [];
function hqImage(tier: number): HTMLImageElement | null {
  if (!hqImages.length) {
    for (let t = 1; t <= 4; t++) {
      const url = buildingSpriteUrl('main', Math.round((t - 0.5) * 7.5), 30);
      const im = new Image();
      if (url) im.src = url;
      hqImages.push(im);
    }
  }
  const im = hqImages[tier - 1];
  return im && im.complete && im.naturalWidth ? im : null;
}

function drawVillageSprite(ctx: CanvasRenderingContext2D, X: number, Y: number, z: number, points: number, owned: boolean, relColor: string) {
  // Zoom aproximado: usa o sprite ilustrado do Edifício principal conforme o porte da aldeia.
  if (z >= 24) {
    const tier = points < 300 ? 1 : points < 1500 ? 2 : points < 5000 ? 3 : 4;
    const im = hqImage(tier);
    if (im) {
      const w = z * 1.45, h = (w * im.naturalHeight) / im.naturalWidth;
      ctx.save();
      ctx.fillStyle = relColor; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(X, Y + z * 0.32, z * 0.62, z * 0.22, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      if (!owned) ctx.filter = 'grayscale(.75) brightness(.95)';
      ctx.drawImage(im, X - w / 2, Y + z * 0.4 - h, w, h);
      ctx.restore();
      return;
    }
  }
  const tier = points < 300 ? 0 : points < 1000 ? 1 : points < 3500 ? 2 : points < 9000 ? 3 : 4;
  const u = z / 11; // unidade de desenho
  ctx.save();
  // base colorida pela relação
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(X + u, Y + 5 * u, 8.5 * u, 3.2 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = relColor; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(X, Y + 4 * u, 8 * u, 3 * u, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  const wallC = owned ? '#e3d3ae' : '#b9b3a6';
  const roofC = owned ? '#b5532c' : '#7d7a74';
  const house = (hx: number, hy: number, w: number, h: number, roof = roofC) => {
    ctx.fillStyle = wallC; ctx.fillRect(hx - w / 2, hy - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(hx + w * 0.15, hy - h, w * 0.35, h);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(hx - w / 2 - u, hy - h); ctx.lineTo(hx, hy - h - w * 0.55); ctx.lineTo(hx + w / 2 + u, hy - h); ctx.fill();
    ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = Math.max(0.6, u * 0.6);
    ctx.strokeRect(hx - w / 2, hy - h, w, h);
    ctx.fillStyle = '#3b2412'; ctx.fillRect(hx - w * 0.12, hy - h * 0.5, w * 0.24, h * 0.5);
  };
  const tower = (tx: number, ty: number, w: number, h: number) => {
    ctx.fillStyle = '#9d9a92'; ctx.fillRect(tx - w / 2, ty - h, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(tx - w / 2, ty - h, w * 0.35, h);
    ctx.fillStyle = '#8a867e';
    for (let i = 0; i < 3; i++) ctx.fillRect(tx - w / 2 + i * w * 0.4, ty - h - u * 1.5, w * 0.22, u * 1.5);
    ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = Math.max(0.6, u * 0.6); ctx.strokeRect(tx - w / 2, ty - h, w, h);
  };
  if (tier >= 3) {
    // muro
    ctx.strokeStyle = tier >= 4 ? '#8f8b82' : '#7a5226'; ctx.lineWidth = u * 1.6;
    ctx.beginPath(); ctx.ellipse(X, Y + u, 8 * u, 4.5 * u, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
  }
  if (tier === 0) house(X, Y + 3 * u, 6 * u, 4 * u, owned ? '#c9a44e' : '#8d8a84');
  else if (tier === 1) { house(X - 2.5 * u, Y + 3 * u, 6 * u, 4.5 * u); house(X + 3 * u, Y + 4 * u, 5 * u, 3.5 * u, owned ? '#c9a44e' : '#8d8a84'); }
  else if (tier === 2) { house(X - 3.5 * u, Y + 3 * u, 5.5 * u, 4.5 * u); house(X + 3.5 * u, Y + 3 * u, 5.5 * u, 4.5 * u); house(X, Y + 5 * u, 6.5 * u, 4.5 * u); }
  else if (tier === 3) { tower(X + 4.5 * u, Y + 2 * u, 3 * u, 9 * u); house(X - 2 * u, Y + 3 * u, 7 * u, 5 * u); house(X + 1 * u, Y + 5.5 * u, 5 * u, 3.5 * u); }
  else { tower(X - 5 * u, Y + 3 * u, 3.2 * u, 10 * u); tower(X + 5 * u, Y + 3 * u, 3.2 * u, 10 * u); house(X, Y + 3 * u, 8 * u, 7 * u); tower(X, Y - 3 * u, 3.5 * u, 8 * u); }
  // bandeira da relação
  if (owned) {
    const fx = X + 6.5 * u, fy = Y - 6 * u;
    ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = Math.max(0.8, u * 0.7);
    ctx.beginPath(); ctx.moveTo(fx, fy + 8 * u); ctx.lineTo(fx, fy - 2 * u); ctx.stroke();
    ctx.fillStyle = relColor; ctx.fillRect(fx, fy - 2 * u, 4 * u, 2.6 * u);
    ctx.strokeRect(fx, fy - 2 * u, 4 * u, 2.6 * u);
  }
  ctx.restore();
}
