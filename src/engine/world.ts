// Geração de mundo: jogador, bots, tribos, aldeias bárbaras e aldeias bônus.
import { BUILDING_ORDER, type BuildingId } from '../data/buildings';
import { Game } from './game';
import { BOT_NAMES, BOT_SUFFIX, COLORS, TRIBES, VILLAGE_SUFFIX, VILLAGE_WORDS } from './names';
import type { BonusType, GameState, Personality, Player, Village, WorldConfig } from './types';
import { HOUR, nextRandom, pick, randInt } from './util';

export const SAVE_VERSION = 1;

function emptyBuildings(): Record<BuildingId, number> {
  const b = {} as Record<BuildingId, number>;
  for (const id of BUILDING_ORDER) b[id] = 0;
  return b;
}

export function makeVillage(id: string, name: string, x: number, y: number, ownerId: string | null): Village {
  return {
    id, name, x, y, ownerId,
    buildings: emptyBuildings(),
    res: { wood: 0, stone: 0, iron: 0 },
    lastUpdate: 0,
    loyalty: 100, loyaltyTime: 0,
    units: {}, supports: [], buildQueue: [],
    recruit: { barracks: [], stable: [], garage: [], snob: [], statue: [] },
    research: {}, researchQueue: null, militia: null,
    scavenge: { unlocked: [true, false, false, false], runs: [] },
    bonus: null, points: 0,
  };
}

function makePlayer(id: string, name: string, human: boolean, color: string, personality: Personality, aggression: number): Player {
  return {
    id, name, human, color, tribeId: null, personality, coins: 0, oda: 0, odd: 0, ods: 0, loot: 0, conquered: 0,
    alive: true, knight: { status: 'none', weapon: null, weapons: [] }, aggression, trust: {},
    memory: human ? undefined : { intel: {}, lastFarm: {}, targetId: null, grudge: {} },
  };
}

const PERSONALITIES: Personality[] = ['economista', 'agressivo', 'defensivo', 'equilibrado', 'saqueador'];
const BONUS_TYPES: BonusType[] = ['wood', 'stone', 'iron', 'all', 'farm', 'storage', 'barracks', 'stable', 'market'];

export function newGame(cfgIn: WorldConfig): Game {
  const cfg = { ...cfgIn, seed: cfgIn.seed || Math.floor(Math.random() * 2 ** 31) };
  const st: GameState = {
    version: SAVE_VERSION, config: cfg, now: 8 * HOUR, startDate: Date.now(), rng: cfg.seed, seq: 0, idCounter: 0,
    players: {}, villages: {}, tribes: {}, commands: {}, offers: {}, events: [], reports: [], messages: [],
    humanId: 'p0', victory: { leader: null, since: null, result: null }, quests: {}, achievements: {},
    stats: { attacksSent: 0, farmRuns: 0, resourcesTraded: 0, scavenges: 0, builds: 0, recruited: 0 },
    log: [],
  };
  const g = new Game(st);
  const R = () => nextRandom(st);

  // Posições: disco em torno de 500|500 com espaçamento mínimo.
  const nPlayers = cfg.bots + 1;
  const nBarb = Math.round(nPlayers * cfg.barbarianRatio);
  const total = nPlayers + nBarb;
  const radius = Math.sqrt((total * 22) / Math.PI) + 4;
  const taken = new Set<string>();
  const positions: { x: number; y: number }[] = [];
  const place = (minR: number, maxR: number) => {
    for (let tries = 0; tries < 2000; tries++) {
      const a = R() * Math.PI * 2;
      const r = minR + Math.sqrt(R()) * (maxR - minR);
      const x = Math.round(500 + Math.cos(a) * r), y = Math.round(500 + Math.sin(a) * r);
      let ok = !taken.has(x + '|' + y);
      if (ok) for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) if (taken.has(x + dx + '|' + (y + dy))) ok = false;
      if (ok || tries > 1500) { taken.add(x + '|' + y); return { x, y }; }
    }
    return { x: 500, y: 500 };
  };

  // Jogador humano: perto do centro, mas não no centro exato.
  const human = makePlayer('p0', cfg.playerName || 'Jogador', true, '#ffffff', 'equilibrado', 0);
  st.players[human.id] = human;
  const hp = place(radius * 0.25, radius * 0.45);
  positions.push(hp);
  const hv = makeVillage(g.newId('v'), cfg.villageName || `Aldeia de ${human.name}`, hp.x, hp.y, human.id);
  startBuildings(hv, cfg, 0);
  st.villages[hv.id] = hv;

  // Bots
  const names = [...BOT_NAMES];
  const bots: Player[] = [];
  for (let i = 0; i < cfg.bots; i++) {
    const idx = Math.floor(R() * names.length);
    const base = names.splice(idx, 1)[0] ?? `Bot ${i + 1}`;
    const suf = pick(st, BOT_SUFFIX);
    const pers = pick(st, PERSONALITIES);
    const aggr = pers === 'agressivo' ? 0.8 : pers === 'saqueador' ? 0.6 : pers === 'defensivo' ? 0.2 : pers === 'economista' ? 0.3 : 0.5;
    const p = makePlayer('p' + (i + 1), suf ? `${base} ${suf}` : base, false, COLORS[i % COLORS.length], pers, aggr);
    p.eff = 0.8 + R() * 0.35;
    st.players[p.id] = p;
    bots.push(p);
    const pos = place(radius * 0.2, radius);
    const v = makeVillage(g.newId('v'), `Aldeia de ${base}`, pos.x, pos.y, p.id);
    const headStart = { facil: 0, normal: 1, dificil: 2, insano: 3 }[cfg.difficulty];
    startBuildings(v, cfg, randInt(st, 0, headStart));
    st.villages[v.id] = v;
  }

  // Tribos de bots
  const shuffled = [...bots].sort(() => R() - 0.5);
  const nTribes = Math.max(1, Math.min(TRIBES.length, Math.round(cfg.bots / 6)));
  const tribeIds: string[] = [];
  for (let i = 0; i < nTribes; i++) {
    const [name, tag] = TRIBES[i];
    const id = g.newId('t');
    st.tribes[id] = { id, name, tag, founderId: '', members: [], relations: {}, color: COLORS[(i * 5 + 3) % COLORS.length] };
    tribeIds.push(id);
  }
  let ti = 0;
  for (const p of shuffled) {
    if (R() < 0.3) continue; // alguns bots ficam sem tribo
    const t = st.tribes[tribeIds[ti % tribeIds.length]];
    if (t.members.length >= Math.min(cfg.tribeMax, 8)) { ti++; continue; }
    t.members.push(p.id);
    p.tribeId = t.id;
    if (!t.founderId) t.founderId = p.id;
    ti++;
  }
  for (const id of tribeIds) if (!st.tribes[id].members.length) delete st.tribes[id];
  const tids = Object.keys(st.tribes);
  for (let i = 0; i < tids.length; i++) {
    for (let j = i + 1; j < tids.length; j++) {
      const r = R();
      const rel = r < 0.15 ? 'ally' : r < 0.3 ? 'nap' : r < 0.5 ? 'enemy' : null;
      if (rel) { st.tribes[tids[i]].relations[tids[j]] = rel; st.tribes[tids[j]].relations[tids[i]] = rel; }
    }
  }
  for (const p of bots) {
    for (const q of Object.values(st.players)) if (q.id !== p.id) p.trust[q.id] = randInt(st, -10, 25);
  }

  // Bárbaras
  for (let i = 0; i < nBarb; i++) {
    const pos = place(0, radius + 3);
    const v = makeVillage(g.newId('v'), 'Aldeia bárbara', pos.x, pos.y, null);
    const lvl = (max: number) => randInt(st, 0, max);
    v.buildings.main = 1 + lvl(4); v.buildings.farm = 1 + lvl(4); v.buildings.storage = 1 + lvl(5);
    v.buildings.wood = lvl(8); v.buildings.stone = lvl(8); v.buildings.iron = lvl(7);
    v.buildings.barracks = lvl(2); v.buildings.wall = R() < 0.35 ? lvl(3) : 0; v.buildings.hide = lvl(3);
    v.units = { spear: randInt(st, 0, 12), sword: R() < 0.3 ? randInt(st, 0, 8) : 0 };
    if (!v.units.sword) delete v.units.sword;
    v.res = { wood: randInt(st, 200, 1500), stone: randInt(st, 200, 1500), iron: randInt(st, 200, 1500) };
    if (R() < cfg.bonusVillageChance) {
      v.bonus = pick(st, BONUS_TYPES);
      v.name = 'Aldeia bônus';
      v.units.spear = (v.units.spear ?? 0) + randInt(st, 10, 60);
    }
    g.recalcPoints(v);
    st.villages[v.id] = v;
  }

  for (const v of Object.values(st.villages)) {
    v.lastUpdate = st.now; v.loyaltyTime = st.now;
    g.recalcPoints(v);
  }
  // Agenda
  g.schedule({ t: st.now + HOUR, kind: 'hourly' });
  for (const p of bots) g.schedule({ t: st.now + Math.floor(R() * 20 * 60_000), kind: 'bot', playerId: p.id });

  g.sendMessage('system', 'Bem-vindo, senhor!',
    `Sua aldeia ${hv.name} (${hv.x}|${hv.y}) foi fundada. Você tem ${cfg.protectionDays} dias de proteção de iniciante — ` +
    `ninguém pode atacá-lo, e você também não pode atacar outros jogadores (bárbaras são permitidas).\n\n` +
    `Comece pelos produtores de recursos, armazém e fazenda. Depois quartel, ferreiro e muralha. ` +
    `Para expandir, construa uma Academia (EP 20, Ferreiro 20, Mercado 10), cunhe moedas e treine nobres. ` +
    `Domine ${cfg.victoryPercent}% das aldeias de jogadores por ${cfg.victoryDays} dias para vencer. Boa sorte!`);
  return g;
}

function startBuildings(v: Village, cfg: WorldConfig, extra: number) {
  const b = v.buildings;
  b.main = 1 + extra; b.farm = 1 + extra; b.storage = 1 + extra; b.place = 1;
  b.wood = 1 + extra; b.stone = 1 + extra; b.iron = 1 + extra;
  if (extra >= 2) { b.barracks = 1; b.hide = 1; }
  if (cfg.church) b.church_f = 1;
  v.res = { wood: cfg.startRes, stone: cfg.startRes, iron: cfg.startRes };
  v.units = { spear: extra * 5 };
  if (!v.units.spear) v.units = {};
}

export function randomVillageName(st: { rng: number }): string {
  return `${pick(st, VILLAGE_WORDS)} ${pick(st, VILLAGE_SUFFIX)}`;
}
