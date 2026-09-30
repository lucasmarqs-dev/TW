import { BUILDINGS, BUILDING_ORDER } from '../../data/buildings';
import { UNITS, UNIT_ORDER, WEAPONS, type UnitId, type Units } from '../../data/units';
import { inviteBot, proposeRelation } from '../../engine/bots';
import { ACHIEVEMENTS, QUESTS, TIER_NAMES, achievementScore } from '../../engine/quests';
import type { Relation, Report } from '../../engine/types';
import { distance, fmtGameTime } from '../../engine/util';
import { action, registerScreen, type UI } from '../app';
import { cd, esc, icon, num, uicon, unitsInline } from '../h';

// ---------------------------------------------------------------- relatórios
const KIND_NAME: Record<string, string> = { attack: 'Ataque', defense: 'Defesa', support: 'Apoio', scout: 'Espionagem', trade: 'Comércio', conquest: 'Conquista', other: 'Outros' };

function battleTable(title: string, side: { units: Units; losses: Units }, extra?: { units?: Units; losses?: Units }): string {
  const u: Units = { ...side.units };
  const l: Units = { ...side.losses };
  if (extra?.units) for (const k in extra.units) u[k as UnitId] = (u[k as UnitId] ?? 0) + (extra.units[k as UnitId] ?? 0);
  if (extra?.losses) for (const k in extra.losses) l[k as UnitId] = (l[k as UnitId] ?? 0) + (extra.losses[k as UnitId] ?? 0);
  const list = UNIT_ORDER.filter((k) => (u[k] ?? 0) > 0);
  if (!list.length) return `<p><b>${title}:</b> <span class="muted">nenhuma tropa${side.units && Object.keys(side.units).length === 0 ? ' / informação indisponível' : ''}</span></p>`;
  return `<table class="vis"><tr><th>${title}</th>${list.map((k) => `<th>${uicon(k)}</th>`).join('')}</tr>
    <tr><td>Quantidade</td>${list.map((k) => `<td>${num(u[k] ?? 0)}</td>`).join('')}</tr>
    <tr><td>Perdas</td>${list.map((k) => `<td>${num(l[k] ?? 0)}</td>`).join('')}</tr></table>`;
}

function reportDetail(ui: UI, r: Report): string {
  const g = ui.g;
  const av = r.attacker ? g.s.villages[r.attacker.villageId] : null;
  const dv = r.defender ? g.s.villages[r.defender.villageId] : null;
  let s = `<div class="box report"><div class="head"><span class="dot ${r.color}"></span>${esc(r.title)}<span class="grow"></span><a data-act="nav" data-s="reports">« Relatórios</a></div><div class="body">
    <p class="small muted">${fmtGameTime(r.time)} — ${KIND_NAME[r.kind]}</p>`;
  if (r.text) s += `<p>${esc(r.text)}</p>`;
  if (r.defender && r.attacker && (r.kind === 'attack' || r.kind === 'defense' || r.kind === 'scout' || (r.kind === 'support' && r.defender))) {
    const ap = g.player(r.attacker.playerId), dp = g.player(r.defender.playerId);
    if (r.luck !== undefined) {
      const pct = Math.round(r.luck * 100);
      s += `<p>Sorte: <b style="color:${pct >= 0 ? '#3c7a24' : '#b0301d'}">${pct > 0 ? '+' : ''}${pct}%</b> · Moral: <b>${Math.round((r.morale ?? 1) * 100)}%</b>${r.night ? ' · <b>🌙 Bônus noturno</b>' : ''}${r.faithAtt !== undefined && g.cfg.church ? ` · Fé: atacante ${r.faithAtt >= 1 ? '100%' : '50%'}, defensor ${(r.faithDef ?? 1) >= 1 ? '100%' : '50%'}` : ''}</p>`;
    }
    s += `<h3>Atacante: ${esc(ap?.name ?? '?')} — ${av ? `${esc(av.name)} (${av.x}|${av.y})` : ''}</h3>` + battleTable('Atacante', r.attacker);
    s += `<h3>Defensor: ${esc(dp?.name ?? 'Bárbaros')} — ${dv ? `${esc(dv.name)} (${dv.x}|${dv.y})` : ''}</h3>`;
    s += battleTable('Defensor', r.defender);
    const d = r.defender;
    if (d.supportUnits && Object.keys(d.supportUnits).length) s += battleTable('Apoios', { units: d.supportUnits, losses: d.supportLosses ?? {} });
    if (d.militia) s += `<p>${uicon('militia')} Milícia: ${d.militia} (perdas ${d.militiaLost ?? 0})</p>`;
    const extras: string[] = [];
    if (r.wallBefore !== undefined && (r.wallAfter !== r.wallBefore || (r.attacker.units.ram ?? 0) > 0)) extras.push(`Muralha: ${r.wallBefore} → ${r.wallAfter}${r.wallBattle !== r.wallBefore ? ` (na batalha: ${r.wallBattle})` : ''}`);
    if (r.catTarget && r.catBefore !== undefined) extras.push(`Catapultas em ${BUILDINGS[r.catTarget].name}: ${r.catBefore} → ${r.catAfter}`);
    if (r.loyaltyBefore !== undefined) extras.push(`Lealdade: ${r.loyaltyBefore} → <b>${r.loyaltyAfter}</b>`);
    if (r.loot) extras.push(`Saque: ${icon('wood')}${num(r.loot.wood)} ${icon('stone')}${num(r.loot.stone)} ${icon('iron')}${num(r.loot.iron)} (${num(r.loot.wood + r.loot.stone + r.loot.iron)}/${num(r.lootCap ?? 0)})`);
    if (r.weaponFound) extras.push(`<span class="ok">O paladino encontrou: ${esc(WEAPONS.find((w) => w.id === r.weaponFound)?.name)}!</span>`);
    if (extras.length) s += `<p>${extras.join('<br>')}</p>`;
    if (r.intel && (r.intel.res || r.intel.buildings || r.intel.outside)) {
      s += `<h3>Espionagem</h3>`;
      if (r.intel.res) s += `<p>Recursos: ${icon('wood')}${num(r.intel.res.wood)} ${icon('stone')}${num(r.intel.res.stone)} ${icon('iron')}${num(r.intel.res.iron)}</p>`;
      if (r.intel.buildings) s += `<p class="small">${BUILDING_ORDER.filter((b) => (r.intel!.buildings![b] ?? 0) > 0).map((b) => `${BUILDINGS[b].name} <b>${r.intel!.buildings![b]}</b>`).join(' · ')}</p>`;
      if (r.intel.outside) s += `<p>Tropas fora da aldeia: ${unitsInline(r.intel.outside, 'nenhuma')}</p>`;
    }
    if (dv && dv.ownerId !== g.s.humanId) s += `<p><button data-act="map-send" data-v="${dv.id}">Atacar novamente</button> <button class="ghost" data-act="report-sim" data-r="${r.id}">Abrir no simulador</button></p>`;
  } else if (r.loot) {
    s += `<p>${icon('wood')}${num(r.loot.wood)} ${icon('stone')}${num(r.loot.stone)} ${icon('iron')}${num(r.loot.iron)}</p>`;
  } else if (r.attacker) {
    s += `<p>${unitsInline(r.attacker.units)}</p>`;
  }
  return s + `<p><button class="small red" data-act="report-del" data-r="${r.id}">Apagar</button></p></div></div>`;
}

registerScreen('reports', {
  render(ui) {
    const g = ui.g;
    if (ui.reportId) {
      const r = g.s.reports.find((x) => x.id === ui.reportId);
      if (r) { r.read = true; return reportDetail(ui, r); }
    }
    const f = ui.tab;
    const list = g.s.reports.filter((r) => !f || r.kind === f).slice(0, 150);
    const tabs = `<div class="tabs"><a class="${!f ? 'active' : ''}" data-act="rep-filter" data-t="">Todos</a>${Object.entries(KIND_NAME).map(([k, n]) => `<a class="${f === k ? 'active' : ''}" data-act="rep-filter" data-t="${k}">${n}</a>`).join('')}</div>`;
    return `<div class="box"><div class="head">Relatórios (${g.s.reports.length})<span class="grow"></span><a data-act="rep-readall">Marcar todos como lidos</a> · <a data-act="rep-clear">Apagar lidos</a></div><div class="body">${tabs}
      ${list.length ? `<table class="vis"><tr><th>Assunto</th><th>Recebido</th></tr>${list.map((r) => `<tr class="${r.read ? '' : 'unread'}"><td><span class="dot ${r.color}"></span><a data-act="open-report" data-r="${r.id}">${esc(r.title)}</a></td><td class="small">${fmtGameTime(r.time)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhum relatório.</p>'}
    </div></div>`;
  },
});
action('open-report', (ui, el) => { ui.go('reports', { reportId: el.dataset.r! }); });
action('rep-filter', (ui, el) => { ui.reportId = null; ui.go('reports', { tab: el.dataset.t ?? '', reportId: null }); });
action('rep-readall', (ui) => { for (const r of ui.g.s.reports) r.read = true; ui.g.changed(); ui.render(); });
action('rep-clear', (ui) => { ui.g.s.reports = ui.g.s.reports.filter((r) => !r.read); ui.g.changed(); ui.render(); });
action('report-del', (ui, el) => { ui.g.s.reports = ui.g.s.reports.filter((r) => r.id !== el.dataset.r); ui.go('reports', { reportId: null }); });
action('report-sim', (ui, el) => {
  const r = ui.g.s.reports.find((x) => x.id === el.dataset.r);
  ui.go('building', { building: 'place', tab: 'sim' });
  if (!r) return;
  setTimeout(() => {
    for (const u of UNIT_ORDER) {
      const a = document.querySelector<HTMLInputElement>(`input[name="sa_${u}"]`);
      const d = document.querySelector<HTMLInputElement>(`input[name="sd_${u}"]`);
      if (a) a.value = String(r.attacker?.units[u] ?? '');
      if (d) d.value = String(((r.defender?.units[u] ?? 0) - (r.defender?.losses[u] ?? 0)) || '');
    }
    const w = document.querySelector<HTMLInputElement>('input[name=sim_wall]');
    if (w) w.value = String(r.wallAfter ?? 0);
  }, 0);
});

// ---------------------------------------------------------------- mensagens
registerScreen('messages', {
  render(ui) {
    const g = ui.g;
    if (ui.messageId) {
      const m = g.s.messages.find((x) => x.id === ui.messageId);
      if (m) {
        m.read = true;
        const from = g.s.players[m.fromId]?.name ?? 'Sistema';
        let act = '';
        if (m.action && !m.action.done) {
          if (m.action.kind === 'tribeInvite') act = `<button class="green" data-act="msg-accept" data-m="${m.id}">Aceitar convite</button> <button class="ghost" data-act="msg-decline" data-m="${m.id}">Recusar</button>`;
          if (m.action.kind === 'napProposal' || m.action.kind === 'allyProposal') act = `<button class="green" data-act="msg-accept" data-m="${m.id}">Aceitar</button> <button class="ghost" data-act="msg-decline" data-m="${m.id}">Recusar</button>`;
        }
        return `<div class="box"><div class="head">${esc(m.subject)}<span class="grow"></span><a data-act="msg-back">« Mensagens</a></div><div class="body">
          <p class="small muted">De <b>${esc(from)}</b> — ${fmtGameTime(m.time)}</p><p style="white-space:pre-wrap">${esc(m.body)}</p>${act}${m.action?.done ? '<p class="muted">Respondido.</p>' : ''}</div></div>`;
      }
    }
    return `<div class="box"><div class="head">Mensagens<span class="grow"></span><a data-act="msg-readall">Marcar todas como lidas</a></div><div class="body">
      ${g.s.messages.length ? `<table class="vis"><tr><th>Assunto</th><th>De</th><th>Data</th></tr>${g.s.messages.slice(0, 100).map((m) => `<tr class="${m.read ? '' : 'unread'}"><td><a data-act="open-msg" data-m="${m.id}">${esc(m.subject)}</a></td><td>${esc(g.s.players[m.fromId]?.name ?? 'Sistema')}</td><td class="small">${fmtGameTime(m.time)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma mensagem.</p>'}
    </div></div>
    <div class="box"><div class="head">Crônica do mundo</div><div class="body small">${g.s.log.slice(0, 40).map((l) => `<div>${fmtGameTime(l.time)} — ${esc(l.text)}</div>`).join('')}</div></div>`;
  },
});
action('open-msg', (ui, el) => ui.go('messages', { messageId: el.dataset.m! }));
action('msg-back', (ui) => ui.go('messages', { messageId: null }));
action('msg-readall', (ui) => { for (const m of ui.g.s.messages) m.read = true; ui.g.changed(); ui.render(); });
action('msg-accept', (ui, el) => {
  const g = ui.g;
  const m = g.s.messages.find((x) => x.id === el.dataset.m);
  if (!m?.action) return;
  m.action.done = true;
  if (m.action.kind === 'tribeInvite' && m.action.tribeId) {
    const err = g.joinTribe(g.s.humanId, m.action.tribeId);
    return ui.result(err, `Você entrou na tribo ${g.s.tribes[m.action.tribeId]?.name}!`);
  }
  if ((m.action.kind === 'napProposal' || m.action.kind === 'allyProposal') && m.action.tribeId && g.human.tribeId) {
    const rel: Relation = m.action.kind === 'napProposal' ? 'nap' : 'ally';
    g.setRelation(g.human.tribeId, m.action.tribeId, rel);
    g.setRelation(m.action.tribeId, g.human.tribeId, rel);
    return ui.result(null, 'Acordo firmado.');
  }
  ui.render();
});
action('msg-decline', (ui, el) => {
  const m = ui.g.s.messages.find((x) => x.id === el.dataset.m);
  if (m?.action) m.action.done = true;
  const p = m ? ui.g.s.players[m.fromId] : null;
  if (p) p.trust[ui.g.s.humanId] = (p.trust[ui.g.s.humanId] ?? 0) - 3;
  ui.render();
});

// ---------------------------------------------------------------- ranking
registerScreen('ranking', {
  render(ui) {
    const g = ui.g;
    const tab = ui.tab;
    const tabs = `<div class="tabs"><a class="${!tab ? 'active' : ''}" data-act="tab" data-t="">Jogadores</a><a class="${tab === 'tribes' ? 'active' : ''}" data-act="tab" data-t="tribes">Tribos</a><a class="${tab === 'od' ? 'active' : ''}" data-act="tab" data-t="od">Adversários derrotados</a></div>`;
    if (tab === 'tribes') {
      const ts = Object.values(g.s.tribes).map((t) => ({ t, pts: t.members.reduce((s, m) => s + g.playerPoints(m), 0), vills: t.members.reduce((s, m) => s + g.villagesOf(m).length, 0) })).sort((a, b) => b.pts - a.pts);
      return `<div class="box"><div class="head">Ranking</div><div class="body">${tabs}<table class="vis"><tr><th>#</th><th>Tribo</th><th class="num">Membros</th><th class="num">Aldeias</th><th class="num">Pontos</th></tr>
        ${ts.map((x, i) => `<tr class="${x.t.id === g.human.tribeId ? 'hl' : ''}"><td>${i + 1}</td><td>[${esc(x.t.tag)}] ${esc(x.t.name)}</td><td class="num">${x.t.members.length}</td><td class="num">${x.vills}</td><td class="num">${num(x.pts)}</td></tr>`).join('')}</table></div></div>`;
    }
    const ps = Object.values(g.s.players).filter((p) => p.alive).map((p) => ({ p, pts: g.playerPoints(p.id), v: g.villagesOf(p.id).length }));
    if (tab === 'od') ps.sort((a, b) => b.p.oda + b.p.odd + b.p.ods - (a.p.oda + a.p.odd + a.p.ods));
    else ps.sort((a, b) => b.pts - a.pts);
    return `<div class="box"><div class="head">Ranking</div><div class="body">${tabs}<table class="vis"><tr><th>#</th><th>Jogador</th><th>Tribo</th><th class="num">Aldeias</th><th class="num">Pontos</th><th class="num">ODA</th><th class="num">ODD</th><th class="num">ODS</th></tr>
      ${ps.map((x, i) => {
        const t = x.p.tribeId ? g.s.tribes[x.p.tribeId] : null;
        return `<tr class="${x.p.human ? 'hl' : ''}"><td>${i + 1}</td><td>${esc(x.p.name)}${x.p.human ? ' (você)' : ''}</td><td>${t ? `[${esc(t.tag)}]` : ''}</td><td class="num">${x.v}</td><td class="num">${num(x.pts)}</td><td class="num">${num(x.p.oda)}</td><td class="num">${num(x.p.odd)}</td><td class="num">${num(x.p.ods)}</td></tr>`;
      }).join('')}</table></div></div>`;
  },
});

// ---------------------------------------------------------------- tribo
const REL_LABEL: Record<string, string> = { ally: 'Aliado', nap: 'PNA', enemy: 'Inimigo' };
registerScreen('tribe', {
  render(ui) {
    const g = ui.g;
    const me = g.human;
    const vc = victoryBox(ui);
    if (!me.tribeId) {
      return `<div class="box"><div class="head">Tribo</div><div class="body">
        <p>Você não pertence a nenhuma tribo. Funde a sua ou aguarde convites (chegam por mensagem).</p>
        <div class="flex" data-form>Nome <input name="tname" maxlength="32"> Sigla <input name="ttag" maxlength="6" style="width:80px"> <button data-act="tribe-create" data-default>Fundar tribo</button></div>
      </div></div>${tribeList(ui)}${vc}`;
    }
    const t = g.s.tribes[me.tribeId];
    const members = t.members.map((m) => g.s.players[m]).filter(Boolean);
    const cur = ui.village();
    const candidates = Object.values(g.s.players).filter((p) => !p.human && p.alive && !p.tribeId)
      .map((p) => ({ p, d: Math.min(...g.villagesOf(p.id).map((v) => distance(v, cur))) })).sort((a, b) => a.d - b.d).slice(0, 15);
    return `<div class="box"><div class="head">[${esc(t.tag)}] ${esc(t.name)}<span class="grow"></span><button class="small red" data-act="tribe-leave">Sair da tribo</button></div><div class="body">
      <table class="vis"><tr><th>Membro</th><th class="num">Aldeias</th><th class="num">Pontos</th><th>Perfil</th><th>Confiança em você</th></tr>
      ${members.map((p) => `<tr class="${p.human ? 'hl' : ''}"><td>${esc(p.name)}${p.id === t.founderId ? ' 👑' : ''}</td><td class="num">${g.villagesOf(p.id).length}</td><td class="num">${num(g.playerPoints(p.id))}</td><td>${p.human ? '—' : p.personality}</td><td>${p.human ? '—' : Math.round(p.trust[me.id] ?? 0)}</td></tr>`).join('')}</table>
      <p class="small muted">Membros bots enviam apoio quando você pede (Ponto de encontro) e reagem sozinhos a trens de nobre contra você. Membros da mesma tribo não podem se atacar.</p>
    </div></div>
    <div class="box"><div class="head">Convidar jogadores sem tribo (${t.members.length}/${g.cfg.tribeMax})</div><div class="body">
      ${candidates.length ? `<table class="vis">${candidates.map(({ p, d }) => `<tr><td>${esc(p.name)}</td><td class="num">${num(g.playerPoints(p.id))} pts</td><td class="num">${d.toFixed(1)} campos</td><td>${p.personality}</td><td><button class="small" data-act="tribe-invite" data-p="${p.id}">Convidar</button></td></tr>`).join('')}</table>` : '<p class="muted">Nenhum jogador sem tribo.</p>'}
    </div></div>${tribeList(ui)}${vc}`;
  },
});
function victoryBox(ui: UI): string {
  const g = ui.g;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const v of Object.values(g.s.villages)) {
    if (!v.ownerId) continue;
    total++;
    const p = g.s.players[v.ownerId];
    const key = p.tribeId ?? p.id;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => {
    const t = g.s.tribes[k];
    const name = t ? `[${esc(t.tag)}] ${esc(t.name)}` : esc(g.s.players[k]?.name ?? '?');
    const pct = (n / Math.max(1, total)) * 100;
    const mine = k === (g.human.tribeId ?? g.human.id);
    return `<tr class="${mine ? 'hl' : ''}"><td>${name}</td><td class="num">${n}</td><td style="width:45%"><div class="bar ${mine ? '' : 'red'}"><i style="width:${pct.toFixed(1)}%"></i></div></td><td class="num">${pct.toFixed(1)}%</td></tr>`;
  });
  const vic = g.s.victory;
  const lead = vic.leader ? (g.s.tribes[vic.leader] ? `[${esc(g.s.tribes[vic.leader].tag)}]` : esc(g.s.players[vic.leader]?.name ?? '?')) : null;
  return `<div class="box"><div class="head">Condição de vitória</div><div class="body">
    <p>Uma tribo (ou jogador sem tribo) precisa controlar <b>${g.cfg.victoryPercent}%</b> das aldeias de jogadores por <b>${g.cfg.victoryDays}</b> dias. Eliminar todos os rivais também vence.</p>
    <table class="vis">${rows.join('')}</table>
    ${lead && vic.since !== null ? `<p class="warn">${lead} atingiu o domínio — vence em ${cd(vic.since + g.cfg.victoryDays * 86400000)}.</p>` : ''}</div></div>`;
}

function tribeList(ui: UI): string {
  const g = ui.g;
  const me = g.human;
  const mine = me.tribeId ? g.s.tribes[me.tribeId] : null;
  const rows = Object.values(g.s.tribes).filter((t) => t.id !== me.tribeId).map((t) => {
    const pts = t.members.reduce((s, m) => s + g.playerPoints(m), 0);
    const rel = mine?.relations[t.id];
    const theirs = t.relations[mine?.id ?? ''];
    const btns = mine ? `<button class="small" data-act="dip" data-t="${t.id}" data-r="nap">Propor PNA</button> <button class="small green" data-act="dip" data-t="${t.id}" data-r="ally">Propor aliança</button> <button class="small red" data-act="dip" data-t="${t.id}" data-r="enemy">Declarar guerra</button>${rel ? ` <button class="small ghost" data-act="dip" data-t="${t.id}" data-r="">Neutro</button>` : ''}` : '';
    return `<tr><td>[${esc(t.tag)}] ${esc(t.name)}</td><td class="num">${t.members.length}</td><td class="num">${num(pts)}</td><td>${rel ? REL_LABEL[rel] : '—'}${theirs && theirs !== rel ? ` <span class="small muted">(eles: ${REL_LABEL[theirs]})</span>` : ''}</td><td>${btns}</td></tr>`;
  });
  return `<div class="box"><div class="head">Tribos e diplomacia</div><div class="body">
    ${rows.length ? `<table class="vis"><tr><th>Tribo</th><th class="num">Membros</th><th class="num">Pontos</th><th>Relação</th><th></th></tr>${rows.join('')}</table>` : '<p class="muted">Nenhuma outra tribo.</p>'}
    <p class="small muted">PNA e alianças são acordos sociais: bots com PNA raramente atacam, mas podem trair. Inimigos declarados viram alvos preferenciais.</p></div></div>`;
}
action('tribe-create', (ui) => {
  const n = document.querySelector<HTMLInputElement>('input[name=tname]')?.value ?? '';
  const t = document.querySelector<HTMLInputElement>('input[name=ttag]')?.value ?? '';
  ui.result(ui.g.createTribe(ui.g.s.humanId, n, t), 'Tribo fundada!');
});
action('tribe-leave', (ui) => ui.result(ui.g.leaveTribe(ui.g.s.humanId), 'Você saiu da tribo.'));
action('tribe-invite', (ui, el) => ui.result(null, inviteBot(ui.g, el.dataset.p!)));
action('dip', (ui, el) => ui.result(null, proposeRelation(ui.g, el.dataset.t!, (el.dataset.r || null) as Relation | null)));

// ---------------------------------------------------------------- visão geral
registerScreen('overview', {
  render(ui) {
    const g = ui.g;
    const vs = g.villagesOf(g.s.humanId).sort((a, b) => a.name.localeCompare(b.name));
    const inc = g.incomingFor(g.s.humanId);
    const tabs = `<div class="tabs"><a class="${!ui.tab ? 'active' : ''}" data-act="tab" data-t="">Combinado</a><a class="${ui.tab === 'troops' ? 'active' : ''}" data-act="tab" data-t="troops">Tropas</a><a class="${ui.tab === 'incoming' ? 'active' : ''}" data-act="tab" data-t="incoming">Chegando (${inc.length})</a></div>`;
    let body = '';
    if (ui.tab === 'incoming') {
      body = inc.length ? `<table class="vis"><tr><th>Alvo</th><th>Origem</th><th>Atacante</th><th class="num">Chegada</th></tr>${inc.map((c) => {
        const t = g.s.villages[c.toId], f = g.s.villages[c.fromId];
        const seen = g.watchtowerSees(c) && c.slowest ? ` ${uicon(c.slowest)} ${UNITS[c.slowest].name}` : '';
        return `<tr><td><a data-act="goto-v" data-v="${t.id}">${esc(t.name)}</a></td><td>${esc(f?.name ?? '?')} (${f?.x}|${f?.y})</td><td>${esc(g.s.players[c.ownerId]?.name)}${seen}</td><td class="num err">${cd(c.arrival)}</td></tr>`;
      }).join('')}</table>` : '<p class="muted">Nenhum ataque a caminho.</p>';
    } else if (ui.tab === 'troops') {
      const list = UNIT_ORDER.filter((u) => g.unitEnabled(u));
      body = `<table class="vis"><tr><th>Aldeia</th>${list.map((u) => `<th>${uicon(u)}</th>`).join('')}</tr>${vs.map((v) => { g.update(v); return `<tr><td><a data-act="goto-v" data-v="${v.id}">${esc(v.name)}</a></td>${list.map((u) => `<td class="num">${num(v.units[u] ?? 0)}</td>`).join('')}</tr>`; }).join('')}</table>`;
    } else {
      body = `<table class="vis"><tr><th>Aldeia</th><th class="num">Pontos</th><th>Recursos</th><th class="num">Armazém</th><th class="num">Fazenda</th><th>Obras</th><th>Recrutando</th></tr>${vs.map((v) => {
        g.update(v);
        const rec = (['barracks', 'stable', 'garage', 'snob'] as const).filter((b) => v.recruit[b].length).map((b) => BUILDINGS[b].name).join(', ');
        return `<tr><td><a data-act="goto-v" data-v="${v.id}">${esc(v.name)}</a> (${v.x}|${v.y})</td><td class="num">${num(v.points)}</td>
        <td>${icon('wood')}${num(v.res.wood)} ${icon('stone')}${num(v.res.stone)} ${icon('iron')}${num(v.res.iron)}</td><td class="num">${num(g.storageCap(v))}</td>
        <td class="num">${num(g.popUsed(v))}/${num(g.farmCap(v))}</td><td>${v.buildQueue.length ? `${BUILDINGS[v.buildQueue[0].building].name} ${cd(v.buildQueue[0].end)}${v.buildQueue.length > 1 ? ` +${v.buildQueue.length - 1}` : ''}` : '<span class="warn">—</span>'}</td><td class="small">${rec || '—'}</td></tr>`;
      }).join('')}</table>`;
    }
    return `<div class="box"><div class="head">Visão geral — ${vs.length} aldeia(s), ${num(g.playerPoints(g.s.humanId))} pontos</div><div class="body">${tabs}${body}</div></div>`;
  },
});
action('goto-v', (ui, el) => { ui.vid = el.dataset.v!; ui.go('village'); });

// ---------------------------------------------------------------- missões e conquistas
registerScreen('quests', {
  render(ui) {
    const g = ui.g;
    const open = QUESTS.filter((q) => !g.s.quests[q.id]);
    const done = QUESTS.filter((q) => g.s.quests[q.id]);
    return `<div class="cols2"><div class="box"><div class="head">Missões (${done.length}/${QUESTS.length})</div><div class="body">
      ${open.slice(0, 6).map((q) => `<div class="quest"><b>${esc(q.title)}</b><br>${esc(q.desc)}<br><span class="small">Recompensa: ${icon('wood')}${num(q.reward.wood)} ${icon('stone')}${num(q.reward.stone)} ${icon('iron')}${num(q.reward.iron)}</span></div>`).join('') || '<p class="ok">Todas as missões concluídas!</p>'}
      ${done.length ? `<details><summary class="small">Concluídas</summary>${done.map((q) => `<div class="quest done">✔ ${esc(q.title)}</div>`).join('')}</details>` : ''}
    </div></div>
    <div class="box"><div class="head">Conquistas — ${achievementScore(g)} pontos</div><div class="body">
      ${ACHIEVEMENTS.map((a) => {
        const t = g.s.achievements[a.id] ?? 0;
        const next = a.tiers[t];
        return `<div class="medal t${t}"><b>${['🏅', '🪵', '🥉', '🥈', '🥇'][t]}</b><strong>${esc(a.name)}</strong><span>${TIER_NAMES[t]}</span><span class="muted">${esc(a.desc)}: ${num(a.value(g))}${next ? ' / ' + num(next) : ''}</span></div>`;
      }).join('')}
      <p class="small muted">Molduras madeira/bronze/prata/ouro valem 1/2/3/4 pontos (referência 8.1).</p>
    </div></div></div>`;
  },
});
