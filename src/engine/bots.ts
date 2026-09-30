// IA dos bots: cada bot é um "jogador" com personalidade que constrói, pesquisa, recruta,
// saqueia bárbaras, ataca vizinhos, cunha moedas, conquista com nobres, apoia a tribo,
// negocia no mercado e faz diplomacia. As regras de decisão são novas (a referência,
// seção 7.3, lembra que o jogo original não define bots).
import { BUILDINGS, buildingCost, type BuildingId } from '../data/buildings';
import { COIN_COST, UNITS, type UnitId, type Units } from '../data/units';
import { wallBonus, wallBasicDefense } from '../data/tables';
import { Game } from './game';
import type { Command, Player, Relation, Res, Village } from './types';
import { DAY, HOUR, distance, hasRes, unitCount } from './util';
import { randomVillageName } from './world';

const PLAN: [BuildingId, number][] = [
  ['wood', 1], ['stone', 1], ['iron', 1], ['wood', 2], ['stone', 2], ['main', 2], ['wood', 3], ['stone', 3], ['iron', 2],
  ['main', 3], ['barracks', 1], ['storage', 2], ['farm', 2], ['wood', 5], ['stone', 5], ['iron', 4], ['main', 5],
  ['smith', 1], ['statue', 1], ['storage', 4], ['farm', 4], ['wall', 1], ['wood', 7], ['stone', 7], ['iron', 6], ['hide', 2],
  ['barracks', 3], ['smith', 2], ['market', 1], ['main', 7], ['storage', 6], ['farm', 6], ['wood', 9], ['stone', 9],
  ['iron', 8], ['wall', 5], ['smith', 5], ['barracks', 5], ['church', 1], ['main', 10], ['stable', 1], ['storage', 9], ['farm', 9],
  ['wood', 12], ['stone', 12], ['iron', 10], ['stable', 3], ['market', 3], ['smith', 10], ['garage', 1], ['wall', 10],
  ['main', 15], ['wood', 16], ['stone', 16], ['iron', 14], ['storage', 14], ['farm', 14], ['stable', 5], ['barracks', 10],
  ['smith', 12], ['garage', 2], ['market', 5], ['watchtower', 3], ['main', 20], ['wood', 20], ['stone', 20], ['iron', 18], ['storage', 18],
  ['farm', 18], ['smith', 15], ['stable', 10], ['smith', 20], ['market', 10], ['snob', 1], ['wall', 15], ['barracks', 15],
  ['stable', 15], ['wood', 25], ['stone', 25], ['iron', 23], ['storage', 24], ['farm', 24], ['wall', 20], ['garage', 5],
  ['main', 25], ['wood', 30], ['stone', 30], ['iron', 30], ['storage', 30], ['farm', 30], ['barracks', 25], ['stable', 20],
  ['garage', 10], ['main', 30], ['market', 20], ['hide', 10],
];

const OFF_SHARE: Record<Player['personality'], number> = {
  agressivo: 0.75, saqueador: 0.65, equilibrado: 0.5, economista: 0.4, defensivo: 0.2,
};
const MIL_BUDGET: Record<Player['personality'], number> = {
  agressivo: 0.55, saqueador: 0.5, equilibrado: 0.4, economista: 0.25, defensivo: 0.4,
};
const RESEARCH_ORDER: UnitId[] = ['axe', 'spy', 'sword', 'light', 'ram', 'heavy', 'catapult', 'archer', 'marcher'];
const OFF_UNITS: UnitId[] = ['axe', 'light', 'marcher', 'ram', 'catapult'];
const DEF_UNITS: UnitId[] = ['spear', 'sword', 'archer', 'heavy'];

export function installBots(g: Game) {
  g.hooks.botThink = think;
  g.hooks.hourly = hourly;
  g.hooks.onAttackIncoming = onIncoming;
}

// ------------------------------------------------------------------ pensamento principal
function think(g: Game, p: Player) {
  const villages = g.villagesOf(p.id);
  if (!villages.length) { p.alive = false; return; }
  for (const v of villages) {
    g.update(v);
    if (v.name === 'Aldeia bárbara' || v.name === 'Aldeia bônus') v.name = randomVillageName(g.s);
    const reserve = manageBuild(g, v);
    manageResearch(g, v);
    manageAcademy(g, p, v);
    manageRecruit(g, p, v, reserve);
    manageScavenge(g, v);
  }
  manageMilitary(g, p, villages);
  manageSupportsReturn(g, p);
}

/** Tenta construir e devolve a reserva de recursos que o recrutamento deve respeitar. */
function manageBuild(g: Game, v: Village): Res {
  const none = { wood: 0, stone: 0, iron: 0 };
  if (v.buildQueue.length >= 2) return none;
  const cap = g.storageCap(v);
  const popFree = g.farmCap(v) - g.popUsed(v);
  let cand: BuildingId | null = null;
  if (popFree < Math.max(20, g.farmCap(v) * 0.08) && g.plannedLevel(v, 'farm') < 30) cand = 'farm';
  // Equilíbrio: recurso gargalo com os outros quase cheios -> sobe o produtor dele
  if (!cand) {
    const keys = ['wood', 'stone', 'iron'] as const;
    const low = keys.reduce((a, b) => (v.res[a] < v.res[b] ? a : b));
    const high = keys.reduce((a, b) => (v.res[a] > v.res[b] ? a : b));
    const lvl = g.plannedLevel(v, low);
    if (v.res[low] < cap * 0.25 && v.res[high] > cap * 0.75 && lvl < 30 && lvl <= Math.max(v.buildings.wood, v.buildings.stone, v.buildings.iron) + 2) cand = low;
  }
  if (!cand) {
    let skip = g.rand() < 0.15 ? 1 : 0; // pequena variação para bots não ficarem idênticos
    for (const [b, lvl] of PLAN) {
      if (!g.buildingEnabled(b)) continue;
      if (b === 'church' && g.faith(v) >= 1) continue;
      if (g.plannedLevel(v, b) >= lvl) continue;
      if (!g.reqsMet(v, BUILDINGS[b].reqs)) continue;
      cand = b;
      if (skip-- > 0) continue;
      break;
    }
  }
  if (!cand) return none;
  const next = g.plannedLevel(v, cand) + 1;
  const cost = buildingCost(cand, Math.min(next, BUILDINGS[cand].max));
  if ((cost.wood > cap * 0.95 || cost.stone > cap * 0.95 || cost.iron > cap * 0.95) && g.plannedLevel(v, 'storage') < 30) cand = 'storage';
  // Armazém quase cheio: prioriza armazém para não desperdiçar produção
  if (Math.max(v.res.wood, v.res.stone, v.res.iron) > cap * 0.97 && v.buildQueue.length === 0) {
    if (g.canBuild(v, cand)) cand = 'storage';
  }
  if (g.build(v.id, cand) === null) return none;
  const c = buildingCost(cand, Math.min(g.plannedLevel(v, cand) + 1, BUILDINGS[cand].max));
  return { wood: c.wood, stone: c.stone, iron: c.iron };
}

function manageResearch(g: Game, v: Village) {
  if (v.researchQueue || v.buildings.smith < 1) return;
  for (const u of RESEARCH_ORDER) {
    if (!g.unitEnabled(u) || g.isResearched(v, u)) continue;
    if (g.canResearch(v, u) === null) { g.research(v.id, u); return; }
  }
}

function manageAcademy(g: Game, p: Player, v: Village) {
  if (v.buildings.snob < 1) return;
  const slots = g.nobleSlots(p.id);
  if (slots.used >= slots.total) {
    const need = { wood: COIN_COST.wood * 1.1, stone: COIN_COST.stone * 1.1, iron: COIN_COST.iron * 1.1 };
    if (hasRes(v.res, need)) g.mintCoin(v.id);
    return;
  }
  if (v.recruit.snob.length === 0 && g.maxRecruitable(v, 'snob') >= 1) g.recruit(v.id, 'snob', 1);
}

function unitsStrength(u: Units, kind: 'att' | 'def'): number {
  let s = 0;
  for (const k in u) {
    const d = UNITS[k as UnitId];
    s += (u[k as UnitId] ?? 0) * (kind === 'att' ? d.att : (d.def + d.defCav + d.defArc) / 3);
  }
  return s;
}

function manageRecruit(g: Game, p: Player, v: Village, reserve: Res) {
  const early = v.points < 200;
  const budget = MIL_BUDGET[p.personality] * (early ? 0.5 : 1);
  const spend: Res = {
    wood: Math.max(0, v.res.wood - reserve.wood) * budget,
    stone: Math.max(0, v.res.stone - reserve.stone) * budget,
    iron: Math.max(0, v.res.iron - reserve.iron) * budget,
  };
  const maxQueue = (8 * HOUR) / g.cfg.speed;

  // Batedores
  const all = { ...v.units };
  const away = g.unitsAway(v);
  for (const k in away) all[k as UnitId] = (all[k as UnitId] ?? 0) + (away[k as UnitId] ?? 0);
  const queued = g.unitsQueued(v);
  for (const k in queued) all[k as UnitId] = (all[k as UnitId] ?? 0) + (queued[k as UnitId] ?? 0);
  if (g.canRecruitType(v, 'spy') === null && (all.spy ?? 0) < 15 && g.recruitQueueEnd(v, 'stable') - g.now < maxQueue) {
    tryRecruit(g, v, 'spy', 5, spend);
  }

  let offPop = 0, defPop = 0;
  for (const u of OFF_UNITS) offPop += (all[u] ?? 0) * UNITS[u].pop;
  for (const u of DEF_UNITS) defPop += (all[u] ?? 0) * UNITS[u].pop;
  const wantOff = OFF_SHARE[p.personality];
  const offNeed = offPop / Math.max(1, offPop + defPop) < wantOff;
  const list = offNeed ? offChoices(g, v, all) : defChoices(g, v, all);
  for (const u of list) {
    const b = UNITS[u].building as 'barracks' | 'stable' | 'garage';
    if (g.recruitQueueEnd(v, b) - g.now > maxQueue) continue;
    const d = UNITS[u];
    const n = Math.floor(Math.min(spend.wood / d.wood, spend.stone / d.stone, spend.iron / d.iron));
    if (n >= 1 && tryRecruit(g, v, u, n, spend)) break;
  }
}

function offChoices(g: Game, v: Village, all: Units): UnitId[] {
  const out: UnitId[] = [];
  const offTotal = (all.axe ?? 0) + (all.light ?? 0) * 4;
  if (offTotal > 200 && (all.ram ?? 0) < offTotal / 25 && g.canRecruitType(v, 'ram') === null) out.push('ram');
  if (offTotal > 600 && (all.catapult ?? 0) < offTotal / 60 && g.canRecruitType(v, 'catapult') === null) out.push('catapult');
  if (g.canRecruitType(v, 'light') === null && (all.light ?? 0) * 4 < (all.axe ?? 0) * 1.2) out.push('light');
  if (g.canRecruitType(v, 'marcher') === null && (all.marcher ?? 0) * 5 < (all.light ?? 0)) out.push('marcher');
  if (g.canRecruitType(v, 'axe') === null) out.push('axe');
  if (g.canRecruitType(v, 'light') === null) out.push('light');
  if (!out.length) out.push('spear');
  return out;
}
function defChoices(g: Game, v: Village, all: Units): UnitId[] {
  const out: UnitId[] = [];
  if (g.canRecruitType(v, 'heavy') === null && (all.heavy ?? 0) * 6 < (all.spear ?? 0) * 0.5) out.push('heavy');
  if (g.canRecruitType(v, 'archer') === null && (all.archer ?? 0) < (all.spear ?? 0) * 0.4) out.push('archer');
  if (g.canRecruitType(v, 'sword') === null && (all.sword ?? 0) < (all.spear ?? 0)) out.push('sword');
  out.push('spear');
  return out;
}
function tryRecruit(g: Game, v: Village, u: UnitId, n: number, spend: Res): boolean {
  n = Math.min(n, g.maxRecruitable(v, u));
  if (n < 1) return false;
  if (g.recruit(v.id, u, n) === null) {
    const d = UNITS[u];
    spend.wood -= d.wood * n; spend.stone -= d.stone * n; spend.iron -= d.iron * n;
    return true;
  }
  return false;
}

function manageScavenge(g: Game, v: Village) {
  if (!g.cfg.scavenging || v.buildings.place < 1) return;
  // Bots econômicos liberam e usam coleta com lanceiros excedentes
  for (let i = 1; i < 4; i++) {
    if (!v.scavenge.unlocked[i] && v.scavenge.unlocked[i - 1] && v.points > [0, 150, 500, 2500][i]) { g.unlockScavenge(v.id, i); break; }
  }
  const spear = v.units.spear ?? 0;
  const keep = Math.max(20, Math.floor(v.points / 10));
  if (spear - keep < 10) return;
  for (let i = 3; i >= 0; i--) {
    if (!v.scavenge.unlocked[i] || v.scavenge.runs.some((r) => r.option === i)) continue;
    const n = Math.floor((spear - keep) / 2);
    if (n >= 10) { g.startScavenge(v.id, i, { spear: n }); return; }
  }
}

// ------------------------------------------------------------------ militar
function estimateDefense(g: Game, p: Player, target: Village): { def: number; known: boolean; units: Units; wall: number } {
  const intel = p.memory?.intel[target.id];
  const fresh = intel && g.now - intel.time < (24 * HOUR) / g.cfg.speed;
  if (fresh && intel) {
    let d = 0;
    for (const k in intel.units) d += (intel.units[k as UnitId] ?? 0) * UNITS[k as UnitId].def;
    return { def: d * wallBonus(intel.wall) + wallBasicDefense(intel.wall), known: true, units: intel.units, wall: intel.wall };
  }
  // Estimativa grosseira por pontos
  const guess = target.ownerId ? target.points * 4 : target.points * 1.2;
  const w = target.ownerId ? Math.min(20, Math.floor(target.points / 150)) : target.buildings.wall;
  return { def: guess * wallBonus(w) + wallBasicDefense(w), known: false, units: {}, wall: w };
}

function attackPower(u: Units): number { return unitsStrength(u, 'att'); }

function manageMilitary(g: Game, p: Player, villages: Village[]) {
  const mem = p.memory!;
  const allVillages = Object.values(g.s.villages);
  for (const v of villages) {
    if (v.buildings.place < 1) continue;
    // 1) Conquista com nobre
    if ((v.units.snob ?? 0) > 0) {
      if (tryConquest(g, p, v, allVillages)) continue;
    }
    // 2) Ataque a jogador
    if (g.rand() < p.aggression * 0.5) {
      if (tryPlayerAttack(g, p, v, allVillages)) continue;
    }
    // 3) Saques em bárbaras
    farm(g, p, v, allVillages, mem.lastFarm);
  }
}

function sendScouts(g: Game, v: Village, target: Village): boolean {
  if ((v.units.spy ?? 0) >= 3) return g.send(v.id, target.id, 'attack', { spy: 3 }) === null;
  return false;
}

function farm(g: Game, p: Player, v: Village, all: Village[], lastFarm: Record<string, number>) {
  const cooldown = (3 * HOUR) / g.cfg.speed;
  const targets = all
    .filter((t) => !t.ownerId && distance(t, v) <= 20 && (g.now - (lastFarm[t.id] ?? -1e15)) > cooldown)
    .sort((a, b) => distance(a, v) - distance(b, v))
    .slice(0, 6);
  let raids = 0;
  for (const t of targets) {
    if (raids >= 3) break;
    const est = estimateDefense(g, p, t);
    const need = est.def * 2 + 50;
    const group: Units = {};
    let power = 0;
    for (const u of ['light', 'axe', 'marcher'] as UnitId[]) {
      const have = v.units[u] ?? 0;
      if (!have) continue;
      const n = Math.min(have, Math.ceil((need - power) / UNITS[u].att));
      if (n <= 0) break;
      group[u] = n;
      power += n * UNITS[u].att;
      if (power >= need) break;
    }
    if (power < need) {
      if (!est.known && sendScouts(g, v, t)) { lastFarm[t.id] = g.now; raids++; }
      continue;
    }
    // Leva carga extra se houver cavalaria sobrando
    const extra = Math.min((v.units.light ?? 0) - (group.light ?? 0), 25);
    if (extra > 0) group.light = (group.light ?? 0) + extra;
    if (g.send(v.id, t.id, 'attack', group) === null) {
      lastFarm[t.id] = g.now;
      raids++;
    }
  }
}

function isValidEnemy(g: Game, p: Player, t: Village): boolean {
  if (!t.ownerId || t.ownerId === p.id) return false;
  const rel = g.relation(p.id, t.ownerId);
  if (rel === 'tribe' || rel === 'ally') return false;
  if (rel === 'nap' && g.rand() > 0.03) return false;
  if (g.isProtected(t.ownerId)) return false;
  return true;
}

function tryPlayerAttack(g: Game, p: Player, v: Village, all: Village[]): boolean {
  const off: Units = {};
  for (const u of OFF_UNITS) if (v.units[u]) off[u] = v.units[u];
  if (v.units.knight) off.knight = 1;
  const power = attackPower(off);
  if (power < 3000) return false;
  const mem = p.memory!;
  let best: Village | null = null, bestScore = -Infinity;
  for (const t of all) {
    if (!isValidEnemy(g, p, t)) continue;
    const d = distance(v, t);
    if (d > 30) continue;
    const rel = g.relation(p.id, t.ownerId);
    let score = -d * 2 - t.points / 200 + (mem.grudge[t.ownerId!] ?? 0) * 5 + (rel === 'enemy' ? 40 : 0);
    if (mem.targetId === t.id) score += 25;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (!best) return false;
  const est = estimateDefense(g, p, best);
  if (!est.known) {
    if (sendScouts(g, v, best)) return true;
  }
  if (power < est.def * 1.4) return false;
  const cmd: Units = { ...off };
  if (est.wall === 0) delete cmd.ram;
  const target: BuildingId = est.wall > 3 ? 'wall' : g.rand() < 0.5 ? 'barracks' : 'farm';
  if (g.send(v.id, best.id, 'attack', cmd, target) === null) {
    mem.targetId = best.id;
    if (best.ownerId === g.s.humanId && g.rand() < 0.15) taunt(g, p);
    return true;
  }
  return false;
}

function tryConquest(g: Game, p: Player, v: Village, all: Village[]): boolean {
  const mem = p.memory!;
  let target: Village | null = mem.targetId ? g.s.villages[mem.targetId] : null;
  if (target && (target.ownerId === p.id || distance(v, target) > g.cfg.nobleMaxDist || (target.ownerId && !isValidEnemy(g, p, target)))) target = null;
  if (!target) {
    let bestScore = -Infinity;
    for (const t of all) {
      if (t.ownerId === p.id) continue;
      const d = distance(v, t);
      if (d > Math.min(g.cfg.nobleMaxDist, 25)) continue;
      if (t.ownerId && !isValidEnemy(g, p, t)) continue;
      const est = estimateDefense(g, p, t);
      let score = t.points / 20 - d * 3 - est.def / 300 + (t.bonus ? 30 : 0);
      if (t.ownerId) score += (mem.grudge[t.ownerId] ?? 0) * 3 - 20;
      if (score > bestScore) { bestScore = score; target = t; }
    }
  }
  if (!target) return false;
  mem.targetId = target.id;
  const est = estimateDefense(g, p, target);
  const off: Units = {};
  for (const u of OFF_UNITS) if (v.units[u]) off[u] = v.units[u];
  const power = attackPower(off);
  if (est.def > 200 || est.wall > 0) {
    if (power < est.def * 1.5) return false;
    if (g.send(v.id, target.id, 'attack', off, 'wall') !== null) return false;
  }
  const escort: Units = { snob: 1 };
  const axes = v.units.axe ?? 0;
  if (axes > 0) escort.axe = Math.min(axes, 100);
  else if ((v.units.spear ?? 0) > 0) escort.spear = Math.min(v.units.spear ?? 0, 100);
  return g.send(v.id, target.id, 'attack', escort) === null;
}

function manageSupportsReturn(g: Game, p: Player) {
  for (const v of Object.values(g.s.villages)) {
    for (let i = v.supports.length - 1; i >= 0; i--) {
      const sp = v.supports[i];
      if (sp.ownerId !== p.id) continue;
      const threatened = Object.values(g.s.commands).some((c) => c.type === 'attack' && c.toId === v.id);
      if (!threatened && g.rand() < 0.1) g.sendBackSupport(v.id, i);
    }
  }
}

// ------------------------------------------------------------------ defesa e apoio
function onIncoming(g: Game, c: Command) {
  const target = g.s.villages[c.toId];
  if (!target?.ownerId) return;
  const owner = g.s.players[target.ownerId];
  const isNoble = (c.units.snob ?? 0) > 0;
  const big = unitCount(c.units) > 100;
  if (!owner.human && owner.alive) {
    // O bot defensor aciona milícia quando o ataque chega logo
    if (big && g.cfg.militia && !target.militia && c.arrival - g.now < (4 * HOUR) / g.cfg.speed && g.rand() < 0.6) g.toggleMilitia(target.id);
    if (big || isNoble) requestTribeSupport(g, target, c.arrival, 0.3);
  } else if (owner.human && isNoble) {
    // Aliados de tribo do humano reagem a trens de nobre
    requestTribeSupport(g, target, c.arrival, 0.2);
  }
}

/** Membros da tribo enviam parte da defesa se chegarem antes do ataque. */
export function requestTribeSupport(g: Game, target: Village, before: number, share: number): number {
  const owner = g.s.players[target.ownerId!];
  if (!owner.tribeId) return 0;
  const tribe = g.s.tribes[owner.tribeId];
  let sent = 0;
  for (const mid of tribe.members) {
    const m = g.s.players[mid];
    if (!m || m.human || !m.alive) continue;
    if (m.id !== owner.id && (m.trust[owner.id] ?? 0) < -20) continue;
    for (const v of g.villagesOf(mid)) {
      if (v.id === target.id) continue;
      g.update(v);
      const u: Units = {};
      for (const k of DEF_UNITS) {
        const n = Math.floor((v.units[k] ?? 0) * share);
        if (n > 0) u[k] = n;
      }
      if (unitCount(u) < 20) continue;
      if (g.now + g.travelTime(v, target, u) > before) continue;
      if (g.send(v.id, target.id, 'support', u) === null) sent += unitCount(u);
    }
  }
  return sent;
}

// ------------------------------------------------------------------ tarefas horárias
function hourly(g: Game) {
  const human = g.human;
  const day = g.now / DAY;
  // Mercado dos bots
  for (const o of Object.values(g.s.offers)) {
    if (!g.s.players[o.ownerId]?.human && g.now - o.created > (24 * HOUR) / g.cfg.speed) g.deleteOffer(o.id);
  }
  for (const p of Object.values(g.s.players)) {
    if (p.human || !p.alive) continue;
    for (const v of g.villagesOf(p.id)) {
      if (v.buildings.market < 1) continue;
      g.update(v);
      maybeCreateOffer(g, v);
      maybeAcceptOffers(g, v);
    }
  }
  // Diplomacia entre tribos de bots
  const tribes = Object.values(g.s.tribes);
  if (tribes.length >= 2 && g.rand() < 0.04) {
    const a = tribes[Math.floor(g.rand() * tribes.length)];
    const b = tribes[Math.floor(g.rand() * tribes.length)];
    const humanTribe = human.tribeId;
    if (a.id !== b.id && a.id !== humanTribe && b.id !== humanTribe) {
      const r = g.rand();
      const rel: Relation | null = r < 0.4 ? 'enemy' : r < 0.6 ? 'nap' : r < 0.75 ? 'ally' : null;
      g.setRelation(a.id, b.id, rel); g.setRelation(b.id, a.id, rel);
      g.s.log.unshift({ time: g.now, text: `Diplomacia: ${a.tag} e ${b.tag} agora são ${relName(rel)}.` });
    }
  }
  // Convites e declarações envolvendo o jogador humano
  const pendingInvite = g.s.messages.some((m) => m.action?.kind === 'tribeInvite' && !m.action.done && g.now - m.time < (3 * DAY) / g.cfg.speed);
  if (!human.tribeId && day > 1 && !pendingInvite && g.rand() < 0.03) {
    const t = tribes.filter((x) => x.members.length < g.cfg.tribeMax && x.members.length > 0)[Math.floor(g.rand() * tribes.length)];
    if (t) {
      const founder = g.s.players[t.founderId];
      if (founder && (founder.trust[human.id] ?? 0) > -5) {
        g.sendMessage(founder.id, `Convite para a tribo [${t.tag}]`, `Saudações, ${human.name}! A tribo ${t.name} [${t.tag}] gostaria de tê-lo entre nós. Juntos seremos mais fortes.`, { kind: 'tribeInvite', tribeId: t.id });
      }
    }
  }
  if (human.tribeId && g.rand() < 0.02) {
    const ht = g.s.tribes[human.tribeId];
    const others = tribes.filter((x) => x.id !== ht?.id);
    const t = others[Math.floor(g.rand() * others.length)];
    if (t && ht) {
      const trust = avgTrust(g, t, human.id);
      const cur = t.relations[ht.id];
      if (trust < -10 && cur !== 'enemy') {
        g.setRelation(t.id, ht.id, 'enemy'); g.setRelation(ht.id, t.id, 'enemy');
        g.sendMessage(t.founderId, `Guerra!`, `A tribo ${t.name} [${t.tag}] declara guerra a [${ht.tag}]. Preparem suas muralhas.`);
      } else if (trust > 15 && !cur) {
        g.sendMessage(t.founderId, `Proposta de pacto`, `A tribo ${t.name} [${t.tag}] propõe um pacto de não agressão com [${ht.tag}].`, { kind: 'napProposal', tribeId: t.id });
      }
    }
  }
  // Confiança sobe lentamente com o tempo de paz
  for (const p of Object.values(g.s.players)) {
    if (p.human) continue;
    for (const k in p.trust) if (p.trust[k] < 10 && g.rand() < 0.1) p.trust[k] += 1;
  }
}

function relName(r: Relation | null): string {
  return r === 'ally' ? 'aliados' : r === 'nap' ? 'PNA' : r === 'enemy' ? 'inimigos' : 'neutros';
}
function avgTrust(g: Game, t: { members: string[] }, pid: string): number {
  if (!t.members.length) return 0;
  let s = 0;
  for (const m of t.members) s += g.s.players[m]?.trust[pid] ?? 0;
  return s / t.members.length;
}
function taunt(g: Game, p: Player) {
  const lines = [
    'Suas muralhas não vão segurar meus machados.',
    'Renda-se agora e talvez eu poupe seus camponeses.',
    'Meus batedores já conhecem cada canto da sua aldeia.',
    'Hoje é um bom dia para saquear.',
  ];
  g.sendMessage(p.id, 'Aviso', lines[Math.floor(g.rand() * lines.length)]);
}

function maybeCreateOffer(g: Game, v: Village) {
  const mine = Object.values(g.s.offers).filter((o) => o.villageId === v.id);
  if (mine.length >= 2 || g.merchantsFree(v) < 2) return;
  const cap = g.storageCap(v);
  const keys: (keyof Res)[] = ['wood', 'stone', 'iron'];
  const most = keys.reduce((a, b) => (v.res[a] > v.res[b] ? a : b));
  const least = keys.reduce((a, b) => (v.res[a] < v.res[b] ? a : b));
  if (v.res[most] < cap * 0.6 || v.res[least] > cap * 0.3) return;
  const amount = Math.min(1000 * Math.min(5, g.merchantsFree(v)), Math.floor((v.res[most] - v.res[least]) / 3 / 100) * 100);
  if (amount < 500) return;
  const ratio = 0.85 + g.rand() * 0.35;
  g.createOffer(v.id, most, amount, least, Math.round((amount * ratio) / 50) * 50, 1);
}
function maybeAcceptOffers(g: Game, v: Village) {
  const cap = g.storageCap(v);
  for (const o of Object.values(g.s.offers)) {
    if (o.ownerId === v.ownerId) continue;
    const ov = g.s.villages[o.villageId];
    if (!ov || distance(ov, v) > 40) continue;
    if (g.relation(v.ownerId, o.ownerId) === 'enemy') continue;
    // O bot entrega `want` e recebe `give`
    if (v.res[o.want] > cap * 0.5 && v.res[o.give] < cap * 0.35 && o.wantAmount <= o.giveAmount * 1.15 && v.res[o.want] >= o.wantAmount) {
      if (g.acceptOffer(o.id, v.id) === null) return;
    }
  }
}

// ------------------------------------------------------------------ ações diplomáticas do humano
export function inviteBot(g: Game, botId: string): string {
  const human = g.human;
  const bot = g.s.players[botId];
  if (!human.tribeId) return 'Você precisa ter uma tribo.';
  const t = g.s.tribes[human.tribeId];
  if (t.members.length >= g.cfg.tribeMax) return 'Tribo cheia.';
  if (bot.tribeId) return `${bot.name} já pertence a outra tribo.`;
  const power = g.playerPoints(human.id) / Math.max(1, g.playerPoints(bot.id));
  const chance = 0.25 + (bot.trust[human.id] ?? 0) / 60 + Math.min(0.3, (power - 1) * 0.15);
  if (g.rand() < chance) {
    g.joinTribe(bot.id, human.tribeId);
    bot.trust[human.id] = (bot.trust[human.id] ?? 0) + 10;
    return `${bot.name} aceitou o convite!`;
  }
  bot.trust[human.id] = (bot.trust[human.id] ?? 0) - 2;
  return `${bot.name} recusou o convite.`;
}

export function proposeRelation(g: Game, otherTid: string, rel: Relation | null): string {
  const human = g.human;
  if (!human.tribeId) return 'Você precisa ter uma tribo.';
  const mine = g.s.tribes[human.tribeId];
  const other = g.s.tribes[otherTid];
  if (!other) return 'Tribo inexistente.';
  if (rel === 'enemy' || rel === null) {
    g.setRelation(mine.id, other.id, rel);
    if (rel === 'enemy') {
      g.setRelation(other.id, mine.id, 'enemy');
      for (const m of other.members) { const p = g.s.players[m]; if (p) p.trust[human.id] = (p.trust[human.id] ?? 0) - 15; }
    }
    return rel === 'enemy' ? `Guerra declarada contra [${other.tag}].` : `Relação com [${other.tag}] removida.`;
  }
  const trust = avgTrust(g, other, human.id);
  const myPts = mine.members.reduce((s, m) => s + g.playerPoints(m), 0);
  const otPts = other.members.reduce((s, m) => s + g.playerPoints(m), 0);
  const chance = (rel === 'nap' ? 0.45 : 0.25) + trust / 50 + (myPts > otPts ? 0.15 : -0.05) - (other.relations[mine.id] === 'enemy' ? 0.3 : 0);
  if (g.rand() < chance) {
    g.setRelation(mine.id, other.id, rel);
    g.setRelation(other.id, mine.id, rel);
    return `[${other.tag}] aceitou: agora vocês são ${relName(rel)}.`;
  }
  for (const m of other.members) { const p = g.s.players[m]; if (p) p.trust[human.id] = (p.trust[human.id] ?? 0) - 1; }
  return `[${other.tag}] recusou a proposta.`;
}

export function humanRequestSupport(g: Game, villageId: string): string {
  const v = g.s.villages[villageId];
  const inc = g.incomingFor(g.s.humanId).filter((c) => c.toId === villageId);
  const before = inc.length ? inc[inc.length - 1].arrival : g.now + (12 * HOUR) / g.cfg.speed;
  const n = requestTribeSupport(g, v, before, 0.25);
  return n > 0 ? `Sua tribo enviou ${n} soldados de apoio.` : 'Nenhum membro da tribo pôde enviar apoio a tempo.';
}

