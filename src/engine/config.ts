import type { WorldConfig } from './types';

export const DEFAULT_CONFIG: WorldConfig = {
  seed: 0,
  playerName: 'Jogador',
  villageName: 'Minha aldeia',
  bots: 30,
  barbarianRatio: 2.5,
  bonusVillageChance: 0.12,
  speed: 1,
  unitSpeed: 1,
  difficulty: 'normal',
  archers: true,
  paladin: true,
  church: false,
  watchtower: true,
  militia: true,
  scavenging: true,
  morale: true,
  nightBonus: true,
  nightStart: 0, nightEnd: 8, nightFactor: 2,
  protectionDays: 3,
  nobleMaxDist: 70,
  loyaltyMin: 20, loyaltyMax: 35,
  barbarianMaxPoints: 1500,
  tribeMax: 12,
  victoryPercent: 65,
  victoryDays: 3,
  cancelMinutes: 10,
  startRes: 500,
};

export const DIFFICULTY_MULT: Record<WorldConfig['difficulty'], number> = {
  facil: 0.75, normal: 1, dificil: 1.3, insano: 1.7,
};
