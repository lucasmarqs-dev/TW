// Gera src/data/buildingTables.ts a partir do Apêndice A de docs/referencia-tecnica.md
import fs from 'node:fs';
const md = fs.readFileSync(new URL('../docs/referencia-tecnica.md', import.meta.url), 'utf8');
const names = {
  'Quartel-general': 'main', 'Quartel': 'barracks', 'Estábulo': 'stable', 'Oficina': 'garage',
  'Igreja': 'church', 'Primeira igreja': 'church_f', 'Torre de vigia': 'watchtower', 'Academia': 'snob',
  'Ferreiro': 'smith', 'Ponto de encontro': 'place', 'Estátua': 'statue', 'Mercado': 'market',
  'Serraria': 'wood', 'Poço de argila': 'stone', 'Mina de ferro': 'iron', 'Fazenda': 'farm',
  'Armazém': 'storage', 'Esconderijo': 'hide', 'Muralha': 'wall',
};
const appendix = md.slice(md.indexOf('## Apêndice A'), md.indexOf('## Lacunas e incertezas'));
const out = {};
for (const sec of appendix.split('\n### ').slice(1)) {
  const title = sec.split('\n')[0].trim();
  const id = names[title];
  if (!id) throw new Error('unknown building ' + title);
  const rows = [];
  for (const line of sec.split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
    if (m) rows.push([+m[2], +m[3], +m[4], +m[6]]);
  }
  out[id] = rows;
}
let ts = '// Gerado por scripts/gen-buildings.mjs a partir do Apêndice A. Não editar à mão.\n';
ts += '// Cada linha: [madeira, argila, ferro, população total do edifício após o nível]\n';
ts += 'export const BUILDING_TABLES: Record<string, [number, number, number, number][]> = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(new URL('../src/data/buildingTables.ts', import.meta.url), ts);
console.log(Object.entries(out).map(([k, v]) => k + ':' + v.length).join(' '));
