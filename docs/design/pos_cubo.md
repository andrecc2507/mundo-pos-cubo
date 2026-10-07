# Mundo Pós-Cubo — design consolidado

> **Status:** decisões fechadas com o diretor (2026-10-07). Nenhum código ainda.
> **Fontes canônicas:** [fontes/cenario.md](fontes/cenario.md) (bíblia do cenário) e
> [fontes/sistema_recrutamento_dons.md](fontes/sistema_recrutamento_dons.md) (especificação de
> sistemas). Este documento resolve os conflitos entre as duas e o molde (o jogo de fantasia que
> serviu de base, preservado no repositório `andrecc2507/JOGO`).

## 0. Filtro de toda decisão

> **A luta por turno tem que parecer uma luta de Boku no Hero.**

Na prática, cada mecânica é julgada por estas perguntas:

1. **O Dom é a estrela.** Toda unidade com Dom tem jeitos visíveis e criativos de usá-lo — no
   ataque, no movimento, no resgate, no terreno. Dois usuários do mesmo Dom lutam diferente.
2. **Ir além do limite tem preço.** Forçar o Dom (Strain → Overload) é a jogada dramática: vence
   a luta e cobra do corpo. Nada de poder grande sem custo.
3. **Heróis salvam pessoas.** Resgatar civis, carregar o caído, proteger o aliado valem tanto
   quanto derrubar o inimigo.
4. **O cenário apanha.** Paredes caem, prédios desabam, gente voa pelo empurrão (o molde já tem
   destruição de prédios, empurrões e quedas — isso fica e cresce).
5. **Trabalho em equipe.** Combos entre Dons e técnicas de dupla são o ápice da sinergia.
6. **Momento decisivo.** O Despertar acontece no meio da batalha, quando a cena pede.
7. **Sem Dom não é menos.** O combatente com armas e tecnologia precisa ser igualmente decisivo.

## 1. Decisões fechadas

| Tema | Decisão |
|---|---|
| Nome | `gift` no código; **Dom** no jogo. |
| Progressão | **3 pilares**, uma tela de evolução com abas: **Classes** (teia), **Dom**, **Armas**. |
| Classes | Impacto, Movimento, Suporte, Controle — uma teia única com as fusões entre vizinhas. As classes antigas (Guerreiro, Arqueiro, Mago, Clérigo, Ladrão) saem. |
| Árvore de armas | Estilo XCOM: **Sniper, Assalto, Pesado, Especialista** (tecnologia e armadilhas). |
| Sem Dom | Existem; seguem só a árvore de armas (e a de classe). |
| Recursos de combate | **Stamina** (substitui o PM; custo de toda técnica) + **Strain** (só do Dom; leva ao Overload). |
| Técnicas | Ponto de habilidade desbloqueia; **Maestria por uso** (0–100) aprimora e abre variantes. O nível 1–5 do molde sai. |
| Redistribuir pontos | Limitado (item raro, treino caro, evento). |
| Traços | Fusão dos dois: raridade e compatibilidade do molde + efeitos condicionais e evolução por evento da especificação. |
| Sinergia | Mapeada nos vínculos do molde, com reações combinadas e técnicas de dupla. |
| Recrutamento | Especificação completa (pool dinâmico, origem, afinidades, potencial, oculto). O Dom é um "algo a mais". |
| Morte | **Permanente sempre**, inclusive no modo História (a opção de desligar sai). |
| Protagonista | Luta e tem Dom escolhido no início. Squad dele dizimado = **game over**; se alguém sobreviver, o protagonista só foi nocauteado. |
| Grupo inicial | Protagonista + **5 amigos criados pelo jogador**; podem morrer; começam com relação alta entre si. |
| Mapa | **O globo inteiro.** O jogador escolhe onde fica a vila. A equipe tem um **avião**. |
| Combate | Armas de fogo e tecnologia moderna; **sem veículos** no tático. |
| Inimigos | Como estão no molde, por enquanto. |
| Bestiário | **Mantido**: os animais também foram atingidos pelo Cubo. |
| Base | **Vila desde o início**, 4 estágios (Vila → Comunidade fortificada → Base → Base militar). |
| Economia | **Comida e dinheiro.** |
| Campanha | Tem final; depois dele, a campanha continua aberta. |
| Fora por ora | Viagem dimensional (os mundos paralelos do molde), veículos. |

## 2. Inconsistências resolvidas

| # | Problema | Resolução |
|---|---|---|
| 1 | "Executor" é subclasse (§15) e parte de uma fusão (§18) | É só nome de fusão. As subclasses são definidas em dados (a definir com o diretor). |
| 2 | Vizinhança das classes não definida (exemplos cruzam Impacto–Movimento, Movimento–Controle e Impacto–Controle) | Cruz: **Impacto (N), Movimento (L), Suporte (S), Controle (O)**. Fusões nas diagonais: Impacto+Movimento (NE), Movimento+Suporte (SE), Suporte+Controle (SO), Controle+Impacto (NO). O exemplo "Acrobata + Manipulador" (Movimento + Controle, opostas) não vale — vira Acrobata + algo de Impacto ou Suporte. |
| 3 | Fusão da Helena sem a segunda subclasse | Grappler = Manipulador (Controle) + uma subclasse de Impacto. |
| 4 | "Anômalo" é família e raridade | Só família. Raridades: **Comum, Incomum, Raro, Excepcional, Lendário** (pesos 60/25/10/4/1, configuráveis). |
| 5 | Stamina citada e nunca definida | Stamina = custo de toda técnica (substitui o PM). Strain = só o Dom. |
| 6 | "Slots de técnica do Dom" sem definição | O potencial (★) define quantas técnicas do Dom cabem no loadout de missão: ★ 2, ★★ 3, ★★★ 3, ★★★★ 4, ★★★★★ 5. |
| 7 | Todo recruta tem Dom (spec) × muitos não têm (cenário) | Recruta pode vir **sem Dom**; os campos do Dom ficam vazios e ele usa só armas e classe. Fração configurável (ponto de partida: 35% sem Dom). |
| 8 | Despertar com requisitos **e** chance | **Sem sorteio.** O potencial decide **se** o Dom pode despertar; cumpridos os requisitos, ele desperta num gatilho dramático em batalha (ex.: aliado caído + Strain ≥ 75). |
| 9 | Maestria por uso incentiva repetir à toa | Ganho decrescente por batalha + bônus por uso "criativo" (combo, resgate, golpe que derruba, interação com terreno). |
| 10 | "Will" não existe | É a **Moral** do molde. |
| 11 | Custos em moeda num mundo sem moeda universal | Dinheiro único no jogo (a "moeda forte" regional fica como sabor, não como mecânica). Comida pesa no sustento da vila e das viagens. |
| 12 | Reputação individual por região (cenário §23) | Fase futura: o herói pode ser herói numa região e procurado em outra. |
| 13 | Hereditariedade, segunda exposição ao Cubo | Ganchos de história; sem mecânica por enquanto. |
| 14 | "Não existe classificação universal" × famílias e raridade | Na interface é a **classificação da vila** (outros grupos usam outras). |
| 15 | Linha do tempo "8–12 anos" × "dez anos" | Começa **10 anos após a Ativação**. |
| 16 | Estrutura de arquivos para Godot | Adaptada aos padrões do projeto (TypeScript, módulos puros, dados em JSON). |

## 3. O que acontece com cada parte do molde

**Fica como está (genérico, já serve):** `src/core`; motor de batalha tático (linha do tempo,
alcance, cobertura, linha de tiro, altura, empurrões, quedas, destruição de prédios, furtividade,
supressão, prontidão, oportunidade, caído/estabilizar/carregar, ferimentos); IA tática; editor de
mapas; geração de mapas; save/load; dificuldade (sem a opção de desligar morte); telemetria;
simulações; glossário e dicas (conteúdo novo); atributos estilo Ragnarok (FOR/DES/VEL/INT/VIT, com
VIT exibida como Constituição); nível 60; vínculos, atrito, conversas e personalidade (fundidos
com os traços da spec); recrutamento (expandido); contratos, reputação, regiões, pressão por fase.

**Fica, com conteúdo novo:** teia (classes novas + aba de Dom + aba de Armas); habilidades (todas
novas); itens e armas (armas de fogo, munição, tecnologia); bestiário (animais reais, comuns e
alterados — os nomes fantásticos viram espécies reais alteradas); elementos (vindos de Dons e de
tecnologia; luz/sombra/Vazio saem); base (vila desde o início, 4 estágios); mapa (globo inteiro,
vila em qualquer lugar, avião); história (5 fases do cenário, sem profecia nem escolhido).

**Sai:** classes antigas e suas ~400 habilidades; orbes e joias da alma; história e personagens do
molde (Edran, Lirael, Orun…), kits únicos; mundos paralelos; sistemas por ato de fantasia (Véu,
Favor da Coroa, Selos, Barões); o comandante que não luta.

**Novo:** Dom (dados + instância), Strain e Overload, Maestria por técnica e variantes, Despertar,
potencial e potencial oculto, afinidades, origens, pool dinâmico e diversidade, legado, técnicas
de dupla, regra de game over do squad do protagonista, avião, escolha do local da vila.

## 4. Fases de implementação (proposta)

Segue a ordem da spec, com o filtro do §0:

1. **Limpeza e base:** remover o conteúdo de fantasia mantendo o motor; atributos, Stamina no
   lugar do PM; recruta com campos novos; save/load.
2. **Dom:** dados e instância, Strain, Overload, as primeiras famílias e Dons
   ([dons.md](dons.md)), aba do Dom na tela de evolução.
3. **Classes e armas:** teia Impacto/Movimento/Suporte/Controle com fusões; árvore de armas
   (Sniper, Assalto, Pesado, Especialista); armas de fogo e munição.
4. **Maestria e variantes**, combos por tags, técnicas de dupla.
5. **Morte e legado:** regra de game over, legado com capacidade limitada, pool que reage às
   perdas.
6. **Campanha:** globo, escolha da vila, avião, contratos e regiões, vila em 4 estágios, comida e
   dinheiro, as 5 fases da história.
7. **Despertar** e polimento.

## 5. Decisões complementares

- **Classes, fusões, armas e o Dom do protagonista:** [classes_armas.md](classes_armas.md).
- **Dons iniciais:** os 12 de [dons.md](dons.md) ficam como ponto de partida.
- **Recrutas sem Dom:** 35% (configurável).
- **Fusões:** uma por personagem. **Legados ativos:** 3 de cada vez (os outros ficam no
  memorial e podem ser trocados na vila).

## 6. O avião

O avião serve para as **missões distantes, intercontinentais**. No próprio continente, o squad
viaja por terra como no molde (estradas, pontos de passagem, encontros, comida).

- **Onde fica:** no hangar da vila (existe desde o início).
- **Para onde vai:** um **aeródromo** por continente (o mapa global tem um em cada); dali o squad
  segue por terra até o contrato.
- **Viagem:** cerca de 1 dia de voo, sem encontros aleatórios no ar.
- **Custo:** dinheiro (combustível) por voo, ida e volta; cada squad no avião consome comida no
  caminho como numa viagem normal.
- **Capacidade:** 1 squad por vez; nos estágios III e IV da vila, uma segunda viagem simultânea.
- **Volta:** o avião espera no aeródromo enquanto o squad cumpre o contrato; se o squad cair, o
  avião volta sozinho para a vila.
- **Contratos intercontinentais** aparecem marcados com ✈, pagam mais e trazem reputação com
  governos de outros continentes.

## 7. Ainda em aberto

- Lista e nomes dos governos, facções e regiões do globo.
- As 5 fases da história em missões (o cenário dá as fases, não as missões).
