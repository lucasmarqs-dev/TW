// Núcleo do jogo: estado, relógio de eventos, economia, filas, comandos, combate e conquista.
import { BUILDINGS, BUILDING_ORDER, buildingCost, buildingPop, type BuildingId } from '../data/buildings';
import {
  CHURCH_RADIUS, MERCHANT_CAPACITY, MERCHANT_MIN_PER_FIELD, OD_POINTS, baseProduction, buildTimeExponent,
  buildingPoints, farmCapacity, hideCapacity, hqFactor, merchantCount, storageCapacity, watchtowerRadius,
} from '../data/tables';
import { COIN_COST, SCAVENGE_OPTIONS, SCAVENGE_UNITS, UNITS, UNIT_ORDER, WEAPONS, type UnitId, type Units } from '../data/units';
import { moraleFor, resolveBattle } from './combat';
import { DIFFICULTY_MULT } from './config';
import type {
  BattleSide, BuildQueueItem, Command, GameEvent, GameState, Message, Player, RecruitBuilding, RecruitItem,
  Relation, Report, Res, Village,
} from './types';
import {
  DAY, HOUR, MIN, SEC, addUnits, cloneUnits, distance, hasRes, heapPop, heapPush, nextRandom, randInt,
  resSum, slowestUnit, subRes, unitCount, unitsCarry, unitsPop,
} from './util';

export type Err = string | null;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export const MAX_BUILD_QUEUE = 5;
export const RES_KEYS: (keyof Res)[] = ['wood', 'stone', 'iron'];

export class Game {
  s: GameState;
  version = 0;
  private listeners = new Set<(g: Game) => void>();
  /** Hooks definidos por outros módulos (bots, missões) para evitar dependência circular. */
  hooks: {
    botThink?: (g: Game, p: Player) => void;
    hourly?: (g: Game) => void;
    onAttackIncoming?: (g: Game, c: Command) => void;
    onNotify?: (g: Game, text: string, kind: 'info' | 'good' | 'bad') => void;
  } = {};

  constructor(state: GameState) {
    this.s = state;
  }

  // ---------------------------------------------------------------- utilidades
  get now() { return this.s.now; }
  get cfg() { return this.s.config; }
  get human(): Player { return this.s.players[this.s.humanId]; }
  rand(): number { return nextRandom(this.s); }
  randInt(a: number, b: number): number { return randInt(this.s, a, b); }
  newId(prefix: string): string { return prefix + (++this.s.idCounter).toString(36); }
  subscribe(fn: (g: Game) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  changed() { this.version++; }
  emit() { for (const l of this.listeners) l(this); }
  notify(text: string, kind: 'info' | 'good' | 'bad' = 'info') {
    this.s.log.unshift({ time: this.now, text });
    if (this.s.log.length > 200) this.s.log.length = 200;
    this.hooks.onNotify?.(this, text, kind);
  }
  schedule(e: DistributiveOmit<GameEvent, 'seq'>) {
    heapPush(this.s.events, { ...e, seq: ++this.s.seq } as GameEvent);
  }
  village(id: string): Village { return this.s.villages[id]; }
  player(id: string | null): Player | null { return id ? this.s.players[id] ?? null : null; }
  villagesOf(pid: string): Village[] {
    return Object.values(this.s.villages).filter((v) => v.ownerId === pid);
  }
  playerPoints(pid: string): number {
    let p = 0;
    for (const v of Object.values(this.s.villages)) if (v.ownerId === pid) p += v.points;
    return p;
  }
  ownerName(v: Village): string {
    return v.ownerId ? this.s.players[v.ownerId]?.name ?? '?' : 'Bárbaros';
  }
  villageLabel(v: Village): string { return `${v.name} (${v.x}|${v.y})`; }
  hourOfDay(t = this.now): number { return Math.floor((t % DAY) / HOUR); }
  isNight(t = this.now): boolean {
    if (!this.cfg.nightBonus) return false;
    const h = this.hourOfDay(t);
    const { nightStart: a, nightEnd: b } = this.cfg;
    return a <= b ? h >= a && h < b : h >= a || h < b;
  }
  isProtected(pid: string | null): boolean {
    return !!pid && this.now < this.cfg.protectionDays * DAY;
  }

  /** Relação de A em direção a B. */
  relation(a: string | null, b: string | null): 'self' | 'tribe' | Relation | 'neutral' | 'barbarian' {
    if (!b) return 'barbarian';
    if (!a) return 'neutral';
    if (a === b) return 'self';
    const pa = this.s.players[a], pb = this.s.players[b];
    if (!pa || !pb) return 'neutral';
    if (pa.tribeId && pa.tribeId === pb.tribeId) return 'tribe';
    if (pa.tribeId && pb.tribeId) {
      const r = this.s.tribes[pa.tribeId]?.relations[pb.tribeId];
      if (r) return r;
    }
    return 'neutral';
  }

  // ---------------------------------------------------------------- economia da aldeia
  /** `at` = instante de referência para saber se a milícia estava ativa. */
  prodMult(v: Village, at = this.now): number {
    let m = this.cfg.speed;
    const owner = this.player(v.ownerId);
    if (owner && !owner.human) m *= DIFFICULTY_MULT[this.cfg.difficulty] * (owner.eff ?? 1);
    if (!owner) m *= 0.5; // bárbaras produzem menos
    if (v.militia && v.militia.until > at) m *= 0.5;
    return m;
  }
  production(v: Village, r: keyof Res, at = this.now): number {
    let p = baseProduction(v.buildings[r]) * this.prodMult(v, at);
    if (v.bonus === r) p *= 2;
    if (v.bonus === 'all') p *= 1.3;
    return p;
  }
  storageCap(v: Village): number {
    return Math.round(storageCapacity(v.buildings.storage) * (v.bonus === 'storage' ? 1.5 : 1));
  }
  farmCap(v: Village): number {
    return Math.round(farmCapacity(v.buildings.farm) * (v.bonus === 'farm' ? 1.1 : 1));
  }
  hideCap(v: Village): number { return hideCapacity(v.buildings.hide); }

  /** Atualiza recursos, recrutamento e lealdade até o instante atual (idempotente). */
  update(v: Village): void {
    const t = this.now;
    // Recrutamento: unidades ficam prontas uma a uma.
    for (const b of Object.keys(v.recruit) as RecruitBuilding[]) {
      const q = v.recruit[b];
      while (q.length) {
        const item = q[0];
        while (item.done < item.total && item.next <= t) {
          item.done++;
          v.units[item.unit] = (v.units[item.unit] ?? 0) + 1;
          if (item.unit === 'knight' && v.ownerId) this.s.players[v.ownerId].knight.status = 'alive';
          if (v.ownerId === this.s.humanId) this.s.stats.recruited++;
          item.next += item.perUnit;
        }
        if (item.done >= item.total) {
          const finished = item.next - item.perUnit;
          q.shift();
          if (q[0]) q[0].next = finished + q[0].perUnit;
        } else break;
      }
    }
    // Recursos (produção muda apenas em eventos, então a integração é exata)
    if (t > v.lastUpdate) {
      const dtH = (t - v.lastUpdate) / HOUR;
      const cap = this.storageCap(v);
      // A milícia termina exatamente num evento, então vale o estado do início do intervalo.
      for (const r of RES_KEYS) {
        if (v.res[r] >= cap) continue;
        v.res[r] = Math.min(cap, v.res[r] + this.production(v, r, v.lastUpdate) * dtH);
      }
      v.lastUpdate = t;
    }
    // Lealdade regenera +1/h × velocidade
    if (v.loyalty < 100 && t > v.loyaltyTime) {
      v.loyalty = Math.min(100, v.loyalty + ((t - v.loyaltyTime) / HOUR) * this.cfg.speed);
    }
    v.loyaltyTime = t;
  }

  recalcPoints(v: Village): void {
    let p = 0;
    for (const id of BUILDING_ORDER) p += buildingPoints(BUILDINGS[id].points, v.buildings[id]);
    v.points = p;
  }

  /** Tropas desta aldeia fora de casa (comandos, apoios, coleta). */
  unitsAway(v: Village): Units {
    const out: Units = {};
    for (const c of Object.values(this.s.commands)) {
      if (c.type === 'attack' || c.type === 'support') { if (c.fromId === v.id && c.ownerId === v.ownerId) addUnits(out, c.units); }
      else if (c.type === 'return') { if (c.toId === v.id && c.ownerId === v.ownerId) addUnits(out, c.units); }
    }
    for (const o of Object.values(this.s.villages)) {
      for (const sp of o.supports) if (sp.homeId === v.id && sp.ownerId === v.ownerId) addUnits(out, sp.units);
    }
    for (const run of v.scavenge.runs) addUnits(out, run.units);
    return out;
  }
  unitsQueued(v: Village): Units {
    const out: Units = {};
    for (const b of Object.keys(v.recruit) as RecruitBuilding[]) {
      for (const it of v.recruit[b]) out[it.unit] = (out[it.unit] ?? 0) + it.total - it.done;
    }
    return out;
  }
  popUsed(v: Village): number {
    let p = 0;
    for (const id of BUILDING_ORDER) p += buildingPop(id, this.plannedLevel(v, id));
    p += unitsPop(v.units) + unitsPop(this.unitsAway(v)) + unitsPop(this.unitsQueued(v));
    return p;
  }
  plannedLevel(v: Village, b: BuildingId): number {
    let l = v.buildings[b];
    for (const q of v.buildQueue) if (q.building === b) l += q.demolish ? -1 : 1;
    return l;
  }

  // ---------------------------------------------------------------- construção
  buildingEnabled(b: BuildingId): boolean {
    const f = BUILDINGS[b].flag;
    if (!f) return true;
    return !!this.cfg[f];
  }
  buildTime(v: Village, b: BuildingId, level: number): number {
    const def = BUILDINGS[b];
    const secs = def.buildTime * 1.18 * Math.pow(1.2, buildTimeExponent(level)) * hqFactor(v.buildings.main);
    return Math.max(1, Math.round(secs / this.cfg.speed)) * SEC;
  }
  reqsMet(v: Village, reqs: Partial<Record<BuildingId, number>>): boolean {
    for (const [k, lvl] of Object.entries(reqs)) if (v.buildings[k as BuildingId] < (lvl ?? 0)) return false;
    return true;
  }
  canBuild(v: Village, b: BuildingId): Err {
    const def = BUILDINGS[b];
    if (!this.buildingEnabled(b)) return 'Desativado neste mundo';
    if (b === 'church_f') return 'A primeira igreja não pode ser construída';
    if (!this.reqsMet(v, def.reqs)) return 'Requisitos não cumpridos';
    const next = this.plannedLevel(v, b) + 1;
    if (next > def.max) return 'Nível máximo';
    if (v.buildQueue.length >= MAX_BUILD_QUEUE) return 'Fila cheia';
    const cost = buildingCost(b, next);
    this.update(v);
    if (cost.pop > 0 && this.popUsed(v) + cost.pop > this.farmCap(v)) return 'Fazenda pequena demais';
    const cap = this.storageCap(v);
    if (cost.wood > cap || cost.stone > cap || cost.iron > cap) return 'Armazém pequeno demais';
    if (!hasRes(v.res, cost)) return 'Recursos insuficientes';
    return null;
  }
  build(vid: string, b: BuildingId): Err {
    const v = this.village(vid);
    const err = this.canBuild(v, b);
    if (err) return err;
    const level = this.plannedLevel(v, b) + 1;
    const cost = buildingCost(b, level);
    const res = { wood: cost.wood, stone: cost.stone, iron: cost.iron };
    subRes(v.res, res);
    const start = v.buildQueue.length ? v.buildQueue[v.buildQueue.length - 1].end : this.now;
    const item: BuildQueueItem = { building: b, start, end: start + this.buildTime(v, b, level), cost: res };
    v.buildQueue.push(item);
    this.schedule({ t: item.end, kind: 'build', villageId: v.id });
    if (v.ownerId === this.s.humanId) this.s.stats.builds++;
    this.changed();
    return null;
  }
  canDemolish(v: Village, b: BuildingId): Err {
    if (v.buildings.main < 15) return 'Requer Edifício principal 15';
    this.update(v);
    if (v.loyalty < 100) return 'Requer lealdade 100';
    if (this.plannedLevel(v, b) <= BUILDINGS[b].min) return 'Nível mínimo';
    if (v.buildQueue.length >= MAX_BUILD_QUEUE) return 'Fila cheia';
    return null;
  }
  demolish(vid: string, b: BuildingId): Err {
    const v = this.village(vid);
    const err = this.canDemolish(v, b);
    if (err) return err;
    const level = this.plannedLevel(v, b);
    const start = v.buildQueue.length ? v.buildQueue[v.buildQueue.length - 1].end : this.now;
    const item: BuildQueueItem = { building: b, start, end: start + Math.round(this.buildTime(v, b, level) / 2), demolish: true, cost: { wood: 0, stone: 0, iron: 0 } };
    v.buildQueue.push(item);
    this.schedule({ t: item.end, kind: 'build', villageId: v.id });
    this.changed();
    return null;
  }
  cancelBuild(vid: string, idx: number): Err {
    const v = this.village(vid);
    const it = v.buildQueue[idx];
    if (!it) return 'Item inexistente';
    this.update(v);
    // Reembolso integral (como no TW1 ao cancelar); itens seguintes são reprogramados.
    const cap = this.storageCap(v);
    for (const r of RES_KEYS) v.res[r] = Math.min(cap, v.res[r] + it.cost[r]);
    v.buildQueue.splice(idx, 1);
    // O item em andamento (índice 0) mantém seu horário; os seguintes são encadeados de novo.
    let t = this.now;
    v.buildQueue.forEach((q, i) => {
      const dur = q.end - q.start;
      if (i === 0 && idx > 0) { t = q.end; return; }
      q.start = t;
      q.end = t + dur;
      t = q.end;
      this.schedule({ t: q.end, kind: 'build', villageId: v.id });
    });
    this.changed();
    return null;
  }
  private onBuild(v: Village) {
    this.update(v);
    while (v.buildQueue.length && v.buildQueue[0].end <= this.now) {
      const it = v.buildQueue.shift()!;
      const def = BUILDINGS[it.building];
      if (it.demolish) v.buildings[it.building] = Math.max(def.min, v.buildings[it.building] - 1);
      else v.buildings[it.building] = Math.min(def.max, v.buildings[it.building] + 1);
      this.recalcPoints(v);
      if (v.ownerId === this.s.humanId) {
        this.notify(`${def.name} ${it.demolish ? 'demolido para' : 'concluído:'} nível ${v.buildings[it.building]} em ${v.name}`, 'good');
      }
    }
    this.changed();
  }

  // ---------------------------------------------------------------- pesquisa e recrutamento
  unitEnabled(u: UnitId): boolean {
    const f = UNITS[u].flag;
    if (f === 'archer') return this.cfg.archers;
    if (f === 'paladin') return this.cfg.paladin;
    return true;
  }
  isResearched(v: Village, u: UnitId): boolean {
    return UNITS[u].research === null || !!v.research[u];
  }
  researchTime(v: Village, u: UnitId): number {
    const r = UNITS[u].research!;
    return Math.round((r.time * Math.pow(1.06, -v.buildings.smith)) / this.cfg.speed) * SEC;
  }
  canResearch(v: Village, u: UnitId): Err {
    const def = UNITS[u];
    if (!this.unitEnabled(u)) return 'Desativado';
    if (!def.research) return 'Não requer pesquisa';
    if (v.research[u]) return 'Já pesquisado';
    if (v.buildings.smith < 1) return 'Requer ferreiro';
    if (v.researchQueue) return 'Já há uma pesquisa em andamento';
    const reqs = { ...def.reqs };
    if (!this.reqsMet(v, reqs)) return 'Requisitos não cumpridos';
    this.update(v);
    if (!hasRes(v.res, def.research)) return 'Recursos insuficientes';
    return null;
  }
  research(vid: string, u: UnitId): Err {
    const v = this.village(vid);
    const err = this.canResearch(v, u);
    if (err) return err;
    subRes(v.res, UNITS[u].research!);
    v.researchQueue = { unit: u, end: this.now + this.researchTime(v, u) };
    this.schedule({ t: v.researchQueue.end, kind: 'research', villageId: v.id });
    this.changed();
    return null;
  }
  private onResearch(v: Village) {
    if (v.researchQueue && v.researchQueue.end <= this.now) {
      v.research[v.researchQueue.unit] = true;
      if (v.ownerId === this.s.humanId) this.notify(`Pesquisa concluída: ${UNITS[v.researchQueue.unit].name} em ${v.name}`, 'good');
      v.researchQueue = null;
      this.changed();
    }
  }
  recruitTimePerUnit(v: Village, u: UnitId): number {
    const def = UNITS[u];
    let t: number;
    if (u === 'knight') t = def.time;
    else if (u === 'snob') t = def.time * Math.pow(1.06, -(v.buildings.snob - 1));
    else t = def.time * (2 / 3) * Math.pow(1.06, -v.buildings[def.building]);
    if (v.bonus === 'barracks' && def.building === 'barracks') t *= 0.67;
    if (v.bonus === 'stable' && def.building === 'stable') t *= 0.67;
    return Math.max(1, Math.round(t / this.cfg.speed)) * SEC;
  }
  canRecruitType(v: Village, u: UnitId): Err {
    const def = UNITS[u];
    if (!this.unitEnabled(u)) return 'Desativado neste mundo';
    if (!this.reqsMet(v, def.reqs)) return 'Requisitos não cumpridos';
    if (!this.isResearched(v, u)) return 'Precisa ser pesquisado no ferreiro';
    return null;
  }
  noblesOf(pid: string): number {
    let n = 0;
    for (const v of Object.values(this.s.villages)) {
      if (v.ownerId === pid) {
        n += v.units.snob ?? 0;
        for (const it of v.recruit.snob) n += it.total - it.done;
      }
      for (const sp of v.supports) if (sp.ownerId === pid) n += sp.units.snob ?? 0;
    }
    for (const c of Object.values(this.s.commands)) if (c.ownerId === pid) n += c.units.snob ?? 0;
    return n;
  }
  nobleSlots(pid: string): { total: number; used: number; nextCoins: number } {
    const coins = this.s.players[pid].coins;
    let total = 0;
    while (((total + 1) * (total + 2)) / 2 <= coins) total++;
    const used = this.noblesOf(pid) + Math.max(0, this.villagesOf(pid).length - 1);
    const nextCoins = ((total + 1) * (total + 2)) / 2 - coins;
    return { total, used, nextCoins };
  }
  maxRecruitable(v: Village, u: UnitId): number {
    if (this.canRecruitType(v, u)) return 0;
    const def = UNITS[u];
    this.update(v);
    let n = Math.floor(Math.min(
      def.wood ? v.res.wood / def.wood : Infinity,
      def.stone ? v.res.stone / def.stone : Infinity,
      def.iron ? v.res.iron / def.iron : Infinity,
      (this.farmCap(v) - this.popUsed(v)) / def.pop,
    ));
    if (u === 'knight') {
      const k = this.s.players[v.ownerId!].knight.status;
      n = k === 'none' || k === 'dead' ? Math.min(n, 1) : 0;
    }
    if (u === 'snob') {
      const sl = this.nobleSlots(v.ownerId!);
      n = Math.min(n, sl.total - sl.used);
    }
    return Math.max(0, n);
  }
  recruit(vid: string, u: UnitId, count: number): Err {
    const v = this.village(vid);
    count = Math.floor(count);
    if (count <= 0) return 'Quantidade inválida';
    const err = this.canRecruitType(v, u);
    if (err) return err;
    if (count > this.maxRecruitable(v, u)) return u === 'snob' ? 'Sem recursos, população ou moedas suficientes' : 'Recursos ou população insuficientes';
    const def = UNITS[u];
    const cost = { wood: def.wood * count, stone: def.stone * count, iron: def.iron * count };
    subRes(v.res, cost);
    const b = def.building as RecruitBuilding;
    const per = this.recruitTimePerUnit(v, u);
    const q = v.recruit[b];
    const item: RecruitItem = { unit: u, total: count, done: 0, perUnit: per, next: q.length ? Infinity : this.now + per, cost };
    q.push(item);
    if (u === 'knight') this.s.players[v.ownerId!].knight.status = 'training';
    this.changed();
    return null;
  }
  cancelRecruit(vid: string, b: RecruitBuilding, idx: number): Err {
    const v = this.village(vid);
    this.update(v);
    const q = v.recruit[b];
    const it = q[idx];
    if (!it) return 'Item inexistente';
    const left = it.total - it.done;
    const frac = left / it.total;
    const cap = this.storageCap(v);
    for (const r of RES_KEYS) v.res[r] = Math.min(cap, v.res[r] + Math.floor(it.cost[r] * frac * 0.9));
    q.splice(idx, 1);
    if (idx === 0 && q[0]) q[0].next = this.now + q[0].perUnit;
    if (it.unit === 'knight') this.s.players[v.ownerId!].knight.status = 'none';
    this.changed();
    return null;
  }
  recruitQueueEnd(v: Village, b: RecruitBuilding): number {
    const q = v.recruit[b];
    if (!q.length) return this.now;
    let t = q[0].next - q[0].perUnit;
    for (const it of q) t += it.perUnit * (it.total - it.done);
    return t;
  }

  // ---------------------------------------------------------------- academia e paladino
  mintCoin(vid: string, n = 1): Err {
    const v = this.village(vid);
    if (v.buildings.snob < 1) return 'Requer academia';
    this.update(v);
    const cost = { wood: COIN_COST.wood * n, stone: COIN_COST.stone * n, iron: COIN_COST.iron * n };
    if (!hasRes(v.res, cost)) return 'Recursos insuficientes';
    subRes(v.res, cost);
    this.s.players[v.ownerId!].coins += n;
    this.changed();
    return null;
  }
  knightWeaponMods(pid: string | null, present: boolean): { unit?: UnitId; id?: string } {
    if (!pid || !present || !this.cfg.paladin) return {};
    const w = this.s.players[pid]?.knight.weapon;
    if (!w) return {};
    const def = WEAPONS.find((x) => x.id === w);
    return { unit: def?.unit, id: w };
  }
  equipWeapon(pid: string, w: string | null): Err {
    const p = this.s.players[pid];
    if (w && !p.knight.weapons.includes(w)) return 'Arma não encontrada';
    p.knight.weapon = w;
    this.changed();
    return null;
  }

  // ---------------------------------------------------------------- milícia
  toggleMilitia(vid: string): Err {
    const v = this.village(vid);
    if (!this.cfg.militia) return 'Milícia desativada';
    this.update(v);
    if (v.militia && v.militia.until > this.now) {
      v.militia = null;
      this.changed();
      return null;
    }
    if (v.buildings.farm < 1) return 'Requer fazenda';
    const count = Math.min(v.buildings.farm, 15) * 20;
    v.militia = { count, until: this.now + Math.round((6 * HOUR) / this.cfg.speed) };
    this.schedule({ t: v.militia.until, kind: 'militia', villageId: v.id });
    this.changed();
    return null;
  }

  // ---------------------------------------------------------------- movimento
  travelTime(from: { x: number; y: number }, to: { x: number; y: number }, units: Units): number {
    const slow = slowestUnit(units);
    if (!slow) return 0;
    const d = distance(from, to);
    return Math.round((d * UNITS[slow].speed * MIN) / (this.cfg.speed * this.cfg.unitSpeed));
  }
  canSend(fromId: string, toId: string, type: 'attack' | 'support', units: Units): Err {
    const from = this.village(fromId), to = this.village(toId);
    if (!from || !to) return 'Aldeia inválida';
    if (fromId === toId) return 'Origem e destino são iguais';
    if (from.buildings.place < 1) return 'Requer ponto de encontro';
    this.update(from);
    let total = 0;
    for (const k in units) {
      const id = k as UnitId;
      const n = units[id] ?? 0;
      if (n < 0 || !Number.isFinite(n)) return 'Quantidade inválida';
      if (n > (from.units[id] ?? 0)) return `Não há ${UNITS[id].plural} suficientes`;
      total += n;
    }
    if (total <= 0) return 'Nenhuma unidade selecionada';
    const rel = this.relation(from.ownerId, to.ownerId);
    if (type === 'attack') {
      if (rel === 'self') return 'Não é possível atacar a própria aldeia';
      if (rel === 'tribe') return 'Não é possível atacar membros da própria tribo';
      if (to.ownerId && (this.isProtected(to.ownerId) || this.isProtected(from.ownerId))) return 'Proteção de iniciante ativa';
      if ((units.snob ?? 0) > 0 && distance(from, to) > this.cfg.nobleMaxDist) return `Nobres só alcançam ${this.cfg.nobleMaxDist} campos`;
    } else {
      if (!to.ownerId) return 'Não é possível apoiar aldeias bárbaras';
      if ((units.snob ?? 0) > 0) return 'Nobres não podem apoiar';
    }
    return null;
  }
  send(fromId: string, toId: string, type: 'attack' | 'support', units: Units, catapultTarget?: BuildingId): Err {
    const err = this.canSend(fromId, toId, type, units);
    if (err) return err;
    const from = this.village(fromId), to = this.village(toId);
    const clean: Units = {};
    for (const k in units) { const n = Math.floor(units[k as UnitId] ?? 0); if (n > 0) clean[k as UnitId] = n; }
    addUnits(from.units, clean, -1);
    const dur = this.travelTime(from, to, clean);
    const c: Command = {
      id: this.newId('c'), type, ownerId: from.ownerId!, fromId, toId, units: clean,
      start: this.now, arrival: this.now + dur, slowest: slowestUnit(clean) ?? undefined,
      catapultTarget: clean.catapult ? catapultTarget ?? 'main' : undefined,
    };
    this.s.commands[c.id] = c;
    this.schedule({ t: c.arrival, kind: 'command', commandId: c.id });
    if (from.ownerId === this.s.humanId && type === 'attack') this.s.stats.attacksSent++;
    if (type === 'attack') this.hooks.onAttackIncoming?.(this, c);
    this.changed();
    return null;
  }
  canCancel(c: Command): boolean {
    return (c.type === 'attack' || c.type === 'support') && this.now - c.start <= this.cfg.cancelMinutes * MIN;
  }
  cancelCommand(cid: string): Err {
    const c = this.s.commands[cid];
    if (!c) return 'Comando inexistente';
    if (!this.canCancel(c)) return 'Tempo de cancelamento expirado';
    delete this.s.commands[cid];
    this.createReturn(c, c.units, undefined, this.now - c.start);
    this.changed();
    return null;
  }
  private createReturn(c: Command, units: Units, loot: Res | undefined, dur: number) {
    if (unitCount(units) <= 0) return;
    const r: Command = {
      id: this.newId('c'), type: 'return', ownerId: c.ownerId, fromId: c.toId, toId: c.fromId, units,
      res: loot, start: this.now, arrival: this.now + dur, origin: c.id,
    };
    this.s.commands[r.id] = r;
    this.schedule({ t: r.arrival, kind: 'command', commandId: r.id });
  }
  /** Devolve um apoio estacionado para a aldeia de origem. */
  sendBackSupport(villageId: string, idx: number, units?: Units): Err {
    const v = this.village(villageId);
    const sp = v.supports[idx];
    if (!sp) return 'Apoio inexistente';
    const home = this.village(sp.homeId);
    const u = units ? cloneUnits(units) : cloneUnits(sp.units);
    for (const k in u) { const id = k as UnitId; u[id] = Math.min(u[id] ?? 0, sp.units[id] ?? 0); }
    addUnits(sp.units, u, -1);
    if (unitCount(sp.units) <= 0) v.supports.splice(idx, 1);
    const fake: Command = { id: 'x', type: 'support', ownerId: sp.ownerId, fromId: sp.homeId, toId: v.id, units: u, start: 0, arrival: 0 };
    this.createReturn(fake, u, undefined, this.travelTime(v, home, u));
    this.changed();
    return null;
  }

  // ---------------------------------------------------------------- mercado
  merchantsTotal(v: Village): number {
    return Math.round(merchantCount(v.buildings.market) * (v.bonus === 'market' ? 1.5 : 1));
  }
  merchantsBusy(v: Village): number {
    let n = 0;
    for (const c of Object.values(this.s.commands)) {
      if (c.type === 'trade' && c.fromId === v.id) n += c.merchants ?? 0;
      if (c.type === 'tradeReturn' && c.toId === v.id) n += c.merchants ?? 0;
    }
    for (const o of Object.values(this.s.offers)) if (o.villageId === v.id) n += Math.ceil(o.giveAmount / MERCHANT_CAPACITY) * o.count;
    return n;
  }
  merchantsFree(v: Village): number { return Math.max(0, this.merchantsTotal(v) - this.merchantsBusy(v)); }
  tradeTime(a: Village, b: Village): number {
    return Math.round((distance(a, b) * MERCHANT_MIN_PER_FIELD * MIN) / this.cfg.speed);
  }
  sendResources(fromId: string, toId: string, res: Res, offerId?: string): Err {
    const from = this.village(fromId), to = this.village(toId);
    if (!from || !to || fromId === toId) return 'Destino inválido';
    if (!to.ownerId) return 'Não é possível enviar recursos a bárbaros';
    this.update(from);
    const r = { wood: Math.floor(res.wood), stone: Math.floor(res.stone), iron: Math.floor(res.iron) };
    if (r.wood < 0 || r.stone < 0 || r.iron < 0) return 'Quantidade inválida';
    const total = resSum(r);
    if (total <= 0) return 'Nada para enviar';
    if (!hasRes(from.res, r)) return 'Recursos insuficientes';
    const need = Math.ceil(total / MERCHANT_CAPACITY);
    if (need > this.merchantsFree(from)) return `São necessários ${need} mercadores`;
    subRes(from.res, r);
    const c: Command = {
      id: this.newId('c'), type: 'trade', ownerId: from.ownerId!, fromId, toId, units: {}, res: r, merchants: need,
      start: this.now, arrival: this.now + this.tradeTime(from, to), offerId,
    };
    this.s.commands[c.id] = c;
    this.schedule({ t: c.arrival, kind: 'command', commandId: c.id });
    if (from.ownerId === this.s.humanId) this.s.stats.resourcesTraded += total;
    this.changed();
    return null;
  }
  createOffer(vid: string, give: keyof Res, giveAmount: number, want: keyof Res, wantAmount: number, count: number): Err {
    const v = this.village(vid);
    this.update(v);
    if (give === want) return 'Recursos devem ser diferentes';
    if (giveAmount <= 0 || wantAmount <= 0 || count <= 0) return 'Valores inválidos';
    if (wantAmount > giveAmount * 2 || giveAmount > wantAmount * 2) return 'Proporção máxima 1:2';
    if (Math.ceil(giveAmount / MERCHANT_CAPACITY) * count > this.merchantsFree(v)) return 'Mercadores insuficientes';
    if (v.res[give] < giveAmount * count) return 'Recursos insuficientes';
    v.res[give] -= giveAmount * count;
    const o = { id: this.newId('o'), ownerId: v.ownerId!, villageId: vid, give, giveAmount, want, wantAmount, count, created: this.now };
    this.s.offers[o.id] = o;
    this.changed();
    return null;
  }
  deleteOffer(oid: string): Err {
    const o = this.s.offers[oid];
    if (!o) return 'Oferta inexistente';
    const v = this.village(o.villageId);
    this.update(v);
    v.res[o.give] = Math.min(this.storageCap(v), v.res[o.give] + o.giveAmount * o.count);
    delete this.s.offers[oid];
    this.changed();
    return null;
  }
  /** Aceita uma oferta: `vid` envia o recurso desejado e a oferta envia o recurso ofertado. */
  acceptOffer(oid: string, vid: string): Err {
    const o = this.s.offers[oid];
    if (!o || o.count <= 0) return 'Oferta indisponível';
    const v = this.village(vid);
    if (v.ownerId === o.ownerId) return 'Oferta própria';
    const ov = this.village(o.villageId);
    if (!ov || ov.ownerId !== o.ownerId) { delete this.s.offers[oid]; return 'Oferta expirada'; }
    const pay = { wood: 0, stone: 0, iron: 0 };
    pay[o.want] = o.wantAmount;
    const err = this.sendResources(vid, o.villageId, pay);
    if (err) return err;
    // Devolve temporariamente a reserva da oferta para despachar 1 lote
    o.count--;
    const give = { wood: 0, stone: 0, iron: 0 };
    give[o.give] = o.giveAmount;
    ov.res[o.give] += o.giveAmount; // a reserva já havia sido debitada
    if (o.count <= 0) delete this.s.offers[oid];
    const e2 = this.sendResources(o.villageId, vid, give, oid);
    if (e2) {
      // Sem mercadores livres do outro lado: entrega instantânea não é permitida, então reembolsa
      ov.res[o.give] -= o.giveAmount;
      const c: Command = {
        id: this.newId('c'), type: 'trade', ownerId: o.ownerId, fromId: o.villageId, toId: vid, units: {}, res: give, merchants: 0,
        start: this.now, arrival: this.now + this.tradeTime(ov, v),
      };
      this.s.commands[c.id] = c;
      this.schedule({ t: c.arrival, kind: 'command', commandId: c.id });
    }
    this.changed();
    return null;
  }

  // ---------------------------------------------------------------- coleta
  scavengeDuration(carry: number, option: number): number {
    const loot = carry * SCAVENGE_OPTIONS[option].factor;
    const secs = (Math.pow(loot * loot * 100, 0.45) + 1800) * Math.pow(this.cfg.speed, -0.55);
    return Math.round(secs) * SEC;
  }
  unlockScavenge(vid: string, option: number): Err {
    const v = this.village(vid);
    if (!this.cfg.scavenging) return 'Coleta desativada';
    if (v.scavenge.unlocked[option]) return 'Já liberada';
    if (option > 0 && !v.scavenge.unlocked[option - 1]) return 'Libere a opção anterior primeiro';
    this.update(v);
    const cost = SCAVENGE_OPTIONS[option].unlock;
    if (!hasRes(v.res, cost)) return 'Recursos insuficientes';
    subRes(v.res, cost);
    v.scavenge.unlocked[option] = true;
    this.changed();
    return null;
  }
  startScavenge(vid: string, option: number, units: Units): Err {
    const v = this.village(vid);
    if (!this.cfg.scavenging) return 'Coleta desativada';
    if (v.buildings.place < 1) return 'Requer ponto de encontro';
    if (!v.scavenge.unlocked[option]) return 'Opção bloqueada';
    if (v.scavenge.runs.some((r) => r.option === option)) return 'Opção já em andamento';
    this.update(v);
    const clean: Units = {};
    for (const k in units) {
      const id = k as UnitId;
      const n = Math.floor(units[id] ?? 0);
      if (n <= 0) continue;
      if (!SCAVENGE_UNITS.includes(id)) return `${UNITS[id].plural} não coletam`;
      if (n > (v.units[id] ?? 0)) return 'Tropas insuficientes';
      clean[id] = n;
    }
    const carry = unitsCarry(clean);
    if (carry <= 0) return 'Selecione tropas';
    addUnits(v.units, clean, -1);
    const run = { option, units: clean, end: this.now + this.scavengeDuration(carry, option), loot: Math.floor(carry * SCAVENGE_OPTIONS[option].factor) };
    v.scavenge.runs.push(run);
    this.schedule({ t: run.end, kind: 'scavenge', villageId: v.id });
    if (v.ownerId === this.s.humanId) this.s.stats.scavenges++;
    this.changed();
    return null;
  }
  private onScavenge(v: Village) {
    this.update(v);
    const cap = this.storageCap(v);
    v.scavenge.runs = v.scavenge.runs.filter((r) => {
      if (r.end > this.now) return true;
      addUnits(v.units, r.units);
      const each = Math.floor(r.loot / 3);
      for (const k of RES_KEYS) v.res[k] = Math.max(v.res[k], Math.min(cap, v.res[k] + each));
      if (v.ownerId === this.s.humanId) this.notify(`Coleta retornou a ${v.name} com ${r.loot} recursos`, 'good');
      return false;
    });
    this.changed();
  }

  // ---------------------------------------------------------------- fé
  faith(v: Village): number {
    if (!this.cfg.church || !v.ownerId) return 1;
    for (const o of Object.values(this.s.villages)) {
      if (o.ownerId !== v.ownerId) continue;
      const r = Math.max(CHURCH_RADIUS[o.buildings.church] ?? 0, o.buildings.church_f ? 4 : 0);
      if (r > 0 && distance(o, v) <= r) return 1;
    }
    return 0.5;
  }

  // ---------------------------------------------------------------- relógio
  /** Avança o relógio processando todos os eventos em ordem. */
  advance(ms: number): void {
    if (this.s.victory.result) return;
    const target = this.now + ms;
    let guard = 0;
    while (this.s.events.length && this.s.events[0].t <= target) {
      const e = heapPop(this.s.events)!;
      this.s.now = Math.max(this.s.now, e.t);
      this.process(e);
      if (++guard > 200000) break;
    }
    this.s.now = target;
    this.emit();
  }
  private process(e: GameEvent) {
    switch (e.kind) {
      case 'build': { const v = this.s.villages[e.villageId]; if (v) this.onBuild(v); break; }
      case 'research': { const v = this.s.villages[e.villageId]; if (v) this.onResearch(v); break; }
      case 'scavenge': { const v = this.s.villages[e.villageId]; if (v) this.onScavenge(v); break; }
      case 'militia': {
        const v = this.s.villages[e.villageId];
        if (v?.militia && v.militia.until <= this.now) {
          // Integra a produção reduzida até o fim da milícia antes de removê-la.
          this.update(v); v.militia = null; this.changed();
        }
        break;
      }
      case 'command': { const c = this.s.commands[e.commandId]; if (c && !c.cancelled && c.arrival <= this.now) this.onCommand(c); break; }
      case 'bot': {
        const p = this.s.players[e.playerId];
        if (p && p.alive && !p.human) {
          this.hooks.botThink?.(this, p);
          const next = this.now + Math.round(((12 + this.rand() * 18) * MIN) / Math.sqrt(this.cfg.speed));
          p.nextThink = next;
          this.schedule({ t: next, kind: 'bot', playerId: p.id });
        }
        break;
      }
      case 'hourly': {
        this.onHourly();
        this.schedule({ t: this.now + HOUR, kind: 'hourly' });
        break;
      }
    }
  }

  // ---------------------------------------------------------------- chegada de comandos
  private onCommand(c: Command) {
    delete this.s.commands[c.id];
    const to = this.s.villages[c.toId];
    switch (c.type) {
      case 'support': {
        this.update(to);
        if (!to.ownerId) { this.createReturn(c, c.units, undefined, c.arrival - c.start); return; }
        if (to.ownerId === c.ownerId && to.id === c.fromId) { addUnits(to.units, c.units); return; }
        const ex = to.supports.find((s) => s.homeId === c.fromId && s.ownerId === c.ownerId);
        if (ex) addUnits(ex.units, c.units); else to.supports.push({ ownerId: c.ownerId, homeId: c.fromId, units: cloneUnits(c.units) });
        const from = this.s.villages[c.fromId];
        if (to.ownerId === this.s.humanId && c.ownerId !== this.s.humanId) {
          this.addReport({ kind: 'support', color: 'blue', title: `${this.s.players[c.ownerId]?.name} apoia ${to.name}`, attacker: { playerId: c.ownerId, villageId: c.fromId, units: c.units, losses: {} }, text: `Tropas de ${from ? this.villageLabel(from) : '?'} chegaram para defender ${this.villageLabel(to)}.` });
        }
        if (c.ownerId === this.s.humanId) {
          this.addReport({ kind: 'support', color: 'blue', title: `Apoio chegou a ${to.name}`, attacker: { playerId: c.ownerId, villageId: c.fromId, units: c.units, losses: {} }, text: `Suas tropas chegaram a ${this.villageLabel(to)}.` });
        }
        break;
      }
      case 'return': {
        const home = this.s.villages[c.toId];
        if (!home || home.ownerId !== c.ownerId) {
          // Aldeia perdida: tropas se dispersam.
          if ((c.units.knight ?? 0) > 0) this.s.players[c.ownerId].knight.status = 'dead';
          return;
        }
        this.update(home);
        addUnits(home.units, c.units);
        if (c.res) {
          const cap = this.storageCap(home);
          for (const r of RES_KEYS) home.res[r] = Math.max(home.res[r], Math.min(cap, home.res[r] + c.res[r]));
        }
        break;
      }
      case 'trade': {
        this.update(to);
        const cap = this.storageCap(to);
        if (c.res) for (const r of RES_KEYS) to.res[r] = Math.max(to.res[r], Math.min(cap, to.res[r] + c.res[r]));
        if (c.merchants) {
          const from = this.s.villages[c.fromId];
          const back: Command = { id: this.newId('c'), type: 'tradeReturn', ownerId: c.ownerId, fromId: c.toId, toId: c.fromId, units: {}, merchants: c.merchants, start: this.now, arrival: this.now + this.tradeTime(from, to) };
          this.s.commands[back.id] = back;
          this.schedule({ t: back.arrival, kind: 'command', commandId: back.id });
        }
        if (to.ownerId === this.s.humanId && c.res) {
          this.addReport({ kind: 'trade', color: 'grey', title: `Recursos chegaram a ${to.name}`, loot: c.res, text: `De ${this.s.players[c.ownerId]?.name ?? '?'} (${this.s.villages[c.fromId]?.name ?? '?'}).` });
        }
        break;
      }
      case 'tradeReturn': break;
      case 'attack': this.resolveAttack(c, to); break;
    }
    this.changed();
  }

  private resolveAttack(c: Command, v: Village) {
    this.update(v);
    const from = this.s.villages[c.fromId];
    const attacker = this.s.players[c.ownerId];
    const defenderId = v.ownerId;
    const cfg = this.cfg;

    // Se o dono virou o próprio atacante (conquista por onda anterior), vira apoio.
    if (defenderId === c.ownerId) {
      addUnits(v.units, c.units);
      return;
    }
    const defGroups = [{ key: 'own', units: v.units }, ...v.supports.map((s, i) => ({ key: 's' + i, units: s.units }))];
    const militia = v.militia && v.militia.until > this.now ? v.militia.count : 0;
    const luck = Math.round((this.rand() * 0.5 - 0.25) * 1000) / 1000;
    const morale = cfg.morale && defenderId ? moraleFor(this.playerPoints(c.ownerId), this.playerPoints(defenderId)) : 1;
    const night = defenderId && this.isNight() ? cfg.nightFactor : 1;
    const faithAtt = from ? this.faith(from) : 1;
    const faithDef = this.faith(v);
    const attW = this.knightWeaponMods(c.ownerId, (c.units.knight ?? 0) > 0);
    const defW = this.knightWeaponMods(defenderId, (v.units.knight ?? 0) > 0);
    const attMods: Partial<Record<UnitId, number>> = {};
    const defMods: Partial<Record<UnitId, number>> = {};
    if (attW.unit) attMods[attW.unit] = 1.3;
    if (defW.unit) defMods[defW.unit] = 1.2;
    const tgt = c.catapultTarget;
    const catTarget = (c.units.catapult ?? 0) > 0 && tgt
      ? { level: v.buildings[tgt], min: BUILDINGS[tgt].min, isWall: tgt === 'wall' }
      : null;
    const wallBefore = v.buildings.wall;
    const r = resolveBattle({
      att: c.units, defGroups, militia, wall: wallBefore, luck, morale, faithAtt, faithDef, night, attMods, defMods,
      ramMult: attW.id === 'morningstar' ? 2 : 1, catMult: attW.id === 'bonfire' ? 2 : 1, catTarget,
    });

    // Snapshot para relatório
    const defUnitsBefore = cloneUnits(v.units);
    const supUnitsBefore: Units = {};
    for (const s of v.supports) addUnits(supUnitsBefore, s.units);
    const supLosses: Units = {};

    // Aplica perdas
    const survivors = cloneUnits(c.units);
    addUnits(survivors, r.attLosses, -1);
    addUnits(v.units, r.defLosses.own ?? {}, -1);
    const supportOwners: Record<string, Units> = {};
    v.supports.forEach((s, i) => {
      const l = r.defLosses['s' + i] ?? {};
      addUnits(s.units, l, -1);
      addUnits(supLosses, l);
      supportOwners[s.ownerId] = supportOwners[s.ownerId] ?? {};
      addUnits(supportOwners[s.ownerId], l);
    });
    v.supports = v.supports.filter((s) => unitCount(s.units) > 0);
    if (v.militia && militia) v.militia.count = Math.max(0, v.militia.count - r.militiaLost);

    // Paladinos
    if (r.attLosses.knight) { attacker.knight.status = 'dead'; }
    if (defenderId && (r.defLosses.own?.knight ?? 0) > 0) this.s.players[defenderId].knight.status = 'dead';
    for (const s of Object.keys(supportOwners)) if ((supportOwners[s].knight ?? 0) > 0) this.s.players[s].knight.status = 'dead';

    // Pontos de adversários derrotados
    const allDefLosses: Units = {};
    for (const k in r.defLosses) addUnits(allDefLosses, r.defLosses[k]);
    let oda = 0, odd = 0;
    for (const k in allDefLosses) oda += (allDefLosses[k as UnitId] ?? 0) * OD_POINTS[k][0];
    oda += r.militiaLost * OD_POINTS.militia[0];
    for (const k in r.attLosses) odd += (r.attLosses[k as UnitId] ?? 0) * OD_POINTS[k][1];
    attacker.oda += oda;
    const defPlayer = this.player(defenderId);
    const ownLost = unitCount(r.defLosses.own ?? {});
    const totLost = ownLost + unitCount(supLosses);
    if (defPlayer) defPlayer.odd += totLost ? Math.round((odd * ownLost) / totLost) : odd;
    if (totLost) {
      for (const s of Object.keys(supportOwners)) {
        const p = this.s.players[s];
        if (p) p.ods += Math.round((odd * unitCount(supportOwners[s])) / totLost);
      }
    }

    // Estruturas
    v.buildings.wall = r.wallAfter;
    let catBefore: number | undefined, catAfter: number | undefined;
    if (catTarget && tgt) {
      catBefore = tgt === 'wall' ? wallBefore : catTarget.level;
      catAfter = r.catAfter ?? catBefore;
      if (tgt !== 'wall') v.buildings[tgt] = catAfter;
    }
    this.recalcPoints(v);

    // Saque
    let loot: Res | undefined;
    const lootCap = unitsCarry(survivors);
    if (r.attackerWon && !r.scoutOnly && lootCap > 0) {
      const hide = this.hideCap(v);
      const avail = { wood: Math.max(0, Math.floor(v.res.wood - hide)), stone: Math.max(0, Math.floor(v.res.stone - hide)), iron: Math.max(0, Math.floor(v.res.iron - hide)) };
      loot = distributeLoot(avail, lootCap);
      subRes(v.res, loot);
      attacker.loot += resSum(loot);
    }

    // Inteligência de exploradores
    const pct = r.spySent > 0 ? r.spySurvivors / r.spySent : 0;
    const intel: Report['intel'] = {};
    const telescope = attW.id === 'star';
    if (r.spySurvivors > 0) {
      if (pct >= 0.5) { const h = this.hideCap(v); intel.res = { wood: Math.max(0, Math.floor(v.res.wood - h)), stone: Math.max(0, Math.floor(v.res.stone - h)), iron: Math.max(0, Math.floor(v.res.iron - h)) }; }
      if (pct >= 0.7) intel.buildings = { ...v.buildings };
      if (pct > 0.9 || telescope) intel.outside = this.unitsAway(v);
    }
    const seesDefense = r.attackerWon || (r.scoutOnly && r.spySurvivors > 0);

    // Nobre e lealdade
    let loyaltyBefore: number | undefined, loyaltyAfter: number | undefined;
    let conquered = false;
    if (r.attackerWon && !r.scoutOnly && (survivors.snob ?? 0) > 0) {
      loyaltyBefore = Math.floor(v.loyalty);
      const min = attW.id === 'scepter' ? Math.max(30, cfg.loyaltyMin) : cfg.loyaltyMin;
      const drop = this.randInt(min, Math.max(min, cfg.loyaltyMax));
      v.loyalty -= drop;
      v.loyaltyTime = this.now;
      loyaltyAfter = Math.floor(v.loyalty);
      if (v.loyalty <= 0) {
        conquered = true;
        loyaltyAfter = 25;
      }
    }

    // Arma do paladino
    let weaponFound: string | undefined;
    if (r.attackerWon && (survivors.knight ?? 0) > 0 && this.cfg.paladin) {
      const missing = WEAPONS.filter((w) => !attacker.knight.weapons.includes(w.id));
      if (missing.length && this.rand() < 0.04) {
        weaponFound = missing[Math.floor(this.rand() * missing.length)].id;
        attacker.knight.weapons.push(weaponFound);
      }
    }

    // Relatórios
    const attSide: BattleSide = { playerId: c.ownerId, villageId: c.fromId, units: cloneUnits(c.units), losses: r.attLosses };
    const defSide = {
      playerId: defenderId, villageId: v.id, units: seesDefense ? defUnitsBefore : {}, losses: seesDefense ? (r.defLosses.own ?? {}) : {},
      supportUnits: seesDefense ? supUnitsBefore : {}, supportLosses: seesDefense ? supLosses : {}, militia, militiaLost: r.militiaLost,
    };
    const base: Omit<Report, 'id' | 'time' | 'read' | 'kind' | 'title' | 'color'> = {
      attacker: attSide, defender: defSide, luck: r.scoutOnly ? undefined : luck, morale, night: night > 1,
      wallBefore, wallAfter: r.wallAfter, wallBattle: r.wallBattle, loot, lootCap,
      loyaltyBefore, loyaltyAfter, catTarget: tgt, catBefore, catAfter, intel, faithAtt, faithDef, weaponFound,
    };
    const fromName = from ? from.name : '?';
    if (c.ownerId === this.s.humanId) {
      const lostAll = unitCount(survivors) === 0;
      const color = !r.attackerWon ? 'red' : unitCount(r.attLosses) > 0 ? 'yellow' : 'green';
      this.addReport({ ...base, kind: r.scoutOnly ? 'scout' : 'attack', color, title: `${fromName} ${r.scoutOnly ? 'espiona' : 'ataca'} ${this.villageLabel(v)}${lostAll ? ' — tropas perdidas' : ''}` });
      if (!r.scoutOnly && r.attackerWon && !defenderId) this.s.stats.farmRuns++;
    }
    if (defenderId === this.s.humanId) {
      const full = { ...base, defender: { ...defSide, units: defUnitsBefore, losses: r.defLosses.own ?? {}, supportUnits: supUnitsBefore, supportLosses: supLosses }, intel: undefined };
      this.addReport({ ...full, kind: 'defense', color: r.attackerWon ? 'red' : unitCount(r.defLosses.own ?? {}) ? 'yellow' : 'green', title: `${attacker.name} ${r.scoutOnly ? 'espionou' : 'atacou'} ${this.villageLabel(v)}` });
    }
    if (supportOwners[this.s.humanId] && defenderId !== this.s.humanId) {
      this.addReport({ ...base, kind: 'support', color: 'yellow', title: `Seu apoio em ${v.name} foi atacado`, text: 'Suas tropas de apoio participaram da defesa.' });
    }

    // Memória dos bots
    if (!attacker.human && attacker.memory) {
      // Bots memorizam a defesa restante após a batalha (simplificação da leitura de relatórios).
      const u = cloneUnits(v.units);
      for (const s of v.supports) addUnits(u, s.units);
      attacker.memory.intel[v.id] = { time: this.now, units: u, wall: v.buildings.wall, points: v.points };
    }
    if (defPlayer && !defPlayer.human && defPlayer.memory && !r.scoutOnly) {
      defPlayer.memory.grudge[c.ownerId] = (defPlayer.memory.grudge[c.ownerId] ?? 0) + 1 + (r.attackerWon ? 2 : 0);
      defPlayer.trust[c.ownerId] = (defPlayer.trust[c.ownerId] ?? 0) - 5;
    }

    // Conquista ou retorno
    if (conquered) {
      addUnits(survivors, { snob: 1 }, -1);
      this.conquer(v, c.ownerId, survivors);
    } else if (unitCount(survivors) > 0) {
      this.createReturn(c, survivors, loot, c.arrival - c.start);
    }
  }

  conquer(v: Village, newOwner: string, stay: Units) {
    const oldOwner = v.ownerId;
    const np = this.s.players[newOwner];
    // Apoios estacionados em outras aldeias vindos desta se perdem.
    for (const o of Object.values(this.s.villages)) o.supports = o.supports.filter((s) => s.homeId !== v.id);
    // Apoios nesta aldeia voltam para casa.
    for (let i = v.supports.length - 1; i >= 0; i--) this.sendBackSupport(v.id, i);
    for (const o of Object.values(this.s.offers)) if (o.villageId === v.id) delete this.s.offers[o.id];
    v.ownerId = newOwner;
    v.units = stay;
    v.loyalty = 25;
    v.loyaltyTime = this.now;
    v.buildQueue = [];
    v.recruit = { barracks: [], stable: [], garage: [], snob: [], statue: [] };
    v.researchQueue = null;
    v.militia = null;
    v.scavenge.runs = [];
    v.buildings.church = 0;
    v.buildings.church_f = 0;
    v.conqueredAt = this.now;
    this.recalcPoints(v);
    np.conquered++;
    const oldName = oldOwner ? this.s.players[oldOwner].name : 'Bárbaros';
    const text = `${np.name} conquistou ${this.villageLabel(v)} de ${oldName}!`;
    this.s.log.unshift({ time: this.now, text });
    if (newOwner === this.s.humanId) {
      this.addReport({ kind: 'conquest', color: 'green', title: `Você conquistou ${v.name}!`, text });
      this.notify(`Aldeia conquistada: ${v.name}!`, 'good');
    }
    if (oldOwner === this.s.humanId) {
      this.addReport({ kind: 'conquest', color: 'red', title: `${v.name} foi conquistada por ${np.name}`, text });
      this.notify(`Você perdeu ${v.name}!`, 'bad');
    }
    if (oldOwner) {
      const op = this.s.players[oldOwner];
      if (this.villagesOf(oldOwner).length === 0) {
        op.alive = false;
        if (op.tribeId) this.leaveTribe(oldOwner);
        this.s.log.unshift({ time: this.now, text: `${op.name} foi eliminado.` });
        if (op.human) this.s.victory.result = 'lose';
      }
      if (op.memory) op.memory.grudge[newOwner] = (op.memory.grudge[newOwner] ?? 0) + 20;
    }
    this.changed();
  }

  // ---------------------------------------------------------------- tribos
  createTribe(pid: string, name: string, tag: string): Err {
    const p = this.s.players[pid];
    if (p.tribeId) return 'Já está em uma tribo';
    if (!name.trim() || !tag.trim()) return 'Informe nome e sigla';
    const t = { id: this.newId('t'), name: name.trim(), tag: tag.trim().toUpperCase().slice(0, 6), founderId: pid, members: [pid], relations: {}, color: '#f5c542' };
    this.s.tribes[t.id] = t;
    p.tribeId = t.id;
    this.changed();
    return null;
  }
  joinTribe(pid: string, tid: string): Err {
    const p = this.s.players[pid];
    const t = this.s.tribes[tid];
    if (!t) return 'Tribo inexistente';
    if (p.tribeId) return 'Já está em uma tribo';
    if (t.members.length >= this.cfg.tribeMax) return 'Tribo cheia';
    t.members.push(pid);
    p.tribeId = tid;
    this.changed();
    return null;
  }
  leaveTribe(pid: string): Err {
    const p = this.s.players[pid];
    const t = p.tribeId ? this.s.tribes[p.tribeId] : null;
    if (!t) return 'Sem tribo';
    t.members = t.members.filter((m) => m !== pid);
    p.tribeId = null;
    if (!t.members.length) {
      delete this.s.tribes[t.id];
      for (const o of Object.values(this.s.tribes)) delete o.relations[t.id];
    } else if (t.founderId === pid) t.founderId = t.members[0];
    this.changed();
    return null;
  }
  setRelation(tid: string, other: string, rel: Relation | null) {
    const t = this.s.tribes[tid];
    if (!t) return;
    if (rel) t.relations[other] = rel; else delete t.relations[other];
    this.changed();
  }

  // ---------------------------------------------------------------- relatórios e mensagens
  addReport(r: Omit<Report, 'id' | 'time' | 'read'>) {
    this.s.reports.unshift({ ...r, id: this.newId('r'), time: this.now, read: false });
    if (this.s.reports.length > 400) this.s.reports.length = 400;
  }
  sendMessage(fromId: string, subject: string, body: string, action?: Message['action']) {
    this.s.messages.unshift({ id: this.newId('m'), time: this.now, fromId, subject, body, read: false, action });
    if (this.s.messages.length > 200) this.s.messages.length = 200;
    this.notify(`Nova mensagem de ${this.s.players[fromId]?.name ?? 'Sistema'}: ${subject}`);
  }

  // ---------------------------------------------------------------- tarefas horárias
  private onHourly() {
    // Crescimento das bárbaras
    for (const v of Object.values(this.s.villages)) {
      if (v.ownerId) continue;
      if (v.points < this.cfg.barbarianMaxPoints && this.rand() < 0.08 * this.cfg.speed) {
        const opts: BuildingId[] = ['wood', 'stone', 'iron', 'storage', 'farm', 'main', 'wall', 'hide', 'barracks'];
        const b = opts[Math.floor(this.rand() * opts.length)];
        if (v.buildings[b] < Math.min(BUILDINGS[b].max, 20)) { this.update(v); v.buildings[b]++; this.recalcPoints(v); }
      }
      if ((v.units.spear ?? 0) < v.points / 8 && this.rand() < 0.3) v.units.spear = (v.units.spear ?? 0) + 1;
    }
    this.hooks.hourly?.(this);
    this.checkVictory();
    this.changed();
  }
  checkVictory() {
    if (this.s.victory.result) return;
    if (!this.human.alive) { this.s.victory.result = 'lose'; return; }
    const counts: Record<string, number> = {};
    let total = 0;
    for (const v of Object.values(this.s.villages)) {
      if (!v.ownerId) continue;
      total++;
      const p = this.s.players[v.ownerId];
      const key = p.tribeId ?? p.id;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    let leader: string | null = null, best = 0;
    for (const [k, n] of Object.entries(counts)) if (n > best) { best = n; leader = k; }
    const share = total ? (best / total) * 100 : 0;
    // Vitória imediata: todos os outros jogadores eliminados.
    const aliveOthers = Object.values(this.s.players).filter((p) => p.alive && !p.human && this.relation(this.s.humanId, p.id) !== 'tribe');
    if (!aliveOthers.length) { this.s.victory.result = 'win'; return; }
    if (leader && share >= this.cfg.victoryPercent) {
      if (this.s.victory.leader !== leader) { this.s.victory.leader = leader; this.s.victory.since = this.now; }
      else if (this.s.victory.since !== null && this.now - this.s.victory.since >= this.cfg.victoryDays * DAY) {
        const humanKey = this.human.tribeId ?? this.human.id;
        this.s.victory.result = leader === humanKey ? 'win' : 'lose';
      }
    } else { this.s.victory.leader = null; this.s.victory.since = null; }
  }

  /** Ataques chegando a aldeias do jogador humano. */
  incomingFor(pid: string): Command[] {
    return Object.values(this.s.commands)
      .filter((c) => c.type === 'attack' && c.ownerId !== pid && this.s.villages[c.toId]?.ownerId === pid)
      .sort((a, b) => a.arrival - b.arrival);
  }
  /** Se a torre de vigia identifica o comando, devolve a unidade mais lenta. */
  watchtowerSees(c: Command): boolean {
    if (!this.cfg.watchtower) return false;
    const to = this.s.villages[c.toId];
    const from = this.s.villages[c.fromId];
    if (!to || !from) return false;
    const frac = Math.min(1, (this.now - c.start) / Math.max(1, c.arrival - c.start));
    const pos = { x: from.x + (to.x - from.x) * frac, y: from.y + (to.y - from.y) * frac };
    for (const v of Object.values(this.s.villages)) {
      if (v.ownerId !== to.ownerId || !v.buildings.watchtower) continue;
      if (distance(v, pos) <= watchtowerRadius(v.buildings.watchtower)) return true;
    }
    return false;
  }
}

/** Distribui a carga entre os recursos de forma equilibrada ("enchimento por água"). */
export function distributeLoot(avail: Res, cap: number): Res {
  const out = { wood: 0, stone: 0, iron: 0 };
  let left = cap;
  let keys = RES_KEYS.filter((k) => avail[k] > 0);
  while (left > 0 && keys.length) {
    const share = Math.floor(left / keys.length);
    if (share <= 0) {
      for (const k of keys) { if (left <= 0) break; if (avail[k] - out[k] > 0) { out[k]++; left--; } }
      break;
    }
    const next: (keyof Res)[] = [];
    for (const k of keys) {
      const take = Math.min(share, avail[k] - out[k]);
      out[k] += take; left -= take;
      if (avail[k] - out[k] > 0) next.push(k);
    }
    keys = next;
  }
  return out;
}

export function unitList(u: Units): [UnitId, number][] {
  return UNIT_ORDER.filter((k) => (u[k] ?? 0) > 0).map((k) => [k, u[k]!]);
}
