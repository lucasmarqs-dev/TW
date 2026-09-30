import { BUILDING_TABLES } from './buildingTables';

export type BuildingId =
  | 'main' | 'barracks' | 'stable' | 'garage' | 'church' | 'church_f' | 'watchtower' | 'snob' | 'smith'
  | 'place' | 'statue' | 'market' | 'wood' | 'stone' | 'iron' | 'farm' | 'storage' | 'hide' | 'wall';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  max: number;
  min: number; // nível mínimo (catapultas não derrubam abaixo disso)
  /** Tempo-base em segundos na velocidade 1 (XML UK88 × 1,5). */
  buildTime: number;
  points: number;
  reqs: Partial<Record<BuildingId, number>>;
  desc: string;
  /** Feature flag de mundo necessária. */
  flag?: 'church' | 'watchtower' | 'paladin';
}

const B = (d: BuildingDef) => d;

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  main: B({ id: 'main', name: 'Edifício principal', max: 30, min: 1, buildTime: 900, points: 10, reqs: {}, desc: 'Constrói e melhora edifícios. Cada nível reduz o tempo de todas as obras. A partir do nível 15 permite demolir.' }),
  barracks: B({ id: 'barracks', name: 'Quartel', max: 25, min: 0, buildTime: 1800, points: 16, reqs: { main: 3 }, desc: 'Recruta infantaria. Níveis maiores aceleram o recrutamento.' }),
  stable: B({ id: 'stable', name: 'Estábulo', max: 20, min: 0, buildTime: 6000, points: 20, reqs: { main: 10, barracks: 5, smith: 5 }, desc: 'Recruta batedores e cavalaria.' }),
  garage: B({ id: 'garage', name: 'Oficina', max: 15, min: 0, buildTime: 6000, points: 24, reqs: { main: 10, smith: 10 }, desc: 'Produz aríetes e catapultas.' }),
  church: B({ id: 'church', name: 'Igreja', max: 3, min: 0, buildTime: 184980, points: 10, reqs: { main: 5, farm: 5 }, desc: 'Dá fé às suas aldeias num raio de 4/6/8 campos. Sem fé, as tropas lutam com 50% da força.', flag: 'church' }),
  church_f: B({ id: 'church_f', name: 'Primeira igreja', max: 1, min: 0, buildTime: 8160, points: 10, reqs: {}, desc: 'Igreja inicial (raio 4). Não pode ser construída de novo.', flag: 'church' }),
  watchtower: B({ id: 'watchtower', name: 'Torre de vigia', max: 20, min: 0, buildTime: 13200, points: 42, reqs: { main: 5, farm: 5 }, desc: 'Identifica a unidade mais lenta dos ataques que entram no seu raio.', flag: 'watchtower' }),
  snob: B({ id: 'snob', name: 'Academia', max: 1, min: 0, buildTime: 586800, points: 512, reqs: { main: 20, smith: 20, market: 10 }, desc: 'Cunha moedas de ouro e treina nobres.' }),
  smith: B({ id: 'smith', name: 'Ferreiro', max: 20, min: 0, buildTime: 6000, points: 19, reqs: { main: 5, barracks: 1 }, desc: 'Pesquisa novas unidades. Níveis maiores aceleram a pesquisa.' }),
  place: B({ id: 'place', name: 'Ponto de encontro', max: 1, min: 0, buildTime: 10860, points: 0, reqs: {}, desc: 'Envia ataques e apoios, simulador de batalhas e coleta.' }),
  statue: B({ id: 'statue', name: 'Estátua', max: 1, min: 0, buildTime: 1500, points: 24, reqs: {}, desc: 'Recruta e revive o paladino; guarda suas armas.', flag: 'paladin' }),
  market: B({ id: 'market', name: 'Mercado', max: 25, min: 0, buildTime: 2700, points: 10, reqs: { main: 3, storage: 2 }, desc: 'Mercadores transportam recursos e aceitam ofertas de troca.' }),
  wood: B({ id: 'wood', name: 'Bosque', max: 30, min: 0, buildTime: 900, points: 6, reqs: {}, desc: 'Lenhadores produzem madeira.' }),
  stone: B({ id: 'stone', name: 'Poço de argila', max: 30, min: 0, buildTime: 900, points: 6, reqs: {}, desc: 'Produz argila.' }),
  iron: B({ id: 'iron', name: 'Mina de ferro', max: 30, min: 0, buildTime: 1080, points: 6, reqs: {}, desc: 'Produz ferro.' }),
  farm: B({ id: 'farm', name: 'Fazenda', max: 30, min: 1, buildTime: 1200, points: 5, reqs: {}, desc: 'Fornece população para edifícios e tropas. Pode convocar milícia.' }),
  storage: B({ id: 'storage', name: 'Armazém', max: 30, min: 1, buildTime: 1020, points: 6, reqs: {}, desc: 'Capacidade máxima de CADA recurso.' }),
  hide: B({ id: 'hide', name: 'Esconderijo', max: 10, min: 0, buildTime: 1800, points: 5, reqs: {}, desc: 'Protege recursos contra saque e espionagem.' }),
  wall: B({ id: 'wall', name: 'Muralha', max: 20, min: 0, buildTime: 3600, points: 8, reqs: { barracks: 1 }, desc: 'Defesa básica e bônus às tropas defensoras.' }),
};

export const BUILDING_ORDER: BuildingId[] = [
  'main', 'barracks', 'stable', 'garage', 'church', 'church_f', 'watchtower', 'snob', 'smith', 'place',
  'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall',
];

/** Custo do nível `level` (1-based) conforme o Apêndice A. */
export function buildingCost(id: BuildingId, level: number): { wood: number; stone: number; iron: number; pop: number } {
  const t = BUILDING_TABLES[id];
  const row = t[Math.min(level, t.length) - 1];
  const prevPop = level >= 2 ? t[Math.min(level - 1, t.length) - 1][3] : 0;
  return { wood: row[0], stone: row[1], iron: row[2], pop: row[3] - prevPop };
}

/** População total ocupada pelo edifício no nível. */
export function buildingPop(id: BuildingId, level: number): number {
  if (level <= 0) return 0;
  const t = BUILDING_TABLES[id];
  return t[Math.min(level, t.length) - 1][3];
}
