import type { Village } from '../../engine/types';
import { distance, fmtNum } from '../../engine/util';
import { watchtowerRadius } from '../../data/tables';
import { action, registerScreen, type UI } from '../app';
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
  // fundo
  ctx.fillStyle = '#5f8b33';
  ctx.fillRect(0, 0, W, H);
  const x0 = Math.floor(ui.map.x - W / 2 / z) - 1, x1 = Math.ceil(ui.map.x + W / 2 / z) + 1;
  const y0 = Math.floor(ui.map.y - H / 2 / z) - 1, y1 = Math.ceil(ui.map.y + H / 2 / z) + 1;
  // textura leve determinística
  if (z >= 8) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (h % 9 === 0) {
        // pequeno bosque
        ctx.fillStyle = 'rgba(30,70,20,.55)';
        ctx.beginPath(); ctx.moveTo(sx(x), sy(y) - z * 0.35); ctx.lineTo(sx(x) - z * 0.22, sy(y) + z * 0.15); ctx.lineTo(sx(x) + z * 0.22, sy(y) + z * 0.15); ctx.fill();
      } else if (h % 23 === 0) { ctx.fillStyle = 'rgba(140,130,110,.55)'; ctx.beginPath(); ctx.arc(sx(x), sy(y), z * 0.2, 0, 7); ctx.fill(); }
    }
  }
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
    ctx.fillStyle = REL_COLOR[rel];
    if (z >= 14) {
      // casinha
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(X - s / 2 + 2, Y - s / 2 + 2, s, s * 0.8);
      ctx.fillStyle = REL_COLOR[rel]; ctx.fillRect(X - s / 2, Y - s / 3, s, s * 0.8);
      ctx.fillStyle = v.ownerId ? '#8e3c1d' : '#6b6b6b';
      ctx.beginPath(); ctx.moveTo(X - s / 2 - 2, Y - s / 3); ctx.lineTo(X, Y - s * 0.9); ctx.lineTo(X + s / 2 + 2, Y - s / 3); ctx.fill();
      ctx.strokeStyle = '#1b1208'; ctx.lineWidth = 1; ctx.strokeRect(X - s / 2, Y - s / 3, s, s * 0.8);
    } else {
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
