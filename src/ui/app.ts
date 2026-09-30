// Shell da interface: estado de navegação, barra superior, loop de tempo, ações delegadas.
import type { BuildingId } from '../data/buildings';
import type { Units } from '../data/units';
import { installBots } from '../engine/bots';
import type { Game } from '../engine/game';
import { checkAchievements, checkQuests } from '../engine/quests';
import { saveGame } from '../engine/save';
import { fmtDuration, fmtGameTime } from '../engine/util';
import { esc, icon, num } from './h';

export type Screen = 'village' | 'building' | 'map' | 'reports' | 'messages' | 'ranking' | 'tribe' | 'settings' | 'overview' | 'quests';

export interface ScreenDef {
  render(ui: UI): string;
  mount?(ui: UI, root: HTMLElement): void;
  tick?(ui: UI): void;
  /** Se true, o app não refaz o HTML a cada mudança do jogo (ex.: mapa com canvas). */
  static?: boolean;
  refresh?(ui: UI): void;
}

export interface UI {
  g: Game;
  screen: Screen;
  building: BuildingId | null;
  tab: string;
  vid: string;
  reportId: string | null;
  messageId: string | null;
  map: { x: number; y: number; zoom: number; sel: string | null };
  target: { x: number; y: number } | null;
  sendDraft: Units;
  pendingSend: { type: 'attack' | 'support'; targetId: string; units: Units; cat: BuildingId } | null;
  speed: number;
  paused: boolean;
  pauseOnAttack: boolean;
  flash: { text: string; kind: 'ok' | 'err' } | null;
  go(screen: Screen, opts?: Partial<Pick<UI, 'building' | 'tab' | 'reportId' | 'messageId'>>): void;
  render(): void;
  toast(text: string, kind?: 'info' | 'good' | 'bad'): void;
  result(err: string | null, okText?: string): boolean;
  modal(title: string, body: string): void;
  closeModal(): void;
  save(): void;
  village(): ReturnType<Game['village']>;
}

type Action = (ui: UI, el: HTMLElement, ev: Event) => void;
const actions: Record<string, Action> = {};
export function action(name: string, fn: Action) { actions[name] = fn; }

const screens: Partial<Record<Screen, ScreenDef>> = {};
export function registerScreen(s: Screen, def: ScreenDef) { screens[s] = def; }

const SPEEDS = [1, 10, 60, 300, 1200, 3600];

export function startApp(g: Game, root: HTMLElement) {
  installBots(g);
  const human = g.human;
  const first = g.villagesOf(human.id)[0];
  let prefs: { speed?: number; pauseOnAttack?: boolean } = {};
  try { prefs = JSON.parse(localStorage.getItem('tw-offline-prefs') || '{}'); } catch { /* ignore */ }

  const ui: UI = {
    g,
    screen: 'village', building: null, tab: '', vid: first?.id ?? '', reportId: null, messageId: null,
    map: { x: first?.x ?? 500, y: first?.y ?? 500, zoom: 14, sel: null },
    target: null, sendDraft: {}, pendingSend: null,
    speed: prefs.speed ?? 60, paused: false, pauseOnAttack: prefs.pauseOnAttack ?? true, flash: null,
    go(screen, opts = {}) {
      ui.screen = screen;
      ui.building = opts.building ?? null;
      ui.tab = opts.tab ?? '';
      if (opts.reportId !== undefined) ui.reportId = opts.reportId;
      if (opts.messageId !== undefined) ui.messageId = opts.messageId;
      ui.flash = null;
      ui.pendingSend = null;
      renderAll(true);
      window.scrollTo({ top: 0 });
    },
    render() { renderAll(true); },
    toast(text, kind = 'info') { toast(text, kind); },
    result(err, okText) {
      if (err) { ui.flash = { text: err, kind: 'err' }; renderAll(true); return false; }
      ui.flash = okText ? { text: okText, kind: 'ok' } : null;
      checkProgress();
      renderAll(true);
      return true;
    },
    modal(title, body) {
      closeModal();
      const m = document.createElement('div');
      m.className = 'modal-bg';
      m.id = 'modal';
      m.innerHTML = `<div class="modal"><div class="head">${esc(title)}</div><div class="body">${body}</div></div>`;
      document.body.appendChild(m);
    },
    closeModal() { closeModal(); },
    save() {
      if (saveGame(g)) toast('Jogo salvo.', 'good'); else toast('Falha ao salvar (armazenamento indisponível).', 'bad');
    },
    village() {
      let v = g.s.villages[ui.vid];
      if (!v || v.ownerId !== g.s.humanId) {
        v = g.villagesOf(g.s.humanId)[0] ?? v;
        if (v) ui.vid = v.id;
      }
      return v;
    },
  };
  (window as unknown as { ui: UI }).ui = ui;

  root.innerHTML = `<div id="topbar"></div><div id="main"></div><div id="toasts"></div>`;
  const top = root.querySelector('#topbar') as HTMLElement;
  const main = root.querySelector('#main') as HTMLElement;

  g.hooks.onNotify = (_g, text, kind) => { if (kind !== 'info' || text.startsWith('Nova mensagem')) toast(text, kind); };
  const origIncoming = g.hooks.onAttackIncoming;
  g.hooks.onAttackIncoming = (gg, c) => {
    origIncoming?.(gg, c);
    const to = gg.s.villages[c.toId];
    if (to?.ownerId === gg.s.humanId && c.ownerId !== gg.s.humanId) {
      toast(`⚠ Ataque a caminho de ${to.name}! Chega em ${fmtDuration(c.arrival - gg.now)}.`, 'bad');
      if (ui.pauseOnAttack && ui.speed > 60) { ui.speed = 60; renderTop(); toast('Velocidade reduzida para 60× por causa do ataque.', 'info'); }
    }
  };

  function toast(text: string, kind: 'info' | 'good' | 'bad' = 'info') {
    const box = root.querySelector('#toasts')!;
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild?.remove();
    setTimeout(() => t.remove(), 5000);
  }
  function closeModal() { document.getElementById('modal')?.remove(); }

  function checkProgress() {
    for (const q of checkQuests(g)) toast(`Missão concluída: ${q}! Recompensa entregue.`, 'good');
    for (const a of checkAchievements(g)) toast(`Conquista desbloqueada: ${a}`, 'good');
  }

  // ------------------------------------------------------------ barra superior
  let lastTopHtml = '';
  function renderTop() {
    const v = ui.village();
    if (!v) { top.innerHTML = ''; return; }
    const unreadR = g.s.reports.filter((r) => !r.read).length;
    const unreadM = g.s.messages.filter((m) => !m.read).length;
    const inc = g.incomingFor(g.s.humanId).length;
    const vills = g.villagesOf(g.s.humanId).sort((a, b) => a.name.localeCompare(b.name));
    const nav: [Screen, string, string][] = [
      ['overview', 'Visão geral', ''], ['village', 'Aldeia', ''], ['map', 'Mapa', ''],
      ['reports', 'Relatórios', unreadR ? `<span class="pill">${unreadR}</span>` : ''],
      ['messages', 'Mensagens', unreadM ? `<span class="pill blue">${unreadM}</span>` : ''],
      ['ranking', 'Ranking', ''], ['tribe', 'Tribo', ''], ['quests', 'Missões', ''], ['settings', 'Opções', ''],
    ];
    const html = `
      <div class="row">
        <span class="brand">⚔ Tribal Wars Offline</span>
        <nav>${nav.map(([s, l, extra]) => `<a data-act="nav" data-s="${s}" class="${ui.screen === s || (s === 'village' && ui.screen === 'building') ? 'active' : ''}">${l}${extra}</a>`).join('')}</nav>
        ${inc ? `<span class="incoming-alert" data-act="goto-incoming">⚠ ${inc} ataque${inc > 1 ? 's' : ''} a caminho</span>` : ''}
      </div>
      <div class="row" style="background:rgba(0,0,0,.18)">
        <div class="village-switch">
          <button class="small" data-act="prev-village" title="Aldeia anterior">◀</button>
          <select id="vsel">${vills.map((x) => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)} (${x.x}|${x.y}) K${Math.floor(x.y / 100)}${Math.floor(x.x / 100)}</option>`).join('')}</select>
          <button class="small" data-act="next-village" title="Próxima aldeia">▶</button>
          <span class="small">${num(v.points)} pts</span>
        </div>
        <div class="clock">
          <span class="time" id="clock"></span><span class="night-ind" id="night"></span>
          <span class="speed">${[0, ...SPEEDS].map((s) => `<button class="${(s === 0 ? ui.paused : !ui.paused && ui.speed === s) ? 'on' : ''}" data-act="speed" data-v="${s}" title="${s === 0 ? 'Pausar' : s + '× o tempo real'}">${s === 0 ? (ui.paused ? '▶' : '❚❚') : s + '×'}</button>`).join('')}</span>
        </div>
        <div class="resbar" id="resbar"></div>
      </div>`;
    if (html === lastTopHtml) { updateTopLive(); return; }
    lastTopHtml = html;
    top.innerHTML = html;
    (top.querySelector('#vsel') as HTMLSelectElement).onchange = (e) => {
      ui.vid = (e.target as HTMLSelectElement).value;
      renderAll(true);
    };
    updateTopLive();
  }
  function updateTopLive() {
    const v = ui.village();
    if (!v) return;
    g.update(v);
    const cap = g.storageCap(v);
    const pop = g.popUsed(v), fcap = g.farmCap(v);
    const rb = top.querySelector('#resbar');
    if (rb) {
      const r = (k: 'wood' | 'stone' | 'iron') => `<span class="res ${v.res[k] >= cap ? 'full' : ''}" title="${Math.round(g.production(v, k))}/h">${icon(k)}${num(v.res[k])}</span>`;
      rb.innerHTML = `${r('wood')}${r('stone')}${r('iron')}<span class="res">${icon('storage')}${num(cap)}</span><span class="res ${pop >= fcap ? 'full' : ''}">${icon('pop')}${num(pop)}/${num(fcap)}</span>`;
    }
    const clock = top.querySelector('#clock');
    if (clock) clock.textContent = fmtGameTime(g.now);
    const night = top.querySelector('#night');
    if (night) night.textContent = g.isNight() ? '🌙 noite' : '';
  }

  // ------------------------------------------------------------ render principal
  let lastVersion = -1;
  let lastTopVersion = -1;
  let lastHtml = '';
  function renderAll(force = false) {
    const def = screens[ui.screen];
    renderTop();
    lastTopVersion = g.version;
    if (!def) { main.innerHTML = '<p>Tela indisponível</p>'; return; }
    if (!force && def.static) { def.refresh?.(ui); lastVersion = g.version; return; }
    // Preserva valores e foco dos campos com name
    const saved: Record<string, string> = {};
    main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name],select[name],textarea[name]').forEach((el) => {
      if (el.type === 'checkbox') saved[el.name] = (el as HTMLInputElement).checked ? '1' : '0';
      else saved[el.name] = el.value;
    });
    const active = document.activeElement as HTMLInputElement | null;
    const focusName = active && main.contains(active) ? active.name : null;
    const selStart = focusName && typeof active?.selectionStart === 'number' ? active.selectionStart : null;
    const sameScreen = main.dataset.screen === ui.screen + ':' + (ui.building ?? '') + ':' + ui.tab + ':' + ui.vid;
    const flash = ui.flash ? `<div class="box"><div class="body ${ui.flash.kind === 'err' ? 'err' : 'ok'}">${esc(ui.flash.text)}</div></div>` : '';
    const html = flash + def.render(ui);
    // Evita refazer o DOM (e perder hover/rolagem) quando nada visível mudou.
    if (!force && sameScreen && html === lastHtml) { lastVersion = g.version; return; }
    lastHtml = html;
    main.innerHTML = html;
    main.dataset.screen = ui.screen + ':' + (ui.building ?? '') + ':' + ui.tab + ':' + ui.vid;
    if (sameScreen) {
      main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input[name],select[name],textarea[name]').forEach((el) => {
        if (el.dataset.fresh !== undefined || !(el.name in saved)) return;
        if (el.type === 'checkbox') (el as HTMLInputElement).checked = saved[el.name] === '1';
        else el.value = saved[el.name];
      });
      if (focusName) {
        const el = main.querySelector<HTMLInputElement>(`[name="${focusName}"]`);
        if (el) { el.focus(); if (selStart !== null) try { el.setSelectionRange(selStart, selStart); } catch { /* tipo sem seleção */ } }
      }
    }
    def.mount?.(ui, main);
    updateCountdowns();
    lastVersion = g.version;
  }
  function updateCountdowns() {
    main.querySelectorAll<HTMLElement>('[data-cd]').forEach((el) => {
      el.textContent = fmtDuration(Number(el.dataset.cd) - g.now);
    });
  }

  // ------------------------------------------------------------ eventos delegados
  root.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act!];
    if (fn) { ev.preventDefault(); fn(ui, el, ev); }
  });
  document.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('#modal [data-act]');
    if (!el || root.contains(el)) return;
    const fn = actions[el.dataset.act!];
    if (fn) { ev.preventDefault(); fn(ui, el, ev); }
  });
  root.addEventListener('keydown', (ev) => {
    const t = ev.target as HTMLElement;
    if ((ev as KeyboardEvent).key === 'Enter' && t.tagName === 'INPUT') {
      const btn = t.closest('[data-form]')?.querySelector<HTMLElement>('[data-default]');
      if (btn) { ev.preventDefault(); btn.click(); }
    }
  });
  root.addEventListener('change', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-change]');
    if (!el) return;
    const fn = actions[el.dataset.change!];
    if (fn) fn(ui, el, ev);
  });

  action('nav', (u, el) => u.go(el.dataset.s as Screen));
  action('open-building', (u, el) => u.go('building', { building: el.dataset.b as BuildingId }));
  action('speed', (u, el) => {
    const s = Number(el.dataset.v);
    if (s === 0) u.paused = !u.paused; else { u.paused = false; u.speed = s; }
    try { localStorage.setItem('tw-offline-prefs', JSON.stringify({ speed: u.speed, pauseOnAttack: u.pauseOnAttack })); } catch { /* ignore */ }
    renderTop();
  });
  action('prev-village', (u) => cycleVillage(u, -1));
  action('next-village', (u) => cycleVillage(u, 1));
  action('goto-incoming', (u) => u.go('overview', { tab: 'incoming' }));
  action('close-modal', (u) => u.closeModal());
  function cycleVillage(u: UI, d: number) {
    const list = g.villagesOf(g.s.humanId).sort((a, b) => a.name.localeCompare(b.name));
    const i = list.findIndex((x) => x.id === u.vid);
    u.vid = list[(i + d + list.length) % list.length].id;
    renderAll(true);
  }
  document.addEventListener('keydown', (ev) => {
    if ((ev.target as HTMLElement).tagName === 'INPUT' || (ev.target as HTMLElement).tagName === 'TEXTAREA') return;
    if (ev.key === ' ') { ui.paused = !ui.paused; renderTop(); ev.preventDefault(); }
    if (ev.key === 'a' || ev.key === 'ArrowLeft' && ev.altKey) cycleVillage(ui, -1);
    if (ev.key === 'd') cycleVillage(ui, 1);
  });

  // ------------------------------------------------------------ loop de tempo
  let last = performance.now();
  let acc = 0, lastSave = performance.now(), lastProgress = 0, lastRender = 0;
  let shownResult = false;
  function frame(nowReal: number) {
    const dt = Math.min(1000, nowReal - last);
    last = nowReal;
    if (!ui.paused && !g.s.victory.result) {
      acc += dt * ui.speed;
      if (acc >= 50) { g.advance(Math.floor(acc)); acc -= Math.floor(acc); }
    }
    updateTopLive();
    updateCountdowns();
    const def = screens[ui.screen];
    def?.tick?.(ui);
    if (g.version !== lastVersion && nowReal - lastRender > 400) {
      lastRender = nowReal;
      const active = document.activeElement as HTMLElement | null;
      const typing = active && main.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA');
      if (def?.static) { def.refresh?.(ui); lastVersion = g.version; if (g.version !== lastTopVersion) { renderTop(); lastTopVersion = g.version; } }
      else if (!typing) renderAll();
      else if (g.version !== lastTopVersion) { renderTop(); lastTopVersion = g.version; }
    }
    if (nowReal - lastProgress > 2000) { lastProgress = nowReal; checkProgress(); }
    if (nowReal - lastSave > 30000) { lastSave = nowReal; saveGame(g); }
    if (g.s.victory.result && !shownResult) {
      shownResult = true;
      saveGame(g);
      const win = g.s.victory.result === 'win';
      ui.modal(win ? '🏆 Vitória!' : '💀 Derrota', win
        ? `<p>Sua tribo domina o mundo. Os bardos cantarão seu nome por gerações!</p><p>Pontos: <b>${num(g.playerPoints(g.s.humanId))}</b> — Aldeias: <b>${g.villagesOf(g.s.humanId).length}</b></p><button data-act="new-game-confirm">Novo jogo</button> <button class="ghost" data-act="close-modal">Continuar olhando</button>`
        : `<p>${g.human.alive ? 'Outra tribo dominou o mundo.' : 'Você perdeu sua última aldeia.'}</p><button data-act="new-game-confirm">Novo jogo</button> <button class="ghost" data-act="close-modal">Fechar</button>`);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('beforeunload', () => saveGame(g));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(g); });

  renderAll(true);
  requestAnimationFrame(frame);
  return ui;
}
