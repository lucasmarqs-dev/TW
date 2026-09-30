import type { BuildingId } from './buildings';

export type UnitId =
  | 'spear' | 'sword' | 'axe' | 'archer' | 'spy' | 'light' | 'marcher' | 'heavy' | 'ram' | 'catapult' | 'knight' | 'snob';

export type AttackType = 'inf' | 'cav' | 'arc';

export interface UnitDef {
  id: UnitId;
  name: string;
  plural: string;
  wood: number; stone: number; iron: number; pop: number;
  /** Tempo-base de recrutamento (s) na velocidade 1. */
  time: number;
  /** Minutos por campo na velocidade 1. */
  speed: number;
  carry: number;
  att: number; def: number; defCav: number; defArc: number;
  type: AttackType;
  building: BuildingId;
  /** Requisitos (edifícios) para pesquisar/recrutar. */
  reqs: Partial<Record<BuildingId, number>>;
  /** Custo da pesquisa no ferreiro (sistema simples). null = não precisa pesquisar. */
  research: { wood: number; stone: number; iron: number; time: number } | null;
  flag?: 'archer' | 'paladin';
}

const U = (u: UnitDef) => u;

// Atributos: seção 3.1 (pesquisa simplificada). Tempos UK88 × 1,5 → velocidade 1.
export const UNITS: Record<UnitId, UnitDef> = {
  spear: U({ id: 'spear', name: 'Lanceiro', plural: 'Lanceiros', wood: 50, stone: 30, iron: 10, pop: 1, time: 1020, speed: 18, carry: 25, att: 10, def: 15, defCav: 45, defArc: 20, type: 'inf', building: 'barracks', reqs: { barracks: 1 }, research: null }),
  sword: U({ id: 'sword', name: 'Espadachim', plural: 'Espadachins', wood: 30, stone: 30, iron: 70, pop: 1, time: 1500, speed: 22, carry: 15, att: 25, def: 50, defCav: 15, defArc: 40, type: 'inf', building: 'barracks', reqs: { barracks: 1, smith: 1 }, research: { wood: 170, stone: 150, iron: 20, time: 2700 } }),
  axe: U({ id: 'axe', name: 'Bárbaro', plural: 'Bárbaros', wood: 60, stone: 30, iron: 40, pop: 1, time: 1320, speed: 18, carry: 10, att: 40, def: 10, defCav: 5, defArc: 10, type: 'inf', building: 'barracks', reqs: { barracks: 1, smith: 2 }, research: { wood: 700, stone: 840, iron: 820, time: 5400 } }),
  archer: U({ id: 'archer', name: 'Arqueiro', plural: 'Arqueiros', wood: 100, stone: 30, iron: 60, pop: 1, time: 1800, speed: 18, carry: 10, att: 15, def: 50, defCav: 40, defArc: 5, type: 'arc', building: 'barracks', reqs: { barracks: 5, smith: 5 }, research: { wood: 640, stone: 560, iron: 760, time: 7200 }, flag: 'archer' }),
  spy: U({ id: 'spy', name: 'Explorador', plural: 'Exploradores', wood: 50, stone: 50, iron: 20, pop: 2, time: 900, speed: 9, carry: 0, att: 0, def: 2, defCav: 1, defArc: 2, type: 'cav', building: 'stable', reqs: { stable: 1 }, research: { wood: 560, stone: 480, iron: 480, time: 5400 } }),
  light: U({ id: 'light', name: 'Cavalaria leve', plural: 'Cavalaria leve', wood: 125, stone: 100, iron: 250, pop: 4, time: 1800, speed: 10, carry: 80, att: 130, def: 30, defCav: 40, defArc: 30, type: 'cav', building: 'stable', reqs: { stable: 3 }, research: { wood: 2200, stone: 2400, iron: 2000, time: 9000 } }),
  marcher: U({ id: 'marcher', name: 'Arqueiro a cavalo', plural: 'Arqueiros a cavalo', wood: 250, stone: 100, iron: 150, pop: 5, time: 2700, speed: 10, carry: 50, att: 120, def: 40, defCav: 30, defArc: 50, type: 'arc', building: 'stable', reqs: { stable: 5 }, research: { wood: 3000, stone: 2400, iron: 2000, time: 10800 }, flag: 'archer' }),
  heavy: U({ id: 'heavy', name: 'Cavalaria pesada', plural: 'Cavalaria pesada', wood: 200, stone: 150, iron: 600, pop: 6, time: 3600, speed: 11, carry: 50, att: 150, def: 200, defCav: 80, defArc: 180, type: 'cav', building: 'stable', reqs: { stable: 10, smith: 15 }, research: { wood: 3000, stone: 2400, iron: 2000, time: 12600 } }),
  ram: U({ id: 'ram', name: 'Aríete', plural: 'Aríetes', wood: 300, stone: 200, iron: 200, pop: 5, time: 4800, speed: 30, carry: 0, att: 2, def: 20, defCav: 50, defArc: 20, type: 'inf', building: 'garage', reqs: { garage: 1 }, research: { wood: 1200, stone: 1600, iron: 800, time: 9000 } }),
  catapult: U({ id: 'catapult', name: 'Catapulta', plural: 'Catapultas', wood: 320, stone: 400, iron: 100, pop: 8, time: 7200, speed: 30, carry: 0, att: 100, def: 100, defCav: 50, defArc: 100, type: 'inf', building: 'garage', reqs: { garage: 2, smith: 12 }, research: { wood: 1600, stone: 2000, iron: 1200, time: 12600 } }),
  knight: U({ id: 'knight', name: 'Paladino', plural: 'Paladino', wood: 20, stone: 20, iron: 40, pop: 10, time: 21600, speed: 10, carry: 100, att: 150, def: 250, defCav: 400, defArc: 150, type: 'cav', building: 'statue', reqs: { statue: 1 }, research: null, flag: 'paladin' }),
  snob: U({ id: 'snob', name: 'Nobre', plural: 'Nobres', wood: 40000, stone: 50000, iron: 50000, pop: 100, time: 18000, speed: 35, carry: 0, att: 30, def: 100, defCav: 50, defArc: 100, type: 'inf', building: 'snob', reqs: { snob: 1 }, research: null }),
};

export const UNIT_ORDER: UnitId[] = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];

/** Milícia (seção 3.3): só defende, não marcha. */
export const MILITIA = { name: 'Milícia', def: 15, defCav: 45, defArc: 25 };

/** Custo de uma moeda de ouro (UK88). */
export const COIN_COST = { wood: 28000, stone: 30000, iron: 25000 };

export type Units = Partial<Record<UnitId, number>>;

export const SCAVENGE_OPTIONS = [
  { name: 'Coletores preguiçosos', factor: 0.1, unlock: { wood: 0, stone: 0, iron: 0 } },
  { name: 'Coletores humildes', factor: 0.25, unlock: { wood: 250, stone: 300, iron: 250 } },
  { name: 'Coletores espertos', factor: 0.5, unlock: { wood: 1000, stone: 1200, iron: 1000 } },
  { name: 'Grandes coletores', factor: 0.75, unlock: { wood: 10000, stone: 12000, iron: 10000 } },
];
export const SCAVENGE_UNITS: UnitId[] = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];

/** Armas históricas do paladino (seção 3.3). */
export interface WeaponDef { id: string; name: string; unit?: UnitId; desc: string }
export const WEAPONS: WeaponDef[] = [
  { id: 'halberd', name: 'Alabarda de Guan Yu', unit: 'spear', desc: 'Lanceiros: +30% ataque, +20% defesa.' },
  { id: 'longsword', name: 'Espada longa de Paracelsus', unit: 'sword', desc: 'Espadachins: +30% ataque, +20% defesa.' },
  { id: 'axe', name: 'Machado de Thorgard', unit: 'axe', desc: 'Bárbaros: +30% ataque, +20% defesa.' },
  { id: 'longbow', name: 'Arco longo de Nimrod', unit: 'archer', desc: 'Arqueiros: +30% ataque, +20% defesa.' },
  { id: 'star', name: 'Telescópio de Kalid', unit: 'spy', desc: 'Exploradores revelam sempre as tropas fora da aldeia.' },
  { id: 'lance', name: 'Lança de Mieszko', unit: 'light', desc: 'Cavalaria leve: +30% ataque, +20% defesa.' },
  { id: 'compositebow', name: 'Arco composto de Nimrod', unit: 'marcher', desc: 'Arqueiros a cavalo: +30% ataque, +20% defesa.' },
  { id: 'banner', name: 'Estandarte de Baptiste', unit: 'heavy', desc: 'Cavalaria pesada: +30% ataque, +20% defesa.' },
  { id: 'morningstar', name: 'Estrela da manhã de Carol', unit: 'ram', desc: 'Dano estrutural dos aríetes +100%.' },
  { id: 'bonfire', name: 'Fogueira de Aletheia', unit: 'catapult', desc: 'Dano estrutural das catapultas +100%.' },
  { id: 'scepter', name: 'Cetro de Vasco', unit: 'snob', desc: 'Redução mínima de lealdade passa de 20 para 30.' },
];
