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

**Mapas:** "cidade" usa o gerador urbano; os outros terrenos usam os biomas do molde.

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

- **Dados:** `data/geo/world.json`, `geo_rules.json`, `contracts.json` e `village.json`.
- **Cenas:** `scenes/geo_creation` e `scenes/geoscape`.
- **Saves:** `state/geo_store.ts`, com os espaços `mundo_1`–`3` e `mundo_auto`; o automático salva
  a cada dia.
- **Testes:** `tests/game/geo.test.ts`.
  - O globo e as regiões.
  - O novo jogo.
  - O relógio.
  - Os 16 tipos viram batalha.
  - Mandar, lutar e voltar.
  - Fome até o fim de jogo.
  - Obras e contratação.
  - O avião.
