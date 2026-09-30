import './ui/style.css';
import './ui/screens/village';
import './ui/screens/buildings';
import './ui/screens/map';
import './ui/screens/misc';
import './ui/screens/settings';
import { startApp } from './ui/app';
import { showNewGame } from './ui/newgame';
import { hasSave, loadGame, saveGame } from './engine/save';

const root = document.getElementById('app')!;

function boot() {
  const saved = hasSave();
  showNewGame(root, saved, (g) => {
    saveGame(g);
    startApp(g, root);
  }, () => {
    const g = loadGame();
    if (g) startApp(g, root);
    else alert('Não foi possível carregar o jogo salvo.');
  });
}
boot();
