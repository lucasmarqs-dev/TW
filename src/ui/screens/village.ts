import { BUILDINGS, BUILDING_ORDER } from '../../data/buildings';
import { UNITS, UNIT_ORDER, type UnitId } from '../../data/units';
import { unitList } from '../../engine/game';
import { action, registerScreen, type UI } from '../app';
import { cd, coords, esc, icon, num, uicon } from '../h';
import { villageScene } from '../scene';

function movements(ui: UI): string {
  const g = ui.g, v = ui.village();
  const rows: string[] = [];
  const cmds = Object.values(g.s.commands)
    .filter((c) => c.fromId === v.id || c.toId === v.id)
    .filter((c) => c.ownerId === g.s.humanId || (c.type === 'attack' || c.type === 'support') && c.toId === v.id)
    .sort((a, b) => a.arrival - b.arrival)
    .slice(0, 12);
  for (const c of cmds) {
    const other = g.s.villages[c.toId === v.id ? c.fromId : c.toId];
    const incoming = c.toId === v.id && c.ownerId !== g.s.humanId;
    let label = '';
    if (c.type === 'attack') label = incoming ? `<span class="err">⚔ Ataque de ${esc(g.ownerName(other))}</span>` : `⚔ Ataque a ${esc(other.name)}`;
    else if (c.type === 'support') label = incoming ? `🛡 Apoio de ${esc(g.ownerName(other))}` : `🛡 Apoio a ${esc(other.name)}`;
    else if (c.type === 'return') label = `↩ Retorno de ${esc(other.name)}`;
    else if (c.type === 'trade') label = c.toId === v.id ? `🛒 Recursos chegando` : `🛒 Mercadores para ${esc(other.name)}`;
    else label = `🛒 Mercadores voltando`;
    rows.push(`<tr><td>${label}</td><td class="num">${cd(c.arrival)}</td></tr>`);
  }
  return rows.length ? `<table class="vis">${rows.join('')}</table>` : '<p class="muted">Nenhum movimento.</p>';
}

registerScreen('village', {
  render(ui) {
    const g = ui.g, v = ui.village();
    g.update(v);
    const building = new Set(v.buildQueue.map((q) => q.building as string));
    const list = ui.tab === 'list';
    const troops = unitList(v.units);
    const supportsHere = v.supports.length;
    const loyalty = Math.floor(v.loyalty);
    const mil = v.militia && v.militia.until > g.now ? v.militia.count : 0;
    const scene = list
      ? `<table class="vis"><tr><th>Edifício</th><th class="num">Nível</th><th></th></tr>${BUILDING_ORDER.filter((b) => g.buildingEnabled(b)).map((b) => `<tr><td><a data-act="open-building" data-b="${b}">${BUILDINGS[b].name}</a></td><td class="num">${v.buildings[b]}${building.has(b) ? ' ⚒' : ''}</td><td class="small muted">${esc(BUILDINGS[b].desc)}</td></tr>`).join('')}</table>`
      : `<div class="scene-wrap">${villageScene(v, building, g.isNight(), !reducedMotion())}</div>`;
    return `
    <div class="cols">
      <div>
        <div class="box"><div class="head">${esc(v.name)} (${coords(v)}) — ${num(v.points)} pontos
          <span class="grow"></span><a data-act="village-mode">${list ? '🖼 Ilustração' : '☰ Lista'}</a></div>
          <div class="body" style="padding:6px">${scene}</div></div>
      </div>
      <div>
        <div class="box"><div class="head">Produção</div><div class="body">
          <table class="vis">
            ${(['wood', 'stone', 'iron'] as const).map((k) => `<tr><td>${icon(k)} ${k === 'wood' ? 'Madeira' : k === 'stone' ? 'Argila' : 'Ferro'}</td><td class="num"><b>${num(g.production(v, k))}</b>/hora</td></tr>`).join('')}
          </table>
          ${v.bonus ? `<p class="ok small">Aldeia bônus: ${bonusName(v.bonus)}</p>` : ''}
          ${mil ? `<p class="warn small">Milícia ativa (${mil}) — produção reduzida em 50% até ${cd(v.militia!.until)}</p>` : ''}
        </div></div>
        <div class="box"><div class="head">Tropas <span class="grow"></span><a data-act="open-building" data-b="place">Ponto de encontro</a></div><div class="body">
          ${troops.length ? `<table class="vis">${troops.map(([u, n]) => `<tr><td>${uicon(u)} ${UNITS[u].name}</td><td class="num">${num(n)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma tropa em casa.</p>'}
          ${mil ? `<p>${uicon('militia')} Milícia: ${mil}</p>` : ''}
          ${supportsHere ? `<p class="small">🛡 ${supportsHere} apoio(s) estacionado(s) aqui.</p>` : ''}
        </div></div>
        <div class="box"><div class="head">Movimentos</div><div class="body">${movements(ui)}</div></div>
        <div class="box"><div class="head">Construção</div><div class="body">
          ${v.buildQueue.length ? `<table class="vis">${v.buildQueue.map((q) => `<tr><td>${BUILDINGS[q.building].name}${q.demolish ? ' (demolir)' : ''}</td><td class="num">${cd(q.end)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma obra. <a data-act="open-building" data-b="main">Construir</a></p>'}
          ${recruitSummary(ui)}
        </div></div>
        <div class="box"><div class="head">Aldeia</div><div class="body kv">
          <span>${icon('loyalty')} Lealdade</span><b>${loyalty}</b>
          <span>Continente</span><b>K${Math.floor(v.y / 100)}${Math.floor(v.x / 100)}</b>
          ${g.cfg.church ? `<span>Fé</span><b>${g.faith(v) >= 1 ? '<span class="ok">Sim</span>' : '<span class="err">Não (tropas a 50%)</span>'}</b>` : ''}
          <span>Proteção</span><b>${g.isProtected(g.s.humanId) ? `ativa por ${cd(g.cfg.protectionDays * 86400000)}` : 'encerrada'}</b>
        </div></div>
      </div>
    </div>`;
  },
});

function recruitSummary(ui: UI): string {
  const v = ui.village();
  const rows: string[] = [];
  for (const b of Object.keys(v.recruit) as (keyof typeof v.recruit)[]) {
    const q = v.recruit[b];
    if (!q.length) continue;
    const left: Partial<Record<UnitId, number>> = {};
    for (const it of q) left[it.unit] = (left[it.unit] ?? 0) + it.total - it.done;
    rows.push(`<tr><td>${BUILDINGS[b].name}</td><td>${UNIT_ORDER.filter((u) => left[u]).map((u) => `${uicon(u)}${left[u]}`).join(' ')}</td><td class="num">${cd(ui.g.recruitQueueEnd(v, b))}</td></tr>`);
  }
  return rows.length ? `<h3 style="margin-top:8px">Recrutamento</h3><table class="vis">${rows.join('')}</table>` : '';
}

export function bonusName(b: string): string {
  return ({
    wood: '+100% produção de madeira', stone: '+100% produção de argila', iron: '+100% produção de ferro', all: '+30% produção de recursos',
    farm: '+10% população', storage: '+50% capacidade do armazém', barracks: '+33% velocidade do quartel', stable: '+33% velocidade do estábulo',
    market: '+50% mercadores',
  } as Record<string, string>)[b] ?? b;
}

action('village-mode', (ui) => { ui.tab = ui.tab === 'list' ? '' : 'list'; ui.render(); });

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
