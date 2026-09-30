import type { BuildingId } from '../data/buildings';
import type { UnitId, Units } from '../data/units';

export interface Res { wood: number; stone: number; iron: number }

export interface WorldConfig {
  seed: number;
  playerName: string;
  villageName: string;
  bots: number;
  barbarianRatio: number; // aldeias bárbaras por jogador
  bonusVillageChance: number; // 0..1 por bárbara
  speed: number; // velocidade do jogo (s)
  unitSpeed: number; // velocidade das unidades (u)
  difficulty: 'facil' | 'normal' | 'dificil' | 'insano';
  archers: boolean;
  paladin: boolean;
  church: boolean;
  watchtower: boolean;
  militia: boolean;
  scavenging: boolean;
  morale: boolean;
  nightBonus: boolean;
  nightStart: number; nightEnd: number; nightFactor: number; // fator de defesa, 2 = +100%
  protectionDays: number;
  nobleMaxDist: number;
  loyaltyMin: number; loyaltyMax: number;
  barbarianMaxPoints: number;
  tribeMax: number;
  victoryPercent: number; // % das aldeias de jogadores
  victoryDays: number;
  cancelMinutes: number;
  startRes: number;
}

export type BuildQueueItem = { building: BuildingId; start: number; end: number; demolish?: boolean; cost: Res };
export type RecruitItem = { unit: UnitId; total: number; done: number; perUnit: number; next: number; cost: Res };
export type RecruitBuilding = 'barracks' | 'stable' | 'garage' | 'snob' | 'statue';

export interface Support { ownerId: string; homeId: string; units: Units }

export interface ScavengeRun { option: number; units: Units; end: number; loot: number }

export type BonusType = 'wood' | 'stone' | 'iron' | 'all' | 'farm' | 'storage' | 'barracks' | 'stable' | 'market';

export interface Village {
  id: string;
  name: string;
  x: number; y: number;
  ownerId: string | null; // null = bárbara
  buildings: Record<BuildingId, number>;
  res: Res;
  lastUpdate: number;
  loyalty: number;
  loyaltyTime: number;
  units: Units; // tropas próprias em casa
  supports: Support[]; // tropas estrangeiras estacionadas
  buildQueue: BuildQueueItem[];
  recruit: Record<RecruitBuilding, RecruitItem[]>;
  research: Partial<Record<UnitId, boolean>>;
  researchQueue: { unit: UnitId; end: number } | null;
  militia: { count: number; until: number } | null;
  scavenge: { unlocked: boolean[]; runs: ScavengeRun[] };
  bonus: BonusType | null;
  points: number;
  conqueredAt?: number;
}

export type Personality = 'economista' | 'agressivo' | 'defensivo' | 'equilibrado' | 'saqueador';

export interface BotMemory {
  intel: Record<string, { time: number; units: Units; wall: number; points: number }>;
  lastFarm: Record<string, number>;
  targetId: string | null;
  grudge: Record<string, number>; // jogadorId -> rancor
}

export interface Player {
  id: string;
  name: string;
  human: boolean;
  color: string;
  tribeId: string | null;
  personality: Personality;
  coins: number; // moedas cunhadas no total
  oda: number; odd: number; ods: number;
  loot: number;
  conquered: number;
  alive: boolean;
  knight: { status: 'none' | 'training' | 'alive' | 'dead'; weapon: string | null; weapons: string[] };
  memory?: BotMemory;
  nextThink?: number;
  aggression: number; // 0..1
  /** Eficiência econômica do bot (variedade entre bots). */
  eff?: number;
  trust: Record<string, number>; // jogadorId -> confiança
}

export type Relation = 'ally' | 'nap' | 'enemy';

export interface Tribe {
  id: string;
  name: string;
  tag: string;
  founderId: string;
  members: string[];
  relations: Record<string, Relation>;
  color: string;
}

export type CommandType = 'attack' | 'support' | 'return' | 'trade' | 'tradeReturn';

export interface Command {
  id: string;
  type: CommandType;
  ownerId: string;
  fromId: string;
  toId: string;
  units: Units;
  res?: Res;
  merchants?: number;
  start: number;
  arrival: number;
  catapultTarget?: BuildingId;
  slowest?: UnitId;
  offerId?: string;
  /** Para retornos: id do comando original. */
  origin?: string;
  cancelled?: boolean;
}

export interface Offer {
  id: string;
  ownerId: string;
  villageId: string;
  give: keyof Res;
  giveAmount: number;
  want: keyof Res;
  wantAmount: number;
  count: number;
  created: number;
}

export type ReportKind = 'attack' | 'defense' | 'support' | 'scout' | 'trade' | 'conquest' | 'other';

export interface BattleSide {
  playerId: string | null;
  villageId: string;
  units: Units;
  losses: Units;
}

export interface Report {
  id: string;
  time: number;
  kind: ReportKind;
  title: string;
  read: boolean;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'grey';
  // detalhes de batalha
  attacker?: BattleSide;
  defender?: BattleSide & { supportUnits?: Units; supportLosses?: Units; militia?: number; militiaLost?: number };
  luck?: number;
  morale?: number;
  night?: boolean;
  wallBefore?: number; wallAfter?: number;
  wallBattle?: number;
  loot?: Res; lootCap?: number;
  loyaltyBefore?: number; loyaltyAfter?: number;
  catTarget?: BuildingId; catBefore?: number; catAfter?: number;
  intel?: { res?: Res; buildings?: Partial<Record<BuildingId, number>>; outside?: Units };
  text?: string;
  faithAtt?: number; faithDef?: number;
  weaponFound?: string;
}

export interface Message {
  id: string;
  time: number;
  fromId: string;
  subject: string;
  body: string;
  read: boolean;
  action?: { kind: 'tribeInvite' | 'allyProposal' | 'napProposal' | 'supportRequest'; tribeId?: string; villageId?: string; done?: boolean };
}

export type GameEvent =
  | { t: number; seq: number; kind: 'build'; villageId: string }
  | { t: number; seq: number; kind: 'research'; villageId: string }
  | { t: number; seq: number; kind: 'command'; commandId: string }
  | { t: number; seq: number; kind: 'scavenge'; villageId: string }
  | { t: number; seq: number; kind: 'militia'; villageId: string }
  | { t: number; seq: number; kind: 'bot'; playerId: string }
  | { t: number; seq: number; kind: 'hourly' };

export interface GameState {
  version: number;
  config: WorldConfig;
  now: number; // ms de jogo desde o início
  startDate: number; // epoch real do "dia 1 00:00"
  rng: number;
  seq: number;
  idCounter: number;
  players: Record<string, Player>;
  villages: Record<string, Village>;
  tribes: Record<string, Tribe>;
  commands: Record<string, Command>;
  offers: Record<string, Offer>;
  events: GameEvent[];
  reports: Report[];
  messages: Message[];
  humanId: string;
  victory: { leader: string | null; since: number | null; result: 'win' | 'lose' | null };
  quests: Record<string, boolean>;
  achievements: Record<string, number>;
  stats: { attacksSent: number; farmRuns: number; resourcesTraded: number; scavenges: number; builds: number; recruited: number };
  log: { time: number; text: string }[];
}
