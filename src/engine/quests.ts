// Missões de tutorial (seção 8.1: missões devolvem recursos) e conquistas com molduras
// madeira/bronze/prata/ouro (1/2/3/4 pontos).
import type { Game } from './game';
import type { Res } from './types';

export interface Quest { id: string; title: string; desc: string; reward: Res; check: (g: Game) => boolean }

const firstV = (g: Game) => g.villagesOf(g.s.humanId)[0];
const lvl = (g: Game, b: Parameters<typeof maxLevel>[1]) => maxLevel(g, b);
function maxLevel(g: Game, b: keyof ReturnType<typeof firstV>['buildings']): number {
  let m = 0;
  for (const v of g.villagesOf(g.s.humanId)) m = Math.max(m, v.buildings[b]);
  return m;
}
const R = (w: number, s: number, i: number): Res => ({ wood: w, stone: s, iron: i });

export const QUESTS: Quest[] = [
  { id: 'wood1', title: 'Madeira para a aldeia', desc: 'Construa o Bosque até o nível 2.', reward: R(80, 90, 60), check: (g) => lvl(g, 'wood') >= 2 },
  { id: 'stone1', title: 'Argila', desc: 'Construa o Poço de argila até o nível 2.', reward: R(90, 70, 60), check: (g) => lvl(g, 'stone') >= 2 },
  { id: 'iron1', title: 'Ferro', desc: 'Construa a Mina de ferro até o nível 2.', reward: R(90, 90, 40), check: (g) => lvl(g, 'iron') >= 2 },
  { id: 'res3', title: 'Economia em marcha', desc: 'Leve os três produtores ao nível 3.', reward: R(300, 300, 250), check: (g) => lvl(g, 'wood') >= 3 && lvl(g, 'stone') >= 3 && lvl(g, 'iron') >= 3 },
  { id: 'main3', title: 'Centro de comando', desc: 'Edifício principal nível 3.', reward: R(250, 250, 200), check: (g) => lvl(g, 'main') >= 3 },
  { id: 'barracks', title: 'Às armas!', desc: 'Construa o Quartel.', reward: R(250, 200, 150), check: (g) => lvl(g, 'barracks') >= 1 },
  { id: 'spears', title: 'Primeiros soldados', desc: 'Tenha 20 lanceiros.', reward: R(300, 300, 200), check: (g) => g.villagesOf(g.s.humanId).some((v) => (v.units.spear ?? 0) >= 20) },
  { id: 'storage3', title: 'Estoques seguros', desc: 'Armazém nível 3 e Esconderijo nível 1.', reward: R(300, 300, 300), check: (g) => lvl(g, 'storage') >= 3 && lvl(g, 'hide') >= 1 },
  { id: 'farm3', title: 'Mais camponeses', desc: 'Fazenda nível 3.', reward: R(300, 300, 300), check: (g) => lvl(g, 'farm') >= 3 },
  { id: 'smith', title: 'Forja', desc: 'Construa o Ferreiro e pesquise o Bárbaro (machado).', reward: R(500, 500, 500), check: (g) => g.villagesOf(g.s.humanId).some((v) => !!v.research.axe) },
  { id: 'wall', title: 'Paliçada', desc: 'Muralha nível 3.', reward: R(400, 500, 300), check: (g) => lvl(g, 'wall') >= 3 },
  { id: 'farmrun', title: 'Saque bárbaro', desc: 'Vença um ataque contra uma aldeia bárbara.', reward: R(500, 500, 500), check: (g) => g.s.stats.farmRuns >= 1 },
  { id: 'scav', title: 'Coleta', desc: 'Envie tropas para coletar recursos no Ponto de encontro.', reward: R(300, 300, 300), check: (g) => g.s.stats.scavenges >= 1 },
  { id: 'market', title: 'Comércio', desc: 'Construa o Mercado.', reward: R(600, 600, 600), check: (g) => lvl(g, 'market') >= 1 },
  { id: 'res10', title: 'Produção séria', desc: 'Produtores no nível 10.', reward: R(1500, 1500, 1500), check: (g) => lvl(g, 'wood') >= 10 && lvl(g, 'stone') >= 10 && lvl(g, 'iron') >= 10 },
  { id: 'stable', title: 'Cavalaria', desc: 'Construa o Estábulo.', reward: R(1500, 1500, 1500), check: (g) => lvl(g, 'stable') >= 1 },
  { id: 'tribe', title: 'Não estás sozinho', desc: 'Entre em uma tribo ou funde a sua.', reward: R(1000, 1000, 1000), check: (g) => !!g.human.tribeId },
  { id: 'garage', title: 'Máquinas de cerco', desc: 'Construa a Oficina.', reward: R(2000, 2000, 2000), check: (g) => lvl(g, 'garage') >= 1 },
  { id: 'main20', title: 'Grande salão', desc: 'Edifício principal nível 20.', reward: R(8000, 8000, 8000), check: (g) => lvl(g, 'main') >= 20 },
  { id: 'academy', title: 'Academia', desc: 'Construa a Academia.', reward: R(10000, 10000, 10000), check: (g) => lvl(g, 'snob') >= 1 },
  { id: 'second', title: 'Expansão', desc: 'Conquiste sua segunda aldeia.', reward: R(15000, 15000, 15000), check: (g) => g.villagesOf(g.s.humanId).length >= 2 },
];

export function checkQuests(g: Game): string[] {
  const done: string[] = [];
  const v = firstV(g);
  if (!v) return done;
  for (const q of QUESTS) {
    if (g.s.quests[q.id]) continue;
    if (!q.check(g)) continue;
    g.s.quests[q.id] = true;
    g.update(v);
    const cap = g.storageCap(v);
    for (const k of ['wood', 'stone', 'iron'] as const) v.res[k] = Math.min(cap, v.res[k] + q.reward[k]);
    done.push(q.title);
  }
  return done;
}

export interface Achievement { id: string; name: string; desc: string; tiers: number[]; value: (g: Game) => number }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'points', name: 'Construtor', desc: 'Pontos de edifícios', tiers: [500, 3000, 10000, 30000], value: (g) => g.playerPoints(g.s.humanId) },
  { id: 'villages', name: 'Senhor de terras', desc: 'Aldeias possuídas', tiers: [2, 5, 10, 25], value: (g) => g.villagesOf(g.s.humanId).length },
  { id: 'oda', name: 'Atacante', desc: 'Adversários derrotados atacando', tiers: [1000, 10000, 50000, 200000], value: (g) => g.human.oda },
  { id: 'odd', name: 'Defensor', desc: 'Adversários derrotados defendendo', tiers: [1000, 10000, 50000, 200000], value: (g) => g.human.odd + g.human.ods },
  { id: 'loot', name: 'Saqueador', desc: 'Recursos saqueados', tiers: [10000, 100000, 1000000, 5000000], value: (g) => g.human.loot },
  { id: 'conquer', name: 'Conquistador', desc: 'Aldeias conquistadas', tiers: [1, 5, 15, 40], value: (g) => g.human.conquered },
  { id: 'trade', name: 'Mercador', desc: 'Recursos enviados por mercadores', tiers: [10000, 100000, 500000, 2000000], value: (g) => g.s.stats.resourcesTraded },
  { id: 'scav', name: 'Coletor', desc: 'Expedições de coleta', tiers: [10, 100, 500, 2000], value: (g) => g.s.stats.scavenges },
  { id: 'army', name: 'General', desc: 'Unidades recrutadas', tiers: [100, 1000, 10000, 50000], value: (g) => g.s.stats.recruited },
  { id: 'weapons', name: 'Colecionador', desc: 'Armas do paladino encontradas', tiers: [1, 3, 6, 11], value: (g) => g.human.knight.weapons.length },
];
export const TIER_NAMES = ['—', 'Madeira', 'Bronze', 'Prata', 'Ouro'];

export function checkAchievements(g: Game): string[] {
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    const v = a.value(g);
    let t = 0;
    for (const th of a.tiers) if (v >= th) t++;
    if (t > (g.s.achievements[a.id] ?? 0)) {
      g.s.achievements[a.id] = t;
      out.push(`${a.name} (${TIER_NAMES[t]})`);
    }
  }
  return out;
}
export function achievementScore(g: Game): number {
  let s = 0;
  for (const a of ACHIEVEMENTS) s += g.s.achievements[a.id] ?? 0;
  return s;
}

