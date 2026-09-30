import { BUILDINGS, type BuildingId } from '../../data/buildings';
import { SCAVENGE_OPTIONS, SCAVENGE_UNITS, UNITS, UNIT_ORDER, type UnitId, type Units } from '../../data/units';
import { moraleFor, resolveBattle } from '../../engine/combat';
import { unitList } from '../../engine/game';
import { distance, fmtGameTime, unitCount, unitsCarry } from '../../engine/util';
import { humanRequestSupport } from '../../engine/bots';
import { action, type UI } from '../app';
import { cd, costHtml, dur, esc, num, uicon, unitsInline } from '../h';

const TABS: [string, string][] = [['', 'Comandos'], ['troops', 'Tropas'], ['farm', 'Assistente de saque'], ['sim', 'Simulador'], ['scav', 'Coleta']];

export function renderPlace(ui: UI): string {
  const tabs = `<div class="tabs">${TABS.filter(([t]) => t !== 'scav' || ui.g.cfg.scavenging).map(([t, l]) => `<a class="${ui.tab === t ? 'active' : ''}" data-act="tab" data-t="${t}">${l}</a>`).join('')}</div>`;
  let body = '';
  if (ui.tab === 'troops') body = troopsTab(ui);
  else if (ui.tab === 'sim') body = simTab(ui);
  else if (ui.tab === 'scav') body = scavTab(ui);
  else if (ui.tab === 'farm') body = farmTab(ui);
  else body = commandsTab(ui);
  return `<div class="box"><div class="body">${tabs}${body}</div></div>`;
}

function unitInputs(ui: UI, prefix: string, units: Units, filter: (u: UnitId) => boolean = () => true): string {
  const g = ui.g;
  const list = UNIT_ORDER.filter((u) => g.unitEnabled(u) && filter(u));
  return `<table class="vis" style="width:auto"><tr>${list.map((u) => `<th style="text-align:center">${uicon(u)}</th>`).join('')}</tr>
    <tr>${list.map((u) => `<td><input class="unit-in" type="number" min="0" name="${prefix}${u}" placeholder="0"><br><a class="small" data-act="fill" data-name="${prefix}${u}" data-v="${units[u] ?? 0}">(${num(units[u] ?? 0)})</a></td>`).join('')}</tr></table>`;
}
function readUnits(prefix: string): Units {
  const u: Units = {};
  for (const id of UNIT_ORDER) {
    const inp = document.querySelector<HTMLInputElement>(`input[name="${prefix}${id}"]`);
    const n = inp ? Math.floor(Number(inp.value)) : 0;
    if (n > 0) u[id] = n;
  }
  return u;
}

function commandsTab(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const t = ui.target;
  let confirm = '';
  if (ui.pendingSend) {
    const p = ui.pendingSend;
    const tv = g.s.villages[p.targetId];
    const d = distance(v, tv);
    const time = g.travelTime(v, tv, p.units);
    const mor = g.cfg.morale && tv.ownerId && p.type === 'attack' ? Math.round(moraleFor(g.playerPoints(g.s.humanId), g.playerPoints(tv.ownerId)) * 100) : 100;
    const cats = (p.units.catapult ?? 0) > 0;
    confirm = `<div class="box" style="border-color:#6b4b1b"><div class="head">Confirmar ${p.type === 'attack' ? 'ataque' : 'apoio'}</div><div class="body">
      <div class="kv"><span>Destino</span><b>${esc(tv.name)} (${tv.x}|${tv.y}) — ${esc(g.ownerName(tv))}</b>
      <span>Distância</span><b>${d.toFixed(1)} campos</b>
      <span>Duração</span><b>${dur(time)}</b>
      <span>Chegada</span><b>${fmtGameTime(g.now + time)}</b>
      ${p.type === 'attack' ? `<span>Moral</span><b>${mor}%</b><span>Carga</span><b>${num(unitsCarry(p.units))}</b>` : ''}
      <span>Tropas</span><b>${unitsInline(p.units)}</b></div>
      ${cats ? `<p>Alvo das catapultas: <select name="cattarget">${(Object.keys(BUILDINGS) as BuildingId[]).filter((b) => g.buildingEnabled(b) && b !== 'place' && b !== 'church_f').map((b) => `<option value="${b}" ${b === p.cat ? 'selected' : ''}>${BUILDINGS[b].name}</option>`).join('')}</select></p>` : ''}
      ${g.isNight(g.now + time) && tv.ownerId && p.type === 'attack' ? '<p class="warn">⚠ Chegará durante o bônus noturno: a defesa estará dobrada.</p>' : ''}
      <p><button class="${p.type === 'attack' ? 'red' : 'green'}" data-act="send-confirm">${p.type === 'attack' ? '⚔ Enviar ataque' : '🛡 Enviar apoio'}</button> <button class="ghost" data-act="send-cancel">Cancelar</button></p>
    </div></div>`;
  }
  const tvil = t ? Object.values(g.s.villages).find((x) => x.x === t.x && x.y === t.y) : null;
  const out = Object.values(g.s.commands).filter((c) => c.ownerId === g.s.humanId && (c.fromId === v.id && (c.type === 'attack' || c.type === 'support') || c.toId === v.id && c.type === 'return')).sort((a, b) => a.arrival - b.arrival);
  const inc = Object.values(g.s.commands).filter((c) => c.toId === v.id && c.ownerId !== g.s.humanId && (c.type === 'attack' || c.type === 'support')).sort((a, b) => a.arrival - b.arrival);
  return `${confirm}
  <div data-form>
    <div class="flex" style="margin-bottom:8px">Alvo: <input class="coord" name="tx" placeholder="x" value="${t?.x ?? ''}"> | <input class="coord" name="ty" placeholder="y" value="${t?.y ?? ''}">
      ${tvil ? `<span>${esc(tvil.name)} — ${esc(g.ownerName(tvil))} (${num(tvil.points)} pts, ${distance(v, tvil).toFixed(1)} campos)</span>` : '<span class="small muted">Escolha no mapa ou digite as coordenadas.</span>'}
    </div>
    ${unitInputs(ui, 's_', v.units)}
    <div class="flex" style="margin-top:8px">
      <a data-act="fill-all">Todas as tropas</a>
      <span class="grow"></span>
      <button class="red" data-act="send" data-type="attack" data-default>⚔ Ataque</button>
      <button class="green" data-act="send" data-type="support">🛡 Apoio</button>
    </div>
  </div>
  <h3 style="margin-top:14px">Suas tropas em movimento</h3>
  ${out.length ? `<table class="vis"><tr><th>Comando</th><th>Tropas</th><th class="num">Chegada</th><th></th></tr>${out.map((c) => {
    const other = g.s.villages[c.type === 'return' ? c.fromId : c.toId];
    const label = c.type === 'attack' ? '⚔ Ataque a' : c.type === 'support' ? '🛡 Apoio a' : '↩ Retorno de';
    return `<tr><td>${label} ${esc(other?.name ?? '?')} (${other?.x}|${other?.y})</td><td class="small">${unitsInline(c.units)}${c.res ? ' + saque ' + num(c.res.wood + c.res.stone + c.res.iron) : ''}</td><td class="num">${cd(c.arrival)}</td><td>${g.canCancel(c) ? `<button class="small" data-act="cancel-cmd" data-c="${c.id}">Cancelar</button>` : ''}</td></tr>`;
  }).join('')}</table>` : '<p class="muted">Nenhuma.</p>'}
  <h3 style="margin-top:14px">Chegando a esta aldeia</h3>
  ${inc.length ? `<table class="vis"><tr><th>Comando</th><th>Origem</th><th class="num">Chegada</th></tr>${inc.map((c) => {
    const f = g.s.villages[c.fromId];
    const seen = c.type === 'attack' && g.watchtowerSees(c) && c.slowest ? ` (${uicon(c.slowest)} ${UNITS[c.slowest].name})` : '';
    return `<tr><td>${c.type === 'attack' ? `<span class="err">⚔ Ataque${seen}</span>` : '🛡 Apoio'}</td><td>${esc(f?.name ?? '?')} (${f?.x}|${f?.y}) — ${esc(g.s.players[c.ownerId]?.name ?? '?')}</td><td class="num">${cd(c.arrival)}</td></tr>`;
  }).join('')}</table>
    ${inc.some((c) => c.type === 'attack') && g.human.tribeId ? `<p><button data-act="req-support">Pedir apoio à tribo</button></p>` : ''}` : '<p class="muted">Nada chegando.</p>'}`;
}

function troopsTab(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const home = unitList(v.units);
  const away = g.unitsAway(v);
  const stationed: string[] = [];
  for (const o of Object.values(g.s.villages)) {
    o.supports.forEach((s, i) => {
      if (s.homeId === v.id && s.ownerId === g.s.humanId) stationed.push(`<tr><td>${esc(o.name)} (${o.x}|${o.y}) — ${esc(g.ownerName(o))}</td><td class="small">${unitsInline(s.units)}</td><td><button class="small" data-act="withdraw" data-v="${o.id}" data-i="${i}">Retirar</button></td></tr>`);
    });
  }
  return `
  <h3>Na aldeia</h3>${home.length ? `<table class="vis">${home.map(([u, n]) => `<tr><td>${uicon(u)} ${UNITS[u].name}</td><td class="num">${num(n)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma.</p>'}
  <h3 style="margin-top:12px">Fora da aldeia</h3><p>${unitsInline(away, 'Nenhuma.')}</p>
  <h3 style="margin-top:12px">Apoios estacionados aqui</h3>
  ${v.supports.length ? `<table class="vis"><tr><th>De</th><th>Tropas</th><th></th></tr>${v.supports.map((s, i) => {
    const h = g.s.villages[s.homeId];
    return `<tr><td>${esc(g.s.players[s.ownerId]?.name ?? '?')} — ${esc(h?.name ?? '?')}</td><td class="small">${unitsInline(s.units)}</td><td><button class="small" data-act="sendback" data-i="${i}">Mandar de volta</button></td></tr>`;
  }).join('')}</table>` : '<p class="muted">Nenhum.</p>'}
  <h3 style="margin-top:12px">Suas tropas apoiando outras aldeias</h3>
  ${stationed.length ? `<table class="vis">${stationed.join('')}</table>` : '<p class="muted">Nenhuma.</p>'}`;
}

let simResult = '';
function simTab(ui: UI): string {
  const g = ui.g;
  const list = UNIT_ORDER.filter((u) => g.unitEnabled(u));
  return `<div data-form>
  <table class="vis" style="width:auto"><tr><th>Unidade</th>${list.map((u) => `<th style="text-align:center">${uicon(u)}</th>`).join('')}</tr>
    <tr><td>Atacante</td>${list.map((u) => `<td><input class="unit-in" type="number" min="0" name="sa_${u}"></td>`).join('')}</tr>
    <tr><td>Defensor</td>${list.map((u) => `<td><input class="unit-in" type="number" min="0" name="sd_${u}"></td>`).join('')}</tr></table>
  <div class="flex" style="margin-top:8px">
    Muralha <input type="number" name="sim_wall" min="0" max="20" value="0" style="width:60px">
    Moral % <input type="number" name="sim_mor" min="30" max="100" value="100" style="width:60px">
    Sorte % <input type="number" name="sim_luck" min="-25" max="25" value="0" style="width:60px">
    Milícia <input type="number" name="sim_mil" min="0" value="0" style="width:60px">
    <label><input type="checkbox" name="sim_night"> Noite</label>
    ${g.cfg.church ? '<label><input type="checkbox" name="sim_fa" checked> Fé atacante</label><label><input type="checkbox" name="sim_fd" checked> Fé defensor</label>' : ''}
    Alvo catapulta <input type="number" name="sim_cat" min="0" max="30" value="0" style="width:60px">
    <button data-act="simulate" data-default>Simular</button>
    <a data-act="sim-mine" class="small">usar minhas tropas como atacante</a>
  </div></div>
  <div id="simres">${simResult}</div>
  <p class="small muted">Fórmula reconstruída (referência 4.1–4.3): defesa ponderada pela composição do ataque, perdas com expoente 3/2, muralha ×B₁ + defesa básica.</p>`;
}

function scavTab(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const rows = SCAVENGE_OPTIONS.map((o, i) => {
    const run = v.scavenge.runs.find((r) => r.option === i);
    let content = '';
    if (!v.scavenge.unlocked[i]) {
      const prevOk = i === 0 || v.scavenge.unlocked[i - 1];
      content = `Bloqueada. Liberar por ${costHtml(o.unlock, v.res)} ${prevOk ? `<button class="small" data-act="scav-unlock" data-o="${i}">Liberar</button>` : '<span class="small muted">(libere a anterior)</span>'}`;
    } else if (run) {
      content = `Em andamento: ${unitsInline(run.units)} — retorna com ~${num(run.loot)} recursos em ${cd(run.end)}`;
    } else {
      content = `<div data-form>${unitInputs(ui, `sc${i}_`, v.units, (u) => SCAVENGE_UNITS.includes(u))}<div class="flex" style="margin-top:4px"><button class="green small" data-act="scav-start" data-o="${i}" data-default>Iniciar</button><span class="small muted">Rende ${Math.round(o.factor * 100)}% da capacidade de carga.</span></div></div>`;
    }
    return `<tr><td style="width:170px"><b>${o.name}</b><br><span class="small">${Math.round(o.factor * 100)}% da carga</span></td><td>${content}</td></tr>`;
  });
  return `<p class="small">Tropas em coleta ficam indisponíveis até voltar e não podem ser chamadas de volta. Recursos acima do armazém são perdidos.</p>
    <p><button class="small" data-act="scav-auto">Distribuir tropas disponíveis automaticamente</button></p>
    <table class="vis">${rows.join('')}</table>`;
}

// ---------------------------------------------------------------- assistente de saque
const TEMPLATE_KEY = 'tw-offline-farm-templates';
function loadTemplates(): { a: Units; b: Units } {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '') as { a: Units; b: Units }; } catch { return { a: { light: 5 }, b: { axe: 20, spy: 1 } }; }
}
function farmTab(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const tpl = loadTemplates();
  const list = UNIT_ORDER.filter((u) => g.unitEnabled(u) && u !== 'snob' && u !== 'knight');
  const tplRow = (key: 'a' | 'b') => `<tr><td><b>${key.toUpperCase()}</b></td>${list.map((u) => `<td><input class="unit-in" type="number" min="0" name="ft${key}_${u}" value="${tpl[key][u] ?? ''}"></td>`).join('')}<td class="num">${num(unitsCarry(tpl[key]))}</td></tr>`;
  const targets = Object.values(g.s.villages)
    .filter((x) => !x.ownerId && x.id !== v.id)
    .map((x) => ({ x, d: distance(v, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 40);
  const rows = targets.map(({ x, d }) => {
    const rep = g.s.reports.find((r) => r.defender?.villageId === x.id && r.attacker?.playerId === g.s.humanId);
    const loot = rep?.loot ? rep.loot.wood + rep.loot.stone + rep.loot.iron : null;
    const full = rep?.loot && rep.lootCap && loot! >= rep.lootCap;
    const onWay = Object.values(g.s.commands).filter((c) => c.ownerId === g.s.humanId && c.type === 'attack' && c.toId === x.id).length;
    return `<tr><td>${rep ? `<span class="dot ${rep.color}"></span>` : ''}${esc(x.name)} (${x.x}|${x.y})${x.bonus ? ' ★' : ''}</td><td class="num">${d.toFixed(1)}</td><td class="num">${num(x.points)}</td>
      <td class="small">${rep ? `${loot !== null ? `${num(loot)}${full ? ' <b title="carga cheia">⬆</b>' : ''}` : '—'} · muralha ${rep.wallAfter ?? '?'}` : '<span class="muted">sem relatório</span>'}</td>
      <td>${onWay ? `<span class="small">${onWay} a caminho</span> ` : ''}<button class="small" data-act="farm-send" data-k="a" data-v="${x.id}">A</button> <button class="small" data-act="farm-send" data-k="b" data-v="${x.id}">B</button>${rep ? ` <a class="small" data-act="open-report" data-r="${rep.id}">relatório</a>` : ''}</td></tr>`;
  });
  return `<div data-form><table class="vis" style="width:auto"><tr><th>Modelo</th>${list.map((u) => `<th style="text-align:center">${uicon(u)}</th>`).join('')}<th>Carga</th></tr>${tplRow('a')}${tplRow('b')}</table>
    <p><button class="small" data-act="farm-save" data-default>Salvar modelos</button> <span class="small muted">Em casa: ${unitsInline(v.units)}</span></p></div>
    <table class="vis"><tr><th>Aldeia bárbara</th><th class="num">Dist.</th><th class="num">Pontos</th><th>Último saque</th><th></th></tr>${rows.join('')}</table>
    <p class="small muted">Verde: vitória sem perdas · amarelo: com perdas · vermelho: derrota. ⬆ indica que a carga voltou cheia (mande mais tropas).</p>`;
}

// ---------------------------------------------------------------- ações
action('farm-save', (ui) => {
  const t = { a: readUnits('fta_'), b: readUnits('ftb_') };
  try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t)); } catch { /* ignore */ }
  ui.result(null, 'Modelos salvos.');
});
action('farm-send', (ui, el) => {
  const tpl = loadTemplates()[el.dataset.k as 'a' | 'b'];
  if (!unitCount(tpl)) return ui.result('Modelo vazio.');
  const t = ui.g.s.villages[el.dataset.v!];
  ui.result(ui.g.send(ui.vid, t.id, 'attack', tpl), `Saque enviado para ${t.name} (${t.x}|${t.y}).`);
});
action('tab', (ui, el) => { ui.tab = el.dataset.t ?? ''; ui.pendingSend = null; ui.flash = null; ui.render(); });
action('fill-all', (ui) => {
  const v = ui.village();
  for (const u of UNIT_ORDER) {
    const inp = document.querySelector<HTMLInputElement>(`input[name="s_${u}"]`);
    if (inp) inp.value = String(v.units[u] ?? '');
  }
});
action('send', (ui, el) => {
  const g = ui.g;
  const tx = Number(document.querySelector<HTMLInputElement>('input[name=tx]')?.value);
  const ty = Number(document.querySelector<HTMLInputElement>('input[name=ty]')?.value);
  const tv = Object.values(g.s.villages).find((x) => x.x === tx && x.y === ty);
  if (!tv) return ui.result('Não há aldeia nessas coordenadas.');
  ui.target = { x: tx, y: ty };
  const units = readUnits('s_');
  const type = el.dataset.type as 'attack' | 'support';
  const err = g.canSend(ui.vid, tv.id, type, units);
  if (err) return ui.result(err);
  ui.pendingSend = { type, targetId: tv.id, units, cat: 'main' };
  ui.flash = null;
  ui.render();
});
action('send-cancel', (ui) => { ui.pendingSend = null; ui.render(); });
action('send-confirm', (ui) => {
  const p = ui.pendingSend;
  if (!p) return;
  const cat = (document.querySelector<HTMLSelectElement>('select[name=cattarget]')?.value ?? p.cat) as BuildingId;
  const err = ui.g.send(ui.vid, p.targetId, p.type, p.units, cat);
  ui.pendingSend = null;
  if (!err) document.querySelectorAll<HTMLInputElement>('input[name^="s_"]').forEach((i) => { i.value = ''; });
  ui.result(err, p.type === 'attack' ? 'Ataque enviado!' : 'Apoio enviado!');
});
action('cancel-cmd', (ui, el) => ui.result(ui.g.cancelCommand(el.dataset.c!), 'Comando cancelado; as tropas estão voltando.'));
action('sendback', (ui, el) => ui.result(ui.g.sendBackSupport(ui.vid, Number(el.dataset.i)), 'Apoio mandado de volta.'));
action('withdraw', (ui, el) => ui.result(ui.g.sendBackSupport(el.dataset.v!, Number(el.dataset.i)), 'Tropas retiradas.'));
action('req-support', (ui) => ui.result(null, humanRequestSupport(ui.g, ui.vid)));
action('scav-unlock', (ui, el) => ui.result(ui.g.unlockScavenge(ui.vid, Number(el.dataset.o)), 'Opção de coleta liberada.'));
action('scav-start', (ui, el) => {
  const o = Number(el.dataset.o);
  ui.result(ui.g.startScavenge(ui.vid, o, readUnits(`sc${o}_`)), 'Coletores enviados.');
});
action('scav-auto', (ui) => {
  const g = ui.g, v = ui.village();
  const free = SCAVENGE_OPTIONS.map((_, i) => i).filter((i) => v.scavenge.unlocked[i] && !v.scavenge.runs.some((r) => r.option === i));
  if (!free.length) return ui.result('Nenhuma opção livre.');
  // Divisão clássica: opções melhores recebem menos tropas para durações parecidas
  const weights = [15, 6, 3, 2];
  const wsum = free.reduce((s, i) => s + weights[i], 0);
  const msgs: string[] = [];
  const pool: Units = {};
  for (const u of SCAVENGE_UNITS) if (v.units[u]) pool[u] = v.units[u];
  if (unitCount(pool) === 0) return ui.result('Nenhuma tropa disponível para coleta.');
  const snapshot = { ...pool };
  free.forEach((i, idx) => {
    const part: Units = {};
    for (const u of SCAVENGE_UNITS) {
      const tot = snapshot[u] ?? 0;
      const n = idx === free.length - 1 ? (pool[u] ?? 0) : Math.floor((tot * weights[i]) / wsum);
      if (n > 0) { part[u] = n; pool[u] = (pool[u] ?? 0) - n; }
    }
    if (unitCount(part) > 0) { const e = g.startScavenge(ui.vid, i, part); if (e) msgs.push(e); }
  });
  ui.result(msgs.length ? msgs.join(' · ') : null, 'Coletores distribuídos.');
});
action('sim-mine', (ui) => {
  const v = ui.village();
  for (const u of UNIT_ORDER) {
    const inp = document.querySelector<HTMLInputElement>(`input[name="sa_${u}"]`);
    if (inp) inp.value = String(v.units[u] ?? '');
  }
});
action('simulate', (ui) => {
  const g = ui.g;
  const att = readUnits('sa_');
  const def = readUnits('sd_');
  const val = (n: string) => Number(document.querySelector<HTMLInputElement>(`input[name=${n}]`)?.value ?? 0);
  const chk = (n: string) => !!document.querySelector<HTMLInputElement>(`input[name=${n}]`)?.checked;
  const wall = Math.max(0, Math.min(20, val('sim_wall')));
  const catLevel = val('sim_cat');
  const r = resolveBattle({
    att, defGroups: [{ key: 'own', units: def }], militia: val('sim_mil'), wall,
    luck: Math.max(-25, Math.min(25, val('sim_luck'))) / 100, morale: Math.max(30, Math.min(100, val('sim_mor') || 100)) / 100,
    faithAtt: g.cfg.church && !chk('sim_fa') ? 0.5 : 1, faithDef: g.cfg.church && !chk('sim_fd') ? 0.5 : 1,
    night: chk('sim_night') ? g.cfg.nightFactor : 1,
    catTarget: (att.catapult ?? 0) > 0 && catLevel > 0 ? { level: catLevel, min: 0, isWall: false } : null,
  });
  const list = UNIT_ORDER.filter((u) => (att[u] ?? 0) > 0 || (def[u] ?? 0) > 0);
  const row = (label: string, u: Units) => `<tr><td>${label}</td>${list.map((k) => `<td>${num(u[k] ?? 0)}</td>`).join('')}</tr>`;
  const survA: Units = { ...att }; for (const k in r.attLosses) survA[k as UnitId] = (survA[k as UnitId] ?? 0) - (r.attLosses[k as UnitId] ?? 0);
  const survD: Units = { ...def }; for (const k in r.defLosses.own) survD[k as UnitId] = (survD[k as UnitId] ?? 0) - (r.defLosses.own[k as UnitId] ?? 0);
  simResult = `<div class="report"><h3>${r.attackerWon ? '<span class="ok">O atacante venceu</span>' : '<span class="err">O defensor venceu</span>'}</h3>
    <table class="vis"><tr><th></th>${list.map((u) => `<th>${uicon(u)}</th>`).join('')}</tr>
    ${row('Atacante', att)}${row('Perdas', r.attLosses)}${row('Sobreviventes', survA)}
    ${row('Defensor', def)}${row('Perdas', r.defLosses.own)}${row('Sobreviventes', survD)}</table>
    <p>Força de ataque ${num(r.attStrength)} × defesa efetiva ${num(r.defStrength)} · Muralha na batalha: ${r.wallBattle} · Muralha depois: ${r.wallAfter}${r.catAfter !== null ? ` · Edifício-alvo: ${catLevel} → ${r.catAfter}` : ''} · Carga dos sobreviventes: ${num(unitsCarry(survA))}</p></div>`;
  ui.render();
});
