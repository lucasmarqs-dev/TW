import { deleteSave, fromJSON, saveGame, toJSON } from '../../engine/save';
import { action, registerScreen } from '../app';
import { esc } from '../h';

registerScreen('settings', {
  render(ui) {
    const c = ui.g.cfg;
    const flags: [string, boolean][] = [
      ['Arqueiros', c.archers], ['Paladino', c.paladin], ['Igreja', c.church], ['Torre de vigia', c.watchtower], ['Milícia', c.militia],
      ['Coleta', c.scavenging], ['Moral', c.morale], ['Bônus noturno', c.nightBonus],
    ];
    return `<div class="cols2"><div class="box"><div class="head">Jogo</div><div class="body">
      <p><label><input type="checkbox" name="pauseatk" data-change="pref-pause" ${ui.pauseOnAttack ? 'checked' : ''}> Reduzir a velocidade para 60× quando um ataque for lançado contra você</label></p>
      <p>Atalhos: <b>espaço</b> pausa/continua · <b>a</b>/<b>d</b> trocam de aldeia.</p>
      <div class="flex"><button data-act="save-now">Salvar agora</button><button data-act="export">Exportar save (.json)</button>
      <label class="btn ghost" style="cursor:pointer">Importar save<input type="file" accept=".json,application/json" data-change="import" style="display:none"></label></div>
      <p class="small muted">O jogo salva sozinho a cada 30 s e ao fechar a página (armazenamento local do navegador).</p>
      <p style="margin-top:14px"><button class="red" data-act="new-game-confirm">Abandonar e começar novo jogo</button></p>
    </div></div>
    <div class="box"><div class="head">Configuração deste mundo</div><div class="body kv">
      <span>Semente</span><b>${c.seed}</b><span>Velocidade do jogo / unidades</span><b>${c.speed} / ${c.unitSpeed}</b>
      <span>Bots</span><b>${c.bots}</b><span>Dificuldade</span><b>${esc(c.difficulty)}</b>
      <span>Proteção de iniciante</span><b>${c.protectionDays} dias</b><span>Alcance do nobre</span><b>${c.nobleMaxDist} campos</b>
      <span>Redução de lealdade</span><b>${c.loyaltyMin}–${c.loyaltyMax}</b><span>Noite</span><b>${c.nightBonus ? `${c.nightStart}h–${c.nightEnd}h, defesa ×${c.nightFactor}` : 'desativada'}</b>
      <span>Bárbaras crescem até</span><b>${c.barbarianMaxPoints} pontos</b><span>Tamanho máx. de tribo</span><b>${c.tribeMax}</b>
      <span>Vitória</span><b>${c.victoryPercent}% por ${c.victoryDays} dias</b><span>Cancelamento de comandos</span><b>${c.cancelMinutes} min</b>
      ${flags.map(([n, on]) => `<span>${n}</span><b>${on ? 'sim' : 'não'}</b>`).join('')}
    </div></div></div>
    <div class="box"><div class="head">Sobre</div><div class="body small">
      Clone single-player de Tribal Wars 1 baseado no documento <i>docs/referencia-tecnica.md</i>. Custos de edifícios, curvas de produção/armazém/fazenda,
      pontos, atributos de unidades, muralha, sorte, moral, noite, saque, esconderijo, lealdade, moedas e mercado seguem a referência.
      Onde a referência marca a fórmula como desconhecida (combate misto, dano de aríetes/catapultas, IA), há uma reconstrução documentada no código.
    </div></div>`;
  },
});
action('save-now', (ui) => ui.save());
action('export', (ui) => {
  const blob = new Blob([toJSON(ui.g)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tribalwars-offline-dia${Math.floor(ui.g.now / 86400000) + 1}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
action('import', (ui, el) => {
  const f = (el as HTMLInputElement).files?.[0];
  if (!f) return;
  f.text().then((txt) => {
    try {
      const g = fromJSON(txt);
      saveGame(g);
      location.reload();
    } catch (e) {
      ui.result(`Não foi possível importar: ${(e as Error).message}`);
    }
  });
});
action('pref-pause', (ui, el) => {
  ui.pauseOnAttack = (el as HTMLInputElement).checked;
  try { localStorage.setItem('tw-offline-prefs', JSON.stringify({ speed: ui.speed, pauseOnAttack: ui.pauseOnAttack })); } catch { /* ignore */ }
});
action('new-game-confirm', (ui) => {
  ui.modal('Novo jogo', `<p>Isso apaga o jogo atual. Tem certeza?</p><button class="red" data-act="new-game-go">Sim, começar de novo</button> <button class="ghost" data-act="close-modal">Cancelar</button>`);
});
action('new-game-go', () => { deleteSave(); location.reload(); });
