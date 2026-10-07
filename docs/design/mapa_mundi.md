# Mapa-múndi, contratos e vila — o jogo base

O jogo base do Mundo Pós-Cubo, sem as missões de campanha. Menu → **Novo jogo**.

## Decisões (outubro)

- **Batalha:** linha do tempo de velocidade, como no molde. Os turnos por time (XCOM) foram
  removidos.
- **Tempo no globo:** contínuo com pausa, estilo Xenonauts.
  - Velocidades: ⏸, 1×, 2× e 3×. São meia hora, 3 horas e 12 horas de jogo por segundo real.
  - O relógio para sozinho quando um esquadrão chega, uma obra fica pronta, há fome ou é fim de jogo.
  - Um contrato novo só avisa, sem parar o relógio.
- **Globo:** a Terra real, com 177 países do world-atlas 110m agrupados em **21 regiões pós-Cubo**.
  - Cada região tem um governo novo e um tipo de poder: junta militar, remanescente nacional,
    federação, cidade-Estado, conselho comunitário ou senhores da guerra.
  - Cada região tem também um perigo (☠ 1–5), terrenos de batalha e um aeródromo.
  - A **Antártida é a Zona do Cubo** (cenário §3): não tem contratos e ninguém mora lá.
- **Vila:** fica onde o jogador clicar, em terra firme.
- **Entra agora:**
  - estágios I–IV e instalações;
  - economia de comida e dinheiro;
  - recrutamento;
  - feridos;
  - morte permanente;
  - fim de jogo;
  - criação do protagonista e dos 5 amigos.

## Novo jogo

1. **Protagonista:** nome, classe e um dos **10 Dons iniciais** (os não anômalos de
   [dons.md](dons.md)).
   - O potencial que se vê é ★3; o real é **★5**.
   - O real se revela no NV 12 ou quando a vila constrói o Laboratório.
2. **Os 5 amigos:** cada um tem nome, classe e um Dom dos 10 iniciais, ou nenhum.
   - Ao menos dois ficam sem Dom (cenário §26).
   - O vínculo entre todos começa alto (60).
   - Eles podem morrer.
3. **A vila:** nome e lugar no globo.
   - A região da vila começa com reputação 30.
   - O resto do continente começa com 10; os outros continentes, com 0.

## O globo

- Arrastar gira o globo e a roda dá zoom. Passar o mouse mostra a região, o governo, a sua reputação
  e o perigo.
- A **linha do dia e da noite** segue a hora do jogo.
- Marcadores:
  - 🏘 vila;
  - ✈ aeródromos;
  - contratos (ícone do tipo, com ✈ se for intercontinental);
  - esquadrões em viagem, com a rota tracejada no trecho de avião.
- **Viagem:**
  - No mesmo continente, por terra (45 km/h).
  - Em outro continente, de avião (650 km/h) até o aeródromo da região, e dali por terra.
  - O avião gasta combustível (ida e volta). Sem combustível, o voo é pago em dinheiro.
  - O avião fica ocupado até o esquadrão voltar. Há 1 voo por vez; o hangar nível 2 (estágio Base)
    permite 2.

## Contratos (cenário §29)

**Fontes:** governo, comunidade, indivíduo, organização, intermediário e a **própria vila**. A vila
pede o que está faltando: comida, combustível, remédios ou peças.

**Regras gerais:**
- **Prazo:** cada contrato vence; perder o prazo custa reputação.
- **Nível dos inimigos:** sobe com o perigo da região e com os dias de jogo.
- **Alcance:** os contratos chegam mais longe com mais reputação em casa e com a Inteligência.
- **Contratos intercontinentais** (✈) pagam 1,6× e dão mais reputação.

| Tipo | Objetivo na batalha |
|---|---|
| 🛡 Proteção | Sobreviver 8 rodadas com o civil vivo; ondas na 3ª e na 6ª |
| 🚶 Escolta | Levar todos (com o civil) até a zona de extração |
| ⛓ Resgate | Abrir a cela e soltar o civil (começa escondido) |
| 🔭 Reconhecimento | Chegar ao ponto de observação (escondido, com patrulhas) |
| 📦 Recuperação de recursos | Pegar 3 caixas de suprimentos em 10 rodadas (paga comida) |
| 💾 Recuperação de tecnologia | Recuperar o equipamento (escondido; paga peças) |
| ☠ Eliminação de ameaça | Derrubar o vilão chefe (Dom ★5) |
| 🔍 Investigação | Recolher 2 pistas |
| 🚚 Transporte | Pegar a carga e levá-la à extração |
| 💣 Sabotagem | Plantar 2 explosivos em 9 rodadas (escondido, com patrulhas) |
| 🏭 Proteção de instalações | Sobreviver 8 rodadas com 2 guardas aliados; 3 ondas |
| 🐺 Caça a Besta | Derrubar a Besta alfa e a matilha |
| 💊 Recuperação de medicamentos | 2 caixas de remédios em 10 rodadas |
| ⛽ Recuperação de combustível | 2 galões em 10 rodadas |
| ⚙ Obtenção de peças | 3 peças em 11 rodadas |
| 🧭 Busca por desaparecidos | Seguir o rastro e soltar o desaparecido |

**Inimigos:** vilões com Dom (mesmas árvores dos heróis), milicianos armados sem Dom e Bestas
alteradas do bestiário que combinam com o terreno.

**Mapas:** o padrão é **ruínas pós-Cubo** (`mapgen/ruins.ts`, 30–34 × 24–28 casas — grandes porque os
Dons dão muita mobilidade): ruas em grade, prédios ocos de 1–8 andares (muitos com rombos, andares
arrancados ou um canto desabado), crateras, entulho, carros, barricadas e mato. Cada região tem tema
próprio em `data/geo/map_themes.json` (materiais, alturas, cobertura, vegetação, neve/areia) e uma
**peça de cenário**: favela no morro (Brasil), pátio de contêineres (Cone Sul), terraços (Andes),
canal com pontes (Istmo), viaduto caído (EUA), serraria (Norte Gelado), catedral sem teto (Europa
Ocidental), trincheiras (Europa Oriental), cais do fiorde (Escandinávia), rio congelado (Rússia),
medina (Norte da África), feira (Costa Ocidental), lago da savana (Grandes Lagos), mina a céu aberto
(África Austral), torres engolidas pelas dunas (Oriente Médio), acampamento (Estepe), escadaria do rio
(Subcontinente), trilho elevado (China), becos de neon (Pacífico Norte), palafitas (Sudeste Asiático),
posto de estrada (Oceania) e cristais com fendas (Zona do Cubo). 20% das lutas são no terreno aberto
da região, com alguns prédios arruinados espalhados (`geo_rules.json` → `maps`).

## Vila (cenário §32)

**Estágios:**

| Estágio | Grupo máx. | Moradores máx. | Para subir |
|---|---|---|---|
| Vila | 10 | 40 | — |
| Comunidade Fortificada | 14 | 90 | 32 moradores, rep. 20, $900, 8 peças |
| Base | 20 | 180 | 75 moradores, rep. 45, $2600, 25 peças |
| Base Militar | 30 | 320 | 150 moradores, rep. 70, $6500, 55 peças |

**Instalações** (dinheiro + peças + dias de obra; até 2 obras ao mesmo tempo):

| Instalação | Efeito |
|---|---|
| Hortas e criação | Comida por dia |
| Enfermaria | Feridos saram mais rápido; gasta remédios |
| Hangar | O avião (já começa construído) |
| Muros | Defesa e mais gente chegando |
| Oficina | Itens melhores na loja e desconto |
| Depósitos | Mais comida guardada |
| Área de treinamento | XP para quem fica na vila |
| Comércio | Compra e venda de comida, mais desconto |
| Posto de recrutamento | Mais candidatos por leva |
| Inteligência | Mais contratos, e de mais longe |
| Laboratório | Revela o potencial real de todos |
| Arsenal | Armas raras na loja |
| Centro médico | Feridos voltam muito mais rápido |
| Quartéis | Cabe mais gente no grupo |

## Economia (todo dia)

- **Comida:**
  - Cada morador come 0,5 e produz 0,4; cada combatente come 1.
  - As hortas produzem mais.
  - A comida guardada tem limite, que os depósitos aumentam.
  - Uma vila nova perde cerca de 6 por dia; a primeira horta já equilibra.
- **Fome:**
  - Cada dia sem comida, 6% dos moradores vão embora.
  - Depois de **10 dias sem comida**, a vila se desfaz e é fim de jogo.
- **Dinheiro:**
  - Recrutas recebem $6 por dia; os amigos do começo não recebem.
  - Sem dinheiro, um recruta vai embora por dia.
- **População:** cresce quando sobra comida, até o limite do estágio. Os muros aceleram o crescimento.

## Gente

- **Recrutas:**
  - Chega uma leva de 4 a cada 5 dias; o Posto de recrutamento traz mais.
  - Cerca de 65% têm Dom.
  - Sem o Laboratório, o potencial que se vê pode errar por uma estrela.
  - O preço sobe com o nível e o potencial.
- **Ficha do herói (👥 Grupo):**
  - as mesmas abas da demo (Ficha, Classes, Dom e Armas);
  - classe, nível e Dom são fixos;
  - os atributos só sobem;
  - o equipamento vem do estoque da vila (comprado na 🛒 Loja);
  - **refazer as habilidades custa dinheiro**, e o preço sobe a cada uso (reset limitado).
- **Feridos:**
  - Os dias de ferimento dependem da vida mais baixa na luta.
  - Quem está ferido não sai em missão.
  - Quem está em casa e sem ferimento descansa: vida e Stamina cheias a cada dia.
- **Morte permanente:** os mortos vão para o memorial da vila.
  - O protagonista só desmaia se alguém do esquadrão sobreviver.
  - Se o esquadrão dele cair inteiro, é **fim de jogo**.

## Sistemas adicionados (lote de fechamento)

### Maestria por uso (spec §20–22)

- **Como sobe:**
  - Cada técnica usada em batalha ganha Maestria: +7 por uso, até +28 por luta.
  - A afinidade com a classe da técnica acelera; o legado "Estrategista" também.
  - O Dom tem Maestria própria, que sobe com o uso das técnicas dele.
- **O que muda:**
  - A cada 25 pontos a técnica sobe um nível. O motor escala o poder, e no Nv 4 a recarga cai.
  - Em 100, o jogador escolhe uma **variante permanente**: **Poder** (+30% de dano, +25% de
    Strain), **Controle** (−15% de dano, +20 de precisão, −1 de recarga) ou **Eficiência** (−15% de
    dano, −35% de Stamina e −35% de Strain).
- Números em `data/mastery.json`; regras em `rules/mastery.ts`.

### Ataques à vila

- **Quando:**
  - Um ataque a cada 7–13 dias; acontece mais cedo em região perigosa e varia com a dificuldade.
  - Quem ataca: um bando armado, Bestas alteradas ou, havendo governo hostil no continente, uma
    expedição dele.
- **Defesa:**
  - Até 6 heróis em casa defendem no **mapa da vila**: as casas crescem com o estágio e o muro com
    portões aparece se a vila construiu muros.
  - É preciso aguentar 7 rodadas; os atacantes chegam em ondas.
  - Cada nível de muro dá um vigia aliado.
- **Sem defensores:** a vila resolve sozinha, com a chance vinda dos muros e da população.
- **Perder:** custa 25% da comida, 15% do dinheiro e 10% dos moradores; os muros cortam as perdas
  pela metade.
- **Vencer:** dá reputação em casa.

### Encontros na estrada

- Acontecem só em viagem por terra. A chance cresce com o perigo da região, com governo hostil
  (caçadores) e com a dificuldade.
- **Com batalha:** emboscada, Bestas, caçadores do governo.
  - Lutar: vencer rende dinheiro; perder faz o esquadrão recuar.
  - Fugir: alguns se ferem.
- **Com escolha:**
  - refugiados: acolher (mais moradores, às vezes com um especialista) ou dividir comida;
  - mercador: item com desconto;
  - desertor com Dom: entra no grupo;
  - esconderijo: suprimentos.

### Política entre governos

- Cada governo tem **rivais**.
- **Contratos "contra" um rival:** 30% dos de sabotagem, tecnologia, eliminação, investigação e
  reconhecimento. A luta é no território do rival; quem paga sobe a reputação, o alvo perde 12.
- **Postura:** hostil, desconfiado, neutro, amigável ou aliado, pela reputação.
- **Hostil** (reputação abaixo de 10 depois de agir contra ele):
  - não oferece contratos;
  - cobra $150 de pedágio no aeródromo, ou recusa o pouso com reputação 0;
  - manda caçadores na estrada;
  - pode mandar uma expedição contra a vila.
- **Saída:** a hostilidade acaba ao voltar a 30 de reputação; a desconfiança se desfaz sozinha,
  devagar. Tudo aparece na aba 🌐 Governos.

### Recrutamento completo (spec §10–15, §27–29, §37–40)

- Todo recruta tem:
  - **origem** (academia, voluntário, organização, sobrevivente, veterano, especialista, regional),
    que mexe em atributos, nível, preço, número de traços e Maestria inicial;
  - **profissão do mundo antigo**;
  - **afinidade 0–100** com as quatro classes, que acelera a Maestria da classe;
  - **1 a 4 traços** com efeito de batalha. Exemplos: Protetor intercepta golpes em aliados;
    Observador vê quem está escondido.
- **Traços que evoluem:** Inseguro vira Resiliente depois de 3 lutas sobrevividas no limite;
  Impulsivo vira Cauteloso depois de uma derrota.
- **Pool dinâmico:** classes que faltam no grupo pesam mais, e Dons repetidos aparecem menos (mas
  ainda podem aparecer).
- **Especialistas:** não lutam e ganham $3 por dia. São médico, mecânico, agricultor, engenheiro,
  professor, ex-soldado, cientista, comerciante, assistente social, cozinheiro e piloto.
  - Chegam em cada leva ou junto com refugiados; a vila começa com dois.
  - Designados à instalação da profissão: **+50% no efeito** cada, até 2 por instalação.

### Legado e técnicas de dupla (spec §33–35, §42)

- **Legado:** quem morre a partir do NV 2 deixa um legado, mais forte nos NV 10 e 20.

  | Origem do legado | Legado | Bônus |
  |---|---|---|
  | Suporte | Instrutor | +XP |
  | Movimento | Veterano de Resgate | +1 de deslocamento |
  | Controle | Estrategista | +Maestria |
  | Impacto | Mártir | +crítico |
  | Dom | Eco do Dom | −Strain |

  No máximo **3 ativos**, escolhidos no memorial (aba 🏘 Vila).
- **Sinergia do par:** são os pontos de vínculo. Lutar junto dá +5, e +3 na vitória; os amigos
  começam com 60.
- **Técnica de dupla:** a partir de 75 de sinergia, o par ganha um golpe combinado do par de
  classes (10 golpes, como Arremesso Cruzado e Prende e Esmaga).
  - Aparece nas habilidades quando os dois estão a até 3 casas.
  - Usa os combos do motor.

### Dificuldade

| | História | Normal | Difícil |
|---|---|---|---|
| Consumo de comida | 0,7× | 1× | 1,25× |
| Paga dos contratos | 1,3× | 1× | 0,8× |
| Nível dos inimigos | −2 | 0 | +2 |
| Ataques à vila | mais raros | normais | mais frequentes |
| Encontros na estrada | 0,6× | 1× | 1,4× |
| Recursos iniciais | 1,5× | 1× | 0,8× |

A **morte é permanente em todas**. A dificuldade é escolhida na criação, no passo da vila.

## Figurantes

Toda luta tem **figurantes**: soldados comuns (como os ADVENT básicos do XCOM 2) sem Dom nem técnicas,
que caem com 1–2 golpes de um herói do mesmo nível (vida = 30 + 5 × nível, mira −10, pouco XP).
Contratos trazem 3 + ½ × perigo da região (± dificuldade) junto de poucos inimigos de verdade
(soldados de governo, seguranças, saqueadores ou capangas, conforme quem paga); caçadas trazem
filhotes; ataques à vila trazem metade do bando em figurantes e encontros na estrada, 2. Números em
`data/demo/demo.json` → `grunts` e `geo_rules.json` → `contracts`, `raids`, `encounters`.

## Equilíbrio (simulação longa)

`tests/sim/geo_sim.test.ts` joga o geoscape sozinho por centenas de dias em cada dificuldade: pega
contratos do tamanho do grupo, constrói (hortas primeiro), contrata, compra armas, poupa para o
próximo estágio, defende a vila e recua quando a luta vira. As lutas rodam com a IA dos dois lados
(o que é mais pessimista que um jogador de verdade). `tests/sim/geo_battle_grid.test.ts` mede a
taxa de vitória por nível e quantidade de inimigos.

```
SIM=1 SIM_N=10 SIM_DAYS=240 npx vitest run tests/sim/geo_sim.test.ts   # resumo em /tmp/claude-0/geo_sim.txt
```

O que a primeira rodada mostrou e o que mudou (`data/geo/geo_rules.json`):

- **Contratos começavam no NV 4 contra um grupo NV 1, com um inimigo a mais.** Agora
  `levelBase` 0, `levelPerTier` 1, `levelPerDays` 0,035 (a curva acompanha o grupo, que sobe ~1
  nível a cada 25–30 dias) e `enemyCountBonus` −1 (um inimigo a menos que o esquadrão, +½ por
  perigo da região, ±1 pela dificuldade em `difficulties.*.enemyCount`).
- **Espiral da derrota.** Quem perdia gente cedo ficava só com contratos fortes demais, sem XP nem
  dinheiro. Agora 40% dos contratos na região da vila são **serviços locais** (`localChance`), com
  nível perto do grupo (`squadLevel` − ½). Ataques à vila não passam de `squadLevel` + 1
  (`raids.levelOverSquad`).
- **~1 morte por luta.** Quem cai sangrando numa fuga agora é **carregado** pelos que fogem e volta
  gravemente ferido (`wounds.carryOutOnFlee`). Morrer continua permanente: quem sangra até o fim,
  ou fica para trás numa derrota total, morre.
- **Ataques demais.** De 7–13 para 10–18 dias (`raids.everyDays`); ataques com 3 + estágio inimigos
  (`raids.baseSize`); a vila sem defensores resiste em 30% + muros (`autoBaseChance`).

Resultado (40 partidas de 240 dias por dificuldade, piloto automático):

| Dificuldade | Sobrevive | Contratos V/D | Mortes | NV do grupo |
|---|---|---|---|---|
| História | 100% | ~140 / 12 | ~2,5 | ~11 |
| Normal | ~60% | ~45 / 25 | ~4 | ~7 |
| Difícil | ~30% | ~12 / 20 | ~4 | ~5 |

Quase todo fim de jogo no Normal/Difícil é o esquadrão do protagonista caindo inteiro numa fuga
que falhou — o piloto automático leva o protagonista em toda missão. A fome deixou de matar
quando a vila faz hortas cedo (a vila começa com −6 de comida por dia: a primeira horta é a
primeira decisão).

## Limpeza do molde (2026-10-07)

O molde de fantasia vive no repositório `andrecc2507/JOGO`. Daqui saiu tudo o que era só dele:
campanha, história, mapa-mundo do continente, criação do comandante, Quartel, árvores do Guerreiro,
Arqueiro, Mago, Clérigo e Ladrão, kits da história, orbes/joias da alma, forma fortificada, materiais e
drops, pesquisa e fabricação, criaturas distantes, rival recorrente, o Vazio (gravidade invertida),
itens e inimigos humanos de fantasia, temas de mapa medievais e os docs dessas partes.

Do motor do molde ficam, ainda **não ligados** ao globo:

| Sistema | Situação no jogo base |
|---|---|
| Vínculos e personalidade | Vínculos iniciais existem (protagonista + 5 amigos), mas não crescem nem geram conversas. |
| Captura (render) | A batalha permite render; o globo ainda não usa os capturados. |
| Mapas feitos à mão (editor) | O editor funciona, mas os contratos só usam mapas gerados. |
| Dicas contextuais | Funcionam na batalha; ainda não há tutorial próprio do jogo base. |

## Código

| Módulo | O que tem |
|---|---|
| `geo/world.ts` | Regiões, distâncias, ponto dentro da região |
| `geo/game.ts` | Estado salvo |
| `geo/sim.ts` | Relógio e economia |
| `geo/contracts.ts` | Geração dos contratos e as batalhas |
| `geo/squads.ts` | Viagens |
| `geo/village.ts` | Vila |
| `geo/people.ts` | Recrutas, feridos, resultado da batalha e reset |
| `geo/create.ts` | Novo jogo |
| `geo/events.ts` | Ataques à vila e encontros na estrada |
| `geo/politics.ts` | Posturas, hostilidade e pedágios |
| `geo/legacy.ts` | Legado e montagem das unidades do esquadrão |
| `rules/mastery.ts` | Maestria e variantes |
| `rules/perks.ts` | Origem, profissão, afinidade e traços |
| `rules/duo.ts` | Sinergia e técnicas de dupla |
| `mapgen/village_map.ts` | Mapa da defesa da vila |

- **Dados:** `data/geo/world.json`, `geo_rules.json`, `contracts.json`, `village.json` e
  `people.json`, mais `data/mastery.json`.
- **Cenas:** `scenes/geo_creation` e `scenes/geoscape`.
- **Saves:** `state/geo_store.ts`, com os espaços `mundo_1`–`3` e `mundo_auto`; o automático salva
  a cada dia.
- **Testes:** `tests/game/geo.test.ts`, `geo_events.test.ts` e `mastery.test.ts`.
  - O globo e as regiões.
  - O novo jogo.
  - O relógio.
  - Os 16 tipos viram batalha.
  - Mandar, lutar e voltar.
  - Fome até o fim de jogo.
  - Obras e contratação.
  - O avião.
