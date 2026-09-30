import { BUILDINGS, BUILDING_ORDER, buildingCost, type BuildingId } from '../../data/buildings';
import {
  CHURCH_RADIUS, baseProduction, farmCapacity, hideCapacity, storageCapacity, wallBasicDefense, wallBonus, watchtowerRadius,
} from '../../data/tables';
import { COIN_COST, UNITS, UNIT_ORDER, WEAPONS, type UnitId } from '../../data/units';
import { MAX_BUILD_QUEUE } from '../../engine/game';
import type { RecruitBuilding } from '../../engine/types';
import { HOUR } from '../../engine/util';
import { action, registerScreen, type UI } from '../app';
import { cd, costHtml, dur, esc, icon, num, uicon } from '../h';
import { renderMarket } from './market';
import { renderPlace } from './place';

function header(ui: UI, b: BuildingId): string {
  const v = ui.village();
  const def = BUILDINGS[b];
  const lvl = v.buildings[b];
  return `<div class="box"><div class="head">${esc(def.name)} (nível ${lvl}) <span class="grow"></span><a data-act="nav" data-s="village">« Voltar à aldeia</a></div>
    <div class="body"><p style="margin:0">${esc(def.desc)}</p>
    ${lvl < def.max && b !== 'main' ? `<p class="small" style="margin:6px 0 0">${upgradeLine(ui, b)}</p>` : ''}</div></div>`;
}

function upgradeLine(ui: UI, b: BuildingId): string {
  const g = ui.g, v = ui.village();
  const next = g.plannedLevel(v, b) + 1;
  if (next > BUILDINGS[b].max) return 'Nível máximo planejado.';
  const cost = buildingCost(b, next);
  const err = g.canBuild(v, b);
  return `Melhorar para nível ${next}: ${costHtml(cost, v.res)} ${icon('time')} ${dur(g.buildTime(v, b, next))}
    ${err ? `<span class="err">${esc(err)}</span>` : `<button class="small green" data-act="build" data-b="${b}">Construir</button>`}`;
}

function reqText(ui: UI, reqs: Partial<Record<BuildingId, number>>): string {
  const v = ui.village();
  return Object.entries(reqs).map(([k, l]) => {
    const ok = v.buildings[k as BuildingId] >= (l ?? 0);
    return `<span class="${ok ? '' : 'err'}">${BUILDINGS[k as BuildingId].name} ${l}</span>`;
  }).join(', ');
}

// ---------------------------------------------------------------- Edifício principal
function renderMain(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const rows = BUILDING_ORDER.filter((b) => g.buildingEnabled(b) && b !== 'church_f').map((b) => {
    const def = BUILDINGS[b];
    const lvl = v.buildings[b];
    const planned = g.plannedLevel(v, b);
    const next = planned + 1;
    const reqOk = g.reqsMet(v, def.reqs);
    let action = '';
    if (planned >= def.max) action = '<span class="muted">Totalmente construído</span>';
    else if (!reqOk) action = `<span class="small">Requer: ${reqText(ui, def.reqs)}</span>`;
    else {
      const err = g.canBuild(v, b);
      const cost = buildingCost(b, next);
      action = `${costHtml(cost, v.res)} <span class="small">${icon('time')}${dur(g.buildTime(v, b, next))}</span> ` +
        (err ? `<span class="err small">${esc(err)}</span>` : `<button class="small green" data-act="build" data-b="${b}">Nível ${next}</button>`);
    }
    return `<tr><td><a data-act="open-building" data-b="${b}">${def.name}</a><br><span class="small muted">Nível ${lvl}${planned !== lvl ? ` → ${planned}` : ''}</span></td><td>${action}</td></tr>`;
  });
  const queue = v.buildQueue.map((q, i) => `<tr><td>${BUILDINGS[q.building].name}${q.demolish ? ' <span class="err">(demolir)</span>' : ''}</td><td class="num">${i === 0 ? cd(q.end) : dur(q.end - q.start)}</td><td class="small">${fmtAt(ui, q.end)}</td><td><button class="small red" data-act="cancel-build" data-i="${i}">Cancelar</button></td></tr>`);
  const canDemo = v.buildings.main >= 15;
  return `${header(ui, 'main')}
  <div class="box"><div class="head">Fila de construção (${v.buildQueue.length}/${MAX_BUILD_QUEUE})</div><div class="body">
    ${queue.length ? `<table class="vis"><tr><th>Obra</th><th class="num">Duração</th><th>Conclusão</th><th></th></tr>${queue.join('')}</table>` : '<p class="muted">Nenhuma obra na fila.</p>'}
  </div></div>
  <div class="box"><div class="head">Construir <span class="grow"></span><span class="small">Tempo de obra: ${Math.round(Math.pow(1.05, -v.buildings.main) * 100)}% do base</span></div><div class="body">
    <table class="vis"><tr><th>Edifício</th><th>Próximo nível</th></tr>${rows.join('')}</table></div></div>
  <div class="box"><div class="head">Aldeia</div><div class="body" data-form>
    <div class="flex">Nome: <input name="vname" value="${esc(v.name)}" maxlength="32"> <button data-act="rename" data-default>Renomear</button></div>
    ${canDemo ? `<div class="flex" style="margin-top:8px">Demolir: <select name="demo">${BUILDING_ORDER.filter((b) => v.buildings[b] > BUILDINGS[b].min).map((b) => `<option value="${b}">${BUILDINGS[b].name} (${v.buildings[b]})</option>`).join('')}</select> <button class="red" data-act="demolish">Demolir 1 nível</button></div>` : '<p class="small muted">Demolição disponível a partir do Edifício principal 15 (com lealdade 100).</p>'}
  </div></div>`;
}
function fmtAt(ui: UI, t: number): string {
  const d = Math.floor(t / (24 * HOUR)) + 1;
  const h = Math.floor((t % (24 * HOUR)) / HOUR), m = Math.floor((t % HOUR) / 60000);
  const today = Math.floor(ui.g.now / (24 * HOUR)) + 1;
  return `${d === today ? 'hoje' : d === today + 1 ? 'amanhã' : 'dia ' + d} às ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- Recrutamento
function renderRecruit(ui: UI, b: RecruitBuilding): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const units = UNIT_ORDER.filter((u) => UNITS[u].building === b && g.unitEnabled(u) && u !== 'knight' && u !== 'snob');
  const away = g.unitsAway(v);
  const rows = units.map((u) => {
    const d = UNITS[u];
    const err = g.canRecruitType(v, u);
    const max = err ? 0 : g.maxRecruitable(v, u);
    const total = (v.units[u] ?? 0) + (away[u] ?? 0);
    return `<tr><td>${uicon(u)} <b>${d.name}</b><br><span class="small muted">Atq ${d.att} · Def ${d.def}/${d.defCav}/${d.defArc} · Carga ${d.carry}</span></td>
      <td>${costHtml({ wood: d.wood, stone: d.stone, iron: d.iron, pop: d.pop }, v.res)}<br><span class="small">${icon('time')} ${dur(g.recruitTimePerUnit(v, u))}</span></td>
      <td class="num">${num(v.units[u] ?? 0)}/${num(total)}</td>
      <td>${err ? `<span class="err small">${esc(err)}</span>` : `<input class="unit-in" type="number" min="0" name="r_${u}" placeholder="0"> <a class="small" data-act="fill" data-name="r_${u}" data-v="${max}">(${num(max)})</a>`}</td></tr>`;
  });
  const q = v.recruit[b];
  const queue = q.map((it, i) => `<tr><td>${uicon(it.unit)} ${it.total - it.done} ${UNITS[it.unit].plural}</td><td class="num">${i === 0 ? cd(it.next) + ' (próx.)' : dur(it.perUnit * (it.total - it.done))}</td><td><button class="small red" data-act="cancel-recruit" data-b="${b}" data-i="${i}">Cancelar</button></td></tr>`);
  return `${header(ui, b as BuildingId)}
  ${q.length ? `<div class="box"><div class="head">Em treinamento — termina em ${cd(g.recruitQueueEnd(v, b))}</div><div class="body"><table class="vis">${queue.join('')}</table></div></div>` : ''}
  <div class="box"><div class="head">Recrutar</div><div class="body" data-form>
    <table class="vis"><tr><th>Unidade</th><th>Custo por unidade</th><th class="num">Aldeia/Total</th><th>Recrutar</th></tr>${rows.join('')}</table>
    <p style="text-align:right;margin:8px 0 0"><button class="green" data-act="recruit" data-b="${b}" data-default>Recrutar</button></p>
  </div></div>`;
}

// ---------------------------------------------------------------- Ferreiro
function renderSmith(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const rows = UNIT_ORDER.filter((u) => UNITS[u].research && g.unitEnabled(u)).map((u) => {
    const d = UNITS[u];
    const done = v.research[u];
    const inProg = v.researchQueue?.unit === u;
    const err = g.canResearch(v, u);
    return `<tr><td>${uicon(u)} ${d.name}</td><td class="small">${reqText(ui, d.reqs)}</td>
      <td>${done ? '<span class="ok">Pesquisado</span>' : inProg ? `Pesquisando… ${cd(v.researchQueue!.end)}` : `${costHtml(d.research!, v.res)} <span class="small">${icon('time')} ${dur(g.researchTime(v, u))}</span>`}</td>
      <td>${done || inProg ? '' : err ? `<span class="err small">${esc(err)}</span>` : `<button class="small green" data-act="research" data-u="${u}">Pesquisar</button>`}</td></tr>`;
  });
  return `${header(ui, 'smith')}<div class="box"><div class="head">Pesquisa (sistema simples)</div><div class="body">
    <p class="small muted">Lanceiros, paladino e nobres não precisam de pesquisa. Cada tipo é pesquisado uma vez por aldeia.</p>
    <table class="vis"><tr><th>Unidade</th><th>Requisitos</th><th>Custo</th><th></th></tr>${rows.join('')}</table></div></div>`;
}

// ---------------------------------------------------------------- Academia
function renderAcademy(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  if (v.buildings.snob < 1) return header(ui, 'snob') + `<div class="box"><div class="body">Requer: ${reqText(ui, BUILDINGS.snob.reqs)}</div></div>`;
  const p = g.human;
  const sl = g.nobleSlots(p.id);
  const err = g.canRecruitType(v, 'snob');
  const max = g.maxRecruitable(v, 'snob');
  const q = v.recruit.snob;
  return `${header(ui, 'snob')}
  <div class="cols2">
    <div class="box"><div class="head">Moedas de ouro</div><div class="body">
      <div class="kv"><span>Moedas cunhadas</span><b>${p.coins}</b><span>Posições de nobre</span><b>${sl.total}</b><span>Em uso (nobres + aldeias conquistadas)</span><b>${sl.used}</b><span>Moedas para a próxima posição</span><b>${sl.nextCoins}</b></div>
      <p>Custo por moeda: ${costHtml(COIN_COST, v.res)}</p>
      <div class="flex" data-form><input type="number" name="coins" min="1" value="1"> <button data-act="mint" data-default>Cunhar</button></div>
      <p class="small muted">A 1ª posição exige 1 moeda, a 2ª mais 2, a 3ª mais 3… (seção 5.1). Moedas são globais.</p>
    </div></div>
    <div class="box"><div class="head">Nobres</div><div class="body">
      <p>${uicon('snob')} Nobre: ${costHtml({ wood: 40000, stone: 50000, iron: 50000, pop: 100 }, v.res)} ${icon('time')} ${dur(g.recruitTimePerUnit(v, 'snob'))}</p>
      <p>Nobres na aldeia: <b>${v.units.snob ?? 0}</b> — Alcance máximo: <b>${g.cfg.nobleMaxDist}</b> campos</p>
      ${err ? `<p class="err">${esc(err)}</p>` : max > 0 ? `<div class="flex" data-form><input class="unit-in" type="number" name="r_snob" value="1" min="1" max="${max}"> <button class="green" data-act="recruit" data-b="snob" data-default>Treinar</button></div>` : '<p class="warn">Sem recursos, população ou posição livre.</p>'}
      ${q.length ? `<p>Em treinamento: ${q.map((it) => `${it.total - it.done}`).join(' + ')} — próximo em ${cd(q[0].next)}</p>` : ''}
      <p class="small muted">Cada ataque vencedor com nobre sobrevivente reduz a lealdade em ${g.cfg.loyaltyMin}–${g.cfg.loyaltyMax}. Em 0 ou menos, a aldeia é sua (lealdade volta a 25). Vários nobres no mesmo comando reduzem só uma vez.</p>
    </div></div>
  </div>`;
}

// ---------------------------------------------------------------- Estátua
function renderStatue(ui: UI): string {
  const g = ui.g, v = ui.village();
  const k = g.human.knight;
  if (!g.cfg.paladin) return header(ui, 'statue') + '<div class="box"><div class="body">Paladino desativado neste mundo.</div></div>';
  let where = '';
  if (k.status === 'alive') {
    const home = g.villagesOf(g.s.humanId).find((x) => (x.units.knight ?? 0) > 0);
    where = home ? `Na aldeia ${esc(home.name)}` : 'Em movimento ou apoiando outra aldeia';
  }
  const err = g.canRecruitType(v, 'knight');
  const can = !err && g.maxRecruitable(v, 'knight') > 0;
  const weapons = WEAPONS.filter((w) => k.weapons.includes(w.id));
  return `${header(ui, 'statue')}
  <div class="cols2">
  <div class="box"><div class="head">${uicon('knight')} Paladino</div><div class="body">
    <p>Status: <b>${({ none: 'Não recrutado', training: 'Em treinamento', alive: 'Vivo', dead: 'Morto' } as const)[k.status]}</b> ${where ? '— ' + where : ''}</p>
    ${k.status === 'training' ? `<p>Pronto em ${cd(v.recruit.statue[0]?.next ?? g.now)}</p>` : ''}
    ${k.status === 'none' || k.status === 'dead' ? `<p>${costHtml({ wood: 20, stone: 20, iron: 40, pop: 10 }, v.res)} ${icon('time')} ${dur(g.recruitTimePerUnit(v, 'knight'))}</p>
      ${v.buildings.statue < 1 ? '<p class="err">Construa a estátua primeiro.</p>' : can ? `<button class="green" data-act="knight">${k.status === 'dead' ? 'Reviver paladino' : 'Nomear paladino'}</button>` : `<span class="err">${esc(err ?? 'Recursos ou população insuficientes')}</span>`}` : ''}
    <p class="small muted">Atq 150 · Def 250/400/150 · Carga 100. Só pode existir um paladino. Vitórias com ele podem revelar armas lendárias.</p>
  </div></div>
  <div class="box"><div class="head">Armas (${weapons.length}/${WEAPONS.length})</div><div class="body">
    ${weapons.length ? `<table class="vis">${weapons.map((w) => `<tr class="${k.weapon === w.id ? 'hl' : ''}"><td><b>${esc(w.name)}</b><br><span class="small">${esc(w.desc)}</span></td><td>${k.weapon === w.id ? '<button class="small" data-act="equip" data-w="">Desequipar</button>' : `<button class="small green" data-act="equip" data-w="${w.id}">Equipar</button>`}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma arma encontrada ainda. Ataques vencedores com o paladino têm chance de encontrar uma.</p>'}
  </div></div></div>`;
}

// ---------------------------------------------------------------- Informativos
function levelTable(ui: UI, b: BuildingId, label: string, fn: (l: number) => string): string {
  const v = ui.village();
  const cur = v.buildings[b];
  const rows: string[] = [];
  for (let l = Math.max(1, cur - 1); l <= Math.min(BUILDINGS[b].max, cur + 5); l++) rows.push(`<tr class="${l === cur ? 'hl' : ''}"><td>Nível ${l}</td><td class="num">${fn(l)}</td></tr>`);
  return `<table class="vis"><tr><th>Nível</th><th class="num">${label}</th></tr>${rows.join('')}</table>`;
}
function renderInfo(ui: UI, b: BuildingId): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  let body = '';
  const s = g.cfg.speed;
  switch (b) {
    case 'wood': case 'stone': case 'iron':
      body = `<p>Produção atual: <b>${num(g.production(v, b))}</b>/hora</p>` + levelTable(ui, b, 'Produção/h (mundo)', (l) => num(baseProduction(l) * s));
      break;
    case 'storage': {
      const cap = g.storageCap(v);
      const full = (['wood', 'stone', 'iron'] as const).map((k) => {
        const p = g.production(v, k);
        const t = v.res[k] >= cap ? 0 : ((cap - v.res[k]) / p) * HOUR;
        return `<tr><td>${icon(k)}</td><td class="num">${v.res[k] >= cap ? '<span class="err">Cheio</span>' : 'cheio em ' + dur(t)}</td></tr>`;
      }).join('');
      body = `<p>Capacidade: <b>${num(cap)}</b> de cada recurso.</p><table class="vis">${full}</table><br>` + levelTable(ui, b, 'Capacidade', (l) => num(storageCapacity(l)));
      break;
    }
    case 'farm': {
      const mil = v.militia && v.militia.until > g.now;
      body = `<p>População: <b>${num(g.popUsed(v))}</b> / ${num(g.farmCap(v))}</p>` + levelTable(ui, b, 'Capacidade', (l) => num(farmCapacity(l)));
      if (g.cfg.militia) body += `<h3 style="margin-top:10px">${uicon('militia')} Milícia</h3>
        <p>${mil ? `Ativa: <b>${v.militia!.count}</b> milicianos até ${cd(v.militia!.until)}. A produção está reduzida em 50%.` : `Convoca <b>${Math.min(v.buildings.farm, 15) * 20}</b> camponeses para defender (Def 15/45/25) por ${dur((6 * HOUR) / s)}. A produção cai 50% enquanto isso.`}</p>
        <button class="${mil ? '' : 'red'}" data-act="militia">${mil ? 'Dispensar milícia' : 'Convocar milícia'}</button>`;
      break;
    }
    case 'hide':
      body = `<p>Protege <b>${num(hideCapacity(v.buildings.hide))}</b> de cada recurso contra saques e exploradores.</p>` + levelTable(ui, b, 'Proteção', (l) => num(hideCapacity(l)));
      break;
    case 'wall':
      body = `<p>Bônus de defesa: <b>+${Math.round((wallBonus(v.buildings.wall) - 1) * 100)}%</b> · Defesa básica: <b>${wallBasicDefense(v.buildings.wall)}</b></p>` + levelTable(ui, b, 'Bônus / defesa básica', (l) => `+${Math.round((wallBonus(l) - 1) * 100)}% / ${wallBasicDefense(l)}`);
      break;
    case 'watchtower':
      body = `<p>Raio atual: <b>${watchtowerRadius(v.buildings.watchtower)}</b> campos. Ataques dentro do raio mostram a unidade mais lenta.</p>` + levelTable(ui, b, 'Raio', (l) => String(watchtowerRadius(l)));
      break;
    case 'church': case 'church_f':
      body = `<p>Raio de fé: <b>${Math.max(CHURCH_RADIUS[v.buildings.church] ?? 0, v.buildings.church_f ? 4 : 0)}</b> campos. Esta aldeia ${g.faith(v) >= 1 ? '<span class="ok">tem fé</span>' : '<span class="err">não tem fé</span>'}.</p>`;
      break;
    case 'market':
      return renderMarket(ui);
    default:
      body = '';
  }
  return header(ui, b) + (body ? `<div class="box"><div class="body">${body}</div></div>` : '');
}

registerScreen('building', {
  render(ui) {
    const b = ui.building ?? 'main';
    const v = ui.village();
    if (!ui.g.buildingEnabled(b)) return '<div class="box"><div class="body">Edifício desativado neste mundo.</div></div>';
    if (v.buildings[b] < 1 && b !== 'main' && b !== 'statue' && b !== 'snob') {
      return header(ui, b) + `<div class="box"><div class="body">Este edifício ainda não foi construído. ${Object.keys(BUILDINGS[b].reqs).length ? 'Requisitos: ' + reqText(ui, BUILDINGS[b].reqs) : ''}</div></div>`;
    }
    switch (b) {
      case 'main': return renderMain(ui);
      case 'barracks': case 'stable': case 'garage': return renderRecruit(ui, b);
      case 'smith': return renderSmith(ui);
      case 'snob': return renderAcademy(ui);
      case 'statue': return renderStatue(ui);
      case 'place': return header(ui, 'place') + renderPlace(ui);
      default: return renderInfo(ui, b);
    }
  },
});

// ---------------------------------------------------------------- ações
action('build', (ui, el) => {
  const b = el.dataset.b as BuildingId;
  ui.result(ui.g.build(ui.vid, b), `${BUILDINGS[b].name} adicionado à fila.`);
});
action('cancel-build', (ui, el) => ui.result(ui.g.cancelBuild(ui.vid, Number(el.dataset.i)), 'Obra cancelada, recursos devolvidos.'));
action('demolish', (ui) => {
  const sel = document.querySelector<HTMLSelectElement>('select[name=demo]');
  if (sel) ui.result(ui.g.demolish(ui.vid, sel.value as BuildingId), 'Demolição na fila.');
});
action('rename', (ui) => {
  const inp = document.querySelector<HTMLInputElement>('input[name=vname]');
  const name = inp?.value.trim();
  if (!name) return;
  ui.village().name = name.slice(0, 32);
  ui.g.changed();
  ui.result(null, 'Aldeia renomeada.');
});
action('fill', (_ui, el) => {
  const inp = document.querySelector<HTMLInputElement>(`input[name="${el.dataset.name}"]`);
  if (inp) { inp.value = el.dataset.v ?? '0'; inp.focus(); }
});
action('recruit', (ui, el) => {
  const b = el.dataset.b as RecruitBuilding;
  let any = false;
  const msgs: string[] = [];
  for (const u of UNIT_ORDER) {
    const inp = document.querySelector<HTMLInputElement>(`input[name="r_${u}"]`);
    const n = inp ? Math.floor(Number(inp.value)) : 0;
    if (!n || n <= 0) continue;
    any = true;
    const err = ui.g.recruit(ui.vid, u, n);
    if (err) msgs.push(`${UNITS[u].name}: ${err}`);
    else if (inp) inp.value = '';
  }
  if (!any) return ui.result('Informe a quantidade.');
  document.querySelectorAll<HTMLInputElement>('input[name^="r_"]').forEach((i) => { i.value = ''; });
  ui.result(msgs.length ? msgs.join(' · ') : null, 'Recrutamento iniciado.');
  void b;
});
action('cancel-recruit', (ui, el) => ui.result(ui.g.cancelRecruit(ui.vid, el.dataset.b as RecruitBuilding, Number(el.dataset.i)), 'Recrutamento cancelado (90% dos recursos devolvidos).'));
action('research', (ui, el) => ui.result(ui.g.research(ui.vid, el.dataset.u as UnitId), 'Pesquisa iniciada.'));
action('mint', (ui) => {
  const n = Math.max(1, Math.floor(Number(document.querySelector<HTMLInputElement>('input[name=coins]')?.value ?? 1)));
  ui.result(ui.g.mintCoin(ui.vid, n), `${n} moeda(s) cunhada(s).`);
});
action('knight', (ui) => ui.result(ui.g.recruit(ui.vid, 'knight', 1), 'O paladino está sendo treinado.'));
action('equip', (ui, el) => ui.result(ui.g.equipWeapon(ui.g.s.humanId, el.dataset.w || null), el.dataset.w ? 'Arma equipada.' : 'Arma removida.'));
action('militia', (ui) => ui.result(ui.g.toggleMilitia(ui.vid)));
