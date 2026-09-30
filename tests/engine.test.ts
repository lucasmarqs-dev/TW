import { describe, expect, it } from 'vitest';
import { baseProduction, farmCapacity, storageCapacity, buildingPoints } from '../src/data/tables';
import { buildingCost } from '../src/data/buildings';
import { resolveBattle, moraleFor } from '../src/engine/combat';
import { newGame } from '../src/engine/world';
import { installBots } from '../src/engine/bots';
import { DEFAULT_CONFIG } from '../src/engine/config';
import { distributeLoot } from '../src/engine/game';
import { DAY, HOUR } from '../src/engine/util';

describe('tabelas da referência', () => {
  it('produção, armazém e fazenda', () => {
    expect(baseProduction(1)).toBe(30);
    expect(baseProduction(10)).toBe(117);
    expect(baseProduction(30)).toBe(2400);
    expect(storageCapacity(10)).toBe(6420);
    expect(storageCapacity(30)).toBe(400000);
    expect(farmCapacity(10)).toBe(1002);
    expect(farmCapacity(30)).toBe(24000);
  });
  it('custos do apêndice e pontos', () => {
    expect(buildingCost('main', 2)).toEqual({ wood: 113, stone: 102, iron: 88, pop: 1 });
    expect(buildingCost('barracks', 25).wood).toBe(51277);
    expect(buildingPoints(10, 10)).toBe(52);
  });
});

describe('combate', () => {
  it('625 bárbaros contra 1000 espadachins (exemplo histórico)', () => {
    const r = resolveBattle({ att: { axe: 625 }, defGroups: [{ key: 'own', units: { sword: 1000 } }], militia: 0, wall: 0, luck: 0, morale: 1, faithAtt: 1, faithDef: 1, night: 1 });
    expect(r.attackerWon).toBe(false);
    expect(r.attLosses.axe).toBe(625);
    expect(r.defLosses.own.sword).toBeGreaterThan(340);
    expect(r.defLosses.own.sword).toBeLessThan(365);
  });
  it('ataque vencedor com aríetes derruba muralha', () => {
    const r = resolveBattle({ att: { axe: 3000, ram: 100 }, defGroups: [{ key: 'own', units: { spear: 50 } }], militia: 0, wall: 10, luck: 0, morale: 1, faithAtt: 1, faithDef: 1, night: 1 });
    expect(r.attackerWon).toBe(true);
    expect(r.wallAfter).toBeLessThan(10);
  });
  it('moral e saque', () => {
    expect(moraleFor(10000, 1000)).toBeCloseTo(0.6);
    const l = distributeLoot({ wood: 526, stone: 26, iron: 226 }, 1600);
    expect(l).toEqual({ wood: 526, stone: 26, iron: 226 });
    const l2 = distributeLoot({ wood: 1000, stone: 1000, iron: 10 }, 900);
    expect(l2.wood + l2.stone + l2.iron).toBe(900);
    expect(l2.iron).toBe(10);
  });
});

describe('simulação com bots', () => {
  it('roda 12 dias sem erros e os bots crescem', { timeout: 120000 }, () => {
    const g = newGame({ ...DEFAULT_CONFIG, seed: 12345, bots: 20, speed: 3 });
    installBots(g);
    const start = Object.values(g.s.players).filter((p) => !p.human).map((p) => g.playerPoints(p.id));
    for (let i = 0; i < 12 * 24; i++) g.advance(HOUR);
    const end = Object.values(g.s.players).filter((p) => !p.human).map((p) => g.playerPoints(p.id));
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(avg(end)).toBeGreaterThan(avg(start) * 3);
    expect(g.now).toBeGreaterThan(12 * DAY);
    const villages = Object.values(g.s.villages);
    for (const v of villages) {
      for (const k of ['wood', 'stone', 'iron'] as const) expect(Number.isFinite(v.res[k])).toBe(true);
    }
  });
});
