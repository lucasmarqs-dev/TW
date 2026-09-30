# Tribal Wars Offline

Clone **single-player e offline** do Tribal Wars 1 (Die Stämme), jogado no navegador contra bots.
As regras e números seguem o documento [`docs/referencia-tecnica.md`](docs/referencia-tecnica.md).

## Como jogar

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run build      # gera dist/index.html (arquivo único; abre com duplo clique, sem servidor)
npm test           # testes do motor (tabelas, combate, simulação de 12 dias com bots)
```

O jogo salva sozinho no `localStorage` a cada 30 s e ao fechar a página; em **Opções** dá para exportar/importar o save.
O tempo só corre com a página aberta. Use o controle no topo (❚❚, 1× … 3600×) para acelerar; a tecla **espaço** pausa.

## O que está implementado

| Área | Mecânicas |
|---|---|
| Economia | Madeira/argila/ferro com curva `30·80^((L−1)/29)`, armazém por recurso, fazenda (`floor`), esconderijo, pontos `p·1,2^(L−1)`, aldeias bônus |
| Edifícios | Os 19 edifícios do TW1 com custos/população nível a nível do Apêndice A, pré-requisitos, fila de até 5 obras, cancelamento com reembolso, demolição (EP 15, lealdade 100), tempo com fator do EP `1,05^−H` |
| Unidades | 12 unidades + milícia com atributos, custos, velocidade e carga da tabela 3.1; pesquisa no ferreiro (sistema simples); recrutamento unidade a unidade por edifício |
| Movimento | Mapa com continentes K00–K99, distância euclidiana, unidade mais lenta define o tempo, velocidade de mundo/unidades, cancelamento em 10 min, retorno com a mesma duração |
| Combate | Defesa geral/cavalaria/arqueiros ponderada pela composição do ataque, perdas com expoente 3/2, muralha (B₁ e defesa básica 20+50L), sorte ±25%, moral por pontos, bônus noturno, fé (igreja), apoios, milícia, batedores (faixas 1/50/70/90%), saque com esconderijo, aríetes (pré e pós-batalha), catapultas com alvo, pontos ODA/ODD/ODS |
| Nobres | Academia, moedas (1+2+3…), posições de nobre, redução de lealdade 20–35 por comando, regeneração +1/h×velocidade, conquista com lealdade 25, igreja destruída na conquista, alcance máximo do nobre |
| Paladino | Um paladino por jogador (estátua), revive, 11 armas históricas com efeitos (+30%/+20%, telescópio, Vasco, Carol, Aletheia) |
| Outros | Mercado (mercadores por nível, envio, ofertas com bots), coleta com 4 opções, torre de vigia (identifica a unidade mais lenta), proteção de iniciante, relatórios, mensagens, ranking, missões com recompensa, conquistas madeira→ouro, condição de vitória por domínio |
| Bots | Personalidades (economista, agressivo, defensivo, equilibrado, saqueador) que constroem, pesquisam, recrutam, coletam, saqueiam bárbaras, espionam, atacam, cunham moedas e conquistam; tribos de bots com diplomacia (aliança, PNA, guerra), apoio mútuo, convites e propostas ao jogador, mercado |

Onde a referência marca uma fórmula como desconhecida (combate misto, dano estrutural, IA), a reconstrução usada está isolada em
[`src/engine/combat.ts`](src/engine/combat.ts) e [`src/engine/bots.ts`](src/engine/bots.ts) para calibração futura.

## Estrutura

- `src/data/` — tabelas do jogo (`buildingTables.ts` é gerado do Apêndice A por `npm run gen:buildings`)
- `src/engine/` — motor determinístico por eventos (sem DOM): `game.ts`, `combat.ts`, `bots.ts`, `world.ts`, `quests.ts`, `save.ts`
- `src/ui/` — interface em TypeScript puro: cena SVG da aldeia, mapa em canvas e telas
- `assets-src/sprites/classicos-v2-png/` — sprites originais dos edifícios (PNG em alta resolução)
- `src/assets/sprites/` — versões WebP recortadas e reduzidas, embutidas no build; regenere com
  `pip install pillow && python scripts/process_sprites.py` depois de trocar ou adicionar sprites
  (nomes `edificio-tier-N.png` ou `edificio-unico.png`; o mapeamento fica em `src/ui/buildingSprites.ts`)
- `tests/` — testes do motor com Vitest
