// Resolução de batalha. Baseada na reconstrução histórica (seções 4.1–4.3 e 4.9 da referência):
// defesa efetiva ponderada pela composição do ataque, perdas com expoente 3/2,
// muralha B1/B2, sorte, moral, fé e bônus noturno. Fórmulas marcadas como "reconstruídas"
// na referência estão isoladas aqui para facilitar calibração futura.
import { MILITIA, UNITS, UNIT_ORDER, type AttackType, type UnitId, type Units } from '../data/units';
import { wallBasicDefense, wallBonus } from '../data/tables';

export interface DefGroup { key: string; units: Units }

export interface BattleInput {
  att: Units;
  defGroups: DefGroup[];
  militia: number;
  wall: number;
  luck: number; // -0.25..0.25
  morale: number; // 0.3..1
  faithAtt: number;
  faithDef: number;
  night: number; // multiplicador de defesa
  attMods?: Partial<Record<UnitId, number>>; // multiplicador de ataque por unidade
  defMods?: Partial<Record<UnitId, number>>; // multiplicador de defesa por unidade
  ramMult?: number;
  catMult?: number;
  catTarget?: { level: number; min: number; isWall: boolean } | null;
}

export interface BattleResult {
  attackerWon: boolean;
  attLosses: Units;
  defLosses: Record<string, Units>;
  militiaLost: number;
  wallBattle: number;
  wallAfter: number;
  catAfter: number | null;
  spySurvivors: number;
  spySent: number;
  attStrength: number;
  defStrength: number;
  scoutOnly: boolean;
}

export const ramsPerLevel = (level: number) => Math.round(2.5 * Math.pow(1.09, level - 1));
export const catsPerLevel = (level: number) => Math.round(2 * Math.pow(1.083, level - 1));

/** Aplica dano estrutural sequencial: cada nível exige mais máquinas do que o anterior. */
export function siege(level: number, effective: number, perLevel: (l: number) => number, min: number): number {
  let eff = effective;
  while (level > min) {
    const need = perLevel(level);
    if (eff + 1e-9 < need) break;
    eff -= need;
    level--;
  }
  return level;
}

export function resolveBattle(inp: BattleInput): BattleResult {
  const attMods = inp.attMods ?? {};
  const defMods = inp.defMods ?? {};
  const attSpies = inp.att.spy ?? 0;
  let defSpies = 0;
  for (const g of inp.defGroups) defSpies += g.units.spy ?? 0;

  const res: BattleResult = {
    attackerWon: false, attLosses: {}, defLosses: {}, militiaLost: 0,
    wallBattle: inp.wall, wallAfter: inp.wall, catAfter: inp.catTarget ? inp.catTarget.level : null,
    spySurvivors: attSpies, spySent: attSpies, attStrength: 0, defStrength: 0, scoutOnly: false,
  };
  for (const g of inp.defGroups) res.defLosses[g.key] = {};

  // 1) Confronto de exploradores
  if (attSpies > 0 && defSpies > 0) {
    const lossA = Math.min(1, Math.pow(defSpies / attSpies, 1.5));
    const lostA = Math.round(attSpies * lossA);
    res.spySurvivors = attSpies - lostA;
    if (lostA) res.attLosses.spy = lostA;
    const lossD = Math.min(1, Math.pow(attSpies / defSpies, 1.5)) * 0.5;
    for (const g of inp.defGroups) {
      const n = Math.round((g.units.spy ?? 0) * lossD);
      if (n) res.defLosses[g.key].spy = n;
    }
  }

  // 2) Força de ataque por categoria
  const A: Record<AttackType, number> = { inf: 0, cav: 0, arc: 0 };
  let nonSpy = 0;
  for (const id of UNIT_ORDER) {
    if (id === 'spy') continue;
    const n = inp.att[id] ?? 0;
    if (!n) continue;
    nonSpy += n;
    const u = UNITS[id];
    A[u.type] += n * u.att * (attMods[id] ?? 1);
  }
  const mult = inp.morale * (1 + inp.luck) * inp.faithAtt;
  A.inf *= mult; A.cav *= mult; A.arc *= mult;
  const AT = A.inf + A.cav + A.arc;
  if (nonSpy === 0) {
    res.scoutOnly = true;
    res.attackerWon = res.spySurvivors > 0;
    return res;
  }

  // 3) Aríetes: pré-dano limitado à metade do nível (seção 4.9)
  const rams = inp.att.ram ?? 0;
  const ramMult = inp.ramMult ?? 1;
  if (rams > 0 && inp.wall > 0) {
    const pre = Math.min(Math.floor(inp.wall / 2), Math.round((rams * ramMult / 4) * Math.pow(1.09, -inp.wall)));
    res.wallBattle = inp.wall - pre;
  }

  // 4) Defesa por categoria
  const D: Record<AttackType, number> = { inf: 0, cav: 0, arc: 0 };
  for (const g of inp.defGroups) {
    for (const id of UNIT_ORDER) {
      if (id === 'spy') continue;
      const n = g.units[id] ?? 0;
      if (!n) continue;
      const u = UNITS[id];
      const m = defMods[id] ?? 1;
      D.inf += n * u.def * m; D.cav += n * u.defCav * m; D.arc += n * u.defArc * m;
    }
  }
  D.inf += inp.militia * MILITIA.def; D.cav += inp.militia * MILITIA.defCav; D.arc += inp.militia * MILITIA.defArc;
  const b1 = wallBonus(res.wallBattle) * inp.faithDef * inp.night;
  const b2 = wallBasicDefense(res.wallBattle);
  const Dc = { inf: D.inf * b1 + b2, cav: D.cav * b1 + b2, arc: D.arc * b1 + b2 };
  const DT = AT > 0 ? (Dc.inf * A.inf + Dc.cav * A.cav + Dc.arc * A.arc) / AT : Dc.inf;
  res.attStrength = AT; res.defStrength = DT;

  // 5) Baixas
  let attLoss: number, defLoss: number;
  if (AT > DT) { res.attackerWon = true; attLoss = Math.pow(DT / AT, 1.5); defLoss = 1; }
  else { attLoss = 1; defLoss = AT > 0 ? Math.pow(AT / DT, 1.5) : 0; }

  for (const id of UNIT_ORDER) {
    if (id === 'spy') continue;
    const n = inp.att[id] ?? 0;
    if (!n) continue;
    const lost = attLoss >= 1 ? n : Math.round(n * attLoss);
    if (lost) res.attLosses[id] = lost;
  }
  if (!res.attackerWon) {
    // Ataque derrotado: exploradores morrem junto e nada é revelado.
    if (attSpies) res.attLosses.spy = attSpies;
    res.spySurvivors = 0;
  }
  for (const g of inp.defGroups) {
    for (const id of UNIT_ORDER) {
      if (id === 'spy') continue;
      const n = g.units[id] ?? 0;
      if (!n) continue;
      const lost = defLoss >= 1 ? n : Math.round(n * defLoss);
      if (lost) res.defLosses[g.key][id] = lost;
    }
  }
  res.militiaLost = defLoss >= 1 ? inp.militia : Math.round(inp.militia * defLoss);

  // 6) Dano estrutural pós-batalha
  const survivors = (id: UnitId) => (inp.att[id] ?? 0) - (res.attLosses[id] ?? 0);
  const effRams = res.attackerWon ? survivors('ram') * ramMult : rams * ramMult * defLoss * 0.5;
  res.wallAfter = effRams > 0 ? siege(inp.wall, effRams, ramsPerLevel, 0) : inp.wall;
  const cats = inp.att.catapult ?? 0;
  if (cats > 0 && inp.catTarget) {
    const catMult = inp.catMult ?? 1;
    const eff = res.attackerWon ? survivors('catapult') * catMult : cats * catMult * defLoss * 0.5;
    if (inp.catTarget.isWall) {
      res.wallAfter = siege(res.wallAfter, eff, catsPerLevel, 0);
      res.catAfter = res.wallAfter;
    } else {
      res.catAfter = siege(inp.catTarget.level, eff, catsPerLevel, inp.catTarget.min);
    }
  }
  return res;
}

/** Moral por pontos (fórmula histórica da seção 4.4). */
export function moraleFor(attPoints: number, defPoints: number): number {
  if (attPoints <= 0) return 1;
  return Math.max(0.3, Math.min(1, 0.3 + 3 * (defPoints / attPoints)));
}
