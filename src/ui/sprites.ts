// Ícones desenhados em SVG para as unidades (substituem os emojis, que variam por sistema)
// e as definições compartilhadas (texturas, gradientes) usadas pela cena da aldeia e miniaturas.
import type { UnitId } from '../data/units';

const OL = 'stroke="#2a1c0c" stroke-width="1" stroke-linejoin="round"';
const HORSE = 'M4 22 L6.5 14 C6.5 8.5 10 4.5 14 4.5 L15.5 2 L17 5 C20 7 21.5 10 21.5 13.5 C21.5 15 20.5 15.5 19.5 15 L16.5 12.5 L13 15 L12.5 22Z';

const UNIT_SVG: Record<UnitId | 'militia', string> = {
  spear: `<path d="M5 21 L18 4" stroke="#6b4420" stroke-width="2.2" stroke-linecap="round"/><path d="M16 6 L21 1.5 L19.5 7.5Z" fill="#d7dde2" ${OL}/><path d="M13 9 L10 7 L11 11Z" fill="#b8322a"/>`,
  sword: `<path d="M17.5 3 L20.5 3.5 L21 6.5 L9 18 L6 15Z" fill="#dfe5ea" ${OL}/><path d="M4.5 13.5 L10.5 19.5" stroke="#c9a23a" stroke-width="2.4" stroke-linecap="round"/><path d="M6.5 17.5 L3 21" stroke="#5a3718" stroke-width="2.6" stroke-linecap="round"/><circle cx="2.8" cy="21.2" r="1.4" fill="#c9a23a"/>`,
  axe: `<path d="M6 22 L15 6" stroke="#6b4420" stroke-width="2.4" stroke-linecap="round"/><path d="M12 5 C15 1.5 20.5 2 22 5 C20 6 19 8.5 19.5 11.5 C17 9.5 14.5 9 12.5 10Z" fill="#a9b1b8" ${OL}/>`,
  archer: `<path d="M7 2.5 C17 5 17 19 7 21.5" fill="none" stroke="#7a4b22" stroke-width="2.2"/><path d="M7 2.5 L7 21.5" stroke="#e8dcc0" stroke-width=".8"/><path d="M3 12 H20" stroke="#5a3718" stroke-width="1.4"/><path d="M20 12 L17 10 L17 14Z" fill="#b8c0c6"/><path d="M3 12 L1.5 10.5 M3 12 L1.5 13.5" stroke="#b8322a" stroke-width="1.2"/>`,
  spy: `<path d="M4 22 C4 13 7 6 12 4 C17 6 20 13 20 22Z" fill="#3d4a2f" ${OL}/><path d="M8 14 C8 10 10 8.5 12 8.5 C14 8.5 16 10 16 14 C14 16 10 16 8 14Z" fill="#1b1409"/><circle cx="10.4" cy="12.4" r="1" fill="#f3d36b"/><circle cx="13.6" cy="12.4" r="1" fill="#f3d36b"/>`,
  light: `<path d="${HORSE}" fill="#9a5f2e" ${OL}/><path d="M14 4.5 C11 6 9 9 8.5 14" stroke="#3a2412" stroke-width="2" fill="none"/><circle cx="16.5" cy="8" r=".9" fill="#1b1409"/><path d="M7 17 L12.5 18.5" stroke="#c9a23a" stroke-width="1.4"/>`,
  marcher: `<path d="${HORSE}" fill="#6e4424" ${OL}/><path d="M14 4.5 C11 6 9 9 8.5 14" stroke="#2a190c" stroke-width="2" fill="none"/><circle cx="16.5" cy="8" r=".9" fill="#1b1409"/><path d="M1.5 5 C7 8 7 17 1.5 20" fill="none" stroke="#c9a23a" stroke-width="1.6"/>`,
  heavy: `<path d="${HORSE}" fill="#8c9399" ${OL}/><path d="M9 9 L19 12 M8 13 L17 15" stroke="#5c646a" stroke-width="1.2"/><circle cx="16.5" cy="8" r=".9" fill="#1b1409"/><path d="M14.5 4.5 C12 1 9 1 8 3.5 C10 3 12 3.5 13.5 5.5Z" fill="#b8322a" ${OL}/>`,
  ram: `<rect x="2" y="9" width="17" height="6" rx="2" fill="#7a4b22" ${OL}/><path d="M19 8 L23 9.5 L23 14.5 L19 16Z" fill="#8c9399" ${OL}/><circle cx="6" cy="18.5" r="3" fill="#4a3018" ${OL}/><circle cx="15" cy="18.5" r="3" fill="#4a3018" ${OL}/><path d="M4 9 L10.5 4 L17 9" fill="none" stroke="#6b4420" stroke-width="1.6"/>`,
  catapult: `<path d="M3 18 H21 M6 18 L11 9 L16 18" fill="none" stroke="#6b4420" stroke-width="2"/><path d="M11 12 L20 3" stroke="#7a4b22" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="3.5" r="2.4" fill="#8f8a80" ${OL}/><circle cx="5.5" cy="20" r="2.2" fill="#4a3018" ${OL}/><circle cx="18.5" cy="20" r="2.2" fill="#4a3018" ${OL}/>`,
  knight: `<path d="M5 22 V12 C5 6 8 3.5 12 3.5 C16 3.5 19 6 19 12 V22Z" fill="#aeb6bd" ${OL}/><path d="M7 11 H17 M12 11 V16" stroke="#2a1c0c" stroke-width="1.6"/><path d="M5 19 H19" stroke="#2f5f9e" stroke-width="3"/><path d="M8 3.5 L9 0.8 L12 2.5 L15 0.8 L16 3.5Z" fill="#e2b93b" ${OL}/>`,
  snob: `<path d="M3 10 L7 15 L12 6 L17 15 L21 10 L19.5 19 H4.5Z" fill="#e2b93b" ${OL}/><circle cx="3" cy="9.5" r="1.4" fill="#e2b93b" ${OL}/><circle cx="12" cy="5.5" r="1.4" fill="#e2b93b" ${OL}/><circle cx="21" cy="9.5" r="1.4" fill="#e2b93b" ${OL}/><rect x="4" y="19" width="16" height="3" rx="1" fill="#9b2230" ${OL}/><circle cx="12" cy="15" r="1.3" fill="#b8322a"/>`,
  militia: `<path d="M12 22 V8" stroke="#6b4420" stroke-width="2.2" stroke-linecap="round"/><path d="M7 2 V7 C7 9 17 9 17 7 V2 M12 2 V8" fill="none" stroke="#9aa2a8" stroke-width="1.8" stroke-linecap="round"/>`,
};

export function unitSvg(u: UnitId | 'militia', size = 18): string {
  return `<svg class="usvg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${UNIT_SVG[u]}</svg>`;
}

/** Texturas e gradientes compartilhados; inserido uma vez no documento. */
export const SHARED_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="p-tile" width="8" height="5" patternUnits="userSpaceOnUse"><path d="M0 4.5 H8 M4 0 V4.5" stroke="rgba(60,15,5,.35)" stroke-width=".8"/><path d="M0 1 H8" stroke="rgba(255,210,170,.18)" stroke-width=".8"/></pattern>
  <pattern id="p-thatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><path d="M1 0 V6 M3.5 0 V6" stroke="rgba(90,60,15,.35)" stroke-width=".7"/><path d="M0 5.5 H6" stroke="rgba(255,235,160,.25)" stroke-width=".6"/></pattern>
  <pattern id="p-stone" width="10" height="6" patternUnits="userSpaceOnUse"><path d="M0 5.5 H10 M3 0 V5.5 M8 0 V2.8 M0 2.8 H10" stroke="rgba(40,35,30,.25)" stroke-width=".7"/></pattern>
  <pattern id="p-plank" width="5" height="10" patternUnits="userSpaceOnUse"><path d="M4.5 0 V10" stroke="rgba(40,20,5,.35)" stroke-width=".8"/></pattern>
  <linearGradient id="g-roof" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></linearGradient>
  <linearGradient id="g-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>
  <linearGradient id="g-tower" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  <radialGradient id="g-crown" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
  <radialGradient id="g-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd76a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb03a" stop-opacity="0"/></radialGradient>
  <filter id="f-grass" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .16  0 0 0 0 .3  0 0 0 0 .08  0 0 0 .55 -.12"/></filter>
  <filter id="f-patches" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .7  0 0 0 0 .25  0 0 0 1.4 -.55"/></filter>
  <filter id="f-dirt" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="2" seed="2"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .18  0 0 0 .5 -.1"/></filter>
</defs></svg>`;
