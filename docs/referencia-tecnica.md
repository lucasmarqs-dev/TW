# Tribal Wars 1 — referência técnica de mecânicas para design single-player

## Sumário

- [1. Aldeia e recursos](#1-aldeia-e-recursos)
- [2. Edifícios e níveis](#2-edifícios-e-níveis)
- [3. Unidades e pesquisa](#3-unidades-e-pesquisa)
- [4. Combate, cerco e informação](#4-combate-cerco-e-informação)
- [5. Nobre e conquista](#5-nobre-e-conquista)
- [6. Mapa, movimento e tempo](#6-mapa-movimento-e-tempo)
- [7. Tribos e diplomacia](#7-tribos-e-diplomacia)
- [8. Sistemas secundários e progressão](#8-sistemas-secundários-e-progressão)
- [Apêndice A: todos os custos de construção](#apêndice-a--custos-completos-de-construção-por-nível)
- [Lacunas e incertezas](#lacunas-e-incertezas)
- [Notas para adaptação single-player](#notas-para-adaptação-single-player)

**Data da pesquisa:** 24/09/2026. **Escopo:** o Tribal Wars original (Die Stämme), não Tribal Wars 2. Este documento descreve regras verificadas, parâmetros públicos de mundos reais e incertezas. Um clone inspirado no jogo deve escolher um *ruleset* antes de usar qualquer número. As tabelas de edifícios usam o mundo [UK88](https://uk88.tribalwars.co.uk/page/settings) como referência; ele tem velocidade de jogo 1,5, velocidade de unidades 0,5, arqueiros, igreja, paladino, pesquisa simplificada, moral por pontos e tempo, sorte, bônus noturno e moedas. A [Summer 2026](https://ukc4.tribalwars.co.uk/page/settings) é um contraexemplo: velocidade 4, moral/arqueiros/igreja/paladino desativados e bônus noturno de +900%. Dados XML públicos do motor: [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [edifícios UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_building_info), [unidades UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_unit_info). A wiki prioritária `help.tribalwars.net/wiki` bloqueou o robô de pesquisa; as páginas atuais de suporte da própria InnoGames e as interfaces XML oficiais foram usadas como fontes primárias.

**Convenções.** `round` significa arredondar ao inteiro exibido; o ponto exato de arredondamento do servidor nem sempre é público. `s` = multiplicador de velocidade de jogo, `u` = multiplicador de velocidade de unidades, `L` = nível. "Confirmado" indica regra descrita pela InnoGames ou diretamente exposta por XML; "reconstruído" indica ajuste exato a tabela publicada; "hipótese" não deve virar regra de implementação sem teste. Custos e velocidades de cada mundo devem vir de sua configuração, pois os exemplos abaixo não representam todos os mundos.

**Três configurações reais contrastantes, lidas em 24/09/2026:**

| Parâmetro | UK88 | Summer UK 2026 | EN Speed 1 |
|---|---:|---:|---:|
| Velocidade de jogo / unidades | 1,5 / 0,5 | 4 / 0,33 | 200 / 0,7 |
| Produção-base no XML | 30 | 30 | 60 |
| Moral | Pontos + tempo | Desativada | Ativada (`moral=1`, tipo a conferir) |
| Arqueiros / igreja / paladino | Sim / sim / sim | Não / não / não | Não / não / sim |
| Coleta / limite de saque (*hauls*) | Sim / sim | Não / não | Não / sim |
| Noite | 23–07, defesa ×2 | 00–07, defesa ×10 | Desativada |
| Proteção inicial | 5 dias; 20:1 até dia 60 do mundo | 2 dias | 30 minutos |
| Alcance máximo do nobre | 50 campos | 100 campos | 100 campos |
| Crescimento máximo da bárbara | 500 pontos | 3.000 pontos | 1.500 pontos |
| Tamanho máximo de tribo | 14 | 12 | 5 |
| Intervalo mínimo entre ataques / apoios | 50/50 ms | 50/50 ms | 100/100 ms |

São **exemplos**, não todos os mundos possíveis. As páginas legíveis e XML devem ser lidos juntos: o XML traz números brutos, mas nem sempre semântica das flags. Fontes: [UK88](https://uk88.tribalwars.co.uk/page/settings), [UK88 XML](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [Summer 2026](https://ukc4.tribalwars.co.uk/page/settings), [Summer XML](https://ukc4.tribalwars.co.uk/interface.php?func=get_config), [EN Speed 1 XML](https://ens1.tribalwars.net/interface.php?func=get_config).

## 1. Aldeia e recursos

### 1.1 Madeira, argila e ferro

**O que é:** três estoques independentes alimentam edifícios, pesquisa, recrutamento e moedas. Serraria, poço de argila e mina de ferro produzem continuamente; saque, comércio, missões, coleta e itens também acrescentam recursos.

**Como funciona:** em velocidade 1 e fator de produção 1, cada produtor no nível 1 gera 30 unidades/hora e no nível 30 gera 2.400/hora. A tabela publicada do poço de argila é reproduzida abaixo e se aplica, antes de modificadores, aos três produtores. Um produtor em nível 0 recebe a produção básica do mundo; uma fonte comunitária relata 5/hora no padrão, mas o XML de UK88 só expõe `base_production=30`, que pode representar a produção de nível 1. Logo, a produção em nível 0 deve ser verificada por mundo.

**Fórmula reconstruída da tabela:** para `1 ≤ L ≤ 30`, `P(L)=round(30 × 80^((L−1)/29)) × s × f`, onde `f` é o fator de produção do mundo, antes de bandeiras, paladino, eventos e itens. A tabela oficial/comunitária arredonda o valor *antes* dos multiplicadores, mas o estágio exato de arredondamento em todos os mundos não foi confirmado. Exemplo: `P(10)=round(30×80^(9/29))=117/h`; no UK88 (`s=1,5`, `f=1`), aproximadamente `175,5/h` antes do arredondamento do servidor. Em 30, `2.400×1,5=3.600/h`.

| L | Prod./h base | L | Prod./h base | L | Prod./h base |
|---:|---:|---:|---:|---:|---:|
| 1 | 30 | 11 | 136 | 21 | 616 |
| 2 | 35 | 12 | 158 | 22 | 717 |
| 3 | 41 | 13 | 184 | 23 | 833 |
| 4 | 47 | 14 | 214 | 24 | 969 |
| 5 | 55 | 15 | 249 | 25 | 1.127 |
| 6 | 64 | 16 | 289 | 26 | 1.311 |
| 7 | 74 | 17 | 337 | 27 | 1.525 |
| 8 | 86 | 18 | 391 | 28 | 1.774 |
| 9 | 100 | 19 | 455 | 29 | 2.063 |
| 10 | 117 | 20 | 530 | 30 | 2.400 |

**Variações:** velocidade, fator de produção, níveis iniciais, bônus de +20%/30%, bandeiras e habilidades de paladino podem alterar o resultado. **Edge cases:** cada recurso para de crescer separadamente ao atingir o limite do armazém; produção não acumula em uma reserva invisível. **Fontes:** [tabela do poço de argila](https://tribalwars.fandom.com/wiki/Clay_pit), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [produtores oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1184), [itens de aldeia](https://support.innogames.com/kb/TribalWars/en_DK/5369). **Nível de confiança:** alta para a tabela 1–30; média para a expressão e o arredondamento após bônus; baixa para nível 0.

### 1.2 Armazém

**O que é:** capacidade *por recurso* da aldeia, e não uma capacidade compartilhada. Uma aldeia com limite 10.000 pode armazenar simultaneamente 10.000 madeira, 10.000 argila e 10.000 ferro.

**Regras e fórmula reconstruída:** nível máximo 30; `C(L)=round(1.000 × 400^((L−1)/29))` para `1≤L≤30`. A expressão reproduz os 30 valores publicados, incluindo nível 10 = 6.420, 20 = 50.675, 25 = 142.373, 30 = 400.000. Exemplo: `C(3)=round(1.000×400^(2/29))=1.512` de **cada** recurso. Estoques que chegam ao teto não recebem a produção excedente. Um bônus permanente ou temporário pode modificar a capacidade.

| L | Capacidade/recurso | L | Capacidade/recurso | L | Capacidade/recurso |
|---:|---:|---:|---:|---:|---:|
| 1 | 1.000 | 11 | 7.893 | 21 | 62.305 |
| 2 | 1.229 | 12 | 9.705 | 22 | 76.604 |
| 3 | 1.512 | 13 | 11.932 | 23 | 94.184 |
| 4 | 1.859 | 14 | 14.670 | 24 | 115.798 |
| 5 | 2.285 | 15 | 18.037 | 25 | 142.373 |
| 6 | 2.810 | 16 | 22.177 | 26 | 175.047 |
| 7 | 3.454 | 17 | 27.266 | 27 | 215.219 |
| 8 | 4.247 | 18 | 33.523 | 28 | 264.611 |
| 9 | 5.222 | 19 | 41.217 | 29 | 325.337 |
| 10 | 6.420 | 20 | 50.675 | 30 | 400.000 |

**Variações:** máximo ou fator podem ser personalizados pelo mundo ou por item. **Edge cases:** se ferro está cheio e madeira não, somente ferro deixa de crescer; o retorno da coleta também perde excedente. **Fontes:** [Armazém oficial](https://support.innogames.com/kb/TribalWars/en_DK/5336), [tabela da wiki](https://tribalwars.fandom.com/wiki/Warehouse), [coleta oficial](https://support.innogames.com/kb/TribalWars/en_DK/3002), [itens](https://support.innogames.com/kb/TribalWars/en_DK/5369). **Nível de confiança:** alta para capacidade tabelada; média para a fórmula inferida.

### 1.3 Fazenda e espaço populacional

**O que é:** cada edifício e unidade ocupa espaço da fazenda. A fazenda fornece um teto simultâneo, não um recurso consumido ao longo do tempo.

**Regras:** nível 1 fornece 240 e nível 30 fornece 24.000 espaços no conjunto clássico. A soma da população de todos os edifícios mais unidades próprias e recrutamentos precisa caber no teto para iniciar novas construções/recrutamentos. As tabelas do Apêndice A trazem o **incremento** e o **total** por edifício; a tabela de unidades abaixo traz a população por soldado. Exemplo: 1.000 lanceiros (1.000) + 250 cavalarias leves (1.000) + edifícios ocupando 2.500 = 4.500 espaços; uma fazenda com limite 4.200 impede mais 300 espaços de produção. A destruição da fazenda por catapultas pode deixar a aldeia acima do limite; as tropas existentes não desaparecem automaticamente, mas novas filas ficam bloqueadas até abrir espaço.

**Fórmula reconstruída da tabela histórica alemã:** `F(L)=floor(240 × 100^((L−1)/29))`, `1≤L≤30`. Ela reproduz **todos os 30 valores** da tabela, inclusive `F(10)=1.002` e `F(30)=24.000`; usar `round` erraria 15 níveis. Os valores exatos estão abaixo. **Variações:** bônus de população por bandeira ou item (`Growing Crops` +10% permanente uma vez por aldeia), limites de fazenda opcionais e mundos especiais. **Fontes:** [Fazenda oficial](https://support.innogames.com/kb/TribalWars/en_DK/5333), [tabela histórica alemã 1–30](https://staemme.de.tl/Bauernhof.htm), [itens de aldeia](https://support.innogames.com/kb/TribalWars/en_DK/5369). **Nível de confiança:** alta para tabela e reconstrução matemática; média para aplicação em todos os mundos atuais.

| L | Capacidade | L | Capacidade | L | Capacidade |
|---:|---:|---:|---:|---:|---:|
| 1 | 240 | 11 | 1.174 | 21 | 5.748 |
| 2 | 281 | 12 | 1.376 | 22 | 6.737 |
| 3 | 329 | 13 | 1.613 | 23 | 7.896 |
| 4 | 386 | 14 | 1.891 | 24 | 9.255 |
| 5 | 452 | 15 | 2.216 | 25 | 10.848 |
| 6 | 530 | 16 | 2.598 | 26 | 12.715 |
| 7 | 622 | 17 | 3.045 | 27 | 14.904 |
| 8 | 729 | 18 | 3.569 | 28 | 17.469 |
| 9 | 854 | 19 | 4.183 | 29 | 20.476 |
| 10 | 1.002 | 20 | 4.904 | 30 | 24.000 |

### 1.4 Pontos da aldeia e do jogador

**O que é:** pontos representam apenas o desenvolvimento dos edifícios. O placar do jogador é a soma dos pontos de suas aldeias.

**Fórmula reconstruída da tabela oficial de todos os níveis:** cada prédio tem pontos-base `p_b` no nível 1; seus pontos **totais** no nível `L≥1` são `P_b(L)=round(p_b×1,2^(L−1))`, e `P_b(0)=0`. O incremento da obra `L` é `P_b(L)−P_b(L−1)`; `pontos_aldéia=Σ_b P_b(nível_b)` e `pontos_jogador=Σ_v pontos_aldéia(v)`. Esta expressão reproduz os incrementos da [imagem oficial](https://support.innogames.com/kb/TribalWars/en_DK/1264), inclusive QG nível 2 +2, nível 10 +9 e nível 30 +330. Os `p_b` necessários para implementar o cálculo são:

| Edifício | Pontos nível 1 | Edifício | Pontos nível 1 | Edifício | Pontos nível 1 |
|---|---:|---|---:|---|---:|
| Quartel-general | 10 | Quartel | 16 | Estábulo | 20 |
| Oficina | 24 | Igreja | 10 | Primeira igreja | 10 |
| Torre de vigia | 42 | Academia | 512 | Ferreiro | 19 |
| Ponto de encontro | 0 | Estátua | 24 | Mercado | 10 |
| Serraria | 6 | Poço de argila | 6 | Mina de ferro | 6 |
| Fazenda | 5 | Armazém | 6 | Esconderijo | 5 |
| Muralha | 8 |  |  |  |  |

Exemplo: QG 10 tem `round(10×1,2^9)=52` pontos totais; com Quartel 1 (16), a soma parcial é **68**. Em academia de pacotes, nível 2 dá `round(512×1,2)−512=102` pontos adicionais e nível 3 dá `round(512×1,2²)−614=123`. Não entram população livre/ocupada, recursos, tropas, pesquisa, lealdade, vitórias nem experiência. A classificação pode atualizar com atraso por carga de servidor.

**Variações:** edifícios ausentes do mundo (igreja, torre) não pontuam; academia de moedas e de pacotes diferem. **Edge cases:** a população de um edifício é correlata ao nível, mas **não é componente** da pontuação. Conquistar uma aldeia transfere seus pontos ao novo dono. O ponto de encontro vale 0 mesmo se existir. **Fontes:** [pontos oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1264), [academia oficial](https://support.innogames.com/kb/TribalWars/en_DK/5309). **Nível de confiança:** alta para tabela-base; média-alta para fórmula inferida, conferida em níveis amostrados.

### 1.5 Mercado, mercadores e ofertas

**O que é:** mercado permite envio livre de recursos e ofertas de troca. Cada mercador transporta até **1.000 unidades somadas** de madeira, argila e ferro, por exemplo 100+350+550.

**Regras:** `mercadores_necessários = ceil((madeira+argila+ferro)/1.000)`; 2.501 recursos exigem 3. Mercadores ficam indisponíveis durante ida e volta. A quantidade cresce com o nível do mercado: níveis 1–11 dão 1–11 mercadores; depois 12=14, 15=35, 20=110, 25=235. A [tabela completa](https://tribalwars.fandom.com/wiki/Market) é irregular e deve ser usada como tabela, não interpolada. Ofertas existem: o criador especifica o que oferece e o que deseja, e o outro jogador aceita. O envio livre a outros jogadores pode ficar bloqueado por certo tempo após a entrada no mundo; envios às próprias aldeias são exceção. A interface evita troca insegura via oferta. O XML do mundo informa `trade_cancel_time`; UK88 usa 300 s.

| Nível | Mercadores | Nível | Mercadores | Nível | Mercadores |
|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 10 | 10 | 19 | 91 |
| 2 | 2 | 11 | 11 | 20 | 110 |
| 3 | 3 | 12 | 14 | 21 | 131 |
| 4 | 4 | 13 | 19 | 22 | 154 |
| 5 | 5 | 14 | 26 | 23 | 179 |
| 6 | 6 | 15 | 35 | 24 | 206 |
| 7 | 7 | 16 | 46 | 25 | 235 |
| 8 | 8 | 17 | 59 | — | — |
| 9 | 9 | 18 | 74 | — | — |

**Fórmulas adicionais:** o tempo de transporte depende da distância e da velocidade dos mercadores, mas a taxa exata por campo não foi confirmada nas fontes consultadas. **Variações:** bônus de mercadores, troca premium por pontos, restrições de comércio e mundo. **Edge cases:** recursos que excedem o armazém de destino podem ser perdidos; o detalhe de retorno/rejeição em oferta deve ser testado. **Fontes:** [comércio oficial](https://support.innogames.com/kb/TribalWars/en_DK/1265), [mercado oficial](https://support.innogames.com/kb/TribalWars/en_DK/5321), [tabela de mercadores](https://tribalwars.fandom.com/wiki/Market), [missão de oferta](https://support.innogames.com/kb/TribalWars/en_DK/3035), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para capacidade, ofertas e contagens tabeladas; baixa para tempo/edge cases não documentados.

### 1.6 Esconderijo

**O que é:** protege automaticamente uma quantidade **de cada recurso**, inclusive da visão de batedores. Não esconde tropas.

**Regras:** limite 10 níveis; proteção por recurso segue a tabela. `saqueável_r=max(0, estoque_r−proteção)` antes da capacidade de carga e de outras regras de saque. Exemplo: esconderijo 5 protege 474 de cada tipo; de 700 madeira, 300 argila e 500 ferro, ficam teoricamente saqueáveis 226 madeira e 26 ferro.

| Nível | Proteção por recurso | Nível | Proteção por recurso |
|---:|---:|---:|---:|
| 1 | 150 | 6 | 632 |
| 2 | 200 | 7 | 843 |
| 3 | 267 | 8 | 1.125 |
| 4 | 356 | 9 | 1.500 |
| 5 | 474 | 10 | 2.000 |

**Fórmula reconstruída:** aproximadamente `round(150×(2000/150)^((L−1)/9))`, embora a tabela tenha prioridades sobre arredondamento. **Variações:** bônus e mundos podem alterar limites. **Fontes:** [Esconderijo oficial](https://support.innogames.com/kb/TribalWars/en_DK/5339), [tabela comunitária](https://tribalwars.fandom.com/wiki/Hiding_place). **Nível de confiança:** alta para tabela e proteção; média para fórmula.

## 2. Edifícios e níveis

### 2.1 Modelo geral de custo, população e tempo

**O que é:** cada edifício tem base e fatores de crescimento. O XML oficial fornece `max_level`, `min_level`, madeira/argila/ferro/população base, fatores de cada um, `build_time` e `build_time_factor`.

**Custos e população:** para um custo `x` e fator `f`, `custo_x(L)=round(x_base×f^(L−1))`. A população **total do edifício** obedece a `pop_total(L)=round(pop_base×pop_factor^(L−1))`; a população cobrada pelo nível é a diferença para o nível anterior. Exemplo do QG: nível 2 madeira `round(90×1,26)=113`; argila `round(80×1,275)=102`; ferro `round(70×1,26)=88`; população total passa de 5 para 6, logo Δpop=1. As tabelas oficiais permitem resolver divergências de arredondamento; o Apêndice A as transcreve nível a nível.

**Tempo:** a fórmula comunitária usada por um calculador independente é `T_b(L,H)=round(B_b×1,18×g_b^E(L)×1,05^(−H))`, `E(L)=max(−13,L−1−14/(L−1))` para `L≥2`, com `E(1)=−13`; `B_b` e `g_b` vêm do XML, `H` é nível do QG. **Esta é uma reconstrução, não uma fórmula oficial validada para todos os mundos**. UK88 tem `buildtime_formula=2` e `B_QG=600 s`. Para QG 20, construir QG 20 resulta aproximadamente `2:04:13`; com QG 30, a mesma base seria multiplicada por `1,05^(−10)≈0,614`, cerca de `1:16:16`. Os tempos `t20*` do Apêndice A usam essa expressão e mostram um valor por nível, com a ressalva de que o próprio QG não pode estar no nível 20 ao construir seus níveis iniciais. O fator de QG puro é `1,05^(−H)`: QG 20 ≈ 37,7% e QG 30 ≈ 23,1% de `H=0`.

**Variações e edge cases:** a velocidade de mundo já está embutida em `B_b` do XML. Itens, paladino, bandeiras, eventos, filas e construção instantânea alteram duração efetiva. Algumas configurações permitem demolir edifícios a partir de QG 15 e **somente com lealdade 100**; pré-requisitos devem ser checados para iniciar a obra. **Fontes:** [XML de edifícios](https://uk88.tribalwars.co.uk/interface.php?func=get_building_info), [QG oficial](https://support.innogames.com/kb/TribalWars/en_DK/5288), [fórmula comunitária](https://gist.github.com/amiuhle/61b0334997805ada0e99), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para custos/população e fator observado de QG; média-baixa para duração absoluta.

### 2.2 Catálogo completo de edifícios

Em cada linha, o Apêndice A fornece custos W/C/I, população e `t20*` **para todos os níveis**. A tabela abaixo traz máximo, pré-requisito e efeito. Pré-requisitos são da [lista oficial de edifícios](https://support.innogames.com/kb/TribalWars/en_DK/1184) e de suas [páginas individuais](https://support.innogames.com/kb/TribalWars/en_DK/5288). Máximos mudam em mundos especiais ou quando o edifício está desativado.

| Edifício | Máx. | Pré-requisito padrão | Função principal e desbloqueios |
|---|---:|---|---|
| Quartel-general | 30 | Inicial | Fila de edifícios; cada nível reduz tempo de todas as obras; demolição a partir de 15 se habilitada e lealdade 100. |
| Quartel | 25 | QG 3 | Recruta infantaria; nível acelera recrutamento. |
| Estábulo | 20 | QG 10, Quartel 5, Ferreiro 5 | Recruta batedores e cavalaria; nível acelera recrutamento. |
| Oficina | 15 | QG 10, Ferreiro 10 | Aríetes e catapultas; nível acelera produção. |
| Igreja | 3 | QG 5, Fazenda 5 | Fé de aldeias próprias no raio 4/6/8 campos; ausente em mundos sem igreja. |
| Primeira igreja | 1 | Contexto de mundo com igreja | Igreja inicial única; não substitui a igreja comum de expansão. |
| Torre de vigia | 20 | QG 5, Fazenda 5 | Marca ataques que entram em seu raio; opcional por mundo. |
| Academia | 1 moedas; 3 pacotes | QG 20, Ferreiro 20, Mercado 10 | Moedas/pacotes e recrutamento de nobres. |
| Ferreiro | 20 | QG 5, Quartel 1 | Pesquisa unidades e, conforme ruleset, melhora níveis de tecnologia; aumenta velocidade de pesquisa. |
| Ponto de encontro | 1 | Nenhum | Comandos de ataque/apoio, simulador e coleta se ativada. |
| Estátua | 1 | Nenhum | Recruta/revive paladino quando ativado. |
| Mercado | 25 | QG 3, Armazém 2 | Mercadores, transferências e ofertas. |
| Serraria | 30 | Nenhum | Produz madeira. |
| Poço de argila | 30 | Nenhum | Produz argila. |
| Mina de ferro | 30 | Nenhum | Produz ferro. |
| Fazenda | 30 | Inicial | Aumenta limite de população. |
| Armazém | 30 | Inicial | Aumenta teto separado para cada recurso. |
| Esconderijo | 10 | Nenhum | Protege recursos contra saque/espionagem. |
| Muralha | 20 | Quartel 1 | Defesa básica e bônus a tropas; aríetes a reduzem antes e depois do combate. |

**Detalhes importantes:**

- **Igreja:** sem fé, tropas daquela aldeia lutam com 50% da força; nível 1/2/3 cobre raio 4/6/8. Uma igreja já basta; igrejas de aliados não concedem fé a suas aldeias. A igreja é destruída na conquista. [Fonte oficial](https://support.innogames.com/kb/TribalWars/en_DK/1202).
- **Muralha:** a [tabela comunitária](https://tribalwars.fandom.com/wiki/Wall) dá bônus de 4% no nível 1, 44% no 10 e 106% no 20. `1,037^L−1` reproduz 19 dos 20 valores se arredondado ao percentual mais próximo, mas dá 107% no 20: há uma divergência de 1 ponto percentual ou arredondamento especial. Não há confirmação oficial da fórmula exata de defesa básica, nem de como o bônus é aplicado internamente. A regra *de Tribal Wars 2* de 5% por nível não deve ser importada.
- **Torre de vigia:** somente ataques enviados após sua construção ou após a conquista são certamente marcados; a marca surge ao entrar no raio, não necessariamente no envio. O tamanho exato por nível não foi exposto na página consultada. [Fonte oficial](https://support.innogames.com/kb/TribalWars/en_DK/5306).
- **Academia:** sistema de moedas tem máximo 1; o de pacotes permite níveis 2–3 com custos oficiais no apêndice. Uma página de FAQ menciona cunhar pacotes em Ferreiro/Casa da Moeda e recrutar no QG, enquanto a documentação tradicional situa o nobre na Academia; é uma divergência de interface/ruleset, não autorização para fundir ambos. [Academia](https://support.innogames.com/kb/TribalWars/en_DK/5309), [FAQ](https://support.innogames.com/kb/TribalWars/en_DK/5970).
- **Outros edifícios:** as fontes atuais citam *Stronghold/Fortaleza* como objetivo de tribo em mundos específicos, mas não como prédio de aldeia com tabela estável. Bônus de aldeias e runas também não são edifícios do catálogo de construção. [FAQ oficial](https://support.innogames.com/kb/TribalWars/en_DK/5970).

**Nível de confiança do catálogo:** alta para máximos, custos e pré-requisitos oficiais; média para efeitos quantitativos não publicados; baixa para a reconstrução matemática da muralha.

## 3. Unidades e pesquisa

### 3.1 Tabela completa de unidades

**O que é:** tropas têm custo fixo por unidade, população, velocidade, carga e quatro atributos de combate. As três colunas de defesa do jogo são contra infantaria/ataque geral, cavalaria e arqueiros montados. A tabela abaixo usa atributos do ruleset **pesquisa simplificada**, antes de bônus, e custos das [páginas oficiais de unidades](https://support.innogames.com/kb/TribalWars/en_DK/1185). `t UK88` é `build_time` em segundos exposto no XML do mundo; **não** é a duração final da unidade em todos os níveis de quartel/estábulo/oficina. `v` é campos por hora no padrão de velocidade 1, calculados de minutos/campo das páginas oficiais. A coluna `D arq` continua listada para permitir alternar a opção de arqueiros.

| Unidade | W/C/I | Pop. | t UK88 (s) | min/campo padrão | v (campos/h) | Carga | Atq. | D geral | D cav. | D arq. | Requisito de pesquisa/recrutamento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Lanceiro | 50/30/10 | 1 | 680 | 18 | 3,333 | 25 | 10 | 15 | 45 | 20 | Quartel 1 |
| Espadachim | 30/30/70 | 1 | 1.000 | 22 | 2,727 | 15 | 25 | 50 | 15 | 40 | Ferreiro 1, Quartel |
| Machado | 60/30/40 | 1 | 880 | 18 | 3,333 | 10 | 40 | 10 | 5 | 10 | Ferreiro 2, Quartel |
| Arqueiro | 100/30/60 | 1 | 1.200 | 18 | 3,333 | 10 | 15 | 50 | 40 | 5 | Quartel 5, Ferreiro 5; só mundos com arqueiros |
| Batedor | 50/50/20 | 2 | 600 | 9 | 6,667 | 0 | 0 | 2 | 1 | 2 | Estábulo 1 |
| Cavalaria leve | 125/100/250 | 4 | 1.200 | 10 | 6,000 | 80 | 130 | 30 | 40 | 30 | Estábulo 3 |
| Arqueiro a cavalo | 250/100/150 | 5 | 1.800 | 10 | 6,000 | 50 | 120 | 40 | 30 | 50 | Estábulo 5; só mundos com arqueiros |
| Cavalaria pesada | 200/150/600 | 6 | 2.400 | 11 | 5,455 | 50 | 150 | 200 | 80 | 180 | Estábulo 10, Ferreiro 15 |
| Aríete | 300/200/200 | 5 | 3.200 | 30 | 2,000 | 0 | 2 | 20 | 50 | 20 | Oficina 1 |
| Catapulta | 320/400/100 | 8 | 4.800 | 30 | 2,000 | 0 | 100 | 100 | 50 | 100 | Oficina 2, Ferreiro 12 |
| Paladino | 20/20/40 | 10 | 14.400 | 10 | 6,000 | 100 | 150 | 250 | 400 | 150 | Estátua 1, se ativado |
| Nobre | 40.000/50.000/50.000 | 100 | 12.000 | 35 | 1,714 | 0 | 30 | 100 | 50 | 100 | Academia 1 e seus pré-requisitos |
| Milícia | 0/0/0 | 0 | Imediata/temporária | Não marcha | — | 0 | 0 | 15 | 45 | 25 | Convocação pela Fazenda, se ativada |

**Cálculos e variações:** `v=60/minutos_por_campo`; 18 min/campo dá `60/18=3,333 campos/h`. A velocidade de viagem efetiva é modificada por mundo; por exemplo no UK88 o XML expõe 24 min/campo para lanceiro porque `18/(1,5×0,5)=24`. O tempo base de recrutamento foi lido diretamente de `get_unit_info` do UK88: por exemplo 680 s para lanceiro e 12.000 s para nobre. O fator preciso de redução por nível do edifício de recrutamento não foi confirmado pela InnoGames; uma referência comunitária propõe `t_final=t_base×(2/3)×1,06^(−nível)`, mas isso não foi validado contra a fila do servidor. Paladino tem discrepância histórica: a wiki antiga cita 8 min/campo, a página oficial atual 10; usar o XML do mundo. Milícia não marcha e o XML carrega velocidade quase zero apenas como dado técnico. **Fontes:** [unidades oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1185), [XML UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_unit_info), [paladino histórico](https://tribalwars.fandom.com/wiki/Paladin), [tempo de treinamento comunitário](https://mainboulder.weebly.com/blog/tribal-wars-ram-chart). **Nível de confiança:** alta para custos, população, atributos e tempo base UK88; baixa para fórmula geral de recrutamento.

### 3.2 Pesquisa e níveis de tecnologia

**O que é:** Ferreiro libera tipos de unidade e pode elevar seus atributos. O sistema muda por mundo; o UK88 usa pesquisa simplificada (`tech=2` no XML, descrita assim na página do mundo).

**Regras:** no sistema **simples**, cada tipo é pesquisado uma vez e usa os valores da tabela anterior; não há melhoria de +X% por nível. No sistema **3 níveis**, o nível 1 usa atributos base, nível 2 costuma elevar os atributos aproximadamente 25%, nível 3 aproximadamente 40%, mas o arredondamento é por atributo; por exemplo cavalaria leve: ataque 130→163→182, defesa geral 30→38→42, defesa cavalaria 40→50→56. Os custos de pesquisa nesse exemplo são 550/600/500 no nível 1, 2.200/2.400/2.000 no 2 e 8.800/9.600/8.000 no 3. No sistema **10 níveis**, os atributos crescem gradualmente; a mesma unidade tem ataque 130 no 1, 156 no 5 e 195 no 10, com custos de pesquisa específicos por nível (275/310/260 no 1; 18.898/21.303/17.867 no 10). Assim, **não** codifique simplesmente `ataque_base×1,05^L` sem conferir as tabelas oficiais de cada unidade. Ferreiro 20 é pré-requisito da Academia, e seu nível encurta a pesquisa. A quantidade total de pesquisas pode ser limitada em sistemas antigos, ponto ainda não validado em documentação oficial atual.

**Exemplo numérico:** 100 cavalarias leves atacam com `100×130=13.000` de força bruta no sistema simples, `100×163=16.300` com tecnologia 3-níveis nível 2, antes de moral/sorte/fé. **Edge cases:** a tecnologia pertence à aldeia que produziu as tropas; a aplicação a tropas de apoio e o destino de tecnologias após conquista exigem teste. **Fontes:** [cavalaria leve e tabelas de 3/10 níveis](https://support.innogames.com/kb/TribalWars/en_DK/5264), [Ferreiro](https://support.innogames.com/kb/TribalWars/en_DK/5312), [configuração UK88](https://uk88.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para os três modos e exemplo; média-baixa para herança de pesquisa e limite global.

### 3.3 Batedores, milícia e paladino

**Batedores.** Em missão isolada, enfrentam batedores defensores, não a força regular. Pelo menos 1 sobrevivente revela tropas estacionadas; ≥50% sobreviventes, recursos; ≥70%, edifícios; >90%, tropas próprias fora da aldeia. O sistema de 3 tecnologias pode impor níveis adicionais para recursos/edifícios/tropas fora; há configurações que exigem mínimo de 4 batedores. Exemplo: 10 enviados, 7 sobreviventes = 70%, então revelam tropas, recursos e edifícios, mas não tropas fora. [Fonte oficial](https://support.innogames.com/kb/TribalWars/en_DK/1191). **Confiança:** alta para faixas; média para combate de batedores não publicado.

**Milícia.** Unidade defensiva temporária de mundos que a ativam; sem custo ou população extra, não marcha. Um guia brasileiro antigo descreve convocação de `min(nível_fazenda,15)×20`, máximo 300, mas faltou confirmação em fonte oficial atual, e regras de produção reduzida/duração são configurações históricas. **Fonte:** [unidade oficial](https://support.innogames.com/kb/TribalWars/en_DK/5285), [guia histórico](https://istribalwars.blogspot.com/p/sobre-milicia.html), [UK88](https://uk88.tribalwars.co.uk/page/settings). **Confiança:** alta para atributos, baixa para quantidade/duração.

**Paladino.** Mundos podem desativá-lo, oferecer um paladino sem habilidades, ou até 10 paladinos com habilidades. No modo atual, novos paladinos são liberados ao possuir 1, 3, 5, 10, 20, 35, 50, 65, 80 e 100 aldeias; cada um sobe até nível 30, recebe livros e escolhe entre 12 habilidades em 3 árvores com 4 níveis. Faixas de habilidade são abertas nos níveis 1, 8, 16 e 24. As árvores incluem ataque (machados, cavalaria leve, catapultas, aríetes), economia (produção, construção, recrutamento, persuasão do nobre) e defesa (espadas, lanças, edifícios e muralha). Em apoio, um paladino pode fazer o exército marchar em sua velocidade; morre conforme perdas da categoria de cavalaria e pode ser revivido, 6 h em velocidade 1. [Fonte oficial](https://support.innogames.com/kb/TribalWars/en_DK/1192). **Confiança:** alta para regras publicadas; baixa para percentuais internos das habilidades, que não estavam na página.

**Armas antigas do paladino.** Não presumir sua presença em mundos de 2026: a [FAQ oficial de TW1](https://support.innogames.com/kb/TribalWars/en_DK/5988) diz que não há plano de retorná-las, substituídas por relíquias. A tabela histórica abaixo vem de guias de época, **não** do ruleset UK88. Nesses mundos, equipar a arma na estátua e enviar o paladino com as tropas ativava o efeito aplicável.

| Arma histórica | Efeito relatado para TW1 antigo |
|---|---|
| Alabarda de Guan Yu | Lanceiros: +30% ataque, +20% defesa. |
| Espada longa de Paracelsus | Espadachins: aumento de ataque e defesa; percentual não confirmado no registro consultado. |
| Machado de Thorgard/Thogard | Machados: +30% ataque, +20% defesa. |
| Arco longo de Nimrod | Arqueiros: +30% ataque, +20% defesa. |
| Telescópio de Kalid | Batedores revelam tropas fora da aldeia mesmo sem a faixa usual de sobreviventes, segundo guia antigo. |
| Lança de Mieszko/Miezko | Cavalaria leve: +30% ataque, +20% defesa. |
| Arco composto de Nimrod | Arqueiros a cavalo: +30% ataque, +20% defesa. |
| Estandarte de Baptiste | Cavalaria pesada: +30% ataque, +20% defesa. |
| Estrela da manhã de Carol | Dano **estrutural** de aríetes +100%, não necessariamente ataque comum. |
| Fogueira de Aletheia | Dano **estrutural** de catapultas +100%. |
| Cetro de Vasco | Nobres: redução mínima de lealdade passa de 20 a 30; guia também relata +30% ataque, +20% defesa do nobre. |

O valor máximo de lealdade com Vasco, empilhamento com Persuasion/itens e efeito exato do telescópio em todas as versões precisam de teste. **Fontes:** [guia português de armas de TW1](https://tribalwars-fernando.blogspot.com/2009/06/alabarda-de-guan-yu-serve-para-aumentar.html), [registro comunitário de 2008](https://www.ptt.cc/bbs/TribalWars/M.1200871324.A.EA2.html), [FAQ oficial de TW1](https://support.innogames.com/kb/TribalWars/en_DK/5988). **Confiança:** média para efeitos do ruleset antigo, baixa para aplicação a mundos atuais.

## 4. Combate, cerco e informação

### 4.1 Ordem lógica de uma batalha e fórmula geral

**O que é:** um comando de ataque chega a uma aldeia em tempo real; o servidor considera tropas locais e apoios presentes no instante do impacto, atributos, muralha, fé, moral, sorte, bônus noturno, pesquisa e modificadores. O simulador oficial no Ponto de Encontro reproduz o resultado estimado com hipóteses fornecidas pelo jogador.

**Regras confirmadas:** (1) batedores fazem seu confronto de informação; (2) aríetes reduzem a eficácia da muralha antes do confronto regular; (3) a força de ataque e as três defesas das tropas são modificadas por bônus; (4) o confronto decide vencedor e baixas; (5) sobreviventes atacantes saqueiam e, se houver, catapultas/aríetes aplicam dano de edifício; (6) nobre sobrevivente pode reduzir lealdade e conquistar. A ordem exata de espionagem, saque, dano estrutural e nobre em casos limítrofes é parcial nas fontes. A fonte comunitária afirma que aríetes calculam dano **duas vezes**, antes e depois da batalha, com pré-dano limitado a metade do nível inicial da muralha; não foi localizado código oficial para validar o algoritmo completo.

**Reconstrução histórica mais concreta encontrada:** um guia brasileiro de 2012 afirma reproduzir equações da antiga wiki de TW1. Ele separa ataque de infantaria/geral `A_G`, cavalaria `A_C` e arqueiros `A_A`; define `A_T=A_G+A_C+A_A`; e três defesas `D_G,D_C,D_A`, cada uma como soma dos atributos relevantes das tropas defensivas, multiplicada pela muralha e acrescida da defesa básica da aldeia. Para um ataque homogêneo, descreve perdas do atacante `min(1,(D_tipo/A_T)^(3/2))` e perdas da defesa `min(1,(A_tipo/D_tipo)^(3/2))`. Isso **não é apenas A>D**: mesmo quando o atacante é aniquilado, ele pode matar parte dos defensores. Exemplo do guia: 625 machados têm ataque `625×40=25.000` contra 1.000 espadas com `50.000+20` de defesa geral sem muralha; atacante perde 100%, defesa perde aproximadamente `(25.000/50.020)^1,5×100≈35,3%`, cerca de 353 espadas, antes de arredondamento individual. Para ataque **misto**, o próprio autor introduz um fator `x` desconhecido e relata previsão de 58,5% contra **58,8%** no simulador. Logo, embora o expoente `3/2` seja um candidato forte para rulesets históricos, **a fórmula exata do motor não foi localizada**.

Não há base suficiente para afirmar que uma regra logarítmica ou esta reconstrução de 2012 rege todos os mundos atuais. Fontes de *Tribal Wars 2* publicam modificadores diferentes e não provam o algoritmo de TW1. O cálculo final deve ser calibrado contra o simulador oficial e relatórios até que se obtenha implementação confiável. [Fórmulas históricas e comparação](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html), [simulador oficial](https://support.innogames.com/kb/TribalWars/en_DK/1199).

**Exemplo verificável de entrada, não de resultado atual:** 100 machados dão ataque bruto 4.000; 100 espadas defendem com 5.000 contra infantaria. Uma moral de 50% e sorte de +20% fazem a parcela de ataque bruto `4.000×0,5×1,2=2.400`, antes de fé, muralha e outros modificadores. A equação histórica acima sugere um resultado sob condições específicas, mas não autoriza tratar `2.400/5.000` como fórmula validada de baixas para o motor de 2026. **Fontes:** [simulador oficial](https://support.innogames.com/kb/TribalWars/en_DK/1199), [reconstrução histórica](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html), [aríetes/ordem comunitária](https://tw-wiki.weebly.com/beginners-guide-6.html), [aríete oficial](https://support.innogames.com/kb/TribalWars/en_DK/5273), [relatórios](https://support.innogames.com/kb/TribalWars/en_DK/1209). **Nível de confiança:** alta para parâmetros; média-baixa para a equação histórica; baixa para ordem fina e equivalência atual.

### 4.2 Três defesas e exércitos mistos

**O que é:** cada defensor possui defesa geral, contra cavalaria e contra arqueiros. O atacante fornece unidades de categorias diferentes; a defesa aplicada depende da categoria do ataque, não do tipo do defensor.

**Regras verificadas:** lanças defendem muito melhor contra cavalaria (45) do que infantaria (15); espadas defendem infantaria a 50 e cavalaria a 15; arqueiros têm defesa contra arqueiro de apenas 5. Em um ataque homogêneo de 100 cavalarias leves contra 100 lanças, a força defensiva bruta relevante é `100×45=4.500`, antes da muralha. Para 100 machados contra as mesmas lanças é `100×15=1.500`.

**Mistura:** a reconstrução histórica propõe `q_def=min(1,[(A_G/D_G)+(A_C/D_C)+(A_A/D_A)]^(3/2)×x)`, onde `x≈1` é um fator de composição **que o próprio autor não soube calcular**. Para perdas do atacante por categoria, usa `q_atq,G=min(1,(D_G/A_T)^(3/2))`, e analogamente `D_C`/`D_A`; isso implica percentuais diferentes de baixas para grupos atacantes distintos. Em seu exemplo, 5.000 machados + 1.000 arqueiros a cavalo atacam 10.000 espadas sem muralha: `A_G=200.000`, `A_A=120.000`, `D_G=500.000`, `D_A=400.000`; antes de `x`, a defesa perderia `(0,4+0,3)^1,5=58,57%`, mas o simulador marcou **5.883/10.000=58,83%**. O desconhecido `x` e a ordem de modificadores impedem equivalência exata. Outra hipótese externa reparte defesa proporcionalmente por quantidade de tropas; ela difere desta equação baseada em **força de ataque**. **Fontes:** [tabela oficial](https://support.innogames.com/kb/TribalWars/en_DK/1185), [reconstrução histórica](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html), [hipótese técnica alternativa](https://gamedev.stackexchange.com/questions/159824/two-army-battle-simulator). **Nível de confiança:** alta para atributos; média-baixa para reconstrução antiga; baixa para equivalência com motor atual.

### 4.3 Baixas por tipo de unidade

**O que é:** o resultado de um combate informa perdas de cada tipo, não apenas vencedor. Essas perdas governam nobre, saque, pontos de adversários derrotados e capacidade de novos ataques.

**Fórmula exata atual:** não encontrada. Para regras históricas, a seção 4.1–4.2 registra `q=(D/A)^1,5` para atacante homogêneo e `(A/D)^1,5` para defensor homogêneo, truncados a 100%, com um fator desconhecido em misturas. A passagem de **percentual** para perdas inteiras por unidade também não foi explicada no guia. O suporte oficial confirma que a morte de nobre acompanha perdas da categoria de infantaria: aproximadamente 50% de perda da infantaria matam um nobre, e 75% matam os dois se dois nobres estiverem juntos. O paladino acompanha cavalaria. Isso sugere uma fração de baixas por grupo, mas não revela a regra de arredondamento/ordem. Um resultado com 40/100 machados perdidos, por exemplo, não permite afirmar que também morrerão 40/100 lanças atacantes sem comparação com relatórios/simulador.

**Edge cases:** aríetes podem sobreviver enquanto outros grupos sofrem perdas; batedores têm combate separado; milícia só defende; bônus e habilidades podem modificar perdas. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [paladino oficial](https://support.innogames.com/kb/TribalWars/en_DK/1192), [batedores](https://support.innogames.com/kb/TribalWars/en_DK/1191), [fórmulas históricas](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html). **Nível de confiança:** alta para dependência declarada de nobre/paladino; média-baixa para fórmula histórica; baixa para equação geral atual.

### 4.4 Moral

**O que é:** penalidade ao ataque de jogador muito maior contra jogador muito menor. Nunca concede bônus acima de 100%; contra aldeia bárbara é sempre 100%.

**Regra contemporânea:** InnoGames afirma que a moral é calculada por pontos do atacante e defensor e, em certos mundos, também pela idade da conta no mundo. Quem permanece pequeno por muito tempo vê a moral contra si subir gradualmente até 50%. O mundo pode desativá-la por completo; UK88 usa pontos+tempo, Summer 2026 nenhuma. A moral aparece na janela/simulador antes do envio, enquanto sorte só é conhecida após o combate.

**Fórmula histórica, não universal:** `M_pontos≈min(100, round(30+300×P_def/P_atq))%`, citada por um guia de 2011 com referência à antiga wiki oficial. Exemplo: atacante 10.000 pontos, defensor 1.000 → `30+300×0,1=60%`; atacante 20.000 contra 1.000 → 45%. Não foi localizada a equação do componente **tempo** nem a confirmação de que esta fórmula permanece idêntica em 2026; portanto ela é um candidato para o modo histórico, não uma verdade global. `moral=0/1/2` no XML diferencia regras, mas as semânticas exatas dos códigos devem ser confirmadas pela página de configurações humana do mundo. **Fontes:** [moral oficial](https://support.innogames.com/kb/TribalWars/en_DK/1194), [fórmula histórica](https://tribalwarshintsandtips.blogspot.com/2011/), [aldeias bárbaras](https://support.innogames.com/kb/TribalWars/en_DK/1197), [mundos contrastantes](https://uk88.tribalwars.co.uk/page/settings), [Summer](https://ukc4.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para efeito e variação; média para fórmula histórica; baixa para componente temporal exato.

### 4.5 Sorte, muralha, fé e bônus noturno

**Sorte.** Valor aleatório entre **−25% e +25%**, do ponto de vista do atacante. Multiplicador simples `1+S/100`: com `S=−20`, `0,8`; com `S=+25`, `1,25`. Bandeiras de sorte aproximam o valor de zero: bandeira 6% transforma ±20% em ±14%. O valor é sorteado para a batalha, não conhecido antes do ataque; o simulador permite escolher cenários. [Sorte oficial](https://support.innogames.com/kb/TribalWars/en_DK/1196), [bandeiras](https://support.innogames.com/kb/TribalWars/en_DK/2996), [simulador](https://tribalwars.fandom.com/wiki/Simulator). **Confiança:** alta para faixa e efeito; distribuição exata do gerador/precisão decimal não publicada.

**Muralha.** Aumenta defesa básica da aldeia e força das tropas presentes. Duas tabelas de TW1 divergem no topo: a [Fandom](https://tribalwars.fandom.com/wiki/Wall) dá **+106%** no nível 20, enquanto a [reprodução de 2012 atribuída à wiki antiga](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html) dá multiplicador **2,07** (+107%). Esta última ainda declara defesa básica `B_2(L)=20+50L`, adicionada **depois** de multiplicar a defesa das tropas por `B_1(L)`. Os dois termos históricos são:

| L | B₁ (tropas) | B₂ (defesa básica) | L | B₁ | B₂ | L | B₁ | B₂ |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 1,00 | 20 | 7 | 1,29 | 370 | 14 | 1,66 | 720 |
| 1 | 1,04 | 70 | 8 | 1,34 | 420 | 15 | 1,72 | 770 |
| 2 | 1,08 | 120 | 9 | 1,39 | 470 | 16 | 1,79 | 820 |
| 3 | 1,12 | 170 | 10 | 1,44 | 520 | 17 | 1,85 | 870 |
| 4 | 1,16 | 220 | 11 | 1,49 | 570 | 18 | 1,92 | 920 |
| 5 | 1,20 | 270 | 12 | 1,55 | 620 | 19 | 1,99 | 970 |
| 6 | 1,24 | 320 | 13 | 1,60 | 670 | 20 | 2,07* | 1.020 |

`*` Fandom lista 2,06 no nível 20; validar no simulador do mundo alvo. Exemplo histórico: 10.000 de defesa de tropas com muralha 10 fornecem `10.000×1,44+520=14.920`, antes de fé/noite. A função `1,037^L` aproxima os fatores, mas não substitui a tabela. Aríetes podem reduzir a muralha **efetiva** antes do confronto; sua equação completa está em 4.9. [Muralha oficial](https://support.innogames.com/kb/TribalWars/en_DK/5342), [tabela Fandom](https://tribalwars.fandom.com/wiki/Wall), [reprodução histórica com defesa básica](https://vicioemtw.blogspot.com/2012/09/matematica-de-batalha.html), [aríetes](https://tw-wiki.weebly.com/beginners-guide-6.html). **Confiança:** média para fatores históricos e defesa básica, baixa para aplicação idêntica em 2026.

**Fé.** Em mundos com igreja, aldeia dentro do raio de uma igreja própria luta a 100%; fora dele, tropas daquela aldeia lutam a 50%. Para ataque, verifica-se a aldeia de origem; para apoio, a aldeia defendida e a fé do dono dela. Uma igreja basta; igrejas aliadas não empilham. Exemplo: 10.000 pontos de força bruta de origem sem fé rendem 5.000 antes de outros fatores. [Igreja oficial](https://support.innogames.com/kb/TribalWars/en_DK/1202), [edifício](https://support.innogames.com/kb/TribalWars/en_DK/5300). **Confiança:** alta.

**Noite.** Configuração de mundo em horário do servidor. UK88: 23:00–07:00, **+100% de defesa**; Summer 2026: 00:00–07:00, **+900%**; UK Classic 1: 23:00–08:00, **+300%**; EN154 permite ao jogador selecionar sua janela de oito horas; EN155 desativa a noite. Exemplo: defesa 10.000 sem outros fatores vira 20.000 no UK88 durante a noite, ou 100.000 no Summer 2026. O enquadramento exato na fronteira do horário deve ser testado com timestamps do servidor. Aldeias bárbaras não recebem bônus noturno. [UK88](https://uk88.tribalwars.co.uk/page/settings), [Summer](https://ukc4.tribalwars.co.uk/page/settings), [UK Classic](https://ukc1.tribalwars.co.uk/page/settings), [EN154](https://en154.tribalwars.net/en-dk/page/settings), [EN155](https://en155.tribalwars.net/en-dk/page/settings), [bárbaras](https://support.innogames.com/kb/TribalWars/en_DK/1197). **Confiança:** alta para parâmetros e exceção.

### 4.6 Simultaneidade e sniping

**O que é:** comandos têm hora prevista de chegada; jogadores tentam inserir apoio entre uma onda de limpeza e a onda de nobre, ou retirar tropas antes do impacto e retorná-las depois.

**Regras:** UK88 ativa milissegundos e define `attack_gap=50` e `support_gap=50` no XML, interpretados como espaçamento mínimo de comandos do mesmo tipo. Isso **não revela** a chave completa de ordenação de eventos com mesmo milissegundo, nem prioridade entre apoio/ataque. O servidor deve aplicar transições em ordem determinística, mas essa ordem não está documentada publicamente. *Sniping* consiste em fazer defensores faltarem na onda de limpeza e reaparecerem antes do nobre; uma diferença de milissegundos pode ser decisiva. Exemplo: limpeza prevista 12:00:00.100 e nobre 12:00:00.300; se o apoio chega 12:00:00.200, ele só defende a segunda onda. Isso é exemplo de cronologia, não garantia de precisão de interface/latência. A possibilidade de cancelar comandos é limitada pelo mundo: UK88 aceita cancelamento de ataques até 10 min após o envio e transporte até 5 min, não um cancelamento arbitrário no último instante. **Ataques falsos:** alguns mundos exigem mínimo de tropas em comandos que simulam ataque real; UK89 anuncia limite de **2% dos pontos da aldeia**, EN155 de **1%**, UK88 nenhum. A conversão de percentual em quantidade de tropas deve ser conferida por tipo de unidade no mundo.

**Fontes:** [configuração XML](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [configuração legível](https://uk88.tribalwars.co.uk/page/settings), [UK89](https://uk89.tribalwars.co.uk/page/settings), [EN155](https://en155.tribalwars.net/en-dk/page/settings), [descrição histórica de sniping](https://en.wikipedia.org/wiki/Tribal_Wars). **Nível de confiança:** alta para timers expostos; baixa para ordenação de eventos empatados e implementação do limite de fakes.

### 4.7 Saque e limites de pilhagem

**O que é:** tropas atacantes sobreviventes podem levar recursos não protegidos até sua carga total. Mundo com `hauls` também pode impor teto adicional por aldeia/período.

**Modelo confirmado em nível agregado:** `C=Σ_u sobreviventes_u×carga_u`; `R_r=max(0,estoque_r−esconderijo_r)`; `saque_total≤min(C,Σ_r R_r,limite_de_haul_se_houver)`. Exemplo: 20 cavalarias leves sobreviventes têm `20×80=1.600` de carga. Se há 1.000 madeira, 500 argila, 700 ferro e esconderijo 5 (474 de cada), o estoque exposto é 526+26+226=778; logo o saque máximo agregado é 778. A distribuição exata entre tipos quando `C` é insuficiente não foi documentada; não supor proporção uniforme sem teste. UK88 tem `hauls=1`, `hauls_base=1000`, `hauls_max=100000`, mas a função de progressão do teto não está no XML.

**Edge cases:** não há saque se o ataque falha; mercadorias protegidas não aparecem a batedores; relíquias/itens e bônus podem alterar coleta. **Fontes:** [unidades e carga](https://support.innogames.com/kb/TribalWars/en_DK/1185), [esconderijo](https://support.innogames.com/kb/TribalWars/en_DK/5339), [XML UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [limites de saque discutidos](https://www.reddit.com/r/tribalwars/comments/1frpqp3). **Nível de confiança:** alta para teto por carga/esconderijo; baixa para distribuição e *hauls*.

### 4.8 Relatórios de batalha

**O que é:** relatórios registram o resultado após um evento. Categorias oficiais: ataques, defesas, apoio, comércio, eventos, diversos, encaminhados e públicos.

**Conteúdo:** um relatório de batalha mostra vencedor, sorte, exércitos de atacante e defensor, perdas, moral, bônus, saque, dano à muralha/edifício e lealdade quando aplicável. Batedores sobreviventes acrescentam recursos, edifícios e tropas fora conforme faixas da seção 3.3. Se todos os atacantes morrem, fontes históricas relatam censura de informações do defensor; a regra exata da UI atual e a diferença por destinatário não foram documentadas integralmente. Relatórios públicos podem esconder tropas, perdas, saque e níveis de edifícios. A InnoGames declara limite de `100+10×número_de_aldeias` relatórios em armazenamento normal; 1 aldeia = 110. Os relatórios antigos são excluídos quando ultrapassam o teto, salvo arquivo premium.

**Fontes:** [relatórios oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1209), [espionagem](https://support.innogames.com/kb/TribalWars/en_DK/1191), [descrição histórica em polonês](https://plemmiona.pl.tl/Raporty.htm). **Nível de confiança:** alta para campos gerais e limite; média-baixa para visibilidade exata atacante/defensor em derrota total.

### 4.9 Aríetes e catapultas

**Aríetes:** têm 2 de ataque comum, mas sua função especial reduz muralha. Guia comunitário antigo descreve pré-dano `Δ≈round((Z/4)×1,09^(−W))`, onde `Z` é quantidade efetiva de aríetes e `W` nível inicial da muralha, com queda pré-combate limitada a metade de `W`; depois do combate há segunda fase de dano com aríetes sobreviventes. Exemplo: `Z=213`, `W=20` dá `213/4×1,09^(−20)=9,50`, arredondado a 10, reduzindo muralha 20 para 10 **durante** a luta. A fórmula de dano pós-combate encontrada em outra comunidade inclui `(força_ataque/força_defesa)^1,5`, mas sua escrita é ambígua e não deve ser tratada como reprodução do motor. [Aríete oficial](https://support.innogames.com/kb/TribalWars/en_DK/5273), [guia de cerco](https://tw-wiki.weebly.com/beginners-guide-6.html), [fórmula alternativa](https://mainboulder.weebly.com/blog/tribal-wars-ram-chart). **Confiança:** média-baixa para pré-dano, baixa para pós-dano.

**Catapultas:** o atacante escolhe um edifício-alvo na ordem; podem atingir muralha e a maioria dos edifícios, respeitando exceções do ruleset (por exemplo a primeira igreja é tratada de modo diferente da igreja comum; a igreja comum resiste mais). O suporte oficial manda usar o simulador com o nível do alvo para saber quantas são necessárias, **sem publicar equação de dano**. Guia histórico lista quantidade mínima de catapultas nível 1 para derrubar *um* nível de um edifício 30→29: **20**, 20→19: **9**, 10→9: **4**, 1→0: **2** em cenário da época. Outro resultado do mesmo guia afirma 1.175 em uma onda para 30→0, versus 238 em ondas sucessivas; esse número é exemplo comunitário, não universal. Exemplo prático: 20 catapultas sobreviventes podem, naquele cenário, reduzir 30→29; duas ondas consecutivas podem aproveitar o custo menor do próximo nível. A força de catapulta como tropa comum é ataque 100/defesa 100/50/100, separada do dano estrutural. **Fontes:** [catapulta oficial](https://support.innogames.com/kb/TribalWars/en_DK/1198), [unidade oficial](https://support.innogames.com/kb/TribalWars/en_DK/5276), [tabela histórica](https://tw-wiki.weebly.com/beginners-guide-6.html), [igreja](https://support.innogames.com/kb/TribalWars/en_DK/1202). **Nível de confiança:** alta para alvo/simulador, baixa para fórmula e quantidades gerais.

## 5. Nobre e conquista

### 5.1 Custo total, academia, moedas e pacotes

**O que é:** o nobre é uma unidade cara que converte uma vitória militar em perda de lealdade; só sucessivas vitórias permitem conquistar a aldeia. Academia não cria automaticamente nobres: ela libera a capacidade de recrutá-los e o sistema econômico de moedas ou pacotes.

**Regras exatas publicadas:** no conjunto de atributos oficiais, cada nobre custa **40.000 madeira, 50.000 argila, 50.000 ferro e 100 espaços** da fazenda. Seu tempo-base de recrutamento no XML do UK88 é 12.000 segundos; o tempo efetivo depende da velocidade do mundo e de bônus. A academia exige QG 20, ferreiro 20 e mercado 10; no sistema de moedas vai até nível 1, no de pacotes pode chegar a 3. Uma moeda no UK88 custa **28.000/30.000/25.000**. A primeira capacidade de nobre requer 1 moeda, a próxima mais 2, a terceira mais 3 e assim por diante. As moedas são globais e persistem se um nobre ou aldeia for perdido. O custo cresce com a expansão, pois a capacidade cobre nobres em circulação **e** aldeias adquiridas; a fonte oficial não publica uma equação completa do estado contábil após todas as sequências possíveis de perdas e reconquistas. **Terceiro modelo:** [EN Classic 1](https://enc1.tribalwars.net/en-dk/page/settings) anuncia compra do nobre diretamente com recursos, custo crescente após o segundo e reposição barata de nobres perdidos; portanto moeda/pacote não são regras universais.

**Fórmula e exemplo:** para desbloquear sequencialmente `n` posições a partir de zero, moedas acumuladas `1+2+…+n=n(n+1)/2`. Três posições pedem 6 moedas, ou `168.000/180.000/150.000` de recursos aos preços de cunhagem do UK88; somados **três** nobres a **preço nominal** de 40/50/50 mil, mais `120.000/150.000/150.000`, total ilustrativo `288.000/330.000/300.000`, antes de academia e exércitos. Um primeiro nobre a preço nominal mais uma moeda equivale a `68.000/80.000/75.000`. **Atenção:** o XML UK88 expõe `snob.factor=0,5` sem explicar a que custo esse fator se aplica; por isso os totais ilustrativos **não são uma cotação verificada na tela do UK88**. Há mundos antigos que reduzem o preço do nobre e mundos de **pacotes** com número fixo de moedas/pacotes por nobre; o FAQ menciona cunhagem no ferreiro e recrutamento no QG para esse modo. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [academia oficial](https://support.innogames.com/kb/TribalWars/en_DK/5309), [FAQ de pacotes](https://support.innogames.com/kb/TribalWars/en_DK/5970), [unidades UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_unit_info), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para custo nominal, cunhagem e soma de capacidades; baixa para preço final UK88 sem confirmar `snob.factor` na interface.

### 5.2 Redução de lealdade e condição de conquista

**O que é:** toda aldeia começa com lealdade 100. Cada **ataque vencedor** que inclua ao menos um nobre sobrevivente reduz a lealdade; ao chegar a **0 ou menos**, a propriedade muda.

**Fórmula publicada:** `L_depois=L_antes−R`, onde `R` é um sorteio usualmente inteiro entre **20 e 35** por ataque em muitos mundos. Não há fórmula determinística pública que derive `R` de força, distância ou pontos; a InnoGames o chama explicitamente de *randomized* **quando o intervalo não é degenerado**. Bônus como Noble Booster e habilidade **Persuasion** do paladino podem ampliar a redução. Exemplo completo: 100→72 (−28)→47 (−25)→14 (−33)→−7 (−21), então a quarta onda conquista e a nova lealdade passa a **25**. Sem regeneração, **cinco** ondas garantem conquista mesmo com redução mínima 20 (`5×20=100`); quatro podem não bastar (`4×20=80`), e três podem bastar no melhor caso (`3×35=105`). **Variações reais:** UK88 usa **20–35**; [UK Classic 1](https://ukc1.tribalwars.co.uk/page/settings) usa **25–25**, então a redução é fixa e quatro ondas dão exatamente 100; [EN Summer Special](https://enc5.tribalwars.net/en-dk/page/settings) usa **25–35**. Itens/habilidades podem alterar o resultado. **Edge cases:** se o nobre morrer, o ataque não reduz lealdade; ataque derrotado tampouco. Conquistar a própria aldeia também gasta o nobre e reinicia lealdade em 25, sem aumentar o número de aldeias. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [lealdade oficial](https://support.innogames.com/kb/TribalWars/en_DK/1204), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [UK Classic 1](https://ukc1.tribalwars.co.uk/page/settings), [EN Summer Special](https://enc5.tribalwars.net/en-dk/page/settings). **Nível de confiança:** alta para limites publicados; baixa para distribuição estatística quando há intervalo.

### 5.3 Regeneração de lealdade

**O que é:** uma aldeia atacada pode recuperar lealdade sem ação do dono, até 100. Isso obriga ondas de conquista a chegar em intervalo relativamente curto.

**Fórmula oficial típica:** `L(t)=min(100,L_0+s×Δt_horas)`; em velocidade 1, **+1 ponto/hora**, em velocidade 2, **+2/hora**, salvo override do mundo. No UK88, a página de configurações anuncia **1,5/hora**. Exemplo: após queda para 40, uma pausa de 8 horas no UK88 recupera 12, deixando 52; um nobre que reduza 25 leva a 27, não 15. A publicação não explica precisamente se a regeneração acumula frações internamente, em que instante arredonda, e se começa imediatamente ou no próximo ciclo do servidor. **Edge case:** lealdade abaixo de 100 bloqueia demolição voluntária pelo QG, segundo o suporte. **Fontes:** [lealdade oficial](https://support.innogames.com/kb/TribalWars/en_DK/1204), [UK88](https://uk88.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para taxa, média para discretização temporal.

### 5.4 Vários nobres, ondas e ordem

**O que é:** uma "onda" pode carregar vários nobres; uma "noble train" consiste em vários **comandos de ataque** sequenciais, usualmente após uma onda que elimina defesa e muralha.

**Regra crucial:** dois, três ou mais nobres no **mesmo comando** produzem **uma só redução aleatória de lealdade**, não uma por nobre. Três comandos separados, cada um com nobre sobrevivente, podem produzir três reduções. Exemplo: dois nobres em um ataque e redução sorteada 27 deixam 100→73; dois ataques com um nobre cada e sorteios 27 e 24 deixam 100→49, antes de regeneração. A ordem fina quando comandos têm mesmo milissegundo não está publicada; intervalos mínimos de comando são parâmetros do mundo (UK88: 50 ms). Se a primeira onda conquista, as seguintes passam a interagir com o **novo** dono e nova lealdade; ataques já enviados não são automaticamente convertidos em apoio. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [relatórios](https://support.innogames.com/kb/TribalWars/en_DK/1209). **Nível de confiança:** alta para não acumular no mesmo comando; baixa para empates/ondas em transição de dono.

### 5.5 Limites de nobres por aldeia, jogador e distância

**O que é:** o limite prático é econômico e configurável, não uma regra universal de "um nobre por aldeia". A academia/posição de moedas, espaço de fazenda e aldeias existentes controlam a capacidade.

**Regras:** o suporte diz que mais aldeias conquistadas exigem mais moedas para novo nobre; não publicou um teto fixo global nem por aldeia no modo de moedas. Vários nobres podem viajar no mesmo ataque. O mundo pode impor **distância máxima de viagem do nobre**: UK88 anuncia 50 campos e `snob.max_dist=50` no XML; EN154 anuncia **2.000** campos. Um alvo a 51 campos não aceita nobre no UK88, embora outras tropas possam viajar; uma diagonal de 30 por 40 tem distância geométrica 50 e fica na fronteira, sujeita ao arredondamento do servidor. Também há proteção de novos jogadores e mundos especiais que impedem conquista cedo. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [UK88](https://uk88.tribalwars.co.uk/page/settings), [EN154](https://en154.tribalwars.net/en-dk/page/settings), [configuração XML](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para limites publicados; média para ausência de limite universal explícito.

### 5.6 Estado da aldeia conquistada

**O que é:** conquista troca dono de uma aldeia existente; não funda outra coordenada. A aldeia preserva sua posição, estoques e edifícios que sobreviveram aos ataques, exceto regras especiais.

**Confirmado:** lealdade nova = 25; nobre conquistador desaparece; pontos dos edifícios transferem-se ao novo dono; igreja comum é destruída ao conquistar, e a primeira igreja não pode ser capturada/transferida como fonte de fé. Um exército **defensor** foi vencido ou reduzido antes da captura; logo não se deve supor que suas tropas se tornem tropas do conquistador. Apoios de terceiros, tropas em trânsito, filas de construção/recrutamento/pesquisa e mercadores em viagem exigem regras de transferência/cancelamento que não encontrei especificadas no suporte atual de TW1. Comunidades relatam desaparecimento de tropas do dono antigo, mas não fornecem tabela exaustiva de cada estado. Para um clone, esta é uma lacuna de teste de jogo obrigatória. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [igreja oficial](https://support.innogames.com/kb/TribalWars/en_DK/1202), [pontos](https://support.innogames.com/kb/TribalWars/en_DK/1264), [relato comunitário](https://www.reddit.com/r/tribalwars/comments/elg5k8). **Nível de confiança:** alta para dono/lealdade/nobre/igreja; baixa para filas, tropas externas e mercadores.

### 5.7 Proteção inicial contra ataques ou conquista

**O que é:** configurações de mundo protegem iniciantes por tempo, por diferença de pontos ou ambos. Não existe um número de dias universal para todas as versões.

**Regras:** o FAQ oficial descreve dois modos: proibição total de ataques de outros jogadores durante proteção, ou bloqueio de ataques de jogador muito maior, por exemplo razão 20:1. UK88 mostra **5 dias** de proteção inicial e **20:1** nos primeiros **60 dias** do mundo. Summer 2026 mostra **2 dias**; seus demais limiares devem ser lidos nas configurações próprias. Proteção impede a cadeia de conquista quando proíbe ataques, mas não se deve inferir uma segunda regra autônoma de "imunidade a nobre" sem evidência. **Exemplo:** atacante 40.000 pontos e iniciante 1.000 pontos excedem 20:1; sob regra ativa, o comando é bloqueado, ainda que a aldeia esteja no raio do nobre. **Fontes:** [FAQ oficial](https://support.innogames.com/kb/TribalWars/en_DK/5970), [UK88](https://uk88.tribalwars.co.uk/page/settings), [Summer 2026](https://ukc4.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para modos e parâmetros desses mundos; média para interação específica com ataque bárbaro/apoio.

### 5.8 Bônus de persuasão, itens e cetro de Vasco

**O que é:** algumas versões adicionam modificadores à redução de lealdade do nobre. Eles precisam ser tratados como recursos opcionais do mundo, porque o sistema de armas antigas já foi substituído em versões novas.

**Regras encontradas:** suporte atual menciona **Noble Booster** e habilidade **Persuasion** do paladino; não publica valor por nível nem ordem de aplicação. Historicamente, *Vasco's Scepter* elevava o **mínimo** de redução por ataque de 20 para 30, segundo fontes secundárias; não foi confirmado se o máximo continuava 35, se o cetro afetava todo exército com paladino, ou como coexistia com itens atuais. A FAQ de TW1 diz que as armas antigas não estão previstas para retornar, e as **relíquias** são sistema posterior. Exemplo condicional, não universal: se Vasco operar como "mínimo 30", quatro reduções mínimas de 30 derrubam 100; três deixam 10. **Fontes:** [lealdade](https://support.innogames.com/kb/TribalWars/en_DK/1204), [paladino](https://support.innogames.com/kb/TribalWars/en_DK/1192), [FAQ das armas](https://support.innogames.com/kb/TribalWars/en_DK/5988), [registro histórico do cetro](https://en.wikipedia.org/wiki/Tribal_Wars). **Nível de confiança:** alta para existência de bônus contemporâneos; baixa para efeito preciso de Vasco e empilhamento.

## 6. Mapa, movimento e tempo

### 6.1 Coordenadas, continentes e distância

**O que é:** aldeias ocupam posições inteiras `x|y` em mapa bidimensional. O mapa clássico divide-se em **100 continentes**, cada qual com **100×100** casas, designados K00–K99.

**Cálculo:** a distância operacional usada por calculadoras e pela tradição do jogo é euclidiana `d=sqrt((x_2−x_1)^2+(y_2−y_1)^2)` campos. De `500|500` a `503|504`, `d=sqrt(3²+4²)=5`. O suporte confirma movimento em **linha reta**, inclusive diagonal sobre lagos/montanhas, mas não imprime a expressão; um [script público de cálculo para TW1](https://greasyfork.org/es-419/scripts/514523-tribal-wars-battle-report-production-calculator/code) implementa exatamente `sqrt(dx²+dy²)`. O XML de UK88 informa `map_size=1000`, compatível com 10×10 continentes. O mundo real pode começar preenchendo só parte dessa grade e expandir conforme novos jogadores surgem. **Edge cases:** diagonais não são soma Manhattan; aldeias não existem em toda casa; arredondamento de `d` e fronteira de alcance do nobre exigem teste. **Fontes:** [mapa oficial](https://support.innogames.com/kb/TribalWars/en_DK/1208), [velocidade e linha reta oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1189), [script com fórmula](https://greasyfork.org/es-419/scripts/514523-tribal-wars-battle-report-production-calculator/code), [configuração UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para grade/linha reta; média-alta para fórmula; média para arredondamento.

### 6.2 Tempo de marcha, apoio, transporte e cancelamento

**O que é:** todos os comandos caminham pelo mapa em tempo real. Um grupo militar viaja na velocidade de sua unidade **mais lenta**; o tempo é proporcional à distância, ajustado por velocidade de unidade do mundo, paladino, bandeiras, relíquias e outros bônus aplicáveis.

**Fórmula de trabalho:** `T_min=d×max_i(m_i)/(s×u)×M`, onde `m_i` é o tempo-base em minutos/campo da unidade, `s` a velocidade do jogo, `u` a velocidade das unidades e `M` produto de modificadores específicos, se o mundo os definir assim. O XML de UK88 lista 24 min/campo para lanceiro, coerente com `18/(1,5×0,5)=24`; o nobre fica `35/0,75≈46,67 min/campo`. Um comando de 5 campos com lanceiros e nobre leva `5×46,67≈233,3 min`, 3h53m20s, antes de bônus. O retorno de tropas tem a **mesma velocidade** de ida segundo a InnoGames; mercadores usam velocidade própria e podem estar sujeitos a regras de distância, tribo e cancelamento. No UK88, cancelamento de ataque só até 10 min após envio e de comércio até 5 min. **Edge cases:** bônus de paladino em apoio e flags podem alterar velocidade só para certas tropas/comandos; uma unidade lenta adicional redefine todo grupo. Precisão de chegada em milissegundos não implica interface livre de atraso. **Fontes:** [velocidade oficial](https://support.innogames.com/kb/TribalWars/en_DK/1189), [unidades oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1185), [paladino](https://support.innogames.com/kb/TribalWars/en_DK/1192), [unidades UK88 XML](https://uk88.tribalwars.co.uk/interface.php?func=get_unit_info), [UK88](https://uk88.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para unidade mais lenta, retorno e exemplo UK88; média para combinação genérica de todos os modificadores.

### 6.3 Proteção, horários e ritmo do servidor

**O que é:** regras de tempo alteram quando comandos são permitidos e quão forte é uma defesa. Proteção inicial e razão de pontos foram detalhadas em 5.7; bônus noturno e simultaneidade em 4.5–4.6.

**Parâmetros importantes:** início do mundo, velocidade de jogo, velocidade de unidades, proteção inicial, ratio, janela noturna, pausa de ataques, tempo de cancelamento, intervalo mínimo entre comandos, alcance do nobre e condição de vitória. UK88 exemplifica 5 dias de proteção, 20:1 por 60 dias, noite 23–07, +100% defesa e 50 ms de espaçamento mínimo; Summer 2026 difere radicalmente. **Exemplo:** um ataque que chegaria em 10h na velocidade padrão chega em ~5h com velocidade efetiva 2, salvo efeitos adicionais. **Edge case:** relógio relevante é o do servidor, com fuso e possível horário de verão; um clone deve escolher explicitamente relógio simulado. **Fontes:** [UK88](https://uk88.tribalwars.co.uk/page/settings), [Summer 2026](https://ukc4.tribalwars.co.uk/page/settings), [FAQ oficial](https://support.innogames.com/kb/TribalWars/en_DK/5970). **Nível de confiança:** alta para parâmetros anunciados; baixa para limites precisos de cada fronteira temporal.

### 6.4 Expansão: conquista versus fundação

**O que é:** no Tribal Wars clássico, o jogador começa com uma aldeia atribuída pelo servidor; expansão territorial ocorre **conquistando** uma aldeia existente com nobre, seja de outro jogador ou bárbara. Não há o fluxo clássico de enviar colonos para **fundar** uma aldeia nova vazia, típico de outros jogos de estratégia.

**Regras:** preparar academia e nobre, reduzir lealdade até 0 ou menos, transferir a aldeia. O servidor pode criar novas aldeias quando jogadores ingressam ou renascem; isso é geração sistêmica, não uma ordem estratégica de fundação dada por aldeia-mãe. A possibilidade de reiniciar após perder a última aldeia e a posição de novo começo dependem do mundo. **Exemplo:** um jogador com `500|500` não paga custo para criar `501|500`; precisa conquistar uma aldeia já presente naquela coordenada ou esperar criação sistêmica. **Fontes:** [nobre oficial](https://support.innogames.com/kb/TribalWars/en_DK/1179), [início/reinício](https://support.innogames.com/kb/TribalWars/en_DK/1205), [bárbaras](https://support.innogames.com/kb/TribalWars/en_DK/1197). **Nível de confiança:** alta para o modo clássico; mundos de evento especiais podem diferir.

### 6.5 Aldeias bárbaras e crescimento

**O que é:** aldeias sem dono que oferecem alvos de saque e conquista. Algumas são geradas novas; outras eram de jogadores excluídos e podem conservar estruturas ou até tropas especiais.

**Regras:** moral contra aldeia bárbara = **100%**; não recebem bônus noturno; podem crescer até um limite se o mundo habilitar crescimento. O XML UK88 contém `barbarian_rise=0,003` e `barbarian_max_points=500`; Summer 2026 anuncia crescimento até **3.000 pontos**. O significado operacional exato de `0,003` — probabilidade por tick, por hora ou outra escala — não é explicado no XML. Não assuma que toda bárbara não tem defesa: antigas aldeias de contas punidas podem ganhar tropas, e eventos podem instalar defesas. **Exemplo:** um ataque noturno a uma bárbara com muralha 10 enfrenta muralha/tropas que houver, mas **não** o multiplicador noturno normal. **Fontes:** [bárbaras oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1197), [UK88 XML](https://uk88.tribalwars.co.uk/interface.php?func=get_config), [Summer](https://ukc4.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para exceções e limites anunciados; baixa para algoritmo de crescimento.

### 6.6 Premium, automação e itens pagos

**O que é:** camadas de conforto e monetização que não são parte obrigatória do loop de construir, recrutar, atacar e conquistar. Porém algumas opções **alteram números**, portanto um estudo do balanceamento precisa registrá-las.

**Conta Premium:** mapas maiores/mapa político, marcadores, grupos e visões detalhadas, listas de fazenda, filas e comandos mais convenientes, arquivo de relatórios e comunicação ampliada, segundo páginas oficiais. **Account Manager:** modelos e automação de construção, tropas e transporte em muitas aldeias. **Itens/Bônus:** itens de aldeia podem aumentar produção, capacidade de armazém/fazenda, recrutamento e velocidade; bônus de produção de **+20%** existe no catálogo; bandeiras e relíquias também mudam estatísticas. Detalhes de preço em moeda real, duração e disponibilidade variam e não definem as regras básicas do combate. **Exemplo:** produtor 2.400/h recebe 2.880/h com +20%, antes da velocidade mundial; numa aldeia de velocidade 1,5, a combinação linear daria 4.320/h se ambos multiplicadores se aplicarem. **Fontes:** [Premium](https://support.innogames.com/kb/TribalWars/en_DK/1296), [Account Manager](https://support.innogames.com/kb/TribalWars/en_DK/1297), [itens de aldeia](https://support.innogames.com/kb/TribalWars/en_DK/5369), [bandeiras](https://support.innogames.com/kb/TribalWars/en_DK/2996). **Nível de confiança:** alta para tipos de vantagem; média para catálogo e empilhamento, mutáveis por mundo.

## 7. Tribos e diplomacia

### 7.1 Formação, limite, cargos e permissões

**O que é:** tribo agrupa jogadores, coordena apoio, mensagens e objetivos de vitória. Seu tamanho máximo é escolha de mundo; UK88 permite **14** membros, e não existe teto universal.

**Hierarquia publicada:** duque/fundador tem poderes totais (inclusive dissolução); barão edita títulos/permissões e expulsa; permissões específicas cobrem convite, diplomacia, circular para tribo, moderação de fórum, fóruns ocultos e fóruns de membros confiáveis. Um jogador pode ter múltiplas permissões. O limite pode afetar recrutamento e fusão de grupos; o mundo pode impedir ataque a membros da própria tribo e limitar apoio/comércio fora dela (UK88 configura tais restrições). **Exemplo:** tribo de 14/14 no UK88 precisa liberar uma vaga antes de convidar o 15º membro. **Fontes:** [permissões oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1207), [UK88](https://uk88.tribalwars.co.uk/page/settings), [XML UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_config). **Nível de confiança:** alta para papéis e teto UK88; média para dependências exatas entre restrições de ataque/apoio/comércio.

### 7.2 Alianças, NAP, guerra e tratados

**O que é:** a permissão de diplomacia permite classificar outras tribos como **aliadas**, sob **pacto de não agressão (NAP)** ou **inimigas**. Essa relação aparece no perfil/mapa e comunica intenção política.

**Regra documentada:** o suporte diz que diplomatas podem editar listas de Ally, NAP e Enemy, mas **não afirma** que NAP proíba tecnicamente uma ordem de ataque. Portanto, não modelar um NAP como inviolável sem configuração explícita: pode ser acordo social sujeito a traição. Já bloqueio de ataque a membros da **mesma tribo** é parâmetro do mundo UK88; isso é restrição mecânica separada de diplomacia externa. Guerra não tem necessariamente declaração formal obrigatória, e as condições de vitória variam por mundo. **Exemplo:** duas tribos podem constar como NAP, mas a UI de bot deveria tratar um ataque violador como quebra de confiança, salvo se o ruleset escolhido bloquear o comando. **Fontes:** [diplomacia oficial](https://support.innogames.com/kb/TribalWars/en_DK/1207), [UK88](https://uk88.tribalwars.co.uk/page/settings), [vitória](https://support.innogames.com/kb/TribalWars/en_DK/3104). **Nível de confiança:** alta para categorias; baixa para efeitos sistêmicos universais de tratados.

### 7.3 Tradução para facções e bots

**O que é:** na adaptação single-player, tribos viram facções de agentes que dividem informação, ajudam aliados e competem por aldeias. O jogador mantém a possibilidade de diplomacia, espionagem e guerra em uma rede que muda ao longo do tempo.

**Modelo sugerido, não regra original:** cada bot tem objetivos (crescimento, segurança, conquista), relação com facções, limite de membros, orçamento militar e janela de reação. Tribos trocam pedidos de apoio e alvos; um NAP reduz propensão a atacar mas pode ser rompido; alianças podem coordenar ataques de limpeza e nobres; rivalidade cria pressão estratégica. Exemplo: facção com 4 aldeias, 2 vizinhas ameaçadas e 1 exército ofensivo decide enviar defesa à aldeia de maior valor enquanto prepara contra-ataque; sem coordenação, bots independentes fariam decisões implausíveis. A regra quantitativa dessa IA será nova, pois o jogo original não define "função de decisão de bot" para jogadores. **Fontes de mecânicas a preservar:** [tribos e permissões](https://support.innogames.com/kb/TribalWars/en_DK/1207), [condições de vitória](https://support.innogames.com/kb/TribalWars/en_DK/3104), [configuração UK88](https://uk88.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para a necessidade de adaptação; não aplicável para números originais inexistentes.

## 8. Sistemas secundários e progressão

### 8.1 Conquistas, recompensas, bandeiras e missões

**O que é:** conquistas/medalhas reconhecem crescimento, combate, comércio, diplomacia, sorte e vitórias, com disponibilidade dependente de mundo. Missões orientam o começo e podem devolver recursos; bandeiras são bônus colecionáveis se ativadas.

**Regras de medalhas:** molduras madeira/bronze/prata/ouro valem respectivamente **1/2/3/4** pontos no placar de conquistas. Conquistas diárias já são ouro (4); as sem níveis têm moldura de madeira (1). Conta apagada perde suas conquistas; visibilidade pública pode ser configurada. Milestones de mundo e prêmios de vitória são categorias adicionais; Winning Tribe é dado a todos os membros da tribo vencedora, enquanto vários títulos de topo vão só aos líderes estatísticos. **Missões:** a fonte oficial diz que certas missões reembolsam recursos de edifícios; se mais de 5 edifícios forem colocados na fila, custo adicional não aumenta a recompensa além do teto inicial. **Bandeiras:** bônus de ataque/defesa, produção, recrutamento, carga, sorte e outros; faixas exatas dependem da bandeira/raridade, e a seção 4.5 registra um exemplo verificável de sorte. **Fontes:** [conquistas](https://support.innogames.com/kb/TribalWars/en_DK/1285), [milestones](https://support.innogames.com/kb/TribalWars/en_DK/3107), [vitória](https://support.innogames.com/kb/TribalWars/en_DK/3104), [missões](https://support.innogames.com/kb/TribalWars/en_DK/3056), [bandeiras](https://support.innogames.com/kb/TribalWars/en_DK/2996). **Nível de confiança:** alta para molduras e categorias; média para catálogo que muda por mundo.

**Adversários derrotados (OD):** é um placar separado dos pontos de edifícios. ODA conta baixas inimigas causadas atacando, ODD defendendo e ODS como apoiador (fração do ODD conforme composição do apoio). Cada morte rende pontos diferentes por unidade e lado:

| Unidade derrotada | ODA | ODD | Unidade derrotada | ODA | ODD |
|---|---:|---:|---|---:|---:|
| Lanceiro | 4 | 1 | Espadachim | 5 | 2 |
| Machado | 1 | 4 | Arqueiro | 5 | 2 |
| Batedor | 1 | 2 | Cavalaria leve | 5 | 13 |
| Arqueiro a cavalo | 6 | 12 | Cavalaria pesada | 23 | 15 |
| Aríete | 4 | 8 | Catapulta | 12 | 10 |
| Paladino | 40 | 20 | Nobre | 200 | 200 |
| Milícia | 4 | — |  |  |  |

Exemplo: derrotar 100 cavalarias leves como defensor acrescenta `100×13=1.300` ODD, antes de repartição por apoiadores. A pontuação pode atrasar horas/dias para evitar inferir perdas a partir de relatórios incompletos. [Cálculo oficial de OD](https://support.innogames.com/kb/TribalWars/en_DK/4436). **Confiança:** alta para pesos; média para rateio preciso de ODS, não publicado.

### 8.2 Coleta (*scavenging*)

**O que é:** tropas disponíveis podem ser enviadas para obter recursos sem atacar aldeia alheia. É uma economia paralela importante em mundos que a ativam; Summer 2026 a desativa.

**Regras oficiais:** há **quatro** opções de coleta, liberadas por custo/progresso; unidades ficam indisponíveis durante a expedição, não podem ser chamadas de volta, e recursos recebidos além do armazém são perdidos. Recompensa e duração crescem com a capacidade de carga do grupo e com o nível da opção. Uma implementação comunitária de script usa multiplicadores de rendimento **0,10/0,25/0,50/0,75** e tempo em segundos `T≈[(C×f×10)^0,9+1800]×0,6830201284`, com `C` = carga bruta e `f` = multiplicador; essa é **reconstrução de um ruleset**, não contrato universal do servidor. Exemplo com `C=1.000` e primeira opção `f=0,10`: rendimento candidato 100 recursos e `T≈[(1.000)^0,9+1800]×0,683≈1.572 s` (~26min); a distribuição W/C/I deve ser verificada. **Fontes:** [coleta oficial](https://support.innogames.com/kb/TribalWars/en_DK/3002), [script comunitário](https://gist.github.com/guipenedo/6791ef6f57ff6e8971fde86e90d0a1ec), [Summer 2026](https://ukc4.tribalwars.co.uk/page/settings). **Nível de confiança:** alta para comportamento geral; baixa para equação histórica e distribuição dos recursos.

### 8.3 Eventos, fortalezas, runas, relíquias e vitória

**O que é:** eventos de servidor podem acrescentar objetivos ou modificadores além do núcleo clássico. Não há um único catálogo válido para todos os mundos.

**Mecânicas identificadas:** FAQ oficial descreve **fortalezas** como objetivos de tribo abastecidos/defendidos por membros e potencialmente ligados a vitória; **aldeias de runas** concedem poderes ou contam para vitória; **habilidades de tribo** usam pontos/prestígio para bônus coletivos de construção, defesa e outros. Fortalezas têm seu [próprio sistema de construção e batalha](https://support.innogames.com/kb/TribalWars/en_DK/3005), não usam tabela de prédio individual do Apêndice A. Eventos de temporada podem alterar produção, saque, recrutamento ou condição de vitória. UK88 anuncia que, após 90 dias, uma tribo precisa controlar **65%** das aldeias de jogadores por **5 dias** para vencer; EN143 exige runas em continentes povoados, e EN155 permite vitória sem bônus noturno. Exemplo: se houver 1.000 aldeias de jogadores elegíveis, a condição 65% exige 650 mantidas pelo período; bárbaras não entram se a configuração fala em *player villages*.

**Relíquias:** há **dois sistemas oficiais** em documentação atual, não uma tabela intercambiável. A [versão anterior](https://support.innogames.com/kb/TribalWars/en_DK/4910) lista qualidade Shoddy/Basic/Enhanced/Superior/Renowned, bônus principal +2/+4/+6/+8/+10%, raio 1/1/2/2/3 e teto conjunto de **10%** por atributo. A [versão de mundos de junho de 2026 em diante](https://support.innogames.com/kb/TribalWars/en_DK/6055) lista Shoddy/Sturdy/Enhanced/Superior/Renowned, bônus principal +5/+6/+7/+8/+10%, duas estatísticas secundárias +1/+2/+3/+4/+5%, raio 2/2/3/3/4 e teto conjunto de **20%** por atributo. As secundárias não se repetem na mesma relíquia; cada sorteio de secundária tem **1%** de chance de ser *Perfect* e dobrar seu valor. Até **10 aldeias** podem equipar relíquias, há bloqueio de troca por **24 h**, e lealdade <100 impede remoção. Exemplo: duas relíquias renomadas de +10% na mesma estatística chegam ao teto 20% na versão nova; uma terceira não eleva para 30%. Relíquias afetam aldeia equipada e aldeias próprias no raio, podem ser adquiridas por escolha inicial, conquista e ações do mundo. Tipos principais incluem bônus a tropas, dano estrutural de aríetes/catapultas, velocidade e custo de recrutamento, produção e outros. A versão selecionada depende do mundo, não da data da consulta. **Fontes:** [FAQ de recursos especiais](https://support.innogames.com/kb/TribalWars/en_DK/5970), [fortalezas](https://support.innogames.com/kb/TribalWars/en_DK/3005), [relíquias antigas](https://support.innogames.com/kb/TribalWars/en_DK/4910), [relíquias novas](https://support.innogames.com/kb/TribalWars/en_DK/6055), [habilidades de tribo](https://support.innogames.com/kb/TribalWars/en_DK/3008), [UK88](https://uk88.tribalwars.co.uk/page/settings), [EN143](https://en143.tribalwars.net/en-dk/page/settings). **Nível de confiança:** alta para tabelas das duas gerações e vitória anunciada; baixa para fórmula de eventos não especificados.

### 8.4 Curva de progressão e marcos temporais

**O que é:** a progressão passa de produção/proteção inicial para saque, exército e academia, depois para cadeia de nobres e domínio territorial. O ritmo é altamente sensível à velocidade, data de entrada, atividade, premium, coleta, densidade de bárbaras e cooperação de tribo.

**O que se pode medir:** a fonte oficial recomenda começar por produtores, armazém/fazenda, quartel, pequena defesa e muralha; a academia exige QG20, ferreiro20, mercado10 e recursos de nobre/moedas, portanto o **primeiro nobre é um marco econômico observável**, não um dia universal. Em UK88, proteção dura dias 0–5 e a razão 20:1 restringe parte dos ataques nos primeiros 60 dias do **mundo**; a condição de vitória só se abre após dia 90 e exige mais 5 dias. Essa cronologia é do ruleset, **não** demonstra quando um jogador típico alcança 500, 3.000 ou 10.000 pontos.

| Fase de design | Indicador mecânico confiável | Dia aproximado que é publicamente verificável |
|---|---|---|
| Início | Uma aldeia, proteção, produtores, primeiras tropas | UK88: dias 0–5 de proteção individual |
| Transição | Saque/coleta recorrentes, QG/ferreiro/mercado rumo à academia | Sem mediana pública por jogador |
| Expansão | Primeira academia, nobre e segunda aldeia | Sem mediana pública por jogador |
| Guerra territorial | Várias aldeias, apoios, trens de nobres, diplomacia | UK88: defesa por ratio pode atuar até dia 60 do mundo |
| Fim de mundo | Condição de domínio da tribo | UK88: elegível após dia 90; manutenção por 5 dias |

**Fórmula de estimativa para um estudo futuro:** escolher coorte de contas ativas e calcular `mediana{dia em que pontos≥X}` ou `mediana{dia da 2ª aldeia}` a partir de snapshots diários; separar por mundo, velocidade, data de adesão e premium. Sem esses dados, qualquer tabela "dia 7 = 1.000 pontos" seria invenção. O arquivo oficial fornece rankings **finais**, úteis para validar condições de encerramento, mas não substitui uma série temporal individual. **Fontes:** [ordem inicial oficial](https://support.innogames.com/kb/TribalWars/en_DK/5970), [academia](https://support.innogames.com/kb/TribalWars/en_DK/5309), [UK88](https://uk88.tribalwars.co.uk/page/settings), [exemplo de arquivo oficial EN153](https://www.tribalwars.net/en-dk/archive/en153). **Nível de confiança:** alta para marcos de configuração; baixa para cronologia de jogador típico, ainda não medida.

### 8.5 Aldeias bônus, bandeiras e regras competitivas opcionais

**Aldeias bônus.** São aldeias inicialmente sem dono que concedem vantagens permanentes ao controlador, como mais população, produção, velocidade de produção ou armazém. A taxa de aparecimento é configuração de mundo: UK88 anuncia **25% de chance por entrada de jogador**, UK89 **35%**, Summer 2026 **0%**; isso não significa 25% de todas as aldeias existentes. As magnitudes de cada tipo não constam da página-resumo e precisam da especificação do mundo. [Abreviações oficiais](https://support.innogames.com/kb/TribalWars/en_DK/1295), [UK88](https://uk88.tribalwars.co.uk/page/settings), [UK89](https://uk89.tribalwars.co.uk/page/settings), [Summer](https://ukc4.tribalwars.co.uk/page/settings). **Confiança:** alta para tipos/taxas anunciadas; baixa para distribuição interna de tipos.

**Bandeiras.** Uma bandeira pode ser associada a uma aldeia, com efeito até remoção/substituição; há trava de **24 h** antes de movê-la novamente. **Três** bandeiras do mesmo tipo/nível podem ser combinadas para subir um nível, até **9**. Bandeiras podem ser trocadas com membros da mesma tribo sob regras oficiais, e uma bandeira retorna ao jogador se sua aldeia for perdida. Seu catálogo inclui produção, recrutamento, carga, ataque, defesa e sorte. UK88 as ativa, Summer 2026 as desativa. [Bandeiras oficiais](https://support.innogames.com/kb/TribalWars/en_DK/2996), [UK88](https://uk88.tribalwars.co.uk/page/settings), [Summer](https://ukc4.tribalwars.co.uk/page/settings). **Confiança:** alta para ciclo e disponibilidade; média para tabela de valores por raridade não transcrita.

**Restrições competitivas.** Mundos podem travar entrada/saída de tribos ao atingir idade ou domínio: UK Classic 1 trava aos **30 dias**, EN Summer Special ao atingir **30%** de domínio. A possibilidade de ataque dentro da tribo também muda: UK88 converte esses ataques em visitas sem dano, UK89 permite dano. Limites de ataques falsos variam conforme 4.6. Essas escolhas mudam estratégia sem alterar atributos básicos de tropas. [UK Classic](https://ukc1.tribalwars.co.uk/page/settings), [EN Summer Special](https://enc5.tribalwars.net/en-dk/page/settings), [UK88](https://uk88.tribalwars.co.uk/page/settings), [UK89](https://uk89.tribalwars.co.uk/page/settings). **Confiança:** alta para regras anunciadas; média para detalhes de transição no instante do bloqueio.

## Apêndice A — custos completos de construção por nível

Cada linha é **o custo daquele nível**, não o acumulado. W/C/I = madeira/argila/ferro; Δpop = espaço adicional da fazenda; pop total = espaço ocupado pelo edifício após o nível. A coluna `t20*` é uma **estimativa** de tempo `h:mm:ss` para QG 20 no mundo UK88 (velocidade 1,5), **exceto a Torre de Vigia, cujo tempo usa UK89 (velocidade 1,2), pois ela está desativada no UK88**. A fórmula é comunitária, não um cronômetro autoritativo do motor. Nível 1 para edifícios iniciais é estado já existente da aldeia, mas o custo teórico é mostrado. Fontes das linhas: XML público do [UK88](https://uk88.tribalwars.co.uk/interface.php?func=get_building_info), da [Torre de Vigia UK89](https://uk89.tribalwars.co.uk/interface.php?func=get_building_info) e páginas individuais oficiais da InnoGames; tempos: [fórmula comunitária](https://gist.github.com/amiuhle/61b0334997805ada0e99).

### Quartel-general

Fonte: [Quartel-general — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5288).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 90 | 80 | 70 | 5 | 5 | 0:00:25 |
| 2 | 113 | 102 | 88 | 1 | 6 | 0:00:25 |
| 3 | 143 | 130 | 111 | 1 | 7 | 0:01:47 |
| 4 | 180 | 166 | 140 | 1 | 8 | 0:03:17 |
| 5 | 227 | 211 | 176 | 1 | 9 | 0:04:52 |
| 6 | 286 | 270 | 222 | 2 | 11 | 0:06:39 |
| 7 | 360 | 344 | 280 | 2 | 13 | 0:08:41 |
| 8 | 454 | 438 | 353 | 2 | 15 | 0:11:04 |
| 9 | 572 | 559 | 445 | 3 | 18 | 0:13:54 |
| 10 | 720 | 712 | 560 | 3 | 21 | 0:17:17 |
| 11 | 908 | 908 | 706 | 3 | 24 | 0:21:20 |
| 12 | 1144 | 1158 | 890 | 4 | 28 | 0:26:12 |
| 13 | 1441 | 1476 | 1121 | 5 | 33 | 0:32:03 |
| 14 | 1816 | 1882 | 1412 | 5 | 38 | 0:39:06 |
| 15 | 2288 | 2400 | 1779 | 7 | 45 | 0:47:35 |
| 16 | 2883 | 3060 | 2242 | 8 | 53 | 0:57:48 |
| 17 | 3632 | 3902 | 2825 | 9 | 62 | 1:10:06 |
| 18 | 4577 | 4975 | 3560 | 10 | 72 | 1:24:55 |
| 19 | 5767 | 6343 | 4485 | 12 | 84 | 1:42:45 |
| 20 | 7266 | 8087 | 5651 | 15 | 99 | 2:04:13 |
| 21 | 9155 | 10311 | 7120 | 17 | 116 | 2:30:04 |
| 22 | 11535 | 13146 | 8972 | 19 | 135 | 3:01:11 |
| 23 | 14534 | 16762 | 11304 | 23 | 158 | 3:38:37 |
| 24 | 18313 | 21371 | 14244 | 27 | 185 | 4:23:40 |
| 25 | 23075 | 27248 | 17947 | 31 | 216 | 5:17:53 |
| 26 | 29074 | 34741 | 22613 | 37 | 253 | 6:23:05 |
| 27 | 36633 | 44295 | 28493 | 43 | 296 | 7:41:30 |
| 28 | 46158 | 56476 | 35901 | 51 | 347 | 9:15:49 |
| 29 | 58159 | 72007 | 45235 | 59 | 406 | 11:09:14 |
| 30 | 73280 | 91809 | 56996 | 69 | 475 | 13:25:37 |

### Quartel

Fonte: [Quartel — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5291).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 200 | 170 | 90 | 7 | 7 | 0:00:50 |
| 2 | 252 | 218 | 113 | 1 | 8 | 0:00:50 |
| 3 | 318 | 279 | 143 | 2 | 10 | 0:03:34 |
| 4 | 400 | 357 | 180 | 1 | 11 | 0:06:34 |
| 5 | 504 | 456 | 227 | 2 | 13 | 0:09:45 |
| 6 | 635 | 584 | 286 | 2 | 15 | 0:13:17 |
| 7 | 800 | 748 | 360 | 3 | 18 | 0:17:21 |
| 8 | 1008 | 957 | 454 | 3 | 21 | 0:22:08 |
| 9 | 1271 | 1225 | 572 | 4 | 25 | 0:27:48 |
| 10 | 1601 | 1568 | 720 | 4 | 29 | 0:34:34 |
| 11 | 2017 | 2007 | 908 | 5 | 34 | 0:42:40 |
| 12 | 2542 | 2569 | 1144 | 5 | 39 | 0:52:24 |
| 13 | 3202 | 3288 | 1441 | 7 | 46 | 1:04:07 |
| 14 | 4035 | 4209 | 1816 | 8 | 54 | 1:18:12 |
| 15 | 5084 | 5388 | 2288 | 9 | 63 | 1:35:10 |
| 16 | 6406 | 6896 | 2883 | 11 | 74 | 1:55:36 |
| 17 | 8072 | 8827 | 3632 | 12 | 86 | 2:20:12 |
| 18 | 10170 | 11298 | 4577 | 15 | 101 | 2:49:49 |
| 19 | 12814 | 14462 | 5767 | 17 | 118 | 3:25:30 |
| 20 | 16146 | 18511 | 7266 | 20 | 138 | 4:08:27 |
| 21 | 20344 | 23695 | 9155 | 24 | 162 | 5:00:08 |
| 22 | 25634 | 30329 | 11535 | 27 | 189 | 6:02:22 |
| 23 | 32298 | 38821 | 14534 | 32 | 221 | 7:17:15 |
| 24 | 40696 | 49691 | 18313 | 38 | 259 | 8:47:21 |
| 25 | 51277 | 63605 | 23075 | 44 | 303 | 10:35:45 |

### Estábulo

Fonte: [Estábulo — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5294).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 270 | 240 | 260 | 8 | 8 | 0:02:46 |
| 2 | 340 | 307 | 328 | 1 | 9 | 0:02:46 |
| 3 | 429 | 393 | 413 | 2 | 11 | 0:11:55 |
| 4 | 540 | 503 | 520 | 2 | 13 | 0:21:53 |
| 5 | 681 | 644 | 655 | 2 | 15 | 0:32:29 |
| 6 | 857 | 825 | 826 | 3 | 18 | 0:44:17 |
| 7 | 1080 | 1056 | 1040 | 3 | 21 | 0:57:51 |
| 8 | 1361 | 1351 | 1311 | 3 | 24 | 1:13:47 |
| 9 | 1715 | 1729 | 1652 | 4 | 28 | 1:32:40 |
| 10 | 2161 | 2214 | 2081 | 5 | 33 | 1:55:12 |
| 11 | 2723 | 2833 | 2622 | 5 | 38 | 2:22:13 |
| 12 | 3431 | 3627 | 3304 | 7 | 45 | 2:54:40 |
| 13 | 4323 | 4642 | 4163 | 8 | 53 | 3:33:42 |
| 14 | 5447 | 5942 | 5246 | 9 | 62 | 4:20:40 |
| 15 | 6864 | 7606 | 6609 | 10 | 72 | 5:17:13 |
| 16 | 8648 | 9736 | 8328 | 12 | 84 | 6:25:19 |
| 17 | 10897 | 12462 | 10493 | 15 | 99 | 7:47:20 |
| 18 | 13730 | 15951 | 13221 | 16 | 115 | 9:26:05 |
| 19 | 17300 | 20417 | 16659 | 20 | 135 | 11:24:59 |
| 20 | 21797 | 26134 | 20990 | 23 | 158 | 13:48:08 |

### Oficina

Fonte: [Oficina — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5297).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 300 | 240 | 260 | 8 | 8 | 0:02:46 |
| 2 | 378 | 307 | 328 | 1 | 9 | 0:02:46 |
| 3 | 476 | 393 | 413 | 2 | 11 | 0:11:55 |
| 4 | 600 | 503 | 520 | 2 | 13 | 0:21:53 |
| 5 | 756 | 644 | 655 | 2 | 15 | 0:32:29 |
| 6 | 953 | 825 | 826 | 3 | 18 | 0:44:17 |
| 7 | 1200 | 1056 | 1040 | 3 | 21 | 0:57:51 |
| 8 | 1513 | 1351 | 1311 | 3 | 24 | 1:13:47 |
| 9 | 1906 | 1729 | 1652 | 4 | 28 | 1:32:40 |
| 10 | 2401 | 2214 | 2081 | 5 | 33 | 1:55:12 |
| 11 | 3026 | 2833 | 2622 | 5 | 38 | 2:22:13 |
| 12 | 3812 | 3627 | 3304 | 7 | 45 | 2:54:40 |
| 13 | 4804 | 4642 | 4163 | 8 | 53 | 3:33:42 |
| 14 | 6053 | 5942 | 5246 | 9 | 62 | 4:20:40 |
| 15 | 7626 | 7606 | 6609 | 10 | 72 | 5:17:13 |

### Igreja

Fonte: [Igreja — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5300).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 16000 | 20000 | 5000 | 5000 | 5000 | 1:25:26 |
| 2 | 20160 | 25600 | 6300 | 2750 | 7750 | 1:25:26 |
| 3 | 25402 | 32768 | 7938 | 4263 | 12013 | 6:07:21 |

### Primeira igreja

Fonte: [Primeira igreja — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5303).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 160 | 200 | 50 | 5 | 5 | 0:03:46 |

### Torre de vigia

Fonte: [Torre de vigia — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5306).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 12000 | 14000 | 10000 | 500 | 500 | 0:07:37 |
| 2 | 14040 | 16380 | 11800 | 90 | 590 | 0:07:37 |
| 3 | 16427 | 19165 | 13924 | 106 | 696 | 0:32:46 |
| 4 | 19219 | 22423 | 16430 | 126 | 822 | 1:00:10 |
| 5 | 22487 | 26234 | 19388 | 147 | 969 | 1:29:19 |
| 6 | 26309 | 30694 | 22878 | 175 | 1144 | 2:01:46 |
| 7 | 30782 | 35912 | 26996 | 206 | 1350 | 2:39:06 |
| 8 | 36015 | 42017 | 31855 | 243 | 1593 | 3:22:53 |
| 9 | 42137 | 49160 | 37589 | 286 | 1879 | 4:14:49 |
| 10 | 49301 | 57518 | 44355 | 339 | 2218 | 5:16:49 |
| 11 | 57682 | 67296 | 52338 | 399 | 2617 | 6:31:06 |
| 12 | 67488 | 78736 | 61759 | 471 | 3088 | 8:00:21 |
| 13 | 78961 | 92121 | 72876 | 556 | 3644 | 9:47:40 |
| 14 | 92384 | 107782 | 85994 | 656 | 4300 | 11:56:50 |
| 15 | 108089 | 126104 | 101472 | 774 | 5074 | 14:32:21 |
| 16 | 126465 | 147542 | 119737 | 913 | 5987 | 17:39:38 |
| 17 | 147964 | 172624 | 141290 | 1078 | 7065 | 21:25:09 |
| 18 | 173117 | 201970 | 166722 | 1271 | 8336 | 25:56:43 |
| 19 | 202547 | 236305 | 196733 | 1501 | 9837 | 31:23:43 |
| 20 | 236981 | 276477 | 232144 | 1770 | 11607 | 37:57:23 |

### Academia

Fonte: [Academia — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5309).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 15000 | 25000 | 10000 | 80 | 80 | 4:31:01 |
| 2 | 30000 | 50000 | 20000 | 14 | 94 | 4:31:01 |
| 3 | 60000 | 100000 | 40000 | 16 | 110 | 19:25:18 |

### Ferreiro

Fonte: [Ferreiro — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5312).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 220 | 180 | 240 | 20 | 20 | 0:02:46 |
| 2 | 277 | 229 | 302 | 3 | 23 | 0:02:46 |
| 3 | 349 | 293 | 381 | 4 | 27 | 0:11:55 |
| 4 | 440 | 373 | 480 | 5 | 32 | 0:21:53 |
| 5 | 555 | 476 | 605 | 5 | 37 | 0:32:29 |
| 6 | 699 | 606 | 762 | 7 | 44 | 0:44:17 |
| 7 | 880 | 773 | 960 | 7 | 51 | 0:57:51 |
| 8 | 1109 | 986 | 1210 | 9 | 60 | 1:13:47 |
| 9 | 1398 | 1257 | 1525 | 10 | 70 | 1:32:40 |
| 10 | 1761 | 1603 | 1921 | 12 | 82 | 1:55:12 |
| 11 | 2219 | 2043 | 2421 | 14 | 96 | 2:22:13 |
| 12 | 2796 | 2605 | 3050 | 16 | 112 | 2:54:40 |
| 13 | 3523 | 3322 | 3843 | 20 | 132 | 3:33:42 |
| 14 | 4439 | 4236 | 4842 | 22 | 154 | 4:20:40 |
| 15 | 5593 | 5400 | 6101 | 26 | 180 | 5:17:13 |
| 16 | 7047 | 6885 | 7687 | 31 | 211 | 6:25:19 |
| 17 | 8879 | 8779 | 9686 | 36 | 247 | 7:47:20 |
| 18 | 11187 | 11193 | 12204 | 42 | 289 | 9:26:05 |
| 19 | 14096 | 14271 | 15377 | 49 | 338 | 11:24:59 |
| 20 | 17761 | 18196 | 19375 | 57 | 395 | 13:48:08 |

### Ponto de encontro

Fonte: [Ponto de encontro — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5315).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10 | 40 | 30 | 0 | 0 | 0:05:01 |

### Estátua

Fonte: [Estátua — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5318).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 220 | 220 | 220 | 10 | 10 | 0:00:42 |

### Mercado

Fonte: [Mercado — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5321).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 100 | 100 | 20 | 20 | 0:01:15 |
| 2 | 126 | 127 | 126 | 3 | 23 | 0:01:15 |
| 3 | 159 | 163 | 159 | 4 | 27 | 0:05:22 |
| 4 | 200 | 207 | 200 | 5 | 32 | 0:09:51 |
| 5 | 252 | 264 | 252 | 5 | 37 | 0:14:37 |
| 6 | 318 | 337 | 318 | 7 | 44 | 0:19:56 |
| 7 | 400 | 430 | 400 | 7 | 51 | 0:26:02 |
| 8 | 504 | 548 | 504 | 9 | 60 | 0:33:12 |
| 9 | 635 | 698 | 635 | 10 | 70 | 0:41:42 |
| 10 | 800 | 890 | 800 | 12 | 82 | 0:51:50 |
| 11 | 1009 | 1135 | 1009 | 14 | 96 | 1:04:00 |
| 12 | 1271 | 1447 | 1271 | 16 | 112 | 1:18:36 |
| 13 | 1601 | 1846 | 1601 | 20 | 132 | 1:36:10 |
| 14 | 2018 | 2353 | 2018 | 22 | 154 | 1:57:18 |
| 15 | 2542 | 3000 | 2542 | 26 | 180 | 2:22:45 |
| 16 | 3203 | 3825 | 3203 | 31 | 211 | 2:53:24 |
| 17 | 4036 | 4877 | 4036 | 36 | 247 | 3:30:18 |
| 18 | 5085 | 6218 | 5085 | 42 | 289 | 4:14:44 |
| 19 | 6407 | 7928 | 6407 | 49 | 338 | 5:08:15 |
| 20 | 8073 | 10109 | 8073 | 57 | 395 | 6:12:40 |
| 21 | 10172 | 12889 | 10172 | 67 | 462 | 7:30:13 |
| 22 | 12817 | 16433 | 12817 | 79 | 541 | 9:03:33 |
| 23 | 16149 | 20952 | 16149 | 92 | 633 | 10:55:52 |
| 24 | 20348 | 26714 | 20348 | 107 | 740 | 13:11:01 |
| 25 | 25639 | 34060 | 25639 | 126 | 866 | 15:53:38 |

### Serraria

Fonte: [Serraria — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5324).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 60 | 40 | 5 | 5 | 0:00:25 |
| 2 | 63 | 77 | 50 | 1 | 6 | 0:00:25 |
| 3 | 78 | 98 | 62 | 1 | 7 | 0:01:47 |
| 4 | 98 | 124 | 77 | 1 | 8 | 0:03:17 |
| 5 | 122 | 159 | 96 | 1 | 9 | 0:04:52 |
| 6 | 153 | 202 | 120 | 1 | 10 | 0:06:39 |
| 7 | 191 | 258 | 149 | 2 | 12 | 0:08:41 |
| 8 | 238 | 329 | 185 | 2 | 14 | 0:11:04 |
| 9 | 298 | 419 | 231 | 2 | 16 | 0:13:54 |
| 10 | 373 | 534 | 287 | 2 | 18 | 0:17:17 |
| 11 | 466 | 681 | 358 | 3 | 21 | 0:21:20 |
| 12 | 582 | 868 | 446 | 3 | 24 | 0:26:12 |
| 13 | 728 | 1107 | 555 | 4 | 28 | 0:32:03 |
| 14 | 909 | 1412 | 691 | 5 | 33 | 0:39:06 |
| 15 | 1137 | 1800 | 860 | 5 | 38 | 0:47:35 |
| 16 | 1421 | 2295 | 1071 | 5 | 43 | 0:57:48 |
| 17 | 1776 | 2926 | 1333 | 7 | 50 | 1:10:06 |
| 18 | 2220 | 3731 | 1659 | 8 | 58 | 1:24:55 |
| 19 | 2776 | 4757 | 2066 | 9 | 67 | 1:42:45 |
| 20 | 3469 | 6065 | 2572 | 10 | 77 | 2:04:13 |
| 21 | 4337 | 7733 | 3202 | 12 | 89 | 2:30:04 |
| 22 | 5421 | 9860 | 3987 | 14 | 103 | 3:01:11 |
| 23 | 6776 | 12571 | 4963 | 16 | 119 | 3:38:37 |
| 24 | 8470 | 16028 | 6180 | 19 | 138 | 4:23:40 |
| 25 | 10588 | 20436 | 7694 | 21 | 159 | 5:17:53 |
| 26 | 13235 | 26056 | 9578 | 24 | 183 | 6:23:05 |
| 27 | 16544 | 33221 | 11925 | 29 | 212 | 7:41:30 |
| 28 | 20680 | 42357 | 14847 | 33 | 245 | 9:15:49 |
| 29 | 25849 | 54005 | 18484 | 38 | 283 | 11:09:14 |
| 30 | 32312 | 68857 | 23013 | 43 | 326 | 13:25:37 |

### Poço de argila

Fonte: [Poço de argila — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5327).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 65 | 50 | 40 | 10 | 10 | 0:00:25 |
| 2 | 83 | 63 | 50 | 1 | 11 | 0:00:25 |
| 3 | 105 | 80 | 62 | 2 | 13 | 0:01:47 |
| 4 | 133 | 101 | 76 | 2 | 15 | 0:03:17 |
| 5 | 169 | 128 | 95 | 2 | 17 | 0:04:52 |
| 6 | 215 | 162 | 117 | 2 | 19 | 0:06:39 |
| 7 | 273 | 205 | 145 | 3 | 22 | 0:08:41 |
| 8 | 346 | 259 | 180 | 3 | 25 | 0:11:04 |
| 9 | 440 | 328 | 224 | 4 | 29 | 0:13:54 |
| 10 | 559 | 415 | 277 | 4 | 33 | 0:17:17 |
| 11 | 709 | 525 | 344 | 4 | 37 | 0:21:20 |
| 12 | 901 | 664 | 426 | 5 | 42 | 0:26:12 |
| 13 | 1144 | 840 | 529 | 6 | 48 | 0:32:03 |
| 14 | 1453 | 1062 | 655 | 7 | 55 | 0:39:06 |
| 15 | 1846 | 1343 | 813 | 8 | 63 | 0:47:35 |
| 16 | 2344 | 1700 | 1008 | 8 | 71 | 0:57:48 |
| 17 | 2977 | 2150 | 1250 | 10 | 81 | 1:10:06 |
| 18 | 3781 | 2720 | 1550 | 12 | 93 | 1:24:55 |
| 19 | 4802 | 3440 | 1922 | 13 | 106 | 1:42:45 |
| 20 | 6098 | 4352 | 2383 | 15 | 121 | 2:04:13 |
| 21 | 7744 | 5505 | 2955 | 16 | 137 | 2:30:04 |
| 22 | 9835 | 6964 | 3664 | 20 | 157 | 3:01:11 |
| 23 | 12491 | 8810 | 4543 | 22 | 179 | 3:38:37 |
| 24 | 15863 | 11144 | 5633 | 25 | 204 | 4:23:40 |
| 25 | 20147 | 14098 | 6985 | 28 | 232 | 5:17:53 |
| 26 | 25586 | 17833 | 8662 | 33 | 265 | 6:23:05 |
| 27 | 32495 | 22559 | 10740 | 37 | 302 | 7:41:30 |
| 28 | 41268 | 28537 | 13318 | 42 | 344 | 9:15:49 |
| 29 | 52410 | 36100 | 16515 | 48 | 392 | 11:09:14 |
| 30 | 66561 | 45666 | 20478 | 55 | 447 | 13:25:37 |

### Mina de ferro

Fonte: [Mina de ferro — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5330).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 75 | 65 | 70 | 10 | 10 | 0:00:30 |
| 2 | 94 | 83 | 87 | 2 | 12 | 0:00:30 |
| 3 | 118 | 106 | 108 | 2 | 14 | 0:02:09 |
| 4 | 147 | 135 | 133 | 2 | 16 | 0:03:56 |
| 5 | 184 | 172 | 165 | 3 | 19 | 0:05:51 |
| 6 | 231 | 219 | 205 | 3 | 22 | 0:07:58 |
| 7 | 289 | 279 | 254 | 4 | 26 | 0:10:25 |
| 8 | 362 | 356 | 316 | 4 | 30 | 0:13:17 |
| 9 | 453 | 454 | 391 | 5 | 35 | 0:16:41 |
| 10 | 567 | 579 | 485 | 6 | 41 | 0:20:44 |
| 11 | 710 | 738 | 602 | 7 | 48 | 0:25:36 |
| 12 | 889 | 941 | 746 | 8 | 56 | 0:31:26 |
| 13 | 1113 | 1200 | 925 | 10 | 66 | 0:38:28 |
| 14 | 1393 | 1529 | 1147 | 11 | 77 | 0:46:55 |
| 15 | 1744 | 1950 | 1422 | 13 | 90 | 0:57:06 |
| 16 | 2183 | 2486 | 1764 | 15 | 105 | 1:09:21 |
| 17 | 2734 | 3170 | 2187 | 18 | 123 | 1:24:07 |
| 18 | 3422 | 4042 | 2712 | 21 | 144 | 1:41:54 |
| 19 | 4285 | 5153 | 3363 | 25 | 169 | 2:03:18 |
| 20 | 5365 | 6571 | 4170 | 28 | 197 | 2:29:04 |
| 21 | 6717 | 8378 | 5170 | 34 | 231 | 3:00:05 |
| 22 | 8409 | 10681 | 6411 | 39 | 270 | 3:37:25 |
| 23 | 10528 | 13619 | 7950 | 46 | 316 | 4:22:21 |
| 24 | 13181 | 17364 | 9858 | 54 | 370 | 5:16:25 |
| 25 | 16503 | 22139 | 12224 | 63 | 433 | 6:21:27 |
| 26 | 20662 | 28227 | 15158 | 74 | 507 | 7:39:42 |
| 27 | 25869 | 35990 | 18796 | 86 | 593 | 9:13:48 |
| 28 | 32388 | 45887 | 23307 | 100 | 693 | 11:06:59 |
| 29 | 40549 | 58506 | 28900 | 118 | 811 | 13:23:05 |
| 30 | 50768 | 74595 | 35837 | 138 | 949 | 16:06:44 |

### Fazenda

Fonte: [Fazenda — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5333).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 45 | 40 | 30 | 0 | 0 | 0:00:33 |
| 2 | 59 | 53 | 39 | 0 | 0 | 0:00:33 |
| 3 | 76 | 70 | 50 | 0 | 0 | 0:02:23 |
| 4 | 99 | 92 | 64 | 0 | 0 | 0:04:23 |
| 5 | 129 | 121 | 83 | 0 | 0 | 0:06:30 |
| 6 | 167 | 160 | 107 | 0 | 0 | 0:08:51 |
| 7 | 217 | 212 | 138 | 0 | 0 | 0:11:34 |
| 8 | 282 | 279 | 178 | 0 | 0 | 0:14:45 |
| 9 | 367 | 369 | 230 | 0 | 0 | 0:18:32 |
| 10 | 477 | 487 | 297 | 0 | 0 | 0:23:02 |
| 11 | 620 | 642 | 383 | 0 | 0 | 0:28:27 |
| 12 | 806 | 848 | 494 | 0 | 0 | 0:34:56 |
| 13 | 1048 | 1119 | 637 | 0 | 0 | 0:42:44 |
| 14 | 1363 | 1477 | 822 | 0 | 0 | 0:52:08 |
| 15 | 1772 | 1950 | 1060 | 0 | 0 | 1:03:27 |
| 16 | 2303 | 2574 | 1368 | 0 | 0 | 1:17:04 |
| 17 | 2994 | 3398 | 1764 | 0 | 0 | 1:33:28 |
| 18 | 3893 | 4486 | 2276 | 0 | 0 | 1:53:13 |
| 19 | 5060 | 5921 | 2936 | 0 | 0 | 2:17:00 |
| 20 | 6579 | 7816 | 3787 | 0 | 0 | 2:45:38 |
| 21 | 8552 | 10317 | 4886 | 0 | 0 | 3:20:06 |
| 22 | 11118 | 13618 | 6302 | 0 | 0 | 4:01:35 |
| 23 | 14453 | 17976 | 8130 | 0 | 0 | 4:51:30 |
| 24 | 18789 | 23728 | 10488 | 0 | 0 | 5:51:34 |
| 25 | 24426 | 31321 | 13529 | 0 | 0 | 7:03:50 |
| 26 | 31754 | 41344 | 17453 | 0 | 0 | 8:30:46 |
| 27 | 41280 | 54574 | 22514 | 0 | 0 | 10:15:20 |
| 28 | 53664 | 72037 | 29043 | 0 | 0 | 12:21:05 |
| 29 | 69763 | 95089 | 37466 | 0 | 0 | 14:52:19 |
| 30 | 90692 | 125517 | 48331 | 0 | 0 | 17:54:09 |

### Armazém

Fonte: [Armazém — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5336).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 60 | 50 | 40 | 0 | 0 | 0:00:28 |
| 2 | 76 | 64 | 50 | 0 | 0 | 0:00:28 |
| 3 | 96 | 81 | 62 | 0 | 0 | 0:02:02 |
| 4 | 121 | 102 | 77 | 0 | 0 | 0:03:43 |
| 5 | 154 | 130 | 96 | 0 | 0 | 0:05:31 |
| 6 | 194 | 165 | 120 | 0 | 0 | 0:07:32 |
| 7 | 246 | 210 | 149 | 0 | 0 | 0:09:50 |
| 8 | 311 | 266 | 185 | 0 | 0 | 0:12:33 |
| 9 | 393 | 338 | 231 | 0 | 0 | 0:15:45 |
| 10 | 498 | 430 | 287 | 0 | 0 | 0:19:35 |
| 11 | 630 | 546 | 358 | 0 | 0 | 0:24:11 |
| 12 | 796 | 693 | 446 | 0 | 0 | 0:29:42 |
| 13 | 1007 | 880 | 555 | 0 | 0 | 0:36:20 |
| 14 | 1274 | 1118 | 691 | 0 | 0 | 0:44:19 |
| 15 | 1612 | 1420 | 860 | 0 | 0 | 0:53:56 |
| 16 | 2039 | 1803 | 1071 | 0 | 0 | 1:05:30 |
| 17 | 2580 | 2290 | 1333 | 0 | 0 | 1:19:27 |
| 18 | 3264 | 2908 | 1659 | 0 | 0 | 1:36:14 |
| 19 | 4128 | 3693 | 2066 | 0 | 0 | 1:56:27 |
| 20 | 5222 | 4691 | 2572 | 0 | 0 | 2:20:47 |
| 21 | 6606 | 5957 | 3202 | 0 | 0 | 2:50:05 |
| 22 | 8357 | 7566 | 3987 | 0 | 0 | 3:25:20 |
| 23 | 10572 | 9608 | 4963 | 0 | 0 | 4:07:46 |
| 24 | 13373 | 12203 | 6180 | 0 | 0 | 4:58:50 |
| 25 | 16917 | 15497 | 7694 | 0 | 0 | 6:00:16 |
| 26 | 21400 | 19682 | 9578 | 0 | 0 | 7:14:09 |
| 27 | 27071 | 24996 | 11925 | 0 | 0 | 8:43:02 |
| 28 | 34245 | 31745 | 14847 | 0 | 0 | 10:29:56 |
| 29 | 43320 | 40316 | 18484 | 0 | 0 | 12:38:28 |
| 30 | 54799 | 51201 | 23013 | 0 | 0 | 15:13:02 |

### Esconderijo

Fonte: [Esconderijo — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5339).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 60 | 50 | 2 | 2 | 0:00:50 |
| 2 | 63 | 75 | 63 | 0 | 2 | 0:00:50 |
| 3 | 78 | 94 | 78 | 1 | 3 | 0:03:34 |
| 4 | 98 | 117 | 98 | 0 | 3 | 0:06:34 |
| 5 | 122 | 146 | 122 | 1 | 4 | 0:09:45 |
| 6 | 153 | 183 | 153 | 0 | 4 | 0:13:17 |
| 7 | 191 | 229 | 191 | 1 | 5 | 0:17:21 |
| 8 | 238 | 286 | 238 | 1 | 6 | 0:22:08 |
| 9 | 298 | 358 | 298 | 1 | 7 | 0:27:48 |
| 10 | 373 | 447 | 373 | 1 | 8 | 0:34:34 |

### Muralha

Fonte: [Muralha — InnoGames](https://support.innogames.com/kb/TribalWars/en_DK/5342).

| Nível | W | C | I | Δpop | pop total | t20* |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 100 | 20 | 5 | 5 | 0:01:40 |
| 2 | 63 | 127 | 25 | 1 | 6 | 0:01:40 |
| 3 | 79 | 163 | 32 | 1 | 7 | 0:07:09 |
| 4 | 100 | 207 | 40 | 1 | 8 | 0:13:08 |
| 5 | 126 | 264 | 50 | 1 | 9 | 0:19:29 |
| 6 | 159 | 337 | 64 | 2 | 11 | 0:26:34 |
| 7 | 200 | 430 | 80 | 2 | 13 | 0:34:43 |
| 8 | 252 | 548 | 101 | 2 | 15 | 0:44:16 |
| 9 | 318 | 698 | 127 | 3 | 18 | 0:55:36 |
| 10 | 400 | 890 | 160 | 3 | 21 | 1:09:07 |
| 11 | 504 | 1135 | 202 | 3 | 24 | 1:25:20 |
| 12 | 635 | 1447 | 254 | 4 | 28 | 1:44:48 |
| 13 | 801 | 1846 | 320 | 5 | 33 | 2:08:13 |
| 14 | 1009 | 2353 | 404 | 5 | 38 | 2:36:24 |
| 15 | 1271 | 3000 | 508 | 7 | 45 | 3:10:20 |
| 16 | 1602 | 3825 | 641 | 8 | 53 | 3:51:12 |
| 17 | 2018 | 4877 | 807 | 9 | 62 | 4:40:24 |
| 18 | 2543 | 6218 | 1017 | 10 | 72 | 5:39:39 |
| 19 | 3204 | 7928 | 1281 | 12 | 84 | 6:51:00 |
| 20 | 4037 | 10109 | 1615 | 15 | 99 | 8:16:53 |

## Lacunas e incertezas

Esta seção é um **registro de requisitos de verificação**, não uma licença para preencher o motor com números plausíveis. A documentação pública permite reproduzir grande parte da economia e das configurações, mas não é uma especificação integral do código de servidor.

| Mecânica / seção | O que falta ou diverge | Melhor caminho para fechar a lacuna |
|---|---|---|
| Produção em nível 0 (1.1) | Relato de 5/h contra `base_production=30` no XML, sem definição semântica inequívoca. | Abrir aldeia recém-criada em mundo de velocidade 1, registrar estoque em duas horas com produtores em nível 0 e comparar com XML. |
| Produção após bônus (1.1) | Estágio de arredondamento e empilhamento de velocidade, produção, bandeira, paladino e item. | Capturar tooltip e delta de estoque antes/depois de cada bônus isolado; depois combinar dois. |
| Fazenda (1.3) | A fórmula com `floor` reproduz a tabela histórica 1–30; resta confirmar se algum mundo atual usa override de capacidade ou arredondamento. | Comparar níveis 3, 10 e 25 na interface de um mundo atual sem bônus de fazenda. |
| Pontos (1.4) | Bases e fator 1,2 reproduzem incrementos da imagem oficial; falta apenas validar se mundos especiais sobrescrevem pontuação de algum edifício e como arredondam no servidor. | Comparar pontuação de 2 ou 3 construções em mundo de evento e no modo pacote. |
| Mercado (1.5) | Taxas, restrições e expiração de ofertas podem variar; algoritmo de distribuição de mercadores em transporte misto. | Consultar página de mundo e criar ofertas/transportes de 1.001 e 2.001 recursos. |
| Esconderijo (1.6) | Fórmula geradora/ordem de arredondamento; interação com espionagem. | Conferir cada nível com tooltip oficial e ataque com 1 batedor sobrevivente. |
| Tempo de construção (2.1 e Apêndice A) | `buildtime_formula=2` exposto, equação comunitária não confirmada; a coluna `t20*` é estimativa. Bônus de QG e velocidade podem ser aplicados em ordem diversa. | Registrar duração mostrada para 3 edifícios × 3 níveis de QG, comparar fórmula e ajustar; pedir explicação do código `buildtime_formula=2` no fórum oficial. |
| Muralha (2.2/4.5) | Fandom dá 106% no nível 20; reconstrução de 2012 dá 107% e defesa básica `20+50L`. A regra atual e ordem de aplicação não estão demonstradas. | Ler fator do simulador oficial nos 20 níveis; enviar ataques com 0 tropas defensivas e variar muralha. |
| Igreja e primeira igreja (2.2/4.5/5.6) | Ordem de fé, suporte aliado, resistência de igreja a catapultas e exceções na conquista. | Simular cruzando origem/destino dentro/fora do raio; testar alvo de catapulta e captura. |
| Torre de vigia (2.2) | Raio e quantidade de comandos detectáveis por nível; comportamento com ataques anteriores à construção. | Anotar tooltip em níveis 1/5/10/20, enviar `limite±1` comandos dentro e fora do raio. |
| Recrutamento (3.1) | Tempo-base XML conhecido; fator por nível do quartel/estábulo/oficina, arredondamento e fila após destruição não comprovados. | Medir fila de mesma unidade com edifício em níveis distintos; comparar os três prédios. |
| Tecnologia (3.2) | Tabelas oficiais listam valores, mas regra matemática de 3/10 níveis, limite de pesquisas em antigos mundos e persistência após conquista. | Extrair tabelas de cada unidade em mundo tecnológico; comparar defesa em apoio e conquista. |
| Milícia e paladino (3.3) | Quantidade/duração da milícia, percentuais das 12 habilidades, efeitos completos das armas antigas. Paladino 8 min/campo em wiki antiga versus 10 na fonte oficial atual. | Consultar mundo com cada modo; capturar tela de habilidade por nível; conferir `get_unit_info` e cronômetro do comando. |
| **Resolução de combate** (4.1–4.3) | Há reconstrução histórica com expoente `3/2`, mas **não se encontrou o fator `x` de composição mista, regra de arredondamento, ordem de modificadores nem confirmação de equivalência ao motor de 2026**. Simuladores sem código verificável não comprovam motor. | Criar matriz de simulações oficiais: 1 e 2 tipos por lado, ataques perto do limiar, sem muralha/fé/moral; coletar relatórios em mundo de teste e ajustar `x`; solicitar explicação técnica no fórum oficial. |
| Moral (4.4) | Fórmula histórica `30+300×razão` não confirma 2026; componente de idade/tempo da conta e piso dinâmico não publicado. | Capturar moral de várias contas com pares de pontos conhecidos em dias sucessivos; isolar idade mantendo razão, comparar mundos `moral=1/2`. |
| Sorte (4.5) | Faixa confirmada; distribuição (discreta/contínua), precisão e momento de amostragem não publicados. | Coletar centenas de relatórios em cenário fixo e observar histograma/decimais. |
| Sincronização (4.6) | Ordem de comandos com mesmo milissegundo, prioridade de apoio e ataque, tick de servidor e fronteira de cancelamento. | Enviar lotes repetidos com timestamps colidentes em mundo de teste; comparar IDs de comandos e relatórios. |
| Saque (4.7) | Distribuição W/C/I quando carga insuficiente e fórmula do sistema `hauls`. | Ataques com estoques assimétricos conhecidos, carga baixa e esconderijo; variar saques repetidos na mesma aldeia. |
| Relatórios (4.8) | Campos exatos por destinatário quando atacante morre, compartilha relatório ou espionagem falha. | Capturar relatório de cada lado em 4 cenários (vitória, derrota total, batedor parcial, apoio). |
| Aríete/catapulta (4.9) | Fórmulas exatas de pré-dano, pós-dano e dano estrutural não publicadas; tabelas comunitárias podem referir versão antiga. | Simular grade de muralha 0–20 × aríetes 1–250 e catapultas/alvos; registrar dano sem tropas e com perdas controladas. |
| Moedas/pacotes (5.1/5.5) | Estados após perda de aldeia/nobre, pacote fixo por mundo, associação da capacidade ao jogador; **`snob.factor=0,5` no UK88 não tem semântica pública confirmada**, portanto custo final do nobre nesse mundo não foi inferido. | Registrar preço real de cunhagem/recrutamento e capacidade antes/depois de conquistar, perder e reconquistar aldeia. |
| Redução de lealdade (5.2/5.8) | É aleatória por ataque; falta distribuição exata e ordem de aplicação de Noble Booster, Persuasion e cetro histórico. | Repetir ataques a aldeia de teste, anotar reduções; medir cada bônus sozinho e combinado. |
| Regeneração (5.3) | Frações e tick para velocidades não inteiras; arredondamento no instante do impacto. | Ler lealdade minuto a minuto após ataque em mundo velocidade 1,5. |
| Conquista (5.4/5.6) | Filas, tropas fora, mercadores, apoios, pesquisa, relíquias e comandos já enviados após troca de dono. | Fazer conquista controlada com cada estado presente; gravar antes/depois de dono e apoiador. |
| Alcance e mapa (5.5/6.1) | Distância euclidiana é consenso, mas fórmula/precisão oficial não foi impressa; regra de borda exatamente 50 campos. | Enviar nobre a distância 50, 50,01 e diagonal 30–40; registrar recusa/ETA. |
| Aldeias bárbaras (6.5) | Frequência e algoritmo de `barbarian_rise=0,003`; defesa inicial e crescimento por evento. | Snapshots do mapa/XML de aldeias no mesmo mundo a cada dia. |
| Diplomacia (7.2) | NAP/aliança aparentam listas diplomáticas, sem prova de bloqueio mecânico universal; efeitos de skills/fortaleza variam. | Enviar ataque de teste sob NAP consentido em mundo apropriado; conferir configurações e FAQ de cada evento. |
| Relíquias (8.3) | Duas gerações oficiais têm tabelas e tetos diferentes (10% versus 20%); não se conhece a migração exata de uma relíquia legada para a nova em cada mundo. | Selecionar mundo com flag `relics` e data de abertura, ler tooltip de qualidade/raio, testar empilhamento com duas relíquias. |
| Coleta (8.2) | Fórmula comunitária é específica e não confirma divisão de recursos, bônus, custos de desbloqueio e arredondamento. | Registrar tela de coleta para 1/10/100 tropas e quatro opções num mesmo mundo. |
| Aldeias bônus e fakes (8.5/4.6) | Tipos/frequências de aldeias bônus e definição operacional de "2% dos pontos" para comandos falsos não foram encontrados em fonte geral. | Registrar tooltips de aldeias bônus e tentar comando no limiar com unidades de população distinta. |
| Progressão típica (8.4) | **Não há dados públicos suficientes para dia mediano de 500/3.000/10.000 pontos ou segunda aldeia.** Datas de abertura e vencedores não bastam. | Capturar snapshots diários de rankings por mundo e coorte, separar contas por dia de entrada; publicar mediana e percentis. |

**Divergências explícitas adicionais.** A versão atual do suporte define conquista com lealdade **≤0**; alguns guias antigos usam **<0**, portanto use ≤0 como regra atual e teste o caso exatamente 0 em versões históricas. Uma fonte histórica atribui 8 min/campo ao paladino e suporte atual 10; preferir XML do mundo. A aproximação de muralha em 20 contraria a tabela em 1 ponto percentual. A wiki `help.tribalwars.net/wiki` não foi legível pelo robô de pesquisa desta sessão; substituir sua consulta pelas páginas de suporte atuais **não garante** que informações legadas desse wiki tenham sido recuperadas. [Nobre atual](https://support.innogames.com/kb/TribalWars/en_DK/1179), [muralha comunitária](https://tribalwars.fandom.com/wiki/Wall), [paladino atual](https://support.innogames.com/kb/TribalWars/en_DK/5279), [paladino antigo](https://tribalwars.fandom.com/wiki/Paladin).

## Notas para adaptação single-player

**Legenda:** **A** copiar regra e parâmetros do ruleset escolhido; **B** conservar causalidade, rebalancear ritmo/atrito para um único jogador; **C** descartar ou transformar em comportamento de bots. A escolha é de design, não alegação sobre o original. Uma versão inicial coerente deveria escolher **um** conjunto de mundo (por exemplo UK88) e marcar recursos opcionais como interruptores, antes de calibrar combate pela caixa-preta oficial.

| Mecânica | Classe | Nota de adaptação |
|---|:---:|---|
| Recursos, armazém, fazenda, custos/população de edifícios | A | Preservar números do mundo e overflow; reduzir espera global só por regra explícita de velocidade. |
| Pontos | A | Soma de edifícios facilita IA, moral e placar; não incluir tropas. |
| Mercado e mercadores | B/C | Transferência entre aldeias próprias permanece útil; ofertas de jogadores viram mercado de bots ou saem. |
| Esconderijo | A | Mantém decisões de saque e defesa. |
| QG, prédios de tropa, pré-requisitos e filas | A/B | Copiar dependências; ritmo de construção/recrutamento pode ser acelerado para sessões offline. |
| Igreja, torre, paladino, milícia, arqueiros, relíquias | B | Escolher flags de mundo; introduzir gradualmente para não multiplicar complexidade no primeiro protótipo. |
| Atributos e tecnologias de unidades | A | Copiar tabelas por ruleset; manter diferenças entre tipos. |
| Combate, baixas, muralha, fé, sorte, moral | A/B | Alvo é reprodução após medição do motor; moral por diferença de pontos pode precisar ajuste para bots. Registrar explicitamente qualquer fórmula substituta. |
| Simultaneidade, sniping e cancelamento | B | Preservar ordem determinística de eventos e janelas; oferecer pausa/velocidade de jogo para evitar exigir vigília 24 horas. |
| Saque, batedores, relatórios | A | Fundamentais para informação imperfeita e economia militar. |
| Aríetes e catapultas | A/B | Preservar papéis e alvos; calibrar dano em simulador antes de balancear. |
| Nobre, lealdade, moedas/pacotes, conquista | A/B | Preservar necessidade de múltiplos comandos; avaliar custo/regen para campanha de uma pessoa; definir claramente filas e tropas após captura. |
| Proteção de iniciante e ratio | B | Viram período de preparação e proteção contra bots dominantes; duração pode acompanhar ritmo escolhido. |
| Mapa, distância, viagem e bárbaras | A/B | Manter geometria e unidade lenta; reduzir mapa/densidade para encontros significativos; bárbaras alimentam economia e expansão. |
| Premium e itens pagos | C/B | Remover pagamento; converter vantagens úteis em pesquisa, dificuldade, recompensa ou opções de acessibilidade. |
| Tribos, cargos, apoio, diplomacia | C | Transformar em facções de bots com acordos, confiança, assistência e coordenação ofensiva. |
| Conquistas e medalhas | B | Mantê-las como objetivos de campanha, sem ranking social obrigatório. |
| Coleta | B | Boa alternativa offline a saques repetitivos; evitar que microgestão domine o tempo do jogador. |
| Eventos, fortalezas, runas, vitória | B/C | Selecionar poucos objetivos para arco narrativo e fim de campanha; eventos sociais podem virar crises dinâmicas de facções. |
| Progressão e ritmo | B | Definir metas por sessão/dia simulado após observar coortes reais ou testes, sem atribuir números inventados ao TW original. |

**Ordem de validação para transformar esta referência em especificação executável:** (1) escolher ruleset e salvar seu XML/configuração; (2) verificar curvas de economia e tempos na interface; (3) gerar tabela de entrada/saída do simulador oficial para combate, muralha e cerco; (4) reproduzir conquistas controladas com estados de fila/apoio; (5) só então ajustar duração e decisões de bots. Essa sequência impede que suposições sobre fórmulas fechadas contaminem o núcleo do clone.
