import { DEFAULT_CONFIG } from '../engine/config';
import type { WorldConfig } from '../engine/types';
import { newGame } from '../engine/world';
import type { Game } from '../engine/game';
import { esc } from './h';

type Field = [keyof WorldConfig, string, 'text' | 'number' | 'select', (string | number)[]?, number?, number?];
const FIELDS: Field[] = [
  ['playerName', 'Seu nome', 'text'],
  ['villageName', 'Nome da aldeia', 'text'],
  ['bots', 'Número de bots', 'number', undefined, 5, 80],
  ['difficulty', 'Dificuldade', 'select', ['facil', 'normal', 'dificil', 'insano']],
  ['speed', 'Velocidade do jogo', 'number', undefined, 0.5, 20],
  ['unitSpeed', 'Velocidade das unidades', 'number', undefined, 0.3, 5],
  ['barbarianRatio', 'Bárbaras por jogador', 'number', undefined, 0.5, 6],
  ['protectionDays', 'Proteção de iniciante (dias)', 'number', undefined, 0, 10],
  ['nobleMaxDist', 'Alcance do nobre (campos)', 'number', undefined, 10, 500],
  ['victoryPercent', 'Vitória: % de aldeias', 'number', undefined, 30, 100],
  ['victoryDays', 'Vitória: dias mantendo', 'number', undefined, 0, 30],
  ['barbarianMaxPoints', 'Bárbaras crescem até (pts)', 'number', undefined, 0, 5000],
  ['tribeMax', 'Máx. membros por tribo', 'number', undefined, 2, 40],
  ['seed', 'Semente (0 = aleatória)', 'number', undefined, 0, 2147483647],
];
const FLAGS: [keyof WorldConfig, string][] = [
  ['archers', 'Arqueiros'], ['paladin', 'Paladino e armas'], ['church', 'Igreja / fé'], ['watchtower', 'Torre de vigia'],
  ['militia', 'Milícia'], ['scavenging', 'Coleta'], ['morale', 'Moral'], ['nightBonus', 'Bônus noturno (00h–08h)'],
];
const DIFF: Record<string, string> = { facil: 'Fácil (bots −25%)', normal: 'Normal', dificil: 'Difícil (bots +30%)', insano: 'Insano (bots +70%)' };

export function showNewGame(root: HTMLElement, hasSave: boolean, onStart: (g: Game) => void, onContinue?: () => void) {
  const c = DEFAULT_CONFIG;
  root.innerHTML = `<div class="newgame box">
    <div class="hero"><h1>⚔ Tribal Wars Offline</h1><p>Um mundo medieval só seu: construa, saqueie, forme tribos e conquiste aldeias com nobres — contra bots.</p></div>
    <div class="body">
      ${hasSave && onContinue ? `<p style="text-align:center"><button class="green" id="continue" style="font-size:15px;padding:8px 24px">Continuar jogo salvo</button></p><hr>` : ''}
      <h2>Novo mundo</h2>
      <div class="form-grid">${FIELDS.map(([k, label, type, opts, min, max]) => {
        const val = c[k] as string | number;
        if (type === 'select') return `<label>${label}<select name="${k}">${opts!.map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${DIFF[o as string] ?? o}</option>`).join('')}</select></label>`;
        return `<label>${label}<input name="${k}" type="${type}" value="${esc(val)}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} step="any"></label>`;
      }).join('')}</div>
      <div class="checks">${FLAGS.map(([k, l]) => `<label><input type="checkbox" name="${k}" ${c[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <p class="small muted">Dica: velocidade 1 é o ritmo clássico (dias por nobre). Use o controle de tempo (1× a 3600×) no topo para acelerar. Velocidades 2–5 deixam a partida mais curta.</p>
      <p style="text-align:center"><button id="start" style="font-size:16px;padding:8px 30px">Fundar minha aldeia</button></p>
    </div></div>`;
  root.querySelector('#continue')?.addEventListener('click', () => onContinue?.());
  root.querySelector('#start')!.addEventListener('click', () => {
    const cfg: WorldConfig = { ...DEFAULT_CONFIG };
    const rec = cfg as unknown as Record<string, unknown>;
    for (const [k, , type, , min, max] of FIELDS) {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name=${k}]`)!;
      if (type === 'number') {
        let n = Number(el.value);
        if (!Number.isFinite(n)) n = DEFAULT_CONFIG[k] as number;
        if (min !== undefined) n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        rec[k] = k === 'bots' || k === 'seed' || k === 'protectionDays' || k === 'tribeMax' ? Math.round(n) : n;
      } else rec[k] = el.value.trim() || DEFAULT_CONFIG[k];
    }
    for (const [k] of FLAGS) rec[k] = root.querySelector<HTMLInputElement>(`[name=${k}]`)!.checked;
    const btn = root.querySelector<HTMLButtonElement>('#start')!;
    btn.disabled = true; btn.textContent = 'Gerando mundo…';
    setTimeout(() => onStart(newGame(cfg)), 20);
  });
}
