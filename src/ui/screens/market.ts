import { MERCHANT_CAPACITY } from '../../data/tables';
import type { Res } from '../../engine/types';
import { distance } from '../../engine/util';
import { action, type UI } from '../app';
import { cd, dur, esc, icon, num } from '../h';

const RN: Record<keyof Res, string> = { wood: 'Madeira', stone: 'Argila', iron: 'Ferro' };
const TABS: [string, string][] = [['', 'Enviar recursos'], ['offers', 'Ofertas'], ['mine', 'Minhas ofertas'], ['moves', 'Transportes']];

export function renderMarket(ui: UI): string {
  const g = ui.g, v = ui.village();
  g.update(v);
  const tabs = `<div class="tabs">${TABS.map(([t, l]) => `<a class="${ui.tab === t ? 'active' : ''}" data-act="tab" data-t="${t}">${l}</a>`).join('')}</div>`;
  const head = `<div class="box"><div class="head">Mercado (nível ${v.buildings.market}) <span class="grow"></span><a data-act="nav" data-s="village">« Voltar à aldeia</a></div><div class="body">
    <p>Mercadores: <b>${g.merchantsFree(v)}</b> / ${g.merchantsTotal(v)} disponíveis — cada um carrega ${num(MERCHANT_CAPACITY)} recursos.</p>${tabs}`;
  let body = '';
  if (ui.tab === 'offers') {
    const offers = Object.values(g.s.offers).filter((o) => o.ownerId !== g.s.humanId && g.relation(g.s.humanId, o.ownerId) !== 'enemy')
      .map((o) => ({ o, d: distance(v, g.s.villages[o.villageId]) })).sort((a, b) => a.d - b.d).slice(0, 40);
    body = offers.length ? `<table class="vis"><tr><th>Oferece</th><th>Deseja</th><th>Jogador</th><th class="num">Distância</th><th class="num">Qtd</th><th></th></tr>${offers.map(({ o, d }) => {
      const ov = g.s.villages[o.villageId];
      return `<tr><td>${icon(o.give)} ${num(o.giveAmount)}</td><td>${icon(o.want)} ${num(o.wantAmount)}</td><td>${esc(g.s.players[o.ownerId]?.name)}<br><span class="small">${esc(ov.name)}</span></td><td class="num">${d.toFixed(1)}<br><span class="small">${dur(g.tradeTime(v, ov))}</span></td><td class="num">${o.count}</td><td><button class="small green" data-act="offer-accept" data-o="${o.id}">Aceitar</button></td></tr>`;
    }).join('')}</table>` : '<p class="muted">Nenhuma oferta no momento. Os bots publicam ofertas quando têm excedentes.</p>';
  } else if (ui.tab === 'mine') {
    const mine = Object.values(g.s.offers).filter((o) => o.villageId === v.id);
    body = `<div data-form class="flex">Ofereço <input type="number" name="og" value="1000" min="1"> <select name="ogr">${(['wood', 'stone', 'iron'] as const).map((k) => `<option value="${k}">${RN[k]}</option>`).join('')}</select>
      por <input type="number" name="ow" value="1000" min="1"> <select name="owr">${(['stone', 'iron', 'wood'] as const).map((k) => `<option value="${k}">${RN[k]}</option>`).join('')}</select>
      × <input type="number" name="oc" value="1" min="1" style="width:50px"> <button data-act="offer-create" data-default>Criar oferta</button></div>
      <p class="small muted">Os recursos e mercadores ficam reservados enquanto a oferta existir. Bots aceitam ofertas que resolvam sua falta de recursos.</p>
      ${mine.length ? `<table class="vis"><tr><th>Oferece</th><th>Deseja</th><th class="num">Qtd</th><th></th></tr>${mine.map((o) => `<tr><td>${icon(o.give)} ${num(o.giveAmount)}</td><td>${icon(o.want)} ${num(o.wantAmount)}</td><td class="num">${o.count}</td><td><button class="small red" data-act="offer-del" data-o="${o.id}">Remover</button></td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma oferta sua nesta aldeia.</p>'}`;
  } else if (ui.tab === 'moves') {
    const moves = Object.values(g.s.commands).filter((c) => (c.type === 'trade' || c.type === 'tradeReturn') && (c.fromId === v.id || c.toId === v.id)).sort((a, b) => a.arrival - b.arrival);
    body = moves.length ? `<table class="vis"><tr><th>Transporte</th><th>Carga</th><th class="num">Chegada</th></tr>${moves.map((c) => {
      const o = g.s.villages[c.fromId === v.id ? c.toId : c.fromId];
      const label = c.type === 'tradeReturn' ? `Mercadores voltando de ${esc(o?.name)}` : c.fromId === v.id ? `Para ${esc(o?.name)}` : `De ${esc(o?.name)} (${esc(g.s.players[c.ownerId]?.name)})`;
      return `<tr><td>${label}</td><td>${c.res ? `${icon('wood')}${num(c.res.wood)} ${icon('stone')}${num(c.res.stone)} ${icon('iron')}${num(c.res.iron)}` : '—'}</td><td class="num">${cd(c.arrival)}</td></tr>`;
    }).join('')}</table>` : '<p class="muted">Nenhum transporte.</p>';
  } else {
    const t = ui.target;
    const own = g.villagesOf(g.s.humanId).filter((x) => x.id !== v.id);
    body = `<div data-form>
      <div class="flex">Destino: <input class="coord" name="mx" value="${t?.x ?? ''}" placeholder="x"> | <input class="coord" name="my" value="${t?.y ?? ''}" placeholder="y">
      ${own.length ? `<select data-change="market-own"><option value="">— suas aldeias —</option>${own.map((x) => `<option value="${x.x}|${x.y}">${esc(x.name)} (${x.x}|${x.y})</option>`).join('')}</select>` : ''}</div>
      <table class="vis" style="width:auto;margin-top:8px">${(['wood', 'stone', 'iron'] as const).map((k) => `<tr><td>${icon(k)} ${RN[k]}</td><td><input type="number" name="m_${k}" min="0" placeholder="0"></td><td><a class="small" data-act="fill" data-name="m_${k}" data-v="${Math.floor(Math.min(v.res[k], g.merchantsFree(v) * MERCHANT_CAPACITY))}">(${num(v.res[k])})</a></td></tr>`).join('')}</table>
      <p><button class="green" data-act="market-send" data-default>Enviar</button></p></div>
      <p class="small muted">Mercadores viajam a ${6} min/campo (÷ velocidade do mundo). Recursos que excedem o armazém do destino são perdidos.</p>`;
  }
  return head + body + '</div></div>';
}

action('market-own', (_ui, el) => {
  const [x, y] = (el as HTMLSelectElement).value.split('|');
  const mx = document.querySelector<HTMLInputElement>('input[name=mx]');
  const my = document.querySelector<HTMLInputElement>('input[name=my]');
  if (mx && my && x) { mx.value = x; my.value = y; }
});
action('market-send', (ui) => {
  const g = ui.g;
  const val = (n: string) => Number(document.querySelector<HTMLInputElement>(`input[name=${n}]`)?.value || 0);
  const tv = Object.values(g.s.villages).find((x) => x.x === val('mx') && x.y === val('my'));
  if (!tv) return ui.result('Não há aldeia nessas coordenadas.');
  const err = g.sendResources(ui.vid, tv.id, { wood: val('m_wood'), stone: val('m_stone'), iron: val('m_iron') });
  if (!err) document.querySelectorAll<HTMLInputElement>('input[name^="m_"]').forEach((i) => { i.value = ''; });
  ui.result(err, `Mercadores enviados para ${tv.name}.`);
});
action('offer-accept', (ui, el) => ui.result(ui.g.acceptOffer(el.dataset.o!, ui.vid), 'Oferta aceita! Os mercadores estão a caminho.'));
action('offer-del', (ui, el) => ui.result(ui.g.deleteOffer(el.dataset.o!), 'Oferta removida.'));
action('offer-create', (ui) => {
  const q = (n: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name=${n}]`)?.value ?? '';
  ui.result(ui.g.createOffer(ui.vid, q('ogr') as keyof Res, Number(q('og')), q('owr') as keyof Res, Number(q('ow')), Number(q('oc'))), 'Oferta criada.');
});
